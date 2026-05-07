import { Injectable } from '@nestjs/common';

// Minimal in-memory list of well-known disposable email domains. Replace
// in production with a full curated list (e.g. github.com/disposable-email-domains).
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  'mailinator.com',
  'mailinator.net',
  'tempmail.com',
  'tempmail.net',
  'guerrillamail.com',
  'guerrillamail.net',
  'sharklasers.com',
  'yopmail.com',
  'getnada.com',
  'maildrop.cc',
  'mintemail.com',
  'fakeinbox.com',
  'throwawaymail.com',
  'trashmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'mohmal.com',
  'spambox.us',
  'mvrht.com',
  'dispostable.com',
  'mytrashmail.com',
  'inboxbear.com',
  'mailcatch.com',
  'mailnesia.com',
]);

@Injectable()
export class DisposableEmailService {
  async isDisposable(email: string): Promise<boolean> {
    const at = email.lastIndexOf('@');
    if (at === -1) return false;
    const domain = email.slice(at + 1).toLowerCase();
    return DISPOSABLE_DOMAINS.has(domain);
  }
}
