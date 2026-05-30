import test from 'node:test';
import assert from 'node:assert/strict';
import {
  executeNativeProviderDispatch,
  executeProviderCarrierRates,
  executeProviderDisputeEvidence,
  executeProviderHealth,
  executeProviderRefund,
  missingProviderSecrets,
  verifyPaypalWebhookSignature
} from '../src/lib/provider-runtime.js';

const env = {
  ZERO_OS_PROVIDER_SANDBOX: '1',
  STRIPE_SECRET_KEY: 'sk_test_123',
  STRIPE_WEBHOOK_SECRET: 'whsec_123',
  PAYPAL_CLIENT_ID: 'paypal_client',
  PAYPAL_CLIENT_SECRET: 'paypal_secret',
  PAYPAL_WEBHOOK_ID: 'paypal_webhook',
  UPS_CLIENT_ID: 'ups_client',
  UPS_CLIENT_SECRET: 'ups_secret',
  UPS_ACCOUNT_NUMBER: 'A12345',
  RESEND_API_KEY: 're_123',
  GOOGLE_MERCHANT_ACCESS_TOKEN: 'ya29.token',
  GOOGLE_MERCHANT_ID: '999',
  META_CATALOG_ACCESS_TOKEN: 'meta_token',
  META_CATALOG_ID: 'cat_meta',
  TIKTOK_CATALOG_ACCESS_TOKEN: 'tt_token',
  TIKTOK_CATALOG_ID: 'cat_tiktok'
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

test('missingProviderSecrets reports unset provider envs', () => {
  assert.deepEqual(missingProviderSecrets({}, 'stripe'), ['STRIPE_SECRET_KEY']);
  assert.deepEqual(missingProviderSecrets(env, 'stripe'), []);
});

test('executeNativeProviderDispatch performs Stripe checkout through 0S provider runtime', async () => {
  const result = await executeNativeProviderDispatch(
    { provider: 'stripe', environment: 'production' },
    { payment: { amountCents: 2500, currency: 'USD' }, context: { orderNumber: 'SKY-1', origin: 'https://merchant.test' } },
    env
  );
  assert.equal(result.status, 'executed');
  assert.equal(result.provider_runtime.provider_id, 'stripe');
  assert.equal(result.provider_runtime.action, 'stripe.checkout.create');
  assert.equal(result.provider_runtime.provider_call_made, false);
  assert.match(result.providerReference, /^stripe_sandbox_/);
});

test('executeNativeProviderDispatch performs PayPal checkout through the 0S provider runtime', async () => {
  const result = await executeNativeProviderDispatch(
    { provider: 'paypal', environment: 'production' },
    { payment: { amountCents: 5500, currency: 'USD' }, context: { orderNumber: 'SKY-2', origin: 'https://merchant.test' } },
    env
  );
  assert.equal(result.provider_runtime.provider_id, 'paypal');
  assert.equal(result.provider_runtime.action, 'paypal.checkout.order.create');
  assert.equal(result.provider_runtime.provider_call_made, false);
  assert.match(result.providerReference, /^paypal_order_sandbox_/);
  assert.match(result.checkoutUrl, /paypal-sandbox/);
});

test('executeNativeProviderDispatch performs UPS label purchase through the 0S provider runtime', async () => {
  const result = await executeNativeProviderDispatch(
    { provider: 'ups', environment: 'production', config: { accountNumber: 'A12345' } },
    { label: { serviceCode: 'ground', packages: [{ weightOz: 32 }] }, context: { orderNumber: 'SKY-3', shippingAddress: { AddressLine: ['1 Main'] } } },
    env
  );
  assert.equal(result.provider_runtime.provider_id, 'ups');
  assert.equal(result.provider_runtime.action, 'ups.shipment.create');
  assert.equal(result.provider_runtime.provider_call_made, false);
  assert.match(result.trackingNumber, /^1Z/);
  assert.match(result.labelUrl, /^data:application\/pdf;base64,/);
});

test('executeNativeProviderDispatch performs Resend and catalog sync through 0S runtime', async () => {
  const resend = await executeNativeProviderDispatch(
    { provider: 'resend' },
    { message: { recipient: 'buyer@example.com', subject: 'Ready', bodyText: 'Body' } },
    env
  );
  assert.equal(resend.provider_runtime.provider_id, 'resend');
  assert.equal(resend.provider_runtime.action, 'resend.email.send');
  assert.equal(resend.provider_runtime.provider_call_made, false);

  const google = await executeNativeProviderDispatch(
    { provider: 'google_merchant', config: { merchantId: '999' } },
    { exportPayload: { merchant: { currency: 'USD' }, products: [{ id: 'prd_1', title: 'Hat', priceCents: 1299, inventoryOnHand: 3 }] } },
    env
  );
  assert.equal(google.status, 'executed');
  assert.equal(google.provider_runtime.provider_id, 'google_merchant');
  assert.equal(google.provider_runtime.action, 'google_merchant.products.batch');
  assert.equal(google.provider_runtime.provider_call_made, false);
});

test('executeProviderHealth uses the 0S provider runtime without leaking secrets', async () => {
  const result = await executeProviderHealth(
    { provider: 'stripe' },
    env
  );
  assert.equal(result.provider_runtime.provider_id, 'stripe');
  assert.equal(result.provider_runtime.action, 'stripe.account.retrieve');
  assert.equal(result.provider_runtime.provider_call_made, false);
  assert.equal(result.request.method, 'PROVIDER_RUNTIME');
});

test('refunds, disputes, carrier rates, and PayPal webhook verification use the 0S provider runtime', async () => {
  const refund = await executeProviderRefund(
    { provider: 'paypal', environment: 'production' },
    { refund: { amountCents: 1250, currency: 'USD', providerRef: 'PAYPAL-CAPTURE-1' } },
    env
  );
  assert.equal(refund.provider_runtime.provider_id, 'paypal');
  assert.equal(refund.provider_runtime.action, 'paypal.refund.create');
  assert.equal(refund.provider_runtime.provider_call_made, false);

  const dispute = await executeProviderDisputeEvidence(
    { provider: 'stripe', environment: 'production' },
    { dispute: { id: 'dp_test_1' }, evidence: { summary: 'Evidence packet' } },
    env
  );
  assert.equal(dispute.provider_runtime.provider_id, 'stripe');
  assert.equal(dispute.provider_runtime.action, 'stripe.dispute.evidence.submit');
  assert.equal(dispute.provider_runtime.provider_call_made, false);

  const rates = await executeProviderCarrierRates(
    { provider: 'ups', environment: 'production', config: { accountNumber: 'A12345' } },
    { packages: [{ weightOz: 12 }], context: { shippingAddress: { AddressLine: ['1 Main'] } } },
    env
  );
  assert.equal(rates.provider_runtime.provider_id, 'ups');
  assert.equal(rates.provider_runtime.action, 'ups.rate.quote');
  assert.equal(rates.rates.length, 1);

  const webhook = await verifyPaypalWebhookSignature(
    env,
    JSON.stringify({ id: 'WH-1', event_type: 'PAYMENT.CAPTURE.COMPLETED' }),
    {
      'paypal-transmission-id': 'tx-1',
      'paypal-transmission-time': '2026-05-29T00:00:00Z',
      'paypal-cert-url': 'https://paypal.test/cert.pem',
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-transmission-sig': 'sig'
    }
  );
  assert.equal(webhook.status, 'verified');
  assert.equal(webhook.provider_runtime.provider_id, 'paypal');
  assert.equal(webhook.provider_runtime.action, 'paypal.webhook.verify');
});
