#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source ./scripts/lib/env.sh

mkdir -p backups/manual proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="backups/manual/${POSTGRES_DB}-${STAMP}.dump"

pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="${OUT}"

SIZE="$(wc -c < "${OUT}" | tr -d ' ')"
CHECKSUM="$(sha256sum "${OUT}" | awk '{print $1}')"

admin_psql -v ON_ERROR_STOP=1 <<SQL
INSERT INTO citadel.backup_receipts (backup_kind, backup_path, database_name, size_bytes, checksum)
VALUES ('manual', '${OUT}', '${POSTGRES_DB}', ${SIZE}, '${CHECKSUM}');

INSERT INTO citadel.audit_events (actor, action, target, metadata)
VALUES ('script', 'backup_now', '${POSTGRES_DB}', jsonb_build_object('path', '${OUT}', 'sha256', '${CHECKSUM}', 'size_bytes', ${SIZE}));
SQL

RECEIPT="proof/backup-${POSTGRES_DB}-${STAMP}.txt"
{
  echo "CitadelDB Backup Receipt"
  echo "Database: ${POSTGRES_DB}"
  echo "Path: ${OUT}"
  echo "Size: ${SIZE}"
  echo "SHA256: ${CHECKSUM}"
  echo "Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee "$RECEIPT"
