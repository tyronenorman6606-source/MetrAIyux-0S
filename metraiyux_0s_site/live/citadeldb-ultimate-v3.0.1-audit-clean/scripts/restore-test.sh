#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source ./scripts/lib/env.sh

LATEST="$(find backups/manual backups -type f -name '*.dump' 2>/dev/null | sort | tail -n 1 || true)"
if [ -z "$LATEST" ]; then
  echo "No .dump backup found. Run ./scripts/backup-now.sh first." >&2
  exit 1
fi

TEST_DB="restore_test_$(date -u +%Y%m%d%H%M%S)"
CHECKSUM="$(sha256sum "${LATEST}" | awk '{print $1}')"
mkdir -p proof
RECEIPT="proof/restore-test-${TEST_DB}.txt"

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
INSERT INTO citadel.restore_receipts (backup_checksum, source_backup_path, target_database, finished_at, success, error)
VALUES ('${CHECKSUM}', '${LATEST}', '${TEST_DB}', now(), false, 'pg_restore failed');
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
VALUES ('${CHECKSUM}', '${LATEST}', '${TEST_DB}', now(), true, jsonb_build_object('receipt', '${RECEIPT}'));

INSERT INTO citadel.audit_events (actor, action, target, metadata)
VALUES ('script', 'restore_test_passed', '${TEST_DB}', jsonb_build_object('backup', '${LATEST}', 'sha256', '${CHECKSUM}', 'receipt', '${RECEIPT}'));
SQL

{
  echo
  echo "CitadelDB Restore Test: PASSED"
  echo "Backup: ${LATEST}"
  echo "SHA256: ${CHECKSUM}"
  echo "Temporary DB: ${TEST_DB}"
  echo "Finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee -a "$RECEIPT"
