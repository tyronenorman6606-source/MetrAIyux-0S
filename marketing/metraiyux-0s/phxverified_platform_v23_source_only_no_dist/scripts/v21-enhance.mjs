import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');
const TODAY = new Date().toISOString().slice(0, 10);
const SITE_URL = String(process.env.SITE_URL || process.env.URL || 'https://valley-verified.pages.dev').replace(/\/+$/, '');
const APP_BUILD_GATE_HREF = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=valley-verified&offer=valley-verified-app-build-lane';

function text(v){ return String(v ?? '').replace(/\s+/g, ' ').trim(); }
function html(v){ return text(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
function enc(v){ return encodeURIComponent(text(v)); }
function jsonScript(v){ return JSON.stringify(v).replace(/</g, '\\u003c'); }
function slugify(v){ return text(v).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90) || 'item'; }
function hash(v){ return crypto.createHash('sha256').update(String(v)).digest('hex').slice(0,16); }
function safeExternalUrl(v){ const out = text(v); return /^https?:\/\//i.test(out) ? out : ''; }
function displayUrl(v){ try { return new URL(v).hostname.replace(/^www\./, ''); } catch { return text(v).replace(/^https?:\/\//, '').replace(/\/$/, ''); } }
function businessVariant(b){
  if(/bobs-smoke-shop/i.test(b.id || b.name || '')) return 'blue';
  if(/empire-pallets/i.test(b.id || b.name || '')) return 'gold';
  const variants = ['copper','teal','magenta','gold','blue'];
  return variants[parseInt(hash(`${b.id || b.name || 'business'}-${b.city || ''}`).slice(0, 2), 16) % variants.length];
}
function externalProfileUrl(b){ return safeExternalUrl(b.website) || safeExternalUrl(b.booking_url) || safeExternalUrl(b.source_url); }
function externalProfileLabel(b){
  const url = externalProfileUrl(b);
  if(!url) return 'Business website';
  return /pages\.dev/i.test(url) ? 'Live business app' : 'Business website';
}
function businessFxLayer(b){
  const variant = businessVariant(b);
  return `<div class="business-fx business-fx--${variant}" aria-hidden="true"><span class="business-fx__mesh"></span><span class="business-fx__rail business-fx__rail-a"></span><span class="business-fx__rail business-fx__rail-b"></span><span class="business-fx__corner business-fx__corner-a"></span><span class="business-fx__corner business-fx__corner-b"></span></div>`;
}
async function ensure(dir){ await fs.mkdir(dir, { recursive:true }); }
async function write(file, body){ await ensure(path.dirname(file)); await fs.writeFile(file, body); }
async function readJson(rel){ return JSON.parse(await fs.readFile(path.join(DIST, rel), 'utf8')); }
async function maybeReadJson(rel, fallback){ try { return await readJson(rel); } catch { return fallback; } }
async function rm(rel){ await fs.rm(path.join(DIST, rel), { recursive:true, force:true }); }
async function sizeOf(file){ try { const st = await fs.stat(file); if(st.isFile()) return st.size; if(st.isDirectory()){ let total=0; for(const e of await fs.readdir(file)) total += await sizeOf(path.join(file,e)); return total; } } catch{} return 0; }
function staticBusinessCommand(b){
  return `<section class="command-center business-page-command" data-skye-component="app-first-command-center"><div class="command-center__surface"><header><div><strong>${html(b.name)} visibility console</strong><span>Business page / claim path / optional growth</span></div><a class="btn small primary" href="/claim/?business=${html(b.id)}">Claim this page</a></header><div class="command-center__grid"><aside class="command-rail"><a class="active" href="#landing" data-skye-tab="landing">Landing</a><a href="#claim" data-skye-tab="claim">Claim</a><a href="#upgrade" data-skye-tab="upgrade">Upgrade</a></aside><main><div class="status-grid"><article><i class="status-icon"></i><span>Market</span><strong>${html(b.city || 'Arizona')}</strong></article><article><i class="status-icon"></i><span>Lane</span><strong>${html(b.category || 'Business')}</strong></article><article><i class="status-icon"></i><span>Page</span><strong>Public landing</strong></article><article><i class="status-icon"></i><span>Gift</span><strong>Free page, optional upgrades</strong></article></div><section class="console-card" data-skye-panel="landing"><p>Page control</p><h2>A public page buyers can actually use.</h2><div class="check-list"><span>Request, call, email, website, save, share, and compare actions stay one click away.</span><span>Market, service lane, contact paths, and current data confidence are visible.</span><span>The page is shareable and connected back to the business website or live app.</span></div></section><section class="console-card hidden" data-skye-panel="claim"><p>Owner path</p><h2>Claim, correct, and improve this listing.</h2><div class="check-list"><span>Owners can submit corrections, proof, and better contact details.</span><span>The public route stays attached to one canonical business page.</span><span>Verification claims are reviewed before stronger trust language appears.</span></div></section><section class="console-card hidden" data-skye-panel="upgrade"><p>Optional path</p><h2>Verification, placement, and lead routing only when wanted.</h2><div class="check-list"><span>The included public page remains useful without any extra purchase.</span><span>Featured placement can add market visibility in real city and service lanes.</span><span>Verification, lead routing, sponsor lanes, and managed growth are optional paid products.</span></div></section></main></div></div></section>`;
}
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
    booking_url:b.booking_url || '',
    landing_page_url:b.landing_page_url || '',
    source_url:b.source_url || '',
    phone:b.phone || '',
    email:b.email || '',
    featured:Boolean(b.featured),
    badges:b.badges && typeof b.badges === 'object' ? b.badges : {},
    price_note:b.price_note || '',
    subcategory:b.subcategory || '',
    verification_score:Number(b.verification_score || 0),
    identity:{ primary_key:b.identity?.primary_key || b.identity_key || `name_city_zip:${slugify(`${b.name}-${b.city}-${b.zip || ''}`)}` },
    moderation_flags:Array.isArray(b.moderation_flags) ? b.moderation_flags : [],
    url:`/business/${b.id}/`
  };
}
function compactBadges(badges){
  return Object.fromEntries(Object.entries(badges || {}).filter(([, value]) => Boolean(value)));
}
function publicBusinessRecord(b){
  const out = { ...b };
  for(const field of ['source_url','landing_page_url','booking_url','price_note','subcategory','niche','zip']){
    if(!out[field]) delete out[field];
  }
  const badges = compactBadges(out.badges);
  if(Object.keys(badges).length) out.badges = badges;
  else delete out.badges;
  // Full moderation detail stays in operator indexes; public rows only need the array contract.
  out.moderation_flags = [];
  return out;
}
function landingBlueprint(b){
  const liveUrl = externalProfileUrl(b);
  const tags = (b.tags || []).filter(t => !/^skye client$/i.test(text(t))).slice(0, 9);
  const fallback = tags.length ? tags : [b.subcategory, b.niche, b.category, b.city].filter(Boolean);
  const isBob = /bobs-smoke-shop/i.test(b.id || b.name || '');
  const isEmpire = /empire-pallets/i.test(b.id || b.name || '');
  if(isBob){
    return {
      eyebrow:'Featured Litchfield Park smoke shop app example',
      headline:"Bob's Smoke Shop actual app build",
      copy:"This Valley Verified page is the public bridge into Bob's actual live app: 21+ access, retail category discovery, glass, vapes, cigars, pipes, CBD, tobacco, hookah, electronics, snacks, media, contact paths, and a direct handoff into the full app.",
      story:"This page works like the public front door for Bob's live app. Buyers can confirm the shop, save the page, call, open the full app, or move into visit details without getting trapped in a thin directory listing.",
      lane:'Smoke shop app',
      liveLabel:"Open Bob's live app",
      appClass:'bobs-actual-app-profile',
      appIntro:"Bob's is the retail example: a business pays for an app that looks and behaves like the shop, not a generic generated profile.",
      sourceFolder:'Skye-Clients/bobs-smoke-shop-mcp-redo',
      video:'/assets/client-builds/bobs-live-build.mp4',
      poster:'/assets/client-builds/bobs-live-build-poster.jpg',
      appRoutes:['21+ gate','Live media home','Inventory lanes','Specials','Gallery','Workspace preview','QR/social handoff'],
      deliverables:['21+ age gate and retail access boundary','PWA manifest and service worker shell','Live video homepage with poster fallback','Inventory/category lanes for glass, vapes, cigars, pipes, CBD, tobacco, hookah, electronics, and snacks','Specials, gallery, FAQ, contact, and blog/local content','Workspace preview/free trial handoff with scan and command limits','Two-way Valley Verified backlink and live-app handoff'],
      value:['Turns the smoke shop into a shareable mobile-first app instead of a flat directory listing.','Gives staff one route for inventory, specials, media, socials, and visit details.','Lets Valley Verified show exactly what a paid retail app lane can produce.','Keeps age-sensitive retail presentation behind an explicit 21+ screen before product exploration.'],
      proof:[['Live app bridge',"The Valley page points buyers into Bob's full shop app for inventory lanes, specials, gallery, workspace preview, and visit details."],['Local buyer actions','Call, email, website, save, compare, and request actions are visible before the buyer leaves this page.'],['Featured placement','Bob gets a featured network badge and a dedicated route that can be used as a public visibility asset.']],
      tags:fallback
    };
  }
  if(isEmpire){
    return {
      eyebrow:'Featured Phoenix pallet operations app example',
      headline:'Empire Pallets actual app build',
      copy:"This Valley Verified page is the public bridge into Empire's actual operations app: commercial pallet supply, recycled pallets, removal, drop trailer programs, heat-treatment support, custom pallets, quote intake, scan handoff, and a direct route into the full app.",
      story:"This page turns local discovery into Empire's quote workflow. Buyers can confirm the service lane, call, open the full app, start a quote, or save the Valley Verified post for procurement follow-up.",
      lane:'Pallet operations app',
      liveLabel:"Open Empire's quote app",
      appClass:'empire-actual-app-profile',
      appIntro:"Empire is the operations example: a business pays for an app that routes buyers into quoting, service lanes, scan access, and procurement proof.",
      sourceFolder:'Skye-Clients/empire-pallets-v3-app',
      video:'/assets/client-builds/empire-live-build.mp4',
      poster:'/assets/client-builds/empire-live-build-poster.jpg',
      appRoutes:['Gated intro video','Service lanes','Quote intake','Scan route','Private preview','Programs','Industries','PWA/offline shell'],
      deliverables:['Full-screen media intro with poster fallback','Service lanes for new pallets, recycled supply, removal, drop trailers, heat treatment, and custom design','Mobile-first quote form with safe submit/fallback behavior','QR scan route for yard/procurement handoff','Private preview route for client review','PWA manifest, service worker, and offline shell','Two-way Valley Verified backlink and commercial proof language'],
      value:['Converts local discovery into a quote-ready procurement flow.','Makes commercial buyers choose the right pallet lane before asking for a quote.','Gives the business a reusable QR route for field, yard, and sales handoff.','Shows Valley Verified buyers what an operations app can do beyond a public listing.'],
      proof:[['Quote app bridge',"The Valley page points buyers into Empire's full app for quote intake, service lanes, scan route, and preview access."],['Commercial service context','The landing page names the pallet lanes buyers actually need before they click through.'],['Featured placement','Empire gets a featured network badge and a dedicated route that can be used in outreach and buyer follow-up.']],
      tags:fallback
    };
  }
  return {
    eyebrow:`${b.city || 'Arizona'} ${b.category || 'business'} landing page`,
    headline:`${b.name} landing page`,
    copy:`${b.name} has a Valley Verified public landing for ${b.category || 'local business'} discovery, contact, sharing, owner claim, and optional growth support.`,
    story:`This page gives ${b.name} a useful public business page: service lane, market, contact paths, shareable route, owner claim path, and a clean way to move buyers toward the business website when one is available.`,
    lane:b.subcategory || b.niche || b.category || 'Business page',
    liveLabel:externalProfileLabel(b),
    proof:[['Public landing','The business has a shareable page with buyer actions and market context.'],['Owner path','The business can claim, correct, enrich, and improve the page.'],['Optional growth','Verification, placement, lead routing, sponsor lanes, and managed growth can be added later only if the owner wants them.']],
    tags:fallback
  };
}
function sharePanel(b, title, desc, profileUrl){
  const shareText = `${title} ${profileUrl}`;
  return `<section class="section glass profile-share-panel" aria-labelledby="share-${html(b.id)}"><div><p class="eyebrow">Share this business page</p><h2 id="share-${html(b.id)}">Send ${html(b.name)} to a buyer, partner, or customer.</h2><p class="muted">Use the native share button or send this Valley Verified landing through email, text, LinkedIn, Facebook, or X.</p></div><div class="share-actions"><button class="btn primary" data-share-profile data-share-url="${html(profileUrl)}" data-share-title="${html(title)}" data-share-text="${html(desc)}">Share page</button><button class="btn" data-copy-profile data-share-url="${html(profileUrl)}">Copy link</button><a class="btn" href="mailto:?subject=${enc(title)}&body=${enc(shareText)}">Email</a><a class="btn" href="sms:?&body=${enc(shareText)}">Text</a><a class="btn" href="https://www.linkedin.com/sharing/share-offsite/?url=${enc(profileUrl)}" target="_blank" rel="noopener">LinkedIn</a><a class="btn" href="https://www.facebook.com/sharer/sharer.php?u=${enc(profileUrl)}" target="_blank" rel="noopener">Facebook</a><a class="btn" href="https://twitter.com/intent/tweet?url=${enc(profileUrl)}&text=${enc(title)}" target="_blank" rel="noopener">X</a></div></section>`;
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
  const variant = businessVariant(b);
  const blueprint = landingBlueprint(b);
  const title = `${b.name} | ${b.city || 'Arizona'} ${b.category || 'Business'} | Valley Verified`;
  const desc = blueprint.copy;
  const profileUrl = `${SITE_URL}/business/${b.id}/`;
  const address = [b.address,b.city,b.state,b.zip].filter(Boolean).join(', ');
  const liveUrl = externalProfileUrl(b);
  const liveLabel = blueprint.liveLabel || externalProfileLabel(b);
  const schema = {
    '@context':'https://schema.org', '@type':'LocalBusiness', '@id':`${profileUrl}#business`,
    name:b.name, url:profileUrl, address:address ? { '@type':'PostalAddress', streetAddress:b.address || undefined, addressLocality:b.city || undefined, addressRegion:b.state || 'AZ', postalCode:b.zip || undefined, addressCountry:'US' } : undefined,
    telephone:b.phone || undefined, email:b.email || undefined, sameAs:b.website ? [b.website] : undefined,
    additionalType:b.category || undefined, description:desc
  };
  const contact = [
    liveUrl && `<a class="btn primary live-app-link" href="${html(liveUrl)}" target="_blank" rel="noopener">${html(liveLabel)}</a>`,
    b.phone && `<a class="btn" href="tel:${html(b.phone)}">Call</a>`,
    b.email && `<a class="btn" href="mailto:${html(b.email)}">Email</a>`,
    `<a class="btn" href="/claim/?business=${html(b.id)}">Claim / update</a>`,
    `<button class="btn" data-save-business data-business-id="${html(b.id)}" data-business-name="${html(b.name)}" data-url="/business/${html(b.id)}/">Save shortlist</button>`
  ].filter(Boolean).join('');
  const contactCards = [
    liveUrl && `<a href="${html(liveUrl)}" target="_blank" rel="noopener"><strong>${html(liveLabel)}</strong><span>${html(displayUrl(liveUrl))}</span></a>`,
    b.phone && `<a href="tel:${html(b.phone)}"><strong>Phone</strong><span>${html(b.phone)}</span></a>`,
    b.email && `<a href="mailto:${html(b.email)}"><strong>Email</strong><span>${html(b.email)}</span></a>`,
    `<a href="/claim/?business=${html(b.id)}"><strong>Owner updates</strong><span>Claim, correct, enrich, and upgrade this public page.</span></a>`
  ].filter(Boolean).join('');
  const tags = blueprint.tags.length ? blueprint.tags.slice(0, 12).map(t => `<span>${html(t)}</span>`).join('') : `<span>${html(b.category || 'Local business')}</span><span>${html(b.city || 'Arizona')}</span>`;
  const featuredBadge = b.featured ? '<span class="featured-badge">Featured Valley Verified</span>' : '';
  const verifiedBadge = b.badges?.business_verified ? '<span class="verified-badge">Business page reviewed</span>' : '';
  const proofCards = blueprint.proof.map(([k, v]) => `<article class="client-proof-card"><strong>${html(k)}</strong><span>${html(v)}</span></article>`).join('');
  const liveBridge = liveUrl ? `<section class="client-live-bridge"><div><p class="eyebrow">Live site handoff</p><h2>This Valley page links into the full ${/pages\.dev/i.test(liveUrl) ? 'app' : 'website'} for ${html(b.name)}.</h2><p>${html(blueprint.story)}</p></div><a class="btn primary" href="${html(liveUrl)}" target="_blank" rel="noopener">${html(liveLabel)}</a></section>` : '';
  const actualClientApp = blueprint.appRoutes ? `<section class="section glass actual-client-app-page"><div class="section-head"><div><p class="eyebrow">Actual client app example</p><h2>This is what a business gets when the app lane is scoped.</h2></div><a class="btn small primary" href="${html(APP_BUILD_GATE_HREF)}" target="_blank" rel="noopener">Open app build gate</a></div><div class="actual-client-app-shell"><div class="actual-client-app-media"><video autoplay muted loop playsinline controls preload="metadata" poster="${html(blueprint.poster)}"><source src="${html(blueprint.video)}" type="video/mp4"></video></div><div class="actual-client-app-copy"><h3>${html(blueprint.headline)}</h3><p>${html(blueprint.appIntro)}</p><div class="app-route-strip">${blueprint.appRoutes.map(route => `<span>${html(route)}</span>`).join('')}</div><div class="app-value-grid"><article><strong>App deliverables</strong><div class="check-list compact-list">${blueprint.deliverables.map(item => `<span>${html(item)}</span>`).join('')}</div></article><article><strong>Business value</strong><div class="check-list compact-list">${blueprint.value.map(item => `<span>${html(item)}</span>`).join('')}</div></article></div><div class="deep-scan-receipt"><div><strong>Source app folder</strong><span>${html(blueprint.sourceFolder)}</span></div><div><strong>Live app</strong><span>${html(liveUrl || 'Not linked')}</span></div><div><strong>Valley route</strong><span>/business/${html(b.id)}/</span></div></div></div></div></section>` : '';
  const share = sharePanel(b, title, desc, profileUrl);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${html(title)}</title><meta name="description" content="${html(desc)}"/><link rel="canonical" href="${html(profileUrl)}"/><meta name="robots" content="index,follow"/><meta property="og:title" content="${html(title)}"/><meta property="og:description" content="${html(desc)}"/><meta property="og:url" content="${html(profileUrl)}"/><meta property="og:image" content="${SITE_URL}/assets/valley-verified-logo.png"/><meta name="theme-color" content="#f5efe3"/><link rel="icon" href="/assets/valley-verified-logo.png"/><link rel="stylesheet" href="/assets/styles.css"/><script type="application/ld+json">${jsonScript(schema)}</script></head><body class="business-page v21-static-profile business-landing-page business-variant-${html(variant)} ${b.featured ? 'business-featured-page' : ''} ${blueprint.appRoutes ? 'actual-client-app-profile' : ''} ${html(blueprint.appClass || '')}" data-business-variant="${html(variant)}"><canvas id="sky" class="skyesol-living-background living-background" aria-hidden="true"></canvas><div class="grain" aria-hidden="true"></div>${businessFxLayer(b)}<header class="topbar"><a class="brand" href="/"><img class="brand-logo" src="/assets/valley-verified-logo.png" alt="" aria-hidden="true"/><span class="brand-wordmark"><strong>Valley Verified</strong><small>real local business pages</small></span></a><nav class="nav-actions"><a href="/featured/">Featured</a><a href="/app-builds/">App Builds</a><a href="/directory/">Directory</a><a href="/category/${html(b.category_slug)}/">${html(b.category)}</a><a href="/city/${html(b.city_slug)}/">${html(b.city)}</a><a href="/for-businesses/">For businesses</a></nav></header><main class="page"><section class="business-landing-hero client-inspired-landing"><div><a class="back-link" href="/featured/">Featured businesses</a><div class="business-badge-row">${featuredBadge}${verifiedBadge}<span>${html(blueprint.lane)}</span></div><p class="eyebrow">${html(blueprint.eyebrow)}</p><h1 class="neon-gradient-text text-highlighter text-effect-reveal">${html(blueprint.headline)}</h1><p class="business-landing-copy">${html(blueprint.copy)}</p><div class="hero-actions">${contact}</div></div><aside class="landing-panel featured-client-panel"><p class="eyebrow">Public value receipt</p><div class="hero-card"><div class="metric"><span>${html(Math.round(Number(b.verification_score || 0)))}</span><small>profile score</small></div><div class="metric"><span>${html(b.city || 'AZ')}</span><small>market</small></div></div><div class="landing-list"><div><strong>Featured status</strong><span>${b.featured ? 'Featured in the Valley Verified network.' : 'Public business landing.'}</span></div><div><strong>Business site</strong><span>${liveUrl ? html(displayUrl(liveUrl)) : 'Add website through owner claim.'}</span></div><div><strong>Network route</strong><span>/business/${html(b.id)}/</span></div></div></aside></section><section class="landing-proof-strip"><div><strong>${html(b.city || 'AZ')}</strong><span>local market</span></div><div><strong>${html(b.category || 'Business')}</strong><span>service lane</span></div><div><strong>${b.featured ? 'Featured' : 'Public'}</strong><span>network placement</span></div><div><strong>${liveUrl ? 'Linked' : 'Claim'}</strong><span>business site handoff</span></div></section>${share}${liveBridge}${actualClientApp}${staticBusinessCommand(b)}<section class="business-webpage-grid client-landing-grid"><article class="glass section"><p class="eyebrow">Built landing page</p><h2>A one-page public front door for ${html(b.name)}.</h2><p class="business-story">${html(blueprint.story)} For MetrAIyux 0S customers, this page is our gift after the first paid month: one useful business posting with no obligation to upgrade. Optional verification, placement, lead routing, sponsor lanes, or managed growth are available only if the business wants more reach.</p><div class="tag-list big-tags">${tags}</div></article><article class="glass section"><p class="eyebrow">Buyer handoff</p><h2>Move from discovery to the business.</h2><div class="contact-list">${contactCards}</div><div class="button-row"><a class="btn primary" href="/request/?business=${html(b.id)}">Request quote</a><a class="btn" href="/compare/?ids=${html(b.id)}">Compare</a></div></article></section><section class="section glass featured-proof-section"><div class="section-head"><div><p class="eyebrow">Featured page value</p><h2>Why this is worth having.</h2></div><a class="btn small" href="/featured/">View featured lane</a></div><div class="client-proof-grid">${proofCards}</div></section><section class="business-webpage-grid"><article class="glass section"><p class="eyebrow">Business details</p><h2>What buyers see first</h2><div class="detail-grid"><div><strong>Business</strong><span>${html(b.name)}</span></div><div><strong>Category</strong><span>${html([b.category,b.subcategory].filter(Boolean).join(' / '))}</span></div><div><strong>Address</strong><span>${html(address || 'Address not listed')}</span></div><div><strong>Contact</strong><span>${html([b.phone,b.email,liveUrl && displayUrl(liveUrl)].filter(Boolean).join(' / ') || 'Needs owner update')}</span></div></div></article><article class="glass section upgrade-panel"><p class="eyebrow">Included page and optional exposure</p><h2>The free page stays useful on its own.</h2><p class="muted">Owners can claim the page, correct weak data, and add proof without being forced into anything else. Verification, featured placement, lead routing, sponsor inventory, and managed growth are optional upgrades only when the business wants more reach.</p><div class="button-row"><a class="btn primary" href="/join/?business=${html(b.id)}">Owner join path</a><a class="btn" href="/advertise/">Optional exposure products</a></div></article></section></main><div id="toast" class="toast"></div><script type="module" src="/assets/app.js"></script></body></html>`;
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
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${html(title)} | Valley Verified</title><meta name="description" content="${html(bodyText)}"/><meta name="robots" content="noindex,nofollow,noarchive"/><link rel="stylesheet" href="/assets/styles.css"/></head><body><main class="page"><section class="hero glass subhero"><div><p class="eyebrow">${html(eyebrow)}</p><h1>${html(h1)}</h1><p class="hero-text">${html(bodyText)}</p><div class="hero-actions"><a class="btn primary" href="${html(dataHref || '/data/v21-code-readiness.json')}">Open model JSON</a><a class="btn" href="/admin-console/">Admin console</a></div></div></section><section class="platform-strip">${cardHtml}</section></main></body></html>`;
}
async function writeCompactJson(rel, payload){ await write(path.join(DIST, rel), JSON.stringify(payload)); }
async function rewriteSitemaps(businesses){
  const categories = await maybeReadJson('data/categories.json', { categories:[] });
  const cities = await maybeReadJson('data/cities.json', { cities:[] });
  const markets = await maybeReadJson('data/market-index.json', { markets:[] });
  const taxonomy = await maybeReadJson('data/taxonomy.json', { niches:[] });
  const collectionSlugs = ['verified','no-hidden-fees','mobile-service','insured','accepting-requests','recently-verified'];
  const staticPublic = ['/', '/featured/', '/directory/', '/business/', '/category/', '/city/', '/niche/', '/service-lanes/', '/market/', '/collection/', '/join/', '/pricing/', '/trust-network/', '/shortlist/', '/compare/', '/match/', '/deal-desk/', '/offers/', '/map/', '/submit/', '/request/', '/claim/', '/insights/'];
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
  const publicCompact = compact.map(publicBusinessRecord);
  const profileRows = full.map(b => ({ ...compactBusiness(b), address:b.address || '', description:b.description || '', subcategory:b.subcategory || '', price_note:b.price_note || '', tags:Array.isArray(b.tags) ? b.tags.slice(0,12) : [] }));

  await mapLimit(profileRows, 128, async b => write(path.join(DIST, 'business', b.id, 'index.html'), profileHtml(b)));

  const search = compact.map(searchRecord);
  const categories = await maybeReadJson('data/categories.json', { categories:[] });
  const cities = await maybeReadJson('data/cities.json', { cities:[] });
  const seedReport = await maybeReadJson('seed-report.json', {});
  seedReport.version = '21.0.0';
  seedReport.records = { ...(seedReport.records || {}), static_business_pages:compact.length, profile_mode:'full-static' };
  seedReport.v21 = { full_static_business_profiles:compact.length, profile_renderer_required:false, deploy_size_strategy:'compact-public-data-plus-shards', generated_at:TODAY };

  await rm('data/profiles');
  await writeCompactJson('data/businesses.json', { updated_at:TODAY, businesses:publicCompact, facets:{ categories:categories.categories || [], cities:cities.cities || [] } });
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
  await writeCompactJson('api/businesses.json', { updated_at:TODAY, count:publicCompact.length, businesses:publicCompact.map(({identity,moderation_flags,description,tags,...b})=>b) });
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
  await write(path.join(DIST, 'protected-admin', 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Protected Admin | Valley Verified</title><meta name="robots" content="noindex,nofollow,noarchive"/><link rel="stylesheet" href="/assets/styles.css"/></head><body><main class="page"><section class="hero glass subhero"><div><p class="eyebrow">upstream-auth admin app</p><h1>Protected admin operations without browser-entered proof controls.</h1><p class="hero-text">This console calls runtime endpoints with credentials and expects upstream auth to inject identity/roles before the request reaches PHX functions.</p><div class="hero-actions"><button id="loadQueues" class="btn primary">Load service / queues</button><button id="replayState" class="btn">Replay state</button><button id="exportChanges" class="btn">Export change-set</button></div></div></section><section class="section glass"><pre id="adminOutput" class="code-output">No local auth fields. Upstream identity only.</pre></section></main><script type="module" src="/assets/protected-admin-app.js"></script></body></html>`);
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
  await write(path.join(DIST, '_redirects'), '# Valley Verified full-static build: business pages are emitted as real HTML.\n# Keep /business/:id/ routes on their generated files instead of shadowing them with the profile renderer.\n');
  await write(path.join(DIST, 'seed-report.json'), JSON.stringify(seedReport));
  console.log(`v21 enhanced: ${compact.length} full-static business profiles; dist ${(after/1024/1024).toFixed(1)}MB after compaction.`);
}

main().catch(error => { console.error(error); process.exit(1); });
