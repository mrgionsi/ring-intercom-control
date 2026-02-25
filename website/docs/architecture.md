---
sidebar_position: 2
---

# Architecture

Live docs URL: `https://mrgionsi.github.io/ring-intercom-control/`

## Components

- `backend/`: Express API, auth/session, Ring integration, SQLite persistence
- `frontend/`: React + Vite app for admin/user/guest operations
- `website/`: Docusaurus documentation site

## High-level flow

1. User authenticates against backend session auth.
2. Frontend calls backend `/api/*` endpoints.
3. Backend decrypts Ring refresh token and performs Ring API operations.
4. Data is persisted in SQLite (`data.db`) and sessions in SQLite store.

## Data model highlights

- Users and roles (`admin`, `user`)
- Ring accounts per user
- Guest links with date-range and usage limits
- Unlock events and login audit trails

## Security boundaries

- CSRF enforced for authenticated write routes
- Tokens encrypted at rest with `MASTER_KEY`
- Session cookies signed with `SESSION_SECRET`

## Use case: B&B check-in/check-out flow

1. Host creates a guest link for a booking with `startsAt` = check-in date/time and `expiresAt` = check-out date/time.
2. Host optionally sets `maxUses` (for example 1 or 2 uses per stay).
3. Guest receives the link and can unlock only while the link is valid.
4. After check-out, the link becomes expired automatically (or can be disabled manually).
5. Unlock attempts are recorded in audit logs for operational traceability.
