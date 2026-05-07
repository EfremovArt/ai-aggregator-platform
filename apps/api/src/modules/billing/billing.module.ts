import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { LedgerService } from './ledger.service';
import { InvoiceService } from './invoice.service';
import { StripeProvider } from './providers/stripe.provider';
import { CryptoCloudProvider } from './providers/cryptocloud.provider';
import { TelegramStarsProvider } from './providers/telegram-stars.provider';
import { YooMoneyProvider } from './providers/yoomoney.provider';
import { SbpProvider } from './providers/sbp.provider';
import { BillingProviderFactory } from './providers/billing-provider.factory';
import { WebhookController } from './webhook.controller';

@Module({
  controllers: [BillingController, WebhookController],
  providers: [
    BillingService,
    LedgerService,
    InvoiceService,
    StripeProvider,
    CryptoCloudProvider,
    TelegramStarsProvider,
    YooMoneyProvider,
    SbpProvider,
    BillingProviderFactory,
  ],
  exports: [BillingService, LedgerService, InvoiceService],
})
export class BillingModule {}
