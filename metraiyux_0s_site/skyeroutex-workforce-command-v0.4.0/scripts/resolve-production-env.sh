#!/usr/bin/env sh
set -eu

set_default_from() {
  target=$1
  shift
  eval current=\${$target:-}
  if [ -n "$current" ]; then
    return 0
  fi
  for source_key in "$@"; do
    eval candidate=\${$source_key:-}
    if [ -n "$candidate" ]; then
      export "$target=$candidate"
      return 0
    fi
  done
}

first_csv_value() {
  value=$1
  printf '%s' "${value%%,*}"
}

# Database: root .env commonly carries Netlify/Neon aliases.
set_default_from DATABASE_URL NETLIFY_DATABASE_URL NEON_DATABASE_URL SKYGATEFS13_DATABASE_URL SKYGATEFS13_BACKUP_DATABASE_URL
if [ -z "${DATABASE_DRIVER:-}" ] && [ -n "${DATABASE_URL:-}" ]; then
  export DATABASE_DRIVER=postgres
fi

# Cloudflare R2 / S3-compatible proof media and export packet storage.
set_default_from STORAGE_ACCESS_KEY_ID CLOUDFLARE_R2_ACCESS_KEY AWS_ACCESS_KEY_ID S3_ACCESS_KEY
set_default_from STORAGE_SECRET_ACCESS_KEY CLOUDFLARE_R2_SECRET_KEY AWS_SECRET_ACCESS_KEY S3_SECRET_KEY
set_default_from STORAGE_BUCKET CLOUDFLARE_R2_BUCKET R2_BUCKET S3_BUCKET
set_default_from STORAGE_REGION R2_REGION S3_REGION AWS_REGION
if [ -z "${STORAGE_ENDPOINT:-}" ]; then
  r2_account="${CLOUDFLARE_R2_ACCOUNT_ID:-${CLOUDFLARE_ACCOUNT_ID:-}}"
  if [ -n "$r2_account" ]; then
    export STORAGE_ENDPOINT="https://${r2_account}.r2.cloudflarestorage.com"
  fi
fi
if [ -z "${STORAGE_REGION:-}" ] && [ -n "${STORAGE_ENDPOINT:-}" ]; then
  export STORAGE_REGION=auto
fi
if [ -z "${STORAGE_BUCKET:-}" ] && [ -n "${STORAGE_ENDPOINT:-}" ]; then
  export STORAGE_BUCKET=skyeroutex-proof
fi
if [ -z "${STORAGE_DRIVER:-}" ] && [ -n "${STORAGE_ENDPOINT:-}" ] && [ -n "${STORAGE_ACCESS_KEY_ID:-}" ] && [ -n "${STORAGE_SECRET_ACCESS_KEY:-}" ]; then
  export STORAGE_DRIVER=r2
fi

# Admin bootstrap: reuse existing operator/admin aliases when the RouteX names are absent.
if [ -z "${SKYE_ADMIN_EMAIL:-}" ]; then
  admin_email="${METRAIYUX_0S_SKYGATE_ADMIN_EMAILS:-${ADMIN_EMAILS:-${LEGAL_REVIEW_ADMIN_EMAIL:-}}}"
  if [ -n "$admin_email" ]; then
    export SKYE_ADMIN_EMAIL="$(first_csv_value "$admin_email")"
  fi
fi
set_default_from SKYE_ADMIN_PASSWORD SKYGATEFS13_ADMIN_PASSWORD ADMIN_PASSWORD QA_ADMIN_PASSWORD

# Production safety defaults.
export NODE_ENV="${NODE_ENV:-production}"
export SKYE_REQUIRE_CSRF="${SKYE_REQUIRE_CSRF:-1}"
export COOKIE_SECURE="${COOKIE_SECURE:-1}"
export SKYE_ALLOW_LOCAL_PROOF_SERVICES="${SKYE_ALLOW_LOCAL_PROOF_SERVICES:-0}"

