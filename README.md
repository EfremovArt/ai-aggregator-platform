# AI Aggregator Platform

Production-ready monorepo for an OpenAI/OpenRouter/GPTunnel-style AI aggregator.
One API key, many providers (OpenAI, Anthropic, Google, DeepSeek, Mistral, xAI, Qwen),
five payment processors (Stripe, CryptoCloud, Telegram Stars, YooMoney, SBP), full
anti-abuse + cost-protection stack, admin panel, landing & blog.

> Status: **scaffold complete, ready for API-key plug-in & deployment.**
> Plug your real provider keys + payment credentials into `.env`, run migrations and
> `docker compose up`, point your domain at the box, and you're live.

---

## What's inside

```
ai-aggregator-platform/
├── apps/
│   ├── api/           # NestJS API + AI gateway + billing + admin
│   └── web/           # Next.js 15 (App Router) – landing, dashboard, chat, admin
├── packages/
│   ├── database/      # Prisma schema + migrations + seed
│   └── shared/        # Shared TypeScript types/zod schemas
├── infra/
│   ├── docker/        # Production Dockerfiles (api + web)
│   └── nginx/         # Production nginx reverse proxy + rate limits
├── .github/workflows/ # CI: typecheck, build, docker
├── docker-compose.yml # Full stack: postgres + redis + api + web + nginx
└── .env.example       # All env vars needed
```

### Stack

| Layer        | Tech                                                          |
| ------------ | ------------------------------------------------------------- |
| Frontend     | Next.js 15, React 19, TypeScript, TailwindCSS, Framer Motion, shadcn/ui style |
| Backend      | NestJS 10, TypeScript                                         |
| Database     | PostgreSQL 16 + Prisma 5                                      |
| Cache/Queue  | Redis 7 + BullMQ                                              |
| Payments     | Stripe · CryptoCloud · Telegram Stars · YooMoney · СБП        |
| AI providers | OpenAI · Anthropic · Google · DeepSeek · Mistral · xAI · Qwen |
| Anti-abuse   | Cloudflare Turnstile · IPQS · disposable-email · sliding-window rate limits · risk scoring |
| Infra        | Docker · docker-compose · nginx · GitHub Actions              |

---

## Quick start (local development)

```bash
# 1. Install deps
corepack enable
pnpm install

# 2. Copy env and edit
cp .env.example .env
# (Edit .env — at minimum DATABASE_URL, REDIS_URL, JWT_SECRET, NEXT_PUBLIC_*)

# 3. Boot Postgres + Redis (you can use the compose file too)
docker compose up -d postgres redis

# 4. Generate Prisma client + run migrations + seed providers/models
pnpm db:generate
pnpm db:migrate     # creates initial migration
pnpm db:seed        # seeds providers, models, default admin user

# 5. Run dev servers
pnpm dev            # runs api on :4000 and web on :3000 in parallel
```

Open http://localhost:3000.

### Default seeded admin

- email: value of `SEED_ADMIN_EMAIL` (default `admin@example.com`)
- password: value of `SEED_ADMIN_PASSWORD` — see `.env.example`

---

## Production: docker compose

```bash
cp .env.example .env
# Fill in EVERY relevant value (provider keys, payment creds, domain URLs, secrets)

docker compose build
docker compose up -d
```

Nginx listens on `:80`. Put Cloudflare in front of it (DNS A-record → your box,
proxy enabled), and Cloudflare will terminate TLS + provide WAF/bot protection.

To enable HTTPS termination on nginx itself (without Cloudflare), drop your certs in
`infra/nginx/certs/` and uncomment the `listen 443 ssl` block in
`infra/nginx/conf.d/default.conf`.

After first start, run migrations + seed inside the api container:

```bash
docker compose exec api pnpm --filter @ai-platform/database migrate:deploy
docker compose exec api pnpm --filter @ai-platform/database seed
```

---

## What you need to plug in (`.env`)

Almost every external integration is opt-in: services start gracefully when keys
are missing and the corresponding feature is just disabled (or returns a clean
error). To go live, fill in:

### LLM providers (any subset works)
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GEMINI_API_KEY`
- `DEEPSEEK_API_KEY`
- `MISTRAL_API_KEY`
- `XAI_API_KEY` (Grok)
- `QWEN_API_KEY` (DashScope or compatible)

### Payments (any subset works)
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- CryptoCloud: `CRYPTOCLOUD_API_KEY`, `CRYPTOCLOUD_WEBHOOK_SECRET`, `CRYPTOCLOUD_SHOP_ID`
- Telegram Stars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
- YooMoney/Касса: `YOOMONEY_SHOP_ID`, `YOOMONEY_SECRET_KEY`
- СБП: `SBP_API_BASE`, `SBP_API_KEY`, `SBP_WEBHOOK_SECRET`, `SBP_MERCHANT_ID`

### OAuth (optional)
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- GitHub: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- Telegram: `TELEGRAM_BOT_TOKEN` (also used as the login bot)

### Anti-abuse
- `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` (Cloudflare Turnstile)
- `IPQS_API_KEY` (IPQualityScore — VPN/Tor/proxy detection)

### Domain / cookies
- `APP_URL=https://your-domain.com`
- `API_URL=https://your-domain.com` (or a separate api subdomain)
- `COOKIE_DOMAIN=your-domain.com`

