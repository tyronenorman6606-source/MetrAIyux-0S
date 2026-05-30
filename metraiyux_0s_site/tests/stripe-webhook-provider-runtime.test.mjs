import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const {
  mirrorStripeWebhookProviderRuntime,
  stripeWebhookRuntimePayload
} = await import('../skyegate/source/SkyeGateFS27/netlify/functions/stripe-webhook.js');

test('Stripe webhook lifecycle mirrors into the shared 0S provider runtime without exposing secrets', async () => {
  const previousSecret = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = 'sk_test_webhook_runtime_secret_not_returned';
  try {
    const event = {
      id: 'evt_webhook_runtime_001',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_webhook_runtime_001',
          object: 'checkout.session',
          status: 'complete',
          payment_status: 'paid',
          amount_total: 12900,
          currency: 'usd',
          customer: 'cus_runtime_001',
          metadata: {
            skyepay: 'true',
            customer_id: 'cust-runtime',
            workspace_id: 'ws-runtime',
            offer_id: 'skyenet-edge-starter'
          }
        }
      }
    };
    const payload = stripeWebhookRuntimePayload(event, event.data.object, {
      order: { id: 'skyepay_order_runtime_001', offer_id: 'skyenet-edge-starter' },
      source: 'unit-proof'
    });
    assert.equal(payload.event_type, 'checkout.session.completed');
    assert.equal(payload.skyepay, true);
    assert.equal(payload.skyepay_order_id, 'skyepay_order_runtime_001');

    const mirrored = await mirrorStripeWebhookProviderRuntime(event, event.data.object, {
      order: { id: 'skyepay_order_runtime_001', offer_id: 'skyenet-edge-starter' },
      source: 'unit-proof'
    });
    assert.equal(mirrored.ok, true);
    assert.equal(mirrored.provider_runtime.provider_id, 'stripe');
    assert.equal(mirrored.provider_runtime.action, 'stripe.webhook.lifecycle');
    assert.equal(mirrored.provider_runtime.executed, true);
    assert.equal(mirrored.provider_runtime.provider_call_made, false);
    assert.equal(JSON.stringify(mirrored).includes('sk_test_webhook_runtime_secret_not_returned'), false);
  } finally {
    if (previousSecret == null) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousSecret;
  }
});
