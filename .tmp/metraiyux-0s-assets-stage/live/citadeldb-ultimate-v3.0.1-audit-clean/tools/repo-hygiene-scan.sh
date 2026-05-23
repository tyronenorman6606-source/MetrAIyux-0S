#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/repo-hygiene-${STAMP}.txt"
OPEN=0

record_open() { echo "OPEN: $1" | tee -a "$OUT"; OPEN=$((OPEN + 1)); }
record_pass() { echo "PASS: $1" | tee -a "$OUT"; }

{
  echo "CitadelDB Repo Hygiene Scan"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
} > "$OUT"

for file in README.md VERSION PUBLIC_ARCHITECTURE.md brand/BRAND_CONFIG.json claims/CLAIMS_LEDGER.md claims/PUBLIC_CLAIMS_PACK.md; do
  [ -f "$file" ] && record_pass "required file ${file}" || record_open "missing required file ${file}"
done

if grep -RIn "TODO\|FIXME\|lorem ipsum" README.md PUBLIC_ARCHITECTURE.md docs architecture site operator-dashboard claims 2>/dev/null >/tmp/citadel_hygiene_matches.txt; then
  cat /tmp/citadel_hygiene_matches.txt | tee -a "$OUT"
  record_open "public/doc placeholder markers found"
else
  record_pass "no public placeholder markers"
fi

if grep -RInE "0\.0\.0\.0:5432:5432|5432:5432" deploy 2>/dev/null | grep -v "127.0.0.1" >/tmp/citadel_port_matches.txt; then
  cat /tmp/citadel_port_matches.txt | tee -a "$OUT"
  record_open "possible public Postgres bind"
else
  record_pass "no obvious public Postgres bind"
fi

if [ "$OPEN" -eq 0 ]; then
  echo "Repo hygiene: PASS" | tee -a "$OUT"
else
  echo "Repo hygiene: OPEN_FINDINGS=${OPEN}" | tee -a "$OUT"
  exit 1
fi
