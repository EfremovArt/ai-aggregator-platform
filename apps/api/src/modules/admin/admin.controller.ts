import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';

@Controller('admin')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @Get('users')
  listUsers(@Query() q: { search?: string; status?: string; cursor?: string; take?: string }) {
    return this.admin.listUsers({
      search: q.search,
      status: q.status as never,
      cursor: q.cursor,
      take: q.take ? Number(q.take) : undefined,
    });
  }

  @Post('users/:id/ban')
  ban(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.admin.banUser(admin.id, id, body.reason);
  }

  @Post('users/:id/unban')
  unban(@Param('id') id: string) {
    return this.admin.unbanUser(id);
  }

  @Get('fraud-feed')
  fraud() {
    return this.admin.fraudFeed();
  }

  @Get('moderation-queue')
  modQueue() {
    return this.admin.moderationQueue();
  }

  @Post('moderation/:id/:status')
  resolveMod(
    @Param('id') id: string,
    @Param('status') status: 'APPROVED' | 'REJECTED',
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.admin.resolveModeration(id, status, admin.id);
  }

  @Get('unprofitable-users')
  unprofitable() {
    return this.admin.unprofitableUsers();
  }
}
