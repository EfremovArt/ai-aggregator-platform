import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { createApiKeySchema } from '@ai-platform/shared';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { ApiKeysService } from './api-keys.service';

@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly svc: ApiKeysService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodPipe(createApiKeySchema)) body: never,
  ) {
    return this.svc.create(user.id, body);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.svc.list(user.id);
  }

  @Delete(':id')
  revoke(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.svc.revoke(user.id, id);
  }
}
