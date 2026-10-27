# ── Build stage ───────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

RUN useradd --system --uid 1001 --create-home clientfinder

COPY --from=builder --chown=clientfinder:clientfinder /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=clientfinder:clientfinder /app/node_modules ./node_modules
COPY --from=builder --chown=clientfinder:clientfinder /app/.next ./.next
COPY --from=builder --chown=clientfinder:clientfinder /app/public ./public
COPY --from=builder --chown=clientfinder:clientfinder /app/next.config.ts ./
COPY --from=builder --chown=clientfinder:clientfinder /app/drizzle ./drizzle
COPY --from=builder --chown=clientfinder:clientfinder /app/scripts ./scripts

USER clientfinder
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Migrasi idempotent lalu jalankan server Node (bukan static export).
CMD ["sh", "-c", "node scripts/migrate.mjs && npm start"]
