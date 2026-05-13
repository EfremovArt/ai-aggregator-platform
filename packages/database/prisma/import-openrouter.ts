/**
 * OpenRouter catalog importer.
 *
 * Fetches https://openrouter.ai/api/v1/models, applies a configurable markup
 * (default ×2.5) and converts USD→RUB using today's CBR daily rate. Persists
 * both USD raw and RUB customer-facing prices into the Model table.
 *
 * Idempotent: only rows with source=OPENROUTER are touched, so manually
 * seeded models (source=MANUAL) are left untouched.
 *
 * Usage:
 *   docker compose exec api sh -c "cd node_modules/@ai-platform/database && \
 *     ./node_modules/.bin/tsx prisma/import-openrouter.ts"
 *
 * Env overrides:
 *   OPENROUTER_MARGIN_PERCENT  default 150  (means inputRub = inputUsd × 2.5 × usdRub)
 *   USD_RUB_FALLBACK           default 100  (used if CBR is unreachable)
 *   OPENROUTER_IMPORT_LIMIT    default 0    (0 = import all; otherwise cap for testing)
 */

import { PrismaClient, ProviderId, ModelCapability, ModelSource } from '@prisma/client';

const prisma = new PrismaClient();

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/models';
const CBR_URL = 'https://www.cbr-xml-daily.ru/daily_json.js';

const MARGIN_PERCENT = Number(process.env.OPENROUTER_MARGIN_PERCENT ?? 150); // 150% → ×2.5
const FALLBACK_USD_RUB = Number(process.env.USD_RUB_FALLBACK ?? 100);
const IMPORT_LIMIT = Number(process.env.OPENROUTER_IMPORT_LIMIT ?? 0); // 0 = no limit

interface OpenRouterModel {
  id: string;
  canonical_slug?: string | null;
  name: string;
  description?: string;
  context_length?: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
  pricing?: {
    prompt?: string;
    completion?: string;
    image?: string;
    request?: string;
    web_search?: string;
  };
  top_provider?: {
    max_completion_tokens?: number | null;
    is_moderated?: boolean;
  };
  supported_parameters?: string[];
}

interface CbrDaily {
  Valute: { USD?: { Value: number } };
}

// Map OpenRouter's prefix (before '/') to our Prisma ProviderId enum. Anything
// unmapped falls back to CUSTOM — the displayName already carries the brand
// (e.g. "Meta: Llama 3.1 405B"), so we don't lose the info.
const PROVIDER_PREFIX_MAP: Record<string, ProviderId> = {
  openai: 'OPENAI',
  anthropic: 'ANTHROPIC',
  '~anthropic': 'ANTHROPIC',
  google: 'GOOGLE',
  deepseek: 'DEEPSEEK',
  mistralai: 'MISTRAL',
  'mistral-ai': 'MISTRAL',
  'x-ai': 'XAI',
  xai: 'XAI',
  qwen: 'QWEN',
};

function mapProvider(orId: string): ProviderId {
  const prefix = orId.split('/')[0]?.toLowerCase() ?? '';
  return PROVIDER_PREFIX_MAP[prefix] ?? 'CUSTOM';
}

function mapCapabilities(m: OpenRouterModel): ModelCapability[] {
  const caps: ModelCapability[] = ['CHAT', 'STREAMING'];
  const inputs = m.architecture?.input_modalities ?? [];
  const outputs = m.architecture?.output_modalities ?? [];
  const params = m.supported_parameters ?? [];

  if (inputs.includes('image')) caps.push('IMAGE_INPUT');
  if (outputs.includes('image')) caps.push('IMAGE_OUTPUT');
  if (inputs.includes('audio')) caps.push('AUDIO_INPUT');
  if (outputs.includes('audio')) caps.push('AUDIO_OUTPUT');
  if (params.includes('tools') || params.includes('tool_choice')) caps.push('TOOLS');
  if (params.includes('functions') || params.includes('function_call')) caps.push('FUNCTION_CALLING');

  return Array.from(new Set(caps));
}

async function fetchUsdRubRate(): Promise<{ rate: number; source: string }> {
  try {
    const res = await fetch(CBR_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`CBR returned ${res.status}`);
    const json = (await res.json()) as CbrDaily;
    const rate = json.Valute?.USD?.Value;
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
      throw new Error('CBR returned invalid USD rate');
    }
    return { rate, source: 'CBR' };
  } catch (e) {
    console.warn(`  ! CBR fetch failed (${(e as Error).message}); falling back to ${FALLBACK_USD_RUB}`);
    return { rate: FALLBACK_USD_RUB, source: 'FALLBACK' };
  }
}

