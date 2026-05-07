import { Injectable } from '@nestjs/common';
import type { PaymentProvider } from '@prisma/client';

import type { IBillingProvider, CreateCheckoutInput, CreateCheckoutOutput } from './billing-provider.interface';

/**
 * Telegram Stars (XTR) — invoice via Bot API sendInvoice.
 * Webhook handled by your Telegram bot's `pre_checkout_query` and
 * `successful_payment` updates which we forward to /webhook/telegram.
 *
 * Conversion: 1 Star ≈ ~$0.013 (subject to Telegram rates). Adjust the
 * rate or fetch live in production.
 */
const STAR_RATE_USD = 0.013;

@Injectable()
export class TelegramStarsProvider implements IBillingProvider {
  readonly id: PaymentProvider = 'TELEGRAM_STARS';

  isConfigured(): boolean {
    return Boolean(process.env.TELEGRAM_STARS_BOT_TOKEN);
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutOutput> {
    if (!this.isConfigured()) throw new Error('Telegram Stars not configured');
    const stars = Math.max(1, Math.round(input.amountUsd / STAR_RATE_USD));
    const res = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_STARS_BOT_TOKEN}/createInvoiceLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'AI Aggregator credits',
          description: `Top up $${input.amountUsd.toFixed(2)}`,
          payload: input.transactionId,
          currency: 'XTR',
          prices: [{ label: 'Credits', amount: stars }],
        }),
      },
    );
    const j = (await res.json()) as { ok?: boolean; result?: string };
    if (!j.ok || !j.result) throw new Error('Telegram Stars createInvoiceLink failed');
    return { externalId: input.transactionId, paymentUrl: j.result };
  }

  async verifyAndParseWebhook(rawBody: Buffer) {
    const j = JSON.parse(rawBody.toString('utf8')) as {
      update_id: number;
      message?: {
        successful_payment?: {
          invoice_payload: string;
          total_amount: number;
          telegram_payment_charge_id: string;
        };
      };
    };
    const sp = j.message?.successful_payment;
    if (!sp) {
      return { eventId: `tg-${j.update_id}`, externalId: 'unknown', status: 'PROCESSING' as const };
    }
    return {
      eventId: sp.telegram_payment_charge_id,
      externalId: sp.invoice_payload,
      status: 'SUCCEEDED' as const,
      amountUsd: sp.total_amount * STAR_RATE_USD,
    };
  }
}
