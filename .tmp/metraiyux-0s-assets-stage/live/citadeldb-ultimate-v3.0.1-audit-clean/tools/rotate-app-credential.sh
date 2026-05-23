#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source ./scripts/lib/env.sh

APP="${1:-}"
if [ -z "$APP" ]; then
  echo "Usage: ./tools/rotate-app-credential.sh <app-slug>" >&2
  exit 1
fi

SAFE_APP="$(echo "$APP" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9_]+/_/g' | sed -E 's/^_+|_+$//g')"
DB_NAME="${APP_DB_NAME_PREFIX}${SAFE_APP}"
ROLE_NAME="${APP_DB_ROLE_PREFIX}${SAFE_APP}_user"
NEW_PASSWORD="$(openssl rand -base64 36 | tr -d '\n' | tr '/+' 'ab')"

admin_psql -v ON_ERROR_STOP=1 <<SQL
ALTER ROLE ${ROLE_NAME} PASSWORD '${NEW_PASSWORD}';

UPDATE citadel.app_credentials
SET status = 'rotated', rotated_at = now()
WHERE app_slug = '${SAFE_APP}' AND role_name = '${ROLE_NAME}' AND status = 'active';

INSERT INTO citadel.app_credentials (app_slug, role_name, secret_hint, status)
VALUES ('${SAFE_APP}', '${ROLE_NAME}', 'rotated-' || now()::text, 'active');

INSERT INTO citadel.audit_events (actor, action, target, metadata)
VALUES ('script', 'rotate_app_credential', '${SAFE_APP}', jsonb_build_object('role', '${ROLE_NAME}'));
SQL

mkdir -p proof exports/app-env
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RECEIPT="proof/credential-rotation-${SAFE_APP}-${STAMP}.txt"
ENVOUT="exports/app-env/${SAFE_APP}-rotated-${STAMP}.env"

cat > "$ENVOUT" <<EOF
DATABASE_PROVIDER=postgres
DATABASE_URL=postgres://${ROLE_NAME}:${NEW_PASSWORD}@${CITADEL_DOMAIN:-citadeldb.internal}:${PGBOUNCER_PORT:-6432}/${DB_NAME}
CITADEL_APP_SLUG=${SAFE_APP}
EOF

{
  echo "CitadelDB Credential Rotation Receipt"
  echo "App: ${SAFE_APP}"
  echo "Role: ${ROLE_NAME}"
  echo "Env file: ${ENVOUT}"
  echo "Rotated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Warning: update app env, restart app, then run write smoke."
} | tee "$RECEIPT"
