# Stage: build
FROM node:20-alpine AS builder

WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source
COPY backend/ .

RUN npm run build

# Stage: prod
FROM gcr.io/distroless/nodejs20-debian13

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3001
USER nonroot

CMD ["dist/index.js"]
