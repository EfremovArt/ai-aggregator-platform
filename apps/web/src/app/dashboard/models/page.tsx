'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatRub } from '@/lib/utils';

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

// Categories tied to what the OpenRouter catalog actually provides today.
// Image-generation, video, music and voice TTS providers (DALL·E, Runway,
// Suno, ElevenLabs) ship in a separate follow-up — they need their own
// API keys and pricing schema (per-image / per-second / per-character).
type CategoryDef = {
  key: string;
  label: string;
  match: (m: Model) => boolean;
  available: boolean;
};

function familyOrSlug(m: Model): string {
  return `${m.family ?? ''} ${m.slug}`.toLowerCase();
}

const CATEGORIES: CategoryDef[] = [
  { key: 'all', label: 'Все', match: () => true, available: true },
  {
    key: 'text',
    label: '💬 Текст',
    match: (m) => !m.capabilities.includes('IMAGE_INPUT'),
    available: true,
  },
  {
    key: 'vision',
    label: '🖼 Vision (анализ картинок)',
    match: (m) => m.capabilities.includes('IMAGE_INPUT'),
    available: true,
  },
  {
    key: 'code',
    label: '💻 Код',
    match: (m) => /code|coder|codestral|qwen-?coder/.test(familyOrSlug(m)),
    available: true,
  },
  {
    key: 'reasoning',
    label: '🧠 Reasoning',
    match: (m) => /\b(o1|o3|o4|r1|reasoning|think)\b/.test(familyOrSlug(m)),
    available: true,
  },
  {
    key: 'long-context',
    label: '🎯 Длинный контекст (100K+)',
    match: (m) => m.contextLength >= 100_000,
    available: true,
  },
  {
    key: 'tools',
    label: '🛠 Tools / Function calling',
    match: (m) => m.capabilities.includes('TOOLS') || m.capabilities.includes('FUNCTION_CALLING'),
    available: true,
  },
  { key: 'image-gen', label: '🎨 Изображения (скоро)', match: () => false, available: false },
  { key: 'video', label: '🎬 Видео (скоро)', match: () => false, available: false },
  { key: 'music', label: '🎵 Музыка (скоро)', match: () => false, available: false },
  { key: 'voice', label: '🎙 Голос (скоро)', match: () => false, available: false },
];

export default function ModelsPage() {
  const models = useQuery({ queryKey: ['models'], queryFn: () => api<Model[]>('/models') });
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');

  const categoryDef = CATEGORIES.find((c) => c.key === category) ?? CATEGORIES[0];

  const filtered = useMemo(() => {
    const items = models.data ?? [];
    const byCategory = items.filter((m) => categoryDef.match(m));
    if (!query) return byCategory;
    const q = query.toLowerCase();
    return byCategory.filter(
      (m) => m.displayName.toLowerCase().includes(q) || m.slug.toLowerCase().includes(q),
    );
  }, [models.data, query, categoryDef]);

  // Precompute counts per category for the tab labels — gives the user a
  // sense of how many models live in each bucket before they click.
  const counts = useMemo(() => {
    const items = models.data ?? [];
    const out: Record<string, number> = {};
    for (const c of CATEGORIES) out[c.key] = c.available ? items.filter(c.match).length : 0;
    return out;
  }, [models.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Модели</h1>
        <p className="text-sm text-muted-foreground">
          Выберите категорию и кликните на карточку — откроется чат с этой моделью. Цены — в рублях
          за 1M токенов (наценка ×2.5, курс USD→RUB обновляется ежедневно по ЦБ).
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
                title="Этот тип моделей появится в ближайшем обновлении"
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
                      <div className="text-muted-foreground">input · 1M токенов</div>
                    </div>
                    <div className="rounded bg-secondary/40 p-2">
                      <div className="font-mono text-cyber-cyan">
                        {formatRub(m.pricing.outputRubPer1M)}
                      </div>
                      <div className="text-muted-foreground">output · 1M токенов</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {m.capabilities.map((c) => (
                      <Badge key={c} variant="outline">
                        {c.toLowerCase()}
                      </Badge>
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
