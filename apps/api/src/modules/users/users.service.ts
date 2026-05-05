import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { balance: true },
    });
    if (!user) throw new NotFoundException();
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      emailVerified: !!user.emailVerifiedAt,
      twoFactorEnabled: user.twoFactorEnabled,
      preferredLocale: user.preferredLocale,
      balanceUsd: user.balance?.balanceUsd?.toString() ?? '0',
      lifetimeSpend: user.balance?.lifetimeSpend?.toString() ?? '0',
      lifetimeTopup: user.balance?.lifetimeTopup?.toString() ?? '0',
      riskScore: user.riskScore,
      createdAt: user.createdAt,
    };
  }

  async getAnalytics(userId: string) {
    const since = new Date(Date.now() - 30 * 86400 * 1000);
    const [requests, byModel, ledger] = await Promise.all([
      this.prisma.requestLog.findMany({
        where: { userId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          id: true,
          modelSlug: true,
          status: true,
          totalTokens: true,
          costUsd: true,
          latencyMs: true,
          createdAt: true,
        },
      }),
      this.prisma.requestLog.groupBy({
        by: ['modelSlug'],
        where: { userId, createdAt: { gte: since } },
        _sum: { totalTokens: true, costUsd: true },
        _count: true,
      }),
      this.prisma.ledgerEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);
    return { recent: requests, byModel, ledger };
  }
}
