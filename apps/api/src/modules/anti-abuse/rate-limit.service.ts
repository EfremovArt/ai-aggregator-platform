import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export interface RateLimitDef {
  key: string;
  windowSec: number;
  limit: number;
}

@Injectable()
export class RateLimitService {
  constructor(private readonly redis: RedisService) {}

  async check(def: RateLimitDef): Promise<{ allowed: boolean; retryAfter: number }> {
    const res = await this.redis.slidingWindow(`rl:${def.key}`, def.windowSec, def.limit);
    return { allowed: res.allowed, retryAfter: res.retryAfter };
  }

  async tokenBucket(key: string, capacity: number, refillPerSec: number, cost = 1) {
    return this.redis.tokenBucket(`tb:${key}`, capacity, refillPerSec, cost);
  }
}
