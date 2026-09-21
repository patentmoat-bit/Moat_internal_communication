# syntax=docker/dockerfile:1.7
# Build: docker build -f apps/web/Dockerfile -t moat-web .   (context = repo root)

FROM node:24-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1

# --------------------------------------------------------------- installer --
FROM base AS deps
WORKDIR /build
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/ui/package.json packages/ui/
RUN --mount=type=cache,target=/root/.npm npm ci

# ----------------------------------------------------------------- builder --
FROM base AS builder
WORKDIR /build
COPY --from=deps /build/node_modules ./node_modules
COPY --from=deps /build/apps/web/node_modules ./apps/web/node_modules
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN npm run build --workspace @moat/web

# ----------------------------------------------------------------- runtime --
FROM base AS runtime
WORKDIR /app
RUN groupadd --system --gid 10001 moat \
    && useradd --system --uid 10001 --gid moat --no-create-home moat

# `output: standalone` emits only the files actually reached, so the runtime
# image carries neither the build toolchain nor the full node_modules tree.
COPY --from=builder --chown=root:root /build/apps/web/.next/standalone ./
COPY --from=builder --chown=root:root /build/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=root:root /build/apps/web/public ./apps/web/public

USER 10001:10001
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
