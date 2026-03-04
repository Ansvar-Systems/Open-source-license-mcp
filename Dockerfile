# Open Source License MCP Server
# Multi-stage build — build:db needs better-sqlite3 (native) via tsx

# Build stage
FROM node:24-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
# Rebuild better-sqlite3 native module (needed by build:db script via tsx)
RUN cd node_modules/better-sqlite3 && npm run build-release

COPY src/ ./src/
COPY tsconfig.json ./
RUN npx tsc

# Build database from seed data
COPY scripts/ ./scripts/
COPY data/seed/ ./data/seed/
RUN npm run build:db

# Production stage — runtime uses @ansvar/mcp-sqlite (WASM, no native modules)
FROM node:24-alpine AS production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data/database.db ./data/database.db

RUN chown -R nodejs:nodejs /app
USER nodejs

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + process.env.PORT + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/src/http-server.js"]
