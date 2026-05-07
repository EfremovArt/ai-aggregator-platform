import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import type { PaymentProvider } from '@prisma/client';

import type { IBillingProvider, CreateCheckoutInput, CreateCheckoutOutput } from './billing-provider.interface';

@Injectable()
export class StripeProvider implements IBillingProvider {
  readonly id: PaymentProvider = 'STRIPE';
  private readonly logger = new Logger('StripeProvider');
  private client: Stripe | null = null;

  private get stripe(): Stripe {
    if (!this.client) {
      this.client = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_dummy');
    }
    return this.client;
  }

  isConfigured(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutOutput> {
    if (!this.isConfigured()) throw new Error('Stripe not configured');
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(input.amountUsd * 100),
            product_data: {
              name: 'AI Aggregator credits topup',
            },
          },
        },
      ],
      client_reference_id: input.transactionId,
      metadata: {
        transactionId: input.transactionId,
        userId: input.userId,
      },
      success_url: input.returnUrl ?? `${process.env.APP_URL}/dashboard/billing?status=success`,
      cancel_url: `${process.env.APP_URL}/dashboard/billing?status=cancelled`,
    });
    return {
      externalId: session.id,
      paymentUrl: session.url ?? undefined,
    };
  }

  async verifyAndParseWebhook(
    rawBody: Buffer,
    headers: Record<string, string | string[] | undefined>,
  ) {
    const signature = (headers['stripe-signature'] as string) ?? '';
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not set');
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as Stripe.Checkout.Session;
      return {
        eventId: event.id,
        externalId: s.id,
        status: 'SUCCEEDED' as const,
        amountUsd: (s.amount_total ?? 0) / 100,
      };
    }
    if (event.type === 'checkout.session.expired') {
      const s = event.data.object as Stripe.Checkout.Session;
      return { eventId: event.id, externalId: s.id, status: 'CANCELLED' as const };
    }
    if (event.type === 'charge.refunded') {
      const c = event.data.object as Stripe.Charge;
      return {
        eventId: event.id,
        externalId: (c.metadata?.transactionId as string) ?? c.id,
        status: 'PROCESSING' as const,
      };
    }
    return { eventId: event.id, externalId: 'unknown', status: 'PROCESSING' as const };
  }
}
