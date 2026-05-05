import { Injectable, Logger } from '@nestjs/common';
import type { ProviderId } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProviderRegistryService {
  private readonly logger = new Logger('ProviderRegistry');

  constructor(private readonly prisma: PrismaService) {}

  async markDegraded(id: ProviderId, latencyMs: number, errorRate: number): Promise<void> {
    await this.prisma.provider.update({
      where: { id },
      data: {
        status: errorRate > 0.5 ? 'DOWN' : errorRate > 0.1 ? 'DEGRADED' : 'ACTIVE',
        latencyMs,
        errorRate,
        lastHealthAt: new Date(),
      },
    });
  }

  async recordSuccess(id: ProviderId, latencyMs: number): Promise<void> {
    const cur = await this.prisma.provider.findUnique({ where: { id } });
    if (!cur) return;
    const ema = cur.latencyMs ? Math.round(cur.latencyMs * 0.7 + latencyMs * 0.3) : latencyMs;
    const errorRate = cur.errorRate * 0.95;
    await this.prisma.provider.update({
      where: { id },
      data: {
        latencyMs: ema,
        errorRate,
        status: errorRate > 0.1 ? 'DEGRADED' : 'ACTIVE',
        lastHealthAt: new Date(),
      },
    });
  }

  async recordFailure(id: ProviderId): Promise<void> {
    const cur = await this.prisma.provider.findUnique({ where: { id } });
    if (!cur) return;
    const errorRate = Math.min(1, cur.errorRate * 0.95 + 0.1);
    await this.prisma.provider.update({
      where: { id },
      data: {
        errorRate,
        status: errorRate > 0.5 ? 'DOWN' : errorRate > 0.1 ? 'DEGRADED' : 'ACTIVE',
        lastHealthAt: new Date(),
      },
    });
  }
}
