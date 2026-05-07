# Architecture

High-level component diagram and data flow.

```
                              ┌────────────────┐
                              │   Cloudflare   │  TLS, WAF, bot mgmt, DDoS
                              └────────┬───────┘
                                       │
                                       ▼
                              ┌────────────────┐
                              │     nginx      │  rate limit, gzip, sticky to upstreams
                              └────┬─────┬─────┘
                                   │     │
                       ┌───────────┘     └────────────┐
                       ▼                              ▼
              ┌────────────────┐             ┌────────────────┐
              │  Next.js (web) │             │  NestJS (api)  │
              │  SSR, SEO,     │             │  AI gateway,   │
              │  dashboard     │             │  billing, anti │
              │                │             │  abuse, admin  │
              └─────┬─────┬────┘             └─┬─────┬────────┘
                    │     │                    │     │
                    │  ┌──┘                    │     │
                    │  ▼                       │     ▼
                    │  Telegram, Cloudflare   │   AI providers (OpenAI, Anthropic, …)
                    │  Turnstile, web vitals   │   Payment processors (Stripe, …)
                    │                          │
                    └────────┐    ┌────────────┘
                             ▼    ▼
                       ┌────────────────┐    ┌────────────────┐
                       │   PostgreSQL   │    │     Redis      │
                       │  (Prisma)      │    │  cache, queue, │
                       │                │    │  rate-limit    │
                       └────────────────┘    └────────────────┘
```

## AI Gateway request lifecycle

1. Client calls `POST /api/v1/chat/completions` with `Authorization: Bearer <api-key>`.
2. `ApiKeyAuthGuard` resolves the key (hashed lookup), loads the user.
3. `RateLimitGuard` (Redis Lua sliding window) enforces per-API-key + per-user RPM.
4. `ModelsService` maps the requested `model` slug to a Provider+Model row.
5. `CostProtectionService` computes worst-case USD cost (input tokens + max output tokens
   × provider price × margin), checks balance/daily/monthly/per-request caps.
6. `ModerationService` runs cheap keyword filter and (if enabled) OpenAI moderation.
7. `AiGatewayService` calls the provider via its adapter:
   - On success → records ledger entry (debit user, accrue provider cost), updates
     latency/error EMA on the provider.
   - On failure → tries fallback model, repeats. If all exhausted → 502 with
     `provider_unavailable`.
8. For streaming (`stream: true`), the controller proxies SSE events. Cost is recorded
   when the final usage frame arrives, atomically.

## Billing webhook

1. `POST /api/billing/webhooks/:provider` (raw body preserved by middleware).
2. Provider factory selects the right adapter.
3. Adapter validates signature in constant time + parses event.
4. `BillingService.finalizeTransaction` runs:
   - Loads tx by `externalId`.
   - Replay protection via `webhookEventIds[]` array.
   - Updates status; on `SUCCEEDED`, calls `LedgerService.credit(...)` which
     atomically writes a ledger row + bumps `Balance`.

## Anti-abuse pipeline (signup)

1. `AntiAbuseService.assessSignup({email, ip, fingerprint, ...})` runs:
   - IP banned? → block.
   - IP reputation (IPQS, cached 24h) → +risk for VPN/Tor/proxy.
   - Disposable email check → +risk.
   - Velocity (signups per IP/fingerprint last 24h) → +risk.
   - Cross-account fingerprint match → +risk.
2. If `score ≥ 80` → block.
3. If `score ≥ 50` → require Turnstile + email verification.
4. Recorded to `AbuseSignal` table for the admin fraud feed.

## Cost protection invariants

- Per-request worst-case cost = `(promptTokens + maxTokens) × pricePerToken × (1 + margin)`.
- Pre-flight rejects requests that would push balance below `HARD_BALANCE_CUTOFF_USD`.
- Daily / monthly aggregate is enforced per-user with the same formula on actual
  usage, recomputed from the ledger.
- All ledger writes are ACID (single Prisma transaction).
