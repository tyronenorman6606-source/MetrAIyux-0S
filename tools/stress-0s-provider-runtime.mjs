#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';
import worker from '../metraiyux_0s_site/cloudflare/worker.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'test-artifacts', '0s-provider-runtime');
const latestPath = path.join(outDir, '0s-provider-runtime-stress-latest.json');

class MemoryKV {
  constructor() {
    this.map = new Map();
  }
  async get(key, options = {}) {
    const value = this.map.has(key) ? this.map.get(key) : null;
    if (value == null) return null;
    if (options?.type === 'json') return JSON.parse(value);
    return value;
  }
  async put(key, value) {
    this.map.set(key, String(value));
  }
  async list({ prefix = '', limit = 1000 } = {}) {
    return { keys: [...this.map.keys()].filter((key) => key.startsWith(prefix)).slice(0, limit).map((name) => ({ name })) };
  }
}

class MemorySkyGate {
  constructor() {
    this.token = 'fs27-provider-runtime-stress-token';
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/admin/login') return Response.json({ ok: true, active: true, token: this.token, email: 'owner@metraiyux.local', role: 'owner', scope: 'admin.read admin.write keys.write gateway.invoke 0s.owner', scopes: ['admin.read', 'admin.write', 'keys.write', 'gateway.invoke', '0s.owner'], exp: Math.floor(Date.now() / 1000) + 3600 });
    if (['/auth-introspect', '/auth/introspect', '/.netlify/functions/auth-introspect'].includes(url.pathname)) {
      const body = await request.json().catch(() => ({}));
      const active = body.token === this.token;
      return Response.json({ ok: active, active, email: 'owner@metraiyux.local', role: active ? 'owner' : '', scope: active ? 'admin.read admin.write keys.write gateway.invoke 0s.owner' : '', scopes: active ? ['admin.read', 'admin.write', 'keys.write', 'gateway.invoke', '0s.owner'] : [], exp: Math.floor(Date.now() / 1000) + 3600 }, { status: active ? 200 : 401 });
    }
    if (url.pathname === '/platform/events') return Response.json({ ok: true, accepted: true, persisted: true });
    return new Response('not found', { status: 404 });
  }
}

function ctx() {
  return { waitUntil() {} };
}

function req(pathname, { method = 'GET', headers = {}, body } = {}) {
  return new Request(`https://metraiyux.example${pathname}`, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
}

function env() {
  return {
    SITE_EVENTS_KV: new MemoryKV(),
    OWNER_ADMIN_CODE: 'owner-test-code',
    OWNER_ADMIN_SESSION_SECRET: 'owner-session-secret-for-provider-runtime-stress',
    SKYGATE_EVENT_MIRROR_SECRET: 'mirror-secret',
    SKYGATEFS27_WORKER: new MemorySkyGate(),
    TWILIO_ACCOUNT_SID: 'AC00000000000000000000000000000000',
    TWILIO_AUTH_TOKEN: 'twilio-secret-not-returned',
    TWILIO_FROM: '+15555550100',
    RESEND_API_KEY: 're_test_secret_not_returned',
    RESEND_FROM: 'owner@metraiyux.local',
    STRIPE_SECRET_KEY: 'sk_test_secret_not_returned',
    PAYPAL_CLIENT_ID: 'paypal_client_test',
    PAYPAL_CLIENT_SECRET: 'paypal_secret_not_returned',
    PAYPAL_WEBHOOK_ID: 'paypal_webhook_test',
    UPS_CLIENT_ID: 'ups_client_test',
    UPS_CLIENT_SECRET: 'ups_secret_not_returned',
    UPS_ACCOUNT_NUMBER: 'ups_account_test',
    GOOGLE_MERCHANT_ACCESS_TOKEN: 'google_merchant_secret_not_returned',
    GOOGLE_MERCHANT_ID: '999',
    META_CATALOG_ACCESS_TOKEN: 'meta_secret_not_returned',
    META_CATALOG_ID: 'meta_catalog_test',
    TIKTOK_CATALOG_ACCESS_TOKEN: 'tiktok_secret_not_returned',
    TIKTOK_CATALOG_ID: 'tiktok_catalog_test',
    ELEVENLABS_API_KEY: 'elevenlabs_test_secret_not_returned',
    STABILITY_API_KEY: 'stability_test_secret_not_returned',
    FEDIVERSE_ACCESS_TOKEN: 'fediverse_test_secret_not_returned',
    ANTHROPIC_API_KEY: 'anthropic_test_secret_not_returned',
    GEMINI_API_KEY: 'gemini_test_secret_not_returned',
    CF_API_TOKEN: 'cloudflare_test_secret_not_returned',
    SEMRUSH_API_KEY: 'semrush_test_secret_not_returned',
    GSC_ACCESS_TOKEN: 'gsc_test_secret_not_returned',
    MAPBOX_ACCESS_TOKEN: 'pk_test_secret_not_returned',
    CHECKR_API_KEY: 'checkr_test_secret_not_returned',
    CHECKR_PACKAGE_ID: 'driver_basic',
    CERTN_API_KEY: 'certn_test_secret_not_returned',
    CERTN_OWNER_ID: 'certn-owner-test',
    CLOUDFLARE_R2_ACCOUNT_ID: 'r2-account-test',
    CLOUDFLARE_R2_BUCKET: 'r2-bucket-test',
    CLOUDFLARE_R2_ACCESS_KEY: 'r2-access-test',
    CLOUDFLARE_R2_SECRET_KEY: 'r2-secret-not-returned',
    ASSETS: { async fetch(request) { return new Response(`asset:${new URL(request.url).pathname}`, { status: 200 }); } }
  };
}

async function api(e, token, pathname, init = {}) {
  const response = await worker.fetch(req(pathname, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'x-skye-gate-session': token, ...(init.headers || {}) }
  }), e, ctx());
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

