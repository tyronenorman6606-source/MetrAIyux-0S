#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "CitadelDB Ultimate local install"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is required." >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Edit secrets before production use."
fi

mkdir -p backups/manual backups/encrypted backups/manifests proof receipts exports/app-env exports/service-catalog

echo "Starting CitadelDB services..."
docker compose -f deploy/vps-postgres/docker-compose.yml up -d

echo
echo "Run:"
echo "  ./cli/citadel validate-env"
echo "  ./cli/citadel health"
echo "  ./cli/citadel smoke-all"
echo
echo "Dashboard:"
echo "  http://127.0.0.1:7413"
