#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/release-self-audit-${STAMP}.txt"

{
  echo "CitadelDB Release Self-Audit"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "1. Public architecture guard"
  ./tools/public-architecture-guard.sh
  echo
  echo "2. Required file checks"
  for file in brand/BRAND_CONFIG.json PUBLIC_ARCHITECTURE.md architecture/CITADELDB_SOVEREIGN_ARCHITECTURE.md docs/PRODUCT_ONE_PAGER.md claims/PUBLIC_CLAIMS_PACK.md site/build.mjs; do
    if [ -f "$file" ]; then echo "PASS: $file"; else echo "OPEN: missing $file"; exit 1; fi
  done
  echo
  echo "3. Release manifest"
  ./tools/generate-release-manifest.sh 0.8.0
  echo
  echo "Release self-audit: PASS"
} | tee "$OUT"
