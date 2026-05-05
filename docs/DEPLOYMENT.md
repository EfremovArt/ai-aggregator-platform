# Deployment guide

This document covers a single-node deployment behind Cloudflare. For multi-node
deployments use the same images with an external Postgres/Redis cluster.

## Prerequisites

- A Linux box (Ubuntu 22.04 LTS recommended), 4 vCPU / 8 GB RAM minimum for production.
- `docker` and `docker compose` installed.
- A domain pointed at the box via Cloudflare (orange-cloud / proxied).

## Steps

1. **Clone the repo on the server**
   ```bash
   git clone https://github.com/EfremovArt/ai-aggregator-platform.git
   cd ai-aggregator-platform
   ```

2. **Create `.env`** from `.env.example` and fill in:
   - `POSTGRES_*`, `DATABASE_URL`, `REDIS_URL`
   - `APP_URL`, `API_URL`, `COOKIE_DOMAIN`
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`
   - Provider keys you intend to use
   - Payment-provider credentials and webhook secrets
   - OAuth client IDs / secrets
   - Cloudflare Turnstile keys

3. **Build images and start the stack**
   ```bash
   docker compose build
   docker compose up -d
   ```

4. **Apply DB migrations + seed**
   ```bash
   docker compose exec api pnpm --filter @ai-platform/database migrate:deploy
   docker compose exec api pnpm --filter @ai-platform/database seed
   ```

5. **Configure Cloudflare**
   - DNS: A record `@` → server IP, proxy enabled (orange cloud).
   - SSL/TLS mode: **Full (strict)** (terminate at Cloudflare, re-encrypt to nginx).
   - WAF: enable managed rules + bot fight mode.
   - Page rules: cache `/_next/static/*` aggressively.
   - Optional: enable Cloudflare Turnstile and put the keys in `.env`.

6. **Verify**
   ```bash
   curl https://your-domain.com/health
   ```
   Open `https://your-domain.com` — landing should render. Try registering and
   topping up via Stripe test mode.

## Webhook URLs to configure on each payment provider

| Provider          | URL to register                                         |
| ----------------- | ------------------------------------------------------- |
| Stripe            | `https://your-domain.com/api/billing/webhooks/stripe`   |
| CryptoCloud       | `https://your-domain.com/api/billing/webhooks/cryptocloud` |
| Telegram Stars    | `https://your-domain.com/api/billing/webhooks/telegram` |
| YooMoney/YooKassa | `https://your-domain.com/api/billing/webhooks/yoomoney` |
| СБП               | `https://your-domain.com/api/billing/webhooks/sbp`      |

Each webhook signature is verified server-side using the corresponding secret.

## Backups

- **Postgres**: schedule `pg_dump` daily; retain 30 days off-box.
- **Redis**: persistence is on (AOF). For multi-node, replace with managed Redis.

## Logs / observability

- API ships JSON logs to stdout via pino. Aggregate with Loki / Datadog / CloudWatch.
- Nginx access/error logs in the nginx container.
- Audit trail of important actions in the `AuditLog` Prisma table.

## Scaling notes

- Stateless `api` and `web` containers — scale horizontally.
- Postgres: move to managed RDS / Cloud SQL when QPS justifies.
- Redis: separate instance for cache vs. rate-limit if hot.
- Add BullMQ workers (image build target ready) for heavy background jobs.
