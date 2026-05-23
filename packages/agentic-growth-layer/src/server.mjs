#!/usr/bin/env node
import { createServer } from "node:http";
import { runGrowthCycle, runConnectedGrowthCycle, ingestOnly, buildFallbackBrief } from "./pipeline.mjs";
import { buildStaticSitePatch } from "./adapters/static-site.mjs";

const DEFAULT_PORT = Number(process.env.PORT || 4327);
const DEFAULT_HOST = process.env.HOST || "0.0.0.0";
const JSON_LIMIT = 8 * 1024 * 1024;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(res, status, value, extraHeaders = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...extraHeaders
  });
  res.end(`${JSON.stringify(value)}\n`);
}

function corsHeaders(req, config = {}) {
  const origin = req.headers.origin || "";
  const allowed = String(config.allowedOrigins || process.env.AGENTIC_GROWTH_ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowOrigin = allowed.includes("*") || (origin && allowed.includes(origin)) ? origin || "*" : "";
  return allowOrigin ? {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-headers": "content-type, authorization, x-admin-token, x-free99-gate-session, x-skye-gate-session, x-skygate-session",
    "access-control-allow-methods": "GET,POST,OPTIONS"
  } : {};
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > JSON_LIMIT) throw new HttpError(413, "Request body is too large.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

function bearer(req) {
  const header = String(req.headers.authorization || "");
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

function gateCredential(req) {
  return bearer(req)
    || req.headers["x-free99-gate-session"]
    || req.headers["x-skye-gate-session"]
    || req.headers["x-skygate-session"]
    || req.headers["x-admin-token"]
    || "";
}

function fs27Origin(config = {}) {
  return String(
    config.fs27Origin
    || process.env.SKYGATEFS27_ORIGIN
    || process.env.SKYGATE_ORIGIN
    || "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev"
  ).replace(/\/+$/, "");
}

async function introspectFs27Token(token, config = {}) {
  if (typeof config.introspectGateToken === "function") {
    const data = await config.introspectGateToken(token);
    return {
      ok: Boolean(data?.active || data?.ok),
      status: data?.active || data?.ok ? 200 : 401,
      data,
      via: "fs27-introspection-hook"
    };
  }

  const origin = fs27Origin(config);
  if (!origin) return { ok: false, status: 503, error: "FS27 gate origin is not configured." };
  if (!token) return { ok: false, status: 401, error: "Missing FS27 gate bearer." };

  const paths = ["/auth-introspect", "/auth/introspect", "/.netlify/functions/auth-introspect"];
  let last = null;
  for (const path of paths) {
    const response = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token })
    });
    const data = await response.json().catch(() => ({ active: false }));
    last = { response, data, path };
    if (response.status === 404) continue;
    return {
      ok: response.ok && data.active === true,
      status: response.ok ? (data.active ? 200 : 401) : response.status,
      data,
      via: "fs27-introspection",
      error: data.error || (data.active ? null : "Inactive FS27 gate token.")
    };
  }
  return { ok: false, status: 404, data: last?.data || null, error: `FS27 introspection endpoint was not found at ${origin}.` };
}

function gateAuthCache(config = {}) {
  if (config.disableGateAuthCache) return null;
  if (!config._gateAuthCache) {
    Object.defineProperty(config, "_gateAuthCache", {
      value: new Map(),
      enumerable: false,
      configurable: false,
      writable: false
    });
  }
  return config._gateAuthCache;
}

async function authorize(req, config = {}) {
  const authMode = config.authMode || process.env.AGENTIC_GROWTH_AUTH_MODE || "fs27-gate";
  if (authMode === "local-dev-open" && process.env.AGENTIC_GROWTH_ALLOW_DEV_OPEN === "1") {
    return { ok: true, mode: "local-dev-open" };
  }

  const token = gateCredential(req);
  if (authMode === "zero-os-gate" && config.trustForwardedGate === true) {
    return token
      ? { ok: true, mode: "fs27-gate-forwarded" }
      : { ok: false, status: 401, error: "Missing forwarded FS27/0S gate session." };
  }

  const cache = token ? gateAuthCache(config) : null;
  const cached = cache?.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.auth, mode: "fs27-gate-cached" };
  }

  const gate = await introspectFs27Token(token, config);
  if (!gate.ok) return { ok: false, status: gate.status || 401, error: gate.error || "FS27 gate rejected the token.", gate: gate.data || null };
  const auth = {
    ok: true,
    mode: "fs27-gate",
    actor: gate.data?.email || gate.data?.username || gate.data?.sub || "fs27-gate-session",
    gate
  };
  if (cache) {
    const ttlMs = Math.max(1000, Math.min(15 * 60 * 1000, Number(config.gateAuthCacheTtlMs || process.env.AGENTIC_GROWTH_GATE_CACHE_TTL_MS || 5 * 60 * 1000)));
    cache.set(token, {auth, expiresAt: Date.now() + ttlMs});
    if (cache.size > 2000) cache.delete(cache.keys().next().value);
  }
  return auth;
}

