#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/database-lifecycle-proof-${STAMP}.txt"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "OPEN: DATABASE_URL is required for direct DB lifecycle proof" | tee "$OUT"
  exit 2
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "OPEN: psql is required for DB lifecycle proof" | tee "$OUT"
  exit 2
fi

{
  echo "CitadelDB Direct Database Lifecycle Proof"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "1. Connection"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select current_database() as database_name, current_user as user_name, now() as checked_at;"
  echo
  echo "2. Create proof table"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "create table if not exists citadel_direct_lifecycle_proof (id bigserial primary key, proof_id text not null, note text not null, created_at timestamptz not null default now());"
  echo
  echo "3. Insert proof row"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "insert into citadel_direct_lifecycle_proof (proof_id, note) values ('${STAMP}', 'citadeldb-direct-proof');"
  echo
  echo "4. Read proof row"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select proof_id, note, created_at from citadel_direct_lifecycle_proof where proof_id='${STAMP}';"
  echo
  echo "5. Update proof row"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "update citadel_direct_lifecycle_proof set note='citadeldb-direct-proof-updated' where proof_id='${STAMP}';"
  echo
  echo "6. Verify update"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "select proof_id, note from citadel_direct_lifecycle_proof where proof_id='${STAMP}' and note='citadeldb-direct-proof-updated';"
  echo
  echo "Direct database lifecycle proof: PASS"
} | tee "$OUT"
