---
title: API Reference (Generated)
sidebar_position: 2
---

<!-- Auto-generated from backend route docstrings. Do not edit manually. -->

This page is generated from JSDoc `@api` blocks in backend source files.

## `GET /api/admin/audit`

List unlock audit events globally or by user.

- Access: `Admin`
- Query: `userId?,page?,pageSize?`
- Success: `200 { events, total, page, pageSize }`
- Source: `backend/src/routes/admin.ts`

## `GET /api/admin/devices`

List each user and their Ring device summary (admin view).

- Access: `Admin`
- Success: `200 { users[] }`
- Source: `backend/src/routes/admin.ts`

## `GET /api/admin/limits`

Read runtime rate limits.

- Access: `Admin`
- Success: `200 { guestPerMinute, authPerMinute }`
- Source: `backend/src/routes/admin.ts`

## `POST /api/admin/limits`

Update runtime rate limits.

- Access: `Admin`
- Body: `guestPerMinute?,authPerMinute?`

Body example:

```json
{
  "guestPerMinute": 60,
  "authPerMinute": 60
}
```
- Success: `200 { guestPerMinute, authPerMinute }`
- Source: `backend/src/routes/admin.ts`

## `GET /api/admin/login-audit`

List login audit events.

- Access: `Admin`
- Success: `200 { events[] }`
- Source: `backend/src/routes/admin.ts`

## `GET /api/admin/users`

List users and lockout status.

- Access: `Admin`
- Success: `200 { users[] }`
- Source: `backend/src/routes/admin.ts`

## `POST /api/admin/users`

Create a new application user.

- Access: `Admin`
- Body: `username,password,role?,firstName?,lastName?,structure?`

Body example:

```json
{
  "username": "Example",
  "password": "Password123!",
  "role": "string",
  "firstName": "Example",
  "lastName": "Example",
  "structure": "string"
}
```
- Success: `200 { ok, user }`
- Errors:
  - `400 Validation or duplicate user error`
- Source: `backend/src/routes/admin.ts`

## `DELETE /api/admin/users/:id`

Soft delete (disable) a user account.

- Access: `Admin`
- Success: `200 { ok: true }`
- Source: `backend/src/routes/admin.ts`

## `PUT /api/admin/users/:id`

Update user profile, password, and disabled flag.

- Access: `Admin`
- Body: `username?,password?,firstName?,lastName?,structure?,disabled?`

Body example:

```json
{
  "username": "Example",
  "password": "Password123!",
  "firstName": "Example",
  "lastName": "Example",
  "structure": "string",
  "disabled": true
}
```
- Success: `200 { ok: true }`
- Errors:
  - `400 Invalid id or self-disable attempt`
- Source: `backend/src/routes/admin.ts`

## `DELETE /api/admin/users/:id/permanent`

Permanently delete a non-admin user and related data.

- Access: `Admin`
- Success: `200 { ok: true }`
- Errors:
  - `400 Invalid/self/admin delete`
  - `404 User not found`
- Source: `backend/src/routes/admin.ts`

## `POST /api/admin/users/:id/reset-password`

Reset password for a non-admin user and return a temporary password.

- Access: `Admin`
- Success: `200 { ok: true, tempPassword }`
- Source: `backend/src/routes/admin.ts`

## `GET /api/audit`

List unlock audit events for current user.

- Access: `Authenticated`
- Success: `200 { events[] }`
- Source: `backend/src/routes/audit.ts`

## `GET /api/auth/csrf`

Generate a CSRF token and set cookie pair used by mutating API requests.

- Access: `Public`
- Success: `200 { csrfToken }`
- Source: `backend/src/app.ts`

## `POST /api/auth/login`

Authenticate an admin or standard user and create a session.

- Access: `Public`
- Body: `username:string,password:string`

Body example:

```json
{
  "username:string": "Example",
  "password:string": "Password123!"
}
```
- Success: `200 { ok, username, role }`
- Errors:
  - `400 Missing credentials`
  - `401 Invalid credentials`
  - `403 User is disabled`
  - `423 Account locked`
- Source: `backend/src/routes/auth.ts`

## `POST /api/auth/logout`

Destroy the current authenticated session.

- Access: `Authenticated`
- Success: `200 { ok: true }`
- Source: `backend/src/routes/auth.ts`

## `GET /api/auth/me`

Return the current logged-in user profile from session.

- Access: `Authenticated`
- Success: `200 { username, role }`
- Errors:
  - `401 Not authenticated`
- Source: `backend/src/routes/auth.ts`

## `GET /api/guest-link-templates`

List guest link templates for current user.

- Access: `Authenticated`
- Success: `200 { templates[] }`
- Source: `backend/src/routes/guest.ts`

## `POST /api/guest-link-templates`

Create a guest link template.

- Access: `Authenticated`
- Body: `name,durationHours,maxUses?`

Body example:

```json
{
  "name": "Example",
  "durationHours": 1,
  "maxUses": 1
}
```
- Success: `200 { template }`
- Source: `backend/src/routes/guest.ts`

## `DELETE /api/guest-link-templates/:id`

Delete a guest link template.

- Access: `Authenticated`
- Success: `200 { ok: true }`
- Source: `backend/src/routes/guest.ts`

## `GET /api/guest-links`

List guest links for current user.

- Access: `Authenticated`
- Success: `200 { links[] }`
- Source: `backend/src/routes/guest.ts`

## `POST /api/guest-links`

Create a guest unlock link.

- Access: `Authenticated`
- Body: `label?,intercomId,startsAt,expiresAt,maxUses?,ringAccountId`

