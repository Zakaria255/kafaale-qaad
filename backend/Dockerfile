# ── BUILD STAGE ──
FROM node:20-alpine AS builder
WORKDIR /app

# Install system utilities needed for building node dependencies if any
RUN apk add --no-cache libc6-compat

# Copy package descriptors
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for tsc)
RUN npm ci

# Copy codebase and compile
COPY . .

RUN npm run db:generate
RUN npm run build

# Remove development dependencies to keep final layer slim
RUN npm prune --omit=dev

# ── RUNTIME STAGE ──
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Create secure system user and set correct ownership
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

# Copy essential runtime files with correct ownership
COPY --from=builder --chown=expressjs:nodejs /app/package*.json ./
COPY --from=builder --chown=expressjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=expressjs:nodejs /app/dist ./dist
COPY --from=builder --chown=expressjs:nodejs /app/prisma ./prisma

USER expressjs

EXPOSE 5000

# Sync schema (fails safe on destructive changes — no --accept-data-loss) then start
CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
