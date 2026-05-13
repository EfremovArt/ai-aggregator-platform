import { Injectable, Logger } from '@nestjs/common';
import type { ChatCompletionRequest, ChatCompletionResponse } from '@ai-platform/shared';

import { ProviderFactory } from './providers/provider.factory';
import { flattenContent } from './providers/content';
import { ModelRouterService } from '../model-router/model-router.service';
import { ProviderRegistryService } from '../model-router/provider-registry.service';
import { CostProtectionService } from './cost-protection.service';
import { TokenEstimatorService } from './token-estimator.service';
import { SemanticCacheService } from './semantic-cache.service';
import { UsageLedgerService } from './usage-ledger.service';
import { ModerationService } from '../moderation/moderation.service';
import { FreeTierService } from '../free-tier/free-tier.service';

interface CallContext {
  userId: string;
  apiKeyId?: string;
  ip?: string;
  userAgent?: string;
  fingerprint?: string;
  country?: string;
}

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger('AiGateway');

  constructor(
    private readonly providers: ProviderFactory,
    private readonly router: ModelRouterService,
    private readonly registry: ProviderRegistryService,
    private readonly cost: CostProtectionService,
    private readonly tokens: TokenEstimatorService,
    private readonly cache: SemanticCacheService,
    private readonly ledger: UsageLedgerService,
    private readonly moderation: ModerationService,
    private readonly freeTier: FreeTierService,
  ) {}

  /**
   * If user requested the virtual free-tier slug, reserve quota and rewrite
   * to the configured cheapest model. Returns the rewritten request and a flag.
   */
  private async maybeApplyFreeTier(
    req: ChatCompletionRequest,
    ctx: CallContext,
  ): Promise<{ req: ChatCompletionRequest; freeTierActive: boolean }> {
    if (!this.freeTier.isFreeTierSlug(req.model)) {
      return { req, freeTierActive: false };
    }
    const promptTokens = this.tokens.estimateChat(req);
    const maxTokens = req.maxTokens ?? 1024;
    const { routedModel } = await this.freeTier.reserveTokens(ctx.userId, promptTokens + maxTokens);
    return { req: { ...req, model: routedModel }, freeTierActive: true };
  }

  async chat(req: ChatCompletionRequest, ctx: CallContext): Promise<ChatCompletionResponse> {
    const ft = await this.maybeApplyFreeTier(req, ctx);
    req = ft.req;
    const freeTierActive = ft.freeTierActive;

    // 1. Cache check
    const cached = await this.cache.lookup(req);
    if (cached) {
      const route = await this.router.route(req.model);
      await this.ledger.record({
        userId: ctx.userId,
        apiKeyId: ctx.apiKeyId,
        model: route.model,
        status: 'SUCCESS',
        kind: 'CHAT',
        promptTokens: cached.usage.promptTokens,
        completionTokens: cached.usage.completionTokens,
        costUsd: 0,
        providerCostUsd: 0,
        latencyMs: 0,
        cached: true,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        fingerprint: ctx.fingerprint,
        country: ctx.country,
      });
      return cached;
    }

    // 2. Moderation (input)
    await this.moderation.checkInputs(req.messages.map((m) => flattenContent(m.content)).join('\n'), ctx.userId);

    // 3. Routing
    const { model, provider } = await this.router.route(req.model);

    // 4. Cost preflight (skipped for free-tier — already reserved against quota)
    const promptTokens = this.tokens.estimateChat(req);
    const maxTokens = req.maxTokens ?? Math.min(model.maxOutputTokens, 4096);
    if (!freeTierActive) {
      await this.cost.preflight({ userId: ctx.userId, model, promptTokens, maxTokens });
    }

    // 5. Try primary, fall back on upstream errors
    const candidates = [model.slug, ...(await this.fallbackList(model.slug))];
    let lastError: unknown;
    for (const slug of candidates) {
      const route = await this.router.route(slug);
      const adapter = this.providers.get(route.provider.id);
      const start = Date.now();
      try {
        const res = await adapter.chat({ ...req, model: route.model.slug, maxTokens });
        const latency = Date.now() - start;
        const cost = freeTierActive
          ? { providerCostUsd: 0, costUsd: 0, marginUsd: 0 }
          : this.cost.computeCost(route.model, res.usage.promptTokens, res.usage.completionTokens);
        await this.registry.recordSuccess(route.provider.id, latency);
        await this.ledger.record({
          userId: ctx.userId,
          apiKeyId: ctx.apiKeyId,
          model: route.model,
          status: 'SUCCESS',
          kind: 'CHAT',
          promptTokens: res.usage.promptTokens,
          completionTokens: res.usage.completionTokens,
          costUsd: cost.costUsd,
          providerCostUsd: cost.providerCostUsd,
          latencyMs: latency,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          fingerprint: ctx.fingerprint,
          country: ctx.country,
        });
        if (freeTierActive) {
          await this.freeTier.chargeTokens(
            ctx.userId,
            res.usage.promptTokens + res.usage.completionTokens,
          );
        }
        await this.cache.store(req, res).catch(() => {});
        return res;
      } catch (err) {
        lastError = err;
        await this.registry.recordFailure(route.provider.id);
        this.logger.warn(`chat ${route.provider.id} failed: ${(err as Error).message}`);
      }
    }
    throw lastError;
  }

  async *chatStream(
    req: ChatCompletionRequest,
    ctx: CallContext,
  ): AsyncGenerator<{ event: string; data: string }> {
    const ft = await this.maybeApplyFreeTier(req, ctx);
    req = ft.req;
    const freeTierActive = ft.freeTierActive;
    await this.moderation.checkInputs(req.messages.map((m) => flattenContent(m.content)).join('\n'), ctx.userId);
    const { model } = await this.router.route(req.model);
    const promptTokens = this.tokens.estimateChat(req);
    const maxTokens = req.maxTokens ?? Math.min(model.maxOutputTokens, 4096);
    if (!freeTierActive) {
      await this.cost.preflight({ userId: ctx.userId, model, promptTokens, maxTokens });
    }

    const route = await this.router.route(model.slug);
    const adapter = this.providers.get(route.provider.id);
    const start = Date.now();
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let errored = false;
    try {
      for await (const chunk of adapter.chatStream({ ...req, model: route.model.slug, maxTokens })) {
        if (chunk.usage) usage = chunk.usage;
        yield { event: 'message', data: JSON.stringify(chunk) };
      }
      yield { event: 'done', data: '[DONE]' };
    } catch (err) {
      errored = true;
      yield { event: 'error', data: JSON.stringify({ message: (err as Error).message }) };
    } finally {
      const latency = Date.now() - start;
      const cost = errored || freeTierActive
        ? { providerCostUsd: 0, costUsd: 0, marginUsd: 0 }
        : this.cost.computeCost(route.model, usage.promptTokens, usage.completionTokens);
      if (!errored && freeTierActive) {
        await this.freeTier
          .chargeTokens(ctx.userId, usage.promptTokens + usage.completionTokens)
          .catch(() => {});
      }
      if (errored) await this.registry.recordFailure(route.provider.id);
      else await this.registry.recordSuccess(route.provider.id, latency);
      await this.ledger.record({
        userId: ctx.userId,
        apiKeyId: ctx.apiKeyId,
        model: route.model,
        status: errored ? 'ERROR' : 'SUCCESS',
        kind: 'CHAT',
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        costUsd: cost.costUsd,
        providerCostUsd: cost.providerCostUsd,
        latencyMs: latency,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        fingerprint: ctx.fingerprint,
        country: ctx.country,
      });
    }
  }

  private async fallbackList(slug: string): Promise<string[]> {
    const route = await this.router.route(slug);
    return route.fallbackChain;
  }
}
