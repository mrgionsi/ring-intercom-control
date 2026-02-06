#!/usr/bin/env bash
set -euo pipefail

run_audit() {
  local name="$1"
  local path="$2"
  echo "=== $name ==="
  pushd "$path" > /dev/null
  local output
  if output=$(npm run security:check 2>&1); then
    popd > /dev/null
    echo "$output"
    return 0
  else
    popd > /dev/null
    echo "$output"
    return 1
  fi
}

timestamp=$(date +"%Y%m%d-%H%M%S")
report="security-audit-report-$timestamp.txt"

{
  echo "Security Audit Report - $timestamp"
  echo
  if run_audit "backend" "backend"; then
    echo
  else
    echo
  fi
  if run_audit "frontend" "frontend"; then
    echo
  else
    echo
  fi
} | tee "$report"

echo "Report saved to $report"
