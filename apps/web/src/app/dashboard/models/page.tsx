'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatRub } from '@/lib/utils';
import {
  CATEGORIES,
  categorize,
  countByCategory,
  type CategoryKey,
} from '@/lib/model-categories';

interface Model {
  slug: string;
  displayName: string;
  family: string | null;
  provider: { id: string; displayName: string; status: string };
  pricing: {
    inputUsdPer1M: number;
    outputUsdPer1M: number;
    inputRubPer1M: number;
    outputRubPer1M: number;
    marginPercent: number;
  };
  contextLength: number;
  capabilities: string[];
  source: 'MANUAL' | 'OPENROUTER';
  isFeatured: boolean;
}

export default function ModelsPage() {
  const models = useQuery({ queryKey: ['models'], queryFn: () => api<Model[]>('/models') });
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryKey>('all');

  const filtered = useMemo(() => {
    const items = models.data ?? [];
    const byCategory = category === 'all' ? items : items.filter((m) => categorize(m) === category);
    if (!query) return byCategory;
    const q = query.toLowerCase();
    return byCategory.filter(
      (m) => m.displayName.toLowerCase().includes(q) || m.slug.toLowerCase().includes(q),
    );
  }, [models.data, query, category]);

  // Disjoint counts per category: every model lands in exactly one bucket,
  // so summing the visible counts equals the total catalog size.
  const counts = useMemo(() => countByCategory(models.data ?? []), [models.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Модели</h1>
        <p className="text-sm text-muted-foreground">
          Выберите категорию и кликните на карточку — откроется чат с этой моделью.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = c.key === category;
          const count = counts[c.key] ?? 0;
          if (!c.available) {
            return (
              <button
                key={c.key}
                type="button"
                disabled
                title={c.hint}
                className="cursor-not-allowed rounded-md border border-white/5 bg-secondary/20 px-3 py-1.5 text-xs text-muted-foreground/60"
              >
                {c.label}
              </button>
            );
          }
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              title={c.hint}
              className={
                'rounded-md border px-3 py-1.5 text-xs transition-colors ' +
                (active
                  ? 'border-cyber-violet/60 bg-cyber-violet/15 text-foreground'
                  : 'border-white/10 bg-secondary/40 text-muted-foreground hover:text-foreground')
              }
            >
              {c.label}
              {count > 0 && (
                <span
                  className={
                    'ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-mono ' +
                    (active ? 'bg-cyber-violet/30' : 'bg-secondary/60')
                  }
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {models.data ? `${filtered.length} ${filtered.length === 1 ? 'модель' : 'моделей'}` : ''}
        </div>
        <Input
          placeholder="Поиск по названию или slug…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:w-72"
        />
      </div>

      {models.isLoading ? (
        <div className="text-sm text-muted-foreground">Загрузка…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">Ничего не найдено</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Link
              key={m.slug}
              href={`/dashboard/chat?model=${encodeURIComponent(m.slug)}`}
              className="group block transition-transform hover:-translate-y-0.5"
            >
              <Card className="h-full transition-colors group-hover:border-cyber-violet/40">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs uppercase text-muted-foreground">
                        {m.provider.displayName}
                      </div>
                      <div className="truncate font-semibold">{m.displayName}</div>
                    </div>
                    <Badge variant={m.provider.status === 'ACTIVE' ? 'success' : 'warning'}>
                      {m.provider.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded bg-secondary/40 p-2">
                      <div className="font-mono text-cyber-cyan">
                        {formatRub(m.pricing.inputRubPer1M)}
                      </div>
                      <div className="text-muted-foreground">Вход · 1M токенов</div>
                    </div>
                    <div className="rounded bg-secondary/40 p-2">
                      <div className="font-mono text-cyber-cyan">
                        {formatRub(m.pricing.outputRubPer1M)}
                      </div>
                      <div className="text-muted-foreground">Ответ · 1M токенов</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Контекст: {m.contextLength.toLocaleString('ru')} токенов
                  </div>
                  <code className="block truncate rounded bg-black/40 p-2 font-mono text-xs">
                    {m.slug}
                  </code>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
