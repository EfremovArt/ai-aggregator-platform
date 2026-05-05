import { Injectable, Logger } from '@nestjs/common';
import type { ProviderId } from '@prisma/client';

import type { IAiProvider } from './provider.interface';
import { OpenAICompatibleAdapter } from './openai-compatible.adapter';

@Injectable()
export class QwenProvider extends OpenAICompatibleAdapter implements IAiProvider {
  override readonly id: ProviderId = 'QWEN';
  protected override logger = new Logger('QwenProvider');
  protected override get apiKey(): string | undefined {
    return process.env.QWEN_API_KEY;
  }
  protected override get baseUrl(): string {
    return process.env.QWEN_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  }
  toProviderModel(slug: string): string {
    return slug.replace(/^qwen\//, '');
  }
}
