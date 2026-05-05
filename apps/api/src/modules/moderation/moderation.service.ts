import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ModerationCategory, ModerationStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { KeywordModerationService } from './keyword-moderation.service';

@Injectable()
export class ModerationService {
  private readonly logger = new Logger('Moderation');

  constructor(
    private readonly prisma: PrismaService,
    private readonly keyword: KeywordModerationService,
  ) {}

  async checkInputs(content: string, userId?: string): Promise<void> {
    const local = this.keyword.scan(content);
    if (local.flagged) {
      await this.queue(content, userId, local.categories, ModerationStatus.AUTO_BLOCKED, 'keyword');
      throw new HttpException(
        { code: 'moderation_blocked', message: 'Content violates moderation policy', categories: local.categories },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (process.env.OPENAI_API_KEY) {
      try {
        const res = await fetch('https://api.openai.com/v1/moderations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({ model: 'omni-moderation-latest', input: content.slice(0, 4000) }),
        });
        if (res.ok) {
          const j = (await res.json()) as {
            results?: { flagged?: boolean; categories?: Record<string, boolean>; category_scores?: Record<string, number> }[];
          };
          const r = j.results?.[0];
          if (r?.flagged) {
            const cats = this.mapOpenAICategories(r.categories ?? {});
            await this.queue(content, userId, cats, ModerationStatus.AUTO_BLOCKED, 'openai');
            throw new HttpException(
              { code: 'moderation_blocked', message: 'Content violates moderation policy', categories: cats },
              HttpStatus.UNPROCESSABLE_ENTITY,
            );
          }
        }
      } catch (e) {
        if (e instanceof HttpException) throw e;
        this.logger.warn(`OpenAI moderation failed: ${(e as Error).message}`);
      }
    }
  }

  private mapOpenAICategories(cats: Record<string, boolean>): ModerationCategory[] {
    const out: ModerationCategory[] = [];
    if (cats['sexual/minors'] || cats['child/sexual']) out.push('CSAM');
    if (cats['violence'] || cats['violence/graphic']) out.push('VIOLENCE');
    if (cats['hate']) out.push('HATE');
    if (cats['sexual']) out.push('SEXUAL');
    if (cats['self-harm']) out.push('SELF_HARM');
    if (cats['harassment']) out.push('HATE');
    if (out.length === 0) out.push('OTHER');
    return out;
  }

  private async queue(
    content: string,
    userId: string | undefined,
    categories: ModerationCategory[],
    status: ModerationStatus,
    source: string,
  ): Promise<void> {
    await this.prisma.moderationItem.create({
      data: {
        userId,
        status,
        categories,
        source,
        contentHash: createHash('sha256').update(content).digest('hex'),
        contentSnippet: content.slice(0, 500),
      },
    });
  }
}
