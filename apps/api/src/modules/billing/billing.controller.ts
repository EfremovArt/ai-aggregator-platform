import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { topupSchema } from '@ai-platform/shared';

import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { getClientIp, getCountry, getFingerprint, getUserAgent } from '../../common/utils/ip';
import { BillingService } from './billing.service';
import { LedgerService } from './ledger.service';
import { InvoiceService } from './invoice.service';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly ledger: LedgerService,
    private readonly invoices: InvoiceService,
  ) {}

  @Post('topup')
  async topup(
    @Body(new ZodPipe(topupSchema)) body: never,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.billing.createTopup(body, {
      userId: user.id,
      ip: getClientIp(req),
      userAgent: getUserAgent(req),
      fingerprint: getFingerprint(req),
      country: getCountry(req),
    });
  }

  @Get('balance')
  balance(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.getBalance(user.id);
  }

  @Get('transactions')
  transactions(@CurrentUser() user: AuthenticatedUser) {
    return this.billing.listTransactions(user.id);
  }

  @Get('ledger')
  ledgerEntries(@CurrentUser() user: AuthenticatedUser) {
    return this.ledger.list(user.id);
  }

  @Get('invoices')
  invoiceList(@CurrentUser() user: AuthenticatedUser) {
    return this.invoices.list(user.id);
  }
}
