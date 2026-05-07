import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKeyStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { generateApiKey, sha256Hex } from '../../common/utils/crypto';
import type { CreateApiKeyInput } from '@ai-platform/shared';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateApiKeyInput) {
    const { fullKey, prefix, hash } = generateApiKey();
    const created = await this.prisma.apiKey.create({
      data: {
        userId,
        name: input.name,
        prefix,
        keyHash: hash,
        scopes: input.scopes ?? [],
        allowedModels: input.allowedModels ?? [],
        monthlyUsdLimit: input.monthlyUsdLimit,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });
    // Returned ONCE — never again.
    return { ...this.toPublic(created), key: fullKey };
  }

  async list(userId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return keys.map((k) => this.toPublic(k));
  }

  async revoke(userId: string, id: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id, userId } });
    if (!key) throw new NotFoundException();
    return this.prisma.apiKey.update({
      where: { id },
      data: { status: ApiKeyStatus.REVOKED, revokedAt: new Date() },
    });
  }

  async resolveByPlaintext(plain: string) {
    const hash = sha256Hex(plain);
    return this.prisma.apiKey.findUnique({
      where: { keyHash: hash },
      include: { user: true },
    });
  }

  private toPublic(k: { id: string; name: string; prefix: string; status: ApiKeyStatus; scopes: string[]; allowedModels: string[]; monthlyUsdLimit: unknown; lastUsedAt: Date | null; createdAt: Date; expiresAt: Date | null; revokedAt: Date | null }) {
    return {
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      status: k.status,
      scopes: k.scopes,
      allowedModels: k.allowedModels,
      monthlyUsdLimit: k.monthlyUsdLimit?.toString() ?? null,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
      expiresAt: k.expiresAt,
      revokedAt: k.revokedAt,
    };
  }
}
