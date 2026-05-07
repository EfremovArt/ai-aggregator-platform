import { Injectable } from '@nestjs/common';
import { ulid } from 'ulid';
import type { PaymentProvider } from '@prisma/client';

import type { IBillingProvider, CreateCheckoutInput, CreateCheckoutOutput } from './billing-provider.interface';
import { hmacSha256, constantTimeEquals } from '../../../common/utils/crypto';

/**
 * YooKassa / YooMoney for-business API (https://yookassa.ru/developers/api).
 * Auth: Basic <shopId>:<secretKey>. Webhook signed via HMAC-SHA256 of body
 * with secret key in header `x-yoomoney-signature`.
 */
@Injectable()
export class YooMoneyProvider implements IBillingProvider {
  readonly id: PaymentProvider = 'YOOMONEY';

  isConfigured(): boolean {
    return Boolean(process.env.YOOMONEY_SHOP_ID && process.env.YOOMONEY_SECRET_KEY);
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutOutput> {
    if (!this.isConfigured()) throw new Error('YooMoney not configured');
    const auth = Buffer.from(`${process.env.YOOMONEY_SHOP_ID}:${process.env.YOOMONEY_SECRET_KEY}`).toString('base64');
    const idempotencyKey = ulid();
    const res = await fetch('https://api.yookassa.ru/v3/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
        'Idempotence-Key': idempotencyKey,
      },
      body: JSON.stringify({
        amount: { value: input.amountUsd.toFixed(2), currency: 'USD' },
        capture: true,
        confirmation: {
          type: 'redirect',
          return_url: input.returnUrl ?? `${process.env.APP_URL}/dashboard/billing?status=success`,
        },
        description: `Top up ${input.transactionId}`,
        metadata: { transactionId: input.transactionId, userId: input.userId },
      }),
    });
    if (!res.ok) throw new Error(`YooMoney ${res.status}: ${await res.text()}`);
    const j = (await res.json()) as { id: string; confirmation?: { confirmation_url?: string } };
    return { externalId: j.id, paymentUrl: j.confirmation?.confirmation_url };
  }

  async verifyAndParseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>) {
    const sig = (headers['x-yoomoney-signature'] as string) ?? '';
    const secret = process.env.YOOMONEY_WEBHOOK_SECRET ?? '';
    if (secret && sig) {
      const expected = hmacSha256(secret, rawBody.toString('utf8'));
      if (!constantTimeEquals(expected, sig)) throw new Error('Invalid signature');
    }
    const j = JSON.parse(rawBody.toString('utf8')) as {
      event: string;
      object: { id: string; status: string; metadata?: { transactionId?: string }; amount?: { value: string } };
    };
    const map: Record<string, 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'PROCESSING'> = {
      'payment.succeeded': 'SUCCEEDED',
      'payment.canceled': 'CANCELLED',
      'payment.waiting_for_capture': 'PROCESSING',
      'refund.succeeded': 'PROCESSING',
    };
    return {
      eventId: j.object.id,
      externalId: j.object.id,
      status: map[j.event] ?? 'PROCESSING',
      amountUsd: j.object.amount ? Number(j.object.amount.value) : undefined,
    };
  }
}
