import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSkyeCommerceDynamicOffer,
  buildStripeLineItemsWithCatalogPrices,
  buildSkyePayMetadata,
  getSkyePayClient,
  getSkyePayOffer,
  makeDemoSession,
  publicOffer,
  skyePayDeliveryReturnUrl,
  SKYPAY_OFFERS,
  stripeSafeSkyePayMetadata,
  normalizeSkyeCommerceDynamicCheckoutBody
} from '../netlify/functions/_lib/skyepayCatalog.js';
import {
  legalAcceptanceMetadata,
  missingLegalAcceptance,
  normalizeLegalAcceptance
} from '../netlify/functions/_lib/legalAcceptance.js';
import {
  publicSkyePayOrder
} from '../netlify/functions/_lib/skyepaySecurity.js';
import {
  isVaultProvisioningOrder,
  skyePayVaultPlanLimits
} from '../netlify/functions/_lib/skyepayVaultProvisioning.js';
import {
  publicSkyeMeritCatalog
} from '../netlify/functions/_lib/skyeMerit.js';

const dynamicBody = {
  source: 'skyecommerce',
  skyecommerce_dynamic: true,
  client_slug: 'metraiyux-0s',
  workspace_slug: 'demo-store',
  customer_email: 'buyer@example.com',
  company_name: 'Demo Store',
  idempotency_key: 'demo-store:ord_1:chk_1',
  skyecommerce: {
    source: 'skyecommerce',
    merchant_id: 'm_1',
    merchant_slug: 'demo-store',
    merchant_brand_name: 'Demo Store',
    order_id: 'ord_1',
    order_number: 'SKY-1001',
    payment_transaction_id: 'pay_1',
    checkout_token: 'chk_1',
    amount_cents: 3200,
    currency: 'usd',
    line_items: [
      { id: 'prd_1', name: 'Hat x2', amount_cents: 2500, quantity: 1 },
      { id: 'shipping', name: 'Shipping', amount_cents: 500, quantity: 1 },
      { id: 'tax', name: 'Tax', amount_cents: 200, quantity: 1 }
    ]
  }
};

test('SkyePay accepts signed SkyeCommerce dynamic cart shape as a one-time offer', () => {
  const normalized = normalizeSkyeCommerceDynamicCheckoutBody(dynamicBody);
  assert.equal(normalized.ok, true);
  assert.equal(normalized.amountCents, 3200);
  assert.equal(normalized.lineItems.length, 3);

  const dynamic = buildSkyeCommerceDynamicOffer(dynamicBody);
  assert.equal(dynamic.ok, true);
  assert.equal(dynamic.offer.family, 'skyecommerce');
  assert.equal(dynamic.offer.mode, 'payment');
  assert.equal(dynamic.offer.owner_approval_required, false);
  assert.equal(dynamic.offer.line_items.reduce((sum, item) => sum + item.amount_cents, 0), 3200);
});

test('SkyePay rejects dynamic checkout totals that do not match line items', () => {
  const bad = normalizeSkyeCommerceDynamicCheckoutBody({
    ...dynamicBody,
    skyecommerce: { ...dynamicBody.skyecommerce, amount_cents: 9999 }
  });
  assert.equal(bad.ok, false);
  assert.match(bad.error, /line total/i);
});

test('SkyePay metadata carries SkyeCommerce merchant and order IDs', () => {
  const dynamic = buildSkyeCommerceDynamicOffer(dynamicBody);
  const metadata = buildSkyePayMetadata({
    client: getSkyePayClient('metraiyux-0s'),
    offer: dynamic.offer,
    body: { ...dynamicBody, skyecommerce: dynamic.commerce, skyecommerce_dynamic: true },
    orderId: 'skypay_demo',
    trialDays: 0
  });
  assert.equal(metadata.skyecommerce_dynamic, 'true');
  assert.equal(metadata.skyecommerce_order_id, 'ord_1');
  assert.equal(metadata.skyecommerce_payment_transaction_id, 'pay_1');
});

