#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source ./scripts/lib/env.sh

APP="${1:-}"
ROLE_PASSWORD="${2:-}"
if [ -z "$APP" ] || [ -z "$ROLE_PASSWORD" ]; then echo "Usage: ./tools/generate-app-env.sh <app-slug> <role-password>" >&2; exit 1; fi

SAFE_APP="$(echo "$APP" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9_]+/_/g' | sed -E 's/^_+|_+$//g')"
DB_NAME="${APP_DB_NAME_PREFIX}${SAFE_APP}"
ROLE_NAME="${APP_DB_ROLE_PREFIX}${SAFE_APP}_user"

mkdir -p exports/app-env
OUT="exports/app-env/${SAFE_APP}.env"
cat > "$OUT" <<EOF
DATABASE_PROVIDER=postgres
DATABASE_URL=postgres://${ROLE_NAME}:${ROLE_PASSWORD}@${CITADEL_DOMAIN:-citadeldb.internal}:${PGBOUNCER_PORT:-6432}/${DB_NAME}
DATABASE_DIRECT_URL=postgres://${ROLE_NAME}:${ROLE_PASSWORD}@${CITADEL_DOMAIN:-citadeldb.internal}:${POSTGRES_PORT:-5432}/${DB_NAME}
CITADEL_APP_SLUG=${SAFE_APP}
CITADEL_ENGINE=${CITADEL_MODE:-vps-postgres}
EOF
echo "App env written: $OUT"
