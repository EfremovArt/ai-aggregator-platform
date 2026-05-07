import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { json as expressJson, raw as expressRaw } from 'express';
import { PaymentProvider, TransactionStatus } from '@prisma/client';

import { Public } from '../../common/decorators/public.decorator';
import { BillingProviderFactory } from './providers/billing-provider.factory';
import { BillingService } from './billing.service';

@Controller('billing/webhooks')
export class WebhookController {
  constructor(
    private readonly factory: BillingProviderFactory,
    private readonly billing: BillingService,
  ) {}

  @Public()
  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Param('provider') providerId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const upper = providerId.toUpperCase() as PaymentProvider;
    const provider = this.factory.get(upper);
    // We need raw body for signature verification. Routes for /api/billing/webhooks/*
    // are configured to receive raw body via main.ts middleware (see below).
    const raw: Buffer = (req as unknown as { rawBody?: Buffer }).rawBody ?? Buffer.from('');
    if (!raw.length) throw new BadRequestException('Empty body');
    let parsed;
    try {
      parsed = await provider.verifyAndParseWebhook(raw, req.headers as Record<string, string | string[] | undefined>);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    const status: TransactionStatus =
      parsed.status === 'SUCCEEDED'
        ? TransactionStatus.SUCCEEDED
        : parsed.status === 'CANCELLED'
          ? TransactionStatus.CANCELLED
          : parsed.status === 'FAILED'
            ? TransactionStatus.FAILED
            : TransactionStatus.PROCESSING;
    await this.billing.finalizeTransaction(parsed.externalId, status, parsed.eventId);
    res.json({ ok: true });
  }
}

// Helper to expose raw body middleware for webhook paths only.
export function applyRawBodyForWebhooks(app: import('express').Express): void {
  app.use('/api/billing/webhooks', expressRaw({ type: '*/*' }), (req, _res, next) => {
    (req as unknown as { rawBody?: Buffer }).rawBody = req.body as Buffer;
    next();
  });
  app.use(expressJson({ limit: '2mb' }));
}
