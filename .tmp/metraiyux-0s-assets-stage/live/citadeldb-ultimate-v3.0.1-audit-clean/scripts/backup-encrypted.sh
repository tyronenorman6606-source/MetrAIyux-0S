#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source ./scripts/lib/env.sh

if [ -z "${BACKUP_ENCRYPTION_PASSWORD:-}" ]; then
  echo "Missing BACKUP_ENCRYPTION_PASSWORD in .env" >&2
  exit 1
fi

mkdir -p backups/encrypted proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RAW="backups/encrypted/${POSTGRES_DB}-${STAMP}.dump"
ENC="${RAW}.enc"

pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="${RAW}"

openssl enc -aes-256-cbc -salt -pbkdf2 \
  -in "${RAW}" \
  -out "${ENC}" \
  -pass "env:BACKUP_ENCRYPTION_PASSWORD"

rm -f "${RAW}"

SIZE="$(wc -c < "${ENC}" | tr -d ' ')"
CHECKSUM="$(sha256sum "${ENC}" | awk '{print $1}')"

admin_psql -v ON_ERROR_STOP=1 <<SQL
INSERT INTO citadel.backup_receipts (backup_kind, backup_path, database_name, size_bytes, checksum)
VALUES ('encrypted', '${ENC}', '${POSTGRES_DB}', ${SIZE}, '${CHECKSUM}');
SQL

RECEIPT="proof/backup-encrypted-${POSTGRES_DB}-${STAMP}.txt"
{
  echo "CitadelDB Encrypted Backup Receipt"
  echo "Database: ${POSTGRES_DB}"
  echo "Path: ${ENC}"
  echo "Size: ${SIZE}"
  echo "SHA256: ${CHECKSUM}"
  echo "Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee "$RECEIPT"
