import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import worker from '../cloudflare/worker.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

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
    this.token = 'fs27-provider-runtime-test-token';
    this.events = [];
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/admin/login') {
      return Response.json({
        ok: true,
        active: true,
        token: this.token,
        email: 'owner@metraiyux.local',
        role: 'owner',
        scope: 'admin.read admin.write keys.write gateway.invoke 0s.owner',
        scopes: ['admin.read', 'admin.write', 'keys.write', 'gateway.invoke', '0s.owner'],
        workspace: 'metraiyux-0s',
        exp: Math.floor(Date.now() / 1000) + 3600
      });
    }
    if (['/auth-introspect', '/auth/introspect', '/.netlify/functions/auth-introspect'].includes(url.pathname)) {
      const body = await request.json().catch(() => ({}));
      const active = body.token === this.token;
      return Response.json({
        ok: active,
        active,
        email: 'owner@metraiyux.local',
        role: active ? 'owner' : '',
        scope: active ? 'admin.read admin.write keys.write gateway.invoke 0s.owner' : '',
        scopes: active ? ['admin.read', 'admin.write', 'keys.write', 'gateway.invoke', '0s.owner'] : [],
        workspace: 'metraiyux-0s',
        exp: Math.floor(Date.now() / 1000) + 3600
      }, { status: active ? 200 : 401 });
    }
    if (url.pathname === '/platform/events') {
      this.events.push(await request.json().catch(() => ({})));
      return Response.json({ ok: true, accepted: true, persisted: true });
    }
    return new Response('not found', { status: 404 });
  }
}

function ctx() {
  return { waitUntil() {} };
}

