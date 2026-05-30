#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const baseUrl = (process.env.PROOF_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const outDir = path.join(repoRoot, 'test-artifacts/skyemusicnexus-skyepay-loop-live-direct');
const checkedAt = new Date().toISOString();
const stamp = checkedAt.replace(/[:.]/g, '-');

const secretKeys = [
  'MCP_GATE_SESSION',
  'QUANTUMSKYES_MCP_TOKEN',
  'FREE99_ADMIN_CODE',
  'FREE99_GATE_CODE',
  'OWNER_ADMIN_CODE',
  'ADMIN_CODE',
  'ZERO_OS_ADMIN_CODE',
  'METRAIYUX_OWNER_ADMIN_CODE',
  'FS27_ADMIN_CODE',
  'SKYGATEFS27_ADMIN_CODE',
  'SKYGATE_ADMIN_CODE',
  'SKYGATE_OWNER_CODE',
  'SKYE_GATE_ADMIN_CODE',
  'SKYE_GATE_OWNER_CODE'
];

function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function unquote(value) {
  let clean = String(value || '').trim().replace(/^export\s+/, '').trim();
  while ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) clean = clean.slice(1, -1).trim();
  return clean;
}

function parseEnvText(text) {
  const rows = {};
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const match = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|:)\s*(.*)$/);
    if (match) rows[match[1]] = unquote(match[2]);
  }
  return rows;
}

function expandCandidate(value) {
  const out = [];
  const clean = unquote(value).replace(/^Bearer\s+/i, '').trim();
  if (!clean) return out;
  out.push(clean);
  try {
    const parsed = JSON.parse(clean);
    for (const key of ['token', 'gateToken', 'gateBearerToken', 'bearer', 'session', 'ownerToken']) {
      if (typeof parsed?.[key] === 'string') out.push(parsed[key].replace(/^Bearer\s+/i, '').trim());
    }
  } catch {}
  return out.filter(Boolean);
}

function localCandidates() {
  const merged = {
    ...parseEnvText(readText(path.join(repoRoot, '.env'))),
    ...parseEnvText(readText(path.join(repoRoot, 'env.txt'))),
    ...parseEnvText(readText(path.join(repoRoot, 'ADMIN_REFERENCE.md'))),
    ...process.env
  };
  const seen = new Set();
  const candidates = [];
  for (const key of secretKeys) {
    for (const value of expandCandidate(merged[key])) {
      if (!seen.has(value)) {
        seen.add(value);
        candidates.push({ key, value });
      }
    }
  }
  return candidates;
}

function gateHeaders(token, extra = {}) {
  return {
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    'x-skygate-session': token,
    ...extra
  };
}

