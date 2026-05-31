import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

import worker from '../cloudflare/worker.mjs';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

function request(path, init = {}) {
  return new Request(`https://skyegatefs27.test${path}`, init);
}

test('FS27 Worker mounts the Stripe webhook route used by live SkyePay provisioning', async () => {
  const previousSecret = process.env.STRIPE_SECRET_KEY;
  const previousWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;

  try {
    for (const path of ['/stripe-webhook', '/skyepay/stripe-webhook', '/.netlify/functions/stripe-webhook']) {
      const response = await worker.fetch(request(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'checkout.session.completed' })
      }), {}, { waitUntil() {} });
      const body = await response.json();

      assert.equal(response.status, 501, `${path} should reach the webhook handler, not fall through to assets`);
      assert.equal(body.error, 'Stripe not configured');
    }
  } finally {
    if (previousSecret == null) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousSecret;
    if (previousWebhookSecret == null) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousWebhookSecret;
  }
});
