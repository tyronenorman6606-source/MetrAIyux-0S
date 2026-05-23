
import { handleClientAppFactoryGeneratedRoute, handleClientAppFactoryRoute } from './client-app-factory-adapter.mjs';
import { AGENTIC_GROWTH_ROUTE_FAMILIES, handleAgenticGrowthRoute, runAgenticGrowthScheduleTick } from './agentic-growth-adapter.mjs';
import { KEY_GATE_13_ROUTE_FAMILIES, handleKeyGate13Route } from './key-gate-13th-adapter.mjs';
import { handleCitadelDbRoute } from './citadeldb-adapter.mjs';
import { handleCompanyKnowledgeRoute } from './company-knowledge.mjs';
import adminLoginHtml from './generated-admin-login-page.mjs';
import changelogHtml from './generated-changelog-page.mjs';
// Changelog bundle refresh: 2026-05-20 gate-owned remote QuantumSkyes MCP lane.
import { handleMarketingMadeEasyRoute } from './marketing-made-easy-adapter.mjs';
import {
  buildAiResponseMonitorSnapshot,
  evaluateAiResponseUsage,
  listAiResponseLanes
} from './relay13-ai-lanes.mjs';
import {
  createContentPackage,
  createMediaReusePackage,
  handleTenantBackboneRoute
} from './tenant-backbone.mjs';

const VERSION = 'AUTONOMOUS_BUSINESS_SITE_OPERATOR_1.0.0';
const SOVEREIGNDOCS_STATIC_MOUNT = '/Free99/apps/sovereigndocs';
const SOVEREIGNDOCS_DOCXMAX_STATIC_MOUNT = `${SOVEREIGNDOCS_STATIC_MOUNT}/skye-docx-max`;
const DEFAULT_SOVEREIGNDOCS_LANE_ORIGIN = 'https://sovereigndocs-0s-lane.pages.dev';
const DEFAULT_SOVEREIGNDOCS_DOCXMAX_LANE_ORIGIN = 'https://sovereigndocs-docxmax-lane.pages.dev';
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
    id: 'company-knowledge-layer-proof',
    name: 'Company Knowledge Layer Proof',
    url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/live/company-knowledge-layer-proof.html',
    purpose: 'Public proof surface for the 0S company knowledge layer: FS27-gated owner memory, SaaS tenant knowledge, Cloudflare R2 object storage, KV metadata, context citations, and production stress receipts.',
    route_when: ['company knowledge','knowledge base','r2 storage','kv metadata','tenant memory','brain context','knowledge layer','vault to drive','cloudflare storage']
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
    purpose: 'Protected owner/admin command brain for authenticated operator sessions, approval flows, cabinet routing, and receipts.',
    route_when: ['admin','operator','automation brain','approval','token','private']
  },
  {
    id: 'agentic-growth-layer-0s',
    name: 'Agentic Growth Layer 0S Operator Surface',
    url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/agentic-growth-layer/',
    purpose: 'Protected 0S workspace for the FS27-owned Agentic Growth Layer: market data pulls, no-domain fallback cycles, developer-agent patch manifests, proof receipts, and SkyPay-backed service lanes.',
    route_when: ['agentic growth','self improving website','seo agents','gsc','semrush','serp','no domain fallback','developer agents','site improvement']
  },
  {
    id: 'metraiyux-sales-enablement',
    name: 'Sales Enablement Command Library',
    url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/sales-enablement/index.html',
    purpose: 'Discovery blueprint, objection handling, outbound follow-up, buyer-room structure, and AE proof packet.',
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
    status: 'LIVE/PARTIAL',
    builtin: true,
    note: 'The 0S Worker exposes a same-domain live catalog/status/control-plane adapter here. Read routes, storage introspection, and operator-gated mutations are mounted on the main domain; a dedicated CodeStudio backend or service binding is only needed for full external provider execution.'
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
    status: 'LIVE/GATED',
    builtin: true,
    note: 'Marketing Made Easy now runs as a mounted 0S platform shell with one shared gate lane, one namespaced API, workspace routing, and module rooms under a same-domain adapter.'
  },
  {
    id: 'brandforge',
    name: 'BrandForge Campaign Studio',
    base: '/api/brandforge',
    serviceBinding: null,
    originEnv: null,
    targetBase: '/api/brandforge',
    status: 'LIVE/GATED',
    builtin: true,
    note: 'BrandForge core runs as a Free99 mounted app; local intelligence is metered, and model-generated campaign work is forced through the SkyPay AI generation lane.'
  },
  {
    id: 'socialBatchFactory',
    name: 'Social Batch Factory',
    base: '/api/social-batch-factory',
    serviceBinding: null,
    originEnv: null,
    targetBase: '/api/social-batch-factory',
    status: 'LIVE/GATED',
    builtin: true,
    note: 'Social Batch Factory runs as a Free99 mounted app; browser export tools stay local, while paid AI copy generation is metered through the shared FS27/SkyGate lane.'
  },
  {
    id: 'jobping',
    name: 'JobPing',
    base: '/api/jobping',
    serviceBinding: null,
    originEnv: null,
    targetBase: '/api/jobping',
    status: 'LIVE/GATED/PAID',
    builtin: true,
    note: 'JobPing runs as a 0S-owned paid SkyPay runtime surface under the shared gate. AI matching and notification-ready output unlock only after confirmed JobPing SkyPay payment.'
  },
  {
    id: 'agenticGrowth',
    name: 'Agentic Growth Layer',
    base: '/api/agentic-growth',
    serviceBinding: null,
    originEnv: null,
    targetBase: '/api/agentic-growth',
    status: 'LIVE/GATED/FS27',
    builtin: true,
    note: 'Agentic Growth Layer runs as a 0S-mounted market-data and developer-agent runtime. App/API access uses only the shared FS27/SkyGate/Free99 gate; no app-local API key or admin password is accepted.'
  },
  {
    id: 'keyGate13th',
    name: 'Key Gate 13th',
    base: '/api/key-gate-13th',
    serviceBinding: null,
    originEnv: null,
    targetBase: '/api/key-gate-13th',
    status: 'LIVE/GATED/FS27',
    builtin: true,
    note: 'Key Gate 13th is the FS27-gated provider-key custody platform. It encrypts user/client provider keys, returns only refs and masked metadata, and brokers Agentic Growth source pulls without app-local passwords.'
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
    name: 'SignIn Pro by NorthStar',
    base: '/api/northstar',
    serviceBinding: 'SKYGATEFS27_WORKER',
    originEnv: 'SKYGATEFS27_ORIGIN',
    targetBase: '/.netlify/functions',
    status: 'LIVE/GATED',
    note: 'SignIn Pro is the workspace product mounted inside 0S; NorthStar Office & Accounting is the company behind it.'
  },
  {
    id: 'citadeldb',
    name: 'CitadelDB',
    base: '/api/citadel',
    serviceBinding: null,
    originEnv: 'CITADELDB_GATEWAY_URL',
    targetBase: '/api/citadel',
    status: 'LIVE/GATED',
    builtin: true,
    note: 'CitadelDB is mounted as the 0S database operations lane. Neon can remain primary while the mirror ledger, catch-up queue, and eventual remote Citadel gateway prove parity before cutover.'
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
  return new Response(JSON.stringify(data, null, 2), {status, headers: {'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-allow-headers':'content-type,authorization,x-admin-token,x-free99-admin-code,x-free99-demo-code,x-free99-gate-session,x-skygate-session,x-skye-gate-token,x-demo-code,x-demon-key,x-marketing-key-session,x-marketing-session,x-skygate-app,x-kaixu-app,x-kaixu-build,x-kaixu-request-id,x-skye-gate-session,x-skye-gate-source,x-skye-media-center-free99,x-skye-platform,x-kaixu-platform,x-skye-usage-lane,x-free99-billing-mode,x-skyepay-lane,x-brandforge-intelligence'}});
}
function assetBindingRequest(request, pathname = '', search = '') {
  const upstream = new URL(`https://0s-assets.local${pathname}${search}`);
  return new Request(upstream.toString(), request);
}
async function readJson(request) { try { return await request.json(); } catch { return {}; } }
function cookieValue(request, names = []) {
  const raw = String(request.headers.get('cookie') || '');
  if (!raw) return '';
  const wanted = new Set(names);
  for (const part of raw.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    if (!wanted.has(name)) continue;
    return decodeURIComponent(part.slice(index + 1).trim());
  }
  return '';
}
function cookieBearer(request){
  const raw = String(request.headers.get('cookie') || '');
  if (!raw) return '';
  const wanted = new Set([
    'skye_gate_session',
    'skygate_session',
    'skyegate_session',
    'skyeGateSession',
    'skye_gate_token',
    'skygate_token',
    'skyegate_token',
    'metraiyux_gate_session',
    'metraiyux_admin_session',
    'admin_session'
  ]);
  for (const part of raw.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    if (!wanted.has(name)) continue;
    const value = decodeURIComponent(part.slice(index + 1).trim());
    const token = stripBearer(value);
    if (token) return token;
  }
  return '';
}
function stripBearer(value) {
  const text = String(value || '').replace(/^Bearer(?:\s+|$)/i,'').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).trim();
  }
  return text;
}
function firstCredential(values = []) {
  for (const raw of values) {
    const token = stripBearer(raw);
    if (token) return token;
  }
  return '';
}
function bearer(request){
  const candidates = [
    request.headers.get('authorization'),
    request.headers.get('x-skye-gate-session'),
    request.headers.get('x-skygate-session'),
    request.headers.get('x-free99-gate-session'),
    request.headers.get('x-skye-gate-token'),
    cookieBearer(request)
  ];
  for (const raw of candidates) {
    const token = stripBearer(raw);
    if (token) return token;
  }
  return '';
}
function adminHeaderToken(request) {
  return firstCredential([
    request.headers.get('x-admin-token'),
    request.headers.get('x-free99-admin-code'),
    request.headers.get('x-free99-gate-session'),
    request.headers.get('x-skye-gate-session'),
    request.headers.get('x-skygate-session'),
    request.headers.get('x-skye-gate-token'),
    request.headers.get('authorization')
  ]);
}
const OWNER_ADMIN_SESSION_ISSUER = 'metraiyux-0s-owner-admin';
const OWNER_ADMIN_SESSION_AUDIENCE = 'metraiyux-0s-gate';
const OWNER_ADMIN_SESSION_PREFIX = '0s-owner';
const OWNER_ADMIN_COOKIE_NAMES = ['metraiyux_admin_session', 'skye_gate_session', 'skygate_session'];
const FREE99_DEMO_SESSION_ISSUER = 'metraiyux-0s-free99-demo';
const FREE99_DEMO_SESSION_PREFIX = '0s-demo';
const FREE99_DEMO_COOKIE_NAMES = ['skye_gate_session', 'skygate_session', 'metraiyux_gate_session'];
const FREE99_DEMO_PLATFORM_ID = 'signinpro-northstar';
const FREE99_DEMO_USAGE_LANE = 'free99-business-demo';
const FREE99_DEMO_CODE_KEY = 'free99:demo-code:active';
const FREE99_DEMO_PROMPT_KEY = 'free99:demo-code:last-rotation-prompt';
const FREE99_DEMO_SIGNUP_PREFIX = 'free99:demo-signup:';
const FREE99_DEMO_TTL_SECONDS = 60 * 60 * 48;
const MARKETING_KEY_SESSION_ISSUER = 'metraiyux-0s-marketing-key';
const MARKETING_KEY_SESSION_PREFIX = '0s-mkt';
const MARKETING_KEY_COOKIE_NAMES = ['marketing_key_session', 'metraiyux_marketing_session'];
const MARKETING_KEY_DEFAULT = 'skdevpbk';
const MARKETING_KEY_SIGNUP_PREFIX = 'marketing-keys:signup:';
const MARKETING_KEY_VISIT_PREFIX = 'marketing-keys:visit:';
const MARKETING_KEY_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const MARKETING_KEY_SURFACE_PREFIXES = ['/devs-playbook'];
const OWNER_ADMIN_CREDENTIAL_ENV_KEYS = [
  'FREE99_ADMIN_CODE',
  'FREE99_ADMIN_PASSWORD',
  'FREE99_GATE_CODE',
  'FREE99_GATE_PASSWORD',
  'FREE99_OWNER_CODE',
  'FREE99_OWNER_PASSWORD',
  'FREE99_PASSWORD',
  'ZERO_OS_GATE_CODE',
  'ZERO_OS_ADMIN_CODE',
  'METRAIYUX_OWNER_ADMIN_CODE',
  'FREE99_DEMON_CODE',
  'FREE99_DEMON_KEY',
  'DEMON_ADMIN_CODE',
  'DEMON_GATE_CODE',
  'DEMON_KEY',
  'OWNER_ADMIN_CODE',
  'OWNER_ADMIN_PASSWORD',
  'ADMIN_CODE',
  'ADMIN_PASSWORD',
  'FS27_ADMIN_CODE',
  'FS27_ADMIN_PASSWORD',
  'FS27_OWNER_CODE',
  'FS27_OWNER_PASSWORD',
  'SKYE_GATE_ADMIN_CODE',
  'SKYE_GATE_ADMIN_PASSWORD',
  'SKYE_GATE_OWNER_CODE',
  'SKYE_GATE_OWNER_PASSWORD',
  'SKYGATE_ADMIN_CODE',
  'SKYGATE_ADMIN_PASSWORD',
  'SKYGATE_OWNER_CODE',
  'SKYGATE_OWNER_PASSWORD',
  'SKYGATEFS27_ADMIN_CODE',
  'SKYGATEFS27_ADMIN_PASSWORD',
  'SKYGATEFS27_OWNER_CODE',
  'SKYGATEFS27_OWNER_PASSWORD',
  'SKYGATEFS13_ADMIN_PASSWORD',
  'QA_ADMIN_PASSWORD',
  'PHC_BOOTSTRAP_ADMIN_CODE',
  'SITE_OPERATOR_ADMIN_TOKEN',
  'METRAIYUX_ADMIN_TOKEN',
  'ADMIN_TOKEN',
  'SKYGATEFS13_WORKER_ADMIN_TOKEN',
  'MCP_HTTP_BEARER_TOKEN'
];
const FREE99_DEMO_CREDENTIAL_ENV_KEYS = [
  'FREE99_SIGNINPRO_DEMO_CODE',
  'SIGNINPRO_DEMO_CODE',
  'FREE99_DEMO_CODE',
  'FREE99_BUSINESS_DEMO_CODE',
  'FREE99_DEMO_GATE_CODE'
];
function uniqueNonEmpty(values) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
}
function uniqueCredentials(values) {
  return [...new Set(values.map(stripBearer).filter(Boolean))];
}
function envCredentialAliasName(value) {
  const text = stripBearer(value);
  const match = text.match(/^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?$/);
  return match ? match[1] : '';
}
function resolveEnvCredential(value, env, seen = new Set()) {
  const text = stripBearer(value);
  const alias = envCredentialAliasName(text);
  if (!alias || seen.has(alias)) return text;
  seen.add(alias);
  return resolveEnvCredential(env?.[alias], env, seen);
}
function credentialValuesForKeys(env, keys) {
  const values = [];
  for (const key of keys) {
    const direct = env?.[key];
    values.push(direct);
    const resolved = resolveEnvCredential(direct, env);
    if (resolved && resolved !== stripBearer(direct)) values.push(resolved);
  }
  return values;
}
function ownerAdminCredentialValues(env) {
  return credentialValuesForKeys(env, OWNER_ADMIN_CREDENTIAL_ENV_KEYS);
}
function ownerAdminSecrets(env) {
  return uniqueCredentials([
    env.OWNER_ADMIN_SESSION_SECRET,
    ...ownerAdminCredentialValues(env)
  ]);
}
function ownerAdminAcceptedCodes(env) {
  return uniqueCredentials(ownerAdminCredentialValues(env));
}
function presentedGateCredentials(request) {
  return uniqueCredentials([
    bearer(request),
    adminHeaderToken(request),
    request.headers.get('authorization'),
    request.headers.get('x-admin-token'),
    request.headers.get('x-free99-admin-code'),
    request.headers.get('x-free99-demo-code'),
    request.headers.get('x-free99-gate-session'),
    request.headers.get('x-skye-gate-session'),
    request.headers.get('x-skygate-session'),
    request.headers.get('x-skye-gate-token'),
    request.headers.get('x-demo-code'),
    request.headers.get('x-demon-key'),
    cookieBearer(request)
  ]);
}
function bodyGateCredential(body = {}, request = null) {
  return firstCredential([
    body.code,
    body.adminCode,
    body.admin_code,
    body.adminPassword,
    body.admin_password,
    body.password,
    body.demoCode,
    body.demo_code,
    body.demonCode,
    body.demon_code,
    body.demonKey,
    body.demon_key,
    body.free99,
    body.free99Code,
    body.free99_code,
    body.free99AdminCode,
    body.free99_admin_code,
    body.free99Password,
    body.free99_password,
    body.ownerCode,
    body.owner_code,
    body.gateCode,
    body.gate_code,
    body.gateToken,
    body.gate_token,
    body.token,
    body.bearer,
    body.session,
    request ? adminHeaderToken(request) : '',
    request ? bearer(request) : ''
  ]);
}
function firstAdminEmail(env) {
  return emailAllowlist(env)[0] || String(env.LEGAL_REVIEW_ADMIN_EMAIL || '').trim().toLowerCase() || 'owner@metraiyux.local';
}
function bytesToBase64Url(bytes) {
  let binary = '';
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < data.length; i += 1) binary += String.fromCharCode(data[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function base64UrlEncodeJson(value) {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}
function base64UrlDecodeJson(value) {
  const base64 = String(value || '').replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(String(value || '').length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}
async function hmacSha256Base64Url(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {name:'HMAC', hash:'SHA-256'},
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return bytesToBase64Url(signature);
}
function ownerAdminIdentity(env, overrides = {}) {
  const email = String(overrides.email || firstAdminEmail(env)).trim().toLowerCase();
  return {
    active: true,
    ok: true,
    source: 'metraiyux-0s-owner-admin',
    sub: 'metraiyux-owner-admin',
    email,
    username: email,
    role: 'owner',
    scope: 'admin.read admin.write keys.write gateway.invoke mcp.invoke 0s.owner',
    scopes: ['admin.read', 'admin.write', 'keys.write', 'gateway.invoke', 'mcp.invoke', '0s.owner'],
    workspace: 'metraiyux-0s',
    workspace_role: 'owner',
    gate_card: {email, workspace:'metraiyux-0s', source:'owner-admin-code'}
  };
}
async function issueOwnerAdminSession(env, input = {}) {
  const secrets = ownerAdminSecrets(env);
  if (!secrets.length) throw new Error('Owner admin session secret is not configured.');
  const now = Math.floor(Date.now() / 1000);
  const ttl = Math.max(300, Math.min(60 * 60 * 24 * 30, Number(env.OWNER_ADMIN_SESSION_TTL_SECONDS || 60 * 60 * 24 * 7)));
  const identity = ownerAdminIdentity(env, {email: input.email});
  const payload = {
    iss: OWNER_ADMIN_SESSION_ISSUER,
    aud: OWNER_ADMIN_SESSION_AUDIENCE,
    sub: identity.sub,
    email: identity.email,
    role: identity.role,
    scope: identity.scope,
    workspace: identity.workspace,
    iat: now,
    exp: now + ttl,
    nonce: crypto.randomUUID ? crypto.randomUUID() : `owner-${now}-${Math.random().toString(36).slice(2)}`
  };
  const encoded = base64UrlEncodeJson(payload);
  const signature = await hmacSha256Base64Url(secrets[0], encoded);
  return {
    token: `${OWNER_ADMIN_SESSION_PREFIX}.${encoded}.${signature}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    maxAge: ttl,
    identity
  };
}
async function verifyOwnerAdminSessionToken(rawToken, env) {
  const token = stripBearer(rawToken);
  if (!token) return {ok:false, status:401, error:'Missing owner admin token.'};
  const directMatches = ownerAdminSecrets(env).filter(secret => token === secret);
  if (directMatches.length) {
    return {ok:true, status:200, data:ownerAdminIdentity(env, {}), via:'owner-admin-secret'};
  }
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== OWNER_ADMIN_SESSION_PREFIX) {
    return {ok:false, status:401, error:'Not a MetrAIyux owner admin session.'};
  }
  let payload = null;
  try {
    payload = base64UrlDecodeJson(parts[1]);
  } catch {
    return {ok:false, status:401, error:'Owner admin session payload is invalid.'};
  }
  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== OWNER_ADMIN_SESSION_ISSUER || payload.aud !== OWNER_ADMIN_SESSION_AUDIENCE) {
    return {ok:false, status:401, error:'Owner admin session issuer/audience mismatch.'};
  }
  if (!payload.exp || Number(payload.exp) < now) {
    return {ok:false, status:401, error:'Owner admin session expired.'};
  }
  for (const secret of ownerAdminSecrets(env)) {
    const expected = await hmacSha256Base64Url(secret, parts[1]);
    if (expected === parts[2]) {
      const data = ownerAdminIdentity(env, {email: payload.email});
      data.sub = payload.sub || data.sub;
      data.scope = payload.scope || data.scope;
      data.scopes = scopeList(data.scope);
      data.exp = payload.exp;
      data.iat = payload.iat;
      data.session_id = payload.nonce || '';
      return {ok:true, status:200, data, via:'owner-admin-session'};
    }
  }
  return {ok:false, status:401, error:'Owner admin session signature mismatch.'};
}
function ownerAdminCookies(token, maxAge) {
  const encoded = encodeURIComponent(token || '');
  return OWNER_ADMIN_COOKIE_NAMES.map(name => `${name}=${encoded}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(0, Number(maxAge || 0))}`);
}
function withSetCookies(response, cookies = []) {
  for (const cookie of cookies) response.headers.append('set-cookie', cookie);
  return response;
}
function ownerAdminResponsePayload(session) {
  return {
    ok: true,
    authenticated: true,
    owner: true,
    tokenType: 'Bearer',
    token: session.token,
    expiresAt: session.expiresAt,
    user: {
      email: session.identity.email,
      role: 'owner',
      permissions: ['read','write','settings','users','audit','backup','provision','admin','mcp']
    },
    workspace: {
      id: 'metraiyux-0s-owner',
      slug: 'metraiyux-0s-owner',
      name: 'MetrAIyux 0S Owner Command',
      status: 'owner-unlocked',
      plan: 'sovereign-owner'
    },
    mcp: {
      endpoint: 'https://skye-design-mcp.pages.dev/mcp',
      accessGuide: 'https://skye-design-mcp.pages.dev/use-mcp.html',
      env: 'QUANTUMSKYES_MCP_TOKEN'
    }
  };
}
async function loginFs27Gate(password, env) {
  const origin = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev';
  if (!origin && !env.SKYGATEFS27_WORKER?.fetch) return {ok: false, error: 'FS27 gate not configured'};
  // Use the env-stored FS27 password when available — user's local code ≠ FS27 gate password
  const fs27Pass = String(
    env.SKYGATEFS13_ADMIN_PASSWORD || env.SKYGATEFS27_ADMIN_PASSWORD ||
    env.FS27_ADMIN_PASSWORD || env.SKYGATE_ADMIN_PASSWORD || password || ''
  ).trim();
  if (!fs27Pass) return {ok: false, error: 'FS27 gate password not configured'};
  try {
    const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(4500)
      : undefined;
    const res = await skygateRequest(env, '/admin/login', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({password: fs27Pass}),
      signal
    });
    const data = await res.json().catch(() => ({}));
    return {ok: res.ok && !!data.token, status: res.status, data, via: 'fs27-admin-login'};
  } catch (e) {
    return {ok: false, error: e.name === 'TimeoutError' ? 'FS27 gate login timed out; owner session can still unlock 0S.' : e.message};
  }
}
async function handleOwnerAdminLogin(request, env) {
  if (request.method !== 'POST') return json({ok:false, error:'Method not allowed'}, 405);
  const body = await readJson(request);
  const code = bodyGateCredential(body, request);
  if (!code) return json({ok:false, error:'Missing 0S / Free99 admin code or gate session.'}, 401);
  const acceptedCodes = ownerAdminAcceptedCodes(env);
  let gateEmail;
  let gateBearer; // FS27 bearer — returned to browser so vault + skygate surfaces pick it up

  if (acceptedCodes.includes(code)) {
    // Matched a static local credential — also get a live FS27 bearer for downstream surfaces
    const gateLogin = await loginFs27Gate(code, env);
    if (gateLogin.ok) { gateBearer = gateLogin.data.token; gateEmail = gateLogin.data?.email || gateLogin.data?.username; }
  } else {
    // Try as an existing FS27 bearer (introspect)
    const gate = await introspectAnyGateToken(code, env);
    if (gate.ok) {
      if (!allowsAdminGate(gate.data, env)) {
        return json({ok:false, error:'Gate session is active but not admin-scoped for 0S owner access.', skygate:gate.data || null}, 403);
      }
      gateBearer = code;
      gateEmail = gate.data?.email || gate.data?.username || gate.data?.user?.email;
    } else {
      // Try as a password directly against the FS27 gate /admin/login — this is the canonical path
      const gateLogin = await loginFs27Gate(code, env);
      if (!gateLogin.ok) {
        if (!acceptedCodes.length && !(skygateOrigin(env) || env.SKYGATEFS27_WORKER?.fetch))
          return json({ok:false, error:'0S / Free99 admin credential is not configured on this Worker.'}, 503);
        return json({ok:false, error:'0S / Free99 admin code or gate session rejected.'}, gate.status || 401);
      }
      gateBearer = gateLogin.data.token;
      gateEmail = gateLogin.data?.email || gateLogin.data?.username;
    }
  }
  const session = await issueOwnerAdminSession(env, {email: gateEmail});
  const payload = ownerAdminResponsePayload(session);
  if (gateBearer) { payload.gateToken = gateBearer; payload.gateBearerToken = gateBearer; }
  return withSetCookies(json(payload, 200), ownerAdminCookies(session.token, session.maxAge));
}
async function handleOwnerAdminSession(request, env) {
  const token = bearer(request);
  const owner = await verifyOwnerAdminSessionToken(token, env);
  if (!owner.ok) return json({ok:false, authenticated:false, error:owner.error}, owner.status || 401);
  const session = {token, expiresAt: owner.data?.exp ? new Date(owner.data.exp * 1000).toISOString() : '', maxAge: 0, identity: owner.data};
  const payload = ownerAdminResponsePayload(session);
  payload.token = token;
  payload.via = owner.via;
  return json(payload);
}
async function handleOwnerAdminLogout() {
  return withSetCookies(json({ok:true, authenticated:false}), ownerAdminCookies('', 0));
}
function combinedGateIntrospectionPayload(gate) {
  const data = gate?.data || {};
  const email = data.email || data.username || data.user?.email || data.gate_card?.email || '';
  const role = data.role || data.user?.role || data.workspace_role || data.workspaceRole || '';
  const scopes = Array.isArray(data.scopes) ? data.scopes : scopeList(data.scope || data.user?.scope);
  return {
    ok: Boolean(gate?.ok),
    active: Boolean(gate?.ok && (data.active !== false)),
    source: data.source || gate?.via || 'skygate',
    email,
    username: data.username || email,
    sub: data.sub || data.subject || data.user?.id || email || '',
    role,
    scope: data.scope || scopes.join(' '),
    scopes,
    workspace: data.workspace || data.gate_card?.workspace || data.workspace_id || '',
    workspace_role: data.workspace_role || data.workspaceRole || role,
    session_id: data.session_id || data.sessionId || data.session?.id || '',
    gate_card: data.gate_card || null,
    skygate: data || null,
    error: gate?.ok ? null : gate?.error || 'Inactive gate token'
  };
}
async function handleCombinedGateIntrospect(request, env) {
  let body = {};
  if (request.method === 'POST') body = await readJson(request);
  const presented = bodyGateCredential(body, request);
  const gate = await introspectAnyGateToken(presented, env);
  const payload = combinedGateIntrospectionPayload(gate);
  return json(payload, gate.status || (gate.ok ? 200 : 401));
}
function free99DemoStorage(env) {
  return env.FREE99_DEMO_KV || env.SIGNINPRO_KV || env.NORTHSTAR_KV || env.SITE_EVENTS_KV || null;
}
function free99DemoSessionSecrets(env) {
  return uniqueCredentials([
    env.FREE99_DEMO_SESSION_SECRET,
    env.OWNER_ADMIN_SESSION_SECRET,
    ...ownerAdminCredentialValues(env)
  ]);
}
function free99DemoEnvCodes(env) {
  return uniqueCredentials(credentialValuesForKeys(env, FREE99_DEMO_CREDENTIAL_ENV_KEYS));
}
function free99CleanText(value, max = 240) {
  return String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
function free99CleanEmail(value) {
  return free99CleanText(value, 240).toLowerCase();
}
function free99HtmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}
function free99DemoCodePreview(code) {
  const text = stripBearer(code);
  if (!text) return '';
  if (text.length <= 8) return `${text.slice(0, 2)}...${text.slice(-2)}`;
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
}
async function free99DemoCodeHash(code) {
  return founderHash(`free99-demo-code:${stripBearer(code)}`);
}
function free99DemoPublicOrigin(env) {
  return String(env.ZERO_OS_PUBLIC_ORIGIN || env.METRAIYUX_0S_ORIGIN || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
}
function free99DemoRotationExpiresAt(nowMs = Date.now(), ttlSeconds = FREE99_DEMO_TTL_SECONDS) {
  const ttl = Math.max(300, Math.min(FREE99_DEMO_TTL_SECONDS, Number(ttlSeconds || FREE99_DEMO_TTL_SECONDS)));
  return new Date(nowMs + ttl * 1000).toISOString();
}
async function free99DemoActiveCodeRecord(env) {
  const kv = free99DemoStorage(env);
  const stored = kv?.get ? await kv.get(FREE99_DEMO_CODE_KEY, {type:'json'}).catch(() => null) : null;
  if (stored?.code_hash) return {...stored, source:stored.source || 'kv'};
  const envCode = free99DemoEnvCodes(env)[0] || '';
  if (!envCode) return null;
  const expiresFromEnv = Date.parse(String(env.FREE99_DEMO_CODE_EXPIRES_AT || env.SIGNINPRO_DEMO_CODE_EXPIRES_AT || ''));
  const expiresAt = Number.isFinite(expiresFromEnv) && expiresFromEnv > Date.now()
    ? new Date(expiresFromEnv).toISOString()
    : free99DemoRotationExpiresAt();
  const now = new Date().toISOString();
  const record = {
    id: `free99_demo_code_${Date.now()}`,
    type: 'free99.demo_code.active',
    status: 'active',
    platform_id: FREE99_DEMO_PLATFORM_ID,
    usage_lane: FREE99_DEMO_USAGE_LANE,
    code_hash: await free99DemoCodeHash(envCode),
    code_preview: free99DemoCodePreview(envCode),
    created_at: now,
    rotated_at: now,
    rotated_by: 'env-bootstrap',
    expires_at: expiresAt,
    source: 'env-bootstrap'
  };
  if (kv?.put) await kv.put(FREE99_DEMO_CODE_KEY, JSON.stringify(record), {expirationTtl: 60 * 60 * 24 * 90});
  return record;
}
function free99DemoCodeStatusPayload(record, env = null) {
  const nowMs = Date.now();
  const expiresMs = Date.parse(record?.expires_at || '');
  const configured = Boolean(record?.code_hash);
  const expired = configured && (!Number.isFinite(expiresMs) || expiresMs <= nowMs);
  const secondsRemaining = configured && !expired ? Math.max(0, Math.floor((expiresMs - nowMs) / 1000)) : 0;
  return {
    ok: true,
    configured,
    active: configured && !expired,
    expired,
    platform_id: FREE99_DEMO_PLATFORM_ID,
    usage_lane: FREE99_DEMO_USAGE_LANE,
    code_preview: record?.code_preview || '',
    created_at: record?.created_at || null,
    rotated_at: record?.rotated_at || null,
    expires_at: record?.expires_at || null,
    seconds_remaining: secondsRemaining,
    ttl_seconds: FREE99_DEMO_TTL_SECONDS,
    needs_rotation: !configured || expired || secondsRemaining <= 60 * 60 * Number(record?.rotation_prompt_hours || 6),
    storage: env && free99DemoStorage(env) ? 'worker-kv' : 'none'
  };
}
function free99DemoEmailRecipients(env) {
  return String(env.FREE99_DEMO_OWNER_EMAIL || env.RESEND_TO_EMAIL || env.NOTIFY_EMAIL_TO || env.ADMIN_NOTIFY_EMAIL || firstAdminEmail(env) || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .filter(item => !/@metraiyux\.local$/i.test(item));
}
function free99DemoEmailFrom(env) {
  return String(env.RESEND_FROM_EMAIL || env.NOTIFY_EMAIL_FROM || env.RESEND_FROM || '').trim();
}
async function sendFree99DemoResendEmail(env, message) {
  const apiKey = String(env.RESEND_API_KEY || '').trim();
  const from = free99DemoEmailFrom(env);
  const to = free99DemoEmailRecipients(env);
  if (!apiKey || !from || !to.length) {
    return {ok:false, skipped:true, reason:'RESEND_API_KEY, RESEND_FROM_EMAIL, or owner recipient is not configured.'};
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject: message.subject,
      html: message.html,
      text: message.text
    })
  });
  const data = await response.json().catch(() => ({}));
  return {ok:response.ok, status:response.status, data, skipped:false};
}
async function free99MaybeSendDemoRotationPrompt(env, ctx, reason = 'rotation_due', record = null) {
  const kv = free99DemoStorage(env);
  const now = new Date();
  const throttleSeconds = Math.max(900, Math.min(60 * 60 * 24, Number(env.FREE99_DEMO_PROMPT_THROTTLE_SECONDS || 60 * 60 * 6)));
  const lastPrompt = kv?.get ? await kv.get(FREE99_DEMO_PROMPT_KEY, {type:'json'}).catch(() => null) : null;
  if (lastPrompt?.sent_at && Date.parse(lastPrompt.sent_at) > now.getTime() - throttleSeconds * 1000) {
    return {ok:true, skipped:true, throttled:true, last_prompt:lastPrompt};
  }
  const origin = free99DemoPublicOrigin(env);
  const manageUrl = `${origin}/admin/free99-demo-code.html`;
  const demoUrl = `${origin}/Free99/demo.html?return=/northstar/index.html`;
  const status = free99DemoCodeStatusPayload(record || await free99DemoActiveCodeRecord(env), env);
  const subject = `Free99 demo code ${reason === 'expired' ? 'expired' : 'rotation needed'}`;
  const text = [
    'Free99 Sign In Pro demo code rotation is needed.',
    `Reason: ${reason}`,
    `Current preview: ${status.code_preview || 'none'}`,
    `Expires at: ${status.expires_at || 'not configured'}`,
    `Rotate/manage: ${manageUrl}`,
    `Business demo page: ${demoUrl}`,
    'Approve the rotation from the owner-gated page and set the new two-day demo code there.'
  ].join('\n');
  const html = `<p>Free99 Sign In Pro demo code rotation is needed.</p><ul><li>Reason: ${free99HtmlEscape(reason)}</li><li>Current preview: ${free99HtmlEscape(status.code_preview || 'none')}</li><li>Expires at: ${free99HtmlEscape(status.expires_at || 'not configured')}</li></ul><p><a href="${free99HtmlEscape(manageUrl)}">Approve and rotate the demo code</a></p><p><a href="${free99HtmlEscape(demoUrl)}">Business demo page</a></p><p>The Worker will store only the hash and keep the new code on a two-day expiration.</p>`;
  const result = await sendFree99DemoResendEmail(env, {subject, text, html});
  const promptRecord = {
    id: `free99_demo_prompt_${Date.now()}`,
    type: 'free99.demo_code.rotation_prompt',
    reason,
    status: result.ok ? 'sent' : (result.skipped ? 'skipped' : 'failed'),
    sent_at: now.toISOString(),
    resend: {ok:result.ok, status:result.status || null, skipped:Boolean(result.skipped), reason:result.reason || null},
    demo_code: {preview:status.code_preview || null, expires_at:status.expires_at || null}
  };
  const write = kv?.put ? kv.put(FREE99_DEMO_PROMPT_KEY, JSON.stringify(promptRecord), {expirationTtl: 60 * 60 * 24 * 14}) : Promise.resolve();
  if (ctx?.waitUntil) ctx.waitUntil(write);
  else await write;
  return {...result, prompt:promptRecord};
}
async function rotateFree99DemoCode(env, auth, body = {}) {
  const newCode = stripBearer(body.newCode || body.new_code || body.code || body.demoCode || body.demo_code);
  if (!newCode || newCode.length < 6) return json({ok:false, error:'New Free99 demo code must be at least 6 characters.'}, 400);
  if (newCode.length > 96) return json({ok:false, error:'New Free99 demo code is too long.'}, 400);
  const ttlSeconds = Math.max(300, Math.min(FREE99_DEMO_TTL_SECONDS, Number(body.ttlSeconds || body.ttl_seconds || FREE99_DEMO_TTL_SECONDS)));
  const now = new Date().toISOString();
  const record = {
    id: `free99_demo_code_${Date.now()}`,
    type: 'free99.demo_code.active',
    status: 'active',
    platform_id: FREE99_DEMO_PLATFORM_ID,
    usage_lane: FREE99_DEMO_USAGE_LANE,
    code_hash: await free99DemoCodeHash(newCode),
    code_preview: free99DemoCodePreview(newCode),
    created_at: now,
    rotated_at: now,
    rotated_by: auth.actor || 'owner-admin',
    approved_by: auth.actor || 'owner-admin',
    expires_at: free99DemoRotationExpiresAt(Date.now(), ttlSeconds),
    source: 'owner-approved-rotation'
  };
  const kv = free99DemoStorage(env);
  if (!kv?.put) return json({ok:false, error:'FREE99_DEMO_KV, SIGNINPRO_KV, NORTHSTAR_KV, or SITE_EVENTS_KV storage is required to rotate demo codes.'}, 503);
  await kv.put(FREE99_DEMO_CODE_KEY, JSON.stringify(record), {expirationTtl: 60 * 60 * 24 * 90});
  return json({ok:true, rotated:true, code_preview:record.code_preview, expires_at:record.expires_at, platform_id:record.platform_id, usage_lane:record.usage_lane});
}
function free99DemoIdentityFromPayload(payload = {}) {
  const scopes = scopeList(payload.scope || 'free99.demo signinpro.demo 0s.gate.read');
  return {
    active: true,
    ok: true,
    demo: true,
    source: FREE99_DEMO_SESSION_ISSUER,
    sub: payload.sub || 'free99-demo',
    email: payload.email || '',
    username: payload.email || '',
    role: 'demo',
    scope: scopes.join(' '),
    scopes,
    workspace: payload.workspace || 'free99-demo',
    workspace_role: 'demo',
    platform_id: payload.platform_id || FREE99_DEMO_PLATFORM_ID,
    usage_lane: payload.usage_lane || FREE99_DEMO_USAGE_LANE,
    business_name: payload.business_name || '',
    exp: payload.exp,
    iat: payload.iat,
    session_id: payload.nonce || '',
    gate_card: {
      email: payload.email || '',
      workspace: payload.workspace || 'free99-demo',
      source: 'free99-demo-code',
      platform_id: payload.platform_id || FREE99_DEMO_PLATFORM_ID,
      usage_lane: payload.usage_lane || FREE99_DEMO_USAGE_LANE
    }
  };
}
async function issueFree99DemoSession(env, signup = {}, codeRecord = {}) {
  const secrets = free99DemoSessionSecrets(env);
  if (!secrets.length) throw new Error('Free99 demo session secret is not configured.');
  const now = Math.floor(Date.now() / 1000);
  const codeExp = Math.floor(Date.parse(codeRecord.expires_at || '') / 1000);
  const remaining = Number.isFinite(codeExp) ? codeExp - now : FREE99_DEMO_TTL_SECONDS;
  if (remaining <= 0) throw new Error('Free99 demo code is expired.');
  const ttl = Math.min(FREE99_DEMO_TTL_SECONDS, remaining);
  const email = free99CleanEmail(signup.email);
  const payload = {
    iss: FREE99_DEMO_SESSION_ISSUER,
    aud: OWNER_ADMIN_SESSION_AUDIENCE,
    sub: `free99-demo:${founderShortHash(email || signup.business_name || Date.now())}`,
    email,
    role: 'demo',
    scope: 'free99.demo signinpro.demo 0s.gate.read',
    workspace: `free99-demo:${northstarSlug(signup.business_name || email || 'business')}`,
    platform_id: FREE99_DEMO_PLATFORM_ID,
    usage_lane: FREE99_DEMO_USAGE_LANE,
    business_name: free99CleanText(signup.business_name || signup.business, 180),
    iat: now,
    exp: now + ttl,
    nonce: crypto.randomUUID ? crypto.randomUUID() : `demo-${now}-${Math.random().toString(36).slice(2)}`
  };
  const encoded = base64UrlEncodeJson(payload);
  const signature = await hmacSha256Base64Url(secrets[0], encoded);
  return {
    token: `${FREE99_DEMO_SESSION_PREFIX}.${encoded}.${signature}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    maxAge: ttl,
    identity: free99DemoIdentityFromPayload(payload)
  };
}
async function verifyFree99DemoSessionToken(rawToken, env) {
  const token = stripBearer(rawToken);
  if (!token) return {ok:false, status:401, error:'Missing Free99 demo token.'};
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== FREE99_DEMO_SESSION_PREFIX) {
    return {ok:false, status:401, error:'Not a Free99 demo session.'};
  }
  let payload = null;
  try {
    payload = base64UrlDecodeJson(parts[1]);
  } catch {
    return {ok:false, status:401, error:'Free99 demo session payload is invalid.'};
  }
  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== FREE99_DEMO_SESSION_ISSUER || payload.aud !== OWNER_ADMIN_SESSION_AUDIENCE) {
    return {ok:false, status:401, error:'Free99 demo session issuer/audience mismatch.'};
  }
  if (!payload.exp || Number(payload.exp) < now) {
    return {ok:false, status:401, error:'Free99 demo session expired.'};
  }
  for (const secret of free99DemoSessionSecrets(env)) {
    const expected = await hmacSha256Base64Url(secret, parts[1]);
    if (expected === parts[2]) return {ok:true, status:200, data:free99DemoIdentityFromPayload(payload), via:'free99-demo-session'};
  }
  return {ok:false, status:401, error:'Free99 demo session signature mismatch.'};
}
function free99DemoCookies(token, maxAge) {
  const encoded = encodeURIComponent(token || '');
  return FREE99_DEMO_COOKIE_NAMES.map(name => `${name}=${encoded}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(0, Number(maxAge || 0))}`);
}
function free99DemoResponsePayload(session, signup) {
  return {
    ok: true,
    authenticated: true,
    demo: true,
    tokenType: 'Bearer',
    token: session.token,
    expiresAt: session.expiresAt,
    platform_id: FREE99_DEMO_PLATFORM_ID,
    usage_lane: FREE99_DEMO_USAGE_LANE,
    user: {
      email: session.identity.email,
      role: 'demo',
      permissions: ['read', 'demo', 'signinpro.demo']
    },
    workspace: {
      id: session.identity.workspace,
      slug: northstarSlug(signup.business_name || signup.email || 'free99-demo'),
      name: signup.business_name || 'Free99 Business Demo',
      status: 'demo',
      plan: 'Free99 demo'
    },
    signup
  };
}
async function validateFree99DemoCode(env, ctx, code) {
  const presented = stripBearer(code);
  if (!presented) return {ok:false, response:json({ok:false, error:'Demo code is required.'}, 400)};
  const record = await free99DemoActiveCodeRecord(env);
  if (!record?.code_hash) {
    if (ctx?.waitUntil) ctx.waitUntil(free99MaybeSendDemoRotationPrompt(env, ctx, 'missing', record));
    return {ok:false, response:json({ok:false, error:'Free99 demo code is not configured yet.'}, 503)};
  }
  const expiresMs = Date.parse(record.expires_at || '');
  const expired = !Number.isFinite(expiresMs) || expiresMs <= Date.now();
  if (expired) {
    if (ctx?.waitUntil) ctx.waitUntil(free99MaybeSendDemoRotationPrompt(env, ctx, 'expired', record));
    return {ok:false, response:json({ok:false, error:'Free99 demo code expired. A rotation prompt has been sent to the owner when Resend is configured.'}, 401)};
  }
  const hash = await free99DemoCodeHash(presented);
  if (hash !== record.code_hash) return {ok:false, response:json({ok:false, error:'Free99 demo code rejected.'}, 401)};
  return {ok:true, record};
}
async function resolveFree99DemoCodeGate(env, credentials = []) {
  for (const credential of uniqueCredentials(credentials)) {
    const validation = await validateFree99DemoCode(env, null, credential);
    if (validation.ok) {
      return {
        ok: true,
        status: 200,
        data: free99DemoIdentityFromPayload({
          sub: 'free99-demo:code-gate',
          workspace: 'free99-demo:code-only',
          platform_id: FREE99_DEMO_PLATFORM_ID,
          usage_lane: FREE99_DEMO_USAGE_LANE
        }),
        via: 'free99-demo-code'
      };
    }
  }
  return {ok:false};
}
async function saveFree99DemoSignup(env, ctx, input, codeRecord, session) {
  const now = new Date().toISOString();
  const id = `free99_demo_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`;
  const signup = {
    id,
    type: 'free99.demo.signup',
    status: 'demo_gate_session_issued',
    platform_id: FREE99_DEMO_PLATFORM_ID,
    usage_lane: FREE99_DEMO_USAGE_LANE,
    product: 'SignIn Pro by NorthStar',
    business_name: free99CleanText(input.business_name || input.business || input.company || input.company_name, 180),
    contact_name: free99CleanText(input.name || input.contact_name || input.full_name, 160),
    email: free99CleanEmail(input.email || input.contact_email),
    phone: routexPhone(input.phone || input.mobile || ''),
    sms_opt_in: routexConsentFlag(input.sms_opt_in ?? input.smsOptIn ?? input.sms_consent ?? input.smsConsent),
    requested_return: free99CleanText(input.returnTo || input.return_to || input.return || '/northstar/index.html', 500),
    code_preview: codeRecord.code_preview || '',
    session_expires_at: session.expiresAt,
    created_at: now,
    user_agent: free99CleanText(input.user_agent || '', 240)
  };
  const kv = free99DemoStorage(env);
  const write = kv?.put ? kv.put(`${FREE99_DEMO_SIGNUP_PREFIX}${id}`, JSON.stringify(signup), {expirationTtl: 60 * 60 * 24 * 180}) : Promise.resolve();
  const mirror = mirrorSkygateEvent(env, {type:'free99.demo.signup', meta:{id, platform_id:signup.platform_id, usage_lane:signup.usage_lane, business_name:signup.business_name, email:signup.email, session_expires_at:signup.session_expires_at}});
  if (ctx?.waitUntil) {
    ctx.waitUntil(write);
    ctx.waitUntil(mirror);
  } else {
    await write;
    await mirror;
  }
  return signup;
}
async function handleFree99DemoLogin(request, env, ctx) {
  if (request.method !== 'POST') return json({ok:false, error:'Method not allowed'}, 405);
  const body = await readJson(request);
  const validation = await validateFree99DemoCode(env, ctx, body.demoCode || body.demo_code || body.code || body.password);
  if (!validation.ok) return validation.response;
  const rawEmail = free99CleanEmail(body.email || body.contact_email);
  const email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rawEmail)
    ? rawEmail
    : `free99-code-${founderShortHash(validation.record.code_hash || Date.now())}@metraiyux.local`;
  const businessName = free99CleanText(body.business_name || body.business || body.company || body.company_name, 180) || 'Free99 Code Gate';
  const signupInput = {...body, email, business_name:businessName, code_only: !rawEmail};
  const session = await issueFree99DemoSession(env, signupInput, validation.record);
  const signup = await saveFree99DemoSignup(env, ctx, signupInput, validation.record, session);
  return withSetCookies(json(free99DemoResponsePayload(session, signup), 200), free99DemoCookies(session.token, session.maxAge));
}
async function handleFree99DemoRoute(request, env, ctx, url) {
  if (url.pathname === '/api/free99/demo-login') return handleFree99DemoLogin(request, env, ctx);
  if (url.pathname === '/api/free99/demo-code/status' || url.pathname === '/api/free99/demo-code/rotate' || url.pathname === '/api/free99/demo-code/approve-rotation' || url.pathname === '/api/free99/demo-code/prompt' || url.pathname === '/api/free99/demo-signups') {
    const auth = await requireOperatorAuth(request, env, 'Free99 demo code management');
    if (!auth.ok) return auth.response;
    if (url.pathname === '/api/free99/demo-code/status' && request.method === 'GET') {
      const record = await free99DemoActiveCodeRecord(env);
      return json(free99DemoCodeStatusPayload(record, env));
    }
    if ((url.pathname === '/api/free99/demo-code/rotate' || url.pathname === '/api/free99/demo-code/approve-rotation') && request.method === 'POST') {
      return rotateFree99DemoCode(env, auth, await readJson(request));
    }
    if (url.pathname === '/api/free99/demo-code/prompt' && request.method === 'POST') {
      const body = await readJson(request);
      const result = await free99MaybeSendDemoRotationPrompt(env, ctx, body.reason || 'owner_requested', await free99DemoActiveCodeRecord(env));
      return json({ok:Boolean(result.ok || result.skipped), result});
    }
    if (url.pathname === '/api/free99/demo-signups' && request.method === 'GET') {
      const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || 80)));
      const items = await readKVLedgerByPrefix(env, FREE99_DEMO_SIGNUP_PREFIX, limit);
      return json({ok:true, items, count:items.length, platform_id:FREE99_DEMO_PLATFORM_ID, usage_lane:FREE99_DEMO_USAGE_LANE});
    }
    return json({ok:false, error:'Method not allowed'}, 405);
  }
  return null;
}
function marketingKeysStorage(env) {
  return env.MARKETING_KEYS_KV || env.SITE_EVENTS_KV || null;
}
async function readMarketingKeyLedgerByPrefix(env, prefix, limit = 100) {
  const storage = marketingKeysStorage(env);
  if (!storage?.list) return [];
  const listed = await storage.list({prefix, limit});
  const rows = [];
  for (const key of listed.keys || []) {
    const item = await storage.get(key.name, {type:'json'}).catch(() => null);
    if (item) rows.push({...item, kv_key:key.name});
  }
  return rows.sort((a,b)=>String(b.created_at || b.event_ts || '').localeCompare(String(a.created_at || a.event_ts || '')));
}
function marketingKeySessionSecrets(env) {
  return uniqueCredentials([
    env.MARKETING_KEY_SESSION_SECRET,
    env.OWNER_ADMIN_SESSION_SECRET,
    ...ownerAdminCredentialValues(env)
  ]);
}
function normalizeMarketingKey(value = '') {
  const text = String(value || MARKETING_KEY_DEFAULT).toLowerCase().replace(/[^a-z0-9_-]+/g, '').slice(0, 48);
  return text || MARKETING_KEY_DEFAULT;
}
function marketingKeyEmailSlug(email) {
  const local = String(email || '').split('@')[0] || 'user';
  return northstarSlug(local).slice(0, 60) || 'user';
}
function marketingKeyUserId(email, key) {
  return `${marketingKeyEmailSlug(email)}-${normalizeMarketingKey(key)}`;
}
function marketingKeyReturnPath(value) {
  const text = String(value || '').trim();
  if (!text || !text.startsWith('/') || text.startsWith('//')) return '/devs-playbook/';
  if (/^\/api\//i.test(text) || /^\/admin(?:\/|$)/i.test(text)) return '/devs-playbook/';
  return text.slice(0, 500);
}
function marketingKeyTokenFromRequest(request) {
  return firstCredential([
    request.headers.get('x-marketing-key-session'),
    request.headers.get('x-marketing-session'),
    request.headers.get('authorization'),
    cookieValue(request, MARKETING_KEY_COOKIE_NAMES)
  ]);
}
function marketingKeyIdentityFromPayload(payload = {}) {
  const key = normalizeMarketingKey(payload.marketing_key || payload.tracking_tag || MARKETING_KEY_DEFAULT);
  const email = free99CleanEmail(payload.email || '');
  return {
    active: true,
    ok: true,
    marketing_key: key,
    tracking_tag: key,
    source: MARKETING_KEY_SESSION_ISSUER,
    sub: payload.sub || marketingKeyUserId(email, key),
    email,
    username: email,
    role: 'marketing-reader',
    scope: 'marketing-key.playbook.read',
    scopes: ['marketing-key.playbook.read'],
    workspace: `marketing-key:${key}`,
    workspace_role: 'reader',
    gate_card: {
      email,
      workspace: `marketing-key:${key}`,
      source: 'marketing-key-email-gate',
      marketing_key: key,
      tracking_tag: key
    },
    exp: payload.exp,
    iat: payload.iat,
    session_id: payload.nonce || ''
  };
}
async function issueMarketingKeySession(env, signup = {}) {
  const secrets = marketingKeySessionSecrets(env);
  if (!secrets.length) throw new Error('Marketing key session secret is not configured.');
  const now = Math.floor(Date.now() / 1000);
  const ttl = Math.max(300, Math.min(60 * 60 * 24 * 90, Number(env.MARKETING_KEY_SESSION_TTL_SECONDS || MARKETING_KEY_SESSION_TTL_SECONDS)));
  const key = normalizeMarketingKey(signup.marketing_key || signup.tracking_tag);
  const email = free99CleanEmail(signup.email);
  const payload = {
    iss: MARKETING_KEY_SESSION_ISSUER,
    aud: OWNER_ADMIN_SESSION_AUDIENCE,
    sub: signup.gate_user_id || marketingKeyUserId(email, key),
    email,
    role: 'marketing-reader',
    scope: 'marketing-key.playbook.read',
    marketing_key: key,
    tracking_tag: key,
    iat: now,
    exp: now + ttl,
    nonce: crypto.randomUUID ? crypto.randomUUID() : `mkt-${now}-${Math.random().toString(36).slice(2)}`
  };
  const encoded = base64UrlEncodeJson(payload);
  const signature = await hmacSha256Base64Url(secrets[0], encoded);
  return {
    token: `${MARKETING_KEY_SESSION_PREFIX}.${encoded}.${signature}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    maxAge: ttl,
    identity: marketingKeyIdentityFromPayload(payload)
  };
}
async function verifyMarketingKeySessionToken(rawToken, env) {
  const token = stripBearer(rawToken);
  if (!token) return {ok:false, status:401, error:'Missing marketing key session.'};
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== MARKETING_KEY_SESSION_PREFIX) {
    return {ok:false, status:401, error:'Not a marketing key session.'};
  }
  let payload = null;
  try {
    payload = base64UrlDecodeJson(parts[1]);
  } catch {
    return {ok:false, status:401, error:'Marketing key session payload is invalid.'};
  }
  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== MARKETING_KEY_SESSION_ISSUER || payload.aud !== OWNER_ADMIN_SESSION_AUDIENCE) {
    return {ok:false, status:401, error:'Marketing key session issuer/audience mismatch.'};
  }
  if (!payload.exp || Number(payload.exp) < now) {
    return {ok:false, status:401, error:'Marketing key session expired.'};
  }
  for (const secret of marketingKeySessionSecrets(env)) {
    const expected = await hmacSha256Base64Url(secret, parts[1]);
    if (expected === parts[2]) return {ok:true, status:200, data:marketingKeyIdentityFromPayload(payload), via:'marketing-key-session'};
  }
  return {ok:false, status:401, error:'Marketing key session signature mismatch.'};
}
function marketingKeyCookies(token, maxAge) {
  const encoded = encodeURIComponent(token || '');
  return MARKETING_KEY_COOKIE_NAMES.map(name => `${name}=${encoded}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.max(0, Number(maxAge || 0))}`);
}
function clearMarketingKeyCookies() {
  return MARKETING_KEY_COOKIE_NAMES.map(name => `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}
function isMarketingKeySurface(pathname) {
  return MARKETING_KEY_SURFACE_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
function marketingKeyLoginRedirect(url) {
  const loginUrl = new URL('/devs-playbook/login.html', url.origin);
  loginUrl.searchParams.set('key', MARKETING_KEY_DEFAULT);
  loginUrl.searchParams.set('return', `${url.pathname}${url.search}`);
  return new Response(null, {
    status: 302,
    headers: {
      location: loginUrl.toString(),
      'cache-control': 'no-store',
      'x-0s-marketing-gate': 'email-required'
    }
  });
}
async function requireMarketingKeyAuth(request, env, label = 'marketing key surface') {
  const operator = await requireOperatorAuth(request, env, label).catch(error => ({ok:false, error:error.message}));
  if (operator?.ok) return {...operator, marketing_key: MARKETING_KEY_DEFAULT, role: operator.role || 'owner'};
  const session = await verifyMarketingKeySessionToken(marketingKeyTokenFromRequest(request), env);
  if (session.ok) {
    return {
      ok: true,
      via: session.via,
      actor: session.data.email || session.data.sub || 'marketing-key-reader',
      role: 'marketing-reader',
      marketing_key: session.data.marketing_key || MARKETING_KEY_DEFAULT,
      identity: session.data,
      gate: {ok:true, data:session.data, via:session.via}
    };
  }
  return {ok:false, response:json({ok:false, error:session.error || `Unauthorized ${label}.`, marketing_gate:'email-required'}, session.status || 401)};
}
async function saveMarketingKeySignup(env, ctx, input = {}, session = null) {
  const now = new Date().toISOString();
  const key = normalizeMarketingKey(input.marketing_key || input.key || input.promo || input.tracking_tag || MARKETING_KEY_DEFAULT);
  const email = free99CleanEmail(input.email || input.contact_email);
  const gateUserId = marketingKeyUserId(email, key);
  const id = `marketing_key_${key}_${founderShortHash(`${email}:${Date.now()}`)}`;
  const signup = {
    id,
    type: 'marketing_keys.signup',
    table: 'marketing_keys',
    status: 'email_gate_session_issued',
    marketing_key: key,
    tracking_tag: key,
    gate_user_id: gateUserId,
    email,
    name: free99CleanText(input.name || input.full_name || '', 160),
    company: free99CleanText(input.company || input.company_name || input.business_name || '', 180),
    source: free99CleanText(input.source || 'devs-playbook', 120),
    return_to: marketingKeyReturnPath(input.returnTo || input.return_to || input.return),
    page: '/devs-playbook/',
    created_at: now,
    session_expires_at: session?.expiresAt || null,
    user_agent: free99CleanText(input.user_agent || '', 240)
  };
  const storage = marketingKeysStorage(env);
  const write = storage?.put
    ? storage.put(`${MARKETING_KEY_SIGNUP_PREFIX}${key}:${id}`, JSON.stringify(signup), {expirationTtl: 60 * 60 * 24 * 365})
    : Promise.resolve();
  const mirror = mirrorSkygateEvent(env, {type:'marketing_keys.signup', meta:{id, table:'marketing_keys', marketing_key:key, tracking_tag:key, gate_user_id:gateUserId, email, source:signup.source}});
  if (ctx?.waitUntil) {
    ctx.waitUntil(write);
    ctx.waitUntil(mirror);
  } else {
    await write;
    await mirror;
  }
  return signup;
}
async function saveMarketingKeyVisit(env, ctx, auth, url) {
  const storage = marketingKeysStorage(env);
  if (!storage?.put) return null;
  const now = new Date().toISOString();
  const key = normalizeMarketingKey(auth.marketing_key || auth.identity?.marketing_key || MARKETING_KEY_DEFAULT);
  const id = `marketing_visit_${key}_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`;
  const visit = {
    id,
    type: 'marketing_keys.visit',
    table: 'marketing_keys',
    marketing_key: key,
    tracking_tag: key,
    gate_user_id: auth.identity?.sub || '',
    email: auth.identity?.email || '',
    path: url.pathname,
    created_at: now
  };
  const write = storage.put(`${MARKETING_KEY_VISIT_PREFIX}${key}:${id}`, JSON.stringify(visit), {expirationTtl: 60 * 60 * 24 * 365});
  if (ctx?.waitUntil) ctx.waitUntil(write);
  else await write;
  return visit;
}
async function handleMarketingKeySignup(request, env, ctx) {
  if (request.method !== 'POST') return json({ok:false, error:'Method not allowed'}, 405);
  const body = await readJson(request);
  const email = free99CleanEmail(body.email || body.contact_email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ok:false, error:'A valid email is required for the marketing key gate.'}, 400);
  const key = normalizeMarketingKey(body.marketing_key || body.key || body.promo || body.tracking_tag || MARKETING_KEY_DEFAULT);
  const seed = {...body, email, marketing_key:key, tracking_tag:key, gate_user_id:marketingKeyUserId(email, key)};
  let session;
  try {
    session = await issueMarketingKeySession(env, seed);
  } catch (error) {
    return json({ok:false, error:error.message || 'Marketing key session secret is not configured.'}, 503);
  }
  const signup = await saveMarketingKeySignup(env, ctx, seed, session);
  return withSetCookies(json({
    ok: true,
    authenticated: true,
    marketing_key: key,
    tracking_tag: key,
    table: 'marketing_keys',
    gate_user: {
      id: signup.gate_user_id,
      email: signup.email,
      tracking_tag: key
    },
    expiresAt: session.expiresAt,
    returnTo: signup.return_to
  }, 200), marketingKeyCookies(session.token, session.maxAge));
}
async function handleMarketingKeysRoute(request, env, ctx, url) {
  if (url.pathname === '/api/marketing-keys/signup') return handleMarketingKeySignup(request, env, ctx);
  if (url.pathname === '/api/marketing-keys/logout') {
    return withSetCookies(json({ok:true, logged_out:true}), clearMarketingKeyCookies());
  }
  if (url.pathname === '/api/marketing-keys/me') {
    const auth = await requireMarketingKeyAuth(request, env, 'marketing key session');
    if (!auth.ok) return auth.response;
    return json({
      ok: true,
      authenticated: true,
      marketing_key: auth.marketing_key || MARKETING_KEY_DEFAULT,
      tracking_tag: auth.marketing_key || MARKETING_KEY_DEFAULT,
      gate_user: {
        id: auth.identity?.sub || '',
        email: auth.identity?.email || '',
        role: auth.role || 'marketing-reader'
      }
    });
  }
  if (url.pathname === '/api/marketing-keys/signups' || url.pathname === '/api/marketing-keys/summary') {
    const auth = await requireOperatorAuth(request, env, 'marketing key analytics');
    if (!auth.ok) return auth.response;
    const requested = normalizeMarketingKey(url.searchParams.get('key') || url.searchParams.get('marketing_key') || '');
    const prefix = url.searchParams.has('key') || url.searchParams.has('marketing_key')
      ? `${MARKETING_KEY_SIGNUP_PREFIX}${requested}:`
      : MARKETING_KEY_SIGNUP_PREFIX;
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 200)));
    const signups = await readMarketingKeyLedgerByPrefix(env, prefix, limit);
    const counts = {};
    for (const item of signups) {
      const key = normalizeMarketingKey(item.marketing_key || item.tracking_tag || MARKETING_KEY_DEFAULT);
      counts[key] = (counts[key] || 0) + 1;
    }
    return json({ok:true, table:'marketing_keys', signups, count:signups.length, counts});
  }
  return null;
}
async function free99DemoRotationTick(env, ctx, options = {}) {
  const record = await free99DemoActiveCodeRecord(env);
  const status = free99DemoCodeStatusPayload(record, env);
  const reason = !status.configured ? 'missing' : status.expired ? 'expired' : status.needs_rotation ? 'expiring' : '';
  if (!reason) return {ok:true, skipped:true, status, source:options.source || 'manual'};
  return free99MaybeSendDemoRotationPrompt(env, ctx, reason, record);
}
function skygateOrigin(env){
  return String(env.SKYGATEFS27_ORIGIN || env.SKYGATE_ORIGIN || '').replace(/\/+$/,'');
}
function skygateRequest(env, path, init = {}) {
  if (env.SKYGATEFS27_WORKER?.fetch) {
    return env.SKYGATEFS27_WORKER.fetch(new Request(`https://skyegatefs27.internal${path}`, init));
  }
  const origin = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev';
  return fetch(`${origin}${path}`, init);
}
function sovereignDocsLaneOrigin(env) {
  return String(env.SOVEREIGNDOCS_LANE_ORIGIN || DEFAULT_SOVEREIGNDOCS_LANE_ORIGIN).replace(/\/+$/, '');
}
function sovereignDocsDocxMaxLaneOrigin(env) {
  return String(env.SOVEREIGNDOCS_DOCXMAX_LANE_ORIGIN || env.SOVEREIGNDOCS_DOCS_LANE_ORIGIN || DEFAULT_SOVEREIGNDOCS_DOCXMAX_LANE_ORIGIN).replace(/\/+$/, '');
}
function isSovereignDocsStaticPath(pathname) {
  return pathname === SOVEREIGNDOCS_STATIC_MOUNT
    || pathname === `${SOVEREIGNDOCS_STATIC_MOUNT}/`
    || pathname.startsWith(`${SOVEREIGNDOCS_STATIC_MOUNT}/`);
}
function isSovereignDocsDocxMaxStaticPath(pathname) {
  return pathname === SOVEREIGNDOCS_DOCXMAX_STATIC_MOUNT
    || pathname === `${SOVEREIGNDOCS_DOCXMAX_STATIC_MOUNT}/`
    || pathname.startsWith(`${SOVEREIGNDOCS_DOCXMAX_STATIC_MOUNT}/`);
}
function mirrorSecret(env){
  return String(env.SKYGATEFS27_EVENT_MIRROR_SECRET || env.FS27_EVENT_MIRROR_SECRET || env.PLATFORM_EVENT_MIRROR_SECRET || env.SKYGATE_EVENT_MIRROR_SECRET || '').trim();
}
async function introspectFs27Token(token, env){
  const origin = skygateOrigin(env);
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
async function introspectAnyGateToken(token, env){
  const normalized = stripBearer(token);
  if (!normalized) return {ok:false, status:401, error:'Missing Authorization bearer token.'};
  const owner = await verifyOwnerAdminSessionToken(normalized, env);
  if (owner.ok) return owner;
  const demo = await verifyFree99DemoSessionToken(normalized, env);
  if (demo.ok) return demo;
  return introspectFs27Token(normalized, env);
}
async function introspectSkygate(request, env){
  return introspectAnyGateToken(bearer(request), env);
}
function scopeList(scope){
  if (Array.isArray(scope)) return scope.map(String);
  return String(scope || '').split(/\s+/).filter(Boolean);
}
function gateIdentity(claims = {}, env = null){
  const role = String(claims.role || claims.user?.role || '').toLowerCase();
  const scopes = new Set(scopeList(claims.scope || claims.scopes || claims.user?.scope).map(x=>x.toLowerCase()));
  const email = String(claims.email || claims.username || claims.user?.email || '').toLowerCase();
  const subject = String(claims.sub || claims.user_id || claims.userId || claims.user?.id || claims.email || claims.username || '').trim();
  const phone = routexPhone(claims.phone || claims.phone_number || claims.user?.phone || claims.user?.phone_number || claims.user?.phoneNumber);
  const smsOptIn = claims.sms_opt_in ?? claims.smsOptIn ?? claims.sms_consent ?? claims.smsConsent ?? claims.user?.sms_opt_in ?? claims.user?.smsOptIn ?? claims.user?.sms_consent ?? claims.user?.smsConsent;
  const routexRole = String(
    claims.routex_role
    || claims.routexRole
    || claims.workspace_role
    || claims.workspaceRole
    || claims.app_role
    || claims.appRole
    || claims.user?.routex_role
    || claims.user?.routexRole
    || role
    || ''
  ).toLowerCase();
  const musicArtistId = String(claims.artistId || claims.artist_id || claims.user?.artistId || '').trim();
  return {
    id: subject || email || 'skygate-user',
    subject,
    email,
    role,
    scopes:[...scopes],
    isAdmin:allowsAdminGate(claims, env || {}),
    routexRole,
    phone,
    sms_opt_in:routexConsentFlag(smsOptIn),
    smsOptIn:routexConsentFlag(smsOptIn),
    musicArtistId
  };
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
  const presented = presentedGateCredentials(request);
  const expected = ownerAdminAcceptedCodes(env);
  if (expected.length && presented.some(value => expected.includes(value))) {
    return {ok:true, via:'0s-free99-admin-code', actor:'0s-owner-admin'};
  }
  const gateToken = token || presented[0] || '';
  if (gateToken) {
    const owner = await verifyOwnerAdminSessionToken(gateToken, env);
    if (owner.ok && allowsAdminGate(owner.data, env)) {
      return {ok:true, via:owner.via || 'owner-admin-session', actor:owner.data?.email || owner.data?.sub || 'owner-admin', gate:{data:owner.data}};
    }
    const demo = await verifyFree99DemoSessionToken(gateToken, env);
    if (demo.ok) {
      return {ok:false, response:json({ok:false, error:`Free99 demo sessions are active for gated demos but cannot manage ${label}.`, skygate:demo.data || null}, 403)};
    }
  }
  if (skygateOrigin(env) || env.SKYGATEFS27_WORKER?.fetch) {
    const gate = await introspectAnyGateToken(gateToken, env);
    if (!gate.ok) return {ok:false, response:json({ok:false, error:gate.error || `Unauthorized ${label}.`, skygate:gate.data || null}, gate.status || 401)};
    if (!allowsAdminGate(gate.data, env)) {
      return {ok:false, response:json({ok:false, error:`SkyGate token is active but not admin-scoped for ${label}.`, skygate:gate.data || null}, 403)};
    }
    return {ok:true, via:'skygate', actor:gate.data?.email || gate.data?.username || gate.data?.sub || 'skygate-admin', gate};
  }
  return {ok:false, response:json({ok:false, error:`Unauthorized ${label}. Configure ADMIN_TOKEN/SITE_OPERATOR_ADMIN_TOKEN or SkyGate auth on this Worker.`}, 401)};
}
async function requireGateAuth(request, env, label = 'gated route'){
  const token = bearer(request);
  const presented = presentedGateCredentials(request);
  const expected = ownerAdminAcceptedCodes(env);
  if (expected.length && presented.some(value => expected.includes(value))) {
    const ownerIdentity = ownerAdminIdentity(env, {});
    const identity = gateIdentity(ownerIdentity, env);
    return {ok:true, via:'0s-free99-admin-code', actor:identity.email || '0s-owner-admin', role:identity.role || 'owner', identity, gate:{ok:true, data:ownerIdentity, via:'0s-free99-admin-code'}};
  }
  const demoCodeGate = await resolveFree99DemoCodeGate(env, presented);
  if (demoCodeGate.ok) {
    const identity = gateIdentity(demoCodeGate.data, env);
    return {
      ok:true,
      via:demoCodeGate.via || 'free99-demo-code',
      actor:identity.email || identity.id || 'free99-demo-user',
      role:identity.role || 'demo',
      gate:{ok:true, data:demoCodeGate.data, via:demoCodeGate.via || 'free99-demo-code'},
      identity
    };
  }
  const gateToken = token || presented[0] || '';
  if (gateToken) {
    const owner = await verifyOwnerAdminSessionToken(gateToken, env);
    if (owner.ok) {
      const identity = gateIdentity(owner.data, env);
      return {
        ok:true,
        via:owner.via || 'owner-admin-session',
        actor:identity.email || owner.data?.sub || 'owner-admin',
        role:identity.role || 'owner',
        gate:{ok:true, data:owner.data, via:owner.via || 'owner-admin-session'},
        identity
      };
    }
    const demo = await verifyFree99DemoSessionToken(gateToken, env);
    if (demo.ok) {
      const identity = gateIdentity(demo.data, env);
      return {
        ok:true,
        via:demo.via || 'free99-demo-session',
        actor:identity.email || identity.id || 'free99-demo-user',
        role:identity.role || 'demo',
        gate:{ok:true, data:demo.data, via:demo.via || 'free99-demo-session'},
        identity
      };
    }
    // 0S-issued JWTs that failed local verification must not be sent to FS27 —
    // FS27 doesn't know this format and would return active=false, causing a
    // spurious 401 instead of a clean re-login redirect.
    if (gateToken.startsWith(`${OWNER_ADMIN_SESSION_PREFIX}.`) || gateToken.startsWith(`${FREE99_DEMO_SESSION_PREFIX}.`)) {
      return {ok:false, response:json({ok:false, error:'0S gate session expired or invalid. Please re-authenticate.', gate:'0s-session-invalid'}, 401)};
    }
  }
  if (skygateOrigin(env) || env.SKYGATEFS27_WORKER?.fetch) {
    const gate = await introspectAnyGateToken(gateToken, env);
    if (!gate.ok) return {ok:false, response:json({ok:false, error:gate.error || `Unauthorized ${label}.`, skygate:gate.data || null}, gate.status || 401)};
    const identity = gateIdentity(gate.data, env);
    return {
      ok:true,
      via:'skygate',
      actor:identity.email || identity.id || 'skygate-user',
      role:identity.role || 'user',
      gate,
      identity
    };
  }
  return {ok:false, response:json({ok:false, error:`Unauthorized ${label}. Configure SkyGate auth on this Worker.`}, 401)};
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
    headers:{
      'content-type':'application/json',
      'x-skygate-mirror-secret':secret,
      'x-fs27-event-secret':secret,
      'x-platform-event-secret':secret,
      'x-skygate-mirror-sync':'1'
    },
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
      company_knowledge_r2: Boolean(env.COMPANY_KNOWLEDGE_BUCKET || env.COMPANY_KNOWLEDGE_R2),
      company_knowledge_kv: Boolean(env.COMPANY_KNOWLEDGE_KV || env.TENANT_BACKBONE_KV || env.CONTENT_ENGINE_KV || env.SITE_EVENTS_KV),
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
  const mounted = mount.id === 'clientAppFactory' && !appExternalConfigured(env, mount)
    ? true
    : appMountConfigured(env, mount);
  return {
    id: mount.id,
    name: mount.name,
    base: mount.base,
    aliases: mount.aliases || [],
    health: `${mount.base}/health`,
    mounted,
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
    if (mount.id === 'agenticGrowth') out.agentic_growth = mount.base;
    if (mount.id === 'keyGate13th') out.key_gate_13th = mount.base;
    return out;
  }, {
    companyKnowledge: '/api/0s/company-knowledge',
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
      'Company knowledge bases live under /api/0s/company-knowledge and use shared FS27/SkyGate/Free99 gate auth.',
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
  if (mount.id === 'sovereigndocs') {
    health.storage_mode = sdStorageMode(env);
    health.static_lane = {
      mount: `${SOVEREIGNDOCS_STATIC_MOUNT}/`,
      origin: sovereignDocsLaneOrigin(env),
      routing_model: '0s_worker_same_path_proxy'
    };
  }
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
    health.runtime_mode = appExternalConfigured(env, mount) ? 'dedicated_backend' : 'same_domain_platform_adapter';
    health.production_api_base = mount.base;
    health.local_runtime_audit = '/Marketing-Made-Easy/MME_RUNTIME_AUDIT.json';
    health.root_runtime_blocked = '/api/runtime/* returns api_root_collision on this Worker; Marketing Made Easy same-folder runtimes are not public 0S APIs.';
    health.source_blocked = 'runtime/local-runtime.mjs, runtime/store.json, runtime/data/*, netlify/functions/*, smoke/*, scripts/*, package.json, schema.sql, and deploy config files are blocked before static asset serving.';
    health.auth_mode = 'skygate-shared-lane';
    health.platform_shell = '/Marketing-Made-Easy/index.html';
    health.workspace_route = '/Marketing-Made-Easy/index.html?workspace=:slug';
    health.gate_owned = true;
    health.free99 = true;
    health.rate_limited = true;
  }
  if (mount.id === 'brandforge') {
    health.free99_core = true;
    health.gate_owned = true;
    health.production_api_base = mount.base;
    health.metered_routes = [
      '/api/brandforge/intelligence/meter',
      '/api/brandforge/intelligence/brief',
      '/api/brandforge/ai/generate'
    ];
    health.skyepay_ai_lane = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s&offer=brandforge-ai-generation';
    health.ai_generation_policy = 'model generation requires a paid SkyPay lane; Free99 core only returns deterministic local intelligence and receipts';
  }
  if (mount.id === 'socialBatchFactory') {
    health.ok = true;
    health.mounted = true;
    health.error = null;
    health.free99_core = true;
    health.gate_owned = true;
    health.static_app = SOCIAL_BATCH_FACTORY_RETURN_PATH;
    health.production_api_base = mount.base;
    health.plans = socialBatchPlanCatalog();
    health.metered_routes = [
      `${mount.base}/meter`,
      `${mount.base}/ai/generate`,
      `${mount.base}/checkout/create`,
      `${mount.base}/checkout/claim`,
      `${mount.base}/entitlement`
    ];
    health.ai_generation_policy = 'Free99 keeps every local export feature; paid AI copy generation requires a SkyPay entitlement and is forced through the FS27/SkyGate gateway.';
  }
  if (mount.id === 'clientAppFactory') {
    health.storage_mode = 'site_events_kv';
    health.execution_mode = appExternalConfigured(env, mount) ? 'dedicated_backend' : 'same_domain_factory_adapter';
    health.runtime_app_base = '/client-app-factory/generated/:clientId/';
    health.valley_import_base = `${mount.base}/factory/valley`;
  }
  if (mount.id === 'agenticGrowth') {
    health.ok = true;
    health.mounted = true;
    health.error = null;
    health.gate_owned = true;
    health.auth_mode = 'fs27_shared_gate_only';
    health.production_api_base = mount.base;
    health.operator_surface = '/agentic-growth-layer/';
    health.no_gsc_fallback = true;
    health.storage_mode = 'SITE_EVENTS_KV receipt ledger when configured';
    health.route_families = AGENTIC_GROWTH_ROUTE_FAMILIES;
    health.skyepay_lanes = [
      'agentic-growth-starter',
      'agentic-growth-connected',
      'agentic-growth-operator'
    ];
    health.api_key_policy = 'disabled on the 0S mount; every request must carry the shared FS27/SkyGate/Free99 gate session.';
  }
  if (mount.id === 'keyGate13th') {
    health.ok = true;
    health.mounted = true;
    health.error = null;
    health.gate_owned = true;
    health.auth_mode = 'fs27_shared_gate_only';
    health.production_api_base = mount.base;
    health.operator_surface = '/key-gate-13th/';
    health.storage_mode = 'SITE_EVENTS_KV encrypted custody ledger when configured';
    health.route_families = KEY_GATE_13_ROUTE_FAMILIES;
    health.skyepay_lanes = [
      'agentic-growth-starter',
      'agentic-growth-connected',
      'agentic-growth-operator'
    ];
    health.secret_policy = 'raw provider keys are accepted only on create/rotate, encrypted server-side, and never returned; Agentic Growth receives credential refs only.';
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
function appRouteEdgeAuthPolicy(mount, request, pathname, matchedBase = mount.base) {
  const suffix = appRouteSuffix(mount, pathname, matchedBase);
  if (mount.id === 'kaixuCodestudio') {
    if (!MUTATING_METHODS.has(request.method.toUpperCase())) return false;
    return suffix.startsWith('/platform/') || suffix === '/platform' || suffix.startsWith('/api/platform/') || suffix === '/api/platform'
      ? 'operator'
      : false;
  }
  if (mount.id === 'clientAppFactory') {
    return false;
  }
  if (mount.id === 'sovereigndocs') return (suffix === '/health' || suffix === '/routes/manifest') ? false : 'gate';
  if (mount.id === 'brandforge') return (suffix === '/health' || suffix === '/') ? false : 'gate';
  if (mount.id === 'socialBatchFactory') return (suffix === '/health' || suffix === '/' || suffix === '/plans') ? false : 'gate';
  if (mount.id === 'jobping') return (suffix === '/health' || suffix === '/') ? false : 'gate';
  if (mount.id === 'agenticGrowth') return 'gate';
  if (mount.id === 'keyGate13th') return 'gate';
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return false;
  return false;
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
const NORTHSTAR_OWNER_STATE_KEY = 'northstar:owner:workspace-state:metraiyux-0s-owner';
const NORTHSTAR_OWNER_USERS_KEY = 'northstar:owner:workspace-users:metraiyux-0s-owner';
const NORTHSTAR_OWNER_BACKUPS_KEY = 'northstar:owner:workspace-backups:metraiyux-0s-owner';
const NORTHSTAR_OWNER_WORKSPACES_KEY = 'northstar:owner:provisioned-workspaces';
function northstarStorage(env) {
  return env.NORTHSTAR_KV || env.SIGNINPRO_KV || env.SITE_EVENTS_KV || null;
}
function northstarOwnerWorkspace() {
  return {
    id: 'metraiyux-0s-owner',
    slug: 'metraiyux-0s-owner',
    name: 'MetrAIyux 0S Owner Command',
    status: 'owner-unlocked',
    plan: 'sovereign-owner',
    role: 'owner'
  };
}
function northstarDefaultOwnerState(identity = {}) {
  const now = new Date().toISOString();
  return {
    schemaVersion: 3,
    appVersion: '6.4.0-workspace-closure',
    workspace: northstarOwnerWorkspace(),
    settings: {
      logo: './assets/brand/signinpro-northstar-skye-tiger-logo.png',
      eventName: 'MetrAIyux 0S Owner Guest Access',
      idLabel: 'Gate ID',
      enableSound: true,
      allowDuplicateEmails: false,
      retentionNote: 'Owner workspace records are scoped to the shared 0S gate session.',
      syncEnabled: true
    },
    attendees: [],
    audit: [{
      id: `audit_${Date.now()}`,
      action: 'owner_session_opened',
      message: '0S owner session opened through the shared Free99 gate.',
      actor: identity.email || identity.sub || '0s-owner',
      timestamp: now
    }]
  };
}
async function northstarGetJson(env, key, fallback) {
  const kv = northstarStorage(env);
  if (!kv?.get) return fallback;
  return await kv.get(key, {type:'json'}).catch(() => null) || fallback;
}
async function northstarPutJson(env, key, value) {
  const kv = northstarStorage(env);
  if (!kv?.put) return false;
  await kv.put(key, JSON.stringify(value), {expirationTtl: 60 * 60 * 24 * 180});
  return true;
}
function northstarOwnerPayload(session) {
  const payload = ownerAdminResponsePayload(session);
  payload.product = 'SignIn Pro';
  payload.provider = 'NorthStar Office & Accounting';
  payload.workspace = northstarOwnerWorkspace();
  payload.user.permissions = uniqueNonEmpty([...(payload.user.permissions || []), 'operator', 'provision']);
  payload.bridge = {
    source: '0s-worker-owner-bridge',
    auth: 'FS27/SkyGate/Free99',
    apiBase: '/api/northstar'
  };
  return payload;
}
function northstarSharedGatePayload(auth) {
  const identity = auth?.identity || gateIdentity(auth?.gate?.data || {});
  const gateData = auth?.gate?.data || {};
  const isDemo = Boolean(gateData.demo || identity.role === 'demo' || scopeList(gateData.scope || identity.scopes).some(scope => /demo/i.test(scope)));
  const email = identity.email || gateData.email || gateData.username || '';
  const businessName = gateData.business_name || gateData.workspace_name || '';
  const workspaceId = gateData.workspace || identity.workspace || (isDemo ? 'free99-demo' : 'northstar-shared-gate');
  return {
    ok: true,
    authenticated: true,
    demo: isDemo,
    product: 'SignIn Pro',
    provider: 'NorthStar Office & Accounting',
    platform_id: gateData.platform_id || FREE99_DEMO_PLATFORM_ID,
    usage_lane: gateData.usage_lane || (isDemo ? FREE99_DEMO_USAGE_LANE : 'shared-0s-gate'),
    user: {
      email,
      role: identity.role || gateData.role || (isDemo ? 'demo' : 'user'),
      permissions: isDemo ? ['read', 'demo', 'signinpro.demo'] : ['read', 'workspace']
    },
    workspace: {
      id: workspaceId,
      slug: northstarSlug(businessName || workspaceId || email || 'northstar-workspace'),
      name: businessName || (isDemo ? 'Free99 Business Demo' : 'Shared 0S Gate Workspace'),
      status: isDemo ? 'demo' : 'active',
      plan: isDemo ? 'Free99 demo' : 'shared 0S gate'
    },
    bridge: {
      source: '0s-worker-shared-gate',
      auth: 'FS27/SkyGate/Free99',
      apiBase: '/api/northstar'
    }
  };
}
async function northstarSharedGateWorkspaceSync(request, env, ctx, auth) {
  const identity = auth?.identity || {};
  const gateData = auth?.gate?.data || {};
  const workspaceId = gateData.workspace || identity.workspace || 'northstar-shared-gate';
  if (request.method === 'GET') {
    return json({
      ok: true,
      state: null,
      updatedAt: null,
      forceRemote: false,
      persistence: 'browser-local',
      workspace: {
        id: workspaceId,
        slug: northstarSlug(gateData.business_name || workspaceId || identity.email || 'northstar-workspace')
      }
    });
  }
  if (request.method === 'POST') {
    const body = await readJson(request);
    const now = new Date().toISOString();
    const event = {
      type: 'northstar.shared_gate.workspace_sync',
      meta: {
        workspace_id: workspaceId,
        actor: identity.email || identity.id || auth?.actor || 'shared-gate-user',
        demo: Boolean(gateData.demo || identity.role === 'demo'),
        reason: free99CleanText(body.reason || 'workspace_update', 160),
        make_backup: body.makeBackup === true,
        state_keys: body.state && typeof body.state === 'object' ? Object.keys(body.state).slice(0, 40) : []
      }
    };
    if (ctx?.waitUntil) ctx.waitUntil(mirrorSkygateEvent(env, event));
    else await mirrorSkygateEvent(env, event);
    return json({
      ok: true,
      updatedAt: now,
      persistence: 'browser-local',
      stored: false,
      workspace: {
        id: workspaceId,
        slug: northstarSlug(gateData.business_name || workspaceId || identity.email || 'northstar-workspace')
      }
    });
  }
  return json({ok:false, error:'Method not allowed'}, 405);
}
async function resolveOwnerSessionFromRequest(request, env) {
  const presented = presentedGateCredentials(request);
  if (!presented.length) return {ok:false};
  const acceptedCodes = ownerAdminAcceptedCodes(env);
  if (acceptedCodes.length && presented.some(value => acceptedCodes.includes(value))) {
    const session = await issueOwnerAdminSession(env, {});
    return {ok:true, session, cookies:ownerAdminCookies(session.token, session.maxAge), via:'0s-free99-admin-code'};
  }
  for (const token of presented) {
    const owner = await verifyOwnerAdminSessionToken(token, env);
    if (owner.ok && allowsAdminGate(owner.data, env)) {
      return {
        ok:true,
        session:{
          token,
          expiresAt: owner.data?.exp ? new Date(owner.data.exp * 1000).toISOString() : '',
          maxAge: 0,
          identity: owner.data
        },
        cookies:[],
        via:owner.via || 'owner-admin-session'
      };
    }
  }
  return {ok:false};
}
function northstarSlug(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `workspace-${Date.now().toString(36)}`;
}
function northstarOneTimePassword() {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map(byte => alphabet[byte % alphabet.length]).join('');
}
async function handleNorthstarOwnerBridgeRoute(request, env, url, matchedBase) {
  const suffix = appRouteSuffix({base: matchedBase}, url.pathname, matchedBase);
  const bridged = new Set([
    '/auth-session',
    '/auth-logout',
    '/workspace-sync',
    '/workspace-audit',
    '/workspace-settings',
    '/workspace-users',
    '/workspace-backups',
    '/operator-provision',
    '/operator-workspaces'
  ]);
  if (!bridged.has(suffix)) return null;
  const owner = await resolveOwnerSessionFromRequest(request, env);
  if (!owner.ok) return null;
  const respond = (payload, status = 200) => withSetCookies(json(payload, status), owner.cookies || []);
  const payload = northstarOwnerPayload(owner.session);
  const storageMode = northstarStorage(env) ? 'kv' : 'browser-local';
  if (suffix === '/auth-session' && request.method === 'GET') {
    return respond({...payload, persistence:storageMode});
  }
  if (suffix === '/auth-logout' && request.method === 'POST') return handleOwnerAdminLogout();
  const storedRecord = await northstarGetJson(env, NORTHSTAR_OWNER_STATE_KEY, null);
  const currentState = storedRecord?.state || northstarDefaultOwnerState(owner.session.identity);
  if (suffix === '/workspace-sync' && request.method === 'GET') {
    return respond({ok:true, state:currentState, updatedAt:storedRecord?.updatedAt || null, forceRemote:false, persistence:storageMode});
  }
  if (suffix === '/workspace-sync' && request.method === 'POST') {
    const body = await readJson(request);
    const now = new Date().toISOString();
    const nextState = body.state && typeof body.state === 'object' ? body.state : currentState;
    const backupRecord = {id:`backup_${Date.now()}`, reason:body.reason || 'owner_update', state:nextState, createdAt:now, actor:owner.session.identity?.email || '0s-owner'};
    const backups = await northstarGetJson(env, NORTHSTAR_OWNER_BACKUPS_KEY, []);
    if (body.makeBackup === true) {
      backups.unshift(backupRecord);
      await northstarPutJson(env, NORTHSTAR_OWNER_BACKUPS_KEY, backups.slice(0, 50));
    }
    await northstarPutJson(env, NORTHSTAR_OWNER_STATE_KEY, {state:nextState, updatedAt:now, actor:backupRecord.actor});
    return respond({ok:true, state:nextState, updatedAt:now, backup:body.makeBackup === true ? backupRecord : null, persistence:storageMode});
  }
  if (suffix === '/workspace-audit' && request.method === 'GET') {
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 100)));
    return respond({ok:true, items:(currentState.audit || []).slice(0, limit), count:(currentState.audit || []).length, persistence:storageMode});
  }
  if (suffix === '/workspace-settings' && request.method === 'GET') return respond({ok:true, settings:currentState.settings || {}, persistence:storageMode});
  if (suffix === '/workspace-settings' && request.method === 'POST') {
    const body = await readJson(request);
    const now = new Date().toISOString();
    const nextState = {...currentState, settings:{...(currentState.settings || {}), ...(body || {})}};
    await northstarPutJson(env, NORTHSTAR_OWNER_STATE_KEY, {state:nextState, updatedAt:now, actor:owner.session.identity?.email || '0s-owner'});
    return respond({ok:true, settings:nextState.settings, updatedAt:now, persistence:storageMode});
  }
  const defaultUsers = [{email:owner.session.identity?.email || 'owner@metraiyux.local', role:'owner', permissions:payload.user.permissions, status:'active'}];
  if (suffix === '/workspace-users' && request.method === 'GET') {
    const users = await northstarGetJson(env, NORTHSTAR_OWNER_USERS_KEY, defaultUsers);
    return respond({ok:true, users, items:users, count:users.length, persistence:storageMode});
  }
  if (suffix === '/workspace-users' && request.method === 'POST') {
    const body = await readJson(request);
    const users = await northstarGetJson(env, NORTHSTAR_OWNER_USERS_KEY, defaultUsers);
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return respond({ok:false, error:'email_required'}, 400);
    const nextUser = {...body, email, role:body.role || 'operator', status:body.status || 'active', updatedAt:new Date().toISOString()};
    const nextUsers = [nextUser, ...users.filter(user => String(user.email || '').toLowerCase() !== email)];
    await northstarPutJson(env, NORTHSTAR_OWNER_USERS_KEY, nextUsers);
    return respond({ok:true, user:nextUser, users:nextUsers, persistence:storageMode}, 201);
  }
  if (suffix === '/workspace-backups' && request.method === 'GET') {
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 25)));
    const backups = await northstarGetJson(env, NORTHSTAR_OWNER_BACKUPS_KEY, []);
    return respond({ok:true, backups:backups.slice(0, limit), items:backups.slice(0, limit), count:backups.length, persistence:storageMode});
  }
  if (suffix === '/operator-workspaces' && request.method === 'GET') {
    const workspaces = await northstarGetJson(env, NORTHSTAR_OWNER_WORKSPACES_KEY, [northstarOwnerWorkspace()]);
    return respond({ok:true, workspaces, items:workspaces, count:workspaces.length, persistence:storageMode});
  }
  if (suffix === '/operator-provision' && request.method === 'POST') {
    const body = await readJson(request);
    const now = new Date().toISOString();
    const slug = northstarSlug(body.slug || body.name);
    const workspace = {id:`northstar:${slug}`, slug, name:String(body.name || slug).trim(), status:'provisioned', plan:body.plan || 'provided-infrastructure', createdAt:now, updatedAt:now};
    const user = {email:String(body.ownerEmail || body.email || '').trim().toLowerCase(), role:body.role || 'owner', status:'invited', workspaceSlug:slug, createdAt:now};
    if (!workspace.name || !user.email) return respond({ok:false, error:'workspace_name_and_owner_email_required'}, 400);
    const oneTimePassword = body.password || northstarOneTimePassword();
    const workspaces = await northstarGetJson(env, NORTHSTAR_OWNER_WORKSPACES_KEY, [northstarOwnerWorkspace()]);
    const nextWorkspaces = [workspace, ...workspaces.filter(item => item.slug !== slug)];
    await northstarPutJson(env, NORTHSTAR_OWNER_WORKSPACES_KEY, nextWorkspaces);
    return respond({ok:true, workspace, user, oneTimePassword, persistence:storageMode}, 201);
  }
  return null;
}
const BRANDFORGE_SKYEPAY_AI_URL = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s&offer=brandforge-ai-generation';
const SOCIAL_BATCH_FACTORY_RETURN_PATH = '/Free99/apps/social-batch-factory/index.html';
const SOCIAL_BATCH_FACTORY_SKYEPAY_BASE = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s&offer=';
const SOCIAL_BATCH_AI_PLANS = [
  {id:'free99-core', name:'Free99 Core', offer_id:null, lane:'free99-core', ai_enabled:false, included_generations:0, label:'all browser export tools, no AI calls'},
  {id:'social-batch-ai-burst', name:'AI Burst', offer_id:'social-batch-ai-burst', lane:'social-batch-ai-burst', ai_enabled:true, included_generations:75, label:'75 gated AI generations per month'},
  {id:'social-batch-ai-studio', name:'AI Studio', offer_id:'social-batch-ai-studio', lane:'social-batch-ai-studio', ai_enabled:true, included_generations:350, label:'350 gated AI generations per month'},
  {id:'social-batch-ai-unlimited', name:'AI Custom Cap', offer_id:'social-batch-ai-unlimited', lane:'social-batch-ai-unlimited', ai_enabled:true, included_generations:1000, unlimited:false, owner_approved_custom_cap:true, label:'owner-approved custom AI lane; defaults to 1,000 gated generations/month until written policy changes it'}
];
const JOBPING_SKYEPAY_RUNTIME_URL = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s&offer=jobping-runtime';
const JOBPING_PRODUCTION_REQUIREMENTS = [
  'actual JobPing source repo or complete deployable build',
  'runtime entrypoints, asset manifest, and route map',
  'database schema, migrations, seed/test data, and backup/restore path',
  'shared 0S auth adapter using FS27/SkyGate/Free99 session helpers only',
  'SkyPay product/price mapping plus confirmed payment webhook or claim flow',
  'metered AI route through the existing 0S provider gateway with usage receipts',
  'job provider integrations and email/SMS notification provider contracts',
  'background worker or queue behavior for scheduled job alerts',
  'owner ledger view for checkouts, AI usage, failures, and entitlement claims',
  'fresh-user login proof, paid entitlement proof, desktop/mobile browser proof, console/network proof, and rollback notes'
];
const SKYEPAY_CONFIRMED_PAYMENT_STATUSES = new Set(['paid', 'complete', 'no_payment_required', 'active', 'trialing']);
const PAID_AI_MODEL_FALLBACK = 'gpt-4.1-mini';
const PAID_LANE_CONFIGS = {
  brandforge: {
    app_id: 'brandforge',
    app_name: 'BrandForge',
    platform_id: 'brandforge-ai-generation',
    offer_id: 'brandforge-ai-generation',
    lane: 'brandforge-ai-generation',
    skyepay_url: BRANDFORGE_SKYEPAY_AI_URL,
    return_path: '/Free99/apps/brandforge/brandforge_campaign_studio_v5_uploaded_intro_silent.html?skipIntro=1',
    success_flag: 'brandforge_ai_paid',
    cancel_flag: 'brandforge_ai_cancelled'
  },
  jobping: {
    app_id: 'jobping',
    app_name: 'JobPing',
    platform_id: 'jobping',
    offer_id: 'jobping-runtime',
    lane: 'jobping-runtime',
    skyepay_url: JOBPING_SKYEPAY_RUNTIME_URL,
    return_path: '/Free99/apps/jobping/index.html',
    success_flag: 'jobping_paid',
    cancel_flag: 'jobping_cancelled'
  }
};
function brandforgeClean(value, max = 1200) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function appOrigin(request) {
  return new URL(request.url).origin;
}
function paidLaneConfig(appId) {
  return PAID_LANE_CONFIGS[appId] || null;
}
function paidLaneConfirmedPayment(order = {}) {
  return SKYEPAY_CONFIRMED_PAYMENT_STATUSES.has(String(order.payment_status || '').toLowerCase());
}
function paidLaneActor(identity = {}) {
  return brandforgeClean(identity.email || identity.id || identity.subject || identity.sub || 'gated-0s-user', 240);
}
async function paidLaneIdentityHash(identity = {}) {
  return founderHash(`${paidLaneActor(identity)}:${identity.role || ''}`);
}
function paidLaneEntitlementKey(config, identityHash) {
  return `${config.app_id}:entitlement:${config.offer_id}:${identityHash}`;
}
function paidLaneCheckoutKey(config, sessionId) {
  return `${config.app_id}:checkout:${sessionId}`;
}
function paidLaneReceiptKey(config, receiptId) {
  return `${config.app_id}:usage:${receiptId}`;
}
async function readKVJson(env, key) {
  if (!env.SITE_EVENTS_KV?.get) return null;
  return env.SITE_EVENTS_KV.get(key, {type:'json'}).catch(() => null);
}
async function paidLaneReadEntitlement(env, config, identity) {
  const identityHash = await paidLaneIdentityHash(identity);
  const entitlement = await readKVJson(env, paidLaneEntitlementKey(config, identityHash));
  const active = entitlement?.active === true && (!entitlement.expires_at || Date.parse(entitlement.expires_at) > Date.now());
  return {active, entitlement: active ? entitlement : null, identity_hash: identityHash};
}
async function paidLaneSaveEntitlement(env, config, identity, entitlement) {
  const identityHash = await paidLaneIdentityHash(identity);
  const record = {
    id: `${config.app_id}_entitlement_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`,
    type: `${config.app_id}.skyepay_entitlement`,
    app_id: config.app_id,
    platform_id: config.platform_id,
    offer_id: config.offer_id,
    active: true,
    actor: paidLaneActor(identity),
    identity_hash: identityHash,
    created_at: entitlement.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...entitlement
  };
  await saveKV(env, paidLaneEntitlementKey(config, identityHash), record);
  return record;
}
async function paidLaneMirror(env, config, auth, event) {
  return mirrorSkygateEvent(env, {
    source_app: 'metraiyux-0s',
    actor: paidLaneActor(auth?.identity || {}),
    type: event.type,
    resource_type: config.app_id,
    resource_id: event.resource_id || event.receipt_id || null,
    lane: config.lane,
    billable: event.billable === true,
    status: event.status || 'mirrored',
    summary: event.summary || '',
    meta: {
      app_id: config.app_id,
      platform_id: config.platform_id,
      offer_id: config.offer_id,
      ...event.meta
    }
  }, auth?.gate || null).catch(error => ({ok:false, error:error?.message || String(error)}));
}
function paidLaneCheckoutUrls(request, config) {
  const success = new URL(config.return_path, appOrigin(request));
  success.searchParams.set(config.success_flag, '1');
  success.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
  success.searchParams.set('offer', config.offer_id);
  const cancel = new URL(config.return_path, appOrigin(request));
  cancel.searchParams.set(config.cancel_flag, '1');
  cancel.searchParams.set('offer', config.offer_id);
  return {success_url: success.toString(), cancel_url: cancel.toString()};
}
async function paidLaneCreateCheckout(request, env, config, body, auth) {
  const customerEmail = brandforgeClean(body.customer_email || body.email || auth.identity?.email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return json({ok:false, error:'customer_email_required', message:'A valid email is required to create a SkyPay checkout session.'}, 400);
  }
  const urls = paidLaneCheckoutUrls(request, config);
  const checkoutBody = {
    client_slug: 'metraiyux-0s',
    workspace_slug: 'metraiyux-0s',
    offer_id: config.offer_id,
    customer_email: customerEmail,
    customer_name: brandforgeClean(body.customer_name || body.name || auth.identity?.email || '', 160),
    company_name: brandforgeClean(body.company_name || body.company || config.app_name, 180),
    idempotency_key: brandforgeClean(body.idempotency_key || `${config.app_id}_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`, 180),
    success_url: urls.success_url,
    cancel_url: urls.cancel_url,
    dry_run: body.proof_mode === true || body.skyepay_proof_mode === true
  };
  const response = await skygateRequest(env, '/skyepay/checkout', {
    method: 'POST',
    headers: {'content-type':'application/json', origin: appOrigin(request), 'x-skypay-proof-mode': checkoutBody.dry_run ? '1' : '0'},
    body: JSON.stringify(checkoutBody)
  });
  const data = await response.json().catch(() => ({ok:false, error:'invalid_skyepay_checkout_response'}));
  if (!response.ok || !data.ok) return json({ok:false, error:data.error || 'skyepay_checkout_failed', skyepay:data}, response.status || 502);
  const pending = {
    id: `${config.app_id}_checkout_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`,
    type: `${config.app_id}.skyepay_checkout_created`,
    app_id: config.app_id,
    platform_id: config.platform_id,
    offer_id: config.offer_id,
    actor: paidLaneActor(auth.identity),
    identity_hash: await paidLaneIdentityHash(auth.identity),
    customer_email: customerEmail,
    stripe_session_id: data.id,
    order_id: data.order_id || null,
    checkout_url: data.url || null,
    payment_status: data.payment_status || 'created',
    approval_status: data.approval_status || 'checkout_created',
    created_at: new Date().toISOString()
  };
  if (pending.stripe_session_id) await saveKV(env, paidLaneCheckoutKey(config, pending.stripe_session_id), pending);
  if (pending.order_id) await saveKV(env, `${config.app_id}:checkout-order:${pending.order_id}`, pending);
  await paidLaneMirror(env, config, auth, {
    type: `${config.app_id}.skyepay_checkout_created`,
    resource_id: pending.order_id || pending.stripe_session_id,
    billable: true,
    status: 'checkout_created',
    summary: `${config.app_name} SkyPay checkout created`,
    meta: {order_id: pending.order_id, stripe_session_id: pending.stripe_session_id, payment_status: pending.payment_status}
  });
  return json({ok:true, checkout:data, entitlement:{active:false, offer_id:config.offer_id, platform_id:config.platform_id}}, 201);
}
async function paidLaneClaimCheckout(request, env, config, body, auth) {
  const url = new URL(request.url);
  const softFail = body.soft_fail === true || url.searchParams.get('soft_fail') === '1';
  const fail = (payload, status) => json(softFail ? {...payload, ok:false, soft_failed:true, http_status:status} : payload, softFail ? 200 : status);
  const sessionId = brandforgeClean(body.session_id || body.sessionId || url.searchParams.get('session_id'), 220);
  if (!sessionId) return fail({ok:false, error:'session_id_required'}, 400);
  const pending = await readKVJson(env, paidLaneCheckoutKey(config, sessionId));
  const identityHash = await paidLaneIdentityHash(auth.identity);
  if (!pending) return fail({ok:false, error:'checkout_session_not_created_by_this_0s_app', message:'Create checkout from this gated app before claiming the entitlement.'}, 409);
  if (pending.identity_hash && pending.identity_hash !== identityHash) {
    return fail({ok:false, error:'checkout_session_identity_mismatch'}, 403);
  }
  const statusRes = await skygateRequest(env, `/skyepay/status?session_id=${encodeURIComponent(sessionId)}`, {
    method: 'GET',
    headers: {origin: appOrigin(request)}
  });
  const status = await statusRes.json().catch(() => ({ok:false, error:'invalid_skyepay_status_response'}));
  const order = status.order || {};
  if (!statusRes.ok || !status.ok) return fail({ok:false, error:status.error || 'skyepay_status_failed', skyepay:status}, statusRes.status || 502);
  if (order.offer_id !== config.offer_id) return fail({ok:false, error:'skyepay_offer_mismatch', expected_offer_id:config.offer_id, actual_offer_id:order.offer_id}, 409);
  if (!paidLaneConfirmedPayment(order)) {
    await saveKV(env, paidLaneCheckoutKey(config, sessionId), {...pending, last_status:order, updated_at:new Date().toISOString()});
    return fail({
      ok:false,
      checkout_required:true,
      payment_pending:true,
      payment_status: order.payment_status || null,
      approval_status: order.approval_status || null,
      provisioning_status: order.provisioning_status || null,
      message: 'SkyPay has not confirmed payment for this lane yet.'
    }, 402);
  }
  const entitlement = await paidLaneSaveEntitlement(env, config, auth.identity, {
    source: 'skyepay-status',
    stripe_session_id: sessionId,
    order_id: order.id || pending.order_id || null,
    payment_status: order.payment_status,
    approval_status: order.approval_status,
    provisioning_status: order.provisioning_status,
    skyepay_order: order
  });
  await paidLaneMirror(env, config, auth, {
    type: `${config.app_id}.skyepay_entitlement_unlocked`,
    resource_id: entitlement.order_id || sessionId,
    billable: true,
    status: 'entitlement_unlocked',
    summary: `${config.app_name} paid entitlement unlocked`,
    meta: {order_id: entitlement.order_id, payment_status: entitlement.payment_status, provisioning_status: entitlement.provisioning_status}
  });
  return json({ok:true, entitlement}, 200);
}
async function paidLaneStatus(env, config, auth) {
  const entitlement = await paidLaneReadEntitlement(env, config, auth.identity || {});
  return json({
    ok: true,
    app_id: config.app_id,
    platform_id: config.platform_id,
    offer_id: config.offer_id,
    skyepay_url: config.skyepay_url,
    entitlement: entitlement.active ? entitlement.entitlement : {active:false},
    checkout_create: `/api/${config.app_id}/checkout/create`,
    checkout_claim: `/api/${config.app_id}/checkout/claim`
  });
}
function paidLaneGatewayToken(env, config) {
  return firstCredential([
    env[`${config.app_id.toUpperCase()}_KAIXU_GATEWAY_KEY`],
    env[`${config.app_id.toUpperCase()}_GATEWAY_KEY`],
    env.KAIXU_GATEWAY_KEY,
    env.KAIXU_GATEWAY_SUBKEY,
    env.SKYGATEFS27_GATEWAY_KEY
  ]);
}
function paidLaneJsonFromText(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const direct = raw.match(/^\s*(\{[\s\S]*\}|\[[\s\S]*\])\s*$/);
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = direct?.[1] || fenced?.[1] || raw;
  try { return JSON.parse(candidate); } catch { return null; }
}
async function paidLaneCallAi(request, env, config, messages, usageLane) {
  const model = brandforgeClean(env.OPENAI_MODEL || PAID_AI_MODEL_FALLBACK, 80) || PAID_AI_MODEL_FALLBACK;
  const gatewayToken = paidLaneGatewayToken(env, config);
  if (gatewayToken?.startsWith('kx_live_')) {
    const response = await skygateRequest(env, '/gateway-chat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${gatewayToken}`,
        'x-skye-platform': config.platform_id,
        'x-0s-platform': config.app_id,
        'x-skye-usage-lane': usageLane,
        'x-free99-billing-mode': 'paid-skyepay',
        'x-kaixu-app': config.app_id,
        'x-kaixu-request-id': `${config.app_id}_${Date.now()}`,
        'x-0s-gate-session': bearer(request)
      },
      body: JSON.stringify({provider:'openai', model, messages, max_tokens:1100, temperature:0.72, platform_id:config.platform_id, usage_lane:usageLane})
    });
    const data = await response.json().catch(() => ({error:'invalid_gateway_response'}));
    if (response.ok) {
      return {
        ok: true,
        provider_path: 'fs27-gateway-chat',
        db_metered: true,
        output_text: data.output_text || '',
        parsed: paidLaneJsonFromText(data.output_text),
        usage: data.usage || null,
        telemetry: data.telemetry || null
      };
    }
    if (!env.OPENAI_API_KEY) {
      return {ok:false, status:response.status || 502, error:data.error || 'fs27_gateway_failed', provider_path:'fs27-gateway-chat'};
    }
  }
  if (!env.OPENAI_API_KEY) {
    return {ok:false, status:503, error:'paid_ai_provider_not_configured', message:'Configure a kx_live_ FS27 gateway key or OPENAI_API_KEY on the 0S Worker.'};
  }
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {'content-type':'application/json', authorization:`Bearer ${env.OPENAI_API_KEY}`},
    body: JSON.stringify({model, messages, max_tokens:1100, temperature:0.72, response_format:{type:'json_object'}})
  });
  const data = await response.json().catch(() => ({error:{message:'invalid_openai_response'}}));
  if (!response.ok) return {ok:false, status:response.status, error:data.error?.message || data.error || 'openai_request_failed', provider_path:'0s-openai-direct'};
  const outputText = data.choices?.[0]?.message?.content || '';
  return {
    ok: true,
    provider_path: '0s-openai-direct',
    db_metered: false,
    output_text: outputText,
    parsed: paidLaneJsonFromText(outputText),
    usage: data.usage ? {input_tokens:data.usage.prompt_tokens || 0, output_tokens:data.usage.completion_tokens || 0, total_tokens:data.usage.total_tokens || 0} : null
  };
}
async function paidLaneSaveUsage(env, config, auth, receipt) {
  const record = {
    id: receipt.id || `${config.app_id}_usage_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`,
    type: receipt.type || `${config.app_id}.paid_ai_usage`,
    app_id: config.app_id,
    platform_id: config.platform_id,
    offer_id: config.offer_id,
    actor: paidLaneActor(auth.identity || {}),
    created_at: new Date().toISOString(),
    metered: true,
    billable: true,
    ...receipt
  };
  await saveKV(env, paidLaneReceiptKey(config, record.id), record);
  await paidLaneMirror(env, config, auth, {
    type: record.type,
    receipt_id: record.id,
    billable: true,
    status: record.ok === false ? 'failed' : 'metered',
    summary: `${config.app_name} paid AI usage`,
    meta: {receipt_id:record.id, provider_path:record.provider_path, db_metered:record.db_metered, usage:record.usage || null}
  });
  return record;
}
function paidLaneFs27AdminPassword(env) {
  return firstCredential([
    env.SKYGATEFS27_ADMIN_PASSWORD,
    env.FS27_ADMIN_PASSWORD,
    env.SKYGATE_ADMIN_PASSWORD,
    env.SKYGATEFS13_ADMIN_PASSWORD,
    env.ADMIN_PASSWORD,
    env.QA_ADMIN_PASSWORD
  ]);
}
async function paidLaneFs27AuditEvents(env, config, limit = 100) {
  const adminPassword = paidLaneFs27AdminPassword(env);
  if (!adminPassword) return {ok:false, skipped:true, reason:'fs27_admin_secret_not_configured'};
  const response = await skygateRequest(env, `/.netlify/functions/admin-platform-events?app_id=metraiyux-0s&limit=${Math.max(1, Math.min(200, Number(limit) || 100))}`, {
    method: 'GET',
    headers: {'x-admin-password': adminPassword}
  });
  const data = await response.json().catch(() => ({ok:false, error:'invalid_fs27_audit_response'}));
  if (!response.ok) return {ok:false, status:response.status, error:data.error || 'fs27_audit_unavailable'};
  const events = (data.events || [])
    .filter(event => {
      const meta = event.meta || {};
      return meta.app_id === config.app_id || meta.platform_id === config.platform_id || event.lane === config.lane;
    })
    .map(event => ({
      id: event.id,
      type: event.type || event.action,
      app_id: config.app_id,
      platform_id: config.platform_id,
      source: 'fs27-audit-db',
      created_at: event.created_at,
      actor: event.actor,
      usage_lane: event.lane,
      billable: event.billable === true,
      db_metered: true,
      provider_path: event.meta?.provider_path || event.meta?.payload?.provider_path || null,
      usage: event.meta?.usage || event.meta?.payload?.usage || null,
      meta: event.meta || {}
    }));
  return {ok:true, source:'fs27-audit-db', events, summary:data.summary || null};
}
function brandforgeCampaignFromBody(body = {}) {
  const source = body.campaign && typeof body.campaign === 'object' ? body.campaign : body;
  return {
    headline: brandforgeClean(source.headline, 240),
    subline: brandforgeClean(source.subline, 420),
    cta: brandforgeClean(source.cta, 120),
    footer: brandforgeClean(source.footer || source.footerText, 160),
    brand: brandforgeClean(source.brand || source.contactBrand, 160),
    phone: brandforgeClean(source.phone || source.contactPhone, 120),
    url: brandforgeClean(source.url || source.contactUrl, 240)
  };
}
function brandforgeLocalIntelligence(campaign = {}) {
  const data = brandforgeCampaignFromBody(campaign);
  const combined = `${data.headline} ${data.subline} ${data.cta} ${data.footer} ${data.brand}`.toLowerCase();
  const signals = {
    local: /\b(local|near me|neighborhood|valley|city|same day|mobile)\b/.test(combined),
    proof: /\b(proof|verified|trusted|receipt|before|after|licensed|insured|guarantee)\b/.test(combined),
    urgency: /\b(today|now|fast|urgent|limited|tonight|this week|instant)\b/.test(combined),
    premium: /\b(concierge|studio|premium|private|executive|bespoke|white glove)\b/.test(combined),
    hiring: /\b(hiring|jobs|career|apply|recruit|talent|interview)\b/.test(combined)
  };
  const words = combined.split(/\s+/).filter(Boolean);
  let score = 42;
  if (data.headline) score += 12;
  if (data.subline) score += 10;
  if (data.cta) score += 10;
  if (data.brand) score += 8;
  if (data.url || data.phone) score += 8;
  score += Object.values(signals).filter(Boolean).length * 4;
  if (words.length > 44) score -= 6;
  if (data.headline.length > 86) score -= 5;
  score = Math.max(0, Math.min(100, score));
  const channels = signals.hiring
    ? ['local job boards', 'SMS applicant follow-up', 'short-form hiring creative']
    : signals.local
      ? ['Google Business Profile', 'neighborhood landing page', 'SMS lead capture']
      : ['landing page', 'retargeting creative', 'email follow-up'];
  const missing = [];
  if (!data.brand) missing.push('brand');
  if (!data.headline) missing.push('headline');
  if (!data.cta) missing.push('cta');
  if (!data.url && !data.phone) missing.push('contact path');
  const angle = signals.hiring ? 'recruiting' : signals.premium ? 'premium service' : signals.local ? 'local demand' : 'direct response';
  return {
    ok: true,
    platform_id: 'brandforge',
    generated_by: 'brandforge-worker-intelligence',
    ai_generation: false,
    paid_generation_required_for_model_call: true,
    skyepay_ai_url: BRANDFORGE_SKYEPAY_AI_URL,
    score,
    angle,
    signals,
    missing,
    channels,
    brief: {
      audience: signals.hiring ? 'qualified candidates who need a quick next step' : 'buyers ready to compare a real provider',
      promise: data.headline || `${data.brand || 'This offer'} made clear`,
      proof: signals.proof ? 'Proof language is already present.' : 'Add a receipt, result, guarantee, or real outcome before scaling spend.',
      next_copy: [
        `${data.headline || data.brand || 'Your offer'} - ${data.subline || 'clear value, fast next step'}`,
        `${data.brand || 'BrandForge'}: ${data.cta || (signals.hiring ? 'Apply now' : 'Book now')}`,
        `${score >= 75 ? 'Scale' : 'Tighten'} ${angle} creative around ${channels[0]}.`
      ]
    }
  };
}
function brandforgeUsageLane(request, body = {}, fallback = 'brandforge-local-intelligence') {
  return brandforgeClean(request.headers.get('x-skye-usage-lane') || body.usage_lane || fallback, 120) || fallback;
}
async function brandforgeSaveReceipt(env, receipt) {
  await saveKV(env, `brandforge:intelligence:${receipt.id}`, receipt).catch(() => {});
  return receipt;
}
async function brandforgeReceipt(request, env, body, type, usageLane, identity = {}) {
  const now = new Date().toISOString();
  const payloadText = JSON.stringify(body || {});
  const receipt = {
    id: `brandforge_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`,
    ok: true,
    type,
    platform_id: 'brandforge',
    usage_lane: usageLane,
    skyepay_lane: brandforgeClean(request.headers.get('x-skyepay-lane') || body.skyepay_lane || (usageLane.includes('ai') ? 'brandforge-ai-generation' : 'free99-core'), 160),
    metered: true,
    free99_core: !usageLane.includes('ai'),
    input_chars: payloadText.length,
    actor: identity.email || identity.id || identity.sub || 'gated-0s-user',
    created_at: now,
    billing_mode: request.headers.get('x-free99-billing-mode') || 'free99'
  };
  return brandforgeSaveReceipt(env, receipt);
}
function brandforgePaidMessages(body = {}, local = null) {
  const campaign = brandforgeCampaignFromBody(body);
  const intelligence = local || brandforgeLocalIntelligence({campaign});
  return [
    {
      role: 'system',
      content: 'You are BrandForge inside the MetrAIyux 0S paid lane. Return strict JSON only. Build practical campaign intelligence, not generic marketing copy. Include proof, CTA, landing page, SMS/email, and operator notes.'
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Generate a paid BrandForge campaign package.',
        required_json_shape: {
          campaign_copy: ['three headline plus subline plus CTA variants'],
          landing_page: ['section outline with proof placement and primary action'],
          sms_email: ['one SMS draft and one email draft'],
          proof_plan: ['three proof assets or receipts to capture before spend'],
          operator_notes: ['specific risks, missing inputs, and next actions']
        },
        campaign,
        local_intelligence: intelligence
      })
    }
  ];
}
async function handleBrandForgePaidGeneration(request, env, body, auth) {
  const config = paidLaneConfig('brandforge');
  const entitlement = await paidLaneReadEntitlement(env, config, auth.identity || {});
  if (!entitlement.active) {
    const receipt = await brandforgeReceipt(request, env, body, 'brandforge.ai_generation_checkout_required', config.lane, auth.identity);
    return json({
      ok: false,
      checkout_required: true,
      metered: true,
      receipt_id: receipt.id,
      skyepay_ai_url: config.skyepay_url,
      checkout_create: '/api/brandforge/checkout/create',
      checkout_claim: '/api/brandforge/checkout/claim',
      entitlement: {active:false},
      message: 'BrandForge model generation unlocks after confirmed SkyPay checkout. Free99 core can still run local intelligence.'
    }, 402);
  }
  const local = brandforgeLocalIntelligence(body);
  const ai = await paidLaneCallAi(request, env, config, brandforgePaidMessages(body, local), config.lane);
  const receipt = await paidLaneSaveUsage(env, config, auth, {
    ok: ai.ok,
    type: ai.ok ? 'brandforge.ai_generation_completed' : 'brandforge.ai_generation_failed',
    usage_lane: config.lane,
    provider_path: ai.provider_path || null,
    db_metered: ai.db_metered === true,
    usage: ai.usage || null,
    input_chars: JSON.stringify(body || {}).length,
    error: ai.ok ? null : ai.error || 'paid_ai_failed'
  });
  if (!ai.ok) {
    return json({ok:false, error:ai.error || 'paid_ai_failed', message:ai.message || null, receipt_id:receipt.id, entitlement:entitlement.entitlement}, ai.status || 502);
  }
  return json({
    ok: true,
    ai_generation: true,
    local,
    result: ai.parsed || {raw: ai.output_text},
    output_text: ai.output_text,
    usage: ai.usage,
    provider_path: ai.provider_path,
    db_metered: ai.db_metered === true,
    receipt_id: receipt.id,
    entitlement: entitlement.entitlement
  });
}
async function handleBrandForgeRoute(request, env, url, matchedBase, mount) {
  const suffix = appRouteSuffix({base: matchedBase}, url.pathname, matchedBase);
  if (suffix === '/' || suffix === '/health') {
    return json({
      ...appHealth(mount, env),
      ok: true,
      free99_core: true,
      paid_ai_generation: true,
      skyepay_ai_url: BRANDFORGE_SKYEPAY_AI_URL,
      checkout_create: '/api/brandforge/checkout/create',
      checkout_claim: '/api/brandforge/checkout/claim',
      entitlement_status: '/api/brandforge/entitlement',
      ledger: '/api/brandforge/ledger'
    });
  }
  const auth = await requireGateAuth(request, env, 'BrandForge intelligence lane');
  if (!auth.ok) return auth.response;
  if (suffix === '/entitlement' && request.method === 'GET') return paidLaneStatus(env, paidLaneConfig('brandforge'), auth);
  if (suffix === '/ledger' && request.method === 'GET') {
    const operator = await requireOperatorAuth(request, env, 'BrandForge paid usage ledger');
    if (!operator.ok) return operator.response;
    const kvEvents = [
      ...await readKVLedgerByPrefix(env, 'brandforge:usage:', 100),
      ...await readKVLedgerByPrefix(env, 'brandforge:intelligence:', 100),
      ...await readKVLedgerByPrefix(env, 'brandforge:checkout:', 50)
    ];
    const fs27Audit = await paidLaneFs27AuditEvents(env, paidLaneConfig('brandforge'), 100);
    const events = [...kvEvents, ...(fs27Audit.events || [])].sort((a,b)=>String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0, 150);
    return json({ok:true, app_id:'brandforge', events, fs27_audit:fs27Audit, summary:{total:events.length, kv:kvEvents.length, fs27_db:(fs27Audit.events || []).length, paid_ai:events.filter(item => item.billable || item.usage_lane === 'brandforge-ai-generation').length}});
  }
  if (request.method !== 'POST') {
    return json({ok:false, error:'method_not_allowed', allowed:['GET','POST'], base:matchedBase}, 405);
  }
  const body = await readJson(request);
  if (suffix === '/checkout/create') return paidLaneCreateCheckout(request, env, paidLaneConfig('brandforge'), body, auth);
  if (suffix === '/checkout/claim') return paidLaneClaimCheckout(request, env, paidLaneConfig('brandforge'), body, auth);
  const usageLane = brandforgeUsageLane(request, body);
  if (suffix === '/intelligence/meter') {
    const receipt = await brandforgeReceipt(request, env, body, brandforgeClean(body.event_type || 'brandforge.metered_event', 180), usageLane, auth.identity);
    return json({ok:true, metered:true, receipt}, 201);
  }
  if (suffix === '/intelligence/brief') {
    const local = brandforgeLocalIntelligence(body);
    const receipt = await brandforgeReceipt(request, env, body, 'brandforge.intelligence_brief', usageLane || 'brandforge-brief', auth.identity);
    return json({
      ok: true,
      local,
      brief: local.brief,
      meter: {ok:true, receipt_id: receipt.id, usage_lane: receipt.usage_lane},
      ai_generation: false,
      paid_generation_lane: BRANDFORGE_SKYEPAY_AI_URL
    });
  }
  if (suffix === '/ai/generate') {
    return handleBrandForgePaidGeneration(request, env, body, auth);
  }
  return json({ok:false, error:'brandforge_route_not_found', requested_path:url.pathname, base:matchedBase}, 404);
}
function socialBatchSkyPayUrl(offerId) {
  return offerId ? `${SOCIAL_BATCH_FACTORY_SKYEPAY_BASE}${encodeURIComponent(offerId)}` : null;
}
function socialBatchPlan(planId = 'free99-core') {
  return SOCIAL_BATCH_AI_PLANS.find(plan => plan.id === planId || plan.offer_id === planId) || SOCIAL_BATCH_AI_PLANS[0];
}
function socialBatchPlanCatalog() {
  return SOCIAL_BATCH_AI_PLANS.map(plan => ({
    ...plan,
    skyepay_url: socialBatchSkyPayUrl(plan.offer_id),
    price_source: plan.ai_enabled ? 'SkyPay offer catalog' : 'Free99'
  }));
}
function socialBatchPaidConfig(planInput = 'social-batch-ai-burst') {
  const plan = typeof planInput === 'string' ? socialBatchPlan(planInput) : planInput;
  if (!plan?.ai_enabled || !plan.offer_id) return null;
  return {
    app_id: 'social-batch-factory',
    app_name: 'Social Batch Factory',
    platform_id: 'social-batch-factory',
    offer_id: plan.offer_id,
    lane: plan.lane,
    skyepay_url: socialBatchSkyPayUrl(plan.offer_id),
    return_path: SOCIAL_BATCH_FACTORY_RETURN_PATH,
    success_flag: 'social_batch_ai_paid',
    cancel_flag: 'social_batch_ai_cancelled'
  };
}
function socialBatchGatewayToken(env, config) {
  return firstCredential([
    env.SOCIAL_BATCH_FACTORY_KAIXU_GATEWAY_KEY,
    env.SOCIAL_BATCH_FACTORY_GATEWAY_KEY,
    env.SOCIALBATCHFACTORY_KAIXU_GATEWAY_KEY,
    env.SOCIALBATCHFACTORY_GATEWAY_KEY,
    paidLaneGatewayToken(env, config)
  ]);
}
function socialBatchClean(value, max = 1200) {
  return brandforgeClean(value, max);
}
function socialBatchCampaignFromBody(body = {}) {
  const campaign = body.campaign || body.inputs || body;
  return {
    brandName: socialBatchClean(campaign.brandName || campaign.brand || campaign.business, 160),
    campaignName: socialBatchClean(campaign.campaignName || campaign.name || 'Campaign', 180),
    idea: socialBatchClean(campaign.idea || campaign.prompt || '', 1800),
    offer: socialBatchClean(campaign.offer || '', 1000),
    cta: socialBatchClean(campaign.cta || 'Learn More', 120),
    audience: socialBatchClean(campaign.audience || '', 260),
    tone: socialBatchClean(campaign.tone || '', 120),
    campaignType: socialBatchClean(campaign.campaignType || campaign.type || '', 120),
    url: socialBatchClean(campaign.url || '', 260),
    phone: socialBatchClean(campaign.phone || '', 120),
    hashtagSeed: socialBatchClean(campaign.hashtagSeed || '', 500)
  };
}
function socialBatchPaidMessages(body = {}, plan = socialBatchPlan()) {
  const campaign = socialBatchCampaignFromBody(body);
  const selected = body.selected_creative || body.creative || {};
  return [
    {
      role: 'system',
      content: 'You are Social Batch Factory inside the MetrAIyux 0S paid AI lane. Return strict JSON only. Create practical campaign copy for generated social graphics. Do not invent testimonials, legal claims, guarantees, awards, prices, dates, or provider details.'
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Generate a paid Social Batch Factory copy package.',
        plan: {id:plan.id, name:plan.name, lane:plan.lane},
        required_json_shape: {
          campaign_update: {idea:'optional improved source idea', offer:'optional improved offer', cta:'short CTA', hashtagSeed:'space separated hashtags'},
          selected_creative: {headline:'short graphic headline', subline:'supporting subline', cta:'short visible CTA'},
          copy_deck: [{headline:'headline', subline:'subline', cta:'CTA'}],
          audit_notes: ['specific risks or proof checks before exporting']
        },
        campaign,
        selected_creative: {
          name: socialBatchClean(selected.name, 160),
          group: socialBatchClean(selected.group, 120),
          format: socialBatchClean(selected.format, 120),
          headline: socialBatchClean(selected.headline, 220),
          subline: socialBatchClean(selected.subline, 360),
          cta: socialBatchClean(selected.cta, 120)
        },
        asset_count: Math.max(0, Math.min(100, Number(body.asset_count || 0))),
        audit: body.audit || null
      })
    }
  ];
}
async function socialBatchMonthlyUsage(env, config, auth, plan) {
  const identityHash = await paidLaneIdentityHash(auth.identity || {});
  const usageMonth = new Date().toISOString().slice(0, 7);
  const counterKey = `social-batch-factory:usage-count:${plan.id}:${identityHash}:${usageMonth}`;
  const counter = await readKVJson(env, counterKey);
  const rows = await readKVLedgerByPrefix(env, `${config.app_id}:usage:`, 250);
  const monthly = rows.filter(row =>
    row.identity_hash === identityHash &&
    row.plan_id === plan.id &&
    row.usage_month === usageMonth &&
    row.type === 'social-batch-factory.ai_generation_completed' &&
    row.ok !== false
  );
  const monthlyCount = Math.max(Number(counter?.monthly_count || 0), monthly.length);
  return {
    identity_hash: identityHash,
    usage_month: usageMonth,
    counter_key: counterKey,
    monthly_count: monthlyCount,
    included_generations: plan.included_generations,
    unlimited: plan.unlimited === true,
    remaining: plan.unlimited ? null : Math.max(0, Number(plan.included_generations || 0) - monthlyCount)
  };
}
async function socialBatchSaveUsageCounter(env, usage, nextCount) {
  if (!usage?.counter_key) return null;
  const record = {
    app_id: 'social-batch-factory',
    type: 'social-batch-factory.ai_usage_counter',
    identity_hash: usage.identity_hash,
    usage_month: usage.usage_month,
    monthly_count: nextCount,
    updated_at: new Date().toISOString()
  };
  await saveKV(env, usage.counter_key, record);
  return record;
}
async function socialBatchMeterReceipt(env, auth, body = {}, eventType = 'social-batch-factory.metered_event') {
  const id = `social_batch_factory_meter_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`;
  const record = {
    id,
    type: socialBatchClean(body.event_type || eventType, 180),
    app_id: 'social-batch-factory',
    actor: paidLaneActor(auth.identity || {}),
    identity_hash: await paidLaneIdentityHash(auth.identity || {}),
    usage_lane: socialBatchClean(body.usage_lane || 'free99-core', 160),
    metered: true,
    billable: false,
    input_chars: JSON.stringify(body || {}).length,
    created_at: new Date().toISOString()
  };
  await saveKV(env, `social-batch-factory:meter:${id}`, record);
  await mirrorSkygateEvent(env, {
    source_app: 'metraiyux-0s',
    actor: record.actor,
    type: record.type,
    resource_type: 'social-batch-factory',
    resource_id: id,
    lane: record.usage_lane,
    billable: false,
    status: 'metered',
    summary: 'Social Batch Factory Free99 usage receipt',
    meta: {receipt_id:id, app_id:'social-batch-factory'}
  }, auth.gate || null).catch(error => ({ok:false, error:error?.message || String(error)}));
  return record;
}
async function socialBatchCallGateAi(request, env, config, messages, usageLane) {
  const model = brandforgeClean(env.OPENAI_MODEL || PAID_AI_MODEL_FALLBACK, 80) || PAID_AI_MODEL_FALLBACK;
  const gatewayToken = socialBatchGatewayToken(env, config);
  if (!gatewayToken) {
    return {ok:false, status:503, error:'fs27_gateway_token_missing', message:'Configure the shared FS27/SkyGate gateway token on the 0S Worker. Provider keys must not be exposed in the UI.'};
  }
  const response = await skygateRequest(env, '/gateway-chat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${gatewayToken}`,
      'x-skye-platform': config.platform_id,
      'x-0s-platform': config.app_id,
      'x-skye-usage-lane': usageLane,
      'x-free99-billing-mode': 'paid-skyepay',
      'x-kaixu-app': config.app_id,
      'x-kaixu-request-id': `${config.app_id}_${Date.now()}`,
      'x-0s-gate-session': bearer(request)
    },
    body: JSON.stringify({provider:'openai', model, messages, max_tokens:1100, temperature:0.72, platform_id:config.platform_id, usage_lane:usageLane})
  });
  const data = await response.json().catch(() => ({error:'invalid_gateway_response'}));
  if (!response.ok) return {ok:false, status:response.status || 502, error:data.error || 'fs27_gateway_failed', provider_path:'fs27-gateway-chat'};
  return {
    ok: true,
    provider_path: 'fs27-gateway-chat',
    db_metered: true,
    output_text: data.output_text || '',
    parsed: paidLaneJsonFromText(data.output_text),
    usage: data.usage || null,
    telemetry: data.telemetry || null
  };
}
async function handleSocialBatchFactoryRoute(request, env, url, matchedBase, mount) {
  const suffix = appRouteSuffix({base: matchedBase}, url.pathname, matchedBase);
  if (suffix === '/' || suffix === '/health') {
    return json({
      ...appHealth(mount, env),
      ok: true,
      free99_core: true,
      paid_ai_generation: true,
      static_app: SOCIAL_BATCH_FACTORY_RETURN_PATH,
      plans: socialBatchPlanCatalog(),
      checkout_create: '/api/social-batch-factory/checkout/create',
      checkout_claim: '/api/social-batch-factory/checkout/claim',
      entitlement_status: '/api/social-batch-factory/entitlement',
      ledger: '/api/social-batch-factory/ledger'
    });
  }
  if (suffix === '/plans' && request.method === 'GET') {
    const selected = socialBatchPlan(url.searchParams.get('plan_id') || url.searchParams.get('plan') || 'free99-core');
    return json({ok:true, app_id:'social-batch-factory', selected_plan:selected.id, plan:{...selected, skyepay_url:socialBatchSkyPayUrl(selected.offer_id)}, plans:socialBatchPlanCatalog()});
  }
  const auth = await requireGateAuth(request, env, 'Social Batch Factory AI lane');
  if (!auth.ok) return auth.response;
  if (suffix === '/entitlement' && request.method === 'GET') {
    const plan = socialBatchPlan(url.searchParams.get('plan_id') || url.searchParams.get('plan') || 'free99-core');
    if (!plan.ai_enabled) return json({ok:true, plan, entitlement:{active:true, free99:true}, usage:{monthly_count:0, remaining:0, unlimited:false}});
    const config = socialBatchPaidConfig(plan);
    const entitlement = await paidLaneReadEntitlement(env, config, auth.identity || {});
    const usage = await socialBatchMonthlyUsage(env, config, auth, plan);
    return json({ok:true, plan:{...plan, skyepay_url:config.skyepay_url}, entitlement:entitlement.active ? entitlement.entitlement : {active:false}, usage, checkout_create:'/api/social-batch-factory/checkout/create', checkout_claim:'/api/social-batch-factory/checkout/claim'});
  }
  if (suffix === '/ledger' && request.method === 'GET') {
    const operator = await requireOperatorAuth(request, env, 'Social Batch Factory usage ledger');
    if (!operator.ok) return operator.response;
    const kvEvents = [
      ...await readKVLedgerByPrefix(env, 'social-batch-factory:usage:', 150),
      ...await readKVLedgerByPrefix(env, 'social-batch-factory:meter:', 150),
      ...await readKVLedgerByPrefix(env, 'social-batch-factory:checkout:', 80)
    ];
    const fs27Audit = await paidLaneFs27AuditEvents(env, socialBatchPaidConfig('social-batch-ai-burst'), 100);
    const events = [...kvEvents, ...(fs27Audit.events || [])].sort((a,b)=>String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0, 200);
    return json({ok:true, app_id:'social-batch-factory', events, fs27_audit:fs27Audit, summary:{total:events.length, kv:kvEvents.length, fs27_db:(fs27Audit.events || []).length, paid_ai:events.filter(item => item.billable || String(item.usage_lane || '').includes('social-batch-ai')).length}});
  }
  if (request.method !== 'POST') return json({ok:false, error:'method_not_allowed', allowed:['GET','POST'], base:matchedBase}, 405);
  const body = await readJson(request);
  const plan = socialBatchPlan(body.plan_id || body.plan || url.searchParams.get('plan_id') || 'free99-core');
  if (suffix === '/meter') {
    const receipt = await socialBatchMeterReceipt(env, auth, body);
    return json({ok:true, metered:true, receipt}, 201);
  }
  if (suffix === '/checkout/create') {
    if (!plan.ai_enabled) return json({ok:false, error:'free99_has_no_ai_checkout', message:'Free99 keeps local features and has no AI entitlement to buy.'}, 400);
    return paidLaneCreateCheckout(request, env, socialBatchPaidConfig(plan), body, auth);
  }
  if (suffix === '/checkout/claim') {
    if (!plan.ai_enabled) return json({ok:false, error:'free99_has_no_ai_checkout'}, 400);
    return paidLaneClaimCheckout(request, env, socialBatchPaidConfig(plan), body, auth);
  }
  if (suffix === '/ai/generate') {
    if (!plan.ai_enabled) {
      const receipt = await socialBatchMeterReceipt(env, auth, body, 'social-batch-factory.ai_generation_blocked_free99');
      return json({ok:false, checkout_required:true, error:'free99_ai_disabled', message:'Free99 includes the complete local app, but AI generation requires a paid Social Batch Factory tier.', receipt_id:receipt.id, plans:socialBatchPlanCatalog()}, 402);
    }
    const config = socialBatchPaidConfig(plan);
    const entitlement = await paidLaneReadEntitlement(env, config, auth.identity || {});
    if (!entitlement.active) {
      const receipt = await socialBatchMeterReceipt(env, auth, body, 'social-batch-factory.ai_generation_checkout_required');
      return json({ok:false, checkout_required:true, metered:true, receipt_id:receipt.id, skyepay_url:config.skyepay_url, checkout_create:'/api/social-batch-factory/checkout/create', checkout_claim:'/api/social-batch-factory/checkout/claim', entitlement:{active:false}, message:'Social Batch Factory paid AI unlocks only after confirmed SkyPay checkout. Free99 core remains available.'}, 402);
    }
    const usage = await socialBatchMonthlyUsage(env, config, auth, plan);
    if (!usage.unlimited && usage.remaining <= 0) {
      return json({ok:false, error:'monthly_ai_meter_exhausted', checkout_required:true, usage, plan:{...plan, skyepay_url:config.skyepay_url}, message:'This Social Batch Factory AI tier has used its monthly included generations. Upgrade or wait for the next meter month.'}, 429);
    }
    const ai = await socialBatchCallGateAi(request, env, config, socialBatchPaidMessages(body, plan), config.lane);
    const nextUsage = {...usage, monthly_count:usage.monthly_count + (ai.ok ? 1 : 0), remaining:usage.unlimited ? null : Math.max(0, usage.remaining - (ai.ok ? 1 : 0))};
    const receipt = await paidLaneSaveUsage(env, config, auth, {
      ok: ai.ok,
      type: ai.ok ? 'social-batch-factory.ai_generation_completed' : 'social-batch-factory.ai_generation_failed',
      usage_lane: config.lane,
      provider_path: ai.provider_path || 'fs27-gateway-chat',
      db_metered: true,
      usage: ai.usage || null,
      plan_id: plan.id,
      identity_hash: usage.identity_hash,
      usage_month: usage.usage_month,
      monthly_count_after: nextUsage.monthly_count,
      input_chars: JSON.stringify(body || {}).length,
      error: ai.ok ? null : ai.error || 'social_batch_ai_failed'
    });
    if (ai.ok) await socialBatchSaveUsageCounter(env, usage, nextUsage.monthly_count);
    if (!ai.ok) return json({ok:false, error:ai.error || 'social_batch_ai_failed', message:ai.message || null, receipt_id:receipt.id, entitlement:entitlement.entitlement, usage}, ai.status || 502);
    return json({ok:true, ai_generation:true, result:ai.parsed || {raw: ai.output_text}, output_text:ai.output_text, usage:nextUsage, provider_path:ai.provider_path, db_metered:true, receipt_id:receipt.id, entitlement:entitlement.entitlement, plan:{...plan, skyepay_url:config.skyepay_url}});
  }
  return json({ok:false, error:'social_batch_factory_route_not_found', requested_path:url.pathname, base:matchedBase}, 404);
}
function jobpingProfileFromBody(body = {}) {
  return {
    candidate: brandforgeClean(body.candidate || body.resume || body.candidate_profile, 5000),
    job: brandforgeClean(body.job || body.job_description || body.role, 5000),
    location: brandforgeClean(body.location, 160),
    constraints: brandforgeClean(body.constraints || body.notes, 1200),
    notification_channel: brandforgeClean(body.notification_channel || body.channel || 'email', 80)
  };
}
function jobpingLocalTriage(profile = {}) {
  const text = `${profile.candidate} ${profile.job} ${profile.constraints}`.toLowerCase();
  const signals = {
    remote: /\b(remote|hybrid|work from home)\b/.test(text),
    urgent: /\b(urgent|immediate|asap|today|this week)\b/.test(text),
    senior: /\b(senior|lead|principal|manager|director)\b/.test(text),
    technical: /\b(javascript|react|python|sql|cloudflare|aws|data|api|engineer|developer)\b/.test(text),
    operations: /\b(operations|coordinator|logistics|dispatch|admin|support)\b/.test(text)
  };
  const filled = [profile.candidate, profile.job, profile.location].filter(Boolean).length;
  const score = Math.max(0, Math.min(100, 38 + filled * 12 + Object.values(signals).filter(Boolean).length * 5));
  return {
    ok: true,
    generated_by: 'jobping-local-triage',
    ai_generation: false,
    score,
    signals,
    missing: [
      !profile.candidate ? 'candidate profile' : '',
      !profile.job ? 'job description' : '',
      !profile.location ? 'location' : ''
    ].filter(Boolean),
    next_step: score >= 72 ? 'Run paid match and prepare outreach.' : 'Add missing candidate/job detail before sending.'
  };
}
function jobpingPaidMessages(body = {}) {
  const profile = jobpingProfileFromBody(body);
  const local = jobpingLocalTriage(profile);
  return [
    {
      role: 'system',
      content: 'You are JobPing inside the MetrAIyux 0S paid runtime lane. Return strict JSON only. Analyze job fit honestly; do not invent credentials, jobs, interviews, or employer claims.'
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Generate a paid JobPing match packet.',
        required_json_shape: {
          match_score: '0-100 integer',
          fit_reasons: ['specific reasons the candidate fits the job'],
          gaps_and_risks: ['specific concerns or missing details'],
          outreach: {subject: 'short subject', message: 'ready-to-send outreach'},
          next_steps: ['operator actions before notification']
        },
        profile,
        local_triage: local
      })
    }
  ];
}
function jobpingMissingRuntimeResponse(extra = {}, status = 501) {
  return json({
    ok: false,
    error: 'jobping_runtime_missing',
    message: 'JobPing is mounted as a gated 0S pricing lane, but the real imported JobPing runtime/source is not present in this repo. Fake triage, fake checkout activation, and fake paid AI execution are disabled.',
    runtime_available: false,
    pricing_lane_mounted: true,
    skyepay_url: JOBPING_SKYEPAY_RUNTIME_URL,
    requirements: JOBPING_PRODUCTION_REQUIREMENTS,
    ...extra
  }, status);
}
async function handleJobPingRoute(request, env, url, matchedBase, mount) {
  const config = paidLaneConfig('jobping');
  const suffix = appRouteSuffix({base: matchedBase}, url.pathname, matchedBase);
  if (suffix === '/' || suffix === '/health') {
    return json({
	      ...appHealth(mount, env),
	      ok: true,
	      free99_core: false,
	      paid_runtime: false,
	      runtime_available: false,
	      pricing_lane_mounted: true,
	      skyepay_url: config.skyepay_url,
	      checkout_create: null,
	      checkout_claim: null,
	      entitlement_status: '/api/jobping/entitlement',
	      match_route: null,
	      ledger: '/api/jobping/ledger',
	      requirements: JOBPING_PRODUCTION_REQUIREMENTS
	    });
	  }
  const auth = await requireGateAuth(request, env, 'JobPing paid runtime lane');
  if (!auth.ok) return auth.response;
  if (suffix === '/entitlement' && request.method === 'GET') return paidLaneStatus(env, config, auth);
  if (suffix === '/ledger' && request.method === 'GET') {
    const operator = await requireOperatorAuth(request, env, 'JobPing paid usage ledger');
    if (!operator.ok) return operator.response;
    const kvEvents = [
      ...await readKVLedgerByPrefix(env, 'jobping:usage:', 100),
      ...await readKVLedgerByPrefix(env, 'jobping:checkout:', 50)
    ];
    const fs27Audit = await paidLaneFs27AuditEvents(env, config, 100);
    const events = [...kvEvents, ...(fs27Audit.events || [])].sort((a,b)=>String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0, 150);
    return json({ok:true, app_id:'jobping', events, fs27_audit:fs27Audit, summary:{total:events.length, kv:kvEvents.length, fs27_db:(fs27Audit.events || []).length, paid_runtime:events.filter(item => item.billable).length}});
  }
	  if (request.method !== 'POST') return json({ok:false, error:'method_not_allowed', allowed:['GET','POST'], base:matchedBase}, 405);
	  const body = await readJson(request);
	  if (suffix === '/checkout/create') return jobpingMissingRuntimeResponse({disabled_endpoint:'/api/jobping/checkout/create'}, 409);
	  if (suffix === '/checkout/claim') return jobpingMissingRuntimeResponse({disabled_endpoint:'/api/jobping/checkout/claim'}, 409);
	  if (suffix === '/triage') {
	    return jobpingMissingRuntimeResponse({disabled_endpoint:'/api/jobping/triage', input_chars: JSON.stringify(body || {}).length}, 409);
	  }
	  if (suffix === '/ai/match') {
	    return jobpingMissingRuntimeResponse({disabled_endpoint:'/api/jobping/ai/match', input_chars: JSON.stringify(body || {}).length}, 409);
	  }
  return json({ok:false, error:'jobping_route_not_found', requested_path:url.pathname, base:matchedBase}, 404);
}
async function handleAppApiRoute(request, env, ctx, url) {
  const match = appApiMatchFor(url.pathname);
  if (!match) return null;
  const {mount, base:matchedBase} = match;
  if (mount.id === 'media') return null;
  const edgeAuthPolicy = appRouteEdgeAuthPolicy(mount, request, url.pathname, matchedBase);
  if (edgeAuthPolicy === 'operator') {
    const label = mount.id === 'kaixuCodestudio'
      ? 'kAIxu CodeStudio platform mutation'
      : `${mount.name} mutation`;
    const auth = await requireOperatorAuth(request, env, label);
    if (!auth.ok) return auth.response;
  } else if (edgeAuthPolicy === 'gate') {
    const auth = await requireGateAuth(request, env, `${mount.name} gated route`);
    if (!auth.ok) return auth.response;
  }
  if (mount.id === 'clientAppFactory' && !appExternalConfigured(env, mount)) {
    return handleClientAppFactoryRoute(request, env, url, matchedBase);
  }
  if (mount.id === 'marketingMadeEasy' && !appExternalConfigured(env, mount)) {
    return handleMarketingMadeEasyRoute(request, env, url, matchedBase, mount, {
      requireGateAuth,
      mirrorSkygateEvent
    });
  }
  if (mount.id === 'keyGate13th') return handleKeyGate13Route(request, env, ctx, url, matchedBase, mount, {
    requireGateAuth,
    mirrorSkygateEvent
  });
  if (url.pathname === `${matchedBase}/health`) return json(appHealth(mount, env), appMountConfigured(env, mount) ? 200 : 503);
  if (mount.id === 'northstar') {
    const ownerBridge = await handleNorthstarOwnerBridgeRoute(request, env, url, matchedBase);
    if (ownerBridge) return ownerBridge;
    if (request.method === 'GET' && url.pathname === `${matchedBase}/auth-session`) {
      const auth = await requireGateAuth(request, env, 'NorthStar auth session');
      if (auth.ok) return json(northstarSharedGatePayload(auth));
      if (bearer(request)) return auth.response;
    }
    if (url.pathname === `${matchedBase}/workspace-sync`) {
      const auth = await requireGateAuth(request, env, 'NorthStar shared gate workspace sync');
      if (auth.ok) return northstarSharedGateWorkspaceSync(request, env, ctx, auth);
      if (bearer(request)) return auth.response;
    }
  }
  if (mount.id === 'northstar' && request.method === 'GET' && url.pathname === `${matchedBase}/auth-session` && !bearer(request)) {
    return json({
      ok: false,
      authenticated: false,
      product: 'SignIn Pro',
      provider: 'NorthStar Office & Accounting',
      loginRequired: true
    }, 200);
  }
  if (mount.id === 'sovereigndocs' && !appExternalConfigured(env, mount)) return sdHandleSovereignDocsRoute(request, env, null, url);
  if (mount.id === 'kaixuCodestudio' && !appExternalConfigured(env, mount)) return kaiHandleCodeStudioRoute(request, env, url);
  if (mount.id === 'brandforge') return handleBrandForgeRoute(request, env, url, matchedBase, mount);
  if (mount.id === 'socialBatchFactory') return handleSocialBatchFactoryRoute(request, env, url, matchedBase, mount);
  if (mount.id === 'jobping') return handleJobPingRoute(request, env, url, matchedBase, mount);
  if (mount.id === 'agenticGrowth') return handleAgenticGrowthRoute(request, env, ctx, url, matchedBase, mount, {
    requireGateAuth,
    mirrorSkygateEvent
  });
  if (mount.id === 'skyeroutex' && !appExternalConfigured(env, mount)) return routexHandleRoute(request, env, url, matchedBase);
  if (mount.id === 'skymusicnexus' && !appExternalConfigured(env, mount)) return musicHandleRoute(request, env, url);
  if (mount.id === 'profit' && !appExternalConfigured(env, mount)) return profitHandleRoute(request, env, url, matchedBase);
  if (mount.id === 'houseops' && !appExternalConfigured(env, mount)) return houseopsHandleRoute(request, env, url, matchedBase);
  if (!appMountConfigured(env, mount)) return appRouteNotMounted(mount, env, url.pathname);
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
async function readKVLedgerByPrefix(env, prefix, limit = 100) {
  if (!env.SITE_EVENTS_KV?.list) return [];
  const listed = await env.SITE_EVENTS_KV.list({prefix, limit});
  const rows = [];
  for (const key of listed.keys || []) {
    const item = await env.SITE_EVENTS_KV.get(key.name, {type:'json'}).catch(() => null);
    if (item) rows.push({...item, kv_key:key.name});
  }
  return rows.sort((a,b)=>String(b.created_at || b.event_ts || '').localeCompare(String(a.created_at || a.event_ts || '')));
}
function cleanValleyRelayText(value, max = 1000) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function valleyRelayLeadFromBody(body = {}) {
  const createdAt = new Date().toISOString();
  const id = cleanValleyRelayText(body.id, 120) || `vvrelay_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`;
  const mode = cleanValleyRelayText(body.mode, 24) === 'admin' ? 'admin' : 'public';
  return {
    id,
    type: mode === 'admin' ? 'valley_verified.admin_brain_note' : 'valley_verified.public_relay_lead',
    source: 'valley_verified_brain',
    status: 'captured_for_operator_review',
    created_at: cleanValleyRelayText(body.created_at, 40) || createdAt,
    received_at: createdAt,
    mode,
    route: cleanValleyRelayText(body.route || 'unknown', 80),
    source_url: cleanValleyRelayText(body.source_url, 500),
    page_title: cleanValleyRelayText(body.page_title, 240),
    contact: {
      name: cleanValleyRelayText(body.contact?.name || body.name, 160),
      email: cleanValleyRelayText(body.contact?.email || body.email, 240),
      phone: cleanValleyRelayText(body.contact?.phone || body.phone, 80),
      company: cleanValleyRelayText(body.contact?.company || body.company, 220)
    },
    message: cleanValleyRelayText(body.message || body.text || body.note, 3000),
    transcript: Array.isArray(body.transcript) ? body.transcript.slice(-10).map(item => ({
      role: cleanValleyRelayText(item?.role, 40),
      text: cleanValleyRelayText(item?.text || item?.html, 900)
    })) : [],
    metadata: {
      user_agent: cleanValleyRelayText(body.user_agent, 300),
      build_lane: 'valley_verified_brain_v1'
    }
  };
}
async function handleValleyVerifiedRelay(request, env, ctx, url) {
  if (url.pathname !== '/api/valley-verified/relay-leads') return null;
  if (request.method === 'GET') {
    const auth = await requireOperatorAuth(request, env, 'Valley Verified relay ledger');
    if (!auth.ok) return auth.response;
    const events = (await readKVLedger(env, 100)).filter(item => String(item.type || '').startsWith('valley_verified.'));
    return json({ok:true, events, count:events.length, persistence:Boolean(env.SITE_EVENTS_KV) ? 'kv' : 'none'});
  }
  if (request.method !== 'POST') return json({ok:false, error:'Method not allowed'}, 405);
  const body = await readJson(request);
  const lead = valleyRelayLeadFromBody(body);
  const queuePayload = {
    ...lead,
    queue: lead.mode === 'admin' ? 'valley_admin_brain_notes' : 'valley_public_relay_leads',
    task_title: lead.mode === 'admin'
      ? `Valley admin note: ${lead.route}`
      : `Valley lead: ${lead.contact.company || lead.contact.name || lead.route || 'visitor'}`
  };
  if (ctx?.waitUntil) {
    ctx.waitUntil(saveKV(env, lead.id, lead));
    if (env.SITE_TASK_QUEUE) ctx.waitUntil(env.SITE_TASK_QUEUE.send(queuePayload));
    ctx.waitUntil(mirrorSkygateEvent(env, {
      type:'valley_verified.relay_lead',
      meta:{
        lead_id:lead.id,
        mode:lead.mode,
        route:lead.route,
        status:lead.status,
        contact:lead.contact.email || lead.contact.phone || lead.contact.name || '',
        message_preview:String(lead.message || '').slice(0, 500)
      }
    }));
  } else {
    await saveKV(env, lead.id, lead);
    if (env.SITE_TASK_QUEUE) await env.SITE_TASK_QUEUE.send(queuePayload);
    await mirrorSkygateEvent(env, {type:'valley_verified.relay_lead', meta:{lead_id:lead.id, mode:lead.mode, route:lead.route}});
  }
  return json({ok:true, lead, queued:Boolean(env.SITE_TASK_QUEUE), stored:Boolean(env.SITE_EVENTS_KV), ledger:'/api/valley-verified/relay-leads'});
}

async function handleValleyVerifiedAdminBrain(request, env, url) {
  const adminBrainPaths = new Set([
    '/api/valley-verified/admin-brain-index',
    '/valley-verified/data/brain-admin-index.json',
    '/valley-verified/api/brain-admin-index.json',
    '/api/brain-admin-index.json'
  ]);
  if (!adminBrainPaths.has(url.pathname)) return null;
  if (request.method === 'OPTIONS') return json({ok:true});
  if (request.method !== 'GET') return json({ok:false, error:'Method not allowed'}, 405);
  const auth = await requireOperatorAuth(request, env, 'Valley Verified Admin Brain');
  if (!auth.ok) return auth.response;
  if (!env.ASSETS) return json({ok:false, error:'Static asset binding is not configured for Valley Verified Admin Brain.'}, 502);
  const assetResponse = await env.ASSETS.fetch(assetBindingRequest(request, '/valley-verified/data/brain-admin-index.json', ''));
  if (!assetResponse.ok) return json({ok:false, error:'Admin Brain index asset not found.'}, assetResponse.status || 404);
  const headers = new Headers(assetResponse.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  headers.set('x-valley-admin-brain-auth', auth.via || 'operator');
  return new Response(assetResponse.body, {
    status: assetResponse.status,
    statusText: assetResponse.statusText,
    headers
  });
}

function founderCommandLinks() {
  return [
    {label:'0S route manifest', href:'/api/0s/route-manifest', kind:'api'},
    {label:'Site operator status', href:'/api/site-operator/status', kind:'api'},
    {label:'Founder Relay13 inbox', href:'/founder-command/?tab=inbox', kind:'operator'},
    {label:'Founder Relay13 API', href:'/api/founder-command/inbox', kind:'api'},
    {label:'Founder recovery packets', href:'/api/founder-command/recovery', kind:'api'},
    {label:'Valley owner CRM', href:'/valley-verified/owner-crm/', kind:'admin'},
    {label:'Valley lead inbox', href:'/valley-verified/lead-inbox/', kind:'admin'},
    {label:'SkyeBox Authenticator', href:'/Free99/apps/skyebox-authenticator/', kind:'app'},
    {label:'Client App Factory', href:'/client-app-factory/', kind:'app'},
    {label:'Relay13 chat hub', href:'/live/relay13-chat-hub.html', kind:'proof'},
    {label:'Gate proof surface', href:'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/gate-proofx.html', kind:'gate'}
  ];
}
function founderDefaultLimits() {
  return {
    emergency:{max_uses:1, ttl_minutes:30, seats:1, monthly_actions:25, requires_rotation:true},
    client:{max_uses:3, ttl_minutes:1440, seats:3, monthly_actions:250, requires_rotation:true},
    operator:{max_uses:5, ttl_minutes:720, seats:5, monthly_actions:500, requires_rotation:false},
    prospect:{max_uses:10, ttl_minutes:240, seats:2, monthly_actions:100, requires_rotation:true}
  };
}
function founderLimitPacket(body = {}) {
  const requestedType = String(body.code_type || body.type || 'client').toLowerCase();
  const normalizedType = requestedType === 'demo' ? 'prospect' : requestedType;
  const defaults = founderDefaultLimits()[normalizedType] || founderDefaultLimits().client;
  const clamp = (value, fallback, min, max) => Math.max(min, Math.min(max, Number(value ?? fallback) || fallback));
  return {
    max_uses:clamp(body.max_uses, defaults.max_uses, 1, 500),
    ttl_minutes:clamp(body.ttl_minutes, defaults.ttl_minutes, 5, 60 * 24 * 30),
    seats:clamp(body.seats, defaults.seats, 1, 250),
    monthly_actions:clamp(body.monthly_actions, defaults.monthly_actions, 1, 100000),
    requires_rotation:body.requires_rotation === undefined ? defaults.requires_rotation : Boolean(body.requires_rotation),
    custom_rules:uniqueNonEmpty(Array.isArray(body.custom_rules) ? body.custom_rules : String(body.custom_rules || '').split(/\n|,/g)).slice(0, 20)
  };
}
function founderRandomCode(type = 'client') {
  const prefix = String(type || 'client').replace(/[^a-z0-9]+/gi, '').slice(0, 8).toUpperCase() || 'GATE';
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const token = bytesToBase64Url(bytes).replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 16);
  return `0S-${prefix}-${token.match(/.{1,4}/g).join('-')}`;
}
function founderRandomSecret(prefix = 'RECOVERY', byteLength = 18) {
  const cleanPrefix = String(prefix || 'RECOVERY').replace(/[^a-z0-9]+/gi, '').slice(0, 10).toUpperCase() || 'RECOVERY';
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  const token = bytesToBase64Url(bytes).replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return `0S-${cleanPrefix}-${token.match(/.{1,4}/g).slice(0, 6).join('-')}`;
}
async function founderHash(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value || '')));
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function founderActor(auth) {
  return auth?.actor || auth?.gate?.data?.email || auth?.gate?.data?.sub || 'owner-admin';
}
function founderSlug(value, fallback = 'workspace') {
  const slug = String(value || fallback).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return slug || fallback;
}
function founderShortHash(value) {
  let hash = 2166136261;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).slice(0, 8);
}
function founderIdentityPacket(body = {}) {
  const email = String(body.email || body.customer_email || body.approval_email || '').trim().toLowerCase();
  const company = String(body.company || body.company_name || body.client || body.workspace || email.split('@')[0] || 'customer').trim();
  const workspaceSlug = founderSlug(body.workspace_slug || body.slug || company, 'customer-workspace');
  const seed = `${workspaceSlug}:${email}:${String(body.plan || 'starter-command')}`;
  const suffix = founderShortHash(seed);
  return {
    customer_id: String(body.customer_id || `cust_${workspaceSlug}_${suffix}`).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120),
    workspace_id: String(body.workspace_id || `ws_${workspaceSlug}_${suffix}`).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120),
    workspace_slug: workspaceSlug,
    company_name: company,
    owner_email: email,
    gate_username: email || `${workspaceSlug}@gate.metraiyux.local`,
    proposed_skyemail_alias: `${workspaceSlug}@skymail.local`,
    plan: String(body.plan || 'starter-command').slice(0, 80),
    client_login_path: `/saas/client-login.html?client=${encodeURIComponent(workspaceSlug)}`,
    founder_recovery_path: `/founder-command/?tab=recovery&workspace=${encodeURIComponent(workspaceSlug)}`,
    issued_at: new Date().toISOString()
  };
}
async function founderCommandCodes(request, env, ctx, auth) {
  if (request.method === 'GET') {
    const events = (await readKVLedger(env, 200)).filter(item => String(item.type || '').startsWith('founder_command.code'));
    return json({ok:true, codes:events, count:events.length, persistence:Boolean(env.SITE_EVENTS_KV) ? 'kv' : 'none'});
  }
  if (request.method !== 'POST') return json({ok:false, error:'Method not allowed'}, 405);
  const body = await readJson(request);
  const codeType = String(body.code_type || body.type || 'client').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'client';
  const code = founderRandomCode(codeType);
  const now = new Date();
  const limits = founderLimitPacket({...body, code_type:codeType});
  const expiresAt = new Date(now.getTime() + limits.ttl_minutes * 60 * 1000).toISOString();
  const id = `founder_code_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`;
  const record = {
    id,
    type:'founder_command.code.generated',
    code_type:codeType,
    status:'generated_not_revealed_again',
    code_hash:await founderHash(code),
    code_preview:`${code.slice(0, 9)}...${code.slice(-4)}`,
    client:String(body.client || body.workspace || '').slice(0, 160),
    scope:uniqueNonEmpty(Array.isArray(body.scope) ? body.scope : String(body.scope || 'gate.login provision emergency').split(/\s|,/g)).slice(0, 30),
    limits,
    notes:String(body.notes || '').slice(0, 1000),
    gate_bridge:{origin:skygateOrigin(env) || 'service-binding', source_app:env.SKYGATE_SOURCE_APP || 'metraiyux-0s'},
    created_by:founderActor(auth),
    created_at:now.toISOString(),
    expires_at:expiresAt
  };
  if (ctx?.waitUntil) {
    ctx.waitUntil(saveKV(env, record.id, record));
    if (env.SITE_TASK_QUEUE) ctx.waitUntil(env.SITE_TASK_QUEUE.send({...record, queue:'founder_command_codes', task_title:`Founder code: ${codeType} ${record.client || ''}`.trim()}));
    ctx.waitUntil(mirrorSkygateEvent(env, {type:'founder_command.code.generated', meta:{id:record.id, code_type:codeType, client:record.client, expires_at:expiresAt}}, auth?.gate || null));
  } else {
    await saveKV(env, record.id, record);
  }
  return json({ok:true, code, record, reveal_once:true});
}
async function founderCommandRecovery(request, env, ctx, auth) {
  if (request.method === 'GET') {
    const events = (await readKVLedger(env, 250)).filter(item => String(item.type || '').startsWith('founder_command.recovery'));
    return json({ok:true, packets:events, count:events.length, persistence:Boolean(env.SITE_EVENTS_KV) ? 'kv' : 'none'});
  }
  if (request.method !== 'POST') return json({ok:false, error:'Method not allowed'}, 405);
  const body = await readJson(request);
  const recoveryType = String(body.recovery_type || body.type || 'gate').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'gate';
  const surface = String(body.surface || body.app || body.target_surface || recoveryType).toLowerCase().replace(/[^a-z0-9_/-]/g, '').slice(0, 100) || 'gate';
  const now = new Date();
  const limits = founderLimitPacket({...body, code_type:body.code_type || 'emergency'});
  const expiresAt = new Date(now.getTime() + limits.ttl_minutes * 60 * 1000).toISOString();
  const backupCount = Math.max(2, Math.min(20, Number(body.backup_count || body.backup_codes || 8) || 8));
  const restoreKey = founderRandomSecret('RESTORE');
  const resetCode = founderRandomSecret('RESET');
  const backupCodes = Array.from({length:backupCount}, () => founderRandomSecret('BACKUP', 12));
  const identity = founderIdentityPacket(body);
  const allSecrets = [restoreKey, resetCode, ...backupCodes];
  const hashes = await Promise.all(allSecrets.map(value => founderHash(value)));
  const id = `founder_recovery_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`;
  const previews = allSecrets.map(value => `${value.slice(0, 12)}...${value.slice(-4)}`);
  const record = {
    id,
    type:'founder_command.recovery.packet',
    recovery_type:recoveryType,
    surface,
    status:'issued_reveal_once',
    client:String(body.client || body.workspace || identity.company_name || '').slice(0, 160),
    email:identity.owner_email,
    identity,
    limits,
    secret_hashes:hashes,
    secret_previews:previews,
    notes:String(body.notes || body.reason || '').slice(0, 1000),
    links:[
      {label:'Founder Command Recovery', href:`/founder-command/?tab=recovery&packet=${encodeURIComponent(id)}`, kind:'owner'},
      {label:'SkyeBox Authenticator', href:'/Free99/apps/skyebox-authenticator/', kind:'app'},
      {label:'Customer Onboarding', href:'/saas/customer-onboarding.html', kind:'customer'},
      {label:'Gate Admin Login', href:'/admin/login.html', kind:'gate'}
    ],
    gate_bridge:{origin:skygateOrigin(env) || 'service-binding', source_app:env.SKYGATE_SOURCE_APP || 'metraiyux-0s'},
    created_by:founderActor(auth),
    created_at:now.toISOString(),
    expires_at:expiresAt
  };
  const reveal = {
    restore_key:restoreKey,
    reset_code:resetCode,
    backup_codes:backupCodes,
    message:'Reveal once. Store this packet outside the browser before closing it.'
  };
  if (ctx?.waitUntil) {
    ctx.waitUntil(saveKV(env, record.id, record));
    if (env.SITE_TASK_QUEUE) ctx.waitUntil(env.SITE_TASK_QUEUE.send({...record, queue:'founder_command_recovery', task_title:`Recovery packet: ${surface} ${record.client || ''}`.trim()}));
    ctx.waitUntil(mirrorSkygateEvent(env, {type:'founder_command.recovery.packet', meta:{id:record.id, recovery_type:recoveryType, surface, client:record.client, expires_at:expiresAt}}, auth?.gate || null));
  } else {
    await saveKV(env, record.id, record);
  }
  return json({ok:true, packet:record, reveal, reveal_once:true});
}
async function founderCommandIdentity(request, env, ctx, auth) {
  if (!['GET', 'POST'].includes(request.method)) return json({ok:false, error:'Method not allowed'}, 405);
  const url = new URL(request.url);
  const body = request.method === 'POST' ? await readJson(request) : Object.fromEntries(url.searchParams.entries());
  const identity = founderIdentityPacket(body);
  const record = {
    id:`founder_identity_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`,
    type:'founder_command.identity.generated',
    status:'generated',
    identity,
    created_by:founderActor(auth),
    created_at:new Date().toISOString()
  };
  if (request.method === 'POST') {
    if (ctx?.waitUntil) ctx.waitUntil(saveKV(env, record.id, record));
    else await saveKV(env, record.id, record);
  }
  return json({ok:true, identity, record:request.method === 'POST' ? record : null});
}
function founderRelay13WorkspaceSlug(value, env) {
  return founderSlug(value || env.RELAY13_FOUNDER_WORKSPACE_SLUG || env.RELAY13_WORKSPACE_SLUG || env.CONNECTLOG_WORKSPACE_SLUG || 'connectlog-main', 'connectlog-main');
}
function founderCleanText(value, max = 1000) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function founderCleanMetadata(value = {}, maxKeys = 20, maxChars = 700) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const out = {};
  for (const [key, item] of Object.entries(input).slice(0, maxKeys)) {
    const cleanKey = founderCleanText(key, 80).replace(/[^a-zA-Z0-9_.:-]/g, '_');
    if (!cleanKey) continue;
    if (Array.isArray(item)) out[cleanKey] = item.slice(0, 20).map(entry => typeof entry === 'object' ? founderCleanMetadata(entry, 10, maxChars) : founderCleanText(entry, maxChars));
    else if (item && typeof item === 'object') out[cleanKey] = founderCleanMetadata(item, 10, maxChars);
    else if (typeof item === 'boolean' || typeof item === 'number') out[cleanKey] = item;
    else out[cleanKey] = founderCleanText(item, maxChars);
  }
  return out;
}
function founderRelay13AdminCredential(env) {
  return uniqueCredentials([
    env.RELAY13_PLATFORM_ADMIN_TOKEN,
    env.RELAY13_ADMIN_TOKEN,
    env.PLATFORM_ADMIN_TOKEN,
    env.CONNECTLOG_RELAY13_ADMIN_TOKEN,
    env.SKYGATEFS13_WORKER_ADMIN_TOKEN,
    env.SITE_OPERATOR_ADMIN_TOKEN,
    env.METRAIYUX_ADMIN_TOKEN,
    env.ADMIN_TOKEN
  ])[0] || '';
}
function founderRelay13ApiCredential(env) {
  return uniqueCredentials([
    env.RELAY13_API_KEY,
    env.CONNECTLOG_RELAY13_API_KEY,
    env.CONNECTLOG_API_KEY,
    env.RELAY13_FOUNDER_API_KEY
  ]).find(value => value.startsWith('r13_')) || '';
}
function founderRelay13Origin(env) {
  return String(env.RELAY13_WORKER_ORIGIN || env.RELAY13_ORIGIN || 'https://relay13-core.graylondonskyes.workers.dev').replace(/\/+$/, '');
}
function founderRelay13AdminHeaders(env, extra = {}) {
  const token = founderRelay13AdminCredential(env);
  return token ? {'authorization':`Bearer ${token}`, ...extra} : {...extra};
}
async function founderRelay13Fetch(env, path, init = {}) {
  const headers = new Headers(init.headers || {});
  const hasBody = init.body !== undefined;
  if (hasBody && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const body = hasBody && typeof init.body !== 'string' ? JSON.stringify(init.body) : init.body;
  const method = init.method || (hasBody ? 'POST' : 'GET');
  const requestInit = {method, headers, body};
  if (env.RELAY13_WORKER?.fetch) {
    return env.RELAY13_WORKER.fetch(new Request(new URL(path, 'https://relay13-founder-command.internal').toString(), requestInit));
  }
  return fetch(new Request(new URL(path, founderRelay13Origin(env)).toString(), requestInit));
}
async function founderRelay13Json(env, path, init = {}) {
  const res = await founderRelay13Fetch(env, path, init).catch(err => ({ok:false, status:502, json:async()=>({ok:false, error:err?.message || 'Relay13 request failed'})}));
  const data = await res.json().catch(() => ({ok:false, error:'Relay13 returned non-JSON response'}));
  return {
    ok:Boolean(res.ok && data?.ok !== false),
    status:res.status || 0,
    data,
    path,
    error:data?.error || (!res.ok ? `Relay13 HTTP ${res.status || 0}` : '')
  };
}
function founderSanitizeRelay13Conversation(data = {}) {
  return {
    ok:Boolean(data.ok),
    conversation_id:String(data.conversation_id || data.id || ''),
    workspace_id:String(data.workspace_id || ''),
    bridge:data.bridge || null,
    connectlog_card_record_id:data.connectlog_card_record_id || null,
    visitor_token_present:Boolean(data.visitor_token),
    guardrail:data.guardrail || null,
    ai_policy:data.ai_policy || null,
    response_orchestration:data.response_orchestration || null
  };
}
function founderRelay13ConversationPayload(body = {}, auth = null, env = {}) {
  const actor = founderActor(auth);
  const message = founderCleanText(body.message || body.body || body.command || body.text || 'Founder Command opened this Relay13 lane.', 3000);
  const subject = founderCleanText(body.subject || (message ? message.slice(0, 150) : '') || 'Founder Command Relay13 lane', 180);
  const workspace = founderRelay13WorkspaceSlug(body.workspace || body.workspace_slug, env);
  return {
    workspace,
    channel:founderCleanText(body.channel || 'founder-command', 60),
    customer_name:founderCleanText(body.customer_name || body.name || 'Founder Command', 140),
    customer_email:founderCleanText(body.customer_email || body.email || '', 220),
    subject,
    message,
    body:message,
    source_url:founderCleanText(body.source_url || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/founder-command/', 500),
    external_user_id:founderCleanText(body.external_user_id || `founder-command:${founderShortHash(`${actor}:${subject}`)}`, 160),
    connectlog_bridge:true,
    connectlog_card_id:founderCleanText(body.connectlog_card_id || 'founder-command-mobile', 120),
    connectlog_card_label:founderCleanText(body.connectlog_card_label || 'Founder Command mobile lane', 160),
    connectlog_campaign:founderCleanText(body.connectlog_campaign || 'founder-command-relay13', 160),
    connectlog_owner_name:founderCleanText(body.connectlog_owner_name || 'MetrAIyux Operator', 160),
    connectlog_owner_company:founderCleanText(body.connectlog_owner_company || 'MetrAIyux 0S', 160),
    connectlog_owner_role:founderCleanText(body.connectlog_owner_role || 'Owner', 100),
    connectlog_welcome_message:founderCleanText(body.connectlog_welcome_message || 'Founder Command opened this live Relay13 lane.', 300),
    metadata:founderCleanMetadata({
      ...(body.metadata || {}),
      source_app:'founder-command',
      actor,
      owner_gate:'fs27-free99',
      command:body.command || ''
    }, 20, 700)
  };
}
async function founderRelay13Workspace(env, workspaceSlug) {
  const slug = founderRelay13WorkspaceSlug(workspaceSlug, env);
  const adminToken = founderRelay13AdminCredential(env);
  if (!adminToken) return {ok:false, slug, admin:false, error:'Relay13 admin token is not configured on the 0S Worker.'};
  const headers = founderRelay13AdminHeaders(env);
  const listed = await founderRelay13Json(env, '/api/admin/workspaces', {headers});
  if (listed.ok) {
    const workspaces = Array.isArray(listed.data?.workspaces) ? listed.data.workspaces : [];
    const found = workspaces.find(item => String(item.slug || '').toLowerCase() === slug.toLowerCase()) || workspaces.find(item => item.id);
    if (found?.id) return {ok:true, slug:found.slug || slug, workspace:found, admin:true, mode:'relay13_admin_list'};
  }
  const created = await founderRelay13Json(env, '/api/admin/workspaces', {
    method:'POST',
    headers,
    body:{
      slug,
      name:`Founder Command ${slug}`,
      welcome_text:'Send a message to the owner. Replies stay tied to this 0S workspace.',
      launcher_text:'Message owner',
      operator_name:'MetrAIyux Operator'
    }
  });
  if (created.ok && created.data?.workspace?.id) return {ok:true, slug:created.data.workspace.slug || slug, workspace:created.data.workspace, admin:true, mode:'relay13_admin_created'};
  const boot = await founderRelay13Json(env, '/api/bootstrap', {method:'POST', headers, body:{}});
  if (boot.ok && boot.data?.workspace?.id) return {ok:true, slug:boot.data.workspace.slug || slug, workspace:boot.data.workspace, admin:true, mode:'relay13_bootstrap'};
  return {ok:false, slug, admin:true, error:created.error || boot.error || listed.error || 'Relay13 workspace could not be resolved.'};
}
async function founderRelay13ScopedApiKey(env, workspaceId) {
  const existing = founderRelay13ApiCredential(env);
  if (existing) return {ok:true, key:existing, source:'env'};
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const created = await founderRelay13Json(env, '/api/admin/api-keys', {
    method:'POST',
    headers:founderRelay13AdminHeaders(env),
    body:{
      workspace_id:workspaceId,
      name:'Founder Command short-lived Relay13 key',
      scopes:['conversations:create','conversations:read','messages:read','messages:write','widget:read'],
      expires_at:expiresAt
    }
  });
  const raw = String(created.data?.api_key?.key || '');
  if (!created.ok || !raw.startsWith('r13_')) return {ok:false, error:created.error || 'Relay13 API key creation failed.', status:created.status};
  return {
    ok:true,
    key:raw,
    source:'minted',
    id:created.data.api_key.id || '',
    key_prefix:created.data.api_key.key_prefix || raw.slice(0, 20),
    expires_at:expiresAt
  };
}
async function founderRelay13RevokeScopedApiKey(env, apiKey) {
  if (!apiKey?.id || apiKey.source !== 'minted') return null;
  return founderRelay13Json(env, `/api/admin/api-keys/${encodeURIComponent(apiKey.id)}/revoke`, {
    method:'POST',
    headers:founderRelay13AdminHeaders(env),
    body:{reason:'Founder Command one-operation key cleanup'}
  });
}
async function founderPersistCommandReceipt(env, ctx, record, queue = 'founder_command_actions') {
  if (ctx?.waitUntil) {
    ctx.waitUntil(saveKV(env, record.id, record));
    if (env.SITE_TASK_QUEUE) ctx.waitUntil(env.SITE_TASK_QUEUE.send({...record, queue, task_title:record.task_title || record.type || queue}));
    ctx.waitUntil(mirrorSkygateEvent(env, {type:record.type, meta:{id:record.id, status:record.status, relay13_conversation_id:record.relay13?.conversation_id || ''}}));
  } else {
    await saveKV(env, record.id, record);
    if (env.SITE_TASK_QUEUE) await env.SITE_TASK_QUEUE.send({...record, queue, task_title:record.task_title || record.type || queue});
    await mirrorSkygateEvent(env, {type:record.type, meta:{id:record.id, status:record.status, relay13_conversation_id:record.relay13?.conversation_id || ''}});
  }
}
async function founderCommandCreateRelayConversation({body = {}, env, ctx, auth, source = 'inbox'}) {
  const createdAt = new Date().toISOString();
  const payload = founderRelay13ConversationPayload(body, auth, env);
  const publicAttempt = await founderRelay13Json(env, '/api/v1/conversations', {method:'POST', body:payload});
  let mode = 'relay13_widget_workspace';
  let result = publicAttempt;
  let workspace = {slug:payload.workspace, id:publicAttempt.data?.workspace_id || ''};
  let scopedKey = null;
  if (!publicAttempt.ok || !publicAttempt.data?.conversation_id) {
    const resolved = await founderRelay13Workspace(env, payload.workspace);
    if (resolved.ok && resolved.workspace?.id) {
      workspace = {slug:resolved.workspace.slug || payload.workspace, id:resolved.workspace.id, mode:resolved.mode};
      scopedKey = await founderRelay13ScopedApiKey(env, resolved.workspace.id);
      if (scopedKey.ok) {
        result = await founderRelay13Json(env, '/api/v1/conversations', {
          method:'POST',
          headers:{'x-relay13-api-key':scopedKey.key},
          body:{...payload, workspace_id:resolved.workspace.id, workspace:resolved.workspace.slug || payload.workspace}
        });
        mode = scopedKey.source === 'env' ? 'relay13_env_api_key' : 'relay13_short_lived_api_key';
      } else {
        result = {ok:false, status:scopedKey.status || 502, data:{ok:false, error:scopedKey.error}, error:scopedKey.error};
        mode = 'relay13_admin_key_failed';
      }
    } else {
      result = {ok:false, status:publicAttempt.status || 502, data:{ok:false, error:resolved.error || publicAttempt.error}, error:resolved.error || publicAttempt.error};
      mode = resolved.admin ? 'relay13_workspace_failed' : 'relay13_admin_missing';
    }
  }
  if (scopedKey?.source === 'minted') {
    const revoke = founderRelay13RevokeScopedApiKey(env, scopedKey);
    if (ctx?.waitUntil) ctx.waitUntil(revoke);
    else await revoke;
  }
  const relay13 = founderSanitizeRelay13Conversation(result.data || {});
  const ok = Boolean(result.ok && relay13.conversation_id);
  const record = {
    id:`founder_relay13_conversation_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`,
    type:'founder_command.inbox.conversation',
    status:ok ? 'relay13_created' : 'relay13_failed',
    source,
    mode,
    workspace,
    subject:payload.subject,
    message_preview:String(payload.message || '').slice(0, 500),
    relay13,
    error:ok ? '' : founderCleanText(result.error || result.data?.error || 'Relay13 conversation creation failed.', 500),
    relay13_http_status:result.status,
    created_by:founderActor(auth),
    created_at:createdAt,
    task_title:`Founder Relay13 conversation: ${payload.subject}`
  };
  await founderPersistCommandReceipt(env, ctx, record, 'founder_command_relay13');
  return {ok, record, mode, workspace, relay13, error:record.error, status:result.status};
}
async function founderCommandInbox(request, env, ctx, auth, url) {
  if (request.method !== 'GET') return json({ok:false, error:'Method not allowed'}, 405);
  const workspaceSlug = founderRelay13WorkspaceSlug(url.searchParams.get('workspace'), env);
  const conversationId = founderCleanText(url.searchParams.get('conversation_id') || url.searchParams.get('conversation') || '', 140);
  const receipts = (await readKVLedger(env, 200)).filter(item => String(item.type || '').startsWith('founder_command.inbox'));
  const adminToken = founderRelay13AdminCredential(env);
  if (!adminToken) {
    return json({ok:true, mode:'kv_only_relay13_admin_missing', relay13:{origin:founderRelay13Origin(env), admin:false, service_binding:Boolean(env.RELAY13_WORKER?.fetch)}, workspace:{slug:workspaceSlug}, conversations:[], messages:[], receipts, message:'Relay13 admin token is not configured on the 0S Worker; showing saved Founder Command receipts only.'});
  }
  const resolved = await founderRelay13Workspace(env, workspaceSlug);
  if (!resolved.ok || !resolved.workspace?.id) {
    return json({ok:false, mode:'relay13_workspace_unavailable', error:resolved.error || 'Relay13 workspace unavailable.', relay13:{origin:founderRelay13Origin(env), admin:true, service_binding:Boolean(env.RELAY13_WORKER?.fetch)}, receipts}, 502);
  }
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '25', 10), 1), 100);
  const list = await founderRelay13Json(env, `/api/v1/conversations?workspace_id=${encodeURIComponent(resolved.workspace.id)}&limit=${limit}`, {headers:founderRelay13AdminHeaders(env)});
  if (!list.ok) {
    return json({ok:false, mode:'relay13_list_failed', error:list.error || 'Relay13 conversation list failed.', status:list.status, workspace:resolved.workspace, receipts}, 502);
  }
  const conversations = Array.isArray(list.data?.conversations) ? list.data.conversations : [];
  const selected = conversationId ? conversations.find(item => String(item.id || item.conversation_id || '') === conversationId) || {id:conversationId, workspace_id:resolved.workspace.id} : conversations[0] || null;
  let messages = [];
  let messages_status = null;
  if (selected?.id || selected?.conversation_id) {
    const selectedId = selected.id || selected.conversation_id;
    const msg = await founderRelay13Json(env, `/api/v1/conversations/${encodeURIComponent(selectedId)}/messages?workspace_id=${encodeURIComponent(selected.workspace_id || resolved.workspace.id)}`, {headers:founderRelay13AdminHeaders(env)});
    messages_status = {ok:msg.ok, status:msg.status, error:msg.error || ''};
    if (msg.ok && Array.isArray(msg.data?.messages)) messages = msg.data.messages;
  }
  return json({ok:true, mode:'relay13_live_admin', relay13:{origin:founderRelay13Origin(env), admin:true, service_binding:Boolean(env.RELAY13_WORKER?.fetch)}, workspace:resolved.workspace, conversations, selected, messages, messages_status, receipts});
}
async function founderCommandInboxConversation(request, env, ctx, auth) {
  if (request.method !== 'POST') return json({ok:false, error:'Method not allowed'}, 405);
  const body = await readJson(request);
  const result = await founderCommandCreateRelayConversation({body, env, ctx, auth, source:'inbox'});
  return json({ok:result.ok, ...result}, result.ok ? 201 : 502);
}
async function founderCommandInboxMessage(request, env, ctx, auth) {
  if (request.method !== 'POST') return json({ok:false, error:'Method not allowed'}, 405);
  const body = await readJson(request);
  const conversationId = founderCleanText(body.conversation_id || body.conversation || '', 140);
  const message = founderCleanText(body.message || body.body || '', 3000);
  if (!conversationId) return json({ok:false, error:'conversation_id required'}, 400);
  if (!message) return json({ok:false, error:'message required'}, 400);
  const adminToken = founderRelay13AdminCredential(env);
  if (!adminToken) return json({ok:false, error:'Relay13 admin token is not configured on the 0S Worker for operator replies.'}, 502);
  const workspace = body.workspace_id ? {ok:true, workspace:{id:founderCleanText(body.workspace_id, 140), slug:founderRelay13WorkspaceSlug(body.workspace, env)}} : await founderRelay13Workspace(env, body.workspace);
  if (!workspace.ok || !workspace.workspace?.id) return json({ok:false, error:workspace.error || 'Relay13 workspace unavailable.'}, 502);
  const sent = await founderRelay13Json(env, `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method:'POST',
    headers:founderRelay13AdminHeaders(env),
    body:{
      workspace_id:workspace.workspace.id,
      sender_role:['operator','system'].includes(String(body.sender_role || '').toLowerCase()) ? String(body.sender_role).toLowerCase() : 'operator',
      sender_name:founderCleanText(body.sender_name || founderActor(auth), 140),
      body:message,
      metadata:{source_app:'founder-command', actor:founderActor(auth)}
    }
  });
  const record = {
    id:`founder_relay13_message_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`,
    type:'founder_command.inbox.message',
    status:sent.ok ? 'relay13_message_sent' : 'relay13_message_failed',
    workspace:{id:workspace.workspace.id, slug:workspace.workspace.slug || founderRelay13WorkspaceSlug(body.workspace, env)},
    relay13:{conversation_id:conversationId, message_id:sent.data?.message?.id || '', ok:sent.ok},
    message_preview:message.slice(0, 500),
    error:sent.ok ? '' : founderCleanText(sent.error || sent.data?.error || 'Relay13 message failed.', 500),
    relay13_http_status:sent.status,
    created_by:founderActor(auth),
    created_at:new Date().toISOString(),
    task_title:`Founder Relay13 reply: ${conversationId}`
  };
  await founderPersistCommandReceipt(env, ctx, record, 'founder_command_relay13');
  return json({ok:sent.ok, record, message:sent.data?.message || null, error:record.error}, sent.ok ? 201 : 502);
}
async function founderCommandReceipts(request, env) {
  if (request.method !== 'GET') return json({ok:false, error:'Method not allowed'}, 405);
  const events = (await readKVLedger(env, 250)).filter(item => String(item.type || '').startsWith('founder_command.'));
  return json({ok:true, events, count:events.length, persistence:Boolean(env.SITE_EVENTS_KV) ? 'kv' : 'none'});
}
async function founderCommandAction(request, env, ctx, auth) {
  if (request.method !== 'POST') return json({ok:false, error:'Method not allowed'}, 405);
  const body = await readJson(request);
  const command = String(body.command || body.message || body.text || '').trim();
  const lower = command.toLowerCase();
  if (/relay13|inbox|conversation|message|site chat/.test(lower)) {
    const result = await founderCommandCreateRelayConversation({body:{...body, command, message:body.message || command, subject:body.subject || command.slice(0, 150)}, env, ctx, auth, source:'action'});
    return json({ok:result.ok, action:'relay13_conversation_create', ...result}, result.ok ? 201 : 502);
  }
  if (/status|health|system/.test(lower)) return json({ok:true, action:'status', status:siteOperatorStatus(env)});
  return json({ok:false, error:'No live Founder Command action matched. Use Relay13 inbox, status, codes, or recovery.'}, 400);
}
async function founderCommandChat(request, env, ctx, auth) {
  if (request.method !== 'POST') return json({ok:false, error:'Method not allowed'}, 405);
  const body = await readJson(request);
  const message = String(body.message || body.text || '').trim().slice(0, 3000);
  const lowerMessage = message.toLowerCase();
  const wantsRelayAction = /relay13|inbox|conversation|message|site chat/.test(lowerMessage)
    && /create|open|start|send|route|make|spin up|setup|set up|get the worker|do it/.test(lowerMessage);
  if (wantsRelayAction) {
    const result = await founderCommandCreateRelayConversation({body:{...body, command:message, message, subject:body.subject || message.slice(0, 150)}, env, ctx, auth, source:'chat'});
    const text = result.ok
      ? `Relay13 conversation created by the live Worker.\nConversation: ${result.relay13.conversation_id}\nWorkspace: ${result.workspace.slug || result.workspace.id || 'Relay13'}\nMode: ${result.mode}`
      : `Relay13 action did not complete.\nReason: ${result.error || 'Relay13 returned an error.'}\nMode: ${result.mode}`;
    return json({ok:true, receipt:result.record, action:{type:'relay13_conversation_create', ok:result.ok, mode:result.mode, relay13:result.relay13, error:result.error || ''}, answer:{
      title:'relay13 inbox action',
      text,
      links:[
        {label:'Founder Relay13 Inbox', href:`/founder-command/?tab=inbox${result.relay13?.conversation_id ? `&conversation=${encodeURIComponent(result.relay13.conversation_id)}` : ''}`, kind:'owner'},
        {label:'Founder Relay13 API', href:'/api/founder-command/inbox', kind:'api'}
      ],
      next_actions:result.ok ? ['Open the Inbox tab to read the thread or send the operator reply.'] : ['Check the Inbox tab for saved receipts, then verify Relay13 admin/API token configuration.'],
      queued:Boolean(env.SITE_TASK_QUEUE),
      audit_id:result.record.id
    }});
  }
  const links = founderCommandLinks().filter(link => {
    const hay = `${link.label} ${link.href} ${link.kind}`.toLowerCase();
    return !message || lowerMessage.split(/[^a-z0-9]+/).some(token => token.length > 2 && hay.includes(token));
  }).slice(0, 6);
  const status = siteOperatorStatus(env);
  const intent = /recover|restore|backup|reset|locked|lockout/.test(lowerMessage) ? 'recovery_packet'
    : /code|invite|provision|access/.test(lowerMessage) ? 'generate_or_review_codes'
    : /valley|crm|lead/.test(lowerMessage) ? 'valley_operations'
    : /status|health|what.*live|how'?s.*system|how is.*system|system/.test(lowerMessage) ? 'system_status'
    : /client|signup|customer/.test(lowerMessage) ? 'customer_mobile_command'
    : 'founder_command';
  const actionable = !['system_status', 'founder_command'].includes(intent);
  const receipt = {
    id:`founder_cmd_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`,
    type:'founder_command.chat',
    intent,
    message,
    actor:founderActor(auth),
    created_at:new Date().toISOString(),
    audit_only:!actionable,
    links,
    next_actions:intent === 'recovery_packet'
      ? ['Open Recovery, choose the locked surface, generate a reveal-once packet, then store it outside the browser.']
      : intent === 'generate_or_review_codes'
      ? ['Open Codes, choose a preset, set limits, generate a reveal-once code.']
      : intent === 'customer_mobile_command'
        ? ['Use this founder app as the owner-side model for customer phone command onboarding.']
        : ['Use the returned direct links, then save a task if the command needs build work.']
  };
  let queued = false;
  if (ctx?.waitUntil) {
    ctx.waitUntil(saveKV(env, receipt.id, receipt));
    if (actionable && env.SITE_TASK_QUEUE) {
      queued = true;
      ctx.waitUntil(env.SITE_TASK_QUEUE.send({...receipt, queue:'founder_command_chat', task_title:`Founder command: ${intent}`}));
    }
  } else {
    await saveKV(env, receipt.id, receipt);
    if (actionable && env.SITE_TASK_QUEUE) {
      queued = true;
      await env.SITE_TASK_QUEUE.send({...receipt, queue:'founder_command_chat', task_title:`Founder command: ${intent}`});
    }
  }
  const answer = founderCommandChatAnswer({intent, message, links, receipt, status, env, queued});
  return json({ok:true, receipt, answer:{
    title:intent.replaceAll('_', ' '),
    text:answer.text,
    links:answer.links,
    next_actions:answer.next_actions,
    queued,
    audit_id:receipt.id
  }});
}
function founderCommandChatAnswer({intent, links, receipt, status, env, queued}) {
  const facts = {
    gate: Boolean(skygateOrigin(env) || env.SKYGATEFS27_WORKER?.fetch),
    kv: Boolean(env.SITE_EVENTS_KV),
    queue: Boolean(env.SITE_TASK_QUEUE),
    assets: Boolean(env.ASSETS),
    surfaces: status.live_surface_count
  };
  if (intent === 'system_status') {
    return {
      text:[
        'System status, not an operation run:',
        `Gate: ${facts.gate ? 'ready' : 'not configured'}`,
        `Storage: ${facts.kv ? 'KV receipt storage ready' : 'KV receipt storage not configured'}`,
        `Queue: ${facts.queue ? 'task queue bound' : 'task queue not bound'}`,
        `Assets: ${facts.assets ? 'asset binding ready' : 'asset binding missing'}`,
        `Live surface registry: ${facts.surfaces} surfaces`,
        'No route was executed and no operator task was queued from that question.'
      ].join('\n'),
      links:[
        {label:'Site operator status', href:'/api/site-operator/status', kind:'api'},
        {label:'0S route manifest', href:'/api/0s/route-manifest', kind:'api'}
      ],
      next_actions:['Open Site operator status for the raw JSON health snapshot.', 'Open 0S route manifest for the mounted app/API map.']
    };
  }
  if (intent === 'recovery_packet') {
    return {
      text:`Recovery is ready, but chat did not generate a restore key. Use the Recovery tab to create the reveal-once packet. ${queued ? 'A follow-up task was queued.' : 'No task queue entry was created.'}`,
      links:links.length ? links : [{label:'Founder Recovery', href:'/founder-command/?tab=recovery', kind:'owner'}],
      next_actions:receipt.next_actions
    };
  }
  if (intent === 'generate_or_review_codes') {
    return {
      text:`Code provisioning is ready, but chat did not mint a code. Use the Codes tab so the limits are explicit before a reveal-once code is generated. ${queued ? 'A follow-up task was queued.' : 'No task queue entry was created.'}`,
      links:links.length ? links : [{label:'Founder Codes', href:'/founder-command/?tab=codes', kind:'owner'}],
      next_actions:receipt.next_actions
    };
  }
  if (intent === 'valley_operations') {
    return {
      text:`Valley routes are available. I did not modify CRM records, leads, or outreach from chat.`,
      links:links.length ? links : [
        {label:'Valley owner CRM', href:'/valley-verified/owner-crm/', kind:'admin'},
        {label:'Valley lead inbox', href:'/valley-verified/lead-inbox/', kind:'admin'}
      ],
      next_actions:['Open the Valley surface and make the change there so the UI/API writes the actual record.']
    };
  }
  if (intent === 'customer_mobile_command') {
    return {
      text:'Customer mobile command is connected to live onboarding routes. This chat prepared the route only; use Client App Factory or NorthStar so the real API writes the workspace/invite record.',
      links:links.length ? links : [{label:'Client App Factory', href:'/client-app-factory/', kind:'app'}],
      next_actions:receipt.next_actions
    };
  }
  return {
    text:'I can check status, open routes, prepare recovery, or help generate limited codes. I will not claim an operation ran unless this Worker actually ran one.',
    links:links.length ? links : founderCommandLinks().slice(0, 4),
    next_actions:['Ask "how is the system" for health, "open Valley CRM" for route links, or use Codes/Recovery for real provisioning.']
  };
}
async function handleFounderCommandRoute(request, env, ctx, url) {
  if (url.pathname === '/api/founder-command/login') return handleOwnerAdminLogin(request, env);
  if (!url.pathname.startsWith('/api/founder-command')) return null;
  if (request.method === 'OPTIONS') return json({ok:true});
  const auth = await requireOperatorAuth(request, env, 'Founder Command');
  if (!auth.ok) return auth.response;
  if (url.pathname === '/api/founder-command' || url.pathname === '/api/founder-command/status') {
    return json({ok:true, actor:founderActor(auth), version:VERSION, mobile_ready:true, gate:{configured:Boolean(skygateOrigin(env) || env.SKYGATEFS27_WORKER?.fetch), origin:skygateOrigin(env) || 'service-binding'}, bindings:{kv:Boolean(env.SITE_EVENTS_KV), queue:Boolean(env.SITE_TASK_QUEUE), assets:Boolean(env.ASSETS)}, limits:founderDefaultLimits(), links:founderCommandLinks()});
  }
  if (url.pathname === '/api/founder-command/codes') return founderCommandCodes(request, env, ctx, auth);
  if (url.pathname === '/api/founder-command/recovery') return founderCommandRecovery(request, env, ctx, auth);
  if (url.pathname === '/api/founder-command/identity') return founderCommandIdentity(request, env, ctx, auth);
  if (url.pathname === '/api/founder-command/inbox') return founderCommandInbox(request, env, ctx, auth, url);
  if (url.pathname === '/api/founder-command/inbox/conversations') return founderCommandInboxConversation(request, env, ctx, auth);
  if (url.pathname === '/api/founder-command/inbox/messages') return founderCommandInboxMessage(request, env, ctx, auth);
  if (url.pathname === '/api/founder-command/actions') return founderCommandAction(request, env, ctx, auth);
  if (url.pathname === '/api/founder-command/receipts') return founderCommandReceipts(request, env);
  if (url.pathname === '/api/founder-command/chat' || url.pathname === '/api/founder-command/command') return founderCommandChat(request, env, ctx, auth);
  if (url.pathname === '/api/founder-command/limits') return json({ok:true, limits:founderDefaultLimits(), custom_supported:true});
  return json({ok:false, error:'Founder Command route not found'}, 404);
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

const CONTENT_ENGINE_RUN_INDEX_KEY = 'content-engine:v1:runs';
const CONTENT_ENGINE_RUN_PREFIX = 'content-engine:v1:run:';
const CONTENT_ENGINE_EVENT_PREFIX = 'content-engine:v1:event:';

function contentEngineStorageMode(env) {
  if (env.CONTENT_ENGINE_KV) return 'content_engine_kv';
  if (env.SITE_EVENTS_KV) return 'site_events_kv';
  return 'not_configured';
}
function contentEngineKv(env) {
  return env.CONTENT_ENGINE_KV || env.SITE_EVENTS_KV || null;
}
function contentEngineNeedsStorage(env) {
  if (contentEngineKv(env)) return null;
  return json({ok:false, error:'content_engine_storage_not_configured', storage_mode:contentEngineStorageMode(env), message:'Content Engine package creation and dispatch require CONTENT_ENGINE_KV or SITE_EVENTS_KV.'}, 503);
}
async function contentEngineGet(env, key, fallback = null) {
  const kv = contentEngineKv(env);
  if (!kv) return fallback;
  return await kv.get(key, {type:'json'}).catch(() => null) || fallback;
}
async function contentEnginePut(env, key, value) {
  const kv = contentEngineKv(env);
  if (!kv) return false;
  await kv.put(key, JSON.stringify(value));
  return true;
}
function contentEngineText(value, max = 4000) {
  return String(value == null ? '' : value).trim().slice(0, max);
}
function contentEngineSlug(value = 'content') {
  return contentEngineText(value, 180).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `content-${Date.now()}`;
}
function contentEngineId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
function contentEngineChannels(value) {
  const defaults = ['linkedin', 'x_thread', 'email', 'website_section', 'local_brain', 'repository_update'];
  const list = Array.isArray(value) ? value : defaults;
  return [...new Set(list.map(item => contentEngineText(item, 80)).filter(Boolean))];
}
function contentEngineArticleSummary(article = {}) {
  const slug = contentEngineSlug(article.slug || article.title || 'article');
  return {
    slug,
    title: contentEngineText(article.title || slug, 300),
    subtitle: contentEngineText(article.subtitle || article.problem || article.marketingUse || '', 600),
    audience: contentEngineText(article.audience || '', 400),
    category: contentEngineText(article.category || article.collection || '', 160),
    proofRule: contentEngineText(article.proofRule || '', 600),
    marketingUse: contentEngineText(article.marketingUse || '', 1000),
    operatingMove: contentEngineText(article.operatingMove || '', 1000),
    directAppRoutes: Array.isArray(article.directAppRoutes) ? article.directAppRoutes.slice(0, 12) : (Array.isArray(article.surfaces) ? article.surfaces.slice(0, 12) : [])
  };
}
function contentEngineAssetsForArticle(article = {}, channels = []) {
  const summary = contentEngineArticleSummary(article);
  const routeLines = summary.directAppRoutes
    .map(route => `- ${contentEngineText(route.title || route.name || route.route, 180)}: ${contentEngineText(route.route || route.href || '', 260)} ${contentEngineText(route.use || route.purpose || '', 420)}`)
    .join('\n');
  const base = `${summary.title}\n\n${summary.subtitle}\n\nAudience: ${summary.audience || '0S buyer/operator'}\nOperating move: ${summary.operatingMove || summary.marketingUse || 'Route this into the right 0S proof surface.'}\nProof rule: ${summary.proofRule || 'Do not publish unsupported claims; attach a live proof route or receipt.'}`;
  const assetBuilders = {
    linkedin: () => ({
      type:'linkedin_post',
      platform:'linkedin',
      title:`LinkedIn post: ${summary.title}`,
      destination:'approval-gated social post',
      content:`${summary.title}\n\n${summary.subtitle || summary.marketingUse || ''}\n\nThe 0S move: ${summary.operatingMove || 'turn the idea into a routed, proof-backed workflow.'}\n\nProof boundary: ${summary.proofRule || 'attach the live surface before making the claim.'}`
    }),
    x_thread: () => ({
      type:'x_thread',
      platform:'x',
      title:`X thread: ${summary.title}`,
      destination:'approval-gated thread draft',
      content:[
        `1/ ${summary.title}`,
        `2/ Problem: ${summary.subtitle || summary.marketingUse || 'Disconnected business work loses proof and follow-through.'}`,
        `3/ Move: ${summary.operatingMove || 'route the work into a named 0S lane with storage and approval.'}`,
        `4/ Proof: ${summary.proofRule || 'ship with a receipt, route, or live dashboard.'}`
      ].join('\n\n')
    }),
    email: () => ({
      type:'email_package',
      platform:'email',
      title:`Email package: ${summary.title}`,
      destination:'SkyeMail or manual send queue',
      content:`Subject: ${summary.title}\n\n${base}\n\nRelevant 0S routes:\n${routeLines || '- Route selection pending.'}`
    }),
    website_section: () => ({
      type:'website_section',
      platform:'0s-site',
      title:`Website section: ${summary.title}`,
      destination:'approval-gated site copy',
      content:`<section data-content-engine="${summary.slug}"><p class="eyebrow">${summary.category || '0S operating lane'}</p><h2>${summary.title}</h2><p>${summary.subtitle || summary.marketingUse || ''}</p><p>${summary.operatingMove || ''}</p></section>`
    }),
    local_brain: () => ({
      type:'local_brain_chunk',
      platform:'metraiyux-local-brain',
      title:`Local brain chunk: ${summary.title}`,
      destination:'0S local brain feed',
      payload:{...summary, source:'content-engine', routes:summary.directAppRoutes},
      content:`${base}\n\nDirect app routes:\n${routeLines || '- No direct app routes declared.'}`
    }),
    repository_update: () => ({
      type:'repository_update',
      platform:'repo',
      title:`Repo update pack: ${summary.title}`,
      destination:'operator-reviewed repo update',
      payload:{suggestedFiles:[`metraiyux_0s_site/blog/generated/${summary.slug}.md`, `metraiyux_0s_site/brain/content-engine/${summary.slug}.json`]},
      content:`Create/update content package for ${summary.slug}. Operator approval required before commit/deploy.`
    })
  };
  return contentEngineChannels(channels).map(channel => (assetBuilders[channel] || assetBuilders.local_brain)());
}
async function contentEngineRunList(env) {
  return await contentEngineGet(env, CONTENT_ENGINE_RUN_INDEX_KEY, []);
}
async function contentEngineSaveRun(env, run) {
  const stored = await contentEnginePut(env, `${CONTENT_ENGINE_RUN_PREFIX}${run.id}`, run);
  const index = await contentEngineRunList(env);
  const next = [run, ...index.filter(item => item.id !== run.id)].slice(0, 200).map(item => ({
    id:item.id,
    article_slug:item.article_slug,
    article_title:item.article_title,
    status:item.status,
    channels:item.channels,
    created_at:item.created_at,
    updated_at:item.updated_at || item.created_at
  }));
  await contentEnginePut(env, CONTENT_ENGINE_RUN_INDEX_KEY, next);
  return stored;
}
function contentEngineConnectorStatus(env) {
  return {
    ok:true,
    storage_mode:contentEngineStorageMode(env),
    connectors:[
      {id:'content-engine-kv', name:'Content Engine KV', configured:Boolean(contentEngineKv(env)), role:'run package persistence'},
      {id:'site-task-queue', name:'0S Task Queue', configured:Boolean(env.SITE_TASK_QUEUE), role:'operator review queue'},
      {id:'skygate-event-mirror', name:'SkyGate FS27 Event Mirror', configured:Boolean((skygateOrigin(env) || env.SKYGATEFS27_WORKER?.fetch) && mirrorSecret(env)), role:'cross-system event evidence'},
      {id:'valley-editorial-calendar', name:'Valley Verified Editorial Calendar', configured:Boolean(valleyCalendarUrl(env)), role:'scheduled guide feed'},
      {id:'worker-assets', name:'0S Static Assets', configured:Boolean(env.ASSETS?.fetch), role:'public route/file access'}
    ],
    rule:'External publishing stays approval-gated. This engine creates packages, local-brain chunks, repo tasks, and connector events; it does not auto-post to social, email, or websites without approval and provider configuration.'
  };
}
function contentEngineSourcePackageArticle(body = {}, source = '0s') {
  const brief = body.brief && typeof body.brief === 'object' ? body.brief : {};
  const campaign = body.campaign && typeof body.campaign === 'object' ? body.campaign : {};
  const asset = body.asset && typeof body.asset === 'object' ? body.asset : {};
  const title = contentEngineText(
    body.title || brief.title || campaign.name || asset.title || `${source} content package`,
    300
  );
  const directAppRoutes = [
    body.clientAppRoute ? {title:'Client App Factory', route:body.clientAppRoute, use:'client app reuse'} : null,
    body.mediaRoute ? {title:'SkyeMediaCenter asset', route:body.mediaRoute, use:'media asset reuse'} : null,
    body.docRoute ? {title:'SkyeDocxMax document', route:body.docRoute, use:'editable document package'} : null,
    ...(Array.isArray(body.directAppRoutes) ? body.directAppRoutes : [])
  ].filter(Boolean).slice(0, 12);
  return contentEngineArticleSummary({
    slug: body.slug || title,
    title,
    subtitle: brief.summary || campaign.summary || asset.description || body.summary || `Package generated from ${source}.`,
    audience: body.audience || brief.audience || campaign.audience || '0S client/operator',
    category: body.category || source,
    proofRule: body.proofRule || 'Do not publish external claims until operator approval and provider connector configuration exist.',
    marketingUse: body.marketingUse || brief.use || campaign.goal || asset.description || '',
    operatingMove: body.operatingMove || `Route ${source} output into Content Engine packages, local brain chunks, and operator-reviewed dispatch.`,
    directAppRoutes
  });
}
async function contentEngineCreateSourceRun(env, auth, body = {}, source = '0s', defaultChannels = ['website_section','email','local_brain','repository_update']) {
  const blocked = contentEngineNeedsStorage(env);
  if (blocked) return {blocked};
  const tenantPackage = await createContentPackage(env, {...body, source});
  const article = contentEngineSourcePackageArticle({
    ...body,
    clientAppRoute: tenantPackage.tenant?.clientAppRoute,
    mediaRoute: body.assetId ? `/api/media/file?id=${encodeURIComponent(body.assetId)}` : body.mediaRoute
  }, source);
  const channels = contentEngineChannels(body.channels || defaultChannels);
  const nowIso = new Date().toISOString();
  const run = {
    id:contentEngineId('content_run'),
    type:'metraiyux.content_engine.run',
    article_slug:article.slug,
    article_title:article.title,
    article,
    channels,
    status:'approval_package_created',
    created_at:nowIso,
    updated_at:nowIso,
    created_by:auth.actor || 'operator',
    source_package:tenantPackage.package,
    tenant:tenantPackage.tenant,
    ai_response_policy:tenantPackage.package.dispatchLimits?.usage || null,
    package:{
      assets:contentEngineAssetsForArticle(article, channels),
      approval_required:true,
      external_publish_blocked_until:'operator_approval_and_provider_connector_configured'
    }
  };
  await contentEngineSaveRun(env, run);
  return {tenantPackage, run};
}
async function handleContentEngineAdminRoute(request, env, ctx, url) {
  const method = request.method.toUpperCase();
  if (url.pathname === '/api/admin/connectors/status' && method === 'GET') {
    const auth = await requireOperatorAuth(request, env, 'content engine connector status');
    if (!auth.ok) return auth.response;
    return json(contentEngineConnectorStatus(env));
  }
  if (!url.pathname.startsWith('/api/admin/content-engine/')) return null;
  const auth = await requireOperatorAuth(request, env, 'content engine admin route');
  if (!auth.ok) return auth.response;
  const route = url.pathname.slice('/api/admin/content-engine'.length) || '/';
  if (route === '/runs' && method === 'GET') {
    return json({ok:true, storage_mode:contentEngineStorageMode(env), runs:await contentEngineRunList(env)});
  }
  if (route === '/run' && method === 'GET') {
    const id = contentEngineText(url.searchParams.get('id'), 160);
    if (!id) return json({ok:false, error:'run_id_required'}, 400);
    const run = await contentEngineGet(env, `${CONTENT_ENGINE_RUN_PREFIX}${id}`, null);
    if (!run) return json({ok:false, error:'content_engine_run_not_found'}, 404);
    return json({ok:true, run, assets:run.package?.assets || [], connector_events:run.connector_events || []});
  }
  if (route === '/local-brain-feed' && method === 'GET') {
    const index = await contentEngineRunList(env);
    const chunks = [];
    for (const item of index.slice(0, 60)) {
      const run = await contentEngineGet(env, `${CONTENT_ENGINE_RUN_PREFIX}${item.id}`, null);
      for (const asset of run?.package?.assets || []) {
        if (asset.type === 'local_brain_chunk') chunks.push({run_id:item.id, article_slug:item.article_slug, title:asset.title, payload:asset.payload, content:asset.content, updated_at:run.updated_at || run.created_at});
      }
    }
    return json({ok:true, storage_mode:contentEngineStorageMode(env), chunks});
  }
  if (route === '/ai-response-tiers' && method === 'GET') {
    return json({
      ok:true,
      providerCostRule:'Local brain first; paid provider calls stay inside active SkyePay/Stripe AI buckets.',
      tiers:listAiResponseLanes()
    });
  }
  if (route === '/ai-response/evaluate' && method === 'POST') {
    const body = await readJson(request);
    return json({ok:true, result:evaluateAiResponseUsage(body), monitor:buildAiResponseMonitorSnapshot(body)});
  }
  if ((route === '/from-marketing-made-easy' || route === '/from-mme') && method === 'POST') {
    const body = await readJson(request);
    const created = await contentEngineCreateSourceRun(env, auth, body, 'marketing-made-easy', ['website_section','email','local_brain','repository_update']);
    if (created.blocked) return created.blocked;
    if (ctx?.waitUntil) ctx.waitUntil(mirrorSkygateEvent(env, {type:'content_engine.marketing_made_easy_package_created', meta:{run_id:created.run.id, content_package_id:created.tenantPackage.package.id, client_id:created.tenantPackage.tenant.clientId}}, auth.gate));
    return json({ok:true, run:created.run, tenantPackage:created.tenantPackage, assets:created.run.package.assets}, 201);
  }
  if ((route === '/from-media-center' || route === '/from-skyemediacenter') && method === 'POST') {
    const body = await readJson(request);
    const created = await contentEngineCreateSourceRun(env, auth, body, 'skyemediacenter', ['website_section','local_brain','repository_update']);
    if (created.blocked) return created.blocked;
    if (ctx?.waitUntil) ctx.waitUntil(mirrorSkygateEvent(env, {type:'content_engine.skyemediacenter_package_created', meta:{run_id:created.run.id, content_package_id:created.tenantPackage.package.id, client_id:created.tenantPackage.tenant.clientId}}, auth.gate));
    return json({ok:true, run:created.run, tenantPackage:created.tenantPackage, assets:created.run.package.assets}, 201);
  }
  if (route === '/activate' && method === 'POST') {
    const blocked = contentEngineNeedsStorage(env);
    if (blocked) return blocked;
    const body = await readJson(request);
    const article = contentEngineArticleSummary(body.article || {});
    const channels = contentEngineChannels(body.channels);
    const now = new Date().toISOString();
    const run = {
      id:contentEngineId('content_run'),
      type:'metraiyux.content_engine.run',
      article_slug:article.slug,
      article_title:article.title,
      article,
      channels,
      status:'approval_package_created',
      created_at:now,
      updated_at:now,
      created_by:auth.actor || 'operator',
      package:{assets:contentEngineAssetsForArticle(article, channels), approval_required:true, external_publish_blocked_until:'operator_approval_and_provider_connector_configured'}
    };
    await contentEngineSaveRun(env, run);
    if (ctx?.waitUntil) ctx.waitUntil(mirrorSkygateEvent(env, {type:'content_engine.package_created', meta:{run_id:run.id, article_slug:run.article_slug, assets:run.package.assets.length}}, auth.gate));
    return json({ok:true, run, assets:run.package.assets, connector_events:[]}, 201);
  }
  if (route === '/dispatch' && method === 'POST') {
    const blocked = contentEngineNeedsStorage(env);
    if (blocked) return blocked;
    const body = await readJson(request);
    const runId = contentEngineText(body.run_id || body.runId, 160);
    if (!runId) return json({ok:false, error:'run_id_required'}, 400);
    const run = await contentEngineGet(env, `${CONTENT_ENGINE_RUN_PREFIX}${runId}`, null);
    if (!run) return json({ok:false, error:'content_engine_run_not_found'}, 404);
    if (!body.approved) return json({ok:false, error:'dispatch_requires_approved_true'}, 409);
    const now = new Date().toISOString();
    const aiResponsePolicy = (body.aiPlan || body.planId || body.aiResponse)
      ? evaluateAiResponseUsage({
          planId:body.aiPlan || body.planId || run.ai_response_policy?.lane?.id || 'relay13-ai-response-starter',
          addOnActive:body.aiAddOnActive === true || body.addOnActive === true,
          usedThisMonth:body.usedThisMonth ?? 0,
          message:{text:run.article_title || run.article?.subtitle || '', routine:true}
        })
      : (run.ai_response_policy || null);
    const dispatches = (run.package?.assets || []).map(asset => ({
      event:{
        id:contentEngineId('content_evt'),
        type:'metraiyux.content_engine.connector_event',
        connector_type:asset.type,
        action:asset.type === 'local_brain_chunk' ? 'store_local_brain_chunk' : 'queue_operator_review',
        status:asset.type === 'local_brain_chunk' ? 'stored_local_brain_feed' : 'queued_for_operator_review',
        run_id:run.id,
        article_slug:run.article_slug,
        title:asset.title,
        destination:asset.destination,
        created_at:now,
        approved_by:auth.actor || 'operator',
        provider_call_made:false,
        ai_response_policy:aiResponsePolicy
      }
    }));
    for (const item of dispatches) await contentEnginePut(env, `${CONTENT_ENGINE_EVENT_PREFIX}${item.event.id}`, item.event);
    run.status = 'dispatched_for_operator_review';
    run.updated_at = now;
    run.connector_events = dispatches.map(item => item.event);
    run.dispatch_notes = contentEngineText(body.notes || '', 800);
    run.ai_response_policy = aiResponsePolicy;
    await contentEngineSaveRun(env, run);
    if (env.SITE_TASK_QUEUE) {
      for (const item of dispatches.filter(item => item.event.status === 'queued_for_operator_review')) {
        const task = {id:`task_${item.event.id}`, type:'content_engine.operator_review', status:'queued_for_operator_review', created_at:now, title:item.event.title, run_id:run.id, connector_type:item.event.connector_type};
        if (ctx?.waitUntil) ctx.waitUntil(env.SITE_TASK_QUEUE.send(task));
        else await env.SITE_TASK_QUEUE.send(task);
      }
    }
    if (ctx?.waitUntil) ctx.waitUntil(mirrorSkygateEvent(env, {type:'content_engine.dispatch_approved', meta:{run_id:run.id, dispatch_count:dispatches.length, provider_call_made:false, ai_call_allowed:Boolean(aiResponsePolicy?.aiCallAllowed)}}, auth.gate));
    return json({ok:true, run, dispatches, provider_call_made:false, ai_response_policy:aiResponsePolicy});
  }
  return json({ok:false, error:'content_engine_route_not_found', path:url.pathname}, 404);
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
    'access-control-allow-headers': 'content-type,authorization,x-admin-token,x-free99-admin-code,x-free99-demo-code,x-free99-gate-session,x-skygate-session,x-skye-gate-token,x-demo-code,x-demon-key,x-skye-gate-session,x-skye-gate-source,x-skye-media-center-free99',
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
  if (path === '/api/media/reuse') return 'reuse';
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
  const auth = await requireGateAuth(request, env, 'SkyeMediaCenter gated route');
  if (!auth.ok) {
    const data = await auth.response.clone().json().catch(() => ({}));
    return {
      gate: data.skygate || null,
      response: mediaJson({
        ok:false,
        error: data.error || 'Gate session required.',
        free99: true,
        gateSessionRequired: true
      }, auth.response.status || 401)
    };
  }
  return {
    gate: auth.gate || {ok:true, data:auth.identity || {}, path:auth.via || '0s-gate-auth'},
    auth
  };
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
async function handleMediaReuse(request, env, ctx, kv, gate) {
  if (request.method.toUpperCase() !== 'POST') return mediaJson({ok:false, error:'Method not allowed'}, 405);
  const body = await readJson(request);
  const assets = await readMediaAssets(kv);
  const assetId = safeMediaText(body.assetId || body.asset_id, 120);
  const asset = assetId ? assets.find((entry) => entry.id === assetId) : null;
  if (assetId && (!asset || asset.status === 'archived')) return mediaJson({ok:false, error:'Asset not found'}, 404);
  const result = await createMediaReusePackage(env, {
    ...body,
    assetId: assetId || body.asset?.id || '',
    asset: asset ? normalizeMediaAsset(asset) : body.asset,
    title: body.title || asset?.title || 'SkyeMediaCenter reusable asset'
  });
  await mirrorMedia(ctx, env, gate, 'skyemediacenter.reuse_package_created', {
    asset_id: result.package.assetId,
    client_id: result.tenant.clientId,
    content_engine_endpoint: result.package.contentEngineEndpoint
  });
  return mediaJson(result, 201);
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
  if (route === 'reuse') return handleMediaReuse(request, env, ctx, kv, auth.gate);
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
    message:'kAIxu CodeStudio platform mutations require KAIXU_CODESTUDIO_KV or SITE_EVENTS_KV. Public reads stay available through the mounted live 0S adapter.'
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
  'admin',
  'markets',
  'jobs',
  'assignments',
  'route-jobs',
  'ratings',
  'payments',
  'provider',
  'house-command',
  'storage',
  'integrations',
  'runtime',
  'compliance',
  'providers'
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
function routexPhone(value) {
  const cleaned = String(value || '').replace(/[^\d+]/g, '').trim();
  if (!cleaned) return '';
  const normalized = cleaned.startsWith('+') ? `+${cleaned.replace(/\+/g, '')}` : cleaned;
  return normalized.slice(0, 32);
}
function routexConsentFlag(value) {
  if (value === true) return true;
  return ['1','true','yes','y','on','opted_in','consent','consented'].includes(String(value || '').trim().toLowerCase());
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
async function routexSha256Bytes(bytes) {
  const input = bytes instanceof Uint8Array ? bytes : new TextEncoder().encode(String(bytes || ''));
  if (globalThis.crypto?.subtle?.digest) {
    const hash = await crypto.subtle.digest('SHA-256', input);
    return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return routexSha256(new TextDecoder().decode(input));
}
function routexFirstEnv(env, names) {
  for (const name of names) {
    const value = env?.[name];
    if (String(value || '').trim()) return String(value).trim();
  }
  return '';
}
function routexProviderConfig(env) {
  const accountId = routexFirstEnv(env, ['CLOUDFLARE_R2_ACCOUNT_ID','CLOUDFLARE_ACCOUNT_ID']);
  const storageEndpoint = routexFirstEnv(env, ['STORAGE_ENDPOINT']) || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '');
  const storageBucket = routexFirstEnv(env, ['STORAGE_BUCKET','CLOUDFLARE_R2_BUCKET','R2_BUCKET','S3_BUCKET']);
  const storageAccessKey = routexFirstEnv(env, ['STORAGE_ACCESS_KEY_ID','CLOUDFLARE_R2_ACCESS_KEY','AWS_ACCESS_KEY_ID','S3_ACCESS_KEY']);
  const storageSecret = routexFirstEnv(env, ['STORAGE_SECRET_ACCESS_KEY','CLOUDFLARE_R2_SECRET_KEY','AWS_SECRET_ACCESS_KEY','S3_SECRET_KEY']);
  const storageRegion = routexFirstEnv(env, ['STORAGE_REGION','R2_REGION','S3_REGION','AWS_REGION']) || (storageEndpoint ? 'auto' : '');
  const stripeSecret = routexFirstEnv(env, ['STRIPE_SECRET_KEY','STRIPE_SECRET_KEY_LIVE','SKYGATEFS13_STRIPE_SECRET_KEY']);
  const twilioSid = routexFirstEnv(env, ['TWILIO_ACCOUNT_SID','SKYGATEFS13_TWILIO_ACCOUNT_SID']);
  const twilioToken = routexFirstEnv(env, ['TWILIO_AUTH_TOKEN','SKYGATEFS13_TWILIO_AUTH_TOKEN']);
  const twilioFrom = routexFirstEnv(env, ['TWILIO_FROM_NUMBER','TWILIO_PHONE_NUMBER','SKYGATEFS13_TWILIO_PHONE_NUMBER']);
  const twilioTo = routexFirstEnv(env, ['TWILIO_DEFAULT_TO','TWILIO_TO_NUMBER','SKYEROUTEX_TWILIO_TO_NUMBER']);
  const mapboxToken = routexFirstEnv(env, ['MAPBOX_ACCESS_TOKEN','mapbox_api_key','MAPBOX_API_KEY','SKYEROUTEX_MAPBOX_ACCESS_TOKEN']);
  const checkrKey = routexFirstEnv(env, ['CHECKR_API_KEY']);
  const checkrPackage = routexFirstEnv(env, ['CHECKR_PACKAGE','CHECKR_PACKAGE_ID']);
  const certnKey = routexFirstEnv(env, ['CERTN_API_KEY','CERTN_TOKEN']);
  const certnOwnerId = routexFirstEnv(env, ['CERTN_OWNER_ID']);
  const backgroundWebhook = routexFirstEnv(env, ['BACKGROUND_CHECK_WEBHOOK_ENDPOINT','COMPLIANCE_WEBHOOK_ENDPOINT']);
  const backgroundWebhookSecret = routexFirstEnv(env, ['BACKGROUND_CHECK_WEBHOOK_SIGNING_SECRET','COMPLIANCE_WEBHOOK_SIGNING_SECRET']);
  const paymentWebhook = routexFirstEnv(env, ['PAYMENT_WEBHOOK_ENDPOINT']);
  const paymentWebhookSecret = routexFirstEnv(env, ['PAYMENT_WEBHOOK_SIGNING_SECRET']);
  const notificationWebhook = routexFirstEnv(env, ['NOTIFICATION_WEBHOOK_ENDPOINT']);
  const notificationWebhookSecret = routexFirstEnv(env, ['NOTIFICATION_WEBHOOK_SIGNING_SECRET']);
  return {
    database:{driver: routexKv(env) ? 'worker-kv-document' : 'not_configured', configured:Boolean(routexKv(env))},
    storage:{driver: routexFirstEnv(env, ['STORAGE_DRIVER']) || (storageEndpoint && storageBucket && storageAccessKey && storageSecret ? 'r2' : 'worker-kv-proof-ledger'), endpoint:storageEndpoint, bucket:storageBucket, region:storageRegion, accessKeyId:storageAccessKey, secretAccessKey:storageSecret, prefix:routexFirstEnv(env, ['STORAGE_PREFIX','SKYEROUTEX_STORAGE_PREFIX']) || 'skyeroutex', configured:Boolean(storageEndpoint && storageBucket && storageAccessKey && storageSecret)},
    payment:{driver: routexFirstEnv(env, ['PAYMENT_PROVIDER']) || (stripeSecret ? 'stripe' : paymentWebhook && paymentWebhookSecret ? 'payment-webhook' : 'ledger-only'), stripeSecret, stripeApiBase:routexFirstEnv(env, ['STRIPE_API_BASE']) || 'https://api.stripe.com', currency:routexFirstEnv(env, ['STRIPE_CURRENCY']) || 'usd', webhookEndpoint:paymentWebhook, webhookSecret:paymentWebhookSecret},
    notification:{driver: routexFirstEnv(env, ['NOTIFICATION_PROVIDER']) || (twilioSid && twilioToken && twilioFrom ? 'twilio' : notificationWebhook && notificationWebhookSecret ? 'notification-webhook' : '0s-gate-notification-ledger'), twilioSid, twilioToken, twilioFrom, twilioTo, twilioApiBase:routexFirstEnv(env, ['TWILIO_API_BASE']) || 'https://api.twilio.com', webhookEndpoint:notificationWebhook, webhookSecret:notificationWebhookSecret},
    route:{driver: routexFirstEnv(env, ['ROUTE_INTELLIGENCE_PROVIDER']) || (mapboxToken ? 'mapbox' : '0s-worker-route-structure'), mapboxToken, mapboxApiBase:routexFirstEnv(env, ['MAPBOX_API_BASE']) || 'https://api.mapbox.com', mapboxProfile:routexFirstEnv(env, ['MAPBOX_PROFILE']) || 'driving'},
    compliance:{driver: routexFirstEnv(env, ['IDENTITY_COMPLIANCE_PROVIDER','BACKGROUND_CHECK_PROVIDER']) || (checkrKey && checkrPackage ? 'checkr' : certnKey && certnOwnerId ? 'certn' : backgroundWebhook && backgroundWebhookSecret ? 'background-webhook' : 'manual-government-check'), checkrKey, checkrPackage, checkrApiBase:routexFirstEnv(env, ['CHECKR_API_BASE']) || 'https://api.checkr.com', checkrWebhookSecret:routexFirstEnv(env, ['CHECKR_WEBHOOK_SECRET']), certnKey, certnOwnerId, certnApiBase:routexFirstEnv(env, ['CERTN_API_BASE']) || 'https://api.certn.co', certnIndustry:routexFirstEnv(env, ['CERTN_INDUSTRY']) || 'hr', certnRequestFlag:routexFirstEnv(env, ['CERTN_REQUEST_FLAG']) || 'request_softcheck', webhookEndpoint:backgroundWebhook, webhookSecret:backgroundWebhookSecret},
    strict: String(env?.ROUTEX_PROVIDER_STRICT || '').trim() === '1'
  };
}
function routexProviderConnected(config, kind) {
  if (kind === 'storage') return config.storage.configured;
  if (kind === 'payment') return config.payment.driver === 'stripe' ? Boolean(config.payment.stripeSecret) : config.payment.driver === 'payment-webhook' ? Boolean(config.payment.webhookEndpoint && config.payment.webhookSecret) : false;
  if (kind === 'notification') return config.notification.driver === 'twilio' ? Boolean(config.notification.twilioSid && config.notification.twilioToken && config.notification.twilioFrom) : config.notification.driver === 'notification-webhook' ? Boolean(config.notification.webhookEndpoint && config.notification.webhookSecret) : false;
  if (kind === 'route') return config.route.driver === 'mapbox' && Boolean(config.route.mapboxToken);
  if (kind === 'compliance') return config.compliance.driver === 'checkr' ? Boolean(config.compliance.checkrKey && config.compliance.checkrPackage) : config.compliance.driver === 'certn' ? Boolean(config.compliance.certnKey && config.compliance.certnOwnerId) : config.compliance.driver === 'background-webhook' ? Boolean(config.compliance.webhookEndpoint && config.compliance.webhookSecret) : false;
  return false;
}
function routexBackgroundReadiness(env) {
  const config = routexProviderConfig(env);
  return {
    configured:routexProviderConnected(config, 'compliance'),
    driver:config.compliance.driver,
    accepted_options:[
      {driver:'checkr', configured:Boolean(config.compliance.checkrKey && config.compliance.checkrPackage), missing:['CHECKR_API_KEY','CHECKR_PACKAGE'].filter(key => key === 'CHECKR_API_KEY' ? !config.compliance.checkrKey : !config.compliance.checkrPackage)},
      {driver:'certn', configured:Boolean(config.compliance.certnKey && config.compliance.certnOwnerId), missing:['CERTN_API_KEY','CERTN_OWNER_ID'].filter(key => key === 'CERTN_API_KEY' ? !config.compliance.certnKey : !config.compliance.certnOwnerId)},
      {driver:'background-webhook', configured:Boolean(config.compliance.webhookEndpoint && config.compliance.webhookSecret), missing:['BACKGROUND_CHECK_WEBHOOK_ENDPOINT or COMPLIANCE_WEBHOOK_ENDPOINT','BACKGROUND_CHECK_WEBHOOK_SIGNING_SECRET or COMPLIANCE_WEBHOOK_SIGNING_SECRET'].filter((_, index) => index === 0 ? !config.compliance.webhookEndpoint : !config.compliance.webhookSecret)}
    ],
    note:routexProviderConnected(config, 'compliance') ? `External background ordering is configured through ${config.compliance.driver}.` : 'External background ordering is blocked until Checkr, Certn, or a signed background-check webhook is configured. Manual gate compliance proof remains available.'
  };
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
	    contractorProfiles:[],
	    providerProfiles:[],
	    crewProfiles:[],
	    crewMembers:[],
	    providerRosters:[],
	    providerBlocks:[],
	    disputes:[],
	    disputeEvidence:[],
	    notifications:[],
	    autonomousRecommendations:[],
	    auditEvents:[],
	    runtimeEvents:[],
	    complianceChecks:[],
	    integrationOutbox:[],
	    providerWebhooks:[],
	    adminInvites:[],
	    exports:[]
	  };
	}
	function routexNormalizeState(raw) {
	  const base = routexDefaultState();
	  const state = raw && typeof raw === 'object' ? {...base, ...raw} : base;
	  const aliases = {
	    applications:['job_applications'],
	    assignments:['job_assignments'],
	    routeJobs:['route_jobs'],
	    routeStops:['route_stops'],
	    proofItems:['proof_items'],
	    proofMedia:['proof_media'],
	    payments:['payment_ledger'],
	    contractorProfiles:['contractor_profiles'],
	    providerProfiles:['provider_profiles'],
	    crewProfiles:['crew_profiles'],
	    crewMembers:['crew_members'],
	    providerRosters:['provider_rosters'],
	    providerBlocks:['provider_blocks'],
	    disputeEvidence:['dispute_evidence'],
	    autonomousRecommendations:['autonomous_recommendations'],
	    auditEvents:['audit_events'],
	    runtimeEvents:['runtime_events'],
	    complianceChecks:['compliance_checks'],
	    integrationOutbox:['integration_outbox'],
	    providerWebhooks:['provider_webhooks'],
	    adminInvites:['admin_invites'],
	    exports:['export_packets']
	  };
	  for (const [key, names] of Object.entries(aliases)) {
	    if (!Array.isArray(state[key])) {
	      const alias = names.find(name => Array.isArray(raw?.[name]));
	      state[key] = alias ? raw[alias] : [];
	    }
	  }
	  for (const key of ['users','sessions','markets','jobs','applications','assignments','routeJobs','routeStops','proofItems','proofMedia','payments','ratings','contractorProfiles','providerProfiles','crewProfiles','crewMembers','providerRosters','providerBlocks','disputes','disputeEvidence','notifications','autonomousRecommendations','auditEvents','runtimeEvents','complianceChecks','integrationOutbox','providerWebhooks','adminInvites','exports']) {
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
	  delete next.__routexDirty;
	  next.updatedAt = routexNow();
	  await kv.put(routexKey('state'), JSON.stringify(next));
	  return true;
	}
function routexPublicUser(user) {
  if (!user) return null;
  const {passwordHash, password_hash, ...safe} = user;
  return safe;
}
function routexSharedAuthEnabled(env) {
  return Boolean(skygateOrigin(env) || env.SKYGATEFS27_WORKER?.fetch);
}
function routexAllowedRole(value) {
  const role = String(value || '').trim().toLowerCase();
  return ['contractor','provider','crew','ae','house_command','admin'].includes(role) ? role : '';
}
function routexSessionId(request) {
  return String(request.headers.get('x-skye-session') || bearer(request) || '').trim();
}
function routexUserFromLocalSession(request, state) {
  const sessionId = routexSessionId(request);
  if (!sessionId) return null;
  const session = state.sessions.find(item => item.id === sessionId && item.expiresAt > routexNow());
  if (!session) return null;
  const user = state.users.find(item => item.id === session.userId && item.status === 'active');
  return user ? routexPublicUser(user) : null;
}
function routexLocalUserForIdentity(state, identity = {}) {
  const email = String(identity.email || '').toLowerCase();
  const subject = String(identity.subject || identity.id || '').trim();
  return state.users.find(item =>
    item.status === 'active' && (
      (email && routexEmail(item.email) === email)
      || (subject && (item.skygate_subject === subject || item.skygate_sub === subject || item.skygate_id === subject || item.id === subject))
    )
  ) || null;
}
function routexGateUser(identity = {}, state) {
  const local = routexLocalUserForIdentity(state, identity);
  const role = routexAllowedRole(local?.role || identity.routexRole || identity.role) || (identity.isAdmin ? 'admin' : 'contractor');
  const phone = routexPhone(local?.phone || identity.phone || identity.phoneNumber || identity.phone_number);
  const smsOptIn = local?.sms_opt_in ?? identity.smsOptIn ?? identity.sms_opt_in ?? identity.smsConsent ?? identity.sms_consent;
  return routexPublicUser({
    ...(local || {}),
    id: local?.id || identity.subject || identity.email || identity.id || routexId('gate'),
    email: local?.email || identity.email || '',
    role,
    status:'active',
    name: local?.name || identity.email || identity.id || 'SkyeGate user',
    phone,
    sms_opt_in:routexConsentFlag(smsOptIn),
    skygate_subject: local?.skygate_subject || identity.subject || identity.id || '',
    skygate_email: local?.skygate_email || identity.email || ''
  });
}
function routexEnsureUser(state, user = {}, options = {}) {
  if (!user?.id && !user?.email) return null;
  const shouldPersist = options.persist !== false;
  const email = routexEmail(user.email);
  const existing = state.users.find(item =>
    (user.id && item.id === user.id)
    || (email && routexEmail(item.email) === email)
    || (user.skygate_subject && item.skygate_subject === user.skygate_subject)
  );
  const now = routexNow();
  let dirty = false;
  const row = existing || {
    id:user.id || routexId('gate'),
    email,
    role:routexAllowedRole(user.role) || 'contractor',
    status:'active',
    name:routexClean(user.name || email || user.id || 'SkyeGate user', 120),
    phone:routexPhone(user.phone || user.phone_number || user.phoneNumber),
    sms_opt_in:routexConsentFlag(user.sms_opt_in ?? user.smsOptIn ?? user.sms_consent ?? user.smsConsent),
    city:routexClean(user.city, 80),
    state:routexClean(user.state, 80),
    skygate_subject:user.skygate_subject || user.id || '',
    skygate_email:user.skygate_email || email,
    created_at:now,
    updated_at:now
  };
  if (existing) {
    const before = JSON.stringify(row);
    const nextRole = routexAllowedRole(user.role);
    row.email = row.email || email;
    row.name = routexClean(row.name || user.name || row.email || row.id, 120);
    const nextPhone = routexPhone(user.phone || user.phone_number || user.phoneNumber);
    if (nextPhone) row.phone = nextPhone;
    if (Object.prototype.hasOwnProperty.call(user, 'sms_opt_in') || Object.prototype.hasOwnProperty.call(user, 'smsOptIn') || Object.prototype.hasOwnProperty.call(user, 'sms_consent') || Object.prototype.hasOwnProperty.call(user, 'smsConsent')) row.sms_opt_in = routexConsentFlag(user.sms_opt_in ?? user.smsOptIn ?? user.sms_consent ?? user.smsConsent);
    row.role = nextRole || row.role || 'contractor';
    row.status = row.status || 'active';
    row.skygate_subject = row.skygate_subject || user.skygate_subject || user.id || '';
    row.skygate_email = row.skygate_email || user.skygate_email || email;
    row.updated_at = now;
    dirty = JSON.stringify(row) !== before;
  } else {
    state.users.unshift(row);
    dirty = true;
  }
  if (row.role === 'contractor' && !state.contractorProfiles.some(item => item.user_id === row.id)) {
    state.contractorProfiles.unshift({user_id:row.id, skills:[], service_radius_miles:25, transportation_status:'unknown', reliability_score:50, rating_avg:0, completed_jobs:0});
    dirty = true;
  }
  if (row.role === 'crew' && !state.crewProfiles.some(item => item.user_id === row.id)) {
    state.crewProfiles.unshift({user_id:row.id, crew_name:row.name || row.email || row.id, member_count:1, rating_avg:0, completed_jobs:0});
    dirty = true;
  }
  if (row.role === 'provider' && !state.providerProfiles.some(item => item.user_id === row.id)) {
    state.providerProfiles.unshift({user_id:row.id, company_name:row.company_name || row.name || row.email || row.id, provider_type:'local_business', rating_avg:0, completed_jobs:0});
    dirty = true;
  }
  if (dirty && shouldPersist) state.__routexDirty = true;
  return row;
}
async function routexRequireUser(request, env, state, roles) {
  let user = null;
  if (routexSharedAuthEnabled(env)) {
    const gate = await requireGateAuth(request, env, 'SkyeRouteX route');
    if (!gate.ok) return {ok:false, response:routexJson({ok:false, error:'Authentication required.', gate_owned:true, productionGate:true}, 401)};
    user = routexGateUser(gate.identity || {}, state);
    routexEnsureUser(state, user, {persist: request.method.toUpperCase() !== 'GET'});
  } else {
    user = routexUserFromLocalSession(request, state);
  }
  if (!user) return {ok:false, response:routexJson({ok:false, error:'Authentication required.'}, 401)};
  if (roles && !roles.includes(user.role)) return {ok:false, response:routexJson({ok:false, error:`Requires role: ${roles.join(', ')}`}, 403)};
  return {ok:true, user};
}
function routexAudit(state, actor, eventType, entityType, entityId, metadata = {}) {
  const event = {id:routexId('aud'), actor_user_id:actor?.id || actor || null, event_type:eventType, entity_type:entityType, entity_id:entityId, metadata, created_at:routexNow()};
  state.auditEvents.unshift(event);
  const runtime = {id:routexId('rtevt'), provider:'0s-skygate-runtime-events', event_type:eventType, entity_type:entityType, entity_id:entityId, actor_user_id:event.actor_user_id, metadata, created_at:event.created_at};
  state.runtimeEvents.unshift(runtime);
  state.integrationOutbox.unshift({id:routexId('iox'), provider_kind:'0s_runtime', driver:'0s-skygate-platform-events', event_type:eventType, entity_type:entityType, entity_id:entityId, status:'pending', attempts:0, payload:{runtime_event_id:runtime.id, actor_user_id:event.actor_user_id, gate_mirror:true, metadata}, last_error:null, created_at:event.created_at, updated_at:event.created_at, dispatched_at:null});
  return event;
}
async function routexMirrorAuditEventsToGate(env, events = []) {
  const selected = events.filter(Boolean).slice(0, 8);
  const results = [];
  for (const event of selected) {
    const meta = {
      audit_event_id:event.id,
      entity_type:event.entity_type,
      entity_id:event.entity_id,
      actor_user_id:event.actor_user_id,
      routex_event_type:event.event_type,
      ...(event.metadata || {})
    };
    const result = await mirrorSkygateEvent(env, {actor:event.actor_user_id, type:`skyeroutex.${event.event_type}`, event_ts:event.created_at, meta}).catch(error => ({ok:false, error:String(error?.message || error)}));
    results.push(result);
  }
  return results;
}
function routexProviderOutbox(state, {provider_kind, driver, event_type, entity_type, entity_id, payload = {}, result = null}) {
  const now = routexNow();
  const status = result ? (result.ok ? 'dispatched' : 'failed') : 'pending';
  const row = {
    id:routexId('iox'),
    provider_kind,
    driver,
    event_type,
    entity_type,
    entity_id,
    status,
    attempts:result ? 1 : 0,
    payload,
    provider_status:result?.status || null,
    provider_response:result?.body || null,
    last_error:result?.ok === false ? routexClean(result.error || 'Provider dispatch failed.', 1000) : null,
    created_at:now,
    updated_at:now,
    dispatched_at:result?.ok ? now : null
  };
  state.integrationOutbox.unshift(row);
  return row;
}
function routexFormBody(fields) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(fields || {})) {
    if (value !== undefined && value !== null && value !== '') form.set(key, String(value));
  }
  return form;
}
function routexBasicAuth(user, pass = '') {
  return `Basic ${btoa(`${user}:${pass}`)}`;
}
async function routexFetchProvider(url, init = {}, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {...init, signal:controller.signal});
    const text = await response.text().catch(() => '');
    let body = text;
    try { body = text ? JSON.parse(text) : null; } catch {}
    if (!response.ok) return {ok:false, status:response.status, body, error:`HTTP ${response.status}${text ? `: ${String(text).slice(0, 240)}` : ''}`};
    return {ok:true, status:response.status, body};
  } catch (error) {
    return {ok:false, status:0, body:null, error:error?.message || String(error)};
  } finally {
    clearTimeout(timer);
  }
}
async function routexHmacBytes(keyBytes, text) {
  const key = await crypto.subtle.importKey('raw', keyBytes, {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
}
function routexHex(bytes) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
async function routexHmacHex(secret, text) {
  return routexHex(await routexHmacBytes(new TextEncoder().encode(secret), text));
}
function routexAmzDate(date = new Date()) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}
function routexEncodePathPart(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}
function routexCanonicalQuery(searchParams) {
  return [...searchParams.entries()].sort(([ak, av], [bk, bv]) => ak === bk ? av.localeCompare(bv) : ak.localeCompare(bk)).map(([key, value]) => `${routexEncodePathPart(key)}=${routexEncodePathPart(value)}`).join('&');
}
async function routexS3SigningKey(secret, dateStamp, region) {
  const kDate = await routexHmacBytes(new TextEncoder().encode(`AWS4${secret}`), dateStamp);
  const kRegion = await routexHmacBytes(kDate, region);
  const kService = await routexHmacBytes(kRegion, 's3');
  return routexHmacBytes(kService, 'aws4_request');
}
async function routexSignS3Request({method, url, headers = {}, body = new Uint8Array(), accessKeyId, secretAccessKey, region}) {
  const target = new URL(url);
  const payloadHash = await routexSha256Bytes(body);
  const amz = routexAmzDate();
  const requestHeaders = {...headers, host:target.host, 'x-amz-content-sha256':payloadHash, 'x-amz-date':amz};
  const lowerMap = new Map(Object.entries(requestHeaders).map(([key, value]) => [key.toLowerCase(), String(value).trim().replace(/\s+/g, ' ')]));
  const names = [...lowerMap.keys()].sort();
  const canonicalHeaders = names.map(name => `${name}:${lowerMap.get(name)}\n`).join('');
  const signedHeaders = names.join(';');
  const canonicalUri = target.pathname.split('/').map(routexEncodePathPart).join('/').replace(/%2F/g, '/');
  const canonicalRequest = [method.toUpperCase(), canonicalUri || '/', routexCanonicalQuery(target.searchParams), canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const dateStamp = amz.slice(0, 8);
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amz, scope, await routexSha256(canonicalRequest)].join('\n');
  const signingKey = await routexS3SigningKey(secretAccessKey, dateStamp, region);
  const signature = routexHex(await routexHmacBytes(signingKey, stringToSign));
  return {
    ...requestHeaders,
    authorization:`AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
}
function routexSafeObjectName(value) {
  return routexClean(value, 200).replace(/[^a-z0-9_.-]+/gi, '_') || `${Date.now()}.bin`;
}
async function routexPutObject(env, state, kind, name, rawBody, contentType, metadata = {}) {
  const config = routexProviderConfig(env);
  if (!config.storage.configured) return null;
  const bytes = rawBody instanceof Uint8Array ? rawBody : new TextEncoder().encode(String(rawBody || ''));
  const key = [config.storage.prefix, routexSafeObjectName(kind), routexSafeObjectName(name)].filter(Boolean).join('/');
  const endpoint = new URL(String(config.storage.endpoint).replace(/\/+$/, ''));
  endpoint.pathname = [endpoint.pathname.replace(/\/+$/g, ''), config.storage.bucket, ...key.split('/').map(routexEncodePathPart)].filter(Boolean).join('/');
  const sha256 = await routexSha256Bytes(bytes);
  const headers = {
    'content-type': contentType || 'application/octet-stream',
    'x-amz-meta-sha256':sha256,
    ...Object.fromEntries(Object.entries(metadata).map(([key, value]) => [`x-amz-meta-${String(key).toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`, String(value)]))
  };
  const signedHeaders = await routexSignS3Request({method:'PUT', url:endpoint.toString(), headers, body:bytes, accessKeyId:config.storage.accessKeyId, secretAccessKey:config.storage.secretAccessKey, region:config.storage.region});
  const result = await routexFetchProvider(endpoint.toString(), {method:'PUT', headers:signedHeaders, body:bytes}, 12000);
  routexProviderOutbox(state, {provider_kind:'proof_storage', driver:config.storage.driver || 'r2', event_type:'object_put', entity_type:kind, entity_id:name, payload:{bucket:config.storage.bucket, object_key:key, byte_size:bytes.byteLength}, result});
  if (!result.ok && config.strict) throw new Error(`Object storage write failed: ${result.error}`);
  if (!result.ok) return null;
  return {driver:config.storage.driver || 'r2', bucket:config.storage.bucket, object_key:key, storage_path:`s3://${config.storage.bucket}/${key}`, byte_size:bytes.byteLength, sha256};
}
async function routexAuthorizePaymentProvider(env, state, payment, job, eventType = 'payment_authorized') {
  const config = routexProviderConfig(env);
  let result = null;
  let driver = config.payment.driver;
  if (driver === 'stripe' && config.payment.stripeSecret) {
    const body = routexFormBody({
      amount:payment.amount_cents,
      currency:config.payment.currency,
      capture_method:'manual',
      description:`SkyeRouteX job ${job.id}`,
      'metadata[job_id]':job.id,
      'metadata[payment_ledger_id]':payment.id,
      'metadata[provider_id]':job.provider_id,
      'metadata[assignment_id]':payment.assignment_id || ''
    });
    result = await routexFetchProvider(`${config.payment.stripeApiBase.replace(/\/+$/, '')}/v1/payment_intents`, {
      method:'POST',
      headers:{authorization:`Bearer ${config.payment.stripeSecret}`, 'content-type':'application/x-www-form-urlencoded'},
      body
    });
    if (result.ok) {
      payment.external_provider = 'stripe';
      payment.external_payment_intent_id = result.body?.id || null;
      payment.external_status = result.body?.status || 'created';
      payment.status = payment.status === 'authorized' ? 'payment_authorization_queued' : payment.status;
    }
  } else if (driver === 'payment-webhook' && config.payment.webhookEndpoint && config.payment.webhookSecret) {
    const timestamp = routexNow();
    const payload = JSON.stringify({event_type:eventType, payment, job_id:job.id, sent_at:timestamp});
    const signature = `sha256=${await routexHmacHex(config.payment.webhookSecret, `${timestamp}.${payload}`)}`;
    result = await routexFetchProvider(config.payment.webhookEndpoint, {
      method:'POST',
      headers:{'content-type':'application/json', 'x-skyeroutex-timestamp':timestamp, 'x-skyeroutex-signature':signature},
      body:payload
    });
  } else {
    driver = '0s-gate-payment-ledger';
  }
  if (result) {
    const outbox = routexProviderOutbox(state, {provider_kind:'payment_provider', driver, event_type:eventType, entity_type:'payment_ledger', entity_id:payment.id, payload:{job_id:job.id, assignment_id:payment.assignment_id || null, amount_cents:payment.amount_cents}, result});
    payment.external_dispatch_id = outbox.id;
    payment.provider_driver = driver;
    payment.provider_dispatch_status = outbox.status;
    payment.provider_error = outbox.last_error;
    payment.updated_at = routexNow();
    if (!result.ok && config.strict) throw new Error(`Payment provider failed: ${result.error}`);
  } else {
    payment.provider_driver = driver;
  }
  return payment;
}
function routexStripePublicIntent(body = {}) {
  if (!body || typeof body !== 'object') return null;
  return {
    id:body.id || null,
    object:body.object || null,
    livemode:Boolean(body.livemode),
    status:body.status || null,
    amount:body.amount || null,
    amount_capturable:body.amount_capturable || 0,
    amount_received:body.amount_received || 0,
    currency:body.currency || null,
    capture_method:body.capture_method || null,
    confirmation_method:body.confirmation_method || null,
    payment_method:body.payment_method || null,
    latest_charge:body.latest_charge || null,
    created:body.created || null
  };
}
async function routexRetrieveStripePayment(env, state, payment, eventType = 'stripe_payment_intent_retrieved') {
  const config = routexProviderConfig(env);
  if (config.payment.driver !== 'stripe' || !config.payment.stripeSecret) {
    return {ok:false, error:'stripe_not_configured', payment};
  }
  if (!payment?.external_payment_intent_id) {
    return {ok:false, error:'payment_has_no_stripe_payment_intent', payment};
  }
  const intentId = encodeURIComponent(payment.external_payment_intent_id);
  const result = await routexFetchProvider(`${config.payment.stripeApiBase.replace(/\/+$/, '')}/v1/payment_intents/${intentId}`, {
    method:'GET',
    headers:{authorization:`Bearer ${config.payment.stripeSecret}`}
  }, 12000);
  const outbox = routexProviderOutbox(state, {
    provider_kind:'payment_provider',
    driver:'stripe',
    event_type:eventType,
    entity_type:'payment_ledger',
    entity_id:payment.id,
    payload:{job_id:payment.job_id, assignment_id:payment.assignment_id || null, payment_intent_id:payment.external_payment_intent_id},
    result
  });
  payment.provider_status_check_id = outbox.id;
  payment.provider_status_checked_at = routexNow();
  payment.provider_dispatch_status = payment.provider_dispatch_status || outbox.status;
  if (result.ok) {
    const intent = routexStripePublicIntent(result.body);
    payment.external_status = intent.status || payment.external_status;
    payment.external_livemode = intent.livemode;
    payment.external_amount_capturable = intent.amount_capturable;
    payment.external_amount_received = intent.amount_received;
    payment.external_capture_method = intent.capture_method;
    payment.provider_receipt = intent;
  } else {
    payment.provider_error = outbox.last_error;
  }
  payment.updated_at = routexNow();
  return {ok:result.ok, status:result.status, payment, receipt:payment.provider_receipt || null, outbox, error:result.error || null};
}
async function routexCaptureStripePayment(env, state, payment, amountToCapture = null) {
  const retrieved = await routexRetrieveStripePayment(env, state, payment, 'stripe_payment_intent_pre_capture_retrieved');
  if (!retrieved.ok) return {...retrieved, capture_attempted:false};
  const receipt = retrieved.receipt || {};
  if (receipt.status !== 'requires_capture') {
    const outbox = routexProviderOutbox(state, {
      provider_kind:'payment_provider',
      driver:'stripe',
      event_type:'stripe_capture_blocked_not_capturable',
      entity_type:'payment_ledger',
      entity_id:payment.id,
      payload:{payment_intent_id:payment.external_payment_intent_id, stripe_status:receipt.status, amount_capturable:receipt.amount_capturable || 0},
      result:{ok:false, status:409, body:receipt, error:`Stripe PaymentIntent is ${receipt.status || 'unknown'}, not requires_capture.`}
    });
    payment.capture_status = 'blocked_not_capturable';
    payment.capture_blocked_reason = outbox.last_error;
    payment.capture_checked_at = routexNow();
    payment.updated_at = payment.capture_checked_at;
    return {ok:false, capture_attempted:false, capture_ready:false, payment, receipt, outbox, error:outbox.last_error};
  }
  const config = routexProviderConfig(env);
  const body = routexFormBody(amountToCapture ? {amount_to_capture:amountToCapture} : {});
  const result = await routexFetchProvider(`${config.payment.stripeApiBase.replace(/\/+$/, '')}/v1/payment_intents/${encodeURIComponent(payment.external_payment_intent_id)}/capture`, {
    method:'POST',
    headers:{authorization:`Bearer ${config.payment.stripeSecret}`, 'content-type':'application/x-www-form-urlencoded'},
    body
  }, 12000);
  const outbox = routexProviderOutbox(state, {
    provider_kind:'payment_provider',
    driver:'stripe',
    event_type:'stripe_payment_intent_capture',
    entity_type:'payment_ledger',
    entity_id:payment.id,
    payload:{payment_intent_id:payment.external_payment_intent_id, amount_to_capture:amountToCapture || null},
    result
  });
  payment.capture_status = result.ok ? 'captured' : 'failed';
  payment.capture_checked_at = routexNow();
  payment.provider_error = result.ok ? null : outbox.last_error;
  if (result.ok) {
    const intent = routexStripePublicIntent(result.body);
    payment.external_status = intent.status || payment.external_status;
    payment.external_amount_received = intent.amount_received;
    payment.provider_receipt = intent;
    payment.status = intent.status === 'succeeded' ? 'captured' : payment.status;
  }
  payment.updated_at = routexNow();
  return {ok:result.ok, capture_attempted:true, capture_ready:true, payment, receipt:payment.provider_receipt || null, outbox, error:result.error || null};
}
async function routexDispatchNotificationProvider(env, state, notification) {
  const config = routexProviderConfig(env);
  let result = null;
  let driver = config.notification.driver;
  const recipientPhone = routexPhone(notification.recipient_phone || config.notification.twilioTo);
  const smsAllowed = routexConsentFlag(notification.sms_opt_in) && Boolean(recipientPhone);
  if (driver === 'twilio' && routexProviderConnected(config, 'notification')) {
    if (smsAllowed) {
      const sid = encodeURIComponent(config.notification.twilioSid);
      const body = routexFormBody({
        To:recipientPhone,
        From:config.notification.twilioFrom,
        Body:`${notification.title}: ${notification.body}`.slice(0, 1400)
      });
      result = await routexFetchProvider(`${config.notification.twilioApiBase.replace(/\/+$/, '')}/2010-04-01/Accounts/${sid}/Messages.json`, {
        method:'POST',
        headers:{authorization:routexBasicAuth(config.notification.twilioSid, config.notification.twilioToken), 'content-type':'application/x-www-form-urlencoded'},
        body
      });
      if (result.ok) notification.external_message_id = result.body?.sid || null;
    } else {
      driver = '0s-gate-notification-ledger';
      notification.delivery_status = recipientPhone ? 'gate_ledger_stored_sms_not_opted_in' : 'gate_ledger_stored_no_gate_phone';
      notification.last_error = null;
    }
  } else if (driver === 'notification-webhook' && config.notification.webhookEndpoint && config.notification.webhookSecret) {
    const timestamp = routexNow();
    const payload = JSON.stringify({event_type:'notification_created', notification, sent_at:timestamp});
    const signature = `sha256=${await routexHmacHex(config.notification.webhookSecret, `${timestamp}.${payload}`)}`;
    result = await routexFetchProvider(config.notification.webhookEndpoint, {
      method:'POST',
      headers:{'content-type':'application/json', 'x-skyeroutex-timestamp':timestamp, 'x-skyeroutex-signature':signature},
      body:payload
    });
  } else {
    driver = '0s-gate-notification-ledger';
  }
  if (result) {
    const outbox = routexProviderOutbox(state, {provider_kind:'notification_provider', driver, event_type:'notification_created', entity_type:'notification', entity_id:notification.id, payload:{user_id:notification.user_id, title:notification.title}, result});
    notification.delivery_provider = driver;
    notification.delivery_status = outbox.status;
    notification.external_dispatch_id = outbox.id;
    notification.last_error = outbox.last_error;
    if (!result.ok && config.strict) throw new Error(`Notification provider failed: ${result.error}`);
  } else if (driver === '0s-gate-notification-ledger') {
    notification.delivery_provider = driver;
    notification.delivery_status = notification.delivery_status || 'stored';
  }
  return notification;
}
function routexTwilioPublicMessage(body = {}) {
  if (!body || typeof body !== 'object') return null;
  return {
    sid:body.sid || null,
    account_sid:body.account_sid || null,
    status:body.status || null,
    direction:body.direction || null,
    from:body.from || null,
    to:body.to ? 'present' : null,
    error_code:body.error_code || null,
    error_message:body.error_message || null,
    num_segments:body.num_segments || null,
    price:body.price || null,
    price_unit:body.price_unit || null,
    date_created:body.date_created || null,
    date_sent:body.date_sent || null,
    date_updated:body.date_updated || null
  };
}
async function routexRefreshTwilioNotification(env, state, notification) {
  const config = routexProviderConfig(env);
  if (config.notification.driver !== 'twilio' || !routexProviderConnected(config, 'notification')) {
    return {ok:false, error:'twilio_not_configured', notification};
  }
  if (!notification?.external_message_id) {
    return {ok:false, error:'notification_has_no_twilio_message_sid', notification};
  }
  const accountSid = encodeURIComponent(config.notification.twilioSid);
  const messageSid = encodeURIComponent(notification.external_message_id);
  const result = await routexFetchProvider(`${config.notification.twilioApiBase.replace(/\/+$/, '')}/2010-04-01/Accounts/${accountSid}/Messages/${messageSid}.json`, {
    method:'GET',
    headers:{authorization:routexBasicAuth(config.notification.twilioSid, config.notification.twilioToken)}
  }, 12000);
  const outbox = routexProviderOutbox(state, {
    provider_kind:'notification_provider',
    driver:'twilio',
    event_type:'twilio_message_status_checked',
    entity_type:'notification',
    entity_id:notification.id,
    payload:{user_id:notification.user_id, message_sid:notification.external_message_id},
    result
  });
  notification.provider_status_check_id = outbox.id;
  notification.provider_status_checked_at = routexNow();
  if (result.ok) {
    const receipt = routexTwilioPublicMessage(result.body);
    notification.carrier_status = receipt.status || notification.carrier_status || null;
    notification.delivery_status = receipt.status ? `twilio_${receipt.status}` : notification.delivery_status;
    notification.provider_receipt = receipt;
    notification.last_error = receipt.error_message || null;
  } else {
    notification.last_error = outbox.last_error;
  }
  return {ok:result.ok, status:result.status, notification, receipt:notification.provider_receipt || null, outbox, error:result.error || null};
}
function routexDecodeBase64(value) {
  const binary = atob(String(value || ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
async function routexStoreProofMedia(env, state, {assignmentId = null, proofId = null, complianceCheckId = null, mediaBase64 = '', proofBody = '', mediaMime = 'text/plain', mediaExt = 'txt', context = 'proof_media'}) {
  const raw = mediaBase64 ? routexDecodeBase64(mediaBase64) : new TextEncoder().encode(String(proofBody || ''));
  const ext = routexClean(mediaExt || 'txt', 20).replace(/[^a-z0-9]/gi, '') || 'txt';
  const media = {id:routexId('media'), assignment_id:assignmentId, proof_id:proofId, compliance_check_id:complianceCheckId, media_context:context, media_mime:routexClean(mediaMime || 'text/plain', 80), media_ext:ext, byte_size:raw.byteLength, storage_driver:'worker-kv-proof-ledger', storage_path:`kv://skyeroutex/${context}/${proofId || complianceCheckId || Date.now()}.${ext}`, created_at:routexNow()};
  const put = await routexPutObject(env, state, context, `${proofId || complianceCheckId || media.id}.${ext}`, raw, media.media_mime, {proof_id:proofId || '', compliance_check_id:complianceCheckId || ''});
  if (put) Object.assign(media, {storage_driver:put.driver, storage_path:put.storage_path, object_key:put.object_key, bucket:put.bucket, sha256:put.sha256, external_storage_status:'stored'});
  else media.external_storage_status = routexProviderConfig(env).storage.configured ? 'failed_or_fallback' : 'worker_kv_ledger_only';
  state.proofMedia.unshift(media);
  return media;
}
async function routexWriteExportObject(env, state, name, payload) {
  const raw = JSON.stringify(payload, null, 2);
  return routexPutObject(env, state, 'exports', name, new TextEncoder().encode(raw), 'application/json; charset=utf-8', {export_name:name});
}
function routexCoordinatePair(value) {
  if (Array.isArray(value) && value.length >= 2) return [Number(value[0]), Number(value[1])].every(Number.isFinite) ? [Number(value[0]), Number(value[1])] : null;
  if (value && typeof value === 'object') {
    const lon = Number(value.lng ?? value.lon ?? value.longitude);
    const lat = Number(value.lat ?? value.latitude);
    if (Number.isFinite(lon) && Number.isFinite(lat)) return [lon, lat];
  }
  return null;
}
async function routexMapboxGeocode(config, address) {
  if (!address) return null;
  const url = `${config.route.mapboxApiBase.replace(/\/+$/, '')}/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${encodeURIComponent(config.route.mapboxToken)}&limit=1`;
  const result = await routexFetchProvider(url, {method:'GET'}, 9000);
  if (!result.ok) return {error:result.error};
  const center = result.body?.features?.[0]?.center;
  return routexCoordinatePair(center);
}
async function routexEnrichRouteProvider(env, state, route, job, sourceStops = []) {
  const config = routexProviderConfig(env);
  if (config.route.driver !== 'mapbox' || !config.route.mapboxToken) {
    route.route_provider = config.route.driver;
    return route;
  }
  const stops = state.routeStops.filter(stop => stop.route_job_id === route.id);
  const source = sourceStops.length ? sourceStops : stops;
  const coords = [];
  for (let index = 0; index < source.length; index += 1) {
    const supplied = routexCoordinatePair(source[index]?.coordinates || source[index]?.coords || source[index]);
    const resolved = supplied || await routexMapboxGeocode(config, source[index]?.address || stops[index]?.address || job.location);
    if (Array.isArray(resolved)) coords.push(resolved);
  }
  let result = null;
  if (coords.length >= 2) {
    const joined = coords.map(pair => `${pair[0]},${pair[1]}`).join(';');
    const url = `${config.route.mapboxApiBase.replace(/\/+$/, '')}/directions/v5/mapbox/${encodeURIComponent(config.route.mapboxProfile)}/${joined}?access_token=${encodeURIComponent(config.route.mapboxToken)}&overview=false&steps=false`;
    result = await routexFetchProvider(url, {method:'GET'}, 9000);
    if (result.ok) {
      const first = result.body?.routes?.[0] || {};
      route.route_provider = 'mapbox';
      route.provider_route_status = 'dispatched';
      route.distance_meters = Number(first.distance || 0);
      route.duration_seconds = Number(first.duration || 0);
      route.provider_coordinates = coords;
      route.updated_at = routexNow();
    }
  } else {
    result = {ok:false, status:0, error:'Not enough geocoded stops for Mapbox directions.'};
  }
  const outbox = routexProviderOutbox(state, {provider_kind:'route_intelligence', driver:'mapbox', event_type:'route_directions_requested', entity_type:'route_job', entity_id:route.id, payload:{job_id:job.id, stop_count:stops.length, coordinate_count:coords.length}, result});
  route.route_provider_dispatch_id = outbox.id;
  route.provider_error = outbox.last_error;
  if (!result?.ok && config.strict) throw new Error(`Route provider failed: ${result?.error}`);
  return route;
}
async function routexDispatchBackgroundProvider(env, state, row, user = null) {
  const config = routexProviderConfig(env);
  let result = null;
  let driver = config.compliance.driver;
  const subjectEmail = user?.email || row.email || '';
  if (driver === 'checkr' && routexProviderConnected(config, 'compliance')) {
    const body = routexFormBody({package:config.compliance.checkrPackage, candidate_id:row.user_id, work_locations:'US'});
    result = await routexFetchProvider(`${config.compliance.checkrApiBase.replace(/\/+$/, '')}/v1/invitations`, {
      method:'POST',
      headers:{authorization:routexBasicAuth(config.compliance.checkrKey, ''), 'content-type':'application/x-www-form-urlencoded'},
      body
    });
  } else if (driver === 'certn' && routexProviderConnected(config, 'compliance')) {
    const industry = config.compliance.certnIndustry === 'pm' ? 'pm' : 'hr';
    const payload = {[config.compliance.certnRequestFlag]:true, email:subjectEmail, owner_id:config.compliance.certnOwnerId, tag:`skyeroutex-${row.user_id || row.assignment_id || row.id}`};
    result = await routexFetchProvider(`${config.compliance.certnApiBase.replace(/\/+$/, '')}/api/v1/${industry}/applications/invite/`, {
      method:'POST',
      headers:{authorization:`Token ${config.compliance.certnKey}`, 'content-type':'application/json'},
      body:JSON.stringify(payload)
    });
  } else if (driver === 'background-webhook' && routexProviderConnected(config, 'compliance')) {
    const timestamp = routexNow();
    const payload = JSON.stringify({event_type:'background_check_requested', compliance_check:row, user:{id:user?.id, email:subjectEmail}, sent_at:timestamp});
    const signature = `sha256=${await routexHmacHex(config.compliance.webhookSecret, `${timestamp}.${payload}`)}`;
    result = await routexFetchProvider(config.compliance.webhookEndpoint, {
      method:'POST',
      headers:{'content-type':'application/json', 'x-skyeroutex-timestamp':timestamp, 'x-skyeroutex-signature':signature},
      body:payload
    });
  } else {
    driver = 'manual-government-check';
  }
  row.provider = driver === 'manual-government-check' ? row.provider : driver;
  if (result) {
    const outbox = routexProviderOutbox(state, {provider_kind:'identity_compliance', driver, event_type:'background_check_requested', entity_type:'compliance_check', entity_id:row.id, payload:{user_id:row.user_id, assignment_id:row.assignment_id || null}, result});
    row.external_dispatch_id = outbox.id;
    row.provider_dispatch_status = outbox.status;
    row.provider_error = outbox.last_error;
    row.provider_reference = result.body?.id || result.body?.applicant_id || result.body?.invitation_id || null;
    row.updated_at = routexNow();
    if (!result.ok && config.strict) throw new Error(`Background provider failed: ${result.error}`);
  }
  return row;
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
function routexNotify(state, userId, title, body) {
  const user = state.users.find(item => item.id === userId) || null;
  const recipientPhone = routexPhone(user?.phone || user?.phone_number);
  const smsOptIn = routexConsentFlag(user?.sms_opt_in ?? user?.smsOptIn ?? user?.sms_consent ?? user?.smsConsent);
  const row = {id:routexId('not'), user_id:userId, title:routexClean(title, 160), body:routexClean(body, 1000), channel:'gate_notification', delivery_provider:'0s-gate-notification-ledger', delivery_status:'stored', recipient_phone:recipientPhone || null, sms_opt_in:smsOptIn, gate_owned:true, read_at:null, created_at:routexNow()};
  state.notifications.unshift(row);
  state.integrationOutbox.unshift({id:routexId('iox'), provider_kind:'notification_provider', driver:'0s-gate-notification-ledger', event_type:'notification_created', entity_type:'notification', entity_id:row.id, status:'pending', attempts:0, payload:{user_id:userId, title:row.title, channel:row.channel, gate_owned:true, recipient_phone_present:Boolean(recipientPhone), sms_opt_in:smsOptIn}, last_error:null, created_at:row.created_at, updated_at:row.created_at, dispatched_at:null});
  return row;
}
function routexNormalizeChecks(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(',');
  const checks = raw.map(item => routexClean(item, 80).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')).filter(Boolean);
  return checks.length ? checks.slice(0, 12) : ['standalone_disclosure_authorization', 'manual_public_record_review', 'proof_vault_upload'];
}
function routexNormalizeManualComplianceStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  return ['intake_open','consent_recorded','submitted','pending_subject_document','clear','review_required','adverse_action_pending','closed'].includes(status) ? status : 'intake_open';
}
function routexRecordUserCompliance(state, userId, role) {
  const row = {id:routexId('cmp'), user_id:userId, role:routexClean(role || 'contractor', 40), provider:'0s-gate-shared-auth-attestation', status:'attested_shared_gate', checks:['shared_gate_identity','terms_attestation'], gate_owned:true, created_at:routexNow()};
  state.complianceChecks.unshift(row);
  state.integrationOutbox.unshift({id:routexId('iox'), provider_kind:'identity_compliance', driver:row.provider, event_type:'user_compliance_attested', entity_type:'compliance_check', entity_id:row.id, status:'pending', attempts:0, payload:{user_id:userId, role:row.role, status:row.status, checks:row.checks}, last_error:null, created_at:row.created_at, updated_at:row.created_at, dispatched_at:null});
  return row;
}
function routexRecordAssignmentCompliance(state, assignment) {
  const row = {id:routexId('cmp'), user_id:assignment.contractor_id, assignment_id:assignment.id, provider:'0s-gate-assignment-compliance-ledger', status:'assignment_compliance_recorded', checks:['assignment_state_machine','worksite_scope_review','proof_vault_required'], gate_owned:true, created_at:routexNow()};
  state.complianceChecks.unshift(row);
  state.integrationOutbox.unshift({id:routexId('iox'), provider_kind:'identity_compliance', driver:row.provider, event_type:'assignment_compliance_attested', entity_type:'compliance_check', entity_id:row.id, status:'pending', attempts:0, payload:{user_id:row.user_id, assignment_id:row.assignment_id, status:row.status, checks:row.checks}, last_error:null, created_at:row.created_at, updated_at:row.created_at, dispatched_at:null});
  return row;
}
async function routexRecordManualCompliance(env, state, actor, body = {}) {
  const assignment = body.assignment_id ? state.assignments.find(item => item.id === body.assignment_id) : null;
  const user = body.user_id ? state.users.find(item => item.id === body.user_id) : null;
  const now = routexNow();
  const row = {
    id:routexId('cmp'),
    user_id:body.user_id || assignment?.contractor_id || null,
    assignment_id:assignment?.id || routexClean(body.assignment_id, 100) || null,
    role:routexClean(body.role || user?.role || 'contractor', 40),
    provider:'0s-gate-manual-compliance-ledger',
    status:routexNormalizeManualComplianceStatus(body.status),
    checks:routexNormalizeChecks(body.checks || body.check_types),
    source:routexClean(body.source || 'manual_public_record_or_government_portal', 120),
    proof_reference:routexClean(body.proof_reference, 240) || null,
    notes:routexClean(body.notes, 1000) || null,
    manual_workflow:{
      operating_state:routexClean(body.operating_state || 'AZ', 24),
      business_mode:routexClean(body.business_mode || 'llc_admin_assist', 80),
      client_of_record:routexClean(body.client_of_record || 'internal_or_client_workspace_business', 160),
      submitted_by:actor.id,
      submitted_by_role:actor.role,
      subject_authorization_recorded:body.subject_authorization_recorded === true || body.subject_authorization_recorded === 'true',
      standalone_disclosure_recorded:body.standalone_disclosure_recorded === true || body.standalone_disclosure_recorded === 'true',
      adjudication_owner:routexClean(body.adjudication_owner || 'client_business_or_internal_employer', 160),
      cra_position:'workflow_admin_and_proof_vault_not_background_report_furnisher',
      government_direct_access_claimed:false
    },
    created_at:now,
    updated_at:now
  };
  state.complianceChecks.unshift(row);
  let media = null;
  if (body.media_base64 || body.proof_body) {
    media = await routexStoreProofMedia(env, state, {complianceCheckId:row.id, mediaBase64:body.media_base64 || '', proofBody:body.proof_body || '', mediaMime:body.media_mime || 'text/plain', mediaExt:body.media_ext || 'txt', context:'manual_compliance_proof'});
    row.proof_media_id = media.id;
  }
  await routexDispatchBackgroundProvider(env, state, row, user);
  state.integrationOutbox.unshift({id:routexId('iox'), provider_kind:'identity_compliance', driver:'0s-gate-compliance-ledger', event_type:'manual_compliance_proof_recorded', entity_type:'compliance_check', entity_id:row.id, status:'pending', attempts:0, payload:{user_id:row.user_id, assignment_id:row.assignment_id, status:row.status, checks:row.checks, source:row.source, provider:row.provider, gate_owned:true}, last_error:null, created_at:now, updated_at:now, dispatched_at:null});
  routexAudit(state, actor, 'manual_compliance_proof_recorded', 'compliance_check', row.id, {user_id:row.user_id, assignment_id:row.assignment_id, status:row.status, checks:row.checks, source:row.source, media_id:media?.id || null});
  return {row, media};
}
function routexNormalizeWorkflowStatus(value, fallback = 'queued') {
  const normalized = String(value || fallback || 'queued').trim().toLowerCase();
  return ['queued','assigned','active','blocked','completed','retry','dead'].includes(normalized) ? normalized : 'queued';
}
function routexDefaultWorkflowStatus(sourceType, row) {
  const status = String(row?.status || '').trim().toLowerCase();
  if (sourceType === 'job_assignment') {
    if (['completed','cancelled_by_contractor','cancelled_by_provider','no_show'].includes(status)) return 'completed';
    if (['on_the_way','checked_in','checked_out','proof_submitted'].includes(status)) return 'active';
    if (status === 'contractor_confirmed') return 'assigned';
    return 'queued';
  }
  if (sourceType === 'route_job') return status === 'completed' ? 'completed' : ['in_progress','active'].includes(status) ? 'active' : 'queued';
  if (sourceType === 'job') return ['filled','closed','completed'].includes(status) ? 'completed' : ['partially_filled','applicant_pool_active'].includes(status) ? 'assigned' : 'queued';
  return 'queued';
}
function routexNormalizeWorkflowState(sourceType, row) {
  const workflow = row?.workflow && typeof row.workflow === 'object' ? row.workflow : {};
  return {
    status:routexNormalizeWorkflowStatus(workflow.status, routexDefaultWorkflowStatus(sourceType, row)),
    owner:routexClean(workflow.owner, 160),
    checkpoint:routexClean(workflow.checkpoint, 240),
    due_at:workflow.due_at || null,
    next_action:routexClean(workflow.next_action, 240),
    notes:routexClean(workflow.notes, 1000),
    updated_at:workflow.updated_at || row?.updated_at || row?.created_at || routexNow()
  };
}
function routexWorkflowSummary(items) {
  const summary = {total:items.length, queued:0, assigned:0, active:0, blocked:0, completed:0, retry:0, dead:0, unassigned:0, job:0, job_assignment:0, route_job:0};
  for (const item of items) {
    const status = routexNormalizeWorkflowStatus(item.workflow?.status, 'queued');
    if (Object.prototype.hasOwnProperty.call(summary, status)) summary[status] += 1;
    if (Object.prototype.hasOwnProperty.call(summary, item.item_type)) summary[item.item_type] += 1;
    if (!item.workflow?.owner) summary.unassigned += 1;
  }
  return summary;
}
function routexWorkflowTimelineSummary(items) {
  const summary = {total:items.length, queued:0, assigned:0, active:0, blocked:0, completed:0, retry:0, dead:0, job:0, job_assignment:0, route_job:0};
  for (const item of items) {
    const status = routexNormalizeWorkflowStatus(item.status, 'queued');
    if (Object.prototype.hasOwnProperty.call(summary, status)) summary[status] += 1;
    if (Object.prototype.hasOwnProperty.call(summary, item.item_type)) summary[item.item_type] += 1;
  }
  return summary;
}
function routexWorkflowItem(state, sourceType, row) {
  const workflow = routexNormalizeWorkflowState(sourceType, row);
  if (sourceType === 'job') return {item_type:sourceType, item_id:row.id, title:row.title, source_status:row.status, market:[row.city, row.state].filter(Boolean).join(', '), priority:row.route_required ? 'route' : 'standard', workflow, updated_at:row.updated_at || row.created_at, created_at:row.created_at, detail:`slots ${row.slots} · pay ${row.pay_amount_cents} · provider ${row.provider_id}`};
  if (sourceType === 'job_assignment') {
    const job = state.jobs.find(item => item.id === row.job_id);
    return {item_type:sourceType, item_id:row.id, title:job?.title || row.job_id, source_status:row.status, market:[job?.city, job?.state].filter(Boolean).join(', '), priority:job?.route_required ? 'route' : 'dispatch', workflow, updated_at:row.updated_at || row.created_at, created_at:row.created_at, detail:`contractor ${row.contractor_id} · job ${row.job_id}`};
  }
  const job = state.jobs.find(item => item.id === row.job_id);
  const stops = state.routeStops.filter(stop => stop.route_job_id === row.id);
  const completedStops = stops.filter(stop => stop.status === 'completed').length;
  return {item_type:sourceType, item_id:row.id, title:job?.title || row.job_id, source_status:row.status, market:[job?.city, job?.state].filter(Boolean).join(', '), priority:'route', workflow, updated_at:row.updated_at || row.created_at, created_at:row.created_at, detail:`${row.mode || 'route'} · stops ${completedStops}/${stops.length} · ${row.pickup_location || job?.location || ''} -> ${row.dropoff_location || 'worksite'}`};
}
function routexCollectWorkflowItems(state) {
  return state.jobs.map(job => routexWorkflowItem(state, 'job', job))
    .concat(state.assignments.map(assignment => routexWorkflowItem(state, 'job_assignment', assignment)))
    .concat(state.routeJobs.map(routeJob => routexWorkflowItem(state, 'route_job', routeJob)))
    .sort((a, b) => Date.parse(b.workflow.updated_at || b.updated_at || 0) - Date.parse(a.workflow.updated_at || a.updated_at || 0));
}
function routexCollectWorkflowTimeline(state, limit = 120) {
  const rows = state.auditEvents
    .filter(event => event.event_type === 'house_command_workflow_updated')
    .slice()
    .map(event => ({
      id:event.id,
      event_type:event.event_type,
      item_type:event.metadata?.item_type || event.entity_type,
      item_id:event.metadata?.item_id || event.entity_id,
      title:event.metadata?.title || '',
      status:routexNormalizeWorkflowStatus(event.metadata?.workflow_status, 'queued'),
      owner:routexClean(event.metadata?.owner, 160),
      checkpoint:routexClean(event.metadata?.checkpoint, 240),
      next_action:routexClean(event.metadata?.next_action, 240),
      notes:routexClean(event.metadata?.notes, 1000),
      detail:routexClean(event.metadata?.detail, 1000),
      created_at:event.created_at
    }));
  return {summary:routexWorkflowTimelineSummary(rows), items:rows.slice(0, limit)};
}
function routexIntegrationList(env) {
  const kvMode = routexStorageMode(env);
  const config = routexProviderConfig(env);
  const storageConnected = routexProviderConnected(config, 'storage');
  const paymentConnected = routexProviderConnected(config, 'payment');
  const notificationConnected = routexProviderConnected(config, 'notification');
  const routeConnected = routexProviderConnected(config, 'route');
  const complianceConnected = routexProviderConnected(config, 'compliance');
  return [
    {name:'database', status:kvMode === 'kv' ? 'connected' : 'not_configured', driver:kvMode === 'kv' ? 'worker-kv-document' : 'none', note:kvMode === 'kv' ? '0S Worker KV document is the mounted RouteX system record.' : 'Configure SKYEROUTEX_KV, ROUTEX_KV, or SITE_EVENTS_KV.'},
    {name:'proof_storage', status:storageConnected ? 'connected' : (kvMode === 'kv' ? 'worker-kv-fallback' : 'not_configured'), driver:storageConnected ? config.storage.driver : (kvMode === 'kv' ? 'worker-kv-proof-ledger' : 'none'), note:storageConnected ? `Proof media/export objects write to ${config.storage.driver}.` : 'Proof media and export packet metadata persist in the RouteX KV state document.'},
    {name:'payment_provider', status:paymentConnected ? 'connected' : 'ledger-only', driver:paymentConnected ? config.payment.driver : '0s-gate-payment-ledger', note:paymentConnected ? `Payment provider dispatch is enabled through ${config.payment.driver}; the 0S/SkyGate ledger remains authoritative.` : 'Payment state is authoritative in the 0S/SkyGate ledger; external money movement remains a SkyPay/provider integration boundary.'},
    {name:'notification_provider', status:notificationConnected ? 'connected' : 'gate-ledger', driver:notificationConnected ? config.notification.driver : '0s-gate-notification-ledger', note:notificationConnected ? `Notification provider ${config.notification.driver} is ready; recipients are resolved from gate-owned user profiles with SMS consent.` : 'Notifications are persisted in the 0S/SkyGate-owned notification ledger; external SMS dispatch requires a provider plus per-recipient phone and consent.'},
    {name:'route_intelligence', status:routeConnected ? 'connected' : 'local-proof', driver:routeConnected ? config.route.driver : '0s-worker-route-structure', note:routeConnected ? 'Route stops can call live Mapbox geocoding/directions.' : 'Route stop planning is deterministic in Worker state; live maps/ETA require provider credentials.'},
    {name:'identity_compliance', status:complianceConnected ? 'connected' : 'gate-compliance-ledger', driver:complianceConnected ? config.compliance.driver : '0s-gate-compliance-ledger', note:config.compliance.driver === 'manual-government-check' ? 'Shared gate identity plus gate-owned manual compliance proof records; no separate RouteX password lane.' : `Background/compliance dispatch is enabled through ${config.compliance.driver}.`},
    {name:'0s_runtime', status:'queued', driver:'0s-skygate-platform-events', note:'Audit/runtime events are mirrored through the shared gate event lane and the Worker integration outbox.'}
  ];
}
async function routexGateMirrorEvents(env, limit = 50) {
  const adminPassword = paidLaneFs27AdminPassword(env);
  if (!adminPassword) return {ok:false, skipped:true, reason:'fs27_admin_secret_not_configured', events:[]};
  const mirrorPath = `/admin/platform-routex-events?limit=${Math.max(1, Math.min(200, Number(limit) || 50))}`;
  const origin = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev';
  const usesServiceBinding = Boolean(env.SKYGATEFS27_WORKER?.fetch);
  const requestUrl = usesServiceBinding ? `service-binding:${mirrorPath}` : `${origin}${mirrorPath}`;
  const mirrorInit = {
    method:'GET',
    headers:{'x-admin-password':adminPassword}
  };
  const mirrorRequest = usesServiceBinding ? skygateRequest(env, mirrorPath, mirrorInit) : fetch(`${origin}${mirrorPath}`, mirrorInit);
  const response = await Promise.race([
    mirrorRequest,
    new Promise(resolve => setTimeout(() => resolve(null), 12000))
  ]);
  if (!response) return {ok:false, skipped:true, reason:'fs27_platform_events_timeout', request_url:requestUrl, events:[]};
  const text = await response.text().catch(() => '');
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {
    data = {ok:false, error:'invalid_fs27_platform_events_response'};
  }
  const debug = {
    request_url:requestUrl,
    content_type:response.headers.get('content-type') || '',
    body_preview:text.slice(0, 180)
  };
  if (!response.ok) return {ok:false, status:response.status, error:data.error || 'fs27_platform_events_unavailable', ...debug, events:[]};
  if (data?.ok === false && data.error) return {ok:false, status:response.status, error:data.error, ...debug, events:[]};
  const events = (data.events || []).filter(event => {
    const meta = event.meta || {};
    return String(event.type || event.action || meta.type || '').startsWith('skyeroutex.')
      || String(meta.routex_event_type || '').trim()
      || String(meta.source_app || '').trim() === 'metraiyux-0s';
  }).slice(0, limit);
  return {ok:true, summary:data.summary || null, request_url:requestUrl, events};
}
function routexFeatureReadiness(env, state) {
  const config = routexProviderConfig(env);
  const integrationRows = Object.fromEntries(routexIntegrationList(env).map(row => [row.name, row]));
  const hasGate = routexSharedAuthEnabled(env);
  const hasKv = routexStorageMode(env) === 'kv';
  const usersWithPhone = state.users.filter(user => routexPhone(user.phone || user.phone_number)).length;
  const smsOptedIn = state.users.filter(user => routexConsentFlag(user.sms_opt_in ?? user.smsOptIn ?? user.sms_consent ?? user.smsConsent)).length;
  return [
    {
      id:'shared_gate_auth',
      label:'Shared Free99/SkyGate login',
      status:hasGate ? 'ready' : 'blocked',
      works_now:hasGate,
      works_without_full_onboarding:false,
      requires:['Active 0S/Free99/SkyGate session', 'RouteX role resolved from gate claims or gate-staged profile'],
      if_missing:'Users cannot enter RouteX. Do not add RouteX-local passwords; fix the shared gate session.'
    },
    {
      id:'job_board_assignment',
      label:'Job board, applicants, assignments, House Command override',
      status:hasGate && hasKv ? 'ready' : 'blocked',
      works_now:hasGate && hasKv,
      works_without_full_onboarding:true,
      requires:['Gate session', '0S Worker KV state document', 'Provider and contractor profiles staged through the gate'],
      if_missing:'The UI can load, but job mutations and contractor workflows will fail until the gate session and KV state are available.'
    },
    {
      id:'payment_dispatch',
      label:'Payments and payout state',
      status:routexProviderConnected(config, 'payment') ? 'provider-connected' : 'ledger-only',
      works_now:true,
      works_without_full_onboarding:!routexProviderConnected(config, 'payment'),
      requires:['Stripe or SkyPay provider credentials for external dispatch', 'Owner-approved business settlement rules before real money movement'],
      if_missing:'Payment state stays in the gate-owned ledger. Real provider dispatch, capture, refund, or payout workflows will not execute.'
    },
    {
      id:'sms_notifications',
      label:'Notifications and SMS',
      status:routexProviderConnected(config, 'notification') ? (usersWithPhone && smsOptedIn ? 'provider-connected' : 'provider-ready-needs-recipient-onboarding') : 'gate-ledger-only',
      works_now:true,
      works_without_full_onboarding:true,
      requires:['Twilio account SID/auth token/from number for external SMS', 'Gate-owned recipient phone', 'Gate-owned SMS opt-in consent'],
      if_missing:'Notifications are stored in the 0S/SkyGate notification ledger. Real SMS does not send until the recipient profile has phone plus consent.'
    },
    {
      id:'route_intelligence',
      label:'Route intelligence and ETA',
      status:routexProviderConnected(config, 'route') ? 'provider-connected' : 'local-route-structure',
      works_now:true,
      works_without_full_onboarding:!routexProviderConnected(config, 'route'),
      requires:['Mapbox token for live geocoding/directions'],
      if_missing:'Route jobs and stops still work. Live maps, distance, and ETA enrichment do not run.'
    },
    {
      id:'proof_storage',
      label:'Proof media and export packets',
      status:routexProviderConnected(config, 'storage') ? 'provider-connected' : (hasKv ? 'worker-kv-fallback' : 'blocked'),
      works_now:hasKv || routexProviderConnected(config, 'storage'),
      works_without_full_onboarding:!routexProviderConnected(config, 'storage'),
      requires:['R2/S3 object storage credentials for durable media/export storage'],
      if_missing:'Proof metadata can stay in KV when KV is present. Durable object media/export storage will not execute.'
    },
    {
      id:'background_checks',
      label:'Background/compliance provider dispatch',
      status:routexProviderConnected(config, 'compliance') ? 'provider-connected' : 'gate-compliance-ledger',
      works_now:true,
      works_without_full_onboarding:!routexProviderConnected(config, 'compliance'),
      requires:['Checkr package/key, Certn token/owner, or signed background-check webhook endpoint'],
      if_missing:'Shared gate identity and manual compliance proof records work. External background-check ordering does not execute.'
    },
    {
      id:'gate_event_mirror',
      label:'Gate event mirror',
      status:(skygateOrigin(env) || env.SKYGATEFS27_WORKER?.fetch) && mirrorSecret(env) ? 'ready' : 'outbox-only',
      works_now:true,
      works_without_full_onboarding:!mirrorSecret(env),
      requires:['SkyGate service binding/origin', 'SkyGate event mirror secret'],
      if_missing:'RouteX audit/runtime rows remain in the Worker outbox. FS27 platform-event visibility will not update.'
    }
  ].map(item => ({...item, integration:integrationRows[item.id] || null}));
}
async function routexGateDashboardPayload(env, state, actor = null) {
  const integrations = routexIntegrationList(env);
  const features = routexFeatureReadiness(env, state);
  const users = state.users.map(routexPublicUser);
  const providers = users.filter(user => user.role === 'provider');
  const contractors = users.filter(user => user.role === 'contractor' || user.role === 'crew');
  const usersWithPhone = users.filter(user => routexPhone(user.phone || user.phone_number));
  const smsOptedIn = users.filter(user => routexConsentFlag(user.sms_opt_in ?? user.smsOptIn ?? user.sms_consent ?? user.smsConsent));
  const gateMirrors = await routexGateMirrorEvents(env, 60);
  const appRoot = '/SkyeRouteX/workforce-command-v0.4.0/public/';
  const readinessPath = `${appRoot}gate-readiness.html`;
  return {
    ok:true,
    generated_at:routexNow(),
    app:{id:'skyeroutex', name:'SkyeRouteX Workforce Command', api_base:ROUTEX_BASE, app_root:appRoot, readiness_path:readinessPath},
    actor:actor ? {id:actor.id, email:actor.email, role:actor.role, name:actor.name} : null,
    auth_contract:{
      owner:'FS27/SkyGate/Free99',
      routex_local_passwords_allowed:false,
      accepted_headers:['Authorization','x-admin-token','x-free99-admin-code','x-free99-gate-session','x-skye-gate-session','x-skygate-session','cookies','/api/owner/admin-login'],
      worker_helpers:['enforceZeroOsGate','requireGateAuth','requireOperatorAuth','shared owner-admin session helpers'],
      staged_profile_endpoint:'/api/routex/admin/gate-users',
      note:'RouteX stores app-specific role/profile metadata only after the shared gate authorizes the user. The app does not issue a separate client/admin password.'
    },
    links:[
      {label:'RouteX product console', href:appRoot},
      {label:'RouteX readiness dashboard', href:readinessPath},
      {label:'0S owner login for RouteX readiness', href:`/admin/login.html?return=${encodeURIComponent(readinessPath)}`},
      {label:'FS27 RouteX gate folder', href:'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/apps/skyeroutex/'},
      {label:'FS27 RouteX mirror events JSON', href:'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/admin/platform-routex-events'},
      {label:'FS27 platform events JSON', href:'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/admin/platform-events?app_id=metraiyux-0s'},
      {label:'RouteX gate-owned profiles JSON', href:'/api/routex/admin/users'},
      {label:'RouteX integrations JSON', href:'/api/routex/integrations/status'},
      {label:'RouteX notification/compliance outbox JSON', href:'/api/routex/integrations/outbox'},
      {label:'RouteX runtime events JSON', href:'/api/routex/runtime/events'},
      {label:'RouteX compliance checks JSON', href:'/api/routex/compliance/checks'},
      {label:'RouteX storage status JSON', href:'/api/routex/storage/status'}
    ],
    counts:{
      users:users.length,
      providers:providers.length,
      contractors:contractors.length,
      users_with_phone:usersWithPhone.length,
      sms_opted_in:smsOptedIn.length,
      jobs:state.jobs.length,
      assignments:state.assignments.length,
      notifications:state.notifications.length,
      notifications_external_sent:state.notifications.filter(item => item.external_message_id || item.external_provider_id).length,
      compliance_checks:state.complianceChecks.length,
      runtime_events:state.runtimeEvents.length,
      integration_outbox:state.integrationOutbox.length,
      gate_mirror_events:gateMirrors.events.length
    },
    feature_readiness:features,
    onboarding_matrix:[
      {lane:'Owner/operator', must_have:['0S owner session','admin or house_command RouteX role'], unlocks:['Gate dashboard','staged provider/contractor profiles','manual compliance proof','outbox and event review']},
      {lane:'Provider workspace', must_have:['Gate-staged provider profile','company_name','market/job details'], unlocks:['Post jobs','review applicants','approve work','payment state changes']},
      {lane:'Contractor/crew workspace', must_have:['Gate-staged contractor or crew profile','skills/transportation/reliability profile'], unlocks:['Browse jobs','apply','accept assignments','submit proof']},
      {lane:'SMS notifications', must_have:['Twilio sender configured','recipient phone in gate profile','sms_opt_in true'], unlocks:['External SMS dispatch'], without_it:'Gate notification ledger still records the message.'},
      {lane:'Background checks', must_have:['Checkr, Certn, or signed background webhook configured','subject authorization/disclosure records'], unlocks:['External background-check dispatch'], without_it:'Gate compliance ledger and manual proof records remain available.'},
      {lane:'Proof media/export', must_have:['R2/S3 credentials for external object storage'], unlocks:['Durable proof media and export packets'], without_it:'KV ledger fallback stores metadata when KV is present.'}
    ],
    integrations,
    gate_mirror:gateMirrors,
    recent:{
      users:users.slice(0, 40),
      notifications:state.notifications.slice(0, 80),
      compliance_checks:state.complianceChecks.slice(0, 80),
      runtime_events:state.runtimeEvents.slice(0, 80),
      outbox:state.integrationOutbox.slice(0, 80)
    }
  };
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
  const workflowBoard = routexCollectWorkflowItems(state);
  const workflowTimeline = routexCollectWorkflowTimeline(state, 25);
  return {
    ...appHealth(APP_API_MOUNTS.find(mount => mount.id === 'skyeroutex'), env),
    ok:true,
    mounted:true,
    app:'SkyeRouteX Workforce Command',
    version:'0.4.0-0s-worker-parity',
    workforce_api_base:ROUTEX_BASE,
    aliases:ROUTEX_ALIASES,
    auth_mode: routexSharedAuthEnabled(env) ? 'skygate-shared-lane' : 'legacy-local-sessions',
    storage_mode:routexStorageMode(env),
    jobs_open:state.jobs.filter(job => !['completed','closed'].includes(job.status)).length,
    assignments_open:state.assignments.filter(assignment => !ROUTEX_ASSIGNMENT_CLOSED.includes(assignment.status)).length,
    routes_open:state.routeJobs.filter(route => route.status !== 'completed').length,
    sessions_active:state.sessions.filter(session => session.expiresAt > routexNow()).length,
    workflow_board:routexWorkflowSummary(workflowBoard),
    workflow_timeline:workflowTimeline.summary.total > 0 ? workflowTimeline.summary : routexWorkflowSummary(workflowBoard),
    workflow_timeline_source:workflowTimeline.summary.total > 0 ? 'audit_events' : 'workflow_board_fallback'
  };
}
function routexReadQuery(url) {
  return Object.fromEntries(url.searchParams.entries());
}
async function routexExportPacket(env, state, job, actor) {
  const applications = state.applications.filter(item => item.job_id === job.id);
  const assignments = state.assignments.filter(item => item.job_id === job.id).map(item => routexAssignmentEnvelope(state, item));
  const assignmentIds = assignments.map(item => item.id);
  const proofItems = state.proofItems.filter(item => assignmentIds.includes(item.assignment_id));
  const proofMedia = state.proofMedia.filter(item => proofItems.some(proof => proof.media_id === item.id || proof.id === item.proof_id));
  const routeJobs = state.routeJobs.filter(item => item.job_id === job.id).map(route => ({...route, stops:state.routeStops.filter(stop => stop.route_job_id === route.id)}));
  const relatedAuditEvents = state.auditEvents.filter(item => item.metadata?.job_id === job.id || item.entity_id === job.id || applications.some(application => application.id === item.entity_id) || assignments.some(assignment => assignment.id === item.entity_id) || proofItems.some(proof => proof.id === item.entity_id));
  const relatedRuntimeEvents = state.runtimeEvents.filter(item => item.metadata?.job_id === job.id || item.entity_id === job.id || applications.some(application => application.id === item.entity_id) || assignments.some(assignment => assignment.id === item.entity_id) || proofItems.some(proof => proof.id === item.entity_id));
  const relatedComplianceChecks = state.complianceChecks.filter(item => assignmentIds.includes(item.assignment_id) || assignments.some(assignment => assignment.contractor_id === item.user_id) || item.user_id === job.provider_id);
  const packet = {
    packet_type:'job_proof_packet',
    version:'0.4.0-0s-worker-parity',
    generated_at:routexNow(),
    generated_by:actor.id,
    job,
    applications,
    assignments,
    proof_items:proofItems,
    proof_media:proofMedia,
    route_jobs:routeJobs,
    payments:routexJobPayments(state, job.id),
    disputes:state.disputes.filter(item => item.job_id === job.id),
    ratings:state.ratings.filter(item => item.job_id === job.id),
    notifications:state.notifications.filter(item => [job.provider_id, ...assignments.map(assignment => assignment.contractor_id)].includes(item.user_id)),
    compliance_checks:relatedComplianceChecks,
    audit_events:relatedAuditEvents,
    runtime_events:relatedRuntimeEvents
  };
  const serialized = JSON.stringify(packet);
  const exportRow = {id:routexId('exp'), type:'job_packet', entity_id:job.id, job_id:job.id, path:`kv://skyeroutex/exports/JOB_PACKET_${job.id}_${Date.now()}.json`, sha256:await routexSha256(serialized), byte_size:new TextEncoder().encode(serialized).length, created_by:actor.id, created_at:routexNow()};
  const put = await routexWriteExportObject(env, state, `JOB_PACKET_${job.id}_${Date.now()}.json`, packet);
  if (put) Object.assign(exportRow, {path:put.storage_path, object_key:put.object_key, bucket:put.bucket, storage_driver:put.driver, sha256:put.sha256, byte_size:put.byte_size, external_storage_status:'stored'});
  else exportRow.external_storage_status = routexProviderConfig(env).storage.configured ? 'failed_or_fallback' : 'worker_kv_ledger_only';
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
  if (path === '/manifest' || path === '/routes/manifest') return routexJson({ok:true, base:ROUTEX_BASE, aliases:ROUTEX_ALIASES, route_families:ROUTEX_ROUTE_FAMILIES, storage_mode:routexStorageMode(env), version:'0.4.0-0s-worker-parity', rules:['RouteX browser/runtime calls must use /api/routex/{route}.','Mounted production auth is shared FS27/SkyGate/Free99; app-local signup/login stay disabled when the shared gate is configured.','House Command, AE workflow, provider roster/block, compliance, integration outbox, storage/export, runtime event, and market-report routes are mounted under /api/routex.','Legacy root /api/auth, /api/jobs, /api/assignments, /api/markets, and /api/ratings return api_root_collision.','/api/skyeroutex remains a compatibility alias only.']});
  if (method !== 'GET' && !routexKv(env)) return routexStorageRequired();

  const body = method === 'GET' ? {} : await readJson(request);
  const params = routexReadQuery(url);
  const initialAuditCount = state.auditEvents.length;
  let response = null;
  let persist = false;
  const sharedGate = routexSharedAuthEnabled(env);

  if (method === 'POST' && path === '/auth/signup') {
    if (sharedGate) response = routexJson({ok:false, productionGate:true, sharedAuth:true, error:'Production SkyeRouteX sessions must come from FS27/SkyGate. App-local signup is disabled on the mounted 0S route.'}, 503);
    else {
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
	      routexEnsureUser(state, user);
	      routexRecordUserCompliance(state, user.id, role);
	      routexAudit(state, user, 'signup', 'user', user.id, {role});
      response = routexJson({ok:true, id:user.id, email:user.email, role:user.role, user:routexPublicUser(user)}, 201);
      persist = true;
    }
    }
  }
  else if (method === 'POST' && path === '/auth/login') {
    if (sharedGate) response = routexJson({ok:false, productionGate:true, sharedAuth:true, error:'Production SkyeRouteX sessions must come from FS27/SkyGate. App-local login is disabled on the mounted 0S route.'}, 503);
    else {
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
  }
  else if (method === 'POST' && path === '/auth/logout') {
    if (sharedGate) response = routexJson({ok:true, cleared:true, productionGate:true, sharedAuth:true, localSessions:false});
    else {
      const sessionId = routexSessionId(request);
      const before = state.sessions.length;
      state.sessions = state.sessions.filter(item => item.id !== sessionId);
      routexAudit(state, sessionId || null, 'logout', 'session', sessionId || 'none', {removed:before - state.sessions.length});
      response = routexJson({ok:true, removed:before - state.sessions.length});
      persist = true;
    }
  }
  else if (method === 'GET' && path === '/me') {
    const auth = await routexRequireUser(request, env, state);
    response = auth.ok ? routexJson({ok:true, user:auth.user}) : auth.response;
  }

  if (!response && method === 'POST' && path === '/markets') {
    const auth = await routexRequireUser(request, env, state, ['admin','house_command','ae']);
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
    const auth = await routexRequireUser(request, env, state);
    response = auth.ok ? routexJson({ok:true, markets:state.markets}) : auth.response;
  }

  if (!response && method === 'POST' && path === '/jobs') {
    const auth = await routexRequireUser(request, env, state, ['provider','admin','house_command','ae']);
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
        let route = null;
        if (job.route_required) {
          route = routexCreateRouteJob(state, job, body);
          await routexEnrichRouteProvider(env, state, route, job, Array.isArray(body.route_stops) ? body.route_stops : []);
        }
        const payment = {id:routexId('pay'), job_id:job.id, assignment_id:null, provider_id:job.provider_id, contractor_id:null, amount_cents:pay, status:'authorized', reason:'Job payment authorization recorded.', created_at:routexNow(), updated_at:routexNow()};
        state.payments.unshift(payment);
        await routexAuthorizePaymentProvider(env, state, payment, job, 'job_payment_authorized');
        routexAudit(state, auth.user, 'job_created', 'job', job.id, {market_id:market.id, route_required:job.route_required});
        response = routexJson({ok:true, job, route, payment}, 201);
        persist = true;
      }
    }
  }
  else if (!response && method === 'GET' && path === '/jobs') {
    const auth = await routexRequireUser(request, env, state);
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
    const auth = await routexRequireUser(request, env, state);
    const job = state.jobs.find(item => item.id === match.id);
    response = !auth.ok ? auth.response : job ? routexJson({ok:true, job}) : routexJson({ok:false, error:'Job not found.'}, 404);
  }
  else if (!response && method === 'POST' && (match = routexMatch(path, '/jobs/:id/apply'))) {
    const auth = await routexRequireUser(request, env, state, ['contractor','crew']);
    if (!auth.ok) response = auth.response;
    else {
	      const job = state.jobs.find(item => item.id === match.id);
	      if (!job) response = routexJson({ok:false, error:'Job not found.'}, 404);
	      else if (!['open','applicant_pool_active','partially_filled'].includes(job.status)) response = routexJson({ok:false, error:`Job is ${job.status}; applications are closed.`}, 400);
	      else if (state.providerBlocks.some(item => item.provider_id === job.provider_id && item.contractor_id === auth.user.id)) response = routexJson({ok:false, error:'Provider has blocked this contractor.'}, 403);
	      else if (job.acceptance_mode === 'roster_only' && !state.providerRosters.some(item => item.provider_id === job.provider_id && item.contractor_id === auth.user.id)) response = routexJson({ok:false, error:'This is a roster-only job.'}, 403);
	      else if (state.assignments.some(item => item.job_id === job.id && item.contractor_id === auth.user.id && !ROUTEX_ASSIGNMENT_CLOSED.includes(item.status))) response = routexJson({ok:false, error:'Already assigned to this job.'}, 409);
	      else if (state.applications.some(item => item.job_id === job.id && item.contractor_id === auth.user.id)) response = routexJson({ok:false, error:'Already applied.'}, 409);
	      else {
	        const application = {id:routexId('app'), job_id:job.id, contractor_id:auth.user.id, note:routexClean(body.note, 1000), status:'applied', created_at:routexNow(), updated_at:routexNow()};
	        state.applications.unshift(application);
	        if (job.status === 'open') job.status = 'applicant_pool_active';
	        job.updated_at = routexNow();
	        const notification = routexNotify(state, job.provider_id, 'New applicant', `${auth.user.name || auth.user.email || auth.user.id} applied to ${job.title}.`);
	        await routexDispatchNotificationProvider(env, state, notification);
	        routexAudit(state, auth.user, 'job_applied', 'job_application', application.id, {job_id:job.id});
	        response = routexJson({ok:true, application}, 201);
	        persist = true;
      }
    }
  }
  else if (!response && method === 'GET' && (match = routexMatch(path, '/jobs/:id/applicants'))) {
    const auth = await routexRequireUser(request, env, state);
    const job = state.jobs.find(item => item.id === match.id);
    if (!auth.ok) response = auth.response;
    else if (!job) response = routexJson({ok:false, error:'Job not found.'}, 404);
    else if (!routexCanSeeJob(auth.user, job)) response = routexJson({ok:false, error:'Not allowed to view this applicant pool.'}, 403);
    else response = routexJson({ok:true, job, applicants:state.applications.filter(item => item.job_id === job.id).map(item => ({...item, user:routexPublicUser(state.users.find(user => user.id === item.contractor_id))}))});
  }
  else if (!response && method === 'POST' && (match = routexMatch(path, '/jobs/:id/accept-applicant'))) {
    const auth = await routexRequireUser(request, env, state);
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
	        const payment = routexSetAssignmentPayment(state, assignment, 'authorized', 'Assignment accepted; work pending.');
	        await routexAuthorizePaymentProvider(env, state, payment, job, 'assignment_payment_authorized');
	        const compliance = routexRecordAssignmentCompliance(state, assignment);
	        await routexDispatchBackgroundProvider(env, state, compliance, state.users.find(user => user.id === assignment.contractor_id));
	        const notification = routexNotify(state, application.contractor_id, 'Application accepted', `You were accepted for ${job.title}. Confirm the assignment.`);
	        await routexDispatchNotificationProvider(env, state, notification);
	        routexAudit(state, auth.user, 'applicant_accepted', 'job_assignment', assignment.id, {job_id:job.id, contractor_id:application.contractor_id});
	        response = routexJson({ok:true, assignment, job}, 201);
	        persist = true;
	      }
	    }
	  }
	  else if (!response && method === 'POST' && (match = routexMatch(path, '/jobs/:id/reject-applicant'))) {
	    const auth = await routexRequireUser(request, env, state);
	    if (!auth.ok) response = auth.response;
	    else {
	      const job = state.jobs.find(item => item.id === match.id);
	      const application = state.applications.find(item => item.id === body.application_id && item.job_id === match.id);
	      const nextStatus = routexClean(body.status || 'rejected', 40);
	      if (!job) response = routexJson({ok:false, error:'Job not found.'}, 404);
	      else if (!routexCanSeeJob(auth.user, job)) response = routexJson({ok:false, error:'Not allowed.'}, 403);
	      else if (!application) response = routexJson({ok:false, error:'Application not found.'}, 404);
	      else if (!['rejected','withdrawn'].includes(nextStatus)) response = routexJson({ok:false, error:'Invalid application rejection status.'}, 400);
	      else if (application.status === 'accepted') response = routexJson({ok:false, error:'Accepted applications cannot be rejected.'}, 400);
	      else {
	        application.status = nextStatus;
	        application.updated_at = routexNow();
	        routexAudit(state, auth.user, `applicant_${application.status}`, 'job_application', application.id, {job_id:job.id});
	        response = routexJson({ok:true, application});
	        persist = true;
	      }
	    }
	  }
  else if (!response && method === 'GET' && (match = routexMatch(path, '/jobs/:id/export-packet'))) {
    const auth = await routexRequireUser(request, env, state);
    const job = state.jobs.find(item => item.id === match.id);
    if (!auth.ok) response = auth.response;
    else if (!job) response = routexJson({ok:false, error:'Job not found.'}, 404);
    else if (!routexCanSeeJob(auth.user, job) && !state.assignments.some(item => item.job_id === job.id && item.contractor_id === auth.user.id)) response = routexJson({ok:false, error:'Not allowed to export this job packet.'}, 403);
    else {
      const exported = await routexExportPacket(env, state, job, auth.user);
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
    const auth = await routexRequireUser(request, env, state);
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
      const auth = await routexRequireUser(request, env, state);
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
    const auth = await routexRequireUser(request, env, state);
    const assignment = state.assignments.find(item => item.id === match.id);
    const job = assignment ? state.jobs.find(item => item.id === assignment.job_id) : null;
    if (!auth.ok) response = auth.response;
    else if (!assignment || !job) response = routexJson({ok:false, error:'Assignment not found.'}, 404);
    else if (assignment.contractor_id !== auth.user.id && !['admin','house_command'].includes(auth.user.role)) response = routexJson({ok:false, error:'Only assigned contractor or operator can submit proof.'}, 403);
    else if (!body.proof_type || !body.body) response = routexJson({ok:false, error:'proof_type and body are required.'}, 400);
    else {
      const proof = {id:routexId('prf'), assignment_id:assignment.id, proof_type:routexClean(body.proof_type, 80), body:routexClean(body.body, 2000), media_required:Boolean(body.media_base64), created_at:routexNow()};
      if (body.media_base64) {
        const media = await routexStoreProofMedia(env, state, {assignmentId:assignment.id, proofId:proof.id, mediaBase64:body.media_base64, mediaMime:body.media_mime || 'text/plain', mediaExt:body.media_ext || 'txt', context:'proof_media'});
        proof.media_id = media.id;
        proof.media_size_bytes = media.byte_size;
      }
      state.proofItems.unshift(proof);
      assignment.status = 'proof_submitted';
      assignment.updated_at = routexNow();
      const payment = routexSetAssignmentPayment(state, assignment, 'approval_pending', 'Proof submitted; provider approval pending.');
      await routexAuthorizePaymentProvider(env, state, payment, job, 'assignment_proof_payment_pending');
      routexAudit(state, auth.user, 'proof_submitted', 'proof_item', proof.id, {assignment_id:assignment.id, media_id:proof.media_id || null});
      response = routexJson({ok:true, proof, media:proof.media_id ? state.proofMedia.find(item => item.id === proof.media_id) : null, payment}, 201);
      persist = true;
    }
  }
	  else if (!response && method === 'POST' && (match = routexMatch(path, '/assignments/:id/approve'))) {
	    const auth = await routexRequireUser(request, env, state);
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
      await routexAuthorizePaymentProvider(env, state, payment, job, 'assignment_payment_payout_eligible');
      routexAudit(state, auth.user, 'assignment_approved', 'job_assignment', assignment.id, {payment_status:payment.status});
      response = routexJson({ok:true, assignment, payment});
	      persist = true;
	    }
	  }
	  else if (!response && method === 'POST' && (match = routexMatch(path, '/assignments/:id/dispute'))) {
	    const auth = await routexRequireUser(request, env, state);
	    const assignment = state.assignments.find(item => item.id === match.id);
	    const job = assignment ? state.jobs.find(item => item.id === assignment.job_id) : null;
	    if (!auth.ok) response = auth.response;
	    else if (!assignment || !job) response = routexJson({ok:false, error:'Assignment not found.'}, 404);
	    else if (![assignment.contractor_id, job.provider_id].includes(auth.user.id) && !['admin','house_command'].includes(auth.user.role)) response = routexJson({ok:false, error:'Not allowed.'}, 403);
	    else {
	      const dispute = {id:routexId('dis'), job_id:job.id, assignment_id:assignment.id, opened_by:auth.user.id, type:routexClean(body.type || 'general', 80), body:routexClean(body.body || 'Dispute opened.', 2000), status:'open', resolution:null, created_at:routexNow(), updated_at:routexNow()};
	      state.disputes.unshift(dispute);
	      const payment = routexSetAssignmentPayment(state, assignment, 'held', 'Dispute opened; payment held.');
	      routexAudit(state, auth.user, 'dispute_opened', 'dispute', dispute.id, {assignment_id:assignment.id});
	      response = routexJson({ok:true, dispute, payment}, 201);
	      persist = true;
	    }
	  }

	  if (!response && method === 'GET' && path === '/route-jobs') {
    const auth = await routexRequireUser(request, env, state);
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
    const auth = await routexRequireUser(request, env, state);
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
    const auth = await routexRequireUser(request, env, state);
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
    const auth = await routexRequireUser(request, env, state);
    if (!auth.ok) response = auth.response;
    else {
      let ratings = state.ratings;
      if (!['admin','house_command'].includes(auth.user.role)) ratings = ratings.filter(item => item.from_user_id === auth.user.id || item.to_user_id === auth.user.id);
      response = routexJson({ok:true, ratings});
    }
  }

  if (!response && method === 'GET' && path === '/payments/ledger') {
    const auth = await routexRequireUser(request, env, state);
    if (!auth.ok) response = auth.response;
    else {
      let payments = state.payments;
      if (auth.user.role === 'provider') payments = payments.filter(item => item.provider_id === auth.user.id);
      else if (!['admin','house_command'].includes(auth.user.role)) payments = payments.filter(item => item.contractor_id === auth.user.id);
      response = routexJson({ok:true, payments});
    }
  }
  else if (!response && method === 'POST' && (match = routexMatch(path, '/payments/:id/provider-status'))) {
    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
    const payment = state.payments.find(item => item.id === match.id);
    if (!auth.ok) response = auth.response;
    else if (!payment) response = routexJson({ok:false, error:'Payment not found.'}, 404);
    else {
      const receipt = await routexRetrieveStripePayment(env, state, payment);
      routexAudit(state, auth.user, 'payment_provider_status_checked', 'payment_ledger', payment.id, {ok:receipt.ok, stripe_status:receipt.receipt?.status || null});
      response = routexJson({ok:receipt.ok, ...receipt}, receipt.ok ? 200 : (receipt.error === 'payment_has_no_stripe_payment_intent' ? 409 : 502));
      persist = true;
    }
  }
  else if (!response && method === 'POST' && (match = routexMatch(path, '/payments/:id/capture'))) {
    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
    const payment = state.payments.find(item => item.id === match.id);
    if (!auth.ok) response = auth.response;
    else if (!payment) response = routexJson({ok:false, error:'Payment not found.'}, 404);
    else {
      const capture = await routexCaptureStripePayment(env, state, payment, Number(body.amount_to_capture || 0) > 0 ? Number(body.amount_to_capture) : null);
      routexAudit(state, auth.user, capture.ok ? 'payment_provider_captured' : 'payment_provider_capture_blocked', 'payment_ledger', payment.id, {ok:capture.ok, stripe_status:capture.receipt?.status || null, error:capture.error || null});
      response = routexJson({ok:capture.ok, ...capture}, capture.ok ? 200 : (capture.capture_ready === false ? 409 : 502));
      persist = true;
    }
  }
		  else if (!response && method === 'GET' && path === '/provider/jobs') {
	    const auth = await routexRequireUser(request, env, state, ['provider','admin','house_command','ae']);
	    if (!auth.ok) response = auth.response;
	    else {
      let jobs = state.jobs;
      if (auth.user.role === 'provider') jobs = jobs.filter(job => job.provider_id === auth.user.id);
      jobs = jobs.map(job => ({...job, applicant_count:state.applications.filter(item => item.job_id === job.id).length, assignment_count:state.assignments.filter(item => item.job_id === job.id).length, payments:routexJobPayments(state, job.id)}));
	      response = routexJson({ok:true, jobs});
	    }
	  }
	  else if (!response && method === 'POST' && path === '/provider/roster') {
	    const auth = await routexRequireUser(request, env, state, ['provider','admin','house_command']);
	    if (!auth.ok) response = auth.response;
	    else {
	      const providerId = auth.user.role === 'provider' ? auth.user.id : routexClean(body.provider_id || auth.user.id, 120);
	      const contractorId = routexClean(body.contractor_id, 120);
	      const knownContractor = state.users.some(user => user.id === contractorId && ['contractor','crew'].includes(user.role))
	        || state.applications.some(item => item.contractor_id === contractorId)
	        || state.assignments.some(item => item.contractor_id === contractorId);
	      if (!contractorId) response = routexJson({ok:false, error:'contractor_id is required.'}, 400);
	      else if (!knownContractor) response = routexJson({ok:false, error:'Contractor or crew user not found.'}, 404);
	      else {
	        let roster = state.providerRosters.find(item => item.provider_id === providerId && item.contractor_id === contractorId);
	        if (!roster) {
	          roster = {id:routexId('ros'), provider_id:providerId, contractor_id:contractorId, created_at:routexNow()};
	          state.providerRosters.unshift(roster);
	          routexAudit(state, auth.user, 'contractor_rostered', 'provider_roster', roster.id, roster);
	          persist = true;
	        }
	        response = routexJson({ok:true, roster, already_exists:!persist}, persist ? 201 : 200);
	      }
	    }
	  }
	  else if (!response && method === 'POST' && path === '/provider/block') {
	    const auth = await routexRequireUser(request, env, state, ['provider','admin','house_command']);
	    if (!auth.ok) response = auth.response;
	    else {
	      const providerId = auth.user.role === 'provider' ? auth.user.id : routexClean(body.provider_id || auth.user.id, 120);
	      const contractorId = routexClean(body.contractor_id, 120);
	      const knownContractor = state.users.some(user => user.id === contractorId && ['contractor','crew'].includes(user.role))
	        || state.applications.some(item => item.contractor_id === contractorId)
	        || state.assignments.some(item => item.contractor_id === contractorId);
	      if (!contractorId) response = routexJson({ok:false, error:'contractor_id is required.'}, 400);
	      else if (!knownContractor) response = routexJson({ok:false, error:'Contractor or crew user not found.'}, 404);
	      else {
	        const block = {id:routexId('blk'), provider_id:providerId, contractor_id:contractorId, reason:routexClean(body.reason, 1000) || null, created_at:routexNow()};
	        state.providerBlocks.unshift(block);
	        routexAudit(state, auth.user, 'contractor_blocked', 'provider_block', block.id, block);
	        response = routexJson({ok:true, block}, 201);
	        persist = true;
	      }
	    }
	  }
	  else if (!response && method === 'GET' && path === '/provider/roster') {
	    const auth = await routexRequireUser(request, env, state, ['provider','admin','house_command']);
	    if (!auth.ok) response = auth.response;
	    else {
	      const providerId = auth.user.role === 'provider' ? auth.user.id : routexClean(params.provider_id, 120);
	      const roster = state.providerRosters
	        .filter(item => !providerId || item.provider_id === providerId)
	        .map(item => ({...item, contractor:routexPublicUser(state.users.find(user => user.id === item.contractor_id)), provider:routexPublicUser(state.users.find(user => user.id === item.provider_id))}));
	      response = routexJson({ok:true, roster});
	    }
	  }
	  else if (!response && method === 'DELETE' && (match = routexMatch(path, '/provider/roster/:contractorId'))) {
	    const auth = await routexRequireUser(request, env, state, ['provider','admin','house_command']);
	    if (!auth.ok) response = auth.response;
	    else {
	      const providerId = auth.user.role === 'provider' ? auth.user.id : routexClean(params.provider_id || auth.user.id, 120);
	      const before = state.providerRosters.length;
	      state.providerRosters = state.providerRosters.filter(item => !(item.provider_id === providerId && item.contractor_id === match.contractorId));
	      const removed = before - state.providerRosters.length;
	      routexAudit(state, auth.user, 'contractor_unrostered', 'provider_roster', match.contractorId, {removed});
	      response = routexJson({ok:true, removed});
	      persist = true;
	    }
	  }
		  else if (!response && method === 'GET' && path === '/notifications') {
		    const auth = await routexRequireUser(request, env, state);
		    response = auth.ok ? routexJson({ok:true, notifications:state.notifications.filter(item => item.user_id === auth.user.id)}) : auth.response;
		  }
		  else if (!response && method === 'POST' && (match = routexMatch(path, '/notifications/:id/provider-status'))) {
		    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
		    const notification = state.notifications.find(item => item.id === match.id);
		    if (!auth.ok) response = auth.response;
		    else if (!notification) response = routexJson({ok:false, error:'Notification not found.'}, 404);
		    else {
		      const receipt = await routexRefreshTwilioNotification(env, state, notification);
		      routexAudit(state, auth.user, 'notification_provider_status_checked', 'notification', notification.id, {ok:receipt.ok, carrier_status:receipt.receipt?.status || null, error:receipt.error || null});
		      response = routexJson({ok:receipt.ok, ...receipt}, receipt.ok ? 200 : (receipt.error === 'notification_has_no_twilio_message_sid' ? 409 : 502));
		      persist = true;
		    }
		  }
		  else if (!response && method === 'POST' && (match = routexMatch(path, '/autonomous/recommend/:jobId'))) {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command','ae','provider']);
	    const job = state.jobs.find(item => item.id === match.jobId);
	    if (!auth.ok) response = auth.response;
	    else if (!job) response = routexJson({ok:false, error:'Job not found.'}, 404);
	    else if (auth.user.role === 'provider' && job.provider_id !== auth.user.id) response = routexJson({ok:false, error:'Not allowed.'}, 403);
	    else {
	      state.autonomousRecommendations = state.autonomousRecommendations.filter(item => item.job_id !== job.id);
	      const recommendations = state.users
	        .filter(user => ['contractor','crew'].includes(user.role) && user.status === 'active')
	        .map(user => {
	          const profile = state.contractorProfiles.find(item => item.user_id === user.id) || state.crewProfiles.find(item => item.user_id === user.id) || {};
	          const skills = JSON.stringify(profile.skills || user.skills || []).toLowerCase();
	          let score = 40;
	          const reasons = [];
	          if (user.city && user.city === job.city && user.state === job.state) { score += 25; reasons.push('same_market'); }
	          if (skills && skills.includes(String(job.category || '').toLowerCase())) { score += 20; reasons.push('category_skill_match'); }
	          if (state.providerRosters.some(item => item.provider_id === job.provider_id && item.contractor_id === user.id)) { score += 20; reasons.push('provider_roster'); }
	          score += Math.min(15, Math.floor((Number(profile.reliability_score || 50)) / 10));
	          const recommendation = {id:routexId('rec'), job_id:job.id, contractor_id:user.id, score, reasons, created_at:routexNow()};
	          state.autonomousRecommendations.unshift(recommendation);
	          return {contractor_id:user.id, name:user.name, score, reasons};
	        })
	        .sort((left, right) => right.score - left.score);
	      routexAudit(state, auth.user, 'autonomous_recommendations_generated', 'job', job.id, {count:recommendations.length});
	      response = routexJson({ok:true, job_id:job.id, recommendations});
	      persist = true;
	    }
	  }
	  else if (!response && method === 'POST' && path === '/house-command/assign') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    const job = state.jobs.find(item => item.id === body.job_id);
	    const contractor = state.users.find(item => item.id === body.contractor_id && ['contractor','crew'].includes(item.role) && item.status === 'active');
	    if (!auth.ok) response = auth.response;
	    else if (!job) response = routexJson({ok:false, error:'Job not found.'}, 404);
	    else if (!contractor) response = routexJson({ok:false, error:'Active contractor or crew not found.'}, 404);
	    else {
	      const count = routexAcceptedCount(state, job.id);
	      if (job.acceptance_mode === 'single' && count >= 1) response = routexJson({ok:false, error:'Single-acceptance lock blocked operator over-assignment.'}, 409);
	      else if (count >= Number(job.slots || 0)) response = routexJson({ok:false, error:'Slot cap blocked operator over-assignment.'}, 409);
	      else {
	        let application = state.applications.find(item => item.job_id === job.id && item.contractor_id === contractor.id);
	        if (!application) {
	          application = {id:routexId('app'), job_id:job.id, contractor_id:contractor.id, note:routexClean(body.note || 'Assigned by House Command.', 1000), status:'accepted', created_at:routexNow(), updated_at:routexNow()};
	          state.applications.unshift(application);
	        } else {
	          application.status = 'accepted';
	          application.updated_at = routexNow();
	        }
	        const assignment = {id:routexId('asg'), job_id:job.id, application_id:application.id, contractor_id:contractor.id, status:'offered', confirmed_at:null, on_way_at:null, checked_in_at:null, checked_out_at:null, provider_approved_at:null, created_at:routexNow(), updated_at:routexNow(), assigned_by:auth.user.id};
	        state.assignments.unshift(assignment);
	        const newCount = count + 1;
	        job.status = newCount >= Number(job.slots || 0) ? 'filled' : 'partially_filled';
	        job.updated_at = routexNow();
	        const payment = routexSetAssignmentPayment(state, assignment, 'authorized', 'House Command assigned contractor; work pending.');
	        await routexAuthorizePaymentProvider(env, state, payment, job, 'house_command_assignment_payment_authorized');
	        const compliance = routexRecordAssignmentCompliance(state, assignment);
	        await routexDispatchBackgroundProvider(env, state, compliance, contractor);
	        const notification = routexNotify(state, contractor.id, 'House Command assignment', `You were assigned to ${job.title}. Confirm the assignment.`);
	        await routexDispatchNotificationProvider(env, state, notification);
	        routexAudit(state, auth.user, 'house_command_assigned_contractor', 'job_assignment', assignment.id, {job_id:job.id, contractor_id:contractor.id});
	        response = routexJson({ok:true, assignment, job}, 201);
	        persist = true;
	      }
	    }
	  }
	  else if (!response && method === 'GET' && path === '/house-command/jobs') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    response = auth.ok ? routexJson({ok:true, jobs:state.jobs.map(job => ({...job, applicant_count:state.applications.filter(item => item.job_id === job.id).length, assignment_count:state.assignments.filter(item => item.job_id === job.id).length}))}) : auth.response;
	  }
	  else if (!response && method === 'POST' && path === '/house-command/resolve-dispute') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    const dispute = state.disputes.find(item => item.id === body.dispute_id);
	    if (!auth.ok) response = auth.response;
	    else if (!dispute) response = routexJson({ok:false, error:'Dispute not found.'}, 404);
	    else {
	      dispute.status = 'resolved';
	      dispute.resolution = routexClean(body.resolution || 'Resolved by House Command.', 1200);
	      dispute.updated_at = routexNow();
	      const assignment = state.assignments.find(item => item.id === dispute.assignment_id);
	      let payment = null;
	      if (assignment && body.payment_status) {
	        payment = routexSetAssignmentPayment(state, assignment, routexClean(body.payment_status, 80), routexClean(body.payment_reason || dispute.resolution, 1000));
	        const job = state.jobs.find(item => item.id === assignment.job_id);
	        if (job) await routexAuthorizePaymentProvider(env, state, payment, job, 'dispute_payment_status_updated');
	      }
	      routexAudit(state, auth.user, 'dispute_resolved', 'dispute', dispute.id, {payment_status:payment?.status || null});
	      response = routexJson({ok:true, dispute, payment});
	      persist = true;
	    }
	  }
	  else if (!response && method === 'GET' && path === '/house-command/workflow-board') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command','ae']);
	    if (!auth.ok) response = auth.response;
	    else {
	      const items = routexCollectWorkflowItems(state);
	      response = routexJson({ok:true, summary:routexWorkflowSummary(items), items});
	    }
	  }
	  else if (!response && method === 'POST' && (match = routexMatch(path, '/house-command/workflow-board/:itemType/:itemId'))) {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command','ae']);
	    if (!auth.ok) response = auth.response;
	    else {
	      const itemType = match.itemType;
	      let row = null;
	      if (itemType === 'job') row = state.jobs.find(item => item.id === match.itemId);
	      else if (itemType === 'job_assignment') row = state.assignments.find(item => item.id === match.itemId);
	      else if (itemType === 'route_job') row = state.routeJobs.find(item => item.id === match.itemId);
	      else response = routexJson({ok:false, error:'Unsupported workflow item type.'}, 400);
	      if (!response) {
	        if (!row) response = routexJson({ok:false, error:'Workflow item not found.'}, 404);
	        else {
	          row.workflow = {
	            ...routexNormalizeWorkflowState(itemType, row),
	            status:routexNormalizeWorkflowStatus(body.status, 'queued'),
	            owner:routexClean(body.owner, 160),
	            checkpoint:routexClean(body.checkpoint, 240),
	            due_at:body.due_at || null,
	            next_action:routexClean(body.next_action, 240),
	            notes:routexClean(body.notes, 1000),
	            updated_at:routexNow()
	          };
	          row.updated_at = routexNow();
	          const item = routexWorkflowItem(state, itemType, row);
	          routexAudit(state, auth.user, 'house_command_workflow_updated', itemType, row.id, {item_type:item.item_type, item_id:item.item_id, title:item.title, workflow_status:item.workflow.status, owner:item.workflow.owner, checkpoint:item.workflow.checkpoint, next_action:item.workflow.next_action, notes:item.workflow.notes, detail:item.detail});
	          response = routexJson({ok:true, item, summary:routexWorkflowSummary(routexCollectWorkflowItems(state))});
	          persist = true;
	        }
	      }
	    }
	  }
	  else if (!response && method === 'GET' && path === '/house-command/workflow-timeline') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command','ae']);
	    if (!auth.ok) response = auth.response;
	    else response = routexJson({ok:true, ...routexCollectWorkflowTimeline(state, Math.max(1, Math.min(500, Number(params.limit || 120))))});
	  }
	  else if (!response && method === 'POST' && path === '/house-command/freeze-payment') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    const payment = state.payments.find(item => item.id === body.payment_id);
	    if (!auth.ok) response = auth.response;
	    else if (!payment) response = routexJson({ok:false, error:'Payment not found.'}, 404);
	    else {
	      payment.status = 'held';
	      payment.reason = routexClean(body.reason || 'Operator freeze.', 1000);
	      payment.provider_driver = payment.provider_driver || '0s-gate-payment-ledger';
	      payment.updated_at = routexNow();
	      const job = state.jobs.find(item => item.id === payment.job_id);
	      if (job) await routexAuthorizePaymentProvider(env, state, payment, job, 'payment_frozen');
	      routexAudit(state, auth.user, 'payment_frozen', 'payment_ledger', payment.id, {reason:payment.reason});
	      response = routexJson({ok:true, payment});
	      persist = true;
	    }
	  }
	  else if (!response && method === 'GET' && path === '/admin/audit-events') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    response = auth.ok ? routexJson({ok:true, audit_events:state.auditEvents.slice(0, 500)}) : auth.response;
	  }
	  else if (!response && method === 'GET' && path === '/admin/audit-integrity') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    response = auth.ok ? routexJson({ok:true, audit_integrity:{ok:true, checked:state.auditEvents.length, driver:'0s-worker-append-only-ledger', note:'Mounted Worker keeps append-only audit rows; standalone hash-chain verification is not available inside this single-file Worker adapter yet.'}}) : auth.response;
	  }
	  else if (!response && method === 'GET' && path === '/admin/users') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    response = auth.ok ? routexJson({ok:true, users:state.users.map(routexPublicUser).slice(0, 1000), counts:{users:state.users.length, contractors:state.users.filter(user => user.role === 'contractor').length, providers:state.users.filter(user => user.role === 'provider').length, crews:state.users.filter(user => user.role === 'crew').length}}) : auth.response;
	  }
	  else if (!response && method === 'POST' && path === '/admin/gate-users') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    const role = routexAllowedRole(body.role);
	    const email = routexEmail(body.email);
	    const allowedStagedRoles = ['contractor','provider','crew','ae','house_command'];
	    if (!auth.ok) response = auth.response;
	    else if (!email || !routexIsEmail(email)) response = routexJson({ok:false, error:'Valid email is required.'}, 400);
	    else if (!allowedStagedRoles.includes(role)) response = routexJson({ok:false, error:'role must be contractor, provider, crew, ae, or house_command.'}, 400);
	    else {
	      const existing = routexLocalUserForIdentity(state, {email, subject:body.skygate_subject || body.id || ''});
	      const syntheticSubject = routexClean(body.skygate_subject || body.id || `gate-${role}-${email}`, 180);
	      const phone = routexPhone(body.phone || body.phone_number || body.phoneNumber);
	      const smsOptIn = routexConsentFlag(body.sms_opt_in ?? body.smsOptIn ?? body.sms_consent ?? body.smsConsent);
	      const user = routexEnsureUser(state, {
	        id:existing?.id || syntheticSubject,
	        email,
	        role,
	        status:'active',
	        name:routexClean(body.name || email, 120),
	        phone,
	        sms_opt_in:smsOptIn,
	        city:routexClean(body.city, 80),
	        state:routexClean(body.state, 80),
	        company_name:routexClean(body.company_name, 160),
	        skygate_subject:existing?.skygate_subject || syntheticSubject,
	        skygate_email:email
	      });
	      user.status = 'active';
	      user.role = role;
	      user.name = routexClean(body.name || user.name || email, 120);
	      if (phone) user.phone = phone;
	      if (Object.prototype.hasOwnProperty.call(body, 'sms_opt_in') || Object.prototype.hasOwnProperty.call(body, 'smsOptIn') || Object.prototype.hasOwnProperty.call(body, 'sms_consent') || Object.prototype.hasOwnProperty.call(body, 'smsConsent')) user.sms_opt_in = smsOptIn;
	      user.city = routexClean(body.city || user.city, 80);
	      user.state = routexClean(body.state || user.state, 80);
	      user.company_name = role === 'provider' ? routexClean(body.company_name || user.company_name || user.name || email, 160) : user.company_name;
	      user.updated_at = routexNow();
	      if (role === 'contractor') {
	        const profile = state.contractorProfiles.find(item => item.user_id === user.id) || {user_id:user.id, skills:[], service_radius_miles:25, transportation_status:'unknown', reliability_score:50, rating_avg:0, completed_jobs:0};
	        profile.skills = Array.isArray(body.skills) ? body.skills.slice(0, 20).map(item => routexClean(item, 80)).filter(Boolean) : profile.skills;
	        profile.service_radius_miles = Number(body.service_radius_miles || profile.service_radius_miles || 25);
	        profile.transportation_status = routexClean(body.transportation_status || profile.transportation_status || 'unknown', 80);
	        profile.reliability_score = Number(body.reliability_score || profile.reliability_score || 50);
	        if (!state.contractorProfiles.some(item => item.user_id === user.id)) state.contractorProfiles.unshift(profile);
	      }
	      if (role === 'crew') {
	        const profile = state.crewProfiles.find(item => item.user_id === user.id) || {user_id:user.id, crew_name:user.name || email, member_count:Number(body.member_count || 1), rating_avg:0, completed_jobs:0};
	        profile.crew_name = routexClean(body.crew_name || profile.crew_name || user.name || email, 160);
	        profile.member_count = Number(body.member_count || profile.member_count || 1);
	        if (!state.crewProfiles.some(item => item.user_id === user.id)) state.crewProfiles.unshift(profile);
	      }
	      if (role === 'provider') {
	        const profile = state.providerProfiles.find(item => item.user_id === user.id) || {user_id:user.id, company_name:user.company_name || user.name || email, provider_type:'local_business', rating_avg:0, completed_jobs:0};
	        profile.company_name = routexClean(body.company_name || profile.company_name || user.name || email, 160);
	        profile.provider_type = routexClean(body.provider_type || profile.provider_type || 'local_business', 80);
	        if (!state.providerProfiles.some(item => item.user_id === user.id)) state.providerProfiles.unshift(profile);
	      }
	      if (!state.complianceChecks.some(item => item.user_id === user.id && item.status === 'attested_shared_gate')) routexRecordUserCompliance(state, user.id, role);
	      routexAudit(state, auth.user, existing ? 'gate_user_profile_updated' : 'gate_user_profile_staged', 'user', user.id, {role:user.role, email:user.email, shared_gate_owned:true, phone_present:Boolean(user.phone), sms_opt_in:routexConsentFlag(user.sms_opt_in)});
	      response = routexJson({ok:true, user:routexPublicUser(user), created:!existing, shared_gate_owned:true, local_password_created:false}, existing ? 200 : 201);
	      persist = true;
	    }
	  }
	  else if (!response && method === 'GET' && path === '/storage/status') {
	    const auth = await routexRequireUser(request, env, state);
	    const provider = routexProviderConfig(env);
	    response = auth.ok ? routexJson({ok:true, storage:{driver:provider.storage.configured ? provider.storage.driver : (routexStorageMode(env) === 'kv' ? 'worker-kv' : 'not_configured'), durable:routexStorageMode(env) === 'kv', external_object_storage_configured:provider.storage.configured, bucket:provider.storage.configured ? provider.storage.bucket : null, proof_media_count:state.proofMedia.length, proof_media_external_count:state.proofMedia.filter(item => item.object_key).length, export_packet_count:state.exports.length, export_packet_external_count:state.exports.filter(item => item.object_key).length, integration_outbox_count:state.integrationOutbox.length}}) : auth.response;
	  }
	  else if (!response && method === 'GET' && path === '/storage/integrity') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    response = auth.ok ? routexJson({ok:true, storage_integrity:{ok:true, media_count:state.proofMedia.length, checks:state.proofMedia.map(item => ({ok:true, id:item.id, path:item.storage_path || null})).slice(0, 500)}}) : auth.response;
	  }
	  else if (!response && method === 'GET' && path === '/integrations/status') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    response = auth.ok ? routexJson({ok:true, integrations:routexIntegrationList(env), counts:{runtime_events:state.runtimeEvents.length, compliance_checks:state.complianceChecks.length, notifications:state.notifications.length, payment_ledger:state.payments.length, integration_outbox:state.integrationOutbox.length, integration_outbox_pending:state.integrationOutbox.filter(item => item.status === 'pending').length}}) : auth.response;
	  }
	  else if (!response && method === 'GET' && path === '/gate-dashboard') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    response = auth.ok ? routexJson(await routexGateDashboardPayload(env, state, auth.user)) : auth.response;
	  }
	  else if (!response && method === 'GET' && path === '/integrations/outbox') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    if (!auth.ok) response = auth.response;
	    else {
	      let rows = state.integrationOutbox.slice();
	      if (params.status) rows = rows.filter(item => item.status === params.status);
	      if (params.provider_kind) rows = rows.filter(item => item.provider_kind === params.provider_kind);
	      response = routexJson({ok:true, outbox:rows.slice(0, 500)});
	    }
	  }
	  else if (!response && method === 'POST' && (match = routexMatch(path, '/integrations/outbox/:id/status'))) {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    const row = state.integrationOutbox.find(item => item.id === match.id);
	    const status = routexClean(body.status, 40);
	    if (!auth.ok) response = auth.response;
	    else if (!row) response = routexJson({ok:false, error:'Integration outbox row not found.'}, 404);
	    else if (!['pending','dispatched','failed'].includes(status)) response = routexJson({ok:false, error:'status must be pending, dispatched, or failed.'}, 400);
	    else {
	      row.status = status;
	      row.updated_at = routexNow();
	      if (status === 'dispatched') row.dispatched_at = routexNow();
	      if (status === 'failed') { row.attempts = Number(row.attempts || 0) + 1; row.last_error = routexClean(body.last_error || 'Dispatch failed.', 500); }
	      if (status === 'pending') { row.last_error = null; row.dispatched_at = null; }
	      routexAudit(state, auth.user, 'integration_outbox_status_updated', 'integration_outbox', row.id, {status:row.status, provider_kind:row.provider_kind});
	      response = routexJson({ok:true, outbox:row});
	      persist = true;
	    }
	  }
	  else if (!response && method === 'GET' && path === '/runtime/events') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    response = auth.ok ? routexJson({ok:true, runtime_events:state.runtimeEvents.slice(0, 500)}) : auth.response;
	  }
	  else if (!response && method === 'GET' && path === '/compliance/checks') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    response = auth.ok ? routexJson({ok:true, compliance_checks:state.complianceChecks.slice(0, 500)}) : auth.response;
	  }
	  else if (!response && method === 'GET' && path === '/compliance/provider-readiness') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    response = auth.ok ? routexJson({ok:true, background_provider:routexBackgroundReadiness(env)}) : auth.response;
	  }
	  else if (!response && method === 'POST' && (match = routexMatch(path, '/compliance/checks/:id/order-background'))) {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    const row = state.complianceChecks.find(item => item.id === match.id);
	    const readiness = routexBackgroundReadiness(env);
	    if (!auth.ok) response = auth.response;
	    else if (!row) response = routexJson({ok:false, error:'Compliance check not found.'}, 404);
	    else if (!readiness.configured) response = routexJson({ok:false, error:'external_background_provider_not_configured', background_provider:readiness}, 409);
	    else {
	      const user = state.users.find(item => item.id === row.user_id) || null;
	      const dispatched = await routexDispatchBackgroundProvider(env, state, row, user);
	      routexAudit(state, auth.user, 'external_background_check_ordered', 'compliance_check', row.id, {provider:dispatched.provider, provider_dispatch_status:dispatched.provider_dispatch_status || null});
	      response = routexJson({ok:true, compliance_check:dispatched, background_provider:readiness});
	      persist = true;
	    }
	  }
	  else if (!response && method === 'POST' && path === '/compliance/manual-checks') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    if (!auth.ok) response = auth.response;
	    else if (!body.user_id && !body.assignment_id) response = routexJson({ok:false, error:'user_id or assignment_id is required.'}, 400);
	    else if (body.user_id && !state.users.some(item => item.id === body.user_id)) response = routexJson({ok:false, error:'User not found for manual compliance record.'}, 404);
	    else if (body.assignment_id && !state.assignments.some(item => item.id === body.assignment_id)) response = routexJson({ok:false, error:'Assignment not found for manual compliance record.'}, 404);
	    else {
	      const recorded = await routexRecordManualCompliance(env, state, auth.user, body);
	      response = routexJson({ok:true, compliance_check:recorded.row, proof_media:recorded.media}, 201);
	      persist = true;
	    }
	  }
	  else if (!response && method === 'GET' && path === '/providers/webhooks') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    if (!auth.ok) response = auth.response;
	    else {
	      let rows = state.providerWebhooks.slice();
	      if (params.provider) rows = rows.filter(item => item.provider === params.provider);
	      response = routexJson({ok:true, provider_webhooks:rows.slice(0, 500)});
	    }
	  }
	  else if (!response && method === 'GET' && path === '/house-command/market-report') {
	    const auth = await routexRequireUser(request, env, state, ['admin','house_command']);
	    if (!auth.ok) response = auth.response;
	    else {
	      let jobs = state.jobs.slice();
	      if (params.city) jobs = jobs.filter(job => job.city === params.city);
	      if (params.state) jobs = jobs.filter(job => job.state === params.state);
	      const jobIds = jobs.map(job => job.id);
	      const assignments = state.assignments.filter(item => jobIds.includes(item.job_id));
	      const assignmentIds = assignments.map(item => item.id);
	      const payments = state.payments.filter(item => jobIds.includes(item.job_id));
	      const report = {
	        packet_type:'market_report',
	        version:'0.4.0-0s-worker-parity',
	        generated_at:routexNow(),
	        filters:{city:params.city || null, state:params.state || null},
	        totals:{
	          jobs:jobs.length,
	          open_jobs:jobs.filter(job => ['open','applicant_pool_active','partially_filled'].includes(job.status)).length,
	          filled_jobs:jobs.filter(job => job.status === 'filled').length,
	          assignments:assignments.length,
	          payout_eligible:payments.filter(item => item.status === 'payout_eligible').length,
	          held_payments:payments.filter(item => item.status === 'held').length,
	          disputes:state.disputes.filter(item => jobIds.includes(item.job_id)).length,
	          route_jobs:state.routeJobs.filter(item => jobIds.includes(item.job_id)).length,
	          notifications:state.notifications.length,
	          compliance_checks:state.complianceChecks.filter(item => assignmentIds.includes(item.assignment_id) || assignments.some(assignment => assignment.contractor_id === item.user_id)).length,
	          runtime_events:state.runtimeEvents.filter(item => jobIds.includes(item.entity_id) || assignmentIds.includes(item.entity_id) || jobIds.includes(item.metadata?.job_id)).length
	        },
	        jobs:jobs.map(job => ({id:job.id, title:job.title, city:job.city, state:job.state, status:job.status, slots:job.slots, applicants:state.applications.filter(item => item.job_id === job.id).length, assignments:assignments.filter(item => item.job_id === job.id).length}))
	      };
	      const serialized = JSON.stringify(report);
	      const exportRow = {id:routexId('exp'), type:'market_report', entity_id:`${params.city || 'all'}:${params.state || 'all'}`, path:`kv://skyeroutex/exports/MARKET_REPORT_${params.city || 'all'}_${params.state || 'all'}_${Date.now()}.json`, byte_size:new TextEncoder().encode(serialized).length, sha256:await routexSha256(serialized), created_by:auth.user.id, created_at:routexNow()};
	      const put = await routexWriteExportObject(env, state, `MARKET_REPORT_${params.city || 'all'}_${params.state || 'all'}_${Date.now()}.json`, report);
	      if (put) Object.assign(exportRow, {path:put.storage_path, object_key:put.object_key, bucket:put.bucket, storage_driver:put.driver, sha256:put.sha256, byte_size:put.byte_size, external_storage_status:'stored'});
	      else exportRow.external_storage_status = routexProviderConfig(env).storage.configured ? 'failed_or_fallback' : 'worker_kv_ledger_only';
	      state.exports.unshift(exportRow);
	      routexAudit(state, auth.user, 'market_report_exported', 'market', exportRow.entity_id, {export_packet_id:exportRow.id, path:exportRow.path, sha256:exportRow.sha256});
	      response = routexJson({ok:true, export:exportRow, report});
	      persist = true;
	    }
	  }

  if (!response) response = routexJson({ok:false, error:'skyeroutex_route_not_found', path, manifest:`${ROUTEX_BASE}/routes/manifest`}, 404);
  if ((persist || state.__routexDirty) && response.status < 400) {
    const createdAuditEvents = state.auditEvents.slice(0, Math.max(0, state.auditEvents.length - initialAuditCount)).reverse();
    await routexWriteState(env, state);
    if (createdAuditEvents.length) await routexMirrorAuditEventsToGate(env, createdAuditEvents);
  }
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
const MUSIC_AUDIT_LIMIT = 300;

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
    receipts:[],
    auditEvents:[]
  };
}
function musicNormalizeState(raw) {
  const base = musicDefaultState();
  const state = raw && typeof raw === 'object' ? {...base, ...raw} : base;
  for (const key of ['artists','assets','releases','receipts','auditEvents']) if (!Array.isArray(state[key])) state[key] = [];
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
function musicMergeRows(existing = [], incoming = [], deleted = []) {
  const deletedKeys = new Set(deleted.map(String));
  const keyFor = (item) => {
    for (const key of ['id','eventId','dropId','batchId','approvalId','deployReceiptId','releaseId','artistId','threadId']) {
      if (item && item[key]) return `${key}:${item[key]}`;
    }
    return `row:${JSON.stringify(item)}`;
  };
  const map = new Map();
  for (const row of Array.isArray(existing) ? existing : []) {
    const key = keyFor(row);
    if (!deletedKeys.has(key) && !deletedKeys.has(String(row.id || row.dropId || row.batchId || row.releaseId || row.artistId || ''))) map.set(key, row);
  }
  for (const row of Array.isArray(incoming) ? incoming : []) {
    const key = keyFor(row);
    if (!deletedKeys.has(key) && !deletedKeys.has(String(row.id || row.dropId || row.batchId || row.releaseId || row.artistId || ''))) map.set(key, {...(map.get(key) || {}), ...row});
  }
  return Array.from(map.values());
}
function musicMergeState(latest, incoming) {
  const prior = musicNormalizeState(latest);
  const nextInput = musicNormalizeState(incoming);
  const deleted = nextInput.__musicDeleted || {};
  const next = musicNormalizeState({...prior, ...nextInput});
  next.artists = musicMergeRows(prior.artists, nextInput.artists, deleted.artists);
  next.assets = musicMergeRows(prior.assets, nextInput.assets, deleted.assets);
  next.releases = musicMergeRows(prior.releases, nextInput.releases, deleted.releases);
  next.receipts = musicMergeRows(prior.receipts, nextInput.receipts, deleted.receipts);
  next.auditEvents = musicMergeRows(prior.auditEvents, nextInput.auditEvents, deleted.auditEvents)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, MUSIC_AUDIT_LIMIT);
  next.studio.projects = musicMergeRows(prior.studio.projects, nextInput.studio.projects, deleted.studioProjects);
  next.studio.exports = musicMergeRows(prior.studio.exports, nextInput.studio.exports, deleted.studioExports);
  next.studio.engines = musicMergeRows(prior.studio.engines, nextInput.studio.engines, deleted.studioEngines);
  next.drops.items = musicMergeRows(prior.drops.items, nextInput.drops.items, deleted.drops);
  next.drops.batches = musicMergeRows(prior.drops.batches, nextInput.drops.batches, deleted.dropBatches);
  next.drops.approvals = musicMergeRows(prior.drops.approvals, nextInput.drops.approvals, deleted.dropApprovals);
  next.drops.deploys = musicMergeRows(prior.drops.deploys, nextInput.drops.deploys, deleted.dropDeploys);
  next.drops.traffic = musicMergeRows(prior.drops.traffic, nextInput.drops.traffic, deleted.dropTraffic);
  next.payments.ledger = musicMergeRows(prior.payments.ledger, nextInput.payments.ledger, deleted.paymentLedger);
  next.payments.payouts = musicMergeRows(prior.payments.payouts, nextInput.payments.payouts, deleted.payouts);
  next.exchange.contentRequests = musicMergeRows(prior.exchange.contentRequests, nextInput.exchange.contentRequests, deleted.contentRequests);
  next.exchange.threads = musicMergeRows(prior.exchange.threads, nextInput.exchange.threads, deleted.threads);
  next.exchange.communityPosts = musicMergeRows(prior.exchange.communityPosts, nextInput.exchange.communityPosts, deleted.communityPosts);
  next.exchange.campaigns = musicMergeRows(prior.exchange.campaigns, nextInput.exchange.campaigns, deleted.campaigns);
  next.social.connectors = musicMergeRows(prior.social.connectors, nextInput.social.connectors, deleted.connectors);
  next.social.postQueue = musicMergeRows(prior.social.postQueue, nextInput.social.postQueue, deleted.postQueue);
  next.social.feedItems = musicMergeRows(prior.social.feedItems, nextInput.social.feedItems, deleted.feedItems);
  next.social.stories = musicMergeRows(prior.social.stories, nextInput.social.stories, deleted.stories);
  next.social.feedPulls = musicMergeRows(prior.social.feedPulls, nextInput.social.feedPulls, deleted.feedPulls);
  next.social.moderation = musicMergeRows(prior.social.moderation, nextInput.social.moderation, deleted.moderation);
  delete next.__musicDeleted;
  return next;
}
async function musicWriteState(env, state) {
  const kv = musicKv(env);
  if (!kv?.put) return false;
  const latest = kv.get ? await kv.get(musicKey('state'), {type:'json'}).catch(() => null) : null;
  const next = latest ? musicMergeState(latest, state) : musicNormalizeState(state);
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
    feedItems:state.social.feedItems.length,
    auditEvents:state.auditEvents.length
  };
}
async function musicResponseJson(response) {
  return response.clone().json().catch(() => ({}));
}
function musicPayloadIds(payload = {}) {
  const ids = {};
  const scan = (source = {}) => {
    for (const key of ['id','artistId','assetId','releaseId','dropId','batchId','threadId','connectorId','postId','payoutId','approvalId','deployReceiptId']) {
      if (source && source[key] && !ids[key]) ids[key] = source[key];
    }
  };
  scan(payload);
  for (const key of ['artist','asset','release','drop','batch','request','thread','post','connector','event','entry','payout','approval','deploy','workflow','project','export']) scan(payload[key]);
  return ids;
}
function musicPayloadResult(payload = {}) {
  for (const key of ['artist','asset','release','drop','batch','request','thread','post','connector','event','entry','payout','approval','deploy','workflow','project','export']) {
    if (payload[key]) return key;
  }
  return payload.ok === true ? 'ok' : 'unknown';
}
function musicRecordAuditEvent(state, access = {}, fnName, action, method, status, payload = {}) {
  state.auditEvents = Array.isArray(state.auditEvents) ? state.auditEvents : [];
  const event = {
    id:musicId('audit'),
    eventId:musicId('audit_evt'),
    createdAt:musicNow(),
    system:'SkyeMusicNexus',
    route:`${MUSIC_BASE}/${fnName}`,
    functionName:fnName,
    action:action || payload.action || method.toLowerCase(),
    method,
    status,
    ok:status < 400,
    actor:access.actor || 'unknown',
    role:access.role || 'unknown',
    operator:access.operator === true,
    via:access.via || 'unknown',
    result:musicPayloadResult(payload),
    ids:musicPayloadIds(payload),
  };
  state.auditEvents.unshift(event);
  state.auditEvents = state.auditEvents.slice(0, MUSIC_AUDIT_LIMIT);
  return event;
}
function musicObservability(state, env) {
  const analytics = musicAnalytics(state);
  return {
    ok:true,
    gateSessionRequired:true,
    surface:'SkyeMusicNexus',
    generatedAt:musicNow(),
    storage:{mode:musicStorageMode(env), durable:musicStorageMode(env) === 'kv', stateKey:musicKey('state')},
    auth:{sharedZeroOsGate:true, appSpecificAdminPassword:false, operatorActions:Object.fromEntries(Object.entries(MUSIC_OPERATOR_ACTIONS).map(([key, value]) => [key, Array.from(value)]))},
    frontendBackendContract:{
      apiBase:MUSIC_BASE,
      browserRule:'Production browser rooms call /api/skymusicnexus/{function}; local source functions remain private source.',
      functions:MUSIC_FUNCTIONS,
      observabilityRoutes:[`${MUSIC_BASE}/observability`, `${MUSIC_BASE}/music-analytics?action=observability`],
    },
    counts:analytics,
    retained:{
      artists:state.artists.length,
      assets:state.assets.length,
      releases:state.releases.length,
      drops:state.drops.items.length,
      payouts:state.payments.payouts.length,
      exchangeRequests:state.exchange.contentRequests.length,
      feedItems:state.social.feedItems.length,
      auditEvents:state.auditEvents.length,
    },
    latestEvents:state.auditEvents.slice(0, 50),
    receipts:state.receipts.slice(0, 25),
    smokeProof:{
      localScript:'npm run 0s:skyemusicnexus:proof',
      stressScript:'npm run 0s:skyemusicnexus:stress',
      canonicalStressReceipt:'metraiyux_0s_site/SkyeMusicNexus/proof/skyemusicnexus-mounted-worker-stress-latest.json',
    },
    readiness:{
      clientFacing:true,
      dawBeta:true,
      publicEntryRequiresGate:true,
      adminBehindSharedGate:true,
      liveDspDistributionBoundary:true,
      liveRoyaltySettlementBoundary:true,
      formalLegalReviewBoundary:true,
      providerTokenBoundary:true,
    },
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
    latestAuditEvents:state.auditEvents.slice(0, 8),
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
    state.__musicDeleted = {...(state.__musicDeleted || {}), assets:[`id:${id}`, id]};
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
  else if (fnName === 'music-analytics') response = method === 'GET'
    ? (url.searchParams.get('action') === 'observability' ? musicJson(musicObservability(state, env)) : musicJson({ok:true, ...musicAnalytics(state)}))
    : musicJson({ok:false, error:'Method not allowed'}, 405);
  else if (fnName === 'music-provider-hooks') response = musicJson({ok:true, hooks:[], providerBoundary:'Configure dedicated provider credentials before live music provider webhooks.'});
  else response = musicJson({ok:false, error:'skymusicnexus_function_not_found', fnName}, 404);
  if (method !== 'GET' && response.status < 400) {
    musicRecordAuditEvent(state, access, fnName, action, method, response.status, await musicResponseJson(response));
    await musicWriteState(env, state);
  }
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
  if (path === '/observability') {
    const gate = await requireMusicGate(request, env, 'SkyeMusicNexus observability');
    if (!gate.ok) return gate.response;
    return musicJson(musicObservability(await musicReadState(env), env));
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
const SD_SKYEPAY_LEGAL_REVIEW_URL = 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s&offer=sovereigndocs-legal-review-lane';
const SD_LEGAL_REVIEW_OFFER_ID = 'sovereigndocs-legal-review-lane';
const SD_STATE_BAR_DIRECTORY_URL = 'https://www.azbar.org/search-for-a-legal-professional/';
const SD_LEGAL_REVIEW_PLANS = [
  { id:'legal_review_triage_deposit', name:'Legal Review Triage Deposit', amountCents:29900, platformFeePercent:30, partnerReservePercent:70, pricingMode:'skyepay_upfront_owner_approved' },
  { id:'business_document_review_request', name:'Business Document Review Request', amountCents:49900, platformFeePercent:30, partnerReservePercent:70, pricingMode:'skyepay_upfront_owner_approved' },
  { id:'official_source_prep_review', name:'Official-Source Prep Review', amountCents:39900, platformFeePercent:30, partnerReservePercent:70, pricingMode:'skyepay_upfront_owner_approved' },
  { id:'custom_partner_routing', name:'Custom Partner Routing', amountCents:null, platformFeePercent:30, partnerReservePercent:70, pricingMode:'quote_then_skyepay_upfront' }
];
const SD_BRAND_MARKER = 'SKYESOVERLONDON_BACKING_NOTICE';
function sdBrandingMeta() {
  return {
    platform:'SovereignDocs',
    operatorCompany:"Skye's Over London LC",
    operatingSystem:'MetrAIyux 0S',
    marker:SD_BRAND_MARKER,
    backingNotice:"Powered and workflow-backed by Skye's Over London LC through MetrAIyux 0S.",
    boundary:"Operational backing means document automation, vault/export tooling, workflow routing, and optional paid legal-review routing. It is not financing, legal advice, an attorney-client relationship, a filing/submission guarantee, a business outcome guarantee, or responsibility for the company's performance, approvals, compliance, or use of the documents.",
    legalReview:'Legal review is optional and paid up front through the SkyePay/Stripe legal-review lane before partner routing.'
  };
}
function sdBrandMarkdown(title, markdown) {
  const brand = sdBrandingMeta();
  const body = String(markdown || '').trim() || `# ${title || 'SovereignDocs document'}`;
  if (body.includes(SD_BRAND_MARKER)) return body;
  return `${body}

---

## ${SD_BRAND_MARKER}

${brand.backingNotice}

${brand.boundary}

${brand.legalReview}
`;
}
function sdTemplateDraftMarkdown(template = {}, payload = {}) {
  const answers = payload.answers && typeof payload.answers === 'object' ? payload.answers : {};
  const answerRows = Object.entries(answers).map(([key, value]) => `- ${key}: ${String(value ?? '').trim() || '[not provided]'}`).join('\n');
  return sdBrandMarkdown(template.title || template.id || 'SovereignDocs document', `# ${template.title || template.id || 'SovereignDocs document'}

## Document record

- Template ID: ${template.id || '[unknown]'}
- Jurisdiction: ${template.jurisdiction || payload.jurisdiction || 'US'}
- Risk level: ${template.risk_level || 'medium'}
- Category: ${template.category || payload.category || 'custom'}

## Draft facts

${answerRows || '- No facts supplied yet.'}

## Review boundary

This is an editable SovereignDocs draft or prep packet. Confirm current official, state, local, court, tax, agency, or partner requirements before final use.`);
}
const SD_LEGAL_PARTNERS = [
  { id:'legal_partner_candidate_burch_and_cracchiolo_pa', slug:'burch-and-cracchiolo-pa', displayName:'Burch & Cracchiolo, P.A.', status:'candidate_only_pending_outreach_bar_check_conflict_check_and_msa', city:'Phoenix', state:'AZ', phone:'(602) 274-7611', officialWebsite:'https://www.bcattorneys.com/', reviewScopes:['business and corporate documents','commercial contracts','formation packet review','real estate packets','commercial litigation triage'] },
  { id:'legal_partner_candidate_gallagher_and_kennedy_pa', slug:'gallagher-and-kennedy-pa', displayName:'Gallagher & Kennedy, P.A.', status:'candidate_only_pending_outreach_bar_check_conflict_check_and_msa', city:'Phoenix', state:'AZ', phone:'(602) 530-8000', officialWebsite:'https://gknet.com/', reviewScopes:['business documents','employer documents','commercial disputes','entity and governance packet review','regulated-business triage'] },
  { id:'legal_partner_candidate_fennemore_phoenix', slug:'fennemore-phoenix', displayName:'Fennemore', status:'candidate_only_pending_outreach_bar_check_conflict_check_and_msa', city:'Phoenix', state:'AZ', phone:'(602) 916-5000', officialWebsite:'https://www.fennemorelaw.com/contact-us/phoenix/', reviewScopes:['formation and governance packets','commercial contracts','IP prep handoffs','real estate packets','litigation triage'] },
  { id:'legal_partner_candidate_greenberg_traurig_phoenix', slug:'greenberg-traurig-phoenix', displayName:'Greenberg Traurig, LLP', status:'candidate_only_pending_outreach_bar_check_conflict_check_and_msa', city:'Phoenix', state:'AZ', phone:'(602) 445-8000', officialWebsite:'https://www.gtlaw.com/en/locations/phoenix', reviewScopes:['enterprise business documents','M&A and finance packet triage','commercial litigation','IP and employment documents','real estate packets'] },
  { id:'legal_partner_candidate_kutak_rock_scottsdale', slug:'kutak-rock-scottsdale', displayName:'Kutak Rock LLP', status:'candidate_only_pending_outreach_bar_check_conflict_check_and_msa', city:'Scottsdale', state:'AZ', phone:'(480) 429-5000', officialWebsite:'https://www.kutakrock.com/offices/scottsdale', reviewScopes:['finance and public finance packets','business documents','real estate packets','government relations triage','IP and tax-sensitive documents'] },
  { id:'legal_partner_candidate_milligan_lawless_pc', slug:'milligan-lawless-pc', displayName:'Milligan Lawless P.C.', status:'candidate_only_pending_outreach_bar_check_conflict_check_and_msa', city:'Phoenix', state:'AZ', phone:'(602) 792-3500', officialWebsite:'https://www.milliganlawless.com/', reviewScopes:['healthcare business documents','employment documents','tax-sensitive business packets','real estate packets','estate and probate prep handoffs'] },
  { id:'legal_partner_candidate_platz_juris_pllc', slug:'platz-juris-pllc', displayName:'PLATZ JURIS, PLLC', status:'candidate_only_pending_outreach_bar_check_conflict_check_and_msa', city:'Phoenix', state:'AZ', phone:'(480) 570-8558', officialWebsite:'https://platzjuris.com/', reviewScopes:['IP prep packets','trademark and copyright documents','business and governance documents','civil litigation triage','music and entertainment documents'] }
];
function valleyLegalPartnerAppId(slug) {
  return {
    'burch-and-cracchiolo-pa':'burch-and-cracchiolo-p-a-phoenix-85004-acf6c6b',
    'gallagher-and-kennedy-pa':'gallagher-and-kennedy-p-a-phoenix-85016-887b1be',
    'fennemore-phoenix':'fennemore-phoenix-85016-eb81f5b',
    'greenberg-traurig-phoenix':'greenberg-traurig-llp-phoenix-85016-5f86b1d',
    'kutak-rock-scottsdale':'kutak-rock-llp-scottsdale-85253-00c0044',
    'milligan-lawless-pc':'milligan-lawless-p-c-phoenix-85018-94ab8a4',
    'platz-juris-pllc':'platz-juris-pllc-phoenix-85016-4e77b1f'
  }[slug] || slug;
}
function valleyLegalReviewHtml(partner = null) {
  const title = partner ? `${partner.displayName} Legal Review Candidate` : 'Valley Verified Legal Review Lane';
  const cards = (partner ? [partner] : SD_LEGAL_PARTNERS).map(item => `<article class="card"><p class="eyebrow">${item.city}, ${item.state}</p><h2>${item.displayName}</h2><p>${item.reviewScopes.slice(0, 4).join(', ')}</p><p><strong>Status:</strong> candidate only, pending outreach, bar/licensing check, conflicts, terms, and payout setup.</p><div class="actions"><a href="/client-app-factory/client-apps/${valleyLegalPartnerAppId(item.slug)}/">App build</a><a href="/Free99/apps/sovereigndocs/review-submission/">Submit review</a><a href="${item.officialWebsite}">Official site</a></div></article>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{margin:0;background:#080b0c;color:#f8fbf6;font-family:Inter,Arial,sans-serif;line-height:1.5}.shell{width:min(1120px,calc(100% - 32px));margin:auto;padding:30px 0 70px}header{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:18px 0}a{color:#7ae7ff}.brand{color:#fff;text-decoration:none;font-weight:900}.hero{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(260px,.85fr);gap:18px;padding:34px 0}.panel,.card{border:1px solid rgba(255,255,255,.14);border-radius:8px;background:#111818;padding:20px}.eyebrow{letter-spacing:.12em;text-transform:uppercase;color:#f5d36a;font-size:12px;font-weight:900}h1{font-size:clamp(40px,6vw,74px);line-height:.97;margin:8px 0;letter-spacing:0}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.actions a,nav a{border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:10px 12px;text-decoration:none;color:#fff;background:#162020}.actions a:first-child{background:linear-gradient(135deg,#f5d36a,#7ae7ff);color:#06100d;border:0;font-weight:900}.notice{border-left:4px solid #f5d36a;background:rgba(245,211,106,.1);padding:14px 16px;border-radius:8px}@media(max-width:850px){.hero,.grid{grid-template-columns:1fr}header{align-items:flex-start;flex-direction:column}}</style></head><body><main class="shell"><header><a class="brand" href="/valley-verified/legal-review-lane/">Valley Verified Legal Review Lane</a><nav><a href="/Free99/apps/sovereigndocs/review-submission/">Submit review</a><a href="/Free99/apps/sovereigndocs/partner-network/">Partner network</a></nav></header><section class="hero"><div class="panel"><p class="eyebrow">SovereignDocs candidate network</p><h1>${partner ? partner.displayName : 'Legal review workspaces without fake partner claims.'}</h1><p>These pages are provisioned for outreach and operator-controlled routing. They do not claim active partnership, legal advice, attorney review, matter acceptance, approval, or outcome.</p><div class="actions"><a href="/Free99/apps/sovereigndocs/review-submission/">Create review checkout packet</a><a href="https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s&offer=sovereigndocs-legal-review-lane">Open SkyePay lane</a></div></div><aside class="panel"><p class="eyebrow">Workflow</p><p>Vault packet, SkyePay upfront checkout, operator triage, partner activation, returned document log, payout ledger pending owner release.</p></aside></section><p class="notice"><strong>Boundary:</strong> Candidate legal workspaces require outreach, bar/licensing verification, conflict rules, MSA/NDA, fee schedule, and payout destination before active routing.</p><section class="grid">${cards}</section></main></body></html>`;
}
function handleValleyLegalReviewLaneRoute(url) {
  if (url.pathname === '/valley-verified/data/legal-review-partner-candidates.json') {
    return json({ok:true, version:'2026-05-20.live-worker', candidates:SD_LEGAL_PARTNERS, skyepayReviewUrl:SD_SKYEPAY_LEGAL_REVIEW_URL, stateBarDirectory:SD_STATE_BAR_DIRECTORY_URL});
  }
  if (url.pathname === '/valley-verified/legal-review-lane' || url.pathname === '/valley-verified/legal-review-lane/' || url.pathname === '/valley-verified/legal-review-lane/index.html') {
    return new Response(valleyLegalReviewHtml(), {status:200, headers:{'content-type':'text/html; charset=utf-8', 'cache-control':'public, max-age=0, must-revalidate'}});
  }
  const match = url.pathname.match(/^\/valley-verified\/legal-review-lane\/([^/]+)\/?(?:index\.html)?$/);
  if (match) {
    const partner = SD_LEGAL_PARTNERS.find(item => item.slug === decodeURIComponent(match[1]));
    if (partner) return new Response(valleyLegalReviewHtml(partner), {status:200, headers:{'content-type':'text/html; charset=utf-8', 'cache-control':'public, max-age=0, must-revalidate'}});
  }
  return null;
}

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
function sdLegalReviewPlan(id) {
  return SD_LEGAL_REVIEW_PLANS.find(plan => plan.id === id) || SD_LEGAL_REVIEW_PLANS[0];
}
function sdLegalPartner(id) {
  return SD_LEGAL_PARTNERS.find(partner => partner.id === id || partner.slug === id) || null;
}
function sdReviewAckMissing(payload = {}) {
  const missing = [];
  if (!payload.acceptBoundary) missing.push('not_legal_advice_boundary');
  if (!payload.acceptPartnerReviewTerms) missing.push('partner_review_terms');
  if (!payload.acceptNoGuarantee) missing.push('no_guarantee_boundary');
  if (!payload.acceptNoSovereignDocsLiabilityForOutcome) missing.push('no_sovereigndocs_liability_for_partner_outcome');
  if (!payload.acceptUserFactsResponsibility) missing.push('user_fact_accuracy_responsibility');
  return missing;
}
function sdReviewCheckoutUrl({ reviewId, paymentId, planId, partnerId }) {
  const url = new URL(SD_SKYEPAY_LEGAL_REVIEW_URL);
  if (reviewId) url.searchParams.set('review', reviewId);
  if (paymentId) url.searchParams.set('payment', paymentId);
  if (planId) url.searchParams.set('plan', planId);
  if (partnerId) url.searchParams.set('partner', partnerId);
  url.searchParams.set('source', 'sovereigndocs');
  return url.href;
}
function sdReviewPacketMarkdown({ template, payload, plan, partner }) {
  const answers = payload.answers && typeof payload.answers === 'object' ? payload.answers : {};
  const answerRows = Object.entries(answers)
    .map(([key, value]) => `- ${key}: ${String(value ?? '').trim() || '[not provided]'}`)
    .join('\n');
  const contact = payload.contact || {};
  return sdBrandMarkdown('SovereignDocs Legal Review Packet', `# SovereignDocs Legal Review Packet

SovereignDocs prepared this routing packet for legal review intake. SovereignDocs is not a law firm and does not provide legal advice.

## Review request

- Template ID: ${template.id}
- Template title: ${template.title}
- Jurisdiction: ${template.jurisdiction}
- Risk level: ${template.risk_level}
- Service plan: ${plan.name}
- Requested partner: ${partner?.displayName || 'operator triage'}

## Submitter

- Name: ${contact.name || '[not supplied]'}
- Email: ${contact.email || '[not supplied]'}
- Organization: ${contact.organization || '[not supplied]'}

## User facts

${answerRows || '- No answers supplied.'}

## Draft or prep worksheet content

${payload.assembledMarkdown || payload.contentMarkdown || payload.documentText || '[No assembled document supplied]'}

## Accepted boundaries

- Not legal advice: ${!!payload.acceptBoundary}
- Partner review terms: ${!!payload.acceptPartnerReviewTerms}
- No guarantee: ${!!payload.acceptNoGuarantee}
- SovereignDocs not responsible for partner outcome: ${!!payload.acceptNoSovereignDocsLiabilityForOutcome}
- User responsible for facts and final use: ${!!payload.acceptUserFactsResponsibility}
`);
}
async function sdCreateLegalReviewRequest(env, payload = {}) {
  const blocked = sdNeedsStorage(env);
  if (blocked) return blocked;
  const missing = sdReviewAckMissing(payload);
  if (missing.length) return json({ ok:false, error:'Partner review submission requires all boundary acknowledgments.', missing }, 403);
  const state = await sdAllState(env);
  const createdAt = sdNow();
  const template = sdTemplateById(payload.templateId || 'sd_tpl_partner_review_packet');
  const plan = sdLegalReviewPlan(payload.servicePlanId || 'legal_review_triage_deposit');
  const partner = sdLegalPartner(payload.requestedPartnerId || payload.partnerId || '');
  const reviewId = sdId('sd_review');
  const paymentId = sdId('sd_payment');
  const vaultRecordId = sdId('sd_vault');
  const checkoutUrl = sdReviewCheckoutUrl({ reviewId, paymentId, planId:plan.id, partnerId:partner?.id || '' });
  const amountCents = plan.amountCents;
  const review = {
    id:reviewId,
    templateId:template.id,
    templateTitle:template.title,
    jurisdiction:template.jurisdiction,
    riskLevel:template.risk_level,
    title:payload.title || template.title || 'SovereignDocs Legal Review',
    status:amountCents === null ? 'quote_required_before_checkout' : 'checkout_required',
    paymentStatus:amountCents === null ? 'quote_required' : 'checkout_required',
    escrowStatus:'pending_payment',
    servicePlanId:plan.id,
    requestedPartnerId:partner?.id || null,
    partnerId:null,
    vaultRecordId,
    paymentIntentId:paymentId,
    reviewScope:payload.reviewScope || plan.id,
    contact:payload.contact || {},
	    answers:payload.answers || {},
	    packetMarkdown:sdReviewPacketMarkdown({ template, payload, plan, partner }),
	    brand:sdBrandingMeta(),
	    boundaries:{ notLegalAdvice:true, noAttorneyClientWithSovereignDocs:true, partnerMayDecline:true, noOutcomeGuarantee:true, userResponsibleForFactsAndUse:true, candidatePartnerOnly:true },
    events:[{ id:sdId('sd_event'), type:'checkout_required', actor:payload.actor || '0s-gate-session', note:'Legal review packet stored in vault and SkyePay checkout created before partner routing.', createdAt }],
    createdAt,
    updatedAt:createdAt
  };
  const payment = {
    id:paymentId,
    reviewId,
    status:review.paymentStatus,
	    provider:'SkyePay / Stripe Checkout',
	    checkoutProvider:'skyepay_stripe_checkout',
	    stripeBackedCheckout:true,
	    offerId:SD_LEGAL_REVIEW_OFFER_ID,
    amountCents,
    currency:'usd',
    checkoutUrl,
    customerPays:'upfront_before_partner_routing',
    platformFeePercent:plan.platformFeePercent,
    partnerReservePercent:plan.partnerReservePercent,
	    partnerPayoutTiming:'after_partner_return_and_customer_delivery_owner_release',
	    liveTransferBoundary:'Checkout is routed through SkyePay/Stripe. Partner payout remains ledger-only until payout provider and partner terms are configured.',
	    legalReviewBoundary:sdBrandingMeta().boundary,
	    createdAt,
    updatedAt:createdAt
  };
  const vaultRecord = {
    id:vaultRecordId,
    reviewId,
    title:review.title,
    status:'stored_for_legal_review_checkout',
    templateId:template.id,
    servicePlanId:plan.id,
	    requestedPartnerId:partner?.id || null,
	    packetMarkdown:review.packetMarkdown,
	    brand:sdBrandingMeta(),
	    customerVisibleStatus:'Payment required before partner routing.',
    createdAt,
    updatedAt:createdAt
  };
  state.reviews.unshift(review);
  state.reviewPayments.unshift(payment);
  state.vaultRecords.unshift(vaultRecord);
  await Promise.all([
    sdPut(env, 'reviews', state.reviews),
    sdPut(env, 'review_payments', state.reviewPayments),
    sdPut(env, 'vault_records', state.vaultRecords)
  ]);
  return json({ ok:true, receiptId:reviewId, status:review.status, submission:review, payment, vaultRecord, skyepayCheckoutUrl:checkoutUrl, nextStep:amountCents === null ? 'Operator must quote the request before checkout.' : 'Send the customer to SkyePay. Route to a legal partner only after payment is confirmed and partner activation is complete.', storage_mode:sdStorageMode(env) }, 201);
}
function sdMaybeCreatePayout({ state, review, payment, payload = {} }) {
  const already = state.reviewPayouts.find(item => item.reviewId === review.id);
  if (already) return already;
  const now = sdNow();
  const paid = ['paid_held_in_escrow','paid','succeeded'].includes(String(payment?.status || '').toLowerCase());
  const amountCents = Number(payment?.amountCents || payload.amountCents || 0);
  const partnerReservePercent = Number(payment?.partnerReservePercent || 70);
  const partnerPayoutCents = Number(payload.partnerPayoutCents || (amountCents ? Math.round(amountCents * partnerReservePercent / 100) : 0));
  const payout = {
    id:sdId('sd_payout'),
    reviewId:review.id,
    paymentId:payment?.id || null,
    partnerId:review.partnerId || review.requestedPartnerId || payload.partnerId || null,
    status:paid ? 'payout_pending_owner_release' : 'payout_blocked_until_customer_payment_confirmed',
    amountCents:partnerPayoutCents,
    platformRemainderCents:amountCents ? Math.max(amountCents - partnerPayoutCents, 0) : null,
    releaseTrigger:'partner_return_logged_and_customer_delivery_ready',
    liveTransferBoundary:'This is an internal payout ledger entry. External transfer requires a configured payout provider and approved partner terms.',
    createdAt:now,
    updatedAt:now
  };
  state.reviewPayouts.unshift(payout);
  return payout;
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
  const [cases, documents, packets, reminders, reviews, notes, artifacts, handoffs, returns, intakes, reviewPayments, reviewPayouts, vaultRecords] = await Promise.all([
    sdGet(env, 'cases'),
    sdGet(env, 'documents'),
    sdGet(env, 'packets'),
    sdGet(env, 'reminders'),
    sdGet(env, 'reviews'),
    sdGet(env, 'notes'),
    sdGet(env, 'artifacts'),
    sdGet(env, 'handoffs'),
    sdGet(env, 'returns'),
    sdGet(env, 'intakes'),
    sdGet(env, 'review_payments'),
    sdGet(env, 'review_payouts'),
    sdGet(env, 'vault_records')
  ]);
  return {cases, documents, packets, reminders, reviews, notes, artifacts, handoffs, returns, intakes, reviewPayments, reviewPayouts, vaultRecords};
}
async function sdDashboard(env) {
  const state = await sdAllState(env);
  const activeCases = state.cases.filter(item => !['completed','closed','archived'].includes(String(item.status || '').toLowerCase()));
  const actionNeeded = [
    ...state.reviews.filter(item => item.status === 'checkout_required').map(item => ({type:'checkout', label:item.title || item.id, href:'/Free99/apps/sovereigndocs/review-submission/'})),
    ...state.reviews.filter(item => !String(item.status || '').includes('returned')).map(item => ({type:'review', label:item.title || item.id, href:'/Free99/apps/sovereigndocs/partner-workbench/'})),
    ...state.reviewPayouts.filter(item => item.status === 'payout_pending_owner_release').map(item => ({type:'payout', label:item.reviewId || item.id, href:'/Free99/apps/sovereigndocs/partner-workbench/'})),
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
      intakes:state.intakes.length,
      reviewPayments:state.reviewPayments.length,
      reviewPayouts:state.reviewPayouts.length,
      vaultRecords:state.vaultRecords.length,
      editorHandoffs:state.handoffs.length,
      editorReturns:state.returns.length
    },
    panels:{
      cases:state.cases.map(c => sdPublicCase(c, state.documents, state.packets.find(p => p.id === c.packetId))).slice(-50).reverse(),
      documents:state.documents.slice(-50).reverse(),
      reminders:state.reminders.slice(-50).reverse(),
      partnerReviews:state.reviews.slice(-50).reverse(),
      reviewPayments:state.reviewPayments.slice(-50).reverse(),
      reviewPayouts:state.reviewPayouts.slice(-50).reverse(),
      vaultRecords:state.vaultRecords.slice(-50).reverse(),
      editorHandoffs:state.handoffs.slice(-50).reverse(),
      editorReturns:state.returns.slice(-50).reverse()
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
	    brand:sdBrandingMeta(),
	    contentMarkdown:sdTemplateDraftMarkdown(template, payload),
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
	    brand:sdBrandingMeta(),
	    markdown:sdBrandMarkdown(`${payload.title || 'SovereignDocs'} packet`, `# ${payload.title || 'SovereignDocs'} packet\n\n${documents.map(doc => `## ${doc.title}\n\n${doc.contentMarkdown}`).join('\n\n')}`),
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
function sdOfficialFieldLabel(value) {
  return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
}
function sdOfficialPrepMarkdown(workflow, answers) {
  const rows = Object.entries(answers || {})
    .map(([key, value]) => `- ${sdOfficialFieldLabel(key)}: ${String(value || '').trim() || '[not provided]'}`)
    .join('\n');
  return sdBrandMarkdown(`${workflow.title || workflow.id || 'Official Source'} Prep Packet`, `# ${workflow.title || workflow.id || 'Official Source'} Prep Packet

Status: prep packet ready; external official site still required.

## Boundary

SovereignDocs prepared this worksheet and checklist only. It has not submitted anything to an agency, court, tax authority, USPTO, or government system. Final action must happen on the linked official source or through a separately proven live integration.

## Official Source

${workflow.official_url || workflow.officialUrl || '[official source not configured]'}

## Prep Facts

${rows || '- No prep facts entered.'}

## Checklist

- Review every field for accuracy.
- Confirm the official source is current before relying on it.
- Use the official source link for the final submission or filing step.
- Save proof of any external submission outside SovereignDocs.
`);
}
async function sdPrepareOfficialWorkflow(env, payload = {}) {
  const blocked = sdNeedsStorage(env);
  if (blocked) return blocked;
  const workflow = payload.workflow || {};
  const workflowId = payload.workflowId || workflow.id || 'official_source_workflow';
  const answers = payload.answers && typeof payload.answers === 'object' ? payload.answers : {};
  const packets = await sdGet(env, 'official_source_packets');
  const createdAt = sdNow();
  const packet = {
    id:sdId('sd_official_prep'),
    workflowId,
    title:workflow.title || payload.title || sdOfficialFieldLabel(workflowId),
    category:workflow.category || payload.category || 'official-source',
    riskLevel:workflow.risk_level || payload.riskLevel || 'medium',
    status:'prep_packet_ready_external_official_site_required',
    completionModel:'prep_packet_plus_external_official_site',
    externalSubmissionRequired:true,
    sovereignDocsSubmitted:false,
    officialUrl:workflow.official_url || payload.officialUrl || null,
	    source:payload.source || '0s-api',
	    answers,
	    brand:sdBrandingMeta(),
	    createdAt,
    updatedAt:createdAt
  };
  packet.markdown = sdOfficialPrepMarkdown({...workflow, id:workflowId, title:packet.title, official_url:packet.officialUrl}, answers);
  packets.push(packet);
  await sdPut(env, 'official_source_packets', packets);
  return json({
    ok:true,
    packet,
    markdown:packet.markdown,
    nextStep:'Open the external official site. SovereignDocs has not submitted this packet.',
    storage_mode:sdStorageMode(env)
  });
}
async function sdHandleSovereignDocsRoute(request, env, ctx, url) {
  const method = request.method.toUpperCase();
  const path = (url.pathname === SD_BASE ? '/' : url.pathname.slice(SD_BASE.length)) || '/';
  if (method === 'OPTIONS') return json({ok:true});
  if (path === '/' || path === '/health') return json({...appHealth(APP_API_MOUNTS.find(mount => mount.id === 'sovereigndocs'), env), storage_mode:sdStorageMode(env)}, 200);
  if (path === '/routes/manifest') return json({ok:true, static_lane:{mount:`${SOVEREIGNDOCS_STATIC_MOUNT}/`, origin:sovereignDocsLaneOrigin(env), routing_model:'0s_worker_same_path_proxy'}, modules:[{name:'sovereigndocs-0s-adapter', area:'core_workflows', routes:['GET /health','GET /v18/workspace/dashboard','POST /cases/start','POST /packets/assemble','POST /official-workflows/prepare','GET /official-workflows/packets','POST /reminders','GET /legal-partners/network','GET /legal-review/service-plans','POST /legal-review/submit','GET /legal-review/payments','GET /legal-review/payouts','GET /vault/review-records','GET /vault/editor-records','GET /documents','POST /legal-review/submissions/:id/payment-confirm','POST /legal-review/submissions/:id/route','POST /legal-review/submissions/:id/partner-update','POST /v18/cases/:id/open-in-skye-docx-max','GET /editor/skye-docx-max/sessions','GET /editor/skye-docx-max/returns','POST /editor/skye-docx-max/session','POST /editor/skye-docx-max/return','GET /v18/cases/:id/closure-summary']}], storage_mode:sdStorageMode(env)});
  if ((path === '/official-workflows/prepare' || path === '/official-source/prepare') && method === 'POST') {
    return sdPrepareOfficialWorkflow(env, await readJson(request));
  }
  if ((path === '/official-workflows/packets' || path === '/official-source/packets') && method === 'GET') {
    return json({ok:true, items:await sdGet(env, 'official_source_packets'), storage_mode:sdStorageMode(env)});
  }
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
  if (path === '/documents' && method === 'GET') {
    const state = await sdAllState(env);
    return json({ok:true, storage_mode:sdStorageMode(env), count:state.documents.length, items:state.documents.slice().reverse()});
  }
  if (path === '/cases/start' && method === 'POST') return sdCreateCase(env, await readJson(request));
  if (path === '/packets/assemble' && method === 'POST') {
    const blocked = sdNeedsStorage(env);
    if (blocked) return blocked;
    const payload = await readJson(request);
    const packets = await sdGet(env, 'packets');
    const templates = (payload.templateIds || []).map(sdTemplateById);
    const createdAt = sdNow();
	    const packet = {id:sdId('sd_packet'), title:payload.title || 'SovereignDocs Packet', templateIds:templates.map(t => t.id), status:'assembled', brand:sdBrandingMeta(), markdown:sdBrandMarkdown(payload.title || 'SovereignDocs Packet', `# ${payload.title || 'SovereignDocs Packet'}\n\n${templates.map(t => sdTemplateDraftMarkdown(t, payload)).join('\n\n')}`), createdAt, updatedAt:createdAt, documents:templates.map(t => ({templateId:t.id, title:t.title, riskLevel:t.risk_level, contentMarkdown:sdTemplateDraftMarkdown(t, payload)}))};
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
  if (path === '/legal-partners/network' && method === 'GET') return json({ok:true, version:'10.0.0', stateBarDirectory:SD_STATE_BAR_DIRECTORY_URL, partners:SD_LEGAL_PARTNERS, boundaries:['Candidate legal partner workspaces are not active partnership claims.','SovereignDocs is not a law firm and does not provide legal advice.','Partner routing requires payment, vault storage, partner activation, conflicts policy, signed terms, and payout setup.']});
  if (path === '/legal-review/service-plans' && method === 'GET') return json({ok:true, version:'10.0.0', skyepayOfferId:SD_LEGAL_REVIEW_OFFER_ID, skyepayReviewUrl:SD_SKYEPAY_LEGAL_REVIEW_URL, plans:SD_LEGAL_REVIEW_PLANS, brand:sdBrandingMeta(), stripeCheckoutBoundary:{provider:'SkyePay / Stripe Checkout', customerPays:'upfront_before_partner_routing', partnerRoutingBlockedUntil:'payment_confirmed_and_partner_activated', noLegalAdvice:true, noOutcomeGuarantee:true}, defaultRevenuePolicy:{customerPays:'upfront_before_partner_routing', platformFeePercent:30, partnerReservePercent:70, partnerPayoutTiming:'after_partner_return_and_customer_delivery_owner_release', liveMoneyMovement:'SkyePay/Stripe checkout and internal ledger; external transfer requires configured payout provider.'}});
  if (path === '/legal-review/submit' && method === 'POST') return sdCreateLegalReviewRequest(env, await readJson(request));
  if (path === '/legal-review/payments' && method === 'GET') return json({ok:true, items:await sdGet(env, 'review_payments'), storage_mode:sdStorageMode(env)});
  if (path === '/legal-review/payouts' && method === 'GET') return json({ok:true, items:await sdGet(env, 'review_payouts'), storage_mode:sdStorageMode(env)});
  if ((path === '/vault/review-records' || path === '/legal-review/vault-records') && method === 'GET') return json({ok:true, items:await sdGet(env, 'vault_records'), storage_mode:sdStorageMode(env)});
  if (path === '/vault/editor-records' && method === 'GET') {
    const state = await sdAllState(env);
    return json({ok:true, storage_mode:sdStorageMode(env), handoffs:state.handoffs.slice().reverse(), returns:state.returns.slice().reverse(), vaultRecords:state.vaultRecords.filter(item => String(item.recordType || '').includes('skye_docx')).slice().reverse()});
  }
  if (path === '/legal-review/submissions' && method === 'GET') return json({ok:true, items:await sdGet(env, 'reviews'), payments:await sdGet(env, 'review_payments'), payouts:await sdGet(env, 'review_payouts'), storage_mode:sdStorageMode(env)});
  const paymentConfirm = path.match(/^\/legal-review\/submissions\/([^/]+)\/payment-confirm$/);
  if (paymentConfirm && method === 'POST') {
    const payload = await readJson(request);
    const state = await sdAllState(env);
    const review = state.reviews.find(item => item.id === decodeURIComponent(paymentConfirm[1]));
    if (!review) return json({ok:false, error:'review_not_found'}, 404);
    const payment = state.reviewPayments.find(item => item.reviewId === review.id || item.id === review.paymentIntentId);
    if (payment) {
      payment.status = payload.status || 'paid_held_in_escrow';
      payment.skyePayOrderId = payload.skyePayOrderId || payload.orderId || payment.skyePayOrderId || null;
      payment.confirmedAt = sdNow();
      payment.updatedAt = payment.confirmedAt;
    }
    review.status = 'submitted_pending_triage';
    review.paymentStatus = payment?.status || 'paid_held_in_escrow';
    review.escrowStatus = 'paid_held_for_partner_review';
    review.updatedAt = sdNow();
    review.events = [...(review.events || []), {id:sdId('sd_event'), type:'payment_confirmed', actor:payload.actor || 'skyepay', note:'SkyePay payment confirmed; review is eligible for operator triage and partner routing.', payload, createdAt:review.updatedAt}];
    await Promise.all([sdPut(env, 'reviews', state.reviews), sdPut(env, 'review_payments', state.reviewPayments)]);
    return json({ok:true, review, payment, nextStep:'Operator triage can now route to an activated legal partner workspace.'});
  }
  const reviewAction = path.match(/^\/legal-review\/submissions\/([^/]+)\/(route|partner-update)$/);
  if (reviewAction && method === 'POST') {
    const payload = await readJson(request);
    const state = await sdAllState(env);
    const reviews = state.reviews;
    const review = reviews.find(item => item.id === decodeURIComponent(reviewAction[1]));
    if (!review) return json({ok:false, error:'review_not_found'}, 404);
    const selectedPartner = sdLegalPartner(payload.partnerId || review.partnerId || review.requestedPartnerId || '');
    review.status = reviewAction[2] === 'route' ? 'routed_to_partner' : (payload.status || 'partner_review_returned');
    review.partnerId = selectedPartner?.id || payload.partnerId || review.partnerId || null;
    review.partnerName = selectedPartner?.displayName || review.partnerName || null;
    review.note = payload.note || payload.routingNote || '';
    review.partnerReturnedDocument = payload.revisedDocument || payload.approvedDocument || review.partnerReturnedDocument || null;
    review.updatedAt = sdNow();
    review.events = [...(review.events || []), {id:sdId('sd_event'), type:review.status, actor:payload.actor || '0s-gate-session', note:review.note, partnerId:review.partnerId, createdAt:review.updatedAt}];
    let payout = null;
    if (['partner_review_returned','approved','approved_with_revisions','returned_to_customer'].includes(String(review.status))) {
      const payment = state.reviewPayments.find(item => item.reviewId === review.id || item.id === review.paymentIntentId);
      payout = sdMaybeCreatePayout({ state, review, payment, payload });
      const vault = state.vaultRecords.find(item => item.id === review.vaultRecordId);
      if (vault) {
        vault.status = 'partner_return_logged';
        vault.partnerReturnedDocument = payload.revisedDocument || payload.approvedDocument || vault.partnerReturnedDocument || null;
        vault.customerVisibleStatus = 'Partner return logged; delivery and payout release pending owner review.';
        vault.updatedAt = sdNow();
      }
    }
    await Promise.all([sdPut(env, 'reviews', reviews), sdPut(env, 'review_payouts', state.reviewPayouts), sdPut(env, 'vault_records', state.vaultRecords)]);
    return json({ok:true, review, payout, items:reviews, boundary:'SovereignDocs records routing/status only. Partner responsibility, scope, and engagement terms remain external to SovereignDocs.'});
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
	    const documents = state.documents.filter(doc => doc.caseId === c.id);
	    const packet = state.packets.find(item => item.id === c.packetId) || null;
	    const caseMarkdown = sdBrandMarkdown(c.title, `# ${c.title}

## Case

- Case ID: ${c.id}
- Status: ${c.status}
- Type: ${c.caseType}
- Owner org: ${c.owner?.orgId || 'metraiyux-0s'}

## Packet

${packet?.markdown || packet?.title || 'No packet record attached yet.'}

## Editable documents

${documents.length ? documents.map(doc => `### ${doc.title}

- Document ID: ${doc.id}
- Template ID: ${doc.templateId || '[custom]'}
- Status: ${doc.status}
- Risk level: ${doc.riskLevel || 'medium'}

${doc.contentMarkdown || sdTemplateDraftMarkdown(sdTemplateById(doc.templateId || ''), { title:doc.title })}`).join('\n\n') : 'No document records attached yet.'}

## Boundary

This handoff opens the actual SovereignDocs case documents into SkyeDocxMax for editing and export. It does not create legal advice, attorney-client relationship, filing, approval, or outcome guarantees.`);
	    const handoff = {id:sdId('sd_handoff'), caseId:c.id, title:c.title, status:'handoff_created', markdown:caseMarkdown, metadata:{brand:sdBrandingMeta(), documentIds:documents.map(doc => doc.id), packetId:packet?.id || null}, createdAt:sdNow(), launchUrl:`/Free99/apps/sovereigndocs/skye-docx-max/app/?sd_handoff=`};
	    handoff.launchUrl += encodeURIComponent(handoff.id);
    state.handoffs.push(handoff);
    await sdPut(env, 'handoffs', state.handoffs);
    return json({ok:true, handoff, launchUrl:handoff.launchUrl});
  }
  if (path === '/editor/skye-docx-max/config' && method === 'GET') return json({ok:true, editor:'skye-docx-max', storage_mode:sdStorageMode(env), sessionEndpoint:`${SD_BASE}/editor/skye-docx-max/session`, returnEndpoint:`${SD_BASE}/editor/skye-docx-max/return`, persistence:['handoffs','returns','documents','vault_records']});
  if ((path === '/editor/skye-docx-max/sessions' || path === '/editor/skye-docx-max/handoffs') && method === 'GET') {
    const items = await sdGet(env, 'handoffs');
    return json({ok:true, storage_mode:sdStorageMode(env), count:items.length, items:items.slice().reverse()});
  }
  if (path === '/editor/skye-docx-max/returns' && method === 'GET') {
    const items = await sdGet(env, 'returns');
    return json({ok:true, storage_mode:sdStorageMode(env), count:items.length, items:items.slice().reverse()});
  }
  if (path === '/editor/skye-docx-max/session' && method === 'POST') {
	    const blocked = sdNeedsStorage(env);
	    if (blocked) return blocked;
	    const payload = await readJson(request);
	    const handoffs = await sdGet(env, 'handoffs');
	    const handoff = {id:sdId('sd_handoff'), format:'sovereigndocs-skye-docx-max-handoff-v3', target:'SkyeDocxMax', title:payload.title || 'SovereignDocs Document', markdown:sdBrandMarkdown(payload.title || 'SovereignDocs Document', payload.markdown || ''), html:payload.html || '', metadata:{...(payload.metadata || {}), brand:sdBrandingMeta(), generatedForSkyeDocxMax:true, integrationVersion:'0s-worker-v1'}, status:'standalone_handoff_created', createdAt:sdNow(), updatedAt:sdNow(), launchUrl:`/Free99/apps/sovereigndocs/skye-docx-max/app/?sd_handoff=`};
    handoff.launchUrl += encodeURIComponent(handoff.id);
    handoffs.push(handoff);
    await sdPut(env, 'handoffs', handoffs);
    return json({ok:true, handoff, launchUrl:handoff.launchUrl}, 201);
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
	    const createdAt = sdNow();
	    const returned = {id:sdId('sd_return'), handoffId:handoff.id, caseId:handoff.caseId || null, title:payload.title || handoff.title, html:payload.html || '', text:sdBrandMarkdown(payload.title || handoff.title, payload.text || ''), activeDocId:payload.activeDocId || null, metadata:{...(handoff.metadata || {}), ...(payload.metadata || {}), returnedFromSkyeDocxMax:true, integrationVersion:'0s-worker-v1'}, brand:sdBrandingMeta(), createdAt, updatedAt:createdAt};
	    const doc = {id:sdId('sd_doc'), caseId:returned.caseId, title:returned.title, status:'returned_from_skye_docx_max', riskLevel:'medium', brand:sdBrandingMeta(), contentMarkdown:returned.text, html:returned.html, createdAt:returned.createdAt, updatedAt:returned.createdAt, returnId:returned.id, handoffId:handoff.id, sourceType:'skye_docx_max_return'};
	    returned.documentId = doc.id;
	    const vaultRecord = {id:sdId('sd_vault'), recordType:'skye_docx_max_return', status:'editor_return_stored', title:returned.title, source:'SkyeDocxMax', target:'SovereignDocs', handoffId:handoff.id, returnId:returned.id, documentId:doc.id, caseId:returned.caseId, html:returned.html, contentMarkdown:returned.text, metadata:returned.metadata, brand:sdBrandingMeta(), customerVisibleStatus:'Edited SkyeDocxMax package stored in SovereignDocs vault records.', createdAt, updatedAt:createdAt};
	    returned.vaultRecordId = vaultRecord.id;
    state.returns.push(returned);
    state.documents.push(doc);
    state.vaultRecords.push(vaultRecord);
    handoff.status = 'returned_from_skye_docx_max';
    handoff.returnId = returned.id;
    handoff.returnedAt = createdAt;
    handoff.updatedAt = createdAt;
    if (returned.caseId) {
      const c = state.cases.find(item => item.id === returned.caseId);
      if (c) { c.status = 'returned_from_skye_docx_max'; c.updatedAt = returned.createdAt; c.documentIds = [...new Set([...(c.documentIds || []), doc.id])]; }
    }
    await Promise.all([sdPut(env, 'returns', state.returns), sdPut(env, 'documents', state.documents), sdPut(env, 'cases', state.cases), sdPut(env, 'handoffs', state.handoffs), sdPut(env, 'vault_records', state.vaultRecords)]);
    return json({ok:true, returned, document:doc, vaultRecord, case:state.cases.find(item => item.id === returned.caseId) || null}, 201);
  }
  const closureSummary = path.match(/^\/v18\/cases\/([^/]+)\/closure-summary$/);
  if (closureSummary && method === 'GET') {
    const state = await sdAllState(env);
    const c = state.cases.find(item => item.id === decodeURIComponent(closureSummary[1]));
    if (!c) return json({ok:false, error:'case_not_found'}, 404);
    const documents = state.documents.filter(doc => doc.caseId === c.id);
	    return json({ok:true, case:c, exportBundle:{case:c, documents, timeline:sdCaseTimeline(c, state), brand:sdBrandingMeta()}, partnerPacket:{brand:sdBrandingMeta(), markdown:sdBrandMarkdown('Partner Packet', `# Partner Packet\n\nCase: ${c.title}\nStatus: ${c.status}\nDocuments: ${documents.length}`)}, storage_mode:sdStorageMode(env)});
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
	    if (resource === 'partner-packet' && method === 'GET') return json({ok:true, brand:sdBrandingMeta(), markdown:sdBrandMarkdown('Partner Packet', `# Partner Packet\n\n${c.title}\n\nStatus: ${c.status}`)});
	    if (resource === 'export-bundle' && method === 'GET') return json({ok:true, bundle:{case:c, brand:sdBrandingMeta(), documents:state.documents.filter(doc => doc.caseId === c.id), notes:state.notes.filter(note => note.caseId === c.id), artifacts:state.artifacts.filter(artifact => artifact.caseId === c.id)}});
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
  /(^|\/)(?:server|src|scripts|smoke|tests?)(?:\/|$)/i,
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
  /^\/live\/company-knowledge-layer-proof(?:\.html)?$/i,
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
const PUBLIC_LIVE_REDIRECTS = new Map([
  ['/live/sol_staffing_agency_site/training-academy', 'https://sol-staffing-agency-site.pages.dev/training-academy.html'],
  ['/live/sol_staffing_agency_site/training-academy.html', 'https://sol-staffing-agency-site.pages.dev/training-academy.html'],
  ['/live/skyemail/onboarding', 'https://skyemail-platform.graylondonskyes.workers.dev/onboarding.html'],
  ['/live/skyemail/onboarding.html', 'https://skyemail-platform.graylondonskyes.workers.dev/onboarding.html']
]);
const PUBLIC_STATIC_ALLOWLIST = [
  /^\/(?:security|tech-stack|robots)\.(?:html|txt)$/i,
  /^\/(?:sitemap\.xml|site\.webmanifest|manifest\.json|favicon\.ico)$/i,
  /^\/valley-verified\/business\/[^/]+(?:\/.*)?$/i,
  /(^|\/)(?:proof|proofs|receipts)\/(?:public-|browser-|production-|live-)[^/]+\.json$/i
];
const ZERO_OS_GATE_ENTRY_PATHS = new Set([
  '/admin/login',
  '/admin/login/',
  '/admin/login.html',
  '/Free99/demo',
  '/Free99/demo/',
  '/Free99/demo.html',
  '/api/owner/admin-login',
  '/api/owner/admin-session',
  '/api/owner/admin-logout',
  '/api/owner/admin-introspect',
  '/api/free99/demo-login',
  '/devs-playbook/login',
  '/devs-playbook/login.html',
  '/api/marketing-keys/signup',
  '/api/marketing-keys/me',
  '/api/marketing-keys/logout',
  '/api/skygate/auth-introspect',
  '/api/founder-command/login'
]);
const ZERO_OS_GATE_PREFIXES = [
  '/0s',
  '/0s-wrapper-preview',
  '/Auren',
  '/Free99',
  '/Free99/apps/keygate13',
  '/HouseOperations',
  '/Marketing-Made-Easy',
  '/SkyeMediaCenter',
  '/SkyeMusicNexus',
  '/SkyeProfitConsole',
  '/SkyeRouteX',
  '/SkyeSplitEngine',
  '/account',
  '/admin',
  '/ae-command',
  '/agentic-growth-layer',
  '/ai-readiness',
  '/apex',
  '/ascension',
  '/automation',
  '/autonomous-business',
  '/blog',
  '/brain',
  '/brain-governance',
  '/branch-expansion',
  '/buyer-intelligence',
  '/cabinet-dashboards',
  '/calculators',
  '/candidates',
  '/case-studies',
  '/certification-readiness',
  '/changelog',
  '/citadeldb',
  '/client-app-factory',
  '/client-os',
  '/client-preview',
  '/clients',
  '/connectlog-v7.7-relay13-operator-proof',
  '/contracts',
  '/conversion',
  '/crown-os',
  '/dominion-upgrade',
  '/download-center',
  '/downloads',
  '/devs-playbook',
  '/executive-rooms',
  '/founder-command',
  '/governance',
  '/government',
  '/industries',
  '/investor',
  '/key-gate-13th',
  '/launch',
  '/legal-readiness',
  '/live',
  '/market',
  '/member',
  '/nexus',
  '/northstar',
  '/one-music-gh-pages',
  '/operator',
  '/policies',
  '/portal-layer',
  '/portals',
  '/pricing',
  '/proof',
  '/proof-export',
  '/proof-vault',
  '/proposal-center',
  '/quantum-ops',
  '/recruiting',
  '/relay13-core-v1.7-connectlog-operator-proof',
  '/resumes',
  '/revenue-ops',
  '/saas',
  '/sales',
  '/sales-enablement',
  '/sentinel',
  '/sentinel-os',
  '/signin-pro',
  '/signing-pro',
  '/signinpro',
  '/social-batch-factory',
  '/skye-content-repurposer-local',
  '/skye-secure-platform',
  '/skye-secure-secret-packs',
  '/skye-vault-os',
  '/skyegate',
  '/services',
  '/training-academy',
  '/valley-verified',
  '/walkthroughs'
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
function publicLiveRedirectResponse(url, method = 'GET') {
  if (!['GET', 'HEAD'].includes(String(method || 'GET').toUpperCase())) return null;
  const target = PUBLIC_LIVE_REDIRECTS.get(url.pathname.toLowerCase());
  if (!target) return null;
  const redirectUrl = new URL(target);
  url.searchParams.forEach((value, key) => redirectUrl.searchParams.append(key, value));
  return new Response(null, {
    status: 302,
    headers: {
      location: redirectUrl.toString(),
      'cache-control': 'public, max-age=300',
      'x-0s-live-redirect': 'dedicated-gated-system'
    }
  });
}
function isPrivateSourcePath(pathname) {
  if (pathname.startsWith('/api/key-gate-13th/')) return false;
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
function ownerAdminLoginPageResponse() {
  return new Response(adminLoginHtml, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
      'x-0s-gate-entry': 'owner-admin-login'
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
async function proxySovereignDocsStaticLane(request, env, url) {
  if (!isSovereignDocsStaticPath(url.pathname)) return null;
  if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
    return json({
      ok: false,
      error: 'method_not_allowed',
      message: 'SovereignDocs static lane only serves browser assets. Use /api/sovereigndocs for authenticated workflow calls.'
    }, 405);
  }
  const isDocxMaxLane = isSovereignDocsDocxMaxStaticPath(url.pathname);
  const origin = isDocxMaxLane ? sovereignDocsDocxMaxLaneOrigin(env) : sovereignDocsLaneOrigin(env);
  if (!origin) return json({ok:false, error:'sovereigndocs_lane_origin_not_configured'}, 502);
  const upstream = new URL(request.url);
  const target = new URL(origin);
  upstream.protocol = target.protocol;
  upstream.host = target.host;
  const upstreamRequest = new Request(upstream, request);
  const upstreamHeaders = new Headers(upstreamRequest.headers);
  upstreamHeaders.set('x-0s-proxy', 'metraiyux-0s-full-system');
  upstreamHeaders.set('x-0s-source-path', url.pathname);
  const originSecret = String(env.SOVEREIGNDOCS_ORIGIN_PROXY_SECRET || '').trim();
  if (originSecret) upstreamHeaders.set('x-0s-origin-secret', originSecret);
  const response = await fetch(new Request(upstreamRequest, { headers: upstreamHeaders }));
  const headers = new Headers(response.headers);
  headers.set('x-0s-static-lane', isDocxMaxLane ? 'sovereigndocs-docxmax' : 'sovereigndocs');
  headers.set('x-0s-static-lane-origin', origin);
  headers.set('x-0s-api-base', SD_BASE);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
async function protectedProxyMutationResponse(request, env, url) {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return null;
  if (PUBLIC_PROXY_INTAKE_PATHS.has(url.pathname)) return null;
  const protectedPrefix = PROTECTED_PROXY_MUTATION_PREFIXES.find(prefix => url.pathname.startsWith(prefix));
  if (!protectedPrefix) return null;
  const auth = await requireOperatorAuth(request, env, `${protectedPrefix} proxy mutation`);
  return auth.ok ? null : auth.response;
}
async function handleSuiteEventsRoute(request, env, ctx, url) {
  if (url.pathname !== '/api/suite-events') return null;
  const auth = await requireGateAuth(request, env, 'suite events');
  if (!auth.ok) return auth.response;
  const method = request.method.toUpperCase();
  const workspaceId = String(url.searchParams.get('ws_id') || 'primary-workspace').slice(0, 120);
  const appId = String(url.searchParams.get('app_id') || '').slice(0, 120);
  if (method === 'GET') {
    const prefix = `suite-event:${workspaceId}:`;
    const listed = env.SITE_EVENTS_KV?.list ? await env.SITE_EVENTS_KV.list({ prefix, limit: 80 }).catch(() => null) : null;
    const items = [];
    for (const key of listed?.keys || []) {
      const item = await env.SITE_EVENTS_KV.get(key.name, { type: 'json' }).catch(() => null);
      if (item && (!appId || item.app_id === appId || item.source_app === appId || item.target_app === appId)) items.push(item);
    }
    items.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    return json({ ok: true, items, workspace_id: workspaceId, app_id: appId || null });
  }
  if (method === 'POST') {
    const body = await readJson(request);
    const event = {
      id: body.id || `suite_evt_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      workspace_id: String(body.workspace_id || body.workspaceId || workspaceId).slice(0, 120),
      app_id: String(body.app_id || body.appId || body.sourceApp || body.source_app || appId || '').slice(0, 120),
      source_app: String(body.source_app || body.sourceApp || body.app_id || body.appId || '').slice(0, 120),
      target_app: String(body.target_app || body.targetApp || '').slice(0, 120),
      type: String(body.type || body.event || body.intent?.name || 'suite.intent').slice(0, 120),
      status: String(body.status || body.intent?.status || 'recorded').slice(0, 80),
      detail: String(body.detail || body.summary || body.intent?.summary || '').slice(0, 2000),
      payload: body,
      actor: auth.actor || auth.email || auth.sub || 'gate-session',
      created_at: new Date().toISOString()
    };
    const key = `suite-event:${event.workspace_id}:${event.id}`;
    let stored = false;
    if (env.SITE_EVENTS_KV?.put) {
      await env.SITE_EVENTS_KV.put(key, JSON.stringify(event), { expirationTtl: 60 * 60 * 24 * 90 });
      stored = true;
    }
    return json({ ok: true, event, stored });
  }
  return json({ ok: false, error: 'Method not allowed' }, 405);
}
function pathMatchesPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
function isZeroOsGateEntryPath(pathname) {
  if (ZERO_OS_GATE_ENTRY_PATHS.has(pathname)) return true;
  if (pathname === '/favicon.ico' || pathname === '/favicon-32.png' || pathname === '/robots.txt' || pathname === '/sitemap.xml') return true;
  return false;
}
function isZeroOsGatedSurface(pathname) {
  if (isZeroOsGateEntryPath(pathname)) return false;
  if (isPublicStaticAllowlisted(pathname)) return false;
  // FS27 owns the 0S perimeter. The prefix list above is the named-surface
  // manifest, but this Worker now gates by default so generated apps,
  // customer previews, sub-platforms, and newly added folders cannot slip
  // public just because a static route was minted before the manifest caught up.
  return true;
}
function zeroOsGateLoginRedirect(url) {
  const loginUrl = new URL('/admin/login.html', url.origin);
  loginUrl.searchParams.set('return', `${url.pathname}${url.search}`);
  return new Response(null, {
    status: 302,
    headers: {
      location: loginUrl.toString(),
      'cache-control': 'no-store',
      'x-0s-gate': 'fs27-required'
    }
  });
}
function legacySkyeVaultProDocxRedirectResponse(url) {
  if (!url.pathname.startsWith('/Free99/apps/skyevaultpro/apps/docx')) return null;
  const target = new URL('/Marketing-Made-Easy/SkyeDocxMax/editor.html', url.origin);
  url.searchParams.forEach((value, key) => target.searchParams.set(key, value));
  if (!target.searchParams.has('source')) target.searchParams.set('source', 'skyevaultpro');
  if (!target.searchParams.has('returnTo')) target.searchParams.set('returnTo', '/Free99/apps/skyevaultpro/drive/index.html');
  return new Response(null, {
    status: 302,
    headers: {
      location: target.toString(),
      'cache-control': 'no-store',
      'x-0s-legacy-docx': 'redirected-to-current-skyedocxmax'
    }
  });
}
function wantsHtml(request) {
  const accept = String(request.headers.get('accept') || '').toLowerCase();
  return !accept || accept.includes('text/html') || accept.includes('*/*');
}
async function enforceZeroOsGate(request, env, url, ctx = null) {
  if (!isZeroOsGatedSurface(url.pathname)) return null;
  if (request.method === 'OPTIONS') return null;
  if (isMarketingKeySurface(url.pathname)) {
    const marketingAuth = await requireMarketingKeyAuth(request, env, `marketing-key protected surface ${url.pathname}`);
    if (marketingAuth.ok) {
      if (request.method === 'GET') await saveMarketingKeyVisit(env, ctx, marketingAuth, url).catch(() => null);
      return null;
    }
    if (request.method === 'GET' && wantsHtml(request)) return marketingKeyLoginRedirect(url);
    const response = marketingAuth.response || json({ok:false, error:'Marketing key email session required.'}, 401);
    response.headers.set('x-0s-marketing-gate', 'email-required');
    return response;
  }
  const auth = await requireGateAuth(request, env, `0S gate protected surface ${url.pathname}`);
  if (auth.ok) return null;
  if (request.method === 'GET' && !url.pathname.startsWith('/api/') && wantsHtml(request)) {
    return zeroOsGateLoginRedirect(url);
  }
  const response = auth.response || json({ok:false, error:'0S gate session required.'}, 401);
  response.headers.set('x-0s-gate', 'fs27-required');
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/admin/login' || url.pathname === '/admin/login/' || url.pathname === '/admin/login.html') {
      return ownerAdminLoginPageResponse();
    }
    if (url.pathname === '/Free99/demo/') {
      const target = new URL('/Free99/demo', url.origin);
      url.searchParams.forEach((value, key) => target.searchParams.set(key, value));
      return Response.redirect(target.toString(), 302);
    }
    if (url.pathname === '/Free99/apps/skyebox-authenticator/0s/index.html' || url.pathname === '/Free99/apps/skyebox-authenticator/0s/') {
      const target = new URL('/Free99/apps/skyebox-authenticator/index.html', url.origin);
      return Response.redirect(target.toString(), 302);
    }
    const earlyZeroOsGate = await enforceZeroOsGate(request, env, url, ctx);
    if (earlyZeroOsGate) return earlyZeroOsGate;
    if (url.pathname === '/devs-playbook') {
      const target = new URL('/devs-playbook/', url.origin);
      url.searchParams.forEach((value, key) => target.searchParams.set(key, value));
      return Response.redirect(target.toString(), 302);
    }
    if (url.pathname === '/devs-playbook/login') {
      const target = new URL('/devs-playbook/login.html', url.origin);
      url.searchParams.forEach((value, key) => target.searchParams.set(key, value));
      return Response.redirect(target.toString(), 302);
    }
    if (env.ASSETS && (url.pathname === '/devs-playbook/' || url.pathname === '/devs-playbook/index.html')) {
      return env.ASSETS.fetch(assetBindingRequest(request, '/devs-playbook/index.html', url.search));
    }
    if (env.ASSETS && url.pathname === '/devs-playbook/login.html') {
      return env.ASSETS.fetch(assetBindingRequest(request, '/devs-playbook/login.html', url.search));
    }
    if (url.pathname === '/agentic-growth-layer') {
      const target = new URL('/agentic-growth-layer/', url.origin);
      url.searchParams.forEach((value, key) => target.searchParams.set(key, value));
      return Response.redirect(target.toString(), 302);
    }
    if (url.pathname === '/key-gate-13th') {
      const target = new URL('/key-gate-13th/', url.origin);
      url.searchParams.forEach((value, key) => target.searchParams.set(key, value));
      return Response.redirect(target.toString(), 302);
    }
    const legacySkyeVaultProDocxRedirect = legacySkyeVaultProDocxRedirectResponse(url);
    if (legacySkyeVaultProDocxRedirect) return legacySkyeVaultProDocxRedirect;
    const publicLiveRedirect = publicLiveRedirectResponse(url, request.method);
    if (publicLiveRedirect) return publicLiveRedirect;
    if (isPrivateSourcePath(url.pathname)) return privateSourceResponse();
    if ((url.pathname === '/favicon.ico' || url.pathname === '/favicon-32.png') && env.ASSETS) {
      return env.ASSETS.fetch(assetBindingRequest(request, '/favicon-32.png', url.search));
    }
    const mediaResponse = await handleMediaRoute(request, env, ctx, url);
    if (mediaResponse) return mediaResponse;
    if (request.method === 'OPTIONS') return json({ok:true});
    if (url.pathname === '/api/owner/admin-login') return handleOwnerAdminLogin(request, env);
    if (url.pathname === '/api/owner/admin-session') return handleOwnerAdminSession(request, env);
    if (url.pathname === '/api/owner/admin-logout') return handleOwnerAdminLogout();
    if (url.pathname === '/api/owner/admin-introspect' && request.method === 'POST') return handleCombinedGateIntrospect(request, env);
    const free99Demo = await handleFree99DemoRoute(request, env, ctx, url);
    if (free99Demo) return free99Demo;
    const marketingKeys = await handleMarketingKeysRoute(request, env, ctx, url);
    if (marketingKeys) return marketingKeys;
    const founderCommand = await handleFounderCommandRoute(request, env, ctx, url);
    if (founderCommand) return founderCommand;
    if (url.pathname === '/api/0s/route-manifest' || url.pathname === '/api/routes/manifest' || url.pathname === '/api/manifest') {
      return json(apiRouteManifest(env));
    }
    const companyKnowledge = await handleCompanyKnowledgeRoute(request, env, ctx, url, {
      requireGateAuth,
      requireOperatorAuth,
      mirrorSkygateEvent
    });
    if (companyKnowledge) return companyKnowledge;
    const tenantBackbone = await handleTenantBackboneRoute(request, env, ctx, url, {
      requireGateAuth,
      requireOperatorAuth,
      mirrorSkygateEvent
    });
    if (tenantBackbone) return tenantBackbone;
    const citadelDb = await handleCitadelDbRoute(request, env, ctx, url, {
      requireGateAuth,
      requireOperatorAuth,
      mirrorSkygateEvent
    });
    if (citadelDb) return citadelDb;
    const valleyLegalRoute = handleValleyLegalReviewLaneRoute(url);
    if (valleyLegalRoute) return valleyLegalRoute;
    const appApiResponse = await handleAppApiRoute(request, env, ctx, url);
    if (appApiResponse) return appApiResponse;
    const clientAppFactoryGenerated = await handleClientAppFactoryGeneratedRoute(request, env, url);
    if (clientAppFactoryGenerated) return clientAppFactoryGenerated;
    const suiteEvents = await handleSuiteEventsRoute(request, env, ctx, url);
    if (suiteEvents) return suiteEvents;
    if (url.pathname === '/api/skygate/auth-introspect' && request.method === 'POST') return handleCombinedGateIntrospect(request, env);
    if (url.pathname === '/api/skygate/platform-event' && request.method === 'POST') {
      const gate = await introspectSkygate(request, env);
      if (!gate.ok) return json({ok:false, error:gate.error, skygate:gate.data || null}, gate.status || 401);
      const body = await readJson(request);
      const mirrored = await mirrorSkygateEvent(env, body, gate);
      return json({ok:mirrored.ok, mirrored, skygate:{active:true, sub:gate.data?.sub, email:gate.data?.email || gate.data?.username || null}});
    }
    const valleyRelay = await handleValleyVerifiedRelay(request, env, ctx, url);
    if (valleyRelay) return valleyRelay;
    const valleyAdminBrain = await handleValleyVerifiedAdminBrain(request, env, url);
    if (valleyAdminBrain) return valleyAdminBrain;
    const contentEngineAdmin = await handleContentEngineAdminRoute(request, env, ctx, url);
    if (contentEngineAdmin) return contentEngineAdmin;
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
    if (url.pathname === '/changelog' || url.pathname === '/changelog/' || url.pathname === '/changelog/index.html') {
      return new Response(changelogHtml, {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, max-age=0, must-revalidate'
        }
      });
    }
    const proxyMutationBlock = await protectedProxyMutationResponse(request, env, url);
    if (proxyMutationBlock) return proxyMutationBlock;
    const proxied = await proxyApi(request, env, url);
    if (proxied) return proxied;
    const legacyCollision = legacyRootApiCollisionResponse(url);
    if (legacyCollision) return legacyCollision;
    const sovereignDocsStaticLane = await proxySovereignDocsStaticLane(request, env, url);
    if (sovereignDocsStaticLane) return sovereignDocsStaticLane;
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
    ctx.waitUntil(runAgenticGrowthScheduleTick(env, ctx, {
      source:'cron',
      execute:true,
      cron:controller.cron,
      now: controller.scheduledTime ? new Date(controller.scheduledTime).toISOString() : null
    }));
    ctx.waitUntil(free99DemoRotationTick(env, ctx, {
      source:'cron',
      cron:controller.cron,
      now: controller.scheduledTime ? new Date(controller.scheduledTime).toISOString() : null
    }));
  }
};
