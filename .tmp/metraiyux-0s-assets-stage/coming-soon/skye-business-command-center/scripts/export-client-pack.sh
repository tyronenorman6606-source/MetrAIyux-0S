#!/usr/bin/env bash
set -euo pipefail
CLIENT="${1:-client}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="exports/${CLIENT}-handoff-${STAMP}"
mkdir -p "$OUT"
cp docs/CLIENT_HANDOFF.md "$OUT/CLIENT_HANDOFF.md"
cp docs/MAINTENANCE_RUNBOOK.md "$OUT/MAINTENANCE_RUNBOOK.md"
cp docs/ACCEPTANCE_TEST_PLAN.md "$OUT/ACCEPTANCE_TEST_PLAN.md"
cp docs/SECURITY_BASELINE.md "$OUT/SECURITY_BASELINE.md"
cp -r templates "$OUT/templates"
( cd "exports" && zip -qr "${CLIENT}-handoff-${STAMP}.zip" "${CLIENT}-handoff-${STAMP}" )
echo "Created exports/${CLIENT}-handoff-${STAMP}.zip"
