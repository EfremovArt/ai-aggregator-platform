import { Controller, Get, Param } from '@nestjs/common';
import { BlogService } from './blog.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('blog/posts')
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  @Public()
  @Get()
  list() {
    return this.blog.list();
  }

  @Public()
  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.blog.get(slug);
  }
}
