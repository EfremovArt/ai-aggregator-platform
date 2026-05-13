import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ModelsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const models = await this.prisma.model.findMany({
      where: { isActive: true },
      include: { provider: true },
      orderBy: [{ isFeatured: 'desc' }, { displayName: 'asc' }],
    });
    return models.map((m) => ({
      slug: m.slug,
      displayName: m.displayName,
      provider: { id: m.provider.id, displayName: m.provider.displayName, status: m.provider.status },
      family: m.family,
      description: m.description,
      capabilities: m.capabilities,
      contextLength: m.contextLength,
      maxOutputTokens: m.maxOutputTokens,
      pricing: {
        inputUsdPer1M: Number(m.inputUsdPer1M),
        outputUsdPer1M: Number(m.outputUsdPer1M),
        inputRubPer1M: Number(m.inputRubPer1M),
        outputRubPer1M: Number(m.outputRubPer1M),
        marginPercent: m.marginPercent,
      },
      source: m.source,
      tags: m.tags,
      isFeatured: m.isFeatured,
    }));
  }

  async findBySlug(slug: string) {
    const model = await this.prisma.model.findUnique({ where: { slug }, include: { provider: true } });
    if (!model) throw new NotFoundException({ code: 'model_not_found' });
    return model;
  }
}
