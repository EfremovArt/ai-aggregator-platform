/**
 * Mutually-exclusive model categories for the catalog and chat picker.
 *
 * Each model lands in exactly one bucket so the counts at the top of the
 * page actually add up to the total. Priority order matters — when a model
 * matches several rules, the first one wins (so a code-reasoning model is
 * shown under "Сложные задачи", not "Программирование").
 *
 * The "(скоро)" buckets are placeholders for upcoming integrations
 * (DALL·E, Runway, Suno, ElevenLabs) and stay empty until those providers
 * are wired up. They render as disabled chips.
 */

export interface CategorizableModel {
  slug: string;
  family: string | null;
  capabilities: string[];
}

export type CategoryKey =
  | 'all'
  | 'reasoning'
  | 'code'
  | 'vision'
  | 'text'
  | 'image-gen'
  | 'video'
  | 'music'
  | 'voice';

export interface CategoryDef {
  key: CategoryKey;
  label: string;
  /** Hint shown as tooltip / in helper UI. */
  hint: string;
  /** Whether models in this bucket are actually available right now. */
  available: boolean;
}

export const CATEGORIES: CategoryDef[] = [
  { key: 'all', label: 'Все', hint: 'Все доступные модели', available: true },
  {
    key: 'reasoning',
    label: '🧠 Сложные задачи',
    hint: 'Думают пошагово — для математики, анализа, цепочек рассуждений (o1, R1)',
    available: true,
  },
  {
    key: 'code',
    label: '💻 Программирование',
    hint: 'Специально обучены писать и объяснять код',
    available: true,
  },
  {
    key: 'vision',
    label: '🖼 Картинки',
    hint: 'Понимают и описывают изображения, которые вы загружаете',
    available: true,
  },
  {
    key: 'text',
    label: '💬 Текст и диалог',
    hint: 'Универсальные модели для общения, переводов, текстов',
    available: true,
  },
  {
    key: 'image-gen',
    label: '🎨 Генерация картинок (скоро)',
    hint: 'Создание изображений по описанию — появится после подключения DALL·E',
    available: false,
  },
  {
    key: 'video',
    label: '🎬 Видео (скоро)',
    hint: 'Генерация видео — появится после подключения Runway',
    available: false,
  },
  {
    key: 'music',
    label: '🎵 Музыка (скоро)',
    hint: 'Генерация музыки — появится после подключения Suno',
    available: false,
  },
  {
    key: 'voice',
    label: '🎙 Голос (скоро)',
    hint: 'Озвучка и распознавание речи — появится после подключения ElevenLabs',
    available: false,
  },
];

function familyOrSlug(m: CategorizableModel): string {
  return `${m.family ?? ''} ${m.slug}`.toLowerCase();
}

/**
 * Single source of truth for "which bucket does this model belong to".
 * First match wins, so order matters.
 */
export function categorize(m: CategorizableModel): CategoryKey {
  const fs = familyOrSlug(m);
  if (/\b(o1|o3|o4|r1|reasoning|think)\b/.test(fs)) return 'reasoning';
  if (/code|coder|codestral|qwen-?coder/.test(fs)) return 'code';
  if (m.capabilities.includes('IMAGE_INPUT')) return 'vision';
  return 'text';
}

export function countByCategory(models: CategorizableModel[]): Record<CategoryKey, number> {
  const out: Record<CategoryKey, number> = {
    all: models.length,
    reasoning: 0,
    code: 0,
    vision: 0,
    text: 0,
    'image-gen': 0,
    video: 0,
    music: 0,
    voice: 0,
  };
  for (const m of models) out[categorize(m)]++;
  return out;
}
