import { Injectable, Logger } from '@nestjs/common';
import type { PaymentProvider } from '@prisma/client';

import type { IBillingProvider, CreateCheckoutInput, CreateCheckoutOutput } from './billing-provider.interface';
import { hmacSha256 } from '../../../common/utils/crypto';

/**
 * CryptoCloud (RU/global crypto gateway). https://cryptocloud.plus
 * Webhook payload contains JSON with `invoice_id`, `status`, `amount_crypto`, etc.
 * We verify with the configured webhook secret (HMAC-SHA256 of body).
 */
@Injectable()
export class CryptoCloudProvider implements IBillingProvider {
  readonly id: PaymentProvider = 'CRYPTOCLOUD';
  private readonly logger = new Logger('CryptoCloudProvider');

  isConfigured(): boolean {
    return Boolean(process.env.CRYPTOCLOUD_API_KEY && process.env.CRYPTOCLOUD_SHOP_ID);
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutOutput> {
    if (!this.isConfigured()) throw new Error('CryptoCloud not configured');
    const res = await fetch('https://api.cryptocloud.plus/v2/invoice/create', {
      method: 'POST',
      headers: {
        Authorization: `Token ${process.env.CRYPTOCLOUD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: input.amountUsd,
        currency: 'USD',
        shop_id: process.env.CRYPTOCLOUD_SHOP_ID,
        order_id: input.transactionId,
      }),
    });
    if (!res.ok) {
      throw new Error(`CryptoCloud error ${res.status}: ${await res.text()}`);
    }
    const j = (await res.json()) as { result?: { uuid: string; link: string } };
    return {
      externalId: j.result?.uuid ?? input.transactionId,
      paymentUrl: j.result?.link,
    };
  }

  async verifyAndParseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>) {
    const secret = process.env.CRYPTOCLOUD_WEBHOOK_SECRET ?? '';
    const signature = (headers['x-cryptocloud-signature'] as string) ?? (headers['signature'] as string) ?? '';
    if (secret) {
      const expected = hmacSha256(secret, rawBody.toString('utf8'));
      if (expected !== signature) throw new Error('Invalid signature');
    }
    const j = JSON.parse(rawBody.toString('utf8')) as {
      invoice_id?: string;
      status?: string;
      order_id?: string;
      amount_crypto?: number;
      amount_usd?: number;
    };
    const map: Record<string, 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'PROCESSING'> = {
      paid: 'SUCCEEDED',
      success: 'SUCCEEDED',
      canceled: 'CANCELLED',
      cancelled: 'CANCELLED',
      expired: 'CANCELLED',
      processing: 'PROCESSING',
      pending: 'PROCESSING',
      created: 'PROCESSING',
    };
    return {
      eventId: j.invoice_id ?? j.order_id ?? `cc-${Date.now()}`,
      externalId: j.invoice_id ?? j.order_id ?? '',
      status: map[(j.status ?? '').toLowerCase()] ?? 'PROCESSING',
      amountUsd: j.amount_usd,
    };
  }
}
