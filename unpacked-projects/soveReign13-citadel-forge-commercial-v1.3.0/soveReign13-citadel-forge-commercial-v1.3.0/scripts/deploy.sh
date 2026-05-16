#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  echo "Missing .env. Run: cp .env.example .env && ./scripts/init-env.sh" >&2
  exit 1
fi

COMPOSE="docker compose"
$COMPOSE config >/tmp/s13-compose-rendered.yml
$COMPOSE up -d --build

echo "Deployment command completed. Run ./scripts/smoke.sh next."
