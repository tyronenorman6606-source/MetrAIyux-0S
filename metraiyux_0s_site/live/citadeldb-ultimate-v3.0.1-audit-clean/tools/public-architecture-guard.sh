#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/public-architecture-guard-${STAMP}.txt"

FORBIDDEN='Neon|Supabase|CloudNativePG|cloudnativepg|neondatabase'

{
  echo "CitadelDB Public Architecture Guard"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
} > "$OUT"

matches="$(grep -RInE "$FORBIDDEN" \
  README.md PUBLIC_ARCHITECTURE.md brand site claims/PUBLIC_CLAIMS_PACK.md 2>/dev/null \
  | grep -v "INTERNAL_RESEARCH_POLICY" \
  | grep -v "PUBLIC_ENGINE_MAP" \
  | grep -v "CHANGELOG" \
  || true)"

if [ -n "$matches" ]; then
  echo "$matches" | tee -a "$OUT"
  echo "Public architecture guard: FAILED" | tee -a "$OUT"
  exit 1
fi

echo "Public architecture guard: PASS" | tee -a "$OUT"
