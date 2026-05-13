'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, formatRub } from '@/lib/utils';

type Category = 'all' | 'text' | 'code' | 'image' | 'video' | 'audio' | 'embeddings';

type ModelEntry = {
  provider: string;
  name: string;
  category: Exclude<Category, 'all'>;
  context?: string;
  best: string;
  /** Цена входа за 1K токенов в ₽ (для текстовых/code/embeddings) */
  inputPer1k?: number;
  /** Цена выхода за 1K токенов в ₽ */
  outputPer1k?: number;
  /** Цена за единицу (изображение, секунда видео и т.д.) */
  unitPrice?: number;
  unitLabel?: string;
};

const MODELS: ModelEntry[] = [
  // Text
  {
    provider: 'OpenAI',
    name: 'GPT-4o',
    category: 'text',
    context: '128K',
    best: 'Универсальный multimodal: чат, маркетинг, аналитика, vision',
    inputPer1k: 0.25,
    outputPer1k: 1.0,
  },
  {
    provider: 'OpenAI',
    name: 'GPT-4o mini',
    category: 'text',
    context: '128K',
    best: 'Дешевая модель для простых задач, классификации, support-ботов',
    inputPer1k: 0.015,
    outputPer1k: 0.06,
  },
  {
    provider: 'Anthropic',
    name: 'Claude 3.5 Sonnet',
    category: 'text',
    context: '200K',
    best: 'Reasoning, длинные документы, юридические тексты, анализ',
    inputPer1k: 0.3,
    outputPer1k: 1.5,
  },
  {
    provider: 'Anthropic',
    name: 'Claude 3.5 Haiku',
    category: 'text',
    context: '200K',
    best: 'Быстрый Claude для чатов и потоковой обработки',
    inputPer1k: 0.08,
    outputPer1k: 0.4,
  },
  {
    provider: 'Google',
    name: 'Gemini 2.0 Flash',
    category: 'text',
    context: '1M',
    best: 'Огромный контекст, видео-/аудио-vision, очень дешёвая',
    inputPer1k: 0.01,
    outputPer1k: 0.04,
  },
  {
    provider: 'DeepSeek',
    name: 'DeepSeek V3',
    category: 'text',
    context: '128K',
    best: 'Рассуждения и математика на уровне топа за низкую цену',
    inputPer1k: 0.027,
    outputPer1k: 0.11,
  },
  {
    provider: 'Mistral',
    name: 'Mistral Large',
    category: 'text',
    context: '128K',
    best: 'EU-модель, JSON-режим, корпоративные задачи',
    inputPer1k: 0.2,
    outputPer1k: 0.6,
  },
  {
    provider: 'xAI',
    name: 'Grok 2',
    category: 'text',
    context: '128K',
    best: 'Real-time данные из X (Twitter), новостной анализ',
    inputPer1k: 0.2,
    outputPer1k: 1.0,
  },
  {
    provider: 'Alibaba',
    name: 'Qwen 2.5 72B',
    category: 'text',
    context: '128K',
    best: 'Open weights, отлично с китайским и кодом',
    inputPer1k: 0.04,
    outputPer1k: 0.12,
  },

  // Code
  {
    provider: 'Anthropic',
    name: 'Claude 3.5 Sonnet',
    category: 'code',
    context: '200K',
    best: 'Топ для рефакторинга и code review больших кодовых баз',
    inputPer1k: 0.3,
    outputPer1k: 1.5,
  },
  {
    provider: 'OpenAI',
    name: 'GPT-4o',
    category: 'code',
    context: '128K',
    best: 'Function calling, агенты, генерация unit-тестов',
    inputPer1k: 0.25,
    outputPer1k: 1.0,
  },
  {
    provider: 'DeepSeek',
    name: 'DeepSeek-Coder V2',
    category: 'code',
    context: '128K',
    best: 'Очень дешёвый код-генератор, поддержка 80+ языков',
    inputPer1k: 0.015,
    outputPer1k: 0.075,
  },
  {
    provider: 'Mistral',
    name: 'Codestral',
    category: 'code',
    context: '32K',
    best: 'Specialized код-модель, fill-in-the-middle',
    inputPer1k: 0.1,
    outputPer1k: 0.3,
  },

  // Image
  {
    provider: 'Midjourney',
    name: 'MJ v7',
    category: 'image',
    best: 'Эстетика, иллюстрации, концепт-арт, реклама',
    unitPrice: 8,
    unitLabel: 'за изображение',
  },
  {
    provider: 'OpenAI',
    name: 'DALL·E 3',
    category: 'image',
    best: 'Точное следование промпту, текст на изображениях',
    unitPrice: 4,
    unitLabel: 'за изображение',
  },
  {
    provider: 'Stability AI',
    name: 'SD 3.5 Large',
    category: 'image',
    best: 'Свободные стили, NSFW-friendly, контроль над композицией',
    unitPrice: 3,
    unitLabel: 'за изображение',
  },
  {
    provider: 'Black Forest Labs',
    name: 'Flux 1.1 Pro',
    category: 'image',
    best: 'Фотореализм, портреты, кинематографичный свет',
    unitPrice: 5,
    unitLabel: 'за изображение',
  },
  {
    provider: 'Recraft',
    name: 'Recraft V3',
    category: 'image',
    best: 'Векторная графика, иконки, логотипы, brand-style',
    unitPrice: 4,
    unitLabel: 'за изображение',
  },
  {
    provider: 'Ideogram',
    name: 'Ideogram 2.0',
    category: 'image',
    best: 'Изображения с типографикой и точным текстом',
    unitPrice: 3,
    unitLabel: 'за изображение',
  },

  // Video
  {
    provider: 'Runway',
    name: 'Gen-3 Alpha',
    category: 'video',
    best: 'Кинематографичное video-to-video, image-to-video',
    unitPrice: 50,
    unitLabel: 'за 5 секунд',
  },
  {
    provider: 'Kling AI',
    name: 'Kling 2.0',
    category: 'video',
    best: 'Реалистичная анимация людей и объектов',
    unitPrice: 35,
    unitLabel: 'за 5 секунд',
  },
  {
    provider: 'Luma',
    name: 'Dream Machine',
    category: 'video',
    best: 'Быстрая генерация роликов из текста или фото',
    unitPrice: 30,
    unitLabel: 'за 5 секунд',
  },
  {
    provider: 'Pika Labs',
    name: 'Pika 2.0',
    category: 'video',
    best: 'Креативные эффекты, sound-аware видео',
    unitPrice: 25,
    unitLabel: 'за 5 секунд',
  },
  {
    provider: 'MiniMax',
    name: 'Hailuo 2.0',
    category: 'video',
    best: 'Естественные движения, выразительная мимика',
    unitPrice: 30,
    unitLabel: 'за 5 секунд',
  },

  // Audio
  {
    provider: 'ElevenLabs',
    name: 'Multilingual v2',
    category: 'audio',
    best: 'Реалистичный TTS, клонирование голоса, 30+ языков',
    unitPrice: 20,
    unitLabel: 'за 1 000 знаков',
  },
  {
    provider: 'OpenAI',
    name: 'TTS-1 HD',
    category: 'audio',
    best: 'Дешёвая высококачественная озвучка для видео',
    unitPrice: 3,
    unitLabel: 'за 1 000 знаков',
  },
  {
    provider: 'OpenAI',
    name: 'Whisper',
    category: 'audio',
    best: 'Распознавание речи: интервью, звонки, субтитры',
    unitPrice: 0.6,
    unitLabel: 'за минуту аудио',
  },
  {
    provider: 'Suno',
    name: 'Suno v4',
    category: 'audio',
    best: 'Генерация музыки с вокалом по текстовому описанию',
    unitPrice: 12,
    unitLabel: 'за трек',
  },

  // Embeddings
  {
    provider: 'OpenAI',
    name: 'text-embedding-3-large',
    category: 'embeddings',
    context: '8K',
    best: 'Семантический поиск, RAG, кластеризация',
    inputPer1k: 0.013,
  },
  {
    provider: 'Voyage AI',
    name: 'voyage-3',
    category: 'embeddings',
    context: '32K',
    best: 'Длинный контекст, юридические и медицинские документы',
    inputPer1k: 0.018,
  },
  {
    provider: 'Google',
    name: 'gemini-embedding-001',
    category: 'embeddings',
    context: '8K',
    best: 'Multilingual поиск из коробки',
    inputPer1k: 0.011,
  },
];

