#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source ./scripts/lib/env.sh

APP_SLUG="${1:-}"
if [ -z "$APP_SLUG" ]; then
  echo "Usage: ./scripts/restore-app-test.sh <app-slug>" >&2
  exit 1
fi

APP_SLUG="$(printf '%s' "$APP_SLUG" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9_]+/_/g; s/^_+|_+$//g')"
APP_DB="$(admin_psql -At -v ON_ERROR_STOP=1 -c "SELECT database_name FROM citadel.apps WHERE app_slug = '${APP_SLUG}' AND status = 'active' LIMIT 1;")"
if [ -z "$APP_DB" ]; then
  echo "No active app found for slug: ${APP_SLUG}" >&2
  exit 1
fi

LATEST="$(find "backups/apps/${APP_SLUG}" -type f -name '*.dump' 2>/dev/null | sort | tail -n 1 || true)"
if [ -z "$LATEST" ]; then
  echo "No app backup found for ${APP_SLUG}. Run ./scripts/backup-app.sh ${APP_SLUG} first." >&2
  exit 1
fi

TEST_DB="restore_${APP_SLUG}_$(date -u +%Y%m%d%H%M%S)"
CHECKSUM="$(sha256sum "${LATEST}" | awk '{print $1}')"
mkdir -p proof
RECEIPT="proof/app-restore-test-${APP_SLUG}-${TEST_DB}.txt"

admin_createdb "${TEST_DB}"

cleanup() {
  admin_dropdb --if-exists "${TEST_DB}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

set +e
pg_restore \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${TEST_DB}" \
  --no-owner \
  --no-acl \
  "${LATEST}" >"${RECEIPT}" 2>&1
status=$?
set -e

if [ "$status" -ne 0 ]; then
  admin_psql -v ON_ERROR_STOP=1 <<SQL
INSERT INTO citadel.restore_receipts (backup_checksum, source_backup_path, target_database, finished_at, success, error, metadata)
VALUES ('${CHECKSUM}', '${LATEST}', '${TEST_DB}', now(), false, 'pg_restore failed', jsonb_build_object('appSlug', '${APP_SLUG}', 'sourceDatabase', '${APP_DB}'));
SQL
  cat "$RECEIPT" >&2
  exit "$status"
fi

psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${TEST_DB}" -v ON_ERROR_STOP=1 -c "SELECT 1;" >>"${RECEIPT}"

admin_psql -v ON_ERROR_STOP=1 <<SQL
UPDATE citadel.backup_receipts
SET restore_tested_at = now(),
    restore_test_status = 'passed'
WHERE checksum = '${CHECKSUM}';

INSERT INTO citadel.restore_receipts (backup_checksum, source_backup_path, target_database, finished_at, success, metadata)
VALUES ('${CHECKSUM}', '${LATEST}', '${TEST_DB}', now(), true, jsonb_build_object('appSlug', '${APP_SLUG}', 'sourceDatabase', '${APP_DB}', 'receipt', '${RECEIPT}'));

INSERT INTO citadel.audit_events (actor, action, target, metadata)
VALUES ('script', 'app_restore_test_passed', '${APP_SLUG}', jsonb_build_object('backup', '${LATEST}', 'sha256', '${CHECKSUM}', 'receipt', '${RECEIPT}', 'temporaryDatabase', '${TEST_DB}'));
SQL

{
  echo
  echo "CitadelDB App Restore Test: PASSED"
  echo "App: ${APP_SLUG}"
  echo "Source database: ${APP_DB}"
  echo "Backup: ${LATEST}"
  echo "SHA256: ${CHECKSUM}"
  echo "Temporary DB: ${TEST_DB}"
  echo "Finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee -a "$RECEIPT"
