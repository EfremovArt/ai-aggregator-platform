import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AssistantSummary = {
  slug: string;
  name: string;
  emoji: string | null;
  category: string;
  description: string;
  recommendedModel: string | null;
  isFeatured: boolean;
  uses: number;
};

export type AssistantDetail = AssistantSummary & {
  systemPrompt: string;
};

@Injectable()
export class AssistantsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(opts: { category?: string; onlyFeatured?: boolean } = {}): Promise<AssistantSummary[]> {
    const where: { isPublic: true; category?: string; isFeatured?: true } = { isPublic: true };
    if (opts.category) where.category = opts.category;
    if (opts.onlyFeatured) where.isFeatured = true;

    const items = await this.prisma.assistant.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { uses: 'desc' }, { name: 'asc' }],
      take: 100,
    });

    return items.map((a) => ({
      slug: a.slug,
      name: a.name,
      emoji: a.emoji,
      category: a.category,
      description: a.description,
      recommendedModel: a.recommendedModel,
      isFeatured: a.isFeatured,
      uses: a.uses,
    }));
  }

  async get(slug: string): Promise<AssistantDetail> {
    const a = await this.prisma.assistant.findUnique({ where: { slug } });
    if (!a || !a.isPublic) throw new NotFoundException(`Assistant "${slug}" not found`);
    return {
      slug: a.slug,
      name: a.name,
      emoji: a.emoji,
      category: a.category,
      description: a.description,
      systemPrompt: a.systemPrompt,
      recommendedModel: a.recommendedModel,
      isFeatured: a.isFeatured,
      uses: a.uses,
    };
  }

  async incrementUses(slug: string): Promise<void> {
    await this.prisma.assistant.updateMany({
      where: { slug, isPublic: true },
      data: { uses: { increment: 1 } },
    });
  }
}
