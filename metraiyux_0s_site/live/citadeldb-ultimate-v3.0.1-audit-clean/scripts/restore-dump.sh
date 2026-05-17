#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source ./scripts/lib/env.sh

DUMP="${1:-}"
TARGET_DB="${2:-}"
if [ -z "$DUMP" ] || [ -z "$TARGET_DB" ]; then echo "Usage: ./scripts/restore-dump.sh <dump-file> <target-db>" >&2; exit 1; fi
if [ ! -f "$DUMP" ]; then echo "Dump file not found: $DUMP" >&2; exit 1; fi

if ! psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -tAc "SELECT 1 FROM pg_database WHERE datname='${TARGET_DB}'" | grep -q 1; then
  admin_createdb "${TARGET_DB}"
fi

pg_restore -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${TARGET_DB}" --no-owner --no-acl --clean --if-exists "${DUMP}"
echo "Restore complete into database: ${TARGET_DB}"