Body example:

```json
{
  "label": "Example",
  "intercomId": 1,
  "startsAt": "2026-02-24T12:00:00.000Z",
  "expiresAt": "2026-02-24T12:00:00.000Z",
  "maxUses": 1,
  "ringAccountId": 1
}
```
- Success: `200 { link }`
- Source: `backend/src/routes/guest.ts`

## `DELETE /api/guest-links/:id`

Disable a guest link.

- Access: `Authenticated`
- Success: `200 { ok: true }`
- Source: `backend/src/routes/guest.ts`

## `PATCH /api/guest-links/:id/expires-at`

Update guest link expiration time.

- Access: `Authenticated`
- Body: `expiresAt`

Body example:

```json
{
  "expiresAt": "2026-02-24T12:00:00.000Z"
}
```
- Success: `200 { ok: true, expiresAt }`
- Source: `backend/src/routes/guest.ts`

## `PUT /api/guest-links/:id/expires-at`

Update guest link expiration time (PUT compatibility route).

- Access: `Authenticated`
- Body: `expiresAt`

Body example:

```json
{
  "expiresAt": "2026-02-24T12:00:00.000Z"
}
```
- Success: `200 { ok: true, expiresAt }`
- Source: `backend/src/routes/guest.ts`

## `GET /api/guest/:token`

Resolve a public guest link and return current validity state.

- Access: `Public`
- Success: `200 { token, label, startsAt, expiresAt, valid, state }`
- Errors:
  - `404 Link not found`
- Source: `backend/src/routes/guest.ts`

## `POST /api/guest/:token/unlock`

Unlock via public guest token if link is currently valid.

- Access: `Public`
- Success: `200 { ok: true }`
- Errors:
  - `403 Link not active yet`
  - `404 Link not found`
  - `410 Link expired/used up`
- Source: `backend/src/routes/guest.ts`

## `GET /api/health`

Liveness probe endpoint.

- Access: `Public`
- Success: `200 { ok: true }`
- Source: `backend/src/app.ts`

## `GET /api/ring/accounts`

List Ring accounts for current user.

- Access: `Authenticated`
- Success: `200 { accounts[] }`
- Source: `backend/src/routes/ring.ts`

## `POST /api/ring/accounts`

Create a Ring account entry for current user.

- Access: `Authenticated`
- Body: `label`

Body example:

```json
{
  "label": "Example"
}
```
- Success: `200 { account }`
- Source: `backend/src/routes/ring.ts`

## `DELETE /api/ring/accounts/:id`

Disable (soft delete) a Ring account.

- Access: `Authenticated`
- Success: `200 { ok: true }`
- Source: `backend/src/routes/ring.ts`

## `PATCH /api/ring/accounts/:id`

Update account label/default flag for a Ring account.

- Access: `Authenticated`
- Body: `label?,isDefault?`

Body example:

```json
{
  "label": "Example",
  "isDefault": true
}
```
- Success: `200 { account }`
- Source: `backend/src/routes/ring.ts`

## `POST /api/ring/auth/start`

Start Ring credential login flow (may require 2FA).

- Access: `Authenticated`
- Body: `email,password,ringAccountId?,accountLabel?`

Body example:

```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "ringAccountId": 1,
  "accountLabel": "Example"
}
```
- Success: `200 { requires2fa, authSessionId, prompt, expiresAt } or { refreshToken }`
- Source: `backend/src/routes/ring.ts`

## `POST /api/ring/auth/verify`

Verify Ring 2FA code and return refresh token.

- Access: `Authenticated`
- Body: `authSessionId,code`

Body example:

```json
{
  "authSessionId": 1,
  "code": "123456"
}
```
- Success: `200 { refreshToken }`
- Source: `backend/src/routes/ring.ts`

## `GET /api/ring/health/history`

Get device health history for a specific intercom.

- Access: `Authenticated`
- Query: `intercomId`
- Success: `200 { history[] }`
- Source: `backend/src/routes/ring.ts`

## `POST /api/ring/refresh-token`

Save/update a refresh token for a Ring account.

- Access: `Authenticated`
- Body: `refreshToken,ringAccountId?,accountLabel?`

Body example:

```json
{
  "refreshToken": "token-value",
  "ringAccountId": 1,
  "accountLabel": "Example"
}
```
- Success: `200 { ok: true, ringAccountId }`
- Source: `backend/src/routes/ring.ts`

## `POST /api/ring/refresh-token/test`

Validate a Ring refresh token by attempting a lightweight API call.

- Access: `Authenticated`
- Body: `refreshToken`

Body example:

```json
{
  "refreshToken": "token-value"
}
```
- Success: `200 { ok: true, locations }`
- Errors:
  - `400 Refresh token is invalid`
- Source: `backend/src/routes/ring.ts`

## `GET /api/ring/status`

Return Ring integration status and configured accounts.

- Access: `Authenticated`
- Success: `200 { configured, accounts[] }`
- Source: `backend/src/routes/ring.ts`

## `GET /api/ring/summary`

Return Ring intercom summary for current user.

- Access: `Authenticated`
- Success: `200 { summary }`
- Source: `backend/src/routes/ring.ts`

## `POST /api/ring/unlock`

Trigger unlock on an intercom.

- Access: `Authenticated`
- Body: `intercomId,ringAccountId?`

Body example:

```json
{
  "intercomId": 1,
  "ringAccountId": 1
}
```
- Success: `200 { ok: true }`
- Source: `backend/src/routes/ring.ts`

