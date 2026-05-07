import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type CouponType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface CreateInput {
  code: string;
  type: CouponType;
  amountUsd?: number | null;
  bonusPercent?: number | null;
  freeTokens?: number | null;
  maxRedemptions?: number | null;
  perUserLimit: number;
  validFrom?: string;
  validUntil?: string | null;
  description?: string | null;
  isActive: boolean;
}

@Injectable()
export class AdminCouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        type: true,
        amountUsd: true,
        bonusPercent: true,
        freeTokens: true,
        maxRedemptions: true,
        redemptionsCount: true,
        perUserLimit: true,
        validFrom: true,
        validUntil: true,
        isActive: true,
        description: true,
        createdAt: true,
      },
    });
  }

  async create(input: CreateInput) {
    this.validateShape(input.type, input);
    try {
      return await this.prisma.coupon.create({
        data: {
          code: input.code.toUpperCase(),
          type: input.type,
          amountUsd: input.amountUsd != null ? new Prisma.Decimal(input.amountUsd) : null,
          bonusPercent: input.bonusPercent ?? null,
          freeTokens: input.freeTokens ?? null,
          maxRedemptions: input.maxRedemptions ?? null,
          perUserLimit: input.perUserLimit,
          validFrom: input.validFrom ? new Date(input.validFrom) : new Date(),
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          description: input.description ?? null,
          isActive: input.isActive,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new BadRequestException('Coupon with this code already exists');
      }
      throw e;
    }
  }

  async update(id: string, input: Partial<CreateInput>) {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Coupon not found');
    if (input.type) this.validateShape(input.type as CouponType, { ...existing, ...input } as never);
    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(input.type && { type: input.type as CouponType }),
        ...(input.amountUsd !== undefined && {
          amountUsd: input.amountUsd != null ? new Prisma.Decimal(input.amountUsd) : null,
        }),
        ...(input.bonusPercent !== undefined && { bonusPercent: input.bonusPercent ?? null }),
        ...(input.freeTokens !== undefined && { freeTokens: input.freeTokens ?? null }),
        ...(input.maxRedemptions !== undefined && { maxRedemptions: input.maxRedemptions ?? null }),
        ...(input.perUserLimit !== undefined && { perUserLimit: input.perUserLimit }),
        ...(input.validFrom !== undefined && { validFrom: new Date(input.validFrom!) }),
        ...(input.validUntil !== undefined && {
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
        }),
        ...(input.description !== undefined && { description: input.description ?? null }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Coupon not found');
    // If already redeemed by users, deactivate instead of hard-delete to preserve audit.
    if (existing.redemptionsCount > 0) {
      return this.prisma.coupon.update({
        where: { id },
        data: { isActive: false },
      });
    }
    return this.prisma.coupon.delete({ where: { id } });
  }

  private validateShape(type: CouponType, input: { amountUsd?: number | null; bonusPercent?: number | null; freeTokens?: number | null }) {
    if (type === 'FIXED_BONUS' && (input.amountUsd == null || input.amountUsd <= 0)) {
      throw new BadRequestException('FIXED_BONUS coupons require positive amountUsd');
    }
    if (type === 'DEPOSIT_BONUS' && (input.bonusPercent == null || input.bonusPercent <= 0)) {
      throw new BadRequestException('DEPOSIT_BONUS coupons require positive bonusPercent');
    }
    if (type === 'FREE_TOKENS' && (input.freeTokens == null || input.freeTokens <= 0)) {
      throw new BadRequestException('FREE_TOKENS coupons require positive freeTokens');
    }
  }
}
