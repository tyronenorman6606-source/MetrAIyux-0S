#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

if [ "${OBJECT_BACKUP_ENABLED:-false}" != "true" ]; then
  echo "OBJECT_BACKUP_ENABLED is not true. Skipping object backup sync."
  exit 0
fi

if [ -z "${S3_BUCKET:-}" ]; then
  echo "Missing S3_BUCKET" >&2
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI is required for this scaffold. Install/configure it or replace with rclone." >&2
  exit 1
fi

ENDPOINT_ARGS=()
if [ -n "${S3_ENDPOINT:-}" ]; then
  ENDPOINT_ARGS=(--endpoint-url "$S3_ENDPOINT")
fi

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RECEIPT="proof/object-backup-sync-${STAMP}.txt"

aws "${ENDPOINT_ARGS[@]}" s3 sync backups/ "s3://${S3_BUCKET}/citadeldb/backups/" 2>&1 | tee "$RECEIPT"

echo "Object backup sync receipt: $RECEIPT"
