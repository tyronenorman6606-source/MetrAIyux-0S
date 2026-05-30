import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  executeSkyPayCheckout,
  mapSkyPayStatusToPayment,
  platformFeeBps
} from '../SkyeCommerce/src/lib/skyepay.js';

if (!globalThis.crypto) globalThis.crypto = crypto.webcrypto;

const total = Math.max(1, Number(process.env.SKYECOMMERCE_SKYEPAY_STRESS_TOTAL || 180));
const concurrency = Math.max(1, Number(process.env.SKYECOMMERCE_SKYEPAY_STRESS_CONCURRENCY || 24));
const secret = 'stress-skyepay-commerce-secret';
const startedAt = new Date();
const latencies = [];
const failures = [];
const calls = [];

function hmac(raw) {
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

function makeEnv() {
  return {
    SKYEPAY_COMMERCE_SHARED_SECRET: secret,
    SKYECOMMERCE_PLATFORM_FEE_BPS: '250',
    SKYGATEFS27_WORKER: {
      fetch: async (request) => {
        const raw = await request.text();
        const body = JSON.parse(raw);
        const provided = String(request.headers.get('x-skyepay-commerce-signature') || '').replace(/^sha256=/, '');
        assert.equal(provided, hmac(raw));
        assert.equal(body.source, 'skyecommerce');
        assert.equal(body.skyecommerce.amount_cents > 0, true);
        calls.push({
          idempotencyKey: body.idempotency_key,
          amountCents: body.skyecommerce.amount_cents,
          lineItemCount: body.skyecommerce.line_items.length
        });
        return new Response(JSON.stringify({
          ok: true,
          id: `cs_stress_${calls.length}`,
          order_id: `skypay_stress_${calls.length}`,
          url: `https://checkout.stripe.test/session/${calls.length}`,
          payment_status: 'created'
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
    }
  };
}

function makeOrder(index) {
  const quantity = 1 + (index % 3);
  const unitPrice = 1200 + (index % 11) * 137;
  const subtotal = unitPrice * quantity;
  const shipping = 499;
  const tax = Math.round(subtotal * 0.0825);
  const totalCents = subtotal + shipping + tax;
  return {
    merchant: { id: `m_${index % 12}`, slug: `stress-store-${index % 12}`, brandName: `Stress Store ${index % 12}`, currency: 'USD' },
    order: {
      id: `ord_stress_${index}`,
      orderNumber: `SKY-STRESS-${String(index).padStart(4, '0')}`,
      customerEmail: `buyer+${index}@example.com`,
      customerName: `Buyer ${index}`,
      currency: 'USD',
      subtotalCents: subtotal,
      shippingCents: shipping,
      taxCents: tax,
      totalCents,
      items: [{ productId: `prd_${index % 17}`, title: `Stress product ${index % 17}`, quantity, unitPriceCents: unitPrice }]
    },
    payload: {
      amountCents: totalCents,
      currency: 'USD',
      customerEmail: `buyer+${index}@example.com`,
      returnUrl: `https://commerce.test/store/index.html?slug=stress-store-${index % 12}&checkout_status=return&order=ord_stress_${index}&access=stress`,
      cancelUrl: `https://commerce.test/store/index.html?slug=stress-store-${index % 12}&checkout_status=cancel&order=ord_stress_${index}&access=stress`
    }
  };
}

async function runOne(index) {
  const env = makeEnv();
  const { merchant, order, payload } = makeOrder(index);
  const start = performance.now();
  const dispatch = await executeSkyPayCheckout(env, null, {
    merchant,
    order,
    payload,
    transactionId: `pay_stress_${index}`,
    checkoutToken: `chk_stress_${index}`,
    requestUrl: new URL('https://commerce.test/api/orders')
  });
  latencies.push(performance.now() - start);
  assert.equal(dispatch.status, 'executed');
  assert.match(dispatch.checkoutUrl, /^https:\/\/checkout\.stripe\.test\/session\//);
  assert.equal(mapSkyPayStatusToPayment({ paymentStatus: 'paid' }), 'paid');
  assert.equal(platformFeeBps(env), 250);
}

async function runPool() {
  let cursor = 0;
  async function worker() {
    while (cursor < total) {
      const index = cursor++;
      try {
        await runOne(index);
      } catch (error) {
        failures.push({ index, message: error.message, stack: error.stack });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => worker()));
}

await runPool();

latencies.sort((a, b) => a - b);
const percentile = (p) => latencies[Math.min(latencies.length - 1, Math.floor((latencies.length - 1) * p))] || 0;
const finishedAt = new Date();
const receipt = {
  ok: failures.length === 0,
  startedAt: startedAt.toISOString(),
  finishedAt: finishedAt.toISOString(),
  durationMs: finishedAt - startedAt,
  total,
  concurrency,
  passed: total - failures.length,
  failed: failures.length,
  latencyMs: {
    min: Math.round(latencies[0] || 0),
    p50: Math.round(percentile(0.5)),
    p95: Math.round(percentile(0.95)),
    max: Math.round(latencies[latencies.length - 1] || 0)
  },
  proven: [
    'SkyeCommerce builds dynamic SkyPay checkout payloads',
    'Payloads are HMAC signed with the commerce shared secret',
    'FS27 service-binding dispatch path returns Stripe Checkout URLs',
    'SkyPay paid status maps back to SkyeCommerce paid payment status',
    'Merchant fee setting is read for receivable ledger math'
  ],
  sampleCalls: calls.slice(0, 5),
  failures
};

const outDir = path.resolve('test-artifacts/skyecommerce-skyepay-loop-stress');
await fs.mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, `${startedAt.toISOString().replace(/[:.]/g, '-')}-stress.json`);
await fs.writeFile(outFile, JSON.stringify(receipt, null, 2));

console.log(JSON.stringify({ ok: receipt.ok, outFile, total, concurrency, failed: failures.length, latencyMs: receipt.latencyMs }, null, 2));
if (!receipt.ok) process.exitCode = 1;
