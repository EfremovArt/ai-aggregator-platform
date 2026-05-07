import { Injectable } from '@nestjs/common';
import type { ChatCompletionRequest } from '@ai-platform/shared';

@Injectable()
export class TokenEstimatorService {
  /**
   * Cheap, provider-agnostic prompt token estimator. Real production would
   * use tiktoken / cl100k_base, but this gives sane preflight numbers
   * (≈4 chars per token for English; ~2.5 for Cyrillic).
   */
  estimateChat(req: ChatCompletionRequest): number {
    let chars = 0;
    for (const m of req.messages) {
      chars += (m.content?.length ?? 0) + 6; // role/sep overhead
    }
    const cyrillic = req.messages.some((m) => /[\u0400-\u04FF]/.test(m.content));
    const charsPerToken = cyrillic ? 2.5 : 4;
    return Math.ceil(chars / charsPerToken) + 16;
  }
}
