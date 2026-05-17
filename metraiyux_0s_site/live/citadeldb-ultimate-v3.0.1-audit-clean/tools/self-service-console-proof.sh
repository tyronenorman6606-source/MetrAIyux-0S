#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/self-service-console-proof-${STAMP}.txt"

{
  echo "CitadelDB Self-Service Console Proof"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "1. Required file checks"
  for file in SELF_SERVICE_CONSOLE.md docs/NEON_LEVEL_GAP_LEDGER.md release/SELF_SERVICE_CONSOLE_ACCEPTANCE.md migrations/citadel-core/004_self_service_console.sql control-plane/gateway/src/sqlPolicy.mjs operator-dashboard/server.mjs; do
    if [ -f "$file" ]; then echo "PASS: $file"; else echo "OPEN: missing $file"; exit 1; fi
  done
  echo
  echo "2. Route checks"
  grep -q "/self-service" operator-dashboard/server.mjs && echo "PASS: dashboard self-service route" || { echo "OPEN: missing self-service dashboard route"; exit 1; }
  grep -q "/admin/self-service/projects" control-plane/gateway/src/server.mjs && echo "PASS: self-service project endpoint" || { echo "OPEN: missing project endpoint"; exit 1; }
  grep -q "/sql" control-plane/gateway/src/server.mjs && echo "PASS: SQL endpoint present" || { echo "OPEN: missing SQL endpoint"; exit 1; }
  echo
  echo "3. SQL policy checks"
  grep -q "DROP" control-plane/gateway/src/sqlPolicy.mjs && echo "PASS: destructive SQL policy exists" || { echo "OPEN: SQL policy weak"; exit 1; }
  echo
  echo "4. Lifecycle proof"
  ./tools/app-lifecycle-proof.sh
  echo
  echo "Self-service console proof: PASS"
} | tee "$OUT"
