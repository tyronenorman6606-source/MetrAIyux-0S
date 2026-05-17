#!/usr/bin/env bash
set -euo pipefail
BACKUP_DIR="${1:-./backups}"
latest="$(find "$BACKUP_DIR" -type f \( -name '*.tgz' -o -name '*.tar.gz' \) -print 2>/dev/null | sort | tail -1 || true)"
if [ -z "$latest" ]; then
  echo "No backup archive found in $BACKUP_DIR"
  exit 1
fi
echo "Verifying backup: $latest"
gzip -t "$latest"
tar -tzf "$latest" >/dev/null
echo "Backup archive passed gzip and tar listing checks."
