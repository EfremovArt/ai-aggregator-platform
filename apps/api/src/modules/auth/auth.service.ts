import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UserStatus, UserRole, OAuthProvider } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';
import { AntiAbuseService } from '../anti-abuse/anti-abuse.service';
import { TurnstileService } from '../anti-abuse/turnstile.service';
import { AuditService } from '../audit/audit.service';
import { EmailVerificationService } from './services/email-verification.service';
import type { RegisterInput, LoginInput } from '@ai-platform/shared';

export interface AuthContext {
  ip?: string;
  userAgent?: string;
  fingerprint?: string;
  country?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly antiAbuse: AntiAbuseService,
    private readonly turnstile: TurnstileService,
    private readonly audit: AuditService,
    private readonly verification: EmailVerificationService,
  ) {}

  async register(input: RegisterInput, ctx: AuthContext) {
    if (input.turnstileToken && !(await this.turnstile.verify(input.turnstileToken, ctx.ip))) {
      throw new ForbiddenException({ code: 'captcha_failed', message: 'Captcha verification failed' });
    }

    // Pre-signup risk assessment
    const risk = await this.antiAbuse.assessSignup({
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      fingerprint: ctx.fingerprint,
      email: input.email,
      country: ctx.country,
    });

    if (risk.shouldBlock) {
      this.logger.warn(`Blocked signup ${input.email} riskScore=${risk.score} reasons=${risk.reasons.join(',')}`);
      throw new ForbiddenException({
        code: 'signup_blocked',
        message: 'Sign-up blocked due to suspicious activity',
      });
    }

    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException({ code: 'email_in_use', message: 'Email already registered' });
    }

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        displayName: input.displayName,
        marketingOptIn: input.marketingOptIn ?? false,
        signupIp: ctx.ip,
        signupCountry: ctx.country,
        signupUserAgent: ctx.userAgent,
        signupFingerprint: ctx.fingerprint,
        riskScore: risk.score,
        status: UserStatus.PENDING_VERIFICATION,
        role: UserRole.USER,
        balance: { create: { balanceUsd: 0 } },
      },
    });

    if (input.referralCode) {
      const ref = await this.prisma.user.findFirst({ where: { id: input.referralCode } });
      if (ref) {
        await this.prisma.referral.create({
          data: {
            referrerId: ref.id,
            referredId: user.id,
            code: input.referralCode,
            bonusUsd: 1,
          },
        });
      }
    }

    await this.verification.issue(user.id, user.email);
    await this.audit.log({
      userId: user.id,
      action: 'auth.register',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { riskScore: risk.score },
    });

    const tokens = await this.tokens.issuePair(user, ctx);
    return { user: this.publicUser(user), ...tokens };
  }

  async login(input: LoginInput, ctx: AuthContext) {
    if (input.turnstileToken && !(await this.turnstile.verify(input.turnstileToken, ctx.ip))) {
      throw new ForbiddenException({ code: 'captcha_failed', message: 'Captcha verification failed' });
    }

    // Velocity protection on login attempts
    const blocked = await this.antiAbuse.checkLoginVelocity(input.email, ctx.ip);
    if (blocked) {
      throw new ForbiddenException({ code: 'login_throttled', message: 'Too many login attempts' });
    }

    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.passwordHash) {
      await this.antiAbuse.recordLoginFailure(input.email, ctx.ip);
      throw new UnauthorizedException({ code: 'invalid_credentials', message: 'Invalid credentials' });
    }

    const ok = await argon2.verify(user.passwordHash, input.password).catch(() => false);
    if (!ok) {
      await this.antiAbuse.recordLoginFailure(input.email, ctx.ip);
      throw new UnauthorizedException({ code: 'invalid_credentials', message: 'Invalid credentials' });
    }

    if (user.status === UserStatus.BANNED || user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException({ code: 'account_locked', message: 'Account is locked' });
    }

    if (user.twoFactorEnabled && !input.totpCode) {
      throw new BadRequestException({ code: 'totp_required', message: '2FA code required' });
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
    await this.audit.log({
      userId: user.id,
      action: 'auth.login',
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    const tokens = await this.tokens.issuePair(user, ctx);
    return { user: this.publicUser(user), ...tokens };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) await this.tokens.revoke(refreshToken);
    await this.audit.log({ userId, action: 'auth.logout' });
  }

  async refresh(refreshToken: string, ctx: AuthContext) {
    return this.tokens.rotate(refreshToken, ctx);
  }

  async oauthUpsert(
    provider: OAuthProvider,
    profile: { id: string; email?: string; name?: string; avatarUrl?: string },
    ctx: AuthContext,
  ) {
    let user = await this.prisma.user.findFirst({
      where: { oauthAccounts: { some: { provider, providerId: profile.id } } },
    });

    if (!user && profile.email) {
      user = await this.prisma.user.findUnique({ where: { email: profile.email } });
      if (user) {
        await this.prisma.oAuthAccount.create({
          data: { userId: user.id, provider, providerId: profile.id },
        });
      }
    }

    if (!user) {
      const email =
        profile.email ?? `${provider.toLowerCase()}_${profile.id}@oauth.local`;
      user = await this.prisma.user.create({
        data: {
          email,
          displayName: profile.name,
          avatarUrl: profile.avatarUrl,
          emailVerifiedAt: profile.email ? new Date() : null,
          status: UserStatus.ACTIVE,
          signupIp: ctx.ip,
          signupCountry: ctx.country,
          signupUserAgent: ctx.userAgent,
          oauthAccounts: { create: { provider, providerId: profile.id } },
          balance: { create: { balanceUsd: 0 } },
        },
      });
    }

    await this.audit.log({
      userId: user.id,
      action: `auth.oauth.${provider.toLowerCase()}`,
      ip: ctx.ip,
    });

    const tokens = await this.tokens.issuePair(user, ctx);
    return { user: this.publicUser(user), ...tokens };
  }

  publicUser(user: {
    id: string;
    email: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    role: UserRole;
    status: UserStatus;
    emailVerifiedAt?: Date | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName ?? null,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      status: user.status,
      emailVerified: !!user.emailVerifiedAt,
    };
  }
}
