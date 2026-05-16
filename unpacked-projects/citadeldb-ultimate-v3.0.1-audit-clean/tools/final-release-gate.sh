#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof release
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/final-release-gate-${STAMP}.txt"
OPEN=0

pass() { echo "PASS: $1" | tee -a "$OUT"; }
open() { echo "OPEN: $1" | tee -a "$OUT"; OPEN=$((OPEN + 1)); }

{
  echo "CitadelDB Final Release Gate"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Version: $(cat VERSION 2>/dev/null || echo missing)"
  echo
} > "$OUT"

[ "$(cat VERSION 2>/dev/null)" = "1.0.0" ] && pass "VERSION is 1.0.0" || open "VERSION is not 1.0.0"

for file in \
  README.md \
  PUBLIC_ARCHITECTURE.md \
  brand/BRAND_CONFIG.json \
  architecture/CITADELDB_SOVEREIGN_ARCHITECTURE.md \
  claims/PUBLIC_CLAIMS_PACK.md \
  claims/FINAL_PROOF_GAP_LEDGER.md \
  release/FINAL_RELEASE_NOTES.md \
  release/FINAL_GO_NO_GO.md \
  docs/PRODUCTION_INSTALL_QUICKSTART.md; do
  [ -f "$file" ] && pass "required file ${file}" || open "missing ${file}"
done

if ./tools/public-architecture-guard.sh >/tmp/citadel_arch_guard.log 2>&1; then
  pass "public architecture guard"
else
  cat /tmp/citadel_arch_guard.log | tee -a "$OUT"
  open "public architecture guard failed"
fi

if ./tools/public-surface-scan.sh >/tmp/citadel_public_scan.log 2>&1; then
  pass "public surface scan"
else
  cat /tmp/citadel_public_scan.log | tee -a "$OUT"
  open "public surface scan failed"
fi

if ./tools/repo-hygiene-scan.sh >/tmp/citadel_hygiene.log 2>&1; then
  pass "repo hygiene scan"
else
  cat /tmp/citadel_hygiene.log | tee -a "$OUT"
  open "repo hygiene scan failed"
fi

if ./tools/package-integrity-proof.sh >/tmp/citadel_integrity.log 2>&1; then
  pass "package integrity proof"
else
  cat /tmp/citadel_integrity.log | tee -a "$OUT"
  open "package integrity proof failed"
fi

if ./tools/skygate-bridge-proof.sh >/tmp/citadel_skygate_bridge.log 2>&1; then
  pass "Skyegate bridge proof"
else
  cat /tmp/citadel_skygate_bridge.log | tee -a "$OUT"
  open "Skyegate bridge proof failed"
fi

./tools/generate-release-manifest.sh 1.0.0 >/tmp/citadel_release_manifest.log 2>&1 && pass "release manifest generated" || open "release manifest failed"

echo >> "$OUT"
if [ "$OPEN" -eq 0 ]; then
  echo "Final release gate: PASS" | tee -a "$OUT"
else
  echo "Final release gate: OPEN_FINDINGS=${OPEN}" | tee -a "$OUT"
  exit 1
fi
