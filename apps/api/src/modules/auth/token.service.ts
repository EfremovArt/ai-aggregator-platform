import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { sha256Hex, generateToken } from '../../common/utils/crypto';
import type { AuthContext } from './auth.service';

interface AccessPayload {
  sub: string;
  email: string;
  role: string;
  status: string;
  type: 'access';
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async issuePair(user: User, ctx: AuthContext) {
    const accessToken = await this.signAccess(user);
    const refreshToken = await this.issueRefresh(user.id, ctx);
    return {
      accessToken,
      accessTokenExpiresIn: this.config.get<number>('JWT_ACCESS_TTL') ?? 900,
      refreshToken: refreshToken.token,
      refreshTokenExpiresIn: this.config.get<number>('JWT_REFRESH_TTL') ?? 2_592_000,
    };
  }

  async signAccess(user: User): Promise<string> {
    const payload: AccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      type: 'access',
    };
    return this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<number>('JWT_ACCESS_TTL') ?? 900,
    });
  }

  async issueRefresh(
    userId: string,
    ctx: AuthContext,
    parentTokenId?: string,
  ): Promise<{ token: string; tokenId: string }> {
    const ttl = this.config.get<number>('JWT_REFRESH_TTL') ?? 2_592_000;
    const raw = generateToken(48);
    const tokenHash = sha256Hex(raw);
    const expiresAt = new Date(Date.now() + ttl * 1000);
    const stored = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        parentTokenId,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        fingerprint: ctx.fingerprint,
        expiresAt,
      },
    });
    return { token: `${stored.id}.${raw}`, tokenId: stored.id };
  }

  async rotate(refreshToken: string, ctx: AuthContext) {
    const [tokenId, raw] = refreshToken.split('.');
    if (!tokenId || !raw) {
      throw new UnauthorizedException({ code: 'invalid_refresh', message: 'Invalid refresh token' });
    }
    const tokenHash = sha256Hex(raw);
    const stored = await this.prisma.refreshToken.findUnique({ where: { id: tokenId } });
    if (!stored || stored.tokenHash !== tokenHash) {
      // possible replay — revoke whole chain if we can find any related token
      if (stored?.userId) {
        await this.prisma.refreshToken.updateMany({
          where: { userId: stored.userId, revokedAt: null },
          data: { revokedAt: new Date(), revokedReason: 'reuse_detected' },
        });
      }
      throw new UnauthorizedException({ code: 'invalid_refresh', message: 'Invalid refresh token' });
    }
    if (stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'expired_refresh', message: 'Refresh token expired' });
    }

    // Rotate: mark old as rotated, issue new linked to it
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { rotatedAt: new Date() },
    });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: stored.userId } });
    const accessToken = await this.signAccess(user);
    const next = await this.issueRefresh(user.id, ctx, stored.id);
    return {
      accessToken,
      refreshToken: next.token,
      accessTokenExpiresIn: this.config.get<number>('JWT_ACCESS_TTL') ?? 900,
      refreshTokenExpiresIn: this.config.get<number>('JWT_REFRESH_TTL') ?? 2_592_000,
    };
  }

  async revoke(refreshToken: string): Promise<void> {
    const [tokenId, _raw] = refreshToken.split('.');
    if (!tokenId) return;
    await this.prisma.refreshToken.updateMany({
      where: { id: tokenId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'logout' },
    });
  }
}
