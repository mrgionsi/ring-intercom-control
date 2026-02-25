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

## Docker Compose

Use `docker-compose/docker-compose.yml` with `docker-compose/.env`.

For a complete variable reference, see [Environment Variables](./environment).

```bash
cd docker-compose
docker compose up -d
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

## Production checklist

- Run behind HTTPS reverse proxy
- Set `CLIENT_ORIGIN` to real public frontend origin
- Protect secrets via secret manager
- Back up SQLite volume regularly
- Monitor logs and failed auth attempts
