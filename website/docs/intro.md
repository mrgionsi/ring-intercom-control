---
sidebar_position: 1
---

# Introduction

Live docs URL: `https://mrgionsi.github.io/ring-intercom-control/`

`ring-intercom-control` is a self-hosted web application to manage Amazon Ring Intercom access for hospitality and property workflows.

It is a practical option for B&B hosts using Ring Intercom: create temporary guest links so guests can unlock the entrance during their stay window.

Supported languages: English, Italian, Spanish, German.

## Application scope

The project scope is:

- connect one or more Ring accounts per user
- discover and monitor intercom devices (status, battery, health snapshot)
- unlock intercoms from a secure authenticated dashboard
- create time-bound guest links with usage limits and status tracking
- support admin operations for user management, visibility, and governance
- provide auditable operational behavior (login attempts, unlock events, limits)

This documentation covers:

- architecture and data flow
- API and auth behavior
- local development workflows
- Docker and deployment runbooks
- operational and security guidance
- contribution and release processes

## Navigation

- [Architecture](./architecture)
- [Deployment](./deployment)
- [Environment Variables](./environment)
- [API](./api)
- [Development](./development)
- [Security](./security)
- [Contributing](./contributing)

## UI gallery

### Login

![Login page](/img/screenshots/login.png)

### Dashboard

![Dashboard page](/img/screenshots/dashboard.png)

### Guest links

![Guest links page](/img/screenshots/guest_link.png)

### Settings

![Settings page](/img/screenshots/settings.png)

### Users (Admin)

![Users page](/img/screenshots/users.png)

## Source of truth

Project source code and issues:

- https://github.com/mrgionsi/ring-intercom-control

Community and project policies:

- [Contributing Guide](https://github.com/mrgionsi/ring-intercom-control/blob/main/CONTRIBUTING.md)
- [Security Policy](https://github.com/mrgionsi/ring-intercom-control/blob/main/SECURITY.md)
- [Support](https://github.com/mrgionsi/ring-intercom-control/blob/main/SUPPORT.md)
