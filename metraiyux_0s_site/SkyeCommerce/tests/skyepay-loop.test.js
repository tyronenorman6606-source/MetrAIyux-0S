import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  buildSkyPayCheckoutBody,
  buildSkyPayLineItems,
  buildSkyPayRefundBody,
  executeSkyPayCheckout,
  executeSkyPayRefund,
  mapSkyPayStatusToPayment,
  platformFeeBps,
  signSkyPayCommerceBody,
  upsertMerchantPayoutLedgerForPayment
} from '../src/lib/skyepay.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const merchant = { id: 'm_1', slug: 'demo-store', brandName: 'Demo Store', currency: 'USD' };
const order = {
  id: 'ord_1',
  orderNumber: 'SKY-1001',
  customerEmail: 'buyer@example.com',
  customerName: 'Buyer Example',
  currency: 'USD',
  subtotalCents: 2500,
  shippingCents: 500,
  taxCents: 200,
  totalCents: 3200,
  items: [{ productId: 'prd_1', title: 'Hat', quantity: 2, unitPriceCents: 1250 }]
};

test('buildSkyPayCheckoutBody creates a signed SkyeCommerce dynamic checkout payload', async () => {
  const env = { SKYEPAY_COMMERCE_SHARED_SECRET: 'test-secret', SKYEPAY_SKYECOMMERCE_CLIENT_SLUG: 'metraiyux-0s' };
  const body = buildSkyPayCheckoutBody({
    env,
    merchant,
    order,
    payload: {
      amountCents: 3200,
      currency: 'USD',
      returnUrl: 'https://commerce.test/store/index.html?checkout_status=return',
      cancelUrl: 'https://commerce.test/store/index.html?checkout_status=cancel',
      customerEmail: 'buyer@example.com'
    },
    transactionId: 'pay_1',
    checkoutToken: 'chk_1',
    requestUrl: new URL('https://commerce.test/api/orders')
  });
  assert.equal(body.source, 'skyecommerce');
  assert.equal(body.skyecommerce.amount_cents, 3200);
  assert.equal(body.skyecommerce.line_items.length, 3);
  assert.match(body.success_url, /skyepay_session=%7BCHECKOUT_SESSION_ID%7D|skyepay_session=\{CHECKOUT_SESSION_ID\}/);
  const signature = await signSkyPayCommerceBody(env, JSON.stringify(body));
  assert.match(signature, /^[a-f0-9]{64}$/);
});

test('executeSkyPayRefund dispatches a signed SkyPay refund through the FS27 binding', async () => {
  const calls = [];
  const env = {
    SKYEPAY_COMMERCE_SHARED_SECRET: 'test-secret',
    SKYGATEFS27_WORKER: {
      fetch: async (request) => {
        calls.push(request);
        const body = await request.json();
        assert.equal(request.url, 'https://skyegatefs27.internal/skyepay/refund');
        assert.equal(request.headers.get('x-skyepay-commerce-signature').startsWith('sha256='), true);
        assert.equal(body.session_id, 'cs_test_skyepay');
        return new Response(JSON.stringify({ ok: true, refund_id: 're_test_123', order_id: 'skypay_ord_1', payment_status: 'partially_refunded' }), { status: 200 });
      }
    }
  };
  const body = buildSkyPayRefundBody({
    merchant,
    order,
    payment: { id: 'pay_1', providerReference: 'cs_test_skyepay' },
    refund: { id: 'rfnd_1', refundNumber: 'RF-1', amountCents: 1200, reason: 'requested_by_customer' }
  });
  assert.equal(body.skyecommerce_refund, true);
  assert.equal(body.amount_cents, 1200);
  const dispatch = await executeSkyPayRefund(env, null, {
    merchant,
    order,
    payment: { id: 'pay_1', providerReference: 'cs_test_skyepay' },
    refund: { id: 'rfnd_1', refundNumber: 'RF-1', amountCents: 1200, reason: 'requested_by_customer' }
  });
  assert.equal(calls.length, 1);
  assert.equal(dispatch.status, 'executed');
  assert.equal(dispatch.providerReference, 're_test_123');
  assert.equal(dispatch.request.bodyKind, 'skyecommerce_skyepay_refund');
  assert.equal(JSON.stringify(dispatch).includes('test-secret'), false);
});

test('buildSkyPayLineItems collapses discounted orders to exact payable balance', () => {
  const lines = buildSkyPayLineItems({
    merchant,
    order: { ...order, discountCents: 500, totalCents: 2700 },
    amountCents: 2700
  });
  assert.equal(lines.length, 1);
  assert.equal(lines[0].amount_cents, 2700);
});

