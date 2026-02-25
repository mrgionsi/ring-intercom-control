---
sidebar_position: 1
---

# API

Live docs URL: `https://mrgionsi.github.io/ring-intercom-control/`

## Base URL

- Local backend base URL: `http://localhost:3001`
- Frontend calls backend via `/api/*`.

## How API Docs Are Produced

- Route handlers include JSDoc docstrings with `@api`, `@access`, `@body`, `@query`, `@success`, and `@error`.
- Generated reference is built from source code with:

```bash
cd website
npm run docs:api
```

## Full Reference

See [API Reference (Generated)](./reference) for the complete endpoint list and metadata.
