#!/usr/bin/env bash
set -euo pipefail
mkdir -p scripts/reports
OUT="scripts/reports/client-readiness-$(date +%Y%m%d-%H%M%S).md"
{
  echo "# Client Readiness Report"
  echo
  echo "Generated: $(date -Iseconds)"
  echo
  echo "## Docker services"
  docker compose ps || true
  echo
  echo "## Live env placeholder scan"
  if grep -In "CHANGE_ME\|REPLACE_ME\|example.com\|change-me" .env 2>/dev/null; then
    echo
    echo "Placeholders found in live .env. Production is not ready until these are replaced."
  else
    echo "No common placeholders found in live .env."
  fi
  echo
  echo "Note: example files and compose fallback defaults intentionally contain placeholders."
  echo
  echo "## Route smoke"
  bash scripts/smoke.sh || true
} > "$OUT"
echo "$OUT"
