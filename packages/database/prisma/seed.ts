import { PrismaClient, ProviderId, ModelCapability, UserRole, UserStatus, CouponType } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';

const prisma = new PrismaClient();

const PROVIDERS: Array<{
  id: ProviderId;
  displayName: string;
  baseUrl?: string;
}> = [
  { id: 'OPENAI', displayName: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { id: 'ANTHROPIC', displayName: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1' },
  { id: 'GOOGLE', displayName: 'Google AI', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  { id: 'DEEPSEEK', displayName: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
  { id: 'MISTRAL', displayName: 'Mistral', baseUrl: 'https://api.mistral.ai/v1' },
  { id: 'XAI', displayName: 'xAI (Grok)', baseUrl: 'https://api.x.ai/v1' },
  { id: 'QWEN', displayName: 'Qwen (Alibaba)', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
];

// Pricing as of 2024-2025 — USD per 1M tokens (input/output).
// These are illustrative — sync with provider docs in production.
const MODELS: Array<{
  providerId: ProviderId;
  slug: string;
  displayName: string;
  family?: string;
  contextLength: number;
  maxOutputTokens: number;
  inputUsdPer1M: number;
  outputUsdPer1M: number;
  capabilities: ModelCapability[];
  isFeatured?: boolean;
  fallbackSlug?: string;
  description?: string;
}> = [
  // OpenAI
  {
    providerId: 'OPENAI',
    slug: 'openai/gpt-4o',
    displayName: 'GPT-4o',
    family: 'gpt-4',
    contextLength: 128000,
    maxOutputTokens: 16384,
    inputUsdPer1M: 2.5,
    outputUsdPer1M: 10,
    capabilities: ['CHAT', 'STREAMING', 'IMAGE_INPUT', 'FUNCTION_CALLING', 'TOOLS'],
    isFeatured: true,
    fallbackSlug: 'openai/gpt-4o-mini',
    description: 'Multimodal flagship model from OpenAI.',
  },
  {
    providerId: 'OPENAI',
    slug: 'openai/gpt-4o-mini',
    displayName: 'GPT-4o mini',
    family: 'gpt-4',
    contextLength: 128000,
    maxOutputTokens: 16384,
    inputUsdPer1M: 0.15,
    outputUsdPer1M: 0.6,
    capabilities: ['CHAT', 'STREAMING', 'IMAGE_INPUT', 'FUNCTION_CALLING', 'TOOLS'],
    isFeatured: true,
    description: 'Fast & cheap general-purpose model.',
  },
  {
    providerId: 'OPENAI',
    slug: 'openai/o1-mini',
    displayName: 'o1-mini (reasoning)',
    family: 'o1',
    contextLength: 128000,
    maxOutputTokens: 65536,
    inputUsdPer1M: 3,
    outputUsdPer1M: 12,
    capabilities: ['CHAT', 'STREAMING'],
    description: 'Reasoning model for complex problems.',
  },
  {
    providerId: 'OPENAI',
    slug: 'openai/text-embedding-3-large',
    displayName: 'Embedding 3 Large',
    family: 'embedding',
    contextLength: 8191,
    maxOutputTokens: 0,
    inputUsdPer1M: 0.13,
    outputUsdPer1M: 0,
    capabilities: ['EMBEDDING'],
  },
  {
    providerId: 'OPENAI',
    slug: 'openai/dall-e-3',
    displayName: 'DALL·E 3',
    family: 'image',
    contextLength: 4000,
    maxOutputTokens: 0,
    inputUsdPer1M: 0,
    outputUsdPer1M: 0,
    capabilities: ['IMAGE_OUTPUT'],
  },
  {
    providerId: 'OPENAI',
    slug: 'openai/omni-moderation-latest',
    displayName: 'Moderation',
    family: 'moderation',
    contextLength: 32768,
    maxOutputTokens: 0,
    inputUsdPer1M: 0,
    outputUsdPer1M: 0,
    capabilities: ['MODERATION'],
  },

  // Anthropic Claude
  {
    providerId: 'ANTHROPIC',
    slug: 'anthropic/claude-3-5-sonnet',
    displayName: 'Claude 3.5 Sonnet',
    family: 'claude-3.5',
    contextLength: 200000,
    maxOutputTokens: 8192,
    inputUsdPer1M: 3,
    outputUsdPer1M: 15,
    capabilities: ['CHAT', 'STREAMING', 'IMAGE_INPUT', 'TOOLS'],
    isFeatured: true,
    fallbackSlug: 'anthropic/claude-3-5-haiku',
    description: 'Anthropic\'s most balanced flagship.',
  },
  {
    providerId: 'ANTHROPIC',
    slug: 'anthropic/claude-3-5-haiku',
    displayName: 'Claude 3.5 Haiku',
    family: 'claude-3.5',
    contextLength: 200000,
    maxOutputTokens: 8192,
    inputUsdPer1M: 0.8,
    outputUsdPer1M: 4,
    capabilities: ['CHAT', 'STREAMING', 'TOOLS'],
  },
  {
    providerId: 'ANTHROPIC',
    slug: 'anthropic/claude-3-opus',
    displayName: 'Claude 3 Opus',
    family: 'claude-3',
    contextLength: 200000,
    maxOutputTokens: 4096,
    inputUsdPer1M: 15,
    outputUsdPer1M: 75,
    capabilities: ['CHAT', 'STREAMING', 'IMAGE_INPUT'],
  },

  // Google
  {
    providerId: 'GOOGLE',
    slug: 'google/gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    family: 'gemini-2',
    contextLength: 1048576,
    maxOutputTokens: 8192,
    inputUsdPer1M: 0.1,
    outputUsdPer1M: 0.4,
    capabilities: ['CHAT', 'STREAMING', 'IMAGE_INPUT', 'TOOLS'],
    isFeatured: true,
  },
  {
    providerId: 'GOOGLE',
    slug: 'google/gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    family: 'gemini-1.5',
    contextLength: 2000000,
    maxOutputTokens: 8192,
    inputUsdPer1M: 1.25,
    outputUsdPer1M: 5,
    capabilities: ['CHAT', 'STREAMING', 'IMAGE_INPUT', 'TOOLS'],
  },

  // DeepSeek
  {
    providerId: 'DEEPSEEK',
    slug: 'deepseek/deepseek-chat',
    displayName: 'DeepSeek V3',
    family: 'deepseek-v3',
    contextLength: 64000,
    maxOutputTokens: 8000,
    inputUsdPer1M: 0.27,
    outputUsdPer1M: 1.1,
    capabilities: ['CHAT', 'STREAMING', 'FUNCTION_CALLING'],
    isFeatured: true,
  },
  {
    providerId: 'DEEPSEEK',
    slug: 'deepseek/deepseek-reasoner',
    displayName: 'DeepSeek R1 (reasoning)',
    family: 'deepseek-r1',
    contextLength: 64000,
    maxOutputTokens: 8000,
    inputUsdPer1M: 0.55,
    outputUsdPer1M: 2.19,
    capabilities: ['CHAT', 'STREAMING'],
    isFeatured: true,
  },

  // Mistral
  {
    providerId: 'MISTRAL',
    slug: 'mistral/mistral-large-latest',
    displayName: 'Mistral Large',
    family: 'mistral-large',
    contextLength: 128000,
    maxOutputTokens: 8192,
    inputUsdPer1M: 2,
    outputUsdPer1M: 6,
    capabilities: ['CHAT', 'STREAMING', 'TOOLS'],
  },
  {
    providerId: 'MISTRAL',
    slug: 'mistral/mistral-small-latest',
    displayName: 'Mistral Small',
    family: 'mistral-small',
    contextLength: 32000,
    maxOutputTokens: 8192,
    inputUsdPer1M: 0.2,
    outputUsdPer1M: 0.6,
    capabilities: ['CHAT', 'STREAMING'],
  },

  // xAI
  {
    providerId: 'XAI',
    slug: 'xai/grok-2',
    displayName: 'Grok-2',
    family: 'grok',
    contextLength: 131072,
    maxOutputTokens: 8192,
    inputUsdPer1M: 2,
    outputUsdPer1M: 10,
    capabilities: ['CHAT', 'STREAMING', 'TOOLS'],
  },
  {
    providerId: 'XAI',
    slug: 'xai/grok-2-vision',
    displayName: 'Grok-2 Vision',
    family: 'grok',
    contextLength: 32768,
    maxOutputTokens: 8192,
    inputUsdPer1M: 2,
    outputUsdPer1M: 10,
    capabilities: ['CHAT', 'STREAMING', 'IMAGE_INPUT'],
  },

  // Qwen
  {
    providerId: 'QWEN',
    slug: 'qwen/qwen-max',
    displayName: 'Qwen Max',
    family: 'qwen',
    contextLength: 32000,
    maxOutputTokens: 8192,
    inputUsdPer1M: 1.6,
    outputUsdPer1M: 6.4,
    capabilities: ['CHAT', 'STREAMING'],
  },
  {
    providerId: 'QWEN',
    slug: 'qwen/qwen-plus',
    displayName: 'Qwen Plus',
    family: 'qwen',
    contextLength: 131072,
    maxOutputTokens: 8192,
    inputUsdPer1M: 0.4,
    outputUsdPer1M: 1.2,
    capabilities: ['CHAT', 'STREAMING'],
  },
];

async function main() {
  console.log('Seeding providers...');
  for (const p of PROVIDERS) {
    await prisma.provider.upsert({
      where: { id: p.id },
      update: { displayName: p.displayName, baseUrl: p.baseUrl },
      create: { id: p.id, displayName: p.displayName, baseUrl: p.baseUrl },
    });
  }

  console.log('Seeding models...');
  for (const m of MODELS) {
    await prisma.model.upsert({
      where: { slug: m.slug },
      update: {
        displayName: m.displayName,
        family: m.family,
        contextLength: m.contextLength,
        maxOutputTokens: m.maxOutputTokens,
        inputUsdPer1M: m.inputUsdPer1M,
        outputUsdPer1M: m.outputUsdPer1M,
        capabilities: m.capabilities,
        isFeatured: m.isFeatured ?? false,
        fallbackSlug: m.fallbackSlug,
        description: m.description,
      },
      create: {
        providerId: m.providerId,
        slug: m.slug,
        displayName: m.displayName,
        family: m.family,
        contextLength: m.contextLength,
        maxOutputTokens: m.maxOutputTokens,
        inputUsdPer1M: m.inputUsdPer1M,
        outputUsdPer1M: m.outputUsdPer1M,
        capabilities: m.capabilities,
        isFeatured: m.isFeatured ?? false,
        fallbackSlug: m.fallbackSlug,
        description: m.description,
      },
    });
  }

  console.log('Seeding default settings...');
  await prisma.setting.upsert({
    where: { key: 'cost_protection' },
    update: {},
    create: {
      key: 'cost_protection',
      value: {
        defaultDailyUsdLimit: 20,
        defaultMonthlyUsdLimit: 200,
        defaultPerRequestMaxTokens: 8000,
        hardBalanceCutoffUsd: 0,
        softBalanceAlertUsd: 1,
        profitabilityMarginPercent: 20,
      },
    },
  });

  console.log('Seeding admin user (if missing)...');
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const exists = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!exists) {
    const tempPassword = randomBytes(16).toString('hex');
    const passwordHash = createHash('sha256').update(tempPassword).digest('hex');
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        emailVerifiedAt: new Date(),
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        displayName: 'Admin',
        balance: { create: { balanceUsd: 0 } },
      },
    });
    console.log(`  Created admin: ${adminEmail} / ${tempPassword} (CHANGE IMMEDIATELY)`);
  }

  console.log('Seeding example blog post...');
  await prisma.blogPost.upsert({
    where: { slug: 'welcome' },
    update: {},
    create: {
      slug: 'welcome',
      title: 'Welcome to AI Aggregator',
      excerpt: 'One API. Every model. Built for scale.',
      content: '# Welcome\n\nAccess GPT-4, Claude, Gemini, DeepSeek and more through one API.',
      tags: ['announcement'],
      published: true,
      publishedAt: new Date(),
    },
  });

  console.log('Seeding assistants (preset templates)...');
  for (const a of ASSISTANTS) {
    await prisma.assistant.upsert({
      where: { slug: a.slug },
      update: {
        name: a.name,
        emoji: a.emoji,
        category: a.category,
        description: a.description,
        systemPrompt: a.systemPrompt,
        recommendedModel: a.recommendedModel,
        isFeatured: a.isFeatured ?? false,
      },
      create: a,
    });
  }

  console.log('Seeding promo coupons...');
  for (const c of COUPONS) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {
        type: c.type,
        amountUsd: c.amountUsd,
        bonusPercent: c.bonusPercent,
        freeTokens: c.freeTokens,
        maxRedemptions: c.maxRedemptions,
        perUserLimit: c.perUserLimit,
        validFrom: c.validFrom,
        validUntil: c.validUntil,
        isActive: c.isActive,
        description: c.description,
      },
      create: c,
    });
  }

  console.log('Seeding free-tier (Grom) settings...');
  await prisma.setting.upsert({
    where: { key: 'free_tier_grom' },
    update: {},
    create: {
      key: 'free_tier_grom',
      value: {
        enabled: true,
        monthlyTokens: 50000,
        modelSlug: 'deepseek/deepseek-chat',
        fallbackSlug: 'openai/gpt-4o-mini',
        description: 'Free monthly token allowance routed to the cheapest available model.',
      },
    },
  });

  await prisma.setting.upsert({
    where: { key: 'referral_program' },
    update: {},
    create: {
      key: 'referral_program',
      value: {
        enabled: true,
        referrerBonusUsd: 1.0,
        referredBonusUsd: 0.5,
        triggerOnFirstDeposit: true,
        triggerOnSignup: false,
      },
    },
  });

  console.log('Seed complete.');
}

