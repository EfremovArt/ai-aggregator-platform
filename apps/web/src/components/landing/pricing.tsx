'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Wallet, Zap, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatRub } from '@/lib/utils';
import { Header } from './models';

type Row = { model: string; provider: string; ctx?: string; price: string; sub?: string };

interface ApiModel {
  slug: string;
  displayName: string;
  provider: { displayName: string };
  contextLength: number;
  pricing: { inputRubPer1M: number; outputRubPer1M: number };
  isFeatured?: boolean;
}

// Off-OpenRouter modalities. OpenRouter catalogs text-output LLMs only; image,
// video, audio and music generators below are listed as approximate retail
// prices (~×2.5 of their direct provider USD list). They're shown for reference
// — the actual catalog at /dashboard/models is fed live by /api/models.
const IMAGE: Row[] = [
  { model: 'Midjourney v7', provider: 'Midjourney', price: 'от 8 ₽', sub: 'за 1 изображение' },
  { model: 'DALL·E 3', provider: 'OpenAI', price: 'от 4 ₽', sub: 'за 1 изображение (HD 8 ₽)' },
  { model: 'Flux 1.1 Pro', provider: 'Black Forest Labs', price: 'от 5 ₽', sub: 'за 1 изображение' },
  { model: 'Stable Diffusion 3.5 Large', provider: 'Stability AI', price: 'от 3 ₽', sub: 'за 1 изображение' },
  { model: 'Recraft V3', provider: 'Recraft', price: 'от 4 ₽', sub: 'за 1 изображение / иконку' },
  { model: 'Ideogram 2.0', provider: 'Ideogram', price: 'от 3 ₽', sub: 'за 1 изображение' },
];

const VIDEO: Row[] = [
  { model: 'Runway Gen-3 Alpha', provider: 'Runway', price: 'от 50 ₽', sub: 'за 5 сек видео (1080p)' },
  { model: 'Kling 2.0', provider: 'Kling AI', price: 'от 35 ₽', sub: 'за 5 сек видео' },
  { model: 'Dream Machine', provider: 'Luma', price: 'от 30 ₽', sub: 'за 5 сек видео' },
  { model: 'Pika 2.0', provider: 'Pika Labs', price: 'от 25 ₽', sub: 'за 5 сек видео' },
  { model: 'Hailuo 2.0', provider: 'MiniMax', price: 'от 30 ₽', sub: 'за 5 сек видео' },
];

const AUDIO: Row[] = [
  { model: 'ElevenLabs Multilingual v2', provider: 'ElevenLabs', price: 'от 20 ₽', sub: 'за 1 000 знаков (TTS)' },
  { model: 'OpenAI TTS-1 HD', provider: 'OpenAI', price: 'от 3 ₽', sub: 'за 1 000 знаков (TTS)' },
  { model: 'Whisper', provider: 'OpenAI', price: 'от 0,60 ₽', sub: 'за минуту аудио (распознавание)' },
  { model: 'Suno v4', provider: 'Suno', price: 'от 12 ₽', sub: 'за музыкальный трек' },
];

const EMB: Row[] = [
  { model: 'text-embedding-3-large', provider: 'OpenAI', ctx: '8K', price: '0,013 ₽', sub: 'за 1K токенов' },
  { model: 'voyage-3', provider: 'Voyage AI', ctx: '32K', price: '0,018 ₽', sub: 'за 1K токенов' },
  { model: 'gemini-embedding-001', provider: 'Google', ctx: '8K', price: '0,011 ₽', sub: 'за 1K токенов' },
];

// Curated set we surface on the landing — keeps the table to a digestible size.
// Anything that matches one of these slug prefixes is pulled live from the API;
// everything else stays in the dashboard catalog at /dashboard/models.
const FEATURED_PREFIXES = [
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'openai/o1-mini',
  'anthropic/claude-3.5',
  'anthropic/claude-3-5',
  'anthropic/claude-3-haiku',
  'google/gemini',
  'deepseek/',
  'mistralai/mistral-large',
  'x-ai/grok',
  'qwen/qwen-2.5-72b',
  'meta-llama/llama-3.1-405b',
];

function buildTextRows(models: ApiModel[]): Row[] {
  const featured: ApiModel[] = [];
  const seen = new Set<string>();
  for (const prefix of FEATURED_PREFIXES) {
    const match = models.find(
      (m) => m.slug.toLowerCase().startsWith(prefix.toLowerCase()) && !seen.has(m.slug),
    );
    if (match) {
      featured.push(match);
      seen.add(match.slug);
    }
  }
  return featured.map((m) => ({
    model: m.displayName,
    provider: m.provider.displayName,
    ctx: m.contextLength >= 1_000_000
      ? `${Math.round(m.contextLength / 1_000_000)}M`
      : m.contextLength >= 1_000
        ? `${Math.round(m.contextLength / 1_000)}K`
        : `${m.contextLength}`,
    price: `${formatRub(m.pricing.inputRubPer1M / 1000, m.pricing.inputRubPer1M / 1000 < 1 ? 3 : 2)} / ${formatRub(
      m.pricing.outputRubPer1M / 1000,
      m.pricing.outputRubPer1M / 1000 < 1 ? 3 : 2,
    )}`,
    sub: 'input / output · 1K токенов',
  }));
}

