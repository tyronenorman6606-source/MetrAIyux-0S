#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-.env}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

get_env() {
  grep -E "^$1=" "$ENV_FILE" | head -n1 | cut -d= -f2- | sed 's/^"//;s/"$//'
}

PORTAL_DOMAIN="$(get_env PORTAL_DOMAIN)"
FORGE_DOMAIN="$(get_env FORGE_DOMAIN)"
CONTROL_DOMAIN="$(get_env CONTROL_DOMAIN)"
FORGEJO_SSH_PORT="$(get_env FORGEJO_SSH_PORT)"

check_url() {
  local label="$1"
  local url="$2"
  echo "Checking $label: $url"
  curl -fsS --max-time 20 "$url" >/dev/null
}

check_json() {
  local label="$1"
  local url="$2"
  echo "Checking $label: $url"
  curl -fsS --max-time 20 "$url" | python3 -m json.tool >/dev/null
}

check_url "portal" "https://${PORTAL_DOMAIN}/"
check_json "control health" "https://${CONTROL_DOMAIN}/health"
check_json "control plans" "https://${CONTROL_DOMAIN}/api/plans"
check_url "forge" "https://${FORGE_DOMAIN}/"

if command -v nc >/dev/null 2>&1; then
  echo "Checking SSH Git port ${FORGEJO_SSH_PORT}"
  nc -zv 127.0.0.1 "$FORGEJO_SSH_PORT" >/dev/null 2>&1 || nc -zv "$FORGE_DOMAIN" "$FORGEJO_SSH_PORT" >/dev/null 2>&1
else
  echo "nc not found; skipping SSH port check."
fi

echo "Smoke checks passed for public HTTP surfaces. Runner proof still requires registering runner and pushing a workflow."
