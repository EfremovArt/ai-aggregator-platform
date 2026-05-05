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
import type { ProviderId } from '@prisma/client';

export interface IAiProvider {
  readonly id: ProviderId;

  /** Convert our internal model slug (e.g. "openai/gpt-4o-mini") to the provider's native model id. */
  toProviderModel(slug: string): string;

  isConfigured(): boolean;

  chat(req: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  chatStream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionStreamChunk>;
  embed?(req: EmbeddingRequest): Promise<EmbeddingResponse>;
  image?(req: ImageRequest): Promise<ImageResponse>;
  moderate?(req: ModerationRequest): Promise<ModerationResponse>;
}
