import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
const siteWorker = (await import('../cloudflare/worker.js')).default;

const OWNER_CODE = 'owner-code';
const AUTH_HEADERS = {
  authorization: `Bearer ${OWNER_CODE}`,
  'x-admin-token': OWNER_CODE,
  'x-free99-admin-code': OWNER_CODE
};
const USER_HEADERS = {
  authorization: 'Bearer user-token'
};

function ctx() {
  const pending = [];
  return {
    pending,
    waitUntil(promise) {
      pending.push(Promise.resolve(promise).catch(() => null));
    }
  };
}

function req(pathname, {method = 'GET', headers = {}, body} = {}) {
  return new Request(`https://metraiyux.example${pathname}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(body ? {'content-type': 'application/json'} : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

function kvStub() {
  const store = new Map();
  return {
    store,
    async put(key, value) {
      store.set(key, value);
    },
    async get(key, options = {}) {
      const value = store.get(key) || null;
      return options.type === 'json' && value ? JSON.parse(value) : value;
    },
    async list({prefix = ''} = {}) {
      return {keys: [...store.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({name}))};
    }
  };
}

function skygateBinding() {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === '/admin/login') {
        return Response.json({
          ok: true,
          token: 'fs27-test-owner-token',
          user: {email: 'owner@example.com', role: 'owner'}
        });
      }
      if (['/auth-introspect', '/auth/introspect', '/.netlify/functions/auth-introspect'].includes(url.pathname)) {
        const body = await request.json().catch(() => ({}));
        if (body.token === 'user-token') {
          return Response.json({
            active: true,
            role: 'user',
            scope: 'jobping.write',
            email: 'user@example.com',
            username: 'user@example.com',
            sub: 'user-test',
            isAdmin: false
          });
        }
        return Response.json({
          active: true,
          role: 'owner',
          scope: 'admin.read admin.write keys.write gateway.invoke 0s.owner jobping.write',
          email: 'owner@example.com',
          username: 'owner@example.com',
          sub: 'owner-test',
          customer_id: 'test-owner',
          isAdmin: true
        });
      }
      if (url.pathname === '/skyepay/checkout') {
        const body = await request.json();
        assert.equal(body.offer_id, 'jobping-runtime');
        return Response.json({
          ok: true,
          id: 'cs_jobping_paid_runtime_test',
          order_id: 'order_jobping_paid_runtime_test',
          url: 'https://skyepay.example/checkout/cs_jobping_paid_runtime_test',
          payment_status: body.dry_run ? 'no_payment_required' : 'paid',
          approval_status: 'owner_proof_mode'
        });
      }
      if (url.pathname === '/skyepay/status') {
        return Response.json({
          ok: true,
          order: {
            id: 'order_jobping_paid_runtime_test',
            offer_id: 'jobping-runtime',
            payment_status: 'no_payment_required',
            approval_status: 'owner_proof_mode',
            provisioning_status: 'active'
          }
        });
      }
      if (url.pathname === '/gateway-chat') {
        assert.equal(request.headers.get('x-skye-platform'), 'jobping');
        assert.equal(request.headers.get('x-skye-usage-lane'), 'jobping-runtime');
        return Response.json({
          ok: true,
          output_text: JSON.stringify({
            match_score: 88,
            fit_reasons: ['Candidate has dispatch and operations experience.', 'Role includes Phoenix operations signals.'],
            gaps_and_risks: ['Verify consent before outreach.'],
            outreach: {subject: 'Phoenix dispatch fit', message: 'This candidate looks ready for owner review.'},
            next_steps: ['Confirm candidate consent.', 'Verify employer details.']
          }),
          usage: {input_tokens: 120, output_tokens: 80}
        });
      }
      return Response.json({ok: false, error: 'unexpected_skygate_path', path: url.pathname}, {status: 404});
    }
  };
}

function env() {
  return {
    FREE99_ADMIN_CODE: OWNER_CODE,
    OWNER_ADMIN_SESSION_SECRET: 'test-owner-session-secret',
    SKYGATEFS27_WORKER: skygateBinding(),
    SITE_EVENTS_KV: kvStub(),
    JOBPING_KAIXU_GATEWAY_KEY: 'kx_live_test_jobping_gateway',
    ZERO_OS_PROVIDER_SANDBOX: '1'
  };
}

async function jsonFetch(e, c, pathname, init = {}) {
  const response = await siteWorker.fetch(req(pathname, init), e, c);
  return {response, body: await response.json().catch(() => ({}))};
}

test('JobPing runs as a shared-gate paid runtime with checkout, entitlement, triage, match, and ledger receipts', async () => {
  const e = env();
  const c = ctx();

  const health = await jsonFetch(e, c, '/api/jobping/health', {headers: AUTH_HEADERS});
  assert.equal(health.response.status, 200);
  assert.equal(health.body.ok, true);
  assert.equal(health.body.runtime_available, true);
  assert.equal(health.body.paid_runtime, true);
  assert.equal(health.body.checkout_create, '/api/jobping/checkout/create');
  assert.equal(health.body.match_route, '/api/jobping/ai/match');

  const profile = {
    candidate: 'Jordan has dispatch, logistics, admin support, and Phoenix route coordination experience.',
    job: 'Operations coordinator for urgent Phoenix dispatch coverage using CRM and route tools.',
    location: 'Phoenix, AZ',
    constraints: 'Immediate start. Confirm consent before outreach.',
    notification_channel: 'email'
  };

  const triage = await jsonFetch(e, c, '/api/jobping/triage', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: profile
  });
  assert.equal(triage.response.status, 201);
  assert.equal(triage.body.ok, true);
  assert.equal(triage.body.runtime_available, true);
  assert.equal(triage.body.triage.generated_by, 'jobping-local-triage');
  assert.ok(triage.body.triage.score >= 72);
  assert.equal(triage.body.receipt.schema, 'metraiyux.jobping.runtime-receipt.v1');
  assert.equal(triage.body.receipt.billable, false);

  const locked = await jsonFetch(e, c, '/api/jobping/ai/match', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: profile
  });
  assert.equal(locked.response.status, 402);
  assert.equal(locked.body.checkout_required, true);
  assert.equal(locked.body.runtime_available, true);
  assert.equal(locked.body.checkout_create, '/api/jobping/checkout/create');

  const userProofCheckout = await jsonFetch(e, c, '/api/jobping/checkout/create', {
    method: 'POST',
    headers: USER_HEADERS,
    body: {
      customer_email: 'user.jobping@example.test',
      proof_mode: true
    }
  });
  assert.equal(userProofCheckout.response.status, 403);
  assert.equal(userProofCheckout.body.error, 'proof_mode_requires_owner_gate');

  const checkout = await jsonFetch(e, c, '/api/jobping/checkout/create', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: {
      customer_email: 'jordan.jobping@example.test',
      customer_name: 'Jordan JobPing',
      company_name: 'Skyes Over London LC',
      proof_mode: true
    }
  });
  assert.equal(checkout.response.status, 201);
  assert.equal(checkout.body.ok, true);
  assert.equal(checkout.body.checkout.id, 'cs_jobping_paid_runtime_test');

  const claim = await jsonFetch(e, c, '/api/jobping/checkout/claim', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: {session_id: 'cs_jobping_paid_runtime_test'}
  });
  assert.equal(claim.response.status, 200);
  assert.equal(claim.body.ok, true);
  assert.equal(claim.body.entitlement.active, true);
  assert.equal(claim.body.entitlement.offer_id, 'jobping-runtime');
  assert.equal(claim.body.entitlement.provider_runtime_status_check.status, 'executed_sandbox');
  assert.equal(claim.body.entitlement.provider_runtime_status_check.action, 'stripe.checkout.retrieve');

  const match = await jsonFetch(e, c, '/api/jobping/ai/match', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: profile
  });
  assert.equal(match.response.status, 200);
  assert.equal(match.body.ok, true);
  assert.equal(match.body.paid_match, true);
  assert.ok(match.body.result.match_score >= 0);
  assert.equal(match.body.provider_path, '0s-provider-runtime-openai-chat');
  assert.equal(match.body.db_metered, true);
  assert.ok(match.body.receipt_id.startsWith('jobping_usage_'));

  await Promise.all(c.pending);

  const ledger = await jsonFetch(e, c, '/api/jobping/ledger', {headers: AUTH_HEADERS});
  assert.equal(ledger.response.status, 200);
  assert.equal(ledger.body.ok, true);
  assert.ok(ledger.body.summary.total >= 4);
  assert.ok(ledger.body.summary.paid_runtime >= 1);
  assert.ok(ledger.body.events.some((event) => event.type === 'jobping.triage_completed'));
  assert.ok(ledger.body.events.some((event) => event.type === 'jobping.paid_match_completed'));

  const keys = [...e.SITE_EVENTS_KV.store.keys()];
  assert.ok(keys.some((key) => key.startsWith('jobping:checkout:cs_jobping_paid_runtime_test')));
  assert.ok(keys.some((key) => key.startsWith('jobping:entitlement:')));
  assert.ok(keys.some((key) => key.startsWith('jobping:usage:')));
});
