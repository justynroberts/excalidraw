# Sketchbench API: Claude backend, MCP bridge and scene storage.
FROM node:22-bookworm-slim

# Coolify's healthcheck execs curl inside the container.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY src ./src

# Storage volume: create it (owned by node) before dropping root, so a fresh
# named volume inherits the ownership instead of arriving root-owned.
RUN mkdir -p /data && chown node:node /data
VOLUME /data

ENV NODE_ENV=production \
    PORT=3016 \
    AI_SERVER_HOST=0.0.0.0 \
    DATA_DIR=/data

USER node
EXPOSE 3016
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD curl -fsS http://localhost:3016/health || exit 1

CMD ["node", "src/server.mjs"]