test('SkyePay sends Stripe a compact metadata set under provider limits', () => {
  const offer = getSkyePayOffer('skyevault-pro-access');
  const client = getSkyePayClient('metraiyux-0s');
  const metadata = buildSkyePayMetadata({
    client,
    offer,
    body: {
      customer_email: 'buyer@example.com',
      customer_name: 'Buyer Example',
      company_name: 'Buyer Co',
      idempotency_key: 'stripe-compact-proof',
      legal_acceptance: {
        legal_terms_accepted: true,
        arbitration_accepted: true,
        payments_policy_accepted: true,
        no_outcome_guarantee_accepted: true,
        truthful_review_boundary_acknowledged: true,
        privacy_policy_accepted: true,
        accepted_at: '2026-05-30T00:00:00.000Z',
        acceptance_surface: 'test'
      }
    },
    orderId: 'skypay_compact',
    trialDays: 7
  });
  const compact = stripeSafeSkyePayMetadata(metadata);
  assert.ok(Object.keys(metadata).length > 50);
  assert.ok(Object.keys(compact).length <= 50);
  assert.equal(compact.skyepay, 'true');
  assert.equal(compact.offer_id, 'skyevault-pro-access');
  assert.equal(compact.vault_workspace, 'true');
  assert.equal(compact.legal_terms_accepted, 'true');
});

test('SkyePay static public catalog offers require live Stripe lookup-key prices', async () => {
  const staticOffers = SKYPAY_OFFERS.filter((offer) => offer.storefront !== false);
  const notRequired = staticOffers.filter((offer) => offer.require_stripe_lookup_key !== true);
  assert.equal(notRequired.length, 0, notRequired.map((offer) => offer.id).join(', '));

  const offer = getSkyePayOffer('brandforge-ai-generation');
  const client = getSkyePayClient('metraiyux-0s');
  const missingStripe = { prices: { list: async () => ({ data: [] }) } };
  await assert.rejects(
    buildStripeLineItemsWithCatalogPrices({ stripe: missingStripe, offer, client }),
    /Required Stripe lookup-key price is missing/
  );
});

test('SkyePay public offers expose a customer fulfillment contract', () => {
  const client = getSkyePayClient('metraiyux-0s');
  const publicOffers = SKYPAY_OFFERS.filter((offer) => offer.storefront !== false);
  assert.ok(publicOffers.length >= 100);
  for (const offer of publicOffers) {
    const exposed = publicOffer(offer, client);
    assert.equal(typeof exposed.fulfillment?.type, 'string', offer.id);
    assert.equal(typeof exposed.fulfillment?.activation_label, 'string', offer.id);
    assert.equal(typeof exposed.fulfillment?.customer_next_step, 'string', offer.id);
    assert.equal(typeof exposed.fulfillment?.delivery_surface, 'string', offer.id);
    assert.equal(typeof exposed.fulfillment?.support_email, 'string', offer.id);
    assert.notEqual(exposed.fulfillment.activation_label.length, 0, offer.id);
    assert.notEqual(exposed.fulfillment.customer_next_step.length, 0, offer.id);
    assert.equal(JSON.stringify(exposed.fulfillment).includes('zoho'), false, offer.id);
    assert.equal(JSON.stringify(exposed.fulfillment).includes('resend'), false, offer.id);
    assert.equal(JSON.stringify(exposed.fulfillment).includes('provider-backed'), false, offer.id);
  }

  const skyemailStarter = publicOffer(getSkyePayOffer('skyemail-starter-mailbox'), client).fulfillment;
  assert.equal(skyemailStarter.type, 'skyemail_mailbox');
  assert.equal(skyemailStarter.owner_review_required, true);
  assert.equal(skyemailStarter.self_serve_after_payment, false);
  assert.match(skyemailStarter.activation_label, /capacity/i);
  assert.equal(publicOffer(getSkyePayOffer('skyevault-pro-access'), client).fulfillment.type, 'skyevault_agent');
  assert.equal(publicOffer(getSkyePayOffer('sovereigndocs-legal-review-lane'), client).fulfillment.type, 'operator_triage');
});

