import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger('Turnstile');

  /**
   * Verify a Cloudflare Turnstile token.
   * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
   * If TURNSTILE_SECRET_KEY is unset (e.g. local dev) we accept tokens for convenience.
   */
  async verify(token: string, ip?: string): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      this.logger.debug('Turnstile secret not set — accepting token in dev');
      return true;
    }
    try {
      const body = new URLSearchParams({ secret, response: token });
      if (ip) body.set('remoteip', ip);
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body,
      });
      const json = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
      if (!json.success) {
        this.logger.warn(`Turnstile failed: ${(json['error-codes'] ?? []).join(',')}`);
      }
      return json.success;
    } catch (e) {
      this.logger.warn(`Turnstile verification error: ${(e as Error).message}`);
      return false;
    }
  }
}
