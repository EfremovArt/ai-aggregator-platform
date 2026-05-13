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
export class GoogleProvider implements IAiProvider {
  readonly id: ProviderId = 'GOOGLE';
  private readonly logger = new Logger('GoogleProvider');

  toProviderModel(slug: string): string {
    return slug.replace(/^google\//, '');
  }

  isConfigured(): boolean {
    return Boolean(process.env.GOOGLE_AI_API_KEY);
  }

  private buildContents(req: ChatCompletionRequest) {
    return req.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: flattenContent(m.content) }],
      }));
  }

  private buildSystem(req: ChatCompletionRequest) {
    const sys = req.messages
      .filter((m) => m.role === 'system')
      .map((m) => flattenContent(m.content))
      .join('\n\n');
    return sys ? { systemInstruction: { parts: [{ text: sys }] } } : {};
  }

  async chat(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException({ code: 'provider_not_configured' });
    }
    const model = this.toProviderModel(req.model);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: this.buildContents(req),
        ...this.buildSystem(req),
        generationConfig: {
          temperature: req.temperature,
          topP: req.topP,
          maxOutputTokens: req.maxTokens,
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new ServiceUnavailableException({ code: 'upstream_error', message: text.slice(0, 500) });
    }
    const j = (await res.json()) as {
      candidates: { content: { parts: { text: string }[] }; finishReason: string }[];
      usageMetadata: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number };
    };
    const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
    return {
      id: ulid(),
      model: req.model,
      created: Math.floor(Date.now() / 1000),
      message: { role: 'assistant', content: text },
      finishReason: 'stop',
      usage: {
        promptTokens: j.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: j.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: j.usageMetadata?.totalTokenCount ?? 0,
      },
    };
  }

  async *chatStream(req: ChatCompletionRequest): AsyncGenerator<ChatCompletionStreamChunk> {
    // Google supports SSE on streamGenerateContent — implementation simplified below.
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException({ code: 'provider_not_configured' });
    }
    const model = this.toProviderModel(req.model);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${process.env.GOOGLE_AI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: this.buildContents(req),
        ...this.buildSystem(req),
        generationConfig: {
          temperature: req.temperature,
          maxOutputTokens: req.maxTokens,
        },
      }),
    });
    if (!res.ok || !res.body) {
      const text = await res.text();
      throw new ServiceUnavailableException({ code: 'upstream_error', message: text.slice(0, 500) });
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    const id = ulid();
    let totalIn = 0;
    let totalOut = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        try {
          const j = JSON.parse(data) as {
            candidates?: { content?: { parts?: { text: string }[] } }[];
            usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
          };
          const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
          if (text) {
            yield { id, model: req.model, delta: { role: 'assistant', content: text }, finishReason: null };
          }
          if (j.usageMetadata?.promptTokenCount) totalIn = j.usageMetadata.promptTokenCount;
          if (j.usageMetadata?.candidatesTokenCount) totalOut = j.usageMetadata.candidatesTokenCount;
        } catch {
          /* skip */
        }
      }
    }
    yield {
      id,
      model: req.model,
      delta: {},
      finishReason: 'stop',
      usage: { promptTokens: totalIn, completionTokens: totalOut, totalTokens: totalIn + totalOut },
    };
  }
}
