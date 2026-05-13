import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RedisService } from '../redis/redis.service';
import type { ChatCompletionRequest, ChatCompletionResponse } from '@ai-platform/shared';

@Injectable()
export class SemanticCacheService {
  constructor(private readonly redis: RedisService) {}

  buildKey(req: ChatCompletionRequest): string {
    const normalized = {
      model: req.model,
      messages: req.messages.map((m) => ({
        role: m.role,
        // Trim whitespace only for plain-text messages. For multimodal arrays
        // (images), use the raw payload — image data URLs aren't normalizable.
        content: typeof m.content === 'string' ? m.content.trim() : m.content,
      })),
      temperature: req.temperature ?? 0,
      maxTokens: req.maxTokens ?? 0,
    };
    return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
  }

  async lookup(req: ChatCompletionRequest): Promise<ChatCompletionResponse | null> {
    if ((req.temperature ?? 0) > 0.2) return null; // only cache low-randomness
    return this.redis.get<ChatCompletionResponse>(`chat-cache:${this.buildKey(req)}`);
  }

  async store(req: ChatCompletionRequest, res: ChatCompletionResponse, ttlSeconds = 3600): Promise<void> {
    if ((req.temperature ?? 0) > 0.2) return;
    await this.redis.set(`chat-cache:${this.buildKey(req)}`, res, ttlSeconds);
  }
}
