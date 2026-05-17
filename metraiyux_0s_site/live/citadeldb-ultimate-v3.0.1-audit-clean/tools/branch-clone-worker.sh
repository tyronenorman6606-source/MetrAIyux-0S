#!/usr/bin/env bash
set -euo pipefail

# CitadelDB branch clone worker
# This performs a real logical clone using pg_dump | psql.
# Required:
#   SOURCE_DATABASE_URL
#   TARGET_DATABASE_URL
# Optional:
#   PROJECT_SLUG
#   BRANCH_SLUG
#   PARENT_APP_SLUG
#
# This does NOT fake branch success. It exits non-zero on failure.

cd "$(dirname "$0")/.."
mkdir -p proof

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PROJECT_SLUG="${PROJECT_SLUG:-unknown_project}"
BRANCH_SLUG="${BRANCH_SLUG:-unknown_branch}"
PARENT_APP_SLUG="${PARENT_APP_SLUG:-unknown_parent}"
OUT="proof/branch-clone-${PROJECT_SLUG}-${BRANCH_SLUG}-${STAMP}.txt"

if [ -z "${SOURCE_DATABASE_URL:-}" ]; then
  echo "OPEN: SOURCE_DATABASE_URL missing" | tee "$OUT"
  exit 2
fi

if [ -z "${TARGET_DATABASE_URL:-}" ]; then
  echo "OPEN: TARGET_DATABASE_URL missing" | tee "$OUT"
  exit 2
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "OPEN: pg_dump is not installed" | tee "$OUT"
  exit 2
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "OPEN: psql is not installed" | tee "$OUT"
  exit 2
fi

{
  echo "CitadelDB Branch Clone Worker"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Project: ${PROJECT_SLUG}"
  echo "Branch: ${BRANCH_SLUG}"
  echo "Parent app: ${PARENT_APP_SLUG}"
  echo
  echo "1. Source connectivity"
  psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select current_database() as source_database, current_user as source_user;"
  echo
  echo "2. Target connectivity"
  psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select current_database() as target_database, current_user as target_user;"
  echo
  echo "3. Clone"
  pg_dump --no-owner --no-privileges "$SOURCE_DATABASE_URL" | psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1
  echo
  echo "4. Branch write smoke"
  psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -c "create table if not exists citadel_branch_smoke_receipts (id bigserial primary key, branch_slug text not null, created_at timestamptz not null default now());"
  psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -c "insert into citadel_branch_smoke_receipts (branch_slug) values ('${BRANCH_SLUG}');"
  psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select branch_slug, count(*) from citadel_branch_smoke_receipts where branch_slug='${BRANCH_SLUG}' group by branch_slug;"
  echo
  echo "Branch clone proof: PASS"
} | tee "$OUT"
