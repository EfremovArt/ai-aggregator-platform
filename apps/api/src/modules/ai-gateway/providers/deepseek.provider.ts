import { Injectable, Logger } from '@nestjs/common';
import type { ProviderId } from '@prisma/client';

import type { IAiProvider } from './provider.interface';
import { OpenAICompatibleAdapter } from './openai-compatible.adapter';

@Injectable()
export class DeepSeekProvider extends OpenAICompatibleAdapter implements IAiProvider {
  override readonly id: ProviderId = 'DEEPSEEK';
  protected override logger = new Logger('DeepSeekProvider');
  protected override get apiKey(): string | undefined {
    return process.env.DEEPSEEK_API_KEY;
  }
  protected override get baseUrl(): string {
    return process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1';
  }
  toProviderModel(slug: string): string {
    return slug.replace(/^deepseek\//, '');
  }
}
