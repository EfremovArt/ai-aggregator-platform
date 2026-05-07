import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type Model, type RequestKind, type RequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

interface RecordUsageInput {
  userId?: string;
  apiKeyId?: string;
  model: Model;
  status: RequestStatus;
  kind: RequestKind;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  providerCostUsd: number;
  latencyMs: number;
  cached?: boolean;
  cacheKey?: string;
  ip?: string;
  userAgent?: string;
  fingerprint?: string;
  country?: string;
  errorMessage?: string;
}

@Injectable()
export class UsageLedgerService {
  private readonly logger = new Logger('UsageLedger');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Atomically: insert request log, decrement user balance, write ledger entry.
   * If the user ran out of funds mid-stream we still write the cost (cannot un-bill)
   * but flag insufficient_funds — a follow-up admin review can adjust.
   */
  async record(input: RecordUsageInput): Promise<void> {
    const totalTokens = input.promptTokens + input.completionTokens;
    const marginUsd = input.costUsd - input.providerCostUsd;

    await this.prisma.$transaction(async (tx) => {
      const req = await tx.requestLog.create({
        data: {
          userId: input.userId,
          apiKeyId: input.apiKeyId,
          providerId: input.model.providerId,
          modelId: input.model.id,
          modelSlug: input.model.slug,
          kind: input.kind,
          status: input.status,
          promptTokens: input.promptTokens,
          completionTokens: input.completionTokens,
          totalTokens,
          costUsd: new Prisma.Decimal(input.costUsd),
          providerCostUsd: new Prisma.Decimal(input.providerCostUsd),
          marginUsd: new Prisma.Decimal(marginUsd),
          latencyMs: input.latencyMs,
          cached: input.cached ?? false,
          cacheKey: input.cacheKey,
          ip: input.ip,
          userAgent: input.userAgent,
          fingerprint: input.fingerprint,
          country: input.country,
          errorMessage: input.errorMessage,
        },
      });

      if (input.userId && input.costUsd > 0 && input.status === 'SUCCESS') {
        const balance = await tx.userBalance.upsert({
          where: { userId: input.userId },
          update: {
            balanceUsd: { decrement: new Prisma.Decimal(input.costUsd) },
            lifetimeSpend: { increment: new Prisma.Decimal(input.costUsd) },
          },
          create: {
            userId: input.userId,
            balanceUsd: new Prisma.Decimal(-input.costUsd),
            lifetimeSpend: new Prisma.Decimal(input.costUsd),
          },
        });
        await tx.ledgerEntry.create({
          data: {
            userId: input.userId,
            kind: 'CHARGE',
            amountUsd: new Prisma.Decimal(-input.costUsd),
            description: `${input.model.slug} (${totalTokens} tokens)`,
            balanceAfter: balance.balanceUsd,
            refType: 'request',
            refId: req.id,
          },
        });

        if (input.apiKeyId) {
          await tx.apiKey.update({
            where: { id: input.apiKeyId },
            data: { lastUsedAt: new Date() },
          });
        }
      }
    });

    // Post-charge: best-effort low-balance notification (outside the transaction).
    if (input.userId && input.costUsd > 0 && input.status === 'SUCCESS') {
      this.maybeNotifyLowBalance(input.userId).catch((e) =>
        this.logger.warn(`low-balance check failed: ${(e as Error).message}`),
      );
    }
  }

  /**
   * Sends a low-balance email/telegram if the balance just crossed the user's
   * threshold (de-duplicated by `lowBalanceNotifiedAt`; cleared on the next top-up).
   */
  private async maybeNotifyLowBalance(userId: string): Promise<void> {
    const [user, balance] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.userBalance.findUnique({ where: { userId } }),
    ]);
    if (!user || !balance) return;
    if (user.lowBalanceNotifiedAt) return; // already alerted; reset on top-up

    const defaultThreshold = Number(this.config.get<string>('LOW_BALANCE_THRESHOLD_USD') ?? 5);
    const threshold = Number(user.lowBalanceThresholdUsd ?? defaultThreshold);
    const balanceUsd = Number(balance.balanceUsd);

    if (balanceUsd <= threshold) {
      await this.notifications.sendLowBalance(user, balanceUsd, threshold);
      await this.prisma.user.update({
        where: { id: userId },
        data: { lowBalanceNotifiedAt: new Date() },
      });
    }
  }
}
