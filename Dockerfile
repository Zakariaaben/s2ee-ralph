FROM oven/bun:1.3.5 AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
COPY package.json bun.lock turbo.json tsconfig.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/env/package.json packages/env/package.json
COPY packages/rpc/package.json packages/rpc/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN bun install --frozen-lockfile --ignore-scripts

FROM deps AS builder
ENV NODE_ENV=production
COPY . .
RUN bun run build

FROM base AS runner
ENV HOST=0.0.0.0
ENV PORT=3001

COPY --from=builder /app/package.json /app/bun.lock /app/turbo.json /app/tsconfig.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server.mjs ./server.mjs
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=builder /app/apps/web/dist ./apps/web/dist
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/packages ./packages

EXPOSE 3001
CMD ["bun", "server.mjs"]
