# Contributing

Thanks for contributing to `ring-intercom-control`.

## Development Flow

- Base branch for active work: `dev`
- Stable branch: `main`
- Branch naming:
  - `feat/<scope>`
  - `fix/<scope>`
  - `ops/<scope>`
  - `docs/<scope>`
  - `test/<scope>`

## Commit Style

Use concise conventional-style messages:

- `feat: ...`
- `fix: ...`
- `ops: ...`
- `docs: ...`
- `test: ...`

## Pull Requests

- Keep PRs focused and small enough to review.
- Include:
  - summary of changes
  - risks/impact
  - test evidence (commands or screenshots when relevant)
- Update docs when behavior changes.

## Local Checks (minimum)

```bash
cd backend && npm run build
cd ../frontend && npm run build
```

If tests exist for touched code, run them before opening PR.
