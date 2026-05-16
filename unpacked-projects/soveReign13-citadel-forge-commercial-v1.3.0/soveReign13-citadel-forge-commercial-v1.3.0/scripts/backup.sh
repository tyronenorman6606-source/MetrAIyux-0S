#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
ARCHIVE="$BACKUP_DIR/soveReign13-citadel-forge-$STAMP.tar.gz"
RETENTION="$(grep -E '^BACKUP_RETENTION_DAYS=' "$ENV_FILE" | head -n1 | cut -d= -f2- 2>/dev/null || echo 14)"

docker compose ps >/dev/null

echo "Dumping Forgejo DB..."
docker compose exec -T forgejo-db pg_dump -U "$(grep -E '^FORGEJO_DB_USER=' "$ENV_FILE" | cut -d= -f2-)" "$(grep -E '^FORGEJO_DB=' "$ENV_FILE" | cut -d= -f2-)" > "$BACKUP_DIR/forgejo-db-$STAMP.sql"

echo "Dumping control DB..."
docker compose exec -T control-db pg_dump -U "$(grep -E '^CONTROL_DB_USER=' "$ENV_FILE" | cut -d= -f2-)" "$(grep -E '^CONTROL_DB=' "$ENV_FILE" | cut -d= -f2-)" > "$BACKUP_DIR/control-db-$STAMP.sql"

echo "Creating archive..."
tar -czf "$ARCHIVE" forgejo runner portal caddy docker-compose.yml .env "$BACKUP_DIR/forgejo-db-$STAMP.sql" "$BACKUP_DIR/control-db-$STAMP.sql"
sha256sum "$ARCHIVE" > "$ARCHIVE.sha256"
find "$BACKUP_DIR" -name 'soveReign13-citadel-forge-*.tar.gz' -mtime "+$RETENTION" -delete

echo "Backup complete: $ARCHIVE"
