# Stage: build
FROM node:20.20.0-bookworm-slim@sha256:d8a35d586fad3af7abb6fdb9ba972388395405f4d462da9e4a4ddcde67b5e0fb AS builder

WORKDIR /app
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build static assets
RUN npm run build

# Stage: prod
FROM gcr.io/distroless/nodejs20-debian13

LABEL org.opencontainers.image.description="Frontend web app for Ring Intercom Control."

WORKDIR /app

COPY --from=builder --chown=65532:65532 /app/dist ./dist
COPY --chown=65532:65532 server.mjs ./server.mjs

ENV NODE_ENV=production
ENV PORT=5173

EXPOSE 5173
USER nonroot

CMD ["server.mjs"]
