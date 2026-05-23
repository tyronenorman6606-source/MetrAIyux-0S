#!/usr/bin/env bash
set -euo pipefail

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

: "${POSTGRES_HOST:=127.0.0.1}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_DB:=citadel}"
: "${POSTGRES_USER:=citadel_admin}"
: "${APP_DB_ROLE_PREFIX:=app_}"
: "${APP_DB_NAME_PREFIX:=app_}"
: "${BACKUP_DIR:=./backups}"

if [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "Missing POSTGRES_PASSWORD in .env" >&2
  exit 1
fi

export PGPASSWORD="${POSTGRES_PASSWORD}"

admin_psql() {
  psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" "$@"
}

admin_createdb() {
  createdb -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" "$@"
}

admin_dropdb() {
  dropdb -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" "$@"
}
