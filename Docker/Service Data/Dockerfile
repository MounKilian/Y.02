# =============================================================================
# Dockerfile — Service Data Node.js
# Prérequis : BuildKit activé (DOCKER_BUILDKIT=1 ou buildx)
#
# Même stack et mêmes règles de sécurité que le backend.
# Ce service collecte les endpoints OpenData et persiste les indices
# calculés dans Citus. Les credentials PostgreSQL sont injectés
# exclusivement via Docker Compose secrets au runtime (/run/secrets/).
# =============================================================================

# syntax=docker/dockerfile:1.6

# ── Phase 1 : build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build


# ── Phase 2 : image de production ────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./

RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
