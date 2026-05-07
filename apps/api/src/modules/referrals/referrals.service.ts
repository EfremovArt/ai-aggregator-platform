import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../billing/ledger.service';

type ReferralProgramSettings = {
  enabled: boolean;
  referrerBonusUsd: number;
  referredBonusUsd: number;
  triggerOnFirstDeposit: boolean;
  triggerOnSignup: boolean;
};

const DEFAULT_SETTINGS: ReferralProgramSettings = {
  enabled: false,
  referrerBonusUsd: 1.0,
  referredBonusUsd: 0.5,
  triggerOnFirstDeposit: true,
  triggerOnSignup: false,
};

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger('Referrals');

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  /** Generate or fetch the user's referral code. Idempotent. */
  async getOrCreateForUser(userId: string): Promise<{
    code: string;
    appUrl: string;
    link: string;
    settings: ReferralProgramSettings;
  }> {
    const settings = await this.getSettings();
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) throw new Error('user not found');

    let code = u.referralCode;
    if (!code) {
      // Try a few times in case of collision (random 8-char base32)
      for (let i = 0; i < 5 && !code; i++) {
        const candidate = this.generateCode();
        const collision = await this.prisma.user.findUnique({
          where: { referralCode: candidate },
          select: { id: true },
        });
        if (!collision) {
          await this.prisma.user.update({
            where: { id: userId },
            data: { referralCode: candidate },
          });
          code = candidate;
        }
      }
    }

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    return {
      code: code ?? 'PENDING',
      appUrl,
      link: `${appUrl}/register?ref=${code ?? ''}`,
      settings,
    };
  }

  async stats(userId: string) {
    const referrals = await this.prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        referred: {
          select: {
            id: true,
            email: true,
            displayName: true,
            createdAt: true,
            balance: { select: { lifetimeTopup: true } },
          },
        },
      },
    });

    const totalReferred = referrals.length;
    let totalBonusUsd = 0;
    let pendingBonusUsd = 0;
    for (const r of referrals) {
      const amt = Number(r.bonusUsd);
      totalBonusUsd += amt;
      if (!r.paidOut) pendingBonusUsd += amt;
    }

    return {
      totalReferred,
      totalBonusUsd,
      pendingBonusUsd,
      referrals: referrals.map((r) => ({
        id: r.id,
        code: r.code,
        bonusUsd: Number(r.bonusUsd),
        paidOut: r.paidOut,
        createdAt: r.createdAt.toISOString(),
        referredEmail: this.maskEmail(r.referred.email),
        referredDisplayName: r.referred.displayName,
        referredLifetimeTopupUsd: Number(r.referred.balance?.lifetimeTopup ?? 0),
      })),
    };
  }

  /**
   * Attach a new user to a referrer (called from auth/signup).
   * Pass the raw referral code from the registration query/form.
   */
  async attachReferrer(
    newUserId: string,
    referralCode: string,
  ): Promise<{ attached: boolean; referrerId?: string }> {
    const code = referralCode.trim().toUpperCase();
    if (!code) return { attached: false };
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!referrer || referrer.id === newUserId) return { attached: false };

    try {
      await this.prisma.referral.create({
        data: {
          referrerId: referrer.id,
          referredId: newUserId,
          code,
          bonusUsd: 0,
        },
      });
      this.logger.log(`User ${newUserId} attached to referrer ${referrer.id} via ${code}`);
      const settings = await this.getSettings();
      if (settings.enabled && settings.triggerOnSignup) {
        await this.payoutReferralBonus(newUserId);
      }
      return { attached: true, referrerId: referrer.id };
    } catch {
      return { attached: false };
    }
  }

  /**
   * Pay out referral bonus when triggered. Idempotent — only pays out once per
   * referral relationship (paidOut flag). Called from billing on first deposit.
   */
  async payoutReferralBonus(referredUserId: string): Promise<{ paid: boolean }> {
    const settings = await this.getSettings();
    if (!settings.enabled) return { paid: false };

    const ref = await this.prisma.referral.findUnique({
      where: { referredId: referredUserId },
    });
    if (!ref || ref.paidOut) return { paid: false };

    const referrerBonus = settings.referrerBonusUsd;
    const referredBonus = settings.referredBonusUsd;

    await this.prisma.referral.update({
      where: { id: ref.id },
      data: {
        paidOut: true,
        bonusUsd: referrerBonus,
      },
    });

    if (referrerBonus > 0) {
      await this.ledger.credit(
        ref.referrerId,
        referrerBonus,
        `Referral bonus: ${ref.code}`,
        'referral',
        ref.id,
      );
    }
    if (referredBonus > 0) {
      await this.ledger.credit(
        referredUserId,
        referredBonus,
        `Welcome bonus by referral: ${ref.code}`,
        'referral',
        ref.id,
      );
    }

    this.logger.log(
      `Paid referral bonus for ${ref.id}: referrer=$${referrerBonus}, referred=$${referredBonus}`,
    );
    return { paid: true };
  }

  private async getSettings(): Promise<ReferralProgramSettings> {
    const row = await this.prisma.setting.findUnique({ where: { key: 'referral_program' } });
    const v = (row?.value ?? {}) as Partial<ReferralProgramSettings>;
    return { ...DEFAULT_SETTINGS, ...v };
  }

  private generateCode(): string {
    // 8-char base32 alphanumeric, no ambiguous chars
    const buf = randomBytes(8);
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 8; i++) {
      const byte = buf[i] ?? 0;
      out += alphabet.charAt(byte % alphabet.length);
    }
    return out;
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain || !local) return email;
    if (local.length <= 2) return `${local.charAt(0)}*@${domain}`;
    return `${local.charAt(0)}${local.charAt(1)}***@${domain}`;
  }
}
