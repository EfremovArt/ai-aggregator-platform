### Stage 1: deps + build
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /repo

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile=false

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN pnpm --filter @ai-platform/shared build
RUN pnpm --filter @ai-platform/web build


### Stage 2: runtime (standalone Next.js)
FROM node:20-alpine AS runtime
RUN apk add --no-cache tini
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# When using output: 'standalone' Next.js produces .next/standalone with everything bundled.
# We fall back to copying the whole app tree so this Dockerfile works either way.
COPY --from=builder /repo/apps/web/.next ./.next
COPY --from=builder /repo/apps/web/public ./public
COPY --from=builder /repo/apps/web/node_modules ./node_modules
COPY --from=builder /repo/apps/web/package.json ./

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npx", "next", "start", "-p", "3000"]
