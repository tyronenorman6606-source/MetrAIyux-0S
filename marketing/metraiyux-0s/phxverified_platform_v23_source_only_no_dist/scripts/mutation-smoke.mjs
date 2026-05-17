import { MutationService } from '../src/server/mutation-service.mjs';
import { MemoryActionStore } from '../src/server/storage.mjs';
import { MemoryPlatformStateStore } from '../src/server/state-store.mjs';
import { MemoryEventLedger, replayQueuedActionsToState } from '../src/server/event-store.mjs';
import { MemoryWebhookOutbox, signWebhookBody, createWebhookJob } from '../src/server/webhooks.mjs';
import { evaluateActionPolicy, policyMatrix } from '../src/server/policy.mjs';
import { runtimeStateToAdminChangeSet, changeSetCsv, suppressionFileFromChangeSet } from '../src/server/exporters.mjs';

let pass = 0, fail = 0;
function ok(condition, label){ if(condition){ console.log(`✅ ${label}`); pass++; } else { console.error(`☐ ${label}`); fail++; } }

const mockIndex = { assert:async()=>{} };
const store = new MemoryActionStore();
const stateStore = new MemoryPlatformStateStore();
const eventLedger = new MemoryEventLedger();
const webhookOutbox = new MemoryWebhookOutbox();
const service = new MutationService({ store, stateStore, eventLedger, webhookOutbox, businessIndex:mockIndex });
const admin = { id:'admin_1', email:'admin@example.com', roles:'admin', allowLocal:false };
const ae = { id:'ae_1', email:'ae@example.com', roles:'ae', allowLocal:false };
const owner = { id:'owner_1', email:'owner@example.com', roles:'owner', allowLocal:false };
const buyer = { id:'buyer_1', email:'buyer@example.com', roles:'buyer', allowLocal:false };

ok(policyMatrix().length >= 14, 'policy matrix covers action contracts');
ok(evaluateActionPolicy({ type:'owner_claim', actor:owner, payload:{ business_id:'abc-test', owner_name:'Owner', owner_contact:'owner@example.com', claim_type:'ownership', proof_summary:'License proof' } }).ok, 'owner claim passes policy for owner role');
ok(!evaluateActionPolicy({ type:'suppression_apply', actor:ae, payload:{ business_id:'abc-test', reason:'duplicate', evidence:'same address' } }).ok, 'AE cannot apply suppression policy');
ok(!evaluateActionPolicy({ type:'listing_admin_patch', actor:admin, payload:{ business_id:'abc-test', patch:{ id:'evil' }, reason:'bad patch' } }).ok, 'protected patch fields are rejected');

const lead = await service.submit({ type:'lead_request', actor:buyer, source:'public-form', payload:{ buyer_name:'Buyer', buyer_contact:'buyer@example.com', city:'Phoenix', category:'Legal Services', details:'Need quotes', business_ids:['abc-test'] } });
ok(lead.stored && lead.envelope.status === 'queued_for_review', 'mutation service queues buyer lead');
ok((await service.queueSummary()).total === 1, 'queue summary counts queued action');
ok((await eventLedger.list({ event_type:'action.queued' })).length === 1, 'event ledger records queued action');
ok((await webhookOutbox.list()).length === 1, 'webhook outbox receives queued-action job');

const claim = await service.submit({ type:'owner_claim', actor:owner, source:'owner-form', payload:{ business_id:'abc-test', owner_name:'Owner', owner_contact:'owner@example.com', claim_type:'ownership', proof_summary:'Domain and license proof.' } });
ok(claim.policy.risk_level === 'low' || claim.policy.risk_level === 'medium', 'queued claim includes policy risk label');
const approved = await service.approve({ action_id:claim.envelope.action_id, reviewer:admin, reason:'proof packet reviewed' });
ok(approved.state.counts.claims === 1, 'approval projects claim into runtime state');
ok((await eventLedger.list({ event_type:'action.approved' })).length === 1, 'event ledger records approval');

const suppress = await service.submit({ type:'suppression_apply', actor:admin, source:'admin-console', payload:{ business_id:'dupe-test', reason:'duplicate', evidence:'same owner and address' } });
await service.approve({ action_id:suppress.envelope.action_id, reviewer:admin, reason:'duplicate confirmed' });
const state = await stateStore.read();
const changeSet = runtimeStateToAdminChangeSet(state);
ok(changeSet.suppression_patch.ids.includes('dupe-test'), 'admin change-set exports suppression ids');
ok(changeSet.claim_updates.length === 1, 'admin change-set exports claim updates');
ok(changeSetCsv(changeSet).includes('suppression'), 'admin change-set CSV renders suppression lane');
ok(suppressionFileFromChangeSet(changeSet).ids.includes('dupe-test'), 'suppression file generator preserves suppression id');

const replayStore = new MemoryActionStore();
await replayStore.put(lead.envelope);
await replayStore.put(claim.envelope);
const replayState = new MemoryPlatformStateStore();
const replayLedger = new MemoryEventLedger();
const replayed = await replayQueuedActionsToState({ store:replayStore, stateStore:replayState, eventLedger:replayLedger, reviewer:'replay@example.com' });
ok(replayed.applied.length === 2, 'event replay applies queued actions');
ok((await replayState.summary()).counts.leads === 1, 'event replay reconstructs lead state');
ok((await replayLedger.list({ event_type:'action.replayed' })).length === 2, 'event replay writes replay events');

const body = { event_type:'action.test', action_id:'x' };
const sig = signWebhookBody(body, 'secret');
ok(sig === signWebhookBody(JSON.stringify(body), 'secret'), 'webhook signatures are stable for object/string body');
const job = createWebhookJob({ event_type:'action.test', payload:body, secret:'secret' });
ok(job.headers['x-phx-signature'] && job.status === 'pending', 'webhook job includes HMAC signature and pending status');

const rejected = await service.reject({ action_id:lead.envelope.action_id, reviewer:admin, reason:'test rejection path' });
ok(rejected.state.counts.review_decisions >= 1, 'rejection records review decision state');

if(fail){ console.error(`\n${fail} mutation service check(s) failed, ${pass} passed.`); process.exit(1); }
console.log(`\n${pass} mutation service checks passed.`);
