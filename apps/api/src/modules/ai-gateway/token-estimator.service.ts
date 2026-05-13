import { Injectable } from '@nestjs/common';
import type { ChatCompletionRequest, ChatContentPart } from '@ai-platform/shared';

function contentToText(content: string | ChatContentPart[]): string {
  if (typeof content === 'string') return content;
  return content.map((p) => (p.type === 'text' ? p.text : '')).join('\n\n');
}

// Each image attachment costs roughly this many input tokens regardless of
// actual size. ~85 is the OpenAI low-detail flat rate; high-detail costs more
// but for a preflight estimate this is close enough.
const IMAGE_TOKEN_COST = 85;

@Injectable()
export class TokenEstimatorService {
  /**
   * Cheap, provider-agnostic prompt token estimator. Real production would
   * use tiktoken / cl100k_base, but this gives sane preflight numbers
   * (≈4 chars per token for English; ~2.5 for Cyrillic).
   */
  estimateChat(req: ChatCompletionRequest): number {
    let chars = 0;
    let imageParts = 0;
    let cyrillic = false;
    for (const m of req.messages) {
      const text = contentToText(m.content);
      chars += text.length + 6; // role/sep overhead
      if (/[\u0400-\u04FF]/.test(text)) cyrillic = true;
      if (Array.isArray(m.content)) {
        for (const p of m.content) if (p.type === 'image_url') imageParts++;
      }
    }
    const charsPerToken = cyrillic ? 2.5 : 4;
    return Math.ceil(chars / charsPerToken) + 16 + imageParts * IMAGE_TOKEN_COST;
  }
}
