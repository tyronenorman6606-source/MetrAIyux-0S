#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p proof
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proof/backup-integrity-${STAMP}.txt"

{
  echo "CitadelDB Backup Integrity Report"
  echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  find backups -type f \( -name '*.dump' -o -name '*.enc' \) | sort | while read -r file; do
    [ -z "$file" ] && continue
    size="$(wc -c < "$file" | tr -d ' ')"
    sha="$(sha256sum "$file" | awk '{print $1}')"
    echo "${file} size=${size} sha256=${sha}"
  done
} | tee "$OUT"

echo "Backup integrity report written: $OUT"
