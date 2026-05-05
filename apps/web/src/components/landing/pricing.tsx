'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from './models';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    desc: 'Попробовать платформу',
    features: [
      'Welcome-кредит $1',
      'Доступ ко всем моделям',
      'Rate limit 10 RPM',
      'Telegram support',
    ],
    cta: 'Начать',
    href: '/register',
  },
  {
    name: 'Pay-as-you-go',
    price: 'от $5',
    desc: 'Для разработчиков и продакта',
    features: [
      'Минимальный депозит $5',
      'Все модели · все возможности',
      'Rate limit 600 RPM на API ключ',
      'Streaming, function calling, embeddings',
      'Webhook & invoicing',
    ],
    cta: 'Пополнить',
    href: '/register',
    highlighted: true,
  },
  {
    name: 'Business',
    price: 'договорно',
    desc: 'Для бизнеса с большой нагрузкой',
    features: [
      'Договор и закрывающие документы',
      'SLA 99.9%, dedicated capacity',
      'Custom rate limits',
      'On-prem / private deployment',
      'Приоритетная поддержка',
    ],
    cta: 'Связаться',
    href: '/contact',
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative border-b border-white/[0.06] py-20">
      <div className="container">
        <Header
          eyebrow="Цены"
          title="Прозрачно. Pay-as-you-go."
          desc="Платите только за фактически использованные токены. Без подписок и скрытых комиссий."
        />
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <Card
              key={p.name}
              className={p.highlighted ? 'border-cyber-violet/40 ring-1 ring-cyber-violet/40' : ''}
            >
              <CardHeader>
                <CardTitle className="text-lg">{p.name}</CardTitle>
                <div className="mt-1 text-3xl font-semibold tracking-tight">{p.price}</div>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-cyber-cyan" />{f}</li>
                  ))}
                </ul>
                <Link href={p.href} className="block">
                  <Button className="w-full" variant={p.highlighted ? 'cyber' : 'secondary'}>
                    {p.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
