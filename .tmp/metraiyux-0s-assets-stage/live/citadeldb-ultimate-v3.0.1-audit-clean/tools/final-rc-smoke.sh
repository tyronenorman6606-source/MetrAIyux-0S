#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/final-rc-smoke-${STAMP}.txt"

{
  echo "CitadelDB Final RC Smoke"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "1. Architecture guard"
  ./tools/public-architecture-guard.sh
  echo
  echo "2. Public surface scan"
  ./tools/public-surface-scan.sh
  echo
  echo "3. Repo hygiene scan"
  ./tools/repo-hygiene-scan.sh
  echo
  echo "4. Package integrity"
  ./tools/package-integrity-proof.sh
  echo
  echo "5. Release manifest"
  ./tools/generate-release-manifest.sh 1.0.0-rc.1
  echo
  echo "Final RC smoke: PASS"
} | tee "$OUT"