const e = env();
await fs.promises.mkdir(outDir, { recursive: true });
const login = await worker.fetch(req('/api/owner/admin-login', { method: 'POST', body: { code: 'owner-test-code' } }), e, ctx());
assert.equal(login.status, 200);
const token = (await login.json()).token;

const grant = await api(e, token, '/api/0s/automation/grants', {
  method: 'POST',
  body: {
    duration_hours: 72,
    providers: ['twilio', 'resend', 'stripe', 'paypal', 'ups', 'google_merchant', 'meta_catalog', 'tiktok_catalog', 'mapbox', 'checkr', 'certn', 'cloudflare-r2', 'skymail', 'relay13', 'skynet', 'openai', 'anthropic', 'gemini', 'elevenlabs', 'stability', 'fediverse', 'cloudflare', 'dns', 'commerce-http', 'semrush', 'google-search-console', 'google-calendar'],
    actions: ['twilio.sms.send', 'twilio.voice.call', 'twilio.message.status', 'resend.domains.list', 'stripe.account.retrieve', 'stripe.balance.retrieve', 'stripe.checkout.retrieve', 'stripe.webhook.lifecycle', 'stripe.payment_intent.create', 'stripe.payment_intent.retrieve', 'stripe.payment_intent.capture', 'stripe.terminal.reader.process_payment_intent', 'stripe.refund.create', 'stripe.refund.retrieve', 'stripe.dispute.evidence.submit', 'paypal.identity.userinfo', 'paypal.checkout.order.create', 'paypal.refund.create', 'paypal.dispute.evidence.submit', 'paypal.webhook.verify', 'ups.account.health', 'ups.shipment.create', 'ups.rate.quote', 'google_merchant.authinfo.get', 'google_merchant.products.batch', 'meta_catalog.catalog.get', 'meta_catalog.products.batch', 'tiktok_catalog.catalog.get', 'tiktok_catalog.products.upload', 'mapbox.route.enrich', 'mapbox.geocode', 'checkr.background_check.request', 'certn.background_check.request', 'storage.object.put', 'skymail.mailbox.provision', 'relay13.conversation.create', 'skynet.deploy.init', 'openai.image.generate', 'openai.chat.complete', 'anthropic.chat.complete', 'gemini.chat.complete', 'gemini.embedding.create', 'elevenlabs.music.generate', 'stability.audio.generate', 'fediverse.media.upload', 'fediverse.status.publish', 'fediverse.feed.sync', 'cloudflare.token.verify', 'cloudflare.custom_hostname.create', 'cloudflare.custom_hostname.status', 'dns.txt.lookup', 'commerce.signed_json.post', 'commerce.routex.handoff', 'commerce.webhook.deliver', 'commerce.url.fetch_html', 'shopify.graphql.import', 'semrush.domain_organic.pull', 'gsc.search_analytics.query', 'google.calendar.event.create'],
    app_ids: ['provider-runtime-stress'],
    workspace_ids: ['ws-stress'],
    customer_ids: ['cust-stress'],
    max_actions: 100,
    max_cost_cents: 10000
  }
});
assert.equal(grant.status, 201);

