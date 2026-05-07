import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.referrals.getOrCreateForUser(user.id);
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.referrals.stats(user.id);
  }
}
