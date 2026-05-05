import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface IpReputation {
  ip: string;
  riskScore: number;
  isVpn: boolean;
  isTor: boolean;
  isProxy: boolean;
  isDatacenter: boolean;
  country?: string;
  asn?: string;
}

@Injectable()
export class IpReputationService {
  private readonly logger = new Logger('IpReputation');
  private readonly TTL_HOURS = 24;

  constructor(private readonly prisma: PrismaService) {}

  async lookup(ip: string): Promise<IpReputation | null> {
    if (!ip || ip === '127.0.0.1' || ip === '::1') return null;

    // 1. Cache hit
    const cached = await this.prisma.ipReputationCache.findUnique({ where: { ip } });
    if (cached && cached.expiresAt > new Date()) {
      return {
        ip,
        riskScore: cached.riskScore,
        isVpn: cached.isVpn,
        isTor: cached.isTor,
        isProxy: cached.isProxy,
        isDatacenter: cached.isDatacenter,
        country: cached.country ?? undefined,
        asn: cached.asn ?? undefined,
      };
    }

    // 2. Provider lookup
    const fresh = await this.fetchFromProvider(ip);
    if (!fresh) return cached
      ? {
          ip,
          riskScore: cached.riskScore,
          isVpn: cached.isVpn,
          isTor: cached.isTor,
          isProxy: cached.isProxy,
          isDatacenter: cached.isDatacenter,
          country: cached.country ?? undefined,
          asn: cached.asn ?? undefined,
        }
      : null;

    await this.prisma.ipReputationCache.upsert({
      where: { ip },
      update: {
        riskScore: fresh.riskScore,
        isVpn: fresh.isVpn,
        isTor: fresh.isTor,
        isProxy: fresh.isProxy,
        isDatacenter: fresh.isDatacenter,
        country: fresh.country,
        asn: fresh.asn,
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + this.TTL_HOURS * 3600 * 1000),
      },
      create: {
        ip,
        riskScore: fresh.riskScore,
        isVpn: fresh.isVpn,
        isTor: fresh.isTor,
        isProxy: fresh.isProxy,
        isDatacenter: fresh.isDatacenter,
        country: fresh.country,
        asn: fresh.asn,
        expiresAt: new Date(Date.now() + this.TTL_HOURS * 3600 * 1000),
      },
    });
    return fresh;
  }

  private async fetchFromProvider(ip: string): Promise<IpReputation | null> {
    const key = process.env.IPQUALITYSCORE_API_KEY;
    if (!key) return null;
    try {
      const url = `https://www.ipqualityscore.com/api/json/ip/${encodeURIComponent(key)}/${encodeURIComponent(ip)}`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        this.logger.warn(`IPQS HTTP ${res.status}`);
        return null;
      }
      const j = (await res.json()) as {
        success?: boolean;
        fraud_score?: number;
        vpn?: boolean;
        tor?: boolean;
        proxy?: boolean;
        is_crawler?: boolean;
        country_code?: string;
        ASN?: number;
        active_vpn?: boolean;
      };
      if (!j.success) return null;
      return {
        ip,
        riskScore: j.fraud_score ?? 0,
        isVpn: !!(j.vpn || j.active_vpn),
        isTor: !!j.tor,
        isProxy: !!j.proxy,
        isDatacenter: false,
        country: j.country_code,
        asn: j.ASN ? `AS${j.ASN}` : undefined,
      };
    } catch (e) {
      this.logger.warn(`IPQS lookup failed: ${(e as Error).message}`);
      return null;
    }
  }
}
