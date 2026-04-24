---
sidebar_position: 5
---

# Development

Live docs URL: `https://mrgionsi.github.io/ring-intercom-control/`

## Prerequisites

- Node.js `20.17.0` or newer
  - `.nvmrc` pins the local baseline to `20.19.0`
  - CI currently runs the app test jobs on Node `24`
- npm bundled with your selected Node runtime

## Local run

Terminal 1:

```bash
cd backend
npm install
npm run dev
```

Terminal 2:

```bash
cd frontend
npm install
npm run dev
```

## Tests

```bash
cd backend && npm test
cd ../frontend && npm test
```

## Docs site

```bash
cd website
npm install
npm run start
```

## Security audit

```bash
cd backend && npm run security:check
cd ../frontend && npm run security:check
cd ../website && npm audit
```

Known residual audit findings are documented in the root README. Avoid
`npm audit fix --force` unless you have validated the resulting major-version
changes against Ring integration behavior.
