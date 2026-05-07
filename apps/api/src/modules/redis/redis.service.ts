import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Redis');
  private _client?: Redis;

  get client(): Redis {
    if (!this._client) {
      throw new Error('Redis client not initialised');
    }
    return this._client;
  }

  async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this._client = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    this._client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
    this._client.on('connect', () => this.logger.log('Redis connected'));
  }

  async onModuleDestroy(): Promise<void> {
    await this._client?.quit();
  }

  // ---- Sliding window rate limit (atomic via Lua) ------------------------
  // Returns { allowed, count, retryAfterSeconds }
  async slidingWindow(
    key: string,
    windowSeconds: number,
    limit: number,
  ): Promise<{ allowed: boolean; count: number; retryAfter: number }> {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;

    const lua = `
      local key = KEYS[1]
      local windowStart = tonumber(ARGV[1])
      local now = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      local member = ARGV[4]
      local ttl = tonumber(ARGV[5])
      redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
      local count = tonumber(redis.call('ZCARD', key))
      if count < limit then
        redis.call('ZADD', key, now, member)
        redis.call('PEXPIRE', key, ttl)
        return {1, count + 1, 0}
      end
      local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
      local oldestScore = tonumber(oldest[2]) or now
      local retryAfterMs = (oldestScore + ttl) - now
      return {0, count, math.max(retryAfterMs, 0)}
    `;
    const ttlMs = windowSeconds * 1000;
    const res = (await this.client.eval(
      lua,
      1,
      key,
      String(windowStart),
      String(now),
      String(limit),
      member,
      String(ttlMs),
    )) as [number, number, number];
    return { allowed: res[0] === 1, count: res[1], retryAfter: Math.ceil(res[2] / 1000) };
  }

  // ---- Token bucket ------------------------------------------------------
  async tokenBucket(
    key: string,
    capacity: number,
    refillPerSecond: number,
    cost = 1,
  ): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
    const now = Date.now();
    const lua = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refill = tonumber(ARGV[2])
      local cost = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])
      local data = redis.call('HMGET', key, 'tokens', 'ts')
      local tokens = tonumber(data[1]) or capacity
      local ts = tonumber(data[2]) or now
      local elapsed = math.max(0, (now - ts) / 1000)
      tokens = math.min(capacity, tokens + elapsed * refill)
      local allowed = 0
      local retry = 0
      if tokens >= cost then
        tokens = tokens - cost
        allowed = 1
      else
        retry = math.ceil(((cost - tokens) / refill) * 1000)
      end
      redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
      redis.call('PEXPIRE', key, math.ceil((capacity / refill) * 1000) + 1000)
      return {allowed, math.floor(tokens), retry}
    `;
    const res = (await this.client.eval(
      lua,
      1,
      key,
      String(capacity),
      String(refillPerSecond),
      String(cost),
      String(now),
    )) as [number, number, number];
    return { allowed: res[0] === 1, remaining: res[1], retryAfter: Math.ceil(res[2] / 1000) };
  }

  // ---- Generic helpers ---------------------------------------------------
  async get<T = unknown>(key: string): Promise<T | null> {
    const v = await this.client.get(key);
    if (!v) return null;
    try {
      return JSON.parse(v) as T;
    } catch {
      return v as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const v = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, v, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, v);
    }
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const v = await this.client.incr(key);
    if (v === 1 && ttlSeconds) await this.client.expire(key, ttlSeconds);
    return v;
  }

  async del(...keys: string[]): Promise<number> {
    if (!keys.length) return 0;
    return this.client.del(keys);
  }
}
