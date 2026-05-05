'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Header } from './models';
import { cn } from '@/lib/utils';

const ITEMS = [
  {
    q: 'Чем отличается от OpenAI API напрямую?',
    a: 'Один ключ ко всем популярным моделям, единый формат, встроенный fallback и smart routing. Подходит, когда хочется не залипать на одного вендора.',
  },
  {
    q: 'Как считается стоимость?',
    a: 'Pay-as-you-go: списываем точное количество токенов с провайдерскими ценами + наша маржа (показана прозрачно). Перед запросом видна оценка.',
  },
  {
    q: 'Безопасны ли данные?',
    a: 'Не используем ваши промпты для обучения. Логи запросов хранятся для биллинга/безопасности с возможностью отключения в настройках организации.',
  },
  {
    q: 'Что с лимитами?',
    a: 'Per-IP, per-user, per-API-key, per-model лимиты. Жёсткие cost-cutoffs не дадут нажечь больше баланса. Можно настроить под свои сценарии.',
  },
  {
    q: 'Какие способы оплаты поддерживаются?',
    a: 'Stripe (карта), CryptoCloud (USDT/BTC/ETH), Telegram Stars, YooMoney/YooKassa, СБП. Бизнес — банковский перевод и закрывающие документы.',
  },
  {
    q: 'Streaming и function calling работают?',
    a: 'Да — SSE-streaming, function calling, embeddings, image generation, moderation API. Совместимо с OpenAI SDK.',
  },
];

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="relative border-b border-white/[0.06] py-20">
      <div className="container">
        <Header
          eyebrow="FAQ"
          title="Частые вопросы"
          desc="Если вашего вопроса нет — напишите в поддержку Telegram."
        />
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-white/[0.06] rounded-2xl border border-white/[0.06]">
          {ITEMS.map((item, i) => (
            <button
              key={item.q}
              onClick={() => setOpen(open === i ? -1 : i)}
              className="block w-full px-5 py-5 text-left transition-colors hover:bg-white/5"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium">{item.q}</span>
                <ChevronDown
                  className={cn('h-5 w-5 transition-transform', open === i && 'rotate-180')}
                />
              </div>
              {open === i && (
                <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
