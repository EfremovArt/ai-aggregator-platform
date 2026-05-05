import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma, type LedgerEntryKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async credit(
    userId: string,
    amountUsd: number,
    description: string,
    refType?: string,
    refId?: string,
  ) {
    if (amountUsd <= 0) throw new BadRequestException('amount must be positive');
    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.userBalance.upsert({
        where: { userId },
        update: {
          balanceUsd: { increment: new Prisma.Decimal(amountUsd) },
          lifetimeTopup: { increment: new Prisma.Decimal(amountUsd) },
        },
        create: {
          userId,
          balanceUsd: new Prisma.Decimal(amountUsd),
          lifetimeTopup: new Prisma.Decimal(amountUsd),
        },
      });
      return tx.ledgerEntry.create({
        data: {
          userId,
          kind: 'TOPUP' as LedgerEntryKind,
          amountUsd: new Prisma.Decimal(amountUsd),
          balanceAfter: balance.balanceUsd,
          description,
          refType,
          refId,
        },
      });
    });
  }

  async adjust(userId: string, amountUsd: number, description: string) {
    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.userBalance.upsert({
        where: { userId },
        update: { balanceUsd: { increment: new Prisma.Decimal(amountUsd) } },
        create: { userId, balanceUsd: new Prisma.Decimal(amountUsd) },
      });
      return tx.ledgerEntry.create({
        data: {
          userId,
          kind: 'ADJUSTMENT' as LedgerEntryKind,
          amountUsd: new Prisma.Decimal(amountUsd),
          balanceAfter: balance.balanceUsd,
          description,
        },
      });
    });
  }

  async refund(userId: string, transactionId: string, amountUsd: number, reason?: string) {
    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          transactionId,
          amountUsd: new Prisma.Decimal(amountUsd),
          reason,
          status: 'PENDING',
        },
      });
      const balance = await tx.userBalance.upsert({
        where: { userId },
        update: { balanceUsd: { decrement: new Prisma.Decimal(amountUsd) } },
        create: { userId, balanceUsd: new Prisma.Decimal(-amountUsd) },
      });
      await tx.ledgerEntry.create({
        data: {
          userId,
          kind: 'REFUND' as LedgerEntryKind,
          amountUsd: new Prisma.Decimal(-amountUsd),
          balanceAfter: balance.balanceUsd,
          description: reason ?? 'refund',
          refType: 'refund',
          refId: refund.id,
        },
      });
      return refund;
    });
  }

  async list(userId: string) {
    return this.prisma.ledgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
