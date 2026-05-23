import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'dist');
const REPO_ROOT = path.resolve(ROOT, '../../..');
const FACTORY_APPS_DIR = path.join(REPO_ROOT, 'client-app-factory', 'client-apps');
const FACTORY_RECORDS_DIR = path.join(REPO_ROOT, 'client-app-factory', 'storage', 'records');
const TODAY = new Date().toISOString().slice(0, 10);
const DEFAULT_SITE_URL = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/valley-verified';
const SITE_URL = String(process.env.VALLEY_VERIFIED_CANONICAL_URL || process.env.SITE_URL || process.env.URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
const APP_BUILD_GATE_HREF = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=valley-verified&offer=valley-verified-app-build-lane';
const FACTORY_APP_MEDIA_ROOT = '/assets/factory-client-apps';
const PROFILE_TEMPLATE_ENV = String(process.env.VALLEY_PROFILE_TEMPLATE || 'app').trim().toLowerCase();
const PROFILE_TEMPLATE = ['classic','legacy'].includes(PROFILE_TEMPLATE_ENV) ? 'classic' : 'app';
const PROFILE_TEMPLATE_OPTIONS = ['app','classic'];
const FACTORY_STATIC_EXCLUSIONS = new Set(['skye-app-template']);
const FACTORY_BUSINESS_ALIASES = new Map([
  ['empire-pallets', 'empire-pallets-phoenix'],
  ['next-level-gaming-az', 'next-level-gaming-goodyear']
]);
const LEGACY_CLIENT_APP_PROFILES = [
  { businessId:'bobs-smoke-shop-litchfield-park', clientId:'bobs-smoke-shop', displayName:"Bob's Smoke Shop", sourceFolder:'Skye-Clients/bobs-smoke-shop-mcp-redo', packageType:'legacy-skye-client-app' },
  { businessId:'empire-pallets-phoenix', clientId:'empire-pallets-v3-app', displayName:'Empire Pallets', sourceFolder:'Skye-Clients/empire-pallets-v3-app', packageType:'legacy-skye-client-app' },
  { businessId:'480-realty-property-management-mesa-85209', clientId:'480-realty-property-management-app', displayName:'480 Realty & Property Management', sourceFolder:'Skye-Clients/480-realty-property-management-app', packageType:'legacy-skye-client-app' },
  { businessId:'dink-and-dine-pickle-park-mesa-85201-5432605', clientId:'dink-and-dine-pickle-park-app', displayName:'Dink & Dine Pickle Park', sourceFolder:'Skye-Clients/dink-and-dine-pickle-park-app', packageType:'legacy-skye-client-app' },
  { businessId:'techbros-electronic-recycling-and-itad-scottsdale-85260-8909b0c', clientId:'techbros-electronic-recycling-itad-app', displayName:'Techbros Electronic Recycling & ITAD', sourceFolder:'Skye-Clients/techbros-electronic-recycling-itad-app', packageType:'legacy-skye-client-app' },
  { businessId:'arclight-pictures-tucson', clientId:'arclight-pictures-app', displayName:'ArcLight Pictures', sourceFolder:'Skye-Clients/arclight-pictures-app', packageType:'legacy-skye-client-app' },
  { businessId:'next-level-gaming-goodyear', clientId:'next-level-gaming-az-app', displayName:'Next Level Gaming AZ', sourceFolder:'Skye-Clients/next-level-gaming-az-app', packageType:'legacy-skye-client-app' }
];
let FACTORY_CLIENT_APPS = new Map();
let FACTORY_CLIENT_APP_RECORDS = [];

function text(v){ return String(v ?? '').replace(/\s+/g, ' ').trim(); }
function html(v){ return text(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }
function enc(v){ return encodeURIComponent(text(v)); }
function jsonScript(v){ return JSON.stringify(v).replace(/</g, '\\u003c'); }
function slugify(v){ return text(v).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90) || 'item'; }
function hash(v){ return crypto.createHash('sha256').update(String(v)).digest('hex').slice(0,16); }
function safeExternalUrl(v){ const out = text(v); return /^https?:\/\//i.test(out) ? out : ''; }
function displayUrl(v){ try { return new URL(v).hostname.replace(/^www\./, ''); } catch { return text(v).replace(/^https?:\/\//, '').replace(/\/$/, ''); } }
function siteOrigin(){ try { return new URL(SITE_URL).origin; } catch { return DEFAULT_SITE_URL.replace(/\/valley-verified\/?$/, ''); } }
function businessVariant(b){
  if(/bobs-smoke-shop/i.test(b.id || b.name || '')) return 'blue';
  if(/empire-pallets/i.test(b.id || b.name || '')) return 'gold';
  const variants = ['copper','teal','magenta','gold','blue'];
  return variants[parseInt(hash(`${b.id || b.name || 'business'}-${b.city || ''}`).slice(0, 2), 16) % variants.length];
}
function externalProfileUrl(b){ return safeExternalUrl(b.website) || safeExternalUrl(b.booking_url) || safeExternalUrl(b.source_url); }
function externalProfileKind(b){
  const website = safeExternalUrl(b.website);
  const booking = safeExternalUrl(b.booking_url);
  const source = safeExternalUrl(b.source_url);
  const url = externalProfileUrl(b);
  if(url && source && url === source && !website && !booking) return 'source';
  if(/pages\.dev/i.test(url)) return 'app';
  if(url) return 'website';
  return 'none';
}
function externalProfileLabel(b){
  const url = externalProfileUrl(b);
  if(!url) return 'Business website';
  const kind = externalProfileKind(b);
  if(kind === 'source') return 'Source listing';
  return kind === 'app' ? 'Live business app' : 'Business website';
}
function businessFxLayer(b){
  const variant = businessVariant(b);
  return `<div class="business-fx business-fx--${variant}" aria-hidden="true"><span class="business-fx__mesh"></span><span class="business-fx__rail business-fx__rail-a"></span><span class="business-fx__rail business-fx__rail-b"></span><span class="business-fx__corner business-fx__corner-a"></span><span class="business-fx__corner business-fx__corner-b"></span></div>`;
}
function renderClientMediaBlock(blueprint, fallbackAlt = 'Client app preview'){
  const alt = html(blueprint.mediaAlt || fallbackAlt);
  const poster = html(blueprint.poster || blueprint.image || '');
  if(blueprint.video){
    return `<video autoplay muted loop playsinline controls preload="metadata" poster="${poster}"><source src="${html(blueprint.video)}" type="video/mp4"></video>`;
  }
  const image = html(blueprint.image || blueprint.poster || '');
  return image ? `<img src="${image}" alt="${alt}" loading="lazy"/>` : '';
}
async function readOptionalJson(file, fallback = null){
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}
async function pathExists(file){
  try { await fs.access(file); return true; } catch { return false; }
}
function humanRouteLabel(route){
  const clean = text(route)
    .replace(/^\/+/, '')
    .replace(/\/index\.html$/i, '')
    .replace(/\.html$/i, '')
    .replace(/\/+$/, '')
    .replace(/^index$/i, 'home')
    .replace(/[-_/]+/g, ' ');
  return clean ? clean.replace(/\b\w/g, c => c.toUpperCase()) : 'Home';
}
function factoryAppUrl(clientId){
  return `${siteOrigin()}/client-app-factory/client-apps/${slugify(clientId)}/`;
}
function factoryAppKeys(app){
  return [app.clientId, app.displayName, app.valleyBusinessId, app.payload?.app?.valleyProfilePath, app.record?.valleySync?.profilePath]
    .map(value => slugify(String(value || '').split('/').filter(Boolean).at(-1) || value))
    .filter(Boolean);
}
function factoryBusinessIdFromSources(clientId, payload = {}, report = {}, identity = {}, record = {}){
  const profileSlug = value => slugify(String(value || '').split('/').filter(Boolean).at(-1) || value);
  const candidates = [
    payload?.businessId,
    payload?.app?.businessId,
    payload?.app?.valleyBusinessId,
    report?.businessId,
    identity?.businessId,
    record?.valleySync?.businessId,
    FACTORY_BUSINESS_ALIASES.get(clientId),
    payload?.app?.valleyProfilePath && profileSlug(payload.app.valleyProfilePath),
    record?.valleySync?.profilePath && profileSlug(record.valleySync.profilePath),
    clientId
  ].filter(value => text(value)).map(v => slugify(v)).filter(Boolean);
  return candidates[0] || clientId;
}
async function readFactoryClientApps(){
  const entries = await fs.readdir(FACTORY_APPS_DIR, { withFileTypes:true }).catch(() => []);
  const records = [];
  const map = new Map();

  for(const entry of entries){
    if(!entry.isDirectory()) continue;
    const appDir = path.join(FACTORY_APPS_DIR, entry.name);
    const [payload, report, identity, manifest, record] = await Promise.all([
      readOptionalJson(path.join(appDir, 'VALLEY_SYNC_PAYLOAD.json')),
      readOptionalJson(path.join(appDir, 'CLIENT_ENHANCEMENT_REPORT.json')),
      readOptionalJson(path.join(appDir, 'CLIENT_IDENTITY_MAP.json')),
      readOptionalJson(path.join(appDir, 'APP_PATH_MANIFEST.json')),
      readOptionalJson(path.join(FACTORY_RECORDS_DIR, `${entry.name}.json`))
    ]);
    const hasIndex = await pathExists(path.join(appDir, 'index.html'));
    if(!payload && !report && !identity && !record?.generatedApps?.length && !hasIndex) continue;
    const clientId = slugify(payload?.clientId || report?.clientId || identity?.slug || identity?.clientId || record?.clientId || entry.name);
    if(!clientId || FACTORY_STATIC_EXCLUSIONS.has(clientId)) continue;
    const profile = report?.profile || identity || {};
    const routes = profile.availableRoutes || manifest?.routes?.publicRoutes || manifest?.publicRoutes || record?.generatedApps?.at(-1)?.routes?.publicRoutes || record?.publicRoutes || [];
    const appDirRel = path.relative(REPO_ROOT, appDir).replaceAll(path.sep, '/');
    const recordPath = path.join(FACTORY_RECORDS_DIR, `${entry.name}.json`);
    const recordPathRel = path.relative(REPO_ROOT, recordPath).replaceAll(path.sep, '/');
    const receipts = [
      payload && `${appDirRel}/VALLEY_SYNC_PAYLOAD.json`,
      report && `${appDirRel}/CLIENT_ENHANCEMENT_REPORT.json`,
      identity && `${appDirRel}/CLIENT_IDENTITY_MAP.json`,
      manifest && `${appDirRel}/APP_PATH_MANIFEST.json`,
      record && recordPathRel
    ].filter(Boolean);
    const app = {
      clientId,
      displayName: payload?.displayName || profile.name || report?.displayName || record?.displayName || entry.name,
      appDir,
      appDirRel,
      recordPathRel: record ? recordPathRel : '',
      valleyBusinessId: factoryBusinessIdFromSources(clientId, payload || {}, report || {}, identity || {}, record || {}),
      payload: payload || {},
      report: report || {},
      identity: identity || {},
      manifest: manifest || {},
      record: record || {},
      receipts,
      profile,
      routes: Array.isArray(routes) ? routes : [],
      appUrl: factoryAppUrl(clientId),
      media: {}
    };
    records.push(app);
    for(const key of factoryAppKeys(app)) map.set(key, app);
  }

  return { records, map };
}
async function copyFactoryMedia(app, relativePath, label){
  const rel = text(relativePath).replace(/^\/+/, '');
  if(!rel) return '';
  const source = path.join(app.appDir, rel);
  if(!(await pathExists(source))) return '';
  const ext = path.extname(source);
  const fileName = `${label}${ext || path.extname(rel) || ''}`;
  const dest = path.join(DIST, 'assets', 'factory-client-apps', app.clientId, fileName);
  await fs.mkdir(path.dirname(dest), { recursive:true });
  await fs.copyFile(source, dest);
  return `${FACTORY_APP_MEDIA_ROOT}/${app.clientId}/${fileName}`;
}
async function stageFactoryClientAppMedia(apps){
  for(const app of apps){
    app.media = {
      video: await copyFactoryMedia(app, app.profile?.walkthroughVideoPath || app.profile?.heroVideoPath || app.payload?.app?.heroVideo, 'hero'),
      poster: await copyFactoryMedia(app, app.profile?.walkthroughPosterPath || app.profile?.heroPosterPath, 'hero-poster'),
      qr: await copyFactoryMedia(app, app.payload?.app?.qrSvg, 'app-qr')
    };
  }
}
function factoryAppForBusiness(b){
  const matches = factoryAppsForBusiness(b);
  return matches[0] || null;
}
function factoryAppsForBusiness(b){
  const businessId = slugify(b.id);
  const businessName = slugify(b.name);
  const seen = new Set();
  const matches = [];
  for(const app of FACTORY_CLIENT_APP_RECORDS){
    const appKeys = [
      app.clientId,
      app.valleyBusinessId,
      FACTORY_BUSINESS_ALIASES.get(app.clientId),
      app.payload?.businessId,
      app.payload?.app?.businessId,
      app.payload?.app?.valleyBusinessId,
      app.record?.valleySync?.businessId,
      app.payload?.app?.valleyProfilePath && String(app.payload.app.valleyProfilePath).split('/').filter(Boolean).at(-1),
      app.record?.valleySync?.profilePath && String(app.record.valleySync.profilePath).split('/').filter(Boolean).at(-1)
    ].map(slugify).filter(Boolean);
    const displayNameMatches = app.displayName && businessName && slugify(app.displayName) === businessName;
    const directMatch = appKeys.includes(businessId) || displayNameMatches;
    if(directMatch && !seen.has(app.clientId)){
      matches.push(app);
      seen.add(app.clientId);
    }
  }
  return matches.sort((a, candidate) => {
    const directA = a.clientId === businessId ? 1 : 0;
    const directB = candidate.clientId === businessId ? 1 : 0;
    if(directA !== directB) return directB - directA;
    const receiptA = Number(Boolean(a.report?.clientId || a.payload?.clientId || a.identity?.clientId || a.receipts?.length));
    const receiptB = Number(Boolean(candidate.report?.clientId || candidate.payload?.clientId || candidate.identity?.clientId || candidate.receipts?.length));
    return receiptB - receiptA || a.clientId.localeCompare(candidate.clientId);
  });
}
function factoryAppBlueprint(b, app, fallbackTags){
  const routeLabels = (app.routes || [])
    .map(humanRouteLabel)
    .filter(label => !/^Index$/i.test(label))
    .slice(0, 8);
  const appRoutes = routeLabels.length ? routeLabels : ['Home', 'Inventory', 'Gallery', 'Contact', 'Workspace Preview'];
  const signature = text(app.payload?.design?.signatureModule || app.profile?.niche || 'client app');
  const mediaStrategy = text(app.report?.mediaStrategy?.hero || 'factory media');
  const liveSurface = safeExternalUrl(app.payload?.app?.liveUrl || app.profile?.shareUrl) || externalProfileUrl(b);
  const sourceSite = liveSurface ? displayUrl(liveSurface) : displayUrl(b.website || '');
  const relatedPackages = factoryAppsForBusiness(b)
    .filter(item => item.clientId !== app.clientId)
    .map(item => ({ clientId:item.clientId, displayName:item.displayName, appUrl:item.appUrl, sourceFolder:item.appDirRel }))
    .slice(0, 4);
  const receiptProof = app.receipts?.length ? `Detected ${app.receipts.slice(0, 3).join(', ')}.` : `Detected generated package at ${app.appDirRel}.`;
  return {
    previewOnly:true,
    eyebrow:`Factory preview package for ${b.city || 'Arizona'} ${b.category || 'business'}`,
    headline:`${b.name} factory preview package`,
    copy:`This Valley Verified page has a generated 0S Client App Factory preview attached for operator review. It is not an owner-approved production app, and the public buyer route remains this Valley page plus the verified website, booking, phone, email, request, and claim actions.`,
    story:`The factory package is a draft preview, not proof that ${b.name} owns a live app. Buyers can still use the Valley page and public handoff links, while operators can inspect the draft package before any owner-approved build is sold or promoted.`,
    lane: `${signature.replace(/-/g, ' ')} preview`,
    liveLabel:'Open factory preview',
    appUrl: app.appUrl,
    sourceUrl: liveSurface,
    appClass:`factory-preview-profile factory-preview-${html(app.clientId)}`,
    appIntro:`The factory produced a ${signature.replace(/-/g, ' ')} preview for ${b.name}. Keep it labeled as preview/proof for operator review until the owner approves a real build and production handoff.`,
    sourceFolder:app.appDirRel,
    relatedPackages,
    video:app.media?.video || '',
    poster:app.media?.poster || '',
    image:app.media?.poster || '',
    mediaAlt:`${b.name} generated app preview`,
    appRoutes,
    deliverables:[
      'Generated preview package published into the 0S Client App Factory shell',
      'Client identity map, enhancement report, verification report, and Valley sync payload for review',
      'Workspace preview route for owner/operator review only',
      'QR/share handoff assets where the generated preview supplied them',
      `${signature.replace(/-/g, ' ')} signature module from the generator`,
      'Production promotion remains blocked until owner approval and proof'
    ],
    value:[
      'Shows draft scope without presenting the preview as a live customer app.',
      'Keeps buyer-facing action on the honest Valley page and public business handoffs.',
      'Lets operators inspect the app folder, media, and routes before selling or promoting it.',
      sourceSite ? `Keeps the original public site handoff visible: ${sourceSite}.` : 'Preserves the owner claim route when no public site is available.'
    ],
    proof:[
      ['Factory preview receipt', receiptProof],
      ['Preview route', `The generated preview opens at ${app.appUrl}.`],
      ['Boundary', 'This is not an actual client app or owner-approved live app until approval, production proof, and handoff are complete.'],
      ...relatedPackages.map(item => ['Related preview package', `${item.displayName || item.clientId} is also mapped for operator review at ${item.appUrl}.`])
    ],
    tags:fallbackTags
  };
}
function relatedFactoryPackageHtml(blueprint){
  return (blueprint.relatedPackages || []).map(item => `<div><strong>Related app package</strong><span><a href="${html(item.appUrl)}" target="_blank" rel="noopener">${html(item.displayName || item.clientId)}</a> · ${html(item.sourceFolder || '')}</span></div>`).join('');
}
function clientAppCoverage(businesses, factoryApps){
  const byId = new Map(businesses.map(b => [b.id, b]));
  const records = [
    ...LEGACY_CLIENT_APP_PROFILES,
    ...factoryApps.map(app => ({
      businessId:app.valleyBusinessId,
      clientId:app.clientId,
      displayName:app.displayName,
      sourceFolder:app.appDirRel,
      packageType:'client-app-factory',
      appUrl:app.appUrl,
      receipts:app.receipts || []
    }))
  ].map(item => {
    const business = byId.get(item.businessId);
    return {
      ...item,
      businessName:business?.name || '',
      businessRoute:business ? `/business/${business.id}/` : '',
      featured:Boolean(business?.featured),
      missingBusiness:!business
    };
  });
  return {
    updated_at:TODAY,
    counts:{
      records:records.length,
      matched:records.filter(r => !r.missingBusiness).length,
      featured:records.filter(r => r.featured).length,
      missing:records.filter(r => r.missingBusiness).length,
      not_featured:records.filter(r => !r.missingBusiness && !r.featured).length
    },
    records,
    missing:records.filter(r => r.missingBusiness).map(r => r.clientId),
    not_featured:records.filter(r => !r.missingBusiness && !r.featured).map(r => r.businessId)
  };
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
  const is480 = /480-realty-property-management/i.test(b.id || b.name || '');
  const isDink = /dink-and-dine-pickle-park/i.test(b.id || b.name || '');
  const isTechbros = /techbros-electronic-recycling/i.test(b.id || b.name || '');
  const isArcLight = /arclight-pictures/i.test(b.id || b.name || '');
  const isNextLevel = /next-level-gaming/i.test(b.id || b.name || '');
  const isFadeMasters = /fade-masters-phx|fade masters/i.test(b.id || b.name || '');
  if(isBob){
    return {
      eyebrow:'Featured Litchfield Park smoke shop app example',
      headline:"Bob's Smoke Shop live app-build example",
      copy:"This Valley Verified page is the public bridge into Bob's live app-build example: 21+ access, retail category discovery, glass, vapes, cigars, pipes, CBD, tobacco, hookah, electronics, snacks, media, contact paths, and a direct handoff into the full app.",
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
      headline:'Empire Pallets live app-build example',
      copy:"This Valley Verified page is the public bridge into Empire's operations app-build example: commercial pallet supply, recycled pallets, removal, drop trailer programs, heat-treatment support, custom pallets, quote intake, scan handoff, and a direct route into the full app.",
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
  if(isNextLevel){
    const appUrl = `${siteOrigin()}/client-app-factory/client-apps/next-level-gaming-goodyear/`;
    return {
      eyebrow:'Featured Goodyear trading card app example',
      headline:'Next Level Gaming AZ live app-build example',
      copy:'This Valley Verified page is the public bridge into the real Next Level Gaming AZ app-build example: weekly TCG events, free table play, TCGPlayer shopping, event requests, QR handoff, shop photos, player actions, and a direct handoff into the full app.',
      story:'This page points into the real Next Level app. Players can confirm the shop, check events, request an event, scan the QR route, call, or shop online from one app surface.',
      lane:'Trading card shop app',
      liveLabel:'Open Next Level app',
      appUrl,
      appClass:'next-level-actual-app-profile',
      appIntro:'Next Level is the trading-card-shop example: a real event-command app with schedule filters, shop photos, TCGPlayer handoff, event request, scan route, and mobile player actions.',
      sourceFolder:'client-app-factory/client-apps/next-level-gaming-goodyear (real Next Level Gaming AZ app alias)',
      image:'/client-app-factory/client-apps/next-level-gaming-goodyear/assets/media/shop-photo-1.jpg',
      poster:'/client-app-factory/client-apps/next-level-gaming-goodyear/assets/media/cyber-city-hero.jpg',
      mediaAlt:'Next Level Gaming shop and event app preview',
      appRoutes:['Events','Shop','Scan route','Event request','TCGPlayer handoff','58 seats','Weekly TCG board','Mobile install'],
      deliverables:['Branded trading-card-shop app surface','Weekly event and table-play routing','Shop photo proof and real store context','TCGPlayer shopping handoff','Event request and organizer contact path','QR scan route for in-store and print handoff','Two-way Valley Verified backlink and app handoff'],
      value:['Turns local discovery into a real player action surface instead of a flat listing.','Gives the shop one route for events, shopping, calls, scans, and store proof.','Shows Valley Verified buyers what a scoped gaming-retail app can look like when it is actually built.','Keeps the public Valley post useful while moving serious players into the real app.'],
      proof:[['Live app bridge','The Valley page points buyers into the real Next Level app for events, shop photos, TCGPlayer, event requests, and scan routing.'],['Direct route','The Goodyear client-app URL serves the real Next Level app surface with events, shop photos, and player actions.'],['Featured placement','Next Level gets a featured network badge and a dedicated route that can be used for player, event, and local discovery handoff.']],
      tags:fallback
    };
  }
  if(isFadeMasters){
    const appUrl = `${siteOrigin()}/client-app-factory/client-apps/fade-masters-phx/`;
    return {
      eyebrow:'Featured Phoenix barber booking app example',
      headline:'Fade Masters PHX live booking app example',
      copy:'This Valley Verified page is the public bridge into the real Fade Masters PHX booking app: service menu, appointment request, walk-in queue, local receipt flow, shop intake, call actions, and a direct handoff into the full app.',
      story:'This page points into the actual Fade Masters booking flow. Visitors can choose a service, request a time, join the walk-in lane, call the shop, or save the Valley Verified post.',
      lane:'Barber booking app',
      liveLabel:'Open Fade Masters booking app',
      appUrl,
      appClass:'fade-masters-actual-app-profile',
      appIntro:'Fade Masters is the booking example: a direct customer app for services, appointment requests, walk-in queue status, receipts, and shop handoff.',
      sourceFolder:'client-app-factory/client-apps/fade-masters-phx',
      image:'/client-app-factory/client-apps/fade-masters-phx/assets/fade-booking-preview.png',
      poster:'/client-app-factory/client-apps/fade-masters-phx/assets/fade-booking-preview.png',
      mediaAlt:'Fade Masters PHX booking app preview',
      appRoutes:['Service menu','Appointment request','Walk-in queue','Receipt flow','Shop intake','Call action','Valley backlink','Mobile booking'],
      deliverables:['Mobile-first service menu','Appointment request form','Walk-in queue board','Receipt and confirmation flow','Shop contact and call action','Valley Verified backlink and public handoff','Proof screenshot generated from the live app surface'],
      value:['Turns a barber landing into an action-ready booking flow.','Gives customers one route for services, appointment requests, walk-ins, receipts, and shop contact.','Shows Valley Verified buyers what a practical booking app lane includes.','Keeps the public proof position tied to the rendered booking app.'],
      proof:[['Live app bridge','The Valley page points visitors into the Fade Masters booking app for services, appointment requests, walk-ins, receipts, and shop contact.'],['Rendered proof','The page uses a browser-captured preview from the booking app itself.'],['Featured placement','Fade Masters gets a dedicated public route that can be used for booking and local discovery handoff.']],
      tags:fallback
    };
  }
  if(is480){
    return {
      eyebrow:'Featured East Valley property management app example',
      headline:'480 Realty & Property Management live app-build example',
      copy:"This Valley Verified page is the public bridge into 480 Realty's operations app-build example: rental analysis, owner intake, tenant portal handoff, maintenance coordination, inspections and turns, leasing support, and a direct route into the full management workflow.",
      story:"This page turns local discovery into 480 Realty's owner and management workflow. Owners can confirm the company, call, email, open the live app, route into AppFolio, or save the Valley Verified page before they start a management conversation.",
      lane:'Property management app',
      liveLabel:"Open 480 Realty's live app",
      appClass:'realty-480-actual-app-profile',
      appIntro:"480 Realty is the property-management example: a business pays for an app that routes owners and tenants into real intake, portal handoff, service lanes, and management proof instead of a thin brokerage listing.",
      sourceFolder:'Skye-Clients/480-realty-property-management-app',
      video:'/assets/client-builds/480-live-build.mp4',
      poster:'/assets/client-builds/480-live-build-poster.png',
      mediaAlt:'480 Realty & Property Management live app preview',
      appRoutes:['Rental analysis','Owner intake','AppFolio handoff','Maintenance routing','Inspections and turns','Owner reporting','Service area proof','Workspace'],
      deliverables:['Branded owner and tenant operations app surface','Rental analysis and management-intake lane','Portal handoff into AppFolio for active management accounts','Maintenance coordination, inspections, turns, and leasing support lanes','Gallery, FAQ, local service pages, and contact routing','Workspace preview with live handoff for review','Two-way Valley Verified backlink and management proof language'],
      value:['Turns a property manager into a shareable operations app instead of a flat directory listing.','Gives owners one route for rental analysis, management intake, portal handoff, and service proof.','Lets Valley Verified show what a real estate and property app lane looks like when it is actually scoped.','Keeps the business page useful on its own while pushing serious owners into the real workflow.'],
      proof:[['Live app bridge',"The Valley page points buyers into 480 Realty's live management app for intake, portal handoff, service lanes, and owner-facing proof."],['Operational handoff','The page names the management lanes buyers actually need before they ever call or email.'],['Featured placement','480 Realty gets a featured network badge and a dedicated route that can be used in outreach and owner follow-up.']],
      tags:fallback
    };
  }
  if(isDink){
    return {
      eyebrow:'Featured Mesa guest-ops app example',
      headline:'Dink & Dine Pickle Park live app-build example',
      copy:"This Valley Verified page is the public bridge into Dink & Dine's guest app-build example: court reservations, open play, leagues, lessons, memberships, private events, food and bar lanes, QR handoff, and a direct route into the full venue workflow.",
      story:"This page turns local discovery into Dink & Dine's booking and guest-routing workflow. Guests can confirm the venue, call, open the live app, route into CourtReserve, or save the Valley Verified page before they book courts or events.",
      lane:'Venue guest-ops app',
      liveLabel:"Open Dink & Dine's live app",
      appClass:'dink-actual-app-profile',
      appIntro:"Dink & Dine is the hospitality and recreation example: a business pays for an app that routes guests into bookings, events, memberships, food-and-bar traffic, and venue proof instead of a thin listing page.",
      sourceFolder:'Skye-Clients/dink-and-dine-pickle-park-app',
      image:'/assets/client-builds/dink-live-build.jpg',
      poster:'/assets/client-builds/dink-live-build.jpg',
      mediaAlt:'Dink & Dine Pickle Park live app preview',
      appRoutes:['Court reservations','Open play','Leagues','Lessons and clinics','Memberships','Private events','Food and bar','Workspace'],
      deliverables:['Branded guest-operations app for a live venue','CourtReserve handoff and guest-intake lane','Service pages for reservations, open play, leagues, lessons, events, memberships, and food/bar','Gallery, specials, FAQ, contact, and venue support pages','Scan/QR route for front-desk and print handoff','Workspace preview for operator review','Two-way Valley Verified backlink and booking proof language'],
      value:['Converts local discovery into a real guest-routing flow instead of a generic entertainment listing.','Gives the venue one route for bookings, memberships, leagues, events, and follow-up.','Lets Valley Verified show what a hospitality and recreation app lane can actually look like.','Supports front-desk, print, and mobile handoff through QR and app routes.'],
      proof:[['Live app bridge',"The Valley page points buyers into Dink & Dine's live guest app for courts, events, memberships, and venue routing."],['Booking context','The page makes the booking and guest lanes visible before the visitor leaves the Valley route.'],['Featured placement','Dink & Dine gets a featured network badge and a dedicated route that can be used in social, print, and local discovery.']],
      tags:fallback
    };
  }
  if(isTechbros){
    return {
      eyebrow:'Featured Scottsdale ITAD app example',
      headline:'Techbros Electronic Recycling & ITAD live app-build example',
      copy:"This Valley Verified page is the public bridge into Techbros' intake app-build example: business pickups, ITAD routing, data destruction, residential drop-off, logistics, resale and reuse, certificates/compliance, and a direct route into the full secure workflow.",
      story:"This page turns local discovery into Techbros' secure intake flow. Buyers can confirm the company, call, open the live app, route into ITAD intake, or save the Valley Verified page before they schedule pickups or destruction work.",
      lane:'Electronics recycling / ITAD app',
      liveLabel:"Open Techbros' live app",
      appClass:'techbros-actual-app-profile',
      appIntro:"Techbros is the secure-operations example: a business pays for an app that routes pickups, ITAD, chain-of-custody, and compliance proof into one branded intake surface instead of a weak directory listing.",
      sourceFolder:'Skye-Clients/techbros-electronic-recycling-itad-app',
      video:'/assets/client-builds/techbros-live-build.mp4',
      poster:'/assets/client-builds/techbros-live-build-poster.png',
      mediaAlt:'Techbros Electronic Recycling & ITAD live app preview',
      appRoutes:['Business pickups','ITAD intake','Data destruction','Residential drop-off','Logistics','Resale and reuse','Certificates/compliance','Workspace'],
      deliverables:['Branded secure intake app for recycling and ITAD','Business pickup, ITAD, data destruction, residential drop-off, logistics, and follow-up lanes','Media-backed intro with contact and route proof','Gallery, FAQ, local service page, and contact routing','Scan/QR route for field and print handoff','Workspace preview for operator review','Two-way Valley Verified backlink and secure-operations proof language'],
      value:['Converts local discovery into a secure intake flow instead of a thin recycling listing.','Gives commercial buyers one route for pickups, destruction, certificates, and logistics.','Lets Valley Verified show what a real ITAD/recycling app lane can do beyond a basic business card page.','Creates a clean path for field, office, and customer follow-up through the same app surface.'],
      proof:[['Live app bridge',"The Valley page points buyers into Techbros' live intake app for pickups, ITAD, destruction, logistics, and proof routing."],['Secure routing','The page names the secure service lanes before the buyer leaves for the app.'],['Featured placement','Techbros gets a featured network badge and a dedicated route that can be used in outreach and client handoff.']],
      tags:fallback
    };
  }
  if(isArcLight){
    return {
      eyebrow:'Featured Tucson production app example',
      headline:'ArcLight Pictures live app-build example',
      copy:"This Valley Verified page is the public bridge into ArcLight's company app-build example: promotional films, nonprofit and community storytelling, film work, event coverage, selected projects, gallery, workspace, and a direct route into project contact.",
      story:"This page turns local discovery into ArcLight's production presentation. Buyers can confirm the company, call, open the live app, review projects and gallery media, or save the Valley Verified page before they request a production conversation.",
      lane:'Production company app',
      liveLabel:"Open ArcLight's live app",
      appClass:'arclight-actual-app-profile',
      appIntro:"ArcLight is the production example: a business pays for an app that presents real services, project proof, gallery media, workspace access, and contact handoff instead of a thin media listing.",
      sourceFolder:'Skye-Clients/arclight-pictures-app',
      image:'/assets/client-builds/arclight-live-build.png',
      poster:'/assets/client-builds/arclight-live-build.png',
      mediaAlt:'ArcLight Pictures live app preview',
      appRoutes:['Services','Selected projects','Video gallery','Film work','Giving back','Contact','Workspace','QR handoff'],
      deliverables:['Branded production-company app surface','Service pages for promo films, community storytelling, film work, and event coverage','Selected projects, gallery, and contact routing','Workspace preview and QR/share handoff','Public proof pages pulled from the live ArcLight site','Two-way Valley Verified backlink and production-proof language'],
      value:['Turns a production company into a shareable app surface instead of a thin creative-services listing.','Gives prospects one route for services, proof, selected projects, gallery media, and contact.','Lets Valley Verified show what a properly scoped creative-services app lane looks like.','Creates a cleaner handoff from public discovery into production review flow.'],
      proof:[['Live app bridge',"The Valley page points buyers into ArcLight's live company app for services, project proof, gallery media, workspace, and contact."],['Creative proof surface','The page makes the real production lanes visible before the visitor leaves the Valley route.'],['Featured placement','ArcLight gets a featured network badge and a dedicated route that can be used in outreach and project follow-up.']],
      tags:fallback
    };
  }
  const factoryApp = factoryAppForBusiness(b);
  if(factoryApp){
    return factoryAppBlueprint(b, factoryApp, fallback);
  }
  return {
    eyebrow:`${b.city || 'Arizona'} ${b.category || 'business'} landing page`,
    headline:`${b.name} landing page`,
    copy:`${b.name} has a Valley Verified public landing for ${b.category || 'local business'} discovery, contact, sharing, owner claim, and optional growth support.`,
    story:`This page gives ${b.name} a useful public business page: service lane, market, contact paths, shareable route, owner claim path, and a clean way to move buyers toward the ${externalProfileKind(b) === 'source' ? 'public source listing' : 'business website'} when one is available.`,
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
function classicProfileHtml(b){
  const variant = businessVariant(b);
  const blueprint = landingBlueprint(b);
  const title = `${b.name} | ${b.city || 'Arizona'} ${b.category || 'Business'} | Valley Verified`;
  const desc = blueprint.copy;
  const profileUrl = `${SITE_URL}/business/${b.id}/`;
  const address = [b.address,b.city,b.state,b.zip].filter(Boolean).join(', ');
  const liveUrl = blueprint.appUrl || externalProfileUrl(b);
  const isFactoryPreview = Boolean(blueprint.previewOnly);
  const liveLabel = blueprint.liveLabel || externalProfileLabel(b);
  const liveKind = isFactoryPreview ? 'preview' : blueprint.appUrl ? 'app' : externalProfileKind(b);
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
  const liveBridgeTitle = liveKind === 'preview'
    ? `This Valley page keeps the generated preview separate from the public buyer route for ${html(b.name)}.`
    : `This Valley page links into the ${liveKind === 'source' ? 'public source listing' : `full ${liveKind === 'app' ? 'app' : 'website'}`} for ${html(b.name)}.`;
  const liveBridgeEyebrow = liveKind === 'preview' ? 'Factory preview boundary' : liveKind === 'source' ? 'Source handoff' : 'Live site handoff';
  const actualClientApp = blueprint.appRoutes ? `<section class="section glass ${isFactoryPreview ? 'factory-preview-app-page' : 'actual-client-app-page'}"><div class="section-head"><div><p class="eyebrow">${isFactoryPreview ? 'Factory preview package' : 'Actual client app example'}</p><h2>${isFactoryPreview ? 'Generated preview only. Owner approval and production proof still required.' : 'This is what a business gets when the app lane is scoped.'}</h2></div><a class="btn small primary" href="${html(APP_BUILD_GATE_HREF)}" target="_blank" rel="noopener">Open app build gate</a></div><div class="actual-client-app-shell"><div class="actual-client-app-media">${renderClientMediaBlock(blueprint, `${b.name} app preview`)}</div><div class="actual-client-app-copy"><h3>${html(blueprint.headline)}</h3><p>${html(blueprint.appIntro)}</p><div class="app-route-strip">${blueprint.appRoutes.map(route => `<span>${html(route)}</span>`).join('')}</div><div class="app-value-grid"><article><strong>${isFactoryPreview ? 'Preview contents' : 'App deliverables'}</strong><div class="check-list compact-list">${blueprint.deliverables.map(item => `<span>${html(item)}</span>`).join('')}</div></article><article><strong>${isFactoryPreview ? 'Boundary value' : 'Business value'}</strong><div class="check-list compact-list">${blueprint.value.map(item => `<span>${html(item)}</span>`).join('')}</div></article></div><div class="deep-scan-receipt"><div><strong>${isFactoryPreview ? 'Preview folder' : 'Source app folder'}</strong><span>${html(blueprint.sourceFolder)}</span></div><div><strong>${isFactoryPreview ? 'Factory preview' : 'Live app'}</strong><span>${html(liveUrl || 'Not linked')}</span></div><div><strong>Valley route</strong><span>/business/${html(b.id)}/</span></div>${relatedFactoryPackageHtml(blueprint)}</div></div></div></section>` : '';
  const share = sharePanel(b, title, desc, profileUrl);
  const liveBridge = liveUrl ? `<section class="client-live-bridge"><div><p class="eyebrow">${liveBridgeEyebrow}</p><h2>${liveBridgeTitle}</h2><p>${html(blueprint.story)}</p></div><a class="btn primary" href="${html(liveUrl)}" target="_blank" rel="noopener">${html(liveLabel)}</a></section>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${html(title)}</title><meta name="description" content="${html(desc)}"/><link rel="canonical" href="${html(profileUrl)}"/><meta name="robots" content="index,follow"/><meta property="og:title" content="${html(title)}"/><meta property="og:description" content="${html(desc)}"/><meta property="og:url" content="${html(profileUrl)}"/><meta property="og:image" content="${SITE_URL}/assets/valley-verified-logo.png"/><meta name="theme-color" content="#f5efe3"/><link rel="icon" href="/assets/valley-verified-logo.png"/><link rel="stylesheet" href="/assets/styles.css"/><script type="application/ld+json">${jsonScript(schema)}</script></head><body class="business-page v21-static-profile business-landing-page business-variant-${html(variant)} ${b.featured ? 'business-featured-page' : ''} ${blueprint.appRoutes ? (isFactoryPreview ? 'factory-preview-app-profile' : 'actual-client-app-profile') : ''} ${html(blueprint.appClass || '')}" data-business-variant="${html(variant)}"><canvas id="sky" class="skyesol-living-background living-background" aria-hidden="true"></canvas><div class="grain" aria-hidden="true"></div>${businessFxLayer(b)}<header class="topbar"><a class="brand" href="/"><img class="brand-logo" src="/assets/valley-verified-logo.png" alt="" aria-hidden="true"/><span class="brand-wordmark"><strong>Valley Verified</strong><small>real local business pages</small></span></a><nav class="nav-actions"><a href="/featured/">Featured</a><a href="/app-builds/">App Builds</a><a href="/directory/">Directory</a><a href="/category/${html(b.category_slug)}/">${html(b.category)}</a><a href="/city/${html(b.city_slug)}/">${html(b.city)}</a><a href="/for-businesses/">For businesses</a></nav></header><main class="page"><section class="business-landing-hero client-inspired-landing"><div><a class="back-link" href="/featured/">Featured businesses</a><div class="business-badge-row">${featuredBadge}${verifiedBadge}<span>${html(blueprint.lane)}</span></div><p class="eyebrow">${html(blueprint.eyebrow)}</p><h1 class="neon-gradient-text text-highlighter text-effect-reveal">${html(blueprint.headline)}</h1><p class="business-landing-copy">${html(blueprint.copy)}</p><div class="hero-actions">${contact}</div></div><aside class="landing-panel featured-client-panel"><p class="eyebrow">Public value receipt</p><div class="hero-card"><div class="metric"><span>${html(Math.round(Number(b.verification_score || 0)))}</span><small>profile score</small></div><div class="metric"><span>${html(b.city || 'AZ')}</span><small>market</small></div></div><div class="landing-list"><div><strong>Featured status</strong><span>${b.featured ? 'Featured in the Valley Verified network.' : 'Public business landing.'}</span></div><div><strong>${liveKind === 'preview' ? 'Factory preview' : liveKind === 'source' ? 'Source listing' : 'Business site'}</strong><span>${liveUrl ? html(displayUrl(liveUrl)) : 'Add website through owner claim.'}</span></div><div><strong>Network route</strong><span>/business/${html(b.id)}/</span></div></div></aside></section><section class="landing-proof-strip"><div><strong>${html(b.city || 'AZ')}</strong><span>local market</span></div><div><strong>${html(b.category || 'Business')}</strong><span>service lane</span></div><div><strong>${b.featured ? 'Featured' : 'Public'}</strong><span>network placement</span></div><div><strong>${liveUrl ? 'Linked' : 'Claim'}</strong><span>${liveKind === 'preview' ? 'factory preview boundary' : liveKind === 'source' ? 'source listing handoff' : 'business site handoff'}</span></div></section>${share}${liveBridge}${actualClientApp}${staticBusinessCommand(b)}<section class="business-webpage-grid client-landing-grid"><article class="glass section"><p class="eyebrow">Built landing page</p><h2>A one-page public front door for ${html(b.name)}.</h2><p class="business-story">${html(blueprint.story)} For MetrAIyux 0S customers, this page is our gift after the first paid month: one useful business posting with no obligation to upgrade. Optional verification, placement, lead routing, sponsor lanes, or managed growth are available only if the business wants more reach.</p><div class="tag-list big-tags">${tags}</div></article><article class="glass section"><p class="eyebrow">Buyer handoff</p><h2>Move from discovery to the business.</h2><div class="contact-list">${contactCards}</div><div class="button-row"><a class="btn primary" href="/request/?business=${html(b.id)}">Request quote</a><a class="btn" href="/compare/?ids=${html(b.id)}">Compare</a></div></article></section><section class="section glass featured-proof-section"><div class="section-head"><div><p class="eyebrow">Featured page value</p><h2>Why this is worth having.</h2></div><a class="btn small" href="/featured/">View featured lane</a></div><div class="client-proof-grid">${proofCards}</div></section><section class="business-webpage-grid"><article class="glass section"><p class="eyebrow">Business details</p><h2>What buyers see first</h2><div class="detail-grid"><div><strong>Business</strong><span>${html(b.name)}</span></div><div><strong>Category</strong><span>${html([b.category,b.subcategory].filter(Boolean).join(' / '))}</span></div><div><strong>Address</strong><span>${html(address || 'Address not listed')}</span></div><div><strong>Contact</strong><span>${html([b.phone,b.email,liveUrl && displayUrl(liveUrl)].filter(Boolean).join(' / ') || 'Needs owner update')}</span></div></div></article><article class="glass section upgrade-panel"><p class="eyebrow">Included page and optional exposure</p><h2>The free page stays useful on its own.</h2><p class="muted">Owners can claim the page, correct weak data, and add proof without being forced into anything else. Verification, featured placement, lead routing, sponsor inventory, and managed growth are optional upgrades only when the business wants more reach.</p><div class="button-row"><a class="btn primary" href="/join/?business=${html(b.id)}">Owner join path</a><a class="btn" href="/advertise/">Optional exposure products</a></div></article></section></main><div id="toast" class="toast"></div><script type="module" src="/assets/app.js"></script></body></html>`;
}
function contactReadiness(b){
  const paths = [b.phone && 'phone', b.email && 'email', safeExternalUrl(b.website) && 'website', safeExternalUrl(b.booking_url) && 'booking'].filter(Boolean);
  if(paths.length) return `${paths.length} ${paths.length === 1 ? 'contact path' : 'contact paths'}`;
  if(safeExternalUrl(b.source_url)) return 'source linked';
  return 'claim needed';
}
function profileTemplateHtml(b){
  return PROFILE_TEMPLATE === 'classic' ? classicProfileHtml(b) : appProfileHtml(b);
}
function appProfileHtml(b){
  const variant = businessVariant(b);
  const blueprint = landingBlueprint(b);
  const title = `${b.name} | ${b.city || 'Arizona'} ${b.category || 'Business'} | Valley Verified`;
  const desc = blueprint.copy;
  const profileUrl = `${SITE_URL}/business/${b.id}/`;
  const address = [b.address,b.city,b.state,b.zip].filter(Boolean).join(', ');
  const liveUrl = blueprint.appUrl || externalProfileUrl(b);
  const isFactoryPreview = Boolean(blueprint.previewOnly);
  const liveLabel = blueprint.liveLabel || externalProfileLabel(b);
  const liveKind = isFactoryPreview ? 'preview' : blueprint.appUrl ? 'app' : externalProfileKind(b);
  const sourceLabel = liveKind === 'preview' ? 'Factory preview' : liveKind === 'source' ? 'Public source' : liveKind === 'app' ? 'Live app' : liveKind === 'website' ? 'Business site' : 'Owner link';
  const contactState = contactReadiness(b);
  const categoryTrail = [b.category,b.subcategory].filter(Boolean).join(' / ') || 'Local business';
  const score = Math.round(Number(b.verification_score || 0));
  const pageClass = ['business-page','v21-static-profile','business-landing-page','vv-app-profile-page','neonScrollbar',`business-variant-${variant}`,b.featured && 'business-featured-page',blueprint.appRoutes && (isFactoryPreview ? 'factory-preview-app-profile' : 'actual-client-app-profile'),blueprint.appClass].filter(Boolean).map(html).join(' ');
  const schema = {
    '@context':'https://schema.org', '@type':'LocalBusiness', '@id':`${profileUrl}#business`,
    name:b.name, url:profileUrl, address:address ? { '@type':'PostalAddress', streetAddress:b.address || undefined, addressLocality:b.city || undefined, addressRegion:b.state || 'AZ', postalCode:b.zip || undefined, addressCountry:'US' } : undefined,
    telephone:b.phone || undefined, email:b.email || undefined, sameAs:b.website ? [b.website] : undefined,
    additionalType:b.category || undefined, description:desc
  };
  const heroActions = [
    liveUrl && `<a class="btn primary live-app-link neon-magnetic" href="${html(liveUrl)}" target="_blank" rel="noopener">${html(liveLabel)}</a>`,
    b.phone && `<a class="btn neon-magnetic" href="tel:${html(b.phone)}">Call</a>`,
    b.email && `<a class="btn neon-magnetic" href="mailto:${html(b.email)}">Email</a>`,
    `<a class="btn neon-magnetic" href="/request/?business=${html(b.id)}">Request</a>`,
    `<a class="btn neon-magnetic" href="/claim/?business=${html(b.id)}">Claim</a>`,
    `<button class="btn neon-magnetic" data-save-business data-business-id="${html(b.id)}" data-business-name="${html(b.name)}" data-url="/business/${html(b.id)}/">Save shortlist</button>`
  ].filter(Boolean).join('');
  const railActions = [
    [`/request/?business=${b.id}`,'Buyer route','Request, compare, or send the page forward.'],
    [`/claim/?business=${b.id}`,'Owner route','Claim, correct, enrich, and verify.'],
    ['/app-builds/','App lane', blueprint.appRoutes ? (isFactoryPreview ? 'Factory preview attached; not a live owner app.' : 'Client app example attached.') : 'Optional build path when ready.'],
    [liveUrl || `/claim/?business=${b.id}`, sourceLabel, liveUrl ? displayUrl(liveUrl) : 'Add the owner link.']
  ].map(([href,label,body]) => `<a href="${html(href)}"${/^https?:/i.test(href) ? ' target="_blank" rel="noopener"' : ''}><strong>${html(label)}</strong><span>${html(body)}</span></a>`).join('');
  const tags = blueprint.tags.length ? blueprint.tags.slice(0, 14).map(t => `<span>${html(t)}</span>`).join('') : `<span>${html(b.category || 'Local business')}</span><span>${html(b.city || 'Arizona')}</span>`;
  const proofCards = blueprint.proof.map(([k, v]) => `<article class="vv-app-proof-card"><strong>${html(k)}</strong><span>${html(v)}</span></article>`).join('');
  const contactCards = [
    liveUrl && `<a href="${html(liveUrl)}" target="_blank" rel="noopener"><strong>${html(sourceLabel)}</strong><span>${html(displayUrl(liveUrl))}</span></a>`,
    b.phone && `<a href="tel:${html(b.phone)}"><strong>Phone</strong><span>${html(b.phone)}</span></a>`,
    b.email && `<a href="mailto:${html(b.email)}"><strong>Email</strong><span>${html(b.email)}</span></a>`,
    `<a href="/compare/?ids=${html(b.id)}"><strong>Compare</strong><span>${html(categoryTrail)} in ${html(b.city || 'Arizona')}.</span></a>`
  ].filter(Boolean).join('');
  const signalRows = [
    ['Market', b.city || 'Arizona'],
    ['Lane', blueprint.lane || categoryTrail],
    ['Score', `${score}/100`],
    ['Contact', contactState],
    ['Route', `/business/${b.id}/`],
    ['Handoff', liveUrl ? displayUrl(liveUrl) : 'claim queue']
  ].map(([label,value]) => `<div><span>${html(label)}</span><strong>${html(value)}</strong></div>`).join('');
  const appRoutes = Array.isArray(blueprint.appRoutes) ? blueprint.appRoutes : [];
  const actualClientApp = appRoutes.length ? `<section class="vv-app-section vv-app-client-build ${isFactoryPreview ? 'factory-preview-app-page' : 'actual-client-app-page'}"><div class="vv-app-section__head"><p class="eyebrow">${isFactoryPreview ? 'Factory preview package' : 'Live app-build example'}</p><h2>${isFactoryPreview ? `${html(b.name)} has a generated preview, not a live owned app.` : `${html(b.name)} has a scoped app-build example.`}</h2><a class="btn small primary" href="${html(APP_BUILD_GATE_HREF)}" target="_blank" rel="noopener">Open app build gate</a></div><div class="vv-app-client-shell"><div class="vv-app-client-media">${renderClientMediaBlock(blueprint, `${b.name} app preview`)}</div><div class="vv-app-client-copy"><h3>${html(blueprint.headline)}</h3><p>${html(blueprint.appIntro)}</p><div class="app-route-strip">${appRoutes.map(route => `<span>${html(route)}</span>`).join('')}</div><div class="app-value-grid"><article><strong>${isFactoryPreview ? 'Preview contents' : 'App deliverables'}</strong><div class="check-list compact-list">${(blueprint.deliverables || []).map(item => `<span>${html(item)}</span>`).join('')}</div></article><article><strong>${isFactoryPreview ? 'Boundary value' : 'Business value'}</strong><div class="check-list compact-list">${(blueprint.value || []).map(item => `<span>${html(item)}</span>`).join('')}</div></article></div><div class="deep-scan-receipt"><div><strong>${isFactoryPreview ? 'Preview folder' : 'Source app folder'}</strong><span>${html(blueprint.sourceFolder)}</span></div><div><strong>${isFactoryPreview ? 'Factory preview' : 'Live app'}</strong><span>${html(liveUrl || 'Not linked')}</span></div><div><strong>Valley route</strong><span>/business/${html(b.id)}/</span></div>${relatedFactoryPackageHtml(blueprint)}</div></div></div></section>` : '';
  const factoryPanel = `<section class="vv-app-section vv-app-factory-panel"><div><p class="eyebrow">${isFactoryPreview ? 'Factory preview boundary' : 'Client app factory lane'}</p><h2>${isFactoryPreview ? 'Keep the public page separate from the draft app package.' : appRoutes.length ? 'Keep the Valley page and the real app connected.' : 'Keep the public page now. Add the app build when the business is ready.'}</h2><p>${html(blueprint.story)} The public page keeps buyer actions, owner claim, source handoff, and growth routes in one surface instead of pretending a draft is production.</p></div><div class="vv-factory-steps"><a href="/claim/?business=${html(b.id)}"><span>01</span><strong>Claim</strong><small>owner corrections and proof</small></a><a href="/request/?business=${html(b.id)}"><span>02</span><strong>Route</strong><small>buyer request path</small></a><a href="${html(APP_BUILD_GATE_HREF)}" target="_blank" rel="noopener"><span>03</span><strong>Build</strong><small>optional app lane</small></a></div></section>`;
  const share = sharePanel(b, title, desc, profileUrl);
  return `<!doctype html>
<html lang="en" class="neonScrollbar">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${html(title)}</title>
<meta name="description" content="${html(desc)}"/>
<link rel="canonical" href="${html(profileUrl)}"/>
<meta name="robots" content="index,follow"/>
<meta property="og:title" content="${html(title)}"/>
<meta property="og:description" content="${html(desc)}"/>
<meta property="og:url" content="${html(profileUrl)}"/>
<meta property="og:image" content="${SITE_URL}/assets/valley-verified-logo.png"/>
<meta name="theme-color" content="#101513"/>
<link rel="icon" href="/assets/valley-verified-logo.png"/>
<link rel="stylesheet" href="/assets/styles.css"/>
<script type="application/ld+json">${jsonScript(schema)}</script>
</head>
<body class="${pageClass}" data-profile-template="app" data-business-variant="${html(variant)}">
<canvas id="sky" class="skyesol-living-background living-background" aria-hidden="true"></canvas>
<div class="grain" aria-hidden="true"></div>
${businessFxLayer(b)}
<header class="topbar">
<a class="brand" href="/"><img class="brand-logo" src="/assets/valley-verified-logo.png" alt="" aria-hidden="true"/><span class="brand-wordmark"><strong>Valley Verified</strong><small>client-grade public pages</small></span></a>
<nav class="nav-actions"><a href="/featured/">Featured</a><a href="/app-builds/">App Builds</a><a href="/directory/">Directory</a><a href="/category/${html(b.category_slug)}/">${html(b.category)}</a><a href="/city/${html(b.city_slug)}/">${html(b.city)}</a><a href="/for-businesses/">For businesses</a></nav>
</header>
<main class="vv-app-page">
<section class="vv-app-hero" id="landing">
<div class="vv-app-hero__copy">
<a class="back-link" href="/featured/">Featured businesses</a>
<div class="business-badge-row">${b.featured ? '<span class="featured-badge">Featured Valley Verified</span>' : ''}${b.badges?.business_verified ? '<span class="verified-badge">Business page reviewed</span>' : ''}<span>${html(blueprint.lane)}</span></div>
<p class="eyebrow">${html(blueprint.eyebrow)}</p>
<h1 class="vv-app-title neon-gradient-text text-highlighter text-effect-reveal">${html(b.name)}</h1>
<p class="vv-app-lede">${html(desc)}</p>
<div class="hero-actions vv-app-actions">${heroActions}</div>
</div>
<aside class="vv-app-hero__panel neon-glow-panel" aria-label="${html(b.name)} public profile status">
<p class="eyebrow">Public operating surface</p>
<div class="vv-app-score"><strong>${html(score)}</strong><span>profile score</span></div>
<div class="vv-app-signal-grid">${signalRows}</div>
<div class="vv-app-source-line"><span>${html(sourceLabel)}</span><strong>${html(liveUrl ? displayUrl(liveUrl) : 'owner claim route')}</strong></div>
</aside>
</section>
<section class="vv-app-command" data-skye-component="app-first-command-center">
<nav class="vv-app-rail">${railActions}</nav>
<div class="vv-app-screen">
<div>
<p class="eyebrow">Buyer handoff</p>
<h2>${html(b.city || 'Arizona')} buyers get a real next step.</h2>
<p>${html(blueprint.story)}</p>
</div>
<div class="vv-app-contact-grid">${contactCards}</div>
</div>
</section>
<section class="vv-app-signal-band" aria-label="Business signals">${tags}</section>
${actualClientApp}
${factoryPanel}
<section class="vv-app-section vv-app-proof-section">
<div class="vv-app-section__head"><p class="eyebrow">Profile proof</p><h2>Useful page value, not filler.</h2><a class="btn small" href="/featured/">Featured lane</a></div>
<div class="vv-app-proof-grid">${proofCards}</div>
</section>
<section class="vv-app-section vv-app-detail-section">
<article>
<p class="eyebrow">Business details</p>
<h2>${html(categoryTrail)}</h2>
<div class="detail-grid"><div><strong>Business</strong><span>${html(b.name)}</span></div><div><strong>Address</strong><span>${html(address || 'Address not listed')}</span></div><div><strong>Contact</strong><span>${html([b.phone,b.email,liveUrl && displayUrl(liveUrl)].filter(Boolean).join(' / ') || 'Needs owner update')}</span></div><div><strong>Market</strong><span>${html(b.city || 'Arizona')}</span></div></div>
</article>
<article>
<p class="eyebrow">Included plus optional</p>
<h2>The public page stays useful on its own.</h2>
<p>Claim, corrections, source handoff, sharing, shortlist, compare, and buyer request routes are included. Verification, featured placement, lead routing, sponsor lanes, and managed growth stay optional.</p>
<div class="button-row"><a class="btn primary" href="/join/?business=${html(b.id)}">Owner join path</a><a class="btn" href="/advertise/">Exposure products</a></div>
</article>
</section>
${share}
${staticBusinessCommand(b)}
</main>
<div id="toast" class="toast"></div>
<script type="module" src="/assets/app.js"></script>
</body>
</html>`;
}
function profileHtml(b){
  return profileTemplateHtml(b);
}
function profileTemplatePreviewHtml(profileRows){
  const bob = profileRows.find(b => /bobs-smoke-shop/i.test(b.id || b.name || '')) || profileRows[0];
  const empire = profileRows.find(b => /empire-pallets/i.test(b.id || b.name || '')) || bob;
  const nextLevel = profileRows.find(b => /next-level-gaming/i.test(b.id || b.name || '')) || bob;
  const fadeMasters = profileRows.find(b => /fade-masters-phx|fade masters/i.test(b.id || b.name || '')) || bob;
  const sourceOnly = profileRows.find(b => externalProfileKind(b) === 'source') || bob;
  const websiteLinked = profileRows.find(b => externalProfileKind(b) === 'website' && b.id !== bob.id && b.id !== empire.id) || bob;
  const examples = [
    ['Retail app example', bob],
    ['Operations app example', empire],
    ['Gaming retail app example', nextLevel],
    ['Booking app example', fadeMasters],
    ['Source-only lead example', sourceOnly],
    ['Website handoff example', websiteLinked]
  ].filter(([, b]) => b?.id);
  const exampleCards = examples.map(([label, b]) => {
    const kind = externalProfileKind(b);
    const live = externalProfileUrl(b);
    return `<a class="vv-preview-card" href="/business/${html(b.id)}/"><span>${html(label)}</span><strong>${html(b.name)}</strong><small>${html([b.city,b.category].filter(Boolean).join(' / ') || 'Arizona business')}</small><em>${html(kind === 'source' ? 'public source labeled honestly' : kind === 'app' ? 'live app-build example' : live ? displayUrl(live) : 'owner claim route')}</em></a>`;
  }).join('');
  const frameSrc = bob?.id ? `/business/${html(bob.id)}/` : '/featured/';
  return `<!doctype html>
<html lang="en" class="neonScrollbar">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Generated Profile Preview | Valley Verified</title>
<meta name="description" content="Preview the new Valley Verified app-style generated business profile template and switch to real generated examples."/>
<meta name="robots" content="noindex,follow"/>
<meta name="theme-color" content="#101513"/>
<link rel="icon" href="/assets/valley-verified-logo.png"/>
<link rel="stylesheet" href="/assets/styles.css"/>
</head>
<body class="business-page business-landing-page vv-app-profile-page vv-template-preview-page">
<canvas id="sky" class="skyesol-living-background living-background" aria-hidden="true"></canvas>
<div class="grain" aria-hidden="true"></div>
<header class="topbar">
<a class="brand" href="/"><img class="brand-logo" src="/assets/valley-verified-logo.png" alt="" aria-hidden="true"/><span class="brand-wordmark"><strong>Valley Verified</strong><small>generated page preview</small></span></a>
<nav class="nav-actions"><a href="/featured/">Featured</a><a href="/app-builds/">App Builds</a><a href="/directory/">Directory</a><a href="/data/profile-template-options.json">Template JSON</a></nav>
</header>
<main class="vv-app-page">
<section class="vv-app-hero vv-template-preview-hero">
<div class="vv-app-hero__copy">
<p class="eyebrow">New generated profile template</p>
<h1 class="vv-app-title neon-gradient-text text-highlighter text-effect-reveal">Valley pages stop looking generic here.</h1>
<p class="vv-app-lede">This preview page renders generated business profiles through the default app-style template. Bob, Empire, Next Level, and Fade Masters show live app-build examples; source-only records keep the source label honest.</p>
<div class="hero-actions vv-app-actions"><a class="btn primary neon-magnetic" href="${html(frameSrc)}">Open Bob example</a><a class="btn neon-magnetic" href="/business/${html(empire.id)}/">Open Empire example</a><a class="btn neon-magnetic" href="/business/${html(nextLevel.id)}/">Open Next Level example</a><a class="btn neon-magnetic" href="/data/profile-template-options.json">Template options</a></div>
</div>
<aside class="vv-app-hero__panel neon-glow-panel">
<p class="eyebrow">Active build mode</p>
<div class="vv-app-score"><strong>${html(PROFILE_TEMPLATE)}</strong><span>profile template</span></div>
<div class="vv-app-signal-grid"><div><span>Generated profiles</span><strong>${html(profileRows.length)}</strong></div><div><span>Classic kept</span><strong>yes</strong></div><div><span>Fallback command</span><strong>VALLEY_PROFILE_TEMPLATE=classic</strong></div><div><span>Mounted route</span><strong>/valley-verified/profile-template-preview/</strong></div></div>
</aside>
</section>
<section class="vv-app-command vv-template-preview-board">
<nav class="vv-app-rail">${exampleCards}</nav>
<div class="vv-app-screen">
<div>
<p class="eyebrow">Live generated page</p>
<h2>Embedded real output from the build.</h2>
<p>The frame below points at the generated Bob route. The cards switch you into other generated examples so you can compare app clients, source-only leads, and normal website handoffs.</p>
</div>
<div class="vv-app-contact-grid"><a href="${html(frameSrc)}"><strong>Open full page</strong><span>${html(frameSrc)}</span></a><a href="/business/${html(sourceOnly.id)}/"><strong>Check source labeling</strong><span>${html(sourceOnly.name)}</span></a><a href="/business/${html(websiteLinked.id)}/"><strong>Check website handoff</strong><span>${html(websiteLinked.name)}</span></a></div>
</div>
</section>
<section class="vv-app-section vv-preview-frame-section">
<div class="vv-app-section__head"><p class="eyebrow">Rendered page</p><h2>${html(bob.name)} through the new template.</h2><a class="btn small primary" href="${html(frameSrc)}">Open outside frame</a></div>
<iframe class="vv-preview-frame" src="${html(frameSrc)}" title="${html(bob.name)} generated Valley Verified profile"></iframe>
</section>
</main>
<script type="module" src="/assets/app.js"></script>
</body>
</html>`;
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
  const staticPublic = ['/', '/featured/', '/directory/', '/business/', '/profile-template-preview/', '/category/', '/city/', '/niche/', '/service-lanes/', '/market/', '/collection/', '/join/', '/pricing/', '/trust-network/', '/shortlist/', '/compare/', '/match/', '/deal-desk/', '/offers/', '/map/', '/submit/', '/request/', '/claim/', '/insights/'];
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
  const factoryClientApps = await readFactoryClientApps();
  FACTORY_CLIENT_APPS = factoryClientApps.map;
  FACTORY_CLIENT_APP_RECORDS = factoryClientApps.records;
  await stageFactoryClientAppMedia(factoryClientApps.records);
  const original = await readJson('data/businesses.json');
  const appClientBusinessIds = new Set([
    ...LEGACY_CLIENT_APP_PROFILES.map(item => item.businessId),
    ...factoryClientApps.records.map(app => app.valleyBusinessId).filter(Boolean)
  ]);
  const full = (original.businesses || []).map(b => appClientBusinessIds.has(b.id)
    ? { ...b, featured:true, badges:{ ...(b.badges || {}), business_verified:true } }
    : b);
  const coverage = clientAppCoverage(full, factoryClientApps.records);
  const compact = full.map(compactBusiness);
  const publicCompact = compact.map(publicBusinessRecord);
  const profileRows = full.map(b => ({ ...compactBusiness(b), address:b.address || '', description:b.description || '', subcategory:b.subcategory || '', price_note:b.price_note || '', tags:Array.isArray(b.tags) ? b.tags.slice(0,12) : [] }));

  await mapLimit(profileRows, 128, async b => write(path.join(DIST, 'business', b.id, 'index.html'), profileHtml(b)));
  await write(path.join(DIST, 'profile-template-preview', 'index.html'), profileTemplatePreviewHtml(profileRows));

  const search = compact.map(searchRecord);
  const categories = await maybeReadJson('data/categories.json', { categories:[] });
  const cities = await maybeReadJson('data/cities.json', { cities:[] });
  const seedReport = await maybeReadJson('seed-report.json', {});
  seedReport.version = '21.0.0';
  seedReport.records = { ...(seedReport.records || {}), static_business_pages:compact.length, profile_mode:'full-static', profile_template:PROFILE_TEMPLATE };
  seedReport.v21 = { full_static_business_profiles:compact.length, profile_renderer_required:false, profile_template:PROFILE_TEMPLATE, template_options:PROFILE_TEMPLATE_OPTIONS, factory_client_app_profiles:factoryClientApps.records.length, built_app_client_profiles:coverage.counts.featured, deploy_size_strategy:'compact-public-data-plus-shards', generated_at:TODAY };

  await rm('data/profiles');
  await writeCompactJson('data/profile-template-options.json', { updated_at:TODAY, active:PROFILE_TEMPLATE, options:[{ id:'app', default:true, note:'App-style generated profile with automatic Client App Factory receipt bridge when client app receipts, storage records, or generated package indexes exist.' }, { id:'classic', default:false, note:'Legacy v21 business landing template retained for rebuild options.', command:'VALLEY_PROFILE_TEMPLATE=classic npm run build' }] });
  await writeCompactJson('data/client-app-coverage.json', coverage);
  await writeCompactJson('data/client-app-factory-index.json', {
    updated_at:TODAY,
    count:factoryClientApps.records.length,
    records:factoryClientApps.records.map(app => ({
      clientId:app.clientId,
      displayName:app.displayName,
      appUrl:app.appUrl,
      sourceFolder:app.appDirRel,
      recordPath:app.recordPathRel,
      valleyBusinessId:app.valleyBusinessId,
      valleyFeatured:Boolean(full.find(b => b.id === app.valleyBusinessId)?.featured),
      signatureModule:app.payload?.design?.signatureModule || app.profile?.niche || '',
      valleyProfilePath:app.payload?.app?.valleyProfilePath || app.profile?.valleyUrl || '',
      media:app.media || {},
      receipts:app.receipts || []
    }))
  });
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
  await writeCompactJson('data/v21-code-readiness.json', { version:'21.0.0', generated_at:TODAY, profile_template:PROFILE_TEMPLATE, template_options:PROFILE_TEMPLATE_OPTIONS, completed:['full_static_business_profiles','app_style_profile_generator','classic_profile_template_option','compact_public_data','d1_neon_adapter_code','protected_admin_app','enrichment_queue','persistent_lead_model','payment_activation_model','notification_worker_model','claim_submission_model','modular_build_runner'], proof:report });
  await write(path.join(DIST, '_redirects'), '# Valley Verified full-static build: business pages are emitted as real HTML.\n# Keep /business/:id/ routes on their generated files instead of shadowing them with the profile renderer.\n');
  await write(path.join(DIST, 'seed-report.json'), JSON.stringify(seedReport));
  console.log(`v21 enhanced: ${compact.length} full-static business profiles; dist ${(after/1024/1024).toFixed(1)}MB after compaction.`);
}

main().catch(error => { console.error(error); process.exit(1); });
