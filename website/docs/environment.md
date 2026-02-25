---
sidebar_position: 4
---

# Environment Variables

Live docs URL: `https://mrgionsi.github.io/ring-intercom-control/`

This page documents environment variables used by the project runtime, Docker Compose setup, frontend proxy server, and test tooling.

## Docker Compose (`docker-compose/.env`)

These variables are read by `docker-compose/docker-compose.yml`.

### Images and ports

- `BACKEND_IMAGE`
  - Backend container image tag (default example: `ghcr.io/mrgionsi/ring-intercom-control-backend:latest`)
- `FRONTEND_IMAGE`
  - Frontend container image tag (default example: `ghcr.io/mrgionsi/ring-intercom-control-frontend:latest`)
- `BACKEND_PORT`
  - Host port mapped to backend container port `3001`
- `FRONTEND_PORT`
  - Host port mapped to frontend container port `5173`

### Backend runtime (compose-provided)

- `NODE_ENV`
  - Backend runtime mode (Compose default: `production`)
- `DB_PATH`
  - SQLite database path inside the backend container (Compose default: `/data/data.db`)
- `SESSION_SECRET`
  - Required; session signing secret
- `MASTER_KEY`
  - Required; base64 key for encrypting Ring refresh tokens (must decode to 32 bytes)
- `ADMIN_USERNAME`
  - Required; bootstrap admin username
- `ADMIN_PASSWORD_HASH`
  - Required; bcrypt hash for bootstrap admin password
- `CLIENT_ORIGIN`
  - Allowed browser origin for CORS (for example `http://localhost:5173`)

### Frontend runtime (compose-provided)

- `PROXY_TIMEOUT_MS`
  - Timeout for frontend server proxy requests to backend (milliseconds)

## Backend API (`backend/src/config.ts`)

Backend process variables and defaults:

- `NODE_ENV` (default: `development`)
- `PORT` (default: `3001`)
- `CLIENT_ORIGIN` (default: `http://localhost:5173`)
- `ADMIN_USERNAME` (required)
- `ADMIN_PASSWORD_HASH` (required)
- `SESSION_SECRET` (required)
- `MASTER_KEY` (required)
- `DB_PATH` (default: `./data.db`)
- `SESSION_DB_FILE` (default: `session.db`)
- `UNLOCK_EVENTS_MAX` (default: `10000`)

## Frontend browser app (`frontend/src/api.ts`)

- `VITE_API_BASE`
  - Optional base URL prepended to frontend API requests
  - Typical local dev value: empty (frontend proxies `/api/*`)

## Frontend static/proxy server (`frontend/server.mjs`)

Variables used by the production frontend Node server:

- `PORT` (default: `5173`)
- `BACKEND_URL`
  - Backend origin used for proxying `/api/*` requests (required in container setup)
- `PROXY_TIMEOUT_MS` (default: `15000`)
- `MAX_BODY_BYTES` (default: `1048576`)

## Test and utility variables (optional)

### Smoke test (`scripts/smoke-test.mjs`)

- `SMOKE_BASE_URL` (default: `http://localhost:3001`)
- `SMOKE_USERNAME`
- `SMOKE_PASSWORD`

### Frontend E2E / Playwright (`frontend/playwright.config.ts`)

- `CI`
- `E2E_ADMIN_PASSWORD_HASH`
- `ADMIN_PASSWORD_HASH`
- `SESSION_SECRET`
- `E2E_USERNAME`
- `E2E_DB_PATH`

### Frontend E2E tests

- `E2E_PASSWORD` (used by `frontend/e2e/*.spec.ts`)
- `E2E_USERNAME` (used by `frontend/e2e/*.spec.ts`)

## Notes

- For Docker Compose local usage, edit `docker-compose/.env` rather than hardcoding values in `docker-compose/docker-compose.yml`.
- In production over HTTPS, keep backend `NODE_ENV=production` to preserve secure cookie behavior.
