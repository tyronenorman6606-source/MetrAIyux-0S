#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${1:-.env.live-e2e}"
if [ -f "$OUT" ]; then
  echo "Refusing to overwrite $OUT"
  exit 1
fi

rand_hex() {
  node -e "console.log(require('crypto').randomBytes(Number(process.argv[1])).toString('hex'))" "$1"
}

cat > "$OUT" <<ENV
POSTGRES_PASSWORD=$(rand_hex 24)
GATEWAY_ADMIN_TOKEN=$(rand_hex 32)
BACKUP_ENCRYPTION_PASSWORD=$(rand_hex 32)

DATABASE_URL=postgres://citadel_admin:\${POSTGRES_PASSWORD}@postgres:5432/citadel
GATEWAY_PORT=7313
DASHBOARD_PORT=7413
PGBOUNCER_PORT=6432

ENFORCE_ENTITLEMENTS_ON_SELF_SERVICE=false
ENFORCE_UPSTREAM_TEAM_CONTEXT=false
USAGE_METERING_ENABLED=true
BRANCH_WORKER_ENABLED=false
REQUIRE_ACTIVE_SUBSCRIPTION=false
AI_ASSISTANT_ENABLED=false
ENV

echo "Created $OUT"
echo "Next:"
echo "  cp $OUT .env"
echo "  ./cli/citadel live-stack-e2e"
