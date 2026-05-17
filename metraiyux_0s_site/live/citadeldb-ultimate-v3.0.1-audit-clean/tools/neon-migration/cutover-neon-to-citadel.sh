#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

APP="${1:-}"
if [ -z "$APP" ]; then
  echo "Usage: ./tools/neon-migration/cutover-neon-to-citadel.sh <app-slug>" >&2
  exit 1
fi

if [ -z "${NEON_DATABASE_URL:-}" ] || [ -z "${CITADEL_TARGET_DATABASE_URL:-}" ]; then
  echo "Missing NEON_DATABASE_URL or CITADEL_TARGET_DATABASE_URL" >&2
  exit 1
fi

SAFE_APP="$(echo "$APP" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9_]+/_/g' | sed -E 's/^_+|_+$//g')"
mkdir -p proof exports/cutovers
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RECEIPT="proof/cutover-${SAFE_APP}-${STAMP}.txt"

{
  echo "CitadelDB Neon Cutover Receipt"
  echo "App: ${SAFE_APP}"
  echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "Step 1: Dump Neon"
} | tee "$RECEIPT"

./tools/neon-migration/dump-neon.sh 2>&1 | tee -a "$RECEIPT"

{
  echo
  echo "Step 2: Restore to Citadel"
} | tee -a "$RECEIPT"

./tools/neon-migration/restore-to-citadel.sh exports/neon/neon-export-latest.dump 2>&1 | tee -a "$RECEIPT"

{
  echo
  echo "Step 3: Verify counts"
} | tee -a "$RECEIPT"

./tools/neon-migration/verify-counts.sh 2>&1 | tee -a "$RECEIPT"

{
  echo
  echo "Finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Manual next step: change app DATABASE_URL and run app write smoke."
} | tee -a "$RECEIPT"

echo "Cutover receipt written: $RECEIPT"
