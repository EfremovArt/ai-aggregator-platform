import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { ulid } from 'ulid';
import type { ProviderId } from '@prisma/client';

import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionStreamChunk,
} from '@ai-platform/shared';

/**
 * Base class for providers that implement the OpenAI Chat Completions wire format.
 * Used by OpenAI, DeepSeek, Mistral, xAI, Qwen, and several Anthropic-compatible
 * proxies (we override Anthropic separately because its native API differs).
 */
export abstract class OpenAICompatibleAdapter {
  abstract readonly id: ProviderId;
  protected logger = new Logger('OpenAICompatibleAdapter');

  protected abstract get apiKey(): string | undefined;
  protected abstract get baseUrl(): string;

  abstract toProviderModel(slug: string): string;

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  protected headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  protected async fetchJson<T>(path: string, body: unknown): Promise<T> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException({
        code: 'provider_not_configured',
        message: `Provider ${this.id} is not configured (missing API key)`,
      });
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.warn(`${this.id} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
      throw new ServiceUnavailableException({
        code: 'upstream_error',
        message: `Provider ${this.id} returned ${res.status}`,
        details: text.slice(0, 500),
      });
    }
    return (await res.json()) as T;
  }

  async chat(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const payload: Record<string, unknown> = {
      model: this.toProviderModel(req.model),
      messages: req.messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.name ? { name: m.name } : {}),
        ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
      })),
      stream: false,
    };
    if (req.temperature != null) payload.temperature = req.temperature;
    if (req.topP != null) payload.top_p = req.topP;
    if (req.maxTokens != null) payload.max_tokens = req.maxTokens;
    if (req.stop) payload.stop = req.stop;
    if (req.tools) payload.tools = req.tools;
    if (req.toolChoice) payload.tool_choice = req.toolChoice;
    if (req.user) payload.user = req.user;

    const json = await this.fetchJson<{
      id: string;
      model: string;
      created: number;
      choices: { message: { role: string; content: string }; finish_reason: string }[];
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    }>('/chat/completions', payload);

    const choice = json.choices[0];
    return {
      id: json.id ?? ulid(),
      model: json.model ?? req.model,
      created: json.created ?? Math.floor(Date.now() / 1000),
      message: { role: 'assistant', content: choice?.message?.content ?? '' },
      finishReason:
        ((choice?.finish_reason ?? 'stop') as ChatCompletionResponse['finishReason']) || 'stop',
      usage: {
        promptTokens: json.usage?.prompt_tokens ?? 0,
        completionTokens: json.usage?.completion_tokens ?? 0,
        totalTokens: json.usage?.total_tokens ?? 0,
      },
    };
  }

  async *chatStream(req: ChatCompletionRequest): AsyncGenerator<ChatCompletionStreamChunk> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException({
        code: 'provider_not_configured',
        message: `Provider ${this.id} is not configured (missing API key)`,
      });
    }
    const payload: Record<string, unknown> = {
      model: this.toProviderModel(req.model),
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      stream_options: { include_usage: true },
    };
    if (req.temperature != null) payload.temperature = req.temperature;
    if (req.maxTokens != null) payload.max_tokens = req.maxTokens;

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });
    if (!res.ok || !res.body) {
      const text = await res.text();
      throw new ServiceUnavailableException({
        code: 'upstream_error',
        message: `Provider ${this.id} returned ${res.status}`,
        details: text.slice(0, 500),
      });
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let id = ulid();
    let model = req.model;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const evt = JSON.parse(data) as {
            id?: string;
            model?: string;
            choices?: { delta?: { role?: string; content?: string }; finish_reason?: string | null }[];
            usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
          };
          id = evt.id ?? id;
          model = evt.model ?? model;
          const choice = evt.choices?.[0];
          if (choice) {
            yield {
              id,
              model,
              delta: {
                role: (choice.delta?.role as 'assistant' | undefined) ?? 'assistant',
                content: choice.delta?.content ?? '',
              },
              finishReason: (choice.finish_reason ?? null) as ChatCompletionStreamChunk['finishReason'],
            };
          }
          if (evt.usage) {
            yield {
              id,
              model,
              delta: {},
              usage: {
                promptTokens: evt.usage.prompt_tokens,
                completionTokens: evt.usage.completion_tokens,
                totalTokens: evt.usage.total_tokens,
              },
            };
          }
        } catch {
          // ignore malformed sse chunk
        }
      }
    }
  }
}
