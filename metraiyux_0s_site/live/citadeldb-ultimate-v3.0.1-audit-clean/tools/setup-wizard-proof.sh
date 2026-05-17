#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/setup-wizard-proof-${STAMP}.txt"

{
  echo "CitadelDB Setup Wizard Proof"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "1. Required file checks"
  for file in SETUP_WIZARD.md release/SETUP_WIZARD_ACCEPTANCE.md operator-dashboard/server.mjs control-plane/gateway/src/server.mjs proof/browser/guided-dashboard.spec.mjs; do
    if [ -f "$file" ]; then echo "PASS: $file"; else echo "OPEN: missing $file"; exit 1; fi
  done
  echo
  echo "2. Route proof"
  ./tools/dashboard-route-proof.sh
  echo
  echo "3. Guided Ops proof"
  ./tools/guided-ops-proof.sh
  echo
  echo "Setup Wizard proof: PASS"
} | tee "$OUT"
