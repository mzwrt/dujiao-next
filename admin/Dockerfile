# syntax=docker/dockerfile:1

# ── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .

# Build-time configuration
ARG VITE_API_BASE_URL=""
ARG VITE_ADMIN_PATH=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_ADMIN_PATH=${VITE_ADMIN_PATH}
ENV NODE_OPTIONS=--max-old-space-size=4096

RUN npm run build

# ── Stage 2: Runtime (CIS / PCI-DSS hardened) ───────────────
FROM nginx:1.27-alpine

# CIS 4.1 - Remove default content and configs
RUN rm -rf /usr/share/nginx/html/* \
    && rm -f /etc/nginx/conf.d/default.conf

# CIS 4.2 / PCI-DSS 8.6 - Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup -s /sbin/nologin

# Copy hardened nginx config and built assets
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

# CIS 4.6 - Minimal file permissions
RUN chown -R appuser:appgroup /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html \
    && chown -R appuser:appgroup /var/cache/nginx /var/log/nginx \
    && touch /var/run/nginx.pid && chown appuser:appgroup /var/run/nginx.pid

# CIS 4.2 - Run as non-root user
USER appuser:appgroup

EXPOSE 8080

# CIS 6.1 - Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO /dev/null http://127.0.0.1:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
