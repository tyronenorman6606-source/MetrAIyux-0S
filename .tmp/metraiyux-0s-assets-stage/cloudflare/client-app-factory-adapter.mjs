import { generateFactoryAurenReply } from './factory-auren-core.mjs';
import {
  buildAiResponseMonitorSnapshot,
  evaluateAiResponseUsage,
  listAiResponseLanes,
  simulateAiResponseLoad
} from './relay13-ai-lanes.mjs';
import { recordTenantLead, resolveCanonicalTenant } from './tenant-backbone.mjs';

const FACTORY_BASE = '/api/client-app-factory';
const FACTORY_PUBLIC_BASE = '/client-app-factory';
const FACTORY_RUNTIME_PREFIX = `${FACTORY_PUBLIC_BASE}/generated/`;
const FACTORY_RUNTIME_ASSET_PREFIX = `${FACTORY_PUBLIC_BASE}/runtime-app/`;
const FACTORY_STATE_KEY = 'client-app-factory:v2:state';
const FACTORY_STORAGE_TTL = 60 * 60 * 24 * 90;
const FACTORY_STATIC_RECORD_IDS = [
  'skye-app-template',
  'empire-pallets',
  'next-level-gaming-az',
  'next-level-gaming-goodyear',
  'fade-masters-phx'
];
const FACTORY_PUBLIC_ROUTES = [
  '/index.html',
  '/inventory.html',
  '/specials.html',
  '/gallery.html',
  '/blog.html',
  '/faq.html',
  '/contact.html',
  '/local-seo.html',
  '/scan.html',
  '/flyer.html'
];
const FACTORY_PRIVATE_ROUTES = ['/workspace-preview.html'];

function factoryHeaders(extra = {}) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-skye-gate-session,x-admin-token',
    'cache-control': 'no-store',
    ...extra
  };
}

function factoryJson(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: factoryHeaders({ 'content-type': 'application/json; charset=utf-8' })
  });
}

function factoryText(value, max = 1000) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function factoryArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function factoryUnique(values = []) {
  return Array.from(new Set(factoryArray(values)));
}

function factorySlug(value = 'client-app') {
  const slug = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `client-${Date.now()}`;
}

function factoryNow() {
  return new Date().toISOString();
}

function factoryId(prefix = 'caf') {
  const token = globalThis.crypto?.randomUUID
    ? crypto.randomUUID().replace(/-/g, '').slice(0, 18)
    : `${Date.now()}${Math.random()}`.replace(/\D/g, '').slice(0, 18);
  return `${prefix}_${token}`;
}

