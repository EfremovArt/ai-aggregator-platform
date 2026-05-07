import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Cloudflare → Nginx → Node. We need to trust proxies so req.ip resolves
 * to the real client IP via X-Forwarded-For. Otherwise rate limits and
 * abuse signals will be measured against the proxy's IP.
 */
export class TrustProxyLoader {
  static apply(app: INestApplication): void {
    const expressApp = (app as NestExpressApplication).getHttpAdapter().getInstance();
    const trusted = (process.env.TRUSTED_PROXIES ?? '127.0.0.1,::1')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (trusted.length > 0) {
      expressApp.set('trust proxy', trusted);
    } else {
      expressApp.set('trust proxy', 'loopback');
    }
  }
}
