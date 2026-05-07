import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailAdapter } from './adapters/email.adapter';
import { TelegramAdapter } from './adapters/telegram.adapter';
import {
  emailVerificationTemplate,
  hardCutoffTemplate,
  lowBalanceTemplate,
  paymentSuccessTemplate,
  refundTemplate,
  tgEmailVerification,
  tgHardCutoff,
  tgLowBalance,
  tgPaymentSuccess,
  tgRefund,
} from './templates';

export type NotificationKind =
  | 'email_verification'
  | 'low_balance'
  | 'hard_cutoff'
  | 'payment_success'
  | 'refund_processed';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notifications');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly email: EmailAdapter,
    private readonly telegram: TelegramAdapter,
  ) {}

  private appUrl(): string {
    return this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
  }

  /** Best-effort delivery — failures are logged, never thrown back to callers. */
  private async safeEmail(to: string, subject: string, text: string, html: string): Promise<boolean> {
    try {
      await this.email.send({ to, subject, text, html });
      return true;
    } catch (e) {
      this.logger.warn(`email send failed to ${to}: ${(e as Error).message}`);
      return false;
    }
  }

  private async safeTelegram(chatId: string, text: string): Promise<boolean> {
    try {
      await this.telegram.send(chatId, text);
      return true;
    } catch (e) {
      this.logger.warn(`telegram send failed to ${chatId}: ${(e as Error).message}`);
      return false;
    }
  }

  private async record(
    userId: string,
    kind: NotificationKind,
    title: string,
    body: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.notification
      .create({
        data: {
          userId,
          kind,
          title,
          body,
          metadata: (metadata ?? {}) as object,
        },
      })
      .catch((e) => this.logger.warn(`failed to record notification: ${(e as Error).message}`));
  }

  async sendEmailVerification(user: User, verifyUrl: string): Promise<void> {
    const tmpl = emailVerificationTemplate(
      { email: user.email, displayName: user.displayName, appUrl: this.appUrl() },
      verifyUrl,
    );
    await this.safeEmail(user.email, tmpl.subject, tmpl.text, tmpl.html);
    if (user.notifyByTelegram && user.telegramChatId) {
      await this.safeTelegram(user.telegramChatId, tgEmailVerification(verifyUrl));
    }
    await this.record(user.id, 'email_verification', tmpl.subject, tmpl.text);
  }

  async sendLowBalance(user: User, balanceUsd: number, threshold: number): Promise<void> {
    const tmpl = lowBalanceTemplate(
      { email: user.email, displayName: user.displayName, appUrl: this.appUrl() },
      balanceUsd,
      threshold,
    );
    if (user.notifyByEmail) {
      await this.safeEmail(user.email, tmpl.subject, tmpl.text, tmpl.html);
    }
    if (user.notifyByTelegram && user.telegramChatId) {
      await this.safeTelegram(user.telegramChatId, tgLowBalance(balanceUsd, threshold, this.appUrl()));
    }
    await this.record(user.id, 'low_balance', tmpl.subject, tmpl.text, { balanceUsd, threshold });
  }

  async sendHardCutoff(user: User, balanceUsd: number): Promise<void> {
    const tmpl = hardCutoffTemplate(
      { email: user.email, displayName: user.displayName, appUrl: this.appUrl() },
      balanceUsd,
    );
    if (user.notifyByEmail) {
      await this.safeEmail(user.email, tmpl.subject, tmpl.text, tmpl.html);
    }
    if (user.notifyByTelegram && user.telegramChatId) {
      await this.safeTelegram(user.telegramChatId, tgHardCutoff(balanceUsd, this.appUrl()));
    }
    await this.record(user.id, 'hard_cutoff', tmpl.subject, tmpl.text, { balanceUsd });
  }

  async sendPaymentSuccess(
    user: User,
    amountUsd: number,
    newBalanceUsd: number,
    provider: string,
  ): Promise<void> {
    const tmpl = paymentSuccessTemplate(
      { email: user.email, displayName: user.displayName, appUrl: this.appUrl() },
      amountUsd,
      newBalanceUsd,
      provider,
    );
    if (user.notifyByEmail) {
      await this.safeEmail(user.email, tmpl.subject, tmpl.text, tmpl.html);
    }
    if (user.notifyByTelegram && user.telegramChatId) {
      await this.safeTelegram(user.telegramChatId, tgPaymentSuccess(amountUsd, newBalanceUsd, provider));
    }
    await this.record(user.id, 'payment_success', tmpl.subject, tmpl.text, {
      amountUsd,
      newBalanceUsd,
      provider,
    });
  }

  async sendRefund(user: User, amountUsd: number): Promise<void> {
    const tmpl = refundTemplate(
      { email: user.email, displayName: user.displayName, appUrl: this.appUrl() },
      amountUsd,
    );
    if (user.notifyByEmail) {
      await this.safeEmail(user.email, tmpl.subject, tmpl.text, tmpl.html);
    }
    if (user.notifyByTelegram && user.telegramChatId) {
      await this.safeTelegram(user.telegramChatId, tgRefund(amountUsd));
    }
    await this.record(user.id, 'refund_processed', tmpl.subject, tmpl.text, { amountUsd });
  }

  /**
   * In-app: lists the most recent notifications for the bell icon.
   */
  async list(userId: string, limit = 30) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /**
   * Helper to update user notification preferences.
   * Only allows whitelisted fields — never role/balance/etc.
   */
  async updatePreferences(
    userId: string,
    prefs: {
      notifyByEmail?: boolean;
      notifyByTelegram?: boolean;
      telegramChatId?: string | null;
      lowBalanceThresholdUsd?: number | null;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(prefs.notifyByEmail !== undefined && { notifyByEmail: prefs.notifyByEmail }),
        ...(prefs.notifyByTelegram !== undefined && { notifyByTelegram: prefs.notifyByTelegram }),
        ...(prefs.telegramChatId !== undefined && { telegramChatId: prefs.telegramChatId }),
        ...(prefs.lowBalanceThresholdUsd !== undefined && {
          lowBalanceThresholdUsd: prefs.lowBalanceThresholdUsd,
        }),
      },
      select: {
        id: true,
        notifyByEmail: true,
        notifyByTelegram: true,
        telegramChatId: true,
        lowBalanceThresholdUsd: true,
      },
    });
  }
}
