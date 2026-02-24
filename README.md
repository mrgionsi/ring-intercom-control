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

If published with GitHub Pages, docs URL is typically:
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

Quick run with Compose:

```bash
cd docker-compose
cp .env.example .env
docker compose up -d
```

## Community

- Contribution guide: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`
- Support: `SUPPORT.md`
- Issues: `https://github.com/mrgionsi/ring-intercom-control/issues`
