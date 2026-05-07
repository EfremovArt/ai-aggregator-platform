import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async issueFor(transactionId: string) {
    const tx = await this.prisma.transaction.findUniqueOrThrow({ where: { id: transactionId } });
    const number = `INV-${new Date().getFullYear()}-${tx.id.slice(-8).toUpperCase()}`;
    return this.prisma.invoice.create({
      data: {
        userId: tx.userId,
        transactionId: tx.id,
        number,
        amountUsd: tx.amountUsd,
        status: 'ISSUED',
      },
    });
  }

  async list(userId: string) {
    return this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
      take: 100,
    });
  }
}
