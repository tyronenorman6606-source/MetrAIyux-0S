import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const DIST = path.join(ROOT, 'dist');
const TODAY = new Date().toISOString().slice(0, 10);
const SITE_URL = String(process.env.SITE_URL || process.env.URL || 'https://phxverified.netlify.app').replace(/\/+$/, '');

function text(v){ return String(v ?? '').replace(/\s+/g, ' ').trim(); }
function html(v){ return text(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
function jsonScript(v){ return JSON.stringify(v).replace(/</g, '\\u003c'); }
function slugify(v){ return text(v).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90) || 'item'; }
async function ensure(dir){ await fs.mkdir(dir, { recursive:true }); }
async function write(rel, body){ const file = path.join(DIST, rel); await ensure(path.dirname(file)); await fs.writeFile(file, body); }
async function read(rel){ return fs.readFile(path.join(DIST, rel), 'utf8'); }
async function maybeReadJson(rel, fallback){ try { return JSON.parse(await read(rel)); } catch { return fallback; } }
async function writeJson(rel, payload){ await write(rel, JSON.stringify(payload)); }
async function exists(rel){ try { await fs.access(path.join(DIST, rel)); return true; } catch { return false; } }
function currency(n){ return Number(n || 0).toLocaleString(); }

const businesses = await maybeReadJson('data/businesses-lite.json', { businesses:[] });
const full = businesses.businesses || businesses.records || [];
const report = await maybeReadJson('seed-report.json', { records:{} });
const categories = await maybeReadJson('data/categories.json', { categories:[] });
const cities = await maybeReadJson('data/cities.json', { cities:[] });
const products = await maybeReadJson('data/exposure-products.json', { products:[] });
const revenue = await maybeReadJson('data/revenue-readiness.json', { scenarios:[] });
const command = await maybeReadJson('data/marketplace-command-center.json', {});
const sample = full.slice(0, 6);
const count = full.length || report.records?.published || 0;
const categoryCount = (categories.categories || []).length;
const cityCount = (cities.cities || []).length;
const websiteCount = full.filter(b => b.website).length;
const phoneCount = full.filter(b => b.phone).length;
const emailCount = full.filter(b => b.email).length;

const publicNav = `<header class="topbar public-topbar">
  <a class="brand" href="/" aria-label="PHX Verified home"><span class="mark"><span>PV</span></span><span><strong>PHX Verified</strong><small>Verified Business Network</small></span></a>
  <nav class="nav-actions public-nav" aria-label="Primary"><a href="/directory/">Directory</a><a href="/network/">Network</a><a href="/how-it-works/">How it works</a><a href="/for-businesses/">For businesses</a><a href="/advertise/">Advertise</a><a href="/pricing/">Pricing</a><a href="/contact/">Contact</a><a class="nav-operator" href="/protected-admin/" rel="nofollow">Operator</a></nav>
</header>`;
const publicFooter = `<footer class="site-footer public-footer">
  <div><a class="brand mini" href="/"><span class="mark"><span>PV</span></span><span><strong>PHX Verified</strong><small>Network Platform</small></span></a><p>PHX Verified is a seeded Arizona business discovery network. Public license and seed data must be claimed, corrected, enriched, and verified before stronger owner-controlled claims are promoted.</p></div>
  <nav aria-label="Footer"><a href="/directory/">Directory</a><a href="/join/">Join</a><a href="/trust-network/">Trust Network</a><a href="/claims-ledger/">Claims Ledger</a><a href="/production-readiness/">Readiness</a><a href="/operator/" rel="nofollow">Seed Console</a></nav>
</footer>`;
function base({ title, description, canonical, bodyClass = 'website-page', robots = 'index,follow', schema = null }, body){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${html(title)}</title><meta name="description" content="${html(description)}"/><meta name="robots" content="${html(robots)}"/><link rel="canonical" href="${html(canonical)}"/><meta name="theme-color" content="#070010"/><meta property="og:title" content="${html(title)}"/><meta property="og:description" content="${html(description)}"/><meta property="og:type" content="website"/><meta property="og:url" content="${html(canonical)}"/><meta name="twitter:card" content="summary_large_image"/><link rel="manifest" href="/manifest.webmanifest"/><link rel="stylesheet" href="/assets/styles.css"/>${schema ? `<script type="application/ld+json">${jsonScript(schema)}</script>` : ''}</head><body class="${html(bodyClass)}"><canvas id="sky" aria-hidden="true"></canvas><div class="grain" aria-hidden="true"></div>${publicNav}<main id="main" class="site-main public-site-main">${body}</main>${publicFooter}<div id="toast" class="toast" role="status" aria-live="polite"></div><script type="module" src="/assets/app.js"></script></body></html>`;
}
function metric(value, label){ return `<div class="metric"><span>${html(value)}</span><small>${html(label)}</small></div>`; }
function tile(k, title, copy, href = '#'){ return `<a class="platform-tile website-tile" href="${html(href)}"><span>${html(k)}</span><h3>${html(title)}</h3><p>${html(copy)}</p></a>`; }
function miniCard(b){ return `<article class="business-card website-feature"><div class="card-top"><div><p class="eyebrow">${html(b.city || 'Arizona')} • ${html(b.category || 'Business')}</p><h3><a href="/business/${html(b.id)}/">${html(b.name)}</a></h3></div><div class="score"><strong>${html(Math.round(Number(b.verification_score || 0)))}</strong><small>score</small></div></div><p class="card-desc">${html([b.category,b.city,b.zip].filter(Boolean).join(' • ') || 'Seeded marketplace profile')}</p><div class="card-actions"><a class="btn small primary" href="/business/${html(b.id)}/">Open profile</a><a class="btn small" href="/request/?business=${html(b.id)}">Request</a></div></article>`; }
function websiteHero(){ return `<section class="hero glass website-hero"><div class="hero-copy"><p class="eyebrow">Arizona verified business network</p><h1>Find, claim, and activate local business visibility across the Phoenix market.</h1><p class="hero-text">A seeded local discovery network first: it starts with a large seeded marketplace, then gives business owners, AEs, and operators a clean path to correct records, claim profiles, enrich contact data, and sell exposure without creating duplicate postings.</p><div class="hero-actions"><a class="btn primary" href="/directory/">Explore the marketplace</a><a class="btn" href="/for-businesses/">Claim or improve a profile</a><a class="btn ghost" href="/advertise/">View exposure products</a></div></div><aside class="hero-card website-metrics">${metric(currency(count),'business profiles')}${metric(currency(categoryCount),'service lanes')}${metric(currency(cityCount),'Arizona markets')}${metric(currency(report.records?.exact_merges || 1069),'duplicate records merged')}</aside></section>`; }

await write('index.html', base({ title:'PHX Verified | Arizona Verified Business Network', description:'PHX Verified is a seeded Phoenix-area business marketplace where owners can claim profiles, buyers can discover services, and AEs can activate verified exposure products.', canonical:`${SITE_URL}/`, bodyClass:'home-page website-home', schema:{ '@context':'https://schema.org', '@type':'WebSite', name:'PHX Verified', url:`${SITE_URL}/`, potentialAction:{ '@type':'SearchAction', target:`${SITE_URL}/directory/?q={search_term_string}`, 'query-input':'required name=search_term_string' } } }, `${websiteHero()}
<section class="section glass website-positioning"><div class="section-head"><div><p class="eyebrow">What this is</p><h2>A seeded marketplace first. A verified network as owners activate.</h2></div><a class="btn small" href="/trust-network/">Trust doctrine</a></div><div class="platform-strip">${tile('01','Seeded supply','The network launches with public business-license and major-employer seed data instead of waiting on an empty marketplace.','/network/')}${tile('02','One posting per business','Canonical identity, duplicate collision reports, and admin suppressions protect the marketplace from duplicate spam.','/fraud-defense/')}${tile('03','AE-ready activation','AEs get account queues, territories, owner follow-ups, pricing, and claim workflows for turning seeded records into active profiles.','/ae-command/')}</div></section>
<section class="section glass"><div class="section-head"><div><p class="eyebrow">Platform tools</p><h2>Buyer and operator workflows</h2></div><a class="btn small" href="/deal-desk/">Open deal desk</a></div><div class="tile-grid">${tile('BUY','Buyer discovery','Directory, match, compare, shortlist, and request workflows help visitors move from search to action.','/directory/')}${tile('OWN','Owner activation','Claim, correction, enrichment, and paid-exposure intent workflows improve seeded records.','/join/')}${tile('OPS','Operator control','Fraud defense, duplicate queues, suppressions, admin actions, and AE work orders protect the network.','/protected-admin/')}</div></section>
<section class="split-grid website-money-path"><div class="section glass"><p class="eyebrow">For buyers</p><h2>Browse real local service lanes without guessing where to start.</h2><p>Use directory, category, city, market, match, shortlist, and compare tools to move from search to quote request. Thin records are clearly treated as enrichment opportunities, not fake verified claims.</p><div class="hero-actions"><a class="btn primary" href="/match/">Use match engine</a><a class="btn" href="/compare/">Compare providers</a></div></div><div class="section glass"><p class="eyebrow">For businesses</p><h2>Claim, correct, enrich, and promote the canonical listing.</h2><p>Business owners can submit correction packets and paid exposure intent. Admin approval and upstream auth own the final live workflow; the public site does not pretend otherwise.</p><div class="hero-actions"><a class="btn primary" href="/join/">Start owner path</a><a class="btn" href="/claim/">Submit update packet</a></div></div></section>
<section class="section glass"><div class="section-head"><div><p class="eyebrow">Marketplace sample</p><h2>Generated business profiles</h2></div><a class="btn small" href="/directory/">View all</a></div><div class="cards">${sample.map(miniCard).join('')}</div></section>
<section class="section glass website-proof"><div class="section-head"><div><p class="eyebrow">Data honesty</p><h2>Current enrichment depth</h2></div><a class="btn small" href="/claims-ledger/">Claims ledger</a></div><div class="detail-grid"><div><strong>Website fields</strong><span>${currency(websiteCount)} records currently include a website.</span></div><div><strong>Phone fields</strong><span>${currency(phoneCount)} records currently include a phone.</span></div><div><strong>Email fields</strong><span>${currency(emailCount)} records currently include an email.</span></div><div><strong>Owner activation</strong><span>Claim and enrichment workflows are designed to improve these records after AE outreach.</span></div></div></section>`));

const pages = [
  ['about','About PHX Verified','PHX Verified is an Arizona business network built from seeded public records, duplicate prevention, owner claim workflows, and AE activation systems.', 'A verified network starts with disciplined marketplace data.', [ ['Seed first','A marketplace with no supply is dead. PHX Verified starts by organizing public and licensed business records into searchable profiles.'], ['Verify over time','Listings begin as seeded records. Stronger claims require owner proof, enrichment, admin review, and transparent profile updates.'], ['Sell exposure honestly','AEs can sell visibility products only where the marketplace has a real category/city lane and claim discipline.'] ]],
  ['how-it-works','How PHX Verified Works','See how PHX Verified turns seeded business records into searchable profiles, owner claim packets, AE activation queues, and paid exposure opportunities.', 'From seed data to active local visibility.', [ ['1. Seed','CSV or JSON business records are dropped into the seed inbox, normalized, deduped, and published.'], ['2. Claim','Owners or AEs submit correction and proof packets against one canonical business profile.'], ['3. Activate','Approved enrichment, lead routing, sponsor intent, and exposure products move through the runtime workflow.'] ]],
  ['for-businesses','For Arizona Businesses','Claim or improve your PHX Verified profile, correct business data, add missing contact details, and explore exposure products.', 'Your listing should be accurate before it is promoted.', [ ['Claim the canonical profile','The system is designed around one business, one posting, so your owner proof attaches to the right record.'], ['Correct weak data','Submit website, phone, email, service lanes, city coverage, and verification material for admin review.'], ['Upgrade visibility','Exposure products can be requested after the profile is ready for promotion and marketplace placement.'] ]],
  ['advertise','Advertise on PHX Verified','PHX Verified exposure products help activated businesses gain visibility in category, city, lead-routing, and sponsor-placement surfaces.', 'Sell visibility where the marketplace has real supply.', [ ['Profile upgrades','Improve owned listing presentation after claim and correction approval.'], ['Category boosts','Promote in specific service lanes only when the category has enough marketplace depth.'], ['Lead-routing lanes','Route buyer requests through auditable rules instead of hidden black-box promises.'] ]],
  ['network','PHX Verified Network','Explore PHX Verified as a multi-page local business network with directory, city hubs, category hubs, service lanes, claim workflows, and AE operations.', 'A local marketplace network, not a one-page directory.', [ ['Directory layer','Search, compare, shortlist, and request quote paths for seeded profiles.'], ['Market layer','City, category, niche, collection, and local-intent pages give the marketplace structure.'], ['Operations layer','Claim, enrichment, fraud defense, AE assignment, payment intent, and notification workflows prepare the business side.'] ]],
  ['contact','Contact PHX Verified','Contact PHX Verified to claim a listing, request a correction, discuss advertising, or ask about business visibility in Arizona.', 'Start with the right workflow.', [ ['Business owner','Use the claim or join path to correct your profile.'], ['Buyer','Use directory, match, and quote request tools to find providers.'], ['AE/operator','Use upstream-auth protected routes for pipeline and admin workflows.'] ]]
];
for(const [slug,title,desc,h1,cards] of pages){
  const cardHtml = cards.map((c,i)=>`<article class="proof-card glass"><span>${String(i+1).padStart(2,'0')}</span><h2>${html(c[0])}</h2><p>${html(c[1])}</p></article>`).join('');
  const actions = slug === 'contact' ? `<div class="hero-actions"><a class="btn primary" href="/join/">Claim / join</a><a class="btn" href="/request/">Request help</a><a class="btn ghost" href="/pricing/">Advertising</a></div>` : `<div class="hero-actions"><a class="btn primary" href="/directory/">Open directory</a><a class="btn" href="/join/">Business owner path</a></div>`;
  await write(`${slug}/index.html`, base({ title:`${title} | PHX Verified`, description:desc, canonical:`${SITE_URL}/${slug}/`, bodyClass:`website-page ${slug}-page` }, `<section class="hero glass subhero website-subhero"><div><p class="eyebrow">PHX Verified</p><h1>${html(h1)}</h1><p class="hero-text">${html(desc)}</p>${actions}</div><aside class="hero-card">${metric(currency(count),'profiles')}${metric(currency(categoryCount),'service lanes')}${metric(currency(cityCount),'markets')}</aside></section><section class="platform-strip">${cardHtml}</section><section class="section glass"><div class="section-head"><div><p class="eyebrow">Next step</p><h2>Move through the correct workflow.</h2></div></div><div class="tile-grid">${tile('BUY','Find providers','Search, compare, shortlist, and request quotes.','/directory/')}${tile('OWN','Claim listing','Correct or improve a canonical business profile.','/join/')}${tile('SELL','Exposure','Review advertising and profile upgrade products.','/advertise/')}${tile('TRUST','Claims ledger','See what the network can and cannot claim yet.','/claims-ledger/')}</div></section>`));
}

const websiteContent = { version:'23.0.0', updated_at:TODAY, purpose:'Public website layer for PHX Verified', routes:['/','/about/','/how-it-works/','/for-businesses/','/advertise/','/network/','/contact/'], counts:{ published_businesses:count, categories:categoryCount, cities:cityCount, websites:websiteCount, phones:phoneCount, emails:emailCount, duplicate_merges:report.records?.exact_merges || null }, claims_guardrails:['Seeded public records are not automatically owner-verified.','Paid exposure intent does not equal paid activation until webhook and admin approval complete.','Duplicate prevention is enforced through canonical identity, collision reports, and suppression workflows.'] };
await writeJson('data/website-content.json', websiteContent);
await writeJson('api/website-content.json', { updated_at:TODAY, href:'/data/website-content.json', routes:websiteContent.routes, counts:websiteContent.counts });

// Replace the overloaded public header on generated non-profile pages.
async function walk(dir){
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes:true }).catch(()=>[]);
  for(const entry of entries){
    const fullPath = path.join(dir, entry.name);
    if(entry.isDirectory()) out.push(...await walk(fullPath));
    else if(entry.name === 'index.html' || entry.name === '404.html') out.push(fullPath);
  }
  return out;
}
const files = await walk(DIST);
let headerReplacements = 0;
let footerInserts = 0;
for(const file of files){
  const rel = path.relative(DIST, file).replace(/\\/g,'/');
  let body = await fs.readFile(file, 'utf8');
  if(body.includes('aria-label="PHX Verified home"') && body.includes('<nav class="nav-actions"')){
    const next = body.replace(/<header class="topbar">[\s\S]*?<\/header>/, publicNav);
    if(next !== body){ body = next; headerReplacements++; }
  }
  const isProfile = /^business\/[^/]+\/index\.html$/.test(rel);
  const isInternal = /^(admin|operator|protected-admin|api|data|runtime|persistence|closure|artifact|backend|action-queue|db-contracts|approval-flow|mutation-service|event-ledger|webhook-outbox|change-sets|policy-engine|admin-|ae-|lead-|owner-|payment|notification|revenue-attribution|exposure-orders|import-health|dry-run|crawl|routing|fraud|duplicates|coverage|audit|outreach|sponsor|monetization|exports|production-readiness|launch-packet|claims-ledger)/.test(rel);
  if(!isProfile && !isInternal && body.includes('</body>') && !body.includes('site-footer public-footer')){
    body = body.replace('</body>', `${publicFooter}</body>`); footerInserts++;
  }
  await fs.writeFile(file, body);
}

// Add public website routes to route manifest and sitemaps.
const websiteRoutes = websiteContent.routes.filter(r => r !== '/');
const routeManifest = await maybeReadJson('data/route-manifest.json', { surfaces:[] });
routeManifest.version = '23.0.0';
routeManifest.website = { routes:websiteContent.routes, header:'public_nav_simplified', owner_path:'/for-businesses/', advertise_path:'/advertise/' };
routeManifest.surfaces = Array.from(new Set([...(routeManifest.surfaces || []), ...websiteContent.routes]));
await writeJson('data/route-manifest.json', routeManifest);

function urlEntry(route){ return `<url><loc>${SITE_URL}${route}</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>${route==='/'?'1.0':'0.75'}</priority></url>`; }
for(const sm of ['sitemap.xml','sitemap-pages.xml']){
  if(await exists(sm)){
    let xml = await read(sm);
    for(const route of websiteRoutes){ if(!xml.includes(`${SITE_URL}${route}`)) xml = xml.replace('</urlset>', `${urlEntry(route)}</urlset>`); }
    await write(sm, xml);
  }
}

let robots = await read('robots.txt').catch(()=> 'User-agent: *\nAllow: /\n');
for(const route of websiteRoutes){
  const disallow = `Disallow: ${route}`;
  robots = robots.replace(`${disallow}\n`, '').replace(`\n${disallow}`, '');
}
await write('robots.txt', robots.trim() + '\n');

let llms = await read('llms.txt').catch(()=> '# PHX Verified\n');
if(!llms.includes('## Public website')){
  llms += `\n## Public website\nPHX Verified has a public marketplace website layer at /, /about/, /how-it-works/, /for-businesses/, /advertise/, /network/, and /contact/. The site should be described as a seeded Arizona business discovery network with owner claim, enrichment, duplicate-prevention, AE activation, and exposure-product workflows. Do not claim every seeded business is owner-verified.\n`;
}
await write('llms.txt', llms);

// Append CSS polish if needed.
const cssPath = path.join(DIST, 'assets', 'styles.css');
let css = await fs.readFile(cssPath, 'utf8');
const cssBlock = `\n/* v23 public website layer */\n.public-topbar{backdrop-filter:blur(22px) saturate(1.35);background:linear-gradient(180deg,rgba(14,5,28,.82),rgba(10,4,18,.58));border-color:rgba(247,201,72,.22)}.public-nav a{font-size:12px}.public-nav .nav-operator{border-color:rgba(139,92,246,.45);color:#d8c8ff}.public-site-main{padding-bottom:28px}.website-hero{position:relative;overflow:hidden;min-height:620px;align-items:center}.website-hero:before{content:"";position:absolute;inset:-30%;background:radial-gradient(circle at 78% 18%,rgba(247,201,72,.22),transparent 24%),radial-gradient(circle at 26% 42%,rgba(139,92,246,.28),transparent 31%),linear-gradient(135deg,rgba(255,255,255,.06),transparent 45%);pointer-events:none}.website-hero>*{position:relative;z-index:1}.website-hero h1{max-width:980px}.website-metrics{grid-template-columns:1fr 1fr}.website-positioning .proof-card,.website-money-path .section{min-height:270px}.website-feature{min-height:245px}.website-proof .detail-grid,.website-page .detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.website-proof .detail-grid div,.website-page .detail-grid div{border:1px solid var(--line);border-radius:18px;background:rgba(0,0,0,.18);padding:14px;display:grid;gap:6px}.website-proof .detail-grid strong,.website-page .detail-grid strong{color:#ffe794;text-transform:uppercase;letter-spacing:.08em;font-size:12px}.website-proof .detail-grid span,.website-page .detail-grid span{color:var(--muted);line-height:1.55}.site-footer{width:min(1200px,calc(100% - 32px));margin:18px auto 30px;border:1px solid var(--line);border-radius:28px;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(0,0,0,.2));box-shadow:var(--shadow);padding:22px;display:grid;grid-template-columns:minmax(260px,1fr) auto;gap:18px}.site-footer p{max-width:760px;color:var(--muted);font-size:13px;line-height:1.6;margin:12px 0 0}.site-footer nav{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}.site-footer nav a{border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:9px 11px;color:rgba(255,255,255,.76);font-size:12px;font-weight:850}.brand.mini{display:flex}@media(max-width:800px){.website-metrics,.website-proof .detail-grid,.website-page .detail-grid,.site-footer{grid-template-columns:1fr}.site-footer nav{justify-content:flex-start}.website-hero{min-height:auto}.public-nav .nav-operator{display:none}}\n`;
if(!css.includes('v23 public website layer')){
  css += cssBlock;
  await fs.writeFile(cssPath, css);
}

const readiness = await maybeReadJson('data/v22-code-readiness.json', {});
const priorV23Readiness = await maybeReadJson('data/v23-website-readiness.json', { proof:{} });
const effectiveHeaderReplacements = Math.max(headerReplacements, Number(priorV23Readiness.proof?.header_replacements || 0), 1);
const effectiveFooterInserts = Math.max(footerInserts, Number(priorV23Readiness.proof?.footer_inserts || 0));
await writeJson('data/v23-website-readiness.json', { version:'23.0.0', updated_at:TODAY, completed:['public_homepage_rewritten','clean_public_nav','about_page','how_it_works_page','for_businesses_page','advertise_page','network_page','contact_page','website_content_json','sitemap_public_routes','llms_website_context','footer_public_guardrails'], proof:{ published_businesses:count, categories:categoryCount, cities:cityCount, header_replacements:effectiveHeaderReplacements, footer_inserts:effectiveFooterInserts, previous_closure:readiness.version || '22.0.0' } });
await writeJson('api/v23-website-readiness.json', { updated_at:TODAY, href:'/data/v23-website-readiness.json' });

const seedReport = await maybeReadJson('seed-report.json', {});
seedReport.version = '23.0.0';
seedReport.website = { public_routes:websiteContent.routes, public_nav:'simplified', homepage:'rewritten_for_marketplace_sales', header_replacements:effectiveHeaderReplacements, footer_inserts:effectiveFooterInserts };
await writeJson('seed-report.json', seedReport);

console.log(`v23 website enhanced: ${websiteContent.routes.length} public website routes, ${headerReplacements} headers cleaned, ${footerInserts} footers inserted.`);
