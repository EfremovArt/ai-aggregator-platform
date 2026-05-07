import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';

import { ApiKeysService } from '../../api-keys/api-keys.service';
import { AntiAbuseService } from '../../anti-abuse/anti-abuse.service';

/**
 * Guard for /v1/* endpoints — accepts either:
 *  - Authorization: Bearer aix_<env>_<random>  (API key)
 *  - Cookie/JWT user session (passport jwt populates req.user)
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly keys: ApiKeysService,
    private readonly antiAbuse: AntiAbuseService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { apiKey?: unknown; user?: unknown }>();

    const auth = req.header('authorization');
    if (auth?.startsWith('Bearer aix_')) {
      const plain = auth.slice('Bearer '.length).trim();
      const key = await this.keys.resolveByPlaintext(plain);
      if (!key || key.status !== 'ACTIVE') {
        throw new UnauthorizedException({ code: 'invalid_api_key' });
      }
      if (key.expiresAt && key.expiresAt < new Date()) {
        throw new UnauthorizedException({ code: 'expired_api_key' });
      }
      if (key.user.status === 'BANNED' || key.user.status === 'SUSPENDED') {
        throw new ForbiddenException({ code: 'account_locked' });
      }
      // IP allow list
      if (key.ipAllowlist.length > 0) {
        const ip = (req.ip ?? '').replace(/^::ffff:/, '');
        if (!key.ipAllowlist.includes(ip)) {
          throw new ForbiddenException({ code: 'ip_not_allowed' });
        }
      }
      req.apiKey = key;
      req.user = {
        id: key.user.id,
        email: key.user.email,
        role: key.user.role,
        status: key.user.status,
      };
      return true;
    }

    if (req.user) return true;
    throw new UnauthorizedException({ code: 'auth_required' });
  }
}
