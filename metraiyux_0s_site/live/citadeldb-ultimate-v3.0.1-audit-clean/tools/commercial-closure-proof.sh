#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/commercial-closure-proof-${STAMP}.txt"

{
  echo "CitadelDB Commercial Closure Proof"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "1. Required file checks"
  for file in COMMERCIAL_CONTROL_PLANE.md DATABASE_BRANCHING.md docs/NEON_PARITY_CLOSURE_LEDGER.md release/COMMERCIAL_CLOSURE_ACCEPTANCE.md migrations/citadel-core/006_commercial_control_plane.sql control-plane/gateway/src/commercial.mjs control-plane/gateway/src/platformAuth.mjs operator-dashboard/server.mjs; do
    if [ -f "$file" ]; then echo "PASS: $file"; else echo "OPEN: missing $file"; exit 1; fi
  done
  echo
  echo "2. Route checks"
  grep -q "/commercial" operator-dashboard/server.mjs && echo "PASS: commercial dashboard route" || { echo "OPEN: commercial route missing"; exit 1; }
  grep -q "/branches" operator-dashboard/server.mjs && echo "PASS: branches dashboard route" || { echo "OPEN: branches route missing"; exit 1; }
  grep -q "/webhooks/stripe" control-plane/gateway/src/server.mjs && echo "PASS: Stripe webhook route" || { echo "OPEN: Stripe webhook route missing"; exit 1; }
  grep -q "/admin/commercial/entitlements" control-plane/gateway/src/server.mjs && echo "PASS: entitlement endpoint" || { echo "OPEN: entitlement endpoint missing"; exit 1; }
  grep -q "branch-request" control-plane/gateway/src/server.mjs && echo "PASS: branch request endpoint" || { echo "OPEN: branch request endpoint missing"; exit 1; }
  echo
  echo "3. Platform closure proof"
  ./tools/platform-closure-proof.sh
  echo
  echo "Commercial closure proof: PASS"
} | tee "$OUT"
