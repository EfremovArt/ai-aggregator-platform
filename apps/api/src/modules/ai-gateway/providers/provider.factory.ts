import { Injectable } from '@nestjs/common';
import type { ProviderId } from '@prisma/client';
import type { IAiProvider } from './provider.interface';
import { OpenAIProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';
import { GoogleProvider } from './google.provider';
import { DeepSeekProvider } from './deepseek.provider';
import { MistralProvider } from './mistral.provider';
import { XaiProvider } from './xai.provider';
import { QwenProvider } from './qwen.provider';

@Injectable()
export class ProviderFactory {
  private readonly map: Partial<Record<ProviderId, IAiProvider>>;

  constructor(
    openai: OpenAIProvider,
    anthropic: AnthropicProvider,
    google: GoogleProvider,
    deepseek: DeepSeekProvider,
    mistral: MistralProvider,
    xai: XaiProvider,
    qwen: QwenProvider,
  ) {
    this.map = {
      OPENAI: openai,
      ANTHROPIC: anthropic,
      GOOGLE: google,
      DEEPSEEK: deepseek,
      MISTRAL: mistral,
      XAI: xai,
      QWEN: qwen,
    };
  }

  get(id: ProviderId): IAiProvider {
    const p = this.map[id];
    if (!p) throw new Error(`Unsupported provider: ${id}`);
    return p;
  }
}
