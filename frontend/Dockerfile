# Stage: build
FROM node:24.14.1-bookworm-slim@sha256:b506e7321f176aae77317f99d67a24b272c1f09f1d10f1761f2773447d8da26c AS builder

WORKDIR /app
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build static assets
RUN npm run build

# Stage: prod
FROM gcr.io/distroless/nodejs24-debian13@sha256:482fabdb0f0353417ab878532bb3bf45df925e3741c285a68038fb138b714cba

LABEL org.opencontainers.image.description="Frontend web app for Ring Intercom Control."

WORKDIR /app

COPY --from=builder --chown=65532:65532 /app/dist ./dist
COPY --chown=65532:65532 server.mjs ./server.mjs

ENV NODE_ENV=production
ENV PORT=5173

EXPOSE 5173
USER nonroot

CMD ["server.mjs"]
