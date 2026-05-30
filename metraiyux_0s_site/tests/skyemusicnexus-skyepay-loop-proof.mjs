#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from '../cloudflare/worker.js';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const checkedAt = new Date().toISOString();
const artifactDir = path.join(repoRoot, 'test-artifacts', 'skyemusicnexus-skyepay-loop');
const receiptPath = path.join(artifactDir, 'latest.json');
const ADMIN_CODE = 'skyepay-loop-admin';

function memoryKv() {
  const store = new Map();
  return {
    async get(key, opts = {}) {
      const value = store.get(key);
      if (value == null) return null;
      return opts.type === 'json' ? JSON.parse(value) : value;
    },
    async put(key, value) {
      store.set(key, String(value));
    },
  };
}

function fakeGateWorker() {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === '/admin/login') {
        return Response.json({ ok: true, token: 'admin:owner@skyesoverlondon.local' });
      }
      const body = await request.json().catch(() => ({}));
      const token = String(body.token || '');
      const [role = 'artist', email = `${role}@skyepay-loop.local`] = token.split(':');
      const admin = role === 'admin' || email.includes('owner');
      return Response.json({
        active: true,
        email,
        username: email,
        sub: `skyepay-loop-${role}-${email}`,
        role: admin ? 'admin' : role,
        scope: admin ? 'admin.read admin.write music.write' : 'music.read music.write',
        artistId: `artist_${email.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
      });
    },
  };
}

const env = {
  SITE_EVENTS_KV: memoryKv(),
  SKYGATEFS27_WORKER: fakeGateWorker(),
  FREE99_ADMIN_CODE: ADMIN_CODE,
  SKYGATEFS27_ADMIN_PASSWORD: ADMIN_CODE,
  SKYGATE_SOURCE_APP: 'metraiyux-0s',
  ZERO_OS_PROVIDER_SANDBOX: '1',
};

async function call(method, route, { body, token = 'artist:loop@example.com', admin = false, expectOk = true, parse = 'auto' } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (admin) headers['x-free99-admin-code'] = ADMIN_CODE;
  const response = await worker.fetch(new Request(`https://skyepay-loop.test${route}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }), env, { waitUntil() {} });
  const contentType = response.headers.get('content-type') || '';
  const payload = parse === 'text' || !contentType.includes('json')
    ? await response.text()
    : await response.json().catch(async () => ({ text: await response.text() }));
  if (expectOk && !response.ok) {
    throw new Error(`${method} ${route} returned ${response.status}: ${JSON.stringify(payload).slice(0, 800)}`);
  }
  return { status: response.status, ok: response.ok, payload };
}

async function main() {
  await mkdir(artifactDir, { recursive: true });
  const artistToken = 'artist:gray-gang-loop@example.com';
  const adminToken = 'admin:owner@skyesoverlondon.local';

  await call('POST', '/api/skymusicnexus/music-artists', {
    token: artistToken,
    body: {
      action: 'register',
      id: 'loop_primary_artist',
      name: 'Loop Primary',
      email: 'loop-primary@example.com',
      genre: ['proof-rnb'],
      paperwork: { status: 'approved', completedAt: checkedAt },
    },
  });
  await call('POST', '/api/skymusicnexus/music-artists', {
    token: artistToken,
    body: {
      action: 'register',
      id: 'loop_feature_artist',
      name: 'Loop Feature',
      email: 'loop-feature@example.com',
      genre: ['proof-rap'],
      paperwork: { status: 'approved', completedAt: checkedAt },
    },
  });

  await call('POST', '/api/skymusicnexus/music-store', {
    token: artistToken,
    body: {
      action: 'upsert-store',
      artistId: 'loop_primary_artist',
      artistName: 'Loop Primary',
      name: 'Loop Primary Nexus Store',
      storefrontPlan: 'artist-collective',
      skyeCommerceMerchantId: 'skyepay_artist_loop_primary',
      skyeCommerceStoreSlug: 'loop-primary',
      feeMode: 'artist_absorbed',
    },
  });

  const product = (await call('POST', '/api/skymusicnexus/music-store', {
    token: artistToken,
    body: {
      action: 'create-product',
      productId: 'prod_loop_single',
      artistId: 'loop_primary_artist',
      title: 'Loop Proof Single',
      priceCents: 444,
      fulfillmentType: 'digital-link',
      assetId: 'aud_loop_single',
      splitSheet: [
        { lineId: 'primary', artistId: 'loop_primary_artist', stageName: 'Loop Primary', role: 'primary_artist', shareBps: 7000 },
        { lineId: 'feature', artistId: 'loop_feature_artist', stageName: 'Loop Feature', role: 'featured_artist', shareBps: 3000 },
      ],
    },
  })).payload.product;

  const asset = (await call('POST', '/api/skymusicnexus/music-assets', {
    token: 'artist:loop-primary@example.com',
    body: {
      action: 'upload',
      id: 'aud_loop_single',
      artistId: 'loop_primary_artist',
      title: 'Loop Proof Single Master',
      fileName: 'loop-proof-single.mp3',
      contentType: 'audio/mpeg',
      bytes: 2048,
      dataBase64: Buffer.from('loop-proof-single-audio').toString('base64'),
    },
  })).payload.asset;
  assert.equal(asset.downloadPolicy, 'artist_or_paid_skypay_entitlement');

  const artistDownload = await call('GET', `/api/skymusicnexus/music-assets?action=download&id=${encodeURIComponent(asset.id)}`, {
    token: 'artist:loop-primary@example.com',
    parse: 'text',
  });
  assert.equal(artistDownload.status, 200, 'artist owner should be able to download own asset');

  const order = (await call('POST', '/api/skymusicnexus/music-store', {
    token: artistToken,
    body: {
      action: 'record-order',
      productId: product.productId,
      quantity: 2,
      buyerEmail: 'buyer@example.com',
    },
  })).payload.order;

  assert.equal(order.status, 'pending_skyepay_checkout');
  assert.equal(order.checkoutIntent.confirmationAction, 'confirm-skypay-order');
  assert.equal(order.checkoutIntent.underlyingProvider, 'stripe');
  assert.equal(order.checkoutIntent.providerRuntimeStatus.status, 'executed_sandbox');
  assert.equal(order.checkoutIntent.providerRuntimeStatus.provider_result.object, 'checkout.session');
  assert.ok(order.checkoutIntent.stripeSessionId.startsWith('stripe_sandbox_'));
  assert.equal(order.skyeCommerceBridge.internalPayoutLedger, 'merchant_receivable_after_skyepay_confirmation');

  const unpaidDownload = await call('GET', `/api/skymusicnexus/music-assets?action=download&id=${encodeURIComponent(asset.id)}`, {
    token: 'listener:buyer@example.com',
    expectOk: false,
  });
  assert.equal(unpaidDownload.status, 402, 'pending SkyPay buyer should not download before payment confirmation');
  assert.equal(unpaidDownload.payload.code, 'SKYEPAY_ASSET_PURCHASE_REQUIRED');

  const confirmed = (await call('POST', '/api/skymusicnexus/music-store', {
    token: adminToken,
    admin: true,
    body: {
      action: 'confirm-skypay-order',
      orderId: order.orderId,
      sessionId: order.checkoutIntent.stripeSessionId,
      skyepayPaymentId: 'skypay_pi_loop_001',
      providerPayload: { checkout_session: 'loop_session_001' },
    },
  })).payload;

  assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
  assert.equal(confirmed.order.status, 'paid_pending_fulfillment');
  assert.equal(confirmed.receivable.provider, 'skypay');
  assert.equal(confirmed.receivable.merchantSettlementModel, 'single_merchant_of_record_internal_artist_payables');
  assert.equal(confirmed.providerRuntimeStatus.status, 'executed_sandbox');
  assert.equal(confirmed.providerRuntimeStatus.provider_result.payment_status, 'paid');
  assert.equal(confirmed.order.providerRuntimeStatus.provider_result.object, 'checkout.session');
  assert.equal(confirmed.receivable.artistNetCents, Math.max(0, order.subtotalCents - order.platformFeeCents));
  assert.equal(confirmed.settlements.length, 2);
  assert.equal(confirmed.settlements.reduce((sum, item) => sum + item.payableCents, 0), confirmed.receivable.artistNetCents);
  assert.ok(confirmed.settlements.every((item) => item.status === 'pending_owner_disbursement'));
  assert.equal(confirmed.payoutPolicy.stripeConnectRequired, false);

  const paidDownload = await call('GET', `/api/skymusicnexus/music-assets?action=download&id=${encodeURIComponent(asset.id)}`, {
    token: 'listener:buyer@example.com',
    parse: 'text',
  });
  assert.equal(paidDownload.status, 200, 'confirmed SkyPay buyer should unlock asset download');

  const afterConfirmPayments = (await call('GET', '/api/skymusicnexus/music-payments', {
    token: adminToken,
    admin: true,
  })).payload;
  assert.equal(afterConfirmPayments.summary.receivables, 1, JSON.stringify(afterConfirmPayments.summary));
  assert.equal(afterConfirmPayments.summary.settlements, 2, JSON.stringify(afterConfirmPayments.summary));

  const disbursed = (await call('POST', '/api/skymusicnexus/music-payments', {
    token: adminToken,
    admin: true,
    body: {
      action: 'record-disbursement',
      settlementId: confirmed.settlements[0].settlementId,
      provider: 'cashapp',
      destinationLabel: '$loopprimary',
      externalReference: 'cashapp-loop-proof',
    },
  })).payload;
  assert.equal(disbursed.disbursement.status, 'completed_owner_recorded');
  assert.equal(disbursed.settlement.status, 'disbursed');

  const payments = (await call('GET', '/api/skymusicnexus/music-payments', {
    token: adminToken,
    admin: true,
  })).payload;
  assert.equal(payments.summary.receivables, 1);
  assert.equal(payments.summary.settlements, 2);
  assert.equal(payments.summary.disbursements, 1);

  const receipt = {
    ok: true,
    checkedAt,
    browserOpened: false,
    playwrightStarted: false,
    orderId: order.orderId,
    productId: product.productId,
    assetId: asset.id,
    receivableId: confirmed.receivable.receivableId,
    settlementIds: confirmed.settlements.map((item) => item.settlementId),
    disbursementId: disbursed.disbursement.disbursementId,
    providerRuntime: {
      checkoutCreate: order.checkoutIntent.providerRuntimeStatus.status,
      checkoutRetrieve: confirmed.providerRuntimeStatus.status,
    },
    guarantees: [
      'MusicNexus store order creates a SkyPay checkout intent with a confirmation action.',
      'MusicNexus store checkout creation and confirmation route through the shared 0S provider runtime when provider vars or runtime sandbox are configured.',
      'Artist-owned assets download for the artist account only.',
      'Pending SkyPay checkout blocks buyer download until payment confirmation.',
      'Confirmed SkyPay payment unlocks the buyer asset download entitlement.',
      'SkyPay confirmation records a single-merchant receivable for Skyes Over London.',
      'Artist/collaborator splits become internal settlement rows without Stripe Connect merchant signup.',
      'Owner-recorded internal/off-platform disbursement closes an approved settlement.',
    ],
  };
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch(async (error) => {
  await mkdir(artifactDir, { recursive: true });
  const failure = { ok: false, checkedAt, browserOpened: false, playwrightStarted: false, error: error.message, stack: error.stack };
  await writeFile(receiptPath, `${JSON.stringify(failure, null, 2)}\n`);
  console.error(JSON.stringify(failure, null, 2));
  process.exit(1);
});