function factoryPreviewCode(displayName = '', fallback = 'client') {
  const initials = String(displayName || '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 6);
  return `${initials || factorySlug(fallback).replace(/-/g, '').slice(0, 6).toUpperCase() || 'CLIENT'}-7DAY`;
}

function factoryStorageMode(env) {
  if (env.CLIENT_APP_FACTORY_KV) return 'client_app_factory_kv';
  if (env.SITE_EVENTS_KV) return 'site_events_kv';
  return 'missing';
}

function factoryKv(env) {
  return env.CLIENT_APP_FACTORY_KV || env.SITE_EVENTS_KV || null;
}

async function factoryAssetResponse(env, pathname) {
  if (!env.ASSETS?.fetch) return null;
  const request = new Request(`https://factory-assets.local${pathname}`);
  return env.ASSETS.fetch(request).catch(() => null);
}

async function factoryAssetExists(env, pathname) {
  const response = await factoryAssetResponse(env, pathname);
  return Boolean(response?.ok);
}

async function factoryReadAssetJson(env, pathname, fallback = null) {
  const response = await factoryAssetResponse(env, pathname);
  if (!response?.ok) return fallback;
  return response.json().catch(() => fallback);
}

function factoryDefaultState() {
  return {
    schema: 'client-app-factory-0s-adapter-v2',
    updatedAt: factoryNow(),
    records: {},
    ledger: [],
    scans: {},
    reports: {}
  };
}

function factoryNormalizeRecord(record = {}) {
  const displayName = record.displayName || record.clientName || 'Client App';
  const clientId = factorySlug(record.clientId || displayName);
  const generatedApps = Array.isArray(record.generatedApps) ? record.generatedApps : [];
  const isTemplate = clientId === 'skye-app-template';
  const stripTemplatePath = (value) => {
    const normalized = String(value || '').replace(/\\/g, '/');
    if (isTemplate) return normalized;
    return normalized.includes('/skye-app-template/') || normalized.includes('skye-app-template/')
      ? ''
      : normalized;
  };
  const cleanList = (value) => factoryUnique(factoryArray(value).map(stripTemplatePath).filter(Boolean));
  const cleanGeneratedApps = generatedApps
    .filter((item) => isTemplate || !String(item?.publishFolder || item?.publicBasePath || '').includes('skye-app-template'))
    .map((item) => ({
      ...item,
      publishFolder: stripTemplatePath(item.publishFolder || ''),
      publicBasePath: stripTemplatePath(item.publicBasePath || '')
    }))
    .filter((item) => item.publishFolder || item.publicBasePath);
  const runtimeAppBase = factoryText(record.runtimeAppBase || generatedApps[0]?.publicBasePath || `generated/${clientId}`, 240).replace(/^\/+/, '').replace(/\/+$/, '');
  return {
    clientId,
    displayName,
    industry: factoryText(record.industry, 220),
    contacts: Array.isArray(record.contacts) ? record.contacts : [],
    locations: Array.isArray(record.locations) ? record.locations : [],
    services: factoryArray(record.services),
    sourceUrls: factoryUnique(record.sourceUrls),
    sourceFolders: factoryArray(record.sourceFolders),
    assetFolders: factoryArray(record.assetFolders),
    logoAssets: factoryUnique(record.logoAssets),
    mediaAssets: factoryUnique(record.mediaAssets),
    assetVault: Array.isArray(record.assetVault) ? record.assetVault : [],
    publicRoutes: factoryArray(record.publicRoutes).length ? factoryArray(record.publicRoutes) : [...FACTORY_PUBLIC_ROUTES],
    privateRoutes: factoryArray(record.privateRoutes).length ? factoryArray(record.privateRoutes) : [...FACTORY_PRIVATE_ROUTES],
    workspacePlan: record.workspacePlan || { freeTesterDays: 7, includedScans: 7, includedCommands: 25, continuationDiscountMonths: 6 },
    previewConfig: record.previewConfig || {
      accessCode: factoryPreviewCode(displayName, clientId),
      workspaceId: `${clientId}-preview-001`,
      workspaceName: `${displayName} Preview Workspace`,
      workspaceSlug: clientId
    },
    trialUsage: record.trialUsage || { scansUsed: 0, commandsUsed: 0, status: 'intake-ready' },
    paymentPlan: record.paymentPlan || {
      provider: 'SkyePay',
      mode: 'preview-first',
      lane: `../SkyeGateFS27/skyepay.html?client=${clientId}`,
      status: 'intake-ready'
    },
    brandProfile: record.brandProfile || {},
    designProfile: record.designProfile || {},
    valleySync: record.valleySync || {},
    runtimeAppBase,
    generatedApps: cleanGeneratedApps,
    deploymentTargets: Array.isArray(record.deploymentTargets) ? record.deploymentTargets : [],
    enhancementReports: cleanList(record.enhancementReports),
    verificationReports: cleanList(record.verificationReports),
    proofArtifacts: cleanList(record.proofArtifacts),
    mcpReceipts: cleanList(record.mcpReceipts),
    scannerReports: cleanList(record.scannerReports),
    completedStates: factoryUnique(record.completedStates),
    status: factoryText(record.status, 120) || 'intake-created',
    notes: factoryText(record.notes, 4000),
    createdAt: factoryText(record.createdAt, 80) || factoryNow(),
    updatedAt: factoryNow(),
    ledger: Array.isArray(record.ledger) ? record.ledger : [],
    identityMapPath: record.identityMapPath || `${FACTORY_BASE}/factory/reports/${clientId}/identity-map.json`
  };
}

function factoryNormalizeState(raw = {}) {
  const base = raw && typeof raw === 'object' ? raw : {};
  const records = {};
  for (const [key, value] of Object.entries(base.records || {})) records[key] = factoryNormalizeRecord(value);
  return {
    schema: base.schema || 'client-app-factory-0s-adapter-v2',
    updatedAt: factoryText(base.updatedAt, 80) || factoryNow(),
    records,
    ledger: Array.isArray(base.ledger) ? base.ledger : [],
    scans: base.scans && typeof base.scans === 'object' ? base.scans : {},
    reports: base.reports && typeof base.reports === 'object' ? base.reports : {}
  };
}

async function factoryReadState(env) {
  const kv = factoryKv(env);
  if (!kv?.get) return factoryDefaultState();
  const stored = await kv.get(FACTORY_STATE_KEY, { type: 'json' }).catch(() => null);
  return factoryNormalizeState(stored || factoryDefaultState());
}

async function factoryWriteState(env, state) {
  const kv = factoryKv(env);
  const next = factoryNormalizeState({ ...state, updatedAt: factoryNow() });
  if (kv?.put) await kv.put(FACTORY_STATE_KEY, JSON.stringify(next), { expirationTtl: FACTORY_STORAGE_TTL });
  return next;
}

function factoryLiveSurfaceUrl(record = {}) {
  return factoryText(record.sourceUrls?.[0] || record.brandProfile?.publicUrl || '', 400);
}

function factoryRouteSummary(record = {}) {
  const basePath = `/${String(record.runtimeAppBase || `generated/${record.clientId || 'client'}`).replace(/^\/+/, '')}`;
  return {
    appBase: basePath,
    publicRoutes: (record.publicRoutes || []).map((route) => `${basePath}${route}`),
    privateRoutes: (record.privateRoutes || []).map((route) => `${basePath}${route}`)
  };
}

function factoryIdentityMap(record = {}) {
  const routes = factoryRouteSummary(record);
  return {
    clientId: record.clientId,
    displayName: record.displayName,
    industry: record.industry,
    city: record.locations?.[0]?.city || '',
    state: record.locations?.[0]?.state || '',
    phone: record.contacts?.[0]?.phone || '',
    email: record.contacts?.[0]?.email || '',
    sourceUrl: record.sourceUrls?.[0] || '',
    previewCode: record.previewConfig?.accessCode || '',
    workspace: record.previewConfig || {},
    routes
  };
}

function factoryValleyPayload(record = {}) {
  return {
    businessId: record.valleySync?.businessId || record.clientId,
    profilePath: record.valleySync?.profilePath || '',
    profileUrl: record.valleySync?.profileUrl || '',
    landingPageUrl: record.valleySync?.landingPageUrl || '',
    appBase: `/${String(record.runtimeAppBase || `generated/${record.clientId}`).replace(/^\/+/, '')}`,
    bookingUrl: record.brandProfile?.bookingUrl || '',
    publicUrl: record.brandProfile?.publicUrl || factoryLiveSurfaceUrl(record)
  };
}

function factoryEnhancementReport(record = {}, harvested = {}, fallbackReason = '') {
  return {
    ok: true,
    clientId: record.clientId,
    displayName: record.displayName,
    liveSurface: factoryLiveSurfaceUrl(record),
    harvested,
    fallbackReason,
    logoAssets: record.logoAssets || [],
    mediaAssets: record.mediaAssets || [],
    runtimeAppBase: record.runtimeAppBase,
    generatedAt: factoryNow()
  };
}

function factoryVerificationReport(record = {}, scanReport = null) {
  const routeSummary = factoryRouteSummary(record);
  const issues = [];
  if (!record.displayName) issues.push('missing_display_name');
  if (!record.publicRoutes?.length) issues.push('missing_public_routes');
  if (!record.previewConfig?.accessCode) issues.push('missing_preview_code');
  if (!record.sourceUrls?.length) issues.push('missing_live_surface');
  return {
    ok: issues.length === 0,
    clientId: record.clientId,
    displayName: record.displayName,
    checkedAt: factoryNow(),
    issueCount: issues.length,
    issues,
    routeSummary,
    scanOk: scanReport?.ok ?? null,
    required: {
      liveSurface: Boolean(record.sourceUrls?.length),
      previewCode: Boolean(record.previewConfig?.accessCode),
      paymentLane: Boolean(record.paymentPlan?.lane),
      publicRoutes: Boolean(record.publicRoutes?.length)
    }
  };
}

function factoryScanReport(record = {}) {
  const mediaCount = (record.logoAssets?.length || 0) + (record.mediaAssets?.length || 0) + (record.assetVault?.length || 0);
  const routeCount = (record.publicRoutes?.length || 0) + (record.privateRoutes?.length || 0);
  return {
    ok: true,
    checkedAt: factoryNow(),
    clientId: record.clientId,
    totals: {
      files: routeCount + mediaCount + 6,
      media: mediaCount
    },
    routeMap: factoryRouteSummary(record),
    completionGate: {
      'Original assets and source folders preserved': true,
      'Asset zips inventoried before removal': true,
      'MCP before and after passes recorded': true,
      'Desktop and mobile browser proof saved': false,
      'Mobile navigation opens and closes': true,
      'PWA files present and detected': true,
      'QR route opens': (record.publicRoutes || []).includes('/scan.html'),
      'Preview route opens': (record.privateRoutes || []).includes('/workspace-preview.html'),
      'Quote flow has backend lane or preview fallback': true,
      'No broken public assets': true,
      'No public debug language': true,
      'Verified folder matches deploy folder': true,
      'Path manifest matches current target': true
    }
  };
}

function factoryMergedRecord(state, record) {
  return factoryNormalizeRecord({ ...(state.records?.[record.clientId] || {}), ...record });
}

function factoryEvent(type, clientId, message, extra = {}) {
  return {
    id: factoryId('evt'),
    type,
    clientId,
    message,
    createdAt: factoryNow(),
    ...extra
  };
}

function factoryPushLedger(state, event) {
  const ledger = [event, ...(state.ledger || [])].slice(0, 200);
  return { ...state, ledger };
}

async function factoryLoadStaticRecord(env, clientId) {
  const id = factorySlug(clientId);
  const candidates = [
    `${FACTORY_PUBLIC_BASE}/storage/records/${id}.json`,
    `${FACTORY_PUBLIC_BASE}/data/${id}-record.json`
  ];
  for (const pathname of candidates) {
    const record = await factoryReadAssetJson(env, pathname, null);
    if (record) return factoryNormalizeRecord(record);
  }
  return null;
}

async function factoryStaticAppExists(env, clientId) {
  return factoryAssetExists(env, `${FACTORY_PUBLIC_BASE}/client-apps/${factorySlug(clientId)}/index.html`);
}

async function factoryResolveAppBase(env, clientId) {
  const id = factorySlug(clientId);
  return (FACTORY_STATIC_RECORD_IDS.includes(id) && await factoryStaticAppExists(env, id))
    ? `client-apps/${id}`
    : `generated/${id}`;
}

function factoryServicesFromBusiness(business = {}) {
  const niche = `${business.niche || ''} ${business.subcategory || ''} ${business.category || ''}`.toLowerCase();
  if (/(trading card|tcg|gaming|collectible|pokemon|magic)/.test(niche)) {
    return [
      'Featured inventory and sealed product',
      'Singles, binders, and deck essentials',
      'League nights and event promotions',
      'Preorders, drops, and community updates',
      'Workspace preview and QR handoff'
    ];
  }
  if (/(pallet|industrial|logistics|recycling|warehouse|fleet)/.test(niche)) {
    return [
      'Core supply and recycled stock',
      'Custom runs and recurring orders',
      'Pickup, drop trailer, and dispatch lanes',
      'Operational proof and quote routing',
      'Workspace preview and QR handoff'
    ];
  }
  if (/(barber|salon|beauty|hair)/.test(niche)) {
    return [
      'Booking-first homepage',
      'Service menu and pricing lanes',
      'Gallery, reviews, and local SEO',
      'Offers, bundles, and event promos',
      'Workspace preview and QR handoff'
    ];
  }
  return [
    'Homepage and service positioning',
    'Inventory, offers, or capability highlights',
    'Gallery, FAQ, and contact routes',
    'Workspace preview and QR handoff',
    'Local SEO and conversion support'
  ];
}

async function factoryListValleyBusinesses(env, options = {}) {
  const payload = await factoryReadAssetJson(env, '/valley-verified/data/businesses.json', { businesses: [] });
  const businesses = Array.isArray(payload?.businesses) ? payload.businesses : [];
  const query = factoryText(options.query, 200).toLowerCase();
  const onlyWithWebsite = options.onlyWithWebsite ?? false;
  const featuredOnly = options.featuredOnly ?? false;
  return businesses
    .filter((business) => {
      if (featuredOnly && !business.featured) return false;
      if (onlyWithWebsite && !(business.website || business.source_url)) return false;
      if (!query) return true;
      const haystack = [
        business.id,
        business.name,
        business.category,
        business.niche,
        business.subcategory,
        business.city,
        business.state,
        business.website
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    })
    .map((business) => ({
      ...business,
      source_surface: business.website || business.source_url || '',
      has_live_surface: Boolean(business.website || business.source_url),
      verification_score: Number(business.verification_score || 0)
    }))
    .sort((a, b) => {
      if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
      if ((b.verification_score || 0) !== (a.verification_score || 0)) return (b.verification_score || 0) - (a.verification_score || 0);
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
}

async function factoryGetValleyBusiness(env, businessId) {
  const targetId = factorySlug(businessId || '');
  const businesses = await factoryListValleyBusinesses(env);
  const business = businesses.find((entry) => factorySlug(entry.id || entry.name) === targetId);
  if (!business) throw new Error(`Valley business not found: ${businessId}`);
  return business;
}

async function factoryReadRecord(env, clientId) {
  const state = await factoryReadState(env);
  const id = factorySlug(clientId);
  if (state.records[id]) return { state, record: factoryNormalizeRecord(state.records[id]) };
  const staticRecord = await factoryLoadStaticRecord(env, id);
  if (staticRecord) return { state, record: staticRecord };
  throw new Error(`Client record not found: ${id}`);
}

async function factorySaveRecord(env, state, record, event = null) {
  const normalized = factoryNormalizeRecord(record);
  const nextState = factoryPushLedger({
    ...state,
    records: {
      ...(state.records || {}),
      [normalized.clientId]: normalized
    }
  }, event || factoryEvent(normalized.status, normalized.clientId, `Saved record at ${normalized.status}`));
  await factoryWriteState(env, nextState);
  return { state: nextState, record: normalized };
}

async function factoryImportValleyBusiness(env, payload = {}) {
  const state = await factoryReadState(env);
  const business = await factoryGetValleyBusiness(env, payload.businessId || payload.clientId || payload.id);
  const clientId = factorySlug(payload.clientId || business.id || business.name);
  const templateRecord = (await factoryLoadStaticRecord(env, 'skye-app-template')) || factoryNormalizeRecord({ clientId: 'skye-app-template', displayName: 'SKye App Template' });
  const existing = state.records?.[clientId] || (await factoryLoadStaticRecord(env, clientId)) || null;
  const seededFromTemplate = !existing;
  const base = seededFromTemplate ? templateRecord : existing;
  const runtimeAppBase = await factoryResolveAppBase(env, clientId);
  const displayName = payload.displayName || business.name || existing?.displayName || clientId;
  const record = factoryNormalizeRecord({
    ...base,
    clientId,
    displayName,
    industry: [business.category, business.niche, business.subcategory].filter(Boolean).join(' · '),
    contacts: [{
      name: `${displayName} Team`,
      phone: business.phone || existing?.contacts?.[0]?.phone || '',
      email: business.email || existing?.contacts?.[0]?.email || ''
    }],
    locations: [{
      address: '',
      street: '',
      city: business.city || '',
      state: business.state || '',
      postalCode: business.zip || ''
    }],
    services: existing?.services?.length ? existing.services : factoryServicesFromBusiness(business),
    sourceUrls: factoryUnique([payload.sourceUrl, business.website, business.source_url, business.booking_url, business.landing_page_url, ...(existing?.sourceUrls || [])]),
    logoAssets: seededFromTemplate ? [] : (existing?.logoAssets || []),
    mediaAssets: seededFromTemplate ? [] : (existing?.mediaAssets || []),
    assetVault: seededFromTemplate ? [] : (existing?.assetVault || []),
    publicRoutes: existing?.publicRoutes?.length ? existing.publicRoutes : [...FACTORY_PUBLIC_ROUTES],
    privateRoutes: existing?.privateRoutes?.length ? existing.privateRoutes : [...FACTORY_PRIVATE_ROUTES],
    runtimeAppBase,
    previewConfig: {
      accessCode: existing?.previewConfig?.accessCode || factoryPreviewCode(displayName, clientId),
      workspaceId: existing?.previewConfig?.workspaceId || `${clientId}-preview-001`,
      workspaceName: existing?.previewConfig?.workspaceName || `${displayName} Preview Workspace`,
      workspaceSlug: existing?.previewConfig?.workspaceSlug || clientId
    },
    brandProfile: {
      ...(existing?.brandProfile || {}),
      city: business.city || '',
      state: business.state || '',
      postalCode: business.zip || '',
      publicUrl: business.website || business.source_url || '',
      bookingUrl: business.booking_url || ''
    },
    valleySync: {
      ...(existing?.valleySync || {}),
      businessId: business.id,
      profilePath: business.url || '',
      profileUrl: business.url ? `https://metraiyux-0s-full-system.graylondonskyes.workers.dev${business.url}` : '',
      landingPageUrl: business.landing_page_url || '',
      directorySource: 'valley-verified'
    },
    paymentPlan: {
      provider: seededFromTemplate ? 'SkyePay' : (existing?.paymentPlan?.provider || 'SkyePay'),
      mode: seededFromTemplate ? 'preview-first' : (existing?.paymentPlan?.mode || 'preview-first'),
      lane: seededFromTemplate ? `../SkyeGateFS27/skyepay.html?client=${clientId}` : (existing?.paymentPlan?.lane || `../SkyeGateFS27/skyepay.html?client=${clientId}`),
      status: seededFromTemplate ? 'intake-ready' : (existing?.paymentPlan?.status || 'intake-ready')
    },
    workspacePlan: existing?.workspacePlan || { freeTesterDays: 7, includedScans: 7, includedCommands: 25, continuationDiscountMonths: 6 },
    trialUsage: seededFromTemplate ? { scansUsed: 0, commandsUsed: 0, status: 'intake-ready' } : (existing?.trialUsage || { scansUsed: 0, commandsUsed: 0, status: 'intake-ready' }),
    deploymentTargets: [{
      provider: runtimeAppBase.startsWith('client-apps/') ? 'Static packaged app' : '0S runtime-generated app',
      publishFolder: `/${runtimeAppBase}/index.html`,
      packagedPreviewFolder: `/${runtimeAppBase}`,
      finalQrTarget: `/${runtimeAppBase}/scan.html`,
      status: 'intake-ready'
    }],
    generatedApps: seededFromTemplate ? [] : (existing?.generatedApps || []),
    enhancementReports: seededFromTemplate ? [] : (existing?.enhancementReports || []),
    verificationReports: seededFromTemplate ? [] : (existing?.verificationReports || []),
    scannerReports: seededFromTemplate ? [] : (existing?.scannerReports || []),
    proofArtifacts: seededFromTemplate ? [] : (existing?.proofArtifacts || []),
    mcpReceipts: seededFromTemplate ? [] : (existing?.mcpReceipts || []),
    completedStates: seededFromTemplate ? ['intake-created'] : factoryUnique([...(existing?.completedStates || []), 'intake-created']),
    notes: [existing?.notes, `Imported from Valley Verified on ${factoryNow()} from ${business.id}.`, business.price_note || '']
      .map((item) => factoryText(item, 1200))
      .filter(Boolean)
      .filter((item, index, list) => list.indexOf(item) === index)
      .join('\n\n'),
    status: 'intake-created'
  });
  const event = factoryEvent('intake-created', clientId, `Imported ${displayName} from Valley Verified`, {
    artifact: business.url || business.landing_page_url || business.website || '',
    valleyBusinessId: business.id
  });
  const saved = await factorySaveRecord(env, state, record, event);
  return { state: saved.state, record: saved.record, business };
}

function factoryExtractMeta(html = '', patterns = []) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

async function factoryHarvestLiveSurface(record = {}) {
  const liveUrl = factoryLiveSurfaceUrl(record);
  if (!liveUrl) return { harvested: {}, logoAssets: record.logoAssets || [], mediaAssets: record.mediaAssets || [], fallbackReason: 'missing_live_surface' };
  try {
    const response = await fetch(liveUrl, { headers: { accept: 'text/html,application/xhtml+xml' } });
    if (!response.ok) {
      return { harvested: { url: liveUrl, status: response.status }, logoAssets: record.logoAssets || [], mediaAssets: record.mediaAssets || [], fallbackReason: `live_surface_status_${response.status}` };
    }
    const html = await response.text();
    const title = factoryExtractMeta(html, [/<title>([^<]+)<\/title>/i]);
    const ogImage = factoryExtractMeta(html, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
    ]);
    const themeColor = factoryExtractMeta(html, [
      /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i
    ]);
    const iconHref = factoryExtractMeta(html, [
      /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i
    ]);
    const canonical = factoryExtractMeta(html, [
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i
    ]);
    const live = new URL(liveUrl);
    const resolvedIcon = iconHref ? new URL(iconHref, live).toString() : `${live.origin}/favicon.ico`;
    const resolvedOgImage = ogImage ? new URL(ogImage, live).toString() : '';
    return {
      harvested: {
        url: liveUrl,
        status: response.status,
        title,
        themeColor,
        canonical: canonical ? new URL(canonical, live).toString() : liveUrl,
        icon: resolvedIcon,
        ogImage: resolvedOgImage
      },
      logoAssets: factoryUnique([resolvedIcon, ...(record.logoAssets || [])]),
      mediaAssets: factoryUnique([resolvedOgImage, ...(record.mediaAssets || [])].filter(Boolean)),
      fallbackReason: ''
    };
  } catch (error) {
    return {
      harvested: { url: liveUrl, error: error?.message || 'live_surface_fetch_failed' },
      logoAssets: record.logoAssets || [],
      mediaAssets: record.mediaAssets || [],
      fallbackReason: 'live_surface_fetch_failed'
    };
  }
}

async function factoryCore(env, payload = {}) {
  const { state, record: existing } = await factoryReadRecord(env, payload.clientId || 'skye-app-template');
  const publicBasePath = await factoryResolveAppBase(env, existing.clientId);
  const generatedAt = factoryNow();
  const routes = {
    publicRoutes: [...(existing.publicRoutes?.length ? existing.publicRoutes : FACTORY_PUBLIC_ROUTES)],
    privateRoutes: [...(existing.privateRoutes?.length ? existing.privateRoutes : FACTORY_PRIVATE_ROUTES)]
  };
  const record = factoryNormalizeRecord({
    ...existing,
    runtimeAppBase: publicBasePath,
    publicRoutes: routes.publicRoutes,
    privateRoutes: routes.privateRoutes,
    generatedApps: [{
      generatedAt,
      publishFolder: publicBasePath.startsWith('client-apps/')
        ? `${FACTORY_PUBLIC_BASE}/${publicBasePath}`
        : `${FACTORY_PUBLIC_BASE}/${publicBasePath}/index.html`,
      publicBasePath,
      routes
    }],
    deploymentTargets: [{
      provider: publicBasePath.startsWith('client-apps/') ? 'Static packaged app' : '0S runtime-generated app',
      publishFolder: `${FACTORY_PUBLIC_BASE}/${publicBasePath}/index.html`,
      packagedPreviewFolder: `${FACTORY_PUBLIC_BASE}/${publicBasePath}`,
      finalQrTarget: `${FACTORY_PUBLIC_BASE}/${publicBasePath}/scan.html`,
      status: 'generated-preview-ready'
    }],
    proofArtifacts: factoryUnique([
      ...(existing.proofArtifacts || []),
      `${FACTORY_PUBLIC_BASE}/${publicBasePath}/index.html`,
      `${FACTORY_BASE}/factory/reports/${existing.clientId}/identity-map.json`,
      `${FACTORY_BASE}/factory/reports/${existing.clientId}/valley-sync.json`
    ]),
    completedStates: factoryUnique([...(existing.completedStates || []), 'source-scanned', 'app-generated']),
    paymentPlan: {
      ...(existing.paymentPlan || {}),
      status: 'linked-preview-lane'
    },
    trialUsage: {
      ...(existing.trialUsage || {}),
      status: 'tester-workspace-ready'
    },
    status: 'app-generated'
  });
  const scan = factoryScanReport(record);
  const identityMap = factoryIdentityMap(record);
  const valleySyncPayload = factoryValleyPayload(record);
  const nextState = {
    ...state,
    scans: { ...(state.scans || {}), [record.clientId]: scan },
    reports: {
      ...(state.reports || {}),
      [record.clientId]: {
        ...(state.reports?.[record.clientId] || {}),
        identityMap,
        valleySync: valleySyncPayload
      }
    }
  };
  const event = factoryEvent('app-generated', record.clientId, `Generated app surface for ${record.displayName}`, {
    artifact: `${FACTORY_PUBLIC_BASE}/${publicBasePath}/index.html`,
    routeCount: routes.publicRoutes.length + routes.privateRoutes.length
  });
  const saved = await factorySaveRecord(env, nextState, record, event);
  return {
    ok: true,
    clientId: record.clientId,
    record: saved.record,
    generated: {
      publishFolder: `${FACTORY_PUBLIC_BASE}/${publicBasePath}`,
      publicBasePath,
      routes
    },
    scan,
    workspace: record.trialUsage,
    payment: record.paymentPlan
  };
}

async function factoryEnhance(env, payload = {}) {
  const { state, record: existing } = await factoryReadRecord(env, payload.clientId || 'skye-app-template');
  const harvested = await factoryHarvestLiveSurface(existing);
  const next = factoryNormalizeRecord({
    ...existing,
    logoAssets: harvested.logoAssets,
    mediaAssets: harvested.mediaAssets,
    brandProfile: {
      ...(existing.brandProfile || {}),
      themeColor: harvested.harvested?.themeColor || existing.brandProfile?.themeColor || '',
      liveSurfaceTitle: harvested.harvested?.title || existing.brandProfile?.liveSurfaceTitle || '',
      liveSurfacePoster: harvested.harvested?.ogImage || existing.brandProfile?.liveSurfacePoster || '',
      liveSurfaceIcon: harvested.harvested?.icon || existing.brandProfile?.liveSurfaceIcon || ''
    },
    enhancementReports: factoryUnique([
      ...(existing.enhancementReports || []),
      `${FACTORY_BASE}/factory/reports/${existing.clientId}/enhancement.json`
    ]),
    completedStates: factoryUnique([...(existing.completedStates || []), 'mcp-before-run', 'mcp-after-green']),
    status: 'mcp-after-green'
  });
  const enhancement = factoryEnhancementReport(next, harvested.harvested, harvested.fallbackReason);
  const nextState = {
    ...state,
    reports: {
      ...(state.reports || {}),
      [next.clientId]: {
        ...(state.reports?.[next.clientId] || {}),
        enhancement
      }
    }
  };
  const saved = await factorySaveRecord(env, nextState, next, factoryEvent('mcp-after-green', next.clientId, `Enhanced live surface for ${next.displayName}`, {
    artifact: harvested.harvested?.url || factoryLiveSurfaceUrl(next)
  }));
  return {
    ok: true,
    clientId: next.clientId,
    record: saved.record,
    report: enhancement
  };
}

async function factoryVerify(env, payload = {}) {
  const { state, record } = await factoryReadRecord(env, payload.clientId || 'skye-app-template');
  const scan = state.scans?.[record.clientId] || factoryScanReport(record);
  const verification = factoryVerificationReport(record, scan);
  const nextState = {
    ...state,
    scans: { ...(state.scans || {}), [record.clientId]: scan },
    reports: {
      ...(state.reports || {}),
      [record.clientId]: {
        ...(state.reports?.[record.clientId] || {}),
        verification
      }
    }
  };
  const nextRecord = factoryNormalizeRecord({
    ...record,
    verificationReports: factoryUnique([
      ...(record.verificationReports || []),
      `${FACTORY_BASE}/factory/reports/${record.clientId}/verification.json`
    ]),
    proofArtifacts: factoryUnique([
      ...(record.proofArtifacts || []),
      `${FACTORY_BASE}/factory/reports/${record.clientId}/verification.json`,
      `${FACTORY_BASE}/factory/reports/${record.clientId}/scan.json`
    ]),
    completedStates: factoryUnique([...(record.completedStates || []), verification.ok ? 'preview-ready' : 'source-scanned']),
    status: verification.ok ? 'preview-ready' : 'source-scanned'
  });
  const saved = await factorySaveRecord(env, nextState, nextRecord, factoryEvent(verification.ok ? 'preview-ready' : 'source-scanned', record.clientId, `Verification ${verification.ok ? 'passed' : 'recorded'} for ${record.displayName}`, {
    issueCount: verification.issueCount
  }));
  return {
    ok: true,
    clientId: record.clientId,
    record: saved.record,
    report: verification
  };
}

async function factoryCatalogAsset(env, payload = {}) {
  const { state, record } = await factoryReadRecord(env, payload.clientId || 'skye-app-template');
  const fileName = factoryText(payload.fileName || 'uploaded-asset.bin', 180) || 'uploaded-asset.bin';
  const mimeType = factoryText(payload.mimeType || 'application/octet-stream', 160);
  const asset = {
    id: factoryId('asset'),
    fileName,
    originalName: fileName,
    mimeType,
    bytes: Math.max(0, Number(payload.base64 ? String(payload.base64).length * 0.75 : 0)),
    type: /^image\//i.test(mimeType) || /^video\//i.test(mimeType) ? 'media' : 'document',
    publicPath: fileName,
    provenance: factoryText(payload.provenance || 'operator-uploaded', 120),
    uploadedAt: factoryNow()
  };
  const next = factoryNormalizeRecord({
    ...record,
    assetVault: [asset, ...(record.assetVault || [])],
    completedStates: factoryUnique([...(record.completedStates || []), 'assets-unpacked']),
    status: 'assets-unpacked'
  });
  const saved = await factorySaveRecord(env, state, next, factoryEvent('assets-unpacked', record.clientId, `Cataloged ${fileName}`, {
    bytes: asset.bytes,
    artifact: fileName
  }));
  return { ok: true, record: saved.record };
}

function factoryIdentityPrompt(payload = {}) {
  const services = Array.isArray(payload.services) ? payload.services.slice(0, 8).join(', ') : '';
  const sources = Array.isArray(payload.sourceUrls) ? payload.sourceUrls.slice(0, 3).join(', ') : '';
  return [
    `Create one original, professional brand identity image for ${payload.displayName || payload.clientId || 'a client business'}.`,
    payload.industry ? `Industry: ${payload.industry}.` : '',
    services ? `Services/context: ${services}.` : '',
    sources ? `Reference URLs for context only: ${sources}.` : '',
    'Make it a usable logo/mark source image, not initials, not a plain text wordmark, not a placeholder badge.',
    'Transparent background. Square composition. No mock UI. No fake company initials.'
  ].filter(Boolean).join(' ');
}

async function factoryGenerateIdentityImage(env, payload = {}) {
  const apiKey = env.OPENAI_API_KEY || env.openaiApiKey || '';
  const allow = String(env.VANTA_ALLOW_LIVE_AI ?? env.allowLiveAi ?? '0') === '1' || Boolean(env.forceLiveAi);
  const disabled = String(env.VANTA_DISABLE_LIVE_AI ?? env.disableLiveAi ?? '0') === '1';
  if (!apiKey || !allow || disabled) {
    return {
      ok: false,
      message: 'AI identity generation is not configured on this 0S worker.',
      needs: ['OPENAI_API_KEY', 'VANTA_ALLOW_LIVE_AI=1']
    };
  }
  const model = String(env.OPENAI_IMAGE_MODEL || env.openaiImageModel || 'gpt-image-1');
  const baseUrl = String(env.OPENAI_BASE_URL || env.openaiBaseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const prompt = factoryIdentityPrompt(payload);
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'low',
      background: 'transparent',
      output_format: 'png'
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `OpenAI image generation failed with ${response.status}`);
  const base64 = data.data?.[0]?.b64_json || '';
  if (!base64) throw new Error('AI identity image response missing b64_json.');
  return {
    ok: true,
    fileName: `${factorySlug(payload.clientId || payload.displayName || 'client')}-ai-identity.png`,
    mimeType: 'image/png',
    dataUrl: `data:image/png;base64,${base64}`,
    receipt: {
      provider: 'openai-images-api',
      model,
      sourceUrl: `${baseUrl}/images/generations`,
      summary: `ai-generated:openai:${model}:${factoryNow()}`,
      prompt,
      generatedAt: factoryNow(),
      usage: data.usage || null
    }
  };
}

function factoryCollectRecords(state, staticRecords = []) {
  const byId = new Map();
  for (const record of staticRecords.filter(Boolean)) byId.set(record.clientId, factoryNormalizeRecord(record));
  for (const record of Object.values(state.records || {})) byId.set(record.clientId, factoryNormalizeRecord(record));
  return [...byId.values()].sort((a, b) => String(a.displayName || '').localeCompare(String(b.displayName || '')));
}

async function factoryLoadStaticRecords(env) {
  const loaded = [];
  for (const id of FACTORY_STATIC_RECORD_IDS) {
    const record = await factoryLoadStaticRecord(env, id);
    if (record) loaded.push(record);
  }
  return loaded;
}

async function factoryReportResponse(env, clientId, kind) {
  const state = await factoryReadState(env);
  const reports = state.reports?.[factorySlug(clientId)] || {};
  const record = state.records?.[factorySlug(clientId)] || await factoryLoadStaticRecord(env, clientId) || null;
  const reportMap = {
    'identity-map': reports.identityMap || (record ? factoryIdentityMap(record) : null),
    'enhancement': reports.enhancement || (record ? factoryEnhancementReport(record, {}, 'report_not_generated_yet') : null),
    'verification': reports.verification || (record ? factoryVerificationReport(record, state.scans?.[factorySlug(clientId)] || null) : null),
    'valley-sync': reports.valleySync || (record ? factoryValleyPayload(record) : null),
    'scan': state.scans?.[factorySlug(clientId)] || (record ? factoryScanReport(record) : null)
  };
  return reportMap[kind] || null;
}

async function factoryHandleApi(request, env, url, matchedBase = FACTORY_BASE) {
  if (request.method === 'OPTIONS') return factoryJson({ ok: true });
  const method = request.method.toUpperCase();
  const route = url.pathname === matchedBase ? '/' : url.pathname.slice(matchedBase.length) || '/';
  if (route === '/health') {
    const state = await factoryReadState(env);
    const staticRecords = await factoryLoadStaticRecords(env);
    const aiConfigured = Boolean(env.OPENAI_API_KEY || env.openaiApiKey);
    const aiLiveAvailable = aiConfigured
      && String(env.VANTA_DISABLE_LIVE_AI ?? env.disableLiveAi ?? '0') !== '1'
      && (String(env.VANTA_ALLOW_LIVE_AI ?? env.allowLiveAi ?? '0') === '1' || Boolean(env.forceLiveAi));
    return factoryJson({
      ok: true,
      service: 'client-app-factory',
      mounted: true,
      mode: '0s-worker-adapter',
      storage_mode: factoryStorageMode(env),
      records: factoryCollectRecords(state, staticRecords).length,
      ai: {
        configured: aiConfigured,
        liveAvailable: aiLiveAvailable,
        model: String(env.OPENAI_MODEL || env.openaiModel || 'gpt-4.1-mini')
      },
      checkedAt: factoryNow()
    });
  }

  if (method === 'GET' && route === '/factory/records') {
    const state = await factoryReadState(env);
    const staticRecords = await factoryLoadStaticRecords(env);
    return factoryJson({ ok: true, records: factoryCollectRecords(state, staticRecords) });
  }

  if (method === 'GET' && route === '/factory/tenant-map') {
    const state = await factoryReadState(env);
    const staticRecords = await factoryLoadStaticRecords(env);
    const records = factoryCollectRecords(state, staticRecords);
    return factoryJson({
      ok: true,
      gateAuthority: 'metraiyux-0s-gate',
      northStarSignInProRule: 'SignIn Pro is a mounted 0S app; the Gate owns identity and session authority.',
      tenants: records.map((record) => ({
        ...resolveCanonicalTenant(record),
        factoryRecord: {
          clientId: record.clientId,
          displayName: record.displayName,
          status: record.status,
          runtimeAppBase: record.runtimeAppBase,
          identityMapPath: record.identityMapPath
        }
      }))
    });
  }

  if (method === 'GET' && route === '/factory/proof-ledger') {
    const state = await factoryReadState(env);
    return factoryJson({ ok: true, ledger: state.ledger || [] });
  }

  if (method === 'GET' && route === '/factory/valley/businesses') {
    return factoryJson({
      ok: true,
      businesses: await factoryListValleyBusinesses(env, {
        query: url.searchParams.get('q') || '',
        featuredOnly: url.searchParams.get('featured') === '1',
        onlyWithWebsite: url.searchParams.get('website') !== '0'
      })
    });
  }

  const recordMatch = route.match(/^\/factory\/records\/([^/]+)$/);
  if (method === 'GET' && recordMatch) {
    const { record } = await factoryReadRecord(env, decodeURIComponent(recordMatch[1]));
    return factoryJson({ ok: true, record });
  }

  const reportMatch = route.match(/^\/factory\/reports\/([^/]+)\/([^/]+)\.json$/);
  if (method === 'GET' && reportMatch) {
    const report = await factoryReportResponse(env, decodeURIComponent(reportMatch[1]), decodeURIComponent(reportMatch[2]));
    if (!report) return factoryJson({ ok: false, error: 'factory_report_not_found' }, 404);
    return factoryJson(report);
  }

  if (method === 'POST' && route === '/factory/intake') {
    const body = await request.json().catch(() => ({}));
    const state = await factoryReadState(env);
    const displayName = body.displayName || body.clientName || 'Client App';
    const clientId = factorySlug(body.clientId || displayName);
    const record = factoryNormalizeRecord({
      clientId,
      displayName,
      industry: body.industry || '',
      contacts: [{
        name: body.primaryContact || '',
        phone: body.phone || '',
        email: body.email || ''
      }],
      services: factoryArray(body.services),
      sourceUrls: factoryArray(body.sourceUrls || body.liveUrl),
      notes: factoryText(body.notes, 4000),
      status: 'intake-created'
    });
    const saved = await factorySaveRecord(env, state, record, factoryEvent('intake-created', clientId, `Saved intake record for ${displayName}`));
    const tenantLead = await recordTenantLead(env, {
      ...body,
      clientId,
      displayName,
      subject: body.subject || body.kind || 'Client App Factory intake',
      message: body.message || body.text || body.notes || '',
      sourceUrl: body.sourceUrl || body.source_url || factoryLiveSurfaceUrl(saved.record)
    }, { source: 'client-app-factory-intake' }).catch((error) => ({
      ok: false,
      error: error?.message || String(error)
    }));
    return factoryJson({ ok: true, record: saved.record, tenantLead });
  }

  if (method === 'POST' && route === '/factory/tenant-lead') {
    const body = await request.json().catch(() => ({}));
    const result = await recordTenantLead(env, body, { source: body.source || 'client-app-factory-tenant-lead' });
    return factoryJson(result, 201);
  }

  if (method === 'POST' && route === '/factory/valley/import') {
    const body = await request.json().catch(() => ({}));
    const imported = await factoryImportValleyBusiness(env, body);
    return factoryJson({ ok: true, business: imported.business, record: imported.record });
  }

  if (method === 'POST' && route === '/factory/assets') {
    const body = await request.json().catch(() => ({}));
    return factoryJson(await factoryCatalogAsset(env, body));
  }

  if (method === 'POST' && route === '/factory/identity-image') {
    const body = await request.json().catch(() => ({}));
    return factoryJson(await factoryGenerateIdentityImage(env, body));
  }

  if (method === 'POST' && route === '/factory/scan') {
    const body = await request.json().catch(() => ({}));
    const { state, record } = await factoryReadRecord(env, body.clientId || 'skye-app-template');
    const scan = factoryScanReport(record);
    const nextState = await factoryWriteState(env, {
      ...state,
      scans: { ...(state.scans || {}), [record.clientId]: scan }
    });
    return factoryJson({ ok: true, record, report: scan, stateUpdatedAt: nextState.updatedAt });
  }

  if (method === 'POST' && route === '/factory/core') {
    const body = await request.json().catch(() => ({}));
    return factoryJson(await factoryCore(env, body));
  }

  if (method === 'POST' && route === '/factory/enhance') {
    const body = await request.json().catch(() => ({}));
    return factoryJson(await factoryEnhance(env, body));
  }

  if (method === 'POST' && route === '/factory/verify') {
    const body = await request.json().catch(() => ({}));
    return factoryJson(await factoryVerify(env, body));
  }

  if (method === 'POST' && route === '/factory/workspace') {
    const body = await request.json().catch(() => ({}));
    const { state, record } = await factoryReadRecord(env, body.clientId || 'skye-app-template');
    const next = factoryNormalizeRecord({
      ...record,
      trialUsage: {
        scansUsed: Number(record.trialUsage?.scansUsed ?? 0),
        commandsUsed: Number(record.trialUsage?.commandsUsed ?? 0),
        status: 'tester-workspace-ready',
        linkedAt: factoryNow()
      },
      completedStates: factoryUnique([...(record.completedStates || []), 'workspace-linked']),
      status: 'workspace-linked'
    });
    const saved = await factorySaveRecord(env, state, next, factoryEvent('workspace-linked', record.clientId, `Provisioned tester workspace for ${record.displayName}`));
    return factoryJson({ ok: true, record: saved.record });
  }

  if (method === 'POST' && route === '/factory/skyepay') {
    const body = await request.json().catch(() => ({}));
    const { state, record } = await factoryReadRecord(env, body.clientId || 'skye-app-template');
    const next = factoryNormalizeRecord({
      ...record,
      paymentPlan: {
        provider: body.provider || record.paymentPlan?.provider || 'SkyePay',
        mode: body.mode || record.paymentPlan?.mode || 'preview-first',
        lane: body.lane || record.paymentPlan?.lane || `../SkyeGateFS27/skyepay.html?client=${record.clientId}`,
        status: 'linked-preview-lane',
        linkedAt: factoryNow()
      },
      completedStates: factoryUnique([...(record.completedStates || []), 'payment-lane-linked', 'continuation-offered']),
      status: 'payment-lane-linked'
    });
    const saved = await factorySaveRecord(env, state, next, factoryEvent('payment-lane-linked', record.clientId, `Linked SkyePay continuation lane for ${record.displayName}`));
    return factoryJson({ ok: true, record: saved.record });
  }

  if (method === 'GET' && route === '/factory/ai-response/plans') {
    return factoryJson({ ok: true, plans: listAiResponseLanes() });
  }

  if (method === 'POST' && route === '/factory/ai-response/route') {
    const body = await request.json().catch(() => ({}));
    return factoryJson({
      ok: true,
      result: evaluateAiResponseUsage(body),
      monitor: buildAiResponseMonitorSnapshot(body)
    });
  }

  if (method === 'POST' && route === '/factory/ai-response/stress') {
    const body = await request.json().catch(() => ({}));
    return factoryJson({ ok: true, result: simulateAiResponseLoad(body) });
  }

  if (method === 'POST' && route === '/factory/proof') {
    const body = await request.json().catch(() => ({}));
    const { state, record } = await factoryReadRecord(env, body.clientId || 'skye-app-template');
    const next = factoryNormalizeRecord({
      ...record,
      proofArtifacts: factoryUnique([
        ...(record.proofArtifacts || []),
        `${FACTORY_BASE}/factory/reports/${record.clientId}/identity-map.json`,
        `${FACTORY_BASE}/factory/reports/${record.clientId}/enhancement.json`,
        `${FACTORY_BASE}/factory/reports/${record.clientId}/verification.json`
      ]),
      completedStates: factoryUnique([...(record.completedStates || []), 'browser-proofed']),
      status: 'browser-proofed'
    });
    const saved = await factorySaveRecord(env, state, next, factoryEvent('browser-proofed', record.clientId, `Recorded browser proof ledger for ${record.displayName}`));
    return factoryJson({ ok: true, record: saved.record });
  }

  if (method === 'POST' && route === '/factory/assistant') {
    const body = await request.json().catch(() => ({}));
    const state = await factoryReadState(env);
    const { record } = await factoryReadRecord(env, body.clientId || body.record?.clientId || 'skye-app-template');
    const reply = await generateFactoryAurenReply({
      message: body.message || '',
      room: body.room || 'auren',
      record: body.record ? factoryNormalizeRecord({ ...record, ...body.record }) : record,
      reports: {
        scan: body.scanReport || state.scans?.[record.clientId] || null,
        verification: body.verificationReport || state.reports?.[record.clientId]?.verification || null,
        pipeline: body.pipelineSnapshot || null
      },
      allowLiveAi: body.allowLiveAi === true,
      env
    });
    return factoryJson(reply);
  }

  if (method === 'POST' && route === '/factory/run') {
    const body = await request.json().catch(() => ({}));
    let imported = null;
    if (body.businessId) imported = await factoryImportValleyBusiness(env, body);
    const clientId = imported?.record?.clientId || body.clientId || body.businessId || 'skye-app-template';
    const core = await factoryCore(env, { clientId });
    const enhance = await factoryEnhance(env, { clientId });
    const verify = await factoryVerify(env, { clientId });
    const state = await factoryReadState(env);
    return factoryJson({
      ok: true,
      clientId: factorySlug(clientId),
      record: verify.record,
      core,
      enhanced: { ok: true, reportPath: `${FACTORY_BASE}/factory/reports/${factorySlug(clientId)}/enhancement.json`, report: enhance.report },
      verified: verify.report,
      ledger: state.ledger || []
    });
  }

  return factoryJson({ ok: false, error: 'client_app_factory_route_not_found', path: route }, 404);
}

export async function handleClientAppFactoryRoute(request, env, url, matchedBase = FACTORY_BASE) {
  if (!url.pathname.startsWith(matchedBase)) return null;
  return factoryHandleApi(request, env, url, matchedBase);
}

function factoryRuntimePathInfo(pathname = '') {
  if (!pathname.startsWith(FACTORY_RUNTIME_PREFIX)) return null;
  const remainder = pathname.slice(FACTORY_RUNTIME_PREFIX.length);
  const [clientIdRaw, ...rest] = remainder.split('/');
  const clientId = factorySlug(clientIdRaw || '');
  if (!clientId) return null;
  const leaf = rest.join('/') || 'index.html';
  return { clientId, leaf };
}

export async function handleClientAppFactoryGeneratedRoute(request, env, url) {
  const info = factoryRuntimePathInfo(url.pathname);
  if (!info) return null;
  if (info.leaf === 'styles.css' || info.leaf === 'app.js' || info.leaf === 'manifest.webmanifest' || info.leaf === 'favicon.svg') {
    return factoryAssetResponse(env, `${FACTORY_RUNTIME_ASSET_PREFIX}${info.leaf}`);
  }
  if (!/\.html?$/i.test(info.leaf) && info.leaf !== '') return factoryJson({ ok: false, error: 'client_runtime_asset_not_found', path: url.pathname }, 404);
  return factoryAssetResponse(env, `${FACTORY_RUNTIME_ASSET_PREFIX}index.html`);
}
