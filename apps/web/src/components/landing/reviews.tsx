'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Header } from './models';
import { Star } from 'lucide-react';

const REVIEWS = [
  { author: 'Алексей К.', role: 'CTO, fintech-стартап', text: 'Перешли с прямого OpenAI — экономим ~30% за счёт fallback на дешёвые модели и общего бюджета.' },
  { author: 'Maria S.', role: 'Indie Developer', text: 'OpenAI SDK + base URL — и всё работает. Не пришлось переписывать ни строчки.' },
  { author: 'Дмитрий В.', role: 'Lead, e-commerce', text: 'Клиентам нравятся прозрачные счета и закрывающие документы. Поддержка в Telegram отвечает за минуты.' },
];

export function Reviews() {
  return (
    <section className="relative border-b border-white/[0.06] py-20">
      <div className="container">
        <Header
          eyebrow="Отзывы"
          title="Что говорят пользователи"
          desc="Реальные кейсы команд, которые перешли на единый шлюз."
        />
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {REVIEWS.map((r) => (
            <Card key={r.author}>
              <CardContent className="p-6">
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="mt-3 text-sm text-foreground/90">«{r.text}»</p>
                <div className="mt-4 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">{r.author}</div>
                  <div>{r.role}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
