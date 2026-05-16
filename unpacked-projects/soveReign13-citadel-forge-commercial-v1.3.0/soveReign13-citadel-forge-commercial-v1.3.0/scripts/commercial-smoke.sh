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

CONTROL_DOMAIN="$(get_env CONTROL_DOMAIN)"
CONTROL_URL="https://${CONTROL_DOMAIN}"
DEV_EMAIL="${DEV_EMAIL:-$(get_env DEV_AUTH_EMAIL)}"
DEV_ROLES="${DEV_ROLES:-admin}"

json_post() {
  local path="$1"
  local body="$2"
  curl -fsS --max-time 30 \
    -H 'content-type: application/json' \
    -H "x-dev-email: ${DEV_EMAIL}" \
    -H "x-dev-roles: ${DEV_ROLES}" \
    -X POST \
    --data "$body" \
    "${CONTROL_URL}${path}"
}

json_get() {
  local path="$1"
  curl -fsS --max-time 30 \
    -H "x-dev-email: ${DEV_EMAIL}" \
    -H "x-dev-roles: ${DEV_ROLES}" \
    "${CONTROL_URL}${path}"
}

echo "Commercial smoke requires AUTH_MODE=dev on an isolated test server or a gate that permits the dev headers. Do not run AUTH_MODE=dev in production."
json_get /health | python3 -m json.tool >/dev/null
json_get /api/plans | python3 -m json.tool >/dev/null
json_get /api/auth/diagnostics | python3 -m json.tool >/dev/null

SLUG="s13-smoke-$(date +%s)"
ACCOUNT_JSON="$(json_post /api/accounts "{\"displayName\":\"S13 Smoke Account\",\"slug\":\"${SLUG}\",\"planCode\":\"free\"}")"
echo "$ACCOUNT_JSON" | python3 -m json.tool >/dev/null
ACCOUNT_ID="$(printf '%s' "$ACCOUNT_JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin)["account"]["id"])')"

json_get "/api/accounts/${ACCOUNT_ID}/entitlements" | python3 -m json.tool >/dev/null
json_post "/api/accounts/${ACCOUNT_ID}/meter-events" '{"eventType":"ci.minutes","quantity":1,"unit":"minute","idempotencyKey":"commercial-smoke-ci-1"}' | python3 -m json.tool >/dev/null || true
json_post /api/leads '{"email":"smoke@example.com","company":"Smoke Test","planInterest":"starter","source":"commercial-smoke"}' | python3 -m json.tool >/dev/null
json_get /api/admin/platform-metrics | python3 -m json.tool >/dev/null

echo "Commercial smoke passed against control plane. Forgejo org provisioning may still require FORGEJO_ADMIN_TOKEN."