const total = Number(process.env.PROVIDER_RUNTIME_STRESS_COUNT || 40);
const concurrency = Number(process.env.PROVIDER_RUNTIME_STRESS_CONCURRENCY || 8);
const queue = Array.from({ length: total }, (_, index) => index);
const results = [];

function stressPayload(index) {
  const cases = [
    { provider_id: 'twilio', action: 'twilio.sms.send', usage_lane: 'sms', payload: { to: '+15555550123', body: `Provider runtime stress ${index}` }, consent: { sms_opt_in: true } },
    { provider_id: 'twilio', action: 'twilio.voice.call', usage_lane: 'voice', payload: { to: '+15555550123', twiml: '<Response><Say>0S stress proof.</Say></Response>' }, consent: { voice_opt_in: true } },
    { provider_id: 'twilio', action: 'twilio.message.status', usage_lane: 'sms-status', payload: { message_sid: `SM${String(index).padStart(32, '0').slice(0, 32)}` } },
    { provider_id: 'resend', action: 'resend.domains.list', usage_lane: 'resend:domains', payload: {} },
    { provider_id: 'stripe', action: 'stripe.account.retrieve', usage_lane: 'stripe:account', payload: {} },
    { provider_id: 'stripe', action: 'stripe.balance.retrieve', usage_lane: 'stripe:balance', payload: {} },
    { provider_id: 'stripe', action: 'stripe.checkout.retrieve', usage_lane: 'stripe:checkout-retrieve', payload: { session_id: `cs_test_${index}` } },
    { provider_id: 'stripe', action: 'stripe.webhook.lifecycle', usage_lane: 'stripe:webhook', payload: { event_id: `evt_test_${index}`, event_type: 'checkout.session.completed', object_id: `cs_test_${index}`, object_type: 'checkout.session', payment_status: 'paid' } },
    { provider_id: 'stripe', action: 'stripe.payment_intent.create', usage_lane: 'stripe:payment-intent-create', payload: { amount_cents: 100 + index, currency: 'usd', capture_method: 'manual', metadata: { source: 'provider-runtime-stress' } } },
    { provider_id: 'stripe', action: 'stripe.payment_intent.retrieve', usage_lane: 'stripe:payment-intent-retrieve', payload: { payment_intent_id: `pi_test_${index}` } },
    { provider_id: 'stripe', action: 'stripe.payment_intent.capture', usage_lane: 'stripe:payment-intent-capture', payload: { payment_intent_id: `pi_test_${index}`, amount_to_capture: 100 + index } },
    { provider_id: 'stripe', action: 'stripe.terminal.reader.process_payment_intent', usage_lane: 'stripe:terminal-reader', payload: { reader_id: `tmr_${index}`, amount_cents: 100 + index, currency: 'usd', order_ref: `cart_${index}` } },
    { provider_id: 'stripe', action: 'stripe.refund.create', usage_lane: 'stripe:refund-create', payload: { payment_intent_id: `pi_test_${index}`, amount_cents: 50 + index } },
    { provider_id: 'stripe', action: 'stripe.refund.retrieve', usage_lane: 'stripe:refund-retrieve', payload: { refund_id: `re_test_${index}` } },
    { provider_id: 'stripe', action: 'stripe.dispute.evidence.submit', usage_lane: 'stripe:dispute-evidence', payload: { dispute_id: `dp_test_${index}`, evidence: { summary: `Evidence ${index}` } } },
    { provider_id: 'paypal', action: 'paypal.identity.userinfo', usage_lane: 'paypal:identity', payload: {} },
    { provider_id: 'paypal', action: 'paypal.checkout.order.create', usage_lane: 'paypal:checkout', payload: { body: { intent: 'CAPTURE', purchase_units: [{ reference_id: `SKY-PAYPAL-${index}`, amount: { currency_code: 'USD', value: '25.00' } }] } } },
    { provider_id: 'paypal', action: 'paypal.refund.create', usage_lane: 'paypal:refund', payload: { capture_id: `PAYPAL-CAPTURE-${index}`, amount_cents: 50 + index, currency: 'USD' } },
    { provider_id: 'paypal', action: 'paypal.dispute.evidence.submit', usage_lane: 'paypal:dispute-evidence', payload: { dispute_id: `PP-D-${index}`, body: { evidences: [{ evidence_type: 'PROOF_OF_FULFILLMENT', evidence_info: { notes: `0S proof ${index}` } }] } } },
    { provider_id: 'paypal', action: 'paypal.webhook.verify', usage_lane: 'paypal:webhook', payload: { transmission_id: `tx-${index}`, transmission_time: '2026-05-29T00:00:00Z', cert_url: 'https://paypal.test/cert.pem', auth_algo: 'SHA256withRSA', transmission_sig: 'sig', webhook_event: { id: `WH-${index}` } } },
    { provider_id: 'ups', action: 'ups.account.health', usage_lane: 'ups:account-health', payload: {} },
    { provider_id: 'ups', action: 'ups.shipment.create', usage_lane: 'ups:shipment', payload: { body: { ShipmentRequest: { Shipment: { Shipper: { ShipperNumber: 'ups_account_test' }, Package: [{ PackagingType: { Code: '02' }, PackageWeight: { UnitOfMeasurement: { Code: 'LBS' }, Weight: '1' } }] } } } } },
    { provider_id: 'ups', action: 'ups.rate.quote', usage_lane: 'ups:rate', payload: { body: { RateRequest: { Request: { TransactionReference: { CustomerContext: `rate-${index}` } } } } } },
    { provider_id: 'google_merchant', action: 'google_merchant.authinfo.get', usage_lane: 'google-merchant:authinfo', payload: { merchant_id: '999' } },
    { provider_id: 'google_merchant', action: 'google_merchant.products.batch', usage_lane: 'google-merchant:products', payload: { merchant_id: '999', body: { entries: [{ batchId: 1, merchantId: '999', method: 'insert', product: { offerId: `prd_${index}`, title: 'Hat' } }] } } },
    { provider_id: 'meta_catalog', action: 'meta_catalog.catalog.get', usage_lane: 'meta-catalog:get', payload: { catalog_id: 'meta_catalog_test' } },
    { provider_id: 'meta_catalog', action: 'meta_catalog.products.batch', usage_lane: 'meta-catalog:products', payload: { catalog_id: 'meta_catalog_test', body: { requests: [{ method: 'CREATE', retailer_id: `prd_${index}`, data: { name: 'Hat' } }] } } },
    { provider_id: 'tiktok_catalog', action: 'tiktok_catalog.catalog.get', usage_lane: 'tiktok-catalog:get', payload: { catalog_id: 'tiktok_catalog_test' } },
    { provider_id: 'tiktok_catalog', action: 'tiktok_catalog.products.upload', usage_lane: 'tiktok-catalog:upload', payload: { catalog_id: 'tiktok_catalog_test', body: { catalog_id: 'tiktok_catalog_test', products: [{ sku_id: `prd_${index}`, title: 'Hat' }] } } },
    { provider_id: 'mapbox', action: 'mapbox.route.enrich', usage_lane: 'mapbox:route', payload: { coordinates: [[-112.074, 33.448], [-111.926, 33.494]] } },
    { provider_id: 'mapbox', action: 'mapbox.geocode', usage_lane: 'mapbox:geocode', payload: { address: `Phoenix stop ${index}` } },
    { provider_id: 'checkr', action: 'checkr.background_check.request', usage_lane: 'checkr:invite', payload: { email: `driver${index}@example.com`, package_id: 'driver_basic' } },
    { provider_id: 'certn', action: 'certn.background_check.request', usage_lane: 'certn:invite', payload: { email: `driver${index}@example.com`, owner_id: 'certn-owner-test' } },
    { provider_id: 'cloudflare-r2', action: 'storage.object.put', usage_lane: 'storage:put', payload: { key: `stress/provider-runtime-${index}.json`, content: { index } } },
    { provider_id: 'skymail', action: 'skymail.mailbox.provision', usage_lane: 'skymail:provision', payload: { workspace_id: 'ws-stress', mailbox_email: `runtime${index}@example.invalid` } },
    { provider_id: 'relay13', action: 'relay13.conversation.create', usage_lane: 'relay13:conversation', payload: { workspace: 'provider-runtime', subject: `Runtime stress ${index}`, message: 'Provider runtime relay stress.' } },
    { provider_id: 'skynet', action: 'skynet.deploy.init', usage_lane: 'skynet:deploy-init', payload: { project: 'provider-runtime-stress', deployment_id: `dep_provider_runtime_${index}` } },
    { provider_id: 'openai', action: 'openai.image.generate', usage_lane: 'openai:image', payload: { prompt: `A simple provider-runtime proof mark ${index}.` } },
    { provider_id: 'openai', action: 'openai.chat.complete', usage_lane: 'openai:chat', payload: { model: 'gpt-4.1-mini', messages: [{ role: 'system', content: 'Return strict JSON.' }, { role: 'user', content: `{"task":"provider runtime chat stress","index":${index}}` }], response_format: { type: 'json_object' } } },
    { provider_id: 'anthropic', action: 'anthropic.chat.complete', usage_lane: 'anthropic:chat', payload: { model: 'claude-3-5-sonnet-20241022', messages: [{ role: 'user', content: `provider runtime anthropic stress ${index}` }] } },
    { provider_id: 'gemini', action: 'gemini.chat.complete', usage_lane: 'gemini:chat', payload: { model: 'gemini-2.5-flash', messages: [{ role: 'user', content: `provider runtime gemini stress ${index}` }] } },
    { provider_id: 'gemini', action: 'gemini.embedding.create', usage_lane: 'gemini:embedding', payload: { model: 'gemini-embedding-001', input: `provider runtime embedding stress ${index}` } },
    { provider_id: 'elevenlabs', action: 'elevenlabs.music.generate', usage_lane: 'elevenlabs:music', payload: { prompt: `Provider runtime music stress ${index}.`, title: `Runtime Song ${index}`, duration_seconds: 12 } },
    { provider_id: 'stability', action: 'stability.audio.generate', usage_lane: 'stability:audio', payload: { prompt: `Provider runtime stable audio stress ${index}.`, title: `Runtime Audio ${index}`, duration_seconds: 12, output_format: 'mp3' } },
    { provider_id: 'fediverse', action: 'fediverse.media.upload', usage_lane: 'fediverse:media', payload: { instance_url: 'https://social.example', media_url: `https://cdn.example/proof-${index}.png`, token_env_key: 'FEDIVERSE_ACCESS_TOKEN' } },
    { provider_id: 'fediverse', action: 'fediverse.status.publish', usage_lane: 'fediverse:status', payload: { instance_url: 'https://social.example', status_text: `Provider runtime fediverse stress ${index}.`, visibility: 'unlisted', token_env_key: 'FEDIVERSE_ACCESS_TOKEN' } },
    { provider_id: 'fediverse', action: 'fediverse.feed.sync', usage_lane: 'fediverse:feed', payload: { instance_url: 'https://social.example', hashtag: 'musicnexus', limit: 2, token_env_key: 'FEDIVERSE_ACCESS_TOKEN' } },
    { provider_id: 'cloudflare', action: 'cloudflare.token.verify', usage_lane: 'cloudflare:token', payload: {} },
    { provider_id: 'cloudflare', action: 'cloudflare.custom_hostname.create', usage_lane: 'cloudflare:custom-hostname-create', payload: { zone_id: 'zone_test', body: { hostname: `store-${index}.example.com` } } },
    { provider_id: 'cloudflare', action: 'cloudflare.custom_hostname.status', usage_lane: 'cloudflare:custom-hostname-status', payload: { zone_id: 'zone_test', external_hostname_id: `host_${index}` } },
    { provider_id: 'dns', action: 'dns.txt.lookup', usage_lane: 'dns:txt', payload: { record_name: `_skyecommerce-${index}.example.com`, expected_value: 'skyecommerce-domain=abc123' } },
    { provider_id: 'commerce-http', action: 'commerce.signed_json.post', usage_lane: 'commerce:signed-json', payload: { url: 'https://commerce-runtime.example/sync', secret: 'commerce_secret_123456', event_type: 'commerce.sync', body: { index } } },
    { provider_id: 'commerce-http', action: 'commerce.routex.handoff', usage_lane: 'commerce:routex', payload: { url: 'https://commerce-runtime.example/routex', auth_token: 'routex_token_123456789', body: { index } } },
    { provider_id: 'commerce-http', action: 'commerce.webhook.deliver', usage_lane: 'commerce:webhook', payload: { url: 'https://commerce-runtime.example/webhook', method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ index }) } },
    { provider_id: 'commerce-http', action: 'commerce.url.fetch_html', usage_lane: 'commerce:url-fetch', payload: { url: 'https://commerce-runtime.example/storefront' } },
    { provider_id: 'commerce-http', action: 'shopify.graphql.import', usage_lane: 'commerce:shopify-graphql', payload: { url: 'https://shop.example/admin/api/2025-10/graphql.json', access_token: 'shopify_token_not_returned', query: 'query { shop { name } }', variables: { index } } },
    { provider_id: 'semrush', action: 'semrush.domain_organic.pull', usage_lane: 'semrush:domain', payload: { domain: 'example.com', database: 'us', display_limit: 1 } },
    { provider_id: 'google-search-console', action: 'gsc.search_analytics.query', usage_lane: 'gsc:query', payload: { siteUrl: 'https://example.com/', startDate: '2026-05-01', endDate: '2026-05-02', dimensions: ['query'], rowLimit: 1 } },
    { provider_id: 'google-calendar', action: 'google.calendar.event.create', usage_lane: 'google-calendar:create', payload: { summary: `Provider runtime calendar stress ${index}`, start_at: '2026-06-02T16:00:00.000Z', end_at: '2026-06-02T17:00:00.000Z', attendee_email: 'owner@example.invalid' } }
  ];
  return cases[index % cases.length];
}

