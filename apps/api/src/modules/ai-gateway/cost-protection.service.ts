import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import type { Model } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface CostCheckCtx {
  userId: string;
  model: Model;
  promptTokens: number;
  maxTokens: number;
}

interface BalanceSnapshot {
  balanceUsd: number;
  dailyLimit: number;
  monthlyLimit: number;
  dailySpend: number;
  monthlySpend: number;
  hardCutoff: number;
  perRequestMaxTokens: number;
}

@Injectable()
export class CostProtectionService {
  private readonly logger = new Logger('CostProtection');

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getSnapshot(userId: string): Promise<BalanceSnapshot> {
    const [user, balance] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.userBalance.findUnique({ where: { userId } }),
    ]);
    const defaultDaily = Number(process.env.DEFAULT_DAILY_USD_LIMIT ?? 20);
    const defaultMonthly = Number(process.env.DEFAULT_MONTHLY_USD_LIMIT ?? 200);
    const perReq = Number(process.env.DEFAULT_PER_REQUEST_MAX_TOKENS ?? 8000);
    const hardCutoff = Number(process.env.HARD_BALANCE_CUTOFF_USD ?? 0);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const monthStart = new Date(today);
    monthStart.setUTCDate(1);

    const [daily, monthly] = await Promise.all([
      this.prisma.requestLog.aggregate({
        _sum: { costUsd: true },
        where: { userId, createdAt: { gte: today } },
      }),
      this.prisma.requestLog.aggregate({
        _sum: { costUsd: true },
        where: { userId, createdAt: { gte: monthStart } },
      }),
    ]);

    return {
      balanceUsd: Number(balance?.balanceUsd ?? 0),
      dailyLimit: Number(user.dailyUsdLimit ?? defaultDaily),
      monthlyLimit: Number(user.monthlyUsdLimit ?? defaultMonthly),
      dailySpend: Number(daily._sum.costUsd ?? 0),
      monthlySpend: Number(monthly._sum.costUsd ?? 0),
      hardCutoff: Number(user.hardCutoffUsd ?? hardCutoff),
      perRequestMaxTokens: Number(user.perRequestMaxTokens ?? perReq),
    };
  }

  /**
   * Pre-flight check before sending a request to a provider. Computes a worst-case
   * cost estimate (full max_tokens used) and rejects if any limit would be breached.
   */
  async preflight(ctx: CostCheckCtx): Promise<{ estimatedCostUsd: number }> {
    const snap = await this.getSnapshot(ctx.userId);

    if (ctx.maxTokens > snap.perRequestMaxTokens) {
      throw new ForbiddenException({
        code: 'per_request_token_limit',
        message: `max_tokens exceeds per-request limit of ${snap.perRequestMaxTokens}`,
      });
    }

    // Worst-case cost: full prompt + full max output, marked-up by margin.
    const inputUsd = (ctx.promptTokens / 1_000_000) * Number(ctx.model.inputUsdPer1M);
    const outputUsd = (ctx.maxTokens / 1_000_000) * Number(ctx.model.outputUsdPer1M);
    const provider = inputUsd + outputUsd;
    const margin = ctx.model.marginPercent ?? 20;
    const estimatedCostUsd = provider * (1 + margin / 100);

    if (snap.balanceUsd - estimatedCostUsd < snap.hardCutoff) {
      throw new ForbiddenException({
        code: 'insufficient_funds',
        message: 'Insufficient balance for this request',
        details: { balanceUsd: snap.balanceUsd, estimatedCostUsd, hardCutoff: snap.hardCutoff },
      });
    }
    if (snap.dailySpend + estimatedCostUsd > snap.dailyLimit) {
      throw new ForbiddenException({
        code: 'daily_limit',
        message: `Daily spend limit reached ($${snap.dailyLimit.toFixed(2)})`,
      });
    }
    if (snap.monthlySpend + estimatedCostUsd > snap.monthlyLimit) {
      throw new ForbiddenException({
        code: 'monthly_limit',
        message: `Monthly spend limit reached ($${snap.monthlyLimit.toFixed(2)})`,
      });
    }
    return { estimatedCostUsd };
  }

  computeCost(model: Model, promptTokens: number, completionTokens: number) {
    const inputUsd = (promptTokens / 1_000_000) * Number(model.inputUsdPer1M);
    const outputUsd = (completionTokens / 1_000_000) * Number(model.outputUsdPer1M);
    const providerCostUsd = inputUsd + outputUsd;
    const margin = model.marginPercent ?? 20;
    const costUsd = providerCostUsd * (1 + margin / 100);
    return {
      providerCostUsd,
      costUsd,
      marginUsd: costUsd - providerCostUsd,
    };
  }
}
