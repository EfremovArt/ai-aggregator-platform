'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface Model {
  slug: string;
  displayName: string;
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

const rub = new Intl.NumberFormat('ru', { maximumFractionDigits: 2 });
const usd = new Intl.NumberFormat('en', { maximumFractionDigits: 4 });

export default function ModelsPage() {
  const models = useQuery({ queryKey: ['models'], queryFn: () => api<Model[]>('/models') });
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'OPENROUTER' | 'MANUAL'>('all');

  const filtered = useMemo(() => {
    const items = models.data ?? [];
    return items.filter((m) => {
      if (sourceFilter !== 'all' && m.source !== sourceFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!m.displayName.toLowerCase().includes(q) && !m.slug.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [models.data, query, sourceFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Модели</h1>
        <p className="text-sm text-muted-foreground">
          Кликните по карточке, чтобы открыть чат с этой моделью. Цены — в рублях за 1M токенов
          (наценка ×2.5 от OpenRouter, USD→RUB по курсу ЦБ).
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(['all', 'OPENROUTER', 'MANUAL'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSourceFilter(s)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                sourceFilter === s
                  ? 'border-cyber-violet/60 bg-cyber-violet/10 text-foreground'
                  : 'border-white/10 bg-secondary/30 text-muted-foreground hover:bg-secondary/50'
              }`}
            >
              {s === 'all' ? 'Все' : s === 'OPENROUTER' ? 'OpenRouter' : 'Курируемые'}
            </button>
          ))}
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
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={m.provider.status === 'ACTIVE' ? 'success' : 'warning'}>
                        {m.provider.status}
                      </Badge>
                      {m.source === 'OPENROUTER' && (
                        <Badge variant="outline" className="text-[10px]">OpenRouter</Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded bg-secondary/40 p-2">
                      <div className="font-mono text-cyber-cyan">
                        {rub.format(m.pricing.inputRubPer1M)} ₽
                      </div>
                      <div className="text-muted-foreground">
                        input · 1M (${usd.format(m.pricing.inputUsdPer1M)})
                      </div>
                    </div>
                    <div className="rounded bg-secondary/40 p-2">
                      <div className="font-mono text-cyber-cyan">
                        {rub.format(m.pricing.outputRubPer1M)} ₽
                      </div>
                      <div className="text-muted-foreground">
                        output · 1M (${usd.format(m.pricing.outputUsdPer1M)})
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {m.capabilities.map((c) => (
                      <Badge key={c} variant="outline">{c.toLowerCase()}</Badge>
                    ))}
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
