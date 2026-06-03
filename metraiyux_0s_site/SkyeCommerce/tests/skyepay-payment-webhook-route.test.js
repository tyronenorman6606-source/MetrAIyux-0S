import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

import app from '../src/index.js';
import { signSkyPayCommerceBody } from '../src/lib/skyepay.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

function env() {
  return {
    SESSION_SECRET: 'skyecommerce-session-secret',
    SKYEPAY_COMMERCE_SHARED_SECRET: 'shared-commerce-secret',
    API_RATE_LIMIT_DISABLED: 'true',
    DB: {
      prepare() {
        return {
          bind() {
            return {
              first: async () => null,
              all: async () => ({ results: [] }),
              run: async () => ({ success: true })
            };
          }
        };
      }
    }
  };
}

test('SkyeCommerce payment webhook accepts SkyePay shared-commerce signatures', async () => {
  const testEnv = env();
  const raw = JSON.stringify({
    provider: 'skyepay',
    checkoutToken: 'chk_1',
    providerReference: 'cs_test_paid',
    status: 'paid',
    amountCents: 3200,
    currency: 'USD',
    eventId: 'evt_paid'
  });
  const signature = await signSkyPayCommerceBody(testEnv, raw);

  const accepted = await app.fetch(new Request('https://commerce.test/api/payments/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-skyepay-commerce-signature': `sha256=${signature}`
    },
    body: raw
  }), testEnv);
  const acceptedData = await accepted.json();
  assert.equal(accepted.status, 404);
  assert.equal(acceptedData.error, 'Payment session not found.');

  const rejected = await app.fetch(new Request('https://commerce.test/api/payments/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-skyepay-commerce-signature': 'sha256=bad'
    },
    body: raw
  }), testEnv);
  assert.equal(rejected.status, 401);
});
