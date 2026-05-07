import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import type { Request } from 'express';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { getClientIp, getUserAgent } from '../../common/utils/ip';

const RedeemDto = z.object({
  code: z.string().trim().min(2).max(64),
});
type RedeemDto = z.infer<typeof RedeemDto>;

@UseGuards(JwtAuthGuard)
@Controller('coupons')
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Post('redeem')
  async redeem(
    @Body(new ZodPipe(RedeemDto)) dto: RedeemDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ip = getClientIp(req);
    const ua = getUserAgent(req);
    return this.coupons.redeem(user.id, dto.code, { ip, ua });
  }
}