type AssistantSeed = {
  slug: string;
  name: string;
  emoji?: string;
  category: string;
  description: string;
  systemPrompt: string;
  recommendedModel?: string;
  isFeatured?: boolean;
};

const ASSISTANTS: AssistantSeed[] = [
  {
    slug: 'marketer',
    name: 'Маркетолог',
    emoji: '📈',
    category: 'marketing',
    description: 'Заголовки, лендинги, рассылки, рекламные посты, SMM-планы.',
    systemPrompt:
      'Ты — опытный маркетолог. Пиши конкретно, с УТП и call-to-action. Структурируй: проблема → решение → выгода → CTA. Учитывай ЦА из брифа, избегай воды и канцелярита.',
    recommendedModel: 'openai/gpt-4o-mini',
    isFeatured: true,
  },
  {
    slug: 'gramotey',
    name: 'Грамотей',
    emoji: '📝',
    category: 'writing',
    description: 'Проверка грамматики, стилистики, перевод и улучшение текста.',
    systemPrompt:
      'Ты — редактор-корректор. Найди и исправь ошибки (орфография, пунктуация, согласования). Сохрани смысл и стиль автора. Если просят переписать — улучшай связность и ритм.',
    recommendedModel: 'openai/gpt-4o-mini',
    isFeatured: true,
  },
  {
    slug: 'resume-helper',
    name: 'Резюме-помощник',
    emoji: '📄',
    category: 'business',
    description: 'Готовое резюме под вакансию, сопроводительное письмо, тренировка собеседования.',
    systemPrompt:
      'Ты — карьерный консультант. Структурируй опыт под нужную вакансию: ключевые навыки, метрики и достижения сверху. Избегай шаблонных фраз. Используй STAR-формат для опыта.',
    recommendedModel: 'anthropic/claude-3-5-sonnet',
    isFeatured: true,
  },
  {
    slug: 'smm',
    name: 'SMM-ассистент',
    emoji: '📱',
    category: 'marketing',
    description: 'Контент-планы, сторис, тексты постов под Telegram, VK, Instagram*.',
    systemPrompt:
      'Ты — SMM-специалист. Делай посты с зацепкой в первой строке, эмодзи в меру, чёткой структурой и хэштегами. Адаптируй tone of voice под платформу и аудиторию.',
    recommendedModel: 'openai/gpt-4o-mini',
  },
  {
    slug: 'poet',
    name: 'Поэт',
    emoji: '🎭',
    category: 'creative',
    description: 'Стихи, песни, рифмы под повод — ко дню рождения, свадьбе, корпоративу.',
    systemPrompt:
      'Ты — поэт. Соблюдай размер и рифму. Уточни повод, имя адресата и желаемое настроение. Если просят песню — давай куплет/припев/мост.',
    recommendedModel: 'anthropic/claude-3-5-sonnet',
  },
  {
    slug: 'screenwriter',
    name: 'Сценарист',
    emoji: '🎬',
    category: 'creative',
    description: 'Сценарии для Reels/Shorts, рекламных видео, презентаций.',
    systemPrompt:
      'Ты — сценарист коротких видео. Структурируй: hook (3 сек) → конфликт → решение → CTA. Реплики короткие, разговорные, под камеру.',
    recommendedModel: 'openai/gpt-4o-mini',
  },
  {
    slug: 'prompt-engineer',
    name: 'Промпт-инженер',
    emoji: '🧪',
    category: 'creative',
    description: 'Помогает писать качественные промпты для LLM, Midjourney, видео-моделей.',
    systemPrompt:
      'Ты — prompt-engineer. Сначала уточни задачу: модель (LLM/image/video), цель, стиль, ограничения. Потом выдай промпт + альтернативы. Для image — добавь параметры (lighting, camera, mood).',
    recommendedModel: 'anthropic/claude-3-5-sonnet',
  },
  {
    slug: 'image-prompt',
    name: 'Image-prompt мастер',
    emoji: '🎨',
    category: 'creative',
    description: 'Готовые промпты для Midjourney, DALL·E, Stable Diffusion, Flux.',
    systemPrompt:
      'Ты — эксперт по prompt-инжинирингу для image-моделей. На вход — описание сцены. На выход — детальный промпт с композицией, освещением, стилем, lens, color palette. Дай 3 варианта разной направленности.',
    recommendedModel: 'openai/gpt-4o-mini',
  },
  {
    slug: 'code-reviewer',
    name: 'Code Reviewer',
    emoji: '🛠️',
    category: 'code',
    description: 'Ревью кода: баги, читаемость, безопасность, производительность.',
    systemPrompt:
      'Ты — senior-инженер. Делай ревью построчно: баги, race conditions, утечки, security (SQLi/XSS/CSRF), типизация, читаемость. Объясни почему, дай конкретный исправленный фрагмент.',
    recommendedModel: 'anthropic/claude-3-5-sonnet',
    isFeatured: true,
  },
  {
    slug: 'sql-expert',
    name: 'SQL-эксперт',
    emoji: '🗄️',
    category: 'code',
    description: 'Помогает с SQL-запросами, оптимизацией, миграциями.',
    systemPrompt:
      'Ты — SQL-эксперт (PostgreSQL по умолчанию, уточняй движок). Пиши читаемые запросы, объясняй JOIN-ы и индексы. Указывай EXPLAIN-проблемы и план оптимизации.',
    recommendedModel: 'deepseek/deepseek-chat',
  },
  {
    slug: 'devops-helper',
    name: 'DevOps-помощник',
    emoji: '⚙️',
    category: 'code',
    description: 'Dockerfile, docker-compose, CI/CD, Nginx-конфиги, k8s-манифесты.',
    systemPrompt:
      'Ты — DevOps-инженер. Давай минимальные рабочие конфиги с пояснениями (что и зачем). Следи за безопасностью: non-root user, минимальный image, secrets через env, healthcheck.',
    recommendedModel: 'deepseek/deepseek-chat',
  },
  {
    slug: 'doctor-ai',
    name: 'Доктор-AI',
    emoji: '🩺',
    category: 'personal',
    description: 'Объясняет медицинские термины, расшифровывает анализы (без диагноза).',
    systemPrompt:
      'Ты — медицинский справочник. Объясняй термины простым языком, описывай возможные причины симптомов. ВАЖНО: всегда добавляй disclaimer, что это не замена очной консультации врача, и при тревожных симптомах рекомендуй обратиться к специалисту.',
    recommendedModel: 'anthropic/claude-3-5-sonnet',
  },
  {
    slug: 'english-teacher',
    name: 'Учитель английского',
    emoji: '🇬🇧',
    category: 'education',
    description: 'Грамматика, лексика, разговорная практика, проверка эссе по IELTS/TOEFL.',
    systemPrompt:
      'Ты — преподаватель английского. Уровень ученика уточни (A1–C2). Объясняй на русском, примеры — на английском. Исправляй ошибки с пометкой типа (grammar/vocab/style). Для эссе — давай оценку по бэндам.',
    recommendedModel: 'openai/gpt-4o-mini',
  },
  {
    slug: 'email-copywriter',
    name: 'Email-копирайтер',
    emoji: '✉️',
    category: 'business',
    description: 'Холодные письма, follow-up, рассылки, ответы клиентам.',
    systemPrompt:
      'Ты — email-копирайтер. Пиши коротко: цепляющая тема (≤50 знаков), персонализация, ценность для адресата, явный CTA. Без водянистых вводных и канцелярита.',
    recommendedModel: 'openai/gpt-4o-mini',
  },
  {
    slug: 'lawyer-helper',
    name: 'Юрист-помощник',
    emoji: '⚖️',
    category: 'business',
    description: 'Объяснение договоров, генерация шаблонов (NDA, оферта, ИП-договор).',
    systemPrompt:
      'Ты — юридический ассистент. Объясняй простыми словами риски пунктов. Генерируй шаблоны (NDA, оферта, договор подряда) с подсказками что подставить. ВАЖНО: добавляй disclaimer, что это не замена квалифицированной юридической консультации.',
    recommendedModel: 'anthropic/claude-3-5-sonnet',
  },
  {
    slug: 'business-plan',
    name: 'Бизнес-план',
    emoji: '📊',
    category: 'business',
    description: 'Помогает составить бизнес-план: модель, юнит-экономика, P&L, риски.',
    systemPrompt:
      'Ты — бизнес-консультант. Структурируй: проблема → решение → ЦА → бизнес-модель → юнит-экономика (CAC/LTV/маржа) → каналы → конкуренты → риски → роадмап.',
    recommendedModel: 'anthropic/claude-3-5-sonnet',
  },
  {
    slug: 'tutor-math',
    name: 'Репетитор по математике',
    emoji: '🧮',
    category: 'education',
    description: 'Объясняет задачи школьной и университетской математики пошагово.',
    systemPrompt:
      'Ты — терпеливый репетитор. Решай задачи пошагово, поясняй каждый переход. Сначала спроси, до какого шага дошёл ученик. Используй TeX-нотацию через $...$.',
    recommendedModel: 'deepseek/deepseek-chat',
  },
  {
    slug: 'translator',
    name: 'Переводчик',
    emoji: '🌍',
    category: 'writing',
    description: 'Перевод RU↔EN/DE/FR/ES/ZH с сохранением стиля.',
    systemPrompt:
      'Ты — профессиональный переводчик. Сохраняй стиль и регистр (формальный/разговорный). Имена и термины оставляй корректно. Если есть двусмысленность — давай альтернативу в скобках.',
    recommendedModel: 'openai/gpt-4o-mini',
  },
];

type CouponSeed = {
  code: string;
  type: CouponType;
  amountUsd: number | null;
  bonusPercent: number | null;
  freeTokens: number | null;
  maxRedemptions: number | null;
  perUserLimit: number;
  validFrom: Date;
  validUntil: Date | null;
  isActive: boolean;
  description: string | null;
};

const COUPONS: CouponSeed[] = [
  {
    code: 'WELCOME50',
    type: CouponType.FIXED_BONUS,
    amountUsd: 0.5,
    bonusPercent: null,
    freeTokens: null,
    maxRedemptions: null,
    perUserLimit: 1,
    validFrom: new Date(),
    validUntil: null,
    isActive: true,
    description: 'Welcome bonus ₽50 (~$0.5) on email-verified signup.',
  },
  {
    code: 'MAY100',
    type: CouponType.DEPOSIT_BONUS,
    amountUsd: null,
    bonusPercent: 100,
    freeTokens: null,
    maxRedemptions: 5000,
    perUserLimit: 1,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    isActive: true,
    description: '+100% to next deposit, valid 60 days.',
  },
];

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
