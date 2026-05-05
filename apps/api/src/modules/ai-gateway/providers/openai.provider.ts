import { Injectable, Logger } from '@nestjs/common';
import type { ProviderId } from '@prisma/client';

import type { IAiProvider } from './provider.interface';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionStreamChunk,
  EmbeddingRequest,
  EmbeddingResponse,
  ImageRequest,
  ImageResponse,
  ModerationRequest,
  ModerationResponse,
} from '@ai-platform/shared';

import { OpenAICompatibleAdapter } from './openai-compatible.adapter';

/**
 * OpenAI provider — uses the standard OpenAI Chat Completions API.
 */
@Injectable()
export class OpenAIProvider extends OpenAICompatibleAdapter implements IAiProvider {
  override readonly id: ProviderId = 'OPENAI';
  protected override logger = new Logger('OpenAIProvider');

  protected override get apiKey(): string | undefined {
    return process.env.OPENAI_API_KEY;
  }
  protected override get baseUrl(): string {
    return process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
  }

  toProviderModel(slug: string): string {
    return slug.replace(/^openai\//, '');
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const res = await this.fetchJson<{
      data: { embedding: number[] }[];
      usage: { prompt_tokens: number; total_tokens: number };
      model: string;
    }>('/embeddings', {
      model: this.toProviderModel(req.model),
      input: req.input,
      dimensions: req.dimensions,
    });
    return {
      model: res.model,
      embeddings: res.data.map((d) => d.embedding),
      usage: { promptTokens: res.usage.prompt_tokens, totalTokens: res.usage.total_tokens },
    };
  }

  async image(req: ImageRequest): Promise<ImageResponse> {
    const res = await this.fetchJson<{
      data: { url?: string; b64_json?: string }[];
    }>('/images/generations', {
      model: this.toProviderModel(req.model),
      prompt: req.prompt,
      size: req.size ?? '1024x1024',
      n: req.n ?? 1,
      quality: req.quality ?? 'standard',
    });
    return {
      model: req.model,
      images: res.data.map((d) => ({ url: d.url, b64: d.b64_json })),
    };
  }

  async moderate(req: ModerationRequest): Promise<ModerationResponse> {
    const res = await this.fetchJson<{
      results: { flagged: boolean; categories: Record<string, boolean>; category_scores: Record<string, number> }[];
    }>('/moderations', {
      model: this.toProviderModel(req.model ?? 'openai/omni-moderation-latest'),
      input: req.input,
    });
    const r = res.results[0];
    return {
      flagged: r?.flagged ?? false,
      categories: r?.categories ?? {},
      categoryScores: r?.category_scores ?? {},
    };
  }
}
