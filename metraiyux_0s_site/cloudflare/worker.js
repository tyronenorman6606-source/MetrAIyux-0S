
import { handleClientAppFactoryGeneratedRoute, handleClientAppFactoryRoute } from './client-app-factory-adapter.mjs';

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
    purpose: 'Live 17-brain business command deck and client-deployment reference.',
    route_when: ['metraiyux','17 brains','command deck','autonomous business','client website','owner admin','sales deck']
  },
  {
    id: 'valley-verified-insights',
    name: 'Valley Verified Insights',
    url: 'https://phx-verified-network.pages.dev/insights/',
    purpose: 'Public business operating guide library with manual methods, 0S system handoffs, and major platform backlinks.',
    route_when: ['valley verified','insights','blog','content','company operations','business guides','local growth']
  },
  {
    id: 'valley-verified-content-scheduler',
    name: 'Valley Verified 0S Content Scheduler',
    url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/api/valley/content-schedule',
    purpose: '0S Worker endpoint that reads the Valley editorial calendar, detects due guides, stores receipts, and queues publish tasks.',
    route_when: ['content schedule','editorial calendar','publish queue','cron','scheduled articles','valley publisher']
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
    id: 'relay13-chat-hub',
    name: 'Relay13 Chat Hub',
    url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/live/relay13-chat-hub.html',
    purpose: 'Public chat infrastructure map for 0S website messaging, Relay13 admin inbox, ConnectLog routing, Bob and Empire SKM accounts, and persistence proof.',
    route_when: ['chat hub','live chat','website chat','operator inbox','brain-assisted','direct operator','bob empire','skm chat','customer messages']
  },
  {
    id: 'relay13-core-live-worker',
    name: 'Relay13 Core Live Worker',
    url: 'https://relay13-core.graylondonskyes.workers.dev/',
    purpose: 'Live Relay13 messaging Worker backed by the shared 0S D1 operator database and root environment deployment credentials.',
    route_when: ['relay13','messaging worker','live worker','connectlog bridge','d1','production api']
  },
  {
    id: 'vantacore-crm-workspace',
    name: 'VantaCore CRM Workspace',
    url: 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/vantacore-crm',
    purpose: 'Actual FS27-owned VantaCore CRM workspace for lead capture, pipeline updates, bookings, follow-ups, reviews, revenue summary, and activity.',
    route_when: ['vantacore','actual crm','crm dashboard','lead inbox','book job','follow up','review request','service business workspace']
  },
  {
    id: 'vantacore-service-crm-operator-proof',
    name: 'VantaCore Service CRM Operator Proof',
    url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/live/vantacore-service-crm-operator-proof.html',
    purpose: '0S-owned routing hub for the VantaCore service CRM lane: actual workspace, lead firewall, booking, follow-up, review routing, revenue intelligence, tenant guard, and FS27 provider-activation boundary.',
    route_when: ['vantacore','service crm','lead firewall','missed call','booking','follow up','review request','revenue intelligence','client portal','tenant guard']
  },
  {
    id: 'vantacore-protected-worker',
    name: 'VantaCore Protected Worker',
    url: 'https://vantacore.graylondonskyes.workers.dev/',
    purpose: 'Access-gated VantaCore Worker surface; public visitors hit Cloudflare Access, so customer operations stay behind the gate.',
    route_when: ['vantacore worker','protected worker','cloudflare access','service crm production','gated crm']
  }
];
const APP_API_MOUNTS = [
  {
    id: 'sovereigndocs',
    name: 'SovereignDocs',
    base: '/api/sovereigndocs',
    serviceBinding: 'SOVEREIGNDOCS_WORKER',
    originEnv: 'SOVEREIGNDOCS_WORKER_ORIGIN',
    targetBase: '/api',
    status: 'LIVE/PARTIAL',
    builtin: true,
    note: 'A same-domain 0S adapter handles core workflow routes; a dedicated service binding can still replace it later.'
  },
  {
    id: 'kaixuCodestudio',
    name: 'kAIxu CodeStudio',
    base: '/api/kaixu-codestudio',
    serviceBinding: 'KAIXU_CODESTUDIO_WORKER',
    originEnv: 'KAIXU_CODESTUDIO_WORKER_ORIGIN',
    targetBase: '/api',
    status: 'LOCAL/PARTIAL',
    builtin: true,
    note: 'The 0S Worker exposes a same-domain catalog/status/control-plane adapter here. Real provider execution still requires the dedicated CodeStudio backend or service binding.'
  },
  {
    id: 'skyeroutex',
    name: 'SkyeRouteX',
    base: '/api/routex',
    aliases: ['/api/skyeroutex'],
    serviceBinding: 'SKYEROUTEX_WORKER',
    originEnv: 'SKYEROUTEX_WORKER_ORIGIN',
    targetBase: '/api',
    status: 'LIVE/PARTIAL',
    builtin: true,
    note: 'The 0S Worker maps core RouteX workforce routes here; /api/skyeroutex remains a compatibility alias and storage requires SKYEROUTEX_KV/ROUTEX_KV/SITE_EVENTS_KV.'
  },
  {
    id: 'skymusicnexus',
    name: 'SkyeMusicNexus',
    base: '/api/skymusicnexus',
    serviceBinding: 'SKYEMUSICNEXUS_WORKER',
    originEnv: 'SKYEMUSICNEXUS_WORKER_ORIGIN',
    targetBase: '/.netlify/functions',
    status: 'LIVE/PARTIAL',
    builtin: true,
    note: 'The 0S Worker maps core SkyeMusicNexus Netlify function contracts under this namespace; storage requires SKYMUSICNEXUS_KV/MUSIC_NEXUS_KV/SITE_EVENTS_KV.'
  },
  {
    id: 'marketingMadeEasy',
    name: 'Marketing Made Easy',
    base: '/api/marketing-made-easy',
    serviceBinding: 'MARKETING_MADE_EASY_WORKER',
    originEnv: 'MARKETING_MADE_EASY_WORKER_ORIGIN',
    targetBase: '/api',
    status: 'LOCAL',
    note: 'Same-folder local runtimes remain labeled local/static proof unless a dedicated Marketing Made Easy Worker or origin is attached here.'
  },
  {
    id: 'relay13',
    name: 'Relay13',
    base: '/api/relay13',
    serviceBinding: 'RELAY13_WORKER',
    originEnv: 'RELAY13_WORKER_ORIGIN',
    targetBase: '/api',
    status: 'LIVE/GATED',
    note: 'ConnectLog and Relay13 console calls use this configured 0S API base, which rewrites to the live Relay13 Worker contract when RELAY13_WORKER or RELAY13_WORKER_ORIGIN is configured.'
  },
  {
    id: 'media',
    name: 'SkyeMediaCenter',
    base: '/api/media',
    serviceBinding: null,
    originEnv: null,
    targetBase: '/api/media',
    status: 'LIVE/GATED',
    builtin: true,
    note: 'Mounted directly in the full-system Worker.'
  },
  {
    id: 'profit',
    name: 'SkyeProfitConsole',
    base: '/api/profit',
    serviceBinding: 'SKYE_PROFIT_CONSOLE_WORKER',
    originEnv: 'SKYE_PROFIT_CONSOLE_WORKER_ORIGIN',
    targetBase: '/api/runtime',
    status: 'LIVE/GATED',
    builtin: true,
    note: 'The 0S Worker maps the SkyeProfitConsole runtime contracts here; storage requires SKYE_PROFIT_CONSOLE_KV/PROFIT_KV/SITE_EVENTS_KV.'
  },
  {
    id: 'houseops',
    name: 'HouseOperations',
    base: '/api/houseops',
    serviceBinding: 'HOUSEOPS_WORKER',
    originEnv: 'HOUSEOPS_WORKER_ORIGIN',
    targetBase: '/api/houseops',
    status: 'LIVE/GATED',
    builtin: true,
    note: 'The 0S Worker maps HouseOperations task, vendor, schedule, alert, assignment, proof, and export routes here; storage requires HOUSEOPS_KV/HOUSE_OPERATIONS_KV/SITE_EVENTS_KV.'
  },
  {
    id: 'saas',
    name: 'Customer SaaS',
    base: '/api/saas',
    serviceBinding: 'SAAS_WORKER',
    originEnv: 'SAAS_WORKER_ORIGIN',
    targetBase: '/api/saas',
    status: 'LIVE/PARTIAL',
    note: 'Mounted through existing SaaS proxy binding/origin.'
  },
  {
    id: 'clientAppFactory',
    name: 'Client App Factory',
    base: '/api/client-app-factory',
    serviceBinding: 'CLIENT_APP_FACTORY_WORKER',
    originEnv: 'CLIENT_APP_FACTORY_ORIGIN',
    targetBase: '/api',
    status: 'LIVE/ADAPTER',
    note: 'The shell lives inside /client-app-factory/ on 0S. A same-domain Cloudflare adapter now handles intake, Valley import, generation state, reports, and runtime app routing; a dedicated origin can still replace it later if needed.'
  },
  {
    id: 'northstar',
    name: 'NorthStar SignInPro',
    base: '/api/northstar',
    serviceBinding: 'SKYGATEFS27_WORKER',
    originEnv: 'SKYGATEFS27_ORIGIN',
    targetBase: '/.netlify/functions',
    status: 'LIVE/GATED',
    note: 'NorthStar SignInPro runs as a gate-owned, free99-but-rate-limited workspace platform inside FS27 and the 0S shell.'
  }
];
const LEGACY_ROOT_API_COLLISIONS = [
  { pattern: /^\/api\/(?:v17|v18)(?:\/|$)/i, appId: 'sovereigndocs' },
  { pattern: /^\/api\/(?:cases|case-intakes|intake|templates|packets|reminders|legal-review|template-ops|work-queues|editor\/skye-docx-max)(?:\/|$)/i, appId: 'sovereigndocs' },
  { pattern: /^\/api\/auth-(?:me|login|signup|pin-unlock)(?:\/|$)/i, appId: 'sovereigndocs' },
  { pattern: /^\/api\/platform(?:\/|$)/i, appId: 'kaixuCodestudio' },
  { pattern: /^\/api\/(?:auth|jobs|assignments|markets|ratings)(?:\/|$)/i, appId: 'skyeroutex' },
  { pattern: /^\/api\/runtime(?:\/|$)/i, appId: 'marketingMadeEasy' },
  { pattern: /^\/api\/(?:v1|ws)(?:\/|$)/i, appId: 'relay13' }
];
const ROUTING_MODEL = {
  id: 'full-system-worker-adapter',
  decision: 'One full-system Worker owns same-domain routing. Imported apps must use namespaced API bases. Each namespace can attach a service binding or origin without letting that app own root /api.',
  phase: 'API-01'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {status, headers: {'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-allow-headers':'content-type,authorization,x-admin-token,x-skygate-app,x-kaixu-app,x-kaixu-build,x-kaixu-request-id,x-skye-gate-session,x-skye-gate-source,x-skye-media-center-free99'}});
}
function assetBindingRequest(request, pathname = '', search = '') {
  const upstream = new URL(`https://0s-assets.local${pathname}${search}`);
  return new Request(upstream.toString(), request);
}
async function readJson(request) { try { return await request.json(); } catch { return {}; } }
function bearer(request){
  const raw = request.headers.get('authorization') || request.headers.get('x-skye-gate-session') || '';
  return raw.replace(/^Bearer\s+/i,'').trim();
}
function adminHeaderToken(request) {
  return String(request.headers.get('x-admin-token') || '').trim();
}
function skygateOrigin(env){
  return String(env.SKYGATEFS27_ORIGIN || env.SKYGATE_ORIGIN || '').replace(/\/+$/,'');
}
function skygateRequest(env, path, init = {}) {
  if (env.SKYGATEFS27_WORKER?.fetch) {
    return env.SKYGATEFS27_WORKER.fetch(new Request(`https://skyegatefs27.internal${path}`, init));
  }
  const origin = skygateOrigin(env);
  return fetch(`${origin}${path}`, init);
}
function mirrorSecret(env){
  return String(env.SKYGATE_EVENT_MIRROR_SECRET || env.SKYGATEFS27_EVENT_MIRROR_SECRET || '').trim();
}
async function introspectSkygate(request, env){
  const origin = skygateOrigin(env);
  const token = bearer(request);
  if (!origin && !env.SKYGATEFS27_WORKER?.fetch) return {ok:false, status:501, error:'SKYGATEFS27_ORIGIN/SKYGATE_ORIGIN or SKYGATEFS27_WORKER is not configured.'};
  if (!token) return {ok:false, status:401, error:'Missing Authorization bearer token.'};
  const paths = ['/auth-introspect', '/auth/introspect', '/.netlify/functions/auth-introspect'];
  let last = null;
  for (const path of paths) {
    const res = await skygateRequest(env, path, {
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
function scopeList(scope){
  if (Array.isArray(scope)) return scope.map(String);
  return String(scope || '').split(/\s+/).filter(Boolean);
}
function emailAllowlist(env){
  return String(env.SKYGATE_ADMIN_EMAILS || env.METRAIYUX_ADMIN_EMAILS || '').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
}
function allowsAdminGate(claims, env){
  if (!claims?.active && !claims?.ok) return false;
  const role = String(claims.role || claims.user?.role || '').toLowerCase();
  const scopes = new Set(scopeList(claims.scope || claims.scopes || claims.user?.scope).map(x=>x.toLowerCase()));
  const email = String(claims.email || claims.username || claims.user?.email || '').toLowerCase();
  const allowedEmails = emailAllowlist(env);
  return ['founder','owner','admin','deployer','operator'].includes(role)
    || scopes.has('admin.write')
    || scopes.has('admin.read')
    || scopes.has('keys.write')
    || scopes.has('gateway.invoke')
    || (allowedEmails.length && allowedEmails.includes(email));
}
async function requireOperatorAuth(request, env, label = 'operator mutation'){
  const token = bearer(request);
  const headerToken = adminHeaderToken(request);
  const expected = String(env.SITE_OPERATOR_ADMIN_TOKEN || env.METRAIYUX_ADMIN_TOKEN || env.ADMIN_TOKEN || '').trim();
  if (expected && (token === expected || headerToken === expected)) {
    return {ok:true, via:'admin_token', actor:'legacy-admin'};
  }
  if (skygateOrigin(env) || env.SKYGATEFS27_WORKER?.fetch) {
    const gate = await introspectSkygate(request, env);
    if (!gate.ok) return {ok:false, response:json({ok:false, error:gate.error || `Unauthorized ${label}.`, skygate:gate.data || null}, gate.status || 401)};
    if (!allowsAdminGate(gate.data, env)) {
      return {ok:false, response:json({ok:false, error:`SkyGate token is active but not admin-scoped for ${label}.`, skygate:gate.data || null}, 403)};
    }
    return {ok:true, via:'skygate', actor:gate.data?.email || gate.data?.username || gate.data?.sub || 'skygate-admin', gate};
  }
  return {ok:false, response:json({ok:false, error:`Unauthorized ${label}. Configure ADMIN_TOKEN/SITE_OPERATOR_ADMIN_TOKEN or SkyGate auth on this Worker.`}, 401)};
}
async function mirrorSkygateEvent(env, payload={}, actorContext=null){
  const origin = skygateOrigin(env);
  const secret = mirrorSecret(env);
  if ((!origin && !env.SKYGATEFS27_WORKER?.fetch) || !secret) return {ok:false, skipped:true, reason:'Skyegate origin/service binding or mirror secret is not configured.'};
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
  const res = await skygateRequest(env, '/platform/events', {
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
    },
    valley_content_publisher: {
      enabled: true,
      calendar_url: valleyCalendarUrl(env),
      schedule_cron: VALLEY_SCHEDULE_CRON,
      queue_configured: Boolean(env.SITE_TASK_QUEUE),
      receipt_storage_configured: Boolean(env.SITE_EVENTS_KV)
    }
  };
}
function appExternalConfigured(env, mount) {
  return Boolean((mount.serviceBinding && env[mount.serviceBinding]) || (mount.originEnv && env[mount.originEnv]));
}
function appMountConfigured(env, mount) {
  if (mount.builtin) return true;
  return appExternalConfigured(env, mount);
}
function appMountPublic(mount, env) {
  return {
    id: mount.id,
    name: mount.name,
    base: mount.base,
    aliases: mount.aliases || [],
    health: `${mount.base}/health`,
    mounted: appMountConfigured(env, mount),
    status: mount.status,
    routing_model: mount.builtin ? 'builtin' : 'service_binding_or_origin',
    service_binding: mount.serviceBinding || null,
    origin_env: mount.originEnv || null,
    target_base: mount.targetBase,
    note: mount.note
  };
}
function apiBaseMap() {
  return APP_API_MOUNTS.reduce((out, mount) => {
    out[mount.id] = mount.base;
    if (mount.id === 'skyeroutex') out.routex = mount.base;
    if (mount.id === 'profit') out.skyeprofitconsole = mount.base;
    if (mount.id === 'houseops') out.houseoperations = mount.base;
    return out;
  }, {
    siteOperator: '/api/site-operator',
    admin: '/api/admin',
    crown: '/api/crown',
    nexus: '/api/nexus',
    sentinel: '/api/sentinel',
    omega: '/api/omega'
  });
}
function apiRouteManifest(env) {
  return {
    ok: true,
    routing_model: ROUTING_MODEL,
    api_bases: apiBaseMap(),
    apps: APP_API_MOUNTS.map((mount) => appMountPublic(mount, env)),
    legacy_root_collisions: LEGACY_ROOT_API_COLLISIONS.map((entry) => {
      const mount = APP_API_MOUNTS.find((candidate) => candidate.id === entry.appId);
      return { app_id: entry.appId, base: mount?.base || null, pattern: String(entry.pattern) };
    }),
    rules: [
      'Imported apps must not call root /api/* unless that path is explicitly owned by the full-system Worker.',
      'Unconfigured app namespaces return 503 backend_not_mounted instead of falling through to static 404.',
      'Configured app namespaces rewrite to the app service binding or origin target base.'
    ]
  };
}
function appHealth(mount, env) {
  const mounted = mount.id === 'clientAppFactory' && !appExternalConfigured(env, mount)
    ? true
    : appMountConfigured(env, mount);
  const health = {
    ok: mounted,
    app_id: mount.id,
    app: mount.name,
    base: mount.base,
    mounted,
    status: mount.status,
    routing_model: mount.builtin ? 'builtin' : 'service_binding_or_origin',
    service_binding_configured: Boolean(mount.serviceBinding && env[mount.serviceBinding]),
    origin_configured: Boolean(mount.originEnv && env[mount.originEnv]),
    target_base: mount.targetBase,
    error: mounted ? null : 'backend_not_mounted',
    note: mount.note
  };
  if (mount.id === 'sovereigndocs') health.storage_mode = sdStorageMode(env);
  if (mount.id === 'kaixuCodestudio') {
    health.storage_mode = kaiStorageMode(env);
    health.execution_mode = appExternalConfigured(env, mount) ? 'dedicated_backend' : 'same_domain_control_plane_adapter';
    health.platform_api_base = `${mount.base}/platform`;
    health.root_api_blocked = '/api/platform/* returns api_root_collision on this Worker';
  }
  if (mount.id === 'skyeroutex') {
    health.storage_mode = routexStorageMode(env);
    health.workforce_api_base = mount.base;
    health.aliases = mount.aliases || [];
    health.root_api_blocked = '/api/auth, /api/jobs, /api/assignments, /api/markets, and /api/ratings return api_root_collision on this Worker';
    health.mapped_routes = ROUTEX_ROUTE_FAMILIES;
  }
  if (mount.id === 'skymusicnexus') {
    health.storage_mode = musicStorageMode(env);
    health.function_base = mount.base;
    health.mapped_functions = MUSIC_FUNCTIONS;
    health.root_netlify_functions_blocked = '/SkyeMusicNexus/netlify/functions/*.js is private source and /.netlify/functions/* is not the public API base on 0S.';
  }
  if (mount.id === 'profit') {
    health.storage_mode = profitStorageMode(env);
    health.runtime_api_base = mount.base;
    health.mapped_routes = PROFIT_ROUTE_FAMILIES;
    health.route_families = PROFIT_ROUTE_FAMILIES;
    health.root_runtime_blocked = '/api/runtime/* returns api_root_collision on this Worker; SkyeProfitConsole must use /api/profit/*.';
  }
  if (mount.id === 'relay13') {
    health.production_api_base = mount.base;
    health.live_worker_origin = 'https://relay13-core.graylondonskyes.workers.dev';
    health.mapped_routes = [
      '/api/health',
      '/api/v1/connectlog/health',
      '/api/v1/connectlog/cards',
      '/api/v1/connectlog/scan',
      '/api/v1/connectlog/requests',
      '/api/v1/conversations',
      '/api/v1/conversations/:id/messages',
      '/api/admin/workspaces',
      '/api/admin/widget-configs/publish',
      '/api/admin/guardrails',
      '/api/v1/guardrails/proof',
      '/api/ws/:conversation_id'
    ];
    health.root_api_blocked = '/api/v1/* and /api/ws/* return api_root_collision on this Worker; ConnectLog and Relay13 must use /api/relay13/*.';
    health.source_blocked = 'relay13-core-v1.7-connectlog-operator-proof/src, scripts, migrations, env, package, wrangler, MCP receipt, and deploy config files are blocked before static asset serving.';
  }
  if (mount.id === 'marketingMadeEasy') {
    health.runtime_mode = appExternalConfigured(env, mount) ? 'dedicated_backend' : 'local_static_proof_only';
    health.production_api_base = mount.base;
    health.local_runtime_audit = '/Marketing-Made-Easy/MME_RUNTIME_AUDIT.json';
    health.root_runtime_blocked = '/api/runtime/* returns api_root_collision on this Worker; Marketing Made Easy same-folder runtimes are not public 0S APIs.';
    health.source_blocked = 'runtime/local-runtime.mjs, runtime/store.json, runtime/data/*, netlify/functions/*, smoke/*, scripts/*, package.json, schema.sql, and deploy config files are blocked before static asset serving.';
  }
  if (mount.id === 'clientAppFactory') {
    health.storage_mode = 'site_events_kv';
    health.execution_mode = appExternalConfigured(env, mount) ? 'dedicated_backend' : 'same_domain_factory_adapter';
    health.runtime_app_base = '/client-app-factory/generated/:clientId/';
    health.valley_import_base = `${mount.base}/factory/valley`;
  }
  if (mount.id === 'houseops') {
    health.storage_mode = houseopsStorageMode(env);
    health.runtime_api_base = mount.base;
    health.mapped_routes = HOUSEOPS_ROUTE_FAMILIES;
    health.route_families = HOUSEOPS_ROUTE_FAMILIES;
    health.source_blocked = '/HouseOperations/src/* is private source and is blocked before static asset serving.';
  }
  return health;
}
function appMountBases(mount) {
  return [mount.base, ...(mount.aliases || [])];
}
function appApiMatchFor(pathname) {
  for (const mount of APP_API_MOUNTS) {
    const base = appMountBases(mount).find(candidate => pathname === candidate || pathname.startsWith(`${candidate}/`));
    if (base) return {mount, base};
  }
  return null;
}
function appApiMountFor(pathname) {
  return appApiMatchFor(pathname)?.mount || null;
}
function legacyCollisionFor(pathname) {
  const collision = LEGACY_ROOT_API_COLLISIONS.find((entry) => entry.pattern.test(pathname));
  if (!collision) return null;
  const mount = APP_API_MOUNTS.find((candidate) => candidate.id === collision.appId);
  return mount ? { collision, mount } : null;
}
function appTargetPath(mount, pathname, matchedBase = mount.base) {
  const suffix = pathname === matchedBase ? '' : pathname.slice(matchedBase.length);
  if (!suffix || suffix === '/health') {
    if (mount.id === 'skymusicnexus') return `${mount.targetBase}/music-health`;
    if (mount.id === 'relay13') return '/api/health';
    if (mount.id === 'marketingMadeEasy') return '/health';
    if (mount.id === 'northstar') return `${mount.targetBase}/northstar-health`;
    return `${mount.targetBase}/health`;
  }
  if (mount.id === 'relay13') {
    if (suffix === '/api/health' || suffix.startsWith('/api/v1/') || suffix.startsWith('/api/admin/') || suffix.startsWith('/api/ws/')) return suffix;
    if (suffix.startsWith('/v1/') || suffix.startsWith('/admin/') || suffix.startsWith('/ws/')) return `/api${suffix}`;
  }
  if (mount.id === 'northstar') {
    const normalized = suffix.replace(/^\/+/, '').replace(/\//g, '-');
    return `${mount.targetBase}/northstar-${normalized}`;
  }
  return `${mount.targetBase}${suffix}`;
}
function appRouteSuffix(mount, pathname, matchedBase = mount.base) {
  return pathname === matchedBase ? '/' : (pathname.slice(matchedBase.length) || '/');
}
function appRouteNeedsEdgeOperatorAuth(mount, request, pathname, matchedBase = mount.base) {
  if (mount.id !== 'kaixuCodestudio') return false;
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return false;
  const suffix = appRouteSuffix(mount, pathname, matchedBase);
  return suffix.startsWith('/platform/') || suffix === '/platform' || suffix.startsWith('/api/platform/') || suffix === '/api/platform';
}
function appRouteNotMounted(mount, env, pathname) {
  return json({
    ok: false,
    error: 'backend_not_mounted',
    app_id: mount.id,
    app: mount.name,
    base: mount.base,
    requested_path: pathname,
    health: appHealth(mount, env),
    configure: [mount.serviceBinding, mount.originEnv].filter(Boolean)
  }, 503);
}
async function handleAppApiRoute(request, env, url) {
  const match = appApiMatchFor(url.pathname);
  if (!match) return null;
  const {mount, base:matchedBase} = match;
  if (mount.id === 'media') return null;
  if (mount.id === 'clientAppFactory' && !appExternalConfigured(env, mount)) {
    return handleClientAppFactoryRoute(request, env, url, matchedBase);
  }
  if (url.pathname === `${matchedBase}/health`) return json(appHealth(mount, env), appMountConfigured(env, mount) ? 200 : 503);
  if (mount.id === 'sovereigndocs' && !appExternalConfigured(env, mount)) return sdHandleSovereignDocsRoute(request, env, null, url);
  if (mount.id === 'kaixuCodestudio' && !appExternalConfigured(env, mount)) return kaiHandleCodeStudioRoute(request, env, url);
  if (mount.id === 'skyeroutex' && !appExternalConfigured(env, mount)) return routexHandleRoute(request, env, url, matchedBase);
  if (mount.id === 'skymusicnexus' && !appExternalConfigured(env, mount)) return musicHandleRoute(request, env, url);
  if (mount.id === 'profit' && !appExternalConfigured(env, mount)) return profitHandleRoute(request, env, url, matchedBase);
  if (mount.id === 'houseops' && !appExternalConfigured(env, mount)) return houseopsHandleRoute(request, env, url, matchedBase);
  if (!appMountConfigured(env, mount)) return appRouteNotMounted(mount, env, url.pathname);
  if (appRouteNeedsEdgeOperatorAuth(mount, request, url.pathname, matchedBase)) {
    const auth = await requireOperatorAuth(request, env, 'kAIxu CodeStudio platform mutation');
    if (!auth.ok) return auth.response;
  }
  const targetUrl = new URL(request.url);
  targetUrl.pathname = appTargetPath(mount, url.pathname, matchedBase);
  if (mount.serviceBinding && env[mount.serviceBinding]?.fetch) {
    targetUrl.protocol = 'https:';
    targetUrl.host = `${mount.id}.internal`;
    return env[mount.serviceBinding].fetch(new Request(targetUrl, request));
  }
  const origin = String(env[mount.originEnv] || '').replace(/\/+$/, '');
  if (!origin) return appRouteNotMounted(mount, env, url.pathname);
  const originUrl = new URL(origin);
  targetUrl.protocol = originUrl.protocol;
  targetUrl.host = originUrl.host;
  return fetch(new Request(targetUrl, request));
}
function legacyRootApiCollisionResponse(url) {
  const hit = legacyCollisionFor(url.pathname);
  if (!hit) return null;
  const targetPath = `${hit.mount.base}${url.pathname.slice('/api'.length)}`;
  return json({
    ok: false,
    error: 'api_root_collision',
    message: `${hit.mount.name} must use its namespaced API base on the 0S full-system Worker.`,
    app_id: hit.mount.id,
    legacy_path: url.pathname,
    namespaced_base: hit.mount.base,
    namespaced_path: targetPath,
    manifest: '/api/0s/route-manifest'
  }, 409);
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

const VALLEY_CALENDAR_DEFAULT_URL = 'https://phx-verified-network.pages.dev/api/insights-editorial-calendar.json';
const VALLEY_SCHEDULE_CRON = '17 13 * * 1,3,5';
function valleyCalendarUrl(env) {
  return String(env.VALLEY_CONTENT_CALENDAR_URL || VALLEY_CALENDAR_DEFAULT_URL).trim();
}
function valleyDate(value) {
  const time = new Date(value || Date.now());
  if (Number.isNaN(time.getTime())) return new Date().toISOString().slice(0, 10);
  return time.toISOString().slice(0, 10);
}
function valleyCalendarArticles(calendar) {
  if (Array.isArray(calendar?.all)) return calendar.all;
  return [...(calendar?.published || []), ...(calendar?.upcoming || [])];
}
function valleyDueArticles(calendar, at = new Date()) {
  const today = valleyDate(at);
  return valleyCalendarArticles(calendar)
    .filter(article => String(article.status || '').toLowerCase() === 'scheduled')
    .filter(article => String(article.publish_at || article.publishAt || '') <= today)
    .sort((a,b)=>String(a.publish_at || a.publishAt || '').localeCompare(String(b.publish_at || b.publishAt || '')));
}
function valleyNextArticles(calendar, at = new Date(), limit = 8) {
  const today = valleyDate(at);
  return valleyCalendarArticles(calendar)
    .filter(article => String(article.status || '').toLowerCase() === 'scheduled')
    .filter(article => String(article.publish_at || article.publishAt || '') > today)
    .sort((a,b)=>String(a.publish_at || a.publishAt || '').localeCompare(String(b.publish_at || b.publishAt || '')))
    .slice(0, limit);
}
async function fetchValleyCalendar(env) {
  const url = valleyCalendarUrl(env);
  const res = await fetch(url, {headers:{accept:'application/json'}});
  const calendar = await res.json().catch(()=>null);
  if (!res.ok || !calendar) return {ok:false, status:res.status, url, error:'Valley editorial calendar feed could not be read.'};
  return {ok:true, status:res.status, url, calendar};
}
function compactValleyArticle(article) {
  return {
    slug: article.slug,
    title: article.title,
    category: article.category_name || article.category || null,
    publish_at: article.publish_at || article.publishAt || null,
    status: article.status || null,
    url: article.url || (article.slug ? `https://phx-verified-network.pages.dev/insights/${article.slug}/` : null)
  };
}
function valleyTickAuthorized(request, env) {
  const expected = String(env.VALLEY_PUBLISH_ADMIN_TOKEN || env.ADMIN_TOKEN || '').trim();
  if (!expected) return false;
  const bearerToken = String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const headerToken = String(request.headers.get('x-valley-publish-token') || request.headers.get('x-admin-token') || '').trim();
  return bearerToken === expected || headerToken === expected;
}
async function runValleyContentScheduleTick(env, ctx, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const execute = Boolean(options.execute);
  const source = options.source || 'manual';
  const fetched = await fetchValleyCalendar(env);
  if (!fetched.ok) return {ok:false, source, dry_run:!execute, calendar_url:fetched.url, error:fetched.error, status:fetched.status};
  const due = valleyDueArticles(fetched.calendar, now);
  const next = valleyNextArticles(fetched.calendar, now, 8);
  const receipt = {
    id: `valley_publish_tick_${Date.now()}`,
    type: 'valley.insights.schedule_tick',
    created_at: now.toISOString(),
    source,
    cron: options.cron || null,
    dry_run: !execute,
    calendar_url: fetched.url,
    calendar_version: fetched.calendar.version || null,
    counts: fetched.calendar.counts || {},
    due_count: due.length,
    next_count: next.length,
    due: due.map(compactValleyArticle),
    next: next.map(compactValleyArticle),
    destination: env.VALLEY_CONTENT_DESTINATION || 'phx-verified-network'
  };
  const taskResults = [];
  if (execute) {
    for (const article of due) {
      const publishAt = article.publish_at || article.publishAt || valleyDate(now);
      const task = {
        id: `valley_publish_${String(article.slug || 'article').replace(/[^a-z0-9-]/gi, '_')}_${publishAt}`,
        type: 'valley.insight.publish',
        status: 'queued_for_operator_review',
        created_at: now.toISOString(),
        source: 'metraiyux-0s-worker-scheduler',
        calendar_url: fetched.url,
        destination: env.VALLEY_CONTENT_DESTINATION || 'phx-verified-network',
        title: `Publish Valley guide: ${article.title || article.slug}`,
        article: compactValleyArticle(article),
        operator_instruction: 'Rebuild and redeploy Valley Verified so this guide moves from scheduled calendar state into a public /insights/{slug}/ route, then attach production browser proof.'
      };
      if (env.SITE_TASK_QUEUE) await env.SITE_TASK_QUEUE.send(task);
      await saveKV(env, task.id, task);
      taskResults.push({id:task.id, slug:article.slug, queued:Boolean(env.SITE_TASK_QUEUE), stored:Boolean(env.SITE_EVENTS_KV)});
    }
    await saveKV(env, receipt.id, {...receipt, queued_tasks:taskResults});
    if (env.VALLEY_PUBLISH_WEBHOOK_URL && due.length) {
      const webhookRequest = fetch(env.VALLEY_PUBLISH_WEBHOOK_URL, {
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({...receipt, queued_tasks:taskResults})
      }).catch(()=>null);
      if (ctx?.waitUntil) ctx.waitUntil(webhookRequest);
    }
    if (ctx?.waitUntil) ctx.waitUntil(mirrorSkygateEvent(env, {type:'valley.insights.schedule_tick', meta:{receipt_id:receipt.id, due_count:due.length, queued:taskResults.length, source}}));
  }
  return {
    ok:true,
    source,
    dry_run:!execute,
    calendar_url:fetched.url,
    cron: VALLEY_SCHEDULE_CRON,
    worker_clock: now.toISOString(),
    counts:fetched.calendar.counts || {},
    due_count:due.length,
    next_count:next.length,
    due:due.map(compactValleyArticle),
    next:next.map(compactValleyArticle),
    queued_tasks:taskResults,
    queued: taskResults.filter(task => task.queued).length,
    stored: Boolean(env.SITE_EVENTS_KV),
    queue_configured: Boolean(env.SITE_TASK_QUEUE),
    webhook_configured: Boolean(env.VALLEY_PUBLISH_WEBHOOK_URL),
    receipt_id: receipt.id
  };
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
  if (path === '/api/media/health') return 'health';
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
  return `/api/media/file?id=${encodeURIComponent(id)}`;
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
  if (route === 'health') return mediaJson(appHealth(APP_API_MOUNTS.find(mount => mount.id === 'media'), env), 200);
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

const PROFIT_STATE_KEY = 'skyeprofitconsole:v1:runtime-state';
const PROFIT_ROUTE_FAMILIES = Object.freeze([
  'GET /api/profit/health',
  'GET /api/profit/status',
  'GET|POST /api/profit/packs',
  'GET|POST /api/profit/close-review-packs',
  'POST /api/profit/packs/:packId/review',
  'POST /api/profit/packs/:packId/execution',
  'GET|POST /api/profit/close-briefs',
  'GET /api/profit/review-board',
  'GET /api/profit/execution-board',
  'POST /api/profit/execution-board/:executionId/dispatch',
  'GET /api/profit/dispatch-board',
  'GET|POST /api/profit/splits',
  'GET|POST /api/profit/proof',
  'GET /api/profit/workflow-timeline',
  'GET /api/profit/exports',
  'GET /api/profit/audit'
]);
function profitStorageMode(env) {
  if (env.SKYE_PROFIT_CONSOLE_KV) return 'skye_profit_console_kv';
  if (env.PROFIT_KV) return 'profit_kv';
  if (env.SITE_EVENTS_KV) return 'site_events_kv';
  return 'missing';
}
function profitKv(env) {
  return env.SKYE_PROFIT_CONSOLE_KV || env.PROFIT_KV || env.SITE_EVENTS_KV || null;
}
function profitNow() {
  return new Date().toISOString();
}
function profitId(prefix = 'profit') {
  const random = crypto.randomUUID ? crypto.randomUUID().replace(/-/g,'').slice(0,18) : `${Date.now()}${Math.random()}`.replace(/\D/g,'').slice(0,18);
  return `${prefix}_${random}`;
}
function profitText(value, max = 800) {
  return String(value == null ? '' : value).trim().slice(0, max);
}
function profitNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}
function profitList(values, max = 12) {
  return Array.isArray(values) ? values.map(item => profitText(item, 180)).filter(Boolean).slice(0, max) : [];
}
function profitDefaultSplits() {
  return {ae:40, ops:18, tax:14, reserve:13, reinvest:15};
}
function profitDefaultState() {
  return {reviewPacks:[], closeBriefs:[], executionItems:[], dispatchItems:[], splits:profitDefaultSplits(), workflowEvents:[], updatedAt:null};
}
function profitNormalizeReview(review = {}) {
  return {
    status: profitText(review.status || 'draft', 40) || 'draft',
    owner: profitText(review.owner, 120),
    checkpoint: profitText(review.checkpoint, 120),
    notes: profitText(review.notes, 1000),
    updatedAt: profitText(review.updatedAt, 80) || profitNow()
  };
}
function profitNormalizeSnapshot(snapshot = {}) {
  return {
    runtime: profitText(snapshot.runtime || '0S Worker runtime', 120),
    auditScore: profitText(snapshot.auditScore || 'Unknown', 120),
    closePackCount: profitText(snapshot.closePackCount || '0', 40),
    capturedAt: profitText(snapshot.capturedAt, 80) || profitNow()
  };
}
function profitNormalizePack(pack = {}) {
  return {
    id: profitText(pack.id, 120) || profitId('review'),
    label: profitText(pack.label, 180) || 'Alias close review',
    target: profitText(pack.target, 120) || 'AE-FlowPro',
    notes: profitText(pack.notes, 1000),
    snapshot: profitNormalizeSnapshot(pack.snapshot || {}),
    recommended_actions: profitList(pack.recommended_actions || pack.recommendedActions, 10),
    review: profitNormalizeReview(pack.review || {status:pack.status, owner:pack.owner, notes:pack.notes}),
    createdAt: profitText(pack.createdAt, 80) || profitNow()
  };
}
function profitNormalizeExecution(item = {}) {
  return {
    id: profitText(item.id, 120) || profitId('exec'),
    reviewPackId: profitText(item.reviewPackId, 120),
    label: profitText(item.label, 180) || 'Alias execution item',
    target: profitText(item.target, 120) || 'AE-FlowPro',
    owner: profitText(item.owner, 120),
    status: profitText(item.status || 'queued', 40) || 'queued',
    notes: profitText(item.notes, 1000),
    recommended_actions: profitList(item.recommended_actions || item.recommendedActions, 10),
    snapshot: profitNormalizeSnapshot(item.snapshot || {}),
    createdAt: profitText(item.createdAt, 80) || profitNow(),
    updatedAt: profitText(item.updatedAt, 80) || profitNow()
  };
}
function profitNormalizeDispatch(item = {}) {
  return {
    id: profitText(item.id, 120) || profitId('dispatch'),
    executionItemId: profitText(item.executionItemId, 120),
    reviewPackId: profitText(item.reviewPackId, 120),
    label: profitText(item.label, 180) || 'Alias dispatch item',
    target: profitText(item.target, 120) || 'AE-FlowPro',
    owner: profitText(item.owner, 120),
    channel: profitText(item.channel || 'activation', 80) || 'activation',
    status: profitText(item.status || 'queued', 40) || 'queued',
    checkpoint: profitText(item.checkpoint, 120),
    notes: profitText(item.notes, 1000),
    recommended_actions: profitList(item.recommended_actions || item.recommendedActions, 10),
    snapshot: profitNormalizeSnapshot(item.snapshot || {}),
    createdAt: profitText(item.createdAt, 80) || profitNow(),
    updatedAt: profitText(item.updatedAt, 80) || profitNow()
  };
}
function profitNormalizeBrief(brief = {}) {
  const splitAllocation = Array.isArray(brief.splitAllocation) ? brief.splitAllocation.map(item => ({
    name: profitText(item.name || 'lane', 80) || 'lane',
    percent: profitNumber(item.percent),
    amount: profitNumber(item.amount)
  })).slice(0, 12) : [];
  return {
    id: profitText(brief.id, 120) || profitId('brief'),
    packId: profitText(brief.packId, 120),
    label: profitText(brief.label, 180) || 'Alias close brief',
    target: profitText(brief.target, 120) || 'AE-FlowPro',
    owner: profitText(brief.owner || 'profit-ops', 120) || 'profit-ops',
    ask: profitNumber(brief.ask),
    directCost: profitNumber(brief.directCost),
    grossProfit: profitNumber(brief.grossProfit),
    expectedProfit: profitNumber(brief.expectedProfit),
    margin: profitNumber(brief.margin),
    paybackMultiple: profitNumber(brief.paybackMultiple),
    confidence: profitNumber(brief.confidence),
    action: profitText(brief.action || 'advance to execution', 140) || 'advance to execution',
    deadline: profitText(brief.deadline || profitNow().slice(0, 10), 80),
    splitAllocation,
    risks: profitList(brief.risks, 8),
    notes: profitText(brief.notes, 1000),
    status: profitText(brief.status || 'archived', 40) || 'archived',
    createdAt: profitText(brief.createdAt, 80) || profitNow()
  };
}
function profitNormalizeEvent(event = {}) {
  return {
    id: profitText(event.id, 120) || profitId('event'),
    type: profitText(event.type || 'profit_event', 120) || 'profit_event',
    category: profitText(event.category || 'other', 60) || 'other',
    detail: profitText(event.detail, 1000),
    owner: profitText(event.owner, 120),
    target: profitText(event.target, 120),
    reviewPackId: profitText(event.reviewPackId, 120),
    closeBriefId: profitText(event.closeBriefId, 120),
    executionItemId: profitText(event.executionItemId, 120),
    dispatchItemId: profitText(event.dispatchItemId, 120),
    status: profitText(event.status, 80),
    checkpoint: profitText(event.checkpoint, 120),
    createdAt: profitText(event.createdAt, 80) || profitNow()
  };
}
function profitNormalizeState(state = {}) {
  return {
    reviewPacks: Array.isArray(state.reviewPacks) ? state.reviewPacks.map(profitNormalizePack) : [],
    closeBriefs: Array.isArray(state.closeBriefs) ? state.closeBriefs.map(profitNormalizeBrief) : [],
    executionItems: Array.isArray(state.executionItems) ? state.executionItems.map(profitNormalizeExecution) : [],
    dispatchItems: Array.isArray(state.dispatchItems) ? state.dispatchItems.map(profitNormalizeDispatch) : [],
    splits: {...profitDefaultSplits(), ...(state.splits && typeof state.splits === 'object' ? state.splits : {})},
    workflowEvents: Array.isArray(state.workflowEvents) ? state.workflowEvents.map(profitNormalizeEvent).slice(0, 160) : [],
    updatedAt: profitText(state.updatedAt, 80) || null
  };
}
async function profitReadState(kv) {
  const stored = await kv.get(PROFIT_STATE_KEY, {type:'json'}).catch(()=>null);
  return profitNormalizeState(stored || profitDefaultState());
}
async function profitWriteState(kv, state) {
  const next = profitNormalizeState({...state, updatedAt:profitNow()});
  await kv.put(PROFIT_STATE_KEY, JSON.stringify(next));
  return next;
}
function profitHas(board, status) {
  return Object.prototype.hasOwnProperty.call(board, status);
}
function profitReviewBoard(packs) {
  const board = {total:packs.length, draft:0, ready:0, approved:0, blocked:0, dispatched:0};
  for (const pack of packs) {
    const status = pack.review?.status || 'draft';
    if (profitHas(board, status)) board[status] += 1;
  }
  return board;
}
function profitExecutionBoard(items) {
  const board = {total:items.length, queued:0, active:0, blocked:0, completed:0};
  for (const item of items) if (profitHas(board, item.status)) board[item.status] += 1;
  return board;
}
function profitDispatchBoard(items) {
  const board = {total:items.length, queued:0, ready:0, active:0, blocked:0, delivered:0};
  for (const item of items) if (profitHas(board, item.status)) board[item.status] += 1;
  return board;
}
function profitCloseBriefBoard(briefs) {
  const board = {total:briefs.length, close_now:0, protect_margin:0, tighten_proof:0, reprice:0, other:0};
  for (const brief of briefs) {
    const action = String(brief.action || '').toLowerCase();
    if (action.includes('close')) board.close_now += 1;
    else if (action.includes('margin')) board.protect_margin += 1;
    else if (action.includes('proof')) board.tighten_proof += 1;
    else if (action.includes('reprice')) board.reprice += 1;
    else board.other += 1;
  }
  return board;
}
function profitWorkflowTimeline(events) {
  const summary = {archive:0, brief:0, review:0, execution:0, dispatch:0, split:0, proof:0, other:0};
  const timeline = [...events].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
  for (const event of timeline) {
    const key = profitHas(summary, event.category) ? event.category : 'other';
    summary[key] += 1;
  }
  return {summary, timeline:timeline.slice(0, 40)};
}
function profitPushEvent(state, event) {
  return [profitNormalizeEvent({...event, createdAt:profitNow()}), ...(state.workflowEvents || [])].slice(0, 160);
}
function profitRuntimeStatus(state, env) {
  const timeline = profitWorkflowTimeline(state.workflowEvents);
  return {
    ok:true,
    mode:'0s-worker-kv-runtime',
    storage_mode:profitStorageMode(env),
    review_pack_count:state.reviewPacks.length,
    review_board:profitReviewBoard(state.reviewPacks),
    close_brief_count:state.closeBriefs.length,
    close_brief_board:profitCloseBriefBoard(state.closeBriefs),
    execution_item_count:state.executionItems.length,
    execution_board:profitExecutionBoard(state.executionItems),
    dispatch_item_count:state.dispatchItems.length,
    dispatch_board:profitDispatchBoard(state.dispatchItems),
    splits:state.splits,
    workflow_timeline:timeline.summary,
    updated_at:state.updatedAt
  };
}
function profitExportState(state, env) {
  const status = profitRuntimeStatus(state, env);
  return {
    ok:true,
    app:'SkyeProfitConsole',
    exported_at:profitNow(),
    storage_mode:profitStorageMode(env),
    status,
    state,
    audit:profitAudit(state, env)
  };
}
function profitAudit(state, env) {
  const status = profitRuntimeStatus(state, env);
  return {
    ok:true,
    app:'SkyeProfitConsole',
    checked_at:profitNow(),
    storage_mode:profitStorageMode(env),
    gates:['operator_auth_required_for_runtime_actions', 'root_api_runtime_collision_blocked', 'private_local_runtime_source_blocked'],
    routes:PROFIT_ROUTE_FAMILIES,
    counts:{
      review_packs:status.review_pack_count,
      close_briefs:status.close_brief_count,
      execution_items:status.execution_item_count,
      dispatch_items:status.dispatch_item_count,
      workflow_events:state.workflowEvents.length
    },
    ready:Boolean(status.review_pack_count || status.close_brief_count || status.workflow_timeline.archive || status.workflow_timeline.brief)
  };
}
function profitHealth(env) {
  return {
    ...appHealth(APP_API_MOUNTS.find(mount => mount.id === 'profit'), env),
    ok:true,
    mounted:true,
    storage_mode:profitStorageMode(env),
    route_families:PROFIT_ROUTE_FAMILIES
  };
}
function profitRoute(pathname, matchedBase = '/api/profit') {
  const suffix = pathname === matchedBase ? '/' : pathname.slice(matchedBase.length);
  return (suffix || '/').replace(/\/+$/,'') || '/';
}
function profitSortByCreated(items) {
  return [...items].sort((a,b)=>String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}
async function profitHandleRoute(request, env, url, matchedBase = '/api/profit') {
  if (request.method === 'OPTIONS') return json({ok:true});
  const method = request.method.toUpperCase();
  const route = profitRoute(url.pathname, matchedBase);
  if (route === '/' || route === '/health') return json(profitHealth(env), 200);
  const kv = profitKv(env);
  if (!kv) return json({ok:false, error:'SkyeProfitConsole production KV storage is not configured.', storage_mode:profitStorageMode(env)}, 503);
  const auth = await requireOperatorAuth(request, env, 'SkyeProfitConsole runtime');
  if (!auth.ok) return auth.response;
  let state = await profitReadState(kv);

  if (method === 'GET' && route === '/status') return json(profitRuntimeStatus(state, env));
  if (method === 'GET' && route === '/review-board') return json({ok:true, review_board:profitReviewBoard(state.reviewPacks), review_packs:profitSortByCreated(state.reviewPacks)});
  if (method === 'GET' && (route === '/packs' || route === '/close-review-packs')) return json({ok:true, review_board:profitReviewBoard(state.reviewPacks), review_packs:profitSortByCreated(state.reviewPacks)});
  if (method === 'POST' && (route === '/packs' || route === '/close-review-packs')) {
    const body = await readJson(request);
    const pack = profitNormalizePack(body);
    state = await profitWriteState(kv, {
      ...state,
      reviewPacks:[pack, ...state.reviewPacks],
      workflowEvents:profitPushEvent(state, {type:'review_pack_archived', category:'archive', detail:`Archived review pack ${pack.label}`, owner:pack.review.owner, target:pack.target, reviewPackId:pack.id, status:pack.review.status, checkpoint:pack.review.checkpoint})
    });
    return json({ok:true, review_pack:pack, review_board:profitReviewBoard(state.reviewPacks)});
  }

  const packMatch = route.match(/^\/(?:packs|close-review-packs)\/([^/]+)(?:\/(review|execution))?$/);
  if (packMatch && method === 'GET' && !packMatch[2]) {
    const id = decodeURIComponent(packMatch[1]);
    const pack = state.reviewPacks.find(item => item.id === id);
    return pack ? json({ok:true, review_pack:pack}) : json({ok:false, error:'review_pack_not_found'}, 404);
  }
  if (packMatch && method === 'POST' && packMatch[2] === 'review') {
    const id = decodeURIComponent(packMatch[1]);
    const body = await readJson(request);
    const nextReview = profitNormalizeReview(body.review || body);
    let found = false;
    state = await profitWriteState(kv, {
      ...state,
      reviewPacks:state.reviewPacks.map(pack => {
        if (pack.id !== id) return pack;
        found = true;
        return profitNormalizePack({...pack, review:{...pack.review, ...nextReview, updatedAt:profitNow()}});
      }),
      workflowEvents:profitPushEvent(state, {type:'review_pack_review_updated', category:'review', detail:`Updated review state for ${id}`, owner:nextReview.owner, reviewPackId:id, status:nextReview.status, checkpoint:nextReview.checkpoint})
    });
    if (!found) return json({ok:false, error:'review_pack_not_found'}, 404);
    return json({ok:true, review_pack:state.reviewPacks.find(pack => pack.id === id), review_board:profitReviewBoard(state.reviewPacks)});
  }
  if (packMatch && method === 'POST' && packMatch[2] === 'execution') {
    const id = decodeURIComponent(packMatch[1]);
    const reviewPack = state.reviewPacks.find(item => item.id === id);
    if (!reviewPack) return json({ok:false, error:'review_pack_not_found'}, 404);
    const body = await readJson(request);
    const executionItem = profitNormalizeExecution({
      reviewPackId:id,
      label:body.label || `${reviewPack.label} execution`,
      target:body.target || reviewPack.target,
      owner:body.owner || reviewPack.review.owner,
      status:body.status || 'queued',
      notes:body.notes || reviewPack.notes,
      recommended_actions:Array.isArray(body.recommended_actions) ? body.recommended_actions : reviewPack.recommended_actions,
      snapshot:reviewPack.snapshot
    });
    state = await profitWriteState(kv, {
      ...state,
      reviewPacks:state.reviewPacks.map(pack => pack.id === id ? profitNormalizePack({...pack, review:{...pack.review, status:'dispatched', checkpoint:body.checkpoint || pack.review.checkpoint || 'execution_queued', owner:executionItem.owner || pack.review.owner, notes:body.reviewNotes || pack.review.notes, updatedAt:profitNow()}}) : pack),
      executionItems:[executionItem, ...state.executionItems],
      workflowEvents:profitPushEvent(state, {type:'review_pack_execution_updated', category:'execution', detail:`Queued execution for ${reviewPack.label}`, owner:executionItem.owner, target:executionItem.target, reviewPackId:id, executionItemId:executionItem.id, status:executionItem.status, checkpoint:body.checkpoint || 'execution_queued'})
    });
    return json({ok:true, execution_item:executionItem, review_pack:state.reviewPacks.find(pack => pack.id === id), review_board:profitReviewBoard(state.reviewPacks), execution_board:profitExecutionBoard(state.executionItems)});
  }

  if (method === 'GET' && route === '/close-briefs') return json({ok:true, close_brief_board:profitCloseBriefBoard(state.closeBriefs), close_briefs:profitSortByCreated(state.closeBriefs)});
  if (method === 'POST' && route === '/close-briefs') {
    const body = await readJson(request);
    const brief = profitNormalizeBrief(body);
    state = await profitWriteState(kv, {
      ...state,
      closeBriefs:[brief, ...state.closeBriefs],
      workflowEvents:profitPushEvent(state, {type:'close_brief_archived', category:'brief', detail:`Archived close brief ${brief.label}`, owner:brief.owner, target:brief.target, closeBriefId:brief.id, status:brief.status, checkpoint:brief.action})
    });
    return json({ok:true, close_brief:brief, close_brief_board:profitCloseBriefBoard(state.closeBriefs), workflow_timeline:profitWorkflowTimeline(state.workflowEvents).summary});
  }
  const briefMatch = route.match(/^\/close-briefs\/([^/]+)$/);
  if (briefMatch && method === 'GET') {
    const id = decodeURIComponent(briefMatch[1]);
    const brief = state.closeBriefs.find(item => item.id === id);
    return brief ? json({ok:true, close_brief:brief}) : json({ok:false, error:'close_brief_not_found'}, 404);
  }

  if (method === 'GET' && route === '/execution-board') return json({ok:true, execution_board:profitExecutionBoard(state.executionItems), execution_items:profitSortByCreated(state.executionItems)});
  const executionMatch = route.match(/^\/execution-board\/([^/]+)(?:\/dispatch)?$/);
  if (executionMatch && method === 'GET') {
    const id = decodeURIComponent(executionMatch[1]);
    const item = state.executionItems.find(entry => entry.id === id);
    return item ? json({ok:true, execution_item:item}) : json({ok:false, error:'execution_item_not_found'}, 404);
  }
  if (executionMatch && method === 'POST' && route.endsWith('/dispatch')) {
    const id = decodeURIComponent(executionMatch[1]);
    const executionItem = state.executionItems.find(item => item.id === id);
    if (!executionItem) return json({ok:false, error:'execution_item_not_found'}, 404);
    const body = await readJson(request);
    const dispatchItem = profitNormalizeDispatch({
      executionItemId:id,
      reviewPackId:executionItem.reviewPackId,
      label:body.label || `${executionItem.label} dispatch`,
      target:body.target || executionItem.target,
      owner:body.owner || executionItem.owner,
      channel:body.channel || 'activation',
      status:body.status || 'queued',
      checkpoint:body.checkpoint || 'dispatch_queued',
      notes:body.notes || executionItem.notes,
      recommended_actions:Array.isArray(body.recommended_actions) ? body.recommended_actions : executionItem.recommended_actions,
      snapshot:executionItem.snapshot
    });
    state = await profitWriteState(kv, {
      ...state,
      executionItems:state.executionItems.map(item => item.id === id ? profitNormalizeExecution({...item, status:body.executionStatus || 'completed', owner:dispatchItem.owner || item.owner, notes:body.executionNotes || item.notes, updatedAt:profitNow()}) : item),
      dispatchItems:[dispatchItem, ...state.dispatchItems],
      workflowEvents:profitPushEvent(state, {type:'review_pack_dispatch_updated', category:'dispatch', detail:`Queued dispatch for ${executionItem.label}`, owner:dispatchItem.owner, target:dispatchItem.target, reviewPackId:executionItem.reviewPackId, executionItemId:id, dispatchItemId:dispatchItem.id, status:dispatchItem.status, checkpoint:dispatchItem.checkpoint})
    });
    return json({ok:true, dispatch_item:dispatchItem, execution_item:state.executionItems.find(item => item.id === id), dispatch_board:profitDispatchBoard(state.dispatchItems), workflow_timeline:profitWorkflowTimeline(state.workflowEvents).summary});
  }
  if (method === 'GET' && route === '/dispatch-board') return json({ok:true, dispatch_board:profitDispatchBoard(state.dispatchItems), dispatch_items:profitSortByCreated(state.dispatchItems)});
  if (method === 'GET' && route === '/workflow-timeline') {
    const timeline = profitWorkflowTimeline(state.workflowEvents);
    return json({ok:true, workflow_timeline:timeline.summary, workflow_events:timeline.timeline});
  }
  if (method === 'GET' && route === '/splits') return json({ok:true, splits:state.splits});
  if (method === 'POST' && route === '/splits') {
    const body = await readJson(request);
    const splits = {...profitDefaultSplits(), ...(body.splits && typeof body.splits === 'object' ? body.splits : body)};
    state = await profitWriteState(kv, {...state, splits, workflowEvents:profitPushEvent(state, {type:'profit_splits_updated', category:'split', detail:'Updated SkyeProfitConsole split allocation.', status:'updated'})});
    return json({ok:true, splits:state.splits, workflow_timeline:profitWorkflowTimeline(state.workflowEvents).summary});
  }
  if (method === 'GET' && route === '/proof') {
    const timeline = profitWorkflowTimeline(state.workflowEvents);
    return json({ok:true, proof_events:timeline.timeline, workflow_timeline:timeline.summary});
  }
  if (method === 'POST' && route === '/proof') {
    const body = await readJson(request);
    state = await profitWriteState(kv, {...state, workflowEvents:profitPushEvent(state, {type:body.type || 'profit_proof_recorded', category:body.category || 'proof', detail:body.detail || body.message || 'SkyeProfitConsole proof event recorded.', owner:body.owner, target:body.target, status:body.status, checkpoint:body.checkpoint})});
    const timeline = profitWorkflowTimeline(state.workflowEvents);
    return json({ok:true, proof_event:timeline.timeline[0], workflow_timeline:timeline.summary});
  }
  if (method === 'GET' && (route === '/exports' || route === '/export')) return json(profitExportState(state, env));
  if (method === 'GET' && route === '/audit') return json(profitAudit(state, env));
  return json({ok:false, error:'skyeprofitconsole_route_not_found', path:route, manifest:'/api/0s/route-manifest'}, 404);
}

const HOUSEOPS_STATE_KEY = 'houseoperations:v1:runtime-state';
const HOUSEOPS_FLOW = Object.freeze(['open', 'queued', 'review', 'done']);
const HOUSEOPS_ROUTE_FAMILIES = Object.freeze([
  'GET /api/houseops/health',
  'GET /api/houseops/status',
  'GET|POST /api/houseops/tasks',
  'POST /api/houseops/tasks/:taskId/advance',
  'GET|POST /api/houseops/vendors',
  'POST /api/houseops/vendors/:vendorId/advance',
  'GET|POST /api/houseops/schedule',
  'GET|POST /api/houseops/alerts',
  'POST /api/houseops/alerts/:alertId/resolve',
  'GET|POST /api/houseops/assignments',
  'GET|POST /api/houseops/proof',
  'GET|POST /api/houseops/gate-packets',
  'GET /api/houseops/queue',
  'GET /api/houseops/handoff-packs',
  'GET /api/houseops/review-board',
  'GET /api/houseops/execution-board',
  'GET /api/houseops/dispatch-board',
  'GET /api/houseops/v1/runtime-summary',
  'GET /api/houseops/v1/sessions',
  'GET /api/houseops/exports',
  'GET /api/houseops/audit'
]);
function houseopsStorageMode(env) {
  if (env.HOUSEOPS_KV) return 'houseops_kv';
  if (env.HOUSE_OPERATIONS_KV) return 'house_operations_kv';
  if (env.SITE_EVENTS_KV) return 'site_events_kv';
  return 'missing';
}
function houseopsKv(env) {
  return env.HOUSEOPS_KV || env.HOUSE_OPERATIONS_KV || env.SITE_EVENTS_KV || null;
}
function houseopsNow() {
  return new Date().toISOString();
}
function houseopsId(prefix = 'house') {
  const random = crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 18) : `${Date.now()}${Math.random()}`.replace(/\D/g, '').slice(0, 18);
  return `${prefix}_${random}`;
}
function houseopsText(value, max = 800) {
  return String(value == null ? '' : value).trim().slice(0, max);
}
function houseopsNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}
function houseopsStatus(value, fallback = 'open') {
  const status = houseopsText(value, 60).toLowerCase();
  return status || fallback;
}
function houseopsNormalizeTask(task = {}) {
  return {
    id: houseopsText(task.id, 120) || houseopsId('task'),
    title: houseopsText(task.title || task.name, 180) || 'New house task',
    owner: houseopsText(task.owner, 120) || 'House Desk',
    due: houseopsText(task.due, 120) || 'Today',
    priority: houseopsText(task.priority, 40) || 'medium',
    status: houseopsStatus(task.status, 'open'),
    lane: houseopsText(task.lane, 80) || 'owner',
    note: houseopsText(task.note || task.notes, 1000),
    createdAt: houseopsText(task.createdAt, 80) || houseopsNow(),
    updatedAt: houseopsText(task.updatedAt, 80) || houseopsNow()
  };
}
function houseopsNormalizeVendor(vendor = {}) {
  return {
    id: houseopsText(vendor.id, 120) || houseopsId('vendor'),
    name: houseopsText(vendor.name || vendor.vendor, 180) || 'New Vendor',
    request: houseopsText(vendor.request || vendor.scope, 220) || 'New request',
    value: houseopsNumber(vendor.value || vendor.value_usd || vendor.valueUsd, 0),
    status: houseopsStatus(vendor.status, 'open'),
    contact: houseopsText(vendor.contact || vendor.email, 180),
    createdAt: houseopsText(vendor.createdAt, 80) || houseopsNow(),
    updatedAt: houseopsText(vendor.updatedAt, 80) || houseopsNow()
  };
}
function houseopsNormalizeSchedule(event = {}) {
  return {
    id: houseopsText(event.id, 120) || houseopsId('schedule'),
    time: houseopsText(event.time || event.start, 120) || 'Today',
    title: houseopsText(event.title || event.name, 180) || 'House operations window',
    lane: houseopsText(event.lane, 80) || 'command',
    status: houseopsStatus(event.status, 'open'),
    owner: houseopsText(event.owner, 120),
    note: houseopsText(event.note || event.notes, 1000),
    createdAt: houseopsText(event.createdAt, 80) || houseopsNow(),
    updatedAt: houseopsText(event.updatedAt, 80) || houseopsNow()
  };
}
function houseopsNormalizeAssignment(assignment = {}) {
  return {
    id: houseopsText(assignment.id, 120) || houseopsId('assignment'),
    team: houseopsText(assignment.team || assignment.name, 180) || 'House Desk',
    owner: houseopsText(assignment.owner, 120) || 'Operator',
    lane: houseopsText(assignment.lane, 80) || 'tasks',
    load: houseopsNumber(assignment.load, 0),
    status: houseopsStatus(assignment.status, 'green'),
    note: houseopsText(assignment.note || assignment.notes, 1000),
    createdAt: houseopsText(assignment.createdAt, 80) || houseopsNow(),
    updatedAt: houseopsText(assignment.updatedAt, 80) || houseopsNow()
  };
}
function houseopsNormalizeAlert(alert = {}) {
  return {
    id: houseopsText(alert.id, 120) || houseopsId('alert'),
    title: houseopsText(alert.title || alert.name, 180) || 'Owner alert',
    owner: houseopsText(alert.owner, 120) || 'Owner',
    due: houseopsText(alert.due, 120) || 'Now',
    priority: houseopsText(alert.priority, 40) || 'high',
    status: houseopsStatus(alert.status, 'open'),
    sourceTaskId: houseopsText(alert.sourceTaskId || alert.taskId, 120),
    note: houseopsText(alert.note || alert.notes, 1000),
    resolvedAt: houseopsText(alert.resolvedAt, 80),
    createdAt: houseopsText(alert.createdAt, 80) || houseopsNow(),
    updatedAt: houseopsText(alert.updatedAt, 80) || houseopsNow()
  };
}
function houseopsNormalizeProof(proof = {}) {
  return {
    id: houseopsText(proof.id, 120) || houseopsId('proof'),
    title: houseopsText(proof.title || proof.name, 180) || 'HouseOperations proof snapshot',
    status: houseopsStatus(proof.status, 'pass'),
    at: houseopsText(proof.at || proof.createdAt, 120) || houseopsNow(),
    note: houseopsText(proof.note || proof.notes || proof.detail, 1000),
    createdAt: houseopsText(proof.createdAt, 80) || houseopsNow()
  };
}
function houseopsNormalizeGatePacket(packet = {}) {
  return {
    id: houseopsText(packet.id, 120) || houseopsId('gate'),
    created_at: houseopsText(packet.created_at || packet.createdAt, 80) || houseopsNow(),
    app_id: houseopsText(packet.app_id || packet.appId, 120) || 'metraiyux-houseoperations',
    source_app: houseopsText(packet.source_app || packet.sourceApp, 120) || 'metraiyux-0s',
    lane: houseopsText(packet.lane, 80) || 'houseoperations',
    billable: Boolean(packet.billable),
    privileged: packet.privileged !== false,
    stats: packet.stats && typeof packet.stats === 'object' ? packet.stats : {},
    task_count: houseopsNumber(packet.task_count || packet.taskCount, 0),
    vendor_count: houseopsNumber(packet.vendor_count || packet.vendorCount, 0),
    proof_count: houseopsNumber(packet.proof_count || packet.proofCount, 0)
  };
}
function houseopsNormalizeActivity(event = {}) {
  return {
    id: houseopsText(event.id, 120) || houseopsId('activity'),
    at: houseopsText(event.at, 120) || houseopsNow(),
    actor: houseopsText(event.actor, 120) || 'HouseOperations',
    action: houseopsText(event.action || event.detail, 500) || 'runtime event',
    lane: houseopsText(event.lane, 80) || 'command',
    createdAt: houseopsText(event.createdAt, 80) || houseopsNow()
  };
}
function houseopsDefaultState() {
  return {
    tasks: [],
    vendors: [],
    schedule: [],
    assignments: [],
    alerts: [],
    proofs: [],
    gatePackets: [],
    billingIntents: [],
    activity: [],
    updatedAt: null
  };
}
function houseopsNormalizeState(state = {}) {
  const base = state && typeof state === 'object' ? state : {};
  return {
    tasks: Array.isArray(base.tasks) ? base.tasks.map(houseopsNormalizeTask) : [],
    vendors: Array.isArray(base.vendors) ? base.vendors.map(houseopsNormalizeVendor) : [],
    schedule: Array.isArray(base.schedule) ? base.schedule.map(houseopsNormalizeSchedule) : [],
    assignments: Array.isArray(base.assignments) ? base.assignments.map(houseopsNormalizeAssignment) : [],
    alerts: Array.isArray(base.alerts) ? base.alerts.map(houseopsNormalizeAlert) : [],
    proofs: Array.isArray(base.proofs) ? base.proofs.map(houseopsNormalizeProof) : [],
    gatePackets: Array.isArray(base.gatePackets) ? base.gatePackets.map(houseopsNormalizeGatePacket) : [],
    billingIntents: Array.isArray(base.billingIntents) ? base.billingIntents.slice(0, 80) : [],
    activity: Array.isArray(base.activity) ? base.activity.map(houseopsNormalizeActivity).slice(0, 160) : [],
    updatedAt: houseopsText(base.updatedAt, 80) || null
  };
}
async function houseopsReadState(kv) {
  const stored = await kv.get(HOUSEOPS_STATE_KEY, {type: 'json'}).catch(() => null);
  return houseopsNormalizeState(stored || houseopsDefaultState());
}
async function houseopsWriteState(kv, state) {
  const next = houseopsNormalizeState({...state, updatedAt: houseopsNow()});
  await kv.put(HOUSEOPS_STATE_KEY, JSON.stringify(next));
  return next;
}
function houseopsPushActivity(state, event = {}) {
  return [houseopsNormalizeActivity({...event, createdAt: houseopsNow()}), ...(state.activity || [])].slice(0, 160);
}
function houseopsHas(board, status) {
  return Object.prototype.hasOwnProperty.call(board, status);
}
function houseopsBoard(items = [], statuses = ['open', 'queued', 'review', 'done', 'blocked', 'resolved', 'green', 'watch']) {
  const board = {total: items.length};
  for (const status of statuses) board[status] = 0;
  board.other = 0;
  for (const item of items) {
    const status = houseopsStatus(item.status, 'other');
    if (houseopsHas(board, status)) board[status] += 1;
    else board.other += 1;
  }
  return board;
}
function houseopsAlertItems(state) {
  const taskAlerts = state.tasks
    .filter(task => task.status === 'blocked' || task.status === 'review' || task.priority === 'high')
    .map(task => houseopsNormalizeAlert({
      id: task.id,
      title: task.title,
      owner: task.owner,
      due: task.due,
      priority: task.priority,
      status: task.status === 'done' ? 'resolved' : task.status,
      sourceTaskId: task.id,
      note: task.note,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }));
  const explicit = state.alerts || [];
  const seen = new Set(explicit.map(alert => alert.id));
  return [...explicit, ...taskAlerts.filter(alert => !seen.has(alert.id))];
}
function houseopsRuntimeStatus(state, env) {
  const alerts = houseopsAlertItems(state);
  return {
    ok: true,
    mode: '0s-worker-kv-runtime',
    runtime_api_base: '/api/houseops',
    storage_mode: houseopsStorageMode(env),
    task_count: state.tasks.length,
    vendor_count: state.vendors.length,
    schedule_count: state.schedule.length,
    assignment_count: state.assignments.length,
    alert_count: alerts.length,
    proof_count: state.proofs.length,
    gate_packet_count: state.gatePackets.length,
    task_board: houseopsBoard(state.tasks),
    vendor_board: houseopsBoard(state.vendors),
    schedule_board: houseopsBoard(state.schedule),
    assignment_board: houseopsBoard(state.assignments),
    alert_board: houseopsBoard(alerts, ['open', 'queued', 'review', 'blocked', 'resolved', 'done']),
    updated_at: state.updatedAt
  };
}
function houseopsStats(state) {
  const alerts = houseopsAlertItems(state);
  return {
    open_work: state.tasks.filter(task => task.status !== 'done').length,
    blocked_work: state.tasks.filter(task => task.status === 'blocked').length,
    owner_alerts: alerts.filter(alert => alert.status !== 'resolved' && alert.status !== 'done').length,
    vendor_value: state.vendors.reduce((sum, vendor) => sum + Number(vendor.value || 0), 0),
    proof_count: state.proofs.length
  };
}
function houseopsExportState(state, env) {
  return {
    ok: true,
    app: 'HouseOperations',
    exported_at: houseopsNow(),
    storage_mode: houseopsStorageMode(env),
    status: houseopsRuntimeStatus(state, env),
    state,
    audit: houseopsAudit(state, env)
  };
}
function houseopsAudit(state, env) {
  return {
    ok: true,
    app: 'HouseOperations',
    checked_at: houseopsNow(),
    storage_mode: houseopsStorageMode(env),
    gates: [
      'operator_auth_required_for_runtime_actions',
      'worker_kv_storage_required_for_cloud_mode',
      'private_houseoperations_source_blocked',
      'legacy_static_runtime_paths_preserved_as_compatibility_links'
    ],
    routes: HOUSEOPS_ROUTE_FAMILIES,
    counts: {
      tasks: state.tasks.length,
      vendors: state.vendors.length,
      schedule: state.schedule.length,
      alerts: houseopsAlertItems(state).length,
      assignments: state.assignments.length,
      proofs: state.proofs.length,
      gate_packets: state.gatePackets.length
    },
    ready: Boolean(state.tasks.length || state.vendors.length || state.proofs.length || state.gatePackets.length)
  };
}
function houseopsHealth(env) {
  return {
    ...appHealth(APP_API_MOUNTS.find(mount => mount.id === 'houseops'), env),
    ok: true,
    mounted: true,
    storage_mode: houseopsStorageMode(env),
    runtime_api_base: '/api/houseops',
    route_families: HOUSEOPS_ROUTE_FAMILIES
  };
}
function houseopsRoute(pathname, matchedBase = '/api/houseops') {
  const suffix = pathname === matchedBase ? '/' : pathname.slice(matchedBase.length);
  return (suffix || '/').replace(/\/+$/, '') || '/';
}
function houseopsSort(items, field = 'createdAt') {
  return [...items].sort((a, b) => String(b[field] || b.updatedAt || '').localeCompare(String(a[field] || a.updatedAt || '')));
}
function houseopsAdvanceStatus(status) {
  const current = HOUSEOPS_FLOW.indexOf(houseopsStatus(status, 'open'));
  return HOUSEOPS_FLOW[Math.min(Math.max(0, current) + 1, HOUSEOPS_FLOW.length - 1)] || 'queued';
}
async function houseopsHandleRoute(request, env, url, matchedBase = '/api/houseops') {
  if (request.method === 'OPTIONS') return json({ok: true});
  const method = request.method.toUpperCase();
  const route = houseopsRoute(url.pathname, matchedBase);
  if (route === '/' || route === '/health') return json(houseopsHealth(env), 200);

  const kv = houseopsKv(env);
  if (!kv) {
    return json({ok: false, error: 'HouseOperations cloud runtime storage is not configured.', storage_mode: houseopsStorageMode(env)}, 503);
  }
  const auth = await requireOperatorAuth(request, env, 'HouseOperations runtime');
  if (!auth.ok) return auth.response;
  let state = await houseopsReadState(kv);

  if (method === 'GET' && (route === '/status' || route === '/v1/runtime-summary')) return json(houseopsRuntimeStatus(state, env));
  if (method === 'GET' && route === '/tasks') return json({ok: true, task_board: houseopsBoard(state.tasks), tasks: houseopsSort(state.tasks)});
  if (method === 'POST' && route === '/tasks') {
    const body = await readJson(request);
    const task = houseopsNormalizeTask(body);
    state = await houseopsWriteState(kv, {
      ...state,
      tasks: [task, ...state.tasks],
      activity: houseopsPushActivity(state, {actor: task.owner, action: `created task: ${task.title}`, lane: task.lane})
    });
    return json({ok: true, task, task_board: houseopsBoard(state.tasks)});
  }
  const taskAdvance = route.match(/^\/tasks\/([^/]+)\/advance$/);
  if (taskAdvance && method === 'POST') {
    const id = decodeURIComponent(taskAdvance[1]);
    let updated = null;
    const tasks = state.tasks.map(task => {
      if (task.id !== id) return task;
      updated = houseopsNormalizeTask({...task, status: houseopsAdvanceStatus(task.status), updatedAt: houseopsNow()});
      return updated;
    });
    if (!updated) return json({ok: false, error: 'task_not_found'}, 404);
    state = await houseopsWriteState(kv, {
      ...state,
      tasks,
      activity: houseopsPushActivity(state, {actor: updated.owner, action: `advanced task ${updated.title} to ${updated.status}`, lane: updated.lane})
    });
    return json({ok: true, task: updated, task_board: houseopsBoard(state.tasks)});
  }

  if (method === 'GET' && route === '/vendors') return json({ok: true, vendor_board: houseopsBoard(state.vendors), vendors: houseopsSort(state.vendors)});
  if (method === 'POST' && route === '/vendors') {
    const body = await readJson(request);
    const vendor = houseopsNormalizeVendor(body);
    state = await houseopsWriteState(kv, {
      ...state,
      vendors: [vendor, ...state.vendors],
      activity: houseopsPushActivity(state, {actor: 'Vendor Desk', action: `created vendor: ${vendor.name}`, lane: 'vendor'})
    });
    return json({ok: true, vendor, vendor_board: houseopsBoard(state.vendors)});
  }
  const vendorAdvance = route.match(/^\/vendors\/([^/]+)\/advance$/);
  if (vendorAdvance && method === 'POST') {
    const id = decodeURIComponent(vendorAdvance[1]);
    let updated = null;
    const vendors = state.vendors.map(vendor => {
      if (vendor.id !== id) return vendor;
      updated = houseopsNormalizeVendor({...vendor, status: houseopsAdvanceStatus(vendor.status), updatedAt: houseopsNow()});
      return updated;
    });
    if (!updated) return json({ok: false, error: 'vendor_not_found'}, 404);
    state = await houseopsWriteState(kv, {
      ...state,
      vendors,
      activity: houseopsPushActivity(state, {actor: 'Vendor Desk', action: `advanced vendor ${updated.name} to ${updated.status}`, lane: 'vendor'})
    });
    return json({ok: true, vendor: updated, vendor_board: houseopsBoard(state.vendors)});
  }

  if (method === 'GET' && route === '/schedule') return json({ok: true, schedule_board: houseopsBoard(state.schedule), schedule: houseopsSort(state.schedule)});
  if (method === 'POST' && route === '/schedule') {
    const body = await readJson(request);
    const event = houseopsNormalizeSchedule(body);
    state = await houseopsWriteState(kv, {
      ...state,
      schedule: [event, ...state.schedule],
      activity: houseopsPushActivity(state, {actor: event.owner || 'Schedule Desk', action: `created schedule window: ${event.title}`, lane: event.lane})
    });
    return json({ok: true, event, schedule_board: houseopsBoard(state.schedule)});
  }

  if (method === 'GET' && route === '/alerts') {
    const alerts = houseopsAlertItems(state);
    return json({ok: true, alert_board: houseopsBoard(alerts, ['open', 'queued', 'review', 'blocked', 'resolved', 'done']), alerts: houseopsSort(alerts)});
  }
  if (method === 'POST' && route === '/alerts') {
    const body = await readJson(request);
    const alert = houseopsNormalizeAlert(body);
    state = await houseopsWriteState(kv, {
      ...state,
      alerts: [alert, ...state.alerts],
      activity: houseopsPushActivity(state, {actor: alert.owner, action: `created owner alert: ${alert.title}`, lane: 'owner'})
    });
    return json({ok: true, alert, alert_board: houseopsBoard(houseopsAlertItems(state), ['open', 'queued', 'review', 'blocked', 'resolved', 'done'])});
  }
  const alertResolve = route.match(/^\/alerts\/([^/]+)\/resolve$/);
  if (alertResolve && method === 'POST') {
    const id = decodeURIComponent(alertResolve[1]);
    let resolved = null;
    const alerts = state.alerts.map(alert => {
      if (alert.id !== id) return alert;
      resolved = houseopsNormalizeAlert({...alert, status: 'resolved', resolvedAt: houseopsNow(), updatedAt: houseopsNow()});
      return resolved;
    });
    const tasks = state.tasks.map(task => {
      if (task.id !== id && task.id !== resolved?.sourceTaskId) return task;
      resolved = resolved || houseopsNormalizeAlert({id: task.id, title: task.title, owner: task.owner, sourceTaskId: task.id, status: 'resolved', resolvedAt: houseopsNow(), note: task.note});
      return houseopsNormalizeTask({...task, status: 'done', priority: task.priority === 'high' ? 'medium' : task.priority, updatedAt: houseopsNow()});
    });
    if (!resolved) return json({ok: false, error: 'alert_not_found'}, 404);
    state = await houseopsWriteState(kv, {
      ...state,
      alerts,
      tasks,
      activity: houseopsPushActivity(state, {actor: resolved.owner, action: `resolved owner alert: ${resolved.title}`, lane: 'owner'})
    });
    return json({ok: true, alert: resolved, alert_board: houseopsBoard(houseopsAlertItems(state), ['open', 'queued', 'review', 'blocked', 'resolved', 'done'])});
  }

  if (method === 'GET' && route === '/assignments') return json({ok: true, assignment_board: houseopsBoard(state.assignments), assignments: houseopsSort(state.assignments)});
  if (method === 'POST' && route === '/assignments') {
    const body = await readJson(request);
    const assignment = houseopsNormalizeAssignment(body);
    state = await houseopsWriteState(kv, {
      ...state,
      assignments: [assignment, ...state.assignments],
      activity: houseopsPushActivity(state, {actor: assignment.owner, action: `created assignment: ${assignment.team}`, lane: assignment.lane})
    });
    return json({ok: true, assignment, assignment_board: houseopsBoard(state.assignments)});
  }

  if (method === 'GET' && route === '/proof') return json({ok: true, proofs: houseopsSort(state.proofs, 'createdAt'), proof_count: state.proofs.length});
  if (method === 'POST' && route === '/proof') {
    const body = await readJson(request);
    const proof = houseopsNormalizeProof(body);
    state = await houseopsWriteState(kv, {
      ...state,
      proofs: [proof, ...state.proofs],
      activity: houseopsPushActivity(state, {actor: 'Proof Desk', action: `saved proof: ${proof.title}`, lane: 'proof'})
    });
    return json({ok: true, proof, proof_count: state.proofs.length});
  }

  if (method === 'GET' && (route === '/gate-packets' || route === '/handoff-packs')) {
    return json({ok: true, gate_packets: houseopsSort(state.gatePackets, 'created_at'), handoff_packs: houseopsSort(state.gatePackets, 'created_at')});
  }
  if (method === 'POST' && (route === '/gate-packets' || route === '/handoff-packs')) {
    const body = await readJson(request);
    const packet = houseopsNormalizeGatePacket({
      ...body,
      stats: body.stats || houseopsStats(state),
      task_count: body.task_count ?? state.tasks.length,
      vendor_count: body.vendor_count ?? state.vendors.length,
      proof_count: body.proof_count ?? state.proofs.length
    });
    state = await houseopsWriteState(kv, {
      ...state,
      gatePackets: [packet, ...state.gatePackets],
      activity: houseopsPushActivity(state, {actor: 'SkyeGate Bridge', action: `queued mirror packet ${packet.id}`, lane: 'gate'})
    });
    return json({ok: true, gate_packet: packet, gate_packet_count: state.gatePackets.length});
  }

  if (method === 'GET' && route === '/queue') {
    return json({
      ok: true,
      tasks: state.tasks.filter(item => item.status !== 'done'),
      vendors: state.vendors.filter(item => item.status !== 'done'),
      schedule: state.schedule.filter(item => item.status !== 'done')
    });
  }
  if (method === 'GET' && route === '/review-board') {
    return json({
      ok: true,
      review_board: {
        tasks: state.tasks.filter(item => item.status === 'review' || item.status === 'blocked' || item.priority === 'high'),
        vendors: state.vendors.filter(item => item.status === 'review'),
        alerts: houseopsAlertItems(state)
      }
    });
  }
  if (method === 'GET' && route === '/execution-board') {
    return json({
      ok: true,
      execution_board: {
        tasks: state.tasks.filter(item => ['open', 'queued'].includes(item.status)),
        schedule: state.schedule.filter(item => item.status !== 'done'),
        assignments: state.assignments
      }
    });
  }
  if (method === 'GET' && route === '/dispatch-board') {
    return json({
      ok: true,
      dispatch_board: {
        assignments: state.assignments,
        schedule: state.schedule,
        gate_packets: state.gatePackets
      }
    });
  }
  if (method === 'GET' && route === '/v1/sessions') {
    return json({ok: true, sessions: [{id: 'houseops-worker-runtime', actor: auth.actor, via: auth.via, storage_mode: houseopsStorageMode(env), active: true, checked_at: houseopsNow()}]});
  }
  if (method === 'GET' && (route === '/exports' || route === '/export')) return json(houseopsExportState(state, env));
  if (method === 'GET' && route === '/audit') return json(houseopsAudit(state, env));

  return json({ok: false, error: 'houseoperations_route_not_found', path: route, manifest: '/api/0s/route-manifest'}, 404);
}

const KAI_BASE = '/api/kaixu-codestudio';
const KAI_KEY_PREFIX = 'kaixu-codestudio:v1:';
const KAI_PROVIDER_PACKS = Object.freeze([
  {id:'stripe', title:'Stripe Payments', lane:'payments', requiredSecrets:['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET'], routes:['checkout.create','invoice.send','webhook.payment'], capabilities:['checkout','billing','payment-webhooks'], metering:{unit:'checkout_session', defaultCostCents:0}},
  {id:'resend', title:'Resend Email', lane:'email', requiredSecrets:['RESEND_API_KEY'], routes:['email.send','email.sequence','webhook.email'], capabilities:['transactional-email','sequence-email','delivery-webhooks'], metering:{unit:'email', defaultCostCents:0}},
  {id:'twilio', title:'Twilio Messaging', lane:'sms_voice', requiredSecrets:['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM'], routes:['sms.send','voice.call','webhook.message'], capabilities:['sms','voice','message-webhooks'], metering:{unit:'message_or_call', defaultCostCents:1}},
  {id:'cloudflare', title:'Cloudflare Platform', lane:'infra', requiredSecrets:['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN'], routes:['account.verify','d1.query'], capabilities:['r2','d1','queues','workers'], metering:{unit:'edge_operation', defaultCostCents:0}},
  {id:'neon', title:'Neon Postgres', lane:'database', requiredSecrets:['DATABASE_URL or NEON_SQL_HTTP_URL'], routes:['db.query'], capabilities:['postgres-query','migration','snapshot'], metering:{unit:'query', defaultCostCents:0}},
  {id:'netlify', title:'Netlify Deploy', lane:'deploy', requiredSecrets:['NETLIFY_AUTH_TOKEN','NETLIFY_SITE_ID','NETLIFY_BUILD_HOOK_URL optional'], routes:['site.status','deploy.trigger'], capabilities:['site-status','build-hooks','function-invoke'], metering:{unit:'deploy_operation', defaultCostCents:0}},
  {id:'openai_gateway', title:'Kaixu AI Gateway', lane:'ai', requiredSecrets:['KAIXU_GATEWAY_URL+KAIXU_GATEWAY_SUBKEY or OPENAI_API_KEY'], routes:['ai.chat','ai.summarize','ai.classify'], capabilities:['chat','summarize','classify'], metering:{unit:'ai_call', defaultCostCents:1}},
  {id:'google_ops', title:'Google Ops', lane:'docs_calendar', requiredSecrets:['GOOGLE_SERVICE_ACCOUNT_JSON'], routes:['drive.save','calendar.book'], capabilities:['drive-save','calendar-book','sheet-append'], metering:{unit:'ops_write', defaultCostCents:0}}
]);
const KAI_ROUTE_CONTRACT = Object.freeze([
  'GET /api/health',
  'GET /api/platform/status',
  'GET /api/platform/manifest',
  'GET /api/platform/openapi.json',
  'GET /api/platform/providers/probe',
  'GET /api/platform/provider-packs',
  'GET /api/platform/storage',
  'GET /api/platform/projects',
  'POST /api/platform/projects',
  'GET /api/platform/projects/:projectId/providers',
  'POST /api/platform/projects/:projectId/providers/:providerId',
  'POST /api/platform/projects/:projectId/providers/:providerId/rotate',
  'POST /api/platform/provider-packs/:providerId/actions/:route/run',
  'POST /api/platform/preflight',
  'POST /api/platform/workflows/:templateId/run',
  'GET /api/platform/runs',
  'GET /api/platform/webhooks',
  'GET /api/platform/webhooks/dispatch-rules',
  'POST /api/platform/webhooks/ingest',
  'POST /api/platform/webhooks/:eventId/replay',
  'GET /api/platform/approvals',
  'POST /api/platform/approvals/:approvalId/resolve',
  'GET /api/platform/jobs',
  'POST /api/platform/jobs',
  'POST /api/platform/jobs/drain',
  'GET /api/platform/dead-letters',
  'POST /api/platform/dead-letters/:id/retry',
  'GET /api/platform/schedules',
  'POST /api/platform/schedules',
  'POST /api/platform/schedules/tick',
  'GET /api/platform/meters',
  'GET /api/platform/provider-router',
  'POST /api/platform/provider-router/optimize',
  'GET /api/platform/invoices',
  'POST /api/platform/projects/:projectId/invoices/generate',
  'GET /api/platform/workflow-builder/graphs',
  'POST /api/platform/workflow-builder/graphs',
  'POST /api/platform/workflow-builder/graphs/:graphId/run',
  'GET /api/platform/audit',
  'POST /api/platform/audit',
  'GET /api/platform/incidents',
  'POST /api/platform/incidents',
  'POST /api/platform/incidents/:incidentId/resolve',
  'GET /api/platform/entitlements',
  'POST /api/platform/entitlements',
  'POST /api/platform/entitlements/check',
  'GET /api/platform/forms',
  'POST /api/platform/forms',
  'POST /api/platform/forms/:formId/submit',
  'GET /api/platform/records/:collection',
  'POST /api/platform/records/:collection',
  'GET /api/platform/scorecard',
  'POST /api/platform/smoke'
]);

function kaiKv(env) {
  return env.KAIXU_CODESTUDIO_KV || env.SITE_EVENTS_KV || null;
}
function kaiStorageMode(env) {
  return kaiKv(env) ? 'kv' : 'not_configured';
}
function kaiNow() {
  return new Date().toISOString();
}
function kaiId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function kaiKey(name) {
  return `${KAI_KEY_PREFIX}${name}`;
}
function kaiSlug(value) {
  return String(value || 'untitled-project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled-project';
}
function kaiDefaultState() {
  const now = kaiNow();
  return {
    schema:'kaixu-codestudio-0s-adapter-v1',
    createdAt:now,
    updatedAt:now,
    projects:[{id:'default', name:'Default Workspace', slug:'default', status:'active', ownerRef:'upstream:owner', budget:{monthlyCapCents:50000, hardStop:true}, createdAt:now, updatedAt:now}],
    providerInstalls:[],
    workflowRuns:[],
    webhookEvents:[],
    approvals:[],
    jobs:[],
    deadLetters:[],
    schedules:[],
    meterEvents:[],
    workflowGraphs:[],
    routeDecisions:[],
    invoices:[],
    bundles:[],
    imports:[],
    auditEvents:[],
    incidents:[],
    entitlements:[],
    records:{},
    forms:[],
    receipts:[]
  };
}
function kaiNormalizeState(raw) {
  const base = kaiDefaultState();
  const state = raw && typeof raw === 'object' ? {...base, ...raw} : base;
  for (const key of ['projects','providerInstalls','workflowRuns','webhookEvents','approvals','jobs','deadLetters','schedules','meterEvents','workflowGraphs','routeDecisions','invoices','bundles','imports','auditEvents','incidents','entitlements','forms','receipts']) {
    if (!Array.isArray(state[key])) state[key] = [];
  }
  if (!state.records || typeof state.records !== 'object' || Array.isArray(state.records)) state.records = {};
  if (!state.projects.find(project => project.id === 'default')) state.projects.unshift(base.projects[0]);
  return state;
}
async function kaiReadState(env) {
  const kv = kaiKv(env);
  if (!kv?.get) return kaiDefaultState();
  const stored = await kv.get(kaiKey('state'), {type:'json'}).catch(() => null);
  return kaiNormalizeState(stored);
}
async function kaiWriteState(env, state) {
  const kv = kaiKv(env);
  if (!kv?.put) return false;
  const next = kaiNormalizeState(state);
  next.updatedAt = kaiNow();
  await kv.put(kaiKey('state'), JSON.stringify(next));
  return true;
}
function kaiStorageRequired() {
  return json({
    ok:false,
    error:'kaixu_codestudio_storage_not_configured',
    storage_mode:'not_configured',
    message:'kAIxu CodeStudio platform mutations require KAIXU_CODESTUDIO_KV or SITE_EVENTS_KV. Public reads stay available as local/static proof.'
  }, 503);
}
function kaiProviderPack(id) {
  return KAI_PROVIDER_PACKS.find(pack => pack.id === id) || null;
}
function kaiStats(state) {
  const recordsCount = Object.values(state.records || {}).reduce((count, rows) => count + (Array.isArray(rows) ? rows.length : 0), 0);
  return {
    projects:state.projects.length,
    providerInstalls:state.providerInstalls.length,
    workflowRuns:state.workflowRuns.length,
    webhookEvents:state.webhookEvents.length,
    openApprovals:state.approvals.filter(item => item.status === 'open').length,
    jobs:state.jobs.length,
    queuedJobs:state.jobs.filter(item => item.status === 'queued_for_operator_review' || item.status === 'queued').length,
    deadLetters:state.deadLetters.length,
    schedules:state.schedules.length,
    meterEvents:state.meterEvents.length,
    workflowGraphs:state.workflowGraphs.length,
    routeDecisions:state.routeDecisions.length,
    invoices:state.invoices.length,
    bundles:state.bundles.length,
    imports:state.imports.length,
    auditEvents:state.auditEvents.length,
    openIncidents:state.incidents.filter(item => item.status !== 'resolved').length,
    entitlements:state.entitlements.length,
    forms:state.forms.length,
    records:recordsCount,
    receipts:state.receipts.length,
    updatedAt:state.updatedAt
  };
}
function kaiHealth(env) {
  const mount = APP_API_MOUNTS.find(item => item.id === 'kaixuCodestudio');
  return {
    ...appHealth(mount, env),
    ok:true,
    mounted:true,
    mode:appExternalConfigured(env, mount) ? 'dedicated_backend' : 'same_domain_adapter',
    provider_execution:'operator_gated_or_dedicated_backend_required',
    provider_packs:KAI_PROVIDER_PACKS.length,
    local_backend:'npm run platform:server',
    namespaced_routes:KAI_ROUTE_CONTRACT.map(route => route.replace('/api/platform', `${KAI_BASE}/platform`).replace('/api/health', `${KAI_BASE}/health`))
  };
}
function kaiProviderProbe() {
  return Object.fromEntries(KAI_PROVIDER_PACKS.map(pack => [pack.id, {
    ok:false,
    configured:false,
    lane:pack.lane,
    requiredSecrets:pack.requiredSecrets,
    mode:'same_domain_adapter',
    reason:'Provider secrets and paid/live actions are not executed by the public 0S adapter.'
  }]));
}
function kaiOpenApiDocument() {
  const paths = {};
  for (const signature of KAI_ROUTE_CONTRACT) {
    const [method, rawPath] = signature.split(' ');
    const path = rawPath.replace(/^\/api\/platform/, `${KAI_BASE}/platform`).replace(/^\/api\/health$/, `${KAI_BASE}/health`);
    if (!paths[path]) paths[path] = {};
    paths[path][method.toLowerCase()] = {
      operationId:`kaixu_${method.toLowerCase()}_${path.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '')}`,
      summary:`${method} ${path}`,
      responses:{'200':{description:'0S CodeStudio adapter response'}, '401':{description:'Operator auth required for mutations'}, '503':{description:'Storage/backend not configured'}}
    };
  }
  return {
    openapi:'3.1.0',
    info:{title:'kAIxu CodeStudio 0S Adapter', version:'0s-local-proof-1.0.0'},
    servers:[{url:KAI_BASE}],
    'x-root-api-policy':'Root /api/platform/* is blocked on the full-system Worker; use /api/kaixu-codestudio/platform/*.',
    paths
  };
}
function kaiLimit(url, fallback = 100) {
  const raw = Number(url.searchParams.get('limit') || fallback);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.min(500, raw);
}
function kaiProjectRows(rows, url) {
  const projectId = url.searchParams.get('projectId');
  return (Array.isArray(rows) ? rows : []).filter(row => !projectId || row.projectId === projectId).slice(0, kaiLimit(url));
}
function kaiReceipt(type, meta = {}, actor = 'operator') {
  return {id:kaiId('kai_receipt'), type, actor, status:meta.status || 'queued_for_operator_review', createdAt:kaiNow(), ...meta};
}
function kaiUpsert(rows, item) {
  const list = Array.isArray(rows) ? rows : [];
  const index = list.findIndex(row => row.id === item.id);
  if (index >= 0) list[index] = {...list[index], ...item};
  else list.unshift(item);
  return list;
}
async function kaiSaveWithReceipt(env, state, receipt) {
  state.receipts = [receipt, ...(state.receipts || [])].slice(0, 200);
  await kaiWriteState(env, state);
  return receipt;
}
function kaiChooseProviderForIntent(intent = '') {
  const text = String(intent || '').toLowerCase();
  if (/pay|checkout|invoice|billing/.test(text)) return kaiProviderPack('stripe');
  if (/email|mail|lead|sequence/.test(text)) return kaiProviderPack('resend');
  if (/sms|voice|call/.test(text)) return kaiProviderPack('twilio');
  if (/db|sql|postgres|record/.test(text)) return kaiProviderPack('neon');
  if (/deploy|site|build/.test(text)) return kaiProviderPack('netlify');
  if (/worker|d1|r2|queue|cloudflare/.test(text)) return kaiProviderPack('cloudflare');
  if (/drive|calendar|sheet|doc/.test(text)) return kaiProviderPack('google_ops');
  return kaiProviderPack('openai_gateway');
}
function kaiMeterSummary(events, projectId = null) {
  const filtered = (Array.isArray(events) ? events : []).filter(event => !projectId || event.projectId === projectId);
  const byProvider = {};
  for (const event of filtered) byProvider[event.providerId || event.provider || 'unknown'] = (byProvider[event.providerId || event.provider || 'unknown'] || 0) + 1;
  return {projectId, totalEvents:filtered.length, byProvider};
}
async function kaiHandleCodeStudioGet(env, url, path) {
  if (path === '/' || path === '/health' || path === '/platform/status') return json(kaiHealth(env));
  if (path === '/platform/openapi.json') return json(kaiOpenApiDocument());
  if (path === '/platform/providers/probe') return json({ok:true, mode:'same_domain_adapter', providers:kaiProviderProbe()});
  if (path === '/platform/provider-packs') return json({ok:true, mode:'same_domain_catalog', packs:KAI_PROVIDER_PACKS});
  if (path === '/platform/manifest') return json({ok:true, manifest:{schema:'kaixu-platform-executable-v2', adapter:'0s-same-domain-control-plane', routeBase:`${KAI_BASE}/platform`, localBackend:'server/http-server.mjs', routes:KAI_ROUTE_CONTRACT.map(route => route.replace('/api/platform', `${KAI_BASE}/platform`).replace('/api/health', `${KAI_BASE}/health`)), providerPacks:KAI_PROVIDER_PACKS.map(pack => pack.id)}});
  const state = await kaiReadState(env);
  if (path === '/platform/storage') return json({ok:true, active:kaiKv(env) ? {id:'kv', mode:'worker-kv'} : null, available:[{id:'kv', configured:Boolean(kaiKv(env))}, {id:'dedicated_backend', configured:false}], stats:kaiStats(state), storage_mode:kaiStorageMode(env)});
  if (path === '/platform/projects') return json({ok:true, projects:state.projects.slice(0, kaiLimit(url)), store:kaiStats(state), storage_mode:kaiStorageMode(env)});
  const projectProviderList = path.match(/^\/platform\/projects\/([^/]+)\/providers$/);
  if (projectProviderList) {
    const projectId = decodeURIComponent(projectProviderList[1]);
    return json({ok:true, projectId, installs:state.providerInstalls.filter(item => item.projectId === projectId)});
  }
  if (path === '/platform/runs') return json({ok:true, runs:kaiProjectRows(state.workflowRuns, url)});
  if (path === '/platform/webhooks') return json({ok:true, events:kaiProjectRows(state.webhookEvents, url)});
  if (path === '/platform/webhooks/dispatch-rules') return json({ok:true, rules:[{id:'0s-adapter-review', provider:'*', type:'*', mode:'queued_for_operator_review', workflowId:null}]});
  if (path === '/platform/approvals') return json({ok:true, approvals:kaiProjectRows(state.approvals, url)});
  if (path === '/platform/jobs') return json({ok:true, jobs:kaiProjectRows(state.jobs, url)});
  if (path === '/platform/dead-letters') return json({ok:true, deadLetters:kaiProjectRows(state.deadLetters, url)});
  if (path === '/platform/schedules') return json({ok:true, schedules:kaiProjectRows(state.schedules, url)});
  if (path === '/platform/meters') {
    const events = kaiProjectRows(state.meterEvents, url);
    return json({ok:true, summary:kaiMeterSummary(events, url.searchParams.get('projectId')), events});
  }
  if (path === '/platform/bundles') return json({ok:true, bundles:kaiProjectRows(state.bundles, url), imports:kaiProjectRows(state.imports, url)});
  if (path === '/platform/provider-router') return json({ok:true, decisions:kaiProjectRows(state.routeDecisions, url)});
  if (path === '/platform/invoices') return json({ok:true, invoices:kaiProjectRows(state.invoices, url)});
  if (path === '/platform/workflow-builder/graphs') return json({ok:true, graphs:kaiProjectRows(state.workflowGraphs, url)});
  if (path === '/platform/audit') return json({ok:true, events:kaiProjectRows(state.auditEvents, url)});
  if (path === '/platform/incidents') return json({ok:true, incidents:kaiProjectRows(state.incidents, url)});
  if (path === '/platform/entitlements') return json({ok:true, entitlements:kaiProjectRows(state.entitlements, url)});
  if (path === '/platform/forms') return json({ok:true, forms:kaiProjectRows(state.forms, url)});
  const recordsMatch = path.match(/^\/platform\/records\/([^/]+)$/);
  if (recordsMatch) {
    const collection = decodeURIComponent(recordsMatch[1]);
    const records = Array.isArray(state.records[collection]) ? state.records[collection] : [];
    return json({ok:true, collection, records:kaiProjectRows(records, url)});
  }
  if (path === '/platform/scorecard') {
    const projectId = url.searchParams.get('projectId') || 'default';
    const installs = state.providerInstalls.filter(item => item.projectId === projectId && item.enabled !== false);
    return json({ok:true, projectId, mode:'same_domain_adapter', score:{providersInstalled:installs.length, storageConfigured:Boolean(kaiKv(env)), liveProviderSecrets:false}, checks:[
      {id:'namespaced_api', ok:true, label:`Using ${KAI_BASE}/platform`},
      {id:'operator_gate', ok:true, label:'Mutating and paid actions require operator auth'},
      {id:'live_provider_execution', ok:false, label:'Dedicated CodeStudio backend/service binding required for live provider execution'}
    ]});
  }
  if (path === '/platform/receipts') return json({ok:true, receipts:state.receipts.slice(0, kaiLimit(url))});
  return json({ok:false, error:'kaixu_codestudio_route_not_found', path, manifest:`${KAI_BASE}/platform/manifest`}, 404);
}
async function kaiQueuedExecutionResponse(env, state, path, body, auth, type = 'platform_operation_review') {
  const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt(type, {
    path,
    method:'POST',
    bodyPreview:body && typeof body === 'object' ? Object.keys(body).slice(0, 20) : [],
    status:'queued_for_operator_review',
    execution:false,
    reason:'The same-domain 0S adapter gates this operation. Attach KAIXU_CODESTUDIO_WORKER or run the local CodeStudio backend for execution receipts.'
  }, auth.actor));
  return json({ok:false, status:'queued_for_operator_review', executed:false, receipt, mode:'same_domain_adapter'}, 202);
}
async function kaiHandleCodeStudioMutation(request, env, url, path, auth) {
  if (!kaiKv(env)) return kaiStorageRequired();
  const state = await kaiReadState(env);
  const body = await readJson(request);
  const now = kaiNow();

  if (path === '/platform/projects') {
    const source = body.project && typeof body.project === 'object' ? body.project : body;
    const id = String(source.id || source.projectId || kaiId('proj')).trim();
    const existing = state.projects.find(project => project.id === id || project.slug === id);
    const project = {
      ...(existing || {}),
      id:existing?.id || id,
      name:String(source.name || source.title || existing?.name || 'Untitled Project').slice(0, 200),
      slug:String(source.slug || existing?.slug || kaiSlug(source.name || source.title || id)).slice(0, 200),
      status:String(source.status || existing?.status || 'active'),
      ownerRef:String(source.ownerRef || existing?.ownerRef || auth.actor || 'operator'),
      budget:source.budget || existing?.budget || {monthlyCapCents:50000, hardStop:true},
      createdAt:existing?.createdAt || now,
      updatedAt:now
    };
    state.projects = kaiUpsert(state.projects, project);
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('project_upsert', {projectId:project.id, status:'stored'}, auth.actor));
    return json({ok:true, project, receipt, store:kaiStats(state)});
  }

  const providerInstall = path.match(/^\/platform\/projects\/([^/]+)\/providers\/([^/]+)$/);
  const providerPackInstall = path.match(/^\/platform\/projects\/([^/]+)\/provider-packs\/([^/]+)\/install$/);
  if (providerInstall || providerPackInstall) {
    const projectId = decodeURIComponent((providerInstall || providerPackInstall)[1]);
    const providerId = decodeURIComponent((providerInstall || providerPackInstall)[2]);
    const pack = kaiProviderPack(providerId);
    const install = {
      id:`prov_${projectId}_${providerId}`,
      projectId,
      providerId,
      enabled:body.enabled !== false,
      secretRef:String(body.secretRef || `vault:${projectId}:${providerId}:primary`),
      routes:Array.isArray(body.routes) ? body.routes.map(String) : (pack?.routes || []),
      status:'installed_operator_review',
      createdAt:state.providerInstalls.find(item => item.id === `prov_${projectId}_${providerId}`)?.createdAt || now,
      updatedAt:now
    };
    state.providerInstalls = kaiUpsert(state.providerInstalls, install);
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('provider_install', {projectId, providerId, status:'stored'}, auth.actor));
    return json({ok:true, install, receipt});
  }

  const providerRotate = path.match(/^\/platform\/projects\/([^/]+)\/providers\/([^/]+)\/rotate$/);
  if (providerRotate) {
    const projectId = decodeURIComponent(providerRotate[1]);
    const providerId = decodeURIComponent(providerRotate[2]);
    const existing = state.providerInstalls.find(item => item.projectId === projectId && item.providerId === providerId);
    if (!existing) return json({ok:false, error:'provider_install_not_found', projectId, providerId}, 404);
    existing.secretRef = `vault:${projectId}:${providerId}:v${Date.now()}`;
    existing.lastRotatedAt = now;
    existing.updatedAt = now;
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('provider_secret_ref_rotate', {projectId, providerId, status:'stored'}, auth.actor));
    return json({ok:true, install:existing, receipt});
  }

  if (path === '/platform/storage/verify') {
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('storage_adapter_verified', {adapter:'kv', status:'stored'}, auth.actor));
    return json({ok:true, adapter:{id:'kv', mode:'worker-kv', verifiedAt:now}, receipt});
  }

  if (path === '/platform/jobs') {
    const job = {id:kaiId('job'), projectId:body.projectId || body.input?.projectId || 'default', workflowId:body.workflowId || body.templateId || 'manual_operation', input:body.input || {}, status:'queued_for_operator_review', runAt:body.runAt || now, priority:Number(body.priority || 50), createdAt:now, updatedAt:now};
    state.jobs.unshift(job);
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('job_queued_for_review', {projectId:job.projectId, jobId:job.id, workflowId:job.workflowId}, auth.actor));
    return json({ok:true, job, receipt});
  }

  if (path === '/platform/schedules') {
    const schedule = {id:body.id || kaiId('sched'), projectId:body.projectId || body.input?.projectId || 'default', workflowId:body.workflowId || body.templateId || 'manual_operation', input:body.input || {}, intervalMinutes:Number(body.intervalMinutes || 60), status:'queued_for_operator_review', nextRunAt:body.nextRunAt || now, label:body.label || 'Scheduled workflow', createdAt:now, updatedAt:now};
    state.schedules = kaiUpsert(state.schedules, schedule);
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('schedule_upsert', {projectId:schedule.projectId, scheduleId:schedule.id, workflowId:schedule.workflowId}, auth.actor));
    return json({ok:true, schedule, receipt});
  }

  const approvalResolve = path.match(/^\/platform\/approvals\/([^/]+)\/resolve$/);
  if (approvalResolve) {
    const approvalId = decodeURIComponent(approvalResolve[1]);
    let approval = state.approvals.find(item => item.id === approvalId);
    if (!approval) approval = {id:approvalId, projectId:body.projectId || 'default', createdAt:now};
    Object.assign(approval, {status:body.status || 'approved', note:body.note || '', resolvedAt:now, updatedAt:now, resolvedBy:auth.actor});
    state.approvals = kaiUpsert(state.approvals, approval);
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('approval_resolved', {approvalId, status:approval.status}, auth.actor));
    return json({ok:true, approval, receipt});
  }

  if (path === '/platform/provider-router/optimize') {
    const projectId = body.projectId || body.input?.projectId || 'default';
    const selected = kaiChooseProviderForIntent(body.intent || body.input?.intent || 'general');
    const decision = {id:kaiId('route'), projectId, intent:body.intent || 'general', selected:{providerId:selected?.id || null, route:selected?.routes?.[0] || null}, status:selected ? 'selected_for_operator_review' : 'no_route', createdAt:now};
    state.routeDecisions.unshift(decision);
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('provider_route_optimized', {projectId, decisionId:decision.id, providerId:selected?.id || null}, auth.actor));
    return json({ok:Boolean(selected), selected:decision.selected, decision, receipt});
  }

  const invoiceGenerate = path.match(/^\/platform\/projects\/([^/]+)\/invoices\/generate$/);
  if (invoiceGenerate) {
    const projectId = decodeURIComponent(invoiceGenerate[1]);
    const invoice = {id:kaiId('inv'), projectId, status:'draft_pending_operator_review', customer:body.customer || {}, period:body.period || {}, minimumLineCents:Number(body.minimumLineCents || 0), totalCents:Number(body.minimumLineCents || 0), createdAt:now, updatedAt:now};
    state.invoices.unshift(invoice);
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('invoice_generated_for_review', {projectId, invoiceId:invoice.id}, auth.actor));
    return json({ok:true, invoice, receipt});
  }

  const projectExport = path.match(/^\/platform\/projects\/([^/]+)\/export$/);
  if (projectExport) {
    const projectId = decodeURIComponent(projectExport[1]);
    const data = {
      project:state.projects.find(item => item.id === projectId || item.slug === projectId) || null,
      providerInstalls:state.providerInstalls.filter(item => item.projectId === projectId),
      workflowRuns:state.workflowRuns.filter(item => item.projectId === projectId)
    };
    const bundle = {id:kaiId('bundle'), projectId, status:'assembled_static_adapter', counts:{providerInstalls:data.providerInstalls.length, workflowRuns:data.workflowRuns.length}, createdAt:now};
    state.bundles.unshift(bundle);
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('project_export_bundle', {projectId, bundleId:bundle.id}, auth.actor));
    return json({ok:true, bundle, data, receipt});
  }

  if (path === '/platform/import') {
    const imported = {id:kaiId('import'), projectId:body.projectId || body.bundle?.project?.id || 'default', status:'import_pending_operator_review', counts:{projects:body.bundle?.project ? 1 : 0}, createdAt:now};
    state.imports.unshift(imported);
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('project_import_review', {projectId:imported.projectId, importId:imported.id}, auth.actor));
    return json({ok:true, import:imported, receipt});
  }

  if (path === '/platform/workflow-builder/graphs') {
    const projectId = body.projectId || body.input?.projectId || 'default';
    const graphInput = body.graph && typeof body.graph === 'object' ? body.graph : body;
    const graph = {...graphInput, id:graphInput.id || kaiId('graph'), projectId, status:'saved_for_operator_review', updatedAt:now, createdAt:graphInput.createdAt || now};
    state.workflowGraphs = kaiUpsert(state.workflowGraphs, graph);
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('workflow_graph_saved', {projectId, graphId:graph.id}, auth.actor));
    return json({ok:true, graph, compiledWorkflow:{id:graph.workflowId || graph.id, templateId:graph.templateId || 'visual_workflow', providerExecution:'dedicated_backend_required'}, receipt});
  }

  if (path === '/platform/incidents') {
    const incident = {id:kaiId('inc'), projectId:body.projectId || body.input?.projectId || 'default', title:body.title || 'Manual console incident', severity:body.severity || 'medium', source:body.source || 'console', status:'open', createdAt:now, updatedAt:now};
    state.incidents.unshift(incident);
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('incident_opened', {projectId:incident.projectId, incidentId:incident.id}, auth.actor));
    return json({ok:true, incident, receipt});
  }
  const incidentResolve = path.match(/^\/platform\/incidents\/([^/]+)\/resolve$/);
  if (incidentResolve) {
    const incidentId = decodeURIComponent(incidentResolve[1]);
    const incident = state.incidents.find(item => item.id === incidentId);
    if (!incident) return json({ok:false, error:'incident_not_found'}, 404);
    Object.assign(incident, {status:'resolved', resolutionNote:body.note || '', resolvedAt:now, updatedAt:now});
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('incident_resolved', {incidentId}, auth.actor));
    return json({ok:true, incident, receipt});
  }

  if (path === '/platform/entitlements') {
    const entitlement = {id:body.id || kaiId('ent'), projectId:body.projectId || body.input?.projectId || 'default', key:body.key || 'workflow_runs', enabled:body.enabled !== false, limit:Number(body.limit || 0), used:Number(body.used || 0), createdAt:body.createdAt || now, updatedAt:now};
    state.entitlements = kaiUpsert(state.entitlements, entitlement);
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('entitlement_upsert', {projectId:entitlement.projectId, entitlementId:entitlement.id}, auth.actor));
    return json({ok:true, entitlement, receipt});
  }
  if (path === '/platform/entitlements/check') {
    const projectId = body.projectId || body.input?.projectId || 'default';
    const key = body.key || 'workflow_runs';
    const entitlement = state.entitlements.find(item => item.projectId === projectId && item.key === key);
    const allowed = Boolean(entitlement && entitlement.enabled !== false && (!entitlement.limit || (entitlement.used + Number(body.quantity || 1)) <= entitlement.limit));
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('entitlement_checked', {projectId, key, allowed, status:'stored'}, auth.actor));
    return json({ok:allowed, allowed, entitlement:entitlement || null, receipt, reason:allowed ? null : 'entitlement_missing_or_exhausted'});
  }

  if (path === '/platform/forms') {
    const form = {id:body.id || kaiId('form'), projectId:body.projectId || body.input?.projectId || 'default', title:body.title || 'Client lead intake', fields:Array.isArray(body.fields) ? body.fields : [], submitWorkflowId:body.submitWorkflowId || null, status:'active', createdAt:body.createdAt || now, updatedAt:now};
    state.forms = kaiUpsert(state.forms, form);
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('form_saved', {projectId:form.projectId, formId:form.id}, auth.actor));
    return json({ok:true, form, receipt});
  }
  const formSubmit = path.match(/^\/platform\/forms\/([^/]+)\/submit$/);
  if (formSubmit) {
    const formId = decodeURIComponent(formSubmit[1]);
    const projectId = body.projectId || body.data?.projectId || 'default';
    const record = {id:kaiId('rec'), projectId, formId, status:'submitted_pending_operator_review', data:body.data || body, createdAt:now};
    state.records['form-submissions'] = [record, ...(state.records['form-submissions'] || [])];
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('form_submitted', {projectId, formId, recordId:record.id}, auth.actor));
    return json({ok:true, formId, record, workflow:null, receipt});
  }
  const recordsMatch = path.match(/^\/platform\/records\/([^/]+)$/);
  if (recordsMatch) {
    const collection = decodeURIComponent(recordsMatch[1]);
    const record = {id:body.id || kaiId('rec'), projectId:body.projectId || body.input?.projectId || 'default', status:body.status || 'stored_pending_operator_review', ...body, createdAt:body.createdAt || now, updatedAt:now};
    state.records[collection] = kaiUpsert(state.records[collection] || [], record);
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('record_saved', {projectId:record.projectId, collection, recordId:record.id}, auth.actor));
    return json({ok:true, collection, record, receipt});
  }

  if (path === '/platform/audit') {
    const event = {id:kaiId('audit'), projectId:body.projectId || body.input?.projectId || 'default', action:body.action || 'manual_audit_event', severity:body.severity || 'info', metadata:body.metadata || body, createdAt:now, actor:auth.actor};
    state.auditEvents.unshift(event);
    const receipt = await kaiSaveWithReceipt(env, state, kaiReceipt('audit_event_recorded', {projectId:event.projectId, eventId:event.id}, auth.actor));
    return json({ok:true, event, receipt});
  }

  return kaiQueuedExecutionResponse(env, state, path, body, auth, 'platform_execution_blocked');
}
async function kaiHandleCodeStudioRoute(request, env, url) {
  const method = request.method.toUpperCase();
  let path = (url.pathname === KAI_BASE ? '/' : url.pathname.slice(KAI_BASE.length)) || '/';
  if (path.startsWith('/api/platform')) path = path.slice('/api'.length);
  if (path === '/api/health') path = '/health';
  if (method === 'OPTIONS') return json({ok:true});
  if (method === 'GET') return kaiHandleCodeStudioGet(env, url, path);
  if (MUTATING_METHODS.has(method)) {
    const auth = await requireOperatorAuth(request, env, 'kAIxu CodeStudio platform mutation');
    if (!auth.ok) return auth.response;
    return kaiHandleCodeStudioMutation(request, env, url, path, auth);
  }
  return json({ok:false, error:'method_not_allowed', path}, 405);
}

