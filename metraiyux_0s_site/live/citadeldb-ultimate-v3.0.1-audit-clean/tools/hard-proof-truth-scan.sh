#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/hard-proof-truth-scan-${STAMP}.txt"

{
  echo "CitadelDB Hard Proof Truth Scan"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "Scanning for banned public parity claims..."
  banned=0
  if grep -RIn --exclude-dir=node_modules --exclude-dir=.git -E "CitadelDB is better than Neon|CitadelDB is fully better than Neon|Neon replacement complete|fully hosted Neon replacement|full Neon parity" README.md site docs claims release 2>/dev/null; then
    banned=1
  fi
  if [ "$banned" -eq 1 ]; then
    echo "OPEN: banned overclaim language found"
    exit 1
  fi
  echo "PASS: no banned Neon parity claims found in public/doc claim surfaces"
  echo
  echo "Required correction files"
  for file in OVERCLAIM_AUDIT.md docs/PROTECTED_ROUTE_REGISTRY.md docs/CLOSURE_TRUTH_LEDGER.md tools/branch-clone-worker.sh control-plane/gateway/src/protectedRoutes.mjs; do
    if [ -f "$file" ]; then echo "PASS: $file"; else echo "OPEN: missing $file"; exit 1; fi
  done
  echo
  echo "Guard hook checks"
  grep -q "self_service_sql_execute" control-plane/gateway/src/server.mjs && echo "PASS: SQL route has paid guard hook" || { echo "OPEN: SQL guard missing"; exit 1; }
  grep -q "table_browser_list" control-plane/gateway/src/server.mjs && echo "PASS: table list route has paid guard hook" || { echo "OPEN: table list guard missing"; exit 1; }
  grep -q "table_browser_preview" control-plane/gateway/src/server.mjs && echo "PASS: table preview route has paid guard hook" || { echo "OPEN: table preview guard missing"; exit 1; }
  grep -q "branch_request" control-plane/gateway/src/server.mjs && echo "PASS: branch request route has paid guard hook" || { echo "OPEN: branch request guard missing"; exit 1; }
  grep -q "req.rawBody" control-plane/gateway/src/server.mjs && echo "PASS: raw body capture present for webhook verification" || { echo "OPEN: raw body capture missing"; exit 1; }
  echo
  echo "Hard proof truth scan: PASS"
} | tee "$OUT"
