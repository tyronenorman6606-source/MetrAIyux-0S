import test from 'node:test';
import assert from 'node:assert/strict';

import { handleSkyePayCheckoutCompletion } from '../netlify/functions/stripe-webhook.js';
import {
  buildSkyePayMetadata,
  getSkyePayClient,
  getSkyePayOffer
} from '../netlify/functions/_lib/skyepayCatalog.js';

const client = getSkyePayClient('metraiyux-0s');
const offer = getSkyePayOffer('skyevault-pro-access');

function legalAcceptance() {
  return {
    legal_terms_accepted: true,
    arbitration_accepted: true,
    payments_policy_accepted: true,
    no_outcome_guarantee_accepted: true,
    truthful_review_boundary_acknowledged: true,
    privacy_policy_accepted: true,
    accepted_at: '2026-05-31T00:00:00.000Z',
    acceptance_surface: 'skyepay-paid-vault-webhook-test'
  };
}

function vaultMetadata(orderId) {
  return buildSkyePayMetadata({
    client,
    offer,
    body: {
      customer_email: 'buyer@example.com',
      customer_name: 'Buyer Example',
      company_name: 'Buyer Vault Co',
      idempotency_key: `${orderId}:checkout`,
      legal_acceptance: legalAcceptance()
    },
    orderId,
    trialDays: 0
  });
}

function checkoutEvent({ id = 'cs_test_paid_vault', orderId = 'skypay_paid_vault', status = 'complete', paymentStatus = 'paid' } = {}) {
  return {
    id: `evt_${id}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        id,
        object: 'checkout.session',
        mode: 'subscription',
        status,
        payment_status: paymentStatus,
        customer: 'cus_test_vault',
        subscription: 'sub_test_vault',
        currency: 'usd',
        amount_total: 14900,
        metadata: vaultMetadata(orderId),
        customer_details: {
          email: 'buyer@example.com',
          name: 'Buyer Example'
        }
      }
    }
  };
}

function orderRow(id = 'skypay_paid_vault') {
  return {
    id,
    client_slug: client.slug,
    workspace_slug: 'buyer-vault-co',
    customer_email: 'buyer@example.com',
    customer_name: 'Buyer Example',
    company_name: 'Buyer Vault Co',
    offer_id: offer.id,
    offer_snapshot: offer,
    checkout_mode: 'subscription',
    payment_status: 'paid',
    approval_status: 'paid',
    owner_status: 'payment_confirmed',
    provisioning_status: 'ready_for_workspace',
    stripe_customer_id: 'cus_test_vault',
    stripe_subscription_id: 'sub_test_vault'
  };
}

test('paid SkyePay vault checkout provisions the buyer workspace and records the unlock result', async () => {
  const calls = [];
  const event = checkoutEvent();
  const order = orderRow();
  const provisionResult = {
    ok: true,
    workspace: { workspaceId: 'buyer-vault-co' },
    keyCreated: true,
    portalKey: 'portal_test_secret',
    repoEnv: {
      SKYEVAULT_DROP_URL: 'https://skyevault-drop.graylondonskyes.workers.dev',
      SKYEVAULT_PORTAL_KEY: 'portal_test_secret',
      SKYEVAULT_WORKSPACE_ID: 'buyer-vault-co',
      SKYEVAULT_DEVELOPER_ID: 'buyer',
      EXTRA_SECRET: 'must-not-be-stored-by-public-order-shape'
    }
  };

  const result = await handleSkyePayCheckoutCompletion(event, {
    upsertSkyePayOrderFromSession: async ({ session, source }) => {
      calls.push(['upsert', session.id, source]);
      assert.equal(session.metadata.skyepay, 'true');
      assert.equal(session.metadata.vault_workspace, 'true');
      return order;
    },
    mirrorStripeWebhookProviderRuntime: async () => {
      calls.push(['mirror']);
      return { ok: true, status: 200, provider_runtime: { receipt_id: 'runtime_receipt_test' } };
    },
    provisionVaultWorkspaceForOrder: async (receivedOrder, options) => {
      calls.push(['provision', receivedOrder.id, options.action, options.source]);
      assert.equal(receivedOrder.offer_id, 'skyevault-pro-access');
      assert.equal(options.action, 'provision');
      return provisionResult;
    },
    markVaultProvisioningResult: async (orderId, receivedResult, status) => {
      calls.push(['mark', orderId, status || 'workspace_unlocked']);
      assert.equal(orderId, order.id);
      assert.equal(receivedResult.repoEnv.SKYEVAULT_PORTAL_KEY, 'portal_test_secret');
    },
    holdSkyePayForPayment: async () => assert.fail('paid checkout must not be held for payment'),
    autoUnlockSkyePayOrder: async () => assert.fail('vault checkout must provision, not use the generic unlock path'),
    markVaultProvisioningFailure: async () => assert.fail('paid vault checkout should not fail provisioning'),
    audit: async (actor, action, target) => calls.push(['audit', actor, action, target])
  });

  assert.equal(result.handled, true);
  assert.equal(result.paymentReady, true);
  assert.equal(result.delivery, 'vault_workspace');
  assert.deepEqual(calls.map(([name]) => name), ['upsert', 'mirror', 'provision', 'mark', 'audit']);
  assert.equal(calls.at(-1)[2], 'SKYEPAY_STRIPE_WEBHOOK');
});

test('unpaid SkyePay vault checkout stays pending and does not provision', async () => {
  const calls = [];
  const event = checkoutEvent({
    id: 'cs_test_unpaid_vault',
    orderId: 'skypay_unpaid_vault',
    status: 'open',
    paymentStatus: 'unpaid'
  });

  const result = await handleSkyePayCheckoutCompletion(event, {
    upsertSkyePayOrderFromSession: async ({ session }) => {
      calls.push(['upsert', session.id]);
      return { ...orderRow('skypay_unpaid_vault'), payment_status: 'unpaid' };
    },
    mirrorStripeWebhookProviderRuntime: async () => {
      calls.push(['mirror']);
      return { ok: true, status: 200, provider_runtime: { receipt_id: 'runtime_receipt_pending' } };
    },
    holdSkyePayForPayment: async (session, eventType) => calls.push(['hold', session.id, eventType]),
    provisionVaultWorkspaceForOrder: async () => assert.fail('unpaid checkout must not provision vault access'),
    markVaultProvisioningResult: async () => assert.fail('unpaid checkout must not store vault unlock'),
    autoUnlockSkyePayOrder: async () => assert.fail('unpaid checkout must not unlock standard delivery'),
    markVaultProvisioningFailure: async () => assert.fail('unpaid checkout should be held, not failed'),
    audit: async (actor, action, target) => calls.push(['audit', actor, action, target])
  });

  assert.equal(result.handled, true);
  assert.equal(result.paymentReady, false);
  assert.equal(result.delivery, 'payment_pending');
  assert.deepEqual(calls.map(([name]) => name), ['upsert', 'mirror', 'hold', 'audit']);
});

test('non-SkyePay checkout events stay available for the older top-up handler', async () => {
  const result = await handleSkyePayCheckoutCompletion({
    id: 'evt_topup',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_topup',
        object: 'checkout.session',
        payment_status: 'paid',
        metadata: {
          customer_id: '123',
          month: '2026-05',
          amount_cents: '500'
        }
      }
    }
  }, {
    upsertSkyePayOrderFromSession: async () => assert.fail('non-SkyePay checkout should not enter SkyePay provisioning')
  });

  assert.equal(result, null);
});
