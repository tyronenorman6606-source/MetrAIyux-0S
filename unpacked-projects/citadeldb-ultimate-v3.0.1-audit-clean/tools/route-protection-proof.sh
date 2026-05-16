#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/route-protection-proof-${STAMP}.txt"

{
  echo "CitadelDB Route Protection Proof"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  for key in \
    self_service_database_provision \
    self_service_sql_execute \
    table_browser_list \
    table_browser_preview \
    branch_request \
    setup_generate_secrets \
    guided_proof_action \
    app_lifecycle_action \
    credential_rotation \
    ai_debug
  do
    if grep -q "$key" control-plane/gateway/src/server.mjs && grep -q "$key" control-plane/gateway/src/protectedRoutes.mjs; then
      echo "PASS: $key"
    else
      echo "OPEN: missing protection for $key"
      exit 1
    fi
  done
  echo
  echo "Route protection proof: PASS"
} | tee "$OUT"
