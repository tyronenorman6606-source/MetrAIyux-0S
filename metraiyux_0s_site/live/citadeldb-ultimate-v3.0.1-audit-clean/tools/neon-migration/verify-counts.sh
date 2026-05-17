#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ -z "${NEON_DATABASE_URL:-}" ] || [ -z "${CITADEL_TARGET_DATABASE_URL:-}" ]; then
  echo "Missing NEON_DATABASE_URL or CITADEL_TARGET_DATABASE_URL" >&2
  exit 1
fi

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RECEIPT="proof/neon-verify-counts-${STAMP}.txt"

TABLES="$(psql "$NEON_DATABASE_URL" -tAc "SELECT quote_ident(schemaname)||'.'||quote_ident(tablename) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1;")"

{
  echo "Neon to CitadelDB Count Verification"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf "%-60s %-16s %-16s %-8s\n" "table" "neon_count" "citadel_count" "match"
  echo "$TABLES" | while read -r table; do
    [ -z "$table" ] && continue
    n="$(psql "$NEON_DATABASE_URL" -tAc "SELECT count(*) FROM ${table};" | tr -d ' ')"
    c="$(psql "$CITADEL_TARGET_DATABASE_URL" -tAc "SELECT count(*) FROM ${table};" | tr -d ' ' || echo ERROR)"
    [ "$n" = "$c" ] && m="yes" || m="NO"
    printf "%-60s %-16s %-16s %-8s\n" "$table" "$n" "$c" "$m"
  done
} | tee "$RECEIPT"