test('SkyePay public SkyeMerit catalog does not expose owner-only free checkout codes', () => {
  const catalog = publicSkyeMeritCatalog();
  const text = JSON.stringify(catalog);
  assert.equal(text.includes('GRAYSCAPE467'), false);
  assert.equal(text.includes('owner_qa_unlimited'), false);
  assert.equal(catalog.stack_policy.owner_free_checkout_codes_public, false);
  assert.equal(catalog.rules.some((rule) => rule.allow_free_checkout === true), false);
  assert.equal(catalog.packs.some((pack) => pack.audience === 'owner_qa_unlimited'), false);
});

test('SkyePay can include owner-only SkyeMerit catalog only through explicit internal option', () => {
  const catalog = publicSkyeMeritCatalog({ includeOwnerQa: true });
  assert.equal(catalog.rules.some((rule) => rule.code === 'GRAYSCAPE467' && rule.allow_free_checkout === true), true);
  assert.equal(catalog.packs.some((pack) => pack.audience === 'owner_qa_unlimited'), true);
});

test('SkyePay required static offers cannot disable lookup-key enforcement by env flag', async () => {
  const previous = process.env.SKYPAY_USE_STRIPE_LOOKUP_KEYS;
  process.env.SKYPAY_USE_STRIPE_LOOKUP_KEYS = 'false';
  try {
    const offer = getSkyePayOffer('brandforge-ai-generation');
    const client = getSkyePayClient('metraiyux-0s');
    await assert.rejects(
      buildStripeLineItemsWithCatalogPrices({ stripe: null, offer, client }),
      /lookup-key price lookup is disabled/
    );
  } finally {
    if (previous == null) delete process.env.SKYPAY_USE_STRIPE_LOOKUP_KEYS;
    else process.env.SKYPAY_USE_STRIPE_LOOKUP_KEYS = previous;
  }
});

test('SkyePay still allows signed dynamic SkyeCommerce carts to use runtime price data', async () => {
  const dynamic = buildSkyeCommerceDynamicOffer(dynamicBody);
  const client = getSkyePayClient('metraiyux-0s');
  const missingStripe = { prices: { list: async () => ({ data: [] }) } };
  const lineItems = await buildStripeLineItemsWithCatalogPrices({ stripe: missingStripe, offer: dynamic.offer, client });
  assert.equal(dynamic.offer.require_stripe_lookup_key, false);
  assert.equal(lineItems.length, 3);
  assert.ok(lineItems.every((item) => item.price_data));
});

