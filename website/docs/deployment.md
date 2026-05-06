---
sidebar_position: 3
---

# Deployment

Live docs URL: `https://mrgionsi.github.io/ring-intercom-control/`

## Docker images

The project publishes two images:

- backend: `ghcr.io/mrgionsi/ring-intercom-control-backend`
- frontend: `ghcr.io/mrgionsi/ring-intercom-control-frontend`

Tags include package version, sha-based tags, and optional manual release tags.

## Deploy via Docker Compose

Use `docker-compose/docker-compose.yml` with `docker-compose/.env`.

For a complete variable reference, see [Environment Variables](./environment).

Recommended flow:

1. Copy the example env file.
2. Fill in the required secrets.
3. Start the stack.

```bash
cd docker-compose
cp .env.example .env
docker compose up -d
```

Notes:

- Set `CLIENT_ORIGIN` to the browser-facing frontend URL, for example
  `http://192.168.1.50:5173`.
- In the frontend container, `BACKEND_URL` should normally point to the Docker
  service name, for example `http://backend:3001`.
- Set `TRUST_PROXY=0` when the backend is not behind a reverse proxy or `TRUST_PROXY=1` if you run backend behind proxy (i.e. Traefik)
- If you paste `ADMIN_PASSWORD_HASH` directly into Compose YAML, escape each
  `$` as `$$`.

## Deploy via Portainer

Use `docker-compose/docker-compose.portainer.yml` when deploying behind Traefik
and keeping the backend private on the internal `ring-intercom` Docker
network.

Recommended flow:

1. Create the external Docker networks if they do not already exist:
   `ring-intercom`.
2. Open Portainer and create a new stack.
3. Paste or import `docker-compose/docker-compose.portainer.yml`.
4. Add the environment variables in the Portainer stack UI.
5. Deploy the stack.

Notes:

- In Portainer, bcrypt hashes for `ADMIN_PASSWORD_HASH` should also be escaped
  as `$$` when they are consumed by the stack. This applies even when you enter
  the value through Portainer's variables UI.
- Set `TRUST_PROXY=1` when running behind Traefik or another single trusted
  reverse proxy hop or `TRUST_PROXY=0` if you are exposing direct IP.
- `frontend` is attached to both `traefik_default` and `ring-intercom`.
- `backend` is attached only to `ring-intercom` and is not exposed publicly.
- Keep `CLIENT_ORIGIN` set to the frontend URL seen by the browser.
- Keep `BACKEND_URL` in the frontend container pointed at the internal Docker
  service, usually `http://backend:3001`.
- `traefik_default` is expected to already exist as the external network used by
  your Traefik deployment.

Create the networks from the Docker host if needed:

```bash
docker network create ring-intercom
```

## Required backend environment

- `SESSION_SECRET`
- `MASTER_KEY` (base64, 32-byte decoded key)
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`

### Variable details and generation

- `SESSION_SECRET`
  - Purpose: signs and verifies session cookies.
  - Generate:
    - `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

- `MASTER_KEY`
  - Purpose: encrypts stored Ring refresh tokens (AES-256-GCM).
  - Must decode to exactly 32 bytes.
  - Generate:
    - `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
  - Validate length:
    - `node -e "const k=process.env.MASTER_KEY||''; console.log(Buffer.from(k,'base64').length)"`
    - expected output: `32`

- `ADMIN_USERNAME`
  - Purpose: bootstrap administrator login username.
  - Example: `admin`

- `ADMIN_PASSWORD_HASH`
  - Purpose: bcrypt hash used to verify admin password.
  - Generate hash (from backend directory):
    - `npm run hash-password -- yourStrongPassword`
  - In Docker Compose and Portainer stack deployments, escape each `$` as `$$`
    when the value is consumed by the stack configuration.

## `NODE_ENV` guidance

- `NODE_ENV=production`
  - Use for real deployments.
  - In current releases, this expects secure cookies, so pair it with HTTPS.

- `NODE_ENV=development`
  - Use for local development or plain HTTP testing on a trusted private LAN.
  - If you must run the current release over plain `http://`, prefer
    `NODE_ENV=development` so authentication cookies work without TLS.

## `TRUST_PROXY` guidance

- `TRUST_PROXY=0`
  - Use when the backend receives requests directly.
  - This is the safe default when no reverse proxy is in front of the app, for
    example a direct Docker Compose deployment.

- `TRUST_PROXY=1`
  - Use when the backend is behind one trusted reverse proxy hop, such as
    Traefik.
  - This affects `req.ip`, login audit IP capture, rate limiting, and secure
    cookie behavior when HTTPS is terminated at the proxy.

## Production checklist

- Run behind HTTPS reverse proxy
- Set `CLIENT_ORIGIN` to real public frontend origin
- Protect secrets via secret manager
- Back up SQLite volume regularly
- Monitor logs and failed auth attempts

## Logs

Backend request logs, startup output, and runtime errors are written to
stdout/stderr. The frontend static/proxy server does the same. In Docker and
Docker Compose deployments, inspect them with:

```bash
docker logs ring-intercom-backend
docker logs ring-intercom-frontend
```

or:

```bash
cd docker-compose
docker compose logs backend
docker compose logs frontend
```
