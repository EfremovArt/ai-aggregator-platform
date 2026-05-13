import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ulid } from 'ulid';
import type { ProviderId } from '@prisma/client';

import type { IAiProvider } from './provider.interface';
import { flattenContent } from './content';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionStreamChunk,
} from '@ai-platform/shared';

@Injectable()
export class AnthropicProvider implements IAiProvider {
  readonly id: ProviderId = 'ANTHROPIC';
  private readonly logger = new Logger('AnthropicProvider');

  toProviderModel(slug: string): string {
    return slug.replace(/^anthropic\//, '');
  }

  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    };
  }

  private toAnthropicMessages(req: ChatCompletionRequest) {
    const system = req.messages
      .filter((m) => m.role === 'system')
      .map((m) => flattenContent(m.content))
      .join('\n\n');
    const messages = req.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: flattenContent(m.content),
      }));
    return { system: system || undefined, messages };
  }

  async chat(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException({ code: 'provider_not_configured', message: 'Anthropic not configured' });
    }
    const { system, messages } = this.toAnthropicMessages(req);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.toProviderModel(req.model),
        max_tokens: req.maxTokens ?? 1024,
        temperature: req.temperature,
        system,
        messages,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new ServiceUnavailableException({ code: 'upstream_error', message: text.slice(0, 500) });
    }
    const j = (await res.json()) as {
      id: string;
      model: string;
      content: { type: string; text: string }[];
      stop_reason: string;
      usage: { input_tokens: number; output_tokens: number };
    };
    const content = j.content?.find((c) => c.type === 'text')?.text ?? '';
    return {
      id: j.id ?? ulid(),
      model: j.model,
      created: Math.floor(Date.now() / 1000),
      message: { role: 'assistant', content },
      finishReason:
        j.stop_reason === 'max_tokens'
          ? 'length'
          : j.stop_reason === 'tool_use'
            ? 'tool_calls'
            : 'stop',
      usage: {
        promptTokens: j.usage.input_tokens,
        completionTokens: j.usage.output_tokens,
        totalTokens: j.usage.input_tokens + j.usage.output_tokens,
      },
    };
  }

  async *chatStream(req: ChatCompletionRequest): AsyncGenerator<ChatCompletionStreamChunk> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException({ code: 'provider_not_configured' });
    }
    const { system, messages } = this.toAnthropicMessages(req);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.toProviderModel(req.model),
        max_tokens: req.maxTokens ?? 1024,
        temperature: req.temperature,
        system,
        messages,
        stream: true,
      }),
    });
    if (!res.ok || !res.body) {
      const text = await res.text();
      throw new ServiceUnavailableException({ code: 'upstream_error', message: text.slice(0, 500) });
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let inputTokens = 0;
    let outputTokens = 0;
    const id = ulid();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const events = buf.split('\n\n');
      buf = events.pop() ?? '';
      for (const evt of events) {
        const dataLine = evt.split('\n').find((l) => l.startsWith('data:'));
        if (!dataLine) continue;
        const data = dataLine.slice(5).trim();
        if (!data) continue;
        try {
          const j = JSON.parse(data) as {
            type: string;
            delta?: { type?: string; text?: string; stop_reason?: string };
            usage?: { input_tokens?: number; output_tokens?: number };
            message?: { usage?: { input_tokens?: number; output_tokens?: number } };
          };
          if (j.type === 'message_start') {
            inputTokens = j.message?.usage?.input_tokens ?? 0;
          } else if (j.type === 'content_block_delta' && j.delta?.type === 'text_delta') {
            yield {
              id,
              model: req.model,
              delta: { role: 'assistant', content: j.delta.text ?? '' },
              finishReason: null,
            };
          } else if (j.type === 'message_delta' && j.usage?.output_tokens) {
            outputTokens = j.usage.output_tokens;
          } else if (j.type === 'message_stop') {
            yield {
              id,
              model: req.model,
              delta: {},
              finishReason: 'stop',
              usage: {
                promptTokens: inputTokens,
                completionTokens: outputTokens,
                totalTokens: inputTokens + outputTokens,
              },
            };
          }
        } catch {
          // skip
        }
      }
    }
  }
}
