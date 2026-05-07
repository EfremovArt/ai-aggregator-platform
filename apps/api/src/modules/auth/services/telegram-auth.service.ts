import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac } from 'node:crypto';

export interface TelegramLoginPayload {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

@Injectable()
export class TelegramAuthService {
  /**
   * Verifies Telegram Login Widget payload using the bot token.
   * Spec: https://core.telegram.org/widgets/login#checking-authorization
   */
  verify(payload: TelegramLoginPayload): {
    id: string;
    name?: string;
    username?: string;
    avatarUrl?: string;
  } {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new UnauthorizedException({ code: 'telegram_disabled', message: 'Telegram login disabled' });
    }
    const { hash, ...rest } = payload;
    const dataString = Object.keys(rest)
      .sort()
      .filter((k) => rest[k as keyof typeof rest] !== undefined)
      .map((k) => `${k}=${rest[k as keyof typeof rest]}`)
      .join('\n');
    const secret = createHash('sha256').update(token).digest();
    const expected = createHmac('sha256', secret).update(dataString).digest('hex');
    if (expected !== hash) {
      throw new UnauthorizedException({ code: 'telegram_invalid_hash' });
    }
    if (Date.now() / 1000 - payload.auth_date > 86400) {
      throw new UnauthorizedException({ code: 'telegram_expired' });
    }
    const name = [payload.first_name, payload.last_name].filter(Boolean).join(' ') || undefined;
    return {
      id: String(payload.id),
      name,
      username: payload.username,
      avatarUrl: payload.photo_url,
    };
  }
}
