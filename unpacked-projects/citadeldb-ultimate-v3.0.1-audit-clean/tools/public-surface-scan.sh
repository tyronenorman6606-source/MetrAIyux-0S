#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/public-surface-scan-${STAMP}.txt"
OPEN=0

{
  echo "CitadelDB Public Surface Scan"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
} > "$OUT"

SURFACES="README.md PUBLIC_ARCHITECTURE.md docs/PRODUCT_ONE_PAGER.md docs/AI_SEARCH_SUMMARY.md claims/PUBLIC_CLAIMS_PACK.md site operator-dashboard"

if grep -RInE "fully production deployed|automatic failover proven|PITR proven|enterprise-ready live HA|complete hosted database replacement" $SURFACES 2>/dev/null >/tmp/citadel_public_surface_hits.txt; then
  cat /tmp/citadel_public_surface_hits.txt | tee -a "$OUT"
  echo "OPEN: unsafe public claim wording found" | tee -a "$OUT"
  OPEN=$((OPEN + 1))
else
  echo "PASS: unsafe claim wording absent" | tee -a "$OUT"
fi

if grep -RInE "Skyes Over London|SoveReign13|SOLEnterprises" README.md PUBLIC_ARCHITECTURE.md docs/PRODUCT_ONE_PAGER.md site operator-dashboard 2>/dev/null >/tmp/citadel_brand_hits.txt; then
  echo "PASS: brand mentions present" | tee -a "$OUT"
else
  echo "OPEN: brand mentions missing from public surfaces" | tee -a "$OUT"
  OPEN=$((OPEN + 1))
fi

if [ "$OPEN" -eq 0 ]; then
  echo "Public surface scan: PASS" | tee -a "$OUT"
else
  echo "Public surface scan: OPEN_FINDINGS=${OPEN}" | tee -a "$OUT"
  exit 1
fi
