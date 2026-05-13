import { z } from 'zod';

export const emailSchema = z.string().email().max(254);
export const passwordSchema = z
  .string()
  .min(8, 'min 8 characters')
  .max(128, 'max 128 characters')
  .regex(/[a-z]/, 'must contain a lowercase letter')
  .regex(/[A-Z]/, 'must contain an uppercase letter')
  .regex(/[0-9]/, 'must contain a digit');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().min(1).max(64).optional(),
  turnstileToken: z.string().min(1).optional(),
  fingerprint: z.string().max(256).optional(),
  marketingOptIn: z.boolean().optional(),
  referralCode: z.string().max(32).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  turnstileToken: z.string().min(1).optional(),
  fingerprint: z.string().max(256).optional(),
  totpCode: z.string().regex(/^\d{6}$/).optional(),
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
  turnstileToken: z.string().min(1).optional(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(64),
  scopes: z.array(z.string()).optional(),
  allowedModels: z.array(z.string()).optional(),
  monthlyUsdLimit: z.number().nonnegative().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const chatContentPartSchema = z.union([
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({
    type: z.literal('image_url'),
    image_url: z.object({
      url: z.string().min(1),
      detail: z.enum(['low', 'high', 'auto']).optional(),
    }),
  }),
]);

export const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  // Plain text is the common case. Arrays carry image parts for vision models.
  content: z.union([z.string(), z.array(chatContentPartSchema).min(1)]),
  name: z.string().optional(),
  toolCallId: z.string().optional(),
});

export const chatCompletionSchema = z.object({
  model: z.string().min(1).max(128),
  messages: z.array(chatMessageSchema).min(1).max(200),
  stream: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().positive().max(64000).optional(),
  stop: z.array(z.string()).max(8).optional(),
  user: z.string().max(64).optional(),
});

export const topupSchema = z.object({
  amountUsd: z.number().positive().min(1).max(10000),
  provider: z.enum(['STRIPE', 'CRYPTOCLOUD', 'TELEGRAM_STARS', 'YOOMONEY', 'SBP']),
  returnUrl: z.string().url().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChatCompletionInput = z.infer<typeof chatCompletionSchema>;
export type TopupInput = z.infer<typeof topupSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