test('SkyeVault offers return paid and proof sessions to the agent install center', () => {
  const client = getSkyePayClient('metraiyux-0s');
  const offer = getSkyePayOffer('skyevault-pro-access');
  const returnUrl = new URL(skyePayDeliveryReturnUrl({
    client,
    offer,
    origin: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev'
  }));

  assert.equal(returnUrl.origin, 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev');
  assert.equal(returnUrl.pathname, '/skye-vault-os/agent/');
  assert.equal(returnUrl.searchParams.get('session_id'), '{CHECKOUT_SESSION_ID}');
  assert.equal(returnUrl.searchParams.get('offer'), 'skyevault-pro-access');
  assert.equal(returnUrl.searchParams.get('status'), 'success');

  const demo = makeDemoSession({
    client,
    offer,
    body: { idempotency_key: 'proof-agent-return' },
    origin: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev'
  });
  const demoUrl = new URL(demo.url);
  assert.equal(demoUrl.origin, 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev');
  assert.equal(demoUrl.pathname, '/skye-vault-os/agent/');
  assert.equal(demoUrl.searchParams.get('demo_session'), demo.id);
  assert.equal(demoUrl.searchParams.get('offer'), 'skyevault-pro-access');
});

test('SkyeVault paid plan limits pass to provisioning without the old 200-file choke point', () => {
  const starter = skyePayVaultPlanLimits({ offer_snapshot: getSkyePayOffer('skyevault-starter-access') });
  const pro = skyePayVaultPlanLimits({ offer_snapshot: getSkyePayOffer('skyevault-pro-access') });
  const command = skyePayVaultPlanLimits({ offer_snapshot: getSkyePayOffer('skyevault-command-access') });

  assert.equal(starter.maxFilesPerSubmission, 250);
  assert.equal(starter.maxTotalSubmissionGb, 1);
  assert.equal(pro.maxFilesPerSubmission, 1500);
  assert.equal(pro.maxTotalSubmissionGb, 25);
  assert.equal(command.maxFilesPerSubmission, 10000);
  assert.equal(command.maxTotalSubmissionGb, 100);
});

test('SkyeVault agent delivery metadata names the real buyer auth lane', () => {
  for (const offerId of ['skyevault-starter-access', 'skyevault-pro-access', 'skyevault-command-access', 'skyevault-auto-install-addon']) {
    const offer = getSkyePayOffer(offerId);
    assert.equal(offer.delivery.auth_model, 'skyevault-portal-key-plus-optional-shared-gate');
    assert.match(offer.delivery.install_center, /\/skye-vault-os\/agent\//);
    assert.match(offer.delivery.agent_package, /\/downloads\/skyevault-agent\/releases\/latest\/skyevault-agent-latest\.tar\.gz$/);
  }
});

test('SkyeVault auto-install add-on is a real $13 SKU but does not mint a second vault workspace', () => {
  const offer = getSkyePayOffer('skyevault-auto-install-addon');
  assert.equal(offer.mode, 'payment');
  assert.equal(offer.line_items[0].amount_cents, 1300);
  assert.equal(offer.provisioning.workspace_required, false);
  assert.match(offer.delivery.auto_install_command, /SKYEVAULT_AGENT_AUTO_INSTALL=1/);
  assert.equal(isVaultProvisioningOrder({ offer_id: offer.id, offer_snapshot: offer, metadata: {} }), false);
});

test('SkyeVault paid agent delivery exposes repo env only to session status after unlock', () => {
  const offer = getSkyePayOffer('skyevault-pro-access');
  const row = {
    id: 'skypay_agent_delivery',
    client_slug: 'metraiyux-0s',
    workspace_slug: 'buyer-workspace',
    customer_email: 'buyer@example.com',
    offer_id: 'skyevault-pro-access',
    offer_snapshot: offer,
    amount_setup_cents: 0,
    amount_recurring_cents: 14900,
    currency: 'usd',
    checkout_mode: 'subscription',
    payment_status: 'paid',
    approval_status: 'approved',
    owner_status: 'auto_approved',
    provisioning_status: 'workspace_unlocked',
    paid_at: '2026-05-31T00:00:00.000Z',
    approved_at: '2026-05-31T00:00:00.000Z',
    provisioned_at: '2026-05-31T00:00:00.000Z',
    created_at: '2026-05-31T00:00:00.000Z',
    updated_at: '2026-05-31T00:00:00.000Z',
    metadata: {
      vault_provisioning: {
        ok: true,
        workspaceId: 'buyer-workspace',
        keyCreated: true,
        repoEnv: {
          SKYEVAULT_DROP_URL: 'https://skyevault-drop.graylondonskyes.workers.dev',
          SKYEVAULT_PORTAL_KEY: 'portal_secret_not_for_public_order_lookup',
          SKYEVAULT_WORKSPACE_ID: 'buyer-workspace',
          SKYEVAULT_DEVELOPER_ID: 'buyer',
          EXTRA_SECRET: 'must-not-leak'
        }
      }
    }
  };

  const publicOrder = publicSkyePayOrder(row);
  assert.equal(publicOrder.agent_delivery.unlocked, true);
  assert.equal(publicOrder.agent_delivery.portal_key_available, true);
  assert.equal(publicOrder.agent_delivery.repo_env, undefined);
  assert.equal(JSON.stringify(publicOrder).includes('portal_secret_not_for_public_order_lookup'), false);

  const sessionOrder = publicSkyePayOrder(row, { includeVaultAgentSecrets: true });
  assert.equal(sessionOrder.agent_delivery.repo_env.SKYEVAULT_PORTAL_KEY, 'portal_secret_not_for_public_order_lookup');
  assert.equal(sessionOrder.agent_delivery.repo_env.EXTRA_SECRET, undefined);
});

test('SkyeMail paid mailbox delivery exposes safe provisioned mailbox details publicly', () => {
  const offer = getSkyePayOffer('skyemail-starter-mailbox');
  const row = {
    id: 'skypay_mailbox_delivery',
    client_slug: 'metraiyux-0s-skm',
    workspace_slug: 'buyer-mail',
    customer_email: 'buyer@example.com',
    offer_id: 'skyemail-starter-mailbox',
    offer_snapshot: offer,
    amount_setup_cents: 0,
    amount_recurring_cents: 900,
    currency: 'usd',
    checkout_mode: 'subscription',
    payment_status: 'paid',
    approval_status: 'approved',
    owner_status: 'auto_approved',
    provisioning_status: 'skyemail_mailbox_provisioned',
    provisioned_at: '2026-06-01T00:00:00.000Z',
    metadata: {
      skyemail_mailbox: 'true',
      skyemail_mailbox_email: 'frontdesk@solenterprises.org',
      skyemail_mailbox_local_part: 'frontdesk',
      skyemail_mailbox_domain: 'solenterprises.org',
      skyemail_provisioning: {
        ok: true,
        mailbox_email: 'frontdesk@solenterprises.org',
        mailbox_id: 'mailbox_123',
        provider: 'internal-mail-route',
        provisioning_status: 'provisioned',
        inbox_ready: true,
        key_state_active: true,
        provisioned_at: '2026-06-01T00:00:00.000Z'
      }
    }
  };

  const publicOrder = publicSkyePayOrder(row);
  assert.equal(publicOrder.skyemail_mailbox.mailbox_email, 'frontdesk@solenterprises.org');
  assert.equal(publicOrder.skyemail_mailbox.provider, undefined);
  assert.equal(publicOrder.skyemail_mailbox.mailbox_status, 'provisioned');
  assert.equal(publicOrder.skyemail_mailbox.inbox_ready, true);
  assert.equal(publicOrder.skyemail_mailbox.needs_customer_mailbox_claim, false);
  assert.equal(publicOrder.fulfillment.type, 'skyemail_mailbox');
  assert.equal(publicOrder.fulfillment.access_state, 'available_or_approved');
  assert.equal(publicOrder.fulfillment.self_serve_after_payment, false);
  assert.match(publicOrder.fulfillment.customer_next_step, /mailbox use begins only after SkyeMail capacity/i);
  assert.equal(JSON.stringify(publicOrder).includes('buyer@example.com'), false);
});

test('SkyePay Legal Skyes acceptance normalizes to Stripe metadata', () => {
  const missing = missingLegalAcceptance({});
  assert.deepEqual(missing.sort(), [
    'arbitration_accepted',
    'legal_terms_accepted',
    'no_outcome_guarantee_accepted',
    'payments_policy_accepted',
    'privacy_policy_accepted',
    'truthful_review_boundary_acknowledged'
  ].sort());

  const acceptance = normalizeLegalAcceptance({
    legal_acceptance:{
      legal_terms_accepted:true,
      arbitration_accepted:true,
      payments_policy_accepted:true,
      no_outcome_guarantee_accepted:true,
      truthful_review_boundary_acknowledged:true,
      privacy_policy_accepted:true,
      accepted_at:'2026-05-28T12:00:00.000Z',
      acceptance_surface:'test'
    }
  });
  assert.equal(acceptance.legal_terms_accepted, true);
  assert.equal(missingLegalAcceptance({legal_acceptance: acceptance}).length, 0);

  const metadata = legalAcceptanceMetadata({legal_acceptance: acceptance}, 'test');
  assert.equal(metadata.legal_terms_accepted, 'true');
  assert.equal(metadata.arbitration_accepted, 'true');
  assert.match(metadata.legal_arbitration_url, /in-house-arbitration/);
});
