import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string;
  actorType?: 'user' | 'admin' | 'system' | 'api';
  action: string;
  target?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger('Audit');

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          actorType: entry.actorType ?? 'user',
          action: entry.action,
          target: entry.target,
          ip: entry.ip,
          userAgent: entry.userAgent,
          metadata: entry.metadata as never,
        },
      });
    } catch (e) {
      this.logger.warn(`Audit write failed: ${(e as Error).message}`);
    }
  }
}
