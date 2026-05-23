#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source ./scripts/lib/env.sh

APP="${1:-}"
if [ -z "$APP" ]; then
  echo "Usage: ./scripts/create-app-db.sh <app-slug>" >&2
  exit 1
fi

SAFE_APP="$(echo "$APP" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9_]+/_/g' | sed -E 's/^_+|_+$//g')"
DB_NAME="${APP_DB_NAME_PREFIX}${SAFE_APP}"
ROLE_NAME="${APP_DB_ROLE_PREFIX}${SAFE_APP}_user"
ROLE_PASSWORD="$(openssl rand -base64 36 | tr -d '\n' | tr '/+' 'ab')"
ENGINE="${CITADEL_MODE:-vps-postgres}"
APP_CONNECTION_PORT="${CITADEL_APP_CONNECTION_PORT:-${POSTGRES_PORT:-5432}}"

echo "Creating database ${DB_NAME} and role ${ROLE_NAME}..."

admin_psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${ROLE_NAME}') THEN
    CREATE ROLE ${ROLE_NAME} LOGIN PASSWORD '${ROLE_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END
\$\$;
SQL

if ! psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  admin_createdb -O "${ROLE_NAME}" "${DB_NAME}"
fi

psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 <<SQL
REVOKE ALL ON DATABASE ${DB_NAME} FROM PUBLIC;
GRANT CONNECT ON DATABASE ${DB_NAME} TO ${ROLE_NAME};
GRANT USAGE, CREATE ON SCHEMA public TO ${ROLE_NAME};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${ROLE_NAME};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${ROLE_NAME};
SQL

admin_psql -v ON_ERROR_STOP=1 <<SQL
INSERT INTO citadel.apps (app_slug, database_name, role_name, engine)
VALUES ('${SAFE_APP}', '${DB_NAME}', '${ROLE_NAME}', '${ENGINE}')
ON CONFLICT (app_slug)
DO UPDATE SET database_name = EXCLUDED.database_name,
              role_name = EXCLUDED.role_name,
              engine = EXCLUDED.engine,
              status = 'active';

INSERT INTO citadel.app_credentials (app_slug, role_name, secret_hint)
VALUES ('${SAFE_APP}', '${ROLE_NAME}', 'generated-' || now()::text);

INSERT INTO citadel.app_environments (app_slug, environment, database_name, role_name, connection_host, connection_port, status)
VALUES ('${SAFE_APP}', 'production', '${DB_NAME}', '${ROLE_NAME}', '${CITADEL_DOMAIN:-127.0.0.1}', ${APP_CONNECTION_PORT}, 'active')
ON CONFLICT (app_slug, environment)
DO UPDATE SET database_name = EXCLUDED.database_name,
              role_name = EXCLUDED.role_name,
              connection_host = EXCLUDED.connection_host,
              connection_port = EXCLUDED.connection_port,
              status = 'active';

INSERT INTO citadel.audit_events (actor, action, target, metadata)
VALUES ('script', 'create_app_db', '${SAFE_APP}', jsonb_build_object('database', '${DB_NAME}', 'role', '${ROLE_NAME}', 'engine', '${ENGINE}'));
SQL

mkdir -p proof
RECEIPT="proof/provision-${SAFE_APP}-$(date -u +%Y%m%dT%H%M%SZ).txt"
{
  echo "CitadelDB Provision Receipt"
  echo "App: ${SAFE_APP}"
  echo "Database: ${DB_NAME}"
  echo "Role: ${ROLE_NAME}"
  echo "Engine: ${ENGINE}"
  echo "Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "DATABASE_URL=postgres://${ROLE_NAME}:${ROLE_PASSWORD}@${CITADEL_DOMAIN:-127.0.0.1}:${APP_CONNECTION_PORT}/${DB_NAME}"
  echo "Warning: store this secret now. Plaintext is not retained."
} | tee "$RECEIPT"

echo "Provision receipt written: $RECEIPT"
