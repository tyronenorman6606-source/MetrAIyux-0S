const ZERO_OS_BRIDGE_LINKS = Object.freeze([
  {
    id: 'gate',
    label: '0S Gate / Free99 Session',
    href: '/admin/login.html',
    lane: 'identity',
    purpose: 'Shared owner/operator access. SkyeCommerce must not create its own owner password lane.'
  },
  {
    id: 'skyepay',
    label: 'SkyPay Account + Checkout',
    href: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s',
    lane: 'money',
    purpose: 'Buyer payment collection through SkyPay/Stripe with order, merchant, and storefront identifiers preserved.'
  },
  {
    id: 'workforce',
    label: 'Workforce / Contractor Packet',
    href: '/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/onboarding.html',
    lane: 'paperwork',
    purpose: 'Merchant, artist, vendor, or contractor paperwork before payout release.'
  },
  {
    id: 'packet-inbox',
    label: 'Contractor Packet Inbox',
    href: '/Marketing-Made-Easy/WebGrowthOperator/ae-command-hub/contractor-packet-inbox.html',
    lane: 'paperwork',
    purpose: 'Operator review room for received agreements, W-9/vendor packets, and payout holds.'
  },
  {
    id: 'sovereigndocs',
    label: 'SovereignDocs Commerce Desk',
    href: '/Free99/apps/sovereigndocs/categories/website-digital-commerce/?source=skyecommerce',
    lane: 'documents',
    purpose: 'Policies, seller agreements, privacy, refund, shipping, license, and creator platform drafts.'
  },
  {
    id: 'skyenet',
    label: 'SkyeNet / Drop Deploy',
    href: '/SkyeMusicNexus/public/drops.html',
    lane: 'publishing',
    purpose: 'Plan-limited public page/store publishing for artist and storefront drops.'
  },
  {
    id: 'music-nexus',
    label: 'SkyeMusicNexus Store',
    href: '/SkyeMusicNexus/public/store.html',
    lane: 'artist-business',
    purpose: 'Attach artist identity, products, drops, and storefront plan limits.'
  },
  {
    id: 'routex',
    label: 'SkyeRouteX Workforce Command',
    href: '/live/skyeroutex-workforce-command.html',
    lane: 'fulfillment',
    purpose: 'Workforce, vendor, contractor, proof, assignment, and payout-state operations.'
  },
  {
    id: 'ae-flow',
    label: '0S AE Flow',
    href: '/Marketing-Made-Easy/AE-FlowPro/',
    lane: 'growth',
    purpose: 'Shared 0S acquisition and onboarding lane, not the retired SkyeCommerce-local AE app.'
  }
]);

function present(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return String(value || '').trim().length > 0;
}

function step(id, label, ready, detail, href = '') {
  return { id, label, ready: Boolean(ready), detail, href };
}

export function buildMerchantOnboardingReadiness({
  merchant = {},
  products = [],
  shippingProfiles = [],
  taxProfiles = [],
  discounts = [],
  analytics = {},
  payoutProfile = null,
  payoutMethods = [],
  musicNexusLink = null,
  providerConnections = []
} = {}) {
  const activeProducts = (products || []).filter((item) => String(item.status || '').toLowerCase() === 'active');
  const activeProviders = (providerConnections || []).filter((item) => item.active !== false);
  const steps = [
    step('gate-session', 'Shared 0S gate session', true, 'Access is owned by FS27/SkyGate/Free99.', ZERO_OS_BRIDGE_LINKS[0].href),
    step('profile', 'Store profile', present(merchant.brandName || merchant.brand_name) && present(merchant.slug), 'Brand name, slug, currency, and storefront theme are saved.', '/SkyeCommerce/merchant/'),
    step('products', 'Sellable products', activeProducts.length > 0, `${activeProducts.length} active product(s) ready.`, '/SkyeCommerce/merchant/#products'),
    step('inventory', 'Inventory control', activeProducts.some((item) => item.trackInventory || Number(item.inventoryOnHand || 0) > 0), 'Tracked stock or on-hand counts prevent blind selling.', '/SkyeCommerce/merchant/#inventory'),
    step('shipping', 'Shipping profile', present(shippingProfiles), `${(shippingProfiles || []).length} shipping profile(s).`, '/SkyeCommerce/merchant/#shipping'),
    step('tax', 'Tax policy', present(taxProfiles), `${(taxProfiles || []).length} tax profile(s); nexus rollups track threshold motion.`, '/SkyeCommerce/merchant/#tax'),
    step('discounts', 'Discount controls', true, `${(discounts || []).length} discount code(s); optional for launch.`, '/SkyeCommerce/merchant/#discounts'),
    step('skyepay', 'SkyPay money lane', true, 'Checkout can route through SkyPay while SkyeCommerce records merchant receivables.', ZERO_OS_BRIDGE_LINKS[1].href),
    step('payout-paperwork', 'Payout paperwork readiness', Boolean(payoutProfile?.ready), payoutProfile?.ready ? 'Agreement, tax profile, and payout method are ready.' : `Blocked: ${(payoutProfile?.blockers || ['agreement/tax/method review']).join(', ')}`, ZERO_OS_BRIDGE_LINKS[2].href),
    step('payout-method', 'Payout method on file', (payoutMethods || []).some((item) => item.active), `${(payoutMethods || []).filter((item) => item.active).length} active method(s).`, '/SkyeCommerce/merchant/#payouts'),
    step('music-nexus', 'Music Nexus attachment', Boolean(musicNexusLink), musicNexusLink ? `Attached to ${musicNexusLink.artistName || musicNexusLink.nexusArtistId || musicNexusLink.nexusEmail}.` : 'Optional unless this store belongs to an artist.', ZERO_OS_BRIDGE_LINKS[6].href),
    step('provider-ops', 'Provider/operator connections', activeProviders.length > 0, `${activeProviders.length} active provider connection(s); operator can still run SkyPay/internal lanes.`, '/SkyeCommerce/merchant/#providers'),
    step('analytics', 'Analytics dashboard', true, `${analytics?.counts?.orders || 0} orders, ${analytics?.counts?.customers || 0} customers, ${analytics?.counts?.products || products.length} products.`, '/SkyeCommerce/merchant/#analytics')
  ];
  const blockers = steps.filter((item) => !item.ready && !['discounts', 'music-nexus', 'provider-ops'].includes(item.id));
  return {
    ok: blockers.length === 0,
    launchMode: blockers.length === 0 ? 'ready_for_live_storefront' : 'guided_setup_required',
    blockerCount: blockers.length,
    blockers: blockers.map((item) => item.id),
    steps,
    zeroOsBridgeLinks: ZERO_OS_BRIDGE_LINKS,
    checkoutArchitecture: {
      buyerPays: 'SkyPay / Stripe-backed checkout',
      fundsLand: 'Skyes Over London company account',
      identityTrackedBy: ['merchantId', 'storeSlug', 'orderId', 'paymentTransactionId', 'providerReference'],
      payoutRelease: 'Internal SkyPay/company payout after paperwork, refund/dispute holds, and owner approval',
      noStripeConnectRequiredForMerchant: true
    }
  };
}
