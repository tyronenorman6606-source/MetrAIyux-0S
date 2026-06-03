import test from 'node:test';
import assert from 'node:assert/strict';

import { handleSkyePayCheckoutCompletion } from '../netlify/functions/stripe-webhook.js';
import {
  buildSkyePayMetadata,
  getSkyePayClient,
  getSkyePayOffer
} from '../netlify/functions/_lib/skyepayCatalog.js';
import {
  isSkyeMailMailboxOrder,
  skyeMailMailboxClaim
} from '../netlify/functions/_lib/skyepaySkyeMailProvisioning.js';

const client = getSkyePayClient('metraiyux-0s-skm');
const capacityGatedOffer = getSkyePayOffer('skyemail-starter-mailbox');
const autoProvisionOffer = {
  ...capacityGatedOffer,
  owner_approval_required: false,
  activation_path: 'skyepay_confirmed_skyemail_mailbox_auto_provision',
  gate_policy: {
    ...capacityGatedOffer.gate_policy,
    skyemail_mailbox: {
      ...capacityGatedOffer.gate_policy.skyemail_mailbox,
      enabled_after_skyepay: true,
      capacity_verification_required: false
    }
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
    acceptance_surface: 'skyepay-paid-skyemail-webhook-test'
  };
}

function mailboxMetadata(orderId, body = {}, activeOffer = capacityGatedOffer) {
  return buildSkyePayMetadata({
    client,
    offer: activeOffer,
    body: {
      customer_email: 'owner@example.com',
      customer_name: 'Owner Example',
      company_name: 'Owner Mail Co',
      mailbox_local_part: 'frontdesk',
      mailbox_domain: 'solenterprises.org',
      idempotency_key: `${orderId}:checkout`,
      legal_acceptance: legalAcceptance(),
      ...body
    },
    orderId,
    trialDays: 0
  });
}

