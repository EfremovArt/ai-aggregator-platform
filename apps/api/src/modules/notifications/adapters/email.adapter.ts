import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * EmailAdapter — sends transactional emails.
 *
 * Strategy:
 * - If `RESEND_API_KEY` is set: use Resend HTTP API (no SMTP server needed).
 * - Else if `SMTP_HOST/PORT/USER/PASS/FROM` are set: use nodemailer over SMTP.
 * - Else: log the message (dev mode) so you can copy the verification link out
 *   of the API logs without needing a real mail provider.
 *
 * `MAIL_FROM` (preferred) or `SMTP_FROM` controls the From: header.
 */
@Injectable()
export class EmailAdapter {
  private readonly logger = new Logger('EmailAdapter');
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('RESEND_API_KEY') ||
        (this.config.get<string>('SMTP_HOST') &&
          this.config.get<string>('SMTP_PORT') &&
          this.config.get<string>('SMTP_USER') &&
          this.config.get<string>('SMTP_PASS')),
    );
  }

  async send(msg: EmailMessage): Promise<void> {
    const from =
      this.config.get<string>('MAIL_FROM') ??
      this.config.get<string>('SMTP_FROM') ??
      'AI Aggregator <noreply@example.com>';

    const resendKey = this.config.get<string>('RESEND_API_KEY');
    if (resendKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: msg.to,
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
        }),
      });
      if (!res.ok) {
        const err = await res.text().catch(() => res.statusText);
        throw new Error(`Resend error ${res.status}: ${err}`);
      }
      this.logger.debug(`[email/resend] -> ${msg.to} :: ${msg.subject}`);
      return;
    }

    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!host || !port || !user || !pass) {
      // Dev-mode fallback: log instead of throwing so signup works without SMTP.
      this.logger.warn(
        `[email/dev] no mailer configured; would send to ${msg.to}: ${msg.subject}\n${msg.text}`,
      );
      return;
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
    await this.transporter.sendMail({
      from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    this.logger.debug(`[email/smtp] -> ${msg.to} :: ${msg.subject}`);
  }
}
