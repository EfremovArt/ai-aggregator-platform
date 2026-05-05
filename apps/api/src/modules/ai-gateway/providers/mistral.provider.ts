import { Injectable, Logger } from '@nestjs/common';
import type { ProviderId } from '@prisma/client';

import type { IAiProvider } from './provider.interface';
import { OpenAICompatibleAdapter } from './openai-compatible.adapter';

@Injectable()
export class MistralProvider extends OpenAICompatibleAdapter implements IAiProvider {
  override readonly id: ProviderId = 'MISTRAL';
  protected override logger = new Logger('MistralProvider');
  protected override get apiKey(): string | undefined {
    return process.env.MISTRAL_API_KEY;
  }
  protected override get baseUrl(): string {
    return 'https://api.mistral.ai/v1';
  }
  toProviderModel(slug: string): string {
    return slug.replace(/^mistral\//, '');
  }
}