test('executeSkyPayCheckout dispatches through the FS27 service binding without leaking the signing secret', async () => {
  const calls = [];
  const env = {
    SKYEPAY_COMMERCE_SHARED_SECRET: 'test-secret',
    SKYGATEFS27_WORKER: {
      fetch: async (request) => {
        calls.push(request);
        assert.equal(request.headers.get('x-skyepay-commerce-signature').startsWith('sha256='), true);
        return new Response(JSON.stringify({ ok: true, id: 'cs_test_skyepay', order_id: 'skypay_ord_1', url: 'https://checkout.stripe.test/session', payment_status: 'created' }), { status: 200 });
      }
    }
  };
  const dispatch = await executeSkyPayCheckout(env, null, {
    merchant,
    order,
    payload: {
      amountCents: 3200,
      currency: 'USD',
      returnUrl: 'https://commerce.test/store/index.html?checkout_status=return',
      cancelUrl: 'https://commerce.test/store/index.html?checkout_status=cancel',
      customerEmail: 'buyer@example.com'
    },
    transactionId: 'pay_1',
    checkoutToken: 'chk_1',
    requestUrl: new URL('https://commerce.test/api/orders')
  });
  assert.equal(calls.length, 1);
  assert.equal(dispatch.status, 'executed');
  assert.equal(dispatch.providerReference, 'cs_test_skyepay');
  assert.equal(dispatch.request.bodyKind, 'skyecommerce_dynamic_checkout');
  assert.equal(JSON.stringify(dispatch).includes('test-secret'), false);
});

test('SkyPay status and platform fee helpers map the merchant receivable loop', () => {
  assert.equal(mapSkyPayStatusToPayment({ paymentStatus: 'paid' }), 'paid');
  assert.equal(mapSkyPayStatusToPayment({ paymentStatus: 'expired' }), 'voided');
  assert.equal(mapSkyPayStatusToPayment({ paymentStatus: 'refunded' }), 'refunded');
  assert.equal(platformFeeBps({ SKYECOMMERCE_PLATFORM_FEE_BPS: '325' }), 325);
});

test('upsertMerchantPayoutLedgerForPayment records merchant receivable after SkyPay payment', async () => {
  const state = { ledger: [] };
  const env = {
    SKYECOMMERCE_PLATFORM_FEE_BPS: '250',
    DB: {
      prepare(sql) {
        return {
          bind(...bindings) {
            return {
              first: async () => {
                if (/SELECT id FROM merchant_payout_ledger/.test(sql)) {
                  return state.ledger.find((row) => row.merchant_id === bindings[0] && row.order_id === bindings[1]) || null;
                }
                if (/SELECT \* FROM merchant_payout_ledger/.test(sql)) {
                  return state.ledger.find((row) => row.merchant_id === bindings[0] && row.order_id === bindings[1]) || null;
                }
                return null;
              },
              all: async () => ({ results: state.ledger }),
              run: async () => {
                if (/INSERT INTO merchant_payout_ledger/.test(sql)) {
                  const row = {
                    id: bindings[0],
                    merchant_id: bindings[1],
                    order_id: bindings[2],
                    payment_transaction_id: bindings[3],
                    provider: bindings[4],
                    provider_reference: bindings[5],
                    gross_cents: bindings[6],
                    platform_fee_bps: bindings[7],
                    platform_fee_cents: bindings[8],
                    merchant_receivable_cents: bindings[9],
                    currency: bindings[10],
                    status: bindings[11],
                    payout_reference: '',
                    meta_json: bindings[12],
                    created_at: 'now',
                    updated_at: 'now',
                    paid_at: null
                  };
                  const existing = state.ledger.findIndex((item) => item.merchant_id === row.merchant_id && item.order_id === row.order_id);
                  if (existing >= 0) state.ledger[existing] = { ...state.ledger[existing], ...row };
                  else state.ledger.push(row);
                }
                return { success: true };
              }
            };
          }
        };
      }
    }
  };
  const result = await upsertMerchantPayoutLedgerForPayment(env, {
    merchant,
    order,
    payment: { id: 'pay_1', provider: 'skyepay', providerReference: 'cs_test_skyepay', status: 'paid', amountCents: 3200, currency: 'USD' },
    status: 'payable'
  });
  assert.equal(result.ok, true);
  assert.equal(result.ledger.grossCents, 3200);
  assert.equal(result.ledger.platformFeeCents, 80);
  assert.equal(result.ledger.merchantReceivableCents, 3120);
  assert.equal(result.ledger.status, 'payable');
});
