
const VERSION = 'AUTONOMOUS_BUSINESS_SITE_OPERATOR_1.0.0';
const ROUTES = [
  ['buyer_lead', /lead|buyer|sale|sell|prospect|proposal|close|ae|discovery|quote|pricing|website|white[- ]?label|client deployment|command deck/i, 'celeste-monroe-brain', 'adrian-cross-brain', 'AE discovery follow-up, buyer qualification, and live proof routing'],
  ['finance_or_pricing', /finance|invoice|billing|payroll|margin|commission|price|cost/i, 'naomi-sterling-brain', 'celeste-monroe-brain', 'Pricing, margin, billing, or commission review'],
  ['government_enterprise', /government|enterprise|sam|naics|procurement|\bbid\b|\bsubcontract\b/i, 'donovan-pierce-brain', 'julian-mercer-brain', 'Government/enterprise readiness review'],
  ['vendor_partner', /\bvendor\b|\bpartner\b|subcontractor|referral|alliance/i, 'helena-ward-brain', 'julian-mercer-brain', 'Partner/vendor intake and risk review'],
  ['client_onboarding', /\bclient\b|onboard|renewal|escalation|\blaunch\b|status/i, 'adrian-cross-brain', 'marcus-vale-brain', 'Client onboarding and delivery status setup'],
  ['compliance_or_contracting', /\bcontract\b|legal|compliance|policy|filing|incorporation|insurance|\brisk\b/i, 'julian-mercer-brain', 'donovan-pierce-brain', 'Compliance routing and professional review flag'],
  ['technology_or_site', /cloudflare|deploy|deployment|\bworker\b|automation|brain|\bapi\b|system|skygate|fs27|\bgate\b|\bauth\b|introspect|platform event/i, 'orion-hayes-brain', 'site-operator-autonomous-business-brain', 'Technology, deployment, automation, gate, or site operation review'],
  ['media_center_free99', /skyemediacenter|skye media|media center|asset intake|asset search|file delivery|publish asset|media publish|review board|execution board|dispatch board/i, 'valentina-reyes-brain', 'victor-saint-brain', 'Free99 gated media intake, review, publish, and proof routing'],
  ['marketing_or_content', /marketing|brand|copy|seo|content|campaign|public claim/i, 'valentina-reyes-brain', 'victor-saint-brain', 'Marketing copy, content control, or public claim review'],
  ['quality_proof', /proof|qa|claim|audit|receipt|smoke|test|verify/i, 'victor-saint-brain', 'marcus-vale-brain', 'Proof receipt, QA review, or claims validation'],
  ['innovation_expansion', /innovation|expansion|new market|acquisition|branch/i, 'amara-voss-brain', 'gray-london-skyes-brain', 'Expansion, innovation, or new lane evaluation'],
  ['candidate_or_staffing', /candidate|recruit|job order|\bstaff\b|placement|resume/i, 'sienna-brooks-brain', 'adrian-cross-brain', 'Candidate screening or job order fulfillment'],
  ['founder_strategy', /founder|gray|vision|strategy|ownership|doctrine|command/i, 'gray-london-skyes-brain', 'central-company-command-brain', 'Founder strategy and executive command review']
];
const LIVE_SURFACES = [
  {
    id: 'skygate-fs27-proof-surface',
    name: 'SkyeGateFS27 Proof Surface',
    url: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/gate-proofx.html',
    purpose: 'Public proof page for the gate, auth introspection, mirrored events, and MetrAIyux integration.',
    route_when: ['proof','gate','auth','architecture','trust','client command deck','sovereign infrastructure']
  },
  {
    id: 'skygate-fs27-actual-gate',
    name: 'SkyeGateFS27 Actual Gate',
    url: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/',
    purpose: 'Live gate control plane with protected admin lanes, dashboard, smoke tests, and platform control.',
    route_when: ['actual gate','dashboard','key','admin','monitor','smoke test','platform control']
  },
  {
    id: 'metraiyux-full-system',
    name: 'MetrAIyux 0S Full System',
    url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/',
    purpose: 'Live 16-brain business command deck and client-deployment reference.',
    route_when: ['metraiyux','16 brains','command deck','autonomous business','client website','owner admin','sales deck']
  },
  {
    id: 'metraiyux-public-spectacle',
    name: 'MetrAIyux 0S Public Spectacle',
    url: 'https://metraiyux-0s-public-spectacle.pages.dev/',
    purpose: 'Public overview for cold prospects and send-first buyers before they enter the deeper command deck.',
    route_when: ['overview','public','sendable','spectacle','what is it','value']
  },
  {
    id: 'metraiyux-admin-brain',
    name: 'Main Automation Brain',
    url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/automation-brain.html',
    purpose: 'Protected owner/admin command brain for authenticated demos, approval flows, cabinet routing, and receipts.',
    route_when: ['admin','operator','automation brain','approval','token','private']
  },
  {
    id: 'metraiyux-sales-enablement',
    name: 'Sales Enablement Command Library',
    url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/sales-enablement/index.html',
    purpose: 'Discovery blueprint, objection handling, outbound follow-up, demo-room structure, and AE proof packet.',
    route_when: ['sales','ae','discovery','objection','close','follow up','proposal']
  },
  {
    id: 'metraiyux-client-os',
    name: 'Client OS',
    url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/client-os/index.html',
    purpose: 'Client onboarding, document requests, escalation desk, renewal review, and status-board surfaces.',
    route_when: ['client','onboarding','status','escalation','renewal','document request']
  },
  {
    id: 'metraiyux-proof-router',
    name: 'Live Proof Router',
    url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/sales/live-proof-router.html',
    purpose: 'Interactive sales router that matches buyer pain to live proof surfaces.',
    route_when: ['which link','route buyer','proof router','what should i show','live surfaces','sell']
  },
  {
    id: 'skyemediacenter-free99-expansion',
    name: 'SkyeMediaCenter Free99 Expansion Hub',
    url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/live/skye-media-center-operator-proof.html',
    purpose: 'Public proof hub for the Free99 media center: no charge, still gate-session required for app boot and API actions.',
    route_when: ['skyemediacenter','media center','free99','asset intake','asset search','review board','execution board','dispatch board','publish','file delivery','gate session']
  },
  {
    id: 'skyemediacenter-gated-app',
    name: 'SkyeMediaCenter Gated Media App',
    url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/SkyeMediaCenter/index.html',
    purpose: 'Gated media command shell for intake, search, review, execution, dispatch, publish, stats, and file-delivery proof.',
    route_when: ['open skyemediacenter','media app','media intake','asset library','publish','stats','free99']
  },
  {
    id: 'connectlog-relay13-operator-proof',
    name: 'ConnectLog + Relay13 Operator Proof',
    url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/live/connectlog-relay13-operator-proof.html',
    purpose: 'Public operator proof surface for the ConnectLog expansion, live Relay13 bridge, production D1 receipt, WebSocket proof, and updated pricing lanes.',
    route_when: ['connectlog','relay13','operator proof','relationship command','messaging','websocket','production proof','live receipt']
  },
  {
    id: 'relay13-core-live-worker',
    name: 'Relay13 Core Live Worker',
    url: 'https://relay13-core.graylondonskyes.workers.dev/',
    purpose: 'Live Relay13 messaging Worker backed by the shared 0S D1 operator database and root environment deployment credentials.',
    route_when: ['relay13','messaging worker','live worker','connectlog bridge','d1','production api']
  }
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {status, headers: {'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS', 'access-control-allow-headers':'content-type,authorization,x-skygate-app,x-kaixu-app,x-kaixu-build,x-kaixu-request-id,x-skye-gate-session,x-skye-gate-source,x-skye-media-center-free99'}});
}
async function readJson(request) { try { return await request.json(); } catch { return {}; } }
function bearer(request){
  const raw = request.headers.get('authorization') || request.headers.get('x-skye-gate-session') || '';
  return raw.replace(/^Bearer\s+/i,'').trim();
}
function skygateOrigin(env){
  return String(env.SKYGATEFS27_ORIGIN || env.SKYGATE_ORIGIN || '').replace(/\/+$/,'');
}
function mirrorSecret(env){
  return String(env.SKYGATE_EVENT_MIRROR_SECRET || env.SKYGATEFS27_EVENT_MIRROR_SECRET || '').trim();
}
async function introspectSkygate(request, env){
  const origin = skygateOrigin(env);
  const token = bearer(request);
  if (!origin) return {ok:false, status:501, error:'SKYGATEFS27_ORIGIN/SKYGATE_ORIGIN is not configured.'};
  if (!token) return {ok:false, status:401, error:'Missing Authorization bearer token.'};
  const paths = ['/auth-introspect', '/auth/introspect', '/.netlify/functions/auth-introspect'];
  let last = null;
  for (const path of paths) {
    const res = await fetch(`${origin}${path}`, {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({token})
    });
    const data = await res.json().catch(()=>({active:false, error:'Invalid Skyegate response'}));
    last = {res, data, path};
    if (res.status === 404) continue;
    return {ok:res.ok && data.active === true, status:res.ok ? (data.active ? 200 : 401) : res.status, data, path, error:data.error || (data.active ? null : 'Inactive Skyegate token')};
  }
  return {ok:false, status:404, data:last?.data || null, error:`Skyegate introspection endpoint was not found at ${origin}`};
}
async function mirrorSkygateEvent(env, payload={}, actorContext=null){
  const origin = skygateOrigin(env);
  const secret = mirrorSecret(env);
  if (!origin || !secret) return {ok:false, skipped:true, reason:'Skyegate origin or mirror secret is not configured.'};
  const actor = actorContext?.data?.email || actorContext?.data?.username || actorContext?.data?.sub || payload.actor || 'metraiyux-0s';
  const body = {
    source_app: env.SKYGATE_SOURCE_APP || 'metraiyux-0s',
    actor,
    org_id: actorContext?.data?.org || actorContext?.data?.customer_id || payload.org_id || null,
    ws_id: payload.ws_id || payload.meta?.workspace_id || payload.meta?.receipt_id || null,
    type: payload.type || 'metraiyux.event',
    event_ts: payload.event_ts || new Date().toISOString(),
    meta: payload.meta || {}
  };
  const res = await fetch(`${origin}/platform/events`, {
    method:'POST',
    headers:{'content-type':'application/json','x-skygate-mirror-secret':secret},
    body:JSON.stringify(body)
  });
  const data = await res.json().catch(()=>({ok:false, status:res.status}));
  return {ok:res.ok, status:res.status, data};
}
function routeMessage(message = '') {
  const hit = ROUTES.find(r => r[1].test(message)) || ['general_company_command', /./, 'central-company-command-brain', 'site-operator-autonomous-business-brain', 'General company command review'];
  return { id: `evt_${Date.now()}`, created_at: new Date().toISOString(), intent: hit[0], primary_brain: hit[2], secondary_brain: hit[3], recommended_task: hit[4], message, live_surfaces: surfaceMatches(message), guardrail: 'Human operator approval required for contracts, filings, hiring/firing, payments, legal advice, or public claims.' };
}
function surfaceMatches(message = '', limit = 3) {
  const text = String(message).toLowerCase();
  return LIVE_SURFACES.map(surface => {
    const hay = [surface.name, surface.purpose, ...(surface.route_when || [])].join(' ').toLowerCase();
    let score = 0;
    for (const term of text.split(/[^a-z0-9-]+/).filter(Boolean)) if (hay.includes(term)) score += term.length > 5 ? 3 : 1;
    if (/sell|buyer|prospect|client|lead|website|white[- ]?label|command deck|deployment|proof|gate|auth|skygate|fs27/i.test(text)) score += 4;
    return {...surface, score};
  }).filter(s => s.score > 0).sort((a,b) => b.score - a.score).slice(0, limit).map(({score, ...surface}) => surface);
}
function siteOperatorStatus(env) {
  return {
    ok: true,
    version: VERSION,
    total_system_brains: 16,
    connected_brains: 16,
    mode: 'worker-ready',
    live_surface_count: LIVE_SURFACES.length,
    storage: {
      d1: Boolean(env.SITE_OPERATOR_WORKER || env.SITE_OPERATOR_WORKER_ORIGIN),
      kv: Boolean(env.SITE_EVENTS_KV),
      queue: Boolean(env.SITE_TASK_QUEUE),
      site_operator_service: Boolean(env.SITE_OPERATOR_WORKER || env.SITE_OPERATOR_WORKER_ORIGIN),
      skygate_origin: Boolean(skygateOrigin(env))
    }
  };
}
async function saveKV(env, key, value) {
  if (env.SITE_EVENTS_KV) await env.SITE_EVENTS_KV.put(key, JSON.stringify(value), {expirationTtl: 60 * 60 * 24 * 90});
}
async function readKVLedger(env, limit = 50) {
  if (!env.SITE_EVENTS_KV?.list) return [];
  const listed = await env.SITE_EVENTS_KV.list({limit});
  const rows = [];
  for (const key of listed.keys || []) {
    const item = await env.SITE_EVENTS_KV.get(key.name, {type:'json'}).catch(()=>null);
    if (item) rows.push(item);
  }
  return rows.sort((a,b)=>String(b.created_at || b.event_ts || '').localeCompare(String(a.created_at || a.event_ts || '')));
}