export function Pricing() {
  const q = useQuery({
    queryKey: ['models-landing'],
    queryFn: () => api<ApiModel[]>('/models'),
    staleTime: 5 * 60_000,
  });

  const textRows = q.data ? buildTextRows(q.data) : [];
  const totalCount = q.data?.length ?? 0;

  return (
    <section id="pricing" className="relative border-b border-white/[0.06] py-20">
      <div className="container">
        <Header
          eyebrow="Цены"
          title="Pay-per-use. Платите только за использование"
          desc="Никаких подписок. Цена показывается в чате до отправки запроса. Текст — за токены, изображения и видео — за единицу, аудио — за знаки или минуты."
        />

        <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-3">
          <Highlight
            icon={Wallet}
            title="Минимальный депозит"
            value="300 ₽"
            desc="Можно пополнять любым удобным способом"
          />
          <Highlight
            icon={ShieldAlert}
            title="Hard cutoff"
            value="всегда"
            desc="Запрос не выполнится, если денег на балансе не хватает на верхнюю оценку"
          />
          <Highlight
            icon={Zap}
            title="Welcome-кредит"
            value="50 ₽"
            desc="Бесплатно при подтверждённой регистрации"
          />
        </div>

        <PriceTable
          title="Текст и код"
          rows={textRows}
          loading={q.isLoading}
          note={
            totalCount > 0
              ? `Здесь — топ моделей. Всего в каталоге: ${totalCount}. Цены × 2.5 от OpenRouter, USD→₽ по курсу ЦБ.`
              : undefined
          }
        />
        <PriceTable title="Изображения" rows={IMAGE} />
        <PriceTable title="Видео" rows={VIDEO} />
        <PriceTable title="Аудио и музыка" rows={AUDIO} />
        <PriceTable title="Embeddings" rows={EMB} />

        <div className="mx-auto mt-12 flex max-w-3xl flex-col items-center gap-4 rounded-2xl border border-white/10 bg-secondary/30 p-6 text-center sm:flex-row sm:text-left">
          <Sparkles className="h-8 w-8 shrink-0 text-cyber-cyan" />
          <div className="flex-1">
            <h3 className="text-base font-semibold">Корпоративный тариф для бизнеса</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Договор и закрывающие документы, индивидуальные лимиты, SLA 99.9%, dedicated capacity, on-prem.
            </p>
          </div>
          <Link href="/contact">
            <Button variant="cyber">
              Связаться <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Точная цена за конкретный запрос видна в интерфейсе до отправки. Курс ₽ к $ обновляется ежедневно.
        </p>
      </div>
    </section>
  );
}

function PriceTable({
  title,
  rows,
  loading,
  note,
}: {
  title: string;
  rows: Row[];
  loading?: boolean;
  note?: string;
}) {
  return (
    <div className="mt-12">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h3 className="text-xl font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">
          {loading ? '…' : `${rows.length} ${rows.length > 4 ? 'моделей' : 'модели'}`}
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-secondary/20">
        <div className="grid grid-cols-12 border-b border-white/10 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <div className="col-span-5">Модель</div>
          <div className="col-span-3 hidden sm:block">Провайдер</div>
          <div className="col-span-2 hidden md:block">Контекст</div>
          <div className="col-span-7 sm:col-span-4 md:col-span-2">Цена</div>
        </div>
        {loading && rows.length === 0 ? (
          <div className="px-5 py-6 text-sm text-muted-foreground">Загружаем актуальные цены…</div>
        ) : (
          rows.map((r, i) => (
            <div
              key={`${r.model}-${i}`}
              className="grid grid-cols-12 border-b border-white/5 px-5 py-3.5 text-sm last:border-b-0 hover:bg-white/[0.02]"
            >
              <div className="col-span-5">
                <div className="font-medium">{r.model}</div>
                <div className="text-xs text-muted-foreground sm:hidden">{r.provider}</div>
              </div>
              <div className="col-span-3 hidden text-muted-foreground sm:block">{r.provider}</div>
              <div className="col-span-2 hidden text-muted-foreground md:block">{r.ctx ?? '—'}</div>
              <div className="col-span-7 sm:col-span-4 md:col-span-2">
                <div className="text-foreground">{r.price}</div>
                {r.sub ? <div className="text-xs text-muted-foreground">{r.sub}</div> : null}
              </div>
            </div>
          ))
        )}
      </div>
      {note ? <p className="mt-2 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function Highlight({
  icon: Icon,
  title,
  value,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  desc: string;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-cyber-cyan">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{title}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