function schemaResponse() {
  return {
    ok: true,
    endpoints: {
      health: "GET /api/agentic-growth/health",
      cycle: "POST /api/agentic-growth/v1/cycles",
      connectedCycle: "POST /api/agentic-growth/v1/cycles/pull",
      ingest: "POST /api/agentic-growth/v1/ingest",
      fallbackBrief: "POST /api/agentic-growth/v1/fallback/brief",
      staticPatch: "POST /api/agentic-growth/v1/adapters/static-site/patch"
    },
    minimumPayload: {
      business: {
        name: "Client Business",
        industry: "industry",
        services: ["service one"],
        locations: ["Phoenix AZ"]
      },
      site: {
        previewUrl: "https://client-preview.netlify.app",
        pages: [{ url: "/", title: "Home", h1: "Client Business" }]
      },
      market: {
        seedKeywords: ["service one phoenix"],
        competitors: ["https://example-competitor.com"]
      }
    },
    connectedSources: {
      gsc: "Google Search Console Search Analytics rows with keys/clicks/impressions/ctr/position.",
      semrush: "Structured rows or CSV export containing keyword, volume, KD, URL, domain, or competitor columns.",
      serp: "Live SERP provider payloads grouped by keyword with organic items, questions, and related searches."
    }
  };
}

export function createAgenticGrowthServer(config = {}) {
  return createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    const headers = corsHeaders(req, config);
    if (req.method === "OPTIONS") {
      res.writeHead(204, headers);
      res.end();
      return;
    }

    try {
      if (req.method === "GET" && url.pathname === "/api/agentic-growth/health") {
        return sendJson(res, 200, {
          ok: true,
          service: "@metraiyux/agentic-growth-layer",
          authMode: config.authMode || process.env.AGENTIC_GROWTH_AUTH_MODE || "fs27-gate",
          noGscFallback: true,
          checkedAt: new Date().toISOString()
        }, headers);
      }

      if (req.method === "GET" && url.pathname === "/api/agentic-growth/v1/schema") {
        return sendJson(res, 200, schemaResponse(), headers);
      }

      if (!url.pathname.startsWith("/api/agentic-growth/v1/")) {
        return sendJson(res, 404, { ok: false, error: "Not found" }, headers);
      }

      const auth = await authorize(req, config);
      if (!auth.ok) return sendJson(res, auth.status || 401, { ok: false, error: auth.error }, headers);
      const body = await readJson(req);

      if (req.method === "POST" && url.pathname === "/api/agentic-growth/v1/cycles") {
        return sendJson(res, 200, { auth: { mode: auth.mode }, ...runGrowthCycle(body) }, headers);
      }

      if (req.method === "POST" && url.pathname === "/api/agentic-growth/v1/cycles/pull") {
        return sendJson(res, 200, { auth: { mode: auth.mode }, ...await runConnectedGrowthCycle(body) }, headers);
      }

      if (req.method === "POST" && url.pathname === "/api/agentic-growth/v1/ingest") {
        return sendJson(res, 200, { auth: { mode: auth.mode }, ...ingestOnly(body) }, headers);
      }

      if (req.method === "POST" && url.pathname === "/api/agentic-growth/v1/fallback/brief") {
        return sendJson(res, 200, { auth: { mode: auth.mode }, ...buildFallbackBrief(body) }, headers);
      }

      if (req.method === "POST" && url.pathname === "/api/agentic-growth/v1/adapters/static-site/patch") {
        const cycle = body.plan ? { plan: body.plan } : runGrowthCycle(body);
        return sendJson(res, 200, { auth: { mode: auth.mode }, ...buildStaticSitePatch(cycle.plan, body.adapter || {}) }, headers);
      }

      return sendJson(res, 405, { ok: false, error: "Method not allowed" }, headers);
    } catch (error) {
      const status = error.status || 500;
      return sendJson(res, status, { ok: false, error: error.message || String(error) }, headers);
    }
  });
}

export function startServer(config = {}) {
  const port = Number(config.port || DEFAULT_PORT);
  const host = config.host || DEFAULT_HOST;
  const server = createAgenticGrowthServer(config);
  server.listen(port, host, () => {
    console.log(`Agentic Growth Layer API listening on http://${host}:${port}`);
  });
  return server;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  startServer();
}
