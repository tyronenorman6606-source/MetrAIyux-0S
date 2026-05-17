#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/guided-ops-proof-${STAMP}.txt"

{
  echo "CitadelDB Guided Ops Proof"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "1. Required file checks"
  for file in FIRST_RUN_GUIDE.md docs/GUIDED_OPS.md release/GUIDED_OPS_ACCEPTANCE.md operator-dashboard/server.mjs control-plane/gateway/src/server.mjs; do
    if [ -f "$file" ]; then echo "PASS: $file"; else echo "OPEN: missing $file"; exit 1; fi
  done
  echo
  echo "2. Route checks"
  grep -q "/onboarding" operator-dashboard/server.mjs && echo "PASS: onboarding route" || { echo "OPEN: onboarding route missing"; exit 1; }
  grep -q "/guided" operator-dashboard/server.mjs && echo "PASS: guided route" || { echo "OPEN: guided route missing"; exit 1; }
  grep -q "/admin/guided/setup-checklist" control-plane/gateway/src/server.mjs && echo "PASS: setup checklist endpoint" || { echo "OPEN: setup checklist endpoint missing"; exit 1; }
  grep -q "/admin/guided/diagnostic-bundle" control-plane/gateway/src/server.mjs && echo "PASS: diagnostic endpoint" || { echo "OPEN: diagnostic endpoint missing"; exit 1; }
  echo
  echo "3. Launchpad proof"
  ./tools/launchpad-proof.sh
  echo
  echo "Guided Ops proof: PASS"
} | tee "$OUT"
