import test from 'node:test';
import assert from 'node:assert/strict';

import {
  allowDryRun,
  allowOwnerOnlySkyeMeritFreeCheckout
} from '../netlify/functions/skyepay-checkout.js';

const OLD_ENV = {
  FREE99_ADMIN_CODE: process.env.FREE99_ADMIN_CODE,
  SKYPAY_ALLOW_PUBLIC_DRY_RUN: process.env.SKYPAY_ALLOW_PUBLIC_DRY_RUN
};

function request(url, headers = {}) {
  return new Request(url, { headers });
}

test('SkyePay dry-run stays blocked publicly unless owner proof-mode credentials are present', async (t) => {
  process.env.FREE99_ADMIN_CODE = 'owner-proof-code';
  process.env.SKYPAY_ALLOW_PUBLIC_DRY_RUN = '';
  t.after(() => {
    if (OLD_ENV.FREE99_ADMIN_CODE === undefined) delete process.env.FREE99_ADMIN_CODE;
    else process.env.FREE99_ADMIN_CODE = OLD_ENV.FREE99_ADMIN_CODE;
    if (OLD_ENV.SKYPAY_ALLOW_PUBLIC_DRY_RUN === undefined) delete process.env.SKYPAY_ALLOW_PUBLIC_DRY_RUN;
    else process.env.SKYPAY_ALLOW_PUBLIC_DRY_RUN = OLD_ENV.SKYPAY_ALLOW_PUBLIC_DRY_RUN;
  });

  assert.equal(await allowDryRun(request('https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/.netlify/functions/skyepay-checkout')), false);
  assert.equal(await allowDryRun(request('https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/.netlify/functions/skyepay-checkout', {
    'x-skypay-proof-mode': '1'
  })), false);
  assert.equal(await allowDryRun(request('https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/.netlify/functions/skyepay-checkout', {
    'x-free99-admin-code': 'owner-proof-code'
  })), false);
  assert.equal(await allowDryRun(request('https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/.netlify/functions/skyepay-checkout', {
    'x-skypay-proof-mode': '1',
    'x-free99-admin-code': 'owner-proof-code'
  })), true);
  assert.equal(await allowDryRun(request('https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/.netlify/functions/skyepay-checkout', {
    'x-skypay-proof-mode': '1',
    authorization: 'Bearer owner-proof-code'
  })), true);
});

test('SkyePay dry-run remains available to local development without owner headers', async () => {
  process.env.SKYPAY_ALLOW_PUBLIC_DRY_RUN = '';
  assert.equal(await allowDryRun(request('http://127.0.0.1:8888/.netlify/functions/skyepay-checkout')), true);
  assert.equal(await allowDryRun(request('http://localhost:8888/.netlify/functions/skyepay-checkout')), true);
});

test('SkyeMerit zero-balance checkout requires owner proof-mode auth', async (t) => {
  process.env.FREE99_ADMIN_CODE = 'owner-proof-code';
  t.after(() => {
    if (OLD_ENV.FREE99_ADMIN_CODE === undefined) delete process.env.FREE99_ADMIN_CODE;
    else process.env.FREE99_ADMIN_CODE = OLD_ENV.FREE99_ADMIN_CODE;
  });

  const liveUrl = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/.netlify/functions/skyepay-checkout';
  assert.equal(await allowOwnerOnlySkyeMeritFreeCheckout(request(liveUrl)), false);
  assert.equal(await allowOwnerOnlySkyeMeritFreeCheckout(request(liveUrl, {
    'x-skypay-proof-mode': '1'
  })), false);
  assert.equal(await allowOwnerOnlySkyeMeritFreeCheckout(request(liveUrl, {
    'x-free99-admin-code': 'owner-proof-code'
  })), false);
  assert.equal(await allowOwnerOnlySkyeMeritFreeCheckout(request(liveUrl, {
    'x-skypay-proof-mode': '1',
    'x-free99-admin-code': 'owner-proof-code'
  })), true);
});
