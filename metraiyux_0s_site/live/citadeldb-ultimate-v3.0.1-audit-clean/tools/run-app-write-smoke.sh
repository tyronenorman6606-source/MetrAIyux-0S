#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/app-write-smoke-${STAMP}.txt"

{
  echo "CitadelDB App Write Smoke"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS citadeldb_app_write_smoke (
  id BIGSERIAL PRIMARY KEY,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO citadeldb_app_write_smoke(note) VALUES('citadeldb app write smoke');
SELECT count(*) AS smoke_count FROM citadeldb_app_write_smoke;
SQL
} | tee "$OUT"

echo "App write smoke receipt written: $OUT"
