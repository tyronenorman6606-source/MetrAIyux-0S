import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { handleActionRequest } from '../src/server/router.mjs';
import { FileActionStore, MemoryActionStore } from '../src/server/storage.mjs';
import { MemoryPlatformStateStore } from '../src/server/state-store.mjs';
import { listContracts, validateActionPayload } from '../src/server/contracts.mjs';

let pass = 0, fail = 0;
function ok(condition, label){ if(condition){ console.log(`✅ ${label}`); pass++; } else { console.error(`☐ ${label}`); fail++; } }
function body(res){ try{ return JSON.parse(res.body); }catch{ return {}; } }

ok(listContracts().length >= 14, 'action contracts expose platform mutation types');
ok(validateActionPayload('lead_request', { buyer_name:'A', buyer_contact:'a@example.com', city:'Phoenix', category:'Home Services', details:'Need service' }, { roles:'buyer' }).ok, 'lead request payload validates');
ok(!validateActionPayload('suppression_request', { business_id:'x', reason:'', evidence:'' }, { roles:'admin' }).ok, 'bad suppression request is rejected');

const mockIndex = { assert:async()=>{} };
const missingAuth = await handleActionRequest({ method:'POST', headers:{}, body:JSON.stringify({ type:'ae_note', payload:{ business_id:'abc', note:'called', next_action:'follow up' } }) }, { store:new MemoryActionStore(), businessIndex:mockIndex, env:{} });
ok(missingAuth.statusCode === 401, 'mutation endpoint rejects missing upstream auth');

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'phx-actions-'));
const store = new FileActionStore(tmp);
const headers = { 'x-upstream-user-id':'u_1', 'x-upstream-user-email':'ae@example.com', 'x-upstream-roles':'ae,admin' };
const request = { method:'POST', headers, body:JSON.stringify({ type:'ae_note', payload:{ business_id:'abc-test', note:'Owner asked for pricing', next_action:'send verified profile offer', due_date:'2026-05-15' } }) };
const first = await handleActionRequest(request, { store, businessIndex:mockIndex, env:{} });
const firstBody = body(first);
ok(first.statusCode === 202 && firstBody.ok, 'authenticated action is queued');
ok(firstBody.action?.status === 'queued_for_review', 'queued action requires review');
const second = await handleActionRequest(request, { store, businessIndex:mockIndex, env:{} });
ok(second.statusCode === 200 && body(second).duplicate === true, 'duplicate action is idempotent');
const files = await fs.readdir(path.join(tmp, 'ae-notes'));
ok(files.length === 1, 'file action store persists one idempotent queue record');

const getContracts = await handleActionRequest({ method:'GET' }, { store, env:{} });
ok(getContracts.statusCode === 200 && body(getContracts).contracts.length >= 14, 'GET returns contracts');
const stateStore = new MemoryPlatformStateStore();
const applyRequest = { method:'POST', headers, body:JSON.stringify({ apply:true, type:'claim_status_update', payload:{ business_id:'abc-test', status:'owner_verified', reviewer:'admin@example.com', evidence_summary:'Proof reviewed' } }) };
const applied = await handleActionRequest(applyRequest, { store:new MemoryActionStore(), stateStore, businessIndex:mockIndex, env:{} });
ok(applied.statusCode === 202 && body(applied).projected?.counts?.claims === 1, 'admin action can project approved claim state');
const stateSummary = await handleActionRequest({ method:'GET', query:{ state:'summary' } }, { stateStore, env:{} });
ok(body(stateSummary).state?.counts?.claims === 1, 'GET state summary exposes projected runtime state');

if(fail){ console.error(`\n${fail} action check(s) failed, ${pass} passed.`); process.exit(1); }
console.log(`\n${pass} action checks passed.`);
