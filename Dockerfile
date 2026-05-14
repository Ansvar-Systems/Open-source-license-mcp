# Open Source License MCP Server
# Multi-stage build — bakes pre-built /app/data/database.db into the image.
#
# DATABASE PROVISIONING:
# `data/database.db` is gitignored. CI's `Provision database` step in
# `.github/workflows/ghcr-build.yml` greps `COPY\s+\K(data/\S+\.db)` from
# this Dockerfile to find DB filenames it must download from the GitHub
# Release before the docker build runs. The explicit
# `COPY data/database.db data/database.db` reference is required for that
# regex to match — a directory-form `COPY data/` would be skipped.
#
# Runtime uses @ansvar/mcp-sqlite (WASM, no native modules), so the
# production stage does not need python3/make/g++. The builder stage
# rebuilds better-sqlite3 only because it is referenced by transitive
# devDeps; with --ignore-scripts + --omit=dev the production stage stays
# binding-free.

# --- Stage 1: Build TypeScript ---
FROM node:24-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY src/ ./src/
COPY scripts/ ./scripts/
COPY tsconfig.json ./
# tsconfig.json includes both `src` and `scripts`; with both present tsc
# emits to `dist/src/...` and `dist/scripts/...`. Drop `scripts/` and tsc
# falls back to a flat `dist/<file>.js` layout that breaks the CMD path.
RUN npx tsc

# --- Stage 2: Production ---
FROM node:24-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV OSS_LICENSE_DB_PATH=/app/data/database.db

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Bake the pre-built database into the image so /app/data/database.db
# resolves at runtime without a bind mount. CI's ghcr-build.yml downloads
# database.db.gz from the GitHub Release and gunzips to data/database.db
# before this COPY runs. The explicit `data/database.db` form is required
# for the workflow's `COPY\s+\K(data/\S+\.db)` regex to match.
COPY data/database.db data/database.db

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 \
 && chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + process.env.PORT + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/src/http-server.js"]
