var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// cloudflare/worker.js
var VERSION = "AUTONOMOUS_BUSINESS_SITE_OPERATOR_1.0.0";
var ROUTES = [
  ["buyer_lead", /lead|buyer|sale|sell|prospect|proposal|close|ae|discovery|quote|pricing|website|white[- ]?label|client deployment|command deck/i, "celeste-monroe-brain", "adrian-cross-brain", "AE discovery follow-up, buyer qualification, and live proof routing"],
  ["client_onboarding", /client|onboard|renewal|escalation|launch|status/i, "adrian-cross-brain", "marcus-vale-brain", "Client onboarding and delivery status setup"],
  ["candidate_or_staffing", /candidate|recruit|job order|staff|worker|placement|resume/i, "sienna-brooks-brain", "adrian-cross-brain", "Candidate screening or job order fulfillment"],
  ["finance_or_pricing", /finance|invoice|billing|payroll|margin|commission|price|cost/i, "naomi-sterling-brain", "celeste-monroe-brain", "Pricing, margin, billing, or commission review"],
  ["compliance_or_contracting", /contract|legal|compliance|policy|filing|incorporation|insurance|risk/i, "julian-mercer-brain", "donovan-pierce-brain", "Compliance routing and professional review flag"],
  ["technology_or_site", /site|deploy|deployment|worker|cloudflare|automation|brain|api|dashboard|system|skygate|fs27|gate|auth|introspect|platform event/i, "orion-hayes-brain", "site-operator-autonomous-business-brain", "Technology, deployment, automation, gate, or site operation review"],
  ["marketing_or_content", /marketing|brand|copy|seo|content|campaign|public claim/i, "valentina-reyes-brain", "victor-saint-brain", "Marketing copy, content control, or public claim review"],
  ["government_enterprise", /government|enterprise|sam|naics|procurement|bid|subcontract/i, "donovan-pierce-brain", "julian-mercer-brain", "Government/enterprise readiness review"],
  ["vendor_partner", /vendor|partner|subcontractor|referral|alliance/i, "helena-ward-brain", "julian-mercer-brain", "Partner/vendor intake and risk review"],
  ["quality_proof", /proof|qa|claim|audit|receipt|smoke|test|verify/i, "victor-saint-brain", "marcus-vale-brain", "Proof receipt, QA review, or claims validation"],
  ["innovation_expansion", /innovation|expansion|new market|automation|acquisition|branch/i, "amara-voss-brain", "gray-london-skyes-brain", "Expansion, innovation, or new lane evaluation"],
  ["founder_strategy", /founder|gray|vision|strategy|ownership|doctrine|command/i, "gray-london-skyes-brain", "central-company-command-brain", "Founder strategy and executive command review"]
];
var LIVE_SURFACES = [
  {
    id: "skygate-fs27-proof-surface",
    name: "SkyeGateFS27 Proof Surface",
    url: "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/gate-proofx.html",
    purpose: "Public proof page for the gate, auth introspection, mirrored events, and MetrAIyux integration.",
    route_when: ["proof", "gate", "auth", "architecture", "trust", "client command deck", "sovereign infrastructure"]
  },
  {
    id: "skygate-fs27-actual-gate",
    name: "SkyeGateFS27 Actual Gate",
    url: "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/",
    purpose: "Live gate control plane with protected admin lanes, dashboard, smoke tests, and platform control.",
    route_when: ["actual gate", "dashboard", "key", "admin", "monitor", "smoke test", "platform control"]
  },
  {
    id: "metraiyux-full-system",
    name: "MetrAIyux 0S Full System",
    url: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/",
    purpose: "Live 16-brain business command deck and client-deployment reference.",
    route_when: ["metraiyux", "16 brains", "command deck", "autonomous business", "client website", "owner admin", "sales deck"]
  },
  {
    id: "metraiyux-public-spectacle",
    name: "MetrAIyux 0S Public Spectacle",
    url: "https://metraiyux-0s-public-spectacle.pages.dev/",
    purpose: "Public overview for cold prospects and send-first buyers before they enter the deeper command deck.",
    route_when: ["overview", "public", "sendable", "spectacle", "what is it", "value"]
  },
  {
    id: "metraiyux-admin-brain",
    name: "Main Automation Brain",
    url: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/admin/automation-brain.html",
    purpose: "Protected owner/admin command brain for authenticated demos, approval flows, cabinet routing, and receipts.",
    route_when: ["admin", "operator", "automation brain", "approval", "token", "private"]
  },
  {
    id: "metraiyux-sales-enablement",
    name: "Sales Enablement Command Library",
    url: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/sales-enablement/index.html",
    purpose: "Discovery blueprint, objection handling, outbound follow-up, demo-room structure, and AE proof packet.",
    route_when: ["sales", "ae", "discovery", "objection", "close", "follow up", "proposal"]
  },
  {
    id: "metraiyux-client-os",
    name: "Client OS",
    url: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/client-os/index.html",
    purpose: "Client onboarding, document requests, escalation desk, renewal review, and status-board surfaces.",
    route_when: ["client", "onboarding", "status", "escalation", "renewal", "document request"]
  },
  {
    id: "metraiyux-proof-router",
    name: "Live Proof Router",
    url: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/sales/live-proof-router.html",
    purpose: "Interactive sales router that matches buyer pain to live proof surfaces.",
    route_when: ["which link", "route buyer", "proof router", "what should i show", "live surfaces", "sell"]
  }
];
function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type,authorization,x-skygate-app,x-kaixu-app,x-kaixu-build,x-kaixu-request-id" } });
}
__name(json, "json");
async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
__name(readJson, "readJson");
function bearer(request) {
  return (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
}
__name(bearer, "bearer");
function skygateOrigin(env) {
  return String(env.SKYGATEFS27_ORIGIN || env.SKYGATE_ORIGIN || "").replace(/\/+$/, "");
}
__name(skygateOrigin, "skygateOrigin");
function mirrorSecret(env) {
  return String(env.SKYGATE_EVENT_MIRROR_SECRET || env.SKYGATEFS27_EVENT_MIRROR_SECRET || "").trim();
}
__name(mirrorSecret, "mirrorSecret");
async function introspectSkygate(request, env) {
  const origin = skygateOrigin(env);
  const token = bearer(request);
  if (!origin) return { ok: false, status: 501, error: "SKYGATEFS27_ORIGIN/SKYGATE_ORIGIN is not configured." };
  if (!token) return { ok: false, status: 401, error: "Missing Authorization bearer token." };
  const paths = ["/auth-introspect", "/auth/introspect", "/.netlify/functions/auth-introspect"];
  let last = null;
  for (const path of paths) {
    const res = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token })
    });
    const data = await res.json().catch(() => ({ active: false, error: "Invalid Skyegate response" }));
    last = { res, data, path };
    if (res.status === 404) continue;
    return { ok: res.ok && data.active === true, status: res.ok ? data.active ? 200 : 401 : res.status, data, path, error: data.error || (data.active ? null : "Inactive Skyegate token") };
  }
  return { ok: false, status: 404, data: last?.data || null, error: `Skyegate introspection endpoint was not found at ${origin}` };
}
__name(introspectSkygate, "introspectSkygate");
async function mirrorSkygateEvent(env, payload = {}, actorContext = null) {
  const origin = skygateOrigin(env);
  const secret = mirrorSecret(env);
  if (!origin || !secret) return { ok: false, skipped: true, reason: "Skyegate origin or mirror secret is not configured." };
  const actor = actorContext?.data?.email || actorContext?.data?.username || actorContext?.data?.sub || payload.actor || "metraiyux-0s";
  const body = {
    source_app: env.SKYGATE_SOURCE_APP || "metraiyux-0s",
    actor,
    org_id: actorContext?.data?.org || actorContext?.data?.customer_id || payload.org_id || null,
    ws_id: payload.ws_id || payload.meta?.workspace_id || payload.meta?.receipt_id || null,
    type: payload.type || "metraiyux.event",
    event_ts: payload.event_ts || (/* @__PURE__ */ new Date()).toISOString(),
    meta: payload.meta || {}
  };
  const res = await fetch(`${origin}/platform/events`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-skygate-mirror-secret": secret },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({ ok: false, status: res.status }));
  return { ok: res.ok, status: res.status, data };
}
__name(mirrorSkygateEvent, "mirrorSkygateEvent");
function routeMessage(message = "") {
  const hit = ROUTES.find((r) => r[1].test(message)) || ["general_company_command", /./, "central-company-command-brain", "site-operator-autonomous-business-brain", "General company command review"];
  return { id: `evt_${Date.now()}`, created_at: (/* @__PURE__ */ new Date()).toISOString(), intent: hit[0], primary_brain: hit[2], secondary_brain: hit[3], recommended_task: hit[4], message, live_surfaces: surfaceMatches(message), guardrail: "Human operator approval required for contracts, filings, hiring/firing, payments, legal advice, or public claims." };
}
__name(routeMessage, "routeMessage");
function surfaceMatches(message = "", limit = 3) {
  const text = String(message).toLowerCase();
  return LIVE_SURFACES.map((surface) => {
    const hay = [surface.name, surface.purpose, ...surface.route_when || []].join(" ").toLowerCase();
    let score = 0;
    for (const term of text.split(/[^a-z0-9-]+/).filter(Boolean)) if (hay.includes(term)) score += term.length > 5 ? 3 : 1;
    if (/sell|buyer|prospect|client|lead|website|white[- ]?label|command deck|deployment|proof|gate|auth|skygate|fs27/i.test(text)) score += 4;
    return { ...surface, score };
  }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(({ score, ...surface }) => surface);
}
__name(surfaceMatches, "surfaceMatches");
function siteOperatorStatus(env) {
  return {
    ok: true,
    version: VERSION,
    total_system_brains: 16,
    connected_brains: 16,
    mode: "worker-ready",
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
__name(siteOperatorStatus, "siteOperatorStatus");
async function saveKV(env, key, value) {
  if (env.SITE_EVENTS_KV) await env.SITE_EVENTS_KV.put(key, JSON.stringify(value), { expirationTtl: 60 * 60 * 24 * 90 });
}
__name(saveKV, "saveKV");
async function readKVLedger(env, limit = 50) {
  if (!env.SITE_EVENTS_KV?.list) return [];
  const listed = await env.SITE_EVENTS_KV.list({ limit });
  const rows = [];
  for (const key of listed.keys || []) {
    const item = await env.SITE_EVENTS_KV.get(key.name, { type: "json" }).catch(() => null);
    if (item) rows.push(item);
  }
  return rows.sort((a, b) => String(b.created_at || b.event_ts || "").localeCompare(String(a.created_at || a.event_ts || "")));
}
__name(readKVLedger, "readKVLedger");
var PROXIES = [
  ["/api/site-operator/", "SITE_OPERATOR_WORKER_ORIGIN", "SITE_OPERATOR_WORKER"],
  ["/api/admin/", "ADMIN_WORKER_ORIGIN", "ADMIN_WORKER"],
  ["/api/saas/", "SAAS_WORKER_ORIGIN", "SAAS_WORKER"],
  ["/api/omega/", "OMEGA_WORKER_ORIGIN", "OMEGA_WORKER"],
  ["/api/crown/", "CROWN_WORKER_ORIGIN", "CROWN_WORKER"],
  ["/api/nexus/", "NEXUS_WORKER_ORIGIN", "NEXUS_WORKER"],
  ["/api/sentinel/", "SENTINEL_WORKER_ORIGIN", "SENTINEL_WORKER"]
];
var PRIVATE_SOURCE_PATHS = [
  /^\/coming-soon(?:\/|$)/i,
  /^\/live(?:\/|$)/i,
  /(^|\/)\.env(?:\.[^/]+)?$/i,
  /^\/cloudflare(?:\/|$)/i,
  /^\/cloudflare-[^/]+(?:\/|$)/i,
  /^\/wrangler(?:\.[^/]+)?\.toml$/i,
  /^\/_(?:headers|redirects)$/i,
  /\/wrangler(?:\.[^/]+)?\.toml$/i,
  /\/migrations\/[^/]+\.(?:sql|js)$/i,
  /\/schema\.sql$/i,
  /\/README(?:_[^/]+)?\.md$/i
];
function isPrivateSourcePath(pathname) {
  return PRIVATE_SOURCE_PATHS.some((pattern) => pattern.test(pathname));
}
__name(isPrivateSourcePath, "isPrivateSourcePath");
function privateSourceResponse() {
  return new Response("Private implementation source is not public. Use /security.html or /tech-stack.html for the buyer-facing architecture overview.", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow"
    }
  });
}
__name(privateSourceResponse, "privateSourceResponse");
async function proxyApi(request, env, url) {
  const hit = PROXIES.find(([prefix]) => url.pathname.startsWith(prefix));
  if (!hit) return null;
  const service = env[hit[2]];
  if (service) return service.fetch(request);
  const origin = env[hit[1]];
  if (!origin) return json({ ok: false, error: `${hit[1]} is not configured` }, 502);
  const upstream = new URL(request.url);
  const target = new URL(origin);
  upstream.protocol = target.protocol;
  upstream.host = target.host;
  return fetch(new Request(upstream, request));
}
__name(proxyApi, "proxyApi");
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (isPrivateSourcePath(url.pathname)) return privateSourceResponse();
    if (request.method === "OPTIONS") return json({ ok: true });
    if (url.pathname === "/api/skygate/auth-introspect" && request.method === "POST") {
      const gate = await introspectSkygate(request, env);
      return json({ ok: gate.ok, active: Boolean(gate.data?.active), skygate: gate.data || null, error: gate.ok ? null : gate.error }, gate.status || (gate.ok ? 200 : 401));
    }
    if (url.pathname === "/api/skygate/platform-event" && request.method === "POST") {
      const gate = await introspectSkygate(request, env);
      if (!gate.ok) return json({ ok: false, error: gate.error, skygate: gate.data || null }, gate.status || 401);
      const body = await readJson(request);
      const mirrored = await mirrorSkygateEvent(env, body, gate);
      return json({ ok: mirrored.ok, mirrored, skygate: { active: true, sub: gate.data?.sub, email: gate.data?.email || gate.data?.username || null } });
    }
    if (url.pathname === "/api/site-operator/status") return json(siteOperatorStatus(env));
    if (url.pathname === "/api/site-operator/live-surfaces") return json({ ok: true, surfaces: LIVE_SURFACES });
    if (url.pathname === "/api/site-operator/route" && request.method === "POST") {
      const body = await readJson(request);
      const receipt = routeMessage(body.message || body.text || "");
      ctx.waitUntil(saveKV(env, receipt.id, receipt));
      ctx.waitUntil(mirrorSkygateEvent(env, { type: "site_operator.route", meta: { receipt_id: receipt.id, intent: receipt.intent, primary_brain: receipt.primary_brain, secondary_brain: receipt.secondary_brain, message_preview: String(receipt.message || "").slice(0, 500) } }));
      return json({ ok: true, receipt, stored: { kv: Boolean(env.SITE_EVENTS_KV), d1: Boolean(env.SITE_OPERATOR_WORKER || env.SITE_OPERATOR_WORKER_ORIGIN) } });
    }
    if (url.pathname === "/api/site-operator/event" && request.method === "POST") {
      const body = await readJson(request);
      const receipt = { ...body, id: body.id || `evt_${Date.now()}`, created_at: body.created_at || (/* @__PURE__ */ new Date()).toISOString(), type: body.type || "site_event" };
      ctx.waitUntil(saveKV(env, receipt.id, receipt));
      ctx.waitUntil(mirrorSkygateEvent(env, { type: receipt.type || "site_operator.event", meta: { ...receipt, message: String(receipt.message || receipt.text || "").slice(0, 500) } }));
      return json({ ok: true, receipt, stored: Boolean(env.SITE_EVENTS_KV) });
    }
    if (url.pathname === "/api/site-operator/task" && request.method === "POST") {
      const body = await readJson(request);
      const task = { id: body.id || `task_${Date.now()}`, created_at: (/* @__PURE__ */ new Date()).toISOString(), status: "queued_for_operator_review", ...body };
      if (env.SITE_TASK_QUEUE) ctx.waitUntil(env.SITE_TASK_QUEUE.send(task));
      ctx.waitUntil(saveKV(env, task.id, task));
      ctx.waitUntil(mirrorSkygateEvent(env, { type: "site_operator.task", meta: { task_id: task.id, status: task.status, title: task.title || task.task || null } }));
      return json({ ok: true, task, queued: Boolean(env.SITE_TASK_QUEUE), stored: Boolean(env.SITE_EVENTS_KV) });
    }
    if (url.pathname === "/api/site-operator/ledger") {
      const events = await readKVLedger(env);
      return json({ ok: true, persistence: Boolean(env.SITE_OPERATOR_WORKER || env.SITE_OPERATOR_WORKER_ORIGIN) ? "d1" : "kv", events });
    }
    const proxied = await proxyApi(request, env, url);
    if (proxied) return proxied;
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Site Operator Brain Worker is running. Static asset binding not configured.", { status: 200 });
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
