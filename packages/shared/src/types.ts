export type ProviderId =
  | 'OPENAI'
  | 'ANTHROPIC'
  | 'GOOGLE'
  | 'DEEPSEEK'
  | 'MISTRAL'
  | 'XAI'
  | 'QWEN'
  | 'CUSTOM';

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * OpenAI-style multimodal content. A message body may be:
 *   - a plain string (text-only), or
 *   - an array of content parts, each either `{type: 'text', text}` or
 *     `{type: 'image_url', image_url: {url}}`.
 *
 * Only models with the `IMAGE_INPUT` capability handle image parts upstream
 * — for everything else the gateway flattens parts back into a plain string
 * before forwarding (so legacy providers don't choke on the array shape).
 */
export type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

export interface ChatMessage {
  role: ChatRole;
  content: string | ChatContentPart[];
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stop?: string[];
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description?: string;
      parameters: Record<string, unknown>;
    };
  }>;
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  user?: string;
  metadata?: Record<string, unknown>;
}

export interface ChatCompletionUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  created: number;
  message: ChatMessage;
  finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'error';
  usage: ChatCompletionUsage;
}

export interface ChatCompletionStreamChunk {
  id: string;
  model: string;
  delta: Partial<ChatMessage>;
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'error' | null;
  usage?: ChatCompletionUsage;
}

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
  dimensions?: number;
}

export interface EmbeddingResponse {
  model: string;
  embeddings: number[][];
  usage: { promptTokens: number; totalTokens: number };
}

export interface ImageRequest {
  model: string;
  prompt: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  n?: number;
  quality?: 'standard' | 'hd';
}

export interface ImageResponse {
  model: string;
  images: Array<{ url?: string; b64?: string }>;
}

export interface ModerationRequest {
  model?: string;
  input: string | string[];
}

export interface ModerationResponse {
  flagged: boolean;
  categories: Record<string, boolean>;
  categoryScores: Record<string, number>;
}

export interface RiskContext {
  ip?: string;
  userAgent?: string;
  fingerprint?: string;
  email?: string;
  country?: string;
  userId?: string;
}

export interface RiskAssessment {
  score: number; // 0..100
  reasons: string[];
  shouldBlock: boolean;
  shouldChallenge: boolean;
}
