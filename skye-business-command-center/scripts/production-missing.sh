#!/usr/bin/env bash
set -euo pipefail

missing=0
need() {
  local name="$1"
  local value
  value="$(env_value "$name")"
  if [ -z "$value" ] || [[ "$value" == CHANGE_ME* ]]; then
    echo "MISSING $name"
    missing=1
  else
    echo "OK $name"
  fi
}

if [ ! -f .env ]; then
  echo "MISSING .env"
  exit 1
fi

env_value() {
  local name="$1"
  awk -v key="$name" '
    index($0, key "=") == 1 {
      value = substr($0, length(key) + 2)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      gsub(/^'\''|'\''$/, "", value)
      gsub(/^"|"$/, "", value)
      print value
      exit
    }
  ' .env
}

echo "Production target"
need HUB_HOST
need FREESCOUT_HOST
need ESPOCRM_HOST
need INVOICESHELF_HOST
need FORMBRICKS_HOST

echo
echo "Service URLs"
need FREESCOUT_PUBLIC_URL
need ESPOCRM_PUBLIC_URL
need INVOICESHELF_PUBLIC_URL
need FORMBRICKS_PUBLIC_URL

echo
echo "Secrets and mail"
need FREESCOUT_DB_PASSWORD
need ESPOCRM_DB_PASSWORD
need INVOICESHELF_DB_PASSWORD
need FORMBRICKS_DB_PASSWORD
need REDIS_PASSWORD
need FREESCOUT_ADMIN_PASSWORD
need ESPOCRM_ADMIN_PASSWORD
need INVOICESHELF_APP_KEY
need FORMBRICKS_ENCRYPTION_KEY
need FORMBRICKS_NEXTAUTH_SECRET
need FORMBRICKS_CRON_SECRET
need SMTP_HOST
need SMTP_USER
need SMTP_PASSWORD
need SMTP_FROM

echo
echo "Production URL sanity"
warn=0
FREESCOUT_PUBLIC_URL="$(env_value FREESCOUT_PUBLIC_URL)"
ESPOCRM_PUBLIC_URL="$(env_value ESPOCRM_PUBLIC_URL)"
INVOICESHELF_PUBLIC_URL="$(env_value INVOICESHELF_PUBLIC_URL)"
FORMBRICKS_PUBLIC_URL="$(env_value FORMBRICKS_PUBLIC_URL)"
for value in \
  "${FREESCOUT_PUBLIC_URL:-}" \
  "${ESPOCRM_PUBLIC_URL:-}" \
  "${INVOICESHELF_PUBLIC_URL:-}" \
  "${FORMBRICKS_PUBLIC_URL:-}"; do
  if [[ "$value" == *".app.github.dev"* ]]; then
    echo "MISSING real attached-app URL: $value is still a Codespaces URL"
    missing=1
  fi
done

FREESCOUT_HOST="$(env_value FREESCOUT_HOST)"
ESPOCRM_HOST="$(env_value ESPOCRM_HOST)"
INVOICESHELF_HOST="$(env_value INVOICESHELF_HOST)"
FORMBRICKS_HOST="$(env_value FORMBRICKS_HOST)"
for host in \
  "${FREESCOUT_HOST:-}" \
  "${ESPOCRM_HOST:-}" \
  "${INVOICESHELF_HOST:-}" \
  "${FORMBRICKS_HOST:-}"; do
  if [[ "$host" == *".netlify.app" ]]; then
    echo "MISSING real attached-app host: $host is under netlify.app, which will not run this Docker app"
    missing=1
    warn=1
  fi
done

if [ "$warn" -eq 0 ]; then
  echo "OK attached-app hosts are not obvious static-host placeholders"
fi

echo
echo "External deploy access not stored in this project .env:"
echo "MISSING_OR_MANUAL VPS_SSH_HOST"
echo "MISSING_OR_MANUAL VPS_SSH_USER"
echo "MISSING_OR_MANUAL DNS_A_RECORD_TARGET_IP"

exit "$missing"
