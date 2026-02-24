---
sidebar_position: 3
---

# Deployment

## Docker images

The project publishes two images:

- backend: `ghcr.io/<owner>/ring-intercom-control-backend`
- frontend: `ghcr.io/<owner>/ring-intercom-control-frontend`

Tags include package version, sha-based tags, and optional manual release tags.

## Docker Compose

Use `docker-compose/docker-compose.yml` with `docker-compose/.env`.

```bash
cd docker-compose
docker compose up -d
```

## Required backend environment

- `SESSION_SECRET`
- `MASTER_KEY` (base64, 32-byte decoded key)
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`

## Production checklist

- Run behind HTTPS reverse proxy
- Set `CLIENT_ORIGIN` to real public frontend origin
- Protect secrets via secret manager
- Back up SQLite volume regularly
- Monitor logs and failed auth attempts
