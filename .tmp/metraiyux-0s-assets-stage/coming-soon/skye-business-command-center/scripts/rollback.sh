#!/usr/bin/env bash
set -euo pipefail
LAST_COMPOSE="$(ls -1t proof/docker-compose-before-update-*.yml 2>/dev/null | head -1 || true)"
if [[ -z "$LAST_COMPOSE" ]]; then
  echo "No compose rollback file found in proof/."
  exit 1
fi
cp "$LAST_COMPOSE" docker-compose.yml
docker compose up -d --build
bash scripts/smoke.sh || true
echo "Rolled back using $LAST_COMPOSE"
