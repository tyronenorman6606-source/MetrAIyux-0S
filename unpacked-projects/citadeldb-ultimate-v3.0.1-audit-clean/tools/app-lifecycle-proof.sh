#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/app-lifecycle-proof-${STAMP}.txt"

{
  echo "CitadelDB App Lifecycle Proof"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "1. Required file checks"
  for file in APP_LIFECYCLE.md docs/APP_MIGRATION_RUNBOOK.md release/APP_LIFECYCLE_ACCEPTANCE.md operator-dashboard/server.mjs control-plane/gateway/src/server.mjs; do
    if [ -f "$file" ]; then echo "PASS: $file"; else echo "OPEN: missing $file"; exit 1; fi
  done
  echo
  echo "2. Route checks"
  grep -q "/app-lifecycle" operator-dashboard/server.mjs && echo "PASS: dashboard app lifecycle route" || { echo "OPEN: missing app lifecycle route"; exit 1; }
  grep -q "/admin/apps/:appSlug/migration-plan" control-plane/gateway/src/server.mjs && echo "PASS: migration plan endpoint" || { echo "OPEN: missing migration plan endpoint"; exit 1; }
  grep -q "/admin/apps/:appSlug/lifecycle-action" control-plane/gateway/src/server.mjs && echo "PASS: lifecycle action endpoint" || { echo "OPEN: missing lifecycle action endpoint"; exit 1; }
  grep -q "/admin/apps/:appSlug/rollback-packet" control-plane/gateway/src/server.mjs && echo "PASS: rollback packet endpoint" || { echo "OPEN: missing rollback endpoint"; exit 1; }
  echo
  echo "3. App onboarding proof"
  ./tools/app-onboarding-proof.sh
  echo
  echo "App lifecycle proof: PASS"
} | tee "$OUT"
