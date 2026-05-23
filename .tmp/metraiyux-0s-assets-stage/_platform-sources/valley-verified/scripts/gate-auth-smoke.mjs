import assert from 'node:assert/strict';
import { prepareGateAuthenticatedEvent, headersWithGateActor, gateAuthServiceForApi } from '../src/server/gate-auth.mjs';
import { actorFromHeaders, handleActionRequest } from '../src/server/router.mjs';
import { firstMonthPostingEligibility, buildFirstMonthBusinessPosting, customerPostingEntitlementForApi } from '../src/server/customer-posting-entitlement.mjs';
import { MemoryActionStore } from '../src/server/storage.mjs';
import { MemoryPlatformStateStore } from '../src/server/state-store.mjs';

const env = {
  SKYGATEFS27_ORIGIN:'https://fs27.test',
  PHX_GATE_AUTH_REQUIRED:'true'
};

const fakeFetch = async (url, init = {}) => {
  assert.equal(url, 'https://fs27.test/auth-introspect');
  const body = JSON.parse(init.body || '{}');
  assert.equal(body.token, 'gate-token');
  return new Response(JSON.stringify({
    active:true,
    sub:'usr_123',
    email:'owner@example.com',
    roles:['owner','customer'],
    customer_id:'cus_123',
    workspace_id:'ws_123',
    plan:'growth'
  }), { status:200, headers:{ 'content-type':'application/json' } });
};

const event = {
  httpMethod:'POST',
  headers:{
    authorization:'Bearer gate-token',
    'x-upstream-user-id':'spoofed-admin',
    'x-upstream-roles':'admin'
  },
  body:'{}',
  queryStringParameters:{}
};

const gated = await prepareGateAuthenticatedEvent(event, env, { fetchImpl:fakeFetch });
assert.equal(gated.ok, true, 'FS27 gate token decorates event');
const actor = actorFromHeaders(gated.event.headers, {});
assert.equal(actor.id, 'usr_123');
assert.equal(actor.email, 'owner@example.com');
assert.equal(actor.roles, 'owner customer');
assert.equal(actor.customer_id, 'cus_123');
assert.equal(actor.workspace_id, 'ws_123');
assert.equal(actor.plan, 'growth');
assert.equal(actor.upstream_source, 'skygatefs27');

const stripped = headersWithGateActor({ 'x-upstream-user-id':'spoof', 'content-type':'application/json' }, actor);
assert.equal(stripped['x-upstream-user-id'], 'usr_123', 'spoofed upstream identity is replaced');
assert.equal(stripped['content-type'], 'application/json', 'safe headers remain');

const missing = await prepareGateAuthenticatedEvent({ httpMethod:'POST', headers:{}, body:'{}' }, env, { fetchImpl:fakeFetch });
assert.equal(missing.ok, false);
assert.equal(missing.response.statusCode, 401);

const eligible = firstMonthPostingEligibility({
  subscription_started_at:'2026-04-01T00:00:00.000Z',
  first_paid_invoice_at:'2026-04-01T00:05:00.000Z',
  now:'2026-05-02T00:00:00.000Z'
});
assert.equal(eligible.eligible, true, 'posting entitlement unlocks after first paid month');

const early = firstMonthPostingEligibility({
  subscription_started_at:'2026-05-01T00:00:00.000Z',
  first_paid_invoice_at:'2026-05-01T00:05:00.000Z',
  now:'2026-05-10T00:00:00.000Z'
});
assert.equal(early.eligible, false, 'posting entitlement stays locked before first month completes');

const action = buildFirstMonthBusinessPosting({
  customer_id:'cus_123',
  workspace_id:'ws_123',
  business_name:'Example Business',
  owner_name:'Owner',
  owner_contact:'owner@example.com',
  city:'Phoenix',
  category:'Home Services',
  subscription_started_at:'2026-04-01T00:00:00.000Z',
  first_paid_invoice_at:'2026-04-01T00:05:00.000Z',
  actor,
  now:'2026-05-02T00:00:00.000Z'
});
assert.equal(action.action_type, 'customer_business_posting');
assert.equal(action.queue, 'customer-business-postings');
assert.equal(action.payload.free_posting_credit, true);

const store = new MemoryActionStore();
const stateStore = new MemoryPlatformStateStore();
const posted = await handleActionRequest({
  method:'POST',
  headers:gated.event.headers,
  body:JSON.stringify({ type:'customer_business_posting', payload:action.payload })
}, { store, stateStore, env:{} });
assert.equal(posted.statusCode, 202, 'customer posting action queues through action endpoint');

const publicContracts = await handleActionRequest({ method:'GET' }, { store, stateStore, env:{} });
assert.equal(publicContracts.statusCode, 200, 'public contracts remain readable');
assert.equal(JSON.parse(publicContracts.body).runtime.upstream_auth_authority, 'SkyeGateFS27');

assert.equal(gateAuthServiceForApi().authority, 'SkyeGateFS27');
assert.equal(customerPostingEntitlementForApi().queue, 'customer-business-postings');

console.log('gate-auth-smoke: 12 checks passed');
