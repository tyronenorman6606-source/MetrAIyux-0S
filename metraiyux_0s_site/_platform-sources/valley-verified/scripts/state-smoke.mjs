import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createActionEnvelope } from '../src/server/contracts.mjs';
import { FilePlatformStateStore, MemoryPlatformStateStore, summarizeState } from '../src/server/state-store.mjs';
import { platformD1Schema, PLATFORM_TABLES, adapterReadinessChecklist } from '../src/server/db-adapters.mjs';

let pass = 0, fail = 0;
function ok(condition, label){ if(condition){ console.log(`✅ ${label}`); pass++; } else { console.error(`☐ ${label}`); fail++; } }

const actor = { id:'admin_1', email:'admin@example.com', roles:'admin', allowLocal:true };
const ownerClaim = createActionEnvelope({ type:'owner_claim', actor, payload:{ business_id:'test-listing-1', owner_name:'Owner One', owner_contact:'owner@example.com', claim_type:'ownership', proof_summary:'Business license and domain proof.' } });
const verify = createActionEnvelope({ type:'verification_decision', actor, payload:{ business_id:'test-listing-1', decision:'approved', evidence_summary:'Reviewed license and domain.', reviewer:'admin@example.com' } });
const lead = createActionEnvelope({ type:'lead_request', actor:{ ...actor, roles:'buyer' }, payload:{ buyer_name:'Buyer', buyer_contact:'buyer@example.com', city:'Phoenix', category:'Home Services', details:'Need quote', business_ids:['test-listing-1'] } });
const patch = createActionEnvelope({ type:'listing_admin_patch', actor, payload:{ business_id:'test-listing-1', patch:{ phone:'602-555-0100' }, reason:'Owner-submitted correction' } });
const suppress = createActionEnvelope({ type:'suppression_apply', actor, payload:{ business_id:'bad-listing-2', reason:'duplicate', evidence:'Same owner/address as canonical record.' } });
const ae = createActionEnvelope({ type:'ae_stage_update', actor, payload:{ business_id:'test-listing-1', stage:'pricing_sent', next_action:'Follow up tomorrow', note:'Owner interested in exposure package.' } });

const mem = new MemoryPlatformStateStore();
for(const envelope of [ownerClaim, verify, lead, patch, suppress, ae]) await mem.applyAction(envelope, { reviewer:'admin@example.com' });
const state = await mem.read();
const summary = summarizeState(state);
ok(summary.counts.claims === 1, 'state projection records claim lifecycle');
ok(state.claims['test-listing-1'].verification_status === 'approved', 'verification decision updates claim state');
ok(summary.counts.leads === 1, 'state projection records buyer lead');
ok(summary.counts.listing_patch_businesses === 1, 'state projection records listing patches');
ok(summary.counts.suppression_drafts === 1, 'state projection records suppression drafts');
ok(summary.counts.ae_accounts === 1, 'state projection records AE stage');
ok(summary.counts.events === 6, 'state projection appends immutable events');

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'phx-state-'));
const fileStore = new FilePlatformStateStore(tmp);
await fileStore.applyAction(ownerClaim, { reviewer:'admin@example.com' });
const persisted = JSON.parse(await fs.readFile(path.join(tmp, 'platform-state.json'), 'utf8'));
ok(persisted.claims['test-listing-1'].claim_status === 'submitted_for_review', 'file state store persists JSON snapshot');
const eventLog = await fs.readFile(path.join(tmp, 'events.jsonl'), 'utf8');
ok(eventLog.trim().split('\n').length === 1, 'file state store writes JSONL event log');

const schema = platformD1Schema();
ok(schema.includes('CREATE TABLE IF NOT EXISTS phx_actions'), 'D1 schema includes action table');
ok(schema.includes('phx_listing_state'), 'D1 schema includes listing state table');
ok(PLATFORM_TABLES.length >= 6, 'database contract exposes runtime tables');
ok(adapterReadinessChecklist().length >= 6, 'adapter checklist exposes integration requirements');

if(fail){ console.error(`\n${fail} state check(s) failed, ${pass} passed.`); process.exit(1); }
console.log(`\n${pass} state checks passed.`);
