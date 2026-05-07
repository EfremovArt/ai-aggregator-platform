import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * TelegramAdapter — sends DMs to users via the Telegram Bot API.
 *
 * Requires:
 * - `TELEGRAM_BOT_TOKEN` — token from @BotFather.
 * - User must have linked their account: store `telegramChatId` on `User`.
 *   Linking flow: user starts the bot, bot replies with code, user pastes
 *   code in /dashboard/settings (route: POST /notifications/link-telegram).
 *
 * If the bot token is not configured, calls are no-ops (logged in dev).
 */
@Injectable()
export class TelegramAdapter {
  private readonly logger = new Logger('TelegramAdapter');

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('TELEGRAM_BOT_TOKEN'));
  }

  async send(chatId: string, text: string): Promise<void> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn(`[telegram/dev] would DM ${chatId}: ${text.slice(0, 80)}…`);
      return;
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      this.logger.error(`Telegram sendMessage failed ${res.status}: ${err}`);
      throw new Error(`Telegram API error ${res.status}: ${err}`);
    }
  }
}
