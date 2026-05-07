import type { PaymentProvider } from '@prisma/client';

export interface CreateCheckoutInput {
  transactionId: string;
  amountUsd: number;
  userId: string;
  returnUrl?: string;
}

export interface CreateCheckoutOutput {
  externalId: string;
  paymentUrl?: string;
  qrCode?: string;
  payload?: Record<string, unknown>;
}

export interface IBillingProvider {
  readonly id: PaymentProvider;
  isConfigured(): boolean;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutOutput>;
  /**
   * Verify webhook authenticity and return a normalized event with externalId
   * + status, or throw on invalid signature.
   */
  verifyAndParseWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): Promise<{
    eventId: string;
    externalId: string;
    status: 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'PROCESSING';
    amountUsd?: number;
  }>;
}
