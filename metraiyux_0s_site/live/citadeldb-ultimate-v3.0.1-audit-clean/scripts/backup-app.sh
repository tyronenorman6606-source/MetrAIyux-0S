#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source ./scripts/lib/env.sh

APP_SLUG="${1:-}"
if [ -z "$APP_SLUG" ]; then
  echo "Usage: ./scripts/backup-app.sh <app-slug>" >&2
  exit 1
fi

APP_SLUG="$(printf '%s' "$APP_SLUG" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9_]+/_/g; s/^_+|_+$//g')"
APP_ROW="$(admin_psql -At -v ON_ERROR_STOP=1 -c "SELECT database_name || '|' || role_name FROM citadel.apps WHERE app_slug = '${APP_SLUG}' AND status = 'active' LIMIT 1;")"
if [ -z "$APP_ROW" ]; then
  echo "No active app found for slug: ${APP_SLUG}" >&2
  exit 1
fi

APP_DB="${APP_ROW%%|*}"
APP_ROLE="${APP_ROW#*|}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "backups/apps/${APP_SLUG}" proof
OUT="backups/apps/${APP_SLUG}/${APP_DB}-${STAMP}.dump"

pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${APP_DB}" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="${OUT}"

SIZE="$(wc -c < "${OUT}" | tr -d ' ')"
CHECKSUM="$(sha256sum "${OUT}" | awk '{print $1}')"

admin_psql -v ON_ERROR_STOP=1 <<SQL
INSERT INTO citadel.backup_receipts (backup_kind, backup_path, database_name, size_bytes, checksum, metadata)
VALUES ('app-manual', '${OUT}', '${APP_DB}', ${SIZE}, '${CHECKSUM}', jsonb_build_object('appSlug', '${APP_SLUG}', 'roleName', '${APP_ROLE}'));

INSERT INTO citadel.audit_events (actor, action, target, metadata)
VALUES ('script', 'app_backup_now', '${APP_SLUG}', jsonb_build_object('database', '${APP_DB}', 'path', '${OUT}', 'sha256', '${CHECKSUM}', 'size_bytes', ${SIZE}));
SQL

RECEIPT="proof/app-backup-${APP_SLUG}-${STAMP}.txt"
{
  echo "CitadelDB App Backup Receipt"
  echo "App: ${APP_SLUG}"
  echo "Database: ${APP_DB}"
  echo "Path: ${OUT}"
  echo "Size: ${SIZE}"
  echo "SHA256: ${CHECKSUM}"
  echo "Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee "$RECEIPT"
