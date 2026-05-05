import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Model, Provider } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ModelsService } from '../models/models.service';

export interface RouteResult {
  model: Model;
  provider: Provider;
  fallbackChain: string[]; // slugs of fallback models in priority order
}

@Injectable()
export class ModelRouterService {
  private readonly logger = new Logger('ModelRouter');

  constructor(
    private readonly prisma: PrismaService,
    private readonly models: ModelsService,
  ) {}

  async route(slug: string): Promise<RouteResult> {
    const primary = await this.models.findBySlug(slug);
    if (!primary.isActive) {
      throw new BadRequestException({ code: 'model_disabled', message: 'Model is disabled' });
    }
    const provider = primary.provider;
    if (provider.status === 'DOWN') {
      // Try fallback chain
      const fb = await this.resolveFallback(primary);
      if (fb) {
        this.logger.warn(`Provider ${provider.id} DOWN, routing to ${fb.model.slug}`);
        return fb;
      }
      throw new NotFoundException({ code: 'provider_unavailable' });
    }
    const fallbackChain = await this.buildFallbackChain(primary);
    return { model: primary, provider, fallbackChain };
  }

  private async resolveFallback(model: Model): Promise<RouteResult | null> {
    if (!model.fallbackSlug) return null;
    const fb = await this.prisma.model.findUnique({
      where: { slug: model.fallbackSlug },
      include: { provider: true },
    });
    if (!fb || !fb.isActive) return null;
    return { model: fb, provider: fb.provider, fallbackChain: [] };
  }

  private async buildFallbackChain(start: Model): Promise<string[]> {
    const chain: string[] = [];
    let cur: Model | null = start;
    const seen = new Set<string>();
    while (cur?.fallbackSlug && !seen.has(cur.fallbackSlug)) {
      chain.push(cur.fallbackSlug);
      seen.add(cur.fallbackSlug);
      cur = await this.prisma.model.findUnique({ where: { slug: cur.fallbackSlug } });
      if (!cur || chain.length > 5) break;
    }
    return chain;
  }

  async pickCheapest(capability: 'CHAT' | 'EMBEDDING' | 'IMAGE_OUTPUT' | 'MODERATION'): Promise<Model | null> {
    const list = await this.prisma.model.findMany({
      where: { isActive: true, capabilities: { has: capability } },
      orderBy: { inputUsdPer1M: 'asc' },
      take: 1,
    });
    return list[0] ?? null;
  }
}
