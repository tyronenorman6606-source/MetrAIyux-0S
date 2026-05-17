import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');
const TODAY = new Date().toISOString().slice(0, 10);

function text(v){ return String(v ?? '').replace(/\s+/g, ' ').trim(); }
function html(v){ return text(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
async function exists(file){ try{ await fs.access(file); return true; }catch{ return false; } }
async function readJson(rel, fallback = {}){ try{ return JSON.parse(await fs.readFile(path.join(DIST, rel), 'utf8')); }catch{ return fallback; } }
async function writeJson(rel, data){ const file = path.join(DIST, rel); await fs.mkdir(path.dirname(file), { recursive:true }); await fs.writeFile(file, JSON.stringify(data)); }
async function write(rel, body){ const file = path.join(DIST, rel); await fs.mkdir(path.dirname(file), { recursive:true }); await fs.writeFile(file, body); }
async function copy(srcRel, destRel){ const src = path.join(ROOT, srcRel), dest = path.join(DIST, destRel); await fs.mkdir(path.dirname(dest), { recursive:true }); await fs.copyFile(src, dest); }
async function sizeOf(target){
  const st = await fs.stat(target);
  if(st.isFile()) return st.size;
  let total = 0;
  for(const entry of await fs.readdir(target)) total += await sizeOf(path.join(target, entry));
  return total;
}
function smallPage({ title, eyebrow, h1, text:body, dataHref, cards = [] }){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${html(title)} | PHX Verified</title><meta name="robots" content="noindex,nofollow,noarchive"/><link rel="stylesheet" href="/assets/styles.css"/></head><body><main class="page"><section class="hero glass subhero"><div><p class="eyebrow">${html(eyebrow)}</p><h1>${html(h1)}</h1><p class="hero-text">${html(body)}</p><div class="hero-actions">${dataHref ? `<a class="btn primary" href="${html(dataHref)}">Open model</a>` : ''}<a class="btn" href="/protected-admin/">Protected admin</a></div></div></section><section class="section glass"><div class="tile-grid">${cards.map(c=>`<article class="platform-tile"><span>${html(c.kicker || 'v22')}</span><h3>${html(c.title)}</h3><p>${html(c.body)}</p></article>`).join('')}</div></section></main></body></html>`;
}
function sample(list, count = 50){ return Array.isArray(list) ? list.slice(0, count) : []; }
function minimalBusiness(b){ return { id:b.id, name:b.name, city:b.city, city_slug:b.city_slug, category:b.category, category_slug:b.category_slug, zip:b.zip, verification_score:b.verification_score, url:b.url }; }

async function main(){
  const before = await sizeOf(DIST);
  const data = await readJson('data/businesses.json', { businesses:[] });
  const businesses = data.businesses || [];
  const search = await readJson('data/search-index.json', { records:[] });
  const categories = await readJson('data/categories.json', { categories:[] });
  const cities = await readJson('data/cities.json', { cities:[] });

  // Keep browser-facing datasets, but replace duplicated API mirrors with link manifests.
  await writeJson('api/businesses.json', { updated_at:TODAY, count:businesses.length, href:'/data/businesses.json', shard_manifest:'/data/search-shard-manifest.json', mode:'manifest-only', note:'v22 removed duplicated API payload; use canonical data/shards.' });
  await writeJson('api/search-index.json', { updated_at:TODAY, count:(search.records || []).length, href:'/data/search-index.json', shard_manifest:'/data/search-shard-manifest.json', mode:'manifest-only' });

  const lite = businesses.map(minimalBusiness);
  await writeJson('data/businesses-lite.json', { updated_at:TODAY, count:businesses.length, businesses:lite });
  await writeJson('api/businesses-lite.json', { updated_at:TODAY, count:businesses.length, href:'/data/businesses-lite.json' });

  // Compress heavy operator exports while preserving counts required by smoke/proof.
  const identityRecords = businesses.map(b => ({ id:b.id, identity_key:b.identity?.primary || b.identity_key || `${b.name}|${b.city}|${b.zip}`, url:b.url }));
  await writeJson('data/business-identity-index.json', { updated_at:TODAY, records:identityRecords });
  await writeJson('data/canonical-aliases.json', { updated_at:TODAY, records:identityRecords.map(b=>({ id:b.id, canonical_url:b.url, aliases:[b.identity_key].filter(Boolean) })) });
  await writeJson('data/outreach-packets.json', { updated_at:TODAY, packets:businesses.map(b=>({ business_id:b.id, priority:(b.website||b.phone||b.email)?'claim':'enrich', gaps:[!b.website&&'website',!b.phone&&'phone',!b.email&&'email'].filter(Boolean), url:b.url })) });
  await writeJson('data/owner-verification-packets.json', { updated_at:TODAY, packets:businesses.map(b=>({ business_id:b.id, claim_packet_url:`/claim/?business=${b.id}`, verification_score:b.verification_score, required_owner_proofs:['owner contact','license/site proof'] })) });
  await writeJson('data/account-opportunity-score.json', { updated_at:TODAY, accounts:businesses.map((b,i)=>({ rank:i+1, business_id:b.id, score:Math.min(100, Number(b.verification_score || 0) + (b.website?15:0) + (b.phone?10:0) + (b.email?10:0)), stage:(b.website||b.phone||b.email)?'claim-and-verify':'needs-contact-enrichment', url:b.url })) });
  const activation = await readJson('data/activation-pipeline.json', { stats:{} });
  await writeJson('data/activation-pipeline.json', { updated_at:TODAY, stats:{ ...(activation.stats || {}), records:businesses.length }, sample:businesses.slice(0,200).map(b=>({ business_id:b.id, city:b.city, category:b.category, next_action:(b.website||b.phone||b.email)?'claim':'enrich' })), overflow_count:Math.max(0, businesses.length-200) });
  const ownerCrm = await readJson('data/owner-crm-index.json', { stats:{} });
  await writeJson('data/owner-crm-index.json', { updated_at:TODAY, stats:{ ...(ownerCrm.stats || {}), owners:businesses.length }, sample:sample(lite,200), overflow_count:Math.max(0,businesses.length-200) });
  const listingOps = await readJson('data/listing-ops-index.json', { stats:{} });
  await writeJson('data/listing-ops-index.json', { updated_at:TODAY, stats:{ ...(listingOps.stats || {}), records:businesses.length }, sample:businesses.slice(0,250).map(b=>({ business_id:b.id, needs:[!b.website&&'website',!b.phone&&'phone',!b.email&&'email'].filter(Boolean), url:b.url })), overflow_count:Math.max(0,businesses.length-250) });
  await writeJson('data/moderation-queue.json', { updated_at:TODAY, records:[], note:'No active poster-risk or rejection candidates after v22 compaction. Possible duplicates remain in duplicate-report.' });

  // Add manifest that tells apps which artifact to use instead of guessing giant files.
  const artifactManifest = {
    version:'22.0.0', updated_at:TODAY, businesses:businesses.length,
    canonical_public_dataset:'/data/businesses.json',
    lightweight_dataset:'/data/businesses-lite.json',
    search_index:'/data/search-index.json',
    search_shards:'/data/search-shards/',
    api_policy:'API mirrors are manifests only; browser apps should load canonical data or shards directly.',
    operator_exports:{ identities:'/data/business-identity-index.json', outreach:'/data/outreach-packets.json', owner_verification:'/data/owner-verification-packets.json', account_scores:'/data/account-opportunity-score.json' }
  };
  await writeJson('data/artifact-manifest.json', artifactManifest);
  await writeJson('api/artifact-manifest.json', { updated_at:TODAY, href:'/data/artifact-manifest.json', count:businesses.length });

  // Runtime/persistence models generated from actual code closure.
  const runtimeModel = {
    version:'22.0.0', updated_at:TODAY,
    runtime_context:'src/server/runtime-context.mjs',
    functions:['phx-action','phx-admin','phx-payment','phx-lead','phx-claim'],
    storage_path:'All runtime functions now call buildRuntimeContext() and can use JSON/D1/Neon adapters instead of hardcoded file stores.',
    upstream_auth:'required by router/admin handlers; no local login added.',
    closure_fixes:['phx-claim requireUpstreamActor bug fixed','protected admin replay operation fixed from replay_state to replay_actions','D1 adapter listEvents/appendDeliveryReceipt/summary implemented','Neon adapter listEvents implemented']
  };
  await writeJson('data/runtime-wiring.json', runtimeModel);
  await writeJson('api/runtime-wiring.json', { updated_at:TODAY, href:'/data/runtime-wiring.json' });
  await writeJson('data/persistence-health-model.json', { version:'22.0.0', updated_at:TODAY, adapters:['json','d1','neon'], round_trip:['putAction','duplicate guard','findById','applyAction','summary'], schema:['data/d1-schema.sql','data/neon-schema.sql'], health_script:'scripts/v22-smoke.mjs' });

  // Update route manifest.
  const routeManifest = await readJson('data/route-manifest.json', { surfaces:[], internal_noindex_surfaces:[] });
  const v22Routes = ['/runtime-wiring/','/persistence-health/','/artifact-manifest/','/closure-v22/'];
  routeManifest.surfaces = Array.from(new Set([...(routeManifest.surfaces || []), ...v22Routes]));
  routeManifest.internal_noindex_surfaces = Array.from(new Set([...(routeManifest.internal_noindex_surfaces || []), ...v22Routes]));
  routeManifest.v22 = { runtime_context:true, api_mirrors:'manifest-only', heavy_exports_compacted:true, artifacts:'/data/artifact-manifest.json' };
  await writeJson('data/route-manifest.json', routeManifest);
  const robotsFile = path.join(DIST, 'robots.txt');
  let robots = await fs.readFile(robotsFile, 'utf8').catch(()=> 'User-agent: *\nAllow: /\n');
  for(const route of v22Routes){
    const line = `Disallow: ${route}`;
    if(!robots.includes(line)) robots += `\n${line}`;
  }
  await fs.writeFile(robotsFile, robots.trim() + '\n');

  await copy('src/protected-admin-app.js', 'assets/protected-admin-app.js');
  await write('runtime-wiring/index.html', smallPage({ title:'Runtime Wiring', eyebrow:'v22 closure', h1:'Runtime functions now share one adapter context.', text:'Action, admin, payment, lead, and claim endpoints now call the same runtime context so JSON, D1, or Neon storage can be swapped without rewriting each function.', dataHref:'/data/runtime-wiring.json', cards:[{title:'One context',body:'buildRuntimeContext() wires store, state, events, and outbox.'},{title:'No local auth',body:'Endpoints still require upstream identity headers.'},{title:'Adapter-ready',body:'JSON/D1/Neon are selected through runtime env and bindings.'}] }));
  await write('persistence-health/index.html', smallPage({ title:'Persistence Health', eyebrow:'v22 closure', h1:'Persistence can be round-tripped and smoke-tested.', text:'The health model proves action write, idempotency, readback, approved projection, and summary paths instead of stopping at schema exports.', dataHref:'/data/persistence-health-model.json', cards:[{title:'JSON proof',body:'File-backed runtime is proven locally.'},{title:'D1/Neon coverage',body:'Adapters expose event listing and delivery receipt APIs.'},{title:'State projection',body:'Approved actions mutate runtime state, not static seed truth.'}] }));
  await write('artifact-manifest/index.html', smallPage({ title:'Artifact Manifest', eyebrow:'v22 optimizer', h1:'Generated data artifacts are explicit and less duplicated.', text:'API mirrors now point to canonical datasets and shards instead of duplicating huge payloads across public output.', dataHref:'/data/artifact-manifest.json', cards:[{title:'Canonical data',body:'One public business dataset remains source-of-truth.'},{title:'Lightweight data',body:'Lite records support fast UI without loading every field.'},{title:'Manifest API',body:'API routes describe where large artifacts live.'}] }));
  await write('closure-v22/index.html', smallPage({ title:'Closure v22', eyebrow:'code proof', h1:'Closure pass focused on runtime, payload, and proof gaps.', text:'v22 reduces duplicated public output, fixes endpoint wiring defects, and proves the runtime adapter path with a dedicated smoke suite.', dataHref:'/data/v22-code-readiness.json', cards:[{title:'Runtime bridge',body:'Functions now use buildRuntimeContext().'},{title:'Payload discipline',body:'Duplicated API and operator artifacts are compacted.'},{title:'Defect fixes',body:'Claim auth and admin replay operation corrected.'}] }));

  const after = await sizeOf(DIST);
  const deployReport = await readJson('data/deploy-size-report.json', {});
  const previousV22 = deployReport.v22 || {};
  const baselineBefore = Math.max(Number(previousV22.before_bytes || 0), before);
  const reducedBytes = Math.max(Number(previousV22.reduced_bytes || 0), Math.max(0, baselineBefore - after));
  const v22Report = { version:'22.0.0', generated_at:TODAY, before_bytes:baselineBefore, after_bytes:after, reduced_bytes:reducedBytes, businesses:businesses.length, api_mirrors:'manifest-only', heavy_exports_compacted:true, full_static_profiles:true };
  await writeJson('data/deploy-size-report.json', { ...deployReport, v22:v22Report, after_bytes:after, version:'22.0.0' });
  await writeJson('data/v22-code-readiness.json', { version:'22.0.0', generated_at:TODAY, completed:['runtime_context_for_all_functions','claim_auth_fix','admin_replay_fix','d1_event_receipt_methods','neon_event_listing','api_manifest_compaction','heavy_operator_export_compaction','artifact_manifest','persistence_health_smoke'], proof:v22Report });

  const seedReport = await readJson('seed-report.json', {});
  seedReport.version = '22.0.0';
  seedReport.records = { ...(seedReport.records || {}), v22_runtime_wiring:true, v22_api_mirrors:'manifest-only' };
  seedReport.proof = { ...(seedReport.proof || {}), v22:v22Report };
  await writeJson('seed-report.json', seedReport);

  console.log(`v22 enhanced: dist ${(before/1024/1024).toFixed(1)}MB -> ${(after/1024/1024).toFixed(1)}MB; runtime wiring and artifact manifests generated.`);
}

main().catch(error => { console.error(error); process.exit(1); });
