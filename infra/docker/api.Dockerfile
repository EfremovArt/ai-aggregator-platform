### Stage 1: deps + build
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /repo

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile=false

COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY apps/api ./apps/api

# Generate Prisma client and compile
RUN pnpm --filter @ai-platform/database exec prisma generate
RUN pnpm --filter @ai-platform/shared build || true
RUN pnpm --filter @ai-platform/api build

# Prune dev deps for runtime
RUN pnpm --filter @ai-platform/api deploy --prod /app


### Stage 2: runtime
FROM node:20-alpine AS runtime
RUN apk add --no-cache curl tini openssl
WORKDIR /app

ENV NODE_ENV=production
COPY --from=builder /app .
COPY --from=builder /repo/packages/database/prisma ./node_modules/@ai-platform/database/prisma

EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
