#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/first-production-pass-${STAMP}.txt"

{
  echo "CitadelDB First Production Pass"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "1. Validate env"
  ./cli/citadel validate-env
  echo
  echo "2. Health"
  ./cli/citadel health
  echo
  echo "3. Policy check"
  ./cli/citadel policy-check
  echo
  echo "4. Backup"
  ./cli/citadel backup-now
  echo
  echo "5. Restore test"
  ./cli/citadel restore-test
  echo
  echo "6. Backup manifest"
  ./cli/citadel backup-manifest
  echo
  echo "7. Service catalog export"
  ./cli/citadel service-catalog-export || true
  echo
  echo "8. Architecture guard"
  ./cli/citadel architecture-guard
  echo
  echo "First production pass finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee "$OUT"

echo "First production pass receipt: $OUT"
