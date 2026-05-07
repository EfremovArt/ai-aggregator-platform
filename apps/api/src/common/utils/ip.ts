import type { Request } from 'express';

export function getClientIp(req: Request): string | undefined {
  // express respects 'trust proxy' setting and exposes req.ip already
  const ip = req.ip ?? req.socket?.remoteAddress;
  if (!ip) return undefined;
  // Strip IPv6-mapped IPv4
  return ip.replace(/^::ffff:/, '');
}

export function getFingerprint(req: Request): string | undefined {
  const fp = req.header('x-fingerprint');
  if (fp && fp.length <= 256) return fp;
  return undefined;
}

export function getCountry(req: Request): string | undefined {
  return (
    req.header('cf-ipcountry') ??
    req.header('x-vercel-ip-country') ??
    req.header('x-country-code') ??
    undefined
  );
}

export function getUserAgent(req: Request): string | undefined {
  return req.header('user-agent') ?? undefined;
}
