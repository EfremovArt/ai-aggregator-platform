import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get('health')
  async health(): Promise<{ status: string; checks: Record<string, string> }> {
    const checks: Record<string, string> = {};
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.db = 'ok';
    } catch (e) {
      checks.db = `error: ${(e as Error).message}`;
    }
    try {
      const pong = await this.redis.client.ping();
      checks.redis = pong === 'PONG' ? 'ok' : 'unexpected';
    } catch (e) {
      checks.redis = `error: ${(e as Error).message}`;
    }
    const status = Object.values(checks).every((v) => v === 'ok') ? 'healthy' : 'degraded';
    return { status, checks };
  }
}
