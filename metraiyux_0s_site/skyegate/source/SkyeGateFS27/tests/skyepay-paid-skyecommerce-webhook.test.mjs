import test from 'node:test';
import assert from 'node:assert/strict';

import { handleSkyePayCheckoutCompletion } from '../netlify/functions/stripe-webhook.js';
import {
  buildSkyeCommerceDynamicOffer,
  buildSkyePayMetadata,
  getSkyePayClient,
  stripeSafeSkyePayMetadata
} from '../netlify/functions/_lib/skyepayCatalog.js';
import {
  buildSkyeCommercePaymentWebhookBody,
  isSkyeCommerceOrder,
  notifySkyeCommercePaymentComplete
} from '../netlify/functions/_lib/skyepaySkyeCommerceProvisioning.js';

const dynamicBody = {
  source: 'skyecommerce',
  skyecommerce_dynamic: true,
  client_slug: 'metraiyux-0s',
  workspace_slug: 'demo-store',
  customer_email: 'buyer@example.com',
  customer_name: 'Buyer Example',
  company_name: 'Demo Store',
  idempotency_key: 'demo-store:ord_1:chk_1',
  skyecommerce: {
    source: 'skyecommerce',
    merchant_id: 'm_1',
    merchant_slug: 'demo-store',
    order_id: 'ord_1',
    order_number: 'SKY-1001',
    payment_transaction_id: 'pay_1',
    checkout_token: 'chk_1',
    amount_cents: 3200,
    currency: 'usd',
    line_items: [
      { id: 'order-balance', name: 'Order SKY-1001', amount_cents: 3200, quantity: 1 }
    ]
  }
};

function legalAcceptance() {
  return {
    legal_terms_accepted: true,
    arbitration_accepted: true,
    payments_policy_accepted: true,
    no_outcome_guarantee_accepted: true,
    truthful_review_boundary_acknowledged: true,
    privacy_policy_accepted: true,
    accepted_at: '2026-06-01T00:00:00.000Z',
    acceptance_surface: 'skyepay-paid-skyecommerce-webhook-test'
  };
}

function commerceMetadata(orderId = 'skypay_demo_store_ord_1') {
  const client = getSkyePayClient('metraiyux-0s');
  const dynamic = buildSkyeCommerceDynamicOffer({
    ...dynamicBody,
    legal_acceptance: legalAcceptance()
  });
  assert.equal(dynamic.ok, true);
  return stripeSafeSkyePayMetadata(buildSkyePayMetadata({
    client,
    offer: dynamic.offer,
    body: {
      ...dynamicBody,
      skyecommerce: dynamic.commerce,
      skyecommerce_dynamic: true,
      legal_acceptance: legalAcceptance()
    },
    orderId,
    trialDays: 0
  }));
}

function checkoutEvent(metadata = commerceMetadata()) {
  return {
    id: 'evt_skyepay_skyecommerce_paid',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_skyecommerce_paid',
        object: 'checkout.session',
        mode: 'payment',
        status: 'complete',
        payment_status: 'paid',
        customer: 'cus_test_commerce',
        currency: 'usd',
        amount_total: 3200,
        metadata,
        customer_details: {
          email: 'buyer@example.com',
          name: 'Buyer Example'
        }
      }
    }
  };
}

function orderRow(metadata = commerceMetadata()) {
  return {
    id: 'skypay_demo_store_ord_1',
    client_slug: 'metraiyux-0s',
    workspace_slug: 'demo-store',
    customer_email: 'buyer@example.com',
    customer_name: 'Buyer Example',
    company_name: 'Demo Store',
    offer_id: 'skyecommerce-demo-store-ord_1',
    offer_snapshot: {
      family: 'skyecommerce',
      activation_path: 'skyecommerce_order_payment_confirmed'
    },
    checkout_mode: 'payment',
    payment_status: 'paid',
    approval_status: 'payment_confirmed',
    owner_status: 'payment_confirmed',
    provisioning_status: 'auto_unlock_pending',
    stripe_customer_id: 'cus_test_commerce',
    metadata: { metadata }
  };
}

