---
sidebar_position: 4
---

# API

## Base

- Local backend base URL: `http://localhost:3001`
- Frontend uses `/api/*` routes.

## Auth

- `GET /api/auth/csrf`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Ring

- `GET /api/ring/status`
- `GET /api/ring/summary`
- `POST /api/ring/unlock`
- `GET /api/ring/accounts`
- `POST /api/ring/accounts`

## Guest links

- `GET /api/guest-links`
- `POST /api/guest-links`
- `PATCH /api/guest-links/:id/expires-at`
- `DELETE /api/guest-links/:id`
- Public guest access:
  - `GET /api/guest/:token`
  - `POST /api/guest/:token/unlock`

## Admin

- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/:id`
- `DELETE /api/admin/users/:id/permanent`
- `GET /api/admin/devices`