# Payment.
set_default_from STRIPE_SECRET_KEY STRIPE_SECRET_KEY_LIVE SKYGATEFS13_STRIPE_SECRET_KEY
set_default_from STRIPE_WEBHOOK_SECRET SKYGATEFS13_STRIPE_WEBHOOK_SECRET
if [ -z "${PAYMENT_PROVIDER:-}" ] && [ -n "${STRIPE_SECRET_KEY:-}" ]; then
  export PAYMENT_PROVIDER=stripe
fi

# Notification.
set_default_from TWILIO_ACCOUNT_SID SKYGATEFS13_TWILIO_ACCOUNT_SID
set_default_from TWILIO_AUTH_TOKEN SKYGATEFS13_TWILIO_AUTH_TOKEN
set_default_from TWILIO_FROM_NUMBER TWILIO_PHONE_NUMBER SKYGATEFS13_TWILIO_PHONE_NUMBER
set_default_from TWILIO_DEFAULT_TO TWILIO_TO_NUMBER TWILIO_PHONE_NUMBER SKYGATEFS13_TWILIO_PHONE_NUMBER
if [ -z "${NOTIFICATION_PROVIDER:-}" ] && [ -n "${TWILIO_ACCOUNT_SID:-}" ] && [ -n "${TWILIO_AUTH_TOKEN:-}" ]; then
  export NOTIFICATION_PROVIDER=twilio
fi

# Route intelligence is intentionally not faked. If MAPBOX_ACCESS_TOKEN is not in
# the sourced env, production boot should fail rather than claim live routing.
if [ -z "${ROUTE_INTELLIGENCE_PROVIDER:-}" ] && [ -n "${MAPBOX_ACCESS_TOKEN:-}" ]; then
  export ROUTE_INTELLIGENCE_PROVIDER=mapbox
fi

# Compliance can use Checkr, or a signed FS27 platform-event webhook if provided.
if [ -z "${IDENTITY_COMPLIANCE_PROVIDER:-}" ] && [ -n "${CHECKR_API_KEY:-}" ] && [ -n "${CHECKR_PACKAGE:-}" ]; then
  export IDENTITY_COMPLIANCE_PROVIDER=checkr
fi
if [ -z "${IDENTITY_COMPLIANCE_PROVIDER:-}" ]; then
  set_default_from COMPLIANCE_WEBHOOK_ENDPOINT METRAIYUX_0S_SKYGATE_FS27_EVENT_ENDPOINT METRAIYUX_0S_SKYGATE_BROWSER_EVENT_ENDPOINT
  set_default_from COMPLIANCE_WEBHOOK_SIGNING_SECRET SKYGATEFS27_EVENT_MIRROR_SECRET SKYGATE_EVENT_MIRROR_SECRET PLATFORM_EVENT_MIRROR_SECRET
  if [ -n "${COMPLIANCE_WEBHOOK_ENDPOINT:-}" ] && [ -n "${COMPLIANCE_WEBHOOK_SIGNING_SECRET:-}" ]; then
    export IDENTITY_COMPLIANCE_PROVIDER=compliance-webhook
  fi
fi

# Runtime bus is an actual repo runtime control lane, not the standalone local proof driver.
if [ -z "${SKYEHANDS_RUNTIME_PROVIDER:-}" ]; then
  export SKYEHANDS_RUNTIME_PROVIDER=skyehands-runtime-bus
fi
export SKYEHANDS_RUNTIME_BUS_DIR="${SKYEHANDS_RUNTIME_BUS_DIR:-../../skyehands_runtime_control/.skyequanta}"
export SKYEHANDS_RUNTIME_SOURCE_PLATFORM="${SKYEHANDS_RUNTIME_SOURCE_PLATFORM:-skyeroutex-workforce-command}"
export SKYEHANDS_RUNTIME_WORKSPACE_ID="${SKYEHANDS_RUNTIME_WORKSPACE_ID:-skyeroutex-workforce-command}"
