#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
ENV_FILE=${1:-"$ROOT_DIR/.env.production"}

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing production env file: $ENV_FILE" >&2
  echo "Copy .env.production.example, replace secrets, then rerun." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

# Map existing repo/root env names into the exact RouteX runtime contract.
# This lets the app consume established keys like CLOUDFLARE_R2_ACCESS_KEY,
# TWILIO_PHONE_NUMBER, SKYGATEFS13_ADMIN_PASSWORD, and NETLIFY_DATABASE_URL
# without copying secrets into a second env file.
# shellcheck disable=SC1091
. "$ROOT_DIR/scripts/resolve-production-env.sh"

cd "$ROOT_DIR"
exec node src/server.js
