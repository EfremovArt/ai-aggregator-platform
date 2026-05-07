import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ExportEntity = 'users' | 'transactions' | 'requests' | 'coupons';

interface DateRange {
  from?: Date;
  to?: Date;
}

@Injectable()
export class AdminExportService {
  constructor(private readonly prisma: PrismaService) {}

  async exportEntity(entity: ExportEntity, range: DateRange): Promise<string> {
    switch (entity) {
      case 'users':
        return this.exportUsers(range);
      case 'transactions':
        return this.exportTransactions(range);
      case 'requests':
        return this.exportRequests(range);
      case 'coupons':
        return this.exportCoupons();
      default:
        throw new BadRequestException(`Unknown export entity: ${entity}`);
    }
  }

  private async exportUsers(range: DateRange): Promise<string> {
    const users = await this.prisma.user.findMany({
      where: this.dateFilter('createdAt', range),
      include: { balance: true },
      orderBy: { createdAt: 'desc' },
    });
    const headers = [
      'id',
      'email',
      'displayName',
      'role',
      'status',
      'riskScore',
      'balanceUsd',
      'lifetimeSpend',
      'lifetimeTopup',
      'createdAt',
      'lastSeenAt',
      'country',
    ];
    const rows: string[][] = users.map((u) => [
      u.id,
      u.email,
      u.displayName ?? '',
      u.role,
      u.status,
      String(u.riskScore),
      String(u.balance?.balanceUsd ?? 0),
      String(u.balance?.lifetimeSpend ?? 0),
      String(u.balance?.lifetimeTopup ?? 0),
      u.createdAt.toISOString(),
      u.lastSeenAt?.toISOString() ?? '',
      u.signupCountry ?? '',
    ]);
    return this.toCsv(headers, rows);
  }

  private async exportTransactions(range: DateRange): Promise<string> {
    const txns = await this.prisma.transaction.findMany({
      where: this.dateFilter('createdAt', range),
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10_000,
    });
    const headers = [
      'id',
      'createdAt',
      'completedAt',
      'userEmail',
      'provider',
      'status',
      'amountUsd',
      'currency',
      'externalId',
      'country',
    ];
    const rows: string[][] = txns.map((t) => [
      t.id,
      t.createdAt.toISOString(),
      t.completedAt?.toISOString() ?? '',
      t.user.email,
      t.provider,
      t.status,
      String(t.amountUsd),
      t.currency,
      t.externalId ?? '',
      t.country ?? '',
    ]);
    return this.toCsv(headers, rows);
  }

  private async exportRequests(range: DateRange): Promise<string> {
    const reqs = await this.prisma.requestLog.findMany({
      where: this.dateFilter('createdAt', range),
      orderBy: { createdAt: 'desc' },
      take: 50_000,
      include: { user: { select: { email: true } } },
    });
    const headers = [
      'id',
      'createdAt',
      'userEmail',
      'modelSlug',
      'kind',
      'status',
      'promptTokens',
      'completionTokens',
      'totalTokens',
      'costUsd',
      'providerCostUsd',
      'marginUsd',
      'latencyMs',
      'cached',
      'country',
    ];
    const rows: string[][] = reqs.map((r) => [
      r.id,
      r.createdAt.toISOString(),
      r.user?.email ?? '',
      r.modelSlug ?? '',
      String(r.kind),
      String(r.status),
      String(r.promptTokens),
      String(r.completionTokens),
      String(r.totalTokens),
      String(r.costUsd),
      String(r.providerCostUsd),
      String(r.marginUsd),
      String(r.latencyMs),
      r.cached ? '1' : '0',
      r.country ?? '',
    ]);
    return this.toCsv(headers, rows);
  }

  private async exportCoupons(): Promise<string> {
    const cps = await this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    const headers = [
      'id',
      'code',
      'type',
      'amountUsd',
      'bonusPercent',
      'freeTokens',
      'maxRedemptions',
      'redemptionsCount',
      'perUserLimit',
      'validFrom',
      'validUntil',
      'isActive',
      'description',
      'createdAt',
    ];
    const rows: string[][] = cps.map((c) => [
      c.id,
      c.code,
      c.type,
      c.amountUsd != null ? String(c.amountUsd) : '',
      c.bonusPercent != null ? String(c.bonusPercent) : '',
      c.freeTokens != null ? String(c.freeTokens) : '',
      c.maxRedemptions != null ? String(c.maxRedemptions) : '',
      String(c.redemptionsCount),
      String(c.perUserLimit),
      c.validFrom.toISOString(),
      c.validUntil?.toISOString() ?? '',
      c.isActive ? '1' : '0',
      c.description ?? '',
      c.createdAt.toISOString(),
    ]);
    return this.toCsv(headers, rows);
  }

  private dateFilter(field: string, range: DateRange) {
    if (!range.from && !range.to) return undefined;
    return {
      [field]: {
        ...(range.from && { gte: range.from }),
        ...(range.to && { lte: range.to }),
      },
    };
  }

  /** Excel-friendly CSV: BOM + CRLF + RFC 4180 quoting. */
  private toCsv(headers: string[], rows: string[][]): string {
    const bom = '\uFEFF';
    const escape = (cell: string) => {
      if (/[",\r\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
      return cell;
    };
    const lines = [headers, ...rows].map((r) => r.map(escape).join(','));
    return bom + lines.join('\r\n');
  }
}
