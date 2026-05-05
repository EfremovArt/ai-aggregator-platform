import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),
  CORS_ORIGINS: z.string().optional(),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.coerce.number().default(900),
  JWT_REFRESH_TTL: z.coerce.number().default(2_592_000),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  CSRF_SECRET: z.string().default('csrf-dev-secret'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),
  XAI_API_KEY: z.string().optional(),
  QWEN_API_KEY: z.string().optional(),
  QWEN_BASE_URL: z.string().optional(),

  TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  IPQUALITYSCORE_API_KEY: z.string().optional(),
  ABUSE_RISK_THRESHOLD: z.coerce.number().default(70),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  YOOMONEY_SHOP_ID: z.string().optional(),
  YOOMONEY_SECRET_KEY: z.string().optional(),
  YOOMONEY_WEBHOOK_SECRET: z.string().optional(),
  SBP_MERCHANT_ID: z.string().optional(),
  SBP_SECRET_KEY: z.string().optional(),
  TELEGRAM_STARS_BOT_TOKEN: z.string().optional(),
  CRYPTOCLOUD_API_KEY: z.string().optional(),
  CRYPTOCLOUD_SHOP_ID: z.string().optional(),
  CRYPTOCLOUD_WEBHOOK_SECRET: z.string().optional(),

  DEFAULT_DAILY_USD_LIMIT: z.coerce.number().default(20),
  DEFAULT_MONTHLY_USD_LIMIT: z.coerce.number().default(200),
  DEFAULT_PER_REQUEST_MAX_TOKENS: z.coerce.number().default(8000),
  HARD_BALANCE_CUTOFF_USD: z.coerce.number().default(0),
  SOFT_BALANCE_ALERT_USD: z.coerce.number().default(1),
  PROFITABILITY_MARGIN_PERCENT: z.coerce.number().default(20),

  TRUSTED_PROXIES: z.string().default('127.0.0.1,::1'),
});

export type EnvConfig = z.infer<typeof schema>;

export function configValidationSchema(env: Record<string, unknown>): EnvConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}
