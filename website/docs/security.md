---
sidebar_position: 6
---

# Security

## Secrets

- Never commit `.env` with real values.
- Keep `MASTER_KEY` and `SESSION_SECRET` in secret storage.
- Use rotated credentials for production deployments.

## Token handling

- Ring refresh tokens are encrypted at rest.
- Plain Ring credentials are only used during onboarding and should not be stored.

## Transport and cookies

- Use HTTPS in production.
- Keep `NODE_ENV=production` for secure cookie behavior.

## Reporting

For vulnerability reporting, use private channels described in repository security policy.
