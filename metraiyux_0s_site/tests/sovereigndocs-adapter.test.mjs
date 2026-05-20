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

function ctx() {
  return {waitUntil() {}};
}

function env(overrides = {}) {
  return {
    ASSETS: {
      async fetch(request) {
        return new Response(`asset fallthrough:${new URL(request.url).pathname}`, {status:404});
      }
    },
    SITE_EVENTS_KV: new MemoryKV(),
    ...overrides
  };
}

function req(path, {method = 'GET', body} = {}) {
  return new Request(`https://metraiyux.example${path}`, {
    method,
    headers: body ? {'content-type':'application/json'} : {},
    body: body ? JSON.stringify(body) : undefined
  });
}

async function call(e, path, options = {}) {
  const res = await siteWorker.fetch(req(path, options), e, ctx());
  const data = await res.json().catch(() => ({}));
  assert.equal(res.ok, true, `${path} returned ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

test('SD-01/SD-05 SovereignDocs adapter exposes health with explicit storage mode', async () => {
  const e = env();
  const health = await call(e, '/api/sovereigndocs/health');
  assert.equal(health.app_id, 'sovereigndocs');
  assert.equal(health.mounted, true);
  assert.equal(health.storage_mode, 'kv');
});

test('SD-05 SovereignDocs mutations fail closed when storage is not configured', async () => {
  const noStorage = env({SITE_EVENTS_KV:null});
  const res = await siteWorker.fetch(req('/api/sovereigndocs/cases/start', {
    method:'POST',
    body:{title:'No storage case'}
  }), noStorage, ctx());
  assert.equal(res.status, 503);
  const data = await res.json();
  assert.equal(data.error, 'sovereigndocs_storage_not_configured');
  assert.equal(data.storage_mode, 'not_configured');
});

test('SD-04 proves dashboard, case, packet, reminders, partner review, editor handoff, return, and closure summary', async () => {
  const e = env();

  const templates = await call(e, '/api/sovereigndocs/templates/search?risk=low&pageSize=2');
  assert.equal(templates.items.length >= 1, true);
  const templateId = templates.items[0].id;

  const started = await call(e, '/api/sovereigndocs/cases/start', {
    method:'POST',
    body:{
      title:'SovereignDocs adapter proof case',
      caseType:'document_packet_to_skye_docx_max',
      templateIds:[templateId, 'sd_tpl_contractor_agreement'],
      createPacket:true,
      submitForPartnerReview:true,
      acceptBoundary:true
    }
  });
  assert.equal(started.case.status, 'case_opened');
  assert.equal(started.documents.length, 2);
  assert.ok(started.packet.id);
  assert.ok(started.review.id);

  const cases = await call(e, '/api/sovereigndocs/cases');
  assert.equal(cases.count, 1);

  const packet = await call(e, '/api/sovereigndocs/packets/assemble', {
    method:'POST',
    body:{title:'Standalone proof packet', templateIds:[templateId], acceptBoundary:true}
  });
  assert.equal(packet.packet.status, 'assembled');

  const reminder = await call(e, '/api/sovereigndocs/reminders', {
    method:'POST',
    body:{title:'Annual report check', dueDate:'2026-06-01', sourceType:'compliance', jurisdiction:'US-AZ'}
  });
  assert.equal(reminder.reminder.status, 'open');

  const transitioned = await call(e, `/api/sovereigndocs/reminders/${encodeURIComponent(reminder.reminder.id)}/transition`, {
    method:'POST',
    body:{status:'completed', note:'Proof transition'}
  });
  assert.equal(transitioned.reminder.status, 'completed');

  const reviews = await call(e, '/api/sovereigndocs/legal-review/submissions');
  assert.equal(reviews.items.length, 1);

  const routed = await call(e, `/api/sovereigndocs/legal-review/submissions/${encodeURIComponent(reviews.items[0].id)}/route`, {
    method:'POST',
    body:{partnerId:'operator-configured-legal-network', routingNote:'Proof route'}
  });
  assert.equal(routed.review.status, 'partner_review_routed');

  const dashboard = await call(e, '/api/sovereigndocs/v18/workspace/dashboard');
  assert.equal(dashboard.counts.cases, 1);
  assert.equal(dashboard.counts.packets, 2);

  const state = await call(e, `/api/sovereigndocs/v18/cases/${encodeURIComponent(started.case.id)}/state`);
  assert.equal(state.case.id, started.case.id);
  assert.equal(state.documents.length, 2);

  const handoff = await call(e, `/api/sovereigndocs/v18/cases/${encodeURIComponent(started.case.id)}/open-in-skye-docx-max`, {
    method:'POST',
    body:{}
  });
  assert.match(handoff.launchUrl, /sd_handoff=/);

  const handoffMap = await call(e, `/api/sovereigndocs/v18/editor/skye-docx-max/handoff/${encodeURIComponent(handoff.handoff.id)}/map`);
  assert.equal(handoffMap.caseContext.caseId, started.case.id);

  const returned = await call(e, '/api/sovereigndocs/v18/editor/skye-docx-max/return-to-case', {
    method:'POST',
    body:{handoffId:handoff.handoff.id, title:'Returned closure draft', html:'<h1>Returned</h1>', text:'Returned'}
  });
  assert.equal(returned.case.id, started.case.id);
  assert.ok(returned.returned.id);

  const completed = await call(e, `/api/sovereigndocs/v18/cases/${encodeURIComponent(started.case.id)}`, {
    method:'PATCH',
    body:{status:'completed', note:'Proof closure complete'}
  });
  assert.equal(completed.case.status, 'completed');

  const closure = await call(e, `/api/sovereigndocs/v18/cases/${encodeURIComponent(started.case.id)}/closure-summary`);
  assert.equal(closure.exportBundle.case.id, started.case.id);
  assert.match(closure.partnerPacket.markdown, /Partner Packet/);

  const queues = await call(e, '/api/sovereigndocs/work-queues');
  assert.equal(queues.queues.packets.count, 2);
});
