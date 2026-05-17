import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { adapterRoundTrip, schemaBundle } from '../src/server/persistence-health.mjs';
import { JsonPlatformAdapter, D1PlatformAdapter, NeonPlatformAdapter } from '../src/server/adapter-runtime.mjs';
import { buildRuntimeContext, runtimeContextSummary } from '../src/server/runtime-context.mjs';
import { handler as claimHandler } from '../netlify/functions/phx-claim.mjs';
import { handler as adminHandler } from '../netlify/functions/phx-admin.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
let pass = 0, fail = 0;
function ok(condition, label){ if(condition){ console.log(`✅ ${label}`); pass++; } else { console.error(`☐ ${label}`); fail++; } }
async function read(rel){ return fs.readFile(path.join(DIST, rel), 'utf8'); }
async function json(rel){ return JSON.parse(await read(rel)); }
async function exists(rel){ try{ await fs.access(path.join(DIST, rel)); return true; }catch{ return false; } }
async function size(rel=''){ const target = path.join(DIST, rel); const st = await fs.stat(target); if(st.isFile()) return st.size; let total=0; for(const entry of await fs.readdir(target)) total += await size(path.join(rel, entry)); return total; }

class FakeD1Statement {
  constructor(db, sql){ this.db = db; this.sql = sql; this.params = []; }
  bind(...params){ this.params = params; return this; }
  async run(){
    const s = this.sql;
    const p = this.params;
    if(s.includes('INSERT INTO phx_actions')) this.db.actions.set(p[0], { action_id:p[0], queue:p[2], status:p[3], payload_json:p[6], created_at:p[7] });
    if(s.includes('INSERT INTO phx_listing_state')) this.db.state.set(p[0], { business_id:p[0], state_json:p[5] });
    if(s.includes('INSERT INTO phx_action_events')) this.db.events.push({ event_id:p[0], action_id:p[1], event_type:p[2], event_json:p[5], created_at:p[6] });
    return { success:true };
  }
  async first(){
    const s = this.sql;
    const p = this.params;
    if(s.includes('COUNT(*)') && s.includes('phx_actions')) return { count:this.db.actions.size };
    if(s.includes('COUNT(*)') && s.includes('phx_action_events')) return { count:this.db.events.length };
    if(s.includes('FROM phx_actions')) return this.db.actions.get(p[0]) || null;
    if(s.includes('FROM phx_listing_state')) return this.db.state.get(p[0]) || null;
    return null;
  }
  async all(){
    const s = this.sql;
    if(s.includes('FROM phx_actions')) return { results:Array.from(this.db.actions.values()) };
    if(s.includes('FROM phx_action_events')) return { results:this.db.events };
    return { results:[] };
  }
}
class FakeD1 { constructor(){ this.actions = new Map(); this.events = []; this.state = new Map(); } prepare(sql){ return new FakeD1Statement(this, sql); } }

function createFakeNeon(){
  const db = { actions:new Map(), events:[], state:new Map() };
  const query = async (sql, params = []) => {
    if(sql.includes('INSERT INTO phx_actions')){ db.actions.set(params[0], { payload_json:params[6] }); return { rows:[] }; }
    if(sql.includes('SELECT payload_json FROM phx_actions')) return { rows:Array.from(db.actions.values()) };
    if(sql.includes('INSERT INTO phx_listing_state')){ db.state.set(params[0], { state_json:params[5] }); return { rows:[] }; }
    if(sql.includes('SELECT state_json FROM phx_listing_state')) return { rows:[db.state.get(params[0])].filter(Boolean) };
    if(sql.includes('INSERT INTO phx_action_events')){ db.events.push({ event_json:params[5], action_id:params[1], event_type:params[2] }); return { rows:[] }; }
    if(sql.includes('SELECT event_json FROM phx_action_events')) return { rows:db.events };
    if(sql.includes('COUNT(*)::int') && sql.includes('phx_actions')) return { rows:[{ count:db.actions.size }] };
    if(sql.includes('COUNT(*)::int') && sql.includes('phx_action_events')) return { rows:[{ count:db.events.length }] };
    return { rows:[] };
  };
  query.db = db;
  return query;
}

const data = await json('data/businesses.json');
const seed = await json('seed-report.json');
const readiness = await json('data/v22-code-readiness.json');
const runtime = await json('data/runtime-wiring.json');
const artifact = await json('data/artifact-manifest.json');
const deploy = await json('data/deploy-size-report.json');
const routeManifest = await json('data/route-manifest.json');
const apiBusinesses = await json('api/businesses.json');
const apiSearch = await json('api/search-index.json');
const lite = await json('data/businesses-lite.json');

