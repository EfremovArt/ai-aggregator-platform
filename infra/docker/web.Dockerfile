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

# Produce a self-contained /app with prod deps for the web workspace. Without
# this, copying apps/web/node_modules from the workspace root carries pnpm
# symlinks whose .pnpm targets live outside apps/web and break in stage 2.
RUN pnpm --filter @ai-platform/web deploy --prod /app

# Next.js build output lives under apps/web/.next; copy it into the deployed app.
RUN cp -r /repo/apps/web/.next /app/.next && \
    cp -r /repo/apps/web/public /app/public


### Stage 2: runtime
FROM node:20-alpine AS runtime
RUN apk add --no-cache tini
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

COPY --from=builder /app .

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
