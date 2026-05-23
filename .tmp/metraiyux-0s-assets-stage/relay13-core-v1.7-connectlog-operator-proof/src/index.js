const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()'
};
const SCOPES = new Set(['workspace:admin','widget:read','conversations:create','conversations:read','conversations:write','messages:read','messages:write','connectlog:read','connectlog:write','jobs:write','releases:write']);
const STATUSES = new Set(['open', 'pending', 'closed']);
const SYSTEM_JOB_TYPES = new Set(['release.widget_config.verify','widget.publish.verify','workspace.health.check','api_key.audit']);
const MAX_JSON_BYTES = 32 * 1024;
const DEFAULT_MAX_MESSAGE_CHARS = 4000;
let guardrailSchemaReady = null;
const GUARDRAIL_AI_MODES = new Set(['off', 'draft_only', 'auto_reply']);
const RESPONSE_ORCHESTRATION_POLICY = {
  local_brain_first: true,
  default_route: 'local_brain_draft_or_operator_review',
  ai_requires_paid_addon: true,
  paid_addon_offer_id: 'relay13-ai-response-starter',
  paid_addon_title: 'Relay13 AI Response Add-On',
  monthly_flat_fee_cents: 3500,
  included_ai_responses_monthly: 100,
  overflow_policy: 'pause_or_owner_approved_topup',
  provider_cost_guard: 'no_provider_call_until_stripe_addon_active'
};
const DEFAULT_GUARDRAIL_POLICY = {
  status: 'active',
  ai_mode: 'off',
  allow_ai_auto_reply: false,
  allow_web_search: false,
  allow_file_search: false,
  max_ai_input_tokens: 8000,
  max_ai_output_tokens: 700,
  monthly_ai_reply_limit: 0,
  per_ip_message_window_minutes: 10,
  per_ip_message_limit: 24,
  per_ip_conversation_limit: 8,
  max_links_per_message: 2,
  blocked_terms: [],
  escalation_rules: {
    direct_operator_route: true,
    security_or_secret_request: true,
    unsupported_or_out_of_scope: true,
    billing_or_contract_change: true
  },
  app_knowledge: {
    profile: 'customer-app-knowledge',
    answer_scope: [
      'Answer from the configured customer app, workspace, product, and support knowledge only.',
      'Surface the relevant page, app area, next step, or operator handoff path.',
      'Do not use web search for customer website chat replies.'
    ],
    fallback: 'If the answer is not in the app knowledge, ask a short clarifying question or escalate to the operator.'
  }
};
const KNOWN_WORKSPACE_GUARDRAILS = {
  'connectlog-main': {
    app_knowledge: {
      profile: 'metraiyux-0s-public-site',
      answer_scope: [
        'Explain MetrAIyux 0S public surfaces, operator routes, Relay13 chat, ConnectLog relationship flow, SkyeGate/SkyePay lanes, and proof pages already wired into the 0S site.',
        'Use Relay13 route metadata to distinguish brain-assisted drafts from direct Gray/operator handling.',
        'Send sales, contract, billing, private credential, or unclear requests to the operator.'
      ],
      app_surfaces: [
        { label: '0S homepage', path: '/' },
        { label: 'Relay13 Chat Hub', path: '/live/relay13-chat-hub.html' },
        { label: 'ConnectLog + Relay13 proof', path: '/live/connectlog-relay13-operator-proof.html' },
        { label: 'Operator index', path: '/operator/index.html' },
        { label: 'Proof index', path: '/proof/index.html' }
      ],
      fallback: 'Route to direct operator handling when the visitor asks for private business decisions, prices not present in the app, legal/financial advice, or anything outside 0S public app knowledge.'
    }
  },
  'bobs-smoke-shop': {
    app_knowledge: {
      profile: 'bobs-smoke-shop-client-app',
      answer_scope: [
        "Help visitors use Bob's Smoke Shop app/workspace, ask about product interest, pickup/support needs, and next-step contact routing.",
        'Keep replies inside the Bob workspace knowledge and Relay13/ConnectLog request flow.',
        'Escalate inventory, payment, age-restricted, compliance, or unavailable details to the operator/client owner.'
      ],
      app_surfaces: [
        { label: "Bob's public client workspace", path: 'https://bobs-smoke-shop.pages.dev/' },
        { label: 'Bob 0S preview', path: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/client-preview/bobs-smoke-shop.html' }
      ],
      fallback: 'Capture the request and send it to the operator when the answer is not in Bob app knowledge.'
    }
  },
  'empire-pallets': {
    app_knowledge: {
      profile: 'empire-pallets-client-app',
      answer_scope: [
        'Help visitors use the Empire Pallets app/workspace for pallet supply, delivery, recurring order, logistics, and support requests.',
        'Keep replies inside Empire app knowledge and Relay13/ConnectLog request flow.',
        'Escalate pricing, contracts, route commitments, or unsupported operational promises to the operator/client owner.'
      ],
      app_surfaces: [
        { label: 'Empire Pallets public client workspace', path: 'https://empire-pallets.pages.dev/' }
      ],
      fallback: 'Capture the request and send it to the operator when the answer is not in Empire app knowledge.'
    }
  },
  '480-realty-property-management': {
    app_knowledge: {
      profile: '480-realty-property-management-client-app',
      answer_scope: [
        'Help visitors use the 480 Realty & Property Management app for property-management requests, owner inquiries, tenant maintenance, showings, listing questions, and contact routing.',
        'Keep replies inside the 480 Realty app knowledge and Relay13/ConnectLog request flow.',
        'Escalate legal, lease, pricing, availability, maintenance emergency, or contract commitments to the operator/client owner.'
      ],
      app_surfaces: [
        { label: '480 Realty & Property Management public client workspace', path: 'https://480-realty-property-management.pages.dev/' }
      ],
      fallback: 'Capture the request and send it to the operator when the answer is not in 480 Realty app knowledge.'
    }
  },
  'dink-and-dine-pickle-park': {
    app_knowledge: {
      profile: 'dink-and-dine-pickle-park-client-app',
      answer_scope: [
        'Help visitors use the Dink & Dine Pickle Park app for court/event interest, group bookings, food and drink questions, membership interest, and contact routing.',
        'Keep replies inside Dink & Dine app knowledge and Relay13/ConnectLog request flow.',
        'Escalate pricing, schedule commitments, event contracts, or unavailable venue details to the operator/client owner.'
      ],
      app_surfaces: [
        { label: 'Dink & Dine public client workspace', path: 'https://dink-and-dine-pickle-park.pages.dev/' }
      ],
      fallback: 'Capture the request and send it to the operator when the answer is not in Dink & Dine app knowledge.'
    }
  },
  'techbros-electronic-recycling-itad': {
    app_knowledge: {
      profile: 'techbros-electronic-recycling-itad-client-app',
      answer_scope: [
        'Help visitors use the Techbros Electronic Recycling & ITAD app for pickup, electronics recycling, asset disposition, data-destruction intake, and business contact routing.',
        'Keep replies inside Techbros app knowledge and Relay13/ConnectLog request flow.',
        'Escalate compliance certifications, pickup commitments, pricing, and sensitive data handling promises to the operator/client owner.'
      ],
      app_surfaces: [
        { label: 'Techbros public client workspace', path: 'https://techbros-electronic-recycling-itad.pages.dev/' }
      ],
      fallback: 'Capture the request and send it to the operator when the answer is not in Techbros app knowledge.'
    }
  },
  'arclight-pictures': {
    app_knowledge: {
      profile: 'arclight-pictures-client-app',
      answer_scope: [
        'Help visitors use the ArcLight Pictures app for production inquiries, booking interest, creative project requests, and contact routing.',
        'Keep replies inside ArcLight app knowledge and Relay13/ConnectLog request flow.',
        'Escalate pricing, contract terms, rights, production commitments, or unavailable creative details to the operator/client owner.'
      ],
      app_surfaces: [
        { label: 'ArcLight Pictures public client workspace', path: 'https://arclight-pictures.pages.dev/' }
      ],
      fallback: 'Capture the request and send it to the operator when the answer is not in ArcLight app knowledge.'
    }
  },
  'next-level-gaming-az': {
    app_knowledge: {
      profile: 'next-level-gaming-az-client-app',
      answer_scope: [
        'Help visitors use the Next Level Gaming AZ app for event interest, party bookings, tournament questions, and contact routing.',
        'Keep replies inside Next Level Gaming app knowledge and Relay13/ConnectLog request flow.',
        'Escalate pricing, schedule commitments, contract terms, or unavailable event details to the operator/client owner.'
      ],
      app_surfaces: [
        { label: 'Next Level Gaming AZ public client workspace', path: 'https://next-level-gaming-az.pages.dev/' }
      ],
      fallback: 'Capture the request and send it to the operator when the answer is not in Next Level Gaming app knowledge.'
    }
  }
};
const CLIENT_WIDGET_WORKSPACES = {
  'bobs-smoke-shop': {
    id: 'ws_bobs_smoke_shop',
    name: "Bob's Smoke Shop",
    brandName: "Bob's Smoke Shop",
    welcomeText: "Message Bob's Smoke Shop from this workspace lane. The thread stays tied to the Bob app account.",
    launcherText: "Bob's workspace chat",
    operatorName: "MetrAIyux Operator",
    primaryColor: "#64d6ff",
    accentColor: "#64d6ff",
    domains: [
      'bobs-smoke-shop.pages.dev',
      'bobs-smoke-shop-metraiyux-preview.pages.dev',
      'ef03902c.bobs-smoke-shop.pages.dev',
      'metraiyux-0s-full-system.graylondonskyes.workers.dev'
    ]
  },
  'empire-pallets': {
    id: 'ws_empire_pallets',
    name: "Empire Pallets",
    brandName: "Empire Pallets",
    welcomeText: "Message Empire Pallets from this workspace lane. The thread stays tied to the Empire Pallets app account.",
    launcherText: "Empire workspace chat",
    operatorName: "MetrAIyux Operator",
    primaryColor: "#6bbf59",
    accentColor: "#f0c35b",
    domains: [
      'empire-pallets.pages.dev',
      'd29e4aa3.empire-pallets.pages.dev'
    ]
  },
  '480-realty-property-management': {
    id: 'ws_480_realty_property_management',
    name: "480 Realty & Property Management",
    brandName: "480 Realty & Property Management",
    welcomeText: "Message 480 Realty & Property Management from this workspace lane. The thread stays tied to the 480 app account.",
    launcherText: "480 workspace chat",
    operatorName: "MetrAIyux Operator",
    primaryColor: "#f0c35b",
    accentColor: "#3aa0ff",
    domains: [
      '480-realty-property-management.pages.dev'
    ]
  },
  'dink-and-dine-pickle-park': {
    id: 'ws_dink_and_dine_pickle_park',
    name: "Dink & Dine Pickle Park",
    brandName: "Dink & Dine Pickle Park",
    welcomeText: "Message Dink & Dine from this workspace lane. The thread stays tied to the Dink & Dine app account.",
    launcherText: "Dink & Dine chat",
    operatorName: "MetrAIyux Operator",
    primaryColor: "#50ffb8",
    accentColor: "#f0c35b",
    domains: [
      'dink-and-dine-pickle-park.pages.dev'
    ]
  },
  'techbros-electronic-recycling-itad': {
    id: 'ws_techbros_electronic_recycling_itad',
    name: "Techbros Electronic Recycling & ITAD",
    brandName: "Techbros Electronic Recycling & ITAD",
    welcomeText: "Message Techbros from this workspace lane. The thread stays tied to the Techbros app account.",
    launcherText: "Techbros workspace chat",
    operatorName: "MetrAIyux Operator",
    primaryColor: "#64d6ff",
    accentColor: "#7cff9d",
    domains: [
      'techbros-electronic-recycling-itad.pages.dev'
    ]
  },
  'arclight-pictures': {
    id: 'ws_arclight_pictures',
    name: "ArcLight Pictures",
    brandName: "ArcLight Pictures",
    welcomeText: "Message ArcLight Pictures from this workspace lane. The thread stays tied to the ArcLight app account.",
    launcherText: "ArcLight workspace chat",
    operatorName: "MetrAIyux Operator",
    primaryColor: "#f0c35b",
    accentColor: "#9a6cff",
    domains: [
      'arclight-pictures.pages.dev'
    ]
  },
  'next-level-gaming-az': {
    id: 'ws_next_level_gaming_az',
    name: "Next Level Gaming AZ",
    brandName: "Next Level Gaming AZ",
    welcomeText: "Message Next Level Gaming AZ from this workspace lane. The thread stays tied to the Next Level Gaming app account.",
    launcherText: "NLG workspace chat",
    operatorName: "MetrAIyux Operator",
    primaryColor: "#9a6cff",
    accentColor: "#50ffb8",
    domains: [
      'next-level-gaming-az.pages.dev'
    ]
  }
};
const ZERO_OS_TENANT_WIDGET_WORKSPACES = {
  'fade-masters-phx': {
    id: 'ws_fade_masters_phx',
    name: 'Fade Masters PHX',
    brandName: 'Fade Masters PHX',
    welcomeText: 'Message Fade Masters PHX from this workspace lane. The thread stays tied to the Fade Masters app account.',
    launcherText: 'Fade Masters chat',
    operatorName: 'MetrAIyux Operator',
    primaryColor: '#64d6ff',
    accentColor: '#f0c35b',
    domains: [
      'fade-masters-phx.pages.dev',
      'metraiyux-0s-full-system.graylondonskyes.workers.dev'
    ]
  },
  'bobs-smoke-shop-litchfield-park': {
    id: 'ws_bobs_smoke_shop_litchfield_park',
    name: "Bob's Smoke Shop Litchfield Park",
    brandName: "Bob's Smoke Shop",
    welcomeText: "Message Bob's Smoke Shop from this workspace lane. The thread stays tied to the Bob app account.",
    launcherText: "Bob's workspace chat",
    operatorName: 'MetrAIyux Operator',
    primaryColor: '#64d6ff',
    accentColor: '#64d6ff',
    domains: [
      'bobs-smoke-shop.pages.dev',
      'bobs-smoke-shop-metraiyux-preview.pages.dev',
      'metraiyux-0s-full-system.graylondonskyes.workers.dev'
    ]
  },
  'next-level-gaming-goodyear': {
    id: 'ws_next_level_gaming_goodyear',
    name: 'Next Level Gaming Goodyear',
    brandName: 'Next Level Gaming',
    welcomeText: 'Message Next Level Gaming from this workspace lane. The thread stays tied to the Next Level Gaming app account.',
    launcherText: 'NLG workspace chat',
    operatorName: 'MetrAIyux Operator',
    primaryColor: '#9a6cff',
    accentColor: '#50ffb8',
    domains: [
      'next-level-gaming-az.pages.dev',
      'next-level-gaming-goodyear.pages.dev',
      'metraiyux-0s-full-system.graylondonskyes.workers.dev'
    ]
  },
  'as-you-wish-pottery-westgate': {
    id: 'ws_as_you_wish_pottery_westgate',
    name: 'As You Wish Pottery Westgate',
    brandName: 'As You Wish Pottery',
    welcomeText: 'Message As You Wish Pottery from this workspace lane. The thread stays tied to the Westgate app account.',
    launcherText: 'As You Wish chat',
    operatorName: 'MetrAIyux Operator',
    primaryColor: '#f0c35b',
    accentColor: '#ff8fb3',
    domains: [
      'as-you-wish-pottery-westgate.pages.dev',
      'metraiyux-0s-full-system.graylondonskyes.workers.dev'
    ]
  },
  'dental-depot-orthodontics-phoenix': {
    id: 'ws_dental_depot_orthodontics_phoenix',
    name: 'Dental Depot Orthodontics Phoenix',
    brandName: 'Dental Depot Orthodontics',
    welcomeText: 'Message Dental Depot Orthodontics from this workspace lane. The thread stays tied to the Phoenix app account.',
    launcherText: 'Dental Depot chat',
    operatorName: 'MetrAIyux Operator',
    primaryColor: '#64d6ff',
    accentColor: '#7cff9d',
    domains: [
      'dental-depot-orthodontics-phoenix.pages.dev',
      'metraiyux-0s-full-system.graylondonskyes.workers.dev'
    ]
  },
  'general-dentistry-4-kids-phoenix': {
    id: 'ws_general_dentistry_4_kids_phoenix',
    name: 'General Dentistry 4 Kids Phoenix',
    brandName: 'General Dentistry 4 Kids',
    welcomeText: 'Message General Dentistry 4 Kids from this workspace lane. The thread stays tied to the Phoenix app account.',
    launcherText: 'GD4K chat',
    operatorName: 'MetrAIyux Operator',
    primaryColor: '#50ffb8',
    accentColor: '#f0c35b',
    domains: [
      'general-dentistry-4-kids-phoenix.pages.dev',
      'metraiyux-0s-full-system.graylondonskyes.workers.dev'
    ]
  },
  'arizona-biltmore-dentistry': {
    id: 'ws_arizona_biltmore_dentistry',
    name: 'Arizona Biltmore Dentistry',
    brandName: 'Arizona Biltmore Dentistry',
    welcomeText: 'Message Arizona Biltmore Dentistry from this workspace lane. The thread stays tied to the dentistry app account.',
    launcherText: 'Biltmore Dentistry chat',
    operatorName: 'MetrAIyux Operator',
    primaryColor: '#3aa0ff',
    accentColor: '#f0c35b',
    domains: [
      'arizona-biltmore-dentistry.pages.dev',
      'metraiyux-0s-full-system.graylondonskyes.workers.dev'
    ]
  }
};
Object.assign(CLIENT_WIDGET_WORKSPACES, ZERO_OS_TENANT_WIDGET_WORKSPACES);
for (const [slug, workspace] of Object.entries(ZERO_OS_TENANT_WIDGET_WORKSPACES)) {
  if (!KNOWN_WORKSPACE_GUARDRAILS[slug]) {
    KNOWN_WORKSPACE_GUARDRAILS[slug] = { app_knowledge: clientWidgetAppKnowledge(slug, workspace) };
  }
}
const CLIENT_WIDGET_ORIGINS = new Set(Object.values(CLIENT_WIDGET_WORKSPACES).flatMap((workspace) => workspace.domains || []));

function clientWidgetAppKnowledge(slug, workspace) {
  return {
    profile: `${slug}-client-app`,
    answer_scope: [
      `Help visitors use the ${workspace.brandName || workspace.name} client app/workspace and capture the next useful request.`,
      `Keep replies inside ${workspace.brandName || workspace.name} app knowledge and the Relay13/ConnectLog request flow.`,
      'Escalate pricing, contracts, legal/medical advice, private operations, or unsupported promises to the operator/client owner.'
    ],
    app_surfaces: [
      { label: `${workspace.brandName || workspace.name} mounted 0S app`, path: `https://metraiyux-0s-full-system.graylondonskyes.workers.dev/client-app-factory/client-apps/${slug}/` }
    ],
    fallback: `Capture the request and send it to the operator when the answer is not in ${workspace.brandName || workspace.name} app knowledge.`
  };
}

function json(data, status = 200, extra = {}) { return new Response(JSON.stringify(data, null, 2), { status, headers: { ...JSON_HEADERS, ...SECURITY_HEADERS, ...extra } }); }
function nowIso() { return new Date().toISOString(); }
function uuid(prefix = '') { return `${prefix}${crypto.randomUUID()}`; }
function safeText(value, max = 2000) { return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max); }
function normalizeSlug(value) { const s = safeText(value, 80).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''); return s; }
function safeJson(value, fallback = {}) { try { const parsed = typeof value === 'string' ? JSON.parse(value || '') : value; return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback; } catch { return fallback; } }
function safeArray(value, fallback = []) { try { const parsed = typeof value === 'string' ? JSON.parse(value || '') : value; return Array.isArray(parsed) ? parsed : fallback; } catch { return fallback; } }
function cleanBool(value, fallback = false) { if (value === undefined || value === null || value === '') return fallback; return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true'; }
function cleanInt(value, fallback, min, max) { const n = Number(value); if (!Number.isFinite(n)) return fallback; return Math.min(Math.max(Math.trunc(n), min), max); }
function mergeAppKnowledge(base, override = {}) {
  return {
    ...base,
    ...override,
    answer_scope: Array.isArray(override.answer_scope) ? override.answer_scope.slice(0, 12).map((item) => safeText(item, 220)).filter(Boolean) : base.answer_scope,
    app_surfaces: Array.isArray(override.app_surfaces) ? override.app_surfaces.slice(0, 30).map((item) => ({ label: safeText(item?.label || '', 120), path: safeText(item?.path || item?.url || '', 500) })).filter((item) => item.label || item.path) : base.app_surfaces
  };
}
function cleanMetadata(value, maxKeys = 40, maxChars = 700) {
  const raw = safeJson(value, {});
  const out = {};
  for (const [key, item] of Object.entries(raw).slice(0, maxKeys)) {
    const cleanKey = safeText(key, 80).replace(/[^a-zA-Z0-9_.:-]/g, '_');
    if (!cleanKey) continue;
    if (Array.isArray(item)) out[cleanKey] = item.slice(0, 20).map((entry) => typeof entry === 'object' ? safeJson(entry, {}) : safeText(entry, maxChars));
    else if (item && typeof item === 'object') out[cleanKey] = cleanMetadata(item, 20, maxChars);
    else if (typeof item === 'boolean' || typeof item === 'number') out[cleanKey] = item;
    else out[cleanKey] = safeText(item, maxChars);
  }
  return out;
}
function randomHex(bytes = 32) { const a = new Uint8Array(bytes); crypto.getRandomValues(a); return [...a].map((b) => b.toString(16).padStart(2, '0')).join(''); }
async function sha256Hex(input) { const data = new TextEncoder().encode(input); const hash = await crypto.subtle.digest('SHA-256', data); return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
function getBearer(request) { const h = request.headers.get('authorization') || ''; return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : ''; }
function timingSafeEqual(a, b) { const aa = new TextEncoder().encode(String(a || '')); const bb = new TextEncoder().encode(String(b || '')); if (aa.length !== bb.length) return false; let out = 0; for (let i = 0; i < aa.length; i++) out |= aa[i] ^ bb[i]; return out === 0; }
function platformAdminTokens(env) {
  return [
    env.PLATFORM_ADMIN_TOKEN,
    env.RELAY13_PLATFORM_ADMIN_TOKEN,
    env.RELAY13_ADMIN_TOKEN,
    env.FOUNDER_COMMAND_RELAY13_ADMIN_TOKEN,
    env.METRAIYUX_0S_RELAY13_ADMIN_TOKEN
  ].map(value => String(value || '').trim()).filter(value => value.length >= 32);
}
function isPlatformAdmin(request, env) {
  const token = getBearer(request);
  return Boolean(token && platformAdminTokens(env).some(expected => timingSafeEqual(token, expected)));
}
function corsHeaders(env, request) {
  const origin = request.headers.get('origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((x) => x.trim()).filter(Boolean);
  const originHost = requestHost(origin);
  if (originHost && CLIENT_WIDGET_ORIGINS.has(originHost)) return { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'content-type, authorization, x-relay13-api-key', vary: 'Origin' };
  if (allowed.length === 0 || allowed.includes(origin)) return { 'access-control-allow-origin': origin || '*', 'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS', 'access-control-allow-headers': 'content-type, authorization, x-relay13-api-key', vary: 'Origin' };
  return {};
}
function requireAdmin(request, env) { return isPlatformAdmin(request, env) ? { ok: true, admin: true } : { ok: false, response: json({ ok: false, error: 'Unauthorized' }, 401, corsHeaders(env, request)) }; }
async function readJson(request) {
  const size = Number(request.headers.get('content-length') || 0);
  if (size > MAX_JSON_BYTES) throw new Response(JSON.stringify({ ok: false, error: 'Payload too large' }), { status: 413, headers: JSON_HEADERS });
  const ct = request.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return {};
  return await request.json().catch(() => ({}));
}
function requestHost(value) { try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } }
function requestDomain(request) { return requestHost(request.headers.get('origin') || '') || requestHost(request.headers.get('referer') || ''); }
function isLocalDomain(domain) { return domain === 'localhost' || domain === '127.0.0.1' || domain.endsWith('.localhost'); }
async function audit(env, { workspaceId = null, actorType = 'system', actorId = null, eventType, body = '', metadata = {} }) {
  await env.DB.prepare(`INSERT INTO audit_events (id, workspace_id, actor_type, actor_id, event_type, body, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(uuid('evt_'), workspaceId, actorType, actorId, eventType, safeText(body, 1000), JSON.stringify(metadata), nowIso()).run();
}
async function securityEvent(env, request, { workspaceId = null, eventType, reason }) {
  await env.DB.prepare(`INSERT INTO security_events (id, workspace_id, event_type, reason, origin, ip_hint, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(uuid('sec_'), workspaceId, eventType, safeText(reason, 500), safeText(request.headers.get('origin') || request.headers.get('referer') || '', 500), safeText(request.headers.get('cf-connecting-ip') || '', 64), nowIso()).run();
}
function olderThanMinutes(iso, minutes) { if (!iso) return true; const t = new Date(iso).getTime(); return Number.isNaN(t) || Date.now() - t > minutes * 60 * 1000; }
async function workspaceById(env, workspaceId) { return await env.DB.prepare(`SELECT * FROM workspaces WHERE id = ? AND status = 'active'`).bind(workspaceId).first(); }
async function validateWorkspaceDomain(env, request, workspaceId) {
  const domain = requestDomain(request);
  if (!domain || isLocalDomain(domain)) return { ok: true, domain };
  const activeCount = await env.DB.prepare(`SELECT COUNT(*) AS count FROM workspace_domains WHERE workspace_id = ? AND status = 'active'`).bind(workspaceId).first();
  if (Number(activeCount?.count || 0) === 0) return { ok: true, domain, unenforced: true };
  const row = await env.DB.prepare(`SELECT id FROM workspace_domains WHERE workspace_id = ? AND domain = ? AND status = 'active' LIMIT 1`).bind(workspaceId, domain).first();
  if (row?.id) return { ok: true, domain };
  await securityEvent(env, request, { workspaceId, eventType: 'domain.denied', reason: `Origin domain not allowlisted: ${domain}` });
  return { ok: false, domain, error: 'Domain is not allowed for this workspace widget' };
}
async function verifyApiKey(request, env, requiredScope = '') {
  const raw = request.headers.get('x-relay13-api-key') || getBearer(request);
  if (!raw) return { ok: false, error: 'Missing API key' };
  if (!raw.startsWith('r13_')) return { ok: false, error: 'Invalid API key format' };
  const keyHash = await sha256Hex(raw);
  const row = await env.DB.prepare(`SELECT id, workspace_id, name, key_prefix, scopes_json, status, last_used_at, expires_at FROM api_keys WHERE key_hash = ? AND status = 'active' LIMIT 1`).bind(keyHash).first();
  if (!row) return { ok: false, error: 'Invalid or revoked API key' };
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return { ok: false, error: 'Expired API key' };
  const scopes = JSON.parse(row.scopes_json || '[]');
  if (requiredScope && !scopes.includes(requiredScope) && !scopes.includes('workspace:admin')) return { ok: false, error: `Missing required scope: ${requiredScope}` };
  if (olderThanMinutes(row.last_used_at, 15)) await env.DB.prepare(`UPDATE api_keys SET last_used_at = ? WHERE id = ?`).bind(nowIso(), row.id).run();
  return { ok: true, apiKeyId: row.id, workspaceId: row.workspace_id, scopes };
}
async function ensureBootstrapWorkspace(env) {
  const slug = normalizeSlug(env.BOOTSTRAP_WORKSPACE_SLUG || 'relay13-default') || 'relay13-default';
  let workspace = await env.DB.prepare(`SELECT * FROM workspaces WHERE slug = ?`).bind(slug).first();
  if (workspace) return workspace;
  const id = uuid('ws_'); const name = safeText(env.BOOTSTRAP_WORKSPACE_NAME || 'Relay13', 160); const t = nowIso();
  await env.DB.prepare(`INSERT INTO workspaces (id, slug, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`).bind(id, slug, name, t, t).run();
  await env.DB.prepare(`INSERT INTO widget_configs (id, workspace_id, version, status, brand_name, welcome_text, launcher_text, operator_name, primary_color, accent_color, created_at, published_at) VALUES (?, ?, 1, 'published', ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(uuid('cfg_'), id, name, 'Send us a message. We will reply here.', 'Message us', `${name} Operator`, '#f6c85f', '#9a6cff', t, t).run();
  await ensureWorkspaceGuardrails(env, { id, slug, name });
  await audit(env, { workspaceId: id, eventType: 'workspace.bootstrap', body: `Bootstrap workspace created: ${name}` });
  return await env.DB.prepare(`SELECT * FROM workspaces WHERE id = ?`).bind(id).first();
}
async function ensureClientWidgetWorkspace(env, slug) {
  const config = CLIENT_WIDGET_WORKSPACES[normalizeSlug(slug)];
  if (!config) return null;
  const t = nowIso();
  await env.DB.prepare(`INSERT INTO workspaces (id, slug, name, status, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?) ON CONFLICT(slug) DO UPDATE SET name = excluded.name, status = 'active', updated_at = excluded.updated_at`)
    .bind(config.id, slug, config.name, t, t).run();
  const workspace = await env.DB.prepare(`SELECT * FROM workspaces WHERE slug = ? AND status = 'active' LIMIT 1`).bind(slug).first();
  if (!workspace?.id) return null;
  await env.DB.prepare(`INSERT INTO widget_configs (id, workspace_id, version, status, brand_name, welcome_text, launcher_text, operator_name, primary_color, accent_color, settings_json, created_at, published_at) VALUES (?, ?, 1, 'published', ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(workspace_id, version) DO UPDATE SET status = 'published', brand_name = excluded.brand_name, welcome_text = excluded.welcome_text, launcher_text = excluded.launcher_text, operator_name = excluded.operator_name, primary_color = excluded.primary_color, accent_color = excluded.accent_color, settings_json = excluded.settings_json, published_at = excluded.published_at`)
    .bind(`cfg_${slug.replace(/-/g, '_')}_widget_v1`, workspace.id, config.brandName, config.welcomeText, config.launcherText, config.operatorName, config.primaryColor, config.accentColor, JSON.stringify({ source: 'known-client-widget-auto-provision', disclaimer: 'Messages are tied to this workspace account.' }), t, t).run();
  for (const domain of config.domains || []) {
    await env.DB.prepare(`INSERT INTO workspace_domains (id, workspace_id, domain, status, created_at) VALUES (?, ?, ?, 'active', ?) ON CONFLICT(workspace_id, domain) DO UPDATE SET status = 'active'`)
      .bind(`dom_${workspace.id}_${domain.replace(/[^a-z0-9]+/g, '_')}`, workspace.id, domain, t).run();
  }
  await ensureWorkspaceGuardrails(env, workspace);
  await audit(env, { workspaceId: workspace.id, eventType: 'workspace.client_widget.ensure', body: slug, metadata: { domains: config.domains || [] } });
  return workspace;
}
async function listWorkspaces(request, env) {
  const admin = requireAdmin(request, env); if (!admin.ok) return admin.response;
  const rows = await env.DB.prepare(`SELECT id, slug, name, status, monthly_conversation_limit, monthly_message_limit, max_message_chars, created_at, updated_at FROM workspaces ORDER BY created_at DESC LIMIT 100`).all();
  return json({ ok: true, workspaces: rows.results || [] }, 200, corsHeaders(env, request));
}
async function createWorkspace(request, env) {
  const admin = requireAdmin(request, env); if (!admin.ok) return admin.response;
  const input = await readJson(request); const id = uuid('ws_'); const slug = normalizeSlug(input.slug || input.name) || `workspace-${Date.now()}`; const name = safeText(input.name || slug, 160); const t = nowIso();
  await env.DB.prepare(`INSERT INTO workspaces (id, slug, name, monthly_conversation_limit, monthly_message_limit, max_message_chars, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, slug, name, Number(input.monthly_conversation_limit || 5000), Number(input.monthly_message_limit || 50000), Math.min(Math.max(Number(input.max_message_chars || DEFAULT_MAX_MESSAGE_CHARS), 500), 4000), t, t).run();
  await env.DB.prepare(`INSERT INTO widget_configs (id, workspace_id, version, status, brand_name, welcome_text, launcher_text, operator_name, primary_color, accent_color, logo_url, created_at, published_at) VALUES (?, ?, 1, 'published', ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(uuid('cfg_'), id, name, safeText(input.welcome_text || 'Send us a message. We will reply here.', 300), safeText(input.launcher_text || 'Message us', 80), safeText(input.operator_name || `${name} Operator`, 120), safeText(input.primary_color || '#f6c85f', 24), safeText(input.accent_color || '#9a6cff', 24), safeText(input.logo_url || '', 500), t, t).run();
  await ensureWorkspaceGuardrails(env, { id, slug, name });
  await audit(env, { workspaceId: id, actorType: 'admin', eventType: 'workspace.create', body: name });
  return json({ ok: true, workspace: { id, slug, name, status: 'active' } }, 201, corsHeaders(env, request));
}
async function listWorkspaceDomains(request, env) {
  const admin = requireAdmin(request, env); if (!admin.ok) return admin.response;
  const workspaceId = safeText(new URL(request.url).searchParams.get('workspace_id') || '', 100);
  if (!workspaceId) return json({ ok: false, error: 'workspace_id required' }, 400, corsHeaders(env, request));
  const rows = await env.DB.prepare(`SELECT id, workspace_id, domain, status, created_at FROM workspace_domains WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100`).bind(workspaceId).all();
  return json({ ok: true, domains: rows.results || [] }, 200, corsHeaders(env, request));
}
async function createWorkspaceDomain(request, env) {
  const admin = requireAdmin(request, env); if (!admin.ok) return admin.response;
  const input = await readJson(request); const workspaceId = safeText(input.workspace_id || '', 100); const domain = requestHost(`https://${safeText(input.domain || '', 240).replace(/^https?:\/\//, '')}`);
  if (!workspaceId || !domain) return json({ ok: false, error: 'workspace_id and domain required' }, 400, corsHeaders(env, request));
  const workspace = await workspaceById(env, workspaceId); if (!workspace) return json({ ok: false, error: 'Workspace not found' }, 404, corsHeaders(env, request));
  const id = uuid('dom_'); const t = nowIso();
  await env.DB.prepare(`INSERT INTO workspace_domains (id, workspace_id, domain, status, created_at) VALUES (?, ?, ?, 'active', ?) ON CONFLICT(workspace_id, domain) DO UPDATE SET status = 'active'`).bind(id, workspaceId, domain, t).run();
  await audit(env, { workspaceId, actorType: 'admin', eventType: 'workspace_domain.add', body: domain });
  return json({ ok: true, domain: { id, workspace_id: workspaceId, domain, status: 'active' } }, 201, corsHeaders(env, request));
}
async function getWidgetConfigBySlug(env, slug) {
  return await env.DB.prepare(`SELECT w.id AS workspace_id, w.slug, w.name, c.version, c.brand_name, c.welcome_text, c.launcher_text, c.operator_name, c.primary_color, c.accent_color, c.logo_url, c.settings_json FROM workspaces w JOIN widget_configs c ON c.workspace_id = w.id WHERE w.slug = ? AND w.status = 'active' AND c.status = 'published' ORDER BY c.version DESC LIMIT 1`).bind(slug).first();
}
async function getWidgetConfig(request, env) {
  const slug = normalizeSlug(new URL(request.url).searchParams.get('workspace') || '');
  if (!slug) return json({ ok: false, error: 'workspace is required' }, 400, corsHeaders(env, request));
  let row = await getWidgetConfigBySlug(env, slug);
  if (!row && CLIENT_WIDGET_WORKSPACES[slug]) {
    await ensureClientWidgetWorkspace(env, slug);
    row = await getWidgetConfigBySlug(env, slug);
  }
  if (!row) return json({ ok: false, error: 'Workspace widget config not found' }, 404, corsHeaders(env, request));
  const domainCheck = await validateWorkspaceDomain(env, request, row.workspace_id);
  if (!domainCheck.ok) return json({ ok: false, error: domainCheck.error }, 403, corsHeaders(env, request));
  const guardrails = await ensureWorkspaceGuardrails(env, { id: row.workspace_id, slug: row.slug, name: row.name });
  return json({ ok: true, config: row, guardrails: publicGuardrailPolicy(guardrails) }, 200, corsHeaders(env, request));
}
async function createApiKey(request, env) {
  const admin = requireAdmin(request, env); if (!admin.ok) return admin.response;
  const input = await readJson(request); const workspaceId = safeText(input.workspace_id, 100); const workspace = await workspaceById(env, workspaceId);
  if (!workspace) return json({ ok: false, error: 'Workspace not found' }, 404, corsHeaders(env, request));
  const scopes = Array.isArray(input.scopes) ? input.scopes.filter((s) => SCOPES.has(s)) : ['conversations:create','conversations:read','messages:read','messages:write','widget:read'];
  const rawKey = `r13_live_${randomHex(32)}`; const keyHash = await sha256Hex(rawKey); const keyPrefix = rawKey.slice(0, 20); const id = uuid('key_'); const t = nowIso();
  await env.DB.prepare(`INSERT INTO api_keys (id, workspace_id, name, key_prefix, key_hash, scopes_json, status, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`)
    .bind(id, workspaceId, safeText(input.name || 'API key', 120), keyPrefix, keyHash, JSON.stringify(scopes), t, safeText(input.expires_at || '', 80) || null).run();
  await audit(env, { workspaceId, actorType: 'admin', actorId: id, eventType: 'api_key.create', body: safeText(input.name || 'API key', 120), metadata: { key_prefix: keyPrefix, scopes } });
  return json({ ok: true, api_key: { id, key: rawKey, key_prefix: keyPrefix, scopes, warning: 'Copy this key now. It is not stored raw and will not be shown again.' } }, 201, corsHeaders(env, request));
}
async function listApiKeys(request, env) {
  const admin = requireAdmin(request, env); if (!admin.ok) return admin.response;
  const workspaceId = safeText(new URL(request.url).searchParams.get('workspace_id') || '', 100);
  if (!workspaceId) return json({ ok: false, error: 'workspace_id required' }, 400, corsHeaders(env, request));
  const rows = await env.DB.prepare(`SELECT id, workspace_id, name, key_prefix, scopes_json, status, created_at, last_used_at, expires_at, revoked_at FROM api_keys WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100`).bind(workspaceId).all();
  return json({ ok: true, api_keys: rows.results || [] }, 200, corsHeaders(env, request));
}
async function revokeApiKey(request, env, keyId) {
  const admin = requireAdmin(request, env); if (!admin.ok) return admin.response;
  const t = nowIso(); const row = await env.DB.prepare(`SELECT workspace_id FROM api_keys WHERE id = ?`).bind(keyId).first();
  await env.DB.prepare(`UPDATE api_keys SET status = 'revoked', revoked_at = ? WHERE id = ?`).bind(t, keyId).run();
  await audit(env, { workspaceId: row?.workspace_id || null, actorType: 'admin', actorId: keyId, eventType: 'api_key.revoke', body: keyId });
  return json({ ok: true, revoked_at: t }, 200, corsHeaders(env, request));
}
async function monthlyCount(env, table, workspaceId) {
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0,0,0,0);
  const sql = table === 'messages' ? `SELECT COUNT(*) AS count FROM messages WHERE workspace_id = ? AND created_at >= ?` : `SELECT COUNT(*) AS count FROM conversations WHERE workspace_id = ? AND created_at >= ?`;
  const row = await env.DB.prepare(sql).bind(workspaceId, monthStart.toISOString()).first();
  return Number(row?.count || 0);
}
async function enforceWorkspaceLimits(env, workspace, type) {
  if (type === 'conversation' && await monthlyCount(env, 'conversations', workspace.id) >= workspace.monthly_conversation_limit) return { ok: false, error: 'Workspace monthly conversation limit reached' };
  if (type === 'message' && await monthlyCount(env, 'messages', workspace.id) >= workspace.monthly_message_limit) return { ok: false, error: 'Workspace monthly message limit reached' };
  return { ok: true };
}

async function ensureGuardrailSchema(env) {
  if (!env.DB) throw new Error('D1 binding missing');
  if (!guardrailSchemaReady) {
    guardrailSchemaReady = env.DB.batch([
      env.DB.prepare(`CREATE TABLE IF NOT EXISTS workspace_guardrails (workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused')), ai_mode TEXT NOT NULL DEFAULT 'draft_only' CHECK(ai_mode IN ('off','draft_only','auto_reply')), allow_ai_auto_reply INTEGER NOT NULL DEFAULT 0 CHECK(allow_ai_auto_reply IN (0,1)), allow_web_search INTEGER NOT NULL DEFAULT 0 CHECK(allow_web_search IN (0,1)), allow_file_search INTEGER NOT NULL DEFAULT 0 CHECK(allow_file_search IN (0,1)), max_ai_input_tokens INTEGER NOT NULL DEFAULT 8000, max_ai_output_tokens INTEGER NOT NULL DEFAULT 700, monthly_ai_reply_limit INTEGER NOT NULL DEFAULT 1000, per_ip_message_window_minutes INTEGER NOT NULL DEFAULT 10, per_ip_message_limit INTEGER NOT NULL DEFAULT 24, per_ip_conversation_limit INTEGER NOT NULL DEFAULT 8, max_links_per_message INTEGER NOT NULL DEFAULT 2, blocked_terms_json TEXT NOT NULL DEFAULT '[]', app_knowledge_json TEXT NOT NULL DEFAULT '{}', escalation_rules_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`)
      , env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_workspace_guardrails_status ON workspace_guardrails(status, ai_mode)`)
      , env.DB.prepare(`CREATE TABLE IF NOT EXISTS guardrail_events (id TEXT PRIMARY KEY, workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL, conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL, event_type TEXT NOT NULL, severity TEXT NOT NULL DEFAULT 'info' CHECK(severity IN ('info','low','medium','high')), decision TEXT NOT NULL DEFAULT 'allow' CHECK(decision IN ('allow','review','block')), reason TEXT NOT NULL, origin TEXT, ip_hash TEXT, message_hash TEXT, route TEXT, metadata_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`)
      , env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_guardrail_events_workspace_created ON guardrail_events(workspace_id, created_at DESC)`)
      , env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_guardrail_events_workspace_decision_created ON guardrail_events(workspace_id, decision, created_at DESC)`)
      , env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_guardrail_events_workspace_ip_created ON guardrail_events(workspace_id, ip_hash, created_at DESC)`)
      , env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_guardrail_events_workspace_type_created ON guardrail_events(workspace_id, event_type, created_at DESC)`)
      , env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_guardrail_events_conversation_created ON guardrail_events(conversation_id, created_at DESC)`)
      , env.DB.prepare(`CREATE TABLE IF NOT EXISTS ai_usage_ledger (id TEXT PRIMARY KEY, workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL, conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL, message_id TEXT REFERENCES messages(id) ON DELETE SET NULL, account_code TEXT, model TEXT NOT NULL, ai_mode TEXT NOT NULL DEFAULT 'draft_only', status TEXT NOT NULL DEFAULT 'recorded' CHECK(status IN ('recorded','blocked','drafted','sent','failed')), input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0, estimated_cost_usd REAL NOT NULL DEFAULT 0, metadata_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))`)
      , env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_ai_usage_workspace_created ON ai_usage_ledger(workspace_id, created_at DESC)`)
      , env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_ai_usage_workspace_status_created ON ai_usage_ledger(workspace_id, status, created_at DESC)`)
      , env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_ai_usage_conversation_created ON ai_usage_ledger(conversation_id, created_at DESC)`)
    ]).catch((error) => {
      guardrailSchemaReady = null;
      throw error;
    });
  }
  await guardrailSchemaReady;
}

function defaultGuardrailInputForWorkspace(workspace = {}) {
  const known = KNOWN_WORKSPACE_GUARDRAILS[workspace.slug] || {};
  return {
    ...DEFAULT_GUARDRAIL_POLICY,
    ...known,
    app_knowledge: mergeAppKnowledge(DEFAULT_GUARDRAIL_POLICY.app_knowledge, known.app_knowledge || {})
  };
}
function normalizeGuardrailPolicy(row = {}, workspace = {}) {
  const defaults = defaultGuardrailInputForWorkspace(workspace);
  const rowKnowledge = safeJson(row.app_knowledge_json, {});
  const rowEscalation = safeJson(row.escalation_rules_json, {});
  const mode = GUARDRAIL_AI_MODES.has(row.ai_mode) ? row.ai_mode : defaults.ai_mode;
  const allowAutoReply = cleanBool(row.allow_ai_auto_reply, defaults.allow_ai_auto_reply) && mode === 'auto_reply';
  return {
    workspace_id: workspace.id || row.workspace_id || '',
    workspace_slug: workspace.slug || '',
    status: row.status === 'paused' ? 'paused' : 'active',
    ai_mode: mode,
    allow_ai_auto_reply: allowAutoReply,
    allow_web_search: false,
    allow_file_search: cleanBool(row.allow_file_search, defaults.allow_file_search),
    max_ai_input_tokens: cleanInt(row.max_ai_input_tokens, defaults.max_ai_input_tokens, 500, 50000),
    max_ai_output_tokens: cleanInt(row.max_ai_output_tokens, defaults.max_ai_output_tokens, 80, 4000),
    monthly_ai_reply_limit: cleanInt(row.monthly_ai_reply_limit, defaults.monthly_ai_reply_limit, 0, 1000000),
    per_ip_message_window_minutes: cleanInt(row.per_ip_message_window_minutes, defaults.per_ip_message_window_minutes, 1, 120),
    per_ip_message_limit: cleanInt(row.per_ip_message_limit, defaults.per_ip_message_limit, 3, 1000),
    per_ip_conversation_limit: cleanInt(row.per_ip_conversation_limit, defaults.per_ip_conversation_limit, 1, 300),
    max_links_per_message: cleanInt(row.max_links_per_message, defaults.max_links_per_message, 0, 10),
    blocked_terms: safeArray(row.blocked_terms_json, defaults.blocked_terms).slice(0, 80).map((item) => safeText(item, 120).toLowerCase()).filter(Boolean),
    escalation_rules: { ...defaults.escalation_rules, ...rowEscalation },
    app_knowledge: mergeAppKnowledge(defaults.app_knowledge, rowKnowledge)
  };
}
async function ensureWorkspaceGuardrails(env, workspace) {
  try {
    await ensureGuardrailSchema(env);
    let row = await env.DB.prepare(`SELECT * FROM workspace_guardrails WHERE workspace_id = ? LIMIT 1`).bind(workspace.id).first();
    if (!row) {
      const defaults = defaultGuardrailInputForWorkspace(workspace);
      const t = nowIso();
      await env.DB.prepare(`INSERT OR IGNORE INTO workspace_guardrails (workspace_id, status, ai_mode, allow_ai_auto_reply, allow_web_search, allow_file_search, max_ai_input_tokens, max_ai_output_tokens, monthly_ai_reply_limit, per_ip_message_window_minutes, per_ip_message_limit, per_ip_conversation_limit, max_links_per_message, blocked_terms_json, app_knowledge_json, escalation_rules_json, created_at, updated_at) VALUES (?, 'active', ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(workspace.id, defaults.ai_mode, defaults.allow_ai_auto_reply ? 1 : 0, defaults.allow_file_search ? 1 : 0, defaults.max_ai_input_tokens, defaults.max_ai_output_tokens, defaults.monthly_ai_reply_limit, defaults.per_ip_message_window_minutes, defaults.per_ip_message_limit, defaults.per_ip_conversation_limit, defaults.max_links_per_message, JSON.stringify(defaults.blocked_terms || []), JSON.stringify(defaults.app_knowledge || {}), JSON.stringify(defaults.escalation_rules || {}), t, t).run();
      row = await env.DB.prepare(`SELECT * FROM workspace_guardrails WHERE workspace_id = ? LIMIT 1`).bind(workspace.id).first();
    }
    return normalizeGuardrailPolicy(row || {}, workspace);
  } catch (error) {
    return { ...normalizeGuardrailPolicy({}, workspace), storage_warning: safeText(error.message || 'guardrail table unavailable', 180) };
  }
}
function publicAppKnowledge(knowledge = {}) {
  const { billing: _billing, ...safeKnowledge } = knowledge || {};
  return safeKnowledge;
}
function publicGuardrailPolicy(policy) {
  return {
    workspace_id: policy.workspace_id,
    workspace_slug: policy.workspace_slug,
    status: policy.status,
    ai_mode: policy.ai_mode,
    allow_ai_auto_reply: policy.allow_ai_auto_reply,
    allow_web_search: false,
    allow_file_search: policy.allow_file_search,
    max_ai_input_tokens: policy.max_ai_input_tokens,
    max_ai_output_tokens: policy.max_ai_output_tokens,
    monthly_ai_reply_limit: policy.monthly_ai_reply_limit,
    rate_limits: {
      window_minutes: policy.per_ip_message_window_minutes,
      messages_per_window: policy.per_ip_message_limit,
      conversations_per_window: policy.per_ip_conversation_limit
    },
    app_knowledge: publicAppKnowledge(policy.app_knowledge),
    escalation_rules: policy.escalation_rules,
    response_orchestration: responseOrchestrationMetadata(policy),
    storage_warning: policy.storage_warning || null
  };
}
function responseOrchestrationMetadata(policy = {}) {
  const paidAddonActive = policy.app_knowledge?.billing?.relay13_ai_addon_active === true;
  const aiBudgetUnlocked = paidAddonActive && policy.ai_mode !== 'off' && Number(policy.monthly_ai_reply_limit || 0) > 0;
  return {
    ...RESPONSE_ORCHESTRATION_POLICY,
    local_brain_active: true,
    ai_addon_active: paidAddonActive,
    ai_provider_calls_allowed: aiBudgetUnlocked,
    configured_ai_mode: policy.ai_mode || 'off',
    configured_monthly_ai_reply_limit: Number(policy.monthly_ai_reply_limit || 0),
    configured_auto_reply_allowed: Boolean(policy.allow_ai_auto_reply)
  };
}
function aiPolicyMetadata(policy) {
  const paidAddonActive = policy.app_knowledge?.billing?.relay13_ai_addon_active === true;
  const aiProviderCallsAllowed = paidAddonActive && policy.ai_mode !== 'off' && Number(policy.monthly_ai_reply_limit || 0) > 0;
  return {
    mode: policy.ai_mode,
    auto_reply_allowed: policy.allow_ai_auto_reply,
    web_search_allowed: false,
    file_search_allowed: policy.allow_file_search,
    answer_source: 'customer_app_knowledge_only',
    local_brain_first: RESPONSE_ORCHESTRATION_POLICY.local_brain_first,
    ai_requires_paid_addon: RESPONSE_ORCHESTRATION_POLICY.ai_requires_paid_addon,
    paid_addon_offer_id: RESPONSE_ORCHESTRATION_POLICY.paid_addon_offer_id,
    ai_addon_active: paidAddonActive,
    ai_provider_calls_allowed: aiProviderCallsAllowed,
    overflow_policy: RESPONSE_ORCHESTRATION_POLICY.overflow_policy,
    max_input_tokens: policy.max_ai_input_tokens,
    max_output_tokens: policy.max_ai_output_tokens,
    monthly_reply_limit: policy.monthly_ai_reply_limit,
    app_knowledge_profile: policy.app_knowledge?.profile || 'customer-app-knowledge'
  };
}
function routeFromMetadata(metadata = {}, input = {}) {
  return safeText(input.route || metadata.route || metadata.route_label || '', 80).toLowerCase();
}
function guardrailSignals(body, policy, route = '') {
  const text = String(body || '');
  const lower = text.toLowerCase();
  const signals = [];
  const linkCount = (text.match(/https?:\/\/|www\./gi) || []).length;
  if (linkCount > policy.max_links_per_message) signals.push('too_many_links');
  if (/<\/?script|javascript:|data:text\/html|onerror\s*=|onload\s*=/i.test(text)) signals.push('active_content_payload');
  if (/(ignore|forget|override).{0,40}(previous|all|system|developer|instructions|rules)/i.test(text)) signals.push('prompt_injection');
  if (/(system prompt|developer message|hidden instructions|reveal.*instructions|show.*instructions|jailbreak)/i.test(text)) signals.push('prompt_extraction');
  if (/(api[_ -]?key|openai[_ -]?api[_ -]?key|platform[_ -]?admin[_ -]?token|bearer token|secret|\.env|private key)/i.test(text)) signals.push('secret_request');
  if (/(drop table|truncate table|delete from|rm -rf|curl .*(token|secret)|fetch .*(token|secret))/i.test(text)) signals.push('destructive_or_exfiltration_request');
  if (/(.)\1{80,}/.test(text) || /\b(\w+)(?:\s+\1){18,}\b/i.test(text)) signals.push('spam_repetition');
  for (const term of policy.blocked_terms || []) if (term && lower.includes(term)) signals.push(`blocked_term:${term.slice(0, 32)}`);
  if (/web search|search the web|google it|look up online|latest news/i.test(text)) signals.push('web_search_requested');
  if (route.includes('direct')) signals.push('direct_operator_route');
  return signals;
}
async function guardrailFingerprint(request, fallback = {}) {
  const ip = safeText(fallback.ip || request?.headers?.get?.('cf-connecting-ip') || request?.headers?.get?.('x-forwarded-for') || '', 128);
  const ua = safeText(fallback.ua || request?.headers?.get?.('user-agent') || '', 240);
  const origin = safeText(fallback.origin || request?.headers?.get?.('origin') || request?.headers?.get?.('referer') || '', 500);
  return await sha256Hex(`${ip}|${ua}|${origin}` || randomHex(8));
}
async function guardrailRecentCount(env, workspaceId, ipHash, type, minutes) {
  await ensureGuardrailSchema(env);
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  const sql = type === 'conversation'
    ? `SELECT COUNT(*) AS count FROM guardrail_events WHERE workspace_id = ? AND ip_hash = ? AND event_type = 'conversation.allowed' AND created_at >= ?`
    : `SELECT COUNT(*) AS count FROM guardrail_events WHERE workspace_id = ? AND ip_hash = ? AND event_type IN ('conversation.allowed','message.allowed','websocket.allowed') AND created_at >= ?`;
  const row = await env.DB.prepare(sql).bind(workspaceId, ipHash, since).first();
  return Number(row?.count || 0);
}
async function recordGuardrailEvent(env, request, { workspaceId, conversationId = null, eventType, decision, reason, severity = 'info', route = '', body = '', metadata = {}, network = {} }) {
  try {
    await ensureGuardrailSchema(env);
    const ipHash = await guardrailFingerprint(request, network);
    const messageHash = body ? await sha256Hex(safeText(body, 4000).toLowerCase()) : '';
    await env.DB.prepare(`INSERT INTO guardrail_events (id, workspace_id, conversation_id, event_type, severity, decision, reason, origin, ip_hash, message_hash, route, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(uuid('gr_'), workspaceId || null, conversationId || null, safeText(eventType, 100), safeText(severity, 20), safeText(decision, 20), safeText(reason, 500), safeText(network.origin || request?.headers?.get?.('origin') || request?.headers?.get?.('referer') || '', 500), ipHash, messageHash, safeText(route, 80), JSON.stringify(cleanMetadata(metadata, 30, 400)), nowIso()).run();
  } catch (_) {}
}
async function evaluateInboundGuardrails(env, request, { workspace, conversationId = null, body = '', metadata = {}, input = {}, eventType = 'message', network = {} }) {
  const policy = await ensureWorkspaceGuardrails(env, workspace);
  const route = routeFromMetadata(metadata, input);
  const ipHash = await guardrailFingerprint(request, network);
  const rateType = eventType === 'conversation' ? 'conversation' : 'message';
  let recent = 0;
  try { recent = await guardrailRecentCount(env, workspace.id, ipHash, rateType, policy.per_ip_message_window_minutes); } catch (_) {}
  const signals = guardrailSignals(body, policy, route);
  let decision = 'allow';
  let severity = 'info';
  let reason = 'allowed';
  if (policy.status === 'paused') {
    decision = 'block'; severity = 'high'; reason = 'workspace_guardrails_paused';
  } else if (rateType === 'conversation' && recent >= policy.per_ip_conversation_limit) {
    decision = 'block'; severity = 'medium'; reason = 'conversation_rate_limit';
  } else if (rateType === 'message' && recent >= policy.per_ip_message_limit) {
    decision = 'block'; severity = 'medium'; reason = 'message_rate_limit';
  } else if (signals.some((signal) => ['active_content_payload','prompt_injection','prompt_extraction','secret_request','destructive_or_exfiltration_request','spam_repetition'].includes(signal) || signal.startsWith('blocked_term:'))) {
    decision = 'block'; severity = 'high'; reason = 'abuse_or_prompt_attack';
  } else if (signals.includes('direct_operator_route') || signals.includes('web_search_requested')) {
    decision = 'review'; severity = 'low'; reason = signals.includes('direct_operator_route') ? 'direct_operator_route' : 'web_search_disabled';
  }
  const result = { ok: decision !== 'block', decision, severity, reason, signals, route, policy: publicGuardrailPolicy(policy), ai_policy: aiPolicyMetadata(policy), response_orchestration: responseOrchestrationMetadata(policy) };
  await recordGuardrailEvent(env, request, { workspaceId: workspace.id, conversationId, eventType: `${eventType}.${decision === 'allow' || decision === 'review' ? 'allowed' : 'blocked'}`, decision, reason, severity, route, body, metadata: { signals, account_code: metadata.account_code || '', source_app: metadata.source_app || '' }, network });
  return result;
}


function normalizeStringList(value, maxItems = 20, maxChars = 80) {
  const raw = Array.isArray(value) ? value : String(value || '').split(',');
  const out = [];
  for (const item of raw) {
    const clean = safeText(item, maxChars);
    if (clean && !out.includes(clean)) out.push(clean);
    if (out.length >= maxItems) break;
  }
  return out;
}

function extractConnectLogBridge(input = {}) {
  const enabled = Boolean(input.connectlog_bridge || input.connectlog_card_id || input.connectlog_card_label || input.connectlog_welcome_message);
  if (!enabled) return { enabled: false, metadata: {} };
  const cardId = safeText(input.connectlog_card_id || input.card_id || '', 120);
  const cardLabel = safeText(input.connectlog_card_label || input.card_label || '', 180);
  const campaign = safeText(input.connectlog_campaign || input.campaign || '', 180);
  const ownerName = safeText(input.connectlog_owner_name || input.owner_name || '', 140);
  const ownerCompany = safeText(input.connectlog_owner_company || input.owner_company || input.company || '', 180);
  const ownerRole = safeText(input.connectlog_owner_role || input.owner_role || input.role || '', 180);
  const welcomeMessage = safeText(input.connectlog_welcome_message || input.welcome_message || '', DEFAULT_MAX_MESSAGE_CHARS);
  const tags = normalizeStringList(input.connectlog_tags || input.tags, 18, 50);
  return {
    enabled: true,
    cardId,
    cardLabel,
    campaign,
    ownerName,
    ownerCompany,
    ownerRole,
    welcomeMessage,
    tags,
    metadata: {
      bridge: 'connectlog',
      connectlog_card_id: cardId,
      connectlog_card_label: cardLabel,
      connectlog_campaign: campaign,
      connectlog_owner_name: ownerName,
      connectlog_owner_company: ownerCompany,
      connectlog_owner_role: ownerRole,
      connectlog_tags: tags
    }
  };
}

async function upsertConnectLogCard(env, workspaceId, input, connectLog, conversationId = '') {
  if (!connectLog.enabled || !connectLog.cardId) return null;
  const existing = await env.DB.prepare(`SELECT id FROM connectlog_cards WHERE workspace_id = ? AND connectlog_card_id = ?`).bind(workspaceId, connectLog.cardId).first();
  const id = existing?.id || uuid('clcard_');
  const t = nowIso();
  const values = [
    connectLog.cardLabel || safeText(input.subject || 'ConnectLog card', 180),
    connectLog.campaign,
    connectLog.ownerName,
    connectLog.ownerCompany,
    connectLog.ownerRole,
    connectLog.welcomeMessage,
    JSON.stringify(connectLog.tags || []),
    conversationId || null,
    t
  ];
  if (existing?.id) {
    await env.DB.prepare(`UPDATE connectlog_cards SET card_label = ?, campaign = ?, owner_name = ?, owner_company = ?, owner_role = ?, welcome_message = ?, tags_json = ?, last_conversation_id = COALESCE(?, last_conversation_id), updated_at = ? WHERE id = ? AND workspace_id = ?`).bind(...values, id, workspaceId).run();
  } else {
    await env.DB.prepare(`INSERT INTO connectlog_cards (id, workspace_id, connectlog_card_id, card_label, campaign, owner_name, owner_company, owner_role, welcome_message, tags_json, last_conversation_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, workspaceId, connectLog.cardId, values[0], values[1], values[2], values[3], values[4], values[5], values[6], conversationId || null, t, t).run();
  }
  return await env.DB.prepare(`SELECT * FROM connectlog_cards WHERE id = ?`).bind(id).first();
}

async function recordConnectLogContactRequest(env, { workspaceId, conversationId, cardRecord, connectLog, customerName, customerEmail, sourceUrl }) {
  if (!connectLog.enabled) return null;
  const existing = await env.DB.prepare(`SELECT id FROM connectlog_contact_requests WHERE workspace_id = ? AND conversation_id = ?`).bind(workspaceId, conversationId).first();
  const id = existing?.id || uuid('clreq_');
  const t = nowIso();
  const metadata = { ...connectLog.metadata, card_record_id: cardRecord?.id || null };
  if (existing?.id) {
    await env.DB.prepare(`UPDATE connectlog_contact_requests SET connectlog_card_id = ?, card_record_id = ?, customer_name = ?, customer_email = ?, source_url = ?, metadata_json = ?, welcome_sent_at = COALESCE(welcome_sent_at, ?), updated_at = ? WHERE id = ? AND workspace_id = ?`).bind(connectLog.cardId || '', cardRecord?.id || null, customerName, customerEmail, sourceUrl, JSON.stringify(metadata), connectLog.welcomeMessage ? t : null, t, id, workspaceId).run();
  } else {
    await env.DB.prepare(`INSERT INTO connectlog_contact_requests (id, workspace_id, conversation_id, connectlog_card_id, card_record_id, request_status, customer_name, customer_email, source_url, metadata_json, welcome_sent_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?)`).bind(id, workspaceId, conversationId, connectLog.cardId || '', cardRecord?.id || null, customerName, customerEmail, sourceUrl, JSON.stringify(metadata), connectLog.welcomeMessage ? t : null, t, t).run();
  }
  return await env.DB.prepare(`SELECT * FROM connectlog_contact_requests WHERE id = ?`).bind(id).first();
}


async function logConnectLogRequestEvent(env, { workspaceId, requestId, conversationId = null, eventType, actorType = 'system', actorId = null, body = '', metadata = {} }) {
  if (!requestId || !workspaceId || !eventType) return null;
  const id = uuid('clevt_');
  await env.DB.prepare(`INSERT INTO connectlog_request_events (id, workspace_id, request_id, conversation_id, event_type, actor_type, actor_id, body, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, workspaceId, requestId, conversationId, safeText(eventType, 100), safeText(actorType, 60), safeText(actorId || '', 160), safeText(body, 1000), JSON.stringify(metadata || {}), nowIso()).run();
  return id;
}

async function listConnectLogRequestEvents(request, env, requestId) {
  const auth = await verifyApiKey(request, env, 'connectlog:read');
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401, corsHeaders(env, request));
  const existing = await env.DB.prepare(`SELECT id, conversation_id FROM connectlog_contact_requests WHERE id = ? AND workspace_id = ?`).bind(requestId, auth.workspaceId).first();
  if (!existing) return json({ ok: false, error: 'ConnectLog request not found' }, 404, corsHeaders(env, request));
  const rows = await env.DB.prepare(`SELECT id, workspace_id, request_id, conversation_id, event_type, actor_type, actor_id, body, metadata_json, created_at FROM connectlog_request_events WHERE workspace_id = ? AND request_id = ? ORDER BY created_at ASC LIMIT 200`).bind(auth.workspaceId, requestId).all();
  return json({ ok: true, request_id: requestId, conversation_id: existing.conversation_id, events: rows.results || [] }, 200, corsHeaders(env, request));
}

async function connectLogBridgeProof(request, env) {
  return json({
    ok: true,
    service: 'relay13-core-v1.7-connectlog-operator-proof',
    bridge: 'connectlog',
    proof_boundary: 'This endpoint proves route and source wiring only. Live delivery requires deployed Worker, migrated D1, created workspace/API key, message POST/GET proof, and browser WebSocket open/message events.',
    routes: ['/api/v1/connectlog/health','/api/v1/connectlog/proof','/api/v1/connectlog/activation','/api/v1/connectlog/activation-runs','/api/v1/connectlog/scan','/api/v1/connectlog/cards','/api/v1/connectlog/requests','/api/v1/connectlog/requests/:id/events','/api/v1/connectlog/stats','/api/v1/connectlog/live-proof','/api/v1/connectlog/live-proof-runs','/api/v1/guardrails/proof','/api/admin/guardrails','/api/v1/conversations/:id/messages','/api/ws/:conversation_id'],
    migrations: ['0001_core.sql','0002_connectlog_bridge.sql','0003_connectlog_message_proof.sql','0004_connectlog_activation_proof.sql','0005_connectlog_live_proof.sql','0006_system_guardrails.sql'],
    ai_policy: { customer_web_search: false, answer_source: 'customer_app_knowledge_only', auto_reply_default: false },
    response_orchestration: RESPONSE_ORCHESTRATION_POLICY,
    scopes: ['connectlog:read','connectlog:write','conversations:create','messages:read','messages:write'],
    realtime: { durable_object: 'ThreadRoom', binding: 'THREAD_ROOM', websocket_path: '/api/ws/:conversation_id', hibernation_ready: true },
    time: nowIso()
  }, 200, corsHeaders(env, request));
}

async function connectLogActivationReadiness(request, env) {
  const url = new URL(request.url);
  let workspaceId = safeText(url.searchParams.get('workspace_id') || '', 100);
  const auth = await verifyApiKey(request, env, 'connectlog:read');
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401, corsHeaders(env, request));
  workspaceId = workspaceId || auth.workspaceId;
  const workspace = await workspaceById(env, workspaceId);
  if (!workspace) return json({ ok: false, error: 'Workspace not found or inactive' }, 404, corsHeaders(env, request));
  const cards = await env.DB.prepare(`SELECT COUNT(*) AS count FROM connectlog_cards WHERE workspace_id = ?`).bind(workspaceId).first();
  const requests = await env.DB.prepare(`SELECT COUNT(*) AS count FROM connectlog_contact_requests WHERE workspace_id = ?`).bind(workspaceId).first();
  const conversations = await env.DB.prepare(`SELECT COUNT(*) AS count FROM conversations WHERE workspace_id = ? AND channel = 'connectlog-card'`).bind(workspaceId).first();
  const messages = await env.DB.prepare(`SELECT COUNT(*) AS count FROM messages WHERE workspace_id = ?`).bind(workspaceId).first();
  const latestMessage = await env.DB.prepare(`SELECT id, conversation_id, sender_role, created_at FROM messages WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 1`).bind(workspaceId).first();
  const activationRuns = await env.DB.prepare(`SELECT COUNT(*) AS count FROM connectlog_activation_runs WHERE workspace_id = ?`).bind(workspaceId).first();
  const checks = [
    { name: 'workspace_active', ok: true, workspace_id: workspaceId, workspace_slug: workspace.slug },
    { name: 'api_key_scope_connectlog_read', ok: auth.scopes.includes('connectlog:read') || auth.scopes.includes('workspace:admin') },
    { name: 'api_key_scope_connectlog_write', ok: auth.scopes.includes('connectlog:write') || auth.scopes.includes('workspace:admin') },
    { name: 'card_registry_table_accessible', ok: Number(cards?.count || 0) >= 0, count: Number(cards?.count || 0) },
    { name: 'contact_request_table_accessible', ok: Number(requests?.count || 0) >= 0, count: Number(requests?.count || 0) },
    { name: 'connectlog_conversation_counter_accessible', ok: Number(conversations?.count || 0) >= 0, count: Number(conversations?.count || 0) },
    { name: 'message_table_accessible', ok: Number(messages?.count || 0) >= 0, count: Number(messages?.count || 0) },
    { name: 'activation_run_ledger_accessible', ok: Number(activationRuns?.count || 0) >= 0, count: Number(activationRuns?.count || 0) }
  ];
  return json({ ok: checks.every((c) => c.ok), service: 'relay13-core-v1.7-connectlog-operator-proof', bridge: 'connectlog', workspace_id: workspaceId, checks, latest_message: latestMessage || null, time: nowIso() }, 200, corsHeaders(env, request));
}

async function recordConnectLogActivationRun(request, env) {
  const auth = await verifyApiKey(request, env, 'connectlog:write');
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401, corsHeaders(env, request));
  const input = await readJson(request);
  const status = input.ok === true ? 'passed' : 'failed';
  const id = uuid('clact_');
  const conversationId = safeText(input.conversation_id || input.conversationId || '', 120) || null;
  const summary = safeText(input.summary || input.error || `${status} activation proof`, 800);
  await env.DB.prepare(`INSERT INTO connectlog_activation_runs (id, workspace_id, status, conversation_id, summary, report_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, auth.workspaceId, status, conversationId, summary, JSON.stringify(input || {}), nowIso()).run();
  await audit(env, { workspaceId: auth.workspaceId, actorType: 'api_key', actorId: auth.apiKeyId, eventType: 'connectlog.activation.record', body: `${id}:${status}` });
  return json({ ok: true, activation_run: { id, workspace_id: auth.workspaceId, status, conversation_id: conversationId } }, 201, corsHeaders(env, request));
}

async function connectLogLiveProof(request, env) {
  const url = new URL(request.url);
  let workspaceId = safeText(url.searchParams.get('workspace_id') || '', 100);
  const auth = await verifyApiKey(request, env, 'connectlog:read');
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401, corsHeaders(env, request));
  workspaceId = workspaceId || auth.workspaceId;
  const workspace = await workspaceById(env, workspaceId);
  if (!workspace) return json({ ok: false, error: 'Workspace not found or inactive' }, 404, corsHeaders(env, request));
  const cards = await env.DB.prepare(`SELECT COUNT(*) AS count FROM connectlog_cards WHERE workspace_id = ? AND status = 'active'`).bind(workspaceId).first();
  const requests = await env.DB.prepare(`SELECT COUNT(*) AS count FROM connectlog_contact_requests WHERE workspace_id = ?`).bind(workspaceId).first();
  const conversations = await env.DB.prepare(`SELECT COUNT(*) AS count FROM conversations WHERE workspace_id = ? AND channel = 'connectlog-card'`).bind(workspaceId).first();
  const messages = await env.DB.prepare(`SELECT COUNT(*) AS count FROM messages WHERE workspace_id = ?`).bind(workspaceId).first();
  const events = await env.DB.prepare(`SELECT COUNT(*) AS count FROM connectlog_request_events WHERE workspace_id = ?`).bind(workspaceId).first();
  const activationRuns = await env.DB.prepare(`SELECT COUNT(*) AS count FROM connectlog_activation_runs WHERE workspace_id = ?`).bind(workspaceId).first();
  const latestActivation = await env.DB.prepare(`SELECT id, status, conversation_id, summary, created_at FROM connectlog_activation_runs WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 1`).bind(workspaceId).first();
  const latestMessage = await env.DB.prepare(`SELECT id, conversation_id, sender_role, created_at FROM messages WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 1`).bind(workspaceId).first();
  const latestRequest = await env.DB.prepare(`SELECT id, conversation_id, connectlog_card_id, request_status, customer_name, created_at FROM connectlog_contact_requests WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 1`).bind(workspaceId).first();
  let latestLiveRun = null;
  let guardrailPolicy = null;
  let guardrailEvents = null;
  try {
    latestLiveRun = await env.DB.prepare(`SELECT id, status, summary, created_at FROM connectlog_live_proof_runs WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 1`).bind(workspaceId).first();
  } catch (_) {}
  try {
    guardrailPolicy = await ensureWorkspaceGuardrails(env, workspace);
    guardrailEvents = await env.DB.prepare(`SELECT COUNT(*) AS count FROM guardrail_events WHERE workspace_id = ?`).bind(workspaceId).first();
  } catch (_) {}
  const gates = [
    { name: 'workspace_active', ok: true, workspace_id: workspaceId, workspace_slug: workspace.slug },
    { name: 'api_key_connectlog_read_scope', ok: auth.scopes.includes('connectlog:read') || auth.scopes.includes('workspace:admin') },
    { name: 'api_key_connectlog_write_scope', ok: auth.scopes.includes('connectlog:write') || auth.scopes.includes('workspace:admin') },
    { name: 'card_registry_has_records', ok: Number(cards?.count || 0) > 0, count: Number(cards?.count || 0) },
    { name: 'contact_request_exists', ok: Number(requests?.count || 0) > 0, count: Number(requests?.count || 0) },
    { name: 'connectlog_conversation_exists', ok: Number(conversations?.count || 0) > 0, count: Number(conversations?.count || 0) },
    { name: 'message_history_exists', ok: Number(messages?.count || 0) > 0, count: Number(messages?.count || 0) },
    { name: 'request_event_ledger_exists', ok: Number(events?.count || 0) > 0, count: Number(events?.count || 0) },
    { name: 'activation_run_exists', ok: Number(activationRuns?.count || 0) > 0, count: Number(activationRuns?.count || 0) },
    { name: 'latest_activation_passed', ok: latestActivation?.status === 'passed', status: latestActivation?.status || 'none' },
    { name: 'system_guardrails_configured', ok: Boolean(guardrailPolicy && guardrailPolicy.allow_web_search === false), ai_mode: guardrailPolicy?.ai_mode || 'unknown', web_search_allowed: false }
  ];
  const productionReady = gates.every((gate) => gate.ok);
  return json({
    ok: true,
    service: 'relay13-core-v1.7-connectlog-operator-proof',
    bridge: 'connectlog',
    production_ready: productionReady,
    workspace_id: workspaceId,
    proof_boundary: 'This endpoint reports live backend state. Realtime still requires browser WebSocket open/message-event proof.',
    gates,
    counts: {
      active_cards: Number(cards?.count || 0),
      requests: Number(requests?.count || 0),
      connectlog_conversations: Number(conversations?.count || 0),
      messages: Number(messages?.count || 0),
      request_events: Number(events?.count || 0),
      activation_runs: Number(activationRuns?.count || 0),
      guardrail_events: Number(guardrailEvents?.count || 0)
    },
    guardrails: guardrailPolicy ? publicGuardrailPolicy(guardrailPolicy) : null,
    latest_activation: latestActivation || null,
    latest_request: latestRequest || null,
    latest_message: latestMessage || null,
    latest_live_proof_run: latestLiveRun || null,
    checked_at: nowIso()
  }, 200, corsHeaders(env, request));
}

async function recordConnectLogLiveProofRun(request, env) {
  const auth = await verifyApiKey(request, env, 'connectlog:write');
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401, corsHeaders(env, request));
  const input = await readJson(request);
  const status = input.production_ready === true || input.ok === true ? 'passed' : 'failed';
  const id = uuid('cllive_');
  const summary = safeText(input.summary || `${status} live proof`, 800);
  await env.DB.prepare(`INSERT INTO connectlog_live_proof_runs (id, workspace_id, status, summary, report_json, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(id, auth.workspaceId, status, summary, JSON.stringify(input || {}), nowIso()).run();
  await audit(env, { workspaceId: auth.workspaceId, actorType: 'api_key', actorId: auth.apiKeyId, eventType: 'connectlog.live_proof.record', body: `${id}:${status}` });
  return json({ ok: true, live_proof_run: { id, workspace_id: auth.workspaceId, status, summary } }, 201, corsHeaders(env, request));
}

async function createConnectLogScanConversation(request, env) {
  return createConversation(request, env);
}

async function upsertConnectLogCardEndpoint(request, env) {
  const input = await readJson(request); let workspaceId = safeText(input.workspace_id || '', 100); let auth = null;
  const admin = requireAdmin(request, env);
  if (!admin.ok) { auth = await verifyApiKey(request, env, 'connectlog:write'); if (!auth.ok) return json({ ok: false, error: auth.error }, 401, corsHeaders(env, request)); workspaceId = auth.workspaceId; }
  if (!workspaceId) return json({ ok: false, error: 'workspace_id required' }, 400, corsHeaders(env, request));
  const workspace = await workspaceById(env, workspaceId); if (!workspace) return json({ ok: false, error: 'Workspace not found or inactive' }, 404, corsHeaders(env, request));
  const connectLog = extractConnectLogBridge({ ...input, connectlog_bridge: true });
  if (!connectLog.cardId) return json({ ok: false, error: 'connectlog_card_id required' }, 400, corsHeaders(env, request));
  const card = await upsertConnectLogCard(env, workspaceId, input, connectLog, input.last_conversation_id || '');
  await audit(env, { workspaceId, actorType: auth ? 'api_key' : 'admin', actorId: auth?.apiKeyId || null, eventType: 'connectlog.card.upsert', body: connectLog.cardId, metadata: connectLog.metadata });
  return json({ ok: true, card }, 200, corsHeaders(env, request));
}

async function listConnectLogCards(request, env) {
  const url = new URL(request.url); let workspaceId = safeText(url.searchParams.get('workspace_id') || '', 100);
  const admin = requireAdmin(request, env);
  if (!admin.ok) { const auth = await verifyApiKey(request, env, 'connectlog:read'); if (!auth.ok) return json({ ok: false, error: auth.error }, 401, corsHeaders(env, request)); workspaceId = auth.workspaceId; }
  if (!workspaceId) return json({ ok: false, error: 'workspace_id required' }, 400, corsHeaders(env, request));
  const rows = await env.DB.prepare(`SELECT * FROM connectlog_cards WHERE workspace_id = ? ORDER BY updated_at DESC LIMIT 200`).bind(workspaceId).all();
  return json({ ok: true, cards: rows.results || [] }, 200, corsHeaders(env, request));
}

async function listConnectLogRequests(request, env) {
  const url = new URL(request.url); let workspaceId = safeText(url.searchParams.get('workspace_id') || '', 100);
  const admin = requireAdmin(request, env);
  if (!admin.ok) { const auth = await verifyApiKey(request, env, 'connectlog:read'); if (!auth.ok) return json({ ok: false, error: auth.error }, 401, corsHeaders(env, request)); workspaceId = auth.workspaceId; }
  if (!workspaceId) return json({ ok: false, error: 'workspace_id required' }, 400, corsHeaders(env, request));
  const rows = await env.DB.prepare(`SELECT connectlog_contact_requests.*, conversations.subject, conversations.status AS conversation_status, conversations.last_message_preview, conversations.last_message_at FROM connectlog_contact_requests JOIN conversations ON conversations.id = connectlog_contact_requests.conversation_id WHERE connectlog_contact_requests.workspace_id = ? ORDER BY connectlog_contact_requests.created_at DESC LIMIT 200`).bind(workspaceId).all();
  return json({ ok: true, requests: rows.results || [] }, 200, corsHeaders(env, request));
}

async function connectLogBridgeStats(request, env) {
  const url = new URL(request.url); let workspaceId = safeText(url.searchParams.get('workspace_id') || '', 100);
  const admin = requireAdmin(request, env);
  if (!admin.ok) { const auth = await verifyApiKey(request, env, 'connectlog:read'); if (!auth.ok) return json({ ok: false, error: auth.error }, 401, corsHeaders(env, request)); workspaceId = auth.workspaceId; }
  if (!workspaceId) return json({ ok: false, error: 'workspace_id required' }, 400, corsHeaders(env, request));
  const cards = await env.DB.prepare(`SELECT COUNT(*) AS count FROM connectlog_cards WHERE workspace_id = ? AND status = 'active'`).bind(workspaceId).first();
  const requests = await env.DB.prepare(`SELECT request_status, COUNT(*) AS count FROM connectlog_contact_requests WHERE workspace_id = ? GROUP BY request_status`).bind(workspaceId).all();
  const latest = await env.DB.prepare(`SELECT connectlog_contact_requests.id, connectlog_contact_requests.connectlog_card_id, connectlog_contact_requests.customer_name, connectlog_contact_requests.created_at, conversations.subject, conversations.last_message_preview FROM connectlog_contact_requests JOIN conversations ON conversations.id = connectlog_contact_requests.conversation_id WHERE connectlog_contact_requests.workspace_id = ? ORDER BY connectlog_contact_requests.created_at DESC LIMIT 10`).bind(workspaceId).all();
  return json({ ok: true, workspace_id: workspaceId, cards_active: Number(cards?.count || 0), requests_by_status: requests.results || [], latest_requests: latest.results || [] }, 200, corsHeaders(env, request));
}

async function updateConnectLogRequestStatus(request, env, requestId) {
  const input = await readJson(request); const status = safeText(input.status || input.request_status || '', 40);
  if (!['open','accepted','archived'].includes(status)) return json({ ok: false, error: 'status must be open, accepted, or archived' }, 400, corsHeaders(env, request));
  const auth = await verifyApiKey(request, env, 'connectlog:write');
  if (!auth.ok) return json({ ok: false, error: auth.error }, 401, corsHeaders(env, request));
  const existing = await env.DB.prepare(`SELECT id, workspace_id, conversation_id FROM connectlog_contact_requests WHERE id = ? AND workspace_id = ?`).bind(requestId, auth.workspaceId).first();
  if (!existing) return json({ ok: false, error: 'ConnectLog request not found' }, 404, corsHeaders(env, request));
  await env.DB.prepare(`UPDATE connectlog_contact_requests SET request_status = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`).bind(status, nowIso(), requestId, auth.workspaceId).run();
  await logConnectLogRequestEvent(env, { workspaceId: auth.workspaceId, requestId, conversationId: existing.conversation_id || null, eventType: `request.${status}`, actorType: 'api_key', actorId: auth.apiKeyId, body: `${requestId}:${status}` });
  await audit(env, { workspaceId: auth.workspaceId, actorType: 'api_key', actorId: auth.apiKeyId, eventType: 'connectlog.request.status', body: `${requestId}:${status}` });
  return json({ ok: true, id: requestId, request_status: status }, 200, corsHeaders(env, request));
}

async function connectLogBridgeHealth(request, env) {
  return json({ ok: true, service: 'relay13-core-v1.7-connectlog-operator-proof', bridge: 'connectlog', features: ['card_registry', 'contact_requests', 'request_status_updates', 'request_event_ledger', 'bridge_stats', 'message_history_pull', 'websocket_proof_scaffold', 'activation_proof_endpoint', 'activation_run_ledger', 'live_proof_endpoint', 'live_proof_run_ledger', 'welcome_message_persistence', 'fallback_safe_client', 'local_first_connectlog_adapter', 'system_guardrails', 'no_web_search_customer_chat', 'customer_app_knowledge_policy', 'guardrail_event_ledger', 'paid_ai_response_gate', 'ai_usage_ledger'], routes: ['/api/v1/connectlog/health','/api/v1/connectlog/proof','/api/v1/connectlog/activation','/api/v1/connectlog/activation-runs','/api/v1/connectlog/cards','/api/v1/connectlog/requests','/api/v1/connectlog/stats','/api/v1/connectlog/live-proof','/api/v1/connectlog/live-proof-runs','/api/v1/guardrails/proof','/api/admin/guardrails'], migrations: ['0001_core.sql','0002_connectlog_bridge.sql','0003_connectlog_message_proof.sql','0004_connectlog_activation_proof.sql','0005_connectlog_live_proof.sql','0006_system_guardrails.sql'], response_orchestration: RESPONSE_ORCHESTRATION_POLICY, time: nowIso() }, 200, corsHeaders(env, request));
}

async function resolveWorkspaceForGuardrails(request, env, { requireDomain = false } = {}) {
  const url = new URL(request.url);
  const workspaceId = safeText(url.searchParams.get('workspace_id') || '', 100);
  const slug = normalizeSlug(url.searchParams.get('workspace') || '');
  let workspace = workspaceId ? await workspaceById(env, workspaceId) : null;
  if (!workspace && slug) {
    let row = await getWidgetConfigBySlug(env, slug);
    if (!row && CLIENT_WIDGET_WORKSPACES[slug]) {
      await ensureClientWidgetWorkspace(env, slug);
      row = await getWidgetConfigBySlug(env, slug);
    }
    if (row) workspace = { id: row.workspace_id, slug: row.slug, name: row.name, status: 'active' };
  }
  if (!workspace) return { ok: false, response: json({ ok: false, error: 'Workspace not found' }, 404, corsHeaders(env, request)) };
  if (requireDomain) {
    const domainCheck = await validateWorkspaceDomain(env, request, workspace.id);
    if (!domainCheck.ok) return { ok: false, response: json({ ok: false, error: domainCheck.error }, 403, corsHeaders(env, request)) };
  }
  return { ok: true, workspace };
}

async function guardrailsProof(request, env) {
  const resolved = await resolveWorkspaceForGuardrails(request, env, { requireDomain: true });
  if (!resolved.ok) return resolved.response;
  const policy = await ensureWorkspaceGuardrails(env, resolved.workspace);
  return json({
    ok: true,
    service: 'relay13-core-v1.7-connectlog-operator-proof',
    feature: 'system_guardrails',
    workspace_id: resolved.workspace.id,
    guardrails: publicGuardrailPolicy(policy),
    ai_boundaries: [
      'Local brain routing and operator review are the default path for every workspace.',
      'AI-generated responses require a paid Stripe add-on and a configured monthly reply cap before any provider call is allowed.',
      'Customer website chat does not use web search by default.',
      'AI reply generation must use customer app knowledge, stored Relay13/ConnectLog context, and configured app surfaces only.',
      'Auto-reply is disabled unless the workspace policy is explicitly set to auto_reply by an admin.',
      'Prompt injection, secret extraction, active content payloads, destructive requests, repeated spam, and rate-limit abuse are blocked before persistence.',
      'Direct-operator routes and web-search requests are persisted for operator review without granting web search.'
    ],
    response_orchestration: responseOrchestrationMetadata(policy),
    migrations: ['0001_core.sql','0002_connectlog_bridge.sql','0003_connectlog_message_proof.sql','0004_connectlog_activation_proof.sql','0005_connectlog_live_proof.sql','0006_system_guardrails.sql'],
    checked_at: nowIso()
  }, 200, corsHeaders(env, request));
}

async function adminReadGuardrails(request, env) {
  const admin = requireAdmin(request, env); if (!admin.ok) return admin.response;
  const resolved = await resolveWorkspaceForGuardrails(request, env);
  if (!resolved.ok) return resolved.response;
  const policy = await ensureWorkspaceGuardrails(env, resolved.workspace);
  const events = await env.DB.prepare(`SELECT id, workspace_id, conversation_id, event_type, severity, decision, reason, origin, route, metadata_json, created_at FROM guardrail_events WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100`).bind(resolved.workspace.id).all();
  return json({ ok: true, workspace: resolved.workspace, guardrails: publicGuardrailPolicy(policy), recent_events: events.results || [] }, 200, corsHeaders(env, request));
}

async function adminUpdateGuardrails(request, env) {
  const admin = requireAdmin(request, env); if (!admin.ok) return admin.response;
  const input = await readJson(request);
  const workspaceId = safeText(input.workspace_id || '', 100);
  const workspace = await workspaceById(env, workspaceId);
  if (!workspace) return json({ ok: false, error: 'Workspace not found' }, 404, corsHeaders(env, request));
  const current = await ensureWorkspaceGuardrails(env, workspace);
  const mode = GUARDRAIL_AI_MODES.has(input.ai_mode) ? input.ai_mode : current.ai_mode;
  const allowAutoReply = cleanBool(input.allow_ai_auto_reply, current.allow_ai_auto_reply) && mode === 'auto_reply';
  const policy = {
    status: input.status === 'paused' ? 'paused' : 'active',
    ai_mode: mode,
    allow_ai_auto_reply: allowAutoReply,
    allow_file_search: cleanBool(input.allow_file_search, current.allow_file_search),
    max_ai_input_tokens: cleanInt(input.max_ai_input_tokens, current.max_ai_input_tokens, 500, 50000),
    max_ai_output_tokens: cleanInt(input.max_ai_output_tokens, current.max_ai_output_tokens, 80, 4000),
    monthly_ai_reply_limit: cleanInt(input.monthly_ai_reply_limit, current.monthly_ai_reply_limit, 0, 1000000),
    per_ip_message_window_minutes: cleanInt(input.per_ip_message_window_minutes, current.per_ip_message_window_minutes, 1, 120),
    per_ip_message_limit: cleanInt(input.per_ip_message_limit, current.per_ip_message_limit, 3, 1000),
    per_ip_conversation_limit: cleanInt(input.per_ip_conversation_limit, current.per_ip_conversation_limit, 1, 300),
    max_links_per_message: cleanInt(input.max_links_per_message, current.max_links_per_message, 0, 10),
    blocked_terms: Array.isArray(input.blocked_terms) ? input.blocked_terms.slice(0, 80).map((item) => safeText(item, 120).toLowerCase()).filter(Boolean) : current.blocked_terms,
    app_knowledge: mergeAppKnowledge(current.app_knowledge, safeJson(input.app_knowledge, {})),
    escalation_rules: { ...current.escalation_rules, ...safeJson(input.escalation_rules, {}) }
  };
  const t = nowIso();
  await env.DB.prepare(`INSERT INTO workspace_guardrails (workspace_id, status, ai_mode, allow_ai_auto_reply, allow_web_search, allow_file_search, max_ai_input_tokens, max_ai_output_tokens, monthly_ai_reply_limit, per_ip_message_window_minutes, per_ip_message_limit, per_ip_conversation_limit, max_links_per_message, blocked_terms_json, app_knowledge_json, escalation_rules_json, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(workspace_id) DO UPDATE SET status = excluded.status, ai_mode = excluded.ai_mode, allow_ai_auto_reply = excluded.allow_ai_auto_reply, allow_web_search = 0, allow_file_search = excluded.allow_file_search, max_ai_input_tokens = excluded.max_ai_input_tokens, max_ai_output_tokens = excluded.max_ai_output_tokens, monthly_ai_reply_limit = excluded.monthly_ai_reply_limit, per_ip_message_window_minutes = excluded.per_ip_message_window_minutes, per_ip_message_limit = excluded.per_ip_message_limit, per_ip_conversation_limit = excluded.per_ip_conversation_limit, max_links_per_message = excluded.max_links_per_message, blocked_terms_json = excluded.blocked_terms_json, app_knowledge_json = excluded.app_knowledge_json, escalation_rules_json = excluded.escalation_rules_json, updated_at = excluded.updated_at`)
    .bind(workspace.id, policy.status, policy.ai_mode, policy.allow_ai_auto_reply ? 1 : 0, policy.allow_file_search ? 1 : 0, policy.max_ai_input_tokens, policy.max_ai_output_tokens, policy.monthly_ai_reply_limit, policy.per_ip_message_window_minutes, policy.per_ip_message_limit, policy.per_ip_conversation_limit, policy.max_links_per_message, JSON.stringify(policy.blocked_terms), JSON.stringify(policy.app_knowledge), JSON.stringify(policy.escalation_rules), t, t).run();
  await audit(env, { workspaceId: workspace.id, actorType: 'admin', eventType: 'guardrails.update', body: policy.ai_mode, metadata: { allow_web_search: false, allow_ai_auto_reply: policy.allow_ai_auto_reply } });
  const updated = await ensureWorkspaceGuardrails(env, workspace);
  return json({ ok: true, guardrails: publicGuardrailPolicy(updated), warning: 'allow_web_search is locked false for customer website chat.' }, 200, corsHeaders(env, request));
}

async function createConversation(request, env) {
  const input = await readJson(request); let workspaceId = safeText(input.workspace_id, 100); let auth = null; let source = 'widget';
  if (getBearer(request) || request.headers.get('x-relay13-api-key')) {
    auth = await verifyApiKey(request, env, 'conversations:create'); if (!auth.ok) return json({ ok: false, error: auth.error }, 401, corsHeaders(env, request)); workspaceId = auth.workspaceId; source = 'api';
  } else {
    const slug = normalizeSlug(input.workspace || new URL(request.url).searchParams.get('workspace') || ''); const cfg = await getWidgetConfigBySlug(env, slug);
    if (!cfg && CLIENT_WIDGET_WORKSPACES[slug]) await ensureClientWidgetWorkspace(env, slug);
    const clientCfg = cfg || await getWidgetConfigBySlug(env, slug);
    if (!clientCfg) return json({ ok: false, error: 'Valid workspace or API key required' }, 401, corsHeaders(env, request));
    const domainCheck = await validateWorkspaceDomain(env, request, clientCfg.workspace_id); if (!domainCheck.ok) return json({ ok: false, error: domainCheck.error }, 403, corsHeaders(env, request));
    workspaceId = clientCfg.workspace_id;
  }
  const workspace = await workspaceById(env, workspaceId); if (!workspace) return json({ ok: false, error: 'Workspace not found or inactive' }, 404, corsHeaders(env, request));
  const limitCheck = await enforceWorkspaceLimits(env, workspace, 'conversation'); if (!limitCheck.ok) return json({ ok: false, error: limitCheck.error }, 429, corsHeaders(env, request));
  const connectLog = extractConnectLogBridge(input);
  const conversationId = uuid('conv_'); const rawVisitorToken = randomHex(32); const visitorHash = await sha256Hex(rawVisitorToken); const t = nowIso();
  const customerName = safeText(input.customer_name || input.visitor_name || input.name || 'Website Visitor', 140) || 'Website Visitor'; const customerEmail = safeText(input.customer_email || input.visitor_email || input.email || '', 220); const firstBody = safeText(input.body || input.message || '', workspace.max_message_chars || DEFAULT_MAX_MESSAGE_CHARS); const subject = safeText(input.subject || (connectLog.enabled ? `ConnectLog: ${connectLog.cardLabel || connectLog.campaign || customerName}` : ''), 180);
  const inputMetadata = cleanMetadata(input.metadata || {});
  const guardrail = await evaluateInboundGuardrails(env, request, { workspace, body: firstBody || subject || customerName, metadata: inputMetadata, input, eventType: 'conversation' });
  if (!guardrail.ok) return json({ ok: false, error: 'Message rejected by workspace guardrails', guardrail: { decision: guardrail.decision, reason: guardrail.reason, signals: guardrail.signals } }, guardrail.reason.includes('rate_limit') ? 429 : 422, corsHeaders(env, request));
  const guardrailMetadata = {
    guardrail: { decision: guardrail.decision, reason: guardrail.reason, signals: guardrail.signals, route: guardrail.route },
    ai_policy: guardrail.ai_policy,
    response_orchestration: guardrail.response_orchestration,
    app_knowledge_profile: guardrail.policy.app_knowledge?.profile || ''
  };
  await env.DB.prepare(`INSERT INTO conversations (id, workspace_id, channel, status, subject, visitor_token_hash, external_user_id, customer_name, customer_email, customer_phone, source_url, last_message_sort, created_at, updated_at) VALUES (?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(conversationId, workspaceId, safeText(input.channel || (connectLog.enabled ? 'connectlog-card' : 'website'), 60), subject, visitorHash, safeText(input.external_user_id || (connectLog.cardId ? `connectlog:${connectLog.cardId}` : ''), 160), customerName, customerEmail, safeText(input.customer_phone || input.visitor_phone || input.phone || '', 60), safeText(input.source_url || request.headers.get('referer') || '', 500), t, t, t).run();
  await env.DB.prepare(`INSERT INTO participants (id, conversation_id, workspace_id, role, display_name, email, external_user_id, created_at) VALUES (?, ?, ?, 'customer', ?, ?, ?, ?)`).bind(uuid('part_'), conversationId, workspaceId, customerName, customerEmail, safeText(input.external_user_id || (connectLog.cardId ? `connectlog:${connectLog.cardId}` : ''), 160), t).run();
  if (connectLog.welcomeMessage) await persistMessage(env, { workspaceId, conversationId, senderRole: 'system', senderName: connectLog.ownerName || 'ConnectLog welcome', body: connectLog.welcomeMessage, metadata: { source: 'connectlog-welcome', ...connectLog.metadata } });
  if (firstBody) await persistMessage(env, { workspaceId, conversationId, senderRole: 'customer', senderName: customerName, body: firstBody, metadata: { ...inputMetadata, source, ...connectLog.metadata, ...guardrailMetadata } });
  let connectLogCard = null;
  if (connectLog.enabled) {
    connectLogCard = await upsertConnectLogCard(env, workspaceId, input, connectLog, conversationId);
    const connectLogRequest = await recordConnectLogContactRequest(env, { workspaceId, conversationId, cardRecord: connectLogCard, connectLog, customerName, customerEmail, sourceUrl: safeText(input.source_url || request.headers.get('referer') || '', 500) });
    await logConnectLogRequestEvent(env, { workspaceId, requestId: connectLogRequest?.id, conversationId, eventType: 'request.created', actorType: auth ? 'api_key' : 'visitor', actorId: auth?.apiKeyId || null, body: `ConnectLog request opened for ${connectLog.cardId || 'unknown-card'}`, metadata: { ...connectLog.metadata, ...guardrailMetadata } });
    await logConnectLogRequestEvent(env, { workspaceId, requestId: connectLogRequest?.id, conversationId, eventType: 'response.orchestration.local_first', actorType: 'system', body: 'Local brain routing is active. AI provider calls remain locked until the paid Relay13 AI response add-on is active.', metadata: { response_orchestration: guardrail.response_orchestration, ai_policy: guardrail.ai_policy } });
  }
  await recordGuardrailEvent(env, request, { workspaceId, conversationId, eventType: 'conversation.persisted', decision: guardrail.decision, reason: guardrail.reason, severity: guardrail.severity, route: guardrail.route, body: firstBody || subject, metadata: inputMetadata });
  await audit(env, { workspaceId, actorType: auth ? 'api_key' : 'visitor', actorId: auth?.apiKeyId || null, eventType: connectLog.enabled ? 'conversation.create.connectlog' : 'conversation.create', body: conversationId, metadata: { ...inputMetadata, ...connectLog.metadata, connectlog_card_record_id: connectLogCard?.id || null, ...guardrailMetadata } });
  return json({ ok: true, conversation_id: conversationId, visitor_token: rawVisitorToken, workspace_id: workspaceId, bridge: connectLog.enabled ? 'connectlog' : null, connectlog_card_record_id: connectLogCard?.id || null, guardrail: { decision: guardrail.decision, reason: guardrail.reason, signals: guardrail.signals }, ai_policy: guardrail.ai_policy, response_orchestration: guardrail.response_orchestration }, 201, corsHeaders(env, request));
}
async function validateConversationWorkspace(env, conversationId, workspaceId) { return await env.DB.prepare(`SELECT conversations.id AS id, conversations.workspace_id AS workspace_id, workspaces.max_message_chars AS max_message_chars FROM conversations JOIN workspaces ON workspaces.id = conversations.workspace_id WHERE conversations.id = ? AND conversations.workspace_id = ? AND workspaces.status = 'active'`).bind(conversationId, workspaceId).first(); }
async function persistMessage(env, { workspaceId, conversationId, senderRole, senderName, body, metadata = {} }) {
  const workspace = await workspaceById(env, workspaceId); if (!workspace) throw new Error('Workspace inactive');
  const limitCheck = await enforceWorkspaceLimits(env, workspace, 'message'); if (!limitCheck.ok) throw new Error(limitCheck.error);
  const id = uuid('msg_'); const t = nowIso(); const cleanBody = safeText(body, workspace.max_message_chars || DEFAULT_MAX_MESSAGE_CHARS);
  await env.DB.prepare(`INSERT INTO messages (id, conversation_id, workspace_id, sender_role, sender_name, body, metadata_json, created_at, delivered_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, conversationId, workspaceId, senderRole, safeText(senderName, 140), cleanBody, JSON.stringify(metadata), t, t).run();
  const operatorUnreadDelta = senderRole === 'customer' ? 1 : 0; const customerUnreadDelta = senderRole === 'operator' || senderRole === 'system' ? 1 : 0;
  await env.DB.prepare(`UPDATE conversations SET message_count = message_count + 1, operator_unread_count = operator_unread_count + ?, customer_unread_count = customer_unread_count + ?, last_message_preview = ?, last_message_at = ?, last_message_sort = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`)
    .bind(operatorUnreadDelta, customerUnreadDelta, cleanBody.slice(0, 180), t, t, t, conversationId, workspaceId).run();
  return { id, conversation_id: conversationId, workspace_id: workspaceId, sender_role: senderRole, sender_name: safeText(senderName, 140), body: cleanBody, created_at: t, delivered_at: t };
}
async function listConversations(request, env) {
  const url = new URL(request.url); const admin = requireAdmin(request, env); let workspaceId = safeText(url.searchParams.get('workspace_id') || '', 100);
  if (!admin.ok) { const auth = await verifyApiKey(request, env, 'conversations:read'); if (!auth.ok) return json({ ok: false, error: auth.error }, 401, corsHeaders(env, request)); workspaceId = auth.workspaceId; }
  if (!workspaceId) return json({ ok: false, error: 'workspace_id required' }, 400, corsHeaders(env, request));
  const status = safeText(url.searchParams.get('status') || '', 20); const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10), 1), 100);
  const rows = STATUSES.has(status) ? await env.DB.prepare(`SELECT * FROM conversations WHERE workspace_id = ? AND status = ? ORDER BY last_message_sort DESC LIMIT ?`).bind(workspaceId, status, limit).all() : await env.DB.prepare(`SELECT * FROM conversations WHERE workspace_id = ? ORDER BY last_message_sort DESC LIMIT ?`).bind(workspaceId, limit).all();
  return json({ ok: true, conversations: rows.results || [] }, 200, corsHeaders(env, request));
}
async function markRead(env, conversationId, workspaceId, readerKey) {
  const t = nowIso(); await env.DB.prepare(`INSERT INTO message_reads (conversation_id, workspace_id, reader_key, last_read_at) VALUES (?, ?, ?, ?) ON CONFLICT(conversation_id, reader_key) DO UPDATE SET last_read_at = excluded.last_read_at`).bind(conversationId, workspaceId, readerKey, t).run();
  if (readerKey === 'operator') await env.DB.prepare(`UPDATE conversations SET operator_unread_count = 0 WHERE id = ? AND workspace_id = ?`).bind(conversationId, workspaceId).run();
  if (readerKey === 'customer') await env.DB.prepare(`UPDATE conversations SET customer_unread_count = 0 WHERE id = ? AND workspace_id = ?`).bind(conversationId, workspaceId).run();
}
async function listMessages(request, env, conversationId) {
  const url = new URL(request.url); let workspaceId = safeText(url.searchParams.get('workspace_id') || '', 100); let reader = '';
  const admin = requireAdmin(request, env);
  if (!admin.ok) {
    const visitorToken = safeText(url.searchParams.get('visitor_token') || '', 200);
    if (visitorToken) { const hash = await sha256Hex(visitorToken); const conv = await env.DB.prepare(`SELECT workspace_id FROM conversations WHERE id = ? AND visitor_token_hash = ?`).bind(conversationId, hash).first(); if (!conv) return json({ ok: false, error: 'Unauthorized' }, 401, corsHeaders(env, request)); workspaceId = conv.workspace_id; reader = 'customer'; }
    else { const auth = await verifyApiKey(request, env, 'messages:read'); if (!auth.ok) return json({ ok: false, error: auth.error }, 401, corsHeaders(env, request)); workspaceId = auth.workspaceId; reader = 'operator'; }
  } else reader = 'operator';
  if (!workspaceId) return json({ ok: false, error: 'workspace_id required' }, 400, corsHeaders(env, request));
  const conv = await validateConversationWorkspace(env, conversationId, workspaceId); if (!conv) return json({ ok: false, error: 'Conversation not found' }, 404, corsHeaders(env, request));
  const rows = await env.DB.prepare(`SELECT id, conversation_id, workspace_id, sender_role, sender_name, body, metadata_json, created_at, delivered_at FROM messages WHERE workspace_id = ? AND conversation_id = ? ORDER BY created_at ASC LIMIT 500`).bind(workspaceId, conversationId).all();
  if (reader) await markRead(env, conversationId, workspaceId, reader);
  return json({ ok: true, messages: rows.results || [] }, 200, corsHeaders(env, request));
}
async function createMessage(request, env, conversationId) {
  const input = await readJson(request); let auth = null; let workspaceId = safeText(input.workspace_id, 100); let senderRole = safeText(input.sender_role || 'customer', 30); const visitorToken = safeText(input.visitor_token || '', 200);
  if (visitorToken) { const hash = await sha256Hex(visitorToken); const conv = await env.DB.prepare(`SELECT workspace_id FROM conversations WHERE id = ? AND visitor_token_hash = ?`).bind(conversationId, hash).first(); if (!conv) return json({ ok: false, error: 'Unauthorized' }, 401, corsHeaders(env, request)); workspaceId = conv.workspace_id; senderRole = 'customer'; }
  else { auth = await verifyApiKey(request, env, 'messages:write'); if (!auth.ok) { const admin = requireAdmin(request, env); if (!admin.ok) return json({ ok: false, error: auth.error }, 401, corsHeaders(env, request)); } if (auth?.ok) workspaceId = auth.workspaceId; if (senderRole !== 'operator' && senderRole !== 'system') senderRole = 'operator'; }
  if (!workspaceId) return json({ ok: false, error: 'workspace_id required' }, 400, corsHeaders(env, request));
  const conv = await validateConversationWorkspace(env, conversationId, workspaceId); if (!conv) return json({ ok: false, error: 'Conversation not found' }, 404, corsHeaders(env, request));
  const body = safeText(input.body || input.message || '', conv.max_message_chars || DEFAULT_MAX_MESSAGE_CHARS); if (!body) return json({ ok: false, error: 'Message body required' }, 400, corsHeaders(env, request));
  const inputMetadata = cleanMetadata(input.metadata || {});
  let guardrail = null;
  if (senderRole === 'customer') {
    const workspace = await workspaceById(env, workspaceId);
    guardrail = await evaluateInboundGuardrails(env, request, { workspace, conversationId, body, metadata: inputMetadata, input, eventType: 'message' });
    if (!guardrail.ok) return json({ ok: false, error: 'Message rejected by workspace guardrails', guardrail: { decision: guardrail.decision, reason: guardrail.reason, signals: guardrail.signals } }, guardrail.reason.includes('rate_limit') ? 429 : 422, corsHeaders(env, request));
  }
  const guardrailMetadata = guardrail ? { guardrail: { decision: guardrail.decision, reason: guardrail.reason, signals: guardrail.signals, route: guardrail.route }, ai_policy: guardrail.ai_policy, response_orchestration: guardrail.response_orchestration, app_knowledge_profile: guardrail.policy.app_knowledge?.profile || '' } : {};
  try { const message = await persistMessage(env, { workspaceId, conversationId, senderRole, senderName: safeText(input.sender_name || senderRole, 140), body, metadata: { ...inputMetadata, source: auth ? 'api' : visitorToken ? 'widget' : 'admin', ...guardrailMetadata } }); await room(env, conversationId).fetch(`https://internal/broadcast/${conversationId}`, { method: 'POST', body: JSON.stringify({ type: 'message', ...message }) }); return json({ ok: true, message, guardrail: guardrail ? { decision: guardrail.decision, reason: guardrail.reason, signals: guardrail.signals } : null, ai_policy: guardrail?.ai_policy || null, response_orchestration: guardrail?.response_orchestration || null }, 201, corsHeaders(env, request)); }
  catch (e) { return json({ ok: false, error: safeText(e.message || 'Message rejected', 200) }, 429, corsHeaders(env, request)); }
}
async function updateConversation(request, env, conversationId) {
  const admin = requireAdmin(request, env); if (!admin.ok) return admin.response;
  const input = await readJson(request); const workspaceId = safeText(input.workspace_id, 100); if (!workspaceId) return json({ ok: false, error: 'workspace_id required' }, 400, corsHeaders(env, request));
  const status = STATUSES.has(input.status) ? input.status : null; const assignedTo = input.assigned_to !== undefined ? safeText(input.assigned_to, 160) : null; const current = await env.DB.prepare(`SELECT id, status, assigned_to FROM conversations WHERE id = ? AND workspace_id = ?`).bind(conversationId, workspaceId).first(); if (!current) return json({ ok: false, error: 'Conversation not found' }, 404, corsHeaders(env, request));
  const nextStatus = status || current.status; const nextAssigned = assignedTo ?? current.assigned_to;
  await env.DB.prepare(`UPDATE conversations SET status = ?, assigned_to = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`).bind(nextStatus, nextAssigned, nowIso(), conversationId, workspaceId).run();
  await audit(env, { workspaceId, actorType: 'admin', eventType: 'conversation.update', body: conversationId, metadata: { status: nextStatus, assigned_to: nextAssigned } });
  await room(env, conversationId).fetch(`https://internal/broadcast/${conversationId}`, { method: 'POST', body: JSON.stringify({ type: 'conversation.updated', conversation_id: conversationId, status: nextStatus, assigned_to: nextAssigned }) });
  return json({ ok: true, conversation: { id: conversationId, workspace_id: workspaceId, status: nextStatus, assigned_to: nextAssigned } }, 200, corsHeaders(env, request));
}
async function dashboard(request, env) {
  const admin = requireAdmin(request, env); if (!admin.ok) return admin.response; const workspaceId = safeText(new URL(request.url).searchParams.get('workspace_id') || '', 100); if (!workspaceId) return json({ ok: false, error: 'workspace_id required' }, 400, corsHeaders(env, request));
  const stats = await env.DB.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) AS open_count, SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending_count, SUM(CASE WHEN status='closed' THEN 1 ELSE 0 END) AS closed_count, SUM(message_count) AS total_messages, SUM(operator_unread_count) AS unread_for_operator FROM conversations WHERE workspace_id = ?`).bind(workspaceId).first();
  return json({ ok: true, stats: stats || {} }, 200, corsHeaders(env, request));
}
async function createJob(request, env) {
  const admin = requireAdmin(request, env); if (!admin.ok) return admin.response; const input = await readJson(request); const workspaceId = safeText(input.workspace_id || '', 100); const type = safeText(input.type || '', 80);
  if (!SYSTEM_JOB_TYPES.has(type)) return json({ ok: false, error: 'Unsupported job type' }, 400, corsHeaders(env, request));
  const id = uuid('job_'); const t = nowIso(); await env.DB.prepare(`INSERT INTO jobs (id, workspace_id, type, status, requested_by, payload_json, created_at) VALUES (?, ?, ?, 'queued', 'admin', ?, ?)`).bind(id, workspaceId || null, type, JSON.stringify(input.payload || {}), t).run(); await env.DB.prepare(`INSERT INTO job_logs (id, job_id, workspace_id, level, message, created_at) VALUES (?, ?, ?, 'info', ?, ?)`).bind(uuid('log_'), id, workspaceId || null, `Job queued: ${type}`, t).run(); await audit(env, { workspaceId: workspaceId || null, actorType: 'admin', eventType: 'job.create', body: type, metadata: { job_id: id } }); return json({ ok: true, job: { id, workspace_id: workspaceId || null, type, status: 'queued', created_at: t } }, 201, corsHeaders(env, request));
}
async function publishWidgetConfig(request, env) {
  const admin = requireAdmin(request, env); if (!admin.ok) return admin.response; const input = await readJson(request); const workspaceId = safeText(input.workspace_id || '', 100); if (!workspaceId) return json({ ok: false, error: 'workspace_id required' }, 400, corsHeaders(env, request)); const workspace = await workspaceById(env, workspaceId); if (!workspace) return json({ ok: false, error: 'Workspace not found' }, 404, corsHeaders(env, request));
  const current = await env.DB.prepare(`SELECT COALESCE(MAX(version),0) AS maxv FROM widget_configs WHERE workspace_id = ?`).bind(workspaceId).first(); const version = Number(current?.maxv || 0) + 1; const t = nowIso(); const id = uuid('cfg_');
  await env.DB.batch([env.DB.prepare(`UPDATE widget_configs SET status='retired' WHERE workspace_id = ? AND status='published'`).bind(workspaceId), env.DB.prepare(`INSERT INTO widget_configs (id, workspace_id, version, status, brand_name, welcome_text, launcher_text, operator_name, primary_color, accent_color, logo_url, settings_json, created_at, published_at) VALUES (?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(id, workspaceId, version, safeText(input.brand_name || 'Messages', 160), safeText(input.welcome_text || 'Send us a message. We will reply here.', 300), safeText(input.launcher_text || 'Message us', 80), safeText(input.operator_name || 'Operator', 120), safeText(input.primary_color || '#f6c85f', 24), safeText(input.accent_color || '#9a6cff', 24), safeText(input.logo_url || '', 500), JSON.stringify(input.settings || {}), t, t), env.DB.prepare(`INSERT INTO releases (id, workspace_id, release_type, version, status, artifact_ref, created_by, created_at, published_at) VALUES (?, ?, 'widget_config', ?, 'published', ?, 'admin', ?, ?)`).bind(uuid('rel_'), workspaceId, String(version), id, t, t)]);
  await audit(env, { workspaceId, actorType: 'admin', eventType: 'widget.publish', body: `version ${version}` }); return json({ ok: true, config: { id, workspace_id: workspaceId, version, status: 'published' } }, 201, corsHeaders(env, request));
}
function room(env, conversationId) { return env.THREAD_ROOM.get(env.THREAD_ROOM.idFromName(conversationId)); }
async function wsRoute(request, env, conversationId) { return room(env, conversationId).fetch(request); }
async function serveAsset(request, env) { const res = await env.ASSETS.fetch(request); const h = new Headers(res.headers); for (const [k, v] of Object.entries(SECURITY_HEADERS)) h.set(k, v); return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h }); }
export default { async fetch(request, env) { try { if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(env, request) }); const url = new URL(request.url); const path = url.pathname.replace(/\/$/, '') || '/'; if (path === '/api/health') return json({ ok: true, service: 'relay13-core-v1.7-connectlog-operator-proof', time: nowIso() }, 200, corsHeaders(env, request)); if (path === '/api/bootstrap' && request.method === 'POST') { const admin = requireAdmin(request, env); if (!admin.ok) return admin.response; return json({ ok: true, workspace: await ensureBootstrapWorkspace(env) }, 200, corsHeaders(env, request)); } if (path === '/api/admin/workspaces' && request.method === 'GET') return listWorkspaces(request, env); if (path === '/api/admin/workspaces' && request.method === 'POST') return createWorkspace(request, env); if (path === '/api/admin/workspace-domains' && request.method === 'GET') return listWorkspaceDomains(request, env); if (path === '/api/admin/workspace-domains' && request.method === 'POST') return createWorkspaceDomain(request, env); if (path === '/api/admin/api-keys' && request.method === 'GET') return listApiKeys(request, env); if (path === '/api/admin/api-keys' && request.method === 'POST') return createApiKey(request, env); if (path === '/api/admin/dashboard' && request.method === 'GET') return dashboard(request, env); if (path === '/api/admin/guardrails' && request.method === 'GET') return adminReadGuardrails(request, env); if (path === '/api/admin/guardrails' && request.method === 'POST') return adminUpdateGuardrails(request, env); if (path === '/api/admin/jobs' && request.method === 'POST') return createJob(request, env); if (path === '/api/admin/widget-configs/publish' && request.method === 'POST') return publishWidgetConfig(request, env); const revoke = path.match(/^\/api\/admin\/api-keys\/([^/]+)\/revoke$/); if (revoke && request.method === 'POST') return revokeApiKey(request, env, revoke[1]); if (path === '/api/v1/connectlog/health' && request.method === 'GET') return connectLogBridgeHealth(request, env); if (path === '/api/v1/connectlog/proof' && request.method === 'GET') return connectLogBridgeProof(request, env); if (path === '/api/v1/connectlog/activation' && request.method === 'GET') return connectLogActivationReadiness(request, env); if (path === '/api/v1/connectlog/activation-runs' && request.method === 'POST') return recordConnectLogActivationRun(request, env); if (path === '/api/v1/connectlog/live-proof' && request.method === 'GET') return connectLogLiveProof(request, env); if (path === '/api/v1/connectlog/live-proof-runs' && request.method === 'POST') return recordConnectLogLiveProofRun(request, env); if (path === '/api/v1/connectlog/scan' && request.method === 'POST') return createConnectLogScanConversation(request, env); if (path === '/api/v1/connectlog/cards' && request.method === 'GET') return listConnectLogCards(request, env); if (path === '/api/v1/connectlog/cards' && request.method === 'POST') return upsertConnectLogCardEndpoint(request, env); if (path === '/api/v1/connectlog/requests' && request.method === 'GET') return listConnectLogRequests(request, env); if (path === '/api/v1/connectlog/stats' && request.method === 'GET') return connectLogBridgeStats(request, env); const clReqEvents = path.match(/^\/api\/v1\/connectlog\/requests\/([^/]+)\/events$/); if (clReqEvents && request.method === 'GET') return listConnectLogRequestEvents(request, env, clReqEvents[1]); const clReqPatch = path.match(/^\/api\/v1\/connectlog\/requests\/([^/]+)$/); if (clReqPatch && request.method === 'PATCH') return updateConnectLogRequestStatus(request, env, clReqPatch[1]); if (path === '/api/admin/connectlog/requests' && request.method === 'GET') return listConnectLogRequests(request, env); if (path === '/api/v1/guardrails/proof' && request.method === 'GET') return guardrailsProof(request, env); if (path === '/api/v1/widget-config' && request.method === 'GET') return getWidgetConfig(request, env); if (path === '/api/v1/conversations' && request.method === 'POST') return createConversation(request, env); if (path === '/api/v1/conversations' && request.method === 'GET') return listConversations(request, env); const msgs = path.match(/^\/api\/v1\/conversations\/([^/]+)\/messages$/); if (msgs && request.method === 'GET') return listMessages(request, env, msgs[1]); if (msgs && request.method === 'POST') return createMessage(request, env, msgs[1]); const patchConv = path.match(/^\/api\/admin\/conversations\/([^/]+)$/); if (patchConv && request.method === 'PATCH') return updateConversation(request, env, patchConv[1]); const ws = path.match(/^\/api\/ws\/([^/]+)$/); if (ws) return wsRoute(request, env, ws[1]); return serveAsset(request, env); } catch (err) { if (err instanceof Response) return err; return json({ ok: false, error: 'Internal error' }, 500); } } };
export class ThreadRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/broadcast/')) {
      this.broadcast(await request.text());
      return json({ ok: true });
    }
    if ((request.headers.get('upgrade') || '').toLowerCase() !== 'websocket') return json({ ok: false, error: 'Expected WebSocket upgrade' }, 426);
    const conversationId = url.pathname.split('/').pop();
    const role = safeText(url.searchParams.get('role') || 'customer', 30);
    const workspaceId = safeText(url.searchParams.get('workspace_id') || '', 100);
    const tokenValue = safeText(url.searchParams.get('token') || '', 500);
    const auth = await this.authorize(conversationId, role, workspaceId, tokenValue);
    if (!auth.ok) return json({ ok: false, error: auth.error }, auth.status || 401);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server, [JSON.stringify({
      conversationId,
      role,
      workspaceId: auth.workspaceId,
      name: safeText(url.searchParams.get('name') || role, 140),
      origin: safeText(request.headers.get('origin') || request.headers.get('referer') || '', 500),
      ua: safeText(request.headers.get('user-agent') || '', 240),
      ip: safeText(request.headers.get('cf-connecting-ip') || '', 128)
    })]);
    server.send(JSON.stringify({ type: 'ready', conversation_id: conversationId, role, time: nowIso() }));
    this.presence(conversationId);
    return new Response(null, { status: 101, webSocket: client });
  }
  async authorize(conversationId, role, workspaceId, tokenValue) {
    if (!conversationId || !tokenValue) return { ok: false, error: 'Missing token', status: 401 };
    if (role === 'operator') {
      if ((this.env.PLATFORM_ADMIN_TOKEN || '').length >= 32 && timingSafeEqual(tokenValue, this.env.PLATFORM_ADMIN_TOKEN) && workspaceId) {
        const conv = await this.env.DB.prepare(`SELECT id FROM conversations WHERE id = ? AND workspace_id = ?`).bind(conversationId, workspaceId).first();
        if (!conv) return { ok: false, error: 'Conversation not found', status: 404 };
        return { ok: true, workspaceId };
      }
      return { ok: false, error: 'Invalid operator token', status: 401 };
    }
    const hash = await sha256Hex(tokenValue);
    const conv = await this.env.DB.prepare(`SELECT workspace_id FROM conversations WHERE id = ? AND visitor_token_hash = ?`).bind(conversationId, hash).first();
    if (!conv) return { ok: false, error: 'Invalid visitor token', status: 401 };
    return { ok: true, workspaceId: conv.workspace_id };
  }
  async webSocketMessage(ws, raw) {
    let meta = {};
    try { meta = JSON.parse(ws.deserializeAttachment() || '{}'); } catch {}
    let input = {};
    try { input = JSON.parse(raw); } catch { return; }
    if (input.type !== 'message') return;
    const conv = await validateConversationWorkspace(this.env, meta.conversationId, meta.workspaceId);
    if (!conv) return;
    const senderRole = meta.role === 'operator' ? 'operator' : 'customer';
    const body = safeText(input.body || '', conv.max_message_chars || DEFAULT_MAX_MESSAGE_CHARS);
    if (!body) return;
    const inputMetadata = cleanMetadata(input.metadata || {});
    let guardrail = null;
    try {
      if (senderRole === 'customer') {
        const workspace = await workspaceById(this.env, meta.workspaceId);
        guardrail = await evaluateInboundGuardrails(this.env, null, { workspace, conversationId: meta.conversationId, body, metadata: inputMetadata, input, eventType: 'websocket', network: meta });
        if (!guardrail.ok) {
          ws.send(JSON.stringify({ type: 'error', error: 'Message rejected by workspace guardrails', guardrail: { decision: guardrail.decision, reason: guardrail.reason, signals: guardrail.signals } }));
          return;
        }
      }
      const guardrailMetadata = guardrail ? { guardrail: { decision: guardrail.decision, reason: guardrail.reason, signals: guardrail.signals, route: guardrail.route }, ai_policy: guardrail.ai_policy, response_orchestration: guardrail.response_orchestration, app_knowledge_profile: guardrail.policy.app_knowledge?.profile || '' } : {};
      const message = await persistMessage(this.env, { workspaceId: meta.workspaceId, conversationId: meta.conversationId, senderRole, senderName: safeText(input.sender_name || meta.name || senderRole, 140), body, metadata: { ...inputMetadata, source: 'websocket', ...guardrailMetadata } });
      this.broadcast(JSON.stringify({ type: 'message', ...message, guardrail: guardrail ? { decision: guardrail.decision, reason: guardrail.reason, signals: guardrail.signals } : null }));
    } catch {
      ws.send(JSON.stringify({ type: 'error', error: 'Message rejected' }));
    }
  }
  async webSocketClose(ws) {
    let meta = {};
    try { meta = JSON.parse(ws.deserializeAttachment() || '{}'); } catch {}
    this.presence(meta.conversationId);
  }
  async webSocketError(ws) {
    let meta = {};
    try { meta = JSON.parse(ws.deserializeAttachment() || '{}'); } catch {}
    this.presence(meta.conversationId);
  }
  presence(conversationId) {
    if (!conversationId) return;
    this.broadcast(JSON.stringify({ type: 'presence', conversation_id: conversationId, online: this.state.getWebSockets().length, time: nowIso() }));
  }
  broadcast(payload) {
    for (const socket of this.state.getWebSockets()) {
      try { socket.send(payload); } catch {}
    }
  }
}
