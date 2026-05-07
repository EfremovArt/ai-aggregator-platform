import { Controller, Get, UseGuards } from '@nestjs/common';
import { FreeTierService } from './free-tier.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('free-tier')
export class FreeTierController {
  constructor(private readonly freeTier: FreeTierService) {}

  @Public()
  @Get('config')
  config() {
    return this.freeTier.getConfig();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.freeTier.getQuotaForUser(user.id);
  }
}
