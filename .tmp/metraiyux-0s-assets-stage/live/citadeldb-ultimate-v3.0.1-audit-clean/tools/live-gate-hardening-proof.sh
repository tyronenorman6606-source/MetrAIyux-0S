#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/live-gate-hardening-proof-${STAMP}.txt"

{
  echo "CitadelDB Live Gate Hardening Proof"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "1. Required file checks"
  for file in LIVE_GATE_HARDENING.md docs/PAID_ROUTE_ENFORCEMENT.md release/LIVE_GATE_ACCEPTANCE.md migrations/citadel-core/007_live_gate_hardening.sql control-plane/gateway/src/liveGate.mjs operator-dashboard/server.mjs; do
    if [ -f "$file" ]; then echo "PASS: $file"; else echo "OPEN: missing $file"; exit 1; fi
  done
  echo
  echo "2. Route and guard checks"
  grep -q "/live-gates" operator-dashboard/server.mjs && echo "PASS: live gates dashboard route" || { echo "OPEN: missing live gates route"; exit 1; }
  grep -q "/admin/live-gates/status" control-plane/gateway/src/server.mjs && echo "PASS: live gates status endpoint" || { echo "OPEN: missing live gates status"; exit 1; }
  grep -q "self_service_database_provision" control-plane/gateway/src/server.mjs && echo "PASS: self-service provision guard hook" || { echo "OPEN: missing provision guard hook"; exit 1; }
  grep -q "query_execution" control-plane/gateway/src/server.mjs && echo "PASS: SQL usage recording hook" || { echo "OPEN: missing usage recording hook"; exit 1; }
  grep -q "branch_receipts" control-plane/gateway/src/server.mjs && echo "PASS: branch receipt endpoints" || { echo "OPEN: missing branch receipts"; exit 1; }
  echo
  echo "3. Commercial closure proof"
  ./tools/commercial-closure-proof.sh
  echo
  echo "Live gate hardening proof: PASS"
} | tee "$OUT"
