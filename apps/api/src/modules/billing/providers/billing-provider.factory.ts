import { Injectable } from '@nestjs/common';
import type { PaymentProvider } from '@prisma/client';

import type { IBillingProvider } from './billing-provider.interface';
import { StripeProvider } from './stripe.provider';
import { CryptoCloudProvider } from './cryptocloud.provider';
import { TelegramStarsProvider } from './telegram-stars.provider';
import { YooMoneyProvider } from './yoomoney.provider';
import { SbpProvider } from './sbp.provider';

@Injectable()
export class BillingProviderFactory {
  private readonly map: Record<PaymentProvider, IBillingProvider | undefined>;

  constructor(
    stripe: StripeProvider,
    crypto: CryptoCloudProvider,
    stars: TelegramStarsProvider,
    yoo: YooMoneyProvider,
    sbp: SbpProvider,
  ) {
    this.map = {
      STRIPE: stripe,
      CRYPTOCLOUD: crypto,
      TELEGRAM_STARS: stars,
      YOOMONEY: yoo,
      SBP: sbp,
      MANUAL: undefined,
    };
  }

  get(id: PaymentProvider): IBillingProvider {
    const p = this.map[id];
    if (!p) throw new Error(`Provider ${id} not implemented`);
    return p;
  }
}
