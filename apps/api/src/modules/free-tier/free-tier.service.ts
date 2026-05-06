import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type FreeTierConfig = {
  enabled: boolean;
  monthlyTokens: number;
  modelSlug: string;
  fallbackSlug: string | null;
  description: string;
};

const DEFAULT_CONFIG: FreeTierConfig = {
  enabled: false,
  monthlyTokens: 50000,
  modelSlug: 'deepseek/deepseek-chat',
  fallbackSlug: 'openai/gpt-4o-mini',
  description: 'Free monthly token allowance routed to the cheapest available model.',
};

const FREE_TIER_VIRTUAL_SLUG = 'grom/free';

@Injectable()
export class FreeTierService {
  private readonly logger = new Logger('FreeTier');

  constructor(private readonly prisma: PrismaService) {}

  /** Public landing-facing config (no per-user data). */
  async getConfig(): Promise<FreeTierConfig & { virtualSlug: string }> {
    const cfg = await this.loadConfig();
    return { ...cfg, virtualSlug: FREE_TIER_VIRTUAL_SLUG };
  }

  /** Per-user remaining free quota with monthly reset. */
  async getQuotaForUser(userId: string): Promise<{
    enabled: boolean;
    virtualSlug: string;
    monthlyTokens: number;
    usedTokens: number;
    remainingTokens: number;
    resetAt: string;
    routedModel: string;
  }> {
    const cfg = await this.loadConfig();
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { freeQuotaTokensUsed: true, freeQuotaResetAt: true },
    });
    if (!u) throw new NotFoundException('user not found');

    const { used, resetAt } = await this.maybeResetWindow(userId, u.freeQuotaTokensUsed, u.freeQuotaResetAt);
    const remaining = Math.max(0, cfg.monthlyTokens - used);
    return {
      enabled: cfg.enabled,
      virtualSlug: FREE_TIER_VIRTUAL_SLUG,
      monthlyTokens: cfg.monthlyTokens,
      usedTokens: used,
      remainingTokens: remaining,
      resetAt: resetAt.toISOString(),
      routedModel: cfg.modelSlug,
    };
  }

  /**
   * Reserve tokens before a request. Throws if quota exhausted or disabled.
   * Returns the model slug to actually call (router target).
   */
  async reserveTokens(userId: string, requestedTokens: number): Promise<{ routedModel: string }> {
    const cfg = await this.loadConfig();
    if (!cfg.enabled) {
      throw new ForbiddenException('Free tier is disabled');
    }
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { freeQuotaTokensUsed: true, freeQuotaResetAt: true },
    });
    if (!u) throw new NotFoundException('user not found');
    const { used } = await this.maybeResetWindow(userId, u.freeQuotaTokensUsed, u.freeQuotaResetAt);
    if (used + requestedTokens > cfg.monthlyTokens) {
      throw new ForbiddenException(
        `Месячная бесплатная квота исчерпана (${cfg.monthlyTokens} токенов). Пополните баланс или подождите сброса.`,
      );
    }
    return { routedModel: cfg.modelSlug };
  }

  /** Account real consumption after the request finishes. */
  async chargeTokens(userId: string, tokensUsed: number): Promise<void> {
    if (tokensUsed <= 0) return;
    await this.prisma.user.update({
      where: { id: userId },
      data: { freeQuotaTokensUsed: { increment: tokensUsed } },
    });
  }

  /** Public helper: is this slug the free-tier virtual slug? */
  isFreeTierSlug(slug: string): boolean {
    return slug === FREE_TIER_VIRTUAL_SLUG;
  }

  private async loadConfig(): Promise<FreeTierConfig> {
    const row = await this.prisma.setting.findUnique({ where: { key: 'free_tier_grom' } });
    const v = (row?.value ?? {}) as Partial<FreeTierConfig>;
    return { ...DEFAULT_CONFIG, ...v };
  }

  private async maybeResetWindow(userId: string, used: number, resetAt: Date) {
    const now = new Date();
    const monthMs = 30 * 24 * 60 * 60 * 1000;
    if (now.getTime() - resetAt.getTime() >= monthMs) {
      const next = new Date(now.getTime());
      await this.prisma.user.update({
        where: { id: userId },
        data: { freeQuotaTokensUsed: 0, freeQuotaResetAt: next },
      });
      this.logger.log(`Reset free-tier window for user ${userId}`);
      return { used: 0, resetAt: next };
    }
    return { used, resetAt };
  }
}
