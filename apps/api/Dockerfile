# ResponseGrid API — production image.
# Build context MUST be the repo root (pnpm monorepo):
#   docker build -f apps/api/Dockerfile -t responsegrid-api .
# The docker-compose in deploy/ already sets the context correctly.

# ── Builder ──────────────────────────────────────────────────────────────────
FROM node:22-slim AS builder
RUN corepack enable
WORKDIR /repo

# Copy the whole workspace (a root .dockerignore keeps it lean) and install.
COPY . .
RUN pnpm install --frozen-lockfile --filter=api... \
 && pnpm --filter=api build \
 && pnpm --filter=api deploy --prod --legacy /prod

# ── Runner ───────────────────────────────────────────────────────────────────
FROM node:22-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
# Self-contained prod bundle produced by `pnpm deploy` (no symlinks).
COPY --from=builder /prod/dist ./dist
COPY --from=builder /prod/node_modules ./node_modules
COPY --from=builder /prod/package.json ./package.json
EXPOSE 3000
CMD ["node", "dist/main"]