const ROUTEX_BASE = '/api/routex';
const ROUTEX_ALIASES = Object.freeze(['/api/skyeroutex']);
const ROUTEX_KEY_PREFIX = 'skyeroutex:v1:';
const ROUTEX_ROUTE_FAMILIES = Object.freeze([
  'auth',
  'markets',
  'jobs',
  'assignments',
  'route-jobs',
  'ratings',
  'payments',
  'provider',
  'house-command',
  'storage'
]);
const ROUTEX_ASSIGNMENT_CLOSED = Object.freeze(['cancelled_by_contractor', 'cancelled_by_provider', 'no_show', 'completed']);

function routexJson(payload, status = 200) {
  return json(payload, status);
}
function routexKv(env) {
  return env.SKYEROUTEX_KV || env.ROUTEX_KV || env.SITE_EVENTS_KV || null;
}
function routexStorageMode(env) {
  return routexKv(env) ? 'kv' : 'not_configured';
}
function routexStorageRequired() {
  return routexJson({ok:false, error:'skyeroutex_storage_not_configured', storage_mode:'not_configured', message:'SkyeRouteX workforce mutations require SKYEROUTEX_KV, ROUTEX_KV, or SITE_EVENTS_KV.'}, 503);
}
function routexNow() {
  return new Date().toISOString();
}
function routexId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function routexKey(name) {
  return `${ROUTEX_KEY_PREFIX}${name}`;
}
function routexClean(value, limit = 500) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit);
}
function routexEmail(value) {
  return String(value || '').trim().toLowerCase();
}
function routexIsEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}
function routexStrongPassword(value) {
  const text = String(value || '');
  return text.length >= 10 && /[a-z]/i.test(text) && /\d/.test(text);
}
async function routexSha256(value) {
  const input = new TextEncoder().encode(String(value || ''));
  if (globalThis.crypto?.subtle?.digest) {
    const hash = await crypto.subtle.digest('SHA-256', input);
    return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return String(value || '').split('').reduce((out, char) => ((out * 31 + char.charCodeAt(0)) >>> 0), 0).toString(16).padStart(8, '0');
}
async function routexPasswordHash(email, password) {
  return routexSha256(`${routexEmail(email)}::${String(password || '')}`);
}
function routexDefaultState() {
  const now = routexNow();
  return {
    schema:'skyeroutex-0s-adapter-v1',
    createdAt:now,
    updatedAt:now,
    users:[],
    sessions:[],
    markets:[],
    jobs:[],
    applications:[],
    assignments:[],
    routeJobs:[],
    routeStops:[],
    proofItems:[],
    proofMedia:[],
    payments:[],
    ratings:[],
    providerRosters:[],
    providerBlocks:[],
    notifications:[],
    auditEvents:[],
    exports:[]
  };
}
function routexNormalizeState(raw) {
  const base = routexDefaultState();
  const state = raw && typeof raw === 'object' ? {...base, ...raw} : base;
  for (const key of ['users','sessions','markets','jobs','applications','assignments','routeJobs','routeStops','proofItems','proofMedia','payments','ratings','providerRosters','providerBlocks','notifications','auditEvents','exports']) {
    if (!Array.isArray(state[key])) state[key] = [];
  }
  return state;
}
async function routexReadState(env) {
  const kv = routexKv(env);
  if (!kv?.get) return routexDefaultState();
  const stored = await kv.get(routexKey('state'), {type:'json'}).catch(() => null);
  return routexNormalizeState(stored);
}
async function routexWriteState(env, state) {
  const kv = routexKv(env);
  if (!kv?.put) return false;
  const next = routexNormalizeState(state);
  next.updatedAt = routexNow();
  await kv.put(routexKey('state'), JSON.stringify(next));
  return true;
}
function routexPublicUser(user) {
  if (!user) return null;
  const {passwordHash, ...safe} = user;
  return safe;
}
function routexSessionId(request) {
  return String(request.headers.get('x-skye-session') || bearer(request) || '').trim();
}
function routexUserFromRequest(request, state) {
  const sessionId = routexSessionId(request);
  if (!sessionId) return null;
  const session = state.sessions.find(item => item.id === sessionId && item.expiresAt > routexNow());
  if (!session) return null;
  const user = state.users.find(item => item.id === session.userId && item.status === 'active');
  return user ? routexPublicUser(user) : null;
}
function routexRequireUser(request, state, roles) {
  const user = routexUserFromRequest(request, state);
  if (!user) return {ok:false, response:routexJson({ok:false, error:'Authentication required.'}, 401)};
  if (roles && !roles.includes(user.role)) return {ok:false, response:routexJson({ok:false, error:`Requires role: ${roles.join(', ')}`}, 403)};
  return {ok:true, user};
}
function routexAudit(state, actor, eventType, entityType, entityId, metadata = {}) {
  const event = {id:routexId('aud'), actor_user_id:actor?.id || actor || null, event_type:eventType, entity_type:entityType, entity_id:entityId, metadata, created_at:routexNow()};
  state.auditEvents.unshift(event);
  return event;
}
function routexMatch(path, pattern) {
  const parts = path.split('/').filter(Boolean);
  const pat = pattern.split('/').filter(Boolean);
  if (parts.length !== pat.length) return null;
  const params = {};
  for (let index = 0; index < pat.length; index += 1) {
    if (pat[index].startsWith(':')) params[pat[index].slice(1)] = parts[index];
    else if (pat[index] !== parts[index]) return null;
  }
  return params;
}
function routexJobPayments(state, jobId) {
  return state.payments.filter(item => item.job_id === jobId);
}
function routexAssignmentEnvelope(state, assignment) {
  const job = state.jobs.find(item => item.id === assignment.job_id) || null;
  return {
    ...assignment,
    job,
    proof_items:state.proofItems.filter(item => item.assignment_id === assignment.id),
    payment:state.payments.find(item => item.assignment_id === assignment.id) || null
  };
}
function routexCanSeeJob(user, job) {
  return user && (['admin','house_command','ae'].includes(user.role) || job.provider_id === user.id);
}
function routexAcceptedCount(state, jobId) {
  return state.assignments.filter(item => item.job_id === jobId && !ROUTEX_ASSIGNMENT_CLOSED.includes(item.status)).length;
}
function routexPaymentForAssignment(state, assignmentId) {
  return state.payments.find(item => item.assignment_id === assignmentId);
}
function routexSetAssignmentPayment(state, assignment, status, reason) {
  const job = state.jobs.find(item => item.id === assignment.job_id);
  let payment = routexPaymentForAssignment(state, assignment.id);
  if (!payment) {
    payment = {id:routexId('pay'), job_id:assignment.job_id, assignment_id:assignment.id, provider_id:job?.provider_id || '', contractor_id:assignment.contractor_id, amount_cents:Number(job?.pay_amount_cents || 0), status:'authorized', reason:'Assignment payment ledger created.', created_at:routexNow(), updated_at:routexNow()};
    state.payments.unshift(payment);
  }
  payment.status = status;
  payment.reason = reason;
  payment.updated_at = routexNow();
  return payment;
}
function routexRouteStopsFromBody(job, body) {
  const supplied = Array.isArray(body.route_stops) && body.route_stops.length
    ? body.route_stops
    : [{label:'Arrive', address:body.pickup_location || job.location, proof_required:true}, {label:'Complete', address:body.dropoff_location || job.location, proof_required:true}];
  return supplied.slice(0, 12).map((stop, index) => ({
    id:routexId('stop'),
    label:routexClean(stop.label || `Stop ${index + 1}`, 80),
    address:routexClean(stop.address || job.location, 200),
    proof_required:stop.proof_required !== false,
    status:'pending',
    order:index + 1,
    completed_at:null,
    proof_note:null
  }));
}
function routexCreateRouteJob(state, job, body) {
  const route = {id:routexId('route'), job_id:job.id, mode:routexClean(body.route_mode || 'field_route', 80), status:'planned', vehicle_type:routexClean(body.vehicle_type || 'car_or_van', 80), pickup_location:routexClean(body.pickup_location || job.location, 200), dropoff_location:routexClean(body.dropoff_location || job.location, 200), created_at:routexNow(), updated_at:routexNow()};
  state.routeJobs.unshift(route);
  const stops = routexRouteStopsFromBody(job, body).map(stop => ({...stop, route_job_id:route.id, job_id:job.id}));
  state.routeStops.unshift(...stops);
  return route;
}
function routexHealthPayload(env, state) {
  return {
    ...appHealth(APP_API_MOUNTS.find(mount => mount.id === 'skyeroutex'), env),
    ok:true,
    mounted:true,
    app:'SkyeRouteX Workforce Command',
    version:'0s-adapter-v1',
    workforce_api_base:ROUTEX_BASE,
    aliases:ROUTEX_ALIASES,
    storage_mode:routexStorageMode(env),
    jobs_open:state.jobs.filter(job => !['completed','closed'].includes(job.status)).length,
    assignments_open:state.assignments.filter(assignment => !ROUTEX_ASSIGNMENT_CLOSED.includes(assignment.status)).length,
    routes_open:state.routeJobs.filter(route => route.status !== 'completed').length,
    sessions_active:state.sessions.filter(session => session.expiresAt > routexNow()).length
  };
}
function routexReadQuery(url) {
  return Object.fromEntries(url.searchParams.entries());
}
async function routexExportPacket(state, job, actor) {
  const assignments = state.assignments.filter(item => item.job_id === job.id).map(item => routexAssignmentEnvelope(state, item));
  const proofItems = state.proofItems.filter(item => assignments.some(assignment => assignment.id === item.assignment_id));
  const proofMedia = state.proofMedia.filter(item => proofItems.some(proof => proof.media_id === item.id));
  const packet = {
    job,
    assignments,
    proof_items:proofItems,
    proof_media:proofMedia,
    payments:routexJobPayments(state, job.id),
    ratings:state.ratings.filter(item => item.job_id === job.id),
    exported_by:actor.id,
    exported_at:routexNow()
  };
  const serialized = JSON.stringify(packet);
  const exportRow = {id:routexId('export'), job_id:job.id, path:`kv://skyeroutex/exports/${job.id}.json`, sha256:await routexSha256(serialized), byte_size:new TextEncoder().encode(serialized).length, created_at:routexNow()};
  state.exports.unshift(exportRow);
  return {packet, export:exportRow};
}
async function routexHandleRoute(request, env, url, matchedBase = ROUTEX_BASE) {
  const method = request.method.toUpperCase();
  let path = (url.pathname === matchedBase ? '/' : url.pathname.slice(matchedBase.length)) || '/';
  if (path.startsWith('/api/')) path = path.slice('/api'.length);
  if (path === '/api') path = '/';
  if (method === 'OPTIONS') return routexJson({ok:true});
  const state = await routexReadState(env);
  if (path === '/' || path === '/health') return routexJson(routexHealthPayload(env, state));
  if (path === '/manifest' || path === '/routes/manifest') return routexJson({ok:true, base:ROUTEX_BASE, aliases:ROUTEX_ALIASES, route_families:ROUTEX_ROUTE_FAMILIES, storage_mode:routexStorageMode(env), rules:['RouteX browser/runtime calls must use /api/routex/{route}.','Legacy root /api/auth, /api/jobs, /api/assignments, /api/markets, and /api/ratings return api_root_collision.','/api/skyeroutex remains a compatibility alias only.']});
  if (method !== 'GET' && !routexKv(env)) return routexStorageRequired();

  const body = method === 'GET' ? {} : await readJson(request);
  const params = routexReadQuery(url);
  let response = null;
  let persist = false;

  if (method === 'POST' && path === '/auth/signup') {
    const email = routexEmail(body.email);
    const role = routexClean(body.role, 40);
    const allowedRoles = ['contractor','provider','crew','ae','house_command','admin'];
    if (!routexIsEmail(email)) response = routexJson({ok:false, error:'Valid email is required.'}, 400);
    else if (!routexStrongPassword(body.password)) response = routexJson({ok:false, error:'Password must be at least 10 characters and include letters and numbers.'}, 400);
    else if (!allowedRoles.includes(role)) response = routexJson({ok:false, error:'Invalid role.'}, 400);
    else if (role === 'provider' && !routexClean(body.company_name, 160)) response = routexJson({ok:false, error:'Provider signup requires company_name.'}, 400);
    else if (state.users.some(user => user.email === email)) response = routexJson({ok:false, error:'Email already exists.'}, 409);
    else {
      const user = {id:routexId('usr'), email, passwordHash:await routexPasswordHash(email, body.password), role, status:'active', name:routexClean(body.name || email, 120), city:routexClean(body.city, 80), state:routexClean(body.state, 80), company_name:role === 'provider' ? routexClean(body.company_name, 160) : '', skills:Array.isArray(body.skills) ? body.skills.slice(0, 20).map(item => routexClean(item, 80)) : [], created_at:routexNow(), updated_at:routexNow()};
      state.users.unshift(user);
      routexAudit(state, user, 'signup', 'user', user.id, {role});
      response = routexJson({ok:true, id:user.id, email:user.email, role:user.role, user:routexPublicUser(user)}, 201);
      persist = true;
    }
  }
  else if (method === 'POST' && path === '/auth/login') {
    const email = routexEmail(body.email);
    const user = state.users.find(item => item.email === email);
    const passwordHash = await routexPasswordHash(email, body.password);
    if (!user || user.passwordHash !== passwordHash || user.status !== 'active') response = routexJson({ok:false, error:'Invalid email or password.'}, 401);
    else {
      const session = {id:routexId('ses'), userId:user.id, createdAt:routexNow(), expiresAt:new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString()};
      state.sessions.unshift(session);
      routexAudit(state, user, 'login', 'user', user.id);
      response = routexJson({ok:true, session:session.id, user:routexPublicUser(user)});
      persist = true;
    }
  }
  else if (method === 'POST' && path === '/auth/logout') {
    const sessionId = routexSessionId(request);
    const before = state.sessions.length;
    state.sessions = state.sessions.filter(item => item.id !== sessionId);
    routexAudit(state, sessionId || null, 'logout', 'session', sessionId || 'none', {removed:before - state.sessions.length});
    response = routexJson({ok:true, removed:before - state.sessions.length});
    persist = true;
  }
  else if (method === 'GET' && path === '/me') {
    const auth = routexRequireUser(request, state);
    response = auth.ok ? routexJson({ok:true, user:auth.user}) : auth.response;
  }

  if (!response && method === 'POST' && path === '/markets') {
    const auth = routexRequireUser(request, state, ['admin','house_command','ae']);
    if (!auth.ok) response = auth.response;
    else {
      const city = routexClean(body.city, 80);
      const stateName = routexClean(body.state, 80);
      if (!city || !stateName) response = routexJson({ok:false, error:'city and state are required.'}, 400);
      else {
        let market = state.markets.find(item => item.city === city && item.state === stateName);
        if (!market) {
          market = {id:routexId('mkt'), city, state:stateName, status:routexClean(body.status || 'open', 40), created_at:routexNow(), updated_at:routexNow()};
          state.markets.unshift(market);
        } else {
          market.status = routexClean(body.status || market.status, 40);
          market.updated_at = routexNow();
        }
        routexAudit(state, auth.user, 'market_upserted', 'market', market.id, {city, state:stateName});
        response = routexJson({ok:true, market}, 201);
        persist = true;
      }
    }
  }
  else if (!response && method === 'GET' && path === '/markets') {
    const auth = routexRequireUser(request, state);
    response = auth.ok ? routexJson({ok:true, markets:state.markets}) : auth.response;
  }

  if (!response && method === 'POST' && path === '/jobs') {
    const auth = routexRequireUser(request, state, ['provider','admin','house_command','ae']);
    if (!auth.ok) response = auth.response;
    else {
      const market = state.markets.find(item => item.id === body.market_id && item.status === 'open');
      const pay = Number(body.pay_amount_cents || 0);
      const slots = Number(body.slots || 0);
      if (!market) response = routexJson({ok:false, error:'Market not found or not open.'}, 400);
      else if (!routexClean(body.title, 160)) response = routexJson({ok:false, error:'Valid title is required.'}, 400);
      else if (!pay || pay < 1) response = routexJson({ok:false, error:'pay_amount_cents must be a positive integer.'}, 400);
      else if (!slots || slots < 1) response = routexJson({ok:false, error:'slots must be a positive integer.'}, 400);
      else {
        const job = {id:routexId('job'), provider_id:auth.user.role === 'provider' ? auth.user.id : (body.provider_id || auth.user.id), market_id:market.id, title:routexClean(body.title, 160), category:routexClean(body.category || 'field', 80), description:routexClean(body.description || body.title, 3000), city:market.city, state:market.state, location:routexClean(body.location, 300), starts_at:body.starts_at || routexNow(), pay_type:routexClean(body.pay_type || 'fixed', 40), pay_amount_cents:pay, slots, acceptance_mode:routexClean(body.acceptance_mode || 'single', 40), status:'open', proof_required:body.proof_required !== false, route_required:body.route_required === true, route_mode:routexClean(body.route_mode || (body.route_required ? 'field_route' : 'none'), 80), created_at:routexNow(), updated_at:routexNow()};
        state.jobs.unshift(job);
        if (job.route_required) routexCreateRouteJob(state, job, body);
        state.payments.unshift({id:routexId('pay'), job_id:job.id, assignment_id:null, provider_id:job.provider_id, contractor_id:null, amount_cents:pay, status:'authorized', reason:'Job payment authorization recorded.', created_at:routexNow(), updated_at:routexNow()});
        routexAudit(state, auth.user, 'job_created', 'job', job.id, {market_id:market.id, route_required:job.route_required});
        response = routexJson({ok:true, job}, 201);
        persist = true;
      }
    }
  }
  else if (!response && method === 'GET' && path === '/jobs') {
    const auth = routexRequireUser(request, state);
    if (!auth.ok) response = auth.response;
    else {
      let jobs = state.jobs.slice();
      if (params.city) jobs = jobs.filter(job => job.city === params.city);
      if (params.state) jobs = jobs.filter(job => job.state === params.state);
      const status = params.status || 'open';
      if (status) jobs = jobs.filter(job => job.status === status || (['contractor','crew'].includes(auth.user.role) && ['open','applicant_pool_active','partially_filled'].includes(job.status)));
      response = routexJson({ok:true, jobs});
    }
  }

  let match = null;
  if (!response && method === 'GET' && (match = routexMatch(path, '/jobs/:id'))) {
    const auth = routexRequireUser(request, state);
    const job = state.jobs.find(item => item.id === match.id);
    response = !auth.ok ? auth.response : job ? routexJson({ok:true, job}) : routexJson({ok:false, error:'Job not found.'}, 404);
  }
  else if (!response && method === 'POST' && (match = routexMatch(path, '/jobs/:id/apply'))) {
    const auth = routexRequireUser(request, state, ['contractor','crew']);
    if (!auth.ok) response = auth.response;
    else {
      const job = state.jobs.find(item => item.id === match.id);
      if (!job) response = routexJson({ok:false, error:'Job not found.'}, 404);
      else if (!['open','applicant_pool_active','partially_filled'].includes(job.status)) response = routexJson({ok:false, error:`Job is ${job.status}; applications are closed.`}, 400);
      else if (state.applications.some(item => item.job_id === job.id && item.contractor_id === auth.user.id)) response = routexJson({ok:false, error:'Already applied.'}, 409);
      else {
        const application = {id:routexId('app'), job_id:job.id, contractor_id:auth.user.id, note:routexClean(body.note, 1000), status:'applied', created_at:routexNow(), updated_at:routexNow()};
        state.applications.unshift(application);
        if (job.status === 'open') job.status = 'applicant_pool_active';
        job.updated_at = routexNow();
        routexAudit(state, auth.user, 'job_applied', 'job_application', application.id, {job_id:job.id});
        response = routexJson({ok:true, application}, 201);
        persist = true;
      }
    }
  }
  else if (!response && method === 'GET' && (match = routexMatch(path, '/jobs/:id/applicants'))) {
    const auth = routexRequireUser(request, state);
    const job = state.jobs.find(item => item.id === match.id);
    if (!auth.ok) response = auth.response;
    else if (!job) response = routexJson({ok:false, error:'Job not found.'}, 404);
    else if (!routexCanSeeJob(auth.user, job)) response = routexJson({ok:false, error:'Not allowed to view this applicant pool.'}, 403);
    else response = routexJson({ok:true, job, applicants:state.applications.filter(item => item.job_id === job.id).map(item => ({...item, user:routexPublicUser(state.users.find(user => user.id === item.contractor_id))}))});
  }
  else if (!response && method === 'POST' && (match = routexMatch(path, '/jobs/:id/accept-applicant'))) {
    const auth = routexRequireUser(request, state);
    if (!auth.ok) response = auth.response;
    else {
      const job = state.jobs.find(item => item.id === match.id);
      const application = state.applications.find(item => item.id === body.application_id && item.job_id === match.id);
      if (!job) response = routexJson({ok:false, error:'Job not found.'}, 404);
      else if (!routexCanSeeJob(auth.user, job)) response = routexJson({ok:false, error:'Not allowed.'}, 403);
      else if (!application) response = routexJson({ok:false, error:'Application not found.'}, 404);
      else if (application.status !== 'applied') response = routexJson({ok:false, error:`Cannot accept application with status ${application.status}.`}, 400);
      else if (job.acceptance_mode === 'single' && routexAcceptedCount(state, job.id) >= 1) response = routexJson({ok:false, error:'Single-acceptance lock blocked over-acceptance.'}, 409);
      else {
        application.status = 'accepted';
        application.updated_at = routexNow();
        const assignment = {id:routexId('asg'), job_id:job.id, application_id:application.id, contractor_id:application.contractor_id, status:'offered', confirmed_at:null, on_way_at:null, checked_in_at:null, checked_out_at:null, provider_approved_at:null, created_at:routexNow(), updated_at:routexNow()};
        state.assignments.unshift(assignment);
        const accepted = routexAcceptedCount(state, job.id);
        job.status = accepted >= job.slots ? 'filled' : 'partially_filled';
        job.updated_at = routexNow();
        routexSetAssignmentPayment(state, assignment, 'authorized', 'Assignment accepted; work pending.');
        routexAudit(state, auth.user, 'applicant_accepted', 'job_assignment', assignment.id, {job_id:job.id, contractor_id:application.contractor_id});
        response = routexJson({ok:true, assignment, job}, 201);
        persist = true;
      }
    }
  }
  else if (!response && method === 'GET' && (match = routexMatch(path, '/jobs/:id/export-packet'))) {
    const auth = routexRequireUser(request, state);
    const job = state.jobs.find(item => item.id === match.id);
    if (!auth.ok) response = auth.response;
    else if (!job) response = routexJson({ok:false, error:'Job not found.'}, 404);
    else if (!routexCanSeeJob(auth.user, job) && !state.assignments.some(item => item.job_id === job.id && item.contractor_id === auth.user.id)) response = routexJson({ok:false, error:'Not allowed to export this job packet.'}, 403);
    else {
      const exported = await routexExportPacket(state, job, auth.user);
      routexAudit(state, auth.user, 'job_packet_exported', 'job', job.id, {export_id:exported.export.id});
      response = routexJson({ok:true, ...exported});
      persist = true;
    }
  }

  const assignmentActions = {
    confirm:['contractor_confirmed','confirmed_at','assignment_confirmed'],
    'on-the-way':['on_the_way','on_way_at','contractor_on_the_way'],
    'check-in':['checked_in','checked_in_at','contractor_checked_in'],
    'check-out':['checked_out','checked_out_at','contractor_checked_out']
  };
  if (!response && method === 'GET' && path === '/assignments') {
    const auth = routexRequireUser(request, state);
    if (!auth.ok) response = auth.response;
    else {
      let assignments = state.assignments.map(item => routexAssignmentEnvelope(state, item));
      if (['contractor','crew'].includes(auth.user.role)) assignments = assignments.filter(item => item.contractor_id === auth.user.id);
      else if (auth.user.role === 'provider') assignments = assignments.filter(item => item.job?.provider_id === auth.user.id);
      response = routexJson({ok:true, assignments});
    }
  }
  for (const action of Object.keys(assignmentActions)) {
    if (!response && method === 'POST' && (match = routexMatch(path, `/assignments/:id/${action}`))) {
      const auth = routexRequireUser(request, state);
      const assignment = state.assignments.find(item => item.id === match.id);
      if (!auth.ok) response = auth.response;
      else if (!assignment) response = routexJson({ok:false, error:'Assignment not found.'}, 404);
      else if (assignment.contractor_id !== auth.user.id && !['admin','house_command'].includes(auth.user.role)) response = routexJson({ok:false, error:'Contractor action required.'}, 403);
      else {
        const [status, column, event] = assignmentActions[action];
        assignment.status = status;
        assignment[column] = routexNow();
        assignment.updated_at = routexNow();
        routexAudit(state, auth.user, event, 'job_assignment', assignment.id, {job_id:assignment.job_id});
        response = routexJson({ok:true, assignment});
        persist = true;
      }
    }
  }
  if (!response && method === 'POST' && (match = routexMatch(path, '/assignments/:id/proof'))) {
    const auth = routexRequireUser(request, state);
    const assignment = state.assignments.find(item => item.id === match.id);
    if (!auth.ok) response = auth.response;
    else if (!assignment) response = routexJson({ok:false, error:'Assignment not found.'}, 404);
    else if (assignment.contractor_id !== auth.user.id && !['admin','house_command'].includes(auth.user.role)) response = routexJson({ok:false, error:'Only assigned contractor or operator can submit proof.'}, 403);
    else if (!body.proof_type || !body.body) response = routexJson({ok:false, error:'proof_type and body are required.'}, 400);
    else {
      const proof = {id:routexId('prf'), assignment_id:assignment.id, proof_type:routexClean(body.proof_type, 80), body:routexClean(body.body, 2000), media_required:Boolean(body.media_base64), created_at:routexNow()};
      if (body.media_base64) {
        const media = {id:routexId('media'), assignment_id:assignment.id, proof_id:proof.id, media_mime:routexClean(body.media_mime || 'text/plain', 80), media_ext:routexClean(body.media_ext || 'txt', 20), byte_size:String(body.media_base64 || '').length, storage_path:`kv://skyeroutex/proof-media/${proof.id}.${routexClean(body.media_ext || 'txt', 20)}`, created_at:routexNow()};
        state.proofMedia.unshift(media);
        proof.media_id = media.id;
        proof.media_size_bytes = media.byte_size;
      }
      state.proofItems.unshift(proof);
      assignment.status = 'proof_submitted';
      assignment.updated_at = routexNow();
      const payment = routexSetAssignmentPayment(state, assignment, 'approval_pending', 'Proof submitted; provider approval pending.');
      routexAudit(state, auth.user, 'proof_submitted', 'proof_item', proof.id, {assignment_id:assignment.id, media_id:proof.media_id || null});
      response = routexJson({ok:true, proof, media:proof.media_id ? state.proofMedia.find(item => item.id === proof.media_id) : null, payment}, 201);
      persist = true;
    }
  }
  else if (!response && method === 'POST' && (match = routexMatch(path, '/assignments/:id/approve'))) {
    const auth = routexRequireUser(request, state);
    const assignment = state.assignments.find(item => item.id === match.id);
    const job = assignment ? state.jobs.find(item => item.id === assignment.job_id) : null;
    if (!auth.ok) response = auth.response;
    else if (!assignment || !job) response = routexJson({ok:false, error:'Assignment not found.'}, 404);
    else if (!['admin','house_command'].includes(auth.user.role) && job.provider_id !== auth.user.id) response = routexJson({ok:false, error:'Only provider/operator can approve.'}, 403);
    else if (job.proof_required && !state.proofItems.some(item => item.assignment_id === assignment.id)) response = routexJson({ok:false, error:'Proof required before approval.'}, 400);
    else {
      assignment.status = 'completed';
      assignment.provider_approved_at = routexNow();
      assignment.updated_at = routexNow();
      const payment = routexSetAssignmentPayment(state, assignment, 'payout_eligible', 'Provider approved work; payout eligible.');
      routexAudit(state, auth.user, 'assignment_approved', 'job_assignment', assignment.id, {payment_status:payment.status});
      response = routexJson({ok:true, assignment, payment});
      persist = true;
    }
  }

  if (!response && method === 'GET' && path === '/route-jobs') {
    const auth = routexRequireUser(request, state);
    if (!auth.ok) response = auth.response;
    else {
      let routes = state.routeJobs.map(route => ({...route, job:state.jobs.find(job => job.id === route.job_id) || null, stops:state.routeStops.filter(stop => stop.route_job_id === route.id)}));
      if (auth.user.role === 'provider') routes = routes.filter(route => route.job?.provider_id === auth.user.id);
      if (['contractor','crew'].includes(auth.user.role)) {
        const jobIds = state.assignments.filter(item => item.contractor_id === auth.user.id).map(item => item.job_id);
        routes = routes.filter(route => jobIds.includes(route.job_id));
      }
      response = routexJson({ok:true, routes});
    }
  }
  else if (!response && method === 'POST' && (match = routexMatch(path, '/route-jobs/:id/complete-stop'))) {
    const auth = routexRequireUser(request, state);
    const route = state.routeJobs.find(item => item.id === match.id);
    const job = route ? state.jobs.find(item => item.id === route.job_id) : null;
    const assignment = route ? state.assignments.find(item => item.job_id === route.job_id && item.contractor_id === auth.user?.id) : null;
    const stop = route ? state.routeStops.find(item => item.id === body.stop_id && item.route_job_id === route.id) : null;
    if (!auth.ok) response = auth.response;
    else if (!route || !job) response = routexJson({ok:false, error:'Route job not found.'}, 404);
    else if (!assignment && !['admin','house_command'].includes(auth.user.role) && job.provider_id !== auth.user.id) response = routexJson({ok:false, error:'Assigned contractor, provider, or operator required.'}, 403);
    else if (!stop) response = routexJson({ok:false, error:'Route stop not found.'}, 404);
    else {
      stop.status = 'completed';
      stop.completed_at = routexNow();
      stop.proof_note = routexClean(body.proof_note, 1000);
      route.status = state.routeStops.filter(item => item.route_job_id === route.id).every(item => item.status === 'completed') ? 'completed' : 'in_progress';
      route.updated_at = routexNow();
      routexAudit(state, auth.user, 'route_stop_completed', 'route_stop', stop.id, {route_job_id:route.id});
      response = routexJson({ok:true, route, stop});
      persist = true;
    }
  }

  if (!response && method === 'POST' && path === '/ratings') {
    const auth = routexRequireUser(request, state);
    const job = state.jobs.find(item => item.id === body.job_id);
    const score = Number(body.score || 0);
    if (!auth.ok) response = auth.response;
    else if (!job) response = routexJson({ok:false, error:'Job not found.'}, 404);
    else if (!Number.isInteger(score) || score < 1 || score > 5) response = routexJson({ok:false, error:'score must be an integer from 1 to 5.'}, 400);
    else if (!state.users.some(user => user.id === body.to_user_id)) response = routexJson({ok:false, error:'Rated user not found.'}, 404);
    else {
      const related = state.assignments.some(item => item.job_id === job.id && (item.contractor_id === auth.user.id || item.contractor_id === body.to_user_id)) || job.provider_id === auth.user.id || job.provider_id === body.to_user_id || ['admin','house_command'].includes(auth.user.role);
      if (!related) response = routexJson({ok:false, error:'Rating must be tied to a related job.'}, 403);
      else {
        const rating = {id:routexId('rat'), job_id:job.id, from_user_id:auth.user.id, to_user_id:body.to_user_id, score, note:routexClean(body.note, 1000), created_at:routexNow()};
        state.ratings.unshift(rating);
        routexAudit(state, auth.user, 'rating_submitted', 'rating', rating.id, {job_id:job.id, score});
        response = routexJson({ok:true, rating}, 201);
        persist = true;
      }
    }
  }
  else if (!response && method === 'GET' && path === '/ratings') {
    const auth = routexRequireUser(request, state);
    if (!auth.ok) response = auth.response;
    else {
      let ratings = state.ratings;
      if (!['admin','house_command'].includes(auth.user.role)) ratings = ratings.filter(item => item.from_user_id === auth.user.id || item.to_user_id === auth.user.id);
      response = routexJson({ok:true, ratings});
    }
  }

  if (!response && method === 'GET' && path === '/payments/ledger') {
    const auth = routexRequireUser(request, state);
    if (!auth.ok) response = auth.response;
    else {
      let payments = state.payments;
      if (auth.user.role === 'provider') payments = payments.filter(item => item.provider_id === auth.user.id);
      else if (!['admin','house_command'].includes(auth.user.role)) payments = payments.filter(item => item.contractor_id === auth.user.id);
      response = routexJson({ok:true, payments});
    }
  }
  else if (!response && method === 'GET' && path === '/provider/jobs') {
    const auth = routexRequireUser(request, state, ['provider','admin','house_command','ae']);
    if (!auth.ok) response = auth.response;
    else {
      let jobs = state.jobs;
      if (auth.user.role === 'provider') jobs = jobs.filter(job => job.provider_id === auth.user.id);
      jobs = jobs.map(job => ({...job, applicant_count:state.applications.filter(item => item.job_id === job.id).length, assignment_count:state.assignments.filter(item => item.job_id === job.id).length, payments:routexJobPayments(state, job.id)}));
      response = routexJson({ok:true, jobs});
    }
  }
  else if (!response && method === 'GET' && path === '/house-command/jobs') {
    const auth = routexRequireUser(request, state, ['admin','house_command']);
    response = auth.ok ? routexJson({ok:true, jobs:state.jobs.map(job => ({...job, applicant_count:state.applications.filter(item => item.job_id === job.id).length, assignment_count:state.assignments.filter(item => item.job_id === job.id).length}))}) : auth.response;
  }
  else if (!response && method === 'GET' && path === '/storage/status') {
    const auth = routexRequireUser(request, state);
    response = auth.ok ? routexJson({ok:true, storage:{driver:'worker-kv', durable:true, proof_media_count:state.proofMedia.length, export_packet_count:state.exports.length}}) : auth.response;
  }

  if (!response) response = routexJson({ok:false, error:'skyeroutex_route_not_found', path, manifest:`${ROUTEX_BASE}/routes/manifest`}, 404);
  if (persist && response.status < 400) await routexWriteState(env, state);
  return response;
}

const MUSIC_BASE = '/api/skymusicnexus';
const MUSIC_KEY_PREFIX = 'skymusicnexus:v1:';
const MUSIC_FUNCTIONS = Object.freeze([
  'skygate-session',
  'music-artists',
  'music-assets',
  'music-studio',
  'music-drops',
  'music-releases',
  'music-payments',
  'music-exchange',
  'music-social',
  'music-analytics',
  'music-provider-hooks'
]);
const MUSIC_OPERATOR_ACTIONS = Object.freeze({
  'music-artists': new Set(['approve']),
  'music-releases': new Set(['review', 'publish', 'report-streams', 'queue-operations', 'update-operations']),
  'music-payments': new Set(['credit', 'payout', 'complete-payout']),
  'music-drops': new Set(['send-approval', 'approve-batch', 'run-approval-brain', 'build-static-bundle', 'publish-batch', 'hold-drop', 'reject-drop', 'revoke-private-delivery']),
  'music-social': new Set(['save-connector', 'publish-post', 'moderate-post', 'sync-feed'])
});
const MUSIC_SOCIAL_CATALOG = Object.freeze([
  {id:'pixelfed', name:'Pixelfed', lane:'instagram-like-photo-feed', protocol:'ActivityPub plus Mastodon-compatible REST posting', productionBoundary:'Provider tokens stay in server env before publishing.'},
  {id:'mastodon', name:'Mastodon-compatible Fediverse', lane:'status-feed-and-hashtag-discovery', protocol:'OAuth2 plus REST API plus ActivityPub federation', productionBoundary:'Use OAuth app tokens stored in the Worker runtime.'},
  {id:'funkwhale', name:'Funkwhale', lane:'federated-audio-publication', protocol:'ActivityPub audio federation plus Funkwhale API', productionBoundary:'Use after rights, storage, and native API mapping are live.'}
]);

function musicJson(payload, status = 200) {
  return json(payload, status);
}
function musicKv(env) {
  return env.SKYMUSICNEXUS_KV || env.MUSIC_NEXUS_KV || env.SITE_EVENTS_KV || null;
}
function musicStorageMode(env) {
  return musicKv(env) ? 'kv' : 'not_configured';
}
function musicNow() {
  return new Date().toISOString();
}
function musicId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function musicKey(name) {
  return `${MUSIC_KEY_PREFIX}${name}`;
}
function musicSlug(value, fallback = 'music') {
  return String(value || fallback).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || fallback;
}
function musicDefaultState() {
  const now = musicNow();
  return {
    schema:'skye-music-nexus-0s-adapter-v1',
    createdAt:now,
    updatedAt:now,
    artists:[],
    assets:[],
    studio:{projects:[], exports:[], engines:[]},
    drops:{items:[], batches:[], approvals:[], deploys:[], traffic:[]},
    releases:[],
    payments:{ledger:[], payouts:[]},
    exchange:{contentRequests:[], threads:[], communityPosts:[], campaigns:[]},
    social:{connectors:[], postQueue:[], feedItems:[], stories:[], feedPulls:[], moderation:[]},
    receipts:[]
  };
}
function musicNormalizeState(raw) {
  const base = musicDefaultState();
  const state = raw && typeof raw === 'object' ? {...base, ...raw} : base;
  for (const key of ['artists','assets','releases','receipts']) if (!Array.isArray(state[key])) state[key] = [];
  state.studio = state.studio && typeof state.studio === 'object' ? {...base.studio, ...state.studio} : base.studio;
  state.drops = state.drops && typeof state.drops === 'object' ? {...base.drops, ...state.drops} : base.drops;
  state.payments = state.payments && typeof state.payments === 'object' ? {...base.payments, ...state.payments} : base.payments;
  state.exchange = state.exchange && typeof state.exchange === 'object' ? {...base.exchange, ...state.exchange} : base.exchange;
  state.social = state.social && typeof state.social === 'object' ? {...base.social, ...state.social} : base.social;
  for (const key of ['projects','exports','engines']) if (!Array.isArray(state.studio[key])) state.studio[key] = [];
  for (const key of ['items','batches','approvals','deploys','traffic']) if (!Array.isArray(state.drops[key])) state.drops[key] = [];
  for (const key of ['ledger','payouts']) if (!Array.isArray(state.payments[key])) state.payments[key] = [];
  for (const key of ['contentRequests','threads','communityPosts','campaigns']) if (!Array.isArray(state.exchange[key])) state.exchange[key] = [];
  for (const key of ['connectors','postQueue','feedItems','stories','feedPulls','moderation']) if (!Array.isArray(state.social[key])) state.social[key] = [];
  return state;
}
async function musicReadState(env) {
  const kv = musicKv(env);
  if (!kv?.get) return musicDefaultState();
  const stored = await kv.get(musicKey('state'), {type:'json'}).catch(() => null);
  return musicNormalizeState(stored);
}
async function musicWriteState(env, state) {
  const kv = musicKv(env);
  if (!kv?.put) return false;
  const next = musicNormalizeState(state);
  next.updatedAt = musicNow();
  await kv.put(musicKey('state'), JSON.stringify(next));
  return true;
}
function musicStorageRequired() {
  return musicJson({ok:false, error:'skymusicnexus_storage_not_configured', storage_mode:'not_configured', message:'SkyeMusicNexus function mutations require SKYMUSICNEXUS_KV, MUSIC_NEXUS_KV, or SITE_EVENTS_KV.'}, 503);
}
function musicUpsert(rows, item) {
  const list = Array.isArray(rows) ? rows : [];
  const keys = ['id','dropId','batchId','releaseId','artistId'].filter(key => item[key]);
  const index = list.findIndex(row => keys.some(key => row[key] === item[key]));
  if (index >= 0) list[index] = {...list[index], ...item};
  else list.unshift(item);
  return list;
}
function musicBodyAction(body, url) {
  return String((body && body.action) || url.searchParams.get('action') || '').trim();
}
function musicToken(request) {
  return bearer(request) || String(request.headers.get('x-skygate-session') || '').trim();
}
async function requireMusicGate(request, env, label = 'SkyeMusicNexus function') {
  const expected = String(env.SITE_OPERATOR_ADMIN_TOKEN || env.METRAIYUX_ADMIN_TOKEN || env.ADMIN_TOKEN || '').trim();
  const token = musicToken(request);
  const headerToken = adminHeaderToken(request);
  if (expected && (token === expected || headerToken === expected)) return {ok:true, via:'admin_token', actor:'legacy-admin', role:'admin'};
  if (skygateOrigin(env) || env.SKYGATEFS27_WORKER?.fetch) {
    const gate = await introspectSkygate(request, env);
    if (!gate.ok) return {ok:false, response:musicJson({ok:false, error:gate.error || `Unauthorized ${label}.`, skygate:gate.data || null}, gate.status || 401)};
    return {ok:true, via:'skygate', actor:gate.data?.email || gate.data?.username || gate.data?.sub || 'skygate-user', role:gate.data?.role || gate.data?.user?.role || 'user', gate};
  }
  return {ok:false, response:musicJson({ok:false, error:`Unauthorized ${label}. Configure ADMIN_TOKEN/SITE_OPERATOR_ADMIN_TOKEN or SkyGate auth on this Worker.`}, 401)};
}
async function requireMusicAccess(request, env, fnName, action) {
  if (fnName === 'music-drops' && action === 'track-public-event') return {ok:true, actor:'public-listener', role:'public'};
  const gate = await requireMusicGate(request, env, fnName);
  if (!gate.ok) return gate;
  if (MUSIC_OPERATOR_ACTIONS[fnName]?.has(action)) {
    const op = await requireOperatorAuth(request, env, `SkyeMusicNexus ${fnName}:${action}`);
    if (!op.ok) return op;
    return {...gate, actor:op.actor || gate.actor, operator:true};
  }
  return gate;
}
function musicTrackList(tracks) {
  if (!Array.isArray(tracks)) return [];
  return tracks.map((track, index) => ({
    id:String(track.id || track.assetId || `track_${index + 1}`),
    title:String(track.title || `Track ${index + 1}`),
    duration:Number(track.duration || 180) || 180,
    previewUrl:String(track.previewUrl || track.streamUrl || track.audioUrl || ''),
    downloadUrl:String(track.downloadUrl || ''),
    contentType:String(track.contentType || ''),
    bytes:Number(track.bytes || 0) || 0,
    plays:Number(track.plays || 0) || 0,
    listenSeconds:Number(track.listenSeconds || 0) || 0
  }));
}
function musicRights(input = {}, fallback = {}) {
  const rights = {...fallback, ...input};
  const ownership = rights.ownershipAttested === true;
  const preview = rights.previewUseAuthorized === true;
  const distribution = rights.distributionAuthorized === true;
  let status = rights.status || 'needs-clearance';
  if (rights.playbackBlocked || rights.takedownHold) status = 'blocked';
  else if (ownership && preview && distribution) status = 'distribution-ready';
  else if (ownership && preview) status = 'preview-ready';
  return {...rights, ownershipAttested:ownership, previewUseAuthorized:preview, distributionAuthorized:distribution, status};
}
function musicReleaseSummary(release) {
  const rights = musicRights(release.rights || {});
  return {
    releaseId:release.id,
    title:release.title,
    status:rights.status,
    ownershipAttested:rights.ownershipAttested,
    previewUseAuthorized:rights.previewUseAuthorized,
    distributionAuthorized:rights.distributionAuthorized,
    playbackBlocked:rights.playbackBlocked === true || rights.takedownHold === true,
    linkedPreviewCount:musicTrackList(release.tracks).filter(track => track.previewUrl).length
  };
}
function musicAnalytics(state) {
  const totalStreams = state.releases.reduce((sum, release) => sum + Number(release.analytics?.streams || 0), 0);
  const totalDownloads = state.releases.reduce((sum, release) => sum + Number(release.analytics?.downloads || 0), 0);
  const pendingPayouts = state.payments.payouts.filter(payout => payout.status === 'pending').length;
  return {
    totalArtists:state.artists.length,
    activeArtists:state.artists.filter(artist => artist.status === 'active').length,
    totalReleases:state.releases.length,
    liveReleases:state.releases.filter(release => release.status === 'live').length,
    totalStreams,
    totalDownloads,
    pendingPayouts,
    assets:state.assets.length,
    drops:state.drops.items.length,
    feedItems:state.social.feedItems.length
  };
}
function musicSocialSummary(social) {
  return {
    connectors:social.connectors.length,
    readyConnectors:social.connectors.filter(connector => connector.tokenStatus === 'env-key-set').length,
    feedItems:social.feedItems.length,
    queuedPosts:social.postQueue.length,
    publishedPosts:social.postQueue.filter(post => post.status === 'published').length,
    providerTokenRequired:social.postQueue.filter(post => post.status === 'provider-token-required').length
  };
}
function musicExchangeProgress(exchange) {
  const counts = {
    contentRequests:exchange.contentRequests.length,
    communityPosts:exchange.communityPosts.length,
    inboxThreads:exchange.threads.length,
    campaigns:exchange.campaigns.length
  };
  const points = 50 + counts.contentRequests * 20 + counts.communityPosts * 10 + counts.inboxThreads * 12 + counts.campaigns * 30;
  return {points, level:Math.max(1, Math.floor(points / 300) + 1), nextLevelAt:Math.ceil(points / 300) * 300 || 300, percentToNext:Math.min(99, Math.round((points % 300) / 3)), counts, achievements:[], missions:[]};
}
function musicHubEnvelope(state) {
  return {
    ok:true,
    gateSessionRequired:true,
    artists:state.artists.slice(0, 25),
    assets:state.assets.slice(0, 25),
    releases:state.releases.slice(0, 25),
    drops:state.drops.items.slice(0, 25),
    workflows:state.releases.filter(release => release.operationsWorkflow).map(release => ({releaseId:release.id, title:release.title, ...release.operationsWorkflow})),
    payouts:state.payments.payouts.slice(0, 25),
    social:musicSocialSummary(state.social),
    analytics:musicAnalytics(state),
    storage_mode:'kv'
  };
}
function musicReadQuery(url) {
  return Object.fromEntries(url.searchParams.entries());
}
async function musicHandleSession(request, env) {
  const method = request.method.toUpperCase();
  if (method === 'GET') {
    const gate = await requireMusicGate(request, env, 'SkyeMusicNexus session').catch(error => ({ok:false, error:error.message}));
    return musicJson({
      ok:true,
      productionGate:true,
      free99:true,
      enabled:true,
      available:true,
      localProofBootstrap:false,
      localOperatorLogin:false,
      activeSession: gate.ok ? {source:gate.via, subject:gate.gate?.data?.sub || '', email:gate.actor || '', role:gate.role || '', artistId:gate.gate?.data?.artistId || gate.gate?.data?.artist_id || ''} : null,
      skygate: gate.ok ? {active:true} : {active:false, error:gate.response ? 'No active gate session' : gate.error || 'No active gate session'}
    });
  }
  if (method === 'DELETE') return musicJson({ok:true, cleared:true, productionGate:true, localSessions:false});
  if (method === 'POST') return musicJson({ok:false, productionGate:true, free99:true, error:'Production SkyeMusicNexus sessions must come from FS27/SkyGate. Free99 removes the charge, not the gate.'}, 503);
  return musicJson({ok:false, error:'Method not allowed'}, 405);
}
async function musicHandleArtists(method, url, state, body, gate) {
  const params = musicReadQuery(url);
  if (method === 'GET') {
    if ((params.action || 'list') === 'get') {
      const artist = state.artists.find(item => item.id === params.id || item.artistId === params.id);
      return musicJson(artist ? {ok:true, artist} : {ok:false, error:'artist_not_found'}, artist ? 200 : 404);
    }
    return musicJson({ok:true, artists:state.artists, total:state.artists.length});
  }
  const action = musicBodyAction(body, url);
  if (action === 'register') {
    const artist = {id:body.id || musicId('artist'), artistId:body.artistId || body.id || undefined, name:body.name || 'Untitled Artist', email:body.email || '', skyeId:body.skyeId || body.identityId || '', genre:Array.isArray(body.genre) ? body.genre : [], bio:body.bio || '', status:'pending_review', profilePhoto:body.profilePhoto || null, createdAt:musicNow(), updatedAt:musicNow()};
    artist.artistId = artist.artistId || artist.id;
    state.artists = musicUpsert(state.artists, artist);
    return musicJson({ok:true, artistId:artist.id, artist});
  }
  if (action === 'approve') {
    const id = body.id || url.searchParams.get('id');
    const artist = state.artists.find(item => item.id === id || item.artistId === id);
    if (!artist) return musicJson({ok:false, error:'artist_not_found'}, 404);
    artist.status = 'active';
    artist.approvedAt = musicNow();
    artist.approvedBy = gate.actor;
    artist.updatedAt = artist.approvedAt;
    return musicJson({ok:true, artist});
  }
  if (action === 'update') {
    const id = body.id || body.artistId;
    const artist = state.artists.find(item => item.id === id || item.artistId === id);
    if (!artist) return musicJson({ok:false, error:'artist_not_found'}, 404);
    Object.assign(artist, body, {updatedAt:musicNow()});
    return musicJson({ok:true, artist});
  }
  return musicJson({ok:false, error:`Unknown artist action: ${action}`}, 400);
}
async function musicHandleAssets(method, url, state, body) {
  const params = musicReadQuery(url);
  const action = method === 'GET' ? (params.action || 'list') : musicBodyAction(body, url);
  if (method === 'GET' && action === 'storage-status') {
    return musicJson({ok:true, storage:{mode:'worker-kv', durable:true, directUploadAvailable:false, maxBase64UploadBytes:50 * 1024 * 1024, maxDirectUploadBytes:0}});
  }
  if (method === 'GET' && action === 'stream') {
    const asset = state.assets.find(item => item.id === params.id);
    if (!asset) return musicJson({ok:false, error:'asset_not_found'}, 404);
    return new Response(asset.dataBase64 ? String(asset.dataBase64).slice(0, 2048) : `SkyeMusicNexus proof stream for ${asset.id}`, {status:200, headers:{'content-type':asset.contentType || 'audio/mpeg', 'cache-control':'no-store'}});
  }
  if (method === 'GET') {
    const artistId = params.artistId || '';
    const assets = state.assets.filter(asset => !artistId || asset.artistId === artistId);
    return musicJson({ok:true, assets, total:assets.length, maxUploadBytes:50 * 1024 * 1024, storage:{mode:'worker-kv', durable:true, directUploadAvailable:false}});
  }
  if (action === 'upload' || action === 'create-upload-session') {
    const asset = {id:body.id || musicId('aud'), artistId:body.artistId || '', releaseId:body.releaseId || '', title:body.title || body.fileName || 'Untitled audio', fileName:body.fileName || 'audio-upload.mp3', contentType:body.contentType || 'audio/mpeg', bytes:Number(body.bytes || 0), status:action === 'create-upload-session' ? 'upload_session_created' : 'stored', streamUrl:`${MUSIC_BASE}/music-assets?action=stream&id=`, createdAt:musicNow(), updatedAt:musicNow()};
    asset.streamUrl += encodeURIComponent(asset.id);
    if (body.dataBase64) asset.dataBase64 = String(body.dataBase64).slice(0, 4096);
    state.assets = musicUpsert(state.assets, asset);
    if (action === 'create-upload-session') return musicJson({ok:true, asset, upload:{url:`${MUSIC_BASE}/music-assets?action=complete-upload&id=${encodeURIComponent(asset.id)}`, method:'PUT', headers:{'content-type':asset.contentType}}});
    return musicJson({ok:true, asset});
  }
  if (action === 'complete-upload') {
    const asset = state.assets.find(item => item.id === body.id || item.id === url.searchParams.get('id'));
    if (!asset) return musicJson({ok:false, error:'asset_not_found'}, 404);
    asset.status = 'stored';
    asset.bytes = Number(body.bytes || asset.bytes || 0);
    asset.updatedAt = musicNow();
    return musicJson({ok:true, asset});
  }
  if (action === 'delete') {
    const id = body.id || params.id;
    state.assets = state.assets.filter(asset => asset.id !== id);
    return musicJson({ok:true, deleted:id});
  }
  return musicJson({ok:false, error:`Unknown asset action: ${action}`}, 400);
}
async function musicHandleStudio(method, state, body) {
  if (method === 'GET') return musicJson({ok:true, ...state.studio});
  const action = body.action || 'saveProject';
  if (action === 'saveProject') {
    const source = body.project || body;
    const project = {...source, id:source.id || musicId('studio'), title:source.title || source.name || 'Untitled Studio Session', updatedAt:musicNow()};
    state.studio.projects = musicUpsert(state.studio.projects, project).slice(0, 250);
    return musicJson({ok:true, status:'STUDIO_PROJECT_SAVED', project});
  }
  if (action === 'queueExport') {
    const project = body.project || {};
    const exportJob = {id:musicId('studio_export'), projectId:project.id || body.projectId || 'unknown_project', artistId:project.artistId || body.artistId || 'unknown_artist', releaseId:project.releaseId || body.releaseId || 'unknown_release', exportTargets:body.exportTargets || ['mp3-preview','wav-master'], releaseForgeLine:body.releaseForgeLine || null, status:'queued_proof_export', boundary:'This queues an export manifest. Wire ffmpeg/audio worker for real transcoding.', createdAt:musicNow()};
    state.studio.exports.unshift(exportJob);
    return musicJson({ok:true, status:'EXPORT_MANIFEST_QUEUED', exportJob});
  }
  if (action === 'registerEngine') {
    const engine = {id:body.id || musicId('engine'), name:body.name || 'Native engine', license:body.license || '', repo:body.repo || '', mode:body.mode || '', registeredAt:musicNow()};
    state.studio.engines = musicUpsert(state.studio.engines, engine).slice(0, 50);
    return musicJson({ok:true, status:'ENGINE_REGISTERED', engine});
  }
  return musicJson({ok:false, error:`Unknown studio action: ${action}`}, 400);
}
async function musicHandleReleases(method, url, state, body, gate) {
  const params = musicReadQuery(url);
  const action = method === 'GET' ? (params.action || 'list') : musicBodyAction(body, url);
  if (method === 'GET') {
    if (action === 'get') {
      const release = state.releases.find(item => item.id === params.id);
      return musicJson(release ? {ok:true, release} : {ok:false, error:'release_not_found'}, release ? 200 : 404);
    }
    if (action === 'operations-board') return musicJson({ok:true, workflows:state.releases.filter(release => release.operationsWorkflow).map(release => ({releaseId:release.id, title:release.title, ...release.operationsWorkflow})), summary:musicAnalytics(state)});
    if (action === 'workflow-timeline') return musicJson({ok:true, events:state.releases.flatMap(release => (release.workflowTimeline || []).map(event => ({releaseId:release.id, title:release.title, ...event})))});
    if (action === 'rights-audit') {
      const rights = state.releases.map(musicReleaseSummary);
      return musicJson({ok:true, rights, summary:{total:rights.length, ready:rights.filter(item => item.status === 'preview-ready' || item.status === 'distribution-ready').length, blocked:rights.filter(item => item.playbackBlocked).length, needsClearance:rights.filter(item => item.status === 'needs-clearance').length}});
    }
    return musicJson({ok:true, releases:state.releases, total:state.releases.length});
  }
  if (action === 'submit') {
    const release = {id:body.id || musicId('rel'), artistId:body.artistId || '', title:body.title || 'Untitled Release', type:body.type || 'single', releaseDate:body.releaseDate || null, distributionTargets:Array.isArray(body.distributionTargets) ? body.distributionTargets : [], tracks:musicTrackList(body.tracks), rights:musicRights(body.rights || {}), status:'submitted', analytics:{streams:0, downloads:0, saves:0, plays:0, listenSeconds:0}, workflowTimeline:[{category:'submission', status:'submitted', note:'Release submitted for distribution review', actor:body.artistId || gate.actor, at:musicNow()}], submittedAt:musicNow(), updatedAt:musicNow()};
    state.releases = musicUpsert(state.releases, release);
    return musicJson({ok:true, release}, 201);
  }
  const release = state.releases.find(item => item.id === (body.id || params.id));
  if (!release) return musicJson({ok:false, error:'release_not_found'}, 404);
  release.workflowTimeline = Array.isArray(release.workflowTimeline) ? release.workflowTimeline : [];
  const pushEvent = (category, note) => release.workflowTimeline.push({category, status:release.status, note, actor:gate.actor, at:musicNow()});
  if (action === 'review') {
    release.status = body.decision === 'reject' ? 'rejected' : 'approved';
    release.reviewNotes = body.notes || '';
    release.reviewedAt = musicNow();
    pushEvent('review', `Review ${release.status}`);
    return musicJson({ok:true, release});
  }
  if (action === 'publish') {
    if (release.status !== 'approved') return musicJson({ok:false, error:`Release must be in "approved" status before publishing (current: "${release.status}")`}, 409);
    release.rights = musicRights({}, release.rights || {});
    if (release.rights.status !== 'distribution-ready') return musicJson({ok:false, error:'Publishing requires distribution-ready rights.'}, 409);
    release.status = 'live';
    release.publishedAt = musicNow();
    pushEvent('publish', 'Release published inside SkyeMusicNexus proof lane.');
    return musicJson({ok:true, release});
  }
  if (action === 'report-streams') {
    release.analytics = release.analytics || {};
    release.analytics.streams = Number(release.analytics.streams || 0) + Number(body.streams || 0);
    release.analytics.downloads = Number(release.analytics.downloads || 0) + Number(body.downloads || 0);
    release.analytics.saves = Number(release.analytics.saves || 0) + Number(body.saves || 0);
    pushEvent('analytics', 'Stream report recorded.');
    return musicJson({ok:true, release});
  }
  if (action === 'playback-stream') {
    const index = Number(body.trackIndex || params.trackIndex || 0) || 0;
    const tracks = musicTrackList(release.tracks);
    const track = tracks[index] || tracks[0] || {title:release.title, plays:0, listenSeconds:0};
    track.plays = Number(track.plays || 0) + 1;
    track.listenSeconds = Number(track.listenSeconds || 0) + Number(body.listenSeconds || 24);
    tracks[index] = track;
    release.tracks = tracks;
    release.analytics = release.analytics || {};
    release.analytics.plays = Number(release.analytics.plays || 0) + 1;
    release.analytics.listenSeconds = Number(release.analytics.listenSeconds || 0) + Number(body.listenSeconds || 24);
    return musicJson({ok:true, release, playback:{releaseId:release.id, trackIndex:index, title:track.title, playbackKind:track.previewUrl ? 'rights-cleared-linked-preview' : 'generated-proof-preview', plays:track.plays, at:musicNow()}});
  }
  if (action === 'update-rights') {
    release.rights = musicRights(body.rights || body, release.rights || {});
    pushEvent('rights', `Rights gate updated to ${release.rights.status}`);
    return musicJson({ok:true, release, rights:release.rights, summary:musicReleaseSummary(release)});
  }
  if (action === 'takedown-request') {
    const requestRecord = {id:musicId('takedown'), requesterEmail:body.requesterEmail || '', reason:body.reason || '', createdAt:musicNow()};
    release.rights = musicRights({playbackBlocked:true, takedownHold:true, takedownRequests:[...(release.rights?.takedownRequests || []), requestRecord]}, release.rights || {});
    if (release.status === 'live') release.status = 'takedown-review';
    pushEvent('rights', requestRecord.reason || 'Playback blocked pending operator rights review.');
    return musicJson({ok:true, release, request:requestRecord, rights:release.rights}, 202);
  }
  if (action === 'queue-operations') {
    release.operationsWorkflow = {id:musicId('ops'), status:body.status || 'queued', owner:body.owner || gate.actor || 'operator', checkpoint:body.checkpoint || 'intake', notes:body.notes || '', createdAt:musicNow(), updatedAt:musicNow()};
    pushEvent('operations', `Operations queued at ${release.operationsWorkflow.checkpoint}`);
    return musicJson({ok:true, release, workflow:release.operationsWorkflow}, 201);
  }
  if (action === 'update-operations') {
    if (!release.operationsWorkflow) return musicJson({ok:false, error:'Operations workflow has not been queued for this release'}, 409);
    Object.assign(release.operationsWorkflow, {status:body.status || release.operationsWorkflow.status, checkpoint:body.checkpoint || release.operationsWorkflow.checkpoint, notes:body.notes || release.operationsWorkflow.notes, updatedAt:musicNow()});
    pushEvent('operations', `Operations moved to ${release.operationsWorkflow.checkpoint}`);
    return musicJson({ok:true, release, workflow:release.operationsWorkflow});
  }
  return musicJson({ok:false, error:`Unknown release action: ${action}`}, 400);
}
async function musicHandleDrops(method, url, state, body, gate) {
  const params = musicReadQuery(url);
  const action = method === 'GET' ? (params.action || 'hub') : musicBodyAction(body, url);
  if (method === 'GET') {
    if (action === 'hub') return musicJson({ok:true, ...state.drops, env:{netlify:{configured:false, liveDeployEnabled:false}, privateStorage:{configured:true, mode:'worker-kv'}}});
    if (action === 'list') return musicJson({ok:true, drops:state.drops.items, total:state.drops.items.length});
    if (action === 'get') {
      const drop = state.drops.items.find(item => item.dropId === params.dropId || item.id === params.id);
      return musicJson(drop ? {ok:true, drop} : {ok:false, error:'drop_not_found'}, drop ? 200 : 404);
    }
    if (action === 'deploy-pool') return musicJson({ok:true, drops:state.drops.items.filter(drop => ['submitted','approved','queued'].includes(drop.status))});
    if (action === 'batch-preview') return musicJson({ok:true, batches:state.drops.batches});
    if (action === 'traffic-estimate') return musicJson({ok:true, estimate:{estimatedCredits:15, estimatedBandwidthGb:0.1, fitsReserve:true}});
    if (action === 'env-status') return musicJson({ok:true, env:{netlify:{configured:false, liveDeployEnabled:false}, email:{configured:false, provider:'worker-receipt'}, privateStorage:{configured:true, mode:'worker-kv'}}});
    return musicJson({ok:false, error:`Unknown drop action: ${action}`}, 400);
  }
  if (action === 'track-public-event') {
    const event = {id:musicId('drop_evt'), dropId:body.dropId || '', eventType:body.eventType || body.type || 'page_view', createdAt:musicNow()};
    state.drops.traffic.unshift(event);
    return musicJson({ok:true, event});
  }
  if (action === 'create-drop') {
    const drop = {dropId:body.dropId || musicId('drop'), artistId:body.artistId || '', artistName:body.artistName || '', releaseId:body.releaseId || '', title:body.title || 'Untitled Drop', slug:musicSlug(body.title, 'drop'), dropType:body.dropType || 'single_drop', visibility:body.visibility || 'public', rightsStatus:body.rightsStatus || 'needs-clearance', tierPolicy:body.tierPolicy || 'free99-lite', story:body.story || '', coverArtUrl:body.coverArtUrl || '', downloadAllowed:body.downloadAllowed === true, tracks:musicTrackList(body.tracks), status:'draft', createdAt:musicNow(), updatedAt:musicNow()};
    drop.id = drop.dropId;
    state.drops.items = musicUpsert(state.drops.items, drop);
    return musicJson({ok:true, drop}, 201);
  }
  const dropId = body.dropId || params.dropId || body.id;
  const drop = state.drops.items.find(item => item.dropId === dropId || item.id === dropId);
  if (['update-drop','submit-drop','hold-drop','reject-drop','revoke-private-delivery'].includes(action) && !drop) return musicJson({ok:false, error:'drop_not_found'}, 404);
  if (action === 'update-drop') {
    Object.assign(drop, body, {updatedAt:musicNow()});
    return musicJson({ok:true, drop});
  }
  if (action === 'submit-drop') {
    drop.status = 'submitted';
    drop.submittedAt = musicNow();
    return musicJson({ok:true, drop});
  }
  if (action === 'hold-drop' || action === 'reject-drop') {
    drop.status = action === 'hold-drop' ? 'blocked' : 'rejected';
    drop.updatedAt = musicNow();
    return musicJson({ok:true, drop});
  }
  if (action === 'form-batch') {
    const dropIds = Array.isArray(body.dropIds) ? body.dropIds : [];
    const batch = {batchId:body.batchId || musicId('drop_batch'), dropIds, status:'formed', estimatedCredits:dropIds.length * 15, createdAt:musicNow(), updatedAt:musicNow()};
    batch.id = batch.batchId;
    state.drops.batches = musicUpsert(state.drops.batches, batch);
    return musicJson({ok:true, batch}, 201);
  }
  const batchId = body.batchId || params.batchId;
  const batch = state.drops.batches.find(item => item.batchId === batchId || item.id === batchId);
  if (['send-approval','approve-batch','run-approval-brain','build-static-bundle','publish-batch'].includes(action) && !batch) return musicJson({ok:false, error:'batch_not_found'}, 404);
  if (action === 'send-approval') {
    const approval = {approvalId:musicId('approval'), batchId:batch.batchId, status:'sent', sentAt:musicNow(), actor:gate.actor};
    state.drops.approvals.unshift(approval);
    batch.status = 'approval_sent';
    return musicJson({ok:true, batch, approval});
  }
  if (action === 'approve-batch' || action === 'run-approval-brain') {
    batch.status = 'approved';
    batch.approvedAt = musicNow();
    batch.approvedBy = gate.actor;
    return musicJson({ok:true, batch, receipt:{approvalId:musicId('approval_receipt'), action}});
  }
  if (action === 'build-static-bundle') {
    batch.status = 'bundle_built';
    batch.outputDir = `/tmp/skymusicnexus/${batch.batchId}`;
    return musicJson({ok:true, batch, outputDir:batch.outputDir});
  }
  if (action === 'publish-batch') {
    batch.status = 'published_receipt';
    const deploy = {deployReceiptId:musicId('deploy'), batchId:batch.batchId, status:'queued_for_operator_deploy', createdAt:musicNow()};
    state.drops.deploys.unshift(deploy);
    return musicJson({ok:true, batch, deploy});
  }
  if (action === 'revoke-private-delivery') {
    drop.status = 'private_delivery_revoked';
    return musicJson({ok:true, drop});
  }
  return musicJson({ok:false, error:`Unknown drop action: ${action}`}, 400);
}
async function musicHandleExchange(method, url, state, body) {
  const action = method === 'GET' ? (url.searchParams.get('action') || 'hub') : musicBodyAction(body, url);
  if (method === 'GET' && action === 'hub') return musicJson({ok:true, gateSessionRequired:true, ...state.exchange, progress:musicExchangeProgress(state.exchange)});
  if (action === 'request-content') {
    const request = {id:musicId('content_req'), artistId:body.artistId || '', releaseId:body.releaseId || '', requestType:body.requestType || 'creative', title:body.title || 'Content request', brief:body.brief || '', budgetLane:body.budgetLane || 'free99-lite', dueAt:body.dueAt || null, threadId:musicId('thread'), status:'open', createdAt:musicNow()};
    state.exchange.contentRequests.unshift(request);
    state.exchange.threads.unshift({id:request.threadId, artistId:request.artistId, topic:request.title, messages:[], createdAt:request.createdAt});
    return musicJson({ok:true, request}, 201);
  }
  if (action === 'send-message') {
    const thread = {id:body.threadId || musicId('thread'), artistId:body.artistId || '', recipientId:body.recipientId || '', topic:body.topic || 'Artist inbox', messages:[{id:musicId('msg'), body:body.body || '', createdAt:musicNow()}], relay:{status:'stored_for_relay13_handoff'}, createdAt:musicNow()};
    state.exchange.threads = musicUpsert(state.exchange.threads, thread);
    return musicJson({ok:true, thread});
  }
  if (action === 'publish-community') {
    const post = {id:musicId('community'), artistId:body.artistId || '', linkedReleaseId:body.linkedReleaseId || '', category:body.category || 'release-moment', body:body.body || '', status:'published', createdAt:musicNow()};
    state.exchange.communityPosts.unshift(post);
    return musicJson({ok:true, post});
  }
  if (action === 'build-release-campaign') {
    const campaign = {id:musicId('campaign'), artistId:body.artistId || '', releaseId:body.releaseId || '', releaseTitle:body.releaseTitle || '', mood:body.mood || '', platforms:body.platforms || '', offerLane:body.offerLane || 'free99-lite', status:'built', createdAt:musicNow()};
    state.exchange.campaigns.unshift(campaign);
    return musicJson({ok:true, campaign});
  }
  return musicJson({ok:false, error:`Unknown exchange action: ${action}`}, 400);
}
async function musicHandleSocial(method, url, state, body) {
  const params = musicReadQuery(url);
  const action = method === 'GET' ? (params.action || 'hub') : musicBodyAction(body, url);
  if (method === 'GET') {
    if (action === 'catalog') return musicJson({ok:true, catalog:MUSIC_SOCIAL_CATALOG});
    if (action === 'feed') return musicJson({ok:true, feedItems:state.social.feedItems.filter(item => !params.artistId || item.artistId === params.artistId), stories:state.social.stories, generatedAt:musicNow()});
    return musicJson({ok:true, gateSessionRequired:true, catalog:MUSIC_SOCIAL_CATALOG, ...state.social, summary:musicSocialSummary(state.social)});
  }
  if (action === 'save-connector') {
    const connector = {id:body.id || musicId('connector'), platform:body.platform || 'mastodon', platformName:body.name || body.platform || 'Open social connector', instanceUrl:body.instanceUrl || '', handle:body.handle || '', tokenEnvKey:body.tokenEnvKey || '', readTokenEnvKey:body.readTokenEnvKey || '', defaultVisibility:body.defaultVisibility || 'unlisted', tokenStatus:body.tokenEnvKey ? 'env-key-set' : 'provider-token-required', createdAt:musicNow(), updatedAt:musicNow()};
    state.social.connectors = musicUpsert(state.social.connectors, connector);
    return musicJson({ok:true, connector});
  }
  if (action === 'create-feed-post') {
    const post = {id:body.id || musicId('feed'), artistId:body.artistId || '', releaseId:body.releaseId || '', caption:body.caption || '', hashtags:body.hashtags || '', mediaUrl:body.mediaUrl || '', altText:body.altText || '', visibility:body.visibility || 'local-feed', status:'published', stats:{likes:0, saves:0, boosts:0, comments:[]}, createdAt:musicNow(), updatedAt:musicNow()};
    state.social.feedItems.unshift(post);
    return musicJson({ok:true, post}, 201);
  }
  if (action === 'queue-post') {
    const post = {id:body.id || musicId('social_post'), connectorId:body.connectorId || '', artistId:body.artistId || '', releaseId:body.releaseId || '', caption:body.caption || '', hashtags:body.hashtags || '', mediaUrl:body.mediaUrl || '', altText:body.altText || '', visibility:body.visibility || 'unlisted', language:body.language || 'en', platform:'open-social', status:'queued', createdAt:musicNow(), updatedAt:musicNow()};
    state.social.postQueue.unshift(post);
    return musicJson({ok:true, post}, 201);
  }
  if (action === 'publish-post') {
    const post = state.social.postQueue.find(item => item.id === body.postId);
    if (!post) return musicJson({ok:false, error:'post_not_found'}, 404);
    const connector = state.social.connectors.find(item => item.id === post.connectorId);
    post.status = connector?.tokenStatus === 'env-key-set' ? 'published' : 'provider-token-required';
    post.publishedAt = post.status === 'published' ? musicNow() : null;
    return musicJson({ok:true, post, publication:{ok:post.status === 'published', statusUrl:post.status === 'published' ? `local://skymusicnexus/social/${post.id}` : '', tokenEnvKey:connector?.tokenEnvKey || '', note:post.status === 'published' ? 'Published through configured connector boundary.' : 'Attach provider token env to publish.'}});
  }
  if (action === 'sync-feed') {
    const pull = {id:musicId('feed_pull'), connectorId:body.connectorId || '', artistId:body.artistId || '', hashtag:body.hashtag || '', statusCount:Number(body.limit || 3), sourceUrl:body.hashtag ? `#${body.hashtag}` : 'worker-feed-proof', createdAt:musicNow()};
    state.social.feedPulls.unshift(pull);
    return musicJson({ok:true, pull});
  }
  if (action === 'moderate-post') {
    const moderation = {id:musicId('mod'), targetId:body.targetId || body.postId || '', status:body.status || 'reviewed', note:body.note || '', createdAt:musicNow()};
    state.social.moderation.unshift(moderation);
    return musicJson({ok:true, moderation});
  }
  if (action === 'feed-action') {
    const post = state.social.feedItems.find(item => item.id === body.targetId) || state.social.feedItems[0];
    if (!post) return musicJson({ok:false, error:'feed_post_not_found'}, 404);
    post.stats = post.stats || {likes:0, saves:0, boosts:0, comments:[]};
    if (body.feedAction === 'comment') post.stats.comments.push({id:musicId('comment'), artistId:body.artistId || '', body:body.body || '', createdAt:musicNow()});
    if (body.feedAction === 'like') post.stats.likes += 1;
    if (body.feedAction === 'save') post.stats.saves += 1;
    if (body.feedAction === 'boost') post.stats.boosts += 1;
    return musicJson({ok:true, post});
  }
  return musicJson({ok:false, error:`Unknown social action: ${action}`}, 400);
}
async function musicHandlePayments(method, url, state, body) {
  const action = method === 'GET' ? (url.searchParams.get('action') || '') : musicBodyAction(body, url);
  if (method === 'GET' && action === 'ledger') return musicJson({ok:true, ledger:state.payments.ledger});
  if (method === 'GET' && action === 'payouts') return musicJson({ok:true, payouts:state.payments.payouts});
  if (action === 'credit') {
    const entry = {id:musicId('credit'), artistId:body.artistId || '', amount:Number(body.amount || 0), reason:body.reason || '', referenceId:body.referenceId || '', createdAt:musicNow()};
    state.payments.ledger.unshift(entry);
    const balance = state.payments.ledger.filter(item => item.artistId === entry.artistId).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return musicJson({ok:true, entry, balance});
  }
  if (action === 'payout') {
    const payout = {id:body.payoutId || musicId('payout'), artistId:body.artistId || '', amount:Number(body.amount || 0), status:'pending', createdAt:musicNow(), updatedAt:musicNow()};
    state.payments.payouts.unshift(payout);
    return musicJson({ok:true, payout});
  }
  if (action === 'complete-payout') {
    const payout = state.payments.payouts.find(item => item.id === body.payoutId);
    if (!payout) return musicJson({ok:false, error:'payout_not_found'}, 404);
    payout.status = 'completed';
    payout.completedAt = musicNow();
    payout.updatedAt = payout.completedAt;
    return musicJson({ok:true, payout});
  }
  return musicJson({ok:false, error:`Unknown payment action: ${action}`}, 400);
}
async function musicHandleFunction(request, env, url, fnName) {
  const method = request.method.toUpperCase();
  const body = method === 'GET' ? {} : await readJson(request);
  const action = musicBodyAction(body, url);
  const access = await requireMusicAccess(request, env, fnName, action || (method === 'GET' ? (url.searchParams.get('action') || '') : ''));
  if (!access.ok) return access.response;
  if (method !== 'GET' && !musicKv(env)) return musicStorageRequired();
  const state = await musicReadState(env);
  let response;
  if (fnName === 'music-artists') response = await musicHandleArtists(method, url, state, body, access);
  else if (fnName === 'music-assets') response = await musicHandleAssets(method, url, state, body, access);
  else if (fnName === 'music-studio') response = await musicHandleStudio(method, state, body, access);
  else if (fnName === 'music-releases') response = await musicHandleReleases(method, url, state, body, access);
  else if (fnName === 'music-drops') response = await musicHandleDrops(method, url, state, body, access);
  else if (fnName === 'music-exchange') response = await musicHandleExchange(method, url, state, body, access);
  else if (fnName === 'music-social') response = await musicHandleSocial(method, url, state, body, access);
  else if (fnName === 'music-payments') response = await musicHandlePayments(method, url, state, body, access);
  else if (fnName === 'music-analytics') response = method === 'GET' ? musicJson({ok:true, ...musicAnalytics(state)}) : musicJson({ok:false, error:'Method not allowed'}, 405);
  else if (fnName === 'music-provider-hooks') response = musicJson({ok:true, hooks:[], providerBoundary:'Configure dedicated provider credentials before live music provider webhooks.'});
  else response = musicJson({ok:false, error:'skymusicnexus_function_not_found', fnName}, 404);
  if (method !== 'GET' && response.status < 400) await musicWriteState(env, state);
  return response;
}
async function musicHandleRoute(request, env, url) {
  const method = request.method.toUpperCase();
  const path = (url.pathname === MUSIC_BASE ? '/' : url.pathname.slice(MUSIC_BASE.length)) || '/';
  if (method === 'OPTIONS') return musicJson({ok:true});
  if (path === '/' || path === '/health') return musicJson({...appHealth(APP_API_MOUNTS.find(mount => mount.id === 'skymusicnexus'), env), ok:true, mounted:true}, 200);
  if (path === '/manifest' || path === '/routes/manifest') return musicJson({ok:true, base:MUSIC_BASE, functions:MUSIC_FUNCTIONS, storage_mode:musicStorageMode(env), rules:['SkyeMusicNexus browser rooms must call /api/skymusicnexus/{function}.','Netlify function source remains private static source.','Free99 removes price, not the SkyGate/session boundary.']});
  if (path === '/hub') {
    const gate = await requireMusicGate(request, env, 'SkyeMusicNexus hub');
    if (!gate.ok) return gate.response;
    return musicJson(musicHubEnvelope(await musicReadState(env)));
  }
  if (path === '/skygate-session') return musicHandleSession(request, env);
  const fnName = path.replace(/^\/+/, '').split('/')[0];
  if (!MUSIC_FUNCTIONS.includes(fnName)) return musicJson({ok:false, error:'skymusicnexus_route_not_found', path, manifest:`${MUSIC_BASE}/routes/manifest`}, 404);
  return musicHandleFunction(request, env, url, fnName);
}

const SD_BASE = '/api/sovereigndocs';
const SD_KEY_PREFIX = 'sovereigndocs:v1:';
const SD_TEMPLATES = [
  { id:'sd_tpl_operating_agreement_az', title:'Arizona LLC Operating Agreement', jurisdiction:'US-AZ', risk_level:'low', category:'business_formation' },
  { id:'sd_tpl_contractor_agreement', title:'Independent Contractor Agreement', jurisdiction:'US', risk_level:'medium', category:'contracts' },
  { id:'sd_tpl_partner_review_packet', title:'Partner Review Packet', jurisdiction:'US', risk_level:'medium', category:'review' },
  { id:'sd_tpl_annual_report_checklist', title:'Annual Report Compliance Checklist', jurisdiction:'US', risk_level:'low', category:'compliance' }
];
const SD_BLUEPRINTS = [
  { id:'business_formation', title:'Business formation intake', category:'formation', defaultJurisdiction:'US-AZ' },
  { id:'contract_review', title:'Contract review intake', category:'contracts', defaultJurisdiction:'US' },
  { id:'compliance_calendar', title:'Compliance calendar intake', category:'compliance', defaultJurisdiction:'US-AZ' }
];

function sdKv(env) {
  return env.SOVEREIGNDOCS_KV || env.SITE_EVENTS_KV || null;
}
function sdStorageMode(env) {
  if (env.SOVEREIGNDOCS_DB) return 'd1';
  if (sdKv(env)) return 'kv';
  return 'not_configured';
}
function sdId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function sdNow() {
  return new Date().toISOString();
}
function sdKey(name) {
  return `${SD_KEY_PREFIX}${name}`;
}
async function sdGet(env, name, fallback = []) {
  const kv = sdKv(env);
  if (!kv) return fallback;
  return await kv.get(sdKey(name), {type:'json'}).catch(() => null) || fallback;
}
async function sdPut(env, name, value) {
  const kv = sdKv(env);
  if (!kv) return false;
  await kv.put(sdKey(name), JSON.stringify(value));
  return true;
}
function sdNeedsStorage(env) {
  if (sdKv(env)) return null;
  return json({
    ok:false,
    error:'sovereigndocs_storage_not_configured',
    storage_mode:sdStorageMode(env),
    message:'SovereignDocs workflow mutations require SOVEREIGNDOCS_KV or SITE_EVENTS_KV.'
  }, 503);
}
function sdTemplateById(id) {
  return SD_TEMPLATES.find(template => template.id === id) || { id, title:id, jurisdiction:'US', risk_level:'medium', category:'custom' };
}
function sdPublicCase(c, docs = [], packet = null) {
  return {
    id:c.id,
    title:c.title,
    caseType:c.caseType,
    status:c.status,
    updatedAt:c.updatedAt || c.createdAt,
    createdAt:c.createdAt,
    templateCount:(c.templateIds || []).length,
    documentCount:docs.filter(doc => doc.caseId === c.id).length,
    packetId:c.packetId || packet?.id || null,
    riskSummary:c.riskSummary || {},
    owner:c.owner || { orgId:'metraiyux-0s' }
  };
}
async function sdAllState(env) {
  const [cases, documents, packets, reminders, reviews, notes, artifacts, handoffs, returns, intakes] = await Promise.all([
    sdGet(env, 'cases'),
    sdGet(env, 'documents'),
    sdGet(env, 'packets'),
    sdGet(env, 'reminders'),
    sdGet(env, 'reviews'),
    sdGet(env, 'notes'),
    sdGet(env, 'artifacts'),
    sdGet(env, 'handoffs'),
    sdGet(env, 'returns'),
    sdGet(env, 'intakes')
  ]);
  return {cases, documents, packets, reminders, reviews, notes, artifacts, handoffs, returns, intakes};
}
async function sdDashboard(env) {
  const state = await sdAllState(env);
  const activeCases = state.cases.filter(item => !['completed','closed','archived'].includes(String(item.status || '').toLowerCase()));
  const actionNeeded = [
    ...state.reviews.filter(item => !String(item.status || '').includes('returned')).map(item => ({type:'review', label:item.title || item.id, href:'/Free99/apps/sovereigndocs/partner-workbench/'})),
    ...state.reminders.filter(item => item.status !== 'completed').map(item => ({type:'reminder', label:item.title || item.id, href:'/Free99/apps/sovereigndocs/reminders/'}))
  ].slice(0, 20);
  return {
    ok:true,
    storage_mode:sdStorageMode(env),
    counts:{
      cases:state.cases.length,
      activeCases:activeCases.length,
      documents:state.documents.length,
      packets:state.packets.length,
      reminders:state.reminders.length,
      partnerReviews:state.reviews.length,
      intakes:state.intakes.length
    },
    panels:{
      cases:state.cases.map(c => sdPublicCase(c, state.documents, state.packets.find(p => p.id === c.packetId))).slice(-50).reverse(),
      documents:state.documents.slice(-50).reverse(),
      reminders:state.reminders.slice(-50).reverse(),
      partnerReviews:state.reviews.slice(-50).reverse()
    },
    actionNeeded
  };
}
function sdCaseTimeline(c, state) {
  const rows = [
    {type:'case', label:'Case created', status:c.status, at:c.createdAt, title:c.title},
    ...state.documents.filter(doc => doc.caseId === c.id).map(doc => ({type:'document', label:'Document', status:doc.status, at:doc.updatedAt || doc.createdAt, title:doc.title})),
    ...state.packets.filter(packet => packet.caseId === c.id || packet.id === c.packetId).map(packet => ({type:'packet', label:'Packet', status:packet.status, at:packet.updatedAt || packet.createdAt, title:packet.title})),
    ...state.reviews.filter(review => review.caseId === c.id).map(review => ({type:'review', label:'Partner review', status:review.status, at:review.updatedAt || review.createdAt, title:review.title})),
    ...state.notes.filter(note => note.caseId === c.id).map(note => ({type:'note', label:note.noteType, status:note.visibility, at:note.createdAt, title:note.body})),
    ...state.artifacts.filter(artifact => artifact.caseId === c.id).map(artifact => ({type:'artifact', label:artifact.artifactType, status:'attached', at:artifact.createdAt, title:artifact.title}))
  ];
  return rows.sort((a,b) => String(a.at || '').localeCompare(String(b.at || '')));
}
async function sdCreateCase(env, payload) {
  const blocked = sdNeedsStorage(env);
  if (blocked) return blocked;
  const state = await sdAllState(env);
  const createdAt = sdNow();
  const templateIds = Array.isArray(payload.templateIds) ? payload.templateIds : [];
  const templates = templateIds.length ? templateIds.map(sdTemplateById) : [SD_TEMPLATES[0]];
  const caseId = sdId('sd_case');
  const documents = templates.map(template => ({
    id:sdId('sd_doc'),
    caseId,
    templateId:template.id,
    title:template.title,
    status:'draft_ready',
    riskLevel:template.risk_level,
    createdAt,
    updatedAt:createdAt
  }));
  const packet = payload.createPacket || templates.length > 1 ? {
    id:sdId('sd_packet'),
    caseId,
    title:`${payload.title || 'SovereignDocs'} packet`,
    templateIds:templates.map(t => t.id),
    documentIds:documents.map(doc => doc.id),
    status:'assembled',
    createdAt,
    updatedAt:createdAt
  } : null;
  const c = {
    id:caseId,
    title:payload.title || 'SovereignDocs Case',
    caseType:payload.caseType || 'document_packet_to_skye_docx_max',
    templateIds:templates.map(t => t.id),
    documentIds:documents.map(doc => doc.id),
    packetId:packet?.id || null,
    status:'case_opened',
    riskSummary:{ high:templates.filter(t => t.risk_level === 'high').length, medium:templates.filter(t => t.risk_level === 'medium').length, low:templates.filter(t => t.risk_level === 'low').length },
    owner:{ orgId:payload.orgId || 'metraiyux-0s', actor:payload.actor || 'operator' },
    createdAt,
    updatedAt:createdAt
  };
  state.cases.push(c);
  state.documents.push(...documents);
  if (packet) state.packets.push(packet);
  let review = null;
  if (payload.submitForPartnerReview) {
    review = { id:sdId('sd_review'), caseId, title:c.title, status:'partner_review_pending', riskLevel:templates.some(t => t.risk_level !== 'low') ? 'medium' : 'low', createdAt, updatedAt:createdAt };
    state.reviews.push(review);
  }
  await Promise.all([
    sdPut(env, 'cases', state.cases),
    sdPut(env, 'documents', state.documents),
    sdPut(env, 'packets', state.packets),
    sdPut(env, 'reviews', state.reviews)
  ]);
  return json({ok:true, case:c, documents, packet, review, launchUrl:`/Free99/apps/sovereigndocs/case-command-center/?case=${encodeURIComponent(caseId)}`, storage_mode:sdStorageMode(env)});
}
async function sdHandleSovereignDocsRoute(request, env, ctx, url) {
  const method = request.method.toUpperCase();
  const path = (url.pathname === SD_BASE ? '/' : url.pathname.slice(SD_BASE.length)) || '/';
  if (method === 'OPTIONS') return json({ok:true});
  if (path === '/' || path === '/health') return json({...appHealth(APP_API_MOUNTS.find(mount => mount.id === 'sovereigndocs'), env), storage_mode:sdStorageMode(env)}, 200);
  if (path === '/routes/manifest') return json({ok:true, modules:[{name:'sovereigndocs-0s-adapter', area:'core_workflows', routes:['GET /health','GET /v18/workspace/dashboard','POST /cases/start','POST /packets/assemble','POST /reminders','POST /v18/cases/:id/open-in-skye-docx-max','GET /v18/cases/:id/closure-summary']}], storage_mode:sdStorageMode(env)});
  if (path === '/templates/search' && method === 'GET') {
    const risk = url.searchParams.get('risk');
    const jurisdiction = url.searchParams.get('jurisdiction') || url.searchParams.get('state');
    const limit = Math.min(100, Number(url.searchParams.get('limit') || url.searchParams.get('pageSize') || 20));
    const items = SD_TEMPLATES
      .filter(t => !risk || t.risk_level === risk)
      .filter(t => !jurisdiction || t.jurisdiction === jurisdiction || t.jurisdiction === 'US')
      .slice(0, limit);
    return json({ok:true, count:items.length, items});
  }
  if ((path === '/workspace/summary' || path === '/v18/workspace/dashboard') && method === 'GET') return json(await sdDashboard(env));
  if (path === '/cases' && method === 'GET') {
    const state = await sdAllState(env);
    return json({ok:true, storage_mode:sdStorageMode(env), count:state.cases.length, items:state.cases.map(c => sdPublicCase(c, state.documents, state.packets.find(p => p.id === c.packetId))).reverse()});
  }
  if (path === '/cases/start' && method === 'POST') return sdCreateCase(env, await readJson(request));
  if (path === '/packets/assemble' && method === 'POST') {
    const blocked = sdNeedsStorage(env);
    if (blocked) return blocked;
    const payload = await readJson(request);
    const packets = await sdGet(env, 'packets');
    const templates = (payload.templateIds || []).map(sdTemplateById);
    const createdAt = sdNow();
    const packet = {id:sdId('sd_packet'), title:payload.title || 'SovereignDocs Packet', templateIds:templates.map(t => t.id), status:'assembled', createdAt, updatedAt:createdAt, documents:templates.map(t => ({templateId:t.id, title:t.title, riskLevel:t.risk_level}))};
    packets.push(packet);
    await sdPut(env, 'packets', packets);
    return json({ok:true, packet, storage_mode:sdStorageMode(env)});
  }
  if (path === '/reminders' && method === 'GET') return json({ok:true, items:await sdGet(env, 'reminders'), storage_mode:sdStorageMode(env)});
  if (path === '/reminders' && method === 'POST') {
    const blocked = sdNeedsStorage(env);
    if (blocked) return blocked;
    const payload = await readJson(request);
    const reminders = await sdGet(env, 'reminders');
    const reminder = {id:sdId('sd_reminder'), title:payload.title || 'Reminder', dueDate:payload.dueDate || null, sourceType:payload.sourceType || 'manual', jurisdiction:payload.jurisdiction || null, note:payload.note || '', status:'open', createdAt:sdNow(), updatedAt:sdNow()};
    reminders.push(reminder);
    await sdPut(env, 'reminders', reminders);
    return json({ok:true, reminder, items:reminders, storage_mode:sdStorageMode(env)});
  }
  const reminderTransition = path.match(/^\/reminders\/([^/]+)\/transition$/);
  if (reminderTransition && method === 'POST') {
    const payload = await readJson(request);
    const reminders = await sdGet(env, 'reminders');
    const reminder = reminders.find(item => item.id === decodeURIComponent(reminderTransition[1]));
    if (!reminder) return json({ok:false, error:'reminder_not_found'}, 404);
    reminder.status = payload.status || 'completed';
    reminder.note = payload.note || reminder.note || '';
    reminder.updatedAt = sdNow();
    await sdPut(env, 'reminders', reminders);
    return json({ok:true, reminder, items:reminders});
  }
  if (path === '/legal-review/submissions' && method === 'GET') return json({ok:true, items:await sdGet(env, 'reviews'), storage_mode:sdStorageMode(env)});
  const reviewAction = path.match(/^\/legal-review\/submissions\/([^/]+)\/(route|partner-update)$/);
  if (reviewAction && method === 'POST') {
    const payload = await readJson(request);
    const reviews = await sdGet(env, 'reviews');
    const review = reviews.find(item => item.id === decodeURIComponent(reviewAction[1]));
    if (!review) return json({ok:false, error:'review_not_found'}, 404);
    review.status = reviewAction[2] === 'route' ? 'partner_review_routed' : (payload.status || 'partner_review_returned');
    review.partnerId = payload.partnerId || review.partnerId || null;
    review.note = payload.note || payload.routingNote || '';
    review.updatedAt = sdNow();
    await sdPut(env, 'reviews', reviews);
    return json({ok:true, review, items:reviews});
  }
  if (path === '/intake/blueprints' && method === 'GET') return json({ok:true, blueprints:SD_BLUEPRINTS});
  if ((path === '/intake/start' || path === '/case-intakes') && method === 'POST') {
    const blocked = sdNeedsStorage(env);
    if (blocked) return blocked;
    const payload = await readJson(request);
    const intakes = await sdGet(env, 'intakes');
    const intake = {id:sdId('sd_intake'), title:payload.title || 'SovereignDocs Intake', intakeType:payload.intakeType || payload.category || 'general', jurisdiction:payload.jurisdiction || 'US', facts:payload.facts || {}, status:'intake_pending_review', riskFlags:[], createdAt:sdNow(), updatedAt:sdNow()};
    intakes.push(intake);
    await sdPut(env, 'intakes', intakes);
    return json({ok:true, intake, items:intakes, storage_mode:sdStorageMode(env)});
  }
  if (path === '/case-intakes' && method === 'GET') return json({ok:true, items:await sdGet(env, 'intakes'), storage_mode:sdStorageMode(env)});
  const convertIntake = path.match(/^\/case-intakes\/([^/]+)\/convert-to-case$/);
  if (convertIntake && method === 'POST') {
    const intakes = await sdGet(env, 'intakes');
    const intake = intakes.find(item => item.id === decodeURIComponent(convertIntake[1]));
    if (!intake) return json({ok:false, error:'intake_not_found'}, 404);
    const response = await sdCreateCase(env, {title:intake.title, caseType:intake.intakeType, templateIds:[SD_TEMPLATES[0].id], createPacket:true});
    intake.status = 'converted_to_case';
    intake.updatedAt = sdNow();
    await sdPut(env, 'intakes', intakes);
    return response;
  }
  const caseState = path.match(/^\/v18\/cases\/([^/]+)\/state$/);
  if (caseState && method === 'GET') {
    const state = await sdAllState(env);
    const c = state.cases.find(item => item.id === decodeURIComponent(caseState[1]));
    if (!c) return json({ok:false, error:'case_not_found'}, 404);
    const packet = state.packets.find(item => item.id === c.packetId) || null;
    return json({ok:true, scope:{orgId:c.owner?.orgId || 'metraiyux-0s'}, case:c, documents:state.documents.filter(doc => doc.caseId === c.id), packet, handoffs:state.handoffs.filter(item => item.caseId === c.id), returns:state.returns.filter(item => item.caseId === c.id), notes:state.notes.filter(item => item.caseId === c.id), artifacts:state.artifacts.filter(item => item.caseId === c.id), timeline:{items:sdCaseTimeline(c, state)}, storage_mode:sdStorageMode(env)});
  }
  const casePatch = path.match(/^\/v18\/cases\/([^/]+)$/);
  if (casePatch && method === 'PATCH') {
    const payload = await readJson(request);
    const cases = await sdGet(env, 'cases');
    const c = cases.find(item => item.id === decodeURIComponent(casePatch[1]));
    if (!c) return json({ok:false, error:'case_not_found'}, 404);
    c.status = payload.status || c.status;
    c.note = payload.note || c.note || '';
    c.updatedAt = sdNow();
    await sdPut(env, 'cases', cases);
    return json({ok:true, case:c});
  }
  const advanceCase = path.match(/^\/cases\/([^/]+)\/advance$/);
  if (advanceCase && method === 'POST') {
    const payload = await readJson(request);
    const cases = await sdGet(env, 'cases');
    const c = cases.find(item => item.id === decodeURIComponent(advanceCase[1]));
    if (!c) return json({ok:false, error:'case_not_found'}, 404);
    c.status = payload.status || 'advanced';
    c.note = payload.note || c.note || '';
    c.updatedAt = sdNow();
    await sdPut(env, 'cases', cases);
    return json({ok:true, case:c});
  }
  const openSkye = path.match(/^\/(?:v18\/)?cases\/([^/]+)\/open-in-skye-docx-max$/);
  if (openSkye && method === 'POST') {
    const state = await sdAllState(env);
    const c = state.cases.find(item => item.id === decodeURIComponent(openSkye[1]));
    if (!c) return json({ok:false, error:'case_not_found'}, 404);
    const handoff = {id:sdId('sd_handoff'), caseId:c.id, title:c.title, status:'handoff_created', markdown:`# ${c.title}\n\nGoverned SovereignDocs draft.`, createdAt:sdNow(), launchUrl:`/Free99/apps/sovereigndocs/skye-docx-max/app/?sd_handoff=`};
    handoff.launchUrl += encodeURIComponent(handoff.id);
    state.handoffs.push(handoff);
    await sdPut(env, 'handoffs', state.handoffs);
    return json({ok:true, handoff, launchUrl:handoff.launchUrl});
  }
  if (path === '/editor/skye-docx-max/config' && method === 'GET') return json({ok:true, editor:'skye-docx-max', storage_mode:sdStorageMode(env), returnEndpoint:`${SD_BASE}/editor/skye-docx-max/return`});
  if (path === '/editor/skye-docx-max/session' && method === 'POST') {
    const blocked = sdNeedsStorage(env);
    if (blocked) return blocked;
    const payload = await readJson(request);
    const handoffs = await sdGet(env, 'handoffs');
    const handoff = {id:sdId('sd_handoff'), title:payload.title || 'SovereignDocs Document', markdown:payload.markdown || '', html:payload.html || '', metadata:payload.metadata || {}, status:'standalone_handoff_created', createdAt:sdNow(), launchUrl:`/Free99/apps/sovereigndocs/skye-docx-max/app/?sd_handoff=`};
    handoff.launchUrl += encodeURIComponent(handoff.id);
    handoffs.push(handoff);
    await sdPut(env, 'handoffs', handoffs);
    return json({ok:true, handoff, launchUrl:handoff.launchUrl});
  }
  const handoffMap = path.match(/^\/v18\/editor\/skye-docx-max\/handoff\/([^/]+)\/map$/);
  const handoffSession = path.match(/^\/editor\/skye-docx-max\/session\/([^/]+)$/);
  if ((handoffMap || handoffSession) && method === 'GET') {
    const id = decodeURIComponent((handoffMap || handoffSession)[1]);
    const state = await sdAllState(env);
    const handoff = state.handoffs.find(item => item.id === id);
    if (!handoff) return json({ok:false, error:'handoff_not_found'}, 404);
    return json({ok:true, handoff, caseContext:{caseId:handoff.caseId || null}, returnContract:{endpoint:`${SD_BASE}/v18/editor/skye-docx-max/return-to-case`, required:['handoffId','html or text']}});
  }
  const handoffOpened = path.match(/^\/editor\/skye-docx-max\/session\/([^/]+)\/opened$/);
  if (handoffOpened && method === 'POST') {
    const payload = await readJson(request);
    const handoffs = await sdGet(env, 'handoffs');
    const handoff = handoffs.find(item => item.id === decodeURIComponent(handoffOpened[1]));
    if (!handoff) return json({ok:false, error:'handoff_not_found'}, 404);
    handoff.status = 'opened_in_skye_docx_max';
    handoff.activeDocId = payload.activeDocId || null;
    handoff.updatedAt = sdNow();
    await sdPut(env, 'handoffs', handoffs);
    return json({ok:true, handoff});
  }
  if ((path === '/editor/skye-docx-max/return' || path === '/v18/editor/skye-docx-max/return-to-case') && method === 'POST') {
    const blocked = sdNeedsStorage(env);
    if (blocked) return blocked;
    const payload = await readJson(request);
    const state = await sdAllState(env);
    const handoff = state.handoffs.find(item => item.id === payload.handoffId);
    if (!handoff) return json({ok:false, error:'handoff_not_found'}, 404);
    const returned = {id:sdId('sd_return'), handoffId:handoff.id, caseId:handoff.caseId || null, title:payload.title || handoff.title, html:payload.html || '', text:payload.text || '', createdAt:sdNow()};
    state.returns.push(returned);
    if (returned.caseId) {
      const doc = {id:sdId('sd_doc'), caseId:returned.caseId, title:returned.title, status:'returned_from_skye_docx_max', riskLevel:'medium', createdAt:returned.createdAt, updatedAt:returned.createdAt, returnId:returned.id};
      state.documents.push(doc);
      const c = state.cases.find(item => item.id === returned.caseId);
      if (c) { c.status = 'returned_from_skye_docx_max'; c.updatedAt = returned.createdAt; c.documentIds = [...new Set([...(c.documentIds || []), doc.id])]; }
    }
    await Promise.all([sdPut(env, 'returns', state.returns), sdPut(env, 'documents', state.documents), sdPut(env, 'cases', state.cases)]);
    return json({ok:true, returned, case:state.cases.find(item => item.id === returned.caseId) || null});
  }
  const closureSummary = path.match(/^\/v18\/cases\/([^/]+)\/closure-summary$/);
  if (closureSummary && method === 'GET') {
    const state = await sdAllState(env);
    const c = state.cases.find(item => item.id === decodeURIComponent(closureSummary[1]));
    if (!c) return json({ok:false, error:'case_not_found'}, 404);
    const documents = state.documents.filter(doc => doc.caseId === c.id);
    return json({ok:true, case:c, exportBundle:{case:c, documents, timeline:sdCaseTimeline(c, state)}, partnerPacket:{markdown:`# Partner Packet\n\nCase: ${c.title}\nStatus: ${c.status}\nDocuments: ${documents.length}`}, storage_mode:sdStorageMode(env)});
  }
  const caseSubresource = path.match(/^\/cases\/([^/]+)\/(timeline|client-status|partner-packet|export-bundle|notes|artifacts)$/);
  if (caseSubresource) {
    const caseId = decodeURIComponent(caseSubresource[1]);
    const resource = caseSubresource[2];
    const state = await sdAllState(env);
    const c = state.cases.find(item => item.id === caseId);
    if (!c) return json({ok:false, error:'case_not_found'}, 404);
    if (resource === 'timeline' && method === 'GET') return json({ok:true, items:sdCaseTimeline(c, state)});
    if (resource === 'client-status' && method === 'GET') return json({ok:true, case:c, progress:{percent:c.status === 'completed' ? 100 : 65}, nextClientAction:c.status === 'completed' ? 'Download closure packet.' : 'Review current draft status.', steps:sdCaseTimeline(c, state)});
    if (resource === 'partner-packet' && method === 'GET') return json({ok:true, markdown:`# Partner Packet\n\n${c.title}\n\nStatus: ${c.status}`});
    if (resource === 'export-bundle' && method === 'GET') return json({ok:true, bundle:{case:c, documents:state.documents.filter(doc => doc.caseId === c.id), notes:state.notes.filter(note => note.caseId === c.id), artifacts:state.artifacts.filter(artifact => artifact.caseId === c.id)}});
    if (resource === 'notes' && method === 'GET') return json({ok:true, items:state.notes.filter(note => note.caseId === c.id)});
    if (resource === 'artifacts' && method === 'GET') return json({ok:true, items:state.artifacts.filter(artifact => artifact.caseId === c.id)});
    if ((resource === 'notes' || resource === 'artifacts') && method === 'POST') {
      const payload = await readJson(request);
      const collection = resource === 'notes' ? state.notes : state.artifacts;
      const item = resource === 'notes'
        ? {id:sdId('sd_note'), caseId:c.id, visibility:payload.visibility || 'internal', noteType:payload.noteType || 'operator_note', body:payload.body || '', createdAt:sdNow()}
        : {id:sdId('sd_artifact'), caseId:c.id, title:payload.title || 'Artifact', filename:payload.filename || '', artifactType:payload.artifactType || 'metadata', createdAt:sdNow()};
      collection.push(item);
      await sdPut(env, resource, collection);
      return json({ok:true, [resource === 'notes' ? 'note' : 'artifact']:item, items:collection.filter(row => row.caseId === c.id)});
    }
  }
  if (path === '/work-queues' && method === 'GET') {
    const state = await sdAllState(env);
    return json({ok:true, storage_mode:sdStorageMode(env), queues:{
      intakes:{count:state.intakes.length, items:state.intakes.slice(-10).reverse()},
      activeCases:{count:state.cases.filter(item => item.status !== 'completed').length, items:state.cases.filter(item => item.status !== 'completed').slice(-10).reverse()},
      partnerReview:{count:state.reviews.length, items:state.reviews.slice(-10).reverse()},
      reminders:{count:state.reminders.filter(item => item.status !== 'completed').length, items:state.reminders.filter(item => item.status !== 'completed').slice(-10).reverse()},
      packets:{count:state.packets.length, items:state.packets.slice(-10).reverse()}
    }});
  }
  return json({ok:false, error:'sovereigndocs_route_not_found', path, manifest:`${SD_BASE}/routes/manifest`}, 404);
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
  /(^|\/)(?:server|src|scripts|smoke)(?:\/|$)/i,
  /(^|\/)\.(?:gitignore|npmrc|nvmrc|node-version)$/i,
  /(^|\/)\.?netlify\/functions(?:\/|$)/i,
  /(^|\/)netlify\.toml$/i,
  /(^|\/)_(?:headers|redirects)$/i,
  /(^|\/)runtime\/local-runtime(?:\.[cm]?js)?$/i,
  /(^|\/)runtime\/store\.json$/i,
  /(^|\/)runtime\/(?:data|db|storage|state)(?:\/|$)/i,
  /(^|\/)MCP_TOOLING_RECEIPT\.(?:json|md)$/i,
  /(^|\/)package(?:-lock)?\.json$/i,
  /(^|\/)(?:pnpm-lock\.yaml|yarn\.lock|bun\.lockb|bun\.lock|npm-shrinkwrap\.json)$/i,
  /(^|\/)(?:vite\.config|rollup\.config|webpack\.config|postcss\.config|tailwind\.config)\.[cm]?js$/i,
  /(^|\/)tsconfig(?:\.[^/]+)?\.json$/i,
  /^\/wrangler(?:\.[^/]+)?\.toml$/i,
  /^\/_(?:headers|redirects)$/i,
  /\/wrangler(?:\.[^/]+)?\.toml$/i,
  /\/migrations\/[^/]+\.(?:sql|js)$/i,
  /\/schema\.sql$/i,
  /\/README(?:_[^/]+)?\.md$/i,
  /(^|\/)(?:private|internal|secret|secrets|token|tokens|session|sessions|ledger|events|tasks|customers|platform-db)\.(?:json|jsonl|ndjson|db|sqlite|sqlite3)$/i
];
const PUBLIC_LIVE_PATHS = [
  /^\/live\/connectlog-relay13-operator-proof(?:\.html)?$/i,
  /^\/live\/relay13-chat-hub(?:\.html)?$/i,
  /^\/live\/relay13-what-you-get(?:\.html)?$/i,
  /^\/live\/relay13-operator-tutorial(?:\.html)?$/i,
  /^\/live\/relay13-client-tutorial(?:\.html)?$/i,
  /^\/live\/relay13-proof-room(?:\.html)?$/i,
  /^\/live\/skye-media-center-operator-proof(?:\.html)?$/i,
  /^\/live\/houseoperations-skyebox-operator-proof(?:\.html)?$/i,
  /^\/live\/marketing-made-easy-growth-suite(?:\.html)?$/i,
  /^\/live\/skye-content-forge-publisher(?:\.html)?$/i,
  /^\/live\/skye-split-engine-operator-proof(?:\.html)?$/i,
  /^\/live\/skyemusicnexus-neofront(?:\.html)?$/i,
  /^\/live\/skyeprofitconsole-profit-console(?:\.html)?$/i,
  /^\/live\/skyeroutex-workforce-command(?:\.html)?$/i,
  /^\/live\/vantacore-service-crm-operator-proof(?:\.html)?$/i
];
const PUBLIC_STATIC_ALLOWLIST = [
  /^\/(?:security|tech-stack|robots)\.(?:html|txt)$/i,
  /^\/(?:sitemap\.xml|site\.webmanifest|manifest\.json|favicon\.ico)$/i,
  /(^|\/)(?:proof|proofs|receipts)\/(?:public-|browser-|production-|live-)[^/]+\.json$/i
];
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PROTECTED_PROXY_MUTATION_PREFIXES = [
  '/api/crown/',
  '/api/nexus/',
  '/api/sentinel/',
  '/api/omega/'
];
const PUBLIC_PROXY_INTAKE_PATHS = new Set([
  '/api/crown/intake',
  '/api/nexus/intake',
  '/api/sentinel/intake',
  '/api/omega/intake'
]);
function isPublicCloudflareDocPath(pathname) {
  return /^\/cloudflare\/?$/i.test(pathname) ||
    /^\/cloudflare\/(?:index|crown-worker|nexus-worker)(?:\.html)?$/i.test(pathname);
}
function isPublicLivePath(pathname) {
  return PUBLIC_LIVE_PATHS.some(pattern => pattern.test(pathname));
}
function isPublicStaticAllowlisted(pathname) {
  return isPublicLivePath(pathname) || isPublicCloudflareDocPath(pathname) || PUBLIC_STATIC_ALLOWLIST.some(pattern => pattern.test(pathname));
}
function isPrivateSourcePath(pathname) {
  if (isPublicStaticAllowlisted(pathname)) return false;
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
async function protectedProxyMutationResponse(request, env, url) {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return null;
  if (PUBLIC_PROXY_INTAKE_PATHS.has(url.pathname)) return null;
  const protectedPrefix = PROTECTED_PROXY_MUTATION_PREFIXES.find(prefix => url.pathname.startsWith(prefix));
  if (!protectedPrefix) return null;
  const auth = await requireOperatorAuth(request, env, `${protectedPrefix} proxy mutation`);
  return auth.ok ? null : auth.response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (isPrivateSourcePath(url.pathname)) return privateSourceResponse();
    const mediaResponse = await handleMediaRoute(request, env, ctx, url);
    if (mediaResponse) return mediaResponse;
    if (request.method === 'OPTIONS') return json({ok:true});
    if (url.pathname === '/api/0s/route-manifest' || url.pathname === '/api/routes/manifest' || url.pathname === '/api/manifest') {
      return json(apiRouteManifest(env));
    }
    const appApiResponse = await handleAppApiRoute(request, env, url);
    if (appApiResponse) return appApiResponse;
    const clientAppFactoryGenerated = await handleClientAppFactoryGeneratedRoute(request, env, url);
    if (clientAppFactoryGenerated) return clientAppFactoryGenerated;
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
    if (url.pathname === '/api/valley/content-schedule') {
      const result = await runValleyContentScheduleTick(env, ctx, {source:'status', execute:false});
      return json(result, result.ok ? 200 : 502);
    }
    if (url.pathname === '/api/valley/content-schedule/tick') {
      if (!['GET','POST'].includes(request.method)) return json({ok:false, error:'Method not allowed'}, 405);
      let body = {};
      if (request.method === 'POST') body = await readJson(request);
      const requestedExecute = url.searchParams.get('execute') === '1' || body.execute === true;
      const explicitDryRun = url.searchParams.get('dry_run') === '1' || body.dry_run === true;
      const execute = requestedExecute && !explicitDryRun;
      if (execute && !valleyTickAuthorized(request, env)) {
        return json({
          ok:false,
          error:'Manual Valley publish ticks require VALLEY_PUBLISH_ADMIN_TOKEN or ADMIN_TOKEN. Use dry_run=1 for a public status check.',
          dry_run_available:true
        }, 401);
      }
      const result = await runValleyContentScheduleTick(env, ctx, {source:'manual', execute, now:body.now || null});
      return json(result, result.ok ? 200 : 502);
    }
    if (url.pathname === '/api/site-operator/live-surfaces') return json({ok:true, surfaces: LIVE_SURFACES});
    if (url.pathname === '/api/site-operator/intake' && request.method === 'POST') {
      const body = await readJson(request);
      const routed = routeMessage(body.message || body.text || body.title || '');
      const intake = {
        ...routed,
        id: `intake_${Date.now()}`,
        type: 'site_operator.public_intake',
        status: 'intake_pending_review',
        public_intake: true,
        created_at: new Date().toISOString(),
        contact: {
          name: String(body.name || body.full_name || '').slice(0, 160),
          email: String(body.email || '').slice(0, 240),
          company: String(body.company || body.company_name || '').slice(0, 200)
        }
      };
      ctx.waitUntil(saveKV(env, intake.id, intake));
      if (env.SITE_TASK_QUEUE) ctx.waitUntil(env.SITE_TASK_QUEUE.send(intake));
      ctx.waitUntil(mirrorSkygateEvent(env, {type:'site_operator.public_intake', meta:{intake_id:intake.id, intent:intake.intent, status:intake.status, message_preview:String(intake.message || '').slice(0,500)}}));
      return json({ok:true, intake, queued:Boolean(env.SITE_TASK_QUEUE), stored:Boolean(env.SITE_EVENTS_KV)});
    }
    if (url.pathname === '/api/site-operator/route' && request.method === 'POST') {
      const auth = await requireOperatorAuth(request, env, 'site operator route mutation');
      if (!auth.ok) return auth.response;
      const body = await readJson(request);
      const receipt = routeMessage(body.message || body.text || '');
      ctx.waitUntil(saveKV(env, receipt.id, receipt));
      ctx.waitUntil(mirrorSkygateEvent(env, {type:'site_operator.route', meta:{receipt_id:receipt.id, intent:receipt.intent, primary_brain:receipt.primary_brain, secondary_brain:receipt.secondary_brain, message_preview:String(receipt.message || '').slice(0,500)}}));
      return json({ok:true, receipt, stored:{kv:Boolean(env.SITE_EVENTS_KV), d1:Boolean(env.SITE_OPERATOR_WORKER || env.SITE_OPERATOR_WORKER_ORIGIN)}});
    }
    if (url.pathname === '/api/site-operator/event' && request.method === 'POST') {
      const auth = await requireOperatorAuth(request, env, 'site operator event mutation');
      if (!auth.ok) return auth.response;
      const body = await readJson(request);
      const receipt = {...body, id: body.id || `evt_${Date.now()}`, created_at: body.created_at || new Date().toISOString(), type: body.type || 'site_event'};
      ctx.waitUntil(saveKV(env, receipt.id, receipt));
      ctx.waitUntil(mirrorSkygateEvent(env, {type:receipt.type || 'site_operator.event', meta:{...receipt, message:String(receipt.message || receipt.text || '').slice(0,500)}}));
      return json({ok:true, receipt, stored: Boolean(env.SITE_EVENTS_KV)});
    }
    if (url.pathname === '/api/site-operator/task' && request.method === 'POST') {
      const auth = await requireOperatorAuth(request, env, 'site operator task mutation');
      if (!auth.ok) return auth.response;
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
    const proxyMutationBlock = await protectedProxyMutationResponse(request, env, url);
    if (proxyMutationBlock) return proxyMutationBlock;
    const proxied = await proxyApi(request, env, url);
    if (proxied) return proxied;
    const legacyCollision = legacyRootApiCollisionResponse(url);
    if (legacyCollision) return legacyCollision;
    if (env.ASSETS) return env.ASSETS.fetch(assetBindingRequest(request, url.pathname, url.search));
    return new Response('Site Operator Brain Worker is running. Static asset binding not configured.', {status: 200});
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runValleyContentScheduleTick(env, ctx, {
      source:'cron',
      execute:true,
      cron:controller.cron,
      now: controller.scheduledTime ? new Date(controller.scheduledTime).toISOString() : null
    }));
  }
};
