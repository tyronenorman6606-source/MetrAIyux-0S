#!/usr/bin/env bash
# Legacy wrapper. The current idempotent sync path reads the root .env,
# transfers lookup keys, archives stale prices, and writes a local receipt.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
exec node "$REPO_ROOT/tools/sync-metraiyux-stripe-products.mjs" "$@"

# Creates updated Stripe prices for Autonomous Office ($2,497/mo), RouteX ($1,497/mo),
# and Enterprise ($3,997/mo),
# then patches STRIPE_PRICES in the provisioning worker automatically.
#
# Usage:
#   STRIPE_SECRET_KEY=sk_live_xxx bash scripts/create-stripe-prices.sh
#
# Requirements: curl, jq

set -euo pipefail

SK="${STRIPE_SECRET_KEY:-}"
if [[ -z "$SK" ]]; then
  echo "ERROR: STRIPE_SECRET_KEY env var is required."
  echo "  export STRIPE_SECRET_KEY=sk_live_..."
  exit 1
fi

WORKER_FILE="metraiyux_0s_site/cloudflare-saas-provisioning-worker/src/index.js"

stripe_post() {
  curl -sf "https://api.stripe.com/v1/$1" -u "$SK:" "${@:2}"
}

echo "=== Fetching existing Autonomous Office monthly price (to get product ID) ==="
OLD_AUTO_PRICE=$(stripe_post "prices/price_1TXzMFHEgCmnlKPJCMP4nczh")
AUTO_PRODUCT=$(echo "$OLD_AUTO_PRICE" | jq -r '.product')
echo "  Product: $AUTO_PRODUCT"

echo ""
echo "=== Creating Autonomous Office $2,497/mo price ==="
AUTO_NEW=$(stripe_post prices \
  -d "product=$AUTO_PRODUCT" \
  -d "currency=usd" \
  -d "unit_amount=249700" \
  -d "recurring[interval]=month" \
  -d "nickname=Autonomous Office monthly" \
  -d "lookup_key=metraiyux_autonomous_office_monthly" \
  -d "transfer_lookup_key=true" \
  -d "metadata[source_folder]=metraiyux_0s_site" \
  -d "metadata[plan_id]=autonomous-office" \
  -d "metadata[offer_family]=metraiyux" \
  -d "metadata[status]=approved")
AUTO_NEW_ID=$(echo "$AUTO_NEW" | jq -r '.id')
echo "  New price ID: $AUTO_NEW_ID"

echo ""
echo "=== Creating RouteX Workforce Command product ==="
ROUTEX_PRODUCT=$(stripe_post products \
  -d "name=MetrAIyux 0S - RouteX Workforce Command" \
  -d "description=Owner-approved workforce command lane with SkyeRoutexFlow v0.4.0 local proof and V83 static shell" \
  -d "metadata[source_folder]=metraiyux_0s_site/skyeroutex-workforce-command-v0.4.0" \
  -d "metadata[plan_id]=routex-workforce-command" \
  -d "metadata[offer_family]=metraiyux" \
  -d "metadata[status]=approved" \
  -d "metadata[owner_approval_required]=true" \
  -d "statement_descriptor=METRAIYUX0S" | jq -r '.id')
echo "  RouteX product: $ROUTEX_PRODUCT"

echo ""
echo "=== Creating RouteX $1,497/mo price ==="
ROUTEX_MONTHLY=$(stripe_post prices \
  -d "product=$ROUTEX_PRODUCT" \
  -d "currency=usd" \
  -d "unit_amount=149700" \
  -d "recurring[interval]=month" \
  -d "nickname=RouteX Workforce Command monthly" \
  -d "lookup_key=metraiyux_routex_workforce_command_monthly" \
  -d "metadata[source_folder]=metraiyux_0s_site/skyeroutex-workforce-command-v0.4.0" \
  -d "metadata[plan_id]=routex-workforce-command" \
  -d "metadata[offer_family]=metraiyux" \
  -d "metadata[status]=approved" \
  -d "metadata[owner_approval_required]=true")
ROUTEX_MONTHLY_ID=$(echo "$ROUTEX_MONTHLY" | jq -r '.id')
echo "  RouteX monthly price ID: $ROUTEX_MONTHLY_ID"

