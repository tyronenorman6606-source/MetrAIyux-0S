#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

DUMP="${1:-exports/neon/neon-export-latest.dump}"
if [ -z "${CITADEL_TARGET_DATABASE_URL:-}" ]; then echo "Missing CITADEL_TARGET_DATABASE_URL" >&2; exit 1; fi
if [ ! -f "$DUMP" ]; then echo "Dump not found: $DUMP" >&2; exit 1; fi

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RECEIPT="proof/neon-restore-${STAMP}.txt"

pg_restore "$DUMP" --dbname="$CITADEL_TARGET_DATABASE_URL" --no-owner --no-acl --clean --if-exists 2>&1 | tee "$RECEIPT"
echo "Restore completed: $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "$RECEIPT"
