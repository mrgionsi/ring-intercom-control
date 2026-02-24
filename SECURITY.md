# Security Policy

## Reporting a Vulnerability

Please do **not** open public GitHub issues for security vulnerabilities.

Report privately by:

- GitHub Security Advisory (preferred): `Security` tab in the repository
- fallback direct maintainer contact (if advisory is unavailable): `https://github.com/mrgionsi`

Include:

- affected component/version
- reproduction steps or proof of concept
- potential impact
- suggested mitigation (if known)

## Response Goals

- Initial acknowledgment: within 72 hours
- Triage and severity assessment: as soon as reproducible
- Fix coordination and disclosure: after patch is prepared and validated

## Scope

Security reports are especially relevant for:

- authentication/session handling
- token encryption/secrets management
- guest-link authorization
- container and CI/CD supply-chain configuration
