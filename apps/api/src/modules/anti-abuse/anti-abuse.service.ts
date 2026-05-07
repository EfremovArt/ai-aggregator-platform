import { Injectable, Logger } from '@nestjs/common';
import { AbuseSignalKind } from '@prisma/client';
import { RISK_WEIGHTS, DEFAULT_LIMITS } from '@ai-platform/shared';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { IpReputationService } from './ip-reputation.service';
import { DisposableEmailService } from './disposable-email.service';

interface SignupContext {
  ip?: string;
  userAgent?: string;
  fingerprint?: string;
  email?: string;
  country?: string;
}

interface RiskAssessment {
  score: number;
  reasons: string[];
  shouldBlock: boolean;
  shouldChallenge: boolean;
  signals: AbuseSignalKind[];
}

@Injectable()
export class AntiAbuseService {
  private readonly logger = new Logger('AntiAbuse');

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly ipReputation: IpReputationService,
    private readonly disposable: DisposableEmailService,
  ) {}

  async assessSignup(ctx: SignupContext): Promise<RiskAssessment> {
    const reasons: string[] = [];
    const signals: AbuseSignalKind[] = [];
    let score = 0;

    // Banned check
    if (ctx.ip) {
      const banned = await this.prisma.ban.findFirst({ where: { scope: 'IP', value: ctx.ip } });
      if (banned) {
        return { score: 100, reasons: ['ip_banned'], shouldBlock: true, shouldChallenge: false, signals: [] };
      }
    }
    if (ctx.fingerprint) {
      const banned = await this.prisma.ban.findFirst({
        where: { scope: 'FINGERPRINT', value: ctx.fingerprint },
      });
      if (banned) {
        return { score: 100, reasons: ['fingerprint_banned'], shouldBlock: true, shouldChallenge: false, signals: [] };
      }
    }

    // Disposable email
    if (ctx.email && (await this.disposable.isDisposable(ctx.email))) {
      score += RISK_WEIGHTS.DISPOSABLE_EMAIL;
      reasons.push('disposable_email');
      signals.push('DISPOSABLE_EMAIL');
    }

    // IP reputation (VPN/Tor/Proxy/Datacenter)
    if (ctx.ip) {
      const rep = await this.ipReputation.lookup(ctx.ip);
      if (rep) {
        if (rep.isTor) {
          score += RISK_WEIGHTS.TOR_DETECTED;
          reasons.push('tor');
          signals.push('TOR_DETECTED');
        } else if (rep.isVpn) {
          score += RISK_WEIGHTS.VPN_DETECTED;
          reasons.push('vpn');
          signals.push('VPN_DETECTED');
        } else if (rep.isProxy) {
          score += RISK_WEIGHTS.PROXY_DETECTED;
          reasons.push('proxy');
          signals.push('PROXY_DETECTED');
        }
        if (rep.isDatacenter) {
          score += RISK_WEIGHTS.DATACENTER_IP;
          reasons.push('datacenter_ip');
          signals.push('DATACENTER_IP');
        }
        if (rep.riskScore >= 75) {
          score += 20;
          reasons.push('high_ip_risk');
        }
      }
    }

    // Velocity: too many signups from same IP in 24h
    if (ctx.ip) {
      const count = await this.redis.incr(`signup:ip:${ctx.ip}`, 86400);
      if (count > DEFAULT_LIMITS.SIGNUPS_PER_IP_PER_DAY) {
        score += RISK_WEIGHTS.HIGH_VELOCITY_SIGNUP;
        reasons.push('high_velocity_signup');
        signals.push('HIGH_VELOCITY_SIGNUP');
      }
    }

    // Multi-account by fingerprint
    if (ctx.fingerprint) {
      const existing = await this.prisma.user.count({
        where: { signupFingerprint: ctx.fingerprint },
      });
      if (existing >= 1) {
        score += RISK_WEIGHTS.MULTI_ACCOUNT_FINGERPRINT;
        reasons.push('multi_account_fingerprint');
        signals.push('MULTI_ACCOUNT_FINGERPRINT');
      }
    }
    if (ctx.ip) {
      const existing = await this.prisma.user.count({
        where: { signupIp: ctx.ip, createdAt: { gte: new Date(Date.now() - 7 * 86400 * 1000) } },
      });
      if (existing >= 3) {
        score += RISK_WEIGHTS.MULTI_ACCOUNT_IP;
        reasons.push('multi_account_ip');
        signals.push('MULTI_ACCOUNT_IP');
      }
    }

    const threshold = Number(process.env.ABUSE_RISK_THRESHOLD ?? 70);
    return {
      score: Math.min(100, score),
      reasons,
      shouldBlock: score >= 90,
      shouldChallenge: score >= threshold,
      signals,
    };
  }

  async checkLoginVelocity(email: string, ip?: string): Promise<boolean> {
    const win = await this.redis.slidingWindow(
      `login:${email}`,
      300, // 5 minutes
      10,
    );
    if (!win.allowed) return true;
    if (ip) {
      const winIp = await this.redis.slidingWindow(`login:ip:${ip}`, 300, 30);
      if (!winIp.allowed) return true;
    }
    return false;
  }

  async recordLoginFailure(email: string, ip?: string): Promise<void> {
    await this.redis.slidingWindow(`login:fail:${email}`, 900, 5);
    if (ip) await this.redis.slidingWindow(`login:fail:ip:${ip}`, 900, 30);
  }

  async recordSignal(
    kind: AbuseSignalKind,
    ctx: { userId?: string; ip?: string; fingerprint?: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    const weight = RISK_WEIGHTS[kind] ?? 10;
    await this.prisma.abuseSignal.create({
      data: {
        kind,
        weight,
        userId: ctx.userId,
        ip: ctx.ip,
        fingerprint: ctx.fingerprint,
        metadata: (ctx.metadata as object) ?? undefined,
      },
    });
    if (ctx.userId) {
      await this.recomputeRiskScore(ctx.userId);
    }
  }

  async recomputeRiskScore(userId: string): Promise<number> {
    const since = new Date(Date.now() - 30 * 86400 * 1000);
    const signals = await this.prisma.abuseSignal.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { weight: true },
    });
    const score = Math.min(100, signals.reduce((sum, s) => sum + s.weight, 0));
    await this.prisma.user.update({ where: { id: userId }, data: { riskScore: score } });
    return score;
  }

  async isBanned(scope: 'USER' | 'IP' | 'FINGERPRINT' | 'EMAIL_DOMAIN' | 'COUNTRY', value: string): Promise<boolean> {
    const ban = await this.prisma.ban.findUnique({ where: { scope_value: { scope, value } } });
    if (!ban) return false;
    if (ban.expiresAt && ban.expiresAt < new Date()) return false;
    return true;
  }
}
