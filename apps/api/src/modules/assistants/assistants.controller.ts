import { Controller, Get, Param, Query } from '@nestjs/common';
import { AssistantsService } from './assistants.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('assistants')
export class AssistantsController {
  constructor(private readonly assistants: AssistantsService) {}

  @Public()
  @Get()
  list(@Query('category') category?: string, @Query('featured') featured?: string) {
    return this.assistants.list({
      category,
      onlyFeatured: featured === 'true',
    });
  }

  @Public()
  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.assistants.get(slug);
  }
}
