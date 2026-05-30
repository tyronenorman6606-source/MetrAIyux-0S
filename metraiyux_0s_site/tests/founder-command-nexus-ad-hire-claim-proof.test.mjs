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
        return Response.json({
          active: true,
          role: 'owner',
          scope: 'admin.read admin.write keys.write gateway.invoke 0s.owner routex.write music.write',
          email: 'owner@example.com',
          username: 'owner@example.com',
          sub: 'owner-test',
          customer_id: 'test-owner',
          isAdmin: true
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
    SITE_EVENTS_KV: kvStub()
  };
}

async function jsonFetch(e, c, pathname, init = {}) {
  const response = await siteWorker.fetch(req(pathname, init), e, c);
  return {response, body: await response.json().catch(() => ({}))};
}

test('Founder Command proves Nexus ad hire enrollment and test job claim end to end', async () => {
  const e = env();
  const c = ctx();

  const catalog = await jsonFetch(e, c, '/api/founder-command/actions/catalog', {headers: AUTH_HEADERS});
  assert.equal(catalog.response.status, 200);
  const action = catalog.body.actions.find((row) => row.id === 'nexus.proof.ad-hire-enrollment-claim');
  assert.ok(action, 'Founder action catalog must expose the Nexus hire proof action');
  assert.equal(action.risk, 'high');
  assert.equal(action.idempotency_required, true);

  const plan = await jsonFetch(e, c, '/api/founder-command/actions/plan', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: {
      action_id: 'nexus.proof.ad-hire-enrollment-claim',
      params: {
        candidate_name: 'Jordan Nexus',
        candidate_email: 'jordan.nexus@example.test',
        campaign_id: 'test_nexus_hire_campaign',
        job_title: 'Nexus hire test job',
        notes: 'Local proof of ad hire to workforce claim.'
      }
    }
  });
  assert.equal(plan.response.status, 200);
  assert.equal(plan.body.approval.required, true);
  assert.equal(plan.body.idempotency.required, true);

  const blocked = await jsonFetch(e, c, '/api/founder-command/actions/execute', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: {
      action_id: 'nexus.proof.ad-hire-enrollment-claim',
      idempotency_key: 'local-nexus-hire-proof',
      params: {candidate_email: 'jordan.nexus@example.test'}
    }
  });
  assert.equal(blocked.response.status, 409);
  assert.equal(blocked.body.error, 'owner_confirmation_required');

  const executed = await jsonFetch(e, c, '/api/founder-command/actions/execute', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: {
      action_id: 'nexus.proof.ad-hire-enrollment-claim',
      confirm: true,
      idempotency_key: 'local-nexus-hire-proof',
      params: {
        candidate_name: 'Jordan Nexus',
        candidate_email: 'jordan.nexus@example.test',
        candidate_phone: '+15550100222',
        campaign_id: 'test_nexus_hire_campaign',
        campaign_business: 'Skyes Over London LC Hiring Desk',
        ad_slot: 'discover_chart_rail',
        job_title: 'Nexus hire test job',
        job_description: 'No-payout test job for Founder Command operational proof.',
        notes: 'Local proof of ad hire to workforce claim.'
      }
    }
  });
  await Promise.all(c.pending);

  assert.equal(executed.response.status, 201);
  assert.equal(executed.body.ok, true);
  assert.equal(executed.body.receipt.schema, 'metraiyux.founder-command.action-receipt.v1');
  assert.equal(executed.body.result.proof.status, 'ad_clicked_hired_enrolled_test_job_claimed');
  assert.equal(executed.body.result.ad.campaign_id, 'test_nexus_hire_campaign');
  assert.equal(executed.body.result.hire.candidate_email, 'jordan.nexus@example.test');
  assert.equal(executed.body.result.hire.ae_flow_stored, true);
  assert.equal(executed.body.result.workforce.routex_role, 'ae');
  assert.equal(executed.body.result.workforce.contractor_profile_ready, true);
  assert.equal(executed.body.result.job.system_job, true);
  assert.equal(executed.body.result.job.assignment_status, 'contractor_confirmed');
  assert.equal(executed.body.result.job.assignment_payment_status, 'founder_operational_test_no_external_payout');
  assert.ok([400, 409].includes(executed.body.result.job.blocked_second_claim_status));

  const routexState = await e.SITE_EVENTS_KV.get('skyeroutex:v1:state', {type: 'json'});
  assert.ok(routexState.hiringProofs.some((row) => row.hire?.candidate_email === 'jordan.nexus@example.test'));
  assert.ok(routexState.users.some((row) => row.email === 'jordan.nexus@example.test' && row.role === 'ae' && !row.passwordHash));
  assert.ok(routexState.jobs.some((row) => row.nexus_campaign_id === 'test_nexus_hire_campaign' && row.system_job === true));
  assert.ok(routexState.assignments.some((row) => row.status === 'contractor_confirmed'));
  assert.ok(routexState.payments.some((row) => row.status === 'founder_operational_test_no_external_payout'));

  const bridge = await jsonFetch(e, c, '/api/0s-command-bridge/events', {headers: AUTH_HEADERS});
  assert.equal(bridge.response.status, 200);
  assert.ok(bridge.body.events.some((event) => event.event_type === 'founder_command.nexus_hire_workforce_claimed'));
});
