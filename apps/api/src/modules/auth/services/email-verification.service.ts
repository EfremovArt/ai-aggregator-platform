import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { generateToken, sha256Hex } from '../../../common/utils/crypto';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger('EmailVerification');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async issue(userId: string, email: string): Promise<string> {
    const token = generateToken(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.emailVerification.create({
      data: { userId, email, tokenHash: sha256Hex(token), expiresAt },
    });
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const url = `${appUrl}/auth/verify-email?token=${token}`;
    this.logger.log(`[email-verify] ${email}: ${url}`);

    // Send via the notifications service (email + telegram if linked).
    // Lookup the user to honour their preferences and language.
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await this.notifications.sendEmailVerification(user, url);
    }
    return token;
  }

  async confirm(token: string): Promise<void> {
    const hash = sha256Hex(token);
    const record = await this.prisma.emailVerification.findUnique({ where: { tokenHash: hash } });
    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new BadRequestException({ code: 'invalid_token', message: 'Invalid or expired token' });
    }
    await this.prisma.$transaction([
      this.prisma.emailVerification.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date(), status: UserStatus.ACTIVE },
      }),
    ]);
  }
}
