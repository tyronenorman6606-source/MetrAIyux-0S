#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/truth-correction-proof-${STAMP}.txt"

{
  echo "CitadelDB Truth Correction Proof"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "1. Hard proof truth scan"
  ./tools/hard-proof-truth-scan.sh
  echo
  echo "2. Live gate hardening proof"
  ./tools/live-gate-hardening-proof.sh
  echo
  echo "Truth correction proof: PASS"
} | tee "$OUT"