const MEDIA_ASSETS_KEY = 'skyemediacenter:v1:assets';
const MEDIA_EVENTS_KEY = 'skyemediacenter:v1:workflow-events';
const MEDIA_PUBLISH_KEY = 'skyemediacenter:v1:publish-queue';
const MEDIA_FILE_PREFIX = 'skyemediacenter:v1:file:';
const VALID_MEDIA_TYPES = new Set(['image', 'video', 'audio', 'document', 'other']);
const VALID_UPLOAD_STATUSES = new Set(['draft', 'published']);
const VALID_MANAGE_STATUSES = new Set(['draft', 'archived', 'published', 'scheduled', 'active']);
const VALID_REVIEW_STATUSES = new Set(['draft', 'ready', 'approved', 'blocked', 'dispatched']);
const VALID_EXECUTION_STATUSES = new Set(['queued', 'active', 'blocked', 'completed']);
const VALID_DISPATCH_STATUSES = new Set(['queued', 'scheduled', 'published', 'cancelled', 'completed', 'blocked']);
const VALID_PUBLISH_TARGETS = new Set(['web', 'social', 'email']);

function mediaHeaders(extra = {}) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization,x-skye-gate-session,x-skye-gate-source,x-skye-media-center-free99',
    'cache-control': 'no-store',
    ...extra
  };
}
function mediaJson(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: mediaHeaders({'content-type':'application/json; charset=utf-8'})
  });
}
function mediaRouteName(pathname) {
  const path = String(pathname || '').replace(/\/+$/,'').toLowerCase();
  if (path === '/.netlify/functions/media-assets' || path === '/api/media/assets') return 'assets';
  if (path === '/.netlify/functions/media-search' || path === '/api/media/search') return 'search';
  if (path === '/.netlify/functions/media-file' || path === '/api/media/file') return 'file';
  if (path === '/.netlify/functions/media-publish' || path === '/api/media/publish') return 'publish';
  if (path === '/.netlify/functions/media-stats' || path === '/api/media/stats') return 'stats';
  if (path === '/.netlify/functions/skygate-session' || path === '/api/media/session') return 'session';
  return null;
}
function mediaKv(env) {
  return env.SKYE_MEDIA_CENTER_KV || env.SITE_EVENTS_KV || null;
}
async function mediaGetJson(kv, key, fallback) {
  const value = await kv.get(key, {type:'json'}).catch(()=>null);
  return value == null ? fallback : value;
}
async function mediaPutJson(kv, key, value) {
  await kv.put(key, JSON.stringify(value));
}
function mediaNow() {
  return new Date().toISOString();
}
function mediaId(prefix = 'asset') {
  const random = crypto.randomUUID ? crypto.randomUUID().replace(/-/g,'').slice(0,24) : String(Date.now());
  return `${prefix}_${random}`;
}
function safeMediaText(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max);
}
function safeFilename(value) {
  return safeMediaText(value || 'asset.bin', 160).replace(/[^a-zA-Z0-9._-]/g, '_') || 'asset.bin';
}
function normalizeTags(tags) {
  return Array.isArray(tags) ? tags.map((tag)=>safeMediaText(tag, 48)).filter(Boolean).slice(0, 24) : [];
}
function normalizeTargets(targets) {
  return Array.isArray(targets) ? targets.map((target)=>safeMediaText(target, 80)).filter(Boolean).slice(0, 8) : [];
}
function base64ByteLength(value) {
  const clean = String(value || '').replace(/\s+/g,'');
  if (!clean) return 0;
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor(clean.length * 3 / 4) - padding);
}
function base64ToBytes(value) {
  const binary = atob(String(value || '').replace(/\s+/g,''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
function inferMimeType(filename, fallback) {
  if (safeMediaText(fallback, 120)) return safeMediaText(fallback, 120);
  const lower = String(filename || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.avif')) return 'image/avif';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.flac')) return 'audio/flac';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.csv')) return 'text/csv; charset=utf-8';
  if (lower.endsWith('.txt') || lower.endsWith('.md')) return 'text/plain; charset=utf-8';
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'application/octet-stream';
}
function defaultReviewState() {
  return {status:'draft', owner:'', checkpoint:'intake', notes:'', updatedAt:null};
}
function normalizeReviewState(review) {
  const source = review && typeof review === 'object' ? review : {};
  const status = VALID_REVIEW_STATUSES.has(String(source.status || '').toLowerCase()) ? String(source.status).toLowerCase() : 'draft';
  return {
    status,
    owner: safeMediaText(source.owner, 120),
    checkpoint: safeMediaText(source.checkpoint || (status === 'draft' ? 'intake' : status), 120) || 'intake',
    notes: safeMediaText(source.notes, 1000),
    updatedAt: source.updatedAt || null
  };
}
function defaultExecutionState() {
  return {status:'queued', owner:'', checkpoint:'publish-prep', notes:'', targets:[], updatedAt:null};
}
function normalizeExecutionState(execution) {
  const source = execution && typeof execution === 'object' ? execution : {};
  const status = VALID_EXECUTION_STATUSES.has(String(source.status || '').toLowerCase()) ? String(source.status).toLowerCase() : 'queued';
  return {
    status,
    owner: safeMediaText(source.owner, 120),
    checkpoint: safeMediaText(source.checkpoint || (status === 'completed' ? 'completed' : 'publish-prep'), 120) || 'publish-prep',
    notes: safeMediaText(source.notes, 1000),
    targets: normalizeTargets(source.targets),
    updatedAt: source.updatedAt || null
  };
}
function defaultDispatchState() {
  return {status:'queued', owner:'', checkpoint:'publish-queue', notes:'', targets:[], updatedAt:null, publishedEntryId:null};
}
function normalizeDispatchState(dispatch) {
  const source = dispatch && typeof dispatch === 'object' ? dispatch : {};
  const status = VALID_DISPATCH_STATUSES.has(String(source.status || '').toLowerCase()) ? String(source.status).toLowerCase() : 'queued';
  return {
    status,
    owner: safeMediaText(source.owner, 120),
    checkpoint: safeMediaText(source.checkpoint || (status === 'published' ? 'published' : 'publish-queue'), 120) || 'publish-queue',
    notes: safeMediaText(source.notes, 1000),
    targets: normalizeTargets(source.targets),
    updatedAt: source.updatedAt || null,
    publishedEntryId: source.publishedEntryId || null
  };
}
function normalizeMediaAsset(asset) {
  return {
    ...asset,
    review: normalizeReviewState(asset.review),
    execution: normalizeExecutionState(asset.execution),
    dispatch: normalizeDispatchState(asset.dispatch)
  };
}
function inferExecutionTargets(asset) {
  const tags = Array.isArray(asset.tags) ? asset.tags.map((tag)=>String(tag || '').toLowerCase()) : [];
  const text = [asset.title, asset.description, asset.filename, ...tags].join(' ').toLowerCase();
  const targets = ['SkyeWebCreatorMax'];
  if (/\b(proof|contract|invoice|compliance|policy|evidence)\b/.test(text)) targets.push('SkyeProofx');
  if (/\b(lead|crm|campaign|sales|launch)\b/.test(text)) targets.push('SkyeLeadVault');
  if (/\b(activation|publish|release|drop|distribution)\b/.test(text)) targets.push('AE-FlowPro');
  return [...new Set(targets)].slice(0, 6);
}
async function appendMediaWorkflow(kv, asset, event) {
  const events = await mediaGetJson(kv, MEDIA_EVENTS_KEY, []);
  const normalized = normalizeMediaAsset(asset);
  events.unshift({
    id: mediaId('wf'),
    assetId: normalized.id,
    title: normalized.title,
    filename: normalized.filename,
    type: normalized.type,
    event,
    owner: normalized.dispatch.owner || normalized.execution.owner || normalized.review.owner || '',
    status: normalized.dispatch.status || normalized.execution.status || normalized.review.status || normalized.status || '',
    checkpoint: normalized.dispatch.checkpoint || normalized.execution.checkpoint || normalized.review.checkpoint || '',
    target: (normalized.dispatch.targets || normalized.execution.targets || []).join(', '),
    occurredAt: mediaNow(),
    notes: normalized.dispatch.notes || normalized.execution.notes || normalized.review.notes || ''
  });
  await mediaPutJson(kv, MEDIA_EVENTS_KEY, events.slice(0, 120));
}
async function readMediaAssets(kv) {
  return await mediaGetJson(kv, MEDIA_ASSETS_KEY, []);
}
async function writeMediaAssets(kv, assets) {
  await mediaPutJson(kv, MEDIA_ASSETS_KEY, assets);
}
function mediaAssetUrl(id) {
  return `/.netlify/functions/media-file?id=${encodeURIComponent(id)}`;
}
async function requireMediaGate(request, env) {
  const gate = await introspectSkygate(request, env);
  if (!gate.ok) {
    return {
      gate,
      response: mediaJson({
        ok:false,
        error: gate.error || 'Gate session required.',
        free99: true,
        gateSessionRequired: true
      }, gate.status || 401)
    };
  }
  return {gate};
}
async function mirrorMedia(ctx, env, gate, type, meta) {
  if (!ctx?.waitUntil) return;
  ctx.waitUntil(mirrorSkygateEvent(env, {
    type,
    meta: {
      app:'SkyeMediaCenter',
      free99:true,
      gate_session_required:true,
      ...meta
    }
  }, gate));
}
function boardCounts(assets, key, statuses) {
  const counts = {total:assets.length, unassigned:0};
  for (const status of statuses) counts[status] = 0;
  for (const asset of assets) {
    const lane = asset[key] || {};
    const status = lane.status || statuses[0];
    counts[status] = (counts[status] || 0) + 1;
    if (!lane.owner) counts.unassigned += 1;
  }
  return counts;
}
function sortByLane(assets, key) {
  return assets.sort((left, right) => {
    const leftTime = left[key]?.updatedAt ? new Date(left[key].updatedAt).getTime() : 0;
    const rightTime = right[key]?.updatedAt ? new Date(right[key].updatedAt).getTime() : 0;
    return rightTime - leftTime || new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
  });
}
async function handleMediaAssets(request, env, ctx, url, kv, gate) {
  const method = request.method.toUpperCase();
  const action = url.searchParams.get('action') || '';
  let assets = await readMediaAssets(kv);

  if (method === 'GET') {
    if (!action || action === 'list') {
      let filtered = assets.filter((asset)=>asset.status !== 'archived').map(normalizeMediaAsset);
      const type = url.searchParams.get('type') || '';
      const search = String(url.searchParams.get('search') || '').toLowerCase();
      const tag = String(url.searchParams.get('tag') || '').toLowerCase();
      if (type && VALID_MEDIA_TYPES.has(type)) filtered = filtered.filter((asset)=>asset.type === type);
      if (tag) filtered = filtered.filter((asset)=>asset.tags?.some((item)=>String(item).toLowerCase() === tag));
      if (search) {
        filtered = filtered.filter((asset)=>[
          asset.title,
          asset.description,
          asset.filename,
          ...(asset.tags || [])
        ].join(' ').toLowerCase().includes(search));
      }
      filtered.sort((a,b)=>new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      return mediaJson({ok:true, assets:filtered});
    }
    if (action === 'get') {
      const id = url.searchParams.get('id') || '';
      const asset = assets.find((entry)=>entry.id === id);
      return asset && asset.status !== 'archived' ? mediaJson({ok:true, asset:normalizeMediaAsset(asset)}) : mediaJson({ok:false, error:'Asset not found'}, 404);
    }
    if (action === 'review-board') {
      const queue = sortByLane(assets.filter((asset)=>asset.status !== 'archived').map(normalizeMediaAsset), 'review');
      return mediaJson({ok:true, counts:boardCounts(queue, 'review', ['draft','ready','approved','blocked','dispatched']), queue});
    }
    if (action === 'execution-board') {
      const queue = sortByLane(assets.filter((asset)=>asset.status !== 'archived').map(normalizeMediaAsset), 'execution');
      return mediaJson({ok:true, counts:boardCounts(queue, 'execution', ['queued','active','blocked','completed']), queue});
    }
    if (action === 'dispatch-board') {
      const queue = sortByLane(assets.filter((asset)=>asset.status !== 'archived').map(normalizeMediaAsset), 'dispatch');
      return mediaJson({ok:true, counts:boardCounts(queue, 'dispatch', ['queued','scheduled','published','cancelled','completed','blocked']), queue});
    }
    if (action === 'workflow-timeline') {
      const events = await mediaGetJson(kv, MEDIA_EVENTS_KEY, []);
      const summary = {total:events.length, archive:0, review:0, execution:0, dispatch:0};
      const items = events.map((event)=>{
        if (event.event === 'asset-archived') summary.archive += 1;
        if (event.event === 'review-updated') summary.review += 1;
        if (event.event === 'execution-updated') summary.execution += 1;
        if (event.event === 'dispatch-updated') summary.dispatch += 1;
        return {...event, type:event.event};
      });
      return mediaJson({ok:true, workflowTimeline:{summary, items, latestEventAt:items[0]?.occurredAt || null}});
    }
    return mediaJson({ok:false, error:`Unknown GET action: ${action}`}, 400);
  }

  if (method === 'POST') {
    const body = await readJson(request);
    const bodyAction = body.action || action || 'upload';
    if (bodyAction !== 'upload') return mediaJson({ok:false, error:`Unknown POST action: ${bodyAction}`}, 400);
    const title = safeMediaText(body.title, 180);
    const type = safeMediaText(body.type, 40).toLowerCase();
    const filename = safeFilename(body.filename);
    const contentBase64 = String(body.content_base64 || '').replace(/\s+/g,'');
    if (!title) return mediaJson({ok:false, error:'title is required'}, 400);
    if (!VALID_MEDIA_TYPES.has(type)) return mediaJson({ok:false, error:'type must be one of: image, video, audio, document, other'}, 400);
    if (!filename) return mediaJson({ok:false, error:'filename is required'}, 400);
    if (!contentBase64) return mediaJson({ok:false, error:'content_base64 is required'}, 400);
    const fileSize = base64ByteLength(contentBase64);
    const maxUploadBytes = Math.max(1024, Number(env.SKYE_MEDIA_CENTER_MAX_UPLOAD_BYTES || 8 * 1024 * 1024));
    if (fileSize > maxUploadBytes) return mediaJson({ok:false, error:`File exceeds production upload limit of ${maxUploadBytes} bytes`}, 413);
    try { base64ToBytes(contentBase64); } catch { return mediaJson({ok:false, error:'content_base64 is not valid base64'}, 400); }
    const id = mediaId('media');
    const normalizedStatus = VALID_UPLOAD_STATUSES.has(String(body.status || '').toLowerCase()) ? String(body.status).toLowerCase() : 'draft';
    const fileKey = `${MEDIA_FILE_PREFIX}${id}`;
    await kv.put(fileKey, contentBase64);
    const asset = {
      id,
      title,
      type,
      filename,
      fileKey,
      fileSize,
      tags: normalizeTags(body.tags),
      description: safeMediaText(body.description, 1000),
      status: normalizedStatus,
      publishedAt: normalizedStatus === 'published' ? mediaNow() : null,
      createdAt: mediaNow(),
      updatedAt: mediaNow(),
      review: defaultReviewState(),
      execution: defaultExecutionState(),
      dispatch: defaultDispatchState(),
      mimeType: inferMimeType(filename, body.mimeType),
      url: mediaAssetUrl(id)
    };
    assets.push(asset);
    await writeMediaAssets(kv, assets);
    await appendMediaWorkflow(kv, asset, 'asset-uploaded');
    await mirrorMedia(ctx, env, gate, 'skyemediacenter.asset_uploaded', {asset_id:id, filename, status:asset.status});
    return mediaJson({ok:true, asset}, 201);
  }

  if (method === 'PUT') {
    const body = await readJson(request);
    const bodyAction = body.action || action || 'update';
    const id = safeMediaText(body.id, 120);
    const index = assets.findIndex((asset)=>asset.id === id);
    if (!id) return mediaJson({ok:false, error:'id is required'}, 400);
    if (index === -1) return mediaJson({ok:false, error:'Asset not found'}, 404);
    const asset = normalizeMediaAsset(assets[index]);
    if (bodyAction === 'update') {
      if (body.title !== undefined) asset.title = safeMediaText(body.title, 180);
      if (body.tags !== undefined) asset.tags = normalizeTags(body.tags);
      if (body.description !== undefined) asset.description = safeMediaText(body.description, 1000);
      if (body.status !== undefined) {
        const status = String(body.status || '').toLowerCase();
        if (!VALID_MANAGE_STATUSES.has(status)) return mediaJson({ok:false, error:'Invalid status value'}, 400);
        asset.status = status;
        asset.publishedAt = status === 'published' ? asset.publishedAt || mediaNow() : null;
      }
    } else if (bodyAction === 'review') {
      const review = normalizeReviewState({...asset.review, ...body});
      asset.review = {...review, updatedAt:mediaNow()};
      await appendMediaWorkflow(kv, asset, 'review-updated');
    } else if (bodyAction === 'execution') {
      if (!['approved', 'dispatched'].includes(asset.review.status)) return mediaJson({ok:false, error:'Asset review must be approved or dispatched before execution can be queued'}, 409);
      const execution = normalizeExecutionState({...asset.execution, ...body});
      if (!execution.targets.length) execution.targets = inferExecutionTargets(asset);
      asset.execution = {...execution, updatedAt:mediaNow()};
      await appendMediaWorkflow(kv, asset, 'execution-updated');
    } else if (bodyAction === 'dispatch') {
      if (!['approved', 'dispatched'].includes(asset.review.status)) return mediaJson({ok:false, error:'Asset review must be approved before dispatch can be updated'}, 409);
      if (!['active', 'completed'].includes(asset.execution.status)) return mediaJson({ok:false, error:'Asset execution must be active or completed before dispatch can be updated'}, 409);
      const dispatch = normalizeDispatchState({...asset.dispatch, ...body});
      if (!dispatch.targets.length) dispatch.targets = asset.execution.targets.length ? asset.execution.targets : inferExecutionTargets(asset);
      asset.dispatch = {...dispatch, updatedAt:mediaNow()};
      await appendMediaWorkflow(kv, asset, 'dispatch-updated');
    } else {
      return mediaJson({ok:false, error:`Unknown PUT action: ${bodyAction}`}, 400);
    }
    asset.updatedAt = mediaNow();
    assets[index] = asset;
    await writeMediaAssets(kv, assets);
    await mirrorMedia(ctx, env, gate, `skyemediacenter.${bodyAction}_updated`, {asset_id:id, status:asset.status});
    return mediaJson({ok:true, asset, review:asset.review, execution:asset.execution, dispatch:asset.dispatch});
  }

  if (method === 'DELETE') {
    const id = safeMediaText(url.searchParams.get('id'), 120);
    const index = assets.findIndex((asset)=>asset.id === id);
    if (!id) return mediaJson({ok:false, error:'id is required'}, 400);
    if (index === -1) return mediaJson({ok:false, error:'Asset not found'}, 404);
    assets[index] = {...normalizeMediaAsset(assets[index]), status:'archived', updatedAt:mediaNow()};
    await writeMediaAssets(kv, assets);
    await appendMediaWorkflow(kv, assets[index], 'asset-archived');
    await mirrorMedia(ctx, env, gate, 'skyemediacenter.asset_archived', {asset_id:id});
    return mediaJson({ok:true, message:'Asset archived', id, asset:assets[index]});
  }

  return mediaJson({ok:false, error:'Method not allowed'}, 405);
}
function tokenizeMedia(text) {
  return String(text || '').toLowerCase().split(/\W+/).filter((word)=>word.length >= 2);
}
function mediaSearchScore(asset, words) {
  let score = 0;
  const textTitle = String(asset.title || '').toLowerCase();
  const textDescription = String(asset.description || '').toLowerCase();
  const tags = (asset.tags || []).map((tag)=>String(tag).toLowerCase());
  for (const word of words) {
    if (textTitle.includes(word)) score += 10;
    if (textDescription.includes(word)) score += 5;
    if (tags.includes(word)) score += 15;
  }
  return score;
}
async function handleMediaSearch(request, env, url, kv) {
  if (request.method !== 'GET') return mediaJson({ok:false, error:'Method not allowed'}, 405);
  let assets = (await readMediaAssets(kv)).filter((asset)=>asset.status !== 'archived').map(normalizeMediaAsset);
  const q = url.searchParams.get('q') || '';
  const type = url.searchParams.get('type') || '';
  const tag = String(url.searchParams.get('tag') || '').toLowerCase();
  const status = url.searchParams.get('status') || '';
  if (type) assets = assets.filter((asset)=>asset.type === type);
  if (status) assets = assets.filter((asset)=>asset.status === status);
  if (tag) assets = assets.filter((asset)=>asset.tags?.some((item)=>String(item).toLowerCase() === tag));
  const words = tokenizeMedia(q);
  let results = [];
  if (!words.length) {
    results = assets.sort((a,b)=>new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).map((asset)=>({asset, score:0, highlights:{}}));
  } else {
    results = assets.map((asset)=>({asset, score:mediaSearchScore(asset, words), highlights:{}})).filter((item)=>item.score > 0)
      .sort((a,b)=>b.score - a.score || new Date(b.asset.createdAt || 0) - new Date(a.asset.createdAt || 0));
  }
  return mediaJson({ok:true, results, total:results.length, query:q, queryWords:words});
}
async function handleMediaFile(request, env, url, kv) {
  if (request.method !== 'GET') return mediaJson({ok:false, error:'Method not allowed'}, 405);
  const id = safeMediaText(url.searchParams.get('id'), 120);
  if (!id) return mediaJson({ok:false, error:'id is required'}, 400);
  const asset = (await readMediaAssets(kv)).find((entry)=>entry.id === id);
  if (!asset || asset.status === 'archived') return mediaJson({ok:false, error:'Asset not found'}, 404);
  const base64 = await kv.get(asset.fileKey || `${MEDIA_FILE_PREFIX}${id}`);
  if (!base64) return mediaJson({ok:false, error:'Stored asset file is missing'}, 404);
  const bytes = base64ToBytes(base64);
  return new Response(bytes, {
    status:200,
    headers: mediaHeaders({
      'content-type': asset.mimeType || 'application/octet-stream',
      'content-length': String(bytes.byteLength),
      'content-disposition': `inline; filename="${String(asset.filename || `${id}.bin`).replace(/"/g,'')}"`
    })
  });
}
async function handleMediaPublish(request, env, ctx, url, kv, gate) {
  const method = request.method.toUpperCase();
  let queue = await mediaGetJson(kv, MEDIA_PUBLISH_KEY, []);
  let assets = await readMediaAssets(kv);
  if (method === 'GET') {
    const status = url.searchParams.get('status') || '';
    const nowTime = Date.now();
    let changed = false;
    queue = queue.map((entry)=>{
      if (entry.status === 'scheduled' && entry.scheduledAt && new Date(entry.scheduledAt).getTime() <= nowTime) {
        changed = true;
        return {...entry, status:'published', publishedAt:mediaNow(), updatedAt:mediaNow()};
      }
      return entry;
    });
    if (changed) await mediaPutJson(kv, MEDIA_PUBLISH_KEY, queue);
    let filtered = queue;
    if (status) filtered = filtered.filter((entry)=>entry.status === status);
    filtered.sort((a,b)=>new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return mediaJson({ok:true, entries:filtered});
  }
  if (method !== 'POST') return mediaJson({ok:false, error:'Method not allowed'}, 405);
  const body = await readJson(request);
  const action = body.action || url.searchParams.get('action') || '';
  const assetId = safeMediaText(body.assetId || url.searchParams.get('assetId'), 120);
  if (!assetId) return mediaJson({ok:false, error:'assetId is required'}, 400);
  const assetIndex = assets.findIndex((asset)=>asset.id === assetId);
  if (assetIndex === -1) return mediaJson({ok:false, error:'Asset not found'}, 404);
  if (action === 'cancel') {
    let cancelled = 0;
    queue = queue.map((entry)=>{
      if (entry.assetId === assetId && entry.status === 'scheduled') {
        cancelled += 1;
        return {...entry, status:'cancelled', updatedAt:mediaNow()};
      }
      return entry;
    });
    if (!cancelled) return mediaJson({ok:false, error:'No scheduled publish entries found for this asset'}, 404);
    const asset = normalizeMediaAsset(assets[assetIndex]);
    if (asset.status === 'scheduled') {
      asset.status = 'draft';
      asset.publishedAt = null;
      asset.updatedAt = mediaNow();
      asset.dispatch = {...asset.dispatch, status:'cancelled', owner:'media-publish', checkpoint:'publish-cancelled', notes:'Scheduled publish cancelled', updatedAt:mediaNow()};
      assets[assetIndex] = asset;
      await writeMediaAssets(kv, assets);
      await appendMediaWorkflow(kv, asset, 'dispatch-updated');
    }
    await mediaPutJson(kv, MEDIA_PUBLISH_KEY, queue);
    return mediaJson({ok:true, message:`Cancelled ${cancelled} scheduled publish entry/entries`, assetId});
  }
  const publishTarget = safeMediaText(body.publishTarget, 40).toLowerCase();
  if (!VALID_PUBLISH_TARGETS.has(publishTarget)) return mediaJson({ok:false, error:'publishTarget must be one of: web, social, email'}, 400);
  const scheduledAt = safeMediaText(body.scheduledAt, 80);
  const scheduled = scheduledAt && new Date(scheduledAt).getTime() > Date.now();
  const entry = {id:mediaId('pub'), assetId, publishTarget, status:scheduled ? 'scheduled' : 'published', scheduledAt:scheduledAt || null, publishedAt:scheduled ? null : mediaNow(), createdAt:mediaNow(), updatedAt:mediaNow()};
  queue.push(entry);
  const asset = normalizeMediaAsset(assets[assetIndex]);
  asset.status = entry.status;
  asset.publishedAt = entry.publishedAt;
  asset.updatedAt = mediaNow();
  asset.dispatch = {...asset.dispatch, status:entry.status, owner:'media-publish', checkpoint:scheduled ? 'publish-scheduled' : 'published-live', notes:scheduled ? `Queued for ${publishTarget} publish at ${scheduledAt}` : `Published to ${publishTarget}`, targets:[publishTarget], updatedAt:mediaNow(), publishedEntryId:entry.id};
  if (asset.execution.status === 'active') asset.execution = {...asset.execution, status:'completed', checkpoint:'published', updatedAt:mediaNow()};
  assets[assetIndex] = asset;
  await writeMediaAssets(kv, assets);
  await mediaPutJson(kv, MEDIA_PUBLISH_KEY, queue);
  await appendMediaWorkflow(kv, asset, 'dispatch-updated');
  await mirrorMedia(ctx, env, gate, 'skyemediacenter.asset_published', {asset_id:assetId, publishTarget, status:entry.status});
  return mediaJson({ok:true, entry, asset});
}
async function handleMediaStats(request, kv) {
  if (request.method !== 'GET') return mediaJson({ok:false, error:'Method not allowed'}, 405);
  const assets = await readMediaAssets(kv);
  const byType = {image:0, video:0, audio:0, document:0, other:0};
  const byStatus = {draft:0, archived:0, published:0, scheduled:0, active:0};
  let totalFileSize = 0;
  for (const asset of assets) {
    if (Object.prototype.hasOwnProperty.call(byType, asset.type)) byType[asset.type] += 1;
    const status = asset.status || 'active';
    if (Object.prototype.hasOwnProperty.call(byStatus, status)) byStatus[status] += 1;
    if (typeof asset.fileSize === 'number') totalFileSize += asset.fileSize;
  }
  const recentUploads = assets.filter((asset)=>asset.status !== 'archived').sort((a,b)=>new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);
  return mediaJson({ok:true, totalAssets:assets.length, byType, byStatus, totalFileSize, recentUploads});
}
async function handleMediaSession(request, env) {
  const method = request.method.toUpperCase();
  if (method === 'POST') {
    return mediaJson({
      ok:false,
      productionGate:true,
      free99:true,
      error:'Production SkyeMediaCenter sessions must come from FS27/SkyGate. Free99 removes the charge, not the gate.'
    }, 503);
  }
  if (method === 'DELETE') return mediaJson({ok:true, cleared:true, productionGate:true, localSessions:false});
  if (method !== 'GET') return mediaJson({ok:false, error:'Method not allowed'}, 405);
  const gate = await introspectSkygate(request, env);
  return mediaJson({
    ok:true,
    productionGate:true,
    free99:true,
    enabled:true,
    available:true,
    localProofBootstrap:false,
    localOperatorLogin:false,
    activeSession: gate.ok ? {
      source:'fs27-skygate-session',
      subject: gate.data?.sub || gate.data?.subject || '',
      email: gate.data?.email || gate.data?.username || '',
      role: gate.data?.role || gate.data?.scope || '',
      artistId: gate.data?.artistId || gate.data?.artist_id || ''
    } : null,
    skygate: gate.ok ? {active:true, path:gate.path || null} : {active:false, error:gate.error || 'No active FS27 session'}
  }, 200);
}
async function handleMediaRoute(request, env, ctx, url) {
  const route = mediaRouteName(url.pathname);
  if (!route) return null;
  if (request.method === 'OPTIONS') return new Response('', {status:204, headers:mediaHeaders()});
  if (route === 'session') return handleMediaSession(request, env);
  const kv = mediaKv(env);
  if (!kv) return mediaJson({ok:false, error:'SkyeMediaCenter production KV storage is not configured.'}, 503);
  const auth = await requireMediaGate(request, env);
  if (auth.response) return auth.response;
  if (route === 'assets') return handleMediaAssets(request, env, ctx, url, kv, auth.gate);
  if (route === 'search') return handleMediaSearch(request, env, url, kv);
  if (route === 'file') return handleMediaFile(request, env, url, kv);
  if (route === 'publish') return handleMediaPublish(request, env, ctx, url, kv, auth.gate);
  if (route === 'stats') return handleMediaStats(request, kv);
  return mediaJson({ok:false, error:'Unknown media route'}, 404);
}
const PROXIES = [
  ['/api/site-operator/', 'SITE_OPERATOR_WORKER_ORIGIN', 'SITE_OPERATOR_WORKER'],
  ['/api/admin/', 'ADMIN_WORKER_ORIGIN', 'ADMIN_WORKER'],
  ['/api/saas/', 'SAAS_WORKER_ORIGIN', 'SAAS_WORKER'],
  ['/api/omega/', 'OMEGA_WORKER_ORIGIN', 'OMEGA_WORKER'],
  ['/api/crown/', 'CROWN_WORKER_ORIGIN', 'CROWN_WORKER'],
  ['/api/nexus/', 'NEXUS_WORKER_ORIGIN', 'NEXUS_WORKER'],
  ['/api/sentinel/', 'SENTINEL_WORKER_ORIGIN', 'SENTINEL_WORKER']
];
const PRIVATE_SOURCE_PATHS = [
  /^\/coming-soon(?:\/|$)/i,
  /^\/live(?:\/|$)/i,
  /(^|\/)\.env(?:\.[^/]+)?$/i,
  /^\/cloudflare(?:\/|$)/i,
  /^\/cloudflare-[^/]+(?:\/|$)/i,
  /^\/MCP_TOOLING_RECEIPT\.(?:json|md)$/i,
  /^\/wrangler(?:\.[^/]+)?\.toml$/i,
  /^\/_(?:headers|redirects)$/i,
  /\/wrangler(?:\.[^/]+)?\.toml$/i,
  /\/migrations\/[^/]+\.(?:sql|js)$/i,
  /\/schema\.sql$/i,
  /\/README(?:_[^/]+)?\.md$/i
];
const PUBLIC_LIVE_PATHS = [
  /^\/live\/connectlog-relay13-operator-proof(?:\.html)?$/i,
  /^\/live\/skye-media-center-operator-proof(?:\.html)?$/i
];
function isPublicCloudflareDocPath(pathname) {
  return /^\/cloudflare\/?$/i.test(pathname) ||
    /^\/cloudflare\/(?:index|crown-worker|nexus-worker)(?:\.html)?$/i.test(pathname);
}
function isPublicLivePath(pathname) {
  return PUBLIC_LIVE_PATHS.some(pattern => pattern.test(pathname));
}
function isPrivateSourcePath(pathname) {
  if (isPublicLivePath(pathname)) return false;
  if (isPublicCloudflareDocPath(pathname)) return false;
  return PRIVATE_SOURCE_PATHS.some(pattern => pattern.test(pathname));
}
function privateSourceResponse() {
  return new Response('Private implementation source is not public. Use /security.html or /tech-stack.html for the buyer-facing architecture overview.', {
    status: 404,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow'
    }
  });
}
async function proxyApi(request, env, url) {
  const hit = PROXIES.find(([prefix]) => url.pathname.startsWith(prefix));
  if (!hit) return null;
  const service = env[hit[2]];
  if (service) return service.fetch(request);
  const origin = env[hit[1]];
  if (!origin) return json({ok:false, error:`${hit[1]} is not configured`}, 502);
  const upstream = new URL(request.url);
  const target = new URL(origin);
  upstream.protocol = target.protocol;
  upstream.host = target.host;
  return fetch(new Request(upstream, request));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (isPrivateSourcePath(url.pathname)) return privateSourceResponse();
    const mediaResponse = await handleMediaRoute(request, env, ctx, url);
    if (mediaResponse) return mediaResponse;
    if (request.method === 'OPTIONS') return json({ok:true});
    if (url.pathname === '/api/skygate/auth-introspect' && request.method === 'POST') {
      const gate = await introspectSkygate(request, env);
      return json({ok:gate.ok, active:Boolean(gate.data?.active), skygate:gate.data || null, error:gate.ok ? null : gate.error}, gate.status || (gate.ok ? 200 : 401));
    }
    if (url.pathname === '/api/skygate/platform-event' && request.method === 'POST') {
      const gate = await introspectSkygate(request, env);
      if (!gate.ok) return json({ok:false, error:gate.error, skygate:gate.data || null}, gate.status || 401);
      const body = await readJson(request);
      const mirrored = await mirrorSkygateEvent(env, body, gate);
      return json({ok:mirrored.ok, mirrored, skygate:{active:true, sub:gate.data?.sub, email:gate.data?.email || gate.data?.username || null}});
    }
    if (url.pathname === '/api/site-operator/status') return json(siteOperatorStatus(env));
    if (url.pathname === '/api/site-operator/live-surfaces') return json({ok:true, surfaces: LIVE_SURFACES});
    if (url.pathname === '/api/site-operator/route' && request.method === 'POST') {
      const body = await readJson(request);
      const receipt = routeMessage(body.message || body.text || '');
      ctx.waitUntil(saveKV(env, receipt.id, receipt));
      ctx.waitUntil(mirrorSkygateEvent(env, {type:'site_operator.route', meta:{receipt_id:receipt.id, intent:receipt.intent, primary_brain:receipt.primary_brain, secondary_brain:receipt.secondary_brain, message_preview:String(receipt.message || '').slice(0,500)}}));
      return json({ok:true, receipt, stored:{kv:Boolean(env.SITE_EVENTS_KV), d1:Boolean(env.SITE_OPERATOR_WORKER || env.SITE_OPERATOR_WORKER_ORIGIN)}});
    }
    if (url.pathname === '/api/site-operator/event' && request.method === 'POST') {
      const body = await readJson(request);
      const receipt = {...body, id: body.id || `evt_${Date.now()}`, created_at: body.created_at || new Date().toISOString(), type: body.type || 'site_event'};
      ctx.waitUntil(saveKV(env, receipt.id, receipt));
      ctx.waitUntil(mirrorSkygateEvent(env, {type:receipt.type || 'site_operator.event', meta:{...receipt, message:String(receipt.message || receipt.text || '').slice(0,500)}}));
      return json({ok:true, receipt, stored: Boolean(env.SITE_EVENTS_KV)});
    }
    if (url.pathname === '/api/site-operator/task' && request.method === 'POST') {
      const body = await readJson(request);
      const task = {id: body.id || `task_${Date.now()}`, created_at: new Date().toISOString(), status: 'queued_for_operator_review', ...body};
      if (env.SITE_TASK_QUEUE) ctx.waitUntil(env.SITE_TASK_QUEUE.send(task));
      ctx.waitUntil(saveKV(env, task.id, task));
      ctx.waitUntil(mirrorSkygateEvent(env, {type:'site_operator.task', meta:{task_id:task.id, status:task.status, title:task.title || task.task || null}}));
      return json({ok:true, task, queued: Boolean(env.SITE_TASK_QUEUE), stored: Boolean(env.SITE_EVENTS_KV)});
    }
    if (url.pathname === '/api/site-operator/ledger') {
      const events = await readKVLedger(env);
      return json({ok:true, persistence: Boolean(env.SITE_OPERATOR_WORKER || env.SITE_OPERATOR_WORKER_ORIGIN) ? 'd1' : 'kv', events});
    }
    const proxied = await proxyApi(request, env, url);
    if (proxied) return proxied;
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Site Operator Brain Worker is running. Static asset binding not configured.', {status: 200});
  }
};
