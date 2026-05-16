#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ -z "${NEON_DATABASE_URL:-}" ]; then echo "Missing NEON_DATABASE_URL" >&2; exit 1; fi

mkdir -p exports/neon proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="exports/neon/neon-export-${STAMP}.dump"

pg_dump "$NEON_DATABASE_URL" --format=custom --no-owner --no-acl --file="$OUT"
ln -sf "$(basename "$OUT")" exports/neon/neon-export-latest.dump

SHA="$(sha256sum "$OUT" | awk '{print $1}')"
SIZE="$(wc -c < "$OUT" | tr -d ' ')"
RECEIPT="proof/neon-dump-${STAMP}.txt"

{
  echo "Neon Dump Receipt"
  echo "Path: $OUT"
  echo "Size: $SIZE"
  echo "SHA256: $SHA"
  echo "Created: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
} | tee "$RECEIPT"
