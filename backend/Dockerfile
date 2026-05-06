# Stage: build
FROM node:24.14.1-bookworm-slim@sha256:b506e7321f176aae77317f99d67a24b272c1f09f1d10f1761f2773447d8da26c AS builder

WORKDIR /app
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

RUN npm run build

# Prepare writable runtime data dir for distroless nonroot user (uid/gid 65532)
RUN mkdir -p /runtime-data && chown -R 65532:65532 /runtime-data

# Stage: prod dependencies only
FROM node:24.14.1-bookworm-slim@sha256:b506e7321f176aae77317f99d67a24b272c1f09f1d10f1761f2773447d8da26c AS prod-deps

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Stage: prod
FROM gcr.io/distroless/nodejs24-debian13@sha256:482fabdb0f0353417ab878532bb3bf45df925e3741c285a68038fb138b714cba

LABEL org.opencontainers.image.description="Backend API for Ring Intercom Control, providing authentication, Ring integration, unlock auditing, and guest links."

WORKDIR /app

COPY --from=builder --chown=65532:65532 /app/package.json ./
COPY --from=prod-deps --chown=65532:65532 /app/node_modules ./node_modules
COPY --from=builder --chown=65532:65532 /app/dist ./dist
# /data should be mounted as a persistent volume so DB_PATH data survives container recreation.
COPY --from=builder --chown=65532:65532 /runtime-data /data

ENV DB_PATH=/data/data.db

EXPOSE 3001
USER nonroot

CMD ["dist/index.js"]
