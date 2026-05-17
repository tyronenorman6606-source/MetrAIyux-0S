#!/usr/bin/env bash
set -euo pipefail
stamp=$(date -u +%Y%m%dT%H%M%SZ)
out="backups/skye-command-center-$stamp.tar.gz"
mkdir -p backups

docker compose ps >/dev/null

tar -czf "$out" docker-compose.yml .env apps deploy docs scripts README.md 2>/dev/null || true

project="${COMPOSE_PROJECT_NAME:-}"
if [[ -z "$project" && -f .env ]]; then
  project="$(grep -E '^PROJECT_NAME=' .env | head -1 | cut -d= -f2- || true)"
fi
project="${project:-$(basename "$PWD")}"

backup_volume() {
  local volume="$1"
  local file="$2"
  docker run --rm -v "${project}_${volume}:/volume:ro" -v "$(pwd)/backups:/backup" alpine tar -czf "/backup/${file}-$stamp.tar.gz" -C /volume . || true
}

backup_volume freescout_db freescout-db
backup_volume espocrm_db espocrm-db
backup_volume invoiceshelf_db invoiceshelf-db
backup_volume formbricks_db formbricks-db

echo "✅ Backup artifacts written to backups/"
