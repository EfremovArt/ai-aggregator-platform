import { Injectable, NotFoundException } from '@nestjs/common';
import { BanScope, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(query: { search?: string; status?: UserStatus; take?: number; cursor?: string }) {
    const take = Math.min(query.take ?? 50, 200);
    return this.prisma.user.findMany({
      where: {
        ...(query.search ? { email: { contains: query.search, mode: 'insensitive' } } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: { balance: true },
      orderBy: { createdAt: 'desc' },
      take,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });
  }

  async banUser(adminId: string, userId: string, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { status: UserStatus.BANNED } }),
      this.prisma.ban.create({ data: { scope: BanScope.USER, value: userId, userId, reason, createdById: adminId } }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'banned' },
      }),
    ]);
    return { ok: true };
  }

  async unbanUser(userId: string) {
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { status: UserStatus.ACTIVE } }),
      this.prisma.ban.deleteMany({ where: { scope: BanScope.USER, value: userId } }),
    ]);
    return { ok: true };
  }

  async fraudFeed() {
    const since = new Date(Date.now() - 7 * 86400 * 1000);
    return this.prisma.abuseSignal.findMany({
      where: { createdAt: { gte: since } },
      include: { user: { select: { id: true, email: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async moderationQueue() {
    return this.prisma.moderationItem.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async resolveModeration(id: string, status: 'APPROVED' | 'REJECTED', adminId: string) {
    return this.prisma.moderationItem.update({
      where: { id },
      data: { status, reviewedById: adminId, reviewedAt: new Date() },
    });
  }

  async overview() {
    const since30 = new Date(Date.now() - 30 * 86400 * 1000);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [users, activeUsers, requests, revenue, providerSpend, modelStats, providerHealth] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { lastSeenAt: { gte: since30 } } }),
        this.prisma.requestLog.count({ where: { createdAt: { gte: since30 } } }),
        this.prisma.transaction.aggregate({
          _sum: { amountUsd: true },
          where: { status: 'SUCCEEDED', createdAt: { gte: since30 } },
        }),
        this.prisma.requestLog.aggregate({
          _sum: { providerCostUsd: true, costUsd: true, marginUsd: true },
          where: { createdAt: { gte: since30 } },
        }),
        this.prisma.requestLog.groupBy({
          by: ['modelSlug'],
          _sum: { totalTokens: true, costUsd: true, providerCostUsd: true, marginUsd: true },
          _count: true,
          where: { createdAt: { gte: since30 } },
          orderBy: { _sum: { costUsd: 'desc' } },
          take: 20,
        }),
        this.prisma.provider.findMany(),
      ]);
    return {
      users: { total: users, active30d: activeUsers },
      requests30d: requests,
      revenue30dUsd: Number(revenue._sum.amountUsd ?? 0),
      apiSpend30dUsd: Number(providerSpend._sum.providerCostUsd ?? 0),
      grossRevenue30dUsd: Number(providerSpend._sum.costUsd ?? 0),
      margin30dUsd: Number(providerSpend._sum.marginUsd ?? 0),
      todayDate: today.toISOString(),
      modelStats: modelStats.map((m) => ({
        slug: m.modelSlug,
        requests: m._count,
        tokens: m._sum.totalTokens ?? 0,
        revenueUsd: Number(m._sum.costUsd ?? 0),
        costUsd: Number(m._sum.providerCostUsd ?? 0),
        marginUsd: Number(m._sum.marginUsd ?? 0),
      })),
      providerHealth,
    };
  }

  async unprofitableUsers(limit = 20) {
    // Users whose ledger has more spend than topup over the last 90d
    const since = new Date(Date.now() - 90 * 86400 * 1000);
    const groups = await this.prisma.ledgerEntry.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since } },
      _sum: { amountUsd: true },
      orderBy: { _sum: { amountUsd: 'asc' } },
      take: limit,
    });
    return groups;
  }
}
