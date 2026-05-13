'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

type Assistant = {
  slug: string;
  name: string;
  emoji: string | null;
  category: string;
  description: string;
  recommendedModel: string | null;
  isFeatured: boolean;
  uses: number;
};

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'marketing', label: 'Маркетинг' },
  { id: 'writing', label: 'Письмо' },
  { id: 'business', label: 'Бизнес' },
  { id: 'creative', label: 'Креатив' },
  { id: 'code', label: 'Код' },
  { id: 'education', label: 'Обучение' },
  { id: 'personal', label: 'Личное' },
];

export default function AssistantsPage() {
  const [activeCat, setActiveCat] = useState('all');
  const [query, setQuery] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['assistants'],
    queryFn: () => api<Assistant[]>('/assistants'),
  });

  const filtered = useMemo(() => {
    const items = data ?? [];
    return items.filter((a) => {
      if (activeCat !== 'all' && a.category !== activeCat) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!a.name.toLowerCase().includes(q) && !a.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [data, activeCat, query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Готовые ассистенты</h1>
        <p className="text-sm text-muted-foreground">
          Системный промпт уже настроен — выбирайте под задачу и работайте без шаблонных «придумай за
          меня» подсказок.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCat(c.id)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                activeCat === c.id
                  ? 'border-cyber-violet/60 bg-cyber-violet/10 text-foreground'
                  : 'border-white/10 bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Поиск…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:w-60"
        />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Загрузка…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">Ничего не найдено</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <Link
              key={a.slug}
              href={`/dashboard/chat?assistant=${a.slug}`}
              className="group block transition-transform hover:-translate-y-0.5"
            >
              <Card className="flex h-full flex-col transition-colors group-hover:border-cyber-violet/40">
                <CardHeader className="space-y-1.5">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="text-2xl">{a.emoji}</span>
                    <span>{a.name}</span>
                    {a.isFeatured && (
                      <Badge variant="cyber" className="ml-auto text-[10px]">
                        ТОП
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {a.recommendedModel?.replace(/^(.+?)\//, '') ?? '—'}
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    // The outer Link already handles navigation. Keeping the button
                    // here for the explicit affordance, but it points to the same href.
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>Использовать</span>
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
