'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Cta() {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.06] py-24">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-1/4 top-1/2 -z-10 h-[400px] -translate-y-1/2 animate-aurora-shift rounded-full bg-[radial-gradient(ellipse_at_center,rgba(124,92,255,0.3),transparent_60%)] blur-3xl"
      />
      <div className="container relative text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
          Подключите все AI <span className="gradient-text">за 2 минуты.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Бесплатный welcome-кредит, никаких подписок, OpenAI-совместимый API. Начните прямо сейчас.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register">
            <Button variant="cyber" size="lg">Создать аккаунт</Button>
          </Link>
          <Link href={process.env.NEXT_PUBLIC_TELEGRAM_URL ?? 'https://t.me/'}>
            <Button variant="outline" size="lg">Telegram-сообщество</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