async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const res = await fetch(OPENROUTER_URL, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`OpenRouter returned ${res.status}`);
  const json = (await res.json()) as { data: OpenRouterModel[] };
  return json.data;
}

function hasValidPricing(m: OpenRouterModel): boolean {
  // Skip rows where prompt price is missing/garbage. OpenRouter occasionally
  // returns string `"-1"` for retired / no-longer-vended models — those rows
  // can't be sold to a customer with confidence.
  const promptPrice = Number(m.pricing?.prompt ?? '0');
  if (!Number.isFinite(promptPrice) || promptPrice < 0) return false;
  return true;
}

async function main() {
  console.log('Importing models from OpenRouter…');
  console.log(`  Markup: ${MARGIN_PERCENT}% (×${(1 + MARGIN_PERCENT / 100).toFixed(2)})`);

  const [{ rate: usdRub, source: rateSource }, allModels] = await Promise.all([
    fetchUsdRubRate(),
    fetchOpenRouterModels(),
  ]);
  console.log(`  USD→RUB: ${usdRub.toFixed(2)} (${rateSource})`);
  console.log(`  Fetched ${allModels.length} total models from OpenRouter`);

  const valid = allModels.filter(hasValidPricing);
  console.log(`  ${valid.length} models have valid pricing`);

  const toImport = IMPORT_LIMIT > 0 ? valid.slice(0, IMPORT_LIMIT) : valid;
  console.log(`  Will import ${toImport.length} models`);

  // Ensure all referenced provider rows exist before we try to FK into them.
  const referencedProviders = new Set(toImport.map((m) => mapProvider(m.id)));
  for (const pid of referencedProviders) {
    await prisma.provider.upsert({
      where: { id: pid },
      update: {},
      create: {
        id: pid,
        displayName:
          pid === 'CUSTOM'
            ? 'Other (via OpenRouter)'
            : pid.charAt(0) + pid.slice(1).toLowerCase(),
      },
    });
  }

  const markup = 1 + MARGIN_PERCENT / 100;
  let upserted = 0;
  let skipped = 0;

  for (const m of toImport) {
    try {
      // OpenRouter pricing is "USD per token" — multiply by 1M for per-1M comparable to our schema.
      const inputUsdPer1M = Number(m.pricing?.prompt ?? '0') * 1_000_000;
      const outputUsdPer1M = Number(m.pricing?.completion ?? '0') * 1_000_000;
      // Per-image price (already USD per image, not per million).
      const imageUsdPerImg = Number(m.pricing?.image ?? '0');

      const inputRubPer1M = inputUsdPer1M * markup * usdRub;
      const outputRubPer1M = outputUsdPer1M * markup * usdRub;

      const providerId = mapProvider(m.id);
      const capabilities = mapCapabilities(m);
      const contextLength = m.context_length && m.context_length > 0 ? m.context_length : 8192;
      const maxOutputTokens = m.top_provider?.max_completion_tokens ?? 4096;

      // On overlap with a seeded MANUAL slug we still want the OpenRouter price
      // (it's the actual upstream cost). The seed only exists to bootstrap an
      // empty DB — the importer is the canonical source for OpenRouter models.
      await prisma.model.upsert({
        where: { slug: m.id },
        create: {
          providerId,
          slug: m.id,
          displayName: m.name,
          family: m.id.split('/')[1]?.split('-')[0],
          description: m.description?.slice(0, 1000),
          capabilities,
          contextLength,
          maxOutputTokens: Math.max(0, maxOutputTokens ?? 0),
          inputUsdPer1M,
          outputUsdPer1M,
          imageUsdPerImg,
          inputRubPer1M,
          outputRubPer1M,
          marginPercent: MARGIN_PERCENT,
          source: ModelSource.OPENROUTER,
          isActive: true,
        },
        update: {
          providerId,
          displayName: m.name,
          description: m.description?.slice(0, 1000),
          capabilities,
          contextLength,
          maxOutputTokens: Math.max(0, maxOutputTokens ?? 0),
          inputUsdPer1M,
          outputUsdPer1M,
          imageUsdPerImg,
          inputRubPer1M,
          outputRubPer1M,
          marginPercent: MARGIN_PERCENT,
          source: ModelSource.OPENROUTER,
          isActive: true,
        },
      });
      upserted += 1;
    } catch (e) {
      console.warn(`  ! Skipping ${m.id}: ${(e as Error).message}`);
      skipped += 1;
    }
  }

  console.log(`Done. Upserted ${upserted}, skipped ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
