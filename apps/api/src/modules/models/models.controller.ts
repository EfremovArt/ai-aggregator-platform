import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { ModelsService } from './models.service';

@Controller('models')
export class ModelsController {
  constructor(private readonly svc: ModelsService) {}

  @Public()
  @Get()
  list() {
    return this.svc.list();
  }

  @Public()
  @Get(':slug')
  async one(@Param('slug') slug: string) {
    const m = await this.svc.findBySlug(slug);
    return {
      slug: m.slug,
      displayName: m.displayName,
      provider: m.provider.displayName,
      capabilities: m.capabilities,
      pricing: {
        inputUsdPer1M: Number(m.inputUsdPer1M),
        outputUsdPer1M: Number(m.outputUsdPer1M),
      },
      contextLength: m.contextLength,
      maxOutputTokens: m.maxOutputTokens,
    };
  }
}
