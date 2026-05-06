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
- `TRUST_PROXY`
  - Number of trusted proxy hops used by Express (Compose example default: `0`)
  - Use `0` when the backend is reached directly, without a reverse proxy
  - Use `1` when the backend is behind one trusted reverse proxy hop, such as Traefik
- `DB_PATH`
  - SQLite database path inside the backend container (Compose default: `/data/data.db`)
- `SESSION_DB_FILE`
  - SQLite session database filename stored next to `DB_PATH` (Compose default: `session.db`)
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

- `BACKEND_URL`
  - Backend origin used by the frontend Node server to proxy `/api/*` requests
  - Typical container value: `http://backend:3001`
- `PROXY_TIMEOUT_MS`
  - Timeout for frontend server proxy requests to backend (milliseconds)
- `MAX_BODY_BYTES`
  - Maximum proxied API request body size accepted by the frontend server

### Portainer / Traefik-specific variables

- `TRAEFIK_HOST`
  - Optional hostname used by `docker-compose/docker-compose.portainer.yml` for the Traefik router rule
  - Default example: `intercom.srv.home.gionsi.me`

## Backend API (`backend/src/config.ts`)

Backend process variables and defaults:

- `NODE_ENV` (default: `development`)
- `TRUST_PROXY` (default: `0`; must be a non-negative integer)
- `PORT` (default: `3001`; must be a positive integer)
- `CLIENT_ORIGIN` (default: `http://localhost:5173`)
- `ADMIN_USERNAME` (required)
- `ADMIN_PASSWORD_HASH` (required)
- `SESSION_SECRET` (required; must be at least 32 characters when `NODE_ENV=production`)
- `MASTER_KEY` (required; must decode from base64 to exactly 32 bytes)
- `DB_PATH` (default: `./data.db`)
- `SESSION_DB_FILE` (default: `session.db`)
- `UNLOCK_EVENTS_MAX` (default: `10000`; must be a positive integer)

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
- Use `TRUST_PROXY=0` for direct deployments without a reverse proxy.
- Use `TRUST_PROXY=1` when the backend is behind one trusted reverse proxy hop, such as Traefik.
- `docker-compose/docker-compose.portainer.yml` expects the external Docker network `ring-intercom` to exist.
- `docker-compose/docker-compose.portainer.yml` also references `traefik_default`, which should already exist as the external network used by your Traefik deployment.
- Container stdout/stderr is visible via `docker logs` and `docker compose logs`.
