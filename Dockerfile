### Terminal Dreams — production image
#
# Two-stage build:
#   1. builder  — installs deps, runs `next build` (Turbopack).
#   2. runtime  — node:22-alpine with prod node_modules + .next.
#
# We do NOT use Next's `output: standalone` here; we install only prod deps
# in stage 2 and copy the build artefacts. Image lands ~350MB which is fine
# for a single-host swarm deployment.

ARG NODE_VERSION=22-alpine

# ---------- builder ----------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

# libc6-compat covers a few native deps Alpine doesn't ship by default.
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build && npm prune --omit=dev

# ---------- runtime ----------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# node:alpine ships a `node` user (uid 1000). Avoid running as root.
USER node

COPY --chown=node:node --from=builder /app/package.json  ./package.json
COPY --chown=node:node --from=builder /app/node_modules  ./node_modules
COPY --chown=node:node --from=builder /app/.next         ./.next
COPY --chown=node:node --from=builder /app/public        ./public
COPY --chown=node:node --from=builder /app/content       ./content
COPY --chown=node:node --from=builder /app/next.config.ts ./next.config.ts
COPY --chown=node:node --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 3000

CMD ["./node_modules/.bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