echo ""
echo "=== Creating RouteX setup (one-time $6,500) ==="
ROUTEX_SETUP=$(stripe_post prices \
  -d "product=$ROUTEX_PRODUCT" \
  -d "currency=usd" \
  -d "unit_amount=650000" \
  -d "nickname=RouteX Workforce Command setup" \
  -d "lookup_key=metraiyux_routex_workforce_command_setup" \
  -d "metadata[plan_id]=routex-workforce-command" \
  -d "metadata[setup_for]=routex-workforce-command" \
  -d "metadata[owner_approval_required]=true")
ROUTEX_SETUP_ID=$(echo "$ROUTEX_SETUP" | jq -r '.id')
echo "  RouteX setup price ID: $ROUTEX_SETUP_ID"

echo ""
echo "=== Creating Enterprise product (if not exists) ==="
ENT_PRODUCT=$(stripe_post products \
  -d "name=MetrAIyux 0S - Enterprise" \
  -d "description=Enterprise plan with custom written limits, managed deployment architecture, and owner-approved activation" \
  -d "metadata[source_folder]=metraiyux_0s_site" \
  -d "metadata[plan_id]=enterprise-command" \
  -d "metadata[offer_family]=metraiyux" \
  -d "metadata[status]=approved" \
  -d "statement_descriptor=METRAIYUX0S" | jq -r '.id')
echo "  Enterprise product: $ENT_PRODUCT"

echo ""
echo "=== Creating Enterprise $3,997/mo price ==="
ENT_MONTHLY=$(stripe_post prices \
  -d "product=$ENT_PRODUCT" \
  -d "currency=usd" \
  -d "unit_amount=399700" \
  -d "recurring[interval]=month" \
  -d "nickname=Enterprise monthly" \
  -d "lookup_key=metraiyux_enterprise_monthly" \
  -d "metadata[source_folder]=metraiyux_0s_site" \
  -d "metadata[plan_id]=enterprise-command" \
  -d "metadata[offer_family]=metraiyux" \
  -d "metadata[status]=approved")
ENT_MONTHLY_ID=$(echo "$ENT_MONTHLY" | jq -r '.id')
echo "  Monthly price ID: $ENT_MONTHLY_ID"

echo ""
echo "=== Creating Enterprise setup (one-time $15,000) ==="
ENT_SETUP=$(stripe_post prices \
  -d "product=$ENT_PRODUCT" \
  -d "currency=usd" \
  -d "unit_amount=1500000" \
  -d "nickname=Enterprise setup" \
  -d "lookup_key=metraiyux_enterprise_setup" \
  -d "metadata[plan_id]=enterprise-command" \
  -d "metadata[setup_for]=enterprise-command")
ENT_SETUP_ID=$(echo "$ENT_SETUP" | jq -r '.id')
echo "  Setup price ID: $ENT_SETUP_ID"

echo ""
echo "=== Patching $WORKER_FILE ==="
perl -0pi -e "s|'autonomous-office':\\s*\\{ setup: '[^']+', monthly: '[^']+' \\}|'autonomous-office': { setup: 'price_1TXzMFHEgCmnlKPJLlbhrjw4', monthly: '$AUTO_NEW_ID' }|g" "$WORKER_FILE"
if grep -q "'routex-workforce-command'" "$WORKER_FILE"; then
  perl -0pi -e "s|\\s*'routex-workforce-command':\\s*\\{ setup: '[^']+', monthly: '[^']+' \\},?|\\n  'routex-workforce-command': { setup: '$ROUTEX_SETUP_ID', monthly: '$ROUTEX_MONTHLY_ID' },|g" "$WORKER_FILE"
else
  perl -0pi -e "s|  'autonomous-office':|  'routex-workforce-command': { setup: '$ROUTEX_SETUP_ID', monthly: '$ROUTEX_MONTHLY_ID' },\\n  'autonomous-office':|" "$WORKER_FILE"
fi
perl -0pi -e "s|'enterprise-command':\\s*\\{ setup: '[^']+', monthly: '[^']+' \\}|'enterprise-command': { setup: '$ENT_SETUP_ID', monthly: '$ENT_MONTHLY_ID' }|g" "$WORKER_FILE"

echo ""
echo "=== Done ==="
echo "  Autonomous Office monthly: $AUTO_NEW_ID"
echo "  RouteX monthly:            $ROUTEX_MONTHLY_ID"
echo "  RouteX setup:              $ROUTEX_SETUP_ID"
echo "  Enterprise monthly:        $ENT_MONTHLY_ID"
echo "  Enterprise setup:          $ENT_SETUP_ID"
echo ""
echo "Next: deploy the provisioning worker — cd metraiyux_0s_site/cloudflare-saas-provisioning-worker && wrangler deploy"
