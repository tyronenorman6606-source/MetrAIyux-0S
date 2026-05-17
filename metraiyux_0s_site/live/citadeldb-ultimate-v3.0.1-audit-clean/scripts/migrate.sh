#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source ./scripts/lib/env.sh

APP="${1:-}"
MIGRATION_DIR="${2:-}"

if [ -z "$APP" ] || [ -z "$MIGRATION_DIR" ]; then
  echo "Usage: ./scripts/migrate.sh <app-slug> <migration-dir>" >&2
  exit 1
fi

SAFE_APP="$(echo "$APP" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9_]+/_/g' | sed -E 's/^_+|_+$//g')"
DB_NAME="${APP_DB_NAME_PREFIX}${SAFE_APP}"

mkdir -p proof
RECEIPT="proof/migrate-${SAFE_APP}-$(date -u +%Y%m%dT%H%M%SZ).txt"

{
  echo "CitadelDB Migration Receipt"
  echo "App: ${SAFE_APP}"
  echo "Database: ${DB_NAME}"
  echo "Migration Dir: ${MIGRATION_DIR}"
  echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee "$RECEIPT"

for file in "$MIGRATION_DIR"/*.sql; do
  [ -e "$file" ] || continue
  checksum="$(sha256sum "$file" | awk '{print $1}')"
  already="$(admin_psql -tAc "SELECT 1 FROM citadel.migration_receipts WHERE app_slug='${SAFE_APP}' AND migration_file='$(basename "$file")' AND checksum='${checksum}' AND success=true LIMIT 1;" | tr -d '[:space:]')"
  if [ "$already" = "1" ]; then
    echo "Skipping already-applied migration: $(basename "$file")" | tee -a "$RECEIPT"
    continue
  fi

  echo "Applying migration: $(basename "$file")" | tee -a "$RECEIPT"
  set +e
  output="$(psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -f "$file" 2>&1)"
  status=$?
  set -e

  if [ "$status" -eq 0 ]; then
    admin_psql -v ON_ERROR_STOP=1 <<SQL
INSERT INTO citadel.migration_receipts (app_slug, database_name, migration_file, checksum, success)
VALUES ('${SAFE_APP}', '${DB_NAME}', '$(basename "$file")', '${checksum}', true);
SQL
    echo "Applied: $(basename "$file") ${checksum}" | tee -a "$RECEIPT"
  else
    admin_psql -v ON_ERROR_STOP=1 <<SQL
INSERT INTO citadel.migration_receipts (app_slug, database_name, migration_file, checksum, success, error)
VALUES ('${SAFE_APP}', '${DB_NAME}', '$(basename "$file")', '${checksum}', false, \$ERR\$${output}\$ERR\$);
SQL
    echo "$output" | tee -a "$RECEIPT" >&2
    exit "$status"
  fi
done

echo "Finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)" | tee -a "$RECEIPT"
