import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSkyeCommerceDynamicOffer,
  buildSkyePayMetadata,
  getSkyePayClient,
  normalizeSkyeCommerceDynamicCheckoutBody
} from '../netlify/functions/_lib/skyepayCatalog.js';
import {
  legalAcceptanceMetadata,
  missingLegalAcceptance,
  normalizeLegalAcceptance
} from '../netlify/functions/_lib/legalAcceptance.js';

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
