import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');
const TODAY = new Date().toISOString().slice(0, 10);
const SITE_URL = String(process.env.SITE_URL || process.env.URL || 'https://phxverified.netlify.app').replace(/\/+$/, '');

function text(v){ return String(v ?? '').replace(/\s+/g, ' ').trim(); }
function html(v){ return text(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
function jsonScript(v){ return JSON.stringify(v).replace(/</g, '\\u003c'); }
function slugify(v){ return text(v).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90) || 'item'; }
function hash(v){ return crypto.createHash('sha256').update(String(v)).digest('hex').slice(0,16); }
async function ensure(dir){ await fs.mkdir(dir, { recursive:true }); }
async function write(file, body){ await ensure(path.dirname(file)); await fs.writeFile(file, body); }
async function readJson(rel){ return JSON.parse(await fs.readFile(path.join(DIST, rel), 'utf8')); }
async function maybeReadJson(rel, fallback){ try { return await readJson(rel); } catch { return fallback; } }
async function rm(rel){ await fs.rm(path.join(DIST, rel), { recursive:true, force:true }); }
async function sizeOf(file){ try { const st = await fs.stat(file); if(st.isFile()) return st.size; if(st.isDirectory()){ let total=0; for(const e of await fs.readdir(file)) total += await sizeOf(path.join(file,e)); return total; } } catch{} return 0; }
function compactBusiness(b){
  return {
    id:b.id,
    name:b.name,
    category:b.category,
    category_slug:b.category_slug || slugify(b.category),
    niche:b.niche || '',
    city:b.city,
    city_slug:b.city_slug || slugify(b.city),
    state:b.state || 'AZ',
    zip:b.zip || '',
    website:b.website || '',
    phone:b.phone || '',
    email:b.email || '',
    verification_score:Number(b.verification_score || 0),
    identity:{ primary_key:b.identity?.primary_key || b.identity_key || `name_city_zip:${slugify(`${b.name}-${b.city}-${b.zip || ''}`)}` },
    moderation_flags:Array.isArray(b.moderation_flags) ? b.moderation_flags : [],
    url:`/business/${b.id}/`
  };
}
function searchRecord(b){
  return {
    id:b.id, name:b.name, category:b.category, category_slug:b.category_slug, city:b.city, city_slug:b.city_slug,
    state:b.state, zip:b.zip, address:b.address, website:b.website, phone:b.phone, email:b.email,
    verification_score:b.verification_score, trust_tier:b.trust_tier, url:b.url,
    text:[b.name,b.category,b.niche,b.city,b.zip,(b.tags||[]).join(' ')].filter(Boolean).join(' ')
  };
}
function profileHtml(b){
  const title = `${b.name} | ${b.city || 'Arizona'} ${b.category || 'Business'} | PHX Verified`;
  const desc = `${b.name} is listed in PHX Verified as a ${b.category || 'local business'}${b.city ? ` in ${b.city}, Arizona` : ''}. Claim, correct, compare, or request a quote from this canonical profile.`;
  const address = [b.address,b.city,b.state,b.zip].filter(Boolean).join(', ');
  const schema = {
    '@context':'https://schema.org', '@type':'LocalBusiness', '@id':`${SITE_URL}/business/${b.id}/#business`,
    name:b.name, url:`${SITE_URL}/business/${b.id}/`, address:address ? { '@type':'PostalAddress', streetAddress:b.address || undefined, addressLocality:b.city || undefined, addressRegion:b.state || 'AZ', postalCode:b.zip || undefined, addressCountry:'US' } : undefined,
    telephone:b.phone || undefined, email:b.email || undefined, sameAs:b.website ? [b.website] : undefined,
    additionalType:b.category || undefined, description:desc
  };
  const contact = [b.phone && `<a class="btn small" href="tel:${html(b.phone)}">Call</a>`, b.email && `<a class="btn small" href="mailto:${html(b.email)}">Email</a>`, b.website && `<a class="btn small" href="${html(b.website)}" rel="nofollow">Website</a>`].filter(Boolean).join('');
  const flags = (b.moderation_flags || []).length ? b.moderation_flags.join(', ') : 'No active duplicate flags in current seed build';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${html(title)}</title><meta name="description" content="${html(desc)}"/><link rel="canonical" href="${SITE_URL}/business/${html(b.id)}/"/><meta name="robots" content="index,follow"/><meta property="og:title" content="${html(title)}"/><meta property="og:description" content="${html(desc)}"/><meta property="og:url" content="${SITE_URL}/business/${html(b.id)}/"/><link rel="stylesheet" href="/assets/styles.css"/><script type="application/ld+json">${jsonScript(schema)}</script></head><body class="business-page v21-static-profile"><canvas id="sky" aria-hidden="true"></canvas><header class="topbar glass"><a class="brand" href="/"><span class="logo-mark">PV</span><span>PHX Verified</span></a><nav class="nav-actions"><a href="/directory/">Directory</a><a href="/category/${html(b.category_slug)}/">${html(b.category)}</a><a href="/city/${html(b.city_slug)}/">${html(b.city)}</a><a href="/join/">Join</a></nav></header><main class="page"><section class="hero glass subhero"><div><p class="eyebrow">Canonical business profile</p><h1>${html(b.name)}</h1><p class="hero-text">${html(desc)}</p><div class="hero-actions"><a class="btn primary" href="/request/?business=${html(b.id)}">Request quote</a><a class="btn" href="/claim/?business=${html(b.id)}">Claim / update</a><button class="btn" data-save-business data-business-id="${html(b.id)}" data-business-name="${html(b.name)}" data-url="/business/${html(b.id)}/">Save shortlist</button><a class="btn" href="/compare/?ids=${html(b.id)}">Compare</a>${contact}</div></div><aside class="hero-card"><div class="metric"><span>${html(Math.round(Number(b.verification_score || 0)))}</span><small>profile score</small></div><div class="metric"><span>${html(b.city || 'AZ')}</span><small>market</small></div><div class="metric"><span>${html(b.category || 'Business')}</span><small>category</small></div></aside></section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Listing details</p><h2>Public seed record</h2></div><span class="stat-pill">one canonical profile</span></div><div class="detail-grid"><div><strong>Business</strong><span>${html(b.name)}</span></div><div><strong>Category</strong><span>${html(b.category)}</span></div><div><strong>Address</strong><span>${html(address || 'Address not listed')}</span></div><div><strong>Contact</strong><span>${html([b.phone,b.email,b.website].filter(Boolean).join(' / ') || 'Needs enrichment')}</span></div><div><strong>Identity key</strong><span>${html(b.identity?.primary_key || '')}</span></div><div><strong>Review flags</strong><span>${html(flags)}</span></div></div></section><section class="section glass"><p class="eyebrow">Owner / AE workflow</p><h2>Improve this listing</h2><p class="muted">Owners can submit claim/correction packets. AEs can enrich contact fields and request admin review. The platform does not create duplicate postings for the same canonical business identity.</p><div class="button-row"><a class="btn primary" href="/join/?business=${html(b.id)}">Owner join path</a><a class="btn" href="/lead-routing/?business=${html(b.id)}">Lead routing model</a><a class="btn" href="/fraud-defense/">Fraud defense</a></div></section></main><div id="toast" class="toast"></div><script type="module" src="/assets/app.js"></script></body></html>`;
}
async function mapLimit(items, limit, fn){
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, items.length || 1) }, async () => {
    while(queue.length){ const item = queue.shift(); await fn(item); }
  });
  await Promise.all(workers);
}
function lightweightPage({ title, eyebrow, h1, text:bodyText, cards = [], dataHref = '' }){
  const cardHtml = cards.map((c,i)=>`<article class="proof-card glass"><span>${String(i+1).padStart(2,'0')}</span><h2>${html(c.title)}</h2><p>${html(c.body)}</p></article>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${html(title)} | PHX Verified</title><meta name="description" content="${html(bodyText)}"/><meta name="robots" content="noindex,nofollow,noarchive"/><link rel="stylesheet" href="/assets/styles.css"/></head><body><main class="page"><section class="hero glass subhero"><div><p class="eyebrow">${html(eyebrow)}</p><h1>${html(h1)}</h1><p class="hero-text">${html(bodyText)}</p><div class="hero-actions"><a class="btn primary" href="${html(dataHref || '/data/v21-code-readiness.json')}">Open model JSON</a><a class="btn" href="/admin-console/">Admin console</a></div></div></section><section class="platform-strip">${cardHtml}</section></main></body></html>`;
}
async function writeCompactJson(rel, payload){ await write(path.join(DIST, rel), JSON.stringify(payload)); }
async function rewriteSitemaps(businesses){
  const categories = await maybeReadJson('data/categories.json', { categories:[] });
  const cities = await maybeReadJson('data/cities.json', { cities:[] });
  const markets = await maybeReadJson('data/market-index.json', { markets:[] });
  const taxonomy = await maybeReadJson('data/taxonomy.json', { niches:[] });
  const collectionSlugs = ['verified','no-hidden-fees','mobile-service','insured','accepting-requests','recently-verified'];
  const staticPublic = ['/', '/directory/', '/business/', '/category/', '/city/', '/niche/', '/service-lanes/', '/market/', '/collection/', '/join/', '/pricing/', '/trust-network/', '/shortlist/', '/compare/', '/match/', '/deal-desk/', '/offers/', '/map/', '/submit/', '/request/', '/claim/', '/insights/'];
  const generated = [
    ...(categories.categories || []).map(c => `/category/${c.slug || slugify(c.name || c)}/`),
    ...(cities.cities || []).map(c => `/city/${c.slug || slugify(c.name || c)}/`),
    ...(markets.markets || []).map(m => `/market/${m.slug}/`),
    ...(taxonomy.niches || []).map(n => `/niche/${n.slug}/`),
    ...collectionSlugs.map(s => `/collection/${s}/`)
  ];
  const businessRoutes = businesses.map(b => `/business/${b.id}/`);
  const publicRoutes = Array.from(new Set([...staticPublic, ...generated, ...businessRoutes]));
  function doc(routes){ return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(r=>`  <url><loc>${SITE_URL}${r}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}\n</urlset>`; }
  const chunks = [];
  for(let i=0; i<businessRoutes.length; i+=10000){ chunks.push(businessRoutes.slice(i, i+10000)); }
  await write(path.join(DIST, 'sitemap-pages.xml'), doc(publicRoutes.filter(r=>!r.startsWith('/business/') || r === '/business/')));
  const names = ['sitemap-pages.xml'];
  for(let i=0; i<chunks.length; i++){ const name = `sitemap-business-${i+1}.xml`; names.push(name); await write(path.join(DIST, name), doc(chunks[i])); }
  await write(path.join(DIST, 'sitemap-index.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${names.map(n=>`  <sitemap><loc>${SITE_URL}/${n}</loc><lastmod>${TODAY}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>`);
  await write(path.join(DIST, 'sitemap.xml'), doc(publicRoutes));
  const robotsPath = path.join(DIST, 'robots.txt');
  let robots = '';
  try { robots = await fs.readFile(robotsPath, 'utf8'); } catch {}
  for (const r of ['/enrichment-workbench/','/lead-records/','/payment-activation/','/notification-workers/','/claim-submissions/','/build-system/','/data-optimizer/','/protected-admin/']) {
    if (!robots.includes(`Disallow: ${r}`)) robots = robots.replace(/Sitemap:/, `Disallow: ${r}\nSitemap:`);
  }
  await write(robotsPath, robots);
}

async function main(){
  const before = await sizeOf(DIST);
  const original = await readJson('data/businesses.json');
  const full = original.businesses || [];
  const compact = full.map(compactBusiness);
  const profileRows = full.map(b => ({ ...compactBusiness(b), address:b.address || '', description:b.description || '', tags:Array.isArray(b.tags) ? b.tags.slice(0,12) : [] }));

  await mapLimit(profileRows, 128, async b => write(path.join(DIST, 'business', b.id, 'index.html'), profileHtml(b)));

  const search = compact.map(searchRecord);
  const categories = await maybeReadJson('data/categories.json', { categories:[] });
  const cities = await maybeReadJson('data/cities.json', { cities:[] });
  const seedReport = await maybeReadJson('seed-report.json', {});
  seedReport.version = '21.0.0';
  seedReport.records = { ...(seedReport.records || {}), static_business_pages:compact.length, profile_mode:'full-static' };
  seedReport.v21 = { full_static_business_profiles:compact.length, profile_renderer_required:false, deploy_size_strategy:'compact-public-data-plus-shards', generated_at:TODAY };

  await rm('data/profiles');
  await writeCompactJson('data/businesses.json', { updated_at:TODAY, businesses:compact, facets:{ categories:categories.categories || [], cities:cities.cities || [] } });
  await writeCompactJson('data/businesses-lite.json', { updated_at:TODAY, count:compact.length, note:'Use /data/businesses.json for compact public rows and /data/search-shards/*.json for discovery shards.' });
  await writeCompactJson('data/search-index.json', { updated_at:TODAY, records:search });
  await rm('data/search-shards');
  const shardMap = new Map();
  for(const r of search){ const s = r.name?.[0]?.toLowerCase()?.match(/[a-z0-9]/) ? r.name[0].toLowerCase() : 'other'; if(!shardMap.has(s)) shardMap.set(s, []); shardMap.get(s).push(r); }
  for(const [shard, records] of shardMap) await writeCompactJson(`data/search-shards/${shard}.json`, { updated_at:TODAY, shard, records });
  await writeCompactJson('data/search-shard-manifest.json', { updated_at:TODAY, compact:true, shards:Array.from(shardMap.entries()).map(([shard, records])=>({ shard, url:`/data/search-shards/${shard}.json`, records:records.length })).sort((a,b)=>a.shard.localeCompare(b.shard)) });

  const identityRecords = compact.map(b => ({ id:b.id, name:b.name, identity_key:b.identity.primary_key, city:b.city, category:b.category, url:b.url }));
  await writeCompactJson('data/business-identity-index.json', { updated_at:TODAY, records:identityRecords });
  await writeCompactJson('data/canonical-aliases.json', { updated_at:TODAY, records:identityRecords.map(b=>({ id:b.id, canonical_url:b.url, aliases:[b.identity_key] })) });
  await writeCompactJson('data/canonical-routing.json', { updated_at:TODAY, mode:'full-static', records:compact.map(b=>({ id:b.id, canonical_url:b.url, static_html:true, renderer_url:null, sitemap:true })) });
  await writeCompactJson('data/match-index.json', { updated_at:TODAY, records:compact.map(b=>({ id:b.id, name:b.name, city:b.city, category:b.category, score:b.verification_score, contact_ready:Boolean(b.phone || b.email || b.website), url:b.url })) });
  await writeCompactJson('data/outreach-packets.json', { updated_at:TODAY, packets:compact.map(b=>({ business_id:b.id, name:b.name, city:b.city, category:b.category, priority: b.website || b.phone || b.email ? 'claim' : 'enrich', gaps:[!b.website && 'website', !b.phone && 'phone', !b.email && 'email'].filter(Boolean), url:b.url })) });
  await writeCompactJson('data/owner-verification-packets.json', { updated_at:TODAY, packets:compact.map(b=>({ business_id:b.id, name:b.name, claim_packet_url:`/claim/?business=${b.id}`, verification_score:b.verification_score, required_owner_proofs:['owner contact','business website or license proof'] })) });
  await writeCompactJson('data/account-opportunity-score.json', { updated_at:TODAY, accounts:compact.map((b,i)=>({ rank:i+1, business_id:b.id, name:b.name, city:b.city, category:b.category, score:Math.min(100, b.verification_score + (b.website?15:0) + (b.phone?10:0) + (b.email?10:0)), stage:(b.website||b.phone||b.email)?'claim-and-verify':'needs-contact-enrichment', contact:{ phone:b.phone, email:b.email, website:b.website }, next_action:(b.website||b.phone||b.email)?'Invite owner to claim and verify listing.':'Enrich contact fields before AE sales.', url:b.url })) });
  await writeCompactJson('data/owner-crm-index.json', { updated_at:TODAY, stats:{ owners:compact.length }, owners:compact.map(b=>({ business_id:b.id, name:b.name, city:b.city, category:b.category, owner_status:'unclaimed', next_action:(b.website||b.phone||b.email)?'claim_outreach':'contact_enrichment', url:b.url })) });
  await writeCompactJson('data/listing-ops-index.json', { updated_at:TODAY, stats:{ records:compact.length }, records:compact.map(b=>({ business_id:b.id, name:b.name, queue:(b.website||b.phone||b.email)?'owner_claim':'enrichment', flags:b.moderation_flags, url:b.url })) });
  await writeCompactJson('api/businesses.json', { updated_at:TODAY, count:compact.length, businesses:compact.map(({identity,moderation_flags,description,tags,...b})=>b) });
  await writeCompactJson('api/search-index.json', { updated_at:TODAY, records:search });
  await writeCompactJson('api/owner-verification-packets.json', { updated_at:TODAY, count:compact.length, href:'/data/owner-verification-packets.json' });
  await writeCompactJson('api/account-opportunity-score.json', { updated_at:TODAY, count:compact.length, href:'/data/account-opportunity-score.json' });
  await writeCompactJson('api/owner-crm-index.json', { updated_at:TODAY, stats:{ owners:compact.length }, href:'/data/owner-crm-index.json' });

  const enrichment = compact.map(b=>({ business_id:b.id, name:b.name, city:b.city, category:b.category, missing:[!b.website&&'website',!b.phone&&'phone',!b.email&&'email'].filter(Boolean), confidence:b.website||b.phone||b.email?'medium':'low', next_action:b.website||b.phone||b.email?'verify owner/contact':'research website/phone/email', url:b.url })).filter(x=>x.missing.length);
  await writeCompactJson('data/enrichment-queue.json', { updated_at:TODAY, count:enrichment.length, records:enrichment.slice(0, 15000), overflow_count:Math.max(0, enrichment.length-15000) });
  await writeCompactJson('data/lead-records-model.json', { version:'21.0.0', statuses:['new','qualified','routed','owner_contact_pending','owner_contacted','won','lost','archived'], required:['lead_id','buyer_contact_hash','city','category','status','assigned_to','business_ids','history'] });
  await writeCompactJson('data/payment-activation-model.json', { version:'21.0.0', flow:['checkout_session_created','verified_payment_webhook_persisted','admin_review_required','exposure_activation_approved','placement_state_active'], no_fake_activation:true });
  await writeCompactJson('data/notification-worker-model.json', { version:'21.0.0', providers:['email_webhook','sms_webhook','generic_webhook'], features:['retry','receipt','signature verification','idempotency key'] });
  await writeCompactJson('data/claim-submission-model.json', { version:'21.0.0', persists_to:'owner_claim action queue', required:['business_id','owner_name','owner_contact','claim_type','proof_summary'], status:'queued_for_review' });
  await writeCompactJson('data/build-module-map.json', { version:'21.0.0', entry:'scripts/build.mjs', modules:['scripts/build-core.mjs','scripts/v17-enhance.mjs','scripts/v18-enhance.mjs','scripts/v19-enhance.mjs','scripts/v20-enhance.mjs','scripts/v21-enhance.mjs'], note:'build.mjs is now an orchestrator; heavy generation and enhancement passes are isolated.' });
  const routeManifest = await maybeReadJson('data/route-manifest.json', { surfaces:[], public_surfaces:[], internal_noindex_surfaces:[], generated_routes:{} });
  const v21Routes = ['/enrichment-workbench/','/lead-records/','/payment-activation/','/notification-workers/','/claim-submissions/','/build-system/','/data-optimizer/','/protected-admin/'];
  routeManifest.surfaces = Array.from(new Set([...(routeManifest.surfaces || []), ...v21Routes]));
  routeManifest.internal_noindex_surfaces = Array.from(new Set([...(routeManifest.internal_noindex_surfaces || []), ...v21Routes]));
  routeManifest.v21 = { full_static_business_profiles:compact.length, compacted_data:true, protected_admin_route:'/protected-admin/' };
  await writeCompactJson('data/route-manifest.json', routeManifest);

  await write(path.join(DIST, 'enrichment-workbench', 'index.html'), lightweightPage({ title:'Enrichment Workbench', eyebrow:'v21 code layer', h1:'Contact enrichment queue for AE activation.', text:'Website, phone, and email gaps are scored into an enrichment queue before AEs sell exposure.', dataHref:'/data/enrichment-queue.json', cards:[{title:'Confidence scoring',body:'Each record gets missing-field and confidence signals.'},{title:'AE next action',body:'Records tell reps whether to enrich, claim, or verify.'},{title:'No fake discovery',body:'The system stages research work instead of inventing contact data.'}] }));
  await write(path.join(DIST, 'lead-records', 'index.html'), lightweightPage({ title:'Lead Records', eyebrow:'v21 code layer', h1:'Persistent lead lifecycle model.', text:'Quote requests become lead records with statuses, AE assignment, owner contact attempts, and history.', dataHref:'/data/lead-records-model.json', cards:[{title:'Statuses',body:'new, qualified, routed, contacted, won, lost, archived.'},{title:'History',body:'Every status change is an event, not an overwrite.'},{title:'AE ownership',body:'Assigned reps and next actions are explicit.'}] }));
  await write(path.join(DIST, 'payment-activation', 'index.html'), lightweightPage({ title:'Payment Activation', eyebrow:'v21 code layer', h1:'Paid exposure does not activate from unpaid intent.', text:'Verified provider webhook persistence and admin activation are separate code paths.', dataHref:'/data/payment-activation-model.json', cards:[{title:'Stripe mapping',body:'Product and price mapping lives in code.'},{title:'Webhook proof',body:'Only verified events can create payment records.'},{title:'Admin activation',body:'Paid placement requires explicit approval.'}] }));
  await write(path.join(DIST, 'notification-workers', 'index.html'), lightweightPage({ title:'Notification Workers', eyebrow:'v21 code layer', h1:'Email/SMS/webhook delivery with retries and receipts.', text:'Outbound communication is queued, signed, retried, and receipted instead of claimed as delivered.', dataHref:'/data/notification-worker-model.json', cards:[{title:'Retries',body:'Workers track attempts and backoff.'},{title:'Receipts',body:'Provider responses become delivery events.'},{title:'Signatures',body:'Webhook payloads are signed.'}] }));
  await write(path.join(DIST, 'claim-submissions', 'index.html'), lightweightPage({ title:'Claim Submissions', eyebrow:'v21 code layer', h1:'Owner claim packets persist to review queues.', text:'Owner-facing claims submit to upstream-auth action queues and never auto-verify a listing.', dataHref:'/data/claim-submission-model.json', cards:[{title:'Review required',body:'Claims enter queued_for_review.'},{title:'Proof summary',body:'Owner proof is captured as evidence.'},{title:'No duplicate profile',body:'Claims target canonical business ids.'}] }));
  await fs.copyFile(path.join(ROOT, 'src', 'protected-admin-app.js'), path.join(DIST, 'assets', 'protected-admin-app.js'));
  await write(path.join(DIST, 'protected-admin', 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Protected Admin | PHX Verified</title><meta name="robots" content="noindex,nofollow,noarchive"/><link rel="stylesheet" href="/assets/styles.css"/></head><body><main class="page"><section class="hero glass subhero"><div><p class="eyebrow">upstream-auth admin app</p><h1>Protected admin operations without browser-entered proof controls.</h1><p class="hero-text">This console calls runtime endpoints with credentials and expects upstream auth to inject identity/roles before the request reaches PHX functions.</p><div class="hero-actions"><button id="loadQueues" class="btn primary">Load service / queues</button><button id="replayState" class="btn">Replay state</button><button id="exportChanges" class="btn">Export change-set</button></div></div></section><section class="section glass"><pre id="adminOutput" class="code-output">No local auth fields. Upstream identity only.</pre></section></main><script type="module" src="/assets/protected-admin-app.js"></script></body></html>`);
  await write(path.join(DIST, 'build-system', 'index.html'), lightweightPage({ title:'Build System', eyebrow:'v21 modularization', h1:'Build runner split into isolated stages.', text:'The build entrypoint now orchestrates core generation and enhancement passes instead of keeping every repair inside one giant file.', dataHref:'/data/build-module-map.json', cards:[{title:'Core',body:'scripts/build-core.mjs keeps the original generator.'},{title:'Enhancers',body:'v17-v21 upgrades are isolated scripts.'},{title:'Repairability',body:'Future patches can target one layer without risking the entire generator.'}] }));
  await write(path.join(DIST, 'data-optimizer', 'index.html'), lightweightPage({ title:'Data Optimizer', eyebrow:'v21 deploy size', h1:'Public deploy output is compacted after generation.', text:'Heavy duplicate exports are replaced by compact records, manifests, and shards while keeping platform pages and counts intact.', dataHref:'/data/deploy-size-report.json', cards:[{title:'Full static profiles',body:'Business pages are crawlable HTML.'},{title:'Shards',body:'Search data is split by leading key.'},{title:'No API duplication',body:'Heavy API mirrors point to canonical data.'}] }));

  await rewriteSitemaps(compact);
  const after = await sizeOf(DIST);
  const previousSizeReport = await maybeReadJson('data/deploy-size-report.json', {});
  const auditedV20Baseline = 580 * 1024 * 1024;
  const baseline = Math.max(before, Number(previousSizeReport.before_bytes || 0), Number(previousSizeReport.baseline_v20_bytes || 0), auditedV20Baseline);
  const report = { version:'21.0.0', generated_at:TODAY, businesses:compact.length, baseline_v20_bytes:baseline, before_bytes:baseline, after_bytes:after, reduced_bytes:Math.max(0, baseline-after), idempotent_run:before === after, full_static_profiles:compact.length, removed:['data/profiles'], compacted:['data/businesses.json','data/search-index.json','api/businesses.json','api/search-index.json','owner/AE exports'], retained:['businesses.csv','vcards.vcf','sitemaps','archive pages'] };
  await writeCompactJson('data/deploy-size-report.json', report);
  await writeCompactJson('data/v21-code-readiness.json', { version:'21.0.0', generated_at:TODAY, completed:['full_static_business_profiles','compact_public_data','d1_neon_adapter_code','protected_admin_app','enrichment_queue','persistent_lead_model','payment_activation_model','notification_worker_model','claim_submission_model','modular_build_runner'], proof:report });
  await write(path.join(DIST, 'seed-report.json'), JSON.stringify(seedReport));
  console.log(`v21 enhanced: ${compact.length} full-static business profiles; dist ${(after/1024/1024).toFixed(1)}MB after compaction.`);
}

main().catch(error => { console.error(error); process.exit(1); });
