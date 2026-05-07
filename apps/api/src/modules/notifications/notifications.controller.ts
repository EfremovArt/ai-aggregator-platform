import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ZodPipe } from '../../common/pipes/zod.pipe';

const PrefsDto = z.object({
  notifyByEmail: z.boolean().optional(),
  notifyByTelegram: z.boolean().optional(),
  telegramChatId: z.string().trim().min(0).max(64).nullable().optional(),
  lowBalanceThresholdUsd: z.number().min(0).max(1000).nullable().optional(),
});
type PrefsDto = z.infer<typeof PrefsDto>;

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.list(user.id);
  }

  @Patch(':id/read')
  read(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notifications.markRead(user.id, id);
  }

  @Post('read-all')
  readAll(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Patch('preferences')
  updatePrefs(
    @Body(new ZodPipe(PrefsDto)) dto: PrefsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.notifications.updatePreferences(user.id, dto);
  }
}