function checkoutEvent({ id = 'cs_test_paid_skyemail', orderId = 'skypay_paid_skyemail', metadata = null } = {}) {
  return {
    id: `evt_${id}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        id,
        object: 'checkout.session',
        mode: 'subscription',
        status: 'complete',
        payment_status: 'paid',
        customer: 'cus_test_skyemail',
        subscription: 'sub_test_skyemail',
        currency: 'usd',
        amount_total: 900,
        metadata: metadata || mailboxMetadata(orderId),
        customer_details: {
          email: 'owner@example.com',
          name: 'Owner Example'
        }
      }
    }
  };
}

function orderRow(id = 'skypay_paid_skyemail', metadata = mailboxMetadata(id, {}, autoProvisionOffer), activeOffer = autoProvisionOffer) {
  return {
    id,
    client_slug: client.slug,
    workspace_slug: 'owner-mail-co',
    customer_email: 'owner@example.com',
    customer_name: 'Owner Example',
    company_name: 'Owner Mail Co',
    offer_id: activeOffer.id,
    offer_snapshot: activeOffer,
    checkout_mode: 'subscription',
    payment_status: 'paid',
    approval_status: 'payment_confirmed',
    owner_status: 'payment_confirmed',
    provisioning_status: 'auto_unlock_pending',
    stripe_customer_id: 'cus_test_skyemail',
    stripe_subscription_id: 'sub_test_skyemail',
    metadata: { metadata }
  };
}

test('paid SkyePay mailbox checkout calls SkyeMail workspace provisioning and records mailbox state', async () => {
  const calls = [];
  const metadata = mailboxMetadata('skypay_paid_skyemail', {}, autoProvisionOffer);
  const event = checkoutEvent({ metadata });
  const order = orderRow('skypay_paid_skyemail', metadata, autoProvisionOffer);
  const provisionResult = {
    ok: true,
    mailbox: {
      id: 'mailbox_123',
      mailbox_email: 'frontdesk@solenterprises.org',
      status: 'active',
      provisioning_status: 'provisioned',
      provider: 'zoho'
    },
    inbox_ready: true,
    key_state: { active: true }
  };

  const result = await handleSkyePayCheckoutCompletion(event, {
    upsertSkyePayOrderFromSession: async ({ session, source }) => {
      calls.push(['upsert', session.id, source]);
      assert.equal(session.metadata.skyepay, 'true');
      assert.equal(session.metadata.skyemail_mailbox, 'true');
      assert.equal(session.metadata.skyemail_mailbox_email, 'frontdesk@solenterprises.org');
      return order;
    },
    mirrorStripeWebhookProviderRuntime: async () => {
      calls.push(['mirror']);
      return { ok: true, status: 200, provider_runtime: { receipt_id: 'runtime_receipt_skyemail' } };
    },
    isVaultProvisioningOrder: () => false,
    isSkyeMailMailboxOrder: (receivedOrder) => {
      calls.push(['mailbox-check', receivedOrder.id]);
      return true;
    },
    provisionSkyeMailMailboxForOrder: async (receivedOrder, options) => {
      calls.push(['provision', receivedOrder.id, options.action, options.source]);
      assert.equal(receivedOrder.offer_id, 'skyemail-starter-mailbox');
      assert.equal(options.action, 'provision');
      return provisionResult;
    },
    markSkyeMailProvisioningResult: async (orderId, receivedResult) => {
      calls.push(['mark', orderId, receivedResult.mailbox.mailbox_email]);
      assert.equal(orderId, order.id);
      assert.equal(receivedResult.mailbox.provisioning_status, 'provisioned');
    },
    holdSkyePayForPayment: async () => assert.fail('paid mailbox checkout must not be held for payment'),
    autoUnlockSkyePayOrder: async () => assert.fail('mailbox checkout must provision SkyeMail, not use generic unlock'),
    markSkyeMailProvisioningNeedsInput: async () => assert.fail('mailbox claim was provided'),
    markSkyeMailProvisioningFailure: async () => assert.fail('paid mailbox checkout should not fail provisioning'),
    audit: async (actor, action, target) => calls.push(['audit', actor, action, target])
  });

  assert.equal(result.handled, true);
  assert.equal(result.paymentReady, true);
  assert.equal(result.delivery, 'skyemail_mailbox');
  assert.deepEqual(calls.map(([name]) => name), ['upsert', 'mirror', 'mailbox-check', 'provision', 'mark', 'audit']);
});

test('paid SkyePay mailbox checkout records claim-required state instead of inventing an address', async () => {
  const calls = [];
  const metadata = mailboxMetadata('skypay_missing_claim', {
    mailbox_local_part: '',
    mailbox_domain: '',
    mailbox_email: ''
  }, autoProvisionOffer);
  const event = checkoutEvent({
    id: 'cs_test_skyemail_missing_claim',
    orderId: 'skypay_missing_claim',
    metadata
  });
  const order = orderRow('skypay_missing_claim', metadata, autoProvisionOffer);

  const result = await handleSkyePayCheckoutCompletion(event, {
    upsertSkyePayOrderFromSession: async () => {
      calls.push(['upsert']);
      return order;
    },
    mirrorStripeWebhookProviderRuntime: async () => {
      calls.push(['mirror']);
      return { ok: true, status: 200, provider_runtime: null };
    },
    isVaultProvisioningOrder: () => false,
    isSkyeMailMailboxOrder: () => true,
    provisionSkyeMailMailboxForOrder: async () => {
      calls.push(['provision']);
      return { ok: false, skipped: true, reason: 'mailbox_claim_required', claim: { reason: 'mailbox_local_part_required' } };
    },
    markSkyeMailProvisioningNeedsInput: async (orderId, receivedResult) => {
      calls.push(['needs-input', orderId, receivedResult.reason]);
    },
    markSkyeMailProvisioningResult: async () => assert.fail('missing mailbox claim must not mark provisioned'),
    autoUnlockSkyePayOrder: async () => assert.fail('missing mailbox claim must not generic unlock'),
    audit: async (actor, action, target) => calls.push(['audit', actor, action, target])
  });

  assert.equal(result.handled, true);
  assert.equal(result.delivery, 'skyemail_mailbox_claim_required');
  assert.deepEqual(calls.map(([name]) => name), ['upsert', 'mirror', 'provision', 'needs-input', 'audit']);
});

test('current SkyeMail mailbox catalog offer is capacity-gated and does not auto-provision after checkout', async () => {
  const calls = [];
  const metadata = mailboxMetadata('skypay_capacity_gated', {}, capacityGatedOffer);
  const event = checkoutEvent({
    id: 'cs_test_skyemail_capacity_gated',
    orderId: 'skypay_capacity_gated',
    metadata
  });
  const order = orderRow('skypay_capacity_gated', metadata, capacityGatedOffer);

  const result = await handleSkyePayCheckoutCompletion(event, {
    upsertSkyePayOrderFromSession: async ({ session }) => {
      calls.push(['upsert']);
      assert.equal(session.metadata.skyemail_mailbox, 'false');
      assert.equal(session.metadata.owner_approval_required, 'true');
      return order;
    },
    mirrorStripeWebhookProviderRuntime: async () => {
      calls.push(['mirror']);
      return { ok: true, status: 200, provider_runtime: null };
    },
    isVaultProvisioningOrder: () => false,
    isSkyeMailMailboxOrder,
    provisionSkyeMailMailboxForOrder: async () => assert.fail('capacity-gated mailbox offers must not call SkyeMail provisioning from Stripe webhook'),
    markSkyeMailProvisioningNeedsInput: async () => assert.fail('capacity-gated mailbox offers must wait for operator capacity approval'),
    markSkyeMailProvisioningResult: async () => assert.fail('capacity-gated mailbox offers must not mark provisioned'),
    markSkyeMailProvisioningFailure: async () => assert.fail('capacity-gated mailbox offers should not enter provisioning failure path'),
    autoUnlockSkyePayOrder: async (receivedOrder, options) => {
      calls.push(['owner-review-hold', receivedOrder.id, options.source, options.eventType]);
      assert.equal(receivedOrder.offer_snapshot.owner_approval_required, true);
    },
    audit: async (actor, action, target) => calls.push(['audit', actor, action, target])
  });

  assert.equal(capacityGatedOffer.owner_approval_required, true);
  assert.equal(capacityGatedOffer.activation_path, 'paid_pending_capacity_approval');
  assert.equal(isSkyeMailMailboxOrder(order), false);
  assert.equal(result.handled, true);
  assert.equal(result.delivery, 'standard_unlock');
  assert.deepEqual(calls.map(([name]) => name), ['upsert', 'mirror', 'owner-review-hold', 'audit']);
});

test('SkyeMail mailbox orders expose a concrete mailbox claim from checkout metadata without forcing current catalog auto-provision', () => {
  const metadata = mailboxMetadata('skypay_claim_probe', {}, capacityGatedOffer);
  const order = orderRow('skypay_claim_probe', metadata, capacityGatedOffer);
  assert.equal(capacityGatedOffer.owner_approval_required, true);
  assert.equal(metadata.skyemail_mailbox, 'false');
  assert.equal(isSkyeMailMailboxOrder(order), false);
  assert.deepEqual(skyeMailMailboxClaim(order), {
    ok: true,
    email: 'frontdesk@solenterprises.org',
    local_part: 'frontdesk',
    domain: 'solenterprises.org',
    reason: ''
  });
});
