'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Sparkles, KeyRound, Bot, Gift, Wallet, Bell } from 'lucide-react';

const STORAGE_KEY = 'aip:onboarding:seen';

interface Slide {
  emoji: string;
  Icon: typeof Sparkles;
  title: string;
  description: string;
  cta?: { href: string; label: string };
}

const SLIDES: Slide[] = [
  {
    emoji: '👋',
    Icon: Sparkles,
    title: 'Добро пожаловать!',
    description:
      'Это AI Aggregator — единый шлюз ко всем популярным AI-моделям: GPT, Claude, Gemini, DeepSeek, Midjourney, Runway и другим. Только pay-per-use, без подписок.',
  },
  {
    emoji: '🆓',
    Icon: Gift,
    title: '50 000 бесплатных токенов в месяц',
    description:
      'Free-tier «Grom» — 50 000 токенов на самой быстрой и дешёвой модели DeepSeek каждый месяц. Чтобы попробовать платформу — даже пополнять не нужно.',
    cta: { href: '/dashboard/chat', label: 'Открыть чат' },
  },
  {
    emoji: '🤖',
    Icon: Bot,
    title: 'Готовые ассистенты',
    description:
      '18 шаблонов на любые задачи: маркетолог, юрист, программист, переводчик, репетитор. Каждый — со своим системным промптом, можно использовать прямо в чате.',
    cta: { href: '/dashboard/assistants', label: 'Посмотреть ассистентов' },
  },
  {
    emoji: '🔑',
    Icon: KeyRound,
    title: 'OpenAI-совместимый API',
    description:
      'Создайте API-ключ и подключите платформу к своему приложению одной строкой — мы совместимы с openai SDK. Один ключ — все модели.',
    cta: { href: '/dashboard/api-keys', label: 'Создать API-ключ' },
  },
  {
    emoji: '💎',
    Icon: Wallet,
    title: 'Промокоды и реферальная программа',
    description:
      'Введите промокод — получите бонус. Приглашайте друзей по своей ссылке — получайте % с их пополнений. Минимальный депозит — ₽300.',
    cta: { href: '/dashboard/referrals', label: 'Моя реф-ссылка' },
  },
  {
    emoji: '🔔',
    Icon: Bell,
    title: 'Уведомления и защита',
    description:
      'Включите уведомления о низком балансе — мы напишем на email или в Telegram, чтобы запросы не прерывались. Hard-cutoff не даст превысить лимит расходов.',
    cta: { href: '/dashboard/settings', label: 'Настроить' },
  },
];

export function OnboardingStories() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setMounted(true);
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (!seen) setOpen(true);
    } catch {
      // localStorage unavailable (e.g. private mode)
    }
  }, []);

  function close() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setOpen(false);
  }

  if (!mounted || !open) return null;

  const total = SLIDES.length;
  const slide = SLIDES[idx]!;
  const Icon = slide.Icon;
  const isFirst = idx === 0;
  const isLast = idx === total - 1;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Знакомство с платформой"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#13132a] to-[#0b0b14] shadow-2xl">
        <button
          onClick={close}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex gap-1 p-3">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= idx ? 'bg-cyber-cyan' : 'bg-white/10'
              }`}
              aria-label={`Слайд ${i + 1}`}
            />
          ))}
        </div>

        <div className="px-6 pb-6 pt-2">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyber-violet/30 to-cyber-cyan/20 text-5xl">
            <span aria-hidden="true">{slide.emoji}</span>
          </div>
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-cyber-cyan">
            <Icon className="h-4 w-4" />
            Шаг {idx + 1} из {total}
          </div>
          <h2 className="mb-2 text-2xl font-semibold tracking-tight">{slide.title}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{slide.description}</p>

          {slide.cta && (
            <Link
              href={slide.cta.href}
              onClick={close}
              className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-cyber-violet/90 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyber-violet"
            >
              {slide.cta.label}
            </Link>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.06] p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIdx((v) => Math.max(0, v - 1))}
            disabled={isFirst}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Назад
          </Button>
          <Button variant="ghost" size="sm" onClick={close}>
            Пропустить
          </Button>
          {isLast ? (
            <Button size="sm" onClick={close}>
              Готово
            </Button>
          ) : (
            <Button size="sm" onClick={() => setIdx((v) => Math.min(total - 1, v + 1))}>
              Дальше
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