const CATEGORIES: { key: Category; label: string; count?: number }[] = [
  { key: 'all', label: 'Все' },
  { key: 'text', label: 'Текст' },
  { key: 'code', label: 'Код' },
  { key: 'image', label: 'Изображения' },
  { key: 'video', label: 'Видео' },
  { key: 'audio', label: 'Аудио' },
  { key: 'embeddings', label: 'Embeddings' },
];

export function Models() {
  const [active, setActive] = useState<Category>('all');
  const visible = active === 'all' ? MODELS : MODELS.filter((m) => m.category === active);

  return (
    <section id="models" className="relative border-b border-white/[0.06] py-20">
      <div className="container">
        <Header
          eyebrow="Модели"
          title="30+ моделей под любую задачу"
          desc="Текст, код, изображения, видео, голос и embeddings. Прозрачные цены. Платите только за фактическое использование."
        />

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map((c) => {
            const isActive = active === c.key;
            const count = c.key === 'all' ? MODELS.length : MODELS.filter((m) => m.category === c.key).length;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setActive(c.key)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs transition-colors',
                  isActive
                    ? 'border-cyber-violet/60 bg-cyber-violet/15 text-foreground'
                    : 'border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground',
                )}
              >
                {c.label}
                <span className="ml-1.5 text-[10px] text-muted-foreground/70">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((m, idx) => (
            <Link
              key={`${m.provider}-${m.name}-${idx}`}
              href="/dashboard/models"
              className="group block transition-transform hover:-translate-y-0.5"
            >
              <Card className="h-full transition-colors group-hover:border-cyber-violet/40">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        {m.provider}
                      </div>
                      <div className="mt-0.5 text-base font-semibold">{m.name}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {m.category}
                      {m.context ? ` · ${m.context}` : ''}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    <span className="text-foreground/80">Лучше всего для: </span>
                    {m.best}
                  </p>
                  <div className="mt-4">
                    {m.inputPer1k !== undefined ? (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <PriceCell
                          title={formatRub(m.inputPer1k, 3)}
                          sub="input · 1K токенов"
                        />
                        {m.outputPer1k !== undefined ? (
                          <PriceCell
                            title={formatRub(m.outputPer1k, 3)}
                            sub="output · 1K токенов"
                          />
                        ) : null}
                      </div>
                    ) : m.unitPrice !== undefined ? (
                      <PriceCell
                        title={`от ${formatRub(m.unitPrice, m.unitPrice < 1 ? 2 : 0)}`}
                        sub={m.unitLabel ?? 'за единицу'}
                        full
                      />
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Цены ориентировочные и зависят от курса доллара. Точная стоимость отображается в чате до отправки запроса.
        </p>
      </div>
    </section>
  );
}

function PriceCell({ title, sub, full }: { title: string; sub: string; full?: boolean }) {
  return (
    <div className={cn('rounded-md bg-secondary/50 p-2', full && 'col-span-2')}>
      <div className="text-foreground font-medium">{title}</div>
      <div className="text-muted-foreground">{sub}</div>
    </div>
  );
}

export function Header({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Badge variant="cyber" className="text-[10px] tracking-widest">
        {eyebrow.toUpperCase()}
      </Badge>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
      <p className="mt-3 text-muted-foreground">{desc}</p>
    </div>
  );
}
