#!/usr/bin/env bash
# Creates updated Stripe prices for Autonomous Office ($1,997/mo) and Enterprise ($2,497/mo),
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
echo "=== Creating Autonomous Office $1,997/mo price ==="
AUTO_NEW=$(stripe_post prices \
  -d "product=$AUTO_PRODUCT" \
  -d "currency=usd" \
  -d "unit_amount=199700" \
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
echo "=== Creating Enterprise product (if not exists) ==="
ENT_PRODUCT=$(stripe_post products \
  -d "name=MetrAIyux 0S - Enterprise" \
  -d "description=Enterprise plan with custom AI credits, white-label, and dedicated support" \
  -d "metadata[source_folder]=metraiyux_0s_site" \
  -d "metadata[plan_id]=enterprise" \
  -d "metadata[offer_family]=metraiyux" \
  -d "metadata[status]=approved" \
  -d "statement_descriptor=METRAIYUX0S" | jq -r '.id')
echo "  Enterprise product: $ENT_PRODUCT"

echo ""
echo "=== Creating Enterprise $2,497/mo price ==="
ENT_MONTHLY=$(stripe_post prices \
  -d "product=$ENT_PRODUCT" \
  -d "currency=usd" \
  -d "unit_amount=249700" \
  -d "recurring[interval]=month" \
  -d "nickname=Enterprise monthly" \
  -d "lookup_key=metraiyux_enterprise_monthly" \
  -d "metadata[source_folder]=metraiyux_0s_site" \
  -d "metadata[plan_id]=enterprise" \
  -d "metadata[offer_family]=metraiyux" \
  -d "metadata[status]=approved")
ENT_MONTHLY_ID=$(echo "$ENT_MONTHLY" | jq -r '.id')
echo "  Monthly price ID: $ENT_MONTHLY_ID"

echo ""
echo "=== Creating Enterprise setup (one-time $10,000) ==="
ENT_SETUP=$(stripe_post prices \
  -d "product=$ENT_PRODUCT" \
  -d "currency=usd" \
  -d "unit_amount=1000000" \
  -d "nickname=Enterprise setup" \
  -d "lookup_key=metraiyux_enterprise_setup" \
  -d "metadata[plan_id]=enterprise" \
  -d "metadata[setup_for]=enterprise")
ENT_SETUP_ID=$(echo "$ENT_SETUP" | jq -r '.id')
echo "  Setup price ID: $ENT_SETUP_ID"

echo ""
echo "=== Patching $WORKER_FILE ==="
sed -i \
  "s|'autonomous-office': { setup: 'price_1TXzMFHEgCmnlKPJLlbhrjw4', monthly: 'price_1TXzMFHEgCmnlKPJCMP4nczh' }|'autonomous-office': { setup: 'price_1TXzMFHEgCmnlKPJLlbhrjw4', monthly: '$AUTO_NEW_ID' }|" \
  "$WORKER_FILE"

# Add enterprise entry if not present
if ! grep -q "'enterprise'" "$WORKER_FILE"; then
  sed -i \
    "s|'autonomous-office': { setup: 'price_1TXzMFHEgCmnlKPJLlbhrjw4', monthly: '$AUTO_NEW_ID' },|'autonomous-office': { setup: 'price_1TXzMFHEgCmnlKPJLlbhrjw4', monthly: '$AUTO_NEW_ID' },\n  'enterprise':         { setup: '$ENT_SETUP_ID', monthly: '$ENT_MONTHLY_ID' },|" \
    "$WORKER_FILE"
fi

echo ""
echo "=== Done ==="
echo "  Autonomous Office monthly: $AUTO_NEW_ID"
echo "  Enterprise monthly:        $ENT_MONTHLY_ID"
echo "  Enterprise setup:          $ENT_SETUP_ID"
echo ""
echo "Next: deploy the provisioning worker — cd metraiyux_0s_site/cloudflare-saas-provisioning-worker && wrangler deploy"
