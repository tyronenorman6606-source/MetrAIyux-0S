#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source ./scripts/lib/env.sh

mkdir -p proof
OUT="proof/health-$(date -u +%Y%m%dT%H%M%SZ).txt"

{
  echo "CitadelDB Health Proof"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  admin_psql -v ON_ERROR_STOP=1 -c "SELECT now() AS server_time, current_database() AS database_name;"
  admin_psql -v ON_ERROR_STOP=1 -c "SELECT count(*) AS app_count FROM citadel.apps;"
} | tee "$OUT"

echo "Health proof written: $OUT"
