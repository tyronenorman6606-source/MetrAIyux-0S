#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/webapp-proof-${STAMP}.txt"

{
  echo "CitadelDB Web/App Proof"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "1. Site build"
  cd site
  npm install
  npm run build
  cd ..
  echo
  echo "2. Required assets"
  for file in brand/assets/citadeldb-ultimate-logo.png site/dist/index.html site/dist/manifest.webmanifest operator-dashboard/public/assets/citadeldb-ultimate-logo.png; do
    if [ -f "$file" ]; then echo "PASS: $file"; else echo "OPEN: missing $file"; exit 1; fi
  done
  echo
  echo "3. Public surface scan"
  ./tools/public-surface-scan.sh
  echo
  echo "Web/app proof: PASS"
} | tee "$OUT"
