#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/dashboard-route-proof-${STAMP}.txt"

{
  echo "CitadelDB Dashboard Route Proof"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "Dashboard route source checks"
  for route in "/setup-wizard" "/onboarding" "/guided" "/guided/diagnostics" "/launchpad" "/ai-debug"; do
    if grep -q "$route" operator-dashboard/server.mjs; then
      echo "PASS: $route"
    else
      echo "OPEN: missing $route"
      exit 1
    fi
  done
  echo
  echo "Gateway setup endpoint source checks"
  for endpoint in "/admin/setup/env-readiness" "/admin/setup/generate-secrets" "/admin/setup/plan"; do
    if grep -q "$endpoint" control-plane/gateway/src/server.mjs; then
      echo "PASS: $endpoint"
    else
      echo "OPEN: missing $endpoint"
      exit 1
    fi
  done
  echo
  echo "Dashboard route proof: PASS"
} | tee "$OUT"
