# Stage: build
FROM node:20-bookworm-slim AS builder

WORKDIR /app
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

RUN npm run build

# Prepare writable runtime data dir for distroless nonroot user (uid/gid 65532)
RUN mkdir -p /runtime-data && chown -R 65532:65532 /runtime-data

# Stage: prod
FROM gcr.io/distroless/nodejs20-debian13

WORKDIR /app

COPY --from=builder --chown=65532:65532 /app/package.json ./
COPY --from=builder --chown=65532:65532 /app/node_modules ./node_modules
COPY --from=builder --chown=65532:65532 /app/dist ./dist
COPY --from=builder --chown=65532:65532 /runtime-data /data

ENV DB_PATH=/data/data.db

EXPOSE 3001
USER nonroot

CMD ["dist/index.js"]
