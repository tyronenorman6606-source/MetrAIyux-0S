#!/usr/bin/env bash
set -euo pipefail
BACKUP="${1:-}"
if [[ -z "$BACKUP" || ! -f "$BACKUP" ]]; then
  echo "Usage: bash scripts/restore.sh backups/<backup-file>.tar.gz"
  exit 1
fi
echo "This will stop the stack and restore data from: $BACKUP"
read -r -p "Type RESTORE to continue: " CONFIRM
if [[ "$CONFIRM" != "RESTORE" ]]; then echo "Restore cancelled."; exit 1; fi
docker compose down
tar -xzf "$BACKUP" -C .
docker compose up -d
bash scripts/smoke.sh || true
echo "Restore attempted from $BACKUP. Run acceptance tests before client use."
