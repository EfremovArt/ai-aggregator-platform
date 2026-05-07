import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodPipe } from '../../common/pipes/zod.pipe';
import { AdminCouponsService } from './admin-coupons.service';

const CreateCouponDto = z.object({
  code: z.string().trim().min(2).max(64),
  type: z.enum(['FIXED_BONUS', 'DEPOSIT_BONUS', 'FREE_TOKENS']),
  amountUsd: z.number().nullable().optional(),
  bonusPercent: z.number().int().min(0).max(1000).nullable().optional(),
  freeTokens: z.number().int().min(0).nullable().optional(),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  perUserLimit: z.number().int().positive().default(1),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  description: z.string().max(512).nullable().optional(),
  isActive: z.boolean().default(true),
});
type CreateCouponDto = z.infer<typeof CreateCouponDto>;

const UpdateCouponDto = CreateCouponDto.partial().omit({ code: true });
type UpdateCouponDto = z.infer<typeof UpdateCouponDto>;

@Controller('admin/coupons')
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminCouponsController {
  constructor(private readonly coupons: AdminCouponsService) {}

  @Get()
  list() {
    return this.coupons.list();
  }

  @Post()
  create(@Body(new ZodPipe(CreateCouponDto)) dto: CreateCouponDto) {
    return this.coupons.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodPipe(UpdateCouponDto)) dto: UpdateCouponDto,
  ) {
    return this.coupons.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coupons.remove(id);
  }
}