ok(['22.0.0','23.0.0'].includes(seed.version), 'seed report upgraded to v22');
ok(readiness.completed.includes('runtime_context_for_all_functions'), 'v22 readiness records runtime context wiring');
ok(runtime.functions.includes('phx-claim'), 'runtime wiring covers phx-claim');
ok(artifact.api_policy.includes('manifests'), 'artifact manifest documents manifest API policy');
ok(routeManifest.v22?.runtime_context === true, 'route manifest records v22 runtime context');
ok(apiBusinesses.mode === 'manifest-only' && apiBusinesses.count === data.businesses.length, 'API business mirror is manifest-only with correct count');
ok(apiSearch.mode === 'manifest-only', 'API search mirror is manifest-only');
ok(lite.businesses.length === data.businesses.length, 'lite business dataset covers every business');
ok((await size('api/businesses.json')) < 1024, 'API business manifest is below 1KB');
ok((await size('api/search-index.json')) < 1024, 'API search manifest is below 1KB');
ok(deploy.v22?.reduced_bytes > 0, 'v22 deploy report proves additional size reduction');
ok(await exists('runtime-wiring/index.html'), 'runtime wiring page exists');
ok(await exists('persistence-health/index.html'), 'persistence health page exists');
ok(await exists('artifact-manifest/index.html'), 'artifact manifest page exists');

for(const fn of ['phx-action.mjs','phx-admin.mjs','phx-payment.mjs','phx-lead.mjs','phx-claim.mjs']){
  const body = await fs.readFile(path.join(ROOT, 'netlify/functions', fn), 'utf8');
  ok(body.includes('buildRuntimeContext'), `${fn} uses shared runtime context`);
}
const claimSource = await fs.readFile(path.join(ROOT, 'netlify/functions/phx-claim.mjs'), 'utf8');
ok(!claimSource.includes('requireUpstreamActor(event.headers'), 'phx-claim no longer passes raw headers to requireUpstreamActor');
const adminApp = await fs.readFile(path.join(ROOT, 'src/protected-admin-app.js'), 'utf8');
ok(adminApp.includes("api('replay_actions')") && !adminApp.includes("api('replay_state')"), 'protected admin replay operation matches admin API');

const tmp = path.join(ROOT, '.tmp-v22-runtime.json');
await fs.rm(tmp, { force:true });
const jsonHealth = await adapterRoundTrip(new JsonPlatformAdapter(tmp), data.businesses[0].id);
ok(jsonHealth.ok && jsonHealth.duplicate_guard, 'JSON adapter round-trip proves persistence and idempotency');
const d1Health = await adapterRoundTrip(new D1PlatformAdapter(new FakeD1()), data.businesses[1].id);
ok(d1Health.ok && d1Health.duplicate_guard, 'D1 adapter round-trip proves action/state path with fake binding');
const neonHealth = await adapterRoundTrip(new NeonPlatformAdapter(createFakeNeon()), data.businesses[2].id);
ok(neonHealth.ok && neonHealth.duplicate_guard, 'Neon adapter round-trip proves action/state path with fake client');
const context = buildRuntimeContext({ PHX_RUNTIME_DRIVER:'json', PHX_RUNTIME_DB_FILE:tmp, ALLOW_LOCAL_ACTIONS:'true' }, {});
const summary = await runtimeContextSummary(context);
ok(summary.mode === 'file-backed-runtime' && summary.adapter?.adapter === 'json', 'runtime context summary reports JSON adapter');
const schema = schemaBundle();
ok(schema.d1.includes('CREATE TABLE IF NOT EXISTS phx_actions') && schema.neon.includes('phx_actions'), 'schema bundle exposes D1 and Neon schemas');
ok(typeof D1PlatformAdapter.prototype.listEvents === 'function' && typeof D1PlatformAdapter.prototype.appendDeliveryReceipt === 'function' && typeof D1PlatformAdapter.prototype.summary === 'function', 'D1 adapter exposes event, receipt, and summary methods');
ok(typeof NeonPlatformAdapter.prototype.listEvents === 'function', 'Neon adapter exposes event listing method');

const unauthClaim = await claimHandler({ httpMethod:'POST', headers:{}, body:JSON.stringify({ payload:{ business_id:data.businesses[0].id, owner_name:'Owner', owner_contact:'owner@example.com', claim_type:'correction', proof_summary:'proof' } }) }, {});
ok(unauthClaim.statusCode === 401, 'claim endpoint rejects missing upstream identity');
const authedClaim = await claimHandler({ httpMethod:'POST', headers:{ 'x-upstream-user-email':'owner@example.com', 'x-upstream-roles':'owner' }, body:JSON.stringify({ payload:{ business_id:data.businesses[0].id, owner_name:'Owner', owner_contact:'owner@example.com', claim_type:'correction', proof_summary:'proof' } }) }, {});
ok([200,202].includes(authedClaim.statusCode), 'claim endpoint accepts upstream owner identity');
const unauthAdmin = await adminHandler({ httpMethod:'GET', headers:{}, queryStringParameters:{} }, {});
ok(unauthAdmin.statusCode === 401, 'admin endpoint rejects missing upstream identity');

if(fail){ console.error(`☐ v22 smoke failed: ${fail} failed / ${pass} passed`); process.exit(1); }
console.log(`✅ v22 smoke passed: ${pass} checks passed`);
