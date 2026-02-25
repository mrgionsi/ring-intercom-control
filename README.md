<p align="center">
  <img src="frontend/public/ring_intercom_logo.png" alt="Ring Intercom Control logo" width="140" />
</p>

# Ring Intercom Control

Self-hosted web app to manage Ring Intercom access for B&B and small hospitality workflows.

Main use case: create temporary guest links (check-in/check-out window) so guests can unlock the door only during their stay.

Supported languages: English, Italian, Spanish, German.

## Documentation

Most project details are maintained in Docusaurus:

- Docs source: `website/`
- Intro: `website/docs/intro.md`
- Architecture: `website/docs/architecture.md`
- API (generated from backend docstrings): `website/docs/api/reference.md`
- Deployment: `website/docs/deployment.md`
- Development: `website/docs/development.md`
- Security: `website/docs/security.md`
- Contributing: `website/docs/contributing.md`

Published docs:
- `https://mrgionsi.github.io/ring-intercom-control/`

## Key Capabilities

- Ring account integration (single or multiple accounts per user)
- Intercom unlock from web dashboard
- Guest links with start/end window and max-use limit
- Admin/user role model
- Audit trails for unlocks and login attempts

## UI Preview

### Login
![Login page](docs/screenshots/login.png)

### Dashboard
![Dashboard page](docs/screenshots/dashboard.png)

### Guest Links
![Guest links page](docs/screenshots/guest_link.png)

### Settings
![Settings page](docs/screenshots/settings.png)

### Users (Admin)
![Users page](docs/screenshots/users.png)

## Quick Start

```bash
cd backend && npm install
cd ../frontend && npm install
```

```bash
cd backend
cp .env.example .env
npm run dev
```

```bash
cd frontend
npm run dev
```

App URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

For complete setup, security, Docker, and CI/CD instructions, use the Docusaurus docs above.

## Docker Deployment

The project supports containerized deployment for both backend and frontend.

- Backend image: `backend/Dockerfile`
- Frontend image: `frontend/Dockerfile`
- Compose stack: `docker-compose/docker-compose.yml`
- Env template: `docker-compose/.env.example`

### Frontend Container (Standalone)

Build:

```bash
docker build ./frontend -t mrgionsi/ring-intercom-control-frontend:0.1.0-beta
```

Run:

```bash
docker run --rm -p 5173:5173 \
  -e PORT=5173 \
  -e BACKEND_URL=http://host.docker.internal:3001 \
  mrgionsi/ring-intercom-control-frontend:0.1.0-beta
```

Notes:

- `BACKEND_URL` is optional. If set, `/api/*` requests are proxied to backend.
- `host.docker.internal` works by default on Docker Desktop (Windows/macOS). On Linux, add:
  - `--add-host=host.docker.internal:host-gateway`
- Health endpoint inside container: `GET /health` returns `{ "ok": true }`.
- Static cache policy:
  - `index.html`: `no-cache`
  - `/assets/*`: `public, max-age=31536000, immutable`

### Docker Compose (Backend + Frontend)

Files:

- `docker-compose/docker-compose.yml`
- `docker-compose/.env`

Run:

```bash
cd docker-compose
cp .env.example .env
docker compose up -d
```

Stop:

```bash
cd docker-compose
docker compose down
```

## Validation and QA

### Build Checks

```bash
cd backend && npm run build
cd ../frontend && npm run build
```

### Smoke Tests

PowerShell:

```powershell
scripts/smoke-test.ps1
```

Bash:

```bash
scripts/smoke-test.sh
```

Optional authenticated smoke checks:

- `SMOKE_USERNAME=<username>`
- `SMOKE_PASSWORD=<password>`
- `SMOKE_BASE_URL=http://localhost:3001`

### Security Audit

PowerShell:

```powershell
scripts/security-check.ps1
```

Bash:

```bash
scripts/security-check.sh
```

## Known Dependency Advisories

Current `npm audit` reports high-severity vulnerabilities in transitive dependencies:

- `ip` via `ring-client-api` (fix path requires breaking downgrade)
- `tar` via `sqlite3` / `node-gyp` (fix path requires breaking downgrade)

These are currently tracked and deferred until upstream fix availability and the planned DB migration.

## Branching Model

- `main`: stable, production-ready branch
- `dev`: integration and pre-release branch
- `feature/*`: short-lived implementation branches
- `hotfix/*`: emergency fixes from `main`

## Roadmap

- Optional managed DB migration path (Supabase/Postgres)
- Extended automated test coverage (API + UI)

## License

- See `LICENSE`.

## Community

- Contribution guide: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`
- Support: `SUPPORT.md`
- Issues: `https://github.com/mrgionsi/ring-intercom-control/issues`
