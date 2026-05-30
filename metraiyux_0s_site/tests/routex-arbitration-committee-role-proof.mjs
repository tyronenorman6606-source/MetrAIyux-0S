import test from 'node:test';
import assert from 'node:assert/strict';
import siteWorker from '../cloudflare/worker.js';

class MemoryKV {
  constructor() { this.map = new Map(); }
  async put(key, value) { this.map.set(key, String(value)); }
  async get(key, options) {
    const value = this.map.get(key);
    if (value == null) return null;
    return options?.type === 'json' ? JSON.parse(value) : value;
  }
  async list({limit = 1000} = {}) {
    return {keys:[...this.map.keys()].slice(0, limit).map(name => ({name}))};
  }
}

function gateWorker() {
  return {
    async fetch(request) {
      const body = await request.json().catch(() => ({}));
      return Response.json({
        active: body.token === 'gate-token',
        sub: 'routex-owner-test',
        email: 'owner@example.com',
        role: 'admin',
        scope: 'admin.read admin.write gateway.invoke 0s.owner'
      });
    }
  };
}

function env() {
  const kv = new MemoryKV();
  return {
    ROUTEX_KV: kv,
    SITE_EVENTS_KV: kv,
    SKYGATEFS27_WORKER: gateWorker(),
    ASSETS: { async fetch(request) { return new Response(`asset:${new URL(request.url).pathname}`, {status:404}); } }
  };
}

function ctx() {
  return {waitUntil() {}};
}

function req(path, {method = 'GET', body, token} = {}) {
  return new Request(`https://metraiyux.example${path}`, {
    method,
    headers: {
      ...(body ? {'content-type':'application/json'} : {}),
      ...(token ? {authorization:`Bearer ${token}`} : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

async function call(e, path, options = {}, expected = 200) {
  const res = await siteWorker.fetch(req(path, options), e, ctx());
  const data = await res.json().catch(() => ({}));
  assert.equal(res.status, expected, `${path} returned ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

test('RouteX seeds Legal Skyes arbitration committee as a human AE contractor lane', async () => {
  const e = env();

  const blocked = await siteWorker.fetch(req('/api/routex/ae/legal-skyes-arbitration-committee'), e, ctx());
  assert.equal(blocked.status, 401);

  const seeded = await call(e, '/api/routex/ae/legal-skyes-arbitration-committee/seed', {
    method:'POST',
    token:'gate-token',
    body:{slots:4}
  }, 201);

  assert.equal(seeded.seeded.role.id, 'legal_skyes_arbitration_committee');
  assert.equal(seeded.seeded.role.classification, 'independent_contractor_account_executive');
  assert.equal(seeded.seeded.job.pay_type, 'hourly');
  assert.equal(seeded.seeded.job.pay_amount_cents, 3100);
  assert.equal(seeded.seeded.job.minimum_weekly_retainer_hours, 1);
  assert.equal(seeded.seeded.job.on_call_case_hours_rate_cents, 3100);
  assert.equal(seeded.seeded.job.kpi_stipend_cents, 5000);
  assert.equal(seeded.seeded.job.kpi_period_months, 2);
  assert.equal(seeded.seeded.job.legal_certification_required, true);
  assert.equal(seeded.seeded.job.legal_certification_status_required, 'legal_certification_verified_before_case_assignment');
  assert.ok(seeded.seeded.role.requirements.some((item) => /verified legal certification or licensure required/i.test(item)));
  assert.equal(seeded.seeded.job.ai_model_eligible, false);
  assert.equal(seeded.seeded.job.model_ae_claimable, false);
  assert.equal(seeded.seeded.job.real_ae_claimable, true);
  assert.equal(seeded.seeded.payment.amount_cents, 3100);
  assert.equal(seeded.seeded.payment.payment_purpose, 'legal_skyes_weekly_retainer_authorization');

  const role = await call(e, '/api/routex/ae/legal-skyes-arbitration-committee', {token:'gate-token'});
  assert.equal(role.jobs.length, 1);
  assert.equal(role.jobs[0].ae_lane, 'legal_skyes_arbitration_committee');
  assert.equal(role.payments.length, 1);
  assert.equal(role.dispute_committee, '/Free99/apps/sovereigndocs/dispute-committee/');

  const hub = await call(e, '/api/routex/ae/hub', {token:'gate-token'});
  assert.ok(hub.role_lanes.some((item) => item.id === 'music_nexus_ae'));
  assert.ok(hub.role_lanes.some((item) => item.id === 'legal_skyes_arbitration_committee'));
});