async function resolveOwnerGate(receipt) {
  for (const candidate of localCandidates()) {
    try {
      const response = await fetch(`${baseUrl}/api/owner/admin-login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: candidate.value }),
        signal: AbortSignal.timeout(20000)
      });
      const data = await response.json().catch(() => ({}));
      const token = String(data.gateToken || data.gateBearerToken || data.token || '').replace(/^Bearer\s+/i, '').trim();
      receipt.authAttempts.push({ sourceKey: candidate.key, status: response.status, ok: response.ok && Boolean(token) });
      if (response.ok && token) return { token, sourceKey: candidate.key };
    } catch (error) {
      receipt.authAttempts.push({ sourceKey: candidate.key, ok: false, error: String(error?.message || error).slice(0, 120) });
    }
  }
  throw new Error('No local owner/admin candidate unlocked the shared 0S gate.');
}

async function call(method, route, token, body = null) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: gateHeaders(token, { 'content-type': 'application/json' }),
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000)
  });
  const payload = await response.json().catch(async () => ({ text: await response.text().catch(() => '') }));
  if (!response.ok || payload?.ok === false) {
    throw new Error(`${method} ${route} returned ${response.status}: ${JSON.stringify(payload).slice(0, 900)}`);
  }
  return { status: response.status, payload };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const receipt = {
    schema: 'skyemusicnexus.skyepay-loop-live-direct.v1',
    ok: false,
    checkedAt,
    browserOpened: false,
    playwrightStarted: false,
    baseUrl,
    authAttempts: [],
    steps: []
  };
  const owner = await resolveOwnerGate(receipt);
  receipt.auth = { ok: true, sourceKey: owner.sourceKey };

  const idSuffix = `live_${Date.now()}`;
  const primaryArtistId = `loop_primary_${idSuffix}`;
  const featureArtistId = `loop_feature_${idSuffix}`;
  const productId = `prod_loop_single_${idSuffix}`;
  const storeSlug = `loop-primary-${idSuffix}`;

  await call('POST', '/api/skymusicnexus/music-artists', owner.token, {
    action: 'register',
    id: primaryArtistId,
    name: 'Live Loop Primary',
    email: `${primaryArtistId}@example.invalid`,
    genre: ['proof-rnb'],
    paperwork: { status: 'approved', completedAt: checkedAt }
  });
  receipt.steps.push('primary_artist_registered');

  await call('POST', '/api/skymusicnexus/music-artists', owner.token, {
    action: 'register',
    id: featureArtistId,
    name: 'Live Loop Feature',
    email: `${featureArtistId}@example.invalid`,
    genre: ['proof-rap'],
    paperwork: { status: 'approved', completedAt: checkedAt }
  });
  receipt.steps.push('feature_artist_registered');

  await call('POST', '/api/skymusicnexus/music-store', owner.token, {
    action: 'upsert-store',
    artistId: primaryArtistId,
    artistName: 'Live Loop Primary',
    name: 'Live Loop Primary Nexus Store',
    storefrontPlan: 'managed-music-ops',
    skyeCommerceMerchantId: `skyepay_artist_${primaryArtistId}`,
    skyeCommerceStoreSlug: storeSlug,
    feeMode: 'artist_absorbed'
  });
  receipt.steps.push('store_upserted');

  const product = (await call('POST', '/api/skymusicnexus/music-store', owner.token, {
    action: 'create-product',
    productId,
    artistId: primaryArtistId,
    title: 'Live SkyPay Loop Proof Single',
    priceCents: 444,
    fulfillmentType: 'digital-link',
    splitSheet: [
      { lineId: 'primary', artistId: primaryArtistId, stageName: 'Live Loop Primary', role: 'primary_artist', shareBps: 7000 },
      { lineId: 'feature', artistId: featureArtistId, stageName: 'Live Loop Feature', role: 'featured_artist', shareBps: 3000 }
    ]
  })).payload.product;
  receipt.steps.push('product_created');

  const order = (await call('POST', '/api/skymusicnexus/music-store', owner.token, {
    action: 'record-order',
    productId: product.productId,
    quantity: 2,
    buyerEmail: `buyer-${idSuffix}@example.invalid`
  })).payload.order;
  assert(order.status === 'pending_skyepay_checkout', `order status was ${order.status}`);
  assert(order.checkoutIntent?.confirmationAction === 'confirm-skypay-order', 'order did not expose SkyPay confirmation action');
  receipt.steps.push('order_recorded');

  const confirmed = (await call('POST', '/api/skymusicnexus/music-store', owner.token, {
    action: 'confirm-skypay-order',
    orderId: order.orderId,
    skyepayPaymentId: `skypay_pi_${idSuffix}`,
    providerPayload: { checkout_session: `live_loop_session_${idSuffix}`, proof_only: true }
  })).payload;
  assert(confirmed.order.status === 'paid_pending_fulfillment', `confirmed order status was ${confirmed.order.status}`);
  assert(confirmed.receivable.provider === 'skypay', `receivable provider was ${confirmed.receivable.provider}`);
  assert(confirmed.receivable.merchantSettlementModel === 'single_merchant_of_record_internal_artist_payables', 'wrong merchant settlement model');
  assert(confirmed.settlements.length === 2, `expected 2 settlements, got ${confirmed.settlements.length}`);
  assert(confirmed.settlements.every((item) => item.status === 'pending_owner_disbursement'), 'settlements were not pending owner disbursement');
  assert(confirmed.payoutPolicy?.stripeConnectRequired === false, 'loop still requires Stripe Connect');
  receipt.steps.push('skypay_confirmed_receivable_and_splits');

  const disbursed = (await call('POST', '/api/skymusicnexus/music-payments', owner.token, {
    action: 'record-disbursement',
    settlementId: confirmed.settlements[0].settlementId,
    provider: 'cashapp',
    destinationLabel: '$liveLoopPrimary',
    externalReference: `cashapp-${idSuffix}`
  })).payload;
  assert(disbursed.disbursement.status === 'completed_owner_recorded', `disbursement status was ${disbursed.disbursement.status}`);
  assert(disbursed.settlement.status === 'disbursed', `settlement status was ${disbursed.settlement.status}`);
  receipt.steps.push('owner_disbursement_recorded');

  const payments = (await call('GET', `/api/skymusicnexus/music-payments?artistId=${encodeURIComponent(primaryArtistId)}`, owner.token)).payload;
  assert(payments.summary.receivables >= 1, 'live payments summary did not expose receivable');
  assert(payments.summary.settlements >= 1, 'live payments summary did not expose settlements');
  assert(payments.summary.disbursements >= 1, 'live payments summary did not expose disbursement');

  receipt.ok = true;
  receipt.finishedAt = new Date().toISOString();
  receipt.orderId = order.orderId;
  receipt.productId = product.productId;
  receipt.receivableId = confirmed.receivable.receivableId;
  receipt.settlementIds = confirmed.settlements.map((item) => item.settlementId);
  receipt.disbursementId = disbursed.disbursement.disbursementId;
  receipt.summary = payments.summary;
  receipt.guarantees = [
    'Production MusicNexus store order creates a SkyPay checkout intent with confirmation action.',
    'Production SkyPay confirmation records Skyes Over London as merchant of record receivable.',
    'Production split sheet creates internal settlement rows without Stripe Connect merchant signup.',
    'Production owner-recorded CashApp-style disbursement closes one approved settlement row.'
  ];

  const receiptPath = path.join(outDir, `live-direct-${Date.now()}.json`);
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  fs.writeFileSync(path.join(outDir, 'latest.json'), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: true,
    receipt: path.relative(repoRoot, receiptPath),
    orderId: receipt.orderId,
    receivableId: receipt.receivableId,
    settlements: receipt.settlementIds.length,
    disbursementId: receipt.disbursementId
  }, null, 2));
}

main().catch((error) => {
  fs.mkdirSync(outDir, { recursive: true });
  const failure = { ok: false, checkedAt, browserOpened: false, playwrightStarted: false, baseUrl, error: error.message, stack: error.stack };
  fs.writeFileSync(path.join(outDir, 'latest.json'), `${JSON.stringify(failure, null, 2)}\n`);
  console.error(JSON.stringify(failure, null, 2));
  process.exit(1);
});
