import { Injectable, Logger } from '@nestjs/common';
import type { ProviderId } from '@prisma/client';

import type { IAiProvider } from './provider.interface';
import { OpenAICompatibleAdapter } from './openai-compatible.adapter';

@Injectable()
export class XaiProvider extends OpenAICompatibleAdapter implements IAiProvider {
  override readonly id: ProviderId = 'XAI';
  protected override logger = new Logger('XaiProvider');
  protected override get apiKey(): string | undefined {
    return process.env.XAI_API_KEY;
  }
  protected override get baseUrl(): string {
    return 'https://api.x.ai/v1';
  }
  toProviderModel(slug: string): string {
    return slug.replace(/^xai\//, '');
  }
}
