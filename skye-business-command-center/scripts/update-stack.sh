#!/usr/bin/env bash
set -euo pipefail
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p proof
bash scripts/health-report.sh || true
bash scripts/backup.sh
cp docker-compose.yml "proof/docker-compose-before-update-$STAMP.yml"
docker compose pull
docker compose up -d --build
bash scripts/smoke.sh
bash scripts/acceptance.sh
echo "Update complete. Compose backup: proof/docker-compose-before-update-$STAMP.yml"
