import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../billing/ledger.service';

export type MediaKind = 'tts' | 'stt' | 'image' | 'video';

@Injectable()
export class MediaBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  /** Throw 402 if balance < requiredUsd. */
  async assertCanSpend(userId: string, requiredUsd: number) {
    const b = await this.prisma.userBalance.findUnique({ where: { userId } });
    const balance = Number(b?.balanceUsd ?? 0);
    if (balance < requiredUsd) {
      throw new ForbiddenException({
        code: 'insufficient_balance',
        message: `Недостаточно средств. Требуется $${requiredUsd.toFixed(4)}, на балансе $${balance.toFixed(4)}.`,
      });
    }
  }

  /** Charge after successful provider call. Negative ledger entry. */
  async chargeUser(userId: string, kind: MediaKind, costUsd: number, refId?: string) {
    if (costUsd <= 0) return;
    await this.ledger.adjust(userId, -costUsd, `media:${kind}${refId ? ` ${refId}` : ''}`);
    await this.prisma.userBalance.update({
      where: { userId },
      data: { lifetimeSpend: { increment: costUsd } },
    });
  }
}
