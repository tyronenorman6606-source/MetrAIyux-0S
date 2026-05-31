import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSkyeCommerceDynamicOffer,
  buildSkyePayMetadata,
  getSkyePayClient,
  getSkyePayOffer,
  makeDemoSession,
  skyePayDeliveryReturnUrl,
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
