import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, webcrypto } from 'node:crypto';
import saasWorker from '../cloudflare-saas-provisioning-worker/src/index.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

class MemoryKV {
  constructor() { this.map = new Map(); }
  async get(key, options) {
    const value = this.map.get(key);
    if (value == null) return null;
    if (options === 'json' || options?.type === 'json') return JSON.parse(value);
    return value;
  }
  async put(key, value) { this.map.set(key, String(value)); }
  async list({ prefix = '', limit = 1000 } = {}) {
    return { keys: [...this.map.keys()].filter((name) => name.startsWith(prefix)).slice(0, limit).map((name) => ({ name })) };
  }
}

function env() {
  const kv = new MemoryKV();
  return {
    SAAS_KV: kv,
    SITE_EVENTS_KV: kv,
    SAAS_INTERNAL_PROXY_SECRET: 'proxy-secret',
    SAAS_PROVIDER_RUNTIME_SANDBOX: '1',
    SAAS_PUBLIC_URL: 'https://saas.example'
  };
}

function req(path, body) {
  return new Request(`https://saas.example${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-0s-shared-gate': 'operator',
      'x-0s-internal-proxy-secret': 'proxy-secret'
    },
    body: JSON.stringify(body)
  });
}

function signedStripeWebhookReq(secret, event) {
  const raw = JSON.stringify(event);
  const ts = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex');
  return new Request('https://saas.example/api/saas/billing/webhook', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': `t=${ts},v1=${signature}`
    },
    body: raw
  });
}

test('SaaS checkout uses shared Stripe provider runtime receipts in sandbox', async () => {
  const e = env();
  const response = await saasWorker.fetch(req('/api/saas/billing/checkout-session', {
    plan_id: 'starter-command',
    customer_id: 'cust-saas-runtime',
    workspace_id: 'ws-saas-runtime',
    customer_email: 'buyer@example.test',
    skyemerit_apply: false
  }), e, { waitUntil() {} });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.match(body.stripe_session_id, /^stripe_sandbox_/);
  assert.match(body.checkout_url, /stripe_sandbox_/);
  assert.equal(body.provider_call_made, false);
  assert.equal(body.provider_runtime_status, 'executed_sandbox');
  assert.ok(body.provider_runtime_receipt_id);

  const stored = await e.SAAS_KV.get(`subscription:${body.subscription_id}`, 'json');
  assert.equal(stored.provider_runtime_receipt_id, body.provider_runtime_receipt_id);
  const receipts = await e.SITE_EVENTS_KV.list({ prefix: '0s-provider-runtime:receipt:' });
  assert.ok(receipts.keys.length >= 1);
});

test('SaaS workspace provisioning uses shared SkyeMail provider runtime receipts in sandbox', async () => {
  const e = {
    ...env(),
    SKYMAIL_PRIMARY_DOMAIN: 'solenterprises.org',
    SKYMAIL_PUBLIC_URL: 'https://skyemail-platform.test',
    SKYMAIL_SERVICE_TOKEN: 'skymail_service_secret_not_returned',
    SAAS_ALLOW_TEST_EMAIL_DELIVERY: 'true'
  };
  const response = await saasWorker.fetch(req('/api/saas/workspaces', {
    customer_id: 'cust-saas-skymail-runtime',
    company_name: 'Valley Runtime Co',
    owner_email: 'owner@solenterprises.org',
    approval_email: 'owner@solenterprises.org',
    plan_id: 'starter-command',
    services: ['skyemail', 'skyevault']
  }), e, { waitUntil() {} });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.skymail.ok, true);
  assert.equal(body.skymail.response.provider_runtime.provider_id, 'skymail');
  assert.equal(body.skymail.response.provider_runtime.action, 'skymail.mailbox.provision');
  assert.equal(body.skymail.response.provider_runtime.status, 'executed_sandbox');
  assert.equal(body.skymail.response.provider_runtime.provider_call_made, false);
  assert.match(body.skymail.mailbox.mailbox_email, /@solenterprises\.org$/);
  assert.equal(JSON.stringify(body).includes('skymail_service_secret_not_returned'), false);

  const stored = await e.SAAS_KV.get(`workspace_mailbox:${body.workspace_id}`, 'json');
  assert.equal(stored.payload.provider_runtime.status, 'executed_sandbox');
  assert.equal(stored.payload.provider_runtime.action, 'skymail.mailbox.provision');
});

test('SaaS SkyeMerit delivery uses shared Resend, SkyeMail, and Relay13 provider runtimes in sandbox', async () => {
  const e = {
    ...env(),
    SAAS_ALLOW_TEST_EMAIL_DELIVERY: 'true',
    RESEND_FROM_EMAIL: 'founder@solenterprises.org',
    SKYMAIL_PUBLIC_URL: 'https://skyemail-platform.test',
    SKYMAIL_SERVICE_TOKEN: 'skymail_service_secret_not_returned'
  };
  const response = await saasWorker.fetch(req('/api/saas/skyemerit/issue', {
    customer_id: 'cust-skyemerit-runtime',
    workspace_id: 'ws-skyemerit-runtime',
    email: 'buyer@example.test'
  }), e, { waitUntil() {} });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.pack.delivery.resend.provider_runtime_status, 'executed_sandbox');
  assert.equal(body.pack.delivery.resend.provider_runtime.action, 'resend.email.send');
  assert.equal(body.pack.delivery.skymail.provider_runtime_status, 'executed_sandbox');
  assert.equal(body.pack.delivery.skymail.provider_runtime.action, 'skymail.system_message.send');
  assert.equal(body.pack.delivery.relay13.provider_runtime_status, 'executed_sandbox');
  assert.equal(body.pack.delivery.relay13.provider_runtime.action, 'relay13.thread.attach');
  assert.equal(body.pack.delivery.skymail.provider_call_made, false);
  assert.equal(JSON.stringify(body).includes('skymail_service_secret_not_returned'), false);
});

test('SaaS billing webhook mirrors Stripe lifecycle into shared provider runtime receipts', async () => {
  const secret = 'whsec_saas_runtime_secret_not_returned';
  const e = {
    ...env(),
    STRIPE_WEBHOOK_SECRET: secret
  };
  await e.SAAS_KV.put('workspace:ws-saas-webhook-runtime', JSON.stringify({
    id: 'ws-saas-webhook-runtime',
    status: 'checkout_requested',
    plan_id: 'starter-command',
    company_name: 'Webhook Runtime Co',
    updated_at: '2026-05-29T00:00:00.000Z'
  }));
  const event = {
    id: 'evt_saas_webhook_runtime_001',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_saas_webhook_runtime_001',
        object: 'checkout.session',
        payment_status: 'paid',
        status: 'complete',
        amount_total: 9900,
        currency: 'usd',
        customer: 'cus_saas_webhook_runtime',
        metadata: {
          workspace_id: 'ws-saas-webhook-runtime',
          customer_id: 'cust-saas-webhook-runtime',
          plan_id: 'starter-command',
          subscription_id: 'sub-saas-webhook-runtime'
        }
      }
    }
  };
  const response = await saasWorker.fetch(signedStripeWebhookReq(secret, event), e, { waitUntil() {} });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.received, true);
  assert.equal(body.provider_runtime.provider_id, 'stripe');
  assert.equal(body.provider_runtime.action, 'stripe.webhook.lifecycle');
  assert.equal(body.provider_runtime.status, 'executed');
  assert.equal(body.provider_runtime.provider_call_made, false);
  assert.equal(JSON.stringify(body).includes(secret), false);

  const workspace = await e.SAAS_KV.get('workspace:ws-saas-webhook-runtime', 'json');
  assert.equal(workspace.status, 'paid_pending_owner_approval');
  const provisioningEvents = [...e.SAAS_KV.map.entries()]
    .filter(([key]) => key.startsWith('provisioning_event:'))
    .map(([, value]) => JSON.parse(value));
  const paymentEvent = provisioningEvents.find((item) => item.event_type === 'billing.checkout_completed.pending_owner_approval');
  assert.equal(paymentEvent.payload.provider_runtime.action, 'stripe.webhook.lifecycle');
  assert.equal(paymentEvent.payload.provider_runtime.status, 'executed');
});
