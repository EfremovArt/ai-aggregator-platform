import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsd(value: number, opts?: { fractionDigits?: number }) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: opts?.fractionDigits ?? 2,
    maximumFractionDigits: opts?.fractionDigits ?? 2,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatTokens(tokens: number) {
  if (tokens > 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens > 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

/**
 * Format a number as RUB with the symbol AFTER the amount (Russian convention):
 * formatRub(8) === "8 ₽". `digits` lets you keep small numbers readable
 * (e.g. token prices: 0.04 ₽). Passing `0` clamps to integer.
 */
export function formatRub(value: number, digits: number = value < 10 ? 2 : 0) {
  const safe = Number.isFinite(value) ? value : 0;
  const fmt = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${fmt.format(safe)} ₽`;
}
