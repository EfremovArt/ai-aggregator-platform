'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'aip:cookie-consent';

type Choice = 'accepted' | 'rejected' | null;

function readChoice(): Choice {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'accepted' || v === 'rejected') return v;
  } catch {
    // ignore quota / privacy mode
  }
  return null;
}

export function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (readChoice() !== null) setVisible(false);
  }, []);

  const persist = (c: Exclude<Choice, null>) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, c);
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!mounted || !visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6 sm:pb-6 animate-fade-up"
    >
      <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-zinc-950/90 p-4 sm:p-5 backdrop-blur shadow-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm leading-relaxed text-zinc-200">
            Мы используем cookies и аналогичные технологии для работы сервиса, аутентификации,
            аналитики и улучшения UX. Подробнее в{' '}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-white">
              Политике конфиденциальности
            </Link>{' '}
            и{' '}
            <Link href="/cookies" className="underline underline-offset-4 hover:text-white">
              Cookie Policy
            </Link>
            . Согласие на обработку — в соответствии с GDPR и 152-ФЗ.
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => persist('rejected')}
              className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
            >
              Только необходимые
            </button>
            <button
              type="button"
              onClick={() => persist('accepted')}
              className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-cyan-300"
            >
              Принять все
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
