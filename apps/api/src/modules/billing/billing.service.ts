import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaymentProvider, TransactionStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from './ledger.service';
import { BillingProviderFactory } from './providers/billing-provider.factory';
import { NotificationsService } from '../notifications/notifications.service';
import type { TopupInput } from '@ai-platform/shared';

interface CreateTopupCtx {
  userId: string;
  ip?: string;
  userAgent?: string;
  fingerprint?: string;
  country?: string;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger('Billing');

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly factory: BillingProviderFactory,
    private readonly notifications: NotificationsService,
  ) {}

  async createTopup(input: TopupInput, ctx: CreateTopupCtx) {
    const provider = this.factory.get(input.provider);
    if (!provider.isConfigured()) {
      throw new Error(`Provider ${input.provider} is not configured`);
    }
    const transaction = await this.prisma.transaction.create({
      data: {
        userId: ctx.userId,
        provider: input.provider as PaymentProvider,
        amountUsd: input.amountUsd,
        amountOriginal: input.amountUsd,
        currency: 'USD',
        status: TransactionStatus.PENDING,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        fingerprint: ctx.fingerprint,
        country: ctx.country,
      },
    });
    const session = await provider.createCheckout({
      transactionId: transaction.id,
      amountUsd: input.amountUsd,
      userId: ctx.userId,
      returnUrl: input.returnUrl,
    });
    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { externalId: session.externalId },
    });
    return { transactionId: transaction.id, ...session };
  }

  async listTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getBalance(userId: string) {
    const b = await this.prisma.userBalance.findUnique({ where: { userId } });
    return {
      balanceUsd: Number(b?.balanceUsd ?? 0),
      lifetimeSpend: Number(b?.lifetimeSpend ?? 0),
      lifetimeTopup: Number(b?.lifetimeTopup ?? 0),
    };
  }

  async finalizeTransaction(externalId: string, status: TransactionStatus, eventId: string) {
    const tx = await this.prisma.transaction.findUnique({ where: { externalId } });
    if (!tx) {
      this.logger.warn(`Webhook for unknown tx externalId=${externalId}`);
      throw new NotFoundException();
    }
    // Replay protection — never process the same event twice.
    if (tx.webhookEventIds.includes(eventId)) {
      this.logger.log(`Skipping replayed event ${eventId} for tx ${tx.id}`);
      return tx;
    }
    if (tx.status === TransactionStatus.SUCCEEDED && status === TransactionStatus.SUCCEEDED) {
      return tx; // already credited
    }
    const updated = await this.prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status,
        webhookReceivedAt: new Date(),
        webhookEventIds: { push: eventId },
        completedAt: status === TransactionStatus.SUCCEEDED ? new Date() : tx.completedAt,
      },
    });
    if (status === TransactionStatus.SUCCEEDED) {
      await this.ledger.credit(tx.userId, Number(tx.amountUsd), `topup:${tx.provider}`, 'transaction', tx.id);
      // Clear the low-balance notify flag so future drops below threshold trigger again.
      await this.prisma.user.update({
        where: { id: tx.userId },
        data: { lowBalanceNotifiedAt: null },
      });
      const user = await this.prisma.user.findUnique({ where: { id: tx.userId } });
      const balance = await this.prisma.userBalance.findUnique({ where: { userId: tx.userId } });
      if (user) {
        await this.notifications.sendPaymentSuccess(
          user,
          Number(tx.amountUsd),
          Number(balance?.balanceUsd ?? 0),
          tx.provider,
        );
      }
    }
    return updated;
  }
}
