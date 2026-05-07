import { Injectable } from '@nestjs/common';
import type { ModerationCategory } from '@prisma/client';

// Lightweight, conservative keyword filter. Production should pair this with
// OpenAI moderation and human review queues.
const RULES: Array<{ pattern: RegExp; category: ModerationCategory }> = [
  // CSAM — strict zero-tolerance.
  { pattern: /\b(child(?:ren)?\s+(?:porn|sex|nude))\b/i, category: 'CSAM' },
  { pattern: /\bcp\s+(images?|videos?)\b/i, category: 'CSAM' },
  { pattern: /\b(?:underage|minor)\s+(?:porn|sex|nude)\b/i, category: 'CSAM' },

  // Terrorism / weapons of mass destruction.
  { pattern: /\b(make|build|synthes(?:ize|ise))\s+(?:bomb|explosive|nerve\s+agent|sarin|ricin|anthrax)\b/i, category: 'TERRORISM' },
  { pattern: /\b(pipe|nail|nuclear|dirty)\s+bomb\b/i, category: 'TERRORISM' },

  // Malware
  { pattern: /\b(write|generate|create)\s+(?:ransomware|trojan|keylogger|rootkit)\b/i, category: 'MALWARE' },
  { pattern: /\b(?:rce|0day|exploit)\s+for\s+(?:windows|linux|cisco)\b/i, category: 'MALWARE' },

  // Fraud / scams
  { pattern: /\b(stolen|carded?|cvv)\s+(credit\s+card|cc)\b/i, category: 'FRAUD' },
  { pattern: /\b(phishing|scam)\s+(?:email|page|template)\b/i, category: 'FRAUD' },

  // Prompt injection
  { pattern: /\bignore\s+(?:all\s+)?(?:previous|prior)\s+instructions?\b/i, category: 'PROMPT_INJECTION' },
];

@Injectable()
export class KeywordModerationService {
  scan(content: string): { flagged: boolean; categories: ModerationCategory[] } {
    const cats = new Set<ModerationCategory>();
    for (const rule of RULES) {
      if (rule.pattern.test(content)) cats.add(rule.category);
    }
    // CSAM is hard-block. Other categories flag for review but typically still
    // pass to upstream provider whose moderation is the final say.
    const flagged = cats.has('CSAM') || cats.has('TERRORISM');
    return { flagged, categories: Array.from(cats) };
  }
}
