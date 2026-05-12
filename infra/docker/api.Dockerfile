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
# Compile @ai-platform/shared to JS first — the api consumes it as a CommonJS
# package at runtime, so the dist/ output is mandatory (do NOT swallow errors).
RUN pnpm --filter @ai-platform/shared build
RUN pnpm --filter @ai-platform/api build

# Prune dev deps for runtime
RUN pnpm --filter @ai-platform/api deploy --prod /app

# `pnpm deploy` creates a fresh /app without the `.prisma/client` artifacts
# produced by `prisma generate` above. Copy the generated client from the
# builder's pnpm store into the deployed app's pnpm store. Both stores key
# packages by the same content-addressed hash, so the source/destination
# directories under `.pnpm/@prisma+client@<hash>/node_modules/` line up.
RUN set -eux; \
    SRC=$(ls -d /repo/node_modules/.pnpm/@prisma+client@*/node_modules | head -1); \
    DST=$(ls -d /app/node_modules/.pnpm/@prisma+client@*/node_modules | head -1); \
    test -d "$SRC/.prisma"; \
    test -n "$DST"; \
    cp -r "$SRC/.prisma" "$DST/"


### Stage 2: runtime
FROM node:20-alpine AS runtime
RUN apk add --no-cache curl tini openssl
WORKDIR /app

ENV NODE_ENV=production
COPY --from=builder /app .
COPY --from=builder /repo/packages/database/prisma ./node_modules/@ai-platform/database/prisma

EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--"]
# Apply pending Prisma migrations on container start, then boot Nest.
# `migrate deploy` is idempotent and safe to run on every restart.
# Call the prisma CLI bundle directly (the auto-generated bin shim in
# node_modules/.../@ai-platform+database/.bin uses pnpm-store-relative
# `..` paths that don't resolve after `pnpm deploy` flattens the layout).
CMD ["sh", "-c", "set -e; PRISMA_CLI=$(ls node_modules/.pnpm/prisma@*/node_modules/prisma/build/index.js | head -1); node \"$PRISMA_CLI\" migrate deploy --schema=node_modules/@ai-platform/database/prisma/schema.prisma; exec node dist/main.js"]
