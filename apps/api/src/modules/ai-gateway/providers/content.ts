import type { ChatContentPart } from '@ai-platform/shared';

/**
 * Flatten a chat message body into plain text. Used by providers that talk
 * to non-OpenAI-compatible APIs (Anthropic, Google) where the request shape
 * doesn't accept OpenAI content-part arrays. Image parts are dropped — those
 * providers either reject vision input or use their own format that we don't
 * speak yet.
 */
export function flattenContent(content: string | ChatContentPart[]): string {
  if (typeof content === 'string') return content;
  return content
    .map((p) => (p.type === 'text' ? p.text : ''))
    .filter((s) => s.length > 0)
    .join('\n\n');
}
