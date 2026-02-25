---
sidebar_position: 6
---

# Security

Live docs URL: `https://mrgionsi.github.io/ring-intercom-control/`

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

For vulnerability reporting, please use private channels described in the repository security policy:

- https://github.com/mrgionsi/ring-intercom-control/blob/main/SECURITY.md