function req(path, { method = 'GET', headers = {}, body } = {}) {
  return new Request(`https://metraiyux.example${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

function env(overrides = {}) {
  return {
    SITE_EVENTS_KV: new MemoryKV(),
    OWNER_ADMIN_CODE: 'owner-test-code',
    OWNER_ADMIN_SESSION_SECRET: 'owner-session-secret-for-provider-runtime-tests',
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
    ASSETS: {
      async fetch(request) {
        return new Response(`asset:${new URL(request.url).pathname}`, { status: 200 });
      }
    },
    ...overrides
  };
}

async function ownerToken(e) {
  const res = await worker.fetch(req('/api/owner/admin-login', {
    method: 'POST',
    body: { code: 'owner-test-code' }
  }), e, ctx());
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.ok(data.token);
  return data.token;
}

async function api(e, token, path, init = {}) {
  const res = await worker.fetch(req(path, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'x-skye-gate-session': token,
      ...(init.headers || {})
    }
  }), e, ctx());
  return { res, body: await res.json().catch(() => ({})) };
}

test('0S-PROVIDER-01 keeps provider runtime behind shared gate and reports redacted env status', async () => {
  const e = env();
  const blocked = await worker.fetch(req('/api/0s/providers/status'), e, ctx());
  assert.equal(blocked.status, 401);

  const token = await ownerToken(e);
  const status = await api(e, token, '/api/0s/providers/status');
  assert.equal(status.res.status, 200);
  assert.equal(status.body.ok, true);
  assert.equal(status.body.owner_runtime_rule.includes('whole 0S'), true);
  assert.match(status.body.execution_semantics.external_provider_call, /provider_call_made:true/);
  const twilio = status.body.providers.find((item) => item.id === 'twilio');
  assert.equal(twilio.configured, true);
  assert.ok(['paypal', 'ups', 'google_merchant', 'meta_catalog', 'tiktok_catalog'].every((id) => status.body.providers.some((item) => item.id === id && item.configured)));
  assert.equal(JSON.stringify(status.body).includes('twilio-secret-not-returned'), false);
});

test('0S-PROVIDER-04 creates Stripe checkout sandbox receipts through the shared runtime', async () => {
  const e = env();
  const token = await ownerToken(e);
  const grant = (await api(e, token, '/api/0s/automation/grants', {
    method: 'POST',
    body: {
      providers: ['stripe'],
      actions: ['stripe.checkout.create'],
      app_ids: ['saas-provisioning'],
      workspace_ids: ['ws-saas'],
      customer_ids: ['cust-saas'],
      max_actions: 3
    }
  })).body.grant;

  const run = await api(e, token, '/api/0s/automation/execute', {
    method: 'POST',
    body: {
      live: true,
      sandbox: true,
      approval_grant_id: grant.id,
      provider_id: 'stripe',
      action: 'stripe.checkout.create',
      app_id: 'saas-provisioning',
      workspace_id: 'ws-saas',
      customer_id: 'cust-saas',
      client_id: 'client-saas',
      usage_lane: 'saas:checkout',
      payload: {
        params: {
          mode: 'payment',
          success_url: 'https://metraiyux.example/success?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: 'https://metraiyux.example/cancel',
          'line_items[0][price]': 'price_test',
          'line_items[0][quantity]': '1'
        }
      }
    }
  });
  assert.equal(run.res.status, 200);
  assert.equal(run.body.receipt.executed, true);
  assert.equal(run.body.receipt.provider_call_made, false);
  assert.equal(run.body.receipt.external_provider_call_made, false);
  assert.equal(run.body.receipt.external_provider_boundary, 'not_crossed');
  assert.equal(run.body.receipt.execution_mode, 'sandbox_receipt');
  assert.equal(run.body.receipt.provider_result.object, 'checkout.session');
  assert.match(run.body.receipt.provider_result.url, /stripe_sandbox_/);
});

test('0S-PROVIDER-05 executes voice, payment lifecycle, routing, compliance, and storage through sandbox receipts', async () => {
  const e = env();
  const token = await ownerToken(e);
  const grant = (await api(e, token, '/api/0s/automation/grants', {
    method: 'POST',
    body: {
      providers: ['twilio', 'resend', 'stripe', 'paypal', 'ups', 'google_merchant', 'meta_catalog', 'tiktok_catalog', 'mapbox', 'checkr', 'certn', 'cloudflare-r2', 'skymail', 'relay13', 'skynet', 'openai', 'anthropic', 'gemini', 'elevenlabs', 'stability', 'fediverse', 'cloudflare', 'dns', 'commerce-http', 'semrush', 'google-search-console', 'google-calendar'],
      actions: [
        'twilio.voice.call',
        'twilio.message.status',
        'resend.domains.list',
        'stripe.account.retrieve',
        'stripe.balance.retrieve',
        'stripe.checkout.retrieve',
        'stripe.webhook.lifecycle',
        'stripe.payment_intent.create',
        'stripe.payment_intent.retrieve',
        'stripe.payment_intent.capture',
        'stripe.terminal.reader.process_payment_intent',
        'stripe.refund.create',
        'stripe.refund.retrieve',
        'stripe.dispute.evidence.submit',
        'paypal.identity.userinfo',
        'paypal.checkout.order.create',
        'paypal.refund.create',
        'paypal.dispute.evidence.submit',
        'paypal.webhook.verify',
        'ups.account.health',
        'ups.shipment.create',
        'ups.rate.quote',
        'google_merchant.authinfo.get',
        'google_merchant.products.batch',
        'meta_catalog.catalog.get',
        'meta_catalog.products.batch',
        'tiktok_catalog.catalog.get',
        'tiktok_catalog.products.upload',
        'mapbox.route.enrich',
        'mapbox.geocode',
        'checkr.background_check.request',
        'certn.background_check.request',
        'storage.object.put',
        'skymail.mailbox.provision',
        'relay13.conversation.create',
        'skynet.deploy.init',
        'openai.image.generate',
        'openai.chat.complete',
        'anthropic.chat.complete',
        'gemini.chat.complete',
        'gemini.embedding.create',
        'elevenlabs.music.generate',
        'stability.audio.generate',
        'fediverse.media.upload',
        'fediverse.status.publish',
        'fediverse.feed.sync',
        'cloudflare.token.verify',
        'cloudflare.custom_hostname.create',
        'cloudflare.custom_hostname.status',
        'dns.txt.lookup',
        'commerce.signed_json.post',
        'commerce.routex.handoff',
        'commerce.webhook.deliver',
        'commerce.url.fetch_html',
        'shopify.graphql.import',
        'semrush.domain_organic.pull',
        'gsc.search_analytics.query',
        'google.calendar.event.create'
      ],
      app_ids: ['provider-runtime-proof'],
      workspace_ids: ['ws-provider-runtime'],
      customer_ids: ['cust-provider-runtime'],
      max_actions: 80
    }
  })).body.grant;

  const cases = [
    {
      label: 'voice',
      provider_id: 'twilio',
      action: 'twilio.voice.call',
      payload: { to: '+15555550123', twiml: '<Response><Say>0S runtime proof.</Say></Response>' },
      consent: { voice_opt_in: true },
      object: ''
    },
    {
      label: 'message-status',
      provider_id: 'twilio',
      action: 'twilio.message.status',
      payload: { message_sid: 'SM00000000000000000000000000000000' },
      object: 'message'
    },
    {
      label: 'resend-domains',
      provider_id: 'resend',
      action: 'resend.domains.list',
      payload: {},
      object: 'resend.domains'
    },
    {
      label: 'stripe-account',
      provider_id: 'stripe',
      action: 'stripe.account.retrieve',
      payload: {},
      object: 'account'
    },
    {
      label: 'stripe-balance',
      provider_id: 'stripe',
      action: 'stripe.balance.retrieve',
      payload: {},
      object: 'balance'
    },
    {
      label: 'checkout-retrieve',
      provider_id: 'stripe',
      action: 'stripe.checkout.retrieve',
      payload: { session_id: 'cs_test_runtime' },
      object: 'checkout.session'
    },
    {
      label: 'stripe-webhook-lifecycle',
      provider_id: 'stripe',
      action: 'stripe.webhook.lifecycle',
      payload: { event_id: 'evt_test_runtime', event_type: 'checkout.session.completed', object_id: 'cs_test_runtime', object_type: 'checkout.session', payment_status: 'paid' },
      object: 'stripe.webhook.lifecycle'
    },
    {
      label: 'payment-intent-create',
      provider_id: 'stripe',
      action: 'stripe.payment_intent.create',
      payload: { amount_cents: 500, currency: 'usd', capture_method: 'manual', metadata: { source: 'provider-runtime-proof' } },
      object: 'payment_intent'
    },
    {
      label: 'payment-intent-retrieve',
      provider_id: 'stripe',
      action: 'stripe.payment_intent.retrieve',
      payload: { payment_intent_id: 'pi_test_runtime' },
      object: 'payment_intent'
    },
    {
      label: 'payment-intent-capture',
      provider_id: 'stripe',
      action: 'stripe.payment_intent.capture',
      payload: { payment_intent_id: 'pi_test_runtime', amount_to_capture: 500 },
      object: 'payment_intent'
    },
    {
      label: 'stripe-terminal-reader',
      provider_id: 'stripe',
      action: 'stripe.terminal.reader.process_payment_intent',
      payload: { reader_id: 'tmr_provider_runtime', amount_cents: 1200, currency: 'usd', order_ref: 'cart_provider_runtime' },
      object: 'terminal.reader.process_payment_intent'
    },
    {
      label: 'refund-create',
      provider_id: 'stripe',
      action: 'stripe.refund.create',
      payload: { payment_intent_id: 'pi_test_runtime', amount_cents: 200, reason: 'requested_by_customer' },
      object: 'refund'
    },
    {
      label: 'refund-retrieve',
      provider_id: 'stripe',
      action: 'stripe.refund.retrieve',
      payload: { refund_id: 're_test_runtime' },
      object: 'refund'
    },
    {
      label: 'stripe-dispute-evidence',
      provider_id: 'stripe',
      action: 'stripe.dispute.evidence.submit',
      payload: { dispute_id: 'dp_test_runtime', evidence: { summary: '0S dispute evidence proof.' } },
      object: 'dispute'
    },
    {
      label: 'paypal-identity',
      provider_id: 'paypal',
      action: 'paypal.identity.userinfo',
      payload: {},
      object: 'paypal.identity'
    },
    {
      label: 'paypal-checkout-create',
      provider_id: 'paypal',
      action: 'paypal.checkout.order.create',
      payload: { body: { intent: 'CAPTURE', purchase_units: [{ reference_id: 'SKY-PAYPAL-1', amount: { currency_code: 'USD', value: '25.00' } }] } },
      object: 'paypal.checkout.order'
    },
    {
      label: 'paypal-refund-create',
      provider_id: 'paypal',
      action: 'paypal.refund.create',
      payload: { capture_id: 'PAYPAL-CAPTURE-1', amount_cents: 200, currency: 'USD' },
      object: 'paypal.refund'
    },
    {
      label: 'paypal-dispute-evidence',
      provider_id: 'paypal',
      action: 'paypal.dispute.evidence.submit',
      payload: { dispute_id: 'PP-D-1', body: { evidences: [{ evidence_type: 'PROOF_OF_FULFILLMENT', evidence_info: { notes: '0S proof' } }] } },
      object: 'paypal.dispute'
    },
    {
      label: 'paypal-webhook-verify',
      provider_id: 'paypal',
      action: 'paypal.webhook.verify',
      payload: { transmission_id: 'tx-1', transmission_time: '2026-05-29T00:00:00Z', cert_url: 'https://paypal.test/cert.pem', auth_algo: 'SHA256withRSA', transmission_sig: 'sig', webhook_event: { id: 'WH-1' } },
      object: 'paypal.webhook'
    },
    {
      label: 'ups-account-health',
      provider_id: 'ups',
      action: 'ups.account.health',
      payload: {},
      object: 'ups.account'
    },
    {
      label: 'ups-shipment-create',
      provider_id: 'ups',
      action: 'ups.shipment.create',
      payload: { body: { ShipmentRequest: { Shipment: { Shipper: { ShipperNumber: 'ups_account_test' }, Package: [{ PackagingType: { Code: '02' }, PackageWeight: { UnitOfMeasurement: { Code: 'LBS' }, Weight: '1' } }] } } } },
      object: 'ups.shipment'
    },
    {
      label: 'ups-rate-quote',
      provider_id: 'ups',
      action: 'ups.rate.quote',
      payload: { body: { RateRequest: { Request: { TransactionReference: { CustomerContext: 'rate-proof' } } } } },
      object: 'ups.rate'
    },
    {
      label: 'google-merchant-authinfo',
      provider_id: 'google_merchant',
      action: 'google_merchant.authinfo.get',
      payload: { merchant_id: '999' },
      object: 'google_merchant.authinfo'
    },
    {
      label: 'google-merchant-products',
      provider_id: 'google_merchant',
      action: 'google_merchant.products.batch',
      payload: { merchant_id: '999', body: { entries: [{ batchId: 1, merchantId: '999', method: 'insert', product: { offerId: 'prd_1', title: 'Hat' } }] } },
      object: 'google_merchant.products.batch'
    },
    {
      label: 'meta-catalog-get',
      provider_id: 'meta_catalog',
      action: 'meta_catalog.catalog.get',
      payload: { catalog_id: 'meta_catalog_test' },
      object: 'meta_catalog.catalog'
    },
    {
      label: 'meta-catalog-products',
      provider_id: 'meta_catalog',
      action: 'meta_catalog.products.batch',
      payload: { catalog_id: 'meta_catalog_test', body: { requests: [{ method: 'CREATE', retailer_id: 'prd_1', data: { name: 'Hat' } }] } },
      object: 'meta_catalog.products.batch'
    },
    {
      label: 'tiktok-catalog-get',
      provider_id: 'tiktok_catalog',
      action: 'tiktok_catalog.catalog.get',
      payload: { catalog_id: 'tiktok_catalog_test' },
      object: 'tiktok_catalog.catalog'
    },
    {
      label: 'tiktok-catalog-upload',
      provider_id: 'tiktok_catalog',
      action: 'tiktok_catalog.products.upload',
      payload: { catalog_id: 'tiktok_catalog_test', body: { catalog_id: 'tiktok_catalog_test', products: [{ sku_id: 'prd_1', title: 'Hat' }] } },
      object: 'tiktok_catalog.products.upload'
    },
    {
      label: 'mapbox',
      provider_id: 'mapbox',
      action: 'mapbox.route.enrich',
      payload: { coordinates: [[-112.074, 33.448], [-111.926, 33.494]] },
      object: 'route'
    },
    {
      label: 'mapbox-geocode',
      provider_id: 'mapbox',
      action: 'mapbox.geocode',
      payload: { address: 'Phoenix, AZ' },
      object: 'geocode'
    },
    {
      label: 'checkr',
      provider_id: 'checkr',
      action: 'checkr.background_check.request',
      payload: { email: 'driver@example.com', package_id: 'driver_basic' },
      object: 'invitation'
    },
    {
      label: 'certn',
      provider_id: 'certn',
      action: 'certn.background_check.request',
      payload: { email: 'driver@example.com', owner_id: 'certn-owner-test' },
      object: 'application_invite'
    },
    {
      label: 'storage',
      provider_id: 'cloudflare-r2',
      action: 'storage.object.put',
      payload: { key: 'proof/provider-runtime.json', content: { ok: true } },
      object: 'storage.object'
    },
    {
      label: 'skymail-provision',
      provider_id: 'skymail',
      action: 'skymail.mailbox.provision',
      payload: { workspace_id: 'ws-provider-runtime', mailbox_email: 'runtime@example.invalid' },
      object: 'mailbox.provision'
    },
    {
      label: 'relay13-conversation',
      provider_id: 'relay13',
      action: 'relay13.conversation.create',
      payload: { workspace: 'provider-runtime', subject: 'Runtime proof', message: 'Provider runtime relay proof.' },
      object: 'conversation.create'
    },
    {
      label: 'skynet-init',
      provider_id: 'skynet',
      action: 'skynet.deploy.init',
      payload: { project: 'provider-runtime-proof', deployment_id: 'dep_provider_runtime' },
      object: 'deploy.init'
    },
    {
      label: 'openai-image',
      provider_id: 'openai',
      action: 'openai.image.generate',
      payload: { prompt: 'A simple provider-runtime proof mark.' },
      object: 'image'
    },
    {
      label: 'openai-chat',
      provider_id: 'openai',
      action: 'openai.chat.complete',
      payload: {
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: 'Return strict JSON.' },
          { role: 'user', content: '{"task":"provider runtime chat proof"}' }
        ],
        response_format: { type: 'json_object' }
      },
      object: 'chat.completion'
    },
    {
      label: 'anthropic-chat',
      provider_id: 'anthropic',
      action: 'anthropic.chat.complete',
      payload: { model: 'claude-3-5-sonnet-20241022', messages: [{ role: 'user', content: 'provider runtime anthropic proof' }] },
      object: 'chat.completion'
    },
    {
      label: 'gemini-chat',
      provider_id: 'gemini',
      action: 'gemini.chat.complete',
      payload: { model: 'gemini-2.5-flash', messages: [{ role: 'user', content: 'provider runtime gemini proof' }] },
      object: 'chat.completion'
    },
    {
      label: 'gemini-embedding',
      provider_id: 'gemini',
      action: 'gemini.embedding.create',
      payload: { model: 'gemini-embedding-001', input: 'provider runtime embedding proof' },
      object: 'embedding'
    },
    {
      label: 'elevenlabs-music',
      provider_id: 'elevenlabs',
      action: 'elevenlabs.music.generate',
      payload: { prompt: 'Provider runtime music proof.', title: 'Runtime Song', duration_seconds: 12 },
      object: 'music.audio'
    },
    {
      label: 'stability-audio',
      provider_id: 'stability',
      action: 'stability.audio.generate',
      payload: { prompt: 'Provider runtime stable audio proof.', title: 'Runtime Audio', duration_seconds: 12, output_format: 'mp3' },
      object: 'music.audio'
    },
    {
      label: 'fediverse-media-upload',
      provider_id: 'fediverse',
      action: 'fediverse.media.upload',
      payload: { instance_url: 'https://social.example', media_url: 'https://cdn.example/proof.png', token_env_key: 'FEDIVERSE_ACCESS_TOKEN' },
      object: 'fediverse.media'
    },
    {
      label: 'fediverse-status-publish',
      provider_id: 'fediverse',
      action: 'fediverse.status.publish',
      payload: { instance_url: 'https://social.example', status_text: 'Provider runtime fediverse proof.', visibility: 'unlisted', token_env_key: 'FEDIVERSE_ACCESS_TOKEN' },
      object: 'fediverse.status'
    },
    {
      label: 'fediverse-feed-sync',
      provider_id: 'fediverse',
      action: 'fediverse.feed.sync',
      payload: { instance_url: 'https://social.example', hashtag: 'musicnexus', limit: 2, token_env_key: 'FEDIVERSE_ACCESS_TOKEN' },
      object: 'fediverse.feed'
    },
    {
      label: 'cloudflare-token',
      provider_id: 'cloudflare',
      action: 'cloudflare.token.verify',
      payload: {},
      object: 'cloudflare.token'
    },
    {
      label: 'cloudflare-custom-hostname-create',
      provider_id: 'cloudflare',
      action: 'cloudflare.custom_hostname.create',
      payload: { zone_id: 'zone_test', body: { hostname: 'store.example.com' } },
      object: 'cloudflare.custom_hostname'
    },
    {
      label: 'cloudflare-custom-hostname-status',
      provider_id: 'cloudflare',
      action: 'cloudflare.custom_hostname.status',
      payload: { zone_id: 'zone_test', external_hostname_id: 'host_test' },
      object: 'cloudflare.custom_hostname'
    },
    {
      label: 'dns-txt-lookup',
      provider_id: 'dns',
      action: 'dns.txt.lookup',
      payload: { record_name: '_skyecommerce.example.com', expected_value: 'skyecommerce-domain=abc123' },
      object: 'dns.txt'
    },
    {
      label: 'commerce-signed-json-post',
      provider_id: 'commerce-http',
      action: 'commerce.signed_json.post',
      payload: { url: 'https://commerce-runtime.example/sync', secret: 'commerce_secret_123456', event_type: 'commerce.sync', body: { ok: true } },
      object: 'signed_json.post'
    },
    {
      label: 'commerce-routex-handoff',
      provider_id: 'commerce-http',
      action: 'commerce.routex.handoff',
      payload: { url: 'https://commerce-runtime.example/routex', auth_token: 'routex_token_123456789', body: { route: true } },
      object: 'routex.handoff'
    },
    {
      label: 'commerce-webhook-deliver',
      provider_id: 'commerce-http',
      action: 'commerce.webhook.deliver',
      payload: { url: 'https://commerce-runtime.example/webhook', method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"ok":true}' },
      object: 'webhook.deliver'
    },
    {
      label: 'commerce-url-fetch-html',
      provider_id: 'commerce-http',
      action: 'commerce.url.fetch_html',
      payload: { url: 'https://commerce-runtime.example/storefront' },
      object: 'url.fetch_html'
    },
    {
      label: 'shopify-graphql-import',
      provider_id: 'commerce-http',
      action: 'shopify.graphql.import',
      payload: { url: 'https://shop.example/admin/api/2025-10/graphql.json', access_token: 'shopify_token_not_returned', query: 'query { shop { name } }', variables: {} },
      object: 'shopify.graphql.import'
    },
    {
      label: 'semrush-domain',
      provider_id: 'semrush',
      action: 'semrush.domain_organic.pull',
      payload: { domain: 'example.com', database: 'us', display_limit: 1 },
      object: 'semrush.domain_organic'
    },
    {
      label: 'gsc-query',
      provider_id: 'google-search-console',
      action: 'gsc.search_analytics.query',
      payload: { siteUrl: 'https://example.com/', startDate: '2026-05-01', endDate: '2026-05-02', dimensions: ['query'], rowLimit: 1 },
      object: 'gsc.search_analytics'
    },
    {
      label: 'google-calendar-create',
      provider_id: 'google-calendar',
      action: 'google.calendar.event.create',
      payload: { summary: 'Provider runtime calendar proof', start_at: '2026-06-02T16:00:00.000Z', end_at: '2026-06-02T17:00:00.000Z', attendee_email: 'owner@example.invalid' },
      object: 'calendar.event'
    }
  ];

  for (const item of cases) {
    const run = await api(e, token, '/api/0s/automation/execute', {
      method: 'POST',
      body: {
        live: true,
        sandbox: true,
        approval_grant_id: grant.id,
        provider_id: item.provider_id,
        action: item.action,
        app_id: 'provider-runtime-proof',
        workspace_id: 'ws-provider-runtime',
        customer_id: 'cust-provider-runtime',
        client_id: 'client-provider-runtime',
        usage_lane: item.label,
        payload: item.payload,
        consent: item.consent || {}
      }
    });
    assert.equal(run.res.status, 200, item.label);
    assert.equal(run.body.receipt.executed, true, item.label);
    assert.equal(run.body.receipt.provider_call_made, false, item.label);
    assert.equal(run.body.receipt.external_provider_call_made, false, item.label);
    assert.equal(run.body.receipt.execution_mode, 'sandbox_receipt', item.label);
    assert.equal(run.body.receipt.status, 'executed_sandbox', item.label);
    if (item.object) assert.equal(run.body.receipt.provider_result.object, item.object, item.label);
    assert.equal(run.body.receipt.fs27_mirror.ok, true, item.label);
    assert.equal(run.body.receipt.command_bridge.ok, true, item.label);
  }
});

test('0S-PROVIDER-06 records async provider callbacks without double-sending provider work', async () => {
  const e = env();
  const token = await ownerToken(e);
  const grant = (await api(e, token, '/api/0s/automation/grants', {
    method: 'POST',
    body: {
      providers: ['relay13'],
      actions: ['relay13.conversation.create'],
      app_ids: ['relay13-callback-proof'],
      workspace_ids: ['ws-relay13'],
      customer_ids: ['cust-relay13'],
      max_actions: 2
    }
  })).body.grant;

  const run = await api(e, token, '/api/0s/automation/execute', {
    method: 'POST',
    body: {
      live: true,
      sandbox: true,
      approval_grant_id: grant.id,
      provider_id: 'relay13',
      action: 'relay13.conversation.create',
      app_id: 'relay13-callback-proof',
      workspace_id: 'ws-relay13',
      customer_id: 'cust-relay13',
      client_id: 'client-relay13',
      usage_lane: 'relay13:callback-proof',
      payload: { workspace: 'provider-runtime', subject: 'Callback proof', message: 'Provider runtime callback proof.' }
    }
  });
  assert.equal(run.res.status, 200);
  assert.equal(run.body.receipt.provider_call_made, false);

  const blocked = await worker.fetch(req('/api/0s/automation/provider-callbacks', {
    method: 'POST',
    body: { receipt_id: run.body.receipt.id, status: 'delivered' }
  }), e, ctx());
  assert.equal(blocked.status, 401);

  const callback = await api(e, token, '/api/0s/automation/provider-callbacks', {
    method: 'POST',
    body: {
      receipt_id: run.body.receipt.id,
      provider_id: 'relay13',
      action: 'relay13.conversation.create',
      status: 'delivered',
      provider_call_made: true,
      provider_conversation_id: 'relay13_conversation_test',
      metadata: { source: 'relay13-callback-proof' }
    }
  });
  assert.equal(callback.res.status, 200);
  assert.equal(callback.body.callback.provider_call_made, true);
  assert.equal(callback.body.receipt.provider_call_made, false);
  assert.equal(callback.body.receipt.provider_callback_call_made, true);
  assert.equal(callback.body.receipt.provider_callbacks[0].provider_conversation_id, 'relay13_conversation_test');

  const readback = await api(e, token, `/api/0s/automation/receipts?id=${encodeURIComponent(run.body.receipt.id)}`);
  assert.equal(readback.body.receipt.provider_callbacks.length, 1);
  assert.equal(readback.body.receipt.provider_callback_last.status, 'delivered');
  assert.ok(e.SKYGATEFS27_WORKER.events.some((event) => event.type === '0s.provider_execution' && event.meta?.receipt_id === run.body.receipt.id && event.meta?.provider_call_made === true));
});

test('0S-PROVIDER-02 creates 72-hour-capped owner grants and executes Twilio through sandbox receipts', async () => {
  const e = env();
  const token = await ownerToken(e);
  const grantResponse = await api(e, token, '/api/0s/automation/grants', {
    method: 'POST',
    body: {
      duration_hours: 96,
      providers: ['twilio'],
      actions: ['twilio.sms.send'],
      app_ids: ['provider-runtime-proof'],
      workspace_ids: ['ws-provider-runtime'],
      customer_ids: ['cust-provider-runtime'],
      max_actions: 5,
      max_cost_cents: 100,
      note: 'unit proof grant'
    }
  });
  assert.equal(grantResponse.res.status, 201);
  assert.equal(grantResponse.body.grant.duration_hours, 72);

  const run = await api(e, token, '/api/0s/automation/execute', {
    method: 'POST',
    body: {
      live: true,
      sandbox: true,
      approval_grant_id: grantResponse.body.grant.id,
      provider_id: 'twilio',
      action: 'twilio.sms.send',
      app_id: 'provider-runtime-proof',
      workspace_id: 'ws-provider-runtime',
      customer_id: 'cust-provider-runtime',
      client_id: 'client-provider-runtime',
      usage_lane: 'sms',
      payload: { to: '+15555550123', body: 'Provider runtime smoke.' },
      consent: { sms_opt_in: true }
    }
  });
  assert.equal(run.res.status, 200);
  assert.equal(run.body.receipt.executed, true);
  assert.equal(run.body.receipt.provider_call_made, false);
  assert.equal(run.body.receipt.execution_mode, 'sandbox_receipt');
  assert.equal(run.body.receipt.status, 'executed_sandbox');
  assert.equal(run.body.receipt.fs27_mirror.ok, true);
  assert.equal(run.body.receipt.command_bridge.ok, true);

  const readback = await api(e, token, `/api/0s/automation/receipts?id=${encodeURIComponent(run.body.receipt.id)}`);
  assert.equal(readback.body.receipt.id, run.body.receipt.id);

  const commandBridge = await api(e, token, '/api/0s-command-bridge/events?app=provider-runtime-proof');
  assert.equal(commandBridge.res.status, 200);
  assert.ok(commandBridge.body.events.some((event) => event.ids?.receipt_id === run.body.receipt.id));
});

test('0S-PROVIDER-03 dead-letters blocked provider actions and retries with owner override', async () => {
  const e = env();
  const token = await ownerToken(e);
  const grant = (await api(e, token, '/api/0s/automation/grants', {
    method: 'POST',
    body: {
      providers: ['twilio'],
      actions: ['twilio.sms.send'],
      app_ids: ['provider-runtime-proof'],
      workspace_ids: ['ws-provider-runtime'],
      customer_ids: ['cust-provider-runtime'],
      max_actions: 5
    }
  })).body.grant;

  const blocked = await api(e, token, '/api/0s/automation/execute', {
    method: 'POST',
    body: {
      live: true,
      sandbox: true,
      approval_grant_id: grant.id,
      provider_id: 'twilio',
      action: 'twilio.sms.send',
      app_id: 'provider-runtime-proof',
      workspace_id: 'ws-provider-runtime',
      customer_id: 'cust-provider-runtime',
      payload: { to: '+15555550123', body: 'No consent should block.' },
      consent: { sms_opt_in: false }
    }
  });
  assert.equal(blocked.res.status, 409);
  assert.equal(blocked.body.receipt.status, 'failed');
  assert.equal(blocked.body.receipt.dead_letter.status, 'dead_letter');

  const deadLetters = await api(e, token, '/api/0s/automation/dead-letters');
  assert.ok(deadLetters.body.items.some((item) => item.id === blocked.body.receipt.id));

  const retry = await api(e, token, '/api/0s/automation/retry', {
    method: 'POST',
    body: {
      id: blocked.body.receipt.id,
      live: true,
      sandbox: true,
      overrides: {
        consent: { sms_opt_in: true },
        payload: { to: '+15555550123', body: 'Retry after consent fix.' }
      }
    }
  });
  assert.equal(retry.res.status, 200);
  assert.equal(retry.body.receipt.executed, true);
  assert.equal(retry.body.retry_of, blocked.body.receipt.id);
  assert.equal(retry.body.retry_attempt, 1);
  assert.equal(retry.body.receipt.retry_of, blocked.body.receipt.id);
  assert.equal(retry.body.receipt.retry_attempt, 1);
  const deadLettersAfterRetry = await api(e, token, '/api/0s/automation/dead-letters');
  const retried = deadLettersAfterRetry.body.items.find((item) => item.id === blocked.body.receipt.id);
  assert.equal(retried.retry_count, 1);
  assert.equal(retried.retryHistory[0].receipt_id, retry.body.receipt.id);
});
