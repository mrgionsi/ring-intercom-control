---
sidebar_position: 4
---

# API

## Base

- Local backend base URL: `http://localhost:3001`
- Frontend uses `/api/*` routes.

## Auth & CSRF Rules

- `GET` routes do **not** require CSRF token.
- `POST`/`PUT`/`PATCH`/`DELETE` routes require valid CSRF token (`x-csrf-token` + cookie), except public guest unlock routes under `/api/guest/*`.

## Endpoints

### Auth

- `GET /api/auth/csrf` — Auth: no, CSRF: no (returns token/cookie pair)
- `POST /api/auth/login` — Auth: no, CSRF: yes
- `POST /api/auth/logout` — Auth: yes, CSRF: yes
- `GET /api/auth/me` — Auth: yes, CSRF: no

### Ring

- `GET /api/ring/status` — Auth: yes, CSRF: no
- `GET /api/ring/summary` — Auth: yes, CSRF: no
- `POST /api/ring/unlock` — Auth: yes, CSRF: yes
- `GET /api/ring/accounts` — Auth: yes, CSRF: no
- `POST /api/ring/accounts` — Auth: yes, CSRF: yes
- `PATCH /api/ring/accounts/:id` — Auth: yes, CSRF: yes
- `DELETE /api/ring/accounts/:id` — Auth: yes, CSRF: yes

### Guest Links (authenticated owner routes)

- `GET /api/guest-links` — Auth: yes, CSRF: no
- `POST /api/guest-links` — Auth: yes, CSRF: yes
- `PATCH /api/guest-links/:id/expires-at` — Auth: yes, CSRF: yes
- `DELETE /api/guest-links/:id` — Auth: yes, CSRF: yes
- `GET /api/guest-link-templates` — Auth: yes, CSRF: no
- `POST /api/guest-link-templates` — Auth: yes, CSRF: yes
- `DELETE /api/guest-link-templates/:id` — Auth: yes, CSRF: yes

### Guest Public Access

- `GET /api/guest/:token` — Auth: no, CSRF: no
- `POST /api/guest/:token/unlock` — Auth: no, CSRF: no (public exception)

### Admin

- `GET /api/admin/users` — Auth: admin, CSRF: no
- `POST /api/admin/users` — Auth: admin, CSRF: yes
- `PUT /api/admin/users/:id` — Auth: admin, CSRF: yes
- `DELETE /api/admin/users/:id` — Auth: admin, CSRF: yes
- `DELETE /api/admin/users/:id/permanent` — Auth: admin, CSRF: yes
- `GET /api/admin/devices` — Auth: admin, CSRF: no
- `GET /api/admin/audit` — Auth: admin, CSRF: no
- `GET /api/admin/login-audit` — Auth: admin, CSRF: no
- `GET /api/admin/limits` — Auth: admin, CSRF: no
- `POST /api/admin/limits` — Auth: admin, CSRF: yes
