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

function gateWorker() {
  return {
    async fetch(request) {
      const body = await request.json().catch(() => ({}));
      return Response.json({
        active: body.token === 'gate-token',
        sub: 'sovereigndocs-test',
        email: 'sovereigndocs-test@example.invalid',
        role: 'admin',
        scope: 'admin.read admin.write gateway.invoke'
      });
    }
  };
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

async function call(e, path, options = {}) {
  const res = await siteWorker.fetch(req(path, options), e, ctx());
  const data = await res.json().catch(() => ({}));
  assert.equal(res.ok, true, `${path} returned ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

test('SD-01/SD-05 SovereignDocs adapter exposes health with explicit storage mode', async () => {
  const e = env({SKYGATEFS27_WORKER:gateWorker()});
  const health = await call(e, '/api/sovereigndocs/health', {token:'gate-token'});
  assert.equal(health.app_id, 'sovereigndocs');
  assert.equal(health.mounted, true);
  assert.equal(health.storage_mode, 'kv');
});

test('SD-05 SovereignDocs mutations fail closed when storage is not configured', async () => {
  const noStorage = env({SITE_EVENTS_KV:null, SKYGATEFS27_WORKER:gateWorker()});
  const noAuth = await siteWorker.fetch(req('/api/sovereigndocs/cases/start', {
    method:'POST',
    body:{title:'No storage case'}
  }), noStorage, ctx());
  assert.equal(noAuth.status, 401);

  const res = await siteWorker.fetch(req('/api/sovereigndocs/cases/start', {
    method:'POST',
    token:'gate-token',
    body:{title:'No storage case'}
  }), noStorage, ctx());
  assert.equal(res.status, 503);
  const data = await res.json();
  assert.equal(data.error, 'sovereigndocs_storage_not_configured');
  assert.equal(data.storage_mode, 'not_configured');
});

test('LLC-to-0S workflow syncs Founder Command CRM onboarding without a new auth lane', async () => {
  const e = env({SKYGATEFS27_WORKER:gateWorker()});

  const started = await call(e, '/api/sovereigndocs/business-formation/start-to-0s', {
    method:'POST',
    token:'gate-token',
    body:{
      businessName:'Proof CRM Launch LLC',
      ownerName:'Proof Owner',
      ownerEmail:'proof-owner@example.invalid',
      industry:'0S business services',
      city:'Phoenix',
      state:'AZ',
      clientId:'proof-crm-launch',
      registeredAgent:'Proof Registered Agent'
    }
  });
  assert.equal(started.workflow.founderCommandCrm.ok, true);
  assert.equal(started.workflow.founderCommandCrm.accountId, 'founder-client:proof-crm-launch');
  assert.equal(started.workflow.founderCommandCrm.identityLinks >= 4, true);
  assert.equal(started.workflow.founderCommandCrm.operations >= 5, true);
  assert.equal(started.workflow.receipts.some((item) => item.id === 'founder_command_crm' && item.ok), true);

  const clientDashboard = await call(e, `/api/sovereigndocs/business-formation/workflows/${encodeURIComponent(started.workflow.id)}/client-dashboard`, {token:'gate-token'});
  const crmAction = clientDashboard.nextActions.find((item) => item.id === 'crm_onboarding');
  assert.equal(crmAction.status, 'account_synced');
  assert.equal(crmAction.href, started.workflow.dashboards.founderCommand);

  const detail = await call(e, crmAction.href, {token:'gate-token'});
  assert.equal(detail.account.client_account_id, started.workflow.founderCommandCrm.accountId);
  assert.equal(detail.account.auth_boundary, 'shared FS27/SkyGate/Free99 owner gate; no client-local founder/admin password');
  assert.equal(detail.account.lanes.crm_onboarding.status, 'owner_review_queue');
  assert.equal(detail.account.lanes.skynet.status, 'intent_recorded_owner_deploy_required');
  assert.equal(detail.operations.length >= 5, true);
  assert.equal(detail.operations.some((item) => item.lane === 'official_filing_boundary' && item.status === 'waiting_for_external_official_receipt'), true);
  assert.equal(detail.identity_links.some((item) => item.system === 'sovereigndocs' && item.source_table === 'business_formation_workflows'), true);
});

test('SD-04 proves dashboard, case, packet, reminders, partner review, editor handoff, return, and closure summary', async () => {
  const e = env({SKYGATEFS27_WORKER:gateWorker()});

  const gate = {token:'gate-token'};
  const templates = await call(e, '/api/sovereigndocs/templates/search?risk=low&pageSize=2', gate);
  assert.equal(templates.items.length >= 1, true);
  const templateId = templates.items[0].id;

  const started = await call(e, '/api/sovereigndocs/cases/start', {
    method:'POST',
    token:'gate-token',
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

  const cases = await call(e, '/api/sovereigndocs/cases', gate);
  assert.equal(cases.count, 1);

  const packet = await call(e, '/api/sovereigndocs/packets/assemble', {
    method:'POST',
    token:'gate-token',
    body:{title:'Standalone proof packet', templateIds:[templateId], acceptBoundary:true}
  });
  assert.equal(packet.packet.status, 'assembled');

  const reminder = await call(e, '/api/sovereigndocs/reminders', {
    method:'POST',
    token:'gate-token',
    body:{title:'Annual report check', dueDate:'2026-06-01', sourceType:'compliance', jurisdiction:'US-AZ'}
  });
  assert.equal(reminder.reminder.status, 'open');

  const transitioned = await call(e, `/api/sovereigndocs/reminders/${encodeURIComponent(reminder.reminder.id)}/transition`, {
    method:'POST',
    token:'gate-token',
    body:{status:'completed', note:'Proof transition'}
  });
  assert.equal(transitioned.reminder.status, 'completed');

  const reviews = await call(e, '/api/sovereigndocs/legal-review/submissions', gate);
  assert.equal(reviews.items.length, 1);

  const routed = await call(e, `/api/sovereigndocs/legal-review/submissions/${encodeURIComponent(reviews.items[0].id)}/route`, {
    method:'POST',
    token:'gate-token',
    body:{partnerId:'operator-configured-legal-network', routingNote:'Proof route'}
  });
  assert.equal(routed.review.status, 'routed_to_partner');

  const dashboard = await call(e, '/api/sovereigndocs/v18/workspace/dashboard', gate);
  assert.equal(dashboard.counts.cases, 1);
  assert.equal(dashboard.counts.packets, 2);

  const state = await call(e, `/api/sovereigndocs/v18/cases/${encodeURIComponent(started.case.id)}/state`, gate);
  assert.equal(state.case.id, started.case.id);
  assert.equal(state.documents.length, 2);

  const handoff = await call(e, `/api/sovereigndocs/v18/cases/${encodeURIComponent(started.case.id)}/open-in-skye-docx-max`, {
    method:'POST',
    token:'gate-token',
    body:{}
  });
  assert.match(handoff.launchUrl, /sd_handoff=/);

  const handoffMap = await call(e, `/api/sovereigndocs/v18/editor/skye-docx-max/handoff/${encodeURIComponent(handoff.handoff.id)}/map`, gate);
  assert.equal(handoffMap.caseContext.caseId, started.case.id);

  const returned = await call(e, '/api/sovereigndocs/v18/editor/skye-docx-max/return-to-case', {
    method:'POST',
    token:'gate-token',
    body:{handoffId:handoff.handoff.id, title:'Returned closure draft', html:'<h1>Returned</h1>', text:'Returned'}
  });
  assert.equal(returned.case.id, started.case.id);
  assert.ok(returned.returned.id);

  const completed = await call(e, `/api/sovereigndocs/v18/cases/${encodeURIComponent(started.case.id)}`, {
    method:'PATCH',
    token:'gate-token',
    body:{status:'completed', note:'Proof closure complete'}
  });
  assert.equal(completed.case.status, 'completed');

  const closure = await call(e, `/api/sovereigndocs/v18/cases/${encodeURIComponent(started.case.id)}/closure-summary`, gate);
  assert.equal(closure.exportBundle.case.id, started.case.id);
  assert.match(closure.partnerPacket.markdown, /Partner Packet/);

  const queues = await call(e, '/api/sovereigndocs/work-queues', gate);
  assert.equal(queues.queues.packets.count, 2);
});
