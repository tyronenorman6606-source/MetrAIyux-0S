import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { policyMatrix } from '../src/server/policy.mjs';
import { listContracts } from '../src/server/contracts.mjs';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const DIST = path.join(ROOT, 'dist');
const SITE_URL = process.env.SITE_URL || 'https://valleyverified.local';
const TODAY = new Date().toISOString();
const V17_SURFACES = ['/mutation-service/', '/event-ledger/', '/webhook-outbox/', '/change-sets/', '/policy-engine/'];

async function ensureDir(dir){ await fs.mkdir(dir, { recursive:true }); }
async function write(rel, body){ const file = path.join(DIST, rel); await ensureDir(path.dirname(file)); await fs.writeFile(file, body); }
async function readJson(rel, fallback = {}){ try{ return JSON.parse(await fs.readFile(path.join(DIST, rel), 'utf8')); }catch{ return fallback; } }
async function readText(rel, fallback = ''){ try{ return await fs.readFile(path.join(DIST, rel), 'utf8'); }catch{ return fallback; } }
function html(value){ return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function page({ title, description, body }){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${html(title)}</title><meta name="description" content="${html(description)}"><meta name="robots" content="noindex,nofollow,noarchive"><link rel="canonical" href="${SITE_URL}/"><link rel="stylesheet" href="/assets/styles.css"></head><body class="internal-page"><header class="topbar"><a class="brand" href="/"><span class="logo-orb"></span><span>Valley Verified</span></a><nav><a href="/directory/">Directory</a><a href="/ae-command/">AE</a><a href="/backend/">Backend</a><a href="/data/">Data</a></nav></header><main>${body}</main><footer class="footer"><p>Valley Verified Network · v17 code infrastructure surface · upstream auth expected.</p></footer><script src="/assets/app.js" defer></script></body></html>`;
}
function metric(label, value){ return `<div class="metric"><span>${html(value)}</span><small>${html(label)}</small></div>`; }
function code(value){ return `<pre class="code-output small-code">${html(JSON.stringify(value, null, 2))}</pre>`; }

const businesses = await readJson('data/businesses.json', { businesses:[] });
const report = await readJson('seed-report.json', { records:{} });
const contracts = listContracts();
const policy = policyMatrix();

const mutationServiceModel = {
  version:'17.0.0',
  generated_at:TODAY,
  purpose:'Backend-ready mutation service for Valley Verified action intake, policy enforcement, queueing, review decisions, state projection, event history, webhook outbox, replay, and exportable admin change-sets.',
  published_businesses:businesses.businesses?.length || report.records?.published || 0,
  code_modules:[
    'src/server/mutation-service.mjs',
    'src/server/policy.mjs',
    'src/server/event-store.mjs',
    'src/server/webhooks.mjs',
    'src/server/exporters.mjs',
    'src/server/router.mjs',
    'src/server/state-store.mjs',
    'src/server/storage.mjs'
  ],
  lifecycle:['upstream_auth_identity','contract_validation','policy_enforcement','canonical_business_check','idempotent_queue_write','immutable_event_append','admin_review','state_projection','webhook_outbox','change_set_export'],
  hard_rules:[
    'No local auth is implemented; upstream auth headers remain required.',
    'Static seed records are not pretended to mutate live.',
    'Admin-only actions require admin role before projection.',
    'Protected listing identity fields cannot be modified through patch actions.',
    'Suppression exports are reviewable patches for seed/businesses/suppressions.json.'
  ],
  contracts:contracts.map(c => ({ type:c.type, queue:c.queue, public_intake:c.public_intake, roles:c.roles, required:c.required })),
  policy
};

const eventLedgerModel = {
  version:'17.0.0',
  generated_at:TODAY,
  event_types:['action.queued','action.duplicate','action.approved','action.rejected','action.projected','action.replayed','action.replay_failed'],
  storage_files:['.phx-event-ledger/events.jsonl','.phx-event-ledger/snapshots/*.json','.phx-state/events.jsonl','.phx-state/platform-state.json'],
  replay_contract:{ command:'node scripts/mutation-smoke.mjs', service:'replayQueuedActionsToState({ store, stateStore, reviewer })', result:'Rebuilds runtime state from queued action envelopes without touching seed CSV/JSON.' },
  snapshot_policy:'Snapshots are generated after replay/projection so admin state can be audited or restored.',
  queues:contracts.map(c => c.queue)
};

const webhookOutboxTemplate = {
  version:'17.0.0',
  generated_at:TODAY,
  mode:'outbox_only_no_provider_lockin',
  why:'The platform creates signed webhook jobs but does not pretend to send SMS/email/CRM updates until providers are wired.',
  job_shape:{ job_id:'webhook-<sha256>', status:'pending', target:'platform-webhook', event_type:'action.queued', attempts:0, headers:{ 'x-phx-event':'action.queued', 'x-phx-signature':'hmac-sha256' }, body:{ action_id:'...', action_type:'owner_claim', payload:{ queue:'owner-claims', risk_level:'medium' } } },
  recommended_targets:['CRM sync endpoint','AE notification endpoint','owner claim notification endpoint','lead routing notification endpoint','billing/exposure-product intent endpoint']
};

const adminChangeSetTemplate = {
  version:'17.0.0',
  generated_at:TODAY,
  purpose:'Export runtime decisions into reviewable seed/admin files instead of silently mutating the public dataset.',
  outputs:['admin-change-set.json','admin-change-set.csv','suppression-patch.json','listing-patches.json','claim-status-sync.json','lead-status-sync.json','ae-followups.csv'],
  suppression_patch:{ ids:['example-duplicate-business-id'], identity_keys:[], domains:[], phones:[], emails:[], source_hashes:[] },
  listing_patch_example:{ business_id:'example-business-id', patch:{ website:'https://example.com', phone:'6025550100' }, reason:'Owner-submitted correction after proof review.' },
  review_steps:['Export runtime state','Review changes with admin','Patch seed/businesses/suppressions.json or inbox seed files','Rebuild','Run smoke/production-check']
};

const policyEngineModel = {
  version:'17.0.0',
  generated_at:TODAY,
  policy,
  protected_patch_fields:['id','source_id','source_hash','canonical_id','canonical_identity_key','identity','verification_score','moderation_flags','source_batch_id','created_at'],
  role_lanes:{ admin_only:['suppression_request','suppression_apply','verification_decision','claim_status_update','listing_admin_patch','admin_review_decision'], ae_or_admin:['profile_enrichment','ae_note','ae_stage_update','owner_contact_log','lead_status_update'], gated_customer:['customer_business_posting'], public_queued:['lead_request','owner_claim','sponsor_intent'] }
};

await write('data/mutation-service-model.json', JSON.stringify(mutationServiceModel, null, 2));
await write('data/event-ledger-model.json', JSON.stringify(eventLedgerModel, null, 2));
await write('data/webhook-outbox-template.json', JSON.stringify(webhookOutboxTemplate, null, 2));
await write('data/admin-change-set-template.json', JSON.stringify(adminChangeSetTemplate, null, 2));
await write('data/policy-engine.json', JSON.stringify(policyEngineModel, null, 2));
await write('api/mutation-service-model.json', JSON.stringify(mutationServiceModel, null, 2));
await write('api/event-ledger-model.json', JSON.stringify(eventLedgerModel, null, 2));
await write('api/webhook-outbox-template.json', JSON.stringify(webhookOutboxTemplate, null, 2));
await write('api/admin-change-set-template.json', JSON.stringify(adminChangeSetTemplate, null, 2));
await write('api/policy-engine.json', JSON.stringify(policyEngineModel, null, 2));

await write('mutation-service/index.html', page({ title:'Mutation Service | Valley Verified', description:'Valley Verified v17 mutation service architecture for queued actions, admin review, and runtime state projection.', body:`<section class="hero glass subhero"><div><p class="eyebrow">v17 mutation service</p><h1>Actions now have a real service layer.</h1><p class="hero-text">The app no longer stops at static forms and queued JSON. It has contracts, policy enforcement, queue writes, event history, webhook outbox jobs, approval projection, replay, and change-set exports.</p><div class="hero-actions"><a class="btn primary" href="/data/mutation-service-model.json">Open model JSON</a><a class="btn" href="/policy-engine/">Policy engine</a></div></div><aside class="hero-card">${metric('businesses indexed', (businesses.businesses?.length || 0).toLocaleString())}${metric('action contracts', contracts.length)}${metric('code modules', mutationServiceModel.code_modules.length)}</aside></section><section class="section glass"><p class="eyebrow">Lifecycle</p><h2>Mutation flow</h2><div class="pipeline-grid">${mutationServiceModel.lifecycle.map((step, i)=>`<div><strong>${String(i+1).padStart(2,'0')}</strong><p>${html(step.replaceAll('_',' '))}</p></div>`).join('')}</div></section><section class="section glass"><p class="eyebrow">Code proof</p><h2>Modules added</h2><ul class="file-list">${mutationServiceModel.code_modules.map(m=>`<li><code>${html(m)}</code></li>`).join('')}</ul></section>` }));

await write('event-ledger/index.html', page({ title:'Event Ledger | Valley Verified', description:'Immutable action event ledger and replay model for Valley Verified runtime operations.', body:`<section class="hero glass subhero"><div><p class="eyebrow">Event history</p><h1>Every action can leave an auditable trail.</h1><p class="hero-text">Queued, approved, rejected, projected, duplicate, and replay events are modeled as append-only JSONL records so admin workflows can be reconstructed.</p><div class="hero-actions"><a class="btn primary" href="/data/event-ledger-model.json">Open ledger JSON</a><a class="btn" href="/action-queue/">Action queue</a></div></div><aside class="hero-card">${metric('event types', eventLedgerModel.event_types.length)}${metric('queues', eventLedgerModel.queues.length)}</aside></section><section class="section glass"><p class="eyebrow">Events</p><h2>Supported ledger events</h2><div class="tag-cloud">${eventLedgerModel.event_types.map(e=>`<span>${html(e)}</span>`).join('')}</div></section>${code(eventLedgerModel.replay_contract)}` }));

await write('webhook-outbox/index.html', page({ title:'Webhook Outbox | Valley Verified', description:'Signed webhook outbox jobs for Valley Verified owner claims, leads, approvals, and state projections.', body:`<section class="hero glass subhero"><div><p class="eyebrow">Webhook outbox</p><h1>Provider-ready notifications without fake sending.</h1><p class="hero-text">The code now creates signed pending webhook jobs for CRM, AE, owner, lead, and billing integrations. It does not claim messages were delivered until providers are wired.</p><div class="hero-actions"><a class="btn primary" href="/data/webhook-outbox-template.json">Open outbox template</a><a class="btn" href="/lead-inbox/">Lead inbox</a></div></div><aside class="hero-card">${metric('mode', 'outbox')}${metric('signature', 'HMAC')}</aside></section><section class="section glass"><p class="eyebrow">Job shape</p><h2>Signed pending job</h2>${code(webhookOutboxTemplate.job_shape)}</section>` }));

await write('change-sets/index.html', page({ title:'Admin Change-Sets | Valley Verified', description:'Reviewable runtime-to-seed export workflow for Valley Verified admin decisions.', body:`<section class="hero glass subhero"><div><p class="eyebrow">Admin change-sets</p><h1>Runtime decisions export into reviewable seed patches.</h1><p class="hero-text">Suppression, claim status, listing patches, lead status, and AE follow-ups can be exported instead of pretending static seed records mutated live.</p><div class="hero-actions"><a class="btn primary" href="/data/admin-change-set-template.json">Open change-set template</a><a class="btn" href="/admin-actions/">Admin actions</a></div></div><aside class="hero-card">${metric('export lanes', adminChangeSetTemplate.outputs.length)}${metric('suppression path', 'seed')}</aside></section><section class="section glass"><p class="eyebrow">Outputs</p><h2>Admin export files</h2><ul class="file-list">${adminChangeSetTemplate.outputs.map(o=>`<li><code>${html(o)}</code></li>`).join('')}</ul></section>` }));

await write('policy-engine/index.html', page({ title:'Policy Engine | Valley Verified', description:'Role and patch-safety policy engine for Valley Verified action mutations.', body:`<section class="hero glass subhero"><div><p class="eyebrow">Policy engine</p><h1>Mutations are blocked before they can poison listings.</h1><p class="hero-text">Admin-only actions, AE lanes, public queued intake, payload size, and protected identity patch fields are now enforced in code.</p><div class="hero-actions"><a class="btn primary" href="/data/policy-engine.json">Open policy JSON</a><a class="btn" href="/mutation-service/">Mutation service</a></div></div><aside class="hero-card">${metric('policy lanes', Object.keys(policyEngineModel.role_lanes).length)}${metric('protected fields', policyEngineModel.protected_patch_fields.length)}</aside></section><section class="section glass"><p class="eyebrow">Contracts</p><h2>Policy matrix</h2><div class="table-wrap"><table><thead><tr><th>Action</th><th>Lane</th><th>Queue</th><th>Roles</th></tr></thead><tbody>${policy.slice(0, 24).map(row=>`<tr><td>${html(row.type)}</td><td>${html(row.policy_lane)}</td><td>${html(row.queue)}</td><td>${html((row.contract_roles||[]).join(', '))}</td></tr>`).join('')}</tbody></table></div></section>` }));

const routeManifest = await readJson('data/route-manifest.json', { surfaces:[], internal_noindex_surfaces:[], public_surfaces:[] });
routeManifest.surfaces = Array.from(new Set([...(routeManifest.surfaces || []), ...V17_SURFACES])).sort();
routeManifest.internal_noindex_surfaces = Array.from(new Set([...(routeManifest.internal_noindex_surfaces || []), ...V17_SURFACES])).sort();
routeManifest.v17_code_surfaces = V17_SURFACES;
routeManifest.v17_code_modules = mutationServiceModel.code_modules;
routeManifest.routes = { ...(routeManifest.routes || {}), v17_code_surfaces:V17_SURFACES.length };
await write('data/route-manifest.json', JSON.stringify(routeManifest, null, 2));

let robots = await readText('robots.txt');
for(const surface of V17_SURFACES){
  if(!robots.includes(`Disallow: ${surface}`)) robots += `\nDisallow: ${surface}`;
}
await write('robots.txt', robots.trim() + '\n');

const apiIndex = await readJson('data/platform-api-index.json', { endpoints:[] });
const additions = ['mutation-service-model','event-ledger-model','webhook-outbox-template','admin-change-set-template','policy-engine'].map(name => ({ name, url:`/api/${name}.json`, internal:true, version:'17.0.0' }));
apiIndex.endpoints = Array.from(new Map([...(apiIndex.endpoints || []), ...additions].map(e => [e.url, e])).values());
apiIndex.version = '17.0.0';
apiIndex.updated_at = TODAY;
await write('data/platform-api-index.json', JSON.stringify(apiIndex, null, 2));
await write('api/platform-api-index.json', JSON.stringify(apiIndex, null, 2));

console.log(`v17 enhancement wrote ${V17_SURFACES.length} internal code surfaces and 5 data/API models.`);
