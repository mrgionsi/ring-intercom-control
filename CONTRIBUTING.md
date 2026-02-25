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

## GitHub Environments (Release Workflow)

The container release workflow (`.github/workflows/release-containers.yml`) uses the
GitHub Actions environment `production` for the `draft-release` job.

Before running that workflow in your repository/fork, create the environment in:

- GitHub Settings -> Environments -> New environment -> `production`

Configure protection rules/secrets as needed for your repo, for example:

- Required reviewers (optional)
- Deployment branches (optional; commonly `main`)
- Any environment-scoped secrets your org policy requires