test('SkyePay compact Stripe metadata preserves SkyeCommerce checkout token for paid fulfillment', () => {
  const compact = commerceMetadata();
  assert.equal(compact.skyecommerce_dynamic, 'true');
  assert.equal(compact.skyecommerce_payment_transaction_id, 'pay_1');
  assert.equal(compact.skyecommerce_checkout_token, 'chk_1');
  assert.ok(Object.keys(compact).length <= 50);
});

test('paid SkyeCommerce checkout notifies SkyeCommerce instead of using generic unlock', async () => {
  const calls = [];
  const metadata = commerceMetadata();
  const order = orderRow(metadata);
  const result = await handleSkyePayCheckoutCompletion(checkoutEvent(metadata), {
    upsertSkyePayOrderFromSession: async ({ session, source }) => {
      calls.push(['upsert', session.id, source]);
      assert.equal(session.metadata.skyecommerce_checkout_token, 'chk_1');
      return order;
    },
    mirrorStripeWebhookProviderRuntime: async () => {
      calls.push(['mirror']);
      return { ok: true, status: 200, provider_runtime: { receipt_id: 'runtime_receipt_skyecommerce' } };
    },
    isVaultProvisioningOrder: () => false,
    isSkyeMailMailboxOrder: () => false,
    isSkyeCommerceOrder,
    notifySkyeCommercePaymentComplete: async (receivedOrder, session, options) => {
      calls.push(['commerce-webhook', receivedOrder.id, session.id, options.eventId]);
      const body = buildSkyeCommercePaymentWebhookBody(receivedOrder, session, options);
      assert.equal(body.checkoutToken, 'chk_1');
      assert.equal(body.providerReference, 'cs_test_skyecommerce_paid');
      assert.equal(body.status, 'paid');
      assert.equal(body.amountCents, 3200);
      return { ok: true, status: 200, checkoutToken: body.checkoutToken, url: 'https://commerce.test/api/payments/webhook' };
    },
    markSkyeCommercePaymentDeliveryResult: async (orderId, delivery) => {
      calls.push(['mark-commerce', orderId, delivery.checkoutToken]);
    },
    markSkyeCommercePaymentDeliveryFailure: async () => assert.fail('paid SkyeCommerce checkout should not mark callback failure'),
    autoUnlockSkyePayOrder: async () => assert.fail('SkyeCommerce dynamic orders must notify SkyeCommerce, not generic unlock'),
    audit: async (actor, action, target) => calls.push(['audit', actor, action, target])
  });

  assert.equal(result.handled, true);
  assert.equal(result.paymentReady, true);
  assert.equal(result.delivery, 'skyecommerce_order');
  assert.deepEqual(calls.map(([name]) => name), ['upsert', 'mirror', 'commerce-webhook', 'mark-commerce', 'audit']);
});

test('SkyeCommerce notification signs the existing payment webhook with the shared commerce secret', async () => {
  const requests = [];
  const result = await notifySkyeCommercePaymentComplete(orderRow(), checkoutEvent().data.object, {
    eventId: 'evt_skyepay_skyecommerce_paid',
    env: {
      SKYECOMMERCE_PAYMENT_WEBHOOK_URL: 'https://commerce.test/api/payments/webhook',
      SKYEPAY_COMMERCE_SHARED_SECRET: 'shared-commerce-secret'
    },
    fetch: async (url, init) => {
      requests.push({ url, init });
      assert.equal(url, 'https://commerce.test/api/payments/webhook');
      assert.equal(init.method, 'POST');
      assert.match(init.headers['x-skyepay-commerce-signature'], /^sha256=[a-f0-9]{64}$/);
      const body = JSON.parse(init.body);
      assert.equal(body.checkoutToken, 'chk_1');
      assert.equal(body.provider, 'skyepay');
      assert.equal(body.status, 'paid');
      return new Response(JSON.stringify({ ok: true, transaction: { id: 'pay_1', status: 'paid' } }), { status: 200 });
    }
  });

  assert.equal(requests.length, 1);
  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(result.checkoutToken, 'chk_1');
});
