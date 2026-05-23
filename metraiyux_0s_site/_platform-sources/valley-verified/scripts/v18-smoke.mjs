import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { JsonPlatformAdapter, D1PlatformAdapter, AdapterActionStore } from '../src/server/adapter-runtime.mjs';
import { createActionEnvelope } from '../src/server/contracts.mjs';
import { processWebhookOutbox, verifyWebhookJob } from '../src/server/notification-service.mjs';
import { MemoryWebhookOutbox, createWebhookJob } from '../src/server/webhooks.mjs';
import { buildExposureOrder } from '../src/server/exposure-service.mjs';
import { handleAdminRequest } from '../src/server/admin-api.mjs';
import { MemoryActionStore } from '../src/server/storage.mjs';
import { MemoryPlatformStateStore } from '../src/server/state-store.mjs';
import { MemoryEventLedger } from '../src/server/event-store.mjs';
import { MemoryWebhookOutbox as MemoryOutbox } from '../src/server/webhooks.mjs';

let pass = 0;
let fail = 0;
function ok(condition, label){ if(condition){ console.log(`✅ ${label}`); pass++; } else { console.error(`☐ ${label}`); fail++; } }
async function exists(file){ try{ await fs.access(file); return true; }catch{ return false; } }

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'phx-v18-'));
const adapter = new JsonPlatformAdapter(path.join(tmp, 'runtime.json'));
const actor = { id:'admin-1', email:'admin@example.com', roles:'admin ae owner buyer', allowLocal:true };
const envelope = createActionEnvelope({ type:'owner_claim', actor, payload:{ business_id:'demo-business', owner_name:'Owner', owner_contact:'owner@example.com', claim_type:'owner', proof_summary:'local proof' }, source:'v18-smoke' });
const firstPut = await adapter.putAction(envelope);
const secondPut = await adapter.putAction(envelope);
ok(firstPut.stored === true, 'JsonPlatformAdapter stores first action');
ok(secondPut.duplicate === true, 'JsonPlatformAdapter enforces action idempotency');
ok((await adapter.getAction(envelope.action_id)).action_id === envelope.action_id, 'JsonPlatformAdapter reads stored action by id');
ok((await adapter.listActions()).length === 1, 'JsonPlatformAdapter lists stored actions');
await adapter.putState({ version:'test', events:[{ ok:true }] });
ok((await adapter.getState()).version === 'test', 'JsonPlatformAdapter persists runtime state');
await adapter.appendEvent({ event_type:'adapter.test', action_id:envelope.action_id });
ok((await adapter.listEvents({ action_id:envelope.action_id })).length === 1, 'JsonPlatformAdapter appends and filters events');
const actionStore = new AdapterActionStore(adapter);
ok((await actionStore.findById(envelope.action_id)).action_id === envelope.action_id, 'AdapterActionStore bridges adapter to mutation stores');

const calls = [];
const fakeD1 = {
  prepare(sql){
    const ctx = { sql, args:[], bind(...args){ this.args = args; return this; }, async first(){ calls.push(['first', this.sql, this.args]); return null; }, async all(){ calls.push(['all', this.sql, this.args]); return { results:[] }; }, async run(){ calls.push(['run', this.sql, this.args]); return { success:true }; } };
    return ctx;
  }
};
const d1 = new D1PlatformAdapter(fakeD1);
await d1.putAction(envelope);
ok(calls.some(call => call[0] === 'run' && call[1].includes('INSERT INTO phx_actions')), 'D1PlatformAdapter writes phx_actions SQL');

const outbox = new MemoryWebhookOutbox();
const job = createWebhookJob({ event_type:'action.queued', action:envelope, payload:{ queue:envelope.queue } });
await outbox.enqueue(job);
ok(verifyWebhookJob(job), 'Webhook job signature verifies');
const processed = await processWebhookOutbox(outbox, { dryRun:true, receiptFile:path.join(tmp, 'receipts.jsonl') });
ok(processed.processed === 1 && processed.receipts[0].status === 'dry_run', 'Webhook outbox dry-run processor records receipt');
ok(await exists(path.join(tmp, 'receipts.jsonl')), 'Webhook receipt file is written');

const exposure = buildExposureOrder({ business_id:'demo-business', product:'verified_profile_upgrade', tier:'starter', buyer_contact:'owner@example.com', actor });
ok(exposure.order.status === 'pending_payment_provider', 'Exposure order does not fake completed billing');
ok(exposure.order.action.action_type === 'sponsor_intent', 'Exposure order creates sponsor_intent action envelope');

const memoryStore = new MemoryActionStore();
const stateStore = new MemoryPlatformStateStore();
const eventLedger = new MemoryEventLedger();
const webhookOutbox = new MemoryOutbox();
const fakeBusinessIndex = { assert:async () => true };
const noAuth = await handleAdminRequest({ method:'GET', headers:{}, query:{} }, { store:memoryStore, stateStore, eventLedger, webhookOutbox, businessIndex:fakeBusinessIndex, env:{} });
ok(noAuth.statusCode === 401, 'Admin API rejects missing upstream identity');
const catalog = await handleAdminRequest({ method:'GET', headers:{ 'x-upstream-user-id':'owner-1', 'x-upstream-roles':'owner' }, query:{ exposure_catalog:'1' } }, { store:memoryStore, stateStore, eventLedger, webhookOutbox, businessIndex:fakeBusinessIndex, env:{} });
ok(catalog.statusCode === 200 && JSON.parse(catalog.body).catalog.products.length >= 4, 'Admin API exposes exposure catalog to upstream identity');
const createOrder = await handleAdminRequest({ method:'POST', headers:{ 'x-upstream-user-id':'owner-1', 'x-upstream-user-email':'owner@example.com', 'x-upstream-roles':'owner' }, body:JSON.stringify({ operation:'create_exposure_order', payload:{ business_id:'demo-business', product:'verified_profile_upgrade', tier:'starter', buyer_contact:'owner@example.com' } }) }, { store:memoryStore, stateStore, eventLedger, webhookOutbox, businessIndex:fakeBusinessIndex, env:{} });
ok(createOrder.statusCode === 202, 'Admin API queues exposure order intent');
const adminSummary = await handleAdminRequest({ method:'GET', headers:{ 'x-upstream-user-id':'admin-1', 'x-upstream-roles':'admin' }, query:{} }, { store:memoryStore, stateStore, eventLedger, webhookOutbox, businessIndex:fakeBusinessIndex, env:{} });
ok(adminSummary.statusCode === 200 && JSON.parse(adminSummary.body).operations.includes('approve_action'), 'Admin API returns protected admin operations for admin role');

if(fail){ console.error(`☐ v18 smoke failed: ${fail} failed / ${pass} passed`); process.exit(1); }
console.log(`✅ v18 smoke passed: ${pass} checks passed`);
