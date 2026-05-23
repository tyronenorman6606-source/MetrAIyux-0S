#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/policy-check-${STAMP}.txt"

{
  echo "CitadelDB Policy Check"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "Checking required policy docs and claim controls..."
  for file in OVERCLAIM_AUDIT.md docs/PROTECTED_ROUTE_REGISTRY.md docs/CLOSURE_TRUTH_LEDGER.md claims/CLAIMS_LEDGER.md; do
    if [ -f "$file" ]; then echo "PASS: $file"; else echo "OPEN: missing $file"; exit 1; fi
  done
  echo
  echo "Checking protected route guard strings..."
  for key in self_service_database_provision self_service_sql_execute table_browser_list table_browser_preview branch_request; do
    if grep -q "$key" control-plane/gateway/src/server.mjs; then echo "PASS: $key"; else echo "OPEN: missing $key"; exit 1; fi
  done
  echo
  echo "Policy check: PASS"
} | tee "$OUT"