async function runOne(index) {
  const started = Date.now();
  const item = stressPayload(index);
  const response = await api(e, token, '/api/0s/automation/execute', {
    method: 'POST',
    body: {
      live: true,
      sandbox: true,
      approval_grant_id: grant.body.grant.id,
      app_id: 'provider-runtime-stress',
      workspace_id: 'ws-stress',
      customer_id: 'cust-stress',
      client_id: 'client-stress',
      ...item
    }
  });
  results.push({
    index,
    provider_id: item.provider_id,
    action: item.action,
    status: response.status,
    ok: response.status === 200
      && response.body.receipt?.executed === true
      && response.body.receipt?.provider_call_made === false
      && response.body.receipt?.external_provider_call_made === false
      && response.body.receipt?.execution_mode === 'sandbox_receipt',
    receipt_id: response.body.receipt?.id || null,
    execution_mode: response.body.receipt?.execution_mode || null,
    external_provider_call_made: Boolean(response.body.receipt?.external_provider_call_made),
    duration_ms: Date.now() - started
  });
}

async function workerLoop() {
  while (queue.length) {
    const index = queue.shift();
    await runOne(index);
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => workerLoop()));
const receipt = {
  ok: results.every((item) => item.ok),
  schema: 'metraiyux.0s.provider-runtime-stress.v1',
  generated_at: new Date().toISOString(),
  no_browser_proof_run: true,
  owner_manual_live_check: true,
  live_provider_send_attempted: false,
  total,
  concurrency,
  passed: results.filter((item) => item.ok).length,
  failed: results.filter((item) => !item.ok).length,
  p95_ms: results.length ? results.map((item) => item.duration_ms).sort((a, b) => a - b)[Math.min(results.length - 1, Math.floor(results.length * 0.95))] : 0,
  results
};
await fs.promises.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
await fs.promises.writeFile(path.join(outDir, `${receipt.generated_at.replace(/[:.]/g, '-')}-stress.json`), `${JSON.stringify(receipt, null, 2)}\n`);
if (!receipt.ok) {
  console.error(JSON.stringify(receipt, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ total: receipt.total, passed: receipt.passed, failed: receipt.failed, p95_ms: receipt.p95_ms }, null, 2));
