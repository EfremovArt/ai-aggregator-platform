import { Injectable } from '@nestjs/common';
import type { PaymentProvider } from '@prisma/client';

import type { IBillingProvider, CreateCheckoutInput, CreateCheckoutOutput } from './billing-provider.interface';
import { hmacSha256, constantTimeEquals } from '../../../common/utils/crypto';

/**
 * SBP (Система Быстрых Платежей) — Russia's instant-payment system.
 * Most banks expose it through providers like Tinkoff Acquiring, Alfa, etc.
 * This is a generic adapter — point SBP_API_BASE at your acquirer.
 */
@Injectable()
export class SbpProvider implements IBillingProvider {
  readonly id: PaymentProvider = 'SBP';

  isConfigured(): boolean {
    return Boolean(process.env.SBP_MERCHANT_ID && process.env.SBP_SECRET_KEY);
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutOutput> {
    if (!this.isConfigured()) throw new Error('SBP not configured');
    // Generic — adapt to specific acquirer's API.
    return {
      externalId: input.transactionId,
      paymentUrl: `${process.env.APP_URL}/dashboard/billing/sbp?tx=${input.transactionId}`,
      payload: {
        merchantId: process.env.SBP_MERCHANT_ID,
        qrPayload: `https://qr.nspk.ru/...?merchant=${process.env.SBP_MERCHANT_ID}`,
      },
    };
  }

  async verifyAndParseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>) {
    const sig = (headers['x-sbp-signature'] as string) ?? '';
    const secret = process.env.SBP_SECRET_KEY ?? '';
    const expected = hmacSha256(secret, rawBody.toString('utf8'));
    if (!constantTimeEquals(expected, sig)) throw new Error('Invalid signature');
    const j = JSON.parse(rawBody.toString('utf8')) as {
      eventId: string;
      transactionId: string;
      status: string;
      amount?: number;
    };
    const map: Record<string, 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'PROCESSING'> = {
      paid: 'SUCCEEDED',
      success: 'SUCCEEDED',
      cancelled: 'CANCELLED',
      failed: 'FAILED',
      processing: 'PROCESSING',
    };
    return {
      eventId: j.eventId,
      externalId: j.transactionId,
      status: map[j.status?.toLowerCase()] ?? 'PROCESSING',
      amountUsd: j.amount,
    };
  }
}