### Secrets
- `JWT_SECRET` (random 64+ chars)
- `JWT_REFRESH_SECRET` (random 64+ chars, distinct from `JWT_SECRET`)
- `ENCRYPTION_KEY` (32-byte hex for at-rest encryption of provider keys)

The full list is in [`.env.example`](./.env.example).

---

## Architecture highlights

### AI gateway (`apps/api/src/modules/ai-gateway`)
- OpenAI-compatible endpoint: `POST /api/v1/chat/completions`
- Streaming SSE, function calling, embeddings, image generation, moderation.
- Provider adapters in `providers/`: each implements the `IAiProvider` interface.
- **Smart routing** + latency/error-rate scoring + automatic fallback to alternate
  models in the same family (`provider-registry.service.ts`, `model-router.service.ts`).
- **Cost protection** (`cost-protection.service.ts`):
  hard balance cutoff, daily/monthly USD limits, per-request token caps,
  worst-case cost estimation _before_ the request.
- **Semantic cache** for repeated prompts (Redis, configurable TTL).

### Anti-abuse (`apps/api/src/modules/anti-abuse`)
- Sliding-window + token-bucket rate limits via Redis Lua scripts.
- IP reputation (IPQS), disposable-email blocklist, fingerprint dedup.
- Risk score 0–100 → block / challenge / allow.
- Cloudflare Turnstile verification on signup/login.
- Behavioural velocity checks (signups per IP/fingerprint, multi-account).

### Billing (`apps/api/src/modules/billing`)
- Atomic ledger (`Ledger`, `Balance`, `Transaction`) — append-only, single
  source of truth for all balance changes.
- Webhook controller with raw-body middleware → HMAC verification per provider →
  replay protection (`webhookEventIds`).
- Refund logic + invoice generation (PDF-ready).

### Auth (`apps/api/src/modules/auth`)
- email/password (argon2id), Google OAuth, GitHub OAuth, Telegram Login.
- Short-lived access JWT + rotating refresh tokens (`token.service.ts`).
- Email verification + password reset flows.

### Admin (`apps/api/src/modules/admin`)
- Users / bans / fraud feed / moderation queue / analytics / provider health.
- Role-guarded with `@Roles('ADMIN')`.

### Frontend (`apps/web`)
- App Router, SSR by default, dark cyber theme.
- Landing with hero, models, pricing, API showcase, business, FAQ, reviews, CTA.
- Dashboard: balance, history, API keys, models, limits, billing.
- Chat with SSE streaming.
- Admin panel.
- SEO: sitemap.xml, robots.txt, JSON-LD `SoftwareApplication`, OpenGraph.

---

## Security checklist

- [x] CSP / HSTS / X-Frame-Options / Referrer-Policy via `helmet` + Next.js headers.
- [x] CSRF via SameSite cookies + double-submit token where applicable.
- [x] SQLi protected by Prisma (parameterised queries everywhere).
- [x] XSS — React + sanitised markdown only.
- [x] Refresh-token rotation with parent tracking → reuse detection.
- [x] API keys hashed at rest (argon2 / SHA-256 — see `api-keys.service.ts`).
- [x] Provider secrets encrypted with `ENCRYPTION_KEY`.
- [x] Constant-time signature comparison for webhooks.
- [x] Rate limits at nginx + Redis layers.
- [x] Cloudflare proxy expected in front (real-IP via `X-Forwarded-For`).

---

## CI

GitHub Actions (`.github/workflows/ci.yml`):
- Lint + typecheck (api & web)
- Build (api & web, Prisma generate)
- Build Docker images (api & web)

---

## Roadmap

See repo issues. Short list:
- BullMQ workers for heavy background jobs (PDF invoices, IP reputation prefetch).
- Per-org / team accounts (RBAC scaffold is already in DB).
- Dynamic pricing experiments (margin auto-tuning).
- More providers (Cohere, Together, Fireworks, Replicate).

---

## License

Proprietary. All rights reserved (see [`LICENSE`](./LICENSE) once added).

The phrase “AI Aggregator” here is just a working title; rebrand freely.

---

## Support

Open a GitHub issue. For commercial / SLA enquiries, contact the repo owner.
