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
        sub: 'legal-skyes-owner-test',
        email: 'owner@example.com',
        role: 'admin',
        scope: 'admin.read admin.write gateway.invoke 0s.owner'
      });
    }
  };
}

function env() {
  return {
    SITE_EVENTS_KV: new MemoryKV(),
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

test('Legal Skyes dispute committee is gated, stores accepted cases, and enforces the 67 percent refund cap', async () => {
  const e = env();

  const blocked = await siteWorker.fetch(req('/api/sovereigndocs/dispute-committee/config'), e, ctx());
  assert.equal(blocked.status, 401);

  const config = await call(e, '/api/sovereigndocs/dispute-committee/config', {token:'gate-token'});
  assert.equal(config.policy.version, 'legal-skyes-dispute-committee-2026-05-28');
  assert.equal(config.policy.committee_compensation.hourly_rate_cents, 3100);

  const missing = await call(e, '/api/sovereigndocs/dispute-committee/intakes', {
    method:'POST',
    token:'gate-token',
    body:{customer:{email:'client@example.com'}, transaction:{purchaseAmountCents:100000}}
  }, 403);
  assert.deepEqual(missing.missing.sort(), ['in_house_arbitration','legal_terms','no_outcome_guarantee','payments_refunds','truthful_review_boundary'].sort());

  const intake = await call(e, '/api/sovereigndocs/dispute-committee/intakes', {
    method:'POST',
    token:'gate-token',
    body:{
      customer:{name:'Test Client', email:'client@example.com'},
      transaction:{orderId:'order_legal_1', offerId:'metraiyux-saas', purchaseAmountCents:100000, overheadCents:25000, currency:'usd'},
      issue:'Outcome did not match expected launch timeline.',
      requestedRelief:'partial_refund_review',
      acceptLegalTerms:true,
      acceptInHouseArbitration:true,
      acceptPaymentsRefunds:true,
      acceptNoOutcomeGuarantee:true,
      acceptTruthfulReviewBoundary:true
    }
  }, 201);
  assert.equal(intake.case.status, 'committee_intake_received');
  assert.equal(intake.case.refundCap.maxRefundCents, 50250);

  const caseId = intake.case.id;
  const evidence = await call(e, `/api/sovereigndocs/dispute-committee/cases/${encodeURIComponent(caseId)}/evidence`, {
    method:'POST',
    token:'gate-token',
    body:{title:'Checkout receipt', note:'Receipt and support thread attached.'}
  }, 201);
  assert.equal(evidence.case.status, 'evidence_logged');

  const panel = await call(e, `/api/sovereigndocs/dispute-committee/cases/${encodeURIComponent(caseId)}/assign-panel`, {
    method:'POST',
    token:'gate-token',
    body:{members:[{name:'Legal AE One', email:'legal-ae-one@example.com', credentialStatus:'legal_certification_verified'}]}
  }, 201);
  assert.equal(panel.members[0].hourlyRateCents, 3100);
  assert.equal(panel.members[0].classification, 'independent_contractor_account_executive');
  assert.equal(panel.members[0].legalCertificationRequired, true);
  assert.equal(panel.members[0].credentialStatus, 'legal_certification_verified');

  const meeting = await call(e, `/api/sovereigndocs/dispute-committee/cases/${encodeURIComponent(caseId)}/schedule-review`, {
    method:'POST',
    token:'gate-token',
    body:{scheduledFor:'2026-06-01T18:00:00.000Z'}
  }, 201);
  assert.equal(meeting.case.status, 'committee_review_scheduled');
  assert.equal(meeting.meeting.status, 'scheduled_provider_runtime_receipted');
  assert.equal(meeting.meeting.provider_runtime.provider_id, 'google-calendar');
  assert.equal(meeting.meeting.provider_runtime.action, 'google.calendar.event.create');
  assert.equal(meeting.meeting.provider_runtime.provider_call_made, false);

  const recommendation = await call(e, `/api/sovereigndocs/dispute-committee/cases/${encodeURIComponent(caseId)}/recommendation`, {
    method:'POST',
    token:'gate-token',
    body:{recommendedOutcome:'partial_refund_owner_review', refundAmountCents:50000, summary:'Within cap after documented overhead.'}
  }, 201);
  assert.equal(recommendation.recommendation.status, 'committee_recommendation_recorded');

  const overCap = await call(e, `/api/sovereigndocs/dispute-committee/cases/${encodeURIComponent(caseId)}/refund-proposal`, {
    method:'POST',
    token:'gate-token',
    body:{proposedRefundCents:60000}
  }, 422);
  assert.equal(overCap.error, 'refund_proposal_exceeds_67_percent_cap_after_overhead');

  const refund = await call(e, `/api/sovereigndocs/dispute-committee/cases/${encodeURIComponent(caseId)}/refund-proposal`, {
    method:'POST',
    token:'gate-token',
    body:{proposedRefundCents:50000}
  }, 201);
  assert.equal(refund.proposal.cap.maxRefundCents, 50250);

  const decision = await call(e, `/api/sovereigndocs/dispute-committee/cases/${encodeURIComponent(caseId)}/decision`, {
    method:'POST',
    token:'gate-token',
    body:{finalOutcome:'partial_refund_approved_owner_release_required', authorizedRefundCents:50000}
  }, 201);
  assert.equal(decision.case.status, 'committee_decision_recorded');

  const packet = await call(e, `/api/sovereigndocs/dispute-committee/cases/${encodeURIComponent(caseId)}/paperwork-packet`, {
    method:'POST',
    token:'gate-token',
    body:{title:'Proof paperwork packet'}
  }, 201);
  assert.equal(packet.artifact.artifactType, 'legal_skyes_dispute_committee_paperwork_packet');
  assert.match(packet.artifact.markdown, /Internal Review Boundary/);
  assert.match(packet.artifact.markdown, /verified legal certification or licensure/i);
  assert.match(packet.artifact.markdown, /truthful lawful reviews/);

  const closed = await call(e, `/api/sovereigndocs/dispute-committee/cases/${encodeURIComponent(caseId)}/close`, {
    method:'POST',
    token:'gate-token',
    body:{note:'Proof test closed'}
  });
  assert.equal(closed.case.status, 'committee_case_closed');

  const queues = await call(e, '/api/sovereigndocs/dispute-committee/work-queues', {token:'gate-token'});
  assert.equal(queues.queues.cases.count, 1);
  assert.equal(queues.queues.refund_proposals.count, 1);
  assert.equal(queues.queues.committee_members.count, 1);
});
