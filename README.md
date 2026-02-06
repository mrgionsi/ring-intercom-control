# ring-intercom-control

Web application to manage Ring Intercom access: store Ring refresh tokens securely, unlock doors, and generate expiring guest links for B&B guests.

## Highlights

- Secure storage of Ring refresh tokens (AES-256-GCM)
- Admin + user roles
- Guest links with expiration and max uses
- Guest link templates (one-click presets)
- Device overview + health history (battery/RSSI/OTA)
- Audit logs (unlock history + login attempts)
- Rate limits configurable from admin UI

## Tech Stack

- Backend: Node.js + TypeScript + Express + SQLite
- Ring API: `ring-client-api`
- Frontend: React + Vite

## Project Structure

- `backend/` API server
- `frontend/` Web UI
- `scripts/` Audit scripts

## Quick Start (Local Dev)

1. Install dependencies
   - `cd backend`
   - `npm install`
   - `cd ../frontend`
   - `npm install`
2. Configure environment
   - Copy `backend/.env.example` to `backend/.env`
   - Generate a `MASTER_KEY` (base64):
     - `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
   - Generate admin password hash:
     - `cd backend`
     - `npm run hash-password -- yourPassword`
3. Run dev servers
   - Backend: `cd backend` then `npm run dev`
   - Frontend: `cd frontend` then `npm run dev`

Frontend expects the backend at `http://localhost:3001` (Vite proxy is configured).

## Ring Refresh Token

This app stores a Ring refresh token (not your raw password). Generate one with:

1. `cd backend`
2. `npx -p ring-client-api ring-auth-cli`
3. Paste the refresh token into the app (Dashboard → Ring Connection).

## Security

- CSRF protection for authenticated routes
- Session rotation on login
- Account lockout after 5 failed logins (15 min)
- Rate limits (configurable in Admin UI)

### Known Dependency Advisories

Current `npm audit` reports high severity vulnerabilities in transitive dependencies:

- `ip` via `ring-client-api` (requires a breaking downgrade to 9.x)
- `tar` via `sqlite3` / `node-gyp` (requires a breaking downgrade)

We are deferring these until the planned Supabase migration and/or upstream fixes. Track in:

- `scripts/security-check.ps1` / `scripts/security-check.sh`

## Audit Scripts

Run audits for both backend and frontend:

- PowerShell: `scripts/security-check.ps1`
- Bash: `scripts/security-check.sh`

## Production Build

1. `cd frontend` then `npm run build`
2. `cd ../backend` then `npm run build`
3. Start backend: `npm run start`

Backend serves the built frontend automatically in production.

## License

MIT
