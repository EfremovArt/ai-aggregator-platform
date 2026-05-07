import { createHash, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function generateToken(length = 32): string {
  return randomBytes(length).toString('base64url');
}

export function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
  // Format: aix_<env>_<random>
  const env = process.env.NODE_ENV === 'production' ? 'live' : 'test';
  const random = randomBytes(24).toString('base64url');
  const fullKey = `aix_${env}_${random}`;
  const prefix = fullKey.slice(0, 12);
  const hash = sha256Hex(fullKey);
  return { fullKey, prefix, hash };
}

export function constantTimeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function hmacSha256(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}
