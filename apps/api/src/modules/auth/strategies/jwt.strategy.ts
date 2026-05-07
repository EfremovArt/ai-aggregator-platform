import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

import { PrismaService } from '../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  status: string;
  type: 'access';
}

const cookieExtractor = (req: Request): string | null => {
  const cookieName = process.env.SESSION_COOKIE_NAME ?? 'ai_session';
  const v = (req as unknown as { cookies?: Record<string, string> }).cookies?.[cookieName];
  return v ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-secret',
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException();
    }
    // Lightweight existence check (status may have changed since issue)
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });
    if (!user) throw new UnauthorizedException();
    if (user.status === 'BANNED' || user.status === 'DELETED') {
      throw new UnauthorizedException({ code: 'account_locked' });
    }
    return user;
  }
}
