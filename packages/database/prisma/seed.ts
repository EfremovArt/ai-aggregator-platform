import { PrismaClient, ProviderId, ModelCapability, UserRole, UserStatus } from '@prisma/client';
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

  console.log('Seed complete.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
