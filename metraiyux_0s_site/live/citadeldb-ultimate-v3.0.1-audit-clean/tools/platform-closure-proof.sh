#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/platform-closure-proof-${STAMP}.txt"

{
  echo "CitadelDB Platform Closure Proof"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "1. Required file checks"
  for file in PLATFORM_CLOSURE.md docs/SELLABLE_DATABASE_PLATFORM_LEDGER.md release/PLATFORM_CLOSURE_ACCEPTANCE.md migrations/citadel-core/005_platform_accounts_billing_usage.sql control-plane/gateway/src/platformQuota.mjs operator-dashboard/server.mjs; do
    if [ -f "$file" ]; then echo "PASS: $file"; else echo "OPEN: missing $file"; exit 1; fi
  done
  echo
  echo "2. Route checks"
  grep -q "/platform" operator-dashboard/server.mjs && echo "PASS: platform dashboard route" || { echo "OPEN: platform route missing"; exit 1; }
  grep -q "/table-browser" operator-dashboard/server.mjs && echo "PASS: table browser dashboard route" || { echo "OPEN: table browser route missing"; exit 1; }
  grep -q "/admin/platform/plans" control-plane/gateway/src/server.mjs && echo "PASS: platform plans endpoint" || { echo "OPEN: platform plans endpoint missing"; exit 1; }
  grep -q "/table-preview" control-plane/gateway/src/server.mjs && echo "PASS: table preview endpoint" || { echo "OPEN: table preview endpoint missing"; exit 1; }
  echo
  echo "3. Self-service proof"
  ./tools/self-service-console-proof.sh
  echo
  echo "Platform closure proof: PASS"
} | tee "$OUT"
