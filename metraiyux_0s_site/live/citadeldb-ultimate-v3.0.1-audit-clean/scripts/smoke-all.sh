#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
OUT="proof/smoke-all-$(date -u +%Y%m%dT%H%M%SZ).txt"

{
  echo "CitadelDB Smoke-All"
  echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "1. Health"
  ./scripts/healthcheck.sh
  echo
  echo "2. Provision smoke app"
  ./scripts/create-app-db.sh smoke_app
  echo
  echo "3. Migrate smoke app"
  ./scripts/migrate.sh smoke_app migrations/smoke-app
  echo
  echo "4. Backup"
  ./scripts/backup-now.sh
  echo
  echo "5. Restore test"
  ./scripts/restore-test.sh
  echo
  echo "Finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee "$OUT"

echo "Smoke receipt written: $OUT"
