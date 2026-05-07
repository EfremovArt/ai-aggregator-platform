import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../billing/ledger.service';
import { AuditService } from '../audit/audit.service';

export type CouponRedeemResult = {
  code: string;
  type: 'FIXED_BONUS' | 'DEPOSIT_BONUS' | 'FREE_TOKENS';
  description: string | null;
  amountCreditedUsd: number;
  bonusPercent: number | null;
  freeTokens: number | null;
  message: string;
};

@Injectable()
export class CouponsService {
  private readonly logger = new Logger('Coupons');

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
  ) {}

  async redeem(
    userId: string,
    rawCode: string,
    ctx: { ip?: string; ua?: string } = {},
  ): Promise<CouponRedeemResult> {
    const code = rawCode.trim().toUpperCase();

    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) {
      throw new NotFoundException('Промокод не найден или неактивен');
    }
    const now = new Date();
    if (coupon.validFrom && coupon.validFrom > now) {
      throw new BadRequestException('Промокод ещё не действует');
    }
    if (coupon.validUntil && coupon.validUntil < now) {
      throw new BadRequestException('Промокод истёк');
    }
    if (coupon.maxRedemptions != null && coupon.redemptionsCount >= coupon.maxRedemptions) {
      throw new BadRequestException('Промокод полностью использован');
    }

    // Per-user limit check
    const userRedemptions = await this.prisma.couponRedemption.count({
      where: { userId, couponId: coupon.id },
    });
    if (userRedemptions >= coupon.perUserLimit) {
      throw new BadRequestException('Вы уже использовали этот промокод');
    }

    let amountCreditedUsd = 0;
    let message = '';

    if (coupon.type === 'FIXED_BONUS') {
      const amt = Number(coupon.amountUsd ?? 0);
      if (amt <= 0) throw new BadRequestException('Промокод сконфигурирован неверно');
      amountCreditedUsd = amt;
      message = `Зачислено $${amt.toFixed(2)} на баланс`;
    } else if (coupon.type === 'DEPOSIT_BONUS') {
      // Stored — applied on next deposit by billing webhook
      amountCreditedUsd = 0;
      message = `Промокод сохранён: +${coupon.bonusPercent ?? 0}% к следующему пополнению`;
    } else if (coupon.type === 'FREE_TOKENS') {
      amountCreditedUsd = 0;
      message = `Зачислено ${coupon.freeTokens ?? 0} бесплатных токенов`;
    }

    // Atomic: record redemption, increment counter, credit balance / free tokens
    await this.prisma.$transaction(async (tx) => {
      try {
        await tx.couponRedemption.create({
          data: {
            userId,
            couponId: coupon.id,
            amountUsd: new Prisma.Decimal(amountCreditedUsd),
            metadata: ctx as unknown as Prisma.InputJsonValue,
          },
        });
      } catch (e) {
        // unique(userId, couponId) — duplicate redemption guard
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new BadRequestException('Вы уже использовали этот промокод');
        }
        throw e;
      }
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { redemptionsCount: { increment: 1 } },
      });
      if (coupon.type === 'FREE_TOKENS' && coupon.freeTokens) {
        await tx.user.update({
          where: { id: userId },
          data: {
            // Negative used = bonus that will be consumed first
            freeQuotaTokensUsed: { decrement: coupon.freeTokens },
          },
        });
      }
    });

    if (coupon.type === 'FIXED_BONUS' && amountCreditedUsd > 0) {
      await this.ledger.credit(
        userId,
        amountCreditedUsd,
        `Промокод ${coupon.code}`,
        'coupon',
        coupon.id,
      );
    }

    await this.audit.log({
      userId,
      actorType: 'user',
      action: 'coupon.redeem',
      target: coupon.code,
      ip: ctx.ip,
      userAgent: ctx.ua,
      metadata: {
        couponId: coupon.id,
        type: coupon.type,
        amountUsd: amountCreditedUsd,
      },
    });

    this.logger.log(
      `User ${userId} redeemed coupon ${coupon.code} (${coupon.type}, +$${amountCreditedUsd})`,
    );

    return {
      code: coupon.code,
      type: coupon.type,
      description: coupon.description,
      amountCreditedUsd,
      bonusPercent: coupon.bonusPercent,
      freeTokens: coupon.freeTokens,
      message,
    };
  }
}
