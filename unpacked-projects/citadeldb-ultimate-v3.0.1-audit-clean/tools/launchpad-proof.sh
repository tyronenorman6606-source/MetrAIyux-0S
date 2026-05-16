#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/launchpad-proof-${STAMP}.txt"

{
  echo "CitadelDB Launchpad Proof"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "1. Required source checks"
  for file in DATABASE_LAUNCHPAD.md docs/NO_CODE_DATABASE_OPERATIONS.md release/LAUNCHPAD_ACCEPTANCE.md control-plane/gateway/src/appConnection.mjs control-plane/gateway/src/ai.mjs operator-dashboard/server.mjs; do
    if [ -f "$file" ]; then echo "PASS: $file"; else echo "OPEN: missing $file"; exit 1; fi
  done
  echo
  echo "2. Route checks"
  grep -q "/launchpad" operator-dashboard/server.mjs && echo "PASS: dashboard launchpad routes" || { echo "OPEN: launchpad routes missing"; exit 1; }
  grep -q "/admin/database/test-url" control-plane/gateway/src/server.mjs && echo "PASS: gateway database test route" || { echo "OPEN: database test route missing"; exit 1; }
  grep -q "rotate-credential" control-plane/gateway/src/server.mjs && echo "PASS: credential rotation route" || { echo "OPEN: rotate credential route missing"; exit 1; }
  echo
  echo "3. Public surface scan"
  ./tools/public-surface-scan.sh
  echo
  echo "Launchpad proof: PASS"
} | tee "$OUT"
