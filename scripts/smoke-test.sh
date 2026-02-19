#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SMOKE_BASE_URL:-http://localhost:3001}"
USERNAME="${SMOKE_USERNAME:-}"
PASSWORD="${SMOKE_PASSWORD:-}"

node "$(dirname "$0")/smoke-test.mjs" \
  --base-url "$BASE_URL" \
  --username "$USERNAME" \
  --password "$PASSWORD"
