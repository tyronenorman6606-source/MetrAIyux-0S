#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Missing .env. Copy .env.example first." >&2
  exit 1
fi

set -a
source .env
set +a

missing=0
required=(
  POSTGRES_PASSWORD
  GATEWAY_ADMIN_TOKEN
  BACKUP_ENCRYPTION_PASSWORD
)

for key in "${required[@]}"; do
  value="${!key:-}"
  if [ -z "$value" ] || [[ "$value" == change-this* ]]; then
    echo "OPEN: $key is missing or still a placeholder"
    missing=1
  else
    echo "OK: $key"
  fi
done

if [ "$missing" -eq 1 ]; then
  exit 1
fi

echo "Environment validation: PASS"
