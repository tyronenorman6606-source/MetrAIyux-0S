#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

APP="${1:-}"
REASON="${2:-manual rollback recorded}"

if [ -z "$APP" ]; then
  echo "Usage: ./tools/record-rollback.sh <app-slug> [reason]" >&2
  exit 1
fi

mkdir -p proof
SAFE_APP="$(echo "$APP" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9_]+/_/g' | sed -E 's/^_+|_+$//g')"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/rollback-${SAFE_APP}-${STAMP}.txt"

{
  echo "CitadelDB Rollback Receipt"
  echo "App: ${SAFE_APP}"
  echo "Reason: ${REASON}"
  echo "Recorded: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "Operator must attach app smoke results below this line."
} | tee "$OUT"

echo "Rollback receipt written: $OUT"
