import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { RateLimitService } from '../rate-limit.service';
import { getClientIp } from '../../../common/utils/ip';

export interface RateLimitOptions {
  windowSec: number;
  limit: number;
  by?: 'ip' | 'user' | 'apiKey' | 'global';
  keyPrefix?: string;
}

export const RATE_LIMIT_KEY = 'rate_limit_options';
export const RateLimit = (opts: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, opts);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limiter: RateLimitService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!opts) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: { id: string }; apiKey?: { id: string } }>();
    const subject =
      opts.by === 'user'
        ? req.user?.id ?? getClientIp(req) ?? 'anon'
        : opts.by === 'apiKey'
          ? req.apiKey?.id ?? getClientIp(req) ?? 'anon'
          : opts.by === 'global'
            ? 'global'
            : getClientIp(req) ?? 'anon';

    const key = `${opts.keyPrefix ?? ctx.getClass().name}:${ctx.getHandler().name}:${subject}`;
    const r = await this.limiter.check({ key, windowSec: opts.windowSec, limit: opts.limit });
    if (!r.allowed) {
      throw new HttpException(
        {
          code: 'rate_limited',
          message: 'Too many requests',
          retryAfter: r.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
