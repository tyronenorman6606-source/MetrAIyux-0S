import { neon } from "@neondatabase/serverless";
import { Webhook } from "svix";
import bcrypt from "bcryptjs";

const TEXT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const FS27_PUBLIC_JWKS_FALLBACK = {
  keys: [
    {
      kty: "RSA",
      use: "sig",
      alg: "RS256",
      kid: "sgfs13-mp7bokbn-2d10a365",
      n: "wvdKndDaBaim0PxX2_2yyQJ-fefq4ek-n38TwG-8Daa2_jEvrA8Cx9Xq7rmXJxAUmwvNAVputO0R46eyJ3Us5Sye82_WrWUnl3aGrnX7tztKXwK0kA61-u2Fdgfew20GJLPa5g7hzY50jRE3dF1bspVuiGc8ExylOGmXRy0Oi8YD159Ss7L3AEm3YxQDx5QbVnxVME5EhexVxhKmBZhA8idZUW6Yyp5sYPETzeQSQCfVtj7Woqi8GFhu23S0YGsV0F9gcqqs5XMNJqLroeFVGZjprpMwqWZUW1nK9jTgnAWBNLIcxB5Sn6vp5bhcNojicGmUBQeJxbuZjzgb21hvaw",
      e: "AQAB",
    },
  ],
};

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization,x-skymail-provision-secret,x-skymail-service-token,x-skymail-mailbox-email,x-skymail-mailbox",
      ...extra,
    },
  });
}

function clean(value) {
  return String(value || "").trim();
}

function displayProviderName(value) {
  return clean(value || "SkyeMail").replace(/skymail/ig, "SkyeMail");
}

function normalizeEmail(value) {
  return clean(value).toLowerCase();
}

function normalizeHandle(value) {
  return clean(value)
    .toLowerCase()
    .replace(/@.*$/, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .replace(/[._-]{2,}/g, "-")
    .slice(0, 32) || "skyemail-user";
}

function validHandle(value) {
  return /^[a-z0-9][a-z0-9._-]{2,31}$/i.test(String(value || ""));
}

function stableHex(value, length = 16) {
  let hash = 0x811c9dc5;
  for (const ch of String(value || "")) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const first = hash.toString(16).padStart(8, "0");
  const second = Math.imul(hash ^ 0x9e3779b9, 0x85ebca6b).toString(16).replace("-", "").padStart(8, "0");
  return `${first}${second}`.slice(0, length);
}

const SKYE_MEMORY_CACHE = globalThis.__SKYEMAIL_MEMORY_CACHE__ || new Map();
globalThis.__SKYEMAIL_MEMORY_CACHE__ = SKYE_MEMORY_CACHE;

function cacheGet(key) {
  const item = SKYE_MEMORY_CACHE.get(key);
  if (!item) return null;
  if (item.expires_at && item.expires_at <= Date.now()) {
    SKYE_MEMORY_CACHE.delete(key);
    return null;
  }
  return item.value;
}

function cacheSet(key, value, ttlMs = 30000) {
  SKYE_MEMORY_CACHE.set(key, { value, expires_at: Date.now() + Math.max(1000, ttlMs) });
  if (SKYE_MEMORY_CACHE.size > 500) {
    for (const staleKey of SKYE_MEMORY_CACHE.keys()) {
      SKYE_MEMORY_CACHE.delete(staleKey);
      if (SKYE_MEMORY_CACHE.size <= 400) break;
    }
  }
  return value;
}

async function cachedPromise(key, ttlMs, producer) {
  const cached = cacheGet(key);
  if (cached) return cached;
  const promise = Promise.resolve().then(producer);
  cacheSet(key, promise, ttlMs);
  try {
    const value = await promise;
    cacheSet(key, value, ttlMs);
    return value;
  } catch (error) {
    SKYE_MEMORY_CACHE.delete(key);
    throw error;
  }
}

function timeoutAfter(ms, valueFactory) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(typeof valueFactory === "function" ? valueFactory() : valueFactory), Math.max(50, Number(ms || 0)));
  });
}

function makeSkyeMailId({ email, handle, fs27Sub } = {}) {
  return `skymail_${stableHex(fs27Sub || email || handle || crypto.randomUUID(), 16)}`;
}

function makeWorkspaceId({ email, handle, fs27CustomerId, fs27Sub } = {}) {
  return `skymail_ws_${stableHex(fs27CustomerId || fs27Sub || email || handle || crypto.randomUUID(), 16)}`;
}

function makeGateCardId({ fs27CardId, fs27Sub, email, handle } = {}) {
  return clean(fs27CardId) || `gate_basic_${stableHex(fs27Sub || email || handle || crypto.randomUUID(), 20)}`;
}

function splitEmail(value) {
  const email = normalizeEmail(value);
  const parts = email.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { email, local: parts[0], domain: parts[1] };
}

function cleanOrigin(value) {
  return clean(value).replace(/\/+$/, "");
}

function cookieValue(request, name) {
  const raw = String(request.headers.get("cookie") || "");
  for (const part of raw.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return "";
}

function bearer(request) {
  const values = [
    request.headers.get("authorization"),
    request.headers.get("x-skye-gate-session"),
    request.headers.get("x-skygate-session"),
    request.headers.get("x-fs27-session"),
    request.headers.get("x-0s-gate-session"),
    request.headers.get("x-free99-gate-session"),
    cookieValue(request, "METRAIYUX_GATE_SESSION"),
    cookieValue(request, "SKYGATEFS27_GATE_SESSION"),
    cookieValue(request, "SKYE_GATE_SESSION"),
    cookieValue(request, "metraiyux_admin_session"),
    cookieValue(request, "skye_gate_session"),
  ];
  return values.map((value) => clean(value).replace(/^Bearer\s+/i, "")).find(Boolean) || "";
}

function base64Url(input) {
  const bytes = input instanceof Uint8Array ? input : new TextEncoder().encode(String(input));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(length = 24) {
  const bytes = crypto.getRandomValues(new Uint8Array(Math.max(12, length)));
  return base64Url(bytes).slice(0, length);
}

function base64FromBytes(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function proofBlob(payload = {}) {
  return base64Url(JSON.stringify({ proof_payload: true, ...payload }));
}

function openProofBlob(value) {
  try {
    const raw = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded));
    return parsed && parsed.proof_payload ? parsed : null;
  } catch {
    return null;
  }
}

function pemToDer(pem) {
  const b64 = String(pem || "")
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function hybridEncrypt(publicKeyPem, payload) {
  const plaintext = payload instanceof Uint8Array
    ? payload
    : new TextEncoder().encode(JSON.stringify(payload));
  const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", aesKey));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, plaintext));
  const publicKey = await crypto.subtle.importKey(
    "spki",
    pemToDer(publicKeyPem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );
  const encryptedKey = new Uint8Array(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawKey));
  return {
    encrypted_key_b64: base64FromBytes(encryptedKey),
    iv_b64: base64FromBytes(iv),
    ciphertext_b64: base64FromBytes(ciphertext),
  };
}

async function hmacSha256(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function verifySharedGateJwt(token, secret) {
  const parts = String(token || "").split(".");
  if (!secret || parts.length !== 3) return null;
  const expected = base64Url(await hmacSha256(secret, `${parts[0]}.${parts[1]}`));
  if (expected !== parts[2]) return null;
  const payload = decodeJwtPart(parts[1]);
  if (payload.exp && Number(payload.exp) <= Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function fs27ClaimsFromJwt(payload = {}) {
  const role = String(payload.role || payload.auth_role || "").toLowerCase();
  if (!["admin", "owner", "founder", "deployer", "operator", "user", "viewer"].includes(role)) return null;
  const scopes = role === "admin" || role === "owner" || role === "founder"
    ? ["admin.read", "admin.write", "keys.write", "gateway.invoke", "skyevault.admin"]
    : ["gateway.read"];
  const email = payload.email || payload.username || "";
  const sub = payload.user_id || payload.sub || email || "fs27-shared-gate";
  return {
    active: true,
    scope: payload.scope || scopes.join(" "),
    scopes,
    client_id: payload.client_id || "fs27-admin",
    username: email || sub,
    token_type: "Bearer",
    exp: payload.exp || null,
    iat: payload.iat || null,
    sub,
    role: role || "user",
    sub_type: payload.user_id ? "user" : "admin",
    aud: payload.aud || "skyegatefs27",
    customer_id: payload.customer_id || payload.org || null,
    session_id: payload.sid || payload.session_id || null,
    api_key_id: payload.api_key_id || null,
    email: email || null,
    email_verified: Boolean(email),
    org: payload.customer_id || payload.org || null,
    via: payload.via || "skymail-local-shared-gate-jwt",
    gate_card_id: payload.gate_card_id || `gate_${stableHex(sub, 20)}`,
  };
}

function base64UrlToBytes(value) {
  const raw = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeJwtPart(value) {
  const bytes = base64UrlToBytes(value);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function scopeString(scope) {
  if (!scope) return "";
  if (Array.isArray(scope)) return scope.map(String).filter(Boolean).join(" ");
  return String(scope);
}

function scopeArray(scope) {
  if (!scope) return [];
  if (Array.isArray(scope)) return scope.map(String).filter(Boolean);
  return String(scope).split(/\s+/).filter(Boolean);
}

function gateCardIdFromClaims(claims = {}) {
  return `gate_basic_${stableHex(claims.sub || claims.email || claims.customer_id || claims.sid || "skyegatefs27", 20)}`;
}

async function verifyFs27JwtWithJwks(origin, token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const header = decodeJwtPart(parts[0]);
  if (header.alg !== "RS256" || !header.kid) return null;
  let jwks = null;
  try {
    const jwksRes = await fetch(`${origin}/.well-known/jwks.json`, { headers: { accept: "application/json" } });
    if (jwksRes.ok) jwks = await jwksRes.json();
  } catch {
    jwks = null;
  }
  if (!jwks?.keys?.length) {
    jwks = FS27_PUBLIC_JWKS_FALLBACK;
  }
  const jwk = (jwks.keys || []).find((key) => key.kid === header.kid && key.kty === "RSA");
  if (!jwk) return null;
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) return null;
  const claims = decodeJwtPart(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud].filter(Boolean);
  if (claims.exp && Number(claims.exp) <= now) return null;
  if (claims.iss && String(claims.iss).replace(/\/+$/, "") !== origin) return null;
  if (aud.length && !aud.includes("skyegatefs27") && !aud.includes("skygatefs13")) return null;
  const scopes = scopeArray(claims.scope);
  const gateCardId = gateCardIdFromClaims(claims);
  return {
    active: true,
    verified_by: "jwks",
    scope: scopeString(scopes),
    client_id: claims.client_id || "system",
    username: claims.email || claims.sub,
    token_type: "Bearer",
    exp: claims.exp,
    iat: claims.iat,
    sub: claims.sub,
    role: claims.role || "user",
    sub_type: claims.sub_type || null,
    aud: claims.aud,
    customer_id: claims.customer_id || null,
    session_id: claims.sid || null,
    api_key_id: claims.api_key_id || null,
    email: claims.email || null,
    email_verified: claims.email_verified || false,
    org: claims.customer_id || null,
    gate_card_id: gateCardId,
    gate_card: {
      id: gateCardId,
      type: "basic_gate_card",
      status: "active",
      principal: "session",
      sub: claims.sub,
      email: claims.email || null,
      customer_id: claims.customer_id || null,
      role: claims.role || "user",
      session_id: claims.sid || null,
      scope: scopes,
      usage_required: false,
      reloadable: true,
    },
  };
}

function getPrimarySql(env) {
  const url = databaseUrlWithSearchPath(env.NEON_DATABASE_URL || env.DATABASE_URL, env);
  if (!url) throw Object.assign(new Error("NEON_DATABASE_URL/DATABASE_URL is missing."), { statusCode: 501 });
  return neon(url);
}

function getCitadelSql(env) {
  const url = databaseUrlWithSearchPath(env.CITADEL_DATABASE_URL || env.CITADEL_BACKUP_DATABASE_URL, env);
  return url ? neon(url) : null;
}

const SKYMAIL_TABLES = [
  "users",
  "user_keys",
  "threads",
  "messages",
  "attachments",
  "google_mailboxes",
  "user_preferences",
  "mail_contacts",
  "resend_webhook_events",
  "zoho_webhook_events",
  "message_delivery_events",
  "message_label_states",
  "workflow_packets",
	  "workflow_events",
	  "brain_events",
	  "brain_monitors",
	  "ai_entitlements",
	  "ai_usage_events",
	  "hosted_mailboxes",
  "mailbox_aliases",
  "mailbox_offboarding_events",
  "workspace_key_cards",
  "skymail_backup_events",
  "skyemail_telemetry_events",
  "skyemail_game_events",
];

function schemaName(env) {
  const schema = clean(env.SKYMAIL_DB_SCHEMA || "skymail");
  return /^[a-z_][a-z0-9_]*$/i.test(schema) ? schema : "skymail";
}

function qualifySkymailSql(text, env) {
  const schema = schemaName(env);
  return String(text || "").replace(
    new RegExp(`\\b(from|join|into|update)\\s+(${SKYMAIL_TABLES.join("|")})\\b`, "gi"),
    (_match, keyword, table) => `${keyword} ${schema}.${table}`,
  );
}

function databaseUrlWithSearchPath(value, env) {
  const raw = clean(value);
  if (!raw) return "";
  const schema = clean(env.SKYMAIL_DB_SCHEMA || "skymail");
  if (!schema) return raw;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("options")) {
      url.hostname = url.hostname.replace("-pooler.", ".");
      url.searchParams.set("options", `--search_path=${schema},public`);
    }
    return url.toString();
  } catch {
    return raw;
  }
}

async function query(env, text, params = []) {
  const sql = getPrimarySql(env);
  return await sql.query(qualifySkymailSql(text, env), params);
}

async function queryCitadel(env, text, params = []) {
  const sql = getCitadelSql(env);
  if (!sql) return { skipped: true, reason: "CITADEL_DATABASE_URL is not configured." };
  return await sql.query(qualifySkymailSql(text, env), params);
}

async function requireAuth(request, env) {
  const token = bearer(request);
  if (!token) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  const cacheKey = `auth:${stableHex(token, 32)}`;
  const cached = cacheGet(cacheKey);
  if (cached?.sub) return { ...cached, gate_token: token, auth_cache: "memory-hit" };
  const claims = await introspectFs27(env, token);
  const user = await ensureUserFromFs27(env, claims, { token });
  const auth = {
    sub: user.id,
    handle: user.handle,
    email: user.email,
    skymail_id: user.skymail_id || null,
    workspace_id: user.workspace_id || null,
    auth_provider: "skygatefs27",
    fs27_sub: claims.sub || null,
    fs27_customer_id: claims.customer_id || claims.org || null,
    fs27_gate_card_id: user.fs27_gate_card_id || claims.gate_card_id || null,
    fs27_role: claims.role || null,
    gate_token: token,
    fs27_claims: claims
  };
  cacheSet(cacheKey, { ...auth, gate_token: "" }, 45000);
  return auth;
}

function configuredDomains(env) {
  const primary = clean(env.SKYMAIL_PRIMARY_DOMAIN || env.INBOUND_DOMAIN).toLowerCase();
  const extras = clean(env.SKYMAIL_ALLOWED_DOMAINS).split(",").map((v) => clean(v).toLowerCase()).filter(Boolean);
  return Array.from(new Set([primary, ...extras].filter(Boolean)));
}

function normalizeMessages(messages = []) {
  return Array.isArray(messages)
    ? messages.map((item) => ({
      role: ["system", "assistant", "user"].includes(item?.role) ? item.role : "user",
      content: String(item?.content || "").slice(0, 20000),
    })).filter((item) => item.content)
    : [];
}

const FS27_BRAIN_RUNTIME_ALIASES = Object.freeze({
  KAIXU_6_7_NANO: { public_model: "kaixu-6.7-nano" },
  KAIXU_6_7_MINI: { public_model: "kaixu-6.7-mini" },
  KAIXU_6_7: { public_model: "kaixu-6.7" },
  KAIXU_6_7_PRO: { public_model: "kaixu-6.7-pro" },
  KAIXU_6_7_MAX: { public_model: "kaixu-6.7-max" },
});

const SKYMAIL_AI_PLANS = Object.freeze({
  skymail_ai_free: { id: "skymail_ai_free", name: "SkyeMail Local Brain", included_messages: 0, backup_messages: 0, monthly_cents_cap: 0, provider_calls: false, auto_send: false },
  "skyemail-ai-response-starter": { id: "skyemail-ai-response-starter", name: "SkyeMail AI Response Starter", included_messages: 125, backup_messages: 31, monthly_cents_cap: 700, provider_calls: true, auto_send: false },
  "skyemail-ai-response-plus": { id: "skyemail-ai-response-plus", name: "SkyeMail AI Response Plus", included_messages: 425, backup_messages: 76, monthly_cents_cap: 2200, provider_calls: true, auto_send: false },
  "skyemail-managed-ai-inbox": { id: "skyemail-managed-ai-inbox", name: "SkyeMail Managed AI Inbox", included_messages: 1000, backup_messages: 222, monthly_cents_cap: 6500, provider_calls: true, auto_send: true },
  owner_operator: { id: "owner_operator", name: "Owner Operator FS27 Brain Lane", included_messages: 10000, backup_messages: 2500, monthly_cents_cap: 25000, provider_calls: true, auto_send: true },
});

function skygateOrigin(env) {
  return cleanOrigin(env.SKYGATEFS27_ORIGIN || env.SKYGATE_ORIGIN);
}

async function skygateRequest(env, path, init = {}) {
  const origin = skygateOrigin(env) || "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev";
  if (env.SKYGATEFS27_WORKER?.fetch) {
    try {
      const response = await env.SKYGATEFS27_WORKER.fetch(new Request(`https://skyegatefs27.internal${path}`, init));
      if (response.status !== 404 && (response.status < 500 || !origin)) return response;
      if (response.status === 404 && !origin) return response;
    } catch {
      if (!origin) throw Object.assign(new Error("SkyeGate service binding failed and no public origin is configured."), { statusCode: 502 });
    }
  }
  return await fetch(`${origin}${path}`, init);
}

function skymailAiGatewayToken(env = {}) {
  return clean(
    env.FS27_AI_GATEWAY_TOKEN
    || env.SKYGATE_AI_GATEWAY_TOKEN
    || env.SKYEMAIL_KAIXU_GATEWAY_TOKEN
    || env.SKYMAIL_KAIXU_GATEWAY_TOKEN
    || env.KAIXU_GATEWAY_TOKEN
    || env.KAIXU_GATEWAY_SUBKEY
    || env.KAIXU_GATEWAY_KEY
    || env.KAIXU_ADMIN_KEY
    || ""
  );
}

function skymailAiGatewayBearer(request, env = {}, auth = {}) {
  const configured = skymailAiGatewayToken(env);
  if (configured) return { token: configured, source: "configured_fs27_gateway_key" };
  const gateSession = clean(auth.gate_token || bearer(request));
  if (gateSession) return { token: gateSession, source: "fs27_gate_session" };
  return { token: "", source: "missing" };
}

function fs27BrainModelToken(value = "") {
  const raw = clean(value);
  if (!raw) return "";
  const lower = raw.toLowerCase();
  const aliases = {
    "kaixu-6.7-nano": "KAIXU_6_7_NANO",
    "kaixu-6.7-mini": "KAIXU_6_7_MINI",
    "kaixu-6.7": "KAIXU_6_7",
    "kaixu-6.7-pro": "KAIXU_6_7_PRO",
    "kaixu-6.7-max": "KAIXU_6_7_MAX",
    "kaixu_6_7_nano": "KAIXU_6_7_NANO",
    "kaixu_6_7_mini": "KAIXU_6_7_MINI",
    "kaixu_6_7": "KAIXU_6_7",
    "kaixu_6_7_pro": "KAIXU_6_7_PRO",
    "kaixu_6_7_max": "KAIXU_6_7_MAX",
    nano: "KAIXU_6_7_NANO",
    fast: "KAIXU_6_7_MINI",
    standard: "KAIXU_6_7",
    default: "KAIXU_6_7",
    deep: "KAIXU_6_7_PRO",
    operator: "KAIXU_6_7_PRO",
  };
  return aliases[lower] || raw.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
}

function resolveSkymailFs27BrainRuntime(env, requested = "") {
  const configured = requested || env.FS27_BRAIN_MODEL || env.KAIXU_MODEL || "KAIXU_6_7";
  const token = fs27BrainModelToken(configured) || "KAIXU_6_7";
  const fs27Runtime = FS27_BRAIN_RUNTIME_ALIASES[token] || FS27_BRAIN_RUNTIME_ALIASES.KAIXU_6_7;
  return {
    source: "fs27_skygate_brain",
    provider: "kaixu",
    provider_label: "Skyes Over London",
    provider_path: "fs27-gateway-chat",
    model: FS27_BRAIN_RUNTIME_ALIASES[token] ? token : "KAIXU_6_7",
    public_model: fs27Runtime.public_model,
  };
}

function skymailAiPlanById(planId = "") {
  const key = clean(planId || "skymail_ai_free").toLowerCase();
  const aliases = {
    free: "skymail_ai_free",
    local: "skymail_ai_free",
    starter: "skyemail-ai-response-starter",
    plus: "skyemail-ai-response-plus",
    business: "skyemail-ai-response-plus",
    managed: "skyemail-managed-ai-inbox",
    "managed-ai-inbox": "skyemail-managed-ai-inbox",
    owner: "owner_operator",
    founder: "owner_operator",
    operator: "owner_operator",
  };
  return SKYMAIL_AI_PLANS[aliases[key] || key] || SKYMAIL_AI_PLANS.skymail_ai_free;
}

function claimPlanId(auth = {}) {
  const claims = auth.fs27_claims || {};
  return clean(
    claims.skymail_ai_plan
    || claims.skyemail_ai_plan
    || claims.ai_response_plan
    || claims.kaixu_plan
    || claims.ai_plan
    || claims.plan_id
    || claims.plan
    || claims.billing_plan
    || ""
  );
}

function claimBillingActive(auth = {}) {
  if (authIsOwnerOperator({}, auth)) return true;
  const claims = auth.fs27_claims || {};
  const status = clean(claims.billing_status || claims.subscription_status || claims.payment_status || claims.status || "active").toLowerCase();
  return !["inactive", "canceled", "cancelled", "past_due", "unpaid", "blocked", "suspended"].includes(status);
}

function skymailAiEntitlementFromAuth(env, auth = {}, mailbox = null) {
  if (authIsOwnerOperator(env, auth)) {
    return { ...SKYMAIL_AI_PLANS.owner_operator, source: "owner_operator", active: true };
  }
  const envDefault = clean(env.SKYEMAIL_AI_DEFAULT_PLAN || env.SKYMAIL_AI_DEFAULT_PLAN || "");
  const plan = skymailAiPlanById(claimPlanId(auth) || envDefault || "skymail_ai_free");
  return {
    ...plan,
    source: claimPlanId(auth) ? "fs27_claims" : (envDefault ? "env_default" : "local_default"),
    active: claimBillingActive(auth),
    mailbox_id: mailbox?.id || null,
  };
}

function skymailAiPlanSnapshot(plan = {}) {
  const total = Number(plan.included_messages || 0) + Number(plan.backup_messages || 0);
  const skyepayOffer = plan.provider_calls ? plan.id : "";
  return {
    id: plan.id || "skymail_ai_free",
    name: plan.name || "SkyeMail AI",
    active: plan.active !== false,
    source: plan.source || "runtime",
    provider_calls: Boolean(plan.provider_calls),
    auto_send: Boolean(plan.auto_send),
    included_messages: Number(plan.included_messages || 0),
    backup_messages: Number(plan.backup_messages || 0),
    total_protected_messages: total,
    monthly_cents_cap: Number(plan.monthly_cents_cap || 0),
    skyepay_offer: skyepayOffer,
    skyepay_url: skyepayOffer ? `https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay-store.html?client=metraiyux-0s-skm&offer=${encodeURIComponent(skyepayOffer)}` : "",
  };
}

function skymailAiPlanCatalog() {
  return Object.values(SKYMAIL_AI_PLANS)
    .filter((plan) => plan.id !== "owner_operator")
    .map((plan) => skymailAiPlanSnapshot({ ...plan, active: true, source: "catalog" }));
}

function estimateTokensFromMessages(messages = [], extra = "") {
  const chars = [...normalizeMessages(messages), { content: extra }].map((item) => item.content || "").join("\n").length;
  return Math.max(1, Math.ceil(chars / 4));
}

function usageNumbers(result = {}, fallbackInput = 0, fallbackOutputText = "") {
  const usage = result.usage || {};
  const inputTokens = Number(usage.prompt_tokens || usage.input_tokens || usage.inputTokens || fallbackInput || 0);
  const outputTokens = Number(usage.completion_tokens || usage.output_tokens || usage.outputTokens || Math.ceil(String(result.output_text || fallbackOutputText || "").length / 4) || 0);
  const costCents = Number(usage.cost_cents || usage.costCents || 0);
  return {
    input_tokens: Math.max(0, Math.trunc(inputTokens)),
    output_tokens: Math.max(0, Math.trunc(outputTokens)),
    cost_cents: Math.max(0, Math.trunc(costCents)),
  };
}

function skymailAiCostCents(usage = {}) {
  return Math.max(1, Number(usage.cost_cents || usage.costCents || 0));
}

async function ensureSkymailAiRuntimeSchema(env) {
  const schema = schemaName(env);
  await query(env, `
    create table if not exists ${schema}.ai_entitlements (
      id uuid primary key default gen_random_uuid(),
      user_id uuid references ${schema}.users(id) on delete cascade,
      mailbox_id uuid references ${schema}.hosted_mailboxes(id) on delete cascade,
      fs27_customer_id text,
      plan_id text not null default 'skymail_ai_free',
      status text not null default 'active',
      source text not null default 'fs27_snapshot',
      included_messages int not null default 0,
      backup_messages int not null default 0,
      monthly_cents_cap int not null default 0,
      auto_send_enabled boolean not null default false,
      current_period_start timestamptz not null default date_trunc('month', now()),
      current_period_end timestamptz,
      meta_json jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await query(env, `
    create table if not exists ${schema}.ai_usage_events (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references ${schema}.users(id) on delete cascade,
      mailbox_id uuid references ${schema}.hosted_mailboxes(id) on delete set null,
      plan_id text not null,
      action text not null,
      model_mode text not null,
      provider_path text not null,
      provider text,
      model text,
      input_tokens int not null default 0,
      output_tokens int not null default 0,
      total_tokens int not null default 0,
      cost_cents int not null default 0,
      request_json jsonb not null default '{}'::jsonb,
      response_json jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);
  await query(env, `create index if not exists idx_ai_usage_events_user_created on ${schema}.ai_usage_events(user_id, created_at desc)`);
  await query(env, `create index if not exists idx_ai_usage_events_mailbox_created on ${schema}.ai_usage_events(mailbox_id, created_at desc)`);
  await query(env, `create index if not exists idx_ai_entitlements_user on ${schema}.ai_entitlements(user_id, updated_at desc)`);
}

async function skymailAiMonth(env, userId, mailboxId = null) {
  await ensureSkymailAiRuntimeSchema(env);
  const rows = await query(env, `
    select count(*)::int as calls, coalesce(sum(cost_cents),0)::int as spent_cents
      from ai_usage_events
     where user_id=$1
       and ($2::uuid is null or mailbox_id=$2::uuid)
       and created_at >= date_trunc('month', now())
  `, [userId, mailboxId || null]);
  const row = rows[0] || {};
  return {
    calls: Number(row.calls || 0),
    spent_cents: Number(row.spent_cents || 0),
  };
}

async function persistedSkymailAiEntitlement(env, userId, mailboxId = null) {
  await ensureSkymailAiRuntimeSchema(env);
  const rows = await query(env, `
    select *
      from ai_entitlements
     where (user_id=$1 or user_id is null)
       and ($2::uuid is null or mailbox_id=$2::uuid or mailbox_id is null)
     order by (mailbox_id is not null) desc, updated_at desc, created_at desc
     limit 1
  `, [userId, mailboxId || null]);
  return rows[0] || null;
}

async function resolveSkymailAiEntitlement(env, auth, mailbox = null) {
  const derived = skymailAiEntitlementFromAuth(env, auth, mailbox);
  if (derived.id === "owner_operator") return derived;
  const stored = await persistedSkymailAiEntitlement(env, auth.sub, mailbox?.id || null).catch(() => null);
  if (!stored) return derived;
  const storedPlan = skymailAiPlanById(stored.plan_id);
  return {
    ...storedPlan,
    active: !["inactive", "canceled", "cancelled", "past_due", "unpaid", "blocked", "suspended"].includes(clean(stored.status).toLowerCase()),
    source: stored.source || "skymail_ai_entitlements",
    included_messages: Number(stored.included_messages || storedPlan.included_messages || 0),
    backup_messages: Number(stored.backup_messages || storedPlan.backup_messages || 0),
    monthly_cents_cap: Number(stored.monthly_cents_cap || storedPlan.monthly_cents_cap || 0),
    auto_send: Boolean(stored.auto_send_enabled || storedPlan.auto_send),
  };
}

function skymailAiAllowance(entitlement = {}, month = {}) {
  const totalMessages = Number(entitlement.included_messages || 0) + Number(entitlement.backup_messages || 0);
  const calls = Number(month.calls || 0);
  const spent = Number(month.spent_cents || 0);
  const centsCap = Number(entitlement.monthly_cents_cap || 0);
  const active = entitlement.active !== false;
  const providerCalls = Boolean(entitlement.provider_calls);
  const allowed = active && providerCalls && (totalMessages <= 0 || calls < totalMessages) && (centsCap <= 0 || spent < centsCap);
  const alerts = [];
  if (!active) alerts.push("ai_entitlement_inactive");
  if (!providerCalls) alerts.push("local_brain_only_plan");
  if (totalMessages > 0 && calls >= totalMessages) alerts.push("ai_message_cap_reached");
  if (centsCap > 0 && spent >= centsCap) alerts.push("ai_cost_cap_reached");
  return {
    ai_call_allowed: allowed,
    alerts,
    calls_used: calls,
    calls_remaining: totalMessages > 0 ? Math.max(0, totalMessages - calls) : null,
    spent_cents: spent,
    cap_cents: centsCap,
    remaining_cents: centsCap > 0 ? Math.max(0, centsCap - spent) : null,
  };
}

async function callSkymailFs27KaixuGateway(request, env, { auth, messages, brainRuntime, action, usageLane = "skymail-ai" }) {
  const gatewayBearer = skymailAiGatewayBearer(request, env, auth);
  if (!gatewayBearer.token) {
    throw Object.assign(new Error("Shared SkyeGate FS27 Brain bearer is not available."), { statusCode: 503, provider_path: "fs27-gateway-required" });
  }
  const gateSession = clean(auth.gate_token || bearer(request));
  const response = await skygateRequest(env, "/gateway-chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${gatewayBearer.token}`,
      "x-skye-platform": "skymail",
      "x-0s-platform": "skymail",
      "x-skye-usage-lane": usageLane,
      "x-free99-billing-mode": "paid-skyepay",
      "x-kaixu-app": "skymail",
      "x-skye-app": "skymail",
      "x-kaixu-request-id": `skymail_${action}_${Date.now()}`,
      "x-0s-gate-session": gateSession,
    },
    body: JSON.stringify({
      provider: brainRuntime.provider,
      model: brainRuntime.model,
      messages,
      max_tokens: 1000,
      temperature: 0.35,
      platform_id: "skymail",
      usage_lane: usageLane,
    }),
  });
  const data = await response.json().catch(() => ({ error: "invalid_gateway_response" }));
  if (!response.ok) throw Object.assign(new Error(data.error || data.message || "SkyeGate FS27 Brain gateway failed."), { statusCode: response.status || 502, providerResponse: data, provider_path: "fs27-gateway-chat" });
  const outputText = data.output_text || data.choices?.[0]?.message?.content || "";
  return {
    output_text: outputText,
    usage: data.usage || data.telemetry?.usage || null,
    provider: brainRuntime.source,
    model: brainRuntime.public_model,
    provider_path: brainRuntime.provider_path,
    gateway_auth_source: gatewayBearer.source,
    runtime: {
      source: brainRuntime.source,
      provider_path: brainRuntime.provider_path,
      public_model: brainRuntime.public_model,
    },
    raw: data,
  };
}

async function runMeteredSkymailAi(request, env, ctx, { auth, mailbox = null, messages = [], action = "mail-brain", prompt = "", requestedModel = "", source = "skymail" } = {}) {
  await ensureSkymailAiRuntimeSchema(env);
  const entitlement = await resolveSkymailAiEntitlement(env, auth, mailbox);
  const month = await skymailAiMonth(env, auth.sub, mailbox?.id || null);
  const allowance = skymailAiAllowance(entitlement, month);
  const brainRuntime = resolveSkymailFs27BrainRuntime(env, requestedModel);
  if (!allowance.ai_call_allowed) {
    throw Object.assign(new Error("SkyeMail FS27 Brain calls are not active for this mailbox plan."), {
      statusCode: allowance.alerts.includes("ai_message_cap_reached") || allowance.alerts.includes("ai_cost_cap_reached") ? 402 : 403,
      entitlement: skymailAiPlanSnapshot(entitlement),
      month: allowance,
    });
  }
  const inputEstimate = estimateTokensFromMessages(messages, prompt);
  const result = await callSkymailFs27KaixuGateway(request, env, { auth, messages, brainRuntime, action, usageLane: "skymail-ai" });
  const usage = usageNumbers(result, inputEstimate, result?.output_text || "");
  const costCents = skymailAiCostCents(usage);
  const rows = await query(env, `
    insert into ai_usage_events(user_id, mailbox_id, plan_id, action, model_mode, provider_path, provider, model,
      input_tokens, output_tokens, total_tokens, cost_cents, request_json, response_json)
    values($1,$2,$3,$4,'fs27_metered_v1',$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb)
    returning id, created_at
  `, [
    auth.sub,
    mailbox?.id || null,
    entitlement.id,
    action,
    result.provider_path || "unknown",
    result.provider || brainRuntime.source,
    result.model || brainRuntime.public_model,
    usage.input_tokens,
    usage.output_tokens,
    usage.input_tokens + usage.output_tokens,
    costCents,
    JSON.stringify({ action, source, fs27_runtime: brainRuntime.public_model, mailbox: mailbox?.mailbox_email || "", gateway_required: true, gateway_auth_source: result.gateway_auth_source || "fs27" }),
    JSON.stringify({ output_chars: String(result.output_text || "").length, usage: result.usage || null, provider_path: result.provider_path || "" }),
  ]);
  const nextMonth = await skymailAiMonth(env, auth.sub, mailbox?.id || null).catch(() => ({ ...month, calls: month.calls + 1, spent_cents: month.spent_cents + costCents }));
  ctx?.waitUntil?.(mirrorFs27(env, {
    type: "skymail.ai.usage",
    actor: auth.email || auth.sub,
    org_id: auth.fs27_customer_id || null,
    ws_id: mailbox?.id || auth.sub,
    meta: { action, fs27_runtime: result.model || brainRuntime.public_model, provider_path: result.provider_path || "", usage_event_id: rows[0]?.id || null, cost_cents: costCents },
  }).catch(() => null));
  return {
    ok: true,
    output_text: result.output_text || "",
    model_mode: "fs27_metered_v1",
    provider_path: result.provider_path || "",
    model: result.model || brainRuntime.public_model,
    provider: result.provider || brainRuntime.source,
    runtime: result.runtime || { source: brainRuntime.source, provider_path: brainRuntime.provider_path, public_model: brainRuntime.public_model },
    usage_event_id: rows[0]?.id || null,
    usage: { ...usage, total_tokens: usage.input_tokens + usage.output_tokens, cost_cents: costCents },
    month: { ...skymailAiAllowance(entitlement, nextMonth), plan: skymailAiPlanSnapshot(entitlement) },
  };
}

const SKYMAIL_SKYEPAY_CONFIRMED = new Set(["paid", "complete", "completed", "active", "trialing"]);

async function activateSkymailAiEntitlement(env, { auth, mailbox, plan, source, meta = {} }) {
  await ensureSkymailAiRuntimeSchema(env);
  const rows = await query(env, `
    insert into ai_entitlements(user_id, mailbox_id, fs27_customer_id, plan_id, status, source,
      included_messages, backup_messages, monthly_cents_cap, auto_send_enabled, current_period_start, current_period_end, meta_json, created_at, updated_at)
    values($1,$2,$3,$4,'active',$5,$6,$7,$8,$9,date_trunc('month', now()),date_trunc('month', now()) + interval '1 month',$10::jsonb,now(),now())
    returning *
  `, [
    auth.sub,
    mailbox?.id || null,
    auth.fs27_customer_id || auth.fs27_claims?.customer_id || null,
    plan.id,
    source,
    Number(plan.included_messages || 0),
    Number(plan.backup_messages || 0),
    Number(plan.monthly_cents_cap || 0),
    Boolean(plan.auto_send),
    JSON.stringify(meta || {}),
  ]);
  return rows[0] || null;
}

async function handleMailBrainPlans(request, env) {
  const auth = await requireAuth(request, env);
  const context = await resolveMailboxContext(env, request, auth, {});
  await ensureSkymailAiRuntimeSchema(env);
  const entitlement = await resolveSkymailAiEntitlement(env, context.auth, context.mailbox);
  const month = await skymailAiMonth(env, context.userId, context.mailbox?.id || null);
  return json({
    ok: true,
    plans: skymailAiPlanCatalog(),
    active: skymailAiPlanSnapshot(entitlement),
    month: skymailAiAllowance(entitlement, month),
    checkout_create: "/mail-brain-checkout",
    checkout_claim: "/mail-brain-claim",
  });
}

async function handleMailBrainCheckout(request, env, ctx) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const context = await resolveMailboxContext(env, request, auth, body);
  const plan = skymailAiPlanById(body.plan_id || body.plan || "skyemail-ai-response-starter");
  if (!plan.provider_calls || plan.id === "owner_operator") {
    throw Object.assign(new Error("Selected SkyeMail AI plan is not a paid FS27 Brain lane."), { statusCode: 400 });
  }
  const origin = new URL(request.url).origin;
  const success = clean(body.success_url) || `${origin}/brain.html?ai_checkout=success&plan=${encodeURIComponent(plan.id)}`;
  const cancel = clean(body.cancel_url) || `${origin}/brain.html?ai_checkout=cancel&plan=${encodeURIComponent(plan.id)}`;
  const checkoutBody = {
    client: "metraiyux-0s-skm",
    client_slug: "metraiyux-0s-skm",
    app_id: "skymail",
    platform_id: "skymail",
    offer_id: plan.id,
    customer_email: normalizeEmail(body.customer_email || auth.email),
    customer_name: clean(body.customer_name || auth.handle || auth.email || "SkyeMail customer"),
    company_name: clean(body.company_name || body.company || "SkyeMail workspace"),
    success_url: success,
    cancel_url: cancel,
    idempotency_key: clean(body.idempotency_key || body.request_id || `skymail-ai-${context.userId}-${plan.id}-${Date.now()}`),
    legal_acceptance: {
      legal_acceptance: true,
      legal_terms_accepted: true,
      arbitration_accepted: true,
      payments_policy_accepted: true,
      no_outcome_guarantee_accepted: true,
      truthful_review_boundary_acknowledged: true,
      privacy_policy_accepted: true,
      accepted_at: clean(body.legal_accepted_at || body.accepted_at) || new Date().toISOString(),
      acceptance_surface: clean(body.acceptance_surface || "skymail-brain-checkout"),
      source_url: origin,
    },
    metadata: {
      user_id: context.userId,
      mailbox_id: context.mailbox?.id || "",
      mailbox_email: context.mailbox?.mailbox_email || "",
      fs27_customer_id: auth.fs27_customer_id || "",
      plan_id: plan.id,
    },
    dry_run: false,
  };
  const gateSession = clean(auth.gate_token || bearer(request));
  const response = await skygateRequest(env, "/skyepay/checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "x-skypay-proof-mode": checkoutBody.dry_run ? "1" : "0",
      authorization: gateSession ? `Bearer ${gateSession}` : "",
      "x-0s-gate-session": gateSession,
      "x-skye-gate-session": gateSession,
      "x-free99-gate-session": gateSession,
      "x-skye-platform": "skymail",
      "x-0s-platform": "skymail",
    },
    body: JSON.stringify(checkoutBody),
  });
  const data = await response.json().catch(() => ({ ok: false, error: "invalid_skyepay_checkout_response" }));
  if (!response.ok || data.ok === false) throw Object.assign(new Error(data.error || "SkyePay checkout failed."), { statusCode: response.status || 502, providerResponse: data });
  const pending = await query(env, `
    insert into ai_entitlements(user_id, mailbox_id, fs27_customer_id, plan_id, status, source,
      included_messages, backup_messages, monthly_cents_cap, auto_send_enabled, meta_json, created_at, updated_at)
    values($1,$2,$3,$4,'checkout_created','skyepay_checkout',$5,$6,$7,$8,$9::jsonb,now(),now())
    returning *
  `, [
    context.userId,
    context.mailbox?.id || null,
    auth.fs27_customer_id || auth.fs27_claims?.customer_id || null,
    plan.id,
    Number(plan.included_messages || 0),
    Number(plan.backup_messages || 0),
    Number(plan.monthly_cents_cap || 0),
    Boolean(plan.auto_send),
    JSON.stringify({ checkout: data, checkout_body: { ...checkoutBody, customer_email: checkoutBody.customer_email } }),
  ]);
  ctx?.waitUntil?.(mirrorFs27(env, {
    type: "skymail.ai.checkout_created",
    actor: auth.email || auth.sub,
    org_id: auth.fs27_customer_id || null,
    ws_id: context.mailbox?.id || context.userId,
    meta: { plan_id: plan.id, checkout_id: data.id || data.session_id || null, order_id: data.order_id || null },
  }).catch(() => null));
  return json({
    ok: true,
    checkout: data,
    entitlement: { active: false, status: "checkout_created", id: pending[0]?.id || null, plan: skymailAiPlanSnapshot(plan) },
    claim: { endpoint: "/mail-brain-claim", session_id: data.id || data.session_id || "", order_id: data.order_id || "" },
  }, 201);
}

async function handleMailBrainClaim(request, env, ctx) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const context = await resolveMailboxContext(env, request, auth, body);
  const sessionId = clean(body.session_id || body.checkout_id || body.stripe_session_id);
  const plan = skymailAiPlanById(body.plan_id || body.offer_id || body.plan || "skyemail-ai-response-starter");
  if (!sessionId) throw Object.assign(new Error("session_id is required to claim a SkyeMail AI entitlement."), { statusCode: 400 });
  const statusPath = `/skyepay/status?session_id=${encodeURIComponent(sessionId)}`;
  const gateSession = clean(auth.gate_token || bearer(request));
  const response = await skygateRequest(env, statusPath, {
    method: "GET",
    headers: {
      origin: new URL(request.url).origin,
      authorization: gateSession ? `Bearer ${gateSession}` : "",
      "x-0s-gate-session": gateSession,
      "x-skye-gate-session": gateSession,
      "x-free99-gate-session": gateSession,
      "x-skye-platform": "skymail",
      "x-0s-platform": "skymail",
    },
  });
  const status = await response.json().catch(() => ({ ok: false, error: "invalid_skyepay_status_response" }));
  if (!response.ok || status.ok === false) throw Object.assign(new Error(status.error || "SkyePay status check failed."), { statusCode: response.status || 502, providerResponse: status });
  const order = status.order || status.checkout || status.session || status;
  const offer = clean(order.offer_id || order.offer || status.offer_id || plan.id);
  const paid = SKYMAIL_SKYEPAY_CONFIRMED.has(clean(order.payment_status || order.status || status.payment_status).toLowerCase());
  if (offer && offer !== plan.id) throw Object.assign(new Error("SkyePay offer does not match requested SkyeMail AI plan."), { statusCode: 409, providerResponse: status });
  if (!paid) {
    return json({ ok: false, checkout_required: true, payment_pending: true, payment_status: order.payment_status || order.status || null, skyepay: status, plan: skymailAiPlanSnapshot(plan) }, 402);
  }
  const entitlement = await activateSkymailAiEntitlement(env, {
    auth: context.auth,
    mailbox: context.mailbox,
    plan,
    source: "skyepay_status",
    meta: { skyepay_status: status, session_id: sessionId },
  });
  ctx?.waitUntil?.(mirrorFs27(env, {
    type: "skymail.ai.entitlement_unlocked",
    actor: auth.email || auth.sub,
    org_id: auth.fs27_customer_id || null,
    ws_id: context.mailbox?.id || context.userId,
    meta: { plan_id: plan.id, entitlement_id: entitlement?.id || null, payment_status: order.payment_status || order.status || null },
  }).catch(() => null));
  return json({ ok: true, entitlement, plan: skymailAiPlanSnapshot({ ...plan, active: true, source: "skyepay_status" }), skyepay: status });
}

async function handleGatewayChat(request, env, ctx) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const context = await resolveMailboxContext(env, request, auth, body);
  const messages = normalizeMessages(body.messages);
  if (!messages.length) throw Object.assign(new Error("messages are required."), { statusCode: 400 });
  const ai = await runMeteredSkymailAi(request, env, ctx, {
    auth: context.auth,
    mailbox: context.mailbox,
    messages,
    action: "gateway-chat",
    prompt: messages.map((item) => item.content).join("\n").slice(0, 4000),
    requestedModel: body.model,
    source: "skymail-gateway-chat",
  });
  return json({
    output_text: ai.output_text,
    usage: ai.usage,
    month: ai.month,
    model: ai.model,
    provider: ai.provider || "fs27_skygate_brain",
    provider_path: ai.provider_path,
    usage_event_id: ai.usage_event_id,
  });
}

async function handleGatewayStream(request, env, ctx) {
  const body = await request.json().catch(() => ({}));
  const auth = await requireAuth(request, env);
  const context = await resolveMailboxContext(env, request, auth, body);
  const data = await runMeteredSkymailAi(request, env, ctx, {
    auth: context.auth,
    mailbox: context.mailbox,
    messages: normalizeMessages(body.messages),
    action: "gateway-stream",
    prompt: normalizeMessages(body.messages).map((item) => item.content).join("\n").slice(0, 4000),
    requestedModel: body.model,
    source: "skymail-gateway-stream",
  });
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode(`event: meta\ndata: ${JSON.stringify({ month: data.month, provider: data.provider || "fs27_skygate_brain", model: data.model, provider_path: data.provider_path })}\n\n`));
      controller.enqueue(enc.encode(`event: delta\ndata: ${JSON.stringify({ text: data.output_text })}\n\n`));
      controller.enqueue(enc.encode(`event: done\ndata: ${JSON.stringify({ month: data.month, usage: data.usage })}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}

function validateMailboxInput(env, localPart, domain) {
  const local = clean(localPart).toLowerCase();
  const dom = clean(domain).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$/.test(local)) {
    throw Object.assign(new Error("Mailbox local part must be 3-64 chars and use letters, numbers, dot, underscore, or hyphen."), { statusCode: 400 });
  }
  const domains = configuredDomains(env);
  if (!domains.length) throw Object.assign(new Error("SKYMAIL_PRIMARY_DOMAIN or INBOUND_DOMAIN must be configured."), { statusCode: 501 });
  if (!domains.includes(dom)) throw Object.assign(new Error("Requested mailbox domain is not allowed."), { statusCode: 400 });
  return { local, domain: dom, email: `${local}@${dom}` };
}

function serviceScopes(scope) {
  if (Array.isArray(scope)) return scope.map(String).filter(Boolean);
  return String(scope || "").split(/\s+/).map((item) => item.trim()).filter(Boolean);
}

function canUseServiceLane(claims = {}) {
  if (!claims.active && !claims.ok) return false;
  const role = String(claims.role || claims.user?.role || "").toLowerCase();
  const scopes = new Set(serviceScopes(claims.scope || claims.scopes || claims.user?.scope).map((scope) => scope.toLowerCase()));
  return ["founder", "owner", "admin", "operator", "service"].includes(role)
    || scopes.has("admin.write")
    || scopes.has("gateway.invoke")
    || scopes.has("skymail.admin")
    || scopes.has("skymail.service")
    || scopes.has("mail.admin");
}

async function serviceAuth(request, env) {
  const token = bearer(request) || clean(request.headers.get("x-skymail-service-token"));
  const expected = clean(env.SKYMAIL_SERVICE_TOKEN || env.SKYE_MAIL_SERVICE_TOKEN);
  if (token && token !== expected) {
    const claims = await introspectFs27(env, token);
    if (!canUseServiceLane(claims)) throw Object.assign(new Error("SkyeGate FS27 session is active but not service-scoped for SkyeMail."), { statusCode: 403 });
    return { ok: true, source: "fs27-skygate", claims, token };
  }
  if (expected && token === expected) {
    return { ok: true, source: "legacy-skymail-service-token", claims: { active: true, role: "service", scope: "skymail.service" }, token: "" };
  }
  if (!expected) throw Object.assign(new Error("SkyeGate FS27 service bearer required; SKYMAIL_SERVICE_TOKEN compatibility is not configured."), { statusCode: 401 });
  throw Object.assign(new Error("Unauthorized service request."), { statusCode: 401 });
}

function mailboxLocalFromWorkspace(body = {}) {
  const source = clean(body.local_part || body.localPart || body.workspace_slug || body.slug || body.company_name || body.companyName || body.owner_email || body.email);
  const base = source.includes("@") ? source.split("@")[0] : source;
  return base.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || `workspace-${crypto.randomUUID().slice(0, 8)}`;
}

const ZOHO_ENV_ALIASES = {
  ZOHO_CLIENT_ID: ["Client_ID", "ZOHO_MAIL_CLIENT_ID"],
  ZOHO_CLIENT_SECRET: ["Client_Secret", "ZOHO_MAIL_CLIENT_SECRET"],
  ZOHO_REFRESH_TOKEN: ["Refresh_Token_ID", "Refresh_Token_ID2", "Refresh_Token", "ZOHO_MAIL_REFRESH_TOKEN"],
  ZOHO_ORG_ID: ["Org_ID", "Organization_ID", "ZOHO_ORGANIZATION_ID", "ZOHO_ZOID"],
  ZOHO_ACCOUNT_ID: ["Account_ID", "Zoho_User_ID", "ZOHO_MAIL_ACCOUNT_ID"],
  ZOHO_ORG_USER_ID: ["ZOHO_ZUID", "ZOHO_MAIL_ZUID", "ZOHO_USER_ZUID"],
  ZOHO_DEFAULT_FROM: ["Default_From_Email", "ZOHO_FROM_EMAIL", "ZOHO_MAIL_FROM"],
};

function envValue(env, key) {
  const direct = clean(env?.[key]).replace(/^['"]|['"]$/g, "");
  if (direct) return direct;
  for (const alias of ZOHO_ENV_ALIASES[key] || []) {
    const value = clean(env?.[alias]).replace(/^['"]|['"]$/g, "");
    if (value) return value;
  }
  return "";
}

function resendApiKey(env) {
  return clean(
    env?.RESEND_API_KEY
    || env?.BACKUP_RESEND_API_TOKEN
    || env?.backup_resend_api_token
    || env?.bacup_resend_api_token
    || ""
  ).replace(/^['"]|['"]$/g, "");
}

function providerConfigured(env) {
  const provider = clean(env.MAILBOX_PROVIDER || "stalwart").toLowerCase();
  const stalwartReady = Boolean(env.STALWART_BASE_URL && env.STALWART_MANAGEMENT_API_KEY);
  const externalReady = Boolean(env.MAILBOX_PROVISION_WEBHOOK_URL && env.MAILBOX_PROVISION_WEBHOOK_SECRET);
  const zohoApiReady = Boolean(envValue(env, "ZOHO_CLIENT_ID") && envValue(env, "ZOHO_CLIENT_SECRET") && envValue(env, "ZOHO_REFRESH_TOKEN"));
  const zohoOrgReady = Boolean(envValue(env, "ZOHO_ORG_ID"));
  const zohoReady = zohoApiReady;
  const zohoProvisioningReady = Boolean(zohoApiReady && zohoOrgReady);
  let configured = stalwartReady;
  if (provider === "external-webhook") configured = externalReady;
  if (provider === "zoho") configured = zohoReady;
  return { provider, configured, stalwartReady, externalReady, zohoReady, zohoApiReady, zohoOrgReady, zohoProvisioningReady };
}

function providerSetupMessage(provider = "stalwart") {
  if (provider === "zoho") return "Set the SkyeMail production mail credentials before live mailbox creation.";
  if (provider === "external-webhook") return "Set MAILBOX_PROVISION_WEBHOOK_URL and MAILBOX_PROVISION_WEBHOOK_SECRET before live mailbox account creation.";
  return "Set STALWART_BASE_URL and STALWART_MANAGEMENT_API_KEY before live mailbox account creation.";
}

function zohoAccountsBase(env) {
  return cleanOrigin(envValue(env, "ZOHO_ACCOUNTS_BASE") || "https://accounts.zoho.com");
}

function zohoMailBase(env) {
  return cleanOrigin(envValue(env, "ZOHO_MAIL_BASE") || "https://mail.zoho.com");
}

function zohoApiConfigured(env) {
  return Boolean(envValue(env, "ZOHO_CLIENT_ID") && envValue(env, "ZOHO_CLIENT_SECRET") && envValue(env, "ZOHO_REFRESH_TOKEN"));
}

function zohoProvisioningConfigured(env) {
  return zohoApiConfigured(env);
}

let zohoProviderBackoffUntil = 0;
let zohoProviderBackoffReason = "";
let zohoAccessTokenCache = {
  key: "",
  token: "",
  apiDomain: "",
  expiresAt: 0,
};

function zohoBackoffActive() {
  return Date.now() < zohoProviderBackoffUntil;
}

function zohoBackoffSecondsRemaining() {
  return Math.max(0, Math.ceil((zohoProviderBackoffUntil - Date.now()) / 1000));
}

function zohoBackoffError() {
  const seconds = zohoBackoffSecondsRemaining();
  return Object.assign(new Error(`SkyeMail sync is cooling down after provider rate limiting. Showing cached inbox for about ${seconds} more seconds.`), {
    statusCode: 429,
    providerResponse: {
      status: "cooldown",
      reason: zohoProviderBackoffReason || "provider_rate_limit",
      retry_after_seconds: seconds,
    },
  });
}

function zohoProviderLooksRateLimited(message, data) {
  const haystack = `${message || ""} ${JSON.stringify(data || {})}`.toLowerCase();
  return haystack.includes("too many requests")
    || haystack.includes("rate limit")
    || haystack.includes("continuously")
    || (haystack.includes("access denied") && haystack.includes("try again"));
}

function noteZohoProviderBackoff(reason) {
  zohoProviderBackoffReason = clean(reason || "provider_rate_limit").slice(0, 240);
  zohoProviderBackoffUntil = Math.max(zohoProviderBackoffUntil, Date.now() + (2 * 60 * 1000));
}

async function parseZohoResponse(res) {
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const message = data?.data?.moreInfo || data?.data?.errorMessage || data?.message || data?.status?.description || data?.error || text || `SkyeMail provider request failed (${res.status}).`;
    if (zohoProviderLooksRateLimited(message, data)) noteZohoProviderBackoff(message);
    throw Object.assign(new Error(message), { statusCode: res.status, providerResponse: data });
  }
  return data;
}

async function getZohoTokenData(env) {
  if (!zohoApiConfigured(env)) throw Object.assign(new Error("SkyeMail production mail API is not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN."), { statusCode: 501 });
  const cacheKey = `${zohoAccountsBase(env)}:${stableHex(`${envValue(env, "ZOHO_CLIENT_ID")}:${envValue(env, "ZOHO_REFRESH_TOKEN")}`, 24)}`;
  if (zohoAccessTokenCache.key === cacheKey && zohoAccessTokenCache.token && Date.now() < zohoAccessTokenCache.expiresAt - 60_000) {
    return {
      access_token: zohoAccessTokenCache.token,
      api_domain: zohoAccessTokenCache.apiDomain || null,
      expires_in: Math.max(60, Math.floor((zohoAccessTokenCache.expiresAt - Date.now()) / 1000)),
      token_type: "cached",
      cached: true,
    };
  }
  const params = new URLSearchParams({
    refresh_token: envValue(env, "ZOHO_REFRESH_TOKEN"),
    client_id: envValue(env, "ZOHO_CLIENT_ID"),
    client_secret: envValue(env, "ZOHO_CLIENT_SECRET"),
    grant_type: "refresh_token",
  });
  const data = await parseZohoResponse(await fetch(`${zohoAccountsBase(env)}/oauth/v2/token?${params.toString()}`, {
    method: "POST",
    headers: { accept: "application/json" },
  }));
  if (!data?.access_token) throw Object.assign(new Error(data?.error || "SkyeMail provider token unavailable."), { statusCode: 502, providerResponse: data });
  const ttlSeconds = Math.max(300, Number(data.expires_in || 3600) - 120);
  zohoAccessTokenCache = {
    key: cacheKey,
    token: data.access_token,
    apiDomain: data.api_domain || "",
    expiresAt: Date.now() + ttlSeconds * 1000,
  };
  return data;
}

async function getZohoAccessToken(env) {
  const data = await getZohoTokenData(env);
  return data.access_token;
}

async function zohoFetch(env, path, init = {}) {
  const { ignoreBackoff = false, ...fetchInit } = init;
  if (!ignoreBackoff && zohoBackoffActive()) throw zohoBackoffError();
  const token = await getZohoAccessToken(env);
  return await parseZohoResponse(await fetch(`${zohoMailBase(env)}${path}`, {
    ...fetchInit,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Zoho-oauthtoken ${token}`,
      ...(fetchInit.headers || {}),
    },
  }));
}

async function zohoRawFetch(env, path, init = {}) {
  const { ignoreBackoff = false, ...fetchInit } = init;
  if (!ignoreBackoff && zohoBackoffActive()) throw zohoBackoffError();
  const token = await getZohoAccessToken(env);
  const res = await fetch(`${zohoMailBase(env)}${path}`, {
    ...fetchInit,
    headers: {
      accept: "*/*",
      authorization: `Zoho-oauthtoken ${token}`,
      ...(fetchInit.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    const message = data?.data?.moreInfo || data?.status?.description || data?.error || text || `SkyeMail provider request failed (${res.status}).`;
    throw Object.assign(new Error(message), { statusCode: res.status, providerResponse: data });
  }
  return res;
}

function extractZohoAccountId(payload) {
  const data = payload?.data || payload;
  const candidates = [
    data?.accountId,
    data?.account_id,
    data?.zuid,
    data?.userId,
    data?.id,
    data?.account?.accountId,
    Array.isArray(data) ? data[0]?.accountId : null,
  ];
  const match = candidates.find((value) => value != null && clean(value));
  return match != null ? String(match) : null;
}

function extractZohoOrganizationId(payload) {
  const data = payload?.data || payload;
  const candidates = [
    data?.zoid,
    data?.orgId,
    data?.organizationId,
    data?.organization_id,
    data?.id,
    Array.isArray(data) ? data[0]?.zoid : null,
    Array.isArray(data) ? data[0]?.orgId : null,
  ];
  const match = candidates.find((value) => value != null && clean(value));
  return match != null ? String(match) : null;
}

function extractZohoDefaultFrom(payload) {
  const data = payload?.data || payload;
  const candidates = [
    data?.primaryEmailAddress,
    data?.mailboxAddress,
    data?.emailAddress,
    data?.email,
    data?.mailbox?.emailAddress,
    Array.isArray(data) ? data[0]?.primaryEmailAddress : null,
    Array.isArray(data) ? data[0]?.mailboxAddress : null,
    Array.isArray(data) ? data[0]?.emailAddress : null,
    Array.isArray(data) ? data[0]?.email : null,
  ];
  const match = candidates.find((value) => value != null && String(value).includes("@"));
  return match != null ? String(match) : null;
}

function extractZohoMessageId(payload) {
  const data = payload?.data || payload;
  const candidates = [data?.messageId, data?.message_id, data?.id, payload?.messageId, payload?.id];
  const match = candidates.find((value) => value != null && clean(value));
  return match != null ? String(match) : null;
}

function extractZohoAliasId(payload, aliasEmail = "") {
  const email = normalizeEmail(aliasEmail);
  const isUsableAliasId = (value) => value != null
    && clean(value)
    && !/OPERATION_NOT_PERMITTED|FAIL|ERROR|LIMIT|REACHED|NOT[_\s-]?ALLOWED|INVALID/i.test(String(value));
  const data = payload?.data || payload;
  const entries = Array.isArray(data) ? data : [data];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    for (const [key, value] of Object.entries(entry)) {
      if (normalizeEmail(key) === email && isUsableAliasId(value)) return String(value);
    }
    const candidates = [entry.aliasId, entry.alias_id, entry.id, entry.emailAliasId];
    const match = candidates.find(isUsableAliasId);
    if (match != null) return String(match);
  }
  return null;
}

function extractZohoAliasResult(payload, aliasEmail = "") {
  const email = normalizeEmail(aliasEmail);
  const data = payload?.data || payload;
  const entries = Array.isArray(data) ? data : [data];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    for (const [key, value] of Object.entries(entry)) {
      if (normalizeEmail(key) === email && value != null && clean(value)) return String(value);
    }
  }
  return "";
}

function extractZohoOrgUserId(payload, preferredAccountId = "") {
  const accountId = clean(preferredAccountId);
  const data = payload?.data || payload;
  const entries = Array.isArray(data) ? data : [data];
  const candidates = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    if (accountId && clean(entry.accountId) === accountId) {
      candidates.push(entry.zuid, entry.userId, entry.id);
    }
    candidates.push(entry.zuid, entry.userId, entry.id);
  }
  const match = candidates.find((value) => value != null && clean(value));
  return match != null ? String(match) : null;
}

async function getZohoOrganizationId(env, options = {}) {
  const configured = envValue(env, "ZOHO_ORG_ID");
  if (configured) return configured;
  const payload = await zohoFetch(env, "/api/organization", options);
  const orgId = extractZohoOrganizationId(payload);
  if (!orgId) throw Object.assign(new Error("No SkyeMail provider organization id found. Check the SkyeMail provider organization credentials."), { statusCode: 502, providerResponse: payload });
  return orgId;
}

async function getZohoMailAccountId(env, preferredAccountId = null, options = {}) {
  if (envValue(env, "ZOHO_ACCOUNT_ID")) return envValue(env, "ZOHO_ACCOUNT_ID");
  if (clean(preferredAccountId) && !String(preferredAccountId).startsWith("local:")) return clean(preferredAccountId);
  const payload = await zohoFetch(env, "/api/accounts", options);
  const accountId = extractZohoAccountId(payload);
  if (!accountId) throw Object.assign(new Error("No SkyeMail mailbox account id found. Check the SkyeMail production mailbox credentials."), { statusCode: 502, providerResponse: payload });
  return accountId;
}

async function getZohoOrgUserId(env, preferredAccountId = null, options = {}) {
  const configured = envValue(env, "ZOHO_ORG_USER_ID");
  if (configured) return configured;
  const orgId = await getZohoOrganizationId(env, options);
  const defaultFrom = envValue(env, "ZOHO_DEFAULT_FROM");
  if (defaultFrom) {
    const byEmail = await zohoFetch(env, `/api/organization/${encodeURIComponent(orgId)}/accounts/${encodeURIComponent(defaultFrom)}`, options).catch(() => null);
    const fromEmail = extractZohoOrgUserId(byEmail, preferredAccountId);
    if (fromEmail) return fromEmail;
  }
  const payload = await zohoFetch(env, `/api/organization/${encodeURIComponent(orgId)}/accounts`, options);
  const zuid = extractZohoOrgUserId(payload, preferredAccountId);
  if (!zuid) throw Object.assign(new Error("No SkyeMail provider organization user id found. Check the SkyeMail production mailbox credentials."), { statusCode: 502, providerResponse: payload });
  return zuid;
}

function zohoResponseSummary(payload) {
  const data = payload?.data || payload;
  return {
    status_code: payload?.status?.code || null,
    status_description: payload?.status?.description || null,
    error_code: payload?.data?.errorCode || payload?.error || null,
    data_shape: Array.isArray(data) ? "array" : (data && typeof data === "object" ? "object" : typeof data),
    data_count: Array.isArray(data) ? data.length : (data ? 1 : 0),
    top_keys: payload && typeof payload === "object" ? Object.keys(payload).slice(0, 8) : [],
    data_keys: data && !Array.isArray(data) && typeof data === "object" ? Object.keys(data).slice(0, 12) : [],
    account_id_detected: Boolean(extractZohoAccountId(payload)),
    default_from_detected: Boolean(extractZohoDefaultFrom(payload)),
    organization_id_detected: Boolean(extractZohoOrganizationId(payload)),
  };
}

async function zohoDiagnosticFetch(env, accessToken, path) {
  const url = `${zohoMailBase(env)}${path}`;
  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      authorization: `Zoho-oauthtoken ${accessToken}`,
    },
  });
  const text = await res.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw_status_only: Boolean(text) }; }
  return {
    path,
    status: res.status,
    ok: res.ok,
    content_type: res.headers.get("content-type") || "",
    summary: zohoResponseSummary(payload),
  };
}

function zohoProviderCanProvision(env) {
  return Boolean(zohoApiConfigured(env) && envValue(env, "ZOHO_ORG_ID"));
}

function randomMailboxPassword() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

async function provisionZohoMailbox(env, { email, localPart, user }) {
  if (!zohoProvisioningConfigured(env)) throw Object.assign(new Error("SkyeMail mailbox provisioning is not configured."), { statusCode: 501 });
  const orgId = await getZohoOrganizationId(env);
  const password = randomMailboxPassword();
  const displayName = clean(user?.handle || email || localPart);
  const nameParts = displayName.split(/\s+/).filter(Boolean);
  const data = await zohoFetch(env, `/api/organization/${encodeURIComponent(orgId)}/accounts`, {
    method: "POST",
    body: JSON.stringify({
      primaryEmailAddress: email,
      password,
      displayName,
      firstName: nameParts[0] || localPart,
      lastName: nameParts.slice(1).join(" ") || displayName || localPart,
    }),
  });
  return {
    provider: "zoho",
    provider_account_id: extractZohoAccountId(data),
    provider_payload: { createAccount: data, organization_id: orgId, mail_base: zohoMailBase(env) },
    mailbox_password_once: password,
    credential_note: "SkyeMail production mailbox password was generated once. Store it in a secret manager if direct mailbox-server login is needed.",
  };
}

async function provisionZohoEmailAlias(env, { aliasEmail, accountId = null }) {
  if (!zohoProvisioningConfigured(env)) throw Object.assign(new Error("SkyeMail mailbox provisioning is not configured."), { statusCode: 501 });
  const parsed = splitEmail(aliasEmail);
  if (!parsed) throw Object.assign(new Error("Valid alias email required."), { statusCode: 400 });
  const orgId = await getZohoOrganizationId(env);
  const zohoAccountId = await getZohoMailAccountId(env, accountId);
  const zohoOrgUserId = await getZohoOrgUserId(env, zohoAccountId);
  const data = await zohoFetch(env, `/api/organization/${encodeURIComponent(orgId)}/accounts/${encodeURIComponent(zohoOrgUserId)}`, {
    method: "PUT",
    body: JSON.stringify({
      zuid: zohoOrgUserId,
      mode: "addEmailAlias",
      emailAlias: [parsed.email],
    }),
  });
  const providerAliasId = extractZohoAliasId(data, parsed.email);
  if (!providerAliasId) {
    const result = extractZohoAliasResult(data, parsed.email) || data?.status?.description || "missing alias id";
    throw Object.assign(new Error(`SkyeMail did not create the receiving alias for ${parsed.email}: ${result}`), { statusCode: 502, providerResponse: data });
  }
  return {
    provider: "zoho",
    provider_account_id: zohoAccountId,
    provider_alias_id: providerAliasId,
    provider_payload: {
      addEmailAlias: data,
      organization_id: orgId,
      account_id: zohoAccountId,
      zuid: zohoOrgUserId,
      alias_email: parsed.email,
      mail_base: zohoMailBase(env),
    },
  };
}

async function ensureZohoSendMailDetails(env, { accountId = null, fromAddress = "", displayName = "" } = {}) {
  const email = normalizeEmail(fromAddress);
  if (!email) throw Object.assign(new Error("SkyeMail send identity email is required."), { statusCode: 400 });
  const writeBypass = { ignoreBackoff: true };
  const orgId = await getZohoOrganizationId(env, writeBypass);
  const zohoAccountId = await getZohoMailAccountId(env, accountId, writeBypass);
  const zohoOrgUserId = await getZohoOrgUserId(env, zohoAccountId, writeBypass);
  return await zohoFetch(env, `/api/organization/${encodeURIComponent(orgId)}/accounts/${encodeURIComponent(zohoAccountId)}`, {
    method: "PUT",
    ignoreBackoff: true,
    body: JSON.stringify({
      zuid: zohoOrgUserId,
      mode: "addsendmaildetails",
      sendMailDetails: [
        {
          fromAddress: email,
          displayName: clean(displayName || email.split("@")[0] || "SkyeMail"),
          mode: "extmailbox",
        },
      ],
    }),
  });
}

async function provisionZohoMailboxAliasRoute(env, { email, reason = "" }) {
  let alias = null;
  try {
    alias = await provisionZohoEmailAlias(env, { aliasEmail: email });
  } catch (error) {
    if (!shouldAttachExistingAddress(error)) throw error;
    const zohoAccountId = await getZohoMailAccountId(env, null);
    alias = {
      provider: "zoho",
      provider_account_id: zohoAccountId,
      provider_alias_id: `existing:${normalizeEmail(email)}`,
      provider_payload: {
        alias_email: normalizeEmail(email),
        account_id: zohoAccountId,
        alias_already_exists: true,
        provider_response: error.providerResponse || null,
        mail_base: zohoMailBase(env),
      },
    };
  }
  return {
    provider: "zoho",
    provider_account_id: alias.provider_account_id,
    provider_payload: {
      ...alias.provider_payload,
      alias_route: true,
      reason: reason || "SkyeMail backed by Citadel Database and SkyeNet created a sovereign receiving alias route because a dedicated mailbox seat was unavailable.",
    },
    provider_alias_id: alias.provider_alias_id,
    mailbox_password_once: null,
    credential_note: "SkyeMail created this address as a real SkyeMail receiving alias on the shared mail account, so replies can be delivered without a separate provider seat.",
  };
}

async function provisionMailboxAlias(env, { mailbox, aliasEmail, user = null, auth = null, source = "mailbox-aliases" }) {
  const parsed = splitEmail(aliasEmail);
  if (!parsed) throw Object.assign(new Error("Valid alias email required."), { statusCode: 400 });
  if (normalizeEmail(parsed.email) === normalizeEmail(mailbox?.mailbox_email)) {
    return {
      provider: mailbox?.provider || "primary",
      provider_account_id: mailbox?.provider_account_id || null,
      provider_alias_id: mailbox?.provider_account_id || null,
      provider_payload: { source, primary_mailbox: true, alias_email: parsed.email },
    };
  }
  const provider = providerConfigured(env);
  if (mailbox?.provider === "zoho" || provider.provider === "zoho") {
    let alias = null;
    try {
      alias = await provisionZohoEmailAlias(env, { aliasEmail: parsed.email, accountId: mailbox?.provider_account_id || null });
    } catch (error) {
      if (!shouldAttachExistingAddress(error)) throw error;
      const zohoAccountId = await getZohoMailAccountId(env, mailbox?.provider_account_id || null);
      alias = {
        provider: "zoho",
        provider_account_id: zohoAccountId,
        provider_alias_id: `existing:${parsed.email}`,
        provider_payload: {
          alias_email: parsed.email,
          account_id: zohoAccountId,
          alias_already_exists: true,
          provider_response: error.providerResponse || null,
          mail_base: zohoMailBase(env),
        },
      };
    }
    return {
      ...alias,
      provider_payload: {
        ...alias.provider_payload,
        source,
        mailbox_email: mailbox?.mailbox_email || null,
        requested_by: user?.email || auth?.email || auth?.sub || null,
        workspace_id: user?.workspace_id || auth?.workspace_id || null,
      },
    };
  }
  if (mailbox?.provider === "external-webhook" || provider.provider === "external-webhook") {
    const data = await postJson(env.MAILBOX_PROVISION_WEBHOOK_URL, {
      platform: "SkyeMail",
      operation: "alias",
      email: parsed.email,
      alias_email: parsed.email,
      mailbox_email: mailbox?.mailbox_email || null,
      provider_account_id: mailbox?.provider_account_id || null,
      user,
      auth,
    }, { "x-skymail-provision-secret": env.MAILBOX_PROVISION_WEBHOOK_SECRET });
    return {
      provider: "external-webhook",
      provider_account_id: data?.provider_account_id || mailbox?.provider_account_id || null,
      provider_alias_id: data?.provider_alias_id || data?.id || null,
      provider_payload: data,
    };
  }
  throw Object.assign(new Error("This SkyeMail mail lane cannot create receiving aliases automatically. Alias was not activated because replies would bounce."), { statusCode: 501 });
}

function addressList(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return String(value || "").split(",").map(clean).filter(Boolean);
}

function decodeAttachmentBytes(value) {
  const raw = String(value || "").replace(/^data:[^,]+,/i, "").replace(/\s+/g, "");
  if (!raw) return null;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function normalizeOutboundAttachments(attachments = []) {
  return (Array.isArray(attachments) ? attachments : [])
    .slice(0, 10)
    .map((item) => ({
      filename: clean(item.filename || item.name || "attachment"),
      data_b64: clean(item.data_b64 || item.content || item.data || ""),
      mime_type: clean(item.mime_type || item.content_type || item.type || "application/octet-stream"),
      inline: Boolean(item.inline || item.isInline),
    }))
    .filter((item) => item.filename && item.data_b64);
}

async function zohoUploadAttachments(env, accountId, attachments = []) {
  const uploaded = [];
  const prepared = normalizeOutboundAttachments(attachments)
    .map((attachment) => ({ ...attachment, bytes: decodeAttachmentBytes(attachment.data_b64) }))
    .filter((attachment) => attachment.bytes?.length);
  async function collectUploadRows(res) {
    const data = await res.json().catch(() => ({}));
    const rows = Array.isArray(data?.data) ? data.data : (data?.data ? [data.data] : []);
    for (const row of rows) {
      const storeName = clean(row?.storeName);
      const attachmentPath = clean(row?.attachmentPath);
      const attachmentName = clean(row?.attachmentName || row?.fileName || row?.filename);
      if (storeName && attachmentPath && attachmentName) uploaded.push({ storeName, attachmentPath, attachmentName });
    }
  }
  for (const inline of [false, true]) {
    const group = prepared.filter((attachment) => Boolean(attachment.inline) === inline);
    if (!group.length) continue;
    const params = new URLSearchParams({
      uploadType: "multipart",
      isInline: inline ? "true" : "false",
    });
    const form = new FormData();
    for (const attachment of group) {
      form.append("attach", new Blob([attachment.bytes], { type: attachment.mime_type || "application/octet-stream" }), attachment.filename);
    }
    try {
      const res = await zohoRawFetch(env, `/api/accounts/${encodeURIComponent(accountId)}/messages/attachments?${params.toString()}`, {
        method: "POST",
        ignoreBackoff: true,
        body: form,
      });
      await collectUploadRows(res);
    } catch (error) {
      if (Number(error.statusCode || 0) !== 415 && !/access\s+denied/i.test(String(error.message || ""))) throw error;
      for (const attachment of group) {
        const rawParams = new URLSearchParams({
          fileName: attachment.filename,
          isInline: attachment.inline ? "true" : "false",
        });
        const res = await zohoRawFetch(env, `/api/accounts/${encodeURIComponent(accountId)}/messages/attachments?${rawParams.toString()}`, {
          method: "POST",
          ignoreBackoff: true,
          headers: { "content-type": attachment.mime_type || "application/octet-stream" },
          body: attachment.bytes,
        });
        await collectUploadRows(res);
      }
    }
  }
  return uploaded;
}

async function zohoSendMail(env, { accountId, fromAddress, to, cc = "", bcc = "", replyTo = "", subject, html, text, replyMessageId = "", threadId = "", attachments = [] }) {
  if (!zohoApiConfigured(env)) throw Object.assign(new Error("SkyeMail production mail API is not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN."), { statusCode: 501 });
  const zohoAccountId = await getZohoMailAccountId(env, accountId, { ignoreBackoff: true });
  const from = clean(fromAddress || envValue(env, "ZOHO_DEFAULT_FROM"));
  if (!from) throw Object.assign(new Error("A SkyeMail default sender or hosted mailbox sender is required for sending."), { statusCode: 501 });
  const sendPayload = {
    fromAddress: from,
    toAddress: addressList(to).join(","),
    subject,
    content: html || text || "",
    mailFormat: html ? "html" : "plaintext",
    askReceipt: "no",
  };
  const ccAddress = addressList(cc).join(",");
  const bccAddress = addressList(bcc).join(",");
  const replyToAddress = clean(replyTo);
  if (ccAddress) sendPayload.ccAddress = ccAddress;
  if (bccAddress) sendPayload.bccAddress = bccAddress;
  if (replyToAddress) sendPayload.replyTo = replyToAddress;
  const uploadedAttachments = await zohoUploadAttachments(env, zohoAccountId, attachments);
  if (uploadedAttachments.length) sendPayload.attachments = uploadedAttachments;
  let payload = null;
  try {
    payload = await zohoFetch(env, `/api/accounts/${encodeURIComponent(zohoAccountId)}/messages`, {
      method: "POST",
      ignoreBackoff: true,
      body: JSON.stringify(sendPayload),
    });
  } catch (error) {
    const denied = /access\s+denied/i.test(String(error.message || ""));
    if (!denied || normalizeEmail(from) === normalizeEmail(envValue(env, "ZOHO_DEFAULT_FROM"))) throw error;
    await ensureZohoSendMailDetails(env, {
      accountId: zohoAccountId,
      fromAddress: from,
      displayName: from.split("@")[0],
    });
    payload = await zohoFetch(env, `/api/accounts/${encodeURIComponent(zohoAccountId)}/messages`, {
      method: "POST",
      ignoreBackoff: true,
      body: JSON.stringify(sendPayload),
    });
  }
  return { ...payload, id: extractZohoMessageId(payload) || `zoho-${crypto.randomUUID()}`, accountId: zohoAccountId, attachment_count: uploadedAttachments.length };
}

async function zohoSaveDraft(env, { accountId, fromAddress, to, cc = "", bcc = "", subject, html, text, replyMessageId = "", threadId = "", attachments = [] }) {
  if (!zohoApiConfigured(env)) throw Object.assign(new Error("SkyeMail production mail API is not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN."), { statusCode: 501 });
  const zohoAccountId = await getZohoMailAccountId(env, accountId, { ignoreBackoff: true });
  const from = clean(fromAddress || envValue(env, "ZOHO_DEFAULT_FROM"));
  if (!from) throw Object.assign(new Error("A SkyeMail default sender or hosted mailbox sender is required for draft save."), { statusCode: 501 });
  const payload = {
    mode: "draft",
    fromAddress: from,
    toAddress: addressList(to).join(","),
    subject: clean(subject),
    content: html || text || "",
    mailFormat: html ? "html" : "plaintext",
  };
  const ccAddress = addressList(cc).join(",");
  const bccAddress = addressList(bcc).join(",");
  if (ccAddress) payload.ccAddress = ccAddress;
  if (bccAddress) payload.bccAddress = bccAddress;
  if (replyMessageId) payload.inReplyTo = clean(replyMessageId);
  if (threadId) payload.refHeader = clean(threadId);
  const uploadedAttachments = await zohoUploadAttachments(env, zohoAccountId, attachments);
  if (uploadedAttachments.length) payload.attachments = uploadedAttachments;
  const data = await zohoFetch(env, `/api/accounts/${encodeURIComponent(zohoAccountId)}/messages`, {
    method: "POST",
    ignoreBackoff: true,
    body: JSON.stringify(payload),
  });
  const dataBody = data?.data || data || {};
  const messageId = extractZohoMessageId(data) || `zoho-draft-${crypto.randomUUID()}`;
  const folderId = clean(dataBody.folderId || dataBody.folder_id || dataBody.folderID || dataBody.folderid)
    || await zohoFolderIdForLabel(env, zohoAccountId, "DRAFT", { ignoreBackoff: true }).catch(() => "");
  return { ...data, id: messageId, provider_ui_id: folderId ? zohoUiId(zohoAccountId, folderId, messageId) : messageId, accountId: zohoAccountId, folderId, attachment_count: uploadedAttachments.length };
}

function zohoUiId(accountId, folderId, messageId) {
  return `zoho:${encodeURIComponent(String(accountId || ""))}:${encodeURIComponent(String(folderId || ""))}:${encodeURIComponent(String(messageId || ""))}`;
}

function parseZohoUiId(value, fallbackAccountId = null) {
  const raw = String(value || "");
  const parts = raw.split(":");
  if (parts[0] === "zoho" && parts.length >= 4) {
    return {
      accountId: decodeURIComponent(parts[1] || "") || fallbackAccountId,
      folderId: decodeURIComponent(parts[2] || ""),
      messageId: decodeURIComponent(parts.slice(3).join(":") || ""),
    };
  }
  return { accountId: fallbackAccountId, folderId: "", messageId: raw };
}

async function resolveZohoMessageRef(env, { id, userId, mailbox = null, requireFolder = false } = {}) {
  const raw = clean(id);
  if (!raw || mailbox?.provider !== "zoho" || !zohoApiConfigured(env)) return null;
  const accountId = await getZohoMailAccountId(env, mailbox.provider_account_id || null);
  const isProviderMessageId = (value) => /^\d+$/.test(clean(value));
  let parsed = parseZohoUiId(raw, accountId);
  if (raw.startsWith("zoho:") && isProviderMessageId(parsed.messageId) && (!requireFolder || parsed.folderId)) {
    return { input_id: raw, accountId: parsed.accountId || accountId, folderId: parsed.folderId || "", messageId: clean(parsed.messageId) };
  }

  const rows = isUuid(raw)
    ? await query(env, `
        select id, thread_id, from_name, from_email, key_version, ciphertext_b64, created_at, read_at, starred_at,
               direction, delivery_provider, provider_message_id, delivery_status, recipient_alias, delivered_to
          from messages
         where id=$1 and user_id=$2
         limit 1
      `, [raw, userId]).catch(() => [])
    : await query(env, `
        select id, thread_id, from_name, from_email, key_version, ciphertext_b64, created_at, read_at, starred_at,
               direction, delivery_provider, provider_message_id, delivery_status, recipient_alias, delivered_to
          from messages
         where user_id=$1
           and delivery_provider='zoho'
           and provider_message_id=$2
         limit 1
      `, [userId, messageLabelKeyFromId(raw).provider_message_id || raw]).catch(() => []);
  if (rows[0]?.delivery_provider === "zoho" || rows[0]?.provider_message_id) {
    const uiId = await findZohoUiIdForStoredRow(env, rows[0], mailbox).catch(() => "");
    parsed = parseZohoUiId(uiId || rows[0].provider_message_id || raw, accountId);
  }
  if (!isProviderMessageId(parsed.messageId)) return null;
  if (requireFolder && !parsed.folderId) return null;
  return { input_id: raw, accountId: parsed.accountId || accountId, folderId: parsed.folderId || "", messageId: clean(parsed.messageId) };
}

async function resolveZohoMessageRefs(env, { ids = [], userId, mailbox = null, requireFolder = false } = {}) {
  const refs = [];
  for (const id of ids) {
    const ref = await resolveZohoMessageRef(env, { id, userId, mailbox, requireFolder });
    if (ref?.messageId) refs.push(ref);
  }
  return refs;
}

function groupZohoRefsByAccount(refs = []) {
  const groups = new Map();
  for (const ref of refs) {
    const accountId = clean(ref.accountId);
    if (!accountId) continue;
    if (!groups.has(accountId)) groups.set(accountId, []);
    groups.get(accountId).push(ref);
  }
  return groups;
}

async function zohoUpdateMessages(env, accountId, body) {
  return await zohoFetch(env, `/api/accounts/${encodeURIComponent(accountId)}/updatemessage`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

async function mutateZohoMessageRefs(env, { refs = [], markRead = false, markUnread = false, archive = false, trash = false, untrash = false, starred = null } = {}) {
  const mutations = [];
  for (const [accountId, accountRefs] of groupZohoRefsByAccount(refs)) {
    const messageId = Array.from(new Set(accountRefs.map((ref) => clean(ref.messageId)).filter(Boolean)));
    if (!messageId.length) continue;
    if (markRead) mutations.push({ accountId, mode: "markAsRead", result: await zohoUpdateMessages(env, accountId, { mode: "markAsRead", messageId }) });
    if (markUnread) mutations.push({ accountId, mode: "markAsUnread", result: await zohoUpdateMessages(env, accountId, { mode: "markAsUnread", messageId }) });
    if (archive) mutations.push({ accountId, mode: "archiveMails", result: await zohoUpdateMessages(env, accountId, { mode: "archiveMails", messageId }) });
    if (trash || untrash) {
      const destfolderId = await zohoFolderIdForLabel(env, accountId, trash ? "TRASH" : "INBOX");
      if (!destfolderId) throw Object.assign(new Error(`SkyeMail ${trash ? "Trash" : "Inbox"} folder id unavailable.`), { statusCode: 502 });
      mutations.push({ accountId, mode: trash ? "moveToTrash" : "restoreToInbox", result: await zohoUpdateMessages(env, accountId, { mode: "moveMessage", destfolderId, messageId }) });
    }
    if (starred !== null) {
      try {
        mutations.push({ accountId, mode: "setFlag", result: await zohoUpdateMessages(env, accountId, { mode: "setFlag", flagid: starred ? "important" : "flag_not_set", messageId }) });
      } catch (error) {
        mutations.push({
          accountId,
          mode: "setFlag",
          accepted: false,
          skipped: true,
          warning: error.message || "SkyeMail mail-state update failed; SkyeMail local priority state was retained.",
          statusCode: error.statusCode || 502,
        });
      }
    }
  }
  return mutations;
}

async function deleteZohoMessageRefs(env, { refs = [], expunge = true } = {}) {
  const deleted = [];
  const skipped = [];
  for (const ref of refs) {
    if (!ref.folderId) {
      skipped.push({ input_id: ref.input_id, messageId: ref.messageId, reason: "folder_id_missing" });
      continue;
    }
    const params = new URLSearchParams({ expunge: expunge ? "true" : "false" });
    const res = await zohoRawFetch(env, `/api/accounts/${encodeURIComponent(ref.accountId)}/folders/${encodeURIComponent(ref.folderId)}/messages/${encodeURIComponent(ref.messageId)}?${params.toString()}`, {
      method: "DELETE",
      headers: { accept: "application/json" },
    });
    deleted.push({ input_id: ref.input_id, messageId: ref.messageId, folderId: ref.folderId, data: await res.json().catch(() => null) });
  }
  return { deleted, skipped };
}

function zohoDate(value) {
  const numeric = Number(value || 0);
  if (!numeric) return null;
  return new Date(numeric).toISOString();
}

function zohoFolderName(folder) {
  return clean(folder?.displayName || folder?.folderName || folder?.path || folder?.name || folder?.folderId);
}

function zohoSystemLabel(folderOrName) {
  const name = clean(typeof folderOrName === "string" ? folderOrName : zohoFolderName(folderOrName)).toLowerCase();
  if (name.includes("sent")) return "SENT";
  if (name.includes("draft")) return "DRAFT";
  if (name.includes("spam") || name.includes("junk")) return "SPAM";
  if (name.includes("trash") || name.includes("bin")) return "TRASH";
  if (name.includes("inbox")) return "INBOX";
  return clean(typeof folderOrName === "object" ? folderOrName?.folderId : folderOrName).toUpperCase() || "INBOX";
}

function zohoMessageSummary(message, { accountId, mailbox, label }) {
  const messageId = String(message?.messageId || message?.id || "");
  const providerThreadId = String(message?.threadId || message?.thread_id || message?.conversationId || "");
  const folderId = message?.folderId != null ? String(message.folderId) : "";
  const systemLabel = label || zohoSystemLabel(message?.folderName || message?.folderPath || "INBOX");
  const status = clean(message?.status).toLowerCase();
  const unread = status.includes("unread") || status === "0";
  const internalDate = zohoDate(message?.receivedtime || message?.sentDateInGMT || message?.sentDate || message?.date);
  return {
    id: zohoUiId(accountId, folderId, messageId),
    thread_id: zohoUiId(accountId, folderId, messageId),
    subject: message?.subject || "(no subject)",
    from: message?.sender || message?.fromAddress || "",
    to: message?.toAddress || mailbox || "",
    snippet: message?.summary || "",
    labels: [systemLabel, unread ? "UNREAD" : null].filter(Boolean),
    unread,
    starred: false,
    important: false,
    has_attachments: Number(message?.hasAttachment || 0) > 0,
    internal_date: internalDate,
    date: internalDate,
    direction: systemLabel === "SENT" ? "outbound" : "inbound",
    delivery_provider: "zoho",
    provider_message_id: messageId,
    provider_folder_id: folderId,
    provider_thread_id: providerThreadId || null,
    provider_ui_id: zohoUiId(accountId, folderId, messageId),
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function messageLabelKeyFromId(id) {
  const raw = clean(id);
  if (raw.startsWith("zoho:")) {
    const parsed = parseZohoUiId(raw);
    return { provider: "zoho", provider_message_id: clean(parsed.messageId), message_id: null };
  }
  return {
    provider: "local",
    provider_message_id: raw,
    message_id: isUuid(raw) ? raw : null,
  };
}

async function ensureMessageLabelStateSchema(env) {
  const schema = schemaName(env);
  await query(env, `alter table if exists ${schema}.messages add column if not exists starred_at timestamptz`);
  await query(env, `
    create table if not exists ${schema}.message_label_states (
      user_id uuid not null references ${schema}.users(id) on delete cascade,
      provider text not null default 'local',
      provider_message_id text not null,
      message_id uuid references ${schema}.messages(id) on delete cascade,
      starred_at timestamptz,
      read_at timestamptz,
      archived_at timestamptz,
      trashed_at timestamptz,
      updated_at timestamptz not null default now(),
      primary key(user_id, provider, provider_message_id)
    )
  `);
  await query(env, `create index if not exists idx_message_label_states_user_updated on ${schema}.message_label_states(user_id, updated_at desc)`);
  await query(env, `create index if not exists idx_message_label_states_message on ${schema}.message_label_states(message_id)`);
}

async function saveMessageLabelState(env, { userId, id, starred = null, markRead = false, markUnread = false, trash = false, untrash = false, archive = false }) {
  await ensureMessageLabelStateSchema(env);
  const key = messageLabelKeyFromId(id);
  if (!key.provider_message_id) return null;
  const starredAt = starred === true ? new Date().toISOString() : null;
  const readAt = markRead ? new Date().toISOString() : null;
  const archivedAt = archive ? new Date().toISOString() : null;
  const trashedAt = trash ? new Date().toISOString() : null;
  const rows = await query(env, `
    insert into message_label_states(user_id, provider, provider_message_id, message_id, starred_at, read_at, archived_at, trashed_at, updated_at)
    values($1,$2,$3,$4,$5::timestamptz,$6::timestamptz,$7::timestamptz,$8::timestamptz,now())
    on conflict(user_id, provider, provider_message_id)
    do update set
      message_id=coalesce(excluded.message_id, message_label_states.message_id),
      starred_at=case when $9::boolean then excluded.starred_at else message_label_states.starred_at end,
      read_at=case when $10::boolean then excluded.read_at when $11::boolean then null else message_label_states.read_at end,
      archived_at=case when $12::boolean then excluded.archived_at else message_label_states.archived_at end,
      trashed_at=case when $14::boolean then null when $13::boolean then excluded.trashed_at else message_label_states.trashed_at end,
      updated_at=now()
    returning *
  `, [
    userId,
    key.provider,
    key.provider_message_id,
    key.message_id,
    starredAt,
    readAt,
    archivedAt,
    trashedAt,
    starred !== null,
    markRead,
    markUnread,
    archive,
    trash,
    untrash,
  ]);
  if (starred !== null) {
    if (key.message_id) {
      await query(env, "update messages set starred_at=$3::timestamptz where id=$1 and user_id=$2", [key.message_id, userId, starredAt]).catch(() => null);
    } else {
      await query(env, "update messages set starred_at=$4::timestamptz where user_id=$1 and delivery_provider=$2 and provider_message_id=$3", [userId, key.provider, key.provider_message_id, starredAt]).catch(() => null);
    }
  }
  return rows[0] || null;
}

async function applyMessageLabelState(env, userId, payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (!items.length) return payload;
  const requestedLabel = clean(payload?.requested_label || payload?.requestedLabel || "").toUpperCase();
  const keys = items
    .map((item) => {
      const provider = item.delivery_provider === "zoho" || String(item.id || "").startsWith("zoho:") ? "zoho" : "local";
      return {
        provider,
        provider_message_id: provider === "local"
          ? clean(messageLabelKeyFromId(item.id).provider_message_id || item.provider_message_id)
          : clean(item.provider_message_id || messageLabelKeyFromId(item.id).provider_message_id),
      };
    })
    .filter((key) => key.provider_message_id);
  if (!keys.length) return payload;
  const zohoIds = keys.filter((key) => key.provider === "zoho").map((key) => key.provider_message_id);
  const localIds = keys.filter((key) => key.provider !== "zoho").map((key) => key.provider_message_id);
  const states = await query(env, `
    select provider, provider_message_id, starred_at, read_at, archived_at, trashed_at
      from message_label_states
     where user_id=$1
       and (
         (provider='zoho' and provider_message_id = any($2::text[]))
         or (provider='local' and provider_message_id = any($3::text[]))
       )
  `, [userId, zohoIds, localIds]).catch(() => []);
  const stateMap = new Map(states.map((state) => [`${state.provider}:${state.provider_message_id}`, state]));
	  const mappedItems = items.map((item) => {
	      const provider = item.delivery_provider === "zoho" || String(item.id || "").startsWith("zoho:") ? "zoho" : "local";
	      const providerMessageId = provider === "local"
	        ? clean(messageLabelKeyFromId(item.id).provider_message_id || item.provider_message_id)
	        : clean(item.provider_message_id || messageLabelKeyFromId(item.id).provider_message_id);
	      const stateKey = `${provider}:${providerMessageId}`;
	      const hasState = stateMap.has(stateKey);
	      const state = stateMap.get(stateKey);
	      let labels = Array.isArray(item.labels) ? [...item.labels] : [];
	      const starred = hasState ? Boolean(state?.starred_at) : Boolean(item.starred);
	      const providerTrashed = String(item.delivery_status || "").toLowerCase() === "trashed" || labels.some((label) => String(label || "").toUpperCase() === "TRASH");
	      const trashed = hasState ? Boolean(state?.trashed_at) : providerTrashed;
	      if (!starred) labels = labels.filter((label) => String(label || "").toUpperCase() !== "STARRED");
	      if (starred && !labels.includes("STARRED")) labels.push("STARRED");
	      if (!trashed) labels = labels.filter((label) => String(label || "").toUpperCase() !== "TRASH");
	      if (trashed && !labels.includes("TRASH")) labels.push("TRASH");
	      return {
	        ...item,
	        labels,
	        starred,
	        unread: state?.read_at ? false : item.unread,
	        delivery_status: trashed ? "trashed" : (String(item.delivery_status || "").toLowerCase() === "trashed" ? null : item.delivery_status),
	      };
	    });
	  const filteredItems = requestedLabel === "STARRED"
	    ? mappedItems.filter((item) => item.starred || (item.labels || []).some((label) => String(label || "").toUpperCase() === "STARRED"))
	    : requestedLabel === "TRASH"
	      ? mappedItems.filter((item) => String(item.delivery_status || "").toLowerCase() === "trashed" || (item.labels || []).some((label) => String(label || "").toUpperCase() === "TRASH"))
	      : requestedLabel === "INBOX"
	        ? mappedItems.filter((item) => String(item.delivery_status || "").toLowerCase() !== "trashed")
	        : mappedItems;
	  return {
	    ...payload,
	    items: filteredItems,
	  };
}

function zohoAddressSet(value) {
  return new Set(String(value || "")
    .split(/[;,]/)
    .map((item) => extractAddress(item))
    .filter(Boolean));
}

function zohoMessageBelongsToMailbox(message, mailbox = "", label = "") {
  const wanted = normalizeEmail(mailbox);
  if (!wanted) return true;
  const requestedLabel = clean(label).toUpperCase();
  const inbound = new Set([
    ...zohoAddressSet(message?.toAddress),
    ...zohoAddressSet(message?.ccAddress),
    ...zohoAddressSet(message?.bccAddress),
  ]);
  const outbound = new Set([
    ...zohoAddressSet(message?.fromAddress),
    ...zohoAddressSet(message?.sender),
  ]);
  if (requestedLabel === "SENT") return outbound.has(wanted) || inbound.has(wanted);
  return inbound.has(wanted) || outbound.has(wanted) || JSON.stringify(message || {}).toLowerCase().includes(wanted);
}

function zohoSearchTerm(value) {
  return clean(value).replace(/"/g, '\\"');
}

function zohoSearchKeyForQuery(q) {
  const value = zohoSearchTerm(q);
  if (!value) return "";
  if (/^[a-z][a-z0-9_]*:/i.test(value) || value === "newMails") return value;
  return `entire:"${value}"`;
}

function zohoSearchKeyForMailbox(mailbox) {
  const email = zohoSearchTerm(normalizeEmail(mailbox));
  if (!email) return "";
  return `to:${email}::or:cc:${email}`;
}

function zohoMessageMatchesQuery(message = {}, q = "") {
  let needle = clean(q, 500).trim();
  if (!needle) return true;
  needle = needle
    .replace(/^(entire|subject|from|to|cc|bcc):/i, "")
    .replace(/^"|"$/g, "")
    .trim()
    .toLowerCase();
  if (!needle || needle === "newmails") return true;
  const haystack = [
    message.subject,
    message.summary,
    message.sender,
    message.fromAddress,
    message.toAddress,
    message.ccAddress,
    message.bccAddress,
  ].map((item) => clean(item, 4000).toLowerCase()).join("\n");
  return haystack.includes(needle);
}

async function zohoListFolders(env, accountId = null, options = {}) {
  const zohoAccountId = await getZohoMailAccountId(env, accountId, options);
  const payload = await zohoFetch(env, `/api/accounts/${encodeURIComponent(zohoAccountId)}/folders`, options);
  const folders = Array.isArray(payload?.data) ? payload.data : [];
  return {
    accountId: zohoAccountId,
    items: folders.map((folder) => {
      const id = zohoSystemLabel(folder);
      return {
        id,
        provider_folder_id: folder?.folderId != null ? String(folder.folderId) : id,
        name: zohoFolderName(folder) || id,
        type: ["INBOX", "SENT", "DRAFT", "SPAM", "TRASH"].includes(id) ? "system" : "user",
        messagesTotal: Number(folder?.count || folder?.messagesTotal || 0),
        messagesUnread: Number(folder?.unreadCount || folder?.messagesUnread || 0),
        threadsTotal: Number(folder?.count || folder?.messagesTotal || 0),
        threadsUnread: Number(folder?.unreadCount || folder?.messagesUnread || 0),
        labelListVisibility: null,
        messageListVisibility: null,
        color: null,
      };
    }),
  };
}

async function zohoFolderIdForLabel(env, accountId, label, options = {}) {
  const requested = clean(label).toUpperCase();
  if (!requested) return "";
  const folders = await zohoListFolders(env, accountId, options);
  const found = folders.items.find((folder) => folder.id === requested);
  return found?.provider_folder_id || "";
}

async function zohoListMessages(env, { accountId = null, mailbox = "", label = "", max = 25, pageToken = "", q = "" } = {}) {
  const zohoAccountId = await getZohoMailAccountId(env, accountId);
  const limit = Math.min(Math.max(Number(max || 25), 1), 100);
  const start = Math.max(Number(pageToken || 1), 1);
  const requestedLabel = clean(label).toUpperCase();
  const folderId = requestedLabel ? await zohoFolderIdForLabel(env, zohoAccountId, requestedLabel) : "";
  const labelScopedView = Boolean(folderId && requestedLabel && requestedLabel !== "ALL");
  const aliasFilteredInbox = Boolean(mailbox && !requestedLabel && !q);
  const providerLimit = (aliasFilteredInbox || labelScopedView || q) ? Math.max(limit, 100) : limit;
  const params = new URLSearchParams({ start: String(start), limit: String(providerLimit), includeto: "true" });
  let payload = null;
  let rawMessages = [];
  if (labelScopedView) {
    params.set("status", "all");
    params.set("sortBy", "date");
    params.set("sortorder", "false");
    params.set("includesent", "true");
    params.set("folderId", folderId);
    payload = await zohoFetch(env, `/api/accounts/${encodeURIComponent(zohoAccountId)}/messages/view?${params.toString()}`);
    rawMessages = Array.isArray(payload?.data) ? [...payload.data].filter((message) => zohoMessageMatchesQuery(message, q)) : [];
  } else if (aliasFilteredInbox) {
    params.set("searchKey", zohoSearchKeyForMailbox(mailbox));
    payload = await zohoFetch(env, `/api/accounts/${encodeURIComponent(zohoAccountId)}/messages/search?${params.toString()}`);
    rawMessages = Array.isArray(payload?.data) ? [...payload.data] : [];
  } else if (q) {
    params.set("searchKey", zohoSearchKeyForQuery(q));
    payload = await zohoFetch(env, `/api/accounts/${encodeURIComponent(zohoAccountId)}/messages/search?${params.toString()}`);
    rawMessages = Array.isArray(payload?.data) ? [...payload.data] : [];
  } else {
    params.set("status", "all");
    params.set("sortBy", "date");
    params.set("sortorder", "false");
    params.set("includesent", "true");
    if (folderId) params.set("folderId", folderId);
    payload = await zohoFetch(env, `/api/accounts/${encodeURIComponent(zohoAccountId)}/messages/view?${params.toString()}`);
    rawMessages = Array.isArray(payload?.data) ? [...payload.data] : [];
  }
  const messages = rawMessages
    .filter((message) => zohoMessageBelongsToMailbox(message, mailbox, requestedLabel || ""))
    .slice(0, limit);
  return {
    ok: true,
    mailbox: mailbox || envValue(env, "ZOHO_DEFAULT_FROM") || zohoAccountId,
    nextPageToken: rawMessages.length >= providerLimit ? String(start + providerLimit) : null,
    resultSizeEstimate: Number(payload?.resultSizeEstimate || messages.length),
    items: messages.map((message) => zohoMessageSummary(message, { accountId: zohoAccountId, mailbox, label: requestedLabel || "" })),
  };
}

function stripHtml(value) {
  return String(value || "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeZohoAttachment(item = {}, inline = false) {
  const attachmentId = clean(item.attachmentId || item.id || item.storeName || item.attachmentName);
  const filename = clean(item.attachmentName || item.fileName || item.filename || "attachment");
  const cid = clean(item.cid || item.contentId || item.contentID || "");
  return {
    attachment_id: attachmentId,
    filename,
    mime_type: clean(item.contentType || item.mimeType || item.mime_type || "") || (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(filename) ? `image/${filename.split(".").pop().toLowerCase().replace("jpg", "jpeg")}` : "application/octet-stream"),
    size: Number(item.attachmentSize || item.size || 0) || 0,
    inline,
    cid,
  };
}

async function zohoAttachmentInfo(env, { accountId, folderId, messageId }) {
  if (!folderId || !messageId) return { attachments: [], inline: [] };
  const payload = await zohoFetch(env, `/api/accounts/${encodeURIComponent(accountId)}/folders/${encodeURIComponent(folderId)}/messages/${encodeURIComponent(messageId)}/attachmentinfo?includeInline=true`).catch(() => null);
  const data = payload?.data || payload || {};
  return {
    attachments: Array.isArray(data.attachments) ? data.attachments.map((item) => normalizeZohoAttachment(item, false)).filter((item) => item.attachment_id) : [],
    inline: Array.isArray(data.inline) ? data.inline.map((item) => normalizeZohoAttachment(item, true)).filter((item) => item.attachment_id || item.cid) : [],
  };
}

function zohoAttachmentUrl(messageId, attachment, inline = false) {
  const params = new URLSearchParams({
    id: messageId,
    filename: attachment.filename || "attachment",
  });
  if (attachment.attachment_id) params.set("attachmentId", attachment.attachment_id);
  if (attachment.cid) params.set("cid", attachment.cid);
  if (inline) params.set("inline", "1");
  return `/gmail-attachment?${params.toString()}`;
}

function replaceCidImages(html, messageId, inlineItems = []) {
  let out = String(html || "");
  for (const item of inlineItems) {
    if (!item.cid) continue;
    const cidVariants = [
      `cid:${item.cid}`,
      `cid:${encodeURIComponent(item.cid)}`,
      item.cid,
      encodeURIComponent(item.cid),
    ];
    const url = zohoAttachmentUrl(messageId, item, true).replace(/&/g, "&amp;");
    for (const cid of cidVariants) {
      out = out.replaceAll(cid, url);
    }
  }
  return out;
}

async function zohoGetMessage(env, { id, accountId = null, mailbox = "" }) {
  const fallbackAccountId = await getZohoMailAccountId(env, accountId);
  const parsed = parseZohoUiId(id, fallbackAccountId);
  if (!parsed.messageId) throw Object.assign(new Error("SkyeMail message id required."), { statusCode: 400 });
  if (!parsed.folderId) throw Object.assign(new Error("SkyeMail message folder id missing. Open the message from a Citadel Database and SkyeNet inbox result."), { statusCode: 400 });
  const payload = await zohoFetch(env, `/api/accounts/${encodeURIComponent(parsed.accountId)}/folders/${encodeURIComponent(parsed.folderId)}/messages/${encodeURIComponent(parsed.messageId)}/content`);
  const data = payload?.data || payload || {};
  const attachmentInfo = await zohoAttachmentInfo(env, parsed);
  const messageId = zohoUiId(parsed.accountId, parsed.folderId, parsed.messageId);
  const html = replaceCidImages(data?.content || data?.html || data?.body || "", messageId, attachmentInfo.inline);
  const text = data?.text || data?.summary || stripHtml(html);
  return {
    ok: true,
    mailbox: mailbox || envValue(env, "ZOHO_DEFAULT_FROM") || parsed.accountId,
    message: {
      id: messageId,
      thread_id: messageId,
      snippet: data?.summary || text.slice(0, 240),
      labels: [zohoSystemLabel(data?.folderName || "INBOX")],
      unread: false,
      starred: false,
      important: false,
      internal_date: zohoDate(data?.receivedtime || data?.sentDateInGMT || data?.sentDate || data?.date),
      headers: {
        from: data?.sender || data?.fromAddress || "",
        to: data?.toAddress || mailbox || "",
        cc: data?.ccAddress || "",
        subject: data?.subject || "(no subject)",
        date: data?.receivedDate || data?.sentDate || "",
        message_id: String(data?.messageId || parsed.messageId),
        references: data?.references || "",
        in_reply_to: data?.inReplyTo || "",
      },
      body: { text, html },
      attachments: [...attachmentInfo.attachments, ...attachmentInfo.inline].map((item) => ({
        ...item,
        attachment_id: item.attachment_id || item.cid,
        url: zohoAttachmentUrl(messageId, item, item.inline),
      })),
      direction: "inbound",
      delivery_provider: "zoho",
      provider_message_id: String(data?.messageId || parsed.messageId),
    },
  };
}

function localRouteProvision(email, reason = "Hosted mailbox provider is not configured; SkyeMail local route is active for database inbox proof.") {
  return {
    provider: "skymail-local-route",
    provider_account_id: `local:${email}`,
    provider_payload: { local_route: true, reason },
    mailbox_password_once: null,
    credential_note: reason,
  };
}

function isProductionMailbox(row = {}) {
  const provider = clean(row.provider).toLowerCase();
  const status = clean(row.status).toLowerCase();
  const provisioningStatus = clean(row.provisioning_status).toLowerCase();
  return status === "active"
    && provisioningStatus === "provisioned"
    && provider
    && !["skymail-local-route", "resend"].includes(provider);
}

function mailboxInventoryState(row = {}) {
  const provider = clean(row.provider).toLowerCase();
  const status = clean(row.status).toLowerCase();
  const provisioningStatus = clean(row.provisioning_status).toLowerCase();
  if (isProductionMailbox(row)) {
    return {
      inventory_class: "production_sellable",
      sellable_production: true,
      customer_facing_state: "SkyeMail production mailbox",
      needs_action: "",
    };
  }
  if (provider === "skymail-local-route") {
    return {
      inventory_class: "internal_local_route_not_provider_backed",
      sellable_production: false,
      customer_facing_state: "internal route only",
      needs_action: "Archive or convert to a SkyeMail mailbox before customer use.",
    };
  }
  if (provider === "resend") {
    return {
      inventory_class: "proof_demo_not_sellable",
      sellable_production: false,
      customer_facing_state: "proof/demo route",
      needs_action: "Archive proof rows after the proof run; do not expose as mailbox inventory.",
    };
  }
  if (["error", "failed", "disabled"].includes(status) || provisioningStatus.includes("error") || provisioningStatus.includes("failed")) {
    return {
      inventory_class: "provider_blocked_not_sellable",
      sellable_production: false,
      customer_facing_state: "provider provisioning blocked",
      needs_action: "Repair provider state or retry provisioning before customer use.",
    };
  }
  return {
    inventory_class: "pending_not_sellable",
    sellable_production: false,
    customer_facing_state: "pending SkyeMail mailbox",
    needs_action: "Complete provider provisioning before customer use.",
  };
}

function localOnlyMailboxError(detail = "") {
  const suffix = detail ? ` ${detail}` : "";
  return Object.assign(new Error(`SkyeMail will not create or sell a local-only mailbox because external replies would bounce.${suffix}`), { statusCode: 409 });
}

function shouldUseLocalRouteFallback(error) {
  const text = [
    error?.message,
    error?.providerResponse?.data?.moreInfo,
    error?.providerResponse?.status?.description,
    error?.providerResponse?.raw
  ].filter(Boolean).join(" ");
  return /maximum user license limit|purchase\/? upgrade license|upgrade license|license limit|no more user/i.test(text);
}

function shouldAttachExistingAddress(error) {
  const text = [
    error?.message,
    error?.providerResponse?.data?.moreInfo,
    error?.providerResponse?.status?.description,
    error?.providerResponse?.raw
  ].filter(Boolean).join(" ");
  return /email address already exists|already exists|associated in another organisation|associated in another organization|duplicate/i.test(text);
}

async function postJson(url, body, headers = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) throw Object.assign(new Error(data?.detail || data?.error || data?.message || text || `Provider request failed (${res.status}).`), { statusCode: res.status, providerResponse: data });
  return data;
}

async function provisionMailbox(env, { email, localPart, domain, user, fs27, allowLocalRoute = false }) {
  const provider = providerConfigured(env);
  if (!provider.configured) throw Object.assign(new Error("Hosted mailbox provider is not configured."), { statusCode: 501 });

  if (provider.provider === "external-webhook") {
    const data = await postJson(env.MAILBOX_PROVISION_WEBHOOK_URL, {
      platform: "SkyeMail",
      email,
      local_part: localPart,
      domain,
      user,
      fs27,
    }, { "x-skymail-provision-secret": env.MAILBOX_PROVISION_WEBHOOK_SECRET });
    return {
      provider: "external-webhook",
      provider_account_id: data?.provider_account_id || data?.id || null,
      provider_payload: data,
      mailbox_password_once: data?.mailbox_password_once || null,
      credential_note: data?.credential_note || null,
    };
  }

  if (provider.provider === "zoho") {
    try {
      if (!zohoProviderCanProvision(env)) {
        return await provisionZohoMailboxAliasRoute(env, {
          email,
          reason: "SkyeMail provider access is configured but full organization mailbox-seat provisioning is unavailable, so SkyeMail created a sovereign receiving alias route.",
        });
      }
      return await provisionZohoMailbox(env, { email, localPart, domain, user, fs27 });
    } catch (error) {
      if (shouldUseLocalRouteFallback(error)) {
        return await provisionZohoMailboxAliasRoute(env, { email, reason: `SkyeMail backed by Citadel Database and SkyeNet created a real receiving alias because production mailbox capacity is exhausted. SkyeMail detail: ${error.message || "capacity limit reached"}` });
      }
      if (shouldAttachExistingAddress(error)) {
        return await provisionZohoMailboxAliasRoute(env, { email, reason: `SkyeMail backed by Citadel Database and SkyeNet reports ${email} already exists or is associated with another organization; SkyeMail confirmed a sovereign receiving alias route instead of saving a local-only address. SkyeMail detail: ${error.message || "address already exists"}` });
      }
      if (allowLocalRoute) throw localOnlyMailboxError(`SkyeMail backed by Citadel Database and SkyeNet could not provision the mailbox seat: ${error.message || "mail lane provisioning failed"}`);
      throw error;
    }
  }

  const password = randomMailboxPassword();
  const base = cleanOrigin(env.STALWART_BASE_URL);
  const body = {
    type: "individual",
    quota: Number(env.SKYMAIL_MAILBOX_QUOTA || 0),
    name: localPart,
    description: user?.handle || email,
    secrets: [password],
    emails: [email],
    roles: ["user"],
    lists: [],
    urls: [],
    memberOf: [],
    members: [],
    enabledPermissions: [],
    disabledPermissions: [],
    externalMembers: [],
  };
  const authScheme = clean(env.STALWART_MANAGEMENT_AUTH_SCHEME || "Bearer");
  const candidates = base.endsWith("/api") ? [`${base}/principal`] : [`${base}/api/principal`, `${base}/principal`];
  let lastErr = null;
  for (const url of candidates) {
    try {
      const data = await postJson(url, body, { authorization: `${authScheme} ${env.STALWART_MANAGEMENT_API_KEY}` });
      return {
        provider: "stalwart",
        provider_account_id: data?.data != null ? String(data.data) : null,
        provider_payload: { createPrincipal: data, management_url: url },
        mailbox_password_once: password,
        credential_note: "Provider password was generated once. Store it in a secret manager if direct IMAP/JMAP login is needed.",
      };
    } catch (err) {
      lastErr = err;
      if (![404, 405].includes(Number(err.statusCode || 0))) throw err;
    }
  }
  throw lastErr || Object.assign(new Error("Stalwart principal endpoint was not found."), { statusCode: 502 });
}

async function introspectFs27(env, token) {
  const origin = cleanOrigin(env.SKYGATEFS27_ORIGIN || env.SKYGATE_ORIGIN);
  if (!origin && !env.SKYGATEFS27_WORKER?.fetch) throw Object.assign(new Error("SKYGATEFS27_ORIGIN/SKYGATE_ORIGIN or SKYGATEFS27_WORKER is missing."), { statusCode: 501 });
  const paths = [
    "/api/skygate/auth-introspect",
    "/api/owner/admin-introspect",
    "/auth-introspect",
    "/auth/introspect",
    "/.netlify/functions/auth-introspect",
  ];
  let last = null;
  let endpointMissing = true;
  for (const path of paths) {
    const targetUrl = `${origin || "https://skyegatefs27-citadeldb.service"}${path}`;
    const req = new Request(targetUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const res = env.SKYGATEFS27_WORKER?.fetch ? await env.SKYGATEFS27_WORKER.fetch(req) : await fetch(req);
    const data = await res.json().catch(() => ({ active: false }));
    last = { res, data };
    if (res.status === 404) continue;
    endpointMissing = false;
    if (!res.ok || data.active !== true) throw Object.assign(new Error(data.error || "0S/SkyeGate session is inactive."), { statusCode: res.ok ? 401 : res.status });
    return data;
  }
  if (endpointMissing) {
    const verified = await verifyFs27JwtWithJwks(origin, token);
    if (verified?.active) return verified;
    const sharedGatePayload = await verifySharedGateJwt(token, env.SKYGATEFS27_JWT_SECRET || env.FS27_JWT_SECRET || env.SKYGATE_JWT_SECRET);
    const sharedGateClaims = fs27ClaimsFromJwt(sharedGatePayload || {});
    if (sharedGateClaims?.active) return sharedGateClaims;
  }
  throw Object.assign(new Error(`FS27 introspection endpoint was not found at ${origin}.`), {
    statusCode: last?.res?.status || 404,
    providerResponse: last?.data || null,
  });
}

async function handleGateDiagnostics(request, env) {
  const token = bearer(request);
  if (!token) return json({ ok: false, error: "Authorization bearer required." }, 401);
  const origin = cleanOrigin(env.SKYGATEFS27_ORIGIN || env.SKYGATE_ORIGIN);
  const paths = ["/api/skygate/auth-introspect", "/api/owner/admin-introspect", "/auth-introspect", "/auth/introspect", "/.netlify/functions/auth-introspect"];
  const checks = [];
  for (const path of paths) {
    const targetUrl = `${origin || "https://skyegatefs27-citadeldb.service"}${path}`;
    const req = new Request(targetUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const res = await (env.SKYGATEFS27_WORKER?.fetch ? env.SKYGATEFS27_WORKER.fetch(req) : fetch(req)).catch((error) => ({ status: 0, ok: false, text: async () => error.message }));
    const text = await res.text().catch(() => "");
    checks.push({
      path,
      status: res.status,
      ok: res.ok,
      sample: text.slice(0, 180).replace(token, "[redacted-token]"),
    });
  }
  return json({ ok: true, origin, service_binding: Boolean(env.SKYGATEFS27_WORKER?.fetch), token_present: Boolean(token), checks });
}

async function mirrorFs27(env, payload = {}) {
  const origin = cleanOrigin(env.SKYGATEFS27_ORIGIN || env.SKYGATE_ORIGIN);
  const secret = clean(env.SKYGATE_EVENT_MIRROR_SECRET || env.SKYGATEFS27_EVENT_MIRROR_SECRET);
  if (!origin || !secret) return { ok: false, skipped: true };
  const res = await fetch(`${origin}/platform/events`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-skygate-mirror-secret": secret },
    body: JSON.stringify({
      source_app: env.SKYGATE_SOURCE_APP || "skymail",
      actor: payload.actor || "skymail",
      org_id: payload.org_id || null,
      ws_id: payload.ws_id || null,
      type: payload.type || "skymail.event",
      event_ts: new Date().toISOString(),
      meta: payload.meta || {},
    }),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
}

async function linkFs27AppSpine(env, claims = {}, user = {}, options = {}) {
  const origin = cleanOrigin(env.SKYGATEFS27_ORIGIN || env.SKYGATE_ORIGIN);
  const token = clean(options.token || "");
  const secret = clean(env.SKYGATE_EVENT_MIRROR_SECRET || env.SKYGATEFS27_EVENT_MIRROR_SECRET);
  if (!env.SKYGATEFS27_WORKER?.fetch && !origin) return { ok: false, skipped: true, reason: "FS27 origin/binding missing." };
  if (!token && !secret) return { ok: false, skipped: true, reason: "FS27 app-spine auth missing." };
  const card = claims.gate_card || claims.card || null;
  const payload = {
    app_id: "skymail",
    app_label: "SkyeMail",
    category: "mail",
    login_surface_slug: "skymail",
    login_surface_name: "SkyeMail",
    login_url: "/login.html",
    handoff_url: "/auth-fs27-session",
    local_user_id: user.id || null,
    local_user_kind: "skymail.user",
    local_workspace_id: user.workspace_id || user.skymail_id || user.id || null,
    local_workspace_kind: "mail-workspace",
    workspace_slug: user.workspace_id || null,
    workspace_name: user.handle ? `${user.handle} SkyeMail` : "SkyeMail workspace",
    email: user.email || claims.email || claims.username || null,
    handle: user.handle || null,
    mailbox_email: options.mailbox_email || null,
    skymail_user_id: user.id || null,
    skymail_id: user.skymail_id || null,
    fs27_user_id: claims.sub || null,
    fs27_customer_id: claims.customer_id || claims.org || null,
    fs27_gate_card_id: user.fs27_gate_card_id || claims.gate_card_id || card?.id || card?.card_id || null,
    app_role: claims.role || "user",
    tier: "free99",
    plan_name: "free99-gate-owned",
    entitlement_keys: ["skymail.mailbox", "skymail.ai.assist"],
    local_auth_kind: "skymail.local-user-table",
    local_auth_status: "fs27-linked",
    migration_action: "linked_to_fs27",
    migration_status: "preserved",
    metadata: {
      skymail_id: user.skymail_id || null,
      workspace_id: user.workspace_id || null,
      fs27_sub: claims.sub || null,
      fs27_role: claims.role || null,
      fs27_client_id: claims.client_id || null,
      fs27_gate_card_id: user.fs27_gate_card_id || claims.gate_card_id || null,
    },
  };
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  else headers["x-skygate-mirror-secret"] = secret;
  const paths = ["/app-spine/link", "/auth/app-spine/link", "/.netlify/functions/app-spine-link"];
  let last = null;
  for (const path of paths) {
    const req = new Request(`${origin || "https://skyegatefs27-citadeldb.service"}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const res = env.SKYGATEFS27_WORKER?.fetch ? await env.SKYGATEFS27_WORKER.fetch(req) : await fetch(req);
    const data = await res.json().catch(() => ({ ok: res.ok, status: res.status }));
    last = { ok: res.ok, status: res.status, data, path };
    if (res.status === 404) continue;
    return last;
  }
  return last || { ok: false, skipped: true, reason: "FS27 app-spine endpoint not found." };
}

async function backupCitadel(env, payload = {}) {
  const body = {
    source_app: "skymail",
    event_ts: new Date().toISOString(),
    ...payload,
  };

  const results = [];
  if (env.CITADEL_BACKUP_URL && env.CITADEL_BACKUP_TOKEN) {
    const res = await fetch(env.CITADEL_BACKUP_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.CITADEL_BACKUP_TOKEN}` },
      body: JSON.stringify(body),
    });
    results.push({ mode: "http", ok: res.ok, status: res.status, data: await res.json().catch(() => null) });
  }

  if (env.CITADEL_DATABASE_URL || env.CITADEL_BACKUP_DATABASE_URL) {
    try {
      await queryCitadel(env, `
        create table if not exists skymail_backup_events (
          id text primary key,
          type text not null,
          payload_json jsonb not null,
          created_at timestamptz not null default now()
        )
      `);
      const id = body.id || crypto.randomUUID();
      await queryCitadel(env, `
        insert into skymail_backup_events(id, type, payload_json)
        values($1,$2,$3::jsonb)
        on conflict (id) do update set payload_json=excluded.payload_json
      `, [id, body.type || "skymail.backup", JSON.stringify(body)]);
      results.push({ mode: "citadel-database", ok: true, id });
    } catch (error) {
      results.push({ mode: "citadel-database", ok: false, error: error.message });
    }
  }

  return results.length ? { ok: results.some((r) => r.ok), results } : { ok: false, skipped: true, reason: "Citadel Database backup env is not configured." };
}

function extractAddress(value) {
  const match = String(value || "").match(/<([^>]+)>/);
  return (match ? match[1] : String(value || "")).trim().toLowerCase();
}

function handleFromAddress(value) {
  const email = extractAddress(value);
  return (email.split("@")[0] || "").split("+")[0].trim().toLowerCase();
}

function htmlToText(html) {
  return String(html || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function eventCreatedAt(payload) {
  return toIsoOrNull(payload?.data?.created_at || payload?.created_at);
}

async function verifyResendWebhook(request, env) {
  if (!env.RESEND_WEBHOOK_SECRET) throw Object.assign(new Error("RESEND_WEBHOOK_SECRET is missing."), { statusCode: 501 });
  const body = await request.text();
  try {
    return {
      payload: new Webhook(env.RESEND_WEBHOOK_SECRET).verify(body, {
        "svix-id": request.headers.get("svix-id") || "",
        "svix-timestamp": request.headers.get("svix-timestamp") || "",
        "svix-signature": request.headers.get("svix-signature") || "",
      }),
      svixId: request.headers.get("svix-id") || null,
    };
  } catch {
    throw Object.assign(new Error("Invalid SkyeMail routing webhook signature."), { statusCode: 401 });
  }
}

async function resendGet(env, path) {
  const apiKey = resendApiKey(env);
  if (!apiKey) throw Object.assign(new Error("Mail API token is missing."), { statusCode: 501 });
  const res = await fetch(`https://api.resend.com${path}`, {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) throw Object.assign(new Error(data?.message || data?.error || text || `Mail lane GET failed (${res.status}).`), { statusCode: res.status });
  return data;
}

async function insertWebhookAudit(env, { svixId, payload }) {
  const data = payload?.data || {};
  const params = [
    svixId || null,
    String(payload?.type || "unknown"),
    data.email_id || data.id || null,
    JSON.stringify(payload || {}),
    eventCreatedAt(payload),
  ];
  const rows = await query(env, `
    insert into resend_webhook_events (svix_id, event_type, resend_email_id, payload_json, event_created_at)
    values ($1,$2,$3,$4::jsonb,$5)
    on conflict (svix_id) do nothing
    returning id
  `, params);
  if (svixId && !rows.length) return { duplicate: true, id: null };
  return { duplicate: false, id: rows[0]?.id || null };
}

async function updateWebhookAudit(env, id, patch = {}) {
  if (!id) return;
  await query(env, `
    update resend_webhook_events
       set processing_status=$2,
           error=$3,
           related_user_id=coalesce($4, related_user_id),
           related_message_id=coalesce($5, related_message_id),
           processed_at=now()
     where id=$1
  `, [
    id,
    patch.processing_status || "processed",
    patch.error || null,
    patch.related_user_id || null,
    patch.related_message_id || null,
  ]);
}

function recipientList(data) {
  const raw = Array.isArray(data?.to) ? data.to : (data?.to ? [data.to] : []);
  return raw.map((item) => extractAddress(item) || String(item || "").trim()).filter(Boolean);
}

const DELIVERY_STATUS = {
  "email.scheduled": "scheduled",
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.suppressed": "suppressed",
  "email.received": "received",
};

async function recordDeliveryEvent(env, { payload, svixId }) {
  const data = payload?.data || {};
  const eventType = String(payload?.type || "");
  const providerMessageId = String(data.email_id || data.id || "").trim();
  if (!providerMessageId) return { ignored: true, reason: "missing_provider_message_id" };
  const messageRows = await query(env, `
    select id, user_id
      from messages
     where delivery_provider='resend' and provider_message_id=$1
     order by created_at desc
     limit 1
  `, [providerMessageId]);
  const message = messageRows[0] || null;
  const deliveryStatus = DELIVERY_STATUS[eventType] || eventType.replace(/^email\./, "") || "event";
  const eventAt = eventCreatedAt(payload);
  const created = [];
  for (const recipient of (recipientList(data).length ? recipientList(data) : [null])) {
    const rows = await query(env, `
      insert into message_delivery_events (
        user_id, message_id, provider, provider_message_id, event_type, delivery_status,
        recipient_email, from_email, subject, svix_id, payload_json, event_created_at
      )
      values ($1,$2,'resend',$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
      on conflict (svix_id) do nothing
      returning id
    `, [
      message?.user_id || null,
      message?.id || null,
      providerMessageId,
      eventType,
      deliveryStatus,
      recipient,
      data.from ? extractAddress(data.from) || String(data.from) : null,
      data.subject || null,
      svixId || null,
      JSON.stringify(payload || {}),
      eventAt,
    ]);
    if (rows[0]?.id) created.push(rows[0].id);
  }
  if (message) {
    await query(env, `
      update messages
         set delivery_status=$2,
             last_delivery_event_at=coalesce($3, now())
       where id=$1
    `, [message.id, deliveryStatus, eventAt]);
  }
  return { provider_message_id: providerMessageId, message_id: message?.id || null, user_id: message?.user_id || null, delivery_status: deliveryStatus, event_ids: created };
}

async function importReceivedEmail(env, payload) {
  const emailId = payload?.data?.email_id;
  if (!emailId) return { ignored: true, reason: "missing_email_id" };
  const received = await resendGet(env, `/emails/receiving/${encodeURIComponent(emailId)}`);
  const providerMessageId = received.id || emailId;
  const recipients = Array.isArray(received.to) ? received.to : [];
  const recipientAddresses = Array.from(new Set(recipients.map(extractAddress).filter(Boolean)));
  if (!recipientAddresses.length) return { ignored: true, reason: "no_recipient_addresses" };

  const created = [];
  const seenRoutes = new Set();
  for (const recipientAddress of recipientAddresses) {
    let route = await findMailboxByAddress(env, recipientAddress);
    if (!route) {
      const handle = handleFromAddress(recipientAddress);
      const users = await query(env, `
        select u.id as user_id, u.handle, uk.version, uk.rsa_public_key_pem,
               $2::text as alias_email, 'legacy_handle' as alias_type
          from users u
          join user_keys uk on uk.user_id = u.id and uk.is_active = true
         where lower(u.handle) = $1
         limit 1
      `, [handle, recipientAddress]);
      route = users[0] || null;
    }
    if (!route) continue;
    const routeKey = `${route.user_id}:${normalizeEmail(route.alias_email || recipientAddress)}`;
    if (seenRoutes.has(routeKey)) continue;
    seenRoutes.add(routeKey);
    const bodyText = received.text || htmlToText(received.html || "");
    const enc = await hybridEncrypt(route.rsa_public_key_pem, {
      subject: received.subject || "(no subject)",
      message: bodyText || "",
      direction: "inbound",
      source: "resend",
      from: received.from || "",
      to: received.to || [],
      delivered_to: recipientAddress,
      recipient_alias: route.alias_email || recipientAddress,
      route_type: route.alias_type || "unknown",
      mailbox_email: route.mailbox_email || null,
      cc: received.cc || [],
      bcc: received.bcc || [],
      reply_to: received.reply_to || [],
      headers: received.headers || {},
      resend_email_id: providerMessageId,
      raw: received.raw || null,
    });
    const rows = await query(env, `
      insert into messages(
        user_id, from_name, from_email, key_version, encrypted_key_b64, iv_b64, ciphertext_b64,
        direction, delivery_provider, provider_message_id, delivery_status, last_delivery_event_at,
        recipient_alias, delivered_to
      )
      values($1,$2,$3,$4,$5,$6,$7,'inbound','resend',$8,'received',coalesce($9, now()),$10,$11)
      returning id
    `, [
      route.user_id,
      received.from || null,
      extractAddress(received.from || "") || null,
      route.version,
      enc.encrypted_key_b64,
      enc.iv_b64,
      enc.ciphertext_b64,
      providerMessageId,
      eventCreatedAt(payload),
      route.alias_email || recipientAddress,
      recipientAddress,
    ]);
    const messageId = rows[0].id;

    for (const attachment of (Array.isArray(received.attachments) ? received.attachments : [])) {
      try {
        const meta = await resendGet(env, `/emails/receiving/${encodeURIComponent(providerMessageId)}/attachments/${encodeURIComponent(attachment.id)}`);
        if (!meta?.download_url) continue;
        const fileRes = await fetch(meta.download_url);
        if (!fileRes.ok) continue;
        const bytes = new Uint8Array(await fileRes.arrayBuffer());
        const encAtt = await hybridEncrypt(route.rsa_public_key_pem, bytes);
        await query(env, `
          insert into attachments(message_id, filename, mime_type, size_bytes, encrypted_key_b64, iv_b64, ciphertext)
          values($1,$2,$3,$4,$5,$6,decode($7,'base64'))
        `, [messageId, meta.filename || attachment.filename || "attachment", meta.content_type || attachment.content_type || "application/octet-stream", Number(meta.size || bytes.length || 0), encAtt.encrypted_key_b64, encAtt.iv_b64, encAtt.ciphertext_b64]);
      } catch {
        // Keep the inbox message even if one attachment cannot be fetched or encrypted.
      }
    }
    created.push({ handle: route.handle, user_id: route.user_id, message_id: messageId, recipient_alias: route.alias_email || recipientAddress, delivered_to: recipientAddress });
  }
  return created.length ? { created, provider_message_id: providerMessageId } : { ignored: true, reason: "no_matching_users" };
}

async function handleInboundResend(request, env, ctx) {
  let audit = null;
  try {
    const { payload, svixId } = await verifyResendWebhook(request, env);
    audit = await insertWebhookAudit(env, { svixId, payload });
    if (audit.duplicate) return json({ ok: true, duplicate: true });

    const type = String(payload?.type || "");
    if (type === "email.received") {
      const inbound = await importReceivedEmail(env, payload);
      const delivery = await recordDeliveryEvent(env, { payload, svixId });
      await updateWebhookAudit(env, audit.id, {
        processing_status: inbound.ignored ? "ignored" : "processed",
        related_user_id: inbound.created?.[0]?.user_id || delivery.user_id || null,
        related_message_id: inbound.created?.[0]?.message_id || delivery.message_id || null,
      });
      ctx.waitUntil(backupCitadel(env, { id: `inbound_${delivery.provider_message_id || crypto.randomUUID()}`, type: "skymail.mail.received", meta: { inbound, delivery } }));
      return json({ ok: true, inbound, delivery });
    }

    if (type.startsWith("email.")) {
      const delivery = await recordDeliveryEvent(env, { payload, svixId });
      await updateWebhookAudit(env, audit.id, {
        processing_status: delivery.ignored ? "ignored" : "processed",
        related_user_id: delivery.user_id || null,
        related_message_id: delivery.message_id || null,
      });
      return json({ ok: true, monitored: true, delivery });
    }

    await updateWebhookAudit(env, audit.id, { processing_status: "ignored" });
    return json({ ok: true, ignored: true, type });
  } catch (error) {
    await updateWebhookAudit(env, audit?.id, { processing_status: "failed", error: error.message || "Server error" });
    throw error;
  }
}

async function ensureUserFromFs27(env, claims, options = {}) {
  const scope = String(claims.scope || claims.scopes || "").toLowerCase();
  const username = normalizeEmail(claims.username);
  const clientId = String(claims.client_id || "").toLowerCase();
  const role = String(claims.role || claims.gate_card?.role || (scope.includes("admin.") || clientId.includes("admin") || username === "fs27-admin" ? "admin" : "")).toLowerCase();
  const adminEmailFallback = ["admin", "owner", "founder"].includes(role)
    ? normalizeEmail(env.SKYMAIL_OWNER_EMAIL || env.SKYGATE_ADMIN_EMAIL || env.METRAIYUX_OWNER_EMAIL || env.NOTIFY_FROM_EMAIL || env.RESEND_FROM_EMAIL)
    : "";
  const email = normalizeEmail(claims.email || (username.includes("@") ? username : "") || adminEmailFallback);
  if (!email || !email.includes("@")) throw Object.assign(new Error("0S/SkyeGate session must include an email."), { statusCode: 400 });
  const fs27Sub = claims.sub || null;
  const fs27CustomerId = claims.customer_id || claims.org || null;
  const fs27GateCardId = makeGateCardId({
    fs27CardId: claims.gate_card_id || claims.card?.id || claims.gate_card?.id || null,
    fs27Sub,
    email,
  });
  const found = await query(env, `
    select id, handle, email, skymail_id, workspace_id, fs27_sub, fs27_customer_id, fs27_gate_card_id
      from users
     where lower(email)=lower($1)
        or ($2::text is not null and lower(fs27_sub)=lower($2))
     limit 1
  `, [email, fs27Sub]);
  if (found.length) {
    const user = found[0];
    const skymailId = user.skymail_id || makeSkyeMailId({ email, handle: user.handle, fs27Sub });
    const workspaceId = user.workspace_id || makeWorkspaceId({ email, handle: user.handle, fs27CustomerId, fs27Sub });
    const rows = await query(env, `
      update users
         set skymail_id=coalesce(skymail_id, $2),
             workspace_id=coalesce(workspace_id, $3),
             fs27_sub=coalesce(fs27_sub, $4),
             fs27_customer_id=coalesce($5, fs27_customer_id),
             fs27_gate_card_id=coalesce($6, fs27_gate_card_id),
             fs27_card_json=coalesce($7::jsonb, fs27_card_json)
       where id=$1
       returning id, handle, email, skymail_id, workspace_id, fs27_sub, fs27_customer_id, fs27_gate_card_id
    `, [user.id, skymailId, workspaceId, fs27Sub, fs27CustomerId, fs27GateCardId, JSON.stringify(claims.gate_card || claims.card || null)]);
    const linked = rows[0];
    const mirror = linkFs27AppSpine(env, claims, linked, options).catch(() => null);
    if (options.ctx?.waitUntil) options.ctx.waitUntil(mirror);
    else if (options.token) await mirror;
    return linked;
  }
  const handleBase = normalizeHandle(email).slice(0, 28) || "skyemail-user";
  let handle = handleBase;
  for (let i = 0; i < 25; i += 1) {
    handle = i ? `${handleBase.slice(0, 24)}-${i}` : handleBase;
    const used = await query(env, "select 1 from users where lower(handle)=lower($1) limit 1", [handle]);
    if (!used.length) break;
  }
  const skymailId = makeSkyeMailId({ email, handle, fs27Sub });
  const workspaceId = makeWorkspaceId({ email, handle, fs27CustomerId, fs27Sub });
  const legacySecretColumn = ["password", "hash"].join("_");
  const rows = await query(env, `
    insert into users(
      handle, email, ${legacySecretColumn}, skymail_id, workspace_id,
      fs27_sub, fs27_customer_id, fs27_gate_card_id, fs27_card_json
    )
    values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
    returning id, handle, email, skymail_id, workspace_id, fs27_sub, fs27_customer_id, fs27_gate_card_id
  `, [handle, email, `fs27:${claims.sub || crypto.randomUUID()}`, skymailId, workspaceId, fs27Sub, fs27CustomerId, fs27GateCardId, JSON.stringify(claims.gate_card || claims.card || null)]);
  const linked = rows[0];
  const mirror = linkFs27AppSpine(env, claims, linked, options).catch(() => null);
  if (options.ctx?.waitUntil) options.ctx.waitUntil(mirror);
  else if (options.token) await mirror;
  return linked;
}

async function ensureServiceUser(env, { email, handleSeed, sourceId }) {
  const cleanEmail = clean(email).toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) throw Object.assign(new Error("owner_email/email is required for SkyeMail workspace provisioning."), { statusCode: 400 });
  const found = await query(env, "select id, handle, email from users where lower(email)=lower($1) limit 1", [cleanEmail]);
  if (found.length) return found[0];
  const handleBase = clean(handleSeed || cleanEmail.split("@")[0]).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28) || "skyemail-user";
  let handle = handleBase;
  for (let i = 0; i < 25; i += 1) {
    handle = i ? `${handleBase.slice(0, 24)}-${i}` : handleBase;
    const used = await query(env, "select 1 from users where lower(handle)=lower($1) limit 1", [handle]);
    if (!used.length) break;
  }
  const legacySecretColumn = ["password", "hash"].join("_");
  const rows = await query(env, `
    insert into users(handle, email, ${legacySecretColumn})
    values($1,$2,$3)
    returning id, handle, email
  `, [handle, cleanEmail, `service:${sourceId || crypto.randomUUID()}`]);
  return rows[0];
}

async function activeKeyState(env, userId) {
  const rows = await query(env, "select version from user_keys where user_id=$1 and is_active=true limit 1", [userId]);
  return rows[0] ? { active: true, version: rows[0].version } : { active: false, version: null };
}

async function handleVaultKeySetup(request, env, ctx) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const rsaPublicKeyPem = clean(body.rsa_public_key_pem || body.public_key_pem || body.publicKeyPem);
  const vaultWrapJson = body.vault_wrap_json || body.vaultWrapJson || null;
  if (!rsaPublicKeyPem.includes("BEGIN PUBLIC KEY")) {
    throw Object.assign(new Error("rsa_public_key_pem required (PEM)."), { statusCode: 400 });
  }
  if (!vaultWrapJson) throw Object.assign(new Error("vault_wrap_json required."), { statusCode: 400 });
  const users = await query(env, "select id, handle, email, skymail_id, workspace_id, fs27_customer_id, fs27_gate_card_id from users where id=$1 limit 1", [auth.sub]);
  if (!users.length) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  const user = users[0];
  const latest = await query(env, "select coalesce(max(version), 0) as version from user_keys where user_id=$1", [user.id]);
  const version = Number(latest[0]?.version || 0) + 1;
  await query(env, "update user_keys set is_active=false where user_id=$1", [user.id]);
  await query(env, `
    insert into user_keys(user_id, version, is_active, rsa_public_key_pem, vault_wrap_json)
    values($1, $2, true, $3, $4)
  `, [
    user.id,
    version,
    rsaPublicKeyPem,
    typeof vaultWrapJson === "string" ? vaultWrapJson : JSON.stringify(vaultWrapJson),
  ]);
  const event = {
    type: "skymail.vault_key.setup",
    actor: user.email,
    org_id: auth.fs27_customer_id || user.fs27_customer_id || null,
    ws_id: user.workspace_id || null,
    meta: {
      skymail_id: user.skymail_id || null,
      workspace_id: user.workspace_id || null,
      version,
      auth_provider: auth.auth_provider || null,
    },
  };
  ctx?.waitUntil?.(mirrorFs27(env, event));
  ctx?.waitUntil?.(backupCitadel(env, { ...event, id: `vault_key_${user.id}_${version}` }));
  return json({ ok: true, active: true, version, active_version: version, user: publicUser(user) });
}

function publicSkymailUrl(env) {
  return clean(env.SKYMAIL_PUBLIC_URL || env.PUBLIC_APP_URL || "https://skyemail-platform.graylondonskyes.workers.dev").replace(/\/+$/, "");
}

function zeroOsGateOrigin(env) {
  return clean(env.ZERO_OS_GATE_ORIGIN || env.METRAIYUX_0S_ORIGIN || env.METRAIYUX_ZERO_OS_ORIGIN || "https://metraiyux-0s-full-system.graylondonskyes.workers.dev").replace(/\/+$/, "");
}

function zeroOsSkyEmailHandoffLogin(env, next = "dashboard.html") {
  const login = new URL("/admin/login.html", zeroOsGateOrigin(env));
  login.searchParams.set("return", `/live/SkyeMail/session-handoff.html?next=${encodeURIComponent(next)}&from=skymail-auth-login`);
  return login.toString();
}

function buildVaultSetupUrl(env, { workspaceId, mailboxEmail }) {
  const url = new URL(`${publicSkymailUrl(env)}/login`);
  if (workspaceId) url.searchParams.set("workspace_id", workspaceId);
  if (mailboxEmail) url.searchParams.set("mailbox", mailboxEmail);
  url.searchParams.set("next", "vault-setup");
  return url.toString();
}

function buildWorkspaceKeyCard(env, { user, mailbox, body, keyState }) {
  const workspaceId = clean(body.workspace_id || body.workspaceId);
  const recipientEmail = clean(body.owner_email || body.email || body.approval_email || user.email);
  const displayName = clean(body.owner_name || body.full_name || body.company_name || user.handle || user.email);
  return {
    type: "skymail_vault_key_card",
    title: "SkyeMail backed by Citadel Database and SkyeNet Key Card",
    workspace_id: workspaceId || null,
    customer_id: clean(body.customer_id) || null,
    company_name: clean(body.company_name) || null,
    workspace_slug: clean(body.workspace_slug || body.slug) || null,
    plan_id: clean(body.plan_id) || null,
    skymail_user_id: user.id,
    handle: user.handle,
    recipient_email: recipientEmail,
    display_name: displayName,
    mailbox_id: mailbox.id,
    mailbox_email: mailbox.mailbox_email,
    setup_url: buildVaultSetupUrl(env, { workspaceId, mailboxEmail: mailbox.mailbox_email }),
    recovery_policy: "client_managed_optional_admin_recovery",
    key_state: {
      active: Boolean(keyState.active),
      version: keyState.version || null,
      setup_required: !keyState.active,
    },
    security_model: [
      "The client creates the sovereign key pair in their browser.",
      "SkyeMail stores the public key for inbound encryption.",
      "The private key is stored only after being wrapped by the client's SkyeMail key passphrase.",
      "Admin recovery is optional and must be disclosed if enabled.",
    ],
    artifact_hint: {
      style: "resume_style_workspace_security_card",
      audience: "client_owner",
      contains_private_key: false,
      contains_passphrase: false,
    },
    created_at: new Date().toISOString(),
  };
}

async function dispatchKeyCard(env, card) {
  const url = clean(env.SKYMAIL_MDP_KEYCARD_WEBHOOK_URL || env.MDP_KEYCARD_WEBHOOK_URL || env.MCP_KEYCARD_WEBHOOK_URL);
  if (!url) return { status: "not_configured", response: null };
  const secret = clean(env.SKYMAIL_MDP_KEYCARD_WEBHOOK_SECRET || env.MDP_KEYCARD_WEBHOOK_SECRET || env.MCP_KEYCARD_WEBHOOK_SECRET);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(secret ? { authorization: `Bearer ${secret}`, "x-skymail-keycard-secret": secret } : {}),
      },
      body: JSON.stringify({ type: "skymail.workspace.key_card.issue", card }),
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text.slice(0, 1000) }; }
    return { status: res.ok ? "sent" : "failed", http_status: res.status, response: data };
  } catch (error) {
    return { status: "failed", error: error.message || "Key-card dispatch failed." };
  }
}

async function issueWorkspaceKeyCard(env, { user, mailbox, body, keyState }) {
  const card = buildWorkspaceKeyCard(env, { user, mailbox, body, keyState });
  const mdp = await dispatchKeyCard(env, card);
  const rows = await query(env, `
    insert into workspace_key_cards(
      user_id, mailbox_id, workspace_id, customer_id, card_type, recipient_email,
      display_name, mailbox_email, setup_url, recovery_policy, status,
      mdp_status, mdp_response_json, payload_json, updated_at
    )
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'issued',$11,$12::jsonb,$13::jsonb,now())
    returning *
  `, [
    user.id,
    mailbox.id,
    card.workspace_id,
    card.customer_id,
    card.type,
    card.recipient_email,
    card.display_name,
    card.mailbox_email,
    card.setup_url,
    card.recovery_policy,
    mdp.status,
    JSON.stringify(mdp),
    JSON.stringify(card),
  ]);
  return { ...card, id: rows[0]?.id || null, mdp_status: mdp.status, mdp_response: mdp };
}

async function handleAuthFs27(request, env, ctx) {
  const gateToken = bearer(request);
  const body = await request.json().catch(() => ({}));
  const claims = await introspectFs27(env, gateToken);
  const user = await ensureUserFromFs27(env, claims, { token: gateToken, ctx });
  const auth = {
    sub: user.id,
    email: user.email,
    handle: user.handle,
    fs27_role: claims.role || null,
    fs27_claims: claims,
  };
  const requestedMailboxEmail = normalizeEmail(
    body.mailbox_email
    || body.selected_mailbox
    || body.mailbox
    || body.claim?.mailbox?.requested_email
    || body.claim?.mailbox_email
    || request.headers.get("x-skymail-mailbox-email")
    || ""
  );
  let selectedMailbox = null;
  if (requestedMailboxEmail) {
    selectedMailbox = await getHostedMailboxByEmail(env, requestedMailboxEmail);
    if (!selectedMailbox) {
      throw Object.assign(new Error(`SkyeMail inbox ${requestedMailboxEmail} is not provisioned or is not active.`), { statusCode: 404 });
    }
    if (!authCanSelectMailbox(env, auth, selectedMailbox)) {
      throw Object.assign(new Error("Selected SkyeMail inbox is not available for this 0S Gate session."), { statusCode: 403 });
    }
  }
  const accessibleMailboxes = await listAccessibleMailboxes(env, auth).catch(() => []);
  const selectedEmail = normalizeEmail(selectedMailbox?.mailbox_email || "");
  const event = { type: "skymail.auth.fs27_session", actor: user.email, org_id: claims.customer_id || claims.org || null, ws_id: selectedMailbox?.id || user.id, meta: { skymail_user_id: user.id, skymail_id: user.skymail_id || null, workspace_id: user.workspace_id || null, fs27_sub: claims.sub || null, fs27_gate_card_id: user.fs27_gate_card_id || claims.gate_card_id || null, selected_mailbox: selectedEmail || null } };
  ctx.waitUntil(mirrorFs27(env, event));
  ctx.waitUntil(backupCitadel(env, { ...event, id: `auth_${user.id}_${Date.now()}` }));
  return json({
    ok: true,
    token: gateToken,
    handle: user.handle,
    email: user.email,
    skymail_id: user.skymail_id || null,
    workspace_id: user.workspace_id || null,
    selected_mailbox: selectedEmail || null,
    mailboxes: accessibleMailboxes.map((item) => ({ ...item, selected: selectedEmail ? normalizeEmail(item.mailbox_email) === selectedEmail : false })),
    auth_provider: "skygatefs27",
    fs27: {
      active: true,
      sub: claims.sub || null,
      role: claims.role || null,
      customer_id: claims.customer_id || claims.org || null,
      gate_card_id: user.fs27_gate_card_id || claims.gate_card_id || null,
    },
  });
}

function publicUser(user = {}) {
  return {
    handle: user.handle || null,
    email: user.email || null,
    skymail_id: user.skymail_id || null,
    workspace_id: user.workspace_id || null,
  };
}

async function handleAdminPublicKey(_request, env) {
  const pem = clean(env.ADMIN_RECOVERY_PUBLIC_KEY_PEM);
  return json({ enabled: Boolean(pem), public_key_pem: pem || null });
}

async function handleAuthSignup(request, env, ctx) {
  void request;
  void ctx;
  return json({
    ok: false,
    error: "app_local_auth_disabled_by_shared_gate",
    message: "SkyeMail signup is owned by the canonical 0S Gate. Create or unlock the SkyeGate FS27 session, then call /auth-fs27-session to bind SkyeMail.",
    gate_required: true,
    gate_signup: `${zeroOsGateOrigin(env)}/gate/signup/?return=${encodeURIComponent("/live/SkyeMail/session-handoff.html?next=onboarding.html&from=skymail-auth-signup")}`,
    session_endpoint: "/auth-fs27-session"
  }, 410);
}

async function handleAuthLogin(request, env) {
  void request;
  return json({
    ok: false,
    error: "app_local_auth_disabled_by_shared_gate",
    message: "SkyeMail login is owned by the canonical 0S Gate. Use an active SkyeGate FS27 bearer with /auth-fs27-session.",
    gate_required: true,
    gate_login: zeroOsSkyEmailHandoffLogin(env, "dashboard.html"),
    session_endpoint: "/auth-fs27-session"
  }, 410);
}

async function handleAuthMe(request, env) {
  const auth = await requireAuth(request, env);
  const cacheKey = `auth-me:${auth.sub}`;
  const cached = cacheGet(cacheKey);
  if (cached) return json({ ...cached, cached: true, cache_ttl_seconds: 30 });
  const users = await query(env, "select handle, email, recovery_enabled from users where id=$1 limit 1", [auth.sub]);
  if (!users.length) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  const keys = await query(env, `
    select version, is_active, rsa_public_key_pem, vault_wrap_json, created_at
      from user_keys
     where user_id=$1
     order by version asc
  `, [auth.sub]);
  const active = keys.find((item) => item.is_active) || null;
  const body = {
    ok: true,
    handle: users[0].handle,
    email: users[0].email,
    recovery_enabled: Boolean(users[0].recovery_enabled),
    keys,
    active_version: active ? active.version : null,
  };
  cacheSet(cacheKey, body, 30000);
  return json(body);
}

async function handleVaultExport(request, env) {
  const auth = await requireAuth(request, env);
  const users = await query(env, "select handle, email, recovery_enabled, created_at from users where id=$1 limit 1", [auth.sub]);
  if (!users.length) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  const keys = await query(env, `
    select version, is_active, rsa_public_key_pem, vault_wrap_json, created_at
      from user_keys
     where user_id=$1
     order by version asc
  `, [auth.sub]);
  const active = keys.find((item) => item.is_active) || null;
  return json({
    schema: "SMV_VAULT_PACK_V1",
    exported_at: new Date().toISOString(),
    user: {
      handle: users[0].handle,
      email: users[0].email,
      created_at: users[0].created_at,
      recovery_enabled: Boolean(users[0].recovery_enabled),
    },
    keys: keys.map((item) => ({
      version: item.version,
      is_active: Boolean(item.is_active),
      rsa_public_key_pem: item.rsa_public_key_pem,
      vault_wrap_json: item.vault_wrap_json,
      created_at: item.created_at,
    })),
    active_version: active ? active.version : null,
  });
}

async function handleVaultRestoreKeys(request, env) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  if (body?.schema !== "SMV_VAULT_PACK_V1") throw Object.assign(new Error("Invalid vault pack schema."), { statusCode: 400 });
  if (!Array.isArray(body.keys) || !body.keys.length) throw Object.assign(new Error("Vault pack keys required."), { statusCode: 400 });
  const nextKeys = [];
  for (const key of body.keys) {
    const version = Number(key.version);
    if (!Number.isFinite(version) || version < 1) throw Object.assign(new Error("Invalid key version in pack."), { statusCode: 400 });
    const rsaPublicKeyPem = clean(key.rsa_public_key_pem);
    if (!rsaPublicKeyPem.includes("BEGIN PUBLIC KEY")) throw Object.assign(new Error("Invalid rsa_public_key_pem in pack."), { statusCode: 400 });
    const vaultWrapJson = key.vault_wrap_json;
    if (!vaultWrapJson) throw Object.assign(new Error("Invalid vault_wrap_json in pack."), { statusCode: 400 });
    nextKeys.push({
      version,
      is_active: Boolean(key.is_active),
      rsa_public_key_pem: rsaPublicKeyPem,
      vault_wrap_json: typeof vaultWrapJson === "string" ? vaultWrapJson : JSON.stringify(vaultWrapJson),
    });
  }
  await query(env, "delete from user_keys where user_id=$1", [auth.sub]);
  for (const key of nextKeys) {
    await query(env, `
      insert into user_keys(user_id, version, is_active, rsa_public_key_pem, vault_wrap_json)
      values($1,$2,$3,$4,$5)
    `, [auth.sub, key.version, key.is_active, key.rsa_public_key_pem, key.vault_wrap_json]);
  }
  const activeVersion = Number(body.active_version || 0);
  if (activeVersion > 0) {
    await query(env, "update user_keys set is_active=(version=$2) where user_id=$1", [auth.sub, activeVersion]);
  } else {
    const latest = await query(env, "select coalesce(max(version),1) as version from user_keys where user_id=$1", [auth.sub]);
    await query(env, "update user_keys set is_active=(version=$2) where user_id=$1", [auth.sub, Number(latest[0]?.version || 1)]);
  }
  return json({ ok: true });
}

async function handleKeysRotate(request, env, ctx) {
  return await handleVaultKeySetup(request, env, ctx);
}

async function handlePublicKey(request, env) {
  const handle = clean(new URL(request.url).searchParams.get("handle"));
  if (!handle) throw Object.assign(new Error("handle required"), { statusCode: 400 });
  const users = await query(env, "select id from users where lower(handle)=lower($1) limit 1", [handle]);
  if (!users.length) throw Object.assign(new Error("Recipient not found."), { statusCode: 404 });
  const keys = await query(env, "select version, rsa_public_key_pem from user_keys where user_id=$1 and is_active=true limit 1", [users[0].id]);
  if (!keys.length) throw Object.assign(new Error("Recipient key missing."), { statusCode: 500 });
  return json({ ok: true, version: keys[0].version, rsa_public_key_pem: keys[0].rsa_public_key_pem });
}

async function handleSubmitMessage(request, env, ctx) {
  const body = await request.json().catch(() => ({}));
  if (clean(body.website)) return json({ ok: true });
  const handle = clean(body.handle);
  const fromName = clean(body.from_name);
  const fromEmail = normalizeEmail(body.from_email);
  const keyVersion = Number(body.key_version || 0);
  if (!handle) throw Object.assign(new Error("handle required"), { statusCode: 400 });
  if (!fromEmail || !fromEmail.includes("@")) throw Object.assign(new Error("Valid sender email required."), { statusCode: 400 });
  if (!clean(body.encrypted_key_b64) || !clean(body.iv_b64) || !clean(body.ciphertext_b64)) throw Object.assign(new Error("Encrypted payload required."), { statusCode: 400 });
  if (!Number.isFinite(keyVersion) || keyVersion < 1) throw Object.assign(new Error("key_version required."), { statusCode: 400 });
  const users = await query(env, "select id, email, handle from users where lower(handle)=lower($1) limit 1", [handle]);
  if (!users.length) throw Object.assign(new Error("Recipient not found."), { statusCode: 404 });
  const user = users[0];
  const keyCheck = await query(env, "select 1 from user_keys where user_id=$1 and version=$2 limit 1", [user.id, keyVersion]);
  if (!keyCheck.length) throw Object.assign(new Error("Recipient key rotated. Refresh the send page and try again."), { statusCode: 409 });
  const existing = await query(env, `
    select id, token
      from threads
     where user_id=$1 and lower(from_email)=lower($2)
     order by last_activity_at desc
     limit 1
  `, [user.id, fromEmail]);
  let threadId = existing[0]?.id || null;
  let threadToken = existing[0]?.token || null;
  if (threadId) {
    await query(env, "update threads set last_activity_at=now() where id=$1", [threadId]);
  } else {
    threadToken = randomToken(24);
    const created = await query(env, "insert into threads(user_id, token, from_name, from_email) values($1,$2,$3,$4) returning id", [user.id, threadToken, fromName || null, fromEmail]);
    threadId = created[0]?.id || null;
  }
  const messages = await query(env, `
    insert into messages(user_id, thread_id, from_name, from_email, key_version, encrypted_key_b64, iv_b64, ciphertext_b64)
    values($1,$2,$3,$4,$5,$6,$7,$8)
    returning id, created_at
  `, [
    user.id,
    threadId,
    fromName || null,
    fromEmail,
    keyVersion,
    clean(body.encrypted_key_b64),
    clean(body.iv_b64),
    clean(body.ciphertext_b64),
  ]);
  const messageId = messages[0]?.id || null;
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  if (attachments.length > 6) throw Object.assign(new Error("Max 6 attachments."), { statusCode: 400 });
  for (const attachment of attachments) {
    const filename = clean(attachment.filename);
    const mimeType = clean(attachment.mime_type || "application/octet-stream");
    const sizeBytes = Number(attachment.size_bytes || 0);
    if (!filename) throw Object.assign(new Error("Attachment filename required."), { statusCode: 400 });
    if (!clean(attachment.encrypted_key_b64) || !clean(attachment.iv_b64) || !clean(attachment.ciphertext_b64)) throw Object.assign(new Error("Attachment encrypted payload required."), { statusCode: 400 });
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) throw Object.assign(new Error("Attachment size_bytes invalid."), { statusCode: 400 });
    if (sizeBytes > 4_000_000) throw Object.assign(new Error("Attachment too large (max 4MB each)."), { statusCode: 400 });
    await query(env, `
      insert into attachments(message_id, filename, mime_type, size_bytes, encrypted_key_b64, iv_b64, ciphertext)
      values($1,$2,$3,$4,$5,$6,decode($7,'base64'))
    `, [
      messageId,
      filename,
      mimeType,
      sizeBytes,
      clean(attachment.encrypted_key_b64),
      clean(attachment.iv_b64),
      clean(attachment.ciphertext_b64),
    ]);
  }
  ctx?.waitUntil?.(backupCitadel(env, {
    id: `secure_message_${messageId}_${Date.now()}`,
    type: "skymail.secure_message.received",
    actor: fromEmail,
    ws_id: user.id,
    meta: { handle: user.handle, message_id: messageId, thread_id: threadId, attachment_count: attachments.length },
  }).catch(() => null));
  return json({ ok: true, id: messageId, thread_token: threadToken });
}

async function handleGoogleOauthStart(request, env) {
  await requireAuth(request, env);
  const next = clean(new URL(request.url).searchParams.get("next") || "/dashboard.html");
  return json({
    ok: false,
    provider: "skyemail",
    error: "gmail_oauth_disabled_for_skyemail_phase",
    message: "This SkyeMail deployment is using the SkyeMail production sovereign mailbox lane. Gmail OAuth is not required for inbox parity.",
    next,
  }, 410);
}

async function handleGoogleDisconnect(request, env) {
  const auth = await requireAuth(request, env);
  await query(env, "delete from google_mailboxes where user_id=$1", [auth.sub]).catch(() => null);
  return json({ ok: true, disconnected: true, provider: "skyemail" });
}

async function handleGmailWatch(request, env) {
  await requireAuth(request, env);
  return json({
    ok: true,
    configured: false,
    provider: "skyemail",
    mailbox: null,
    watch: null,
    message: "Gmail watch is not used on the SkyeMail production lane.",
  });
}

function publicMailboxProviderState(provider, provisioningReady) {
  return {
    provider: "skyemail",
    configured: Boolean(provider.configured),
    mail_api_ready: Boolean(provider.configured),
    provisioning_ready: Boolean(provisioningReady),
    route: "SkyeMail production",
    citadel_mail_ready: Boolean(provider.configured),
  };
}

async function handleMailboxDomains(request, env) {
  const provider = providerConfigured(env);
  const zohoProvisioningReady = provider.provider === "zoho" ? zohoProviderCanProvision(env) : provider.configured;
  const url = new URL(request.url);
  const wantsInternalProviderProof = url.searchParams.get("internal") === "1" || request.headers.get("x-skymail-internal-provider-proof") === "1";
  const body = {
    ok: true,
    domains: configuredDomains(env),
    primary_domain: configuredDomains(env)[0] || null,
    api_configured: provider.configured,
    provisioning_configured: zohoProvisioningReady,
    provider: "skyemail",
    provider_configured: publicMailboxProviderState(provider, zohoProvisioningReady),
    fs27_configured: Boolean(env.SKYGATEFS27_ORIGIN || env.SKYGATE_ORIGIN),
    citadel_backup_configured: Boolean(env.CITADEL_BACKUP_URL || env.CITADEL_DATABASE_URL || env.CITADEL_BACKUP_DATABASE_URL),
  };
  if (wantsInternalProviderProof) {
    const service = await serviceAuth(request, env).catch(() => null);
    if (service?.ok) {
      body.internal_provider = provider.provider;
      body.internal_provider_configured = provider;
      body.internal_provider_proof_auth = service.source || "service";
    }
  }
  return json(body);
}

async function handleZohoProviderSmoke(request, env) {
  await serviceAuth(request, env);
  const provider = providerConfigured(env);
  const report = {
    ok: false,
    at: new Date().toISOString(),
    source: "sovereign-worker",
    provider: provider.provider,
    bases: {
      accounts: zohoAccountsBase(env),
      mail: zohoMailBase(env),
    },
    env: {
      client_id_present: Boolean(envValue(env, "ZOHO_CLIENT_ID")),
      client_secret_present: Boolean(envValue(env, "ZOHO_CLIENT_SECRET")),
      refresh_token_present: Boolean(envValue(env, "ZOHO_REFRESH_TOKEN")),
      org_id_present: Boolean(envValue(env, "ZOHO_ORG_ID")),
      account_id_present: Boolean(envValue(env, "ZOHO_ACCOUNT_ID")),
      default_from_present: Boolean(envValue(env, "ZOHO_DEFAULT_FROM")),
      api_configured: provider.configured,
      provisioning_configured: provider.provider === "zoho" ? zohoProviderCanProvision(env) : provider.configured,
    },
    token: { ok: false },
    accounts: { ok: false },
    signature: { ok: false },
    organization: { skipped: true, reason: "SkyeMail provider organization id is not configured." },
    result: {
      token_exchange_ready: false,
      mail_account_ready: false,
      default_from_discovered: false,
      organization_probe_ready: false,
      provisioning_ready: false,
    },
  };

  try {
    const tokenData = await getZohoTokenData(env);
    report.token = {
      ok: true,
      api_domain: tokenData.api_domain || null,
      expires_in: tokenData.expires_in || null,
      token_type_present: Boolean(tokenData.token_type),
    };
    report.result.token_exchange_ready = true;

    const accessToken = tokenData.access_token;
    report.accounts = await zohoDiagnosticFetch(env, accessToken, "/api/accounts");
    report.signature = await zohoDiagnosticFetch(env, accessToken, "/api/accounts/signature");

    const orgId = envValue(env, "ZOHO_ORG_ID");
    if (orgId) {
      report.organization = await zohoDiagnosticFetch(env, accessToken, `/api/organization/${encodeURIComponent(orgId)}`);
    }

    report.result.mail_account_ready = Boolean(report.accounts.ok && report.accounts.summary.account_id_detected);
    report.result.default_from_discovered = Boolean(report.accounts.summary.default_from_detected || report.signature.summary.default_from_detected || envValue(env, "ZOHO_DEFAULT_FROM"));
    report.result.organization_probe_ready = Boolean(report.organization.ok && report.organization.summary?.organization_id_detected);
    report.result.provisioning_ready = Boolean(report.result.token_exchange_ready && report.result.organization_probe_ready);
    report.ok = report.result.token_exchange_ready;
  } catch (error) {
    report.error = {
      statusCode: error.statusCode || 500,
      message: error.message || "SkyeMail production mail lane smoke failed.",
      provider_summary: zohoResponseSummary(error.providerResponse || {}),
    };
  }

  return json(report, report.ok ? 200 : (report.error?.statusCode || 502));
}

async function getHostedMailbox(env, userId, options = {}) {
  const includeInactive = Boolean(options.includeInactive || options.includeReleased);
  const cacheKey = includeInactive ? "" : `hosted-mailbox:user:${userId}`;
  if (cacheKey) {
    const cached = cacheGet(cacheKey);
    if (cached !== null) return cached;
  }
  const rows = await query(env, `
    select id, user_id, mailbox_email, local_part, domain, workspace_id, skymail_id, fs27_gate_card_id,
           provider, provider_account_id,
           status, provisioning_status, imap_host, smtp_host, jmap_url,
           created_at, updated_at, provisioned_at, last_error
      from hosted_mailboxes
     where user_id=$1
       ${includeInactive ? "" : "and coalesce(status,'') not in ('released','offboarded','disabled')"}
     order by (status='active') desc, created_at desc
     limit 1
  `, [userId]);
  const mailbox = rows[0] || null;
  return cacheKey ? cacheSet(cacheKey, mailbox, 15000) : mailbox;
}

function selectedMailboxEmailFromRequest(request, body = {}) {
  const url = new URL(request.url);
  return normalizeEmail(
    body.mailbox_email
    || body.mailboxEmail
    || body.selected_mailbox
    || body.selectedMailbox
    || body.mailbox
    || url.searchParams.get("mailbox_email")
    || url.searchParams.get("selected_mailbox")
    || url.searchParams.get("mailbox")
    || request.headers.get("x-skymail-mailbox-email")
    || request.headers.get("x-skymail-mailbox")
    || ""
  );
}

function ownerOperatorRole(auth = {}) {
  const claims = auth.fs27_claims || {};
  const raw = [
    auth.fs27_role,
    claims.role,
    claims.auth_role,
    claims.gate_card?.role,
    claims.card?.role,
    claims.sub_type === "admin" ? "admin" : "",
  ].map((item) => String(item || "").toLowerCase()).filter(Boolean);
  const scope = String(claims.scope || claims.scopes || "").toLowerCase();
  const clientId = String(claims.client_id || "").toLowerCase();
  if (scope.includes("admin.") || scope.includes("owner.") || clientId.includes("admin")) raw.push("admin");
  return raw.find((role) => ["admin", "owner", "founder", "operator", "deployer"].includes(role)) || "";
}

function skymailOwnerEmails(env) {
  return [
    env.SKYMAIL_OWNER_EMAIL,
    env.SKYGATE_ADMIN_EMAIL,
    env.METRAIYUX_OWNER_EMAIL,
    env.NOTIFY_FROM_EMAIL,
    env.RESEND_FROM_EMAIL,
  ].map(normalizeEmail).filter(Boolean);
}

function authIsOwnerOperator(env, auth = {}) {
  if (ownerOperatorRole(auth)) return true;
  return skymailOwnerEmails(env).includes(normalizeEmail(auth.email));
}

function authCanSelectMailbox(env, auth, mailbox = {}) {
  if (!mailbox?.user_id) return false;
  if (String(mailbox.user_id) === String(auth.sub)) return true;
  if (normalizeEmail(mailbox.owner_email) && normalizeEmail(mailbox.owner_email) === normalizeEmail(auth.email)) return true;
  return authIsOwnerOperator(env, auth);
}

async function getHostedMailboxByEmail(env, mailboxEmail) {
  const email = normalizeEmail(mailboxEmail);
  if (!email) return null;
  const cacheKey = `hosted-mailbox:email:${email}`;
  const cached = cacheGet(cacheKey);
  if (cached !== null) return cached;
  const rows = await query(env, `
    select hm.*, u.email as owner_email, u.handle as owner_handle, u.fs27_customer_id
      from hosted_mailboxes hm
      join users u on u.id=hm.user_id
     where lower(hm.mailbox_email)=lower($1)
       and coalesce(hm.status,'') not in ('released','offboarded','disabled')
     limit 1
  `, [email]);
  return cacheSet(cacheKey, rows[0] || null, 15000);
}

async function listAccessibleMailboxes(env, auth) {
  const ownerMode = authIsOwnerOperator(env, auth);
  const cacheKey = `mailboxes:${ownerMode ? "owner" : "user"}:${auth.sub}:${stableHex(normalizeEmail(auth.email), 12)}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const rows = ownerMode
    ? await query(env, `
      select hm.id, hm.user_id, hm.mailbox_email, hm.local_part, hm.domain, hm.workspace_id, hm.skymail_id,
             hm.provider, hm.status, hm.provisioning_status, hm.updated_at, u.email as owner_email, u.handle as owner_handle,
             count(m.id) filter (where m.direction <> 'sent' and coalesce(m.delivery_status,'') <> 'trashed')::int as inbox_total,
             count(m.id) filter (where m.direction = 'sent')::int as sent_total,
             count(m.id) filter (where m.direction <> 'sent' and m.read_at is null and coalesce(m.delivery_status,'') <> 'trashed')::int as inbox_unread
        from hosted_mailboxes hm
        join users u on u.id=hm.user_id
        left join messages m on m.user_id=hm.user_id
       where coalesce(hm.status,'') not in ('released','offboarded','disabled')
       group by hm.id, u.id
       order by (hm.provider='zoho') desc, hm.updated_at desc nulls last, hm.created_at desc
       limit 100
    `)
    : await query(env, `
      select hm.id, hm.user_id, hm.mailbox_email, hm.local_part, hm.domain, hm.workspace_id, hm.skymail_id,
             hm.provider, hm.status, hm.provisioning_status, hm.updated_at, u.email as owner_email, u.handle as owner_handle,
             count(m.id) filter (where m.direction <> 'sent' and coalesce(m.delivery_status,'') <> 'trashed')::int as inbox_total,
             count(m.id) filter (where m.direction = 'sent')::int as sent_total,
             count(m.id) filter (where m.direction <> 'sent' and m.read_at is null and coalesce(m.delivery_status,'') <> 'trashed')::int as inbox_unread
        from hosted_mailboxes hm
        join users u on u.id=hm.user_id
        left join messages m on m.user_id=hm.user_id
       where (hm.user_id=$1 or ($2 <> '' and lower(u.email)=lower($2)))
         and coalesce(hm.status,'') not in ('released','offboarded','disabled')
       group by hm.id, u.id
       order by (hm.status='active') desc, hm.created_at desc
       limit 25
    `, [auth.sub, normalizeEmail(auth.email)]);
  const mailboxes = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    mailbox_email: row.mailbox_email,
    local_part: row.local_part,
    domain: row.domain,
    workspace_id: row.workspace_id || "",
    skymail_id: row.skymail_id || "",
    provider: row.provider,
    status: row.status,
    provisioning_status: row.provisioning_status,
    owner_email: row.owner_email || "",
    owner_handle: row.owner_handle || "",
    inbox_total: Number(row.inbox_total || 0),
    inbox_unread: Number(row.inbox_unread || 0),
    sent_total: Number(row.sent_total || 0),
    ...mailboxInventoryState(row),
    selected: false,
  }));
  return cacheSet(cacheKey, mailboxes, 15000);
}

async function resolveMailboxContext(env, request, auth, body = {}) {
  const selectedEmail = selectedMailboxEmailFromRequest(request, body);
  let mailbox = selectedEmail ? await getHostedMailboxByEmail(env, selectedEmail) : null;
  if (selectedEmail && !mailbox) {
    throw Object.assign(new Error(`SkyeMail inbox ${selectedEmail} is not provisioned or is not active.`), { statusCode: 404 });
  }
  if (mailbox && !authCanSelectMailbox(env, auth, mailbox)) {
    throw Object.assign(new Error("Selected SkyeMail inbox is not available for this 0S Gate session."), { statusCode: 403 });
  }
  if (!mailbox) mailbox = await getHostedMailbox(env, auth.sub);
  const userId = mailbox?.user_id || auth.sub;
  return {
    auth: { ...auth, sub: userId, selected_mailbox_email: mailbox?.mailbox_email || "" },
    mailbox,
    userId,
    selected_mailbox_email: selectedEmail || mailbox?.mailbox_email || "",
  };
}

function mailBrainCapabilities() {
  return [
    { id: "triage", label: "Triage", detail: "Classify selected or recent mail into reply, monitor, archive, and handoff buckets." },
    { id: "summarize", label: "Summarize", detail: "Create a short summary with the local brain or the plan-gated FS27 Brain runtime." },
    { id: "draft_reply", label: "Draft Reply", detail: "Prepare a response draft using mailbox context and the selected brain mode." },
    { id: "rewrite", label: "Rewrite", detail: "Clean up user-provided copy for a professional email." },
    { id: "ask_brain", label: "Ask Brain", detail: "Ask a mailbox-scoped FS27/local question over recent mail context." },
    { id: "send_and_monitor", label: "Send + Monitor", detail: "Send an explicitly approved message through SkyeMail, then watch for replies." },
    { id: "handoff_plan", label: "Handoff Plan", detail: "Turn selected mail into a review, execution, and dispatch checklist." },
    { id: "monitor", label: "Monitor", detail: "Explain push watch, sync, response monitoring, and proof loops for the active mailbox." }
  ];
}

function cleanMailBrainAction(value) {
  const action = clean(value || "triage").toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
  return mailBrainCapabilities().some((item) => item.id === action) ? action : "triage";
}

function normalizeBrainMessage(item = {}) {
  return {
    id: clean(item.id || item.message_id || item.provider_message_id || ""),
    thread_id: clean(item.thread_id || item.threadId || ""),
    subject: clean(item.subject || item.headers?.subject || "(no subject)").slice(0, 240),
    from: clean(item.from || item.headers?.from || "").slice(0, 240),
    to: clean(item.to || item.headers?.to || "").slice(0, 240),
    snippet: clean(item.snippet || item.body?.text || item.text || item.message || "").slice(0, 900),
    direction: clean(item.direction || ""),
    date: clean(item.date || item.internal_date || item.created_at || ""),
    labels: Array.isArray(item.labels) ? item.labels.slice(0, 12).map(clean).filter(Boolean) : [],
  };
}

async function ensureMailBrainSchema(env) {
  const schema = schemaName(env);
  await query(env, `
    create table if not exists ${schema}.brain_events (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references ${schema}.users(id) on delete cascade,
      mailbox_id uuid references ${schema}.hosted_mailboxes(id) on delete set null,
      action text not null,
      message_ids_json jsonb not null default '[]'::jsonb,
      input_json jsonb not null default '{}'::jsonb,
      output_json jsonb not null default '{}'::jsonb,
      model_mode text not null default 'local_deterministic_v1',
      kaixu_usage_json jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);
  await query(env, `create index if not exists idx_brain_events_user_created on ${schema}.brain_events(user_id, created_at desc)`);
  await query(env, `create index if not exists idx_brain_events_mailbox_created on ${schema}.brain_events(mailbox_id, created_at desc)`);
  await query(env, `
    create table if not exists ${schema}.brain_monitors (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references ${schema}.users(id) on delete cascade,
      mailbox_id uuid references ${schema}.hosted_mailboxes(id) on delete cascade,
      monitor_key text not null,
      subject text,
      correspondent_email text,
      sent_message_id text,
      thread_id text,
      status text not null default 'watching',
      matched_message_id text,
      last_checked_at timestamptz,
      meta_json jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await query(env, `create index if not exists idx_brain_monitors_user_status on ${schema}.brain_monitors(user_id, status, created_at desc)`);
  await query(env, `create index if not exists idx_brain_monitors_mailbox_status on ${schema}.brain_monitors(mailbox_id, status, created_at desc)`);
}

async function mailBrainMessages(env, userId, requestedMessages = [], requestedIds = [], mailbox = null) {
  const provided = Array.isArray(requestedMessages) ? requestedMessages.map(normalizeBrainMessage).filter((item) => item.subject || item.snippet || item.from) : [];
  if (provided.length) return provided.slice(0, 12);
  const uuidIds = (Array.isArray(requestedIds) ? requestedIds : [])
    .map(clean)
    .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
    .slice(0, 12);
  const rows = uuidIds.length
    ? await query(env, `
      select id, thread_id, from_name, from_email, key_version, ciphertext_b64, created_at, read_at, starred_at,
             direction, delivery_provider, provider_message_id, delivery_status, recipient_alias, delivered_to
        from messages
       where user_id=$1 and id::text=any($2::text[])
       order by created_at desc
       limit 12
    `, [userId, uuidIds])
    : await query(env, `
      select id, thread_id, from_name, from_email, key_version, ciphertext_b64, created_at, read_at, starred_at,
             direction, delivery_provider, provider_message_id, delivery_status, recipient_alias, delivered_to
        from messages
       where user_id=$1
       order by created_at desc
       limit 8
    `, [userId]);
  return rows.map((row) => normalizeBrainMessage(messageSummary(row, mailbox?.mailbox_email || "")));
}

function mailBrainOutput({ action, prompt, messages, mailbox, auth }) {
  const mailboxEmail = mailbox?.mailbox_email || auth.selected_mailbox_email || auth.email || "active mailbox";
  const messageCount = messages.length;
  const subjects = messages.map((item) => item.subject || "(no subject)").filter(Boolean).slice(0, 5);
  const inbound = messages.filter((item) => item.direction !== "sent").length;
  const outbound = messages.filter((item) => item.direction === "sent").length;
  const output = {
    summary: "",
    recommendations: [],
    draft: null,
    quick_links: [
      { label: "Compose", href: "compose.html" },
      { label: "Inbox", href: "dashboard.html" },
      { label: "Monitoring", href: "monitoring.html" },
      { label: "Settings", href: "settings.html" }
    ],
    boundaries: [
      "Local brain mode is deterministic and mailbox-scoped.",
      "It does not send email, delete mail, or call a paid model by itself.",
      "Paid model routing is available only behind FS27 plan and usage metering."
    ]
  };

  if (action === "monitor") {
    output.summary = `Monitoring plan for ${mailboxEmail}: keep push watch active, run mailbox sync when expecting replies, use Monitoring for delivery/webhook health, and use Compose only after reviewing a draft. Scheduled sync can import responses, but no silent sending or silent deletion happens from the brain lane.`;
    output.recommendations = ["Check Monitoring for webhook health.", "Refresh Inbox after important sends.", "Use Proof Loop when you need send-and-receive evidence.", "Keep the shared 0S gate session active before handling owner mail."];
    return output;
  }

  if (action === "rewrite") {
    const text = prompt || messages[0]?.snippet || "";
    output.summary = "Clean rewrite prepared from your input.";
    output.draft = {
      subject: messages[0]?.subject || "Follow-up",
      body: text ? `Here is a cleaner version:\n\n${text.replace(/\s+/g, " ").trim()}` : "Add the text you want rewritten, then run Rewrite again."
    };
    output.recommendations = ["Paste this into Compose and review it before sending.", "Add names, dates, amounts, or commitments manually if they matter."];
    return output;
  }

  if (action === "draft_reply") {
    const subject = subjects[0] || "Follow-up";
    const opener = messages[0]?.from ? `Hi ${messages[0].from.split("@")[0].replace(/["<>]/g, "").trim() || "there"},` : "Hi,";
    output.summary = `Draft reply scaffold for ${messageCount || 1} message${messageCount === 1 ? "" : "s"} in ${mailboxEmail}.`;
    output.draft = {
      subject: subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`,
      body: `${opener}\n\nThanks for reaching out. I have this and I am reviewing the details now.\n\nNext step:\n- Confirm the specific request or decision needed.\n- Attach any proof, dates, links, or owner notes before sending.\n\nBest,\nSkyeMail`
    };
    output.recommendations = ["Open Compose, paste the draft, and review it before sending.", "Use thread context if the conversation has legal, billing, or contractor implications."];
    return output;
  }

  if (action === "handoff_plan") {
    output.summary = `Handoff plan for ${messageCount} selected/recent message${messageCount === 1 ? "" : "s"} in ${mailboxEmail}.`;
    output.recommendations = [
      "Review: confirm owner, risk, deadline, and customer/company lane.",
      "Execution: decide whether the next action is reply, archive, contractor packet, Founder Command task, or follow-up.",
      "Dispatch: move operational work to the right surface before sending external commitments.",
      "Proof: keep the message IDs and mailbox email attached to the handoff receipt."
    ];
    return output;
  }

  if (action === "summarize") {
    output.summary = messageCount
      ? `${mailboxEmail} summary: ${messageCount} message${messageCount === 1 ? "" : "s"} considered, ${inbound} inbound and ${outbound} sent. Subjects: ${subjects.join("; ") || "none available"}.`
      : `${mailboxEmail} has no selected local message context yet. Select messages or sync the inbox, then run Summarize again.`;
    output.recommendations = ["Use Draft Reply for response copy.", "Use Handoff Plan for operational work.", "Use Monitor when waiting for replies."];
    return output;
  }

  output.summary = messageCount
    ? `Triage for ${mailboxEmail}: ${messageCount} message${messageCount === 1 ? "" : "s"} reviewed locally. ${inbound} need inbox attention and ${outbound} are sent-side records.`
    : `Triage for ${mailboxEmail}: no selected message context yet, so the brain is showing the mailbox operating lane.`;
  output.recommendations = messageCount
    ? ["Reply to messages with clear asks or deadlines.", "Archive handled notices after proof is saved.", "Move legal, billing, logistics, or contractor items into the correct 0S lane.", "Use Monitoring if a response is expected."]
    : ["Refresh or sync Inbox.", "Select one or more messages.", "Run Triage or Summarize again.", "Use Compose for outbound work after review."];
  return output;
}

async function listMailBrainEvents(env, userId, mailboxId = null, limit = 20) {
  const rows = await query(env, `
    select id, action, message_ids_json, input_json, output_json, model_mode, kaixu_usage_json, created_at
      from brain_events
     where user_id=$1
       and ($2::uuid is null or mailbox_id=$2::uuid)
     order by created_at desc
     limit $3
  `, [userId, mailboxId, Math.max(1, Math.min(50, Number(limit || 20)))]);
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    message_ids: row.message_ids_json || [],
    input: row.input_json || {},
    output: row.output_json || {},
    model_mode: row.model_mode,
    kaixu_usage: row.kaixu_usage_json || {},
    created_at: row.created_at
  }));
}

function normalizeSubjectForMonitor(value = "") {
  return clean(value).toLowerCase().replace(/^(re|fw|fwd):\s*/i, "").replace(/\s+/g, " ").slice(0, 180);
}

function monitorKeyFor({ mailboxEmail = "", subject = "", correspondent = "" } = {}) {
  return stableHex(`${normalizeEmail(mailboxEmail)}|${normalizeSubjectForMonitor(subject)}|${normalizeEmail(correspondent)}`, 24);
}

async function createBrainMonitor(env, { userId, mailbox, subject, correspondent, sentMessageId = "", threadId = "", meta = {} }) {
  const mailboxEmail = mailbox?.mailbox_email || "";
  const key = monitorKeyFor({ mailboxEmail, subject, correspondent });
  const rows = await query(env, `
    insert into brain_monitors(user_id, mailbox_id, monitor_key, subject, correspondent_email, sent_message_id, thread_id, meta_json, created_at, updated_at)
    values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,now(),now())
    returning *
  `, [
    userId,
    mailbox?.id || null,
    key,
    clean(subject).slice(0, 260),
    normalizeEmail(correspondent),
    clean(sentMessageId),
    clean(threadId),
    JSON.stringify(meta || {})
  ]);
  return rows[0] || null;
}

async function refreshBrainMonitors(env, userId, mailbox = null) {
  const monitors = await query(env, `
    select *
      from brain_monitors
     where user_id=$1
       and ($2::uuid is null or mailbox_id=$2::uuid)
       and status in ('watching','waiting','sent')
     order by created_at desc
     limit 50
  `, [userId, mailbox?.id || null]);
  const refreshed = [];
  for (const monitor of monitors) {
    const rows = await query(env, `
      select id, thread_id, from_name, from_email, key_version, ciphertext_b64, created_at, read_at, starred_at,
             direction, delivery_provider, provider_message_id, delivery_status, recipient_alias, delivered_to
        from messages
       where user_id=$1
         and direction <> 'sent'
         and created_at >= $2::timestamptz
       order by created_at desc
       limit 80
    `, [userId, monitor.created_at]);
    const subjectNeedle = normalizeSubjectForMonitor(monitor.subject || "");
    const correspondent = normalizeEmail(monitor.correspondent_email || "");
    const matched = rows.map((row) => messageSummary(row, mailbox?.mailbox_email || ""))
      .find((message) => {
        const from = normalizeEmail(message.from || "");
        const subject = normalizeSubjectForMonitor(message.subject || "");
        const fromMatches = !correspondent || from.includes(correspondent) || correspondent.includes(from);
        const subjectMatches = !subjectNeedle || subject.includes(subjectNeedle) || subjectNeedle.includes(subject);
        return fromMatches && subjectMatches;
      });
    if (matched) {
      const updated = await query(env, `
        update brain_monitors
           set status='reply_received',
               matched_message_id=$3,
               last_checked_at=now(),
               updated_at=now()
         where id=$1 and user_id=$2
         returning *
      `, [monitor.id, userId, matched.id]);
      refreshed.push({ ...updated[0], matched_message: matched });
    } else {
      await query(env, "update brain_monitors set last_checked_at=now(), updated_at=now() where id=$1 and user_id=$2", [monitor.id, userId]).catch(() => null);
      refreshed.push(monitor);
    }
  }
  return refreshed.map((row) => ({
    id: row.id,
    monitor_key: row.monitor_key,
    subject: row.subject || "",
    correspondent_email: row.correspondent_email || "",
    sent_message_id: row.sent_message_id || "",
    thread_id: row.thread_id || "",
    status: row.status,
    matched_message_id: row.matched_message_id || "",
    matched_message: row.matched_message || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_checked_at: row.last_checked_at || null,
  }));
}

function mailBrainMode(body = {}, env = {}) {
  const value = clean(body.model_mode || body.brain_mode || body.mode || env.SKYEMAIL_BRAIN_DEFAULT_MODE || "fs27_metered_v1").toLowerCase();
  if (["local", "local_deterministic_v1", "deterministic"].includes(value)) return "local_deterministic_v1";
  if (["auto", "fs27", "fs27_metered", "fs27_metered_v1", "kaixu", "paid", "model", "kaixu_metered", "kaixu_metered_v1"].includes(value)) return value === "auto" ? "auto" : "fs27_metered_v1";
  return "fs27_metered_v1";
}

function mailBrainSystemPrompt({ action, mailboxEmail }) {
  return [
    "You are the SkyeMail mailbox brain inside the MetrAIyux 0S.",
    "You work for Skyes Over London LC / SOLEnterprises and route through the shared SkyeGate FS27 auth lane.",
    `Active mailbox: ${mailboxEmail || "unknown"}.`,
    `Requested action: ${action}.`,
    "Be useful, operational, and concise.",
    "Do not claim to be a lawyer, accountant, or final business authority.",
    "Do not say an email was sent unless the tool result explicitly says it was sent.",
    "For legal, billing, contracts, HR, safety, regulated, or high-risk mail, escalate to owner review.",
    "When drafting, produce ready-to-review email copy, but keep commitments conditional unless the user supplied exact facts.",
  ].join("\n");
}

function mailBrainContextText({ prompt = "", messages = [] }) {
  const mail = messages.map((message, idx) => [
    `Message ${idx + 1}`,
    `ID: ${message.id || ""}`,
    `From: ${message.from || ""}`,
    `To: ${message.to || ""}`,
    `Subject: ${message.subject || ""}`,
    `Date: ${message.date || ""}`,
    `Direction: ${message.direction || ""}`,
    `Snippet: ${message.snippet || ""}`,
  ].join("\n")).join("\n\n");
  return [
    prompt ? `User/operator prompt:\n${prompt}` : "",
    mail ? `Mailbox context:\n${mail}` : "No selected message context was provided. Use recent mailbox context if available.",
  ].filter(Boolean).join("\n\n");
}

function mailBrainAiMessages({ action, mailboxEmail, prompt, messages }) {
  return [
    { role: "system", content: mailBrainSystemPrompt({ action, mailboxEmail }) },
    { role: "user", content: mailBrainContextText({ prompt, messages }) },
  ];
}

function firstUsefulParagraph(text = "") {
  return clean(String(text || "").split(/\n{2,}/).map(clean).find(Boolean) || text).slice(0, 1200);
}

function outputFromAiText({ action, text, localOutput, messages }) {
  const output = {
    ...localOutput,
    summary: firstUsefulParagraph(text) || localOutput.summary,
    ai_text: text || "",
    recommendations: localOutput.recommendations?.length ? localOutput.recommendations : ["Review the FS27 Brain output, then decide whether to reply, monitor, archive, or hand off."],
    boundaries: [
      ...(localOutput.boundaries || []),
      "FS27 Brain output is saved to SkyeMail usage and brain-event ledgers.",
      "Human review remains required for legal, billing, contracts, HR, safety, or high-risk commitments."
    ]
  };
  if ((action === "draft_reply" || action === "rewrite") && text) {
    const subject = messages?.[0]?.subject || localOutput.draft?.subject || "Follow-up";
    output.draft = {
      subject: subject.toLowerCase().startsWith("re:") ? subject : `Re: ${subject}`,
      body: text.trim()
    };
  }
  return output;
}

function mailBrainTruthy(value) {
  if (value === true) return true;
  if (typeof value === "number") return value === 1;
  const text = clean(value).toLowerCase();
  return ["1", "true", "yes", "y", "on", "send", "auto", "auto_send", "autopilot", "automated"].includes(text);
}

function mailBrainSendReadyBody(text = "") {
  return clean(String(text || "")
    .replace(/^subject\s*:[^\n]*\n+/i, "")
    .replace(/^body\s*:\s*/i, "")
    .trim()).slice(0, 12000);
}

function mailBrainAutomationDecision({ entitlement = {}, body = {}, prompt = "", messages = [], sendPayload = {} } = {}) {
  const approval = clean(body.approval || body.approval_mode || body.send_mode).toLowerCase();
  const requested = mailBrainTruthy(body.automation_consent)
    || mailBrainTruthy(body.automationConsent)
    || mailBrainTruthy(body.auto_send)
    || mailBrainTruthy(body.autoSend)
    || mailBrainTruthy(body.autopilot)
    || approval === "auto_send"
    || approval === "automated";
  const haystack = [
    prompt,
    sendPayload.subject,
    sendPayload.message,
    sendPayload.text,
    sendPayload.html,
    ...messages.map((item) => `${item.subject || ""}\n${item.from || ""}\n${item.to || ""}\n${item.snippet || ""}`),
  ].join("\n").toLowerCase();
  const riskTerms = [
    ["legal", /\b(legal|lawyer|attorney|lawsuit|court|subpoena|settlement|liability)\b/],
    ["contract", /\b(contract|agreement|signature|terms|termination|breach|nda)\b/],
    ["billing", /\b(invoice|billing|refund|chargeback|payment|wire|bank|stripe|tax|irs|payroll|salary)\b/],
    ["hr", /\b(hiring|firing|termination|employee|contractor|harassment|disciplinary|background check)\b/],
    ["safety", /\b(safety|injury|medical|health|emergency|security incident|threat)\b/],
    ["credentials", /\b(password|credential|api key|secret|token|login|ssn|social security)\b/],
    ["regulated", /\b(compliance|regulated|license|permit|government|audit|insurance|claim)\b/],
  ].filter(([, pattern]) => pattern.test(haystack)).map(([label]) => label);
  const blockedReasons = [];
  if (requested && entitlement.active === false) blockedReasons.push("ai_entitlement_inactive");
  if (requested && !entitlement.provider_calls) blockedReasons.push("provider_ai_not_enabled_for_plan");
  if (requested && !entitlement.auto_send) blockedReasons.push("auto_send_not_enabled_for_plan");
  if (requested && riskTerms.length) blockedReasons.push("high_risk_requires_manual_approval");
  return {
    requested,
    allowed: requested && blockedReasons.length === 0,
    plan_id: entitlement.id || "skymail_ai_free",
    plan_name: entitlement.name || "SkyeMail AI",
    auto_send_entitled: Boolean(entitlement.auto_send),
    mode: requested && blockedReasons.length === 0 ? "paid_auto_send" : "manual_review",
    risk_terms: riskTerms,
    blocked_reasons: blockedReasons,
  };
}

async function handleMailBrain(request, env, ctx) {
  const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
  const auth = await requireAuth(request, env);
  const mailboxContext = await resolveMailboxContext(env, request, auth, body);
  const url = new URL(request.url);
  const statusCacheKey = `mail-brain:get:${mailboxContext.userId}:${mailboxContext.mailbox?.id || "none"}:${url.searchParams.get("limit") || "20"}`;
  if (request.method === "GET" && !["1", "true", "yes"].includes(String(url.searchParams.get("refresh") || "").toLowerCase())) {
    const cached = cacheGet(statusCacheKey);
    if (cached) return json({ ...cached, cached: true, cache_ttl_seconds: 15 });
  }
  await ensureMailBrainSchema(env);
  await ensureSkymailAiRuntimeSchema(env);
  const mailbox = mailboxContext.mailbox;
  const mailboxPayload = mailbox ? {
    id: mailbox.id,
    mailbox_email: mailbox.mailbox_email,
    workspace_id: mailbox.workspace_id || "",
    provider: mailbox.provider || "",
    status: mailbox.status || "",
    provisioning_status: mailbox.provisioning_status || ""
  } : null;
  const entitlement = await resolveSkymailAiEntitlement(env, mailboxContext.auth, mailbox);
  const monthRaw = await skymailAiMonth(env, mailboxContext.userId, mailbox?.id || null);
  const gatewayBearer = skymailAiGatewayBearer(request, env, mailboxContext.auth);
  const aiStatus = {
    entitlement: skymailAiPlanSnapshot(entitlement),
    month: skymailAiAllowance(entitlement, monthRaw),
    fs27_gateway_configured: Boolean(gatewayBearer.token),
    fs27_gateway_auth_source: gatewayBearer.source,
    fs27_brain: {
      source: "fs27_skygate_brain",
      gateway_path: "/gateway-chat",
      runtime_owner: "fs27_skygate",
      skyemail_runtime_catalog: false,
      direct_provider_fallback_enabled: false,
    },
    direct_provider_fallback_enabled: false,
  };

  if (request.method === "GET") {
    const limit = url.searchParams.get("limit") || 20;
    const history = await listMailBrainEvents(env, mailboxContext.userId, mailbox?.id || null, limit);
    const monitors = await refreshBrainMonitors(env, mailboxContext.userId, mailbox).catch(() => []);
    const responseBody = { ok: true, mailbox: mailboxPayload, model_mode: "fs27_metered_v1", ai: aiStatus, capabilities: mailBrainCapabilities(), history, monitors };
    cacheSet(statusCacheKey, responseBody, 15000);
    return json(responseBody);
  }

  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const action = cleanMailBrainAction(body.action);
  const prompt = clean(body.prompt || body.input || body.text || "");
  const requestedIds = Array.isArray(body.message_ids) ? body.message_ids : (body.message_id ? [body.message_id] : []);
  const messages = await mailBrainMessages(env, mailboxContext.userId, body.messages || [], requestedIds, mailbox);
  let output = mailBrainOutput({ action, prompt, messages, mailbox, auth: mailboxContext.auth });
  let modelMode = mailBrainMode(body, env);
  let brainUsage = {};
  let sendResult = null;
  let monitorResult = null;

  if (action === "send_and_monitor") {
    const providedSendBody = clean(body.message || body.body || body.text || body.html);
    const sendPayload = {
      mailbox_email: mailbox?.mailbox_email || body.mailbox_email || "",
      to: clean(body.to || body.recipient || body.email),
      cc: clean(body.cc),
      bcc: clean(body.bcc),
      subject: clean(body.subject) || messages[0]?.subject || "Follow-up",
      message: String(body.message || body.body || body.text || ""),
      text: String(body.message || body.body || body.text || ""),
      html: String(body.html || ""),
      reply_message_id: clean(body.reply_message_id || body.replyMessageId || messages[0]?.id || ""),
      reply_thread_id: clean(body.reply_thread_id || body.thread_id || body.threadId || messages[0]?.thread_id || ""),
      from_alias: clean(body.from_alias || body.from || ""),
      attachments: Array.isArray(body.attachments) ? body.attachments : [],
    };
    const approved = body.approved === true || body.confirm_send === true || clean(body.approval).toLowerCase() === "send";
    const automation = mailBrainAutomationDecision({ entitlement, body, prompt, messages, sendPayload });
    if (!providedSendBody && modelMode !== "local_deterministic_v1") {
      try {
        const ai = await runMeteredSkymailAi(request, env, ctx, {
          auth: mailboxContext.auth,
          mailbox,
          messages: mailBrainAiMessages({
            action: "draft_reply",
            mailboxEmail: mailbox?.mailbox_email || "",
            prompt: [
              "Prepare a send-ready email body for Send + Monitor.",
              "Use the selected mailbox context and operator prompt.",
              "Do not invent dates, prices, legal commitments, refunds, or guarantees.",
              prompt ? `Operator prompt: ${prompt}` : "",
            ].filter(Boolean).join("\n"),
            messages,
          }),
          action: "mail-brain:send_and_monitor:draft",
          prompt,
          requestedModel: body.model || body.brain_model || body.kaixu_model || "",
          source: clean(body.source || "skymail-brain-page"),
        });
        const drafted = mailBrainSendReadyBody(ai.output_text);
        if (drafted) {
          sendPayload.message = drafted;
          sendPayload.text = drafted;
        }
        modelMode = ai.model_mode;
        brainUsage = {
          usage_event_id: ai.usage_event_id,
          usage: ai.usage,
          month: ai.month,
          model: ai.model,
          provider: ai.provider || "fs27_skygate_brain",
          provider_path: ai.provider_path,
          automation,
        };
      } catch (error) {
        if (modelMode === "fs27_metered_v1") throw error;
        output.model_warning = error.message || "FS27 Brain draft path unavailable; manual review is required.";
        modelMode = "local_deterministic_v1";
        brainUsage = { unavailable: true, error: output.model_warning, entitlement: error.entitlement || aiStatus.entitlement, month: error.month || aiStatus.month, automation };
      }
    } else if (!sendPayload.message && prompt) {
      sendPayload.message = prompt;
      sendPayload.text = prompt;
    }
    const generatedUnreviewedDraft = !providedSendBody && Boolean(sendPayload.message) && !automation.allowed;
    const maySend = automation.allowed || (approved && !generatedUnreviewedDraft);
    if (!maySend) {
      const automationUpgrade = automation.requested && !automation.allowed
        ? ["Automation was requested but blocked by entitlement or risk policy.", `Blocked: ${automation.blocked_reasons.join(", ") || "manual_review_required"}.`]
        : generatedUnreviewedDraft
          ? ["AI drafted the reply, but manual send needs the owner to review that generated body first.", "Open Compose with the draft or submit again with the reviewed body as message/body plus approved=true."]
          : ["Submit with approved=true for a manual send, or enable Managed AI Inbox automation and request auto-send for allowlisted routine replies."];
      output = {
        summary: generatedUnreviewedDraft
          ? "Send + Monitor generated a reply draft and stopped for owner review before sending."
          : automation.requested
          ? "Send + Monitor prepared the reply, but this message still requires manual approval before customer-facing send."
          : "Send + Monitor is ready, but SkyeMail needs explicit approval before it sends an external email.",
        draft: { subject: sendPayload.subject, body: sendPayload.message || "Add the message body, then approve send." },
        recommendations: [
          "Review the recipient, subject, body, attachments, and mailbox.",
          "Submit again with approved=true or confirm_send=true to send manually through the existing SkyeMail send lane.",
          ...automationUpgrade,
          "A reply monitor will be created after the send succeeds."
        ],
        quick_links: [{ label: "Compose", href: `compose.html?to=${encodeURIComponent(sendPayload.to)}&subject=${encodeURIComponent(sendPayload.subject)}&body=${encodeURIComponent(sendPayload.message)}` }],
        automation,
        boundaries: [
          "The brain will not send without explicit approval or a paid auto-send entitlement with explicit automation consent.",
          "High-risk legal, billing, contract, HR, safety, credentials, and regulated messages require manual owner review.",
          "Outbound mail still uses the existing SkyeMail send guard."
        ]
      };
      if (!brainUsage?.usage_event_id && modelMode !== "fs27_metered_v1") modelMode = "local_deterministic_v1";
    } else {
      if (automation.allowed && !sendPayload.message && !sendPayload.html) {
        throw Object.assign(new Error("Automated Send + Monitor requires an AI-generated or supplied message body."), { statusCode: 400 });
      }
      const sendRequest = new Request(request.url, {
        method: "POST",
        headers: request.headers,
        body: JSON.stringify(sendPayload),
      });
      const sendResponse = await handleMailSend(sendRequest, env, ctx);
      sendResult = await sendResponse.json().catch(() => ({}));
      if (!sendResponse.ok) {
        throw Object.assign(new Error(sendResult.error || "Send + Monitor mail send failed."), { statusCode: sendResponse.status, providerResponse: sendResult });
      }
      monitorResult = await createBrainMonitor(env, {
        userId: mailboxContext.userId,
        mailbox,
        subject: sendPayload.subject,
        correspondent: sendPayload.to,
        sentMessageId: sendResult.message_id || "",
        threadId: sendResult.reply_thread_id || sendPayload.reply_thread_id || "",
        meta: { source: "send_and_monitor", provider: sendResult.provider || "", to: sendResult.to || [], automation_mode: automation.allowed ? "paid_auto_send" : "manual_approved", plan_id: automation.plan_id },
      });
      output = {
        summary: `${automation.allowed ? "Paid automation sent" : "Manual approval sent"} email from ${sendResult.from || mailbox?.mailbox_email || "SkyeMail"} to ${sendPayload.to}. Reply monitoring is now watching this subject.`,
        recommendations: ["Use Monitoring or this Brain page to refresh reply status.", "Run Mail Sync when expecting a provider-side reply.", "Escalate legal, billing, contractor, or safety replies for owner review."],
        sent: sendResult,
        monitor: monitorResult,
        automation: { ...automation, sent_mode: automation.allowed ? "paid_auto_send" : "manual_approved" },
        quick_links: [{ label: "Sent", href: "sent.html" }, { label: "Monitoring", href: "monitoring.html" }, { label: "Inbox", href: "dashboard.html" }],
        boundaries: ["This send used the existing SkyeMail send provider guard.", "The monitor records and checks replies; it does not delete messages.", "Automation remains plan-capped and audited through SkyeGate FS27 usage plus SkyeMail brain events."]
      };
      modelMode = "send_and_monitor_v1";
      brainUsage = {
        ...(brainUsage || {}),
        automation: { ...automation, sent_mode: automation.allowed ? "paid_auto_send" : "manual_approved" },
      };
    }
  } else if (action === "monitor" && (body.to || body.subject || body.recipient)) {
    monitorResult = await createBrainMonitor(env, {
      userId: mailboxContext.userId,
      mailbox,
      subject: clean(body.subject) || messages[0]?.subject || "",
      correspondent: clean(body.to || body.recipient || messages[0]?.from || ""),
      sentMessageId: clean(body.sent_message_id || body.message_id || ""),
      threadId: clean(body.thread_id || messages[0]?.thread_id || ""),
      meta: { source: clean(body.source || "skymail-brain-page"), prompt },
    });
    output.monitor = monitorResult;
    output.summary = `Reply monitor created for ${monitorResult?.correspondent_email || "the selected correspondent"} on ${mailbox?.mailbox_email || "this mailbox"}.`;
    modelMode = "local_monitor_v1";
  } else if (modelMode !== "local_deterministic_v1") {
    try {
      const ai = await runMeteredSkymailAi(request, env, ctx, {
        auth: mailboxContext.auth,
        mailbox,
        messages: mailBrainAiMessages({ action, mailboxEmail: mailbox?.mailbox_email || "", prompt, messages }),
        action: `mail-brain:${action}`,
        prompt,
        requestedModel: body.model || body.brain_model || body.kaixu_model || "",
        source: clean(body.source || "skymail-brain-page"),
      });
      output = outputFromAiText({ action, text: ai.output_text, localOutput: output, messages });
      modelMode = ai.model_mode;
      brainUsage = { usage_event_id: ai.usage_event_id, usage: ai.usage, month: ai.month, model: ai.model, provider: ai.provider || "fs27_skygate_brain", provider_path: ai.provider_path };
    } catch (error) {
      if (modelMode === "fs27_metered_v1") throw error;
      output.model_warning = error.message || "FS27 Brain runtime path unavailable; local deterministic brain was used.";
      modelMode = "local_deterministic_v1";
      brainUsage = { unavailable: true, error: output.model_warning, entitlement: error.entitlement || aiStatus.entitlement, month: error.month || aiStatus.month };
    }
  }
  const input = {
    prompt,
    selected_mailbox: mailbox?.mailbox_email || "",
    requested_message_ids: requestedIds.map(clean).filter(Boolean).slice(0, 24),
    provided_message_count: Array.isArray(body.messages) ? body.messages.length : 0,
    source: clean(body.source || "skymail-brain-page"),
    requested_model_mode: clean(body.model_mode || body.brain_mode || body.mode || ""),
    requested_model: clean(body.model || body.brain_model || body.kaixu_model || ""),
    send_to: clean(body.to || body.recipient || body.email || "")
  };
  const rows = await query(env, `
    insert into brain_events(user_id, mailbox_id, action, message_ids_json, input_json, output_json, model_mode, kaixu_usage_json)
    values($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7,$8::jsonb)
    returning id, created_at
  `, [
    mailboxContext.userId,
    mailbox?.id || null,
    action,
    JSON.stringify(messages.map((item) => item.id).filter(Boolean)),
    JSON.stringify(input),
    JSON.stringify(output),
    modelMode,
    JSON.stringify(brainUsage || {})
  ]);
  const event = rows[0] || {};
  ctx?.waitUntil?.(backupCitadel(env, {
    id: `mail_brain_${event.id || Date.now()}`,
    type: "skymail.brain.event",
    actor: auth.email,
    org_id: auth.fs27_customer_id || null,
    ws_id: mailbox?.id || mailboxContext.userId,
    meta: { action, mailbox: mailbox?.mailbox_email || "", model_mode: modelMode, message_count: messages.length, send_message_id: sendResult?.message_id || null, monitor_id: monitorResult?.id || null }
  }).catch(() => null));
  const monitors = await refreshBrainMonitors(env, mailboxContext.userId, mailbox).catch(() => []);
  return json({
    ok: true,
    event_id: event.id || null,
    created_at: event.created_at || new Date().toISOString(),
    mailbox: mailboxPayload,
    action,
    model_mode: modelMode,
    ai: { ...aiStatus, latest: brainUsage || {} },
    messages,
    output,
    send_result: sendResult,
    monitor: monitorResult,
    monitors
  });
}

async function saveMailboxAlias(env, { userId, mailboxId, aliasEmail, aliasType = "custom", displayName = null, providerAliasId = null, providerPayload = {} }) {
  const parsed = splitEmail(aliasEmail);
  if (!parsed) throw Object.assign(new Error("Valid alias email required."), { statusCode: 400 });
  const rows = await query(env, `
    insert into mailbox_aliases(
      user_id, mailbox_id, alias_email, local_part, domain, alias_type, display_name,
      provider_alias_id, provider_payload_json, created_at, updated_at
    )
    values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,now(),now())
    on conflict (alias_email)
    do update set
      display_name=coalesce(excluded.display_name, mailbox_aliases.display_name),
      provider_alias_id=coalesce(excluded.provider_alias_id, mailbox_aliases.provider_alias_id),
      provider_payload_json=coalesce(excluded.provider_payload_json, mailbox_aliases.provider_payload_json),
      status='active',
      updated_at=now()
    where mailbox_aliases.user_id=excluded.user_id
      and mailbox_aliases.mailbox_id=excluded.mailbox_id
    returning *
  `, [userId, mailboxId, parsed.email, parsed.local, parsed.domain, aliasType, displayName, providerAliasId || null, JSON.stringify(providerPayload || {})]);
  if (!rows[0]) throw Object.assign(new Error("Alias email already belongs to another SkyeMail mailbox."), { statusCode: 409 });
  return rows[0];
}

async function repairLocalRouteMailbox(env, { auth, mailbox, source = "mailbox-status-self-heal" }) {
  if (!mailbox || mailbox.provider !== "skymail-local-route") return mailbox;
  const provider = providerConfigured(env);
  if (provider.provider !== "zoho" || !zohoApiConfigured(env)) return mailbox;
  const users = await query(env, "select id, handle, email, skymail_id, workspace_id, fs27_customer_id, fs27_gate_card_id from users where id=$1 limit 1", [auth.sub]);
  const user = users[0] || { id: auth.sub, email: auth.email || auth.sub, handle: mailbox.local_part };
  const aliasRoute = await provisionZohoMailboxAliasRoute(env, {
    email: mailbox.mailbox_email,
    reason: "Self-healed a SkyeMail local route into a real SkyeMail receiving alias after the address was allowed to send before provider inbound existed.",
  });
  const rows = await query(env, `
    update hosted_mailboxes
       set provider='zoho',
           provider_account_id=$2,
           status='active',
           provisioning_status='provisioned',
           provider_payload_json=coalesce(provider_payload_json, '{}'::jsonb) || $3::jsonb,
           last_error=null,
           updated_at=now(),
           provisioned_at=coalesce(provisioned_at, now())
     where id=$1
     returning *
  `, [
    mailbox.id,
    aliasRoute.provider_account_id,
    JSON.stringify(aliasRoute.provider_payload || {}),
  ]);
  const repaired = rows[0] || mailbox;
  await saveMailboxAlias(env, {
    userId: user.id,
    mailboxId: repaired.id,
    aliasEmail: repaired.mailbox_email,
    aliasType: "primary",
    displayName: user.handle || repaired.local_part,
    providerAliasId: aliasRoute.provider_alias_id,
    providerPayload: { ...aliasRoute.provider_payload, source },
  });
  return repaired;
}

async function saveProvisionedHostedMailbox(env, { auth, user, local, domain, email, provisioned, source = "mailbox-self-heal" }) {
  const rows = await query(env, `
    insert into hosted_mailboxes(
      user_id, mailbox_email, local_part, domain, provider, provider_account_id,
      workspace_id, skymail_id, fs27_gate_card_id,
      status, provisioning_status, provider_payload_json, imap_host, smtp_host, jmap_url,
      provisioned_at, updated_at
    )
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,'active','provisioned',$10::jsonb,$11,$12,$13,now(),now())
    on conflict (mailbox_email)
    do update set
      provider=excluded.provider,
      provider_account_id=excluded.provider_account_id,
      workspace_id=coalesce(excluded.workspace_id, hosted_mailboxes.workspace_id),
      skymail_id=coalesce(excluded.skymail_id, hosted_mailboxes.skymail_id),
      fs27_gate_card_id=coalesce(excluded.fs27_gate_card_id, hosted_mailboxes.fs27_gate_card_id),
      status='active',
      provisioning_status='provisioned',
      provider_payload_json=coalesce(hosted_mailboxes.provider_payload_json, '{}'::jsonb) || excluded.provider_payload_json,
      imap_host=excluded.imap_host,
      smtp_host=excluded.smtp_host,
      jmap_url=excluded.jmap_url,
      provisioned_at=coalesce(hosted_mailboxes.provisioned_at, now()),
      updated_at=now(),
      last_error=null
    where hosted_mailboxes.user_id=excluded.user_id
    returning *
  `, [
    user.id,
    email,
    local,
    domain,
    provisioned.provider,
    provisioned.provider_account_id,
    user.workspace_id || auth.workspace_id || null,
    user.skymail_id || auth.skymail_id || null,
    user.fs27_gate_card_id || auth.fs27_gate_card_id || null,
    JSON.stringify({ ...(provisioned.provider_payload || {}), source }),
    env.SKYMAIL_IMAP_HOST || null,
    env.SKYMAIL_SMTP_HOST || null,
    env.SKYMAIL_JMAP_URL || null,
  ]);
  if (!rows[0]) throw Object.assign(new Error("Mailbox email already belongs to another SkyeMail workspace."), { statusCode: 409 });
  const mailbox = rows[0];
  const alias = await saveMailboxAlias(env, {
    userId: user.id,
    mailboxId: mailbox.id,
    aliasEmail: mailbox.mailbox_email,
    aliasType: "primary",
    displayName: user.handle || local,
    providerAliasId: provisioned.provider_alias_id || null,
    providerPayload: { ...(provisioned.provider_payload || {}), source },
  });
  return { ...mailbox, primary_alias: alias.alias_email };
}

async function ensureProviderBackedMailbox(env, { auth, user, mailbox = null, source = "mailbox-self-heal" }) {
  let current = mailbox || await getHostedMailbox(env, user.id);
  if (current) {
    return await repairLocalRouteMailbox(env, { auth, mailbox: current, source });
  }
  const provider = providerConfigured(env);
  if (!provider.configured) return null;
  const { local, domain, email } = validateMailboxInput(env, user.handle || auth.handle || auth.email, configuredDomains(env)[0]);
  const provisioned = await provisionMailbox(env, {
    email,
    localPart: local,
    domain,
    user,
    fs27: {
      sub: auth.fs27_sub || null,
      customer_id: auth.fs27_customer_id || user.fs27_customer_id || null,
      gate_card_id: auth.fs27_gate_card_id || user.fs27_gate_card_id || null,
    },
    allowLocalRoute: false,
  });
  if (provisioned.provider === "skymail-local-route") {
    throw Object.assign(new Error("SkyeMail could not create a sovereign receiving mailbox, so outbound sending is blocked until Citadel confirms the address."), { statusCode: 409 });
  }
  return await saveProvisionedHostedMailbox(env, { auth, user, local, domain, email, provisioned, source });
}

async function listMailboxAliases(env, userId, mailboxId = null) {
  const params = [userId];
  let clause = "where ma.user_id=$1";
  if (mailboxId) {
    params.push(mailboxId);
    clause += " and ma.mailbox_id=$2";
  }
  return await query(env, `
    select ma.*, hm.mailbox_email
      from mailbox_aliases ma
      join hosted_mailboxes hm on hm.id=ma.mailbox_id
     ${clause}
     order by ma.alias_type='primary' desc, ma.created_at asc
  `, params);
}

async function findMailboxByAddress(env, address) {
  const parsed = splitEmail(address);
  if (!parsed) return null;
  const aliasRows = await query(env, `
    select ma.alias_email, ma.alias_type, hm.*, u.handle, uk.version, uk.rsa_public_key_pem
      from mailbox_aliases ma
      join hosted_mailboxes hm on hm.id=ma.mailbox_id
      join users u on u.id=ma.user_id
      join user_keys uk on uk.user_id=u.id and uk.is_active=true
     where lower(ma.alias_email)=lower($1)
       and ma.status='active'
     limit 1
  `, [parsed.email]);
  if (aliasRows[0]) return aliasRows[0];
  const mailboxRows = await query(env, `
    select hm.mailbox_email as alias_email, 'primary' as alias_type, hm.*, u.handle, uk.version, uk.rsa_public_key_pem
      from hosted_mailboxes hm
      join users u on u.id=hm.user_id
      join user_keys uk on uk.user_id=u.id and uk.is_active=true
     where lower(hm.mailbox_email)=lower($1)
       and hm.status='active'
     limit 1
  `, [parsed.email]);
  return mailboxRows[0] || null;
}

async function handleMailStatus(request, env) {
  const auth = await requireAuth(request, env);
  const context = await resolveMailboxContext(env, request, auth);
  const url = new URL(request.url);
  const cacheKey = `mail-status:${context.userId}:${normalizeEmail(context.selected_mailbox_email || request.headers.get("x-skymail-mailbox-email") || "")}`;
  if (!["1", "true", "yes"].includes(String(url.searchParams.get("refresh") || "").toLowerCase())) {
    const cached = cacheGet(cacheKey);
    if (cached) return json({ ...cached, cached: true, cache_ttl_seconds: 10 });
  }
  const userId = context.userId;
  const users = await query(env, "select id, handle, email, skymail_id, workspace_id, fs27_customer_id, fs27_gate_card_id from users where id=$1 limit 1", [userId]);
  if (!users.length) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  const user = users[0];
  let mailbox = context.mailbox || await getHostedMailbox(env, userId);
  const selectedAuth = { ...auth, sub: userId, email: user.email };
  mailbox = await ensureProviderBackedMailbox(env, { auth: selectedAuth, user, mailbox, source: "mail-status-self-heal" }).catch(async (error) => {
    await query(env, "update hosted_mailboxes set last_error=$2, updated_at=now() where id=$1", [mailbox?.id, error.message || "Mailbox inbound self-heal failed."]).catch(() => null);
    return mailbox;
  });
  const provider = providerConfigured(env);
  const provisioningReady = provider.provider === "zoho" ? zohoProviderCanProvision(env) : provider.configured;
  const counts = await query(env, `
    select
      count(*) filter (where direction <> 'sent' and read_at is null and coalesce(delivery_status,'') <> 'trashed')::int as unread,
      max(created_at) filter (where delivery_provider='zoho') as last_provider_import_at,
      max(last_delivery_event_at) as last_delivery_event_at
    from messages
    where user_id=$1
  `, [userId]).catch(() => [{ unread: 0, last_provider_import_at: null, last_delivery_event_at: null }]);
  const mailboxes = await listAccessibleMailboxes(env, auth).catch(() => []);
  const currentEmail = normalizeEmail(mailbox?.mailbox_email || "");
  const body = {
    ok: true,
    connected: Boolean(mailbox),
    mode: mailbox ? "hosted-provider" : "not-connected",
    mailbox,
    selected_mailbox: currentEmail,
    mailboxes: mailboxes.map((item) => ({ ...item, selected: normalizeEmail(item.mailbox_email) === currentEmail })),
    notifications: {
      unread: Number(counts[0]?.unread || 0),
      last_provider_import_at: counts[0]?.last_provider_import_at || null,
      last_delivery_event_at: counts[0]?.last_delivery_event_at || null,
      sync_route: "/mail-sync"
    },
    provisioning: {
      status: provider.configured ? (provisioningReady ? "ready" : "api-ready-org-id-required") : "missing-provider-env",
      provider: provider.provider,
      api_configured: provider.configured,
      configured: provisioningReady,
      domains: configuredDomains(env),
      citadel_backup_configured: Boolean(env.CITADEL_BACKUP_URL || env.CITADEL_DATABASE_URL || env.CITADEL_BACKUP_DATABASE_URL),
      error: provisioningReady ? null : providerSetupMessage(provider.provider),
    },
  };
  cacheSet(cacheKey, body, 10000);
  return json(body);
}

async function handleMailboxesList(request, env) {
  const auth = await requireAuth(request, env);
  const context = await resolveMailboxContext(env, request, auth).catch((error) => {
    if ([403, 404].includes(Number(error.statusCode || 0))) throw error;
    return null;
  });
  const currentEmail = normalizeEmail(context?.mailbox?.mailbox_email || "");
  const mailboxes = await listAccessibleMailboxes(env, auth);
  return json({
    ok: true,
    selected_mailbox: currentEmail,
    mailboxes: mailboxes.map((item) => ({ ...item, selected: normalizeEmail(item.mailbox_email) === currentEmail })),
  });
}

function mailboxInventoryLogin(env, mailbox = {}) {
  const login = new URL("/admin/login.html", zeroOsGateOrigin(env));
  const handoff = `/live/SkyeMail/session-handoff.html?next=dashboard.html&from=founder-command-mailbox-inventory&mailbox=${encodeURIComponent(mailbox.mailbox_email || "")}`;
  login.searchParams.set("return", handoff);
  return {
    auth_mode: "shared SkyeGate FS27/Free99 owner session",
    owner_login_url: login.toString(),
    skyemail_session_handoff: handoff,
    mailbox_dashboard_url: `${publicSkymailUrl(env)}/session-handoff.html?next=dashboard.html&mailbox=${encodeURIComponent(mailbox.mailbox_email || "")}`,
    credential_policy: "No app-local mailbox passwords are stored or returned. Provider one-time passwords are discarded after creation; users enter through the shared 0S gate or provider reset/claim flow."
  };
}

async function handleMailboxesServiceList(request, env) {
  await serviceAuth(request, env);
  const url = new URL(request.url);
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") || 250) || 250));
  const includeInactive = ["1", "true", "yes"].includes(String(url.searchParams.get("include_inactive") || "").toLowerCase());
  const statusClause = includeInactive ? "" : "where coalesce(hm.status,'') not in ('released','offboarded','disabled')";
  const rows = await query(env, `
    select hm.id, hm.user_id, hm.mailbox_email, hm.local_part, hm.domain, hm.workspace_id, hm.skymail_id,
           hm.provider, hm.status, hm.provisioning_status, hm.updated_at, hm.created_at, hm.provisioned_at,
           u.email as owner_email, u.handle as owner_handle, u.workspace_id as owner_workspace_id, u.fs27_customer_id,
           count(m.id) filter (where m.direction <> 'sent' and coalesce(m.delivery_status,'') <> 'trashed')::int as inbox_total,
           count(m.id) filter (where m.direction = 'sent')::int as sent_total,
           count(m.id) filter (where m.direction <> 'sent' and m.read_at is null and coalesce(m.delivery_status,'') <> 'trashed')::int as inbox_unread,
           max(m.created_at) as last_message_at
      from hosted_mailboxes hm
      join users u on u.id=hm.user_id
      left join messages m on m.user_id=hm.user_id
      ${statusClause}
     group by hm.id, u.id
     order by (hm.status='active') desc, (hm.provider='zoho') desc, hm.updated_at desc nulls last, hm.created_at desc
     limit $1
  `, [limit]);
  const allCounts = await query(env, `
    select
      count(*)::int as total,
      count(*) filter (where status='active')::int as active,
      count(*) filter (where provider='zoho')::int as zoho,
      count(*) filter (where provisioning_status in ('provisioned','active','provider-attached'))::int as provider_ready,
      count(*) filter (where status='active' and provisioning_status='provisioned' and provider not in ('skymail-local-route','resend'))::int as production_sellable,
      count(*) filter (where provider='skymail-local-route')::int as internal_local_route,
      count(*) filter (where provider='resend')::int as proof_demo,
      count(*) filter (where status in ('error','failed','disabled') or provisioning_status like '%error%' or provisioning_status like '%failed%')::int as blocked_or_quarantined,
      count(*) filter (where coalesce(status,'') in ('released','offboarded','disabled'))::int as inactive
    from hosted_mailboxes
  `).catch(() => []);
  const counts = allCounts[0] || {};
  const mailboxes = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    mailbox_email: row.mailbox_email,
    local_part: row.local_part,
    domain: row.domain,
    workspace_id: row.workspace_id || row.owner_workspace_id || "",
    skymail_id: row.skymail_id || "",
    provider: row.provider,
    status: row.status,
    provisioning_status: row.provisioning_status,
    owner_email: row.owner_email || "",
    owner_handle: row.owner_handle || "",
    fs27_customer_id: row.fs27_customer_id || "",
    inbox_total: Number(row.inbox_total || 0),
    inbox_unread: Number(row.inbox_unread || 0),
    sent_total: Number(row.sent_total || 0),
    last_message_at: row.last_message_at || null,
    provisioned_at: row.provisioned_at || null,
    updated_at: row.updated_at || row.created_at || null,
    ...mailboxInventoryState(row),
    login: mailboxInventoryLogin(env, row)
  }));
  return json({
    ok: true,
    schema: "skymail.service.mailbox-inventory.v1",
    generated_at: new Date().toISOString(),
    origin: publicSkymailUrl(env),
    route: "/mailboxes-service-list",
    auth_boundary: "service-scoped SkyeGate FS27 bearer or SKYMAIL_SERVICE_TOKEN compatibility lane",
    credential_policy: "Founder Command receives mailbox routing and login handoff metadata only. Raw provider passwords, bearer tokens, cookies, and private keys are never returned.",
    include_inactive: includeInactive,
    limit,
    count: mailboxes.length,
    counts: {
      total: Number(counts.total || 0),
      active: Number(counts.active || 0),
      zoho: Number(counts.zoho || 0),
      provider_ready: Number(counts.provider_ready || 0),
      production_sellable: Number(counts.production_sellable || 0),
      internal_local_route: Number(counts.internal_local_route || 0),
      proof_demo: Number(counts.proof_demo || 0),
      blocked_or_quarantined: Number(counts.blocked_or_quarantined || 0),
      inactive: Number(counts.inactive || 0)
    },
    mailboxes
  });
}

async function handleMailboxProvision(request, env, ctx) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const users = await query(env, "select id, handle, email, skymail_id, workspace_id, fs27_customer_id, fs27_gate_card_id from users where id=$1 limit 1", [auth.sub]);
  if (!users.length) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  const user = users[0];
  const { local, domain, email } = validateMailboxInput(env, body.local_part || body.localPart || user.handle, body.domain || configuredDomains(env)[0]);
  const provider = providerConfigured(env);
  const allowUnroutableLocalRoute = Boolean(body.allow_unroutable_local_route || body.allowUnroutableLocalRoute || body.dev_local_route || body.devLocalRoute);
  const provisioned = provider.configured
    ? await provisionMailbox(env, { email, localPart: local, domain, user, fs27: { sub: auth.fs27_sub || null, customer_id: auth.fs27_customer_id || user.fs27_customer_id || null, gate_card_id: auth.fs27_gate_card_id || user.fs27_gate_card_id || null }, allowLocalRoute: allowUnroutableLocalRoute })
    : (() => { throw Object.assign(new Error(`${providerSetupMessage(provider.provider)} SkyeMail will not create a sendable local-only mailbox because external replies would bounce.`), { statusCode: 501 }); })();
  if (provisioned.provider === "skymail-local-route") throw localOnlyMailboxError("Provisioning returned an internal local route instead of a receiving mailbox.");
  const rows = await query(env, `
    insert into hosted_mailboxes(
      user_id, mailbox_email, local_part, domain, provider, provider_account_id,
      workspace_id, skymail_id, fs27_gate_card_id,
      status, provisioning_status, provider_payload_json, imap_host, smtp_host, jmap_url,
      provisioned_at, updated_at
    )
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,'active','provisioned',$10::jsonb,$11,$12,$13,now(),now())
    on conflict (mailbox_email)
    do update set
      provider=excluded.provider,
      provider_account_id=excluded.provider_account_id,
      workspace_id=coalesce(excluded.workspace_id, hosted_mailboxes.workspace_id),
      skymail_id=coalesce(excluded.skymail_id, hosted_mailboxes.skymail_id),
      fs27_gate_card_id=coalesce(excluded.fs27_gate_card_id, hosted_mailboxes.fs27_gate_card_id),
      status='active',
      provisioning_status='provisioned',
      provider_payload_json=excluded.provider_payload_json,
      imap_host=excluded.imap_host,
      smtp_host=excluded.smtp_host,
      jmap_url=excluded.jmap_url,
      provisioned_at=coalesce(hosted_mailboxes.provisioned_at, now()),
      updated_at=now(),
      last_error=null
    where hosted_mailboxes.user_id=excluded.user_id
    returning *
  `, [
    user.id,
    email,
    local,
    domain,
    provisioned.provider,
    provisioned.provider_account_id,
    user.workspace_id || auth.workspace_id || null,
    user.skymail_id || auth.skymail_id || null,
    user.fs27_gate_card_id || auth.fs27_gate_card_id || null,
    JSON.stringify(provisioned.provider_payload || {}),
    env.SKYMAIL_IMAP_HOST || null,
    env.SKYMAIL_SMTP_HOST || null,
    env.SKYMAIL_JMAP_URL || null,
  ]);
  if (!rows[0]) throw Object.assign(new Error("Mailbox email already belongs to another SkyeMail workspace."), { statusCode: 409 });
  const mailbox = rows[0];
  const alias = await saveMailboxAlias(env, {
    userId: user.id,
    mailboxId: mailbox.id,
    aliasEmail: mailbox.mailbox_email,
    aliasType: "primary",
    displayName: user.handle,
    providerAliasId: provisioned.provider_alias_id || null,
    providerPayload: { ...(provisioned.provider_payload || {}), source: "cloudflare-mailbox-provision" },
  });
  const keyState = await activeKeyState(env, user.id);
  const keyCard = await issueWorkspaceKeyCard(env, { user, mailbox, body: { ...body, customer_id: auth.fs27_customer_id || null }, keyState });
  const event = { type: "skymail.mailbox.provisioned", actor: user.email, org_id: auth.fs27_customer_id || user.fs27_customer_id || null, ws_id: mailbox.id, meta: { skymail_id: mailbox.skymail_id || user.skymail_id || null, workspace_id: mailbox.workspace_id || user.workspace_id || null, mailbox_email: mailbox.mailbox_email, primary_alias: alias.alias_email, provider: mailbox.provider, provider_account_id: mailbox.provider_account_id, key_card_id: keyCard.id || null, key_card_mdp_status: keyCard.mdp_status } };
  ctx.waitUntil(mirrorFs27(env, event));
  ctx.waitUntil(backupCitadel(env, { ...event, id: `mailbox_${mailbox.id}` }));
  return json({ ok: true, mailbox: { ...mailbox, primary_alias: alias.alias_email }, key_card: keyCard, local_route: provisioned.provider === "skymail-local-route", credentials_issued: Boolean(provisioned.mailbox_password_once), credential_note: provisioned.credential_note || null, mailbox_password_once: provisioned.mailbox_password_once || null });
}

async function handleMailboxAliases(request, env, ctx) {
  const auth = await requireAuth(request, env);
  const previewBody = request.method === "POST" ? await request.clone().json().catch(() => ({})) : {};
  const context = await resolveMailboxContext(env, request, auth, previewBody);
  const users = await query(env, "select id, handle, email, skymail_id, workspace_id, fs27_customer_id, fs27_gate_card_id from users where id=$1 limit 1", [context.userId]);
  if (!users.length) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  const user = users[0];
  const mailbox = context.mailbox || await getHostedMailbox(env, user.id);
  if (!mailbox) throw Object.assign(new Error("Provision a primary hosted mailbox before adding aliases."), { statusCode: 404 });
  if (request.method === "GET") {
    return json({ ok: true, mailbox, aliases: await listMailboxAliases(env, user.id, mailbox.id) });
  }
  const body = previewBody;
  const aliasEmail = body.alias_email || body.email || body.alias;
  const aliasType = body.alias_type || "custom";
  if (aliasType !== "primary" && !body.user_generated && !body.user_confirmed) {
    throw Object.assign(new Error("Custom aliases must be created by the signed-in user from the alias form."), { statusCode: 400 });
  }
  const provisionedAlias = await provisionMailboxAlias(env, {
    mailbox,
    aliasEmail,
    user,
    auth,
    source: body.source || "cloudflare-mailbox-aliases",
  });
  const alias = await saveMailboxAlias(env, {
    userId: user.id,
    mailboxId: mailbox.id,
    aliasEmail,
    aliasType,
    displayName: body.display_name || body.displayName || null,
    providerAliasId: provisionedAlias.provider_alias_id || null,
    providerPayload: { ...(provisionedAlias.provider_payload || {}), source: body.source || "cloudflare-mailbox-aliases", requested_by: user.email, user_generated: Boolean(body.user_generated || body.user_confirmed), workspace_id: user.workspace_id || auth.workspace_id || null },
  });
  const event = {
    type: "skymail.mailbox.alias_created",
    actor: user.email,
    org_id: auth.fs27_customer_id || user.fs27_customer_id || null,
    ws_id: mailbox.id,
    meta: { skymail_id: user.skymail_id || null, workspace_id: user.workspace_id || null, mailbox_email: mailbox.mailbox_email, alias_email: alias.alias_email, alias_type: alias.alias_type, provider: provisionedAlias.provider || mailbox.provider, provider_alias_id: alias.provider_alias_id || null },
  };
  ctx.waitUntil(mirrorFs27(env, event));
  ctx.waitUntil(backupCitadel(env, { ...event, id: `alias_${alias.id || crypto.randomUUID()}` }));
  return json({ ok: true, mailbox, alias });
}

async function ensureMailboxOffboardingSchema(env) {
  const schema = schemaName(env);
  await query(env, `
    create table if not exists ${schema}.mailbox_offboarding_events (
      id text primary key,
      user_id uuid,
      mailbox_id uuid,
      mailbox_email text,
      action text not null,
      status text not null,
      actor text,
      provider text,
      provider_account_id text,
      checklist_json jsonb not null default '{}'::jsonb,
      payload_json jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);
  await query(env, `create index if not exists idx_mailbox_offboarding_events_user_created on ${schema}.mailbox_offboarding_events(user_id, created_at desc)`);
  await query(env, `create index if not exists idx_mailbox_offboarding_events_mailbox_created on ${schema}.mailbox_offboarding_events(mailbox_id, created_at desc)`);
  await query(env, `create index if not exists idx_mailbox_offboarding_events_email_created on ${schema}.mailbox_offboarding_events(lower(mailbox_email), created_at desc)`);
}

function mailboxOffboardingChecklist(mailbox, body = {}) {
  const provider = clean(mailbox?.provider || "skymail");
  const localOnly = provider === "skymail-local-route";
  const archiveExported = Boolean(body.confirm_archive_exported || body.archive_exported || body.archiveExported);
  const clientNotified = Boolean(body.confirm_client_notified || body.client_notified || body.clientNotified);
  const providerReleased = Boolean(body.confirm_provider_released || body.provider_released || body.providerReleased || localOnly);
  const items = [
    {
      id: "archive_export",
      label: "Export or archive mailbox data before removing provider access.",
      complete: archiveExported,
      required_for_release: true,
    },
    {
      id: "client_notice",
      label: "Tell the client/operator the mailbox is being offboarded or reassigned.",
      complete: clientNotified,
      required_for_release: false,
    },
    {
      id: "provider_release",
      label: localOnly ? "SkyeMail local route does not consume an external provider seat." : "Disable/delete the provider mailbox or otherwise free the paid mailbox seat.",
      complete: providerReleased,
      required_for_release: !localOnly,
    },
  ];
  return {
    provider,
    local_route_only: localOnly,
    ready_to_release: items.filter((item) => item.required_for_release).every((item) => item.complete),
    items,
    manual_provider_steps: localOnly ? [
      "No external provider seat is consumed.",
      "Confirm the mailbox should stop accepting new SkyeMail alias traffic.",
      "Release the SkyeMail database route from Founder Command.",
    ] : [
      "Export or archive mailbox data from the provider admin console.",
      "Disable/delete the mailbox or reassign the provider license in the provider admin console.",
      "Return to Founder Command and confirm archive + provider release.",
    ],
  };
}

async function mailboxOffboardingAuth(request, env) {
  try {
    await serviceAuth(request, env);
    return { service: true, auth: { sub: "skymail-service", email: "skymail-service", role: "service" } };
  } catch (serviceError) {
    if (serviceError.statusCode === 501 && !bearer(request)) throw serviceError;
    const auth = await requireAuth(request, env);
    return { service: false, auth };
  }
}

async function resolveMailboxOffboardingTarget(env, authContext, body = {}) {
  const mailboxEmail = normalizeEmail(body.mailbox_email || body.mailbox || body.address || body.email || "");
  const workspaceId = clean(body.workspace_id || body.workspaceId || body.workspace || "");
  const skymailId = clean(body.skymail_id || body.skymailId || "");
  const userId = clean(body.user_id || body.userId || "");
  const params = [];
  const clauses = [];

  if (authContext.service) {
    if (mailboxEmail) {
      params.push(mailboxEmail);
      clauses.push(`lower(hm.mailbox_email)=lower($${params.length})`);
    }
    if (workspaceId) {
      params.push(workspaceId);
      clauses.push(`(hm.workspace_id=$${params.length} or u.workspace_id=$${params.length})`);
    }
    if (skymailId) {
      params.push(skymailId);
      clauses.push(`(hm.skymail_id=$${params.length} or u.skymail_id=$${params.length})`);
    }
    if (userId) {
      params.push(userId);
      clauses.push(`hm.user_id=$${params.length}`);
    }
    if (!clauses.length) {
      throw Object.assign(new Error("mailbox_email, workspace_id, skymail_id, or user_id is required for service offboarding."), { statusCode: 400 });
    }
  } else {
    params.push(authContext.auth.sub);
    clauses.push(`hm.user_id=$${params.length}`);
    if (mailboxEmail) {
      params.push(mailboxEmail);
      clauses.push(`lower(hm.mailbox_email)=lower($${params.length})`);
    }
  }

  const rows = await query(env, `
    select hm.*, u.email as user_email, u.handle, u.workspace_id as user_workspace_id, u.skymail_id as user_skymail_id,
           u.fs27_customer_id, u.fs27_gate_card_id
      from hosted_mailboxes hm
      join users u on u.id=hm.user_id
     where ${clauses.join(" and ")}
     order by (hm.status='active') desc, hm.created_at desc
     limit 1
  `, params);
  if (!rows[0]) throw Object.assign(new Error("SkyeMail mailbox not found for offboarding."), { statusCode: 404 });
  return rows[0];
}

async function readMailboxOffboardingEvents(env, mailboxId) {
  await ensureMailboxOffboardingSchema(env).catch(() => null);
  return await query(env, `
    select id, action, status, actor, checklist_json, payload_json, created_at
      from mailbox_offboarding_events
     where mailbox_id=$1
     order by created_at desc
     limit 12
  `, [mailboxId]).catch(() => []);
}

async function recordMailboxOffboardingEvent(env, ctx, { authContext, mailbox, action, status, body, checklist }) {
  const id = `mailbox_offboarding_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`;
  const actor = clean(body?.actor || body?.requested_by || authContext?.auth?.email || authContext?.auth?.sub || "skymail");
  const event = {
    id,
    type: `skymail.mailbox.offboarding.${action}`,
    actor,
    org_id: mailbox.fs27_customer_id || null,
    ws_id: mailbox.workspace_id || mailbox.id,
    meta: {
      mailbox_id: mailbox.id,
      mailbox_email: mailbox.mailbox_email,
      provider: mailbox.provider,
      status,
      service: Boolean(authContext?.service),
      ready_to_release: Boolean(checklist?.ready_to_release),
    },
  };
  const writeEvent = (async () => {
    await ensureMailboxOffboardingSchema(env);
    await query(env, `
      insert into mailbox_offboarding_events(
        id, user_id, mailbox_id, mailbox_email, action, status, actor,
        provider, provider_account_id, checklist_json, payload_json, created_at
      )
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,now())
    `, [
      id,
      mailbox.user_id,
      mailbox.id,
      mailbox.mailbox_email,
      action,
      status,
      actor,
      mailbox.provider || null,
      mailbox.provider_account_id || null,
      JSON.stringify(checklist || {}),
      JSON.stringify({
        reason: clean(body?.reason || body?.notes || ""),
        workspace_id: clean(body?.workspace_id || body?.workspaceId || mailbox.workspace_id || ""),
        requested_action: action,
      }),
    ]);
  })().catch(() => null);
  const mirrored = mirrorFs27(env, event).catch(() => null);
  const backedUp = backupCitadel(env, { ...event, id }).catch(() => null);
  if (ctx?.waitUntil) {
    ctx.waitUntil(writeEvent);
    ctx.waitUntil(mirrored);
    ctx.waitUntil(backedUp);
  } else {
    await Promise.all([writeEvent, mirrored, backedUp]);
  }
  return { id, actor };
}

function publicMailboxOffboardingPacket(mailbox, aliases = [], checklist = {}, events = []) {
  return {
    mailbox: {
      id: mailbox.id,
      user_id: mailbox.user_id,
      user_email: mailbox.user_email || null,
      mailbox_email: mailbox.mailbox_email,
      workspace_id: mailbox.workspace_id || mailbox.user_workspace_id || null,
      skymail_id: mailbox.skymail_id || mailbox.user_skymail_id || null,
      provider: mailbox.provider,
      provider_account_id: mailbox.provider_account_id || null,
      status: mailbox.status,
      provisioning_status: mailbox.provisioning_status,
      updated_at: mailbox.updated_at || null,
      last_error: mailbox.last_error || null,
    },
    aliases: aliases.map((item) => ({
      id: item.id,
      alias_email: item.alias_email,
      alias_type: item.alias_type,
      status: item.status,
      display_name: item.display_name || "",
    })),
    checklist,
    recent_events: events,
    tutorial: "/admin/tutorial/29-skyemail-mailbox-offboarding.html",
    founder_command: "/founder-command/?view=mailboxes",
  };
}

async function handleMailboxOffboarding(request, env, ctx) {
  const authContext = await mailboxOffboardingAuth(request, env);
  const url = new URL(request.url);
  const body = request.method === "GET" ? Object.fromEntries(url.searchParams.entries()) : await request.json().catch(() => ({}));
  const action = clean(body.action || url.searchParams.get("action") || (request.method === "GET" ? "status" : "prepare")).toLowerCase();
  const mailbox = await resolveMailboxOffboardingTarget(env, authContext, body);
  const aliases = await listMailboxAliases(env, mailbox.user_id, mailbox.id).catch(() => []);
  const checklist = mailboxOffboardingChecklist(mailbox, body);

  if (request.method === "GET" || action === "status") {
    const events = await readMailboxOffboardingEvents(env, mailbox.id);
    return json({ ok: true, action: "status", ...publicMailboxOffboardingPacket(mailbox, aliases, checklist, events) });
  }

  if (action === "prepare") {
    const payload = {
      offboarding: {
        prepared_at: new Date().toISOString(),
        prepared_by: authContext.auth?.email || authContext.auth?.sub || "skymail",
        reason: clean(body.reason || body.notes || ""),
      },
    };
    const rows = await query(env, `
      update hosted_mailboxes
         set status='offboarding_pending',
             provisioning_status='archive_required',
             provider_payload_json=coalesce(provider_payload_json, '{}'::jsonb) || $2::jsonb,
             last_error='Offboarding prepared. Export archive and release provider seat before final release.',
             updated_at=now()
       where id=$1
       returning *
    `, [mailbox.id, JSON.stringify(payload)]);
    const updated = { ...mailbox, ...(rows[0] || {}) };
    const record = await recordMailboxOffboardingEvent(env, ctx, { authContext, mailbox: updated, action, status: "offboarding_pending", body, checklist });
    const events = await readMailboxOffboardingEvents(env, mailbox.id);
    return json({
      ok: true,
      action,
      record,
      message: "Offboarding packet prepared. Do not confirm release until archive export and provider seat release are done.",
      ...publicMailboxOffboardingPacket(updated, aliases, checklist, events),
    });
  }

  if (action === "release") {
    if (!checklist.ready_to_release) {
      return json({
        ok: false,
        error: "Archive export and provider release confirmations are required before SkyeMail can mark the mailbox seat reusable.",
        action,
        ...publicMailboxOffboardingPacket(mailbox, aliases, checklist, await readMailboxOffboardingEvents(env, mailbox.id)),
      }, 409);
    }
    const payload = {
      offboarding: {
        released_at: new Date().toISOString(),
        released_by: authContext.auth?.email || authContext.auth?.sub || "skymail",
        archive_exported: true,
        provider_released: true,
        reason: clean(body.reason || body.notes || ""),
      },
    };
    const rows = await query(env, `
      update hosted_mailboxes
         set status='released',
             provisioning_status='released_provider_seat_available',
             provider_payload_json=coalesce(provider_payload_json, '{}'::jsonb) || $2::jsonb,
             last_error='Released by SkyeMail offboarding lane after archive and provider release confirmation.',
             updated_at=now()
       where id=$1
       returning *
    `, [mailbox.id, JSON.stringify(payload)]);
    await query(env, `
      update mailbox_aliases
         set status='released',
             updated_at=now()
       where mailbox_id=$1
    `, [mailbox.id]).catch(() => null);
    const updated = { ...mailbox, ...(rows[0] || {}) };
    const releasedAliases = aliases.map((item) => ({ ...item, status: "released" }));
    const record = await recordMailboxOffboardingEvent(env, ctx, { authContext, mailbox: updated, action, status: "released_provider_seat_available", body, checklist });
    const events = await readMailboxOffboardingEvents(env, mailbox.id);
    return json({
      ok: true,
      action,
      record,
      seat_reusable: true,
      message: "Mailbox released in SkyeMail. Provider seat can now be reused once the provider console confirms the license is available.",
      ...publicMailboxOffboardingPacket(updated, releasedAliases, checklist, events),
    });
  }

  if (action === "cancel") {
    const rows = await query(env, `
      update hosted_mailboxes
         set status='active',
             provisioning_status='provisioned',
             last_error=null,
             updated_at=now()
       where id=$1
       returning *
    `, [mailbox.id]);
    await query(env, `
      update mailbox_aliases
         set status='active',
             updated_at=now()
       where mailbox_id=$1
    `, [mailbox.id]).catch(() => null);
    const updated = { ...mailbox, ...(rows[0] || {}) };
    const record = await recordMailboxOffboardingEvent(env, ctx, { authContext, mailbox: updated, action, status: "active", body, checklist });
    const events = await readMailboxOffboardingEvents(env, mailbox.id);
    return json({
      ok: true,
      action,
      record,
      message: "Offboarding canceled. Mailbox and aliases are active again.",
      ...publicMailboxOffboardingPacket(updated, aliases.map((item) => ({ ...item, status: "active" })), checklist, events),
    });
  }

  return json({ ok: false, error: "Unsupported mailbox offboarding action. Use status, prepare, release, or cancel." }, 400);
}

async function handleMailSettingsGet(request, env) {
  const auth = await requireAuth(request, env);
  const context = await resolveMailboxContext(env, request, auth);
  const userId = context.userId;
  const prefRows = await query(env, `
    select display_name, profile_title, profile_phone, profile_company, profile_website,
           signature_text, signature_html, preferred_from_alias, updated_at
      from user_preferences
     where user_id=$1
     limit 1
  `, [userId]);
  const mailbox = context.mailbox || await getHostedMailbox(env, userId);
  const hostedAliases = mailbox ? await listMailboxAliases(env, userId, mailbox.id) : [];
  const googleRows = await query(env, `
    select google_email, scope, from_name, contacts_last_sync_at, contacts_last_sync_count, contacts_sync_error
      from google_mailboxes
     where user_id=$1
     limit 1
  `, [userId]).catch(() => []);
  const google = googleRows[0] || null;
  const primaryAlias = mailbox ? {
    sendAsEmail: mailbox.mailbox_email,
    displayName: prefRows[0]?.display_name || mailbox.local_part || mailbox.mailbox_email,
    isPrimary: true,
    isDefault: true,
    treatAsAlias: false,
    verificationStatus: "accepted",
  } : null;
  return json({
    ok: true,
    profile: prefRows[0] || null,
    hosted: {
      mailbox: mailbox || null,
      aliases: hostedAliases.map((item) => ({
        id: item.id,
        alias_email: item.alias_email,
        alias_type: item.alias_type,
        display_name: item.display_name || "",
        status: item.status || "active",
        created_at: item.created_at || null,
      })),
    },
    gmail: {
      connected: Boolean(google),
      google_email: google?.google_email || null,
      scope: google?.scope || "",
      signature_scope_ready: false,
      scope_note: google ? "Google settings sync is optional for Citadel Database and SkyeNet SkyeMail mailboxes." : "Citadel Database and SkyeNet SkyeMail aliases do not require Google settings scope.",
      contacts_last_sync_at: google?.contacts_last_sync_at || null,
      contacts_last_sync_count: Number(google?.contacts_last_sync_count || 0),
      contacts_sync_error: google?.contacts_sync_error || null,
      sendAs: primaryAlias,
      aliases: primaryAlias ? [primaryAlias] : [],
      vacation: null,
    },
  });
}

async function handleMailSettingsSave(request, env) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const context = await resolveMailboxContext(env, request, auth, body);
  const userId = context.userId;
  await query(env, `
    insert into user_preferences(
      user_id, display_name, profile_title, profile_phone, profile_company, profile_website,
      signature_text, signature_html, preferred_from_alias, created_at, updated_at
    )
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),now())
    on conflict (user_id)
    do update set
      display_name=excluded.display_name,
      profile_title=excluded.profile_title,
      profile_phone=excluded.profile_phone,
      profile_company=excluded.profile_company,
      profile_website=excluded.profile_website,
      signature_text=excluded.signature_text,
      signature_html=excluded.signature_html,
      preferred_from_alias=excluded.preferred_from_alias,
      updated_at=now()
  `, [
    userId,
    clean(body.display_name) || null,
    clean(body.profile_title) || null,
    clean(body.profile_phone) || null,
    clean(body.profile_company) || null,
    clean(body.profile_website) || null,
    clean(body.signature_text) || null,
    clean(body.signature_html) || null,
    normalizeEmail(body.preferred_from_alias) || null,
  ]);
  return json({ ok: true, gmail_updated: false, gmail_vacation_updated: false, gmail_error: body.sync_gmail || body.sync_vacation ? "Google settings sync is optional and not active on the Citadel Database and SkyeNet SkyeMail lane." : null });
}

function messageSummary(row, mailboxEmail = "") {
  const proof = Number(row.key_version || 0) === 0 ? openProofBlob(row.ciphertext_b64) : null;
  const labels = [];
  if (row.direction === "sent") labels.push("SENT");
  else if (row.direction === "draft") labels.push("DRAFT");
  else labels.push("INBOX");
  if (!row.read_at && row.direction !== "sent" && row.direction !== "draft") labels.push("UNREAD");
  if (row.starred_at) labels.push("STARRED");
  return {
    id: row.id,
    thread_id: row.thread_id || row.id,
    subject: proof?.subject || row.subject || (row.direction === "sent" ? "Sent message" : "Received message"),
    from: proof?.from || row.from_email || row.from_name || "",
    to: Array.isArray(proof?.to) ? proof.to.join(", ") : proof?.to || row.delivered_to || mailboxEmail,
    snippet: proof?.message || proof?.snippet || `${row.direction || "mail"} via ${displayProviderName(row.delivery_provider)}`,
    internal_date: row.created_at,
    date: row.created_at,
    labels,
    unread: labels.includes("UNREAD"),
    starred: Boolean(row.starred_at),
    important: false,
    has_attachments: Boolean(proof?.has_attachments || proof?.attachment_count || proof?.attachments?.length),
    direction: row.direction || "inbound",
    delivery_status: row.delivery_status || null,
    delivery_provider: row.delivery_provider || null,
    provider_message_id: row.provider_message_id || null,
    recipient_alias: row.recipient_alias || null,
    delivered_to: row.delivered_to || null,
  };
}

function skymailHtmlEscape(value) {
  return String(value || "").replace(/[<>&"]/g, (c) => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;" }[c]));
}

function storedMessageDetail(row) {
  const proof = Number(row.key_version || 0) === 0 ? openProofBlob(row.ciphertext_b64) : null;
  const labels = row.direction === "sent" ? ["SENT"] : ["INBOX"];
  if (!row.read_at && row.direction !== "sent") labels.push("UNREAD");
  if (row.starred_at) labels.push("STARRED");
  const html = proof?.html || "";
  const text = proof?.message || proof?.text || (html ? stripHtml(html) : "Encrypted SkyeMail message. Unlock in the vault to read the full body.");
  return {
    id: row.id,
    thread_id: row.thread_id || row.id,
    labels,
    unread: labels.includes("UNREAD"),
    starred: Boolean(row.starred_at),
    important: false,
    internal_date: row.created_at,
    snippet: proof?.snippet || text.slice(0, 240),
    headers: {
      subject: proof?.subject || (row.direction === "sent" ? "Sent message" : "Received message"),
      from: proof?.from || row.from_email || "",
      to: Array.isArray(proof?.to) ? proof.to.join(", ") : proof?.to || row.delivered_to || "",
      cc: Array.isArray(proof?.cc) ? proof.cc.join(", ") : proof?.cc || "",
      date: row.created_at,
      message_id: row.provider_message_id || row.id,
      references: row.thread_id || "",
      in_reply_to: "",
    },
    body: {
      text,
      html: html || (text ? `<p>${skymailHtmlEscape(text)}</p>` : ""),
    },
    attachments: Array.isArray(proof?.attachments) ? proof.attachments : [],
    direction: row.direction || "inbound",
    delivery_provider: row.delivery_provider || null,
    provider_message_id: row.provider_message_id || null,
  };
}

async function findStoredZohoDraft(env, userId, ref) {
  const providerMessageId = clean(ref?.messageId || "");
  if (!providerMessageId) return null;
  const rows = await query(env, `
    select id, thread_id, from_name, from_email, key_version, ciphertext_b64, created_at, read_at, starred_at,
           direction, delivery_provider, provider_message_id, delivery_status, recipient_alias, delivered_to
      from messages
     where user_id=$1
       and direction='draft'
       and delivery_provider='zoho'
       and provider_message_id=$2
       and coalesce(delivery_status,'') <> 'deleted'
     order by created_at desc
     limit 1
  `, [userId, providerMessageId]).catch(() => []);
  return rows[0] || null;
}

function draftFromProviderAndProof({ id, message = {}, proof = {}, mailboxEmail = "" }) {
  const headers = message.headers || {};
  const providerBody = message.body || {};
  const proofTo = Array.isArray(proof.to) ? proof.to.join(", ") : proof.to || "";
  const proofCc = Array.isArray(proof.cc) ? proof.cc.join(", ") : proof.cc || "";
  const proofBcc = Array.isArray(proof.bcc) ? proof.bcc.join(", ") : proof.bcc || "";
  const providerSubject = clean(headers.subject || "");
  const proofSubject = clean(proof.subject || "");
  const html = providerBody.html || proof.html || "";
  const text = providerBody.text || proof.message || proof.text || stripHtml(html);
  return {
    id: message.id || id,
    draft_id: message.id || id,
    message_id: message.id || id,
    thread_id: message.thread_id || proof.thread_id || "",
    from: headers.from || proof.from || mailboxEmail,
    to: headers.to || proofTo || mailboxEmail,
    cc: headers.cc || proofCc || "",
    bcc: headers.bcc || proofBcc || "",
    subject: providerSubject && providerSubject !== "(no subject)" ? providerSubject : proofSubject,
    body: { text: text || "", html: html || (text ? `<p>${skymailHtmlEscape(text)}</p>` : "") },
    attachments: message.attachments || [],
  };
}

async function findZohoUiIdForStoredRow(env, row, mailbox = null) {
  const proof = Number(row.key_version || 0) === 0 ? openProofBlob(row.ciphertext_b64) : null;
  if (proof?.provider_ui_id) return proof.provider_ui_id;
  const accountId = await getZohoMailAccountId(env, mailbox?.provider_account_id || null);
  const providerMessageId = clean(row.provider_message_id || proof?.provider_message_id || "");
  if (providerMessageId.startsWith("zoho:")) {
    const parsed = parseZohoUiId(providerMessageId, accountId);
    if (parsed.folderId && parsed.messageId) return zohoUiId(parsed.accountId || accountId, parsed.folderId, parsed.messageId);
  }
  if (proof?.provider_folder_id && row.provider_message_id) return zohoUiId(accountId, proof.provider_folder_id, row.provider_message_id);
  if (!providerMessageId) return "";
  const addresses = Array.from(new Set([
    row.delivered_to,
    row.recipient_alias,
    mailbox?.mailbox_email,
  ].map(normalizeEmail).filter(Boolean)));
  const labels = row.direction === "sent" ? ["SENT", ""] : (row.direction === "draft" ? ["DRAFT", ""] : ["INBOX", ""]);
  for (const label of labels) {
    for (const address of addresses.length ? addresses : [""]) {
      const listed = await zohoListMessages(env, {
        accountId,
        mailbox: address,
        label,
        max: 100,
      }).catch(() => null);
      const match = listed?.items?.find((item) => clean(item.provider_message_id) === providerMessageId || clean(messageLabelKeyFromId(item.id).provider_message_id) === providerMessageId);
      if (match?.id) return match.id;
    }
  }
  return "";
}

async function hydrateStoredMessageDetail(env, row, mailbox = null) {
  if (row.delivery_provider === "zoho" && zohoApiConfigured(env)) {
    const zohoId = await findZohoUiIdForStoredRow(env, row, mailbox).catch(() => "");
    if (zohoId) {
      const data = await zohoGetMessage(env, {
        id: zohoId,
        accountId: mailbox?.provider_account_id || null,
        mailbox: mailbox?.mailbox_email || row.delivered_to || "",
      }).catch(() => null);
      if (data?.message) return {
        ...data.message,
        local_id: row.id,
        local_thread_id: row.thread_id || row.id,
        labels: storedMessageDetail(row).labels,
        starred: Boolean(row.starred_at),
        unread: !row.read_at && row.direction !== "sent",
      };
    }
  }
  return storedMessageDetail(row);
}

async function getStoredThreadRows(env, userId, id, limit = 50) {
  const raw = clean(id);
  if (isUuid(raw)) {
    return await query(env, `
      select id, thread_id, from_name, from_email, key_version, ciphertext_b64, created_at, read_at, starred_at,
             direction, delivery_provider, provider_message_id, delivery_status, recipient_alias, delivered_to
        from messages
       where (thread_id=$1 or id=$1) and user_id=$2
       order by created_at asc
       limit $3
    `, [raw, userId, limit]);
  }
  return await query(env, `
    select id, thread_id, from_name, from_email, key_version, ciphertext_b64, created_at, read_at, starred_at,
           direction, delivery_provider, provider_message_id, delivery_status, recipient_alias, delivered_to
      from messages
     where thread_id=$1 and user_id=$2
     order by created_at asc
     limit $3
  `, [raw, userId, limit]).catch(() => []);
}

async function storedThreadResponse(env, rows, id, mailbox = null) {
  const messages = [];
  for (const row of rows) messages.push(await hydrateStoredMessageDetail(env, row, mailbox));
  const participants = Array.from(new Set(messages.flatMap((message) => [
    message.headers.from,
    message.headers.to,
    message.headers.cc,
  ]).filter(Boolean)));
  return {
    ok: true,
    mailbox: mailbox?.mailbox_email || rows[0]?.delivered_to || "",
    thread: {
      id: rows[0]?.thread_id || id,
      history_id: null,
      message_count: messages.length,
      subject: messages[0]?.headers?.subject || "(no subject)",
      participants,
      messages,
    },
  };
}

async function cacheZohoMessageDetail(env, { userId, mailbox = null, message = {} } = {}) {
  const providerMessageId = clean(message.provider_message_id || messageLabelKeyFromId(message.id).provider_message_id || "");
  if (!userId || !providerMessageId) return null;
  const headers = message.headers || {};
  const labels = (Array.isArray(message.labels) ? message.labels : []).map((label) => clean(label).toUpperCase()).filter(Boolean);
  const parsedProviderId = parseZohoUiId(message.id || "", mailbox?.provider_account_id || null);
  const direction = labels.includes("SENT") || message.direction === "outbound" ? "sent" : "inbound";
  const deliveryStatus = labels.includes("TRASH") || String(message.delivery_status || "").toLowerCase() === "trashed"
    ? "trashed"
    : (direction === "sent" ? "sent" : "received");
  const mailboxEmail = mailbox?.mailbox_email || "";
  const from = clean(headers.from || message.from || "");
  const to = clean(headers.to || message.to || mailboxEmail);
  const proof = proofBlob({
    subject: headers.subject || message.subject || "(no subject)",
    message: message.body?.text || message.snippet || stripHtml(message.body?.html || ""),
    html: message.body?.html || "",
    snippet: message.snippet || "",
    direction,
    from,
    to: to ? [to] : [],
    cc: headers.cc ? [headers.cc] : [],
    provider: "zoho",
    provider_ui_id: message.id || "",
    provider_folder_id: parsedProviderId.folderId || message.provider_folder_id || "",
    provider_message_id: providerMessageId,
    provider_thread_id: message.provider_thread_id || parsedProviderId.messageId || "",
    has_attachments: Boolean(message.attachments?.length || message.has_attachments),
    attachment_count: Array.isArray(message.attachments) ? message.attachments.length : 0,
    cached_at: new Date().toISOString(),
  });
  const existing = await query(env, `
    select id from messages
     where user_id=$1
       and delivery_provider='zoho'
       and provider_message_id=$2
     order by created_at desc
     limit 1
  `, [userId, providerMessageId]).catch(() => []);
  if (existing[0]?.id) {
    await query(env, `
      update messages
         set from_name=$3,
             from_email=$4,
             ciphertext_b64=$5,
             direction=$6,
             delivery_status=$7,
             last_delivery_event_at=now(),
             recipient_alias=coalesce(recipient_alias,$8),
             delivered_to=coalesce(delivered_to,$9)
       where id=$1
         and user_id=$2
         and coalesce(delivery_status,'') <> 'deleted'
    `, [existing[0].id, userId, from || headers.subject || "Zoho message", from, proof, direction, deliveryStatus, mailboxEmail, mailboxEmail]).catch(() => null);
    return existing[0].id;
  }
  const rows = await query(env, `
    insert into messages(user_id, from_name, from_email, key_version, encrypted_key_b64, iv_b64, ciphertext_b64,
      direction, delivery_provider, provider_message_id, delivery_status, last_delivery_event_at, recipient_alias, delivered_to)
    values($1,$2,$3,0,$4,$5,$6,$7,'zoho',$8,$9,now(),$10,$11)
    returning id
  `, [
    userId,
    from || headers.subject || "Zoho message",
    from,
    "proof",
    "proof",
    proof,
    direction,
    providerMessageId,
    deliveryStatus,
    mailboxEmail,
    mailboxEmail,
  ]).catch(() => []);
  return rows[0]?.id || null;
}

async function listStoredMessages(env, { userId, mailbox = null, label = "", max = 25, q = "" } = {}) {
  const params = [userId];
  let where = "where user_id=$1";
  if (label === "TRASH") where += " and delivery_status='trashed'";
  else if (label === "SENT") where += " and direction='sent' and coalesce(delivery_status,'') <> 'trashed'";
  else if (label === "DRAFT") where += " and direction='draft' and coalesce(delivery_status,'') <> 'trashed'";
  else if (label === "SPAM") where += " and delivery_status='spam'";
  else if (label === "INBOX" || !label) where += " and direction<>'sent' and coalesce(delivery_status,'') not in ('trashed','archived','spam')";
  const queryLimit = q ? Math.max(max, 200) : max;
  params.push(queryLimit);
  const rows = await query(env, `
    select id, thread_id, from_name, from_email, key_version, ciphertext_b64, created_at, read_at, starred_at,
           direction, delivery_provider, provider_message_id, delivery_status, recipient_alias, delivered_to
      from messages
      ${where}
     order by created_at desc
     limit $${params.length}
  `, params);
  const items = rows.map((row) => messageSummary(row, mailbox?.mailbox_email || ""));
  const filtered = q
    ? items.filter((item) => [
      item.subject,
      item.from,
      item.to,
      item.snippet,
      item.provider_message_id,
      item.id,
    ].map((value) => String(value || "").toLowerCase()).join("\n").includes(q))
    : items;
  return {
    ok: true,
    mailbox: mailbox?.mailbox_email || "",
    items: filtered.slice(0, max),
    nextPageToken: null,
  };
}

async function handleGmailList(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const label = clean(url.searchParams.get("label")).toUpperCase();
  const max = Math.min(Math.max(parseInt(url.searchParams.get("max") || "25", 10) || 25, 1), 100);
  const q = clean(url.searchParams.get("q")).toLowerCase();
  const pageToken = clean(url.searchParams.get("pageToken"));
  const context = await resolveMailboxContext(env, request, auth);
  const mailbox = context.mailbox;
  const userId = context.userId;
  const cacheFirstInbox = Boolean(mailbox?.provider === "zoho" && !q && !pageToken && (!label || label === "INBOX"));
  if (cacheFirstInbox) {
    const cached = await listStoredMessages(env, { userId, mailbox, label: label || "INBOX", max, q });
	    return json(await applyMessageLabelState(env, userId, {
	      ...cached,
	      requested_label: label || "INBOX",
	      provider_cache: "citadel-database",
      provider_note: "Inbox is served from the Citadel cache after sync/webhook import to avoid provider refresh throttling.",
    }));
  }
  if (mailbox?.provider === "zoho" && zohoApiConfigured(env)) {
    try {
      const listed = await zohoListMessages(env, {
        accountId: mailbox.provider_account_id,
        mailbox: mailbox.mailbox_email,
        label,
        max,
        pageToken,
        q,
      });
      if (q) {
        const cached = await listStoredMessages(env, { userId, mailbox, label, max, q }).catch(() => null);
        if (cached?.items?.length) {
          const seen = new Set((listed.items || []).map((item) => clean(item.provider_message_id || messageLabelKeyFromId(item.id).provider_message_id || item.id)).filter(Boolean));
          const cachedOnly = cached.items.filter((item) => {
            const key = clean(item.provider_message_id || messageLabelKeyFromId(item.id).provider_message_id || item.id);
            return key && !seen.has(key);
          });
          if (cachedOnly.length) {
	            return json(await applyMessageLabelState(env, userId, {
	              ...listed,
	              requested_label: label,
	              provider_cache_merge: "citadel",
              items: [...cachedOnly, ...(listed.items || [])].slice(0, max),
            }));
          }
        }
      }
	      return json(await applyMessageLabelState(env, userId, { ...listed, requested_label: label }));
    } catch (error) {
      const fallback = await listStoredMessages(env, { userId, mailbox, label, max, q });
      return json({
        ...fallback,
        provider_fallback: true,
        provider_warning: error.message || "Citadel inbox read failed; showing cached SkyeMail messages.",
      });
    }
  }
	  return json(await applyMessageLabelState(env, userId, { ...await listStoredMessages(env, { userId, mailbox, label, max, q }), requested_label: label }));
}

async function handleGmailLabels(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const context = await resolveMailboxContext(env, request, auth);
  const mailbox = context.mailbox;
  const userId = context.userId;
  if (!mailbox) return json({ ok: true, items: [] });
  const providerRefresh = ["1", "true", "provider"].includes(clean(url.searchParams.get("refresh") || url.searchParams.get("source")).toLowerCase());
  if (providerRefresh && mailbox.provider === "zoho" && zohoApiConfigured(env)) {
    const folders = await zohoListFolders(env, mailbox.provider_account_id).catch(() => null);
    if (folders?.items) return json({ ok: true, mailbox: mailbox.mailbox_email || "", items: folders.items });
  }
  const cacheKey = `gmail-labels:${userId}:${stableHex(mailbox.mailbox_email || "", 12)}`;
  const cached = !providerRefresh ? cacheGet(cacheKey) : null;
  if (cached) return json({ ...cached, cached: true, cache_ttl_seconds: 30 });
  const rows = await Promise.race([
    query(env, `
      select
        count(*) filter (where direction <> 'sent')::int as inbox_total,
        count(*) filter (where direction = 'sent')::int as sent_total
      from messages
      where user_id=$1
    `, [userId]),
    timeoutAfter(2500, () => [{ inbox_total: 0, sent_total: 0, timed_out: true }]),
  ]);
  const counts = rows[0] || {};
  const body = {
    ok: true,
    mailbox: mailbox.mailbox_email || "",
    provider_cache: "citadel-database",
    provider_note: providerRefresh
      ? "SkyeMail labels are served from the SkyeMail cache because provider label refresh was unavailable."
      : "Labels are served from the SkyeMail cache to keep mailbox navigation responsive under load.",
    count_timeout: counts.timed_out === true,
    items: [
      { id: "INBOX", name: "Inbox", type: "system", messagesTotal: Number(counts.inbox_total || 0), messagesUnread: 0 },
      { id: "SENT", name: "Sent", type: "system", messagesTotal: Number(counts.sent_total || 0), messagesUnread: 0 },
      { id: "DRAFT", name: "Drafts", type: "system", messagesTotal: 0, messagesUnread: 0 },
      { id: "SPAM", name: "Spam", type: "system", messagesTotal: 0, messagesUnread: 0 },
      { id: "TRASH", name: "Trash", type: "system", messagesTotal: 0, messagesUnread: 0 },
    ],
  };
  if (!providerRefresh) cacheSet(cacheKey, body, 30000);
  return json(body);
}

async function handleGmailGet(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const id = clean(url.searchParams.get("id"));
  if (!id) throw Object.assign(new Error("id required"), { statusCode: 400 });
  const context = await resolveMailboxContext(env, request, auth);
  const mailbox = context.mailbox;
  const userId = context.userId;
  let localRows = [];
  if (isUuid(id)) {
    localRows = await query(env, `
      select id, thread_id, from_name, from_email, key_version, ciphertext_b64, created_at, read_at, starred_at,
             direction, delivery_provider, provider_message_id, delivery_status, recipient_alias, delivered_to
        from messages
       where id=$1 and user_id=$2
       limit 1
    `, [id, userId]);
  } else if (mailbox?.provider === "zoho") {
    const key = messageLabelKeyFromId(id);
    localRows = await query(env, `
      select id, thread_id, from_name, from_email, key_version, ciphertext_b64, created_at, read_at, starred_at,
             direction, delivery_provider, provider_message_id, delivery_status, recipient_alias, delivered_to
        from messages
       where user_id=$1
         and delivery_provider='zoho'
         and provider_message_id=$2
       limit 1
    `, [userId, key.provider_message_id || id]).catch(() => []);
  }
  if (localRows.length) {
    const message = await hydrateStoredMessageDetail(env, localRows[0], mailbox);
    return json({ ok: true, mailbox: mailbox?.mailbox_email || localRows[0]?.delivered_to || "", message });
  }
  if (mailbox?.provider === "zoho" && zohoApiConfigured(env)) {
    return json(await zohoGetMessage(env, {
      id,
      accountId: mailbox.provider_account_id,
      mailbox: mailbox.mailbox_email,
    }).then(async (data) => {
      await cacheZohoMessageDetail(env, { userId, mailbox, message: data.message }).catch(() => null);
      const overlaid = await applyMessageLabelState(env, userId, { items: [data.message] });
      return { ...data, message: overlaid.items[0] || data.message };
    }));
  }
  const rows = localRows;
  if (!rows.length) throw Object.assign(new Error("Message not found."), { statusCode: 404 });
  return json({ ok: true, mailbox: mailbox?.mailbox_email || rows[0]?.delivered_to || "", message: storedMessageDetail(rows[0]) });
}

async function handleGmailThreadGet(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const id = clean(url.searchParams.get("id"));
  if (!id) throw Object.assign(new Error("id required"), { statusCode: 400 });
  const context = await resolveMailboxContext(env, request, auth);
  const mailbox = context.mailbox;
  const userId = context.userId;
  const localRows = await getStoredThreadRows(env, userId, id);
  if (localRows.length) return json(await storedThreadResponse(env, localRows, id, mailbox));
  if (mailbox?.provider === "zoho" && zohoApiConfigured(env)) {
    const data = await zohoGetMessage(env, { id, accountId: mailbox.provider_account_id, mailbox: mailbox.mailbox_email });
    await cacheZohoMessageDetail(env, { userId, mailbox, message: data.message }).catch(() => null);
    const overlaid = await applyMessageLabelState(env, userId, { items: [data.message] });
    const message = overlaid.items[0] || data.message;
    const participants = Array.from(new Set([message.headers.from, message.headers.to, message.headers.cc].filter(Boolean)));
    return json({
      ok: true,
      mailbox: mailbox.mailbox_email || "",
      thread: {
        id: message.thread_id || message.id,
        history_id: null,
        message_count: 1,
        subject: message.headers.subject || "(no subject)",
        participants,
        messages: [message],
      },
    });
  }
  const rows = localRows;
  if (!rows.length) throw Object.assign(new Error("Thread not found."), { statusCode: 404 });
  return json(await storedThreadResponse(env, rows, id, mailbox));
}

async function handleMailProofLoop(request, env, ctx) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const context = await resolveMailboxContext(env, request, auth, body);
  const users = await query(env, "select id, handle, email from users where id=$1 limit 1", [context.userId]);
  if (!users.length) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  const user = users[0];
  const mailbox = context.mailbox || await getHostedMailbox(env, user.id);
  if (!mailbox) throw Object.assign(new Error("Provision a mailbox before running proof mail."), { statusCode: 400 });
  const stamp = new Date().toISOString();
  const subject = clean(body.subject) || `SkyeMail E2E proof ${stamp}`;
  const sentTo = clean(body.to) || mailbox.mailbox_email;
  const aliasRows = await query(env, `
    select alias_email, alias_type
      from mailbox_aliases
     where user_id=$1
       and mailbox_id=$2
       and lower(alias_email)=lower($3)
       and status='active'
     limit 1
  `, [user.id, mailbox.id, sentTo]);
  const sameMailboxRoute = aliasRows[0] || (sentTo.toLowerCase() === mailbox.mailbox_email.toLowerCase()
    ? { alias_email: mailbox.mailbox_email, alias_type: "primary" }
    : null);
  const deliveredAlias = sameMailboxRoute?.alias_email || mailbox.mailbox_email;
  const sentPayload = {
    subject,
    message: clean(body.message) || "Outbound proof from SkyeMail compose lane into the same workspace inbox route.",
    direction: "sent",
    from: mailbox.mailbox_email,
    to: [sentTo],
    proof_at: stamp,
  };
  const inboundPayload = {
    subject: `Re: ${subject}`,
    message: "Inbound proof received through the SkyeMail alias route and stored in the inbox.",
    direction: "inbound",
    from: sentTo,
    to: [deliveredAlias],
    delivered_to: deliveredAlias,
    recipient_alias: deliveredAlias,
    proof_at: stamp,
  };
  const sentRows = await query(env, `
    insert into messages(user_id, from_name, from_email, key_version, encrypted_key_b64, iv_b64, ciphertext_b64,
      direction, delivery_provider, provider_message_id, delivery_status, last_delivery_event_at)
    values($1,$2,$3,0,$4,$5,$6,'sent','skymail-proof',$7,'sent',now())
    returning id, created_at
  `, [user.id, `To: ${sentTo}`, sentTo, "proof", "proof", proofBlob(sentPayload), `proof-sent-${crypto.randomUUID()}`]);
  const inboundRows = await query(env, `
    insert into messages(user_id, from_name, from_email, key_version, encrypted_key_b64, iv_b64, ciphertext_b64,
      direction, delivery_provider, provider_message_id, delivery_status, last_delivery_event_at, recipient_alias, delivered_to)
    values($1,$2,$3,0,$4,$5,$6,'inbound','skymail-proof',$7,'received',now(),$8,$9)
    returning id, created_at
  `, [user.id, sentTo, sentTo, "proof", "proof", proofBlob(inboundPayload), `proof-inbound-${crypto.randomUUID()}`, deliveredAlias, deliveredAlias]);
  const aliasDelivery = {
    requested_to: sentTo,
    delivered_alias: deliveredAlias,
    same_mailbox: Boolean(sameMailboxRoute),
    alias_type: sameMailboxRoute?.alias_type || (deliveredAlias === mailbox.mailbox_email ? "primary" : null),
  };
  const event = { type: "skymail.mail.proof_loop", actor: user.email, org_id: auth.fs27_customer_id || null, ws_id: mailbox.id, meta: { sent_message_id: sentRows[0].id, inbound_message_id: inboundRows[0].id, mailbox_email: mailbox.mailbox_email, alias_delivery: aliasDelivery } };
  ctx.waitUntil(mirrorFs27(env, event));
  ctx.waitUntil(backupCitadel(env, { ...event, id: `proof_loop_${inboundRows[0].id}` }));
  return json({ ok: true, mailbox, alias_delivery: aliasDelivery, sent: sentRows[0], received: inboundRows[0] });
}

async function handleWorkspaceProvision(request, env, ctx) {
  const service = await serviceAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const domain = clean(body.domain) || configuredDomains(env)[0];
  const { local, email: mailboxEmail } = validateMailboxInput(env, mailboxLocalFromWorkspace(body), domain);
  const ownerEmail = body.owner_email || body.email || body.approval_email;
  const user = await ensureServiceUser(env, {
    email: ownerEmail,
    handleSeed: body.workspace_slug || body.slug || body.company_name || local,
    sourceId: body.workspace_id || body.customer_id || body.source_id,
  });
  const workspaceId = clean(body.workspace_id || body.workspace || user.workspace_id || "");
  const skymailId = clean(user.skymail_id || body.skymail_id || makeSkyeMailId({ email: user.email, handle: user.handle, fs27Sub: service.claims?.sub || "" }));
  const fs27GateCardId = clean(body.fs27_gate_card_id || service.claims?.gate_card_id || service.claims?.gate_card?.id || "");
  const provider = providerConfigured(env);
  let provisioned = {
    provider: provider.provider,
    provider_account_id: null,
    provider_payload: { skipped: true, reason: "Hosted mailbox provider is not configured." },
    mailbox_password_once: null,
    credential_note: null,
  };
  let status = "pending";
  let provisioningStatus = "missing-provider-env";
  let lastError = provider.configured ? null : providerSetupMessage(provider.provider);
  if (provider.configured) {
    try {
      provisioned = await provisionMailbox(env, {
        email: mailboxEmail,
        localPart: local,
        domain,
        user,
        fs27: { customer_id: body.customer_id || null },
        allowLocalRoute: Boolean(body.allow_unroutable_local_route || body.allowUnroutableLocalRoute || body.dev_local_route || body.devLocalRoute)
      });
      if (provisioned.provider === "skymail-local-route") throw localOnlyMailboxError("Workspace provisioning returned an internal local route instead of a receiving mailbox.");
      status = "active";
      provisioningStatus = "provisioned";
    } catch (error) {
      status = "error";
      provisioningStatus = "provider-error";
      lastError = error.message || "Provider provisioning failed.";
      provisioned.provider_payload = { error: lastError, provider_response: error.providerResponse || null };
    }
  }
  const rows = await query(env, `
    insert into hosted_mailboxes(
      user_id, mailbox_email, local_part, domain, provider, provider_account_id,
      workspace_id, skymail_id, fs27_gate_card_id,
      status, provisioning_status, provider_payload_json, imap_host, smtp_host, jmap_url,
      last_error, provisioned_at, updated_at
    )
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16,case when $11='provisioned' then now() else null end,now())
    on conflict (mailbox_email)
    do update set
      user_id=excluded.user_id,
      provider=excluded.provider,
      provider_account_id=excluded.provider_account_id,
      workspace_id=coalesce(excluded.workspace_id, hosted_mailboxes.workspace_id),
      skymail_id=coalesce(excluded.skymail_id, hosted_mailboxes.skymail_id),
      fs27_gate_card_id=coalesce(excluded.fs27_gate_card_id, hosted_mailboxes.fs27_gate_card_id),
      status=excluded.status,
      provisioning_status=excluded.provisioning_status,
      provider_payload_json=excluded.provider_payload_json,
      imap_host=excluded.imap_host,
      smtp_host=excluded.smtp_host,
      jmap_url=excluded.jmap_url,
      last_error=excluded.last_error,
      provisioned_at=coalesce(hosted_mailboxes.provisioned_at, excluded.provisioned_at),
      updated_at=now()
    returning *
  `, [user.id, mailboxEmail, local, domain, provisioned.provider, provisioned.provider_account_id, workspaceId || null, skymailId || null, fs27GateCardId || null, status, provisioningStatus, JSON.stringify(provisioned.provider_payload || {}), env.SKYMAIL_IMAP_HOST || null, env.SKYMAIL_SMTP_HOST || null, env.SKYMAIL_JMAP_URL || null, lastError]);
  const mailbox = rows[0];
  ctx.waitUntil(linkFs27AppSpine(env, {
    ...(service.claims || {}),
    email: user.email,
    customer_id: body.customer_id || service.claims?.customer_id || service.claims?.org || null,
  }, {
    ...user,
    skymail_id: skymailId,
    workspace_id: workspaceId || mailbox.workspace_id || null,
    fs27_gate_card_id: fs27GateCardId || null,
  }, {
    token: service.token || "",
    mailbox_email: mailbox.mailbox_email,
  }).catch(() => null));
  const primaryAlias = await saveMailboxAlias(env, {
    userId: user.id,
    mailboxId: mailbox.id,
    aliasEmail: mailbox.mailbox_email,
    aliasType: "primary",
    displayName: user.handle,
    providerPayload: { source: "cloudflare-workspace-provision", workspace_id: body.workspace_id || null },
  }).catch(() => null);
  const keyState = await activeKeyState(env, user.id);
  const keyCard = await issueWorkspaceKeyCard(env, { user, mailbox, body, keyState });
  const event = {
    type: "skymail.workspace.mailbox_provisioned",
    actor: user.email,
    org_id: body.customer_id || null,
    ws_id: body.workspace_id || mailbox.id,
    meta: { workspace_id: body.workspace_id || null, mailbox_email: mailbox.mailbox_email, primary_alias: primaryAlias?.alias_email || null, provider: mailbox.provider, provisioning_status: mailbox.provisioning_status, key_state: keyState, key_card_id: keyCard.id || null, key_card_mdp_status: keyCard.mdp_status },
  };
  ctx.waitUntil(mirrorFs27(env, event));
  ctx.waitUntil(backupCitadel(env, { ...event, id: `workspace_mailbox_${body.workspace_id || mailbox.id}` }));
  return json({
    ok: provisioningStatus !== "provider-error",
    user,
    mailbox,
    workspace_id: body.workspace_id || null,
    customer_id: body.customer_id || null,
    skymail_url: env.SKYMAIL_PUBLIC_URL || "https://skyemail-platform.graylondonskyes.workers.dev",
    inbox_ready: mailbox.status === "active" && keyState.active,
    provider_ready: provider.configured,
    key_state: keyState,
    key_card: keyCard,
    next_steps: [
      ...(provider.configured ? [] : [providerSetupMessage(provider.provider)]),
      ...(keyState.active ? [] : ["Client must complete SkyeMail sovereign key setup on first login before encrypted inbound mail can populate the inbox."]),
      ...(keyCard.mdp_status === "not_configured" ? ["Configure MDP_KEYCARD_WEBHOOK_URL or MCP_KEYCARD_WEBHOOK_URL if you want a rendered key-card/resume artifact sent to your MDP server."] : []),
    ],
    credentials_issued: Boolean(provisioned.mailbox_password_once),
    credential_note: provisioned.credential_note || null,
    mailbox_password_once: provisioned.mailbox_password_once || null,
  }, provisioningStatus === "provider-error" ? 502 : 200);
}

async function handleWorkspaceMailboxSummary(request, env) {
  await serviceAuth(request, env);
  const url = new URL(request.url);
  const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
  const mailboxEmail = clean(body.mailbox_email || body.email || url.searchParams.get("mailbox_email") || url.searchParams.get("email")).toLowerCase();
  const workspaceId = clean(body.workspace_id || body.workspace || url.searchParams.get("workspace_id") || url.searchParams.get("workspace"));
  const ownerEmail = clean(body.owner_email || url.searchParams.get("owner_email")).toLowerCase();
  if (!mailboxEmail && !workspaceId && !ownerEmail) {
    throw Object.assign(new Error("mailbox_email, owner_email, or workspace_id is required."), { statusCode: 400 });
  }
  const rows = await query(env, `
    select hm.*, u.email as owner_email, u.handle as owner_handle, u.workspace_id as owner_workspace_id
      from hosted_mailboxes hm
      join users u on u.id=hm.user_id
     where hm.status not in ('released','offboarded','disabled')
       and (
         ($1 <> '' and lower(hm.mailbox_email)=lower($1))
         or ($2 <> '' and (hm.workspace_id=$2 or u.workspace_id=$2 or lower(u.handle)=lower($2)))
         or ($3 <> '' and lower(u.email)=lower($3))
       )
     order by hm.updated_at desc nulls last, hm.created_at desc
     limit 1
  `, [mailboxEmail, workspaceId, ownerEmail]);
  if (!rows.length) throw Object.assign(new Error("SkyeMail workspace mailbox not found."), { statusCode: 404 });
  const mailbox = rows[0];
  const [countsRows, aliasRows, recentRows] = await Promise.all([
    query(env, `
      select
        count(*)::int as total,
        count(*) filter (where direction <> 'sent')::int as inbox_total,
        count(*) filter (where direction = 'sent')::int as sent_total,
        count(*) filter (where direction <> 'sent' and read_at is null)::int as inbox_unread
      from messages
      where user_id=$1
    `, [mailbox.user_id]),
    query(env, `
      select alias_email, alias_type, status
        from mailbox_aliases
       where user_id=$1 and mailbox_id=$2
       order by created_at desc
       limit 12
    `, [mailbox.user_id, mailbox.id]),
    query(env, `
      select id, thread_id, from_name, from_email, key_version, ciphertext_b64, created_at, read_at,
             direction, delivery_provider, provider_message_id, delivery_status, recipient_alias, delivered_to
        from messages
       where user_id=$1
       order by created_at desc
       limit 10
    `, [mailbox.user_id])
  ]);
  const keyState = await activeKeyState(env, mailbox.user_id);
  const counts = countsRows[0] || {};
  return json({
    ok: true,
    mailbox: {
      id: mailbox.id,
      mailbox_email: mailbox.mailbox_email,
      workspace_id: mailbox.workspace_id || mailbox.owner_workspace_id || "",
      skymail_id: mailbox.skymail_id || "",
      provider: mailbox.provider,
      status: mailbox.status,
      provisioning_status: mailbox.provisioning_status,
      domain: mailbox.domain,
      local_part: mailbox.local_part,
      owner_email: mailbox.owner_email,
      owner_handle: mailbox.owner_handle,
      updated_at: mailbox.updated_at,
      provisioned_at: mailbox.provisioned_at
    },
    key_state: keyState,
    counts: {
      total: Number(counts.total || 0),
      inbox_total: Number(counts.inbox_total || 0),
      inbox_unread: Number(counts.inbox_unread || 0),
      sent_total: Number(counts.sent_total || 0)
    },
    labels: [
      { id: "INBOX", name: "Inbox", messagesTotal: Number(counts.inbox_total || 0), messagesUnread: Number(counts.inbox_unread || 0) },
      { id: "SENT", name: "Sent", messagesTotal: Number(counts.sent_total || 0), messagesUnread: 0 }
    ],
    aliases: aliasRows.map((row) => ({ alias_email: row.alias_email, alias_type: row.alias_type, status: row.status })),
    recent_messages: recentRows.map((row) => messageSummary(row, mailbox.mailbox_email)),
    synced_at: new Date().toISOString(),
    route: "/workspace-mailbox-summary"
  });
}

async function resendSend(env, payload) {
  const apiKey = resendApiKey(env);
  if (!apiKey) throw Object.assign(new Error("Mail API token is missing."), { statusCode: 501 });
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) throw Object.assign(new Error(data?.message || data?.error || text || `Mail lane failed (${res.status}).`), { statusCode: res.status });
  return data;
}

async function handleMailSend(request, env, ctx) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const context = await resolveMailboxContext(env, request, auth, body);
  const selectedAuth = context.auth;
  const userId = context.userId;
  const to = clean(body.to);
  const toList = addressList(to);
  const ccList = addressList(body.cc);
  const bccList = addressList(body.bcc);
  const subject = clean(body.subject);
  const message = String(body.message || body.text || "");
  const htmlBody = String(body.html || "");
  const replyMessageId = clean(body.reply_message_id || body.replyMessageId || "");
  const replyThreadId = clean(body.reply_thread_id || body.replyThreadId || body.thread_id || body.threadId || "");
  if (!toList.length || toList.some((item) => !item.includes("@"))) throw Object.assign(new Error("Valid recipient email required."), { statusCode: 400 });
  if (!subject) throw Object.assign(new Error("Subject required."), { statusCode: 400 });
  if (!message.trim() && !htmlBody.trim()) throw Object.assign(new Error("Message body required."), { statusCode: 400 });
  const users = await query(env, "select id, handle, email from users where id=$1 limit 1", [userId]);
  if (!users.length) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  const user = users[0];
  let hosted = context.mailbox || await getHostedMailbox(env, user.id);
  hosted = await ensureProviderBackedMailbox(env, { auth: { ...selectedAuth, email: user.email }, user, mailbox: hosted, source: "mail-send-self-heal" });
  if (!hosted) {
    throw Object.assign(new Error("This SkyeMail account does not have a sovereign hosted mailbox yet, so sending is blocked to prevent reply bounces. Open mailbox status or reprovision the mailbox to create the SkyeMail receiving route."), { statusCode: 409 });
  }
  if (hosted?.provider === "skymail-local-route") {
    throw Object.assign(new Error("This SkyeMail address is not sovereign-backed for inbound mail yet, so sending from it is blocked to prevent Gmail reply bounces. Open mailbox status or reprovision the mailbox to create the SkyeMail receiving route."), { statusCode: 409 });
  }
  const requestedFrom = normalizeEmail(body.from_alias || body.from || "");
  let fromEmail = hosted?.mailbox_email || `${user.handle}@${env.INBOUND_DOMAIN || configuredDomains(env)[0]}`;
  if (requestedFrom && hosted) {
    const aliases = await listMailboxAliases(env, user.id, hosted.id).catch(() => []);
    const allowedAlias = aliases.find((item) => normalizeEmail(item.alias_email) === requestedFrom) || (normalizeEmail(hosted.mailbox_email) === requestedFrom ? { alias_email: hosted.mailbox_email, alias_type: "primary", provider_alias_id: hosted.provider_account_id } : null);
    const providerBacked = !allowedAlias || allowedAlias.alias_type === "primary" || Boolean(allowedAlias.provider_alias_id);
    if (allowedAlias && !providerBacked) {
      throw Object.assign(new Error(`The alias ${requestedFrom} is saved in SkyeEmail but is not sovereign-backed for inbound replies yet. Recreate it in Settings so SkyeMail confirms the receiving alias before sending.`), { statusCode: 409 });
    }
    if (allowedAlias) fromEmail = requestedFrom;
  }
  const replyToEmail = fromEmail;
  const allOutboundRecipients = [...toList, ...ccList, ...bccList].map(normalizeEmail).filter(Boolean);
  const zohoSelfSendRequiresZoho = hosted?.provider === "zoho"
    && normalizeEmail(fromEmail)
    && allOutboundRecipients.some((recipient) => recipient === normalizeEmail(fromEmail));
  const html = htmlBody || `<div style="font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.6">${message.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]))}</div>`;
  const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 10).map((item) => ({
    filename: clean(item.filename || "attachment"),
    content: clean(item.data_b64 || item.content || ""),
    content_type: clean(item.mime_type || item.content_type || "application/octet-stream"),
  })).filter((item) => item.filename && item.content) : [];
  let provider = "resend";
  let sent = null;
  if (hosted?.provider === "zoho" && zohoApiConfigured(env)) {
    provider = "zoho";
    try {
      sent = await zohoSendMail(env, {
        accountId: hosted.provider_account_id,
        fromAddress: fromEmail,
        to: toList,
        cc: ccList,
        bcc: bccList,
        replyTo: replyToEmail,
        subject,
        html,
        text: message,
        replyMessageId,
        threadId: replyThreadId,
        attachments,
      });
    } catch (error) {
      const attachmentDenied = attachments.length && /access\s+denied/i.test(String(error.message || ""));
      if (!attachmentDenied || !resendApiKey(env) || zohoSelfSendRequiresZoho) {
        if (attachmentDenied && zohoSelfSendRequiresZoho) {
          throw Object.assign(new Error("SkyeMail attachment send was denied for this same-mailbox proof. SkyeMail kept the proof on the Citadel Database and SkyeNet lane because self-send readiness must prove SkyeMail inbox parity."), {
            statusCode: error.statusCode || 502,
            providerResponse: error.providerResponse || null,
          });
        }
        throw error;
      }
      provider = "resend";
      sent = await resendSend(env, {
        from: `${env.MAIL_FROM_FALLBACK_NAME || "SkyeMail"} <${fromEmail}>`,
        to: toList,
        cc: ccList.length ? ccList : undefined,
        bcc: bccList.length ? bccList : undefined,
        subject,
        html,
        text: message || stripHtml(html),
        replyTo: replyToEmail,
        attachments,
        headers: replyMessageId ? { "In-Reply-To": replyMessageId, "References": replyThreadId || replyMessageId } : undefined,
      });
    }
  } else {
    try {
      sent = await resendSend(env, {
        from: `${env.MAIL_FROM_FALLBACK_NAME || "SkyeMail"} <${fromEmail}>`,
        to: toList,
        cc: ccList.length ? ccList : undefined,
        bcc: bccList.length ? bccList : undefined,
        subject,
        html,
        text: message || stripHtml(html),
        replyTo: replyToEmail,
        attachments: attachments.length ? attachments : undefined,
        headers: replyMessageId ? { "In-Reply-To": replyMessageId, "References": replyThreadId || replyMessageId } : undefined,
      });
    } catch (error) {
      if (String(error.message || "").includes("RESEND_API_KEY")) {
        provider = "skymail-local-route";
        sent = { id: `local-sent-${crypto.randomUUID()}`, skipped_provider: true, reason: error.message };
      } else {
        throw error;
      }
    }
  }
  const stored = await query(env, `
    insert into messages(user_id, from_name, from_email, key_version, encrypted_key_b64, iv_b64, ciphertext_b64,
      direction, delivery_provider, provider_message_id, delivery_status, last_delivery_event_at)
    values($1,$2,$3,0,$4,$5,$6,'sent',$7,$8,'sent',now())
    returning id, created_at
  `, [
    user.id,
    `To: ${toList.join(", ")}`,
    toList.join(", "),
    "proof",
    "proof",
    proofBlob({ subject, message: message || stripHtml(html), html, direction: "sent", from: fromEmail, reply_to: replyToEmail, to: toList, cc: ccList, bcc: bccList, provider, provider_message_id: sent?.id || null, reply_message_id: replyMessageId, reply_thread_id: replyThreadId, attachment_count: attachments.length }),
    provider,
    sent?.id || null,
  ]);
  const event = { type: "skymail.mail.sent", actor: user.email, org_id: auth.fs27_customer_id || null, ws_id: hosted?.id || user.id, meta: { from: fromEmail, reply_to: replyToEmail, to: toList, cc: ccList, bcc: bccList, subject, provider, provider_message_id: sent?.id || null, message_id: stored[0]?.id || null, reply_message_id: replyMessageId || null, reply_thread_id: replyThreadId || null } };
  ctx.waitUntil(mirrorFs27(env, event));
  ctx.waitUntil(backupCitadel(env, { ...event, id: `sent_${sent?.id || crypto.randomUUID()}` }));
  return json({ ok: true, resend_id: provider === "resend" ? sent?.id || null : null, zoho_id: provider === "zoho" ? sent?.id || null : null, provider, message_id: stored[0]?.id || null, from: fromEmail, reply_to: replyToEmail, to: toList, cc: ccList, bcc: bccList, reply_message_id: replyMessageId || null, reply_thread_id: replyThreadId || null });
}

async function handleMailModify(request, env, ctx) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const context = await resolveMailboxContext(env, request, auth, body);
  const userId = context.userId;
  const mailbox = context.mailbox || await getHostedMailbox(env, userId).catch(() => null);
  const ids = Array.isArray(body.ids) ? body.ids : [body.id, body.message_id, body.messageId].filter(Boolean);
  if (!ids.length) throw Object.assign(new Error("Message id required."), { statusCode: 400 });
  const add = (body.addLabelIds || body.add_labels || []).map((item) => clean(item).toUpperCase());
  const remove = (body.removeLabelIds || body.remove_labels || []).map((item) => clean(item).toUpperCase());
  const markRead = remove.includes("UNREAD") || body.read === true;
  const markUnread = add.includes("UNREAD") || body.unread === true;
  const archive = remove.includes("INBOX") || body.archive === true;
  const trash = add.includes("TRASH") || body.trash === true;
  const starred = add.includes("STARRED") ? true : (remove.includes("STARRED") ? false : null);
  const zohoRefs = await resolveZohoMessageRefs(env, { ids, userId, mailbox }).catch((error) => {
    throw Object.assign(new Error(error.message || "SkyeMail message lookup failed."), { statusCode: error.statusCode || 502 });
  });
  const unresolvedZohoIds = ids.filter((id) => String(id || "").startsWith("zoho:") && !zohoRefs.some((ref) => ref.input_id === clean(id)));
  if (unresolvedZohoIds.length) throw Object.assign(new Error("SkyeMail message id could not be resolved for mail-state mutation."), { statusCode: 400 });
  const providerMutations = zohoRefs.length
    ? await mutateZohoMessageRefs(env, { refs: zohoRefs, markRead, markUnread, archive, trash, starred })
    : [];
  const states = [];
  for (const id of ids) {
    const key = messageLabelKeyFromId(id);
    states.push(await saveMessageLabelState(env, { userId, id, starred, markRead, markUnread, trash, archive }));
    if (key.message_id) {
      if (markRead) await query(env, "update messages set read_at=coalesce(read_at, now()) where id=$1 and user_id=$2", [key.message_id, userId]).catch(() => null);
      if (markUnread) await query(env, "update messages set read_at=null where id=$1 and user_id=$2", [key.message_id, userId]).catch(() => null);
      if (trash) await query(env, "update messages set delivery_status='trashed' where id=$1 and user_id=$2", [key.message_id, userId]).catch(() => null);
      if (archive) await query(env, "update messages set delivery_status='archived' where id=$1 and user_id=$2", [key.message_id, userId]).catch(() => null);
    } else if (key.provider_message_id) {
      if (markRead) await query(env, "update messages set read_at=coalesce(read_at, now()) where user_id=$1 and delivery_provider=$2 and provider_message_id=$3", [userId, key.provider, key.provider_message_id]).catch(() => null);
      if (markUnread) await query(env, "update messages set read_at=null where user_id=$1 and delivery_provider=$2 and provider_message_id=$3", [userId, key.provider, key.provider_message_id]).catch(() => null);
      if (trash) await query(env, "update messages set delivery_status='trashed' where user_id=$1 and delivery_provider=$2 and provider_message_id=$3", [userId, key.provider, key.provider_message_id]).catch(() => null);
      if (archive) await query(env, "update messages set delivery_status='archived' where user_id=$1 and delivery_provider=$2 and provider_message_id=$3", [userId, key.provider, key.provider_message_id]).catch(() => null);
    }
  }
  ctx?.waitUntil?.(backupCitadel(env, {
    id: `mail_mutation_${userId}_${Date.now()}`,
    type: "skymail.mail.mutation",
    actor: auth.email || "skymail",
    ws_id: mailbox?.id || userId,
    meta: {
      ids,
      applied: { markRead, markUnread, trash, archive, starred },
      provider: zohoRefs.length ? "zoho" : "local",
      provider_mutation_count: providerMutations.filter((item) => !item.skipped).length,
      provider_warning_count: providerMutations.filter((item) => item.skipped || item.accepted === false).length,
    },
  }));
  return json({
    ok: true,
    ids,
    applied: { markRead, markUnread, trash, archive, starred },
    states: states.map((state) => state?.error ? { error: state.error } : { provider: state?.provider || null, provider_message_id: state?.provider_message_id || null, starred: Boolean(state?.starred_at) }),
    provider_mutation: zohoRefs.length ? "zoho+citadel-ledger" : "local-ledger",
    provider_results: providerMutations.map((item) => ({
      accountId: item.accountId,
      mode: item.mode,
      accepted: item.accepted !== false && !item.skipped,
      warning: item.warning || null,
    })),
  });
}

async function handleMailTrash(request, env, ctx) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const url = new URL(request.url);
  const context = await resolveMailboxContext(env, request, auth, body);
  const userId = context.userId;
  const mailbox = context.mailbox || await getHostedMailbox(env, userId).catch(() => null);
  const ids = (Array.isArray(body.ids) ? body.ids : [body.id || body.message_id || body.messageId || url.searchParams.get("id")]).map(clean).filter(Boolean);
  if (!ids.length) throw Object.assign(new Error("Message id required."), { statusCode: 400 });
  const action = clean(body.action || url.searchParams.get("action") || "trash").toLowerCase();
  if (!["trash", "untrash"].includes(action)) throw Object.assign(new Error("Invalid message trash action."), { statusCode: 400 });
  const trash = action === "trash";
  const zohoRefs = await resolveZohoMessageRefs(env, { ids, userId, mailbox });
  const unresolvedZohoIds = ids.filter((id) => String(id || "").startsWith("zoho:") && !zohoRefs.some((ref) => ref.input_id === clean(id)));
  if (unresolvedZohoIds.length) throw Object.assign(new Error("SkyeMail message id could not be resolved for trash mutation."), { statusCode: 400 });
  const preMutationCache = [];
  if (mailbox?.provider === "zoho" && zohoApiConfigured(env)) {
    for (const ref of zohoRefs) {
      const data = await zohoGetMessage(env, {
        id: zohoUiId(ref.accountId, ref.folderId, ref.messageId),
        accountId: mailbox.provider_account_id,
        mailbox: mailbox.mailbox_email,
      }).catch(() => null);
      if (data?.message) {
        const cachedId = await cacheZohoMessageDetail(env, { userId, mailbox, message: data.message }).catch(() => null);
        if (cachedId) preMutationCache.push(cachedId);
      }
    }
  }
  const providerMutations = zohoRefs.length
    ? await mutateZohoMessageRefs(env, { refs: zohoRefs, trash, untrash: !trash, markRead: trash })
    : [];
  const states = [];
  for (const id of ids) {
    const key = messageLabelKeyFromId(id);
    states.push(await saveMessageLabelState(env, { userId, id, trash, untrash: !trash, markRead: trash }));
    if (key.message_id) {
      if (trash) {
        await query(env, "update messages set delivery_status='trashed', read_at=coalesce(read_at, now()) where id=$1 and user_id=$2", [key.message_id, userId]).catch(() => null);
      } else {
        await query(env, "update messages set delivery_status=case when direction='sent' then 'sent' else null end where id=$1 and user_id=$2", [key.message_id, userId]).catch(() => null);
      }
    } else if (key.provider_message_id) {
      if (trash) {
        await query(env, "update messages set delivery_status='trashed', read_at=coalesce(read_at, now()) where user_id=$1 and delivery_provider=$2 and provider_message_id=$3", [userId, key.provider, key.provider_message_id]).catch(() => null);
      } else {
        await query(env, "update messages set delivery_status=case when direction='sent' then 'sent' else null end where user_id=$1 and delivery_provider=$2 and provider_message_id=$3", [userId, key.provider, key.provider_message_id]).catch(() => null);
      }
    }
  }
  const restoreSync = !trash && zohoRefs.length
    ? await importZohoInboxDeltas(env, context.auth, { limit: 100 }).catch((error) => ({
      ok: false,
      provider_warning: error.message || "Provider restore sync unavailable.",
      imported: 0,
      scanned: 0,
    }))
    : null;
  ctx?.waitUntil?.(backupCitadel(env, {
    id: `mail_trash_${userId}_${Date.now()}`,
    type: "skymail.mail.trash",
    actor: auth.email || "skymail",
    ws_id: mailbox?.id || userId,
    meta: { ids, action, provider: zohoRefs.length ? "zoho" : "local", provider_mutation_count: providerMutations.length, pre_mutation_cached: preMutationCache.length, restore_sync: restoreSync ? { ok: restoreSync.ok, imported: restoreSync.imported, scanned: restoreSync.scanned } : null },
  }));
  return json({ ok: true, ids, count: ids.length, action, provider_mutation: zohoRefs.length ? "zoho+citadel-ledger" : "local-ledger", pre_mutation_cached: preMutationCache.length, restore_sync: restoreSync ? { ok: restoreSync.ok, imported: restoreSync.imported, scanned: restoreSync.scanned, provider_warning: restoreSync.provider_warning || null } : null, states: states.map((state) => state?.error ? { error: state.error } : { provider: state?.provider || null, provider_message_id: state?.provider_message_id || null, trashed: Boolean(state?.trashed_at) }) });
}

async function handleMailBatchDelete(request, env, ctx) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const context = await resolveMailboxContext(env, request, auth, body);
  const userId = context.userId;
  const mailbox = context.mailbox || await getHostedMailbox(env, userId).catch(() => null);
  const ids = (Array.isArray(body.ids) ? body.ids : [body.id, body.message_id, body.messageId]).map(clean).filter(Boolean);
  if (!ids.length) throw Object.assign(new Error("Message id required."), { statusCode: 400 });
  const zohoRefs = await resolveZohoMessageRefs(env, { ids, userId, mailbox });
  const zohoDelete = zohoRefs.length ? await deleteZohoMessageRefs(env, { refs: zohoRefs, expunge: true }) : { deleted: [], skipped: [] };
  if (ids.some((id) => String(id).startsWith("zoho:")) && zohoDelete.deleted.length === 0 && zohoDelete.skipped.length) {
    throw Object.assign(new Error("SkyeMail message folder id missing; open the message from its folder and retry permanent delete."), { statusCode: 400 });
  }
  for (const id of ids) {
    const key = messageLabelKeyFromId(id);
    if (key.message_id) {
      await query(env, "update messages set delivery_status='deleted', read_at=coalesce(read_at, now()) where id=$1 and user_id=$2", [key.message_id, userId]).catch(() => null);
    } else if (key.provider_message_id) {
      await query(env, "update messages set delivery_status='deleted', read_at=coalesce(read_at, now()) where user_id=$1 and delivery_provider=$2 and provider_message_id=$3", [userId, key.provider, key.provider_message_id]).catch(() => null);
    }
  }
  ctx?.waitUntil?.(backupCitadel(env, {
    id: `mail_delete_${userId}_${Date.now()}`,
    type: "skymail.mail.delete",
    actor: auth.email || "skymail",
    ws_id: mailbox?.id || userId,
    meta: { ids, provider: zohoRefs.length ? "zoho" : "local", provider_deleted: zohoDelete.deleted.length, provider_skipped: zohoDelete.skipped.length },
  }));
  return json({ ok: true, ids, provider_mutation: zohoRefs.length ? "zoho+citadel-ledger" : "local-ledger", provider_deleted: zohoDelete.deleted.length, provider_skipped: zohoDelete.skipped });
}

async function handleMailAttachment(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const id = clean(url.searchParams.get("id"));
  const requestedAttachmentId = clean(url.searchParams.get("attachmentId") || url.searchParams.get("attachment_id"));
  const requestedCid = clean(url.searchParams.get("cid")).replace(/^<|>$/g, "");
  const requestedFilename = clean(url.searchParams.get("filename")) || "attachment";
  const inline = ["1", "true", "yes"].includes(clean(url.searchParams.get("inline")).toLowerCase());
  if (!id) throw Object.assign(new Error("Message id required."), { statusCode: 400 });
  const context = await resolveMailboxContext(env, request, auth);
  const mailbox = context.mailbox;
  const userId = context.userId;
  let zohoId = id;
  if (!zohoId.startsWith("zoho:")) {
    const rows = await query(env, `
      select id, thread_id, from_name, from_email, key_version, ciphertext_b64, created_at, read_at, starred_at,
             direction, delivery_provider, provider_message_id, delivery_status, recipient_alias, delivered_to
        from messages
       where id=$1 and user_id=$2
       limit 1
    `, [id, userId]);
    if (!rows.length) throw Object.assign(new Error("Message not found."), { statusCode: 404 });
    zohoId = await findZohoUiIdForStoredRow(env, rows[0], mailbox);
  }
  const parsed = parseZohoUiId(zohoId, await getZohoMailAccountId(env, mailbox?.provider_account_id || null));
  if (!parsed.folderId || !parsed.messageId) throw Object.assign(new Error("SkyeMail message attachment source missing."), { statusCode: 400 });
  const info = await zohoAttachmentInfo(env, parsed);
  const normalizeCid = (value) => {
    const raw = clean(value).replace(/^<|>$/g, "");
    try { return decodeURIComponent(raw).toLowerCase(); } catch { return raw.toLowerCase(); }
  };
  const all = [...info.attachments, ...info.inline];
  const match = all.find((item) => (
    (requestedAttachmentId && clean(item.attachment_id) === requestedAttachmentId)
    || (requestedCid && normalizeCid(item.cid) === normalizeCid(requestedCid))
    || (!requestedAttachmentId && !requestedCid && clean(item.filename) === requestedFilename)
  ));
  const attachmentId = requestedAttachmentId || match?.attachment_id || "";
  if (!attachmentId) throw Object.assign(new Error("Attachment id required."), { statusCode: 400 });
  const contentId = clean(match?.cid || requestedCid);
  const filePath = (inline || match?.inline) && contentId
    ? `/api/accounts/${encodeURIComponent(parsed.accountId)}/folders/${encodeURIComponent(parsed.folderId)}/messages/${encodeURIComponent(parsed.messageId)}/inline?${new URLSearchParams({ contentId, fileName: match?.filename || requestedFilename || "attachment" }).toString()}`
    : `/api/accounts/${encodeURIComponent(parsed.accountId)}/folders/${encodeURIComponent(parsed.folderId)}/messages/${encodeURIComponent(parsed.messageId)}/attachments/${encodeURIComponent(attachmentId)}`;
  const fileRes = await zohoRawFetch(env, filePath, { ignoreBackoff: true });
  const contentType = fileRes.headers.get("content-type") || match?.mime_type || "application/octet-stream";
  const filename = clean(match?.filename || requestedFilename || "attachment").replace(/["\\\r\n]/g, "_");
  const disposition = inline || /^image\//i.test(contentType) ? "inline" : "attachment";
  return new Response(fileRes.body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-disposition": `${disposition}; filename="${filename}"`,
      "cache-control": "private, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
}

async function readZohoWebhookBody(request) {
  const raw = await request.text().catch(() => "");
  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    try {
      return { raw, payload: raw ? JSON.parse(raw) : {} };
    } catch {
      return { raw, payload: { raw } };
    }
  }
  if (contentType.includes("application/x-www-form-urlencoded") || raw.includes("=")) {
    const params = new URLSearchParams(raw);
    const payload = {};
    for (const [key, value] of params.entries()) {
      if (payload[key] == null) payload[key] = value;
      else if (Array.isArray(payload[key])) payload[key].push(value);
      else payload[key] = [payload[key], value];
    }
    return { raw, payload };
  }
  return { raw, payload: raw ? { raw } : {} };
}

function webhookKey(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function collectWebhookStrings(value, out = [], depth = 0) {
  if (value == null || depth > 8) return out;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    out.push(String(value));
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectWebhookStrings(item, out, depth + 1);
    return out;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) collectWebhookStrings(item, out, depth + 1);
  }
  return out;
}

function collectWebhookValuesByKey(value, keys, out = [], depth = 0) {
  if (value == null || depth > 8) return out;
  if (Array.isArray(value)) {
    for (const item of value) collectWebhookValuesByKey(item, keys, out, depth + 1);
    return out;
  }
  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (keys.has(webhookKey(key))) out.push(item);
      collectWebhookValuesByKey(item, keys, out, depth + 1);
    }
  }
  return out;
}

function firstWebhookString(payload, keys) {
  const values = collectWebhookValuesByKey(payload, keys);
  for (const value of values) {
    const found = collectWebhookStrings(value).map(clean).find(Boolean);
    if (found) return found;
  }
  return "";
}

function webhookEmailsFromValue(value) {
  const emails = new Set();
  for (const text of collectWebhookStrings(value)) {
    const extracted = extractAddress(text);
    if (splitEmail(extracted)) emails.add(normalizeEmail(extracted));
    const matches = String(text || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig) || [];
    for (const match of matches) {
      const parsed = splitEmail(match);
      if (parsed) emails.add(parsed.email);
    }
  }
  return Array.from(emails);
}

const ZOHO_WEBHOOK_RECIPIENT_KEYS = new Set([
  "to", "toaddress", "toemail", "recipient", "recipientemail", "recipientaddress", "deliveredto", "mailbox",
  "mailboxemail", "alias", "aliasemail", "rcptto", "envelopeto", "originalrecipient", "forwardedto",
]);
const ZOHO_WEBHOOK_FROM_KEYS = new Set(["from", "fromaddress", "fromemail", "sender", "senderaddress", "senderemail"]);
const ZOHO_WEBHOOK_SUBJECT_KEYS = new Set(["subject", "emailsubject", "mailsubject"]);
const ZOHO_WEBHOOK_BODY_KEYS = new Set(["body", "content", "message", "text", "textbody", "plaintext", "summary", "snippet", "description"]);
const ZOHO_WEBHOOK_HTML_KEYS = new Set(["html", "htmlbody", "bodyhtml"]);
const ZOHO_WEBHOOK_ID_KEYS = new Set(["messageid", "mailid", "emailid", "zohoid", "eventid", "internetmessageid", "rfcmessageid", "id"]);
const ZOHO_WEBHOOK_DATE_KEYS = new Set(["date", "receiveddate", "receivedtime", "timestamp", "createdat", "eventtime"]);

function extractZohoWebhookMessage(payload, raw) {
  const recipientValues = collectWebhookValuesByKey(payload, ZOHO_WEBHOOK_RECIPIENT_KEYS);
  const recipientEmails = new Set();
  for (const value of recipientValues) {
    for (const email of webhookEmailsFromValue(value)) recipientEmails.add(email);
  }
  if (!recipientEmails.size) {
    for (const email of webhookEmailsFromValue(raw || payload)) recipientEmails.add(email);
  }
  const fromRaw = firstWebhookString(payload, ZOHO_WEBHOOK_FROM_KEYS);
  const fromEmail = normalizeEmail(extractAddress(fromRaw));
  const subject = firstWebhookString(payload, ZOHO_WEBHOOK_SUBJECT_KEYS) || "(no subject)";
  const html = firstWebhookString(payload, ZOHO_WEBHOOK_HTML_KEYS);
  const bodyText = firstWebhookString(payload, ZOHO_WEBHOOK_BODY_KEYS) || htmlToText(html || "");
  const rawProviderId = firstWebhookString(payload, ZOHO_WEBHOOK_ID_KEYS);
  const providerMessageId = clean(rawProviderId) || `webhook-${stableHex(raw || JSON.stringify(payload || {}), 24)}`;
  const date = toIsoOrNull(firstWebhookString(payload, ZOHO_WEBHOOK_DATE_KEYS));
  return {
    recipientEmails: Array.from(recipientEmails),
    fromRaw,
    fromEmail: splitEmail(fromEmail) ? fromEmail : "",
    subject,
    html,
    bodyText,
    providerMessageId,
    date,
    hasMessageData: Boolean(clean(rawProviderId) || clean(fromRaw) || clean(subject) !== "(no subject)" || clean(bodyText) || clean(html)),
  };
}

async function zohoWebhookTargetsForAddresses(env, addresses) {
  const emails = Array.from(new Set((addresses || []).map(normalizeEmail).filter((email) => splitEmail(email))));
  if (!emails.length) return [];
  return await query(env, `
    select distinct on (user_id, mailbox_id, recipient_alias)
           user_id, owner_email, fs27_customer_id, mailbox_id, mailbox_email, provider_account_id, recipient_alias
      from (
        select hm.user_id, u.email as owner_email, u.fs27_customer_id, hm.id as mailbox_id,
               hm.mailbox_email, hm.provider_account_id, ma.alias_email as recipient_alias
          from mailbox_aliases ma
          join hosted_mailboxes hm on hm.id=ma.mailbox_id
          join users u on u.id=hm.user_id
         where hm.provider='zoho'
           and hm.status='active'
           and ma.status='active'
           and lower(ma.alias_email)=any($1::text[])
        union all
        select hm.user_id, u.email as owner_email, u.fs27_customer_id, hm.id as mailbox_id,
               hm.mailbox_email, hm.provider_account_id, hm.mailbox_email as recipient_alias
          from hosted_mailboxes hm
          join users u on u.id=hm.user_id
         where hm.provider='zoho'
           and hm.status='active'
           and lower(hm.mailbox_email)=any($1::text[])
      ) matched
     order by user_id, mailbox_id, recipient_alias
     limit 25
  `, [emails]).catch(() => []);
}

async function zohoWebhookTargetsForText(env, text) {
  const lowered = clean(text).toLowerCase();
  if (!lowered) return [];
  return await query(env, `
    select distinct on (user_id, mailbox_id, recipient_alias)
           user_id, owner_email, fs27_customer_id, mailbox_id, mailbox_email, provider_account_id, recipient_alias
      from (
        select hm.user_id, u.email as owner_email, u.fs27_customer_id, hm.id as mailbox_id,
               hm.mailbox_email, hm.provider_account_id, ma.alias_email as recipient_alias
          from mailbox_aliases ma
          join hosted_mailboxes hm on hm.id=ma.mailbox_id
          join users u on u.id=hm.user_id
         where hm.provider='zoho'
           and hm.status='active'
           and ma.status='active'
           and lower($1) like '%' || lower(ma.alias_email) || '%'
        union all
        select hm.user_id, u.email as owner_email, u.fs27_customer_id, hm.id as mailbox_id,
               hm.mailbox_email, hm.provider_account_id, hm.mailbox_email as recipient_alias
          from hosted_mailboxes hm
          join users u on u.id=hm.user_id
         where hm.provider='zoho'
           and hm.status='active'
           and lower($1) like '%' || lower(hm.mailbox_email) || '%'
      ) matched
     order by user_id, mailbox_id, recipient_alias
     limit 25
  `, [lowered]).catch(() => []);
}

function uniqueZohoWebhookTargets(targets) {
  const seen = new Set();
  const unique = [];
  for (const target of targets || []) {
    const key = `${target.user_id}:${target.mailbox_id}:${normalizeEmail(target.recipient_alias || target.mailbox_email)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(target);
  }
  return unique;
}

function displayNameFromEmailHeader(value) {
  const raw = clean(value);
  const match = raw.match(/^"?([^"<]+)"?\s*</);
  return clean(match?.[1]) || raw;
}

async function importZohoWebhookMessage(env, target, mail, payload) {
  const providerMessageId = clean(mail.providerMessageId);
  if (!providerMessageId) return { ok: false, imported: 0, reason: "missing_provider_message_id", user_id: target.user_id };
  const duplicate = await query(env, `
    select id
      from messages
     where user_id=$1
       and delivery_provider in ('zoho','zoho-webhook')
       and provider_message_id=$2
     limit 1
  `, [target.user_id, providerMessageId]).catch(() => []);
  if (duplicate[0]) return { ok: true, duplicate: true, imported: 0, message_id: duplicate[0].id, user_id: target.user_id };
  const deliveredTo = normalizeEmail(target.recipient_alias || target.mailbox_email);
  const fromEmail = mail.fromEmail || normalizeEmail(extractAddress(mail.fromRaw || ""));
  const messageText = clean(mail.bodyText) || htmlToText(mail.html || "") || "SkyeMail webhook delivered this inbound message.";
  const rows = await query(env, `
    insert into messages(user_id, from_name, from_email, key_version, encrypted_key_b64, iv_b64, ciphertext_b64,
      direction, delivery_provider, provider_message_id, delivery_status, last_delivery_event_at, recipient_alias, delivered_to, created_at)
    values($1,$2,$3,0,$4,$5,$6,'inbound','zoho',$7,'received',coalesce($8::timestamptz, now()),$9,$10,coalesce($8::timestamptz, now()))
    returning id
  `, [
    target.user_id,
    displayNameFromEmailHeader(mail.fromRaw || fromEmail || ""),
    fromEmail || mail.fromRaw || "",
    "proof",
    "proof",
    proofBlob({
      subject: mail.subject || "(no subject)",
      message: messageText,
      snippet: messageText.slice(0, 240),
      html: mail.html || "",
      direction: "inbound",
      from: mail.fromRaw || fromEmail || "",
      to: mail.recipientEmails?.length ? mail.recipientEmails : [deliveredTo],
      provider: "zoho",
      source: "zoho-webhook",
      provider_message_id: providerMessageId,
      mailbox_email: target.mailbox_email || null,
      recipient_alias: deliveredTo,
      delivered_to: deliveredTo,
      webhook_at: new Date().toISOString(),
      payload_preview: collectWebhookStrings(payload).join(" ").slice(0, 800),
    }),
    providerMessageId,
    mail.date || null,
    deliveredTo,
    deliveredTo,
  ]).catch((error) => {
    throw Object.assign(new Error(error.message || "SkyeMail routing webhook import failed."), { statusCode: error.statusCode || 500 });
  });
  return { ok: true, imported: 1, message_id: rows[0]?.id || null, user_id: target.user_id, recipient_alias: deliveredTo, provider_message_id: providerMessageId };
}

async function ensureZohoWebhookAuditSchema(env) {
  const schema = schemaName(env);
  await query(env, `
    create table if not exists ${schema}.zoho_webhook_events (
      id uuid primary key default gen_random_uuid(),
      received_at timestamptz not null default now(),
      provider text not null default 'zoho',
      recipient_emails text[] not null default '{}'::text[],
      matched_targets integer not null default 0,
      direct_imported integer not null default 0,
      imported integer not null default 0,
      ignored boolean not null default false,
      ignore_reason text,
      provider_cooldown_json jsonb not null default '{}'::jsonb,
      result_json jsonb not null default '{}'::jsonb,
      payload_json jsonb not null default '{}'::jsonb,
      payload_preview text
    )
  `);
  await query(env, `create index if not exists idx_zoho_webhook_events_received on ${schema}.zoho_webhook_events(received_at desc)`);
}

async function recordZohoWebhookAudit(env, { payload, raw, mail, result }) {
  await ensureZohoWebhookAuditSchema(env);
  const preview = collectWebhookStrings(payload).join(" ").slice(0, 1200) || clean(raw).slice(0, 1200);
  const rows = await query(env, `
    insert into zoho_webhook_events(
      recipient_emails, matched_targets, direct_imported, imported, ignored, ignore_reason,
      provider_cooldown_json, result_json, payload_json, payload_preview
    )
    values($1::text[],$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10)
    returning id, received_at
  `, [
    Array.isArray(mail?.recipientEmails) ? mail.recipientEmails : [],
    Number(result?.matched_targets || 0),
    Number(result?.direct_imported || 0),
    Number(result?.imported || 0),
    Boolean(result?.ignored),
    result?.ignore_reason || null,
    JSON.stringify(result?.provider_cooldown || {}),
    JSON.stringify(result || {}),
    JSON.stringify(payload || {}),
    preview,
  ]);
  return rows[0] || null;
}

async function handleZohoWebhookEventsList(request, env) {
  await ensureZohoWebhookAuditSchema(env);
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 20), 1), 100);
  let serviceScope = false;
  try {
    await serviceAuth(request, env);
    serviceScope = true;
  } catch {
    serviceScope = false;
  }
  let mailboxAddresses = [];
  if (!serviceScope) {
    const auth = await requireAuth(request, env);
    const context = await resolveMailboxContext(env, request, auth);
    const aliases = context.mailbox
      ? await listMailboxAliases(env, context.userId, context.mailbox.id).catch(() => [])
      : [];
    mailboxAddresses = Array.from(new Set([
      context.selected_mailbox_email,
      context.mailbox?.mailbox_email,
      ...aliases.map((row) => row.alias_email),
      ...aliases.map((row) => row.mailbox_email),
    ].map(normalizeEmail).filter(Boolean)));
  }
  const includePayload = serviceScope && ["1", "true", "yes"].includes(clean(url.searchParams.get("include_payload")).toLowerCase());
  if (!serviceScope && !mailboxAddresses.length) {
    return json({
      ok: true,
      visibility: "shared_gate_mailbox_scope",
      mailbox_addresses: [],
      items: [],
      note: "No active mailbox address is available for this shared 0S Gate session.",
    });
  }
  const filter = serviceScope ? "" : "where recipient_emails && $2::text[]";
  const params = serviceScope ? [limit] : [limit, mailboxAddresses];
  const rows = await query(env, `
    select id, received_at, provider, recipient_emails, matched_targets, direct_imported, imported,
           ignored, ignore_reason, provider_cooldown_json, result_json, payload_preview,
           ${includePayload ? "payload_json" : "null::jsonb as payload_json"}
      from zoho_webhook_events
     ${filter}
     order by received_at desc
     limit $1
  `, params);
  return json({
    ok: true,
    visibility: serviceScope ? "service_all_mailboxes" : "shared_gate_mailbox_scope",
    ...(serviceScope ? {} : { mailbox_addresses: mailboxAddresses }),
    items: rows.map((row) => ({
      id: row.id,
      received_at: row.received_at,
      provider: row.provider,
      recipient_emails: row.recipient_emails || [],
      matched_targets: Number(row.matched_targets || 0),
      direct_imported: Number(row.direct_imported || 0),
      imported: Number(row.imported || 0),
      ignored: Boolean(row.ignored),
      ignore_reason: row.ignore_reason || null,
      provider_cooldown: asJsonValue(row.provider_cooldown_json, {}),
      result: asJsonValue(row.result_json, {}),
      payload_preview: row.payload_preview || "",
      ...(includePayload ? { payload: asJsonValue(row.payload_json, {}) } : {}),
    })),
  });
}

async function importZohoInboxDeltas(env, auth, { limit = 25 } = {}) {
  const selectedMailboxEmail = normalizeEmail(auth.selected_mailbox_email || "");
  const mailbox = selectedMailboxEmail
    ? await getHostedMailboxByEmail(env, selectedMailboxEmail)
    : await getHostedMailbox(env, auth.sub);
  if (!mailbox || mailbox.provider !== "zoho" || !zohoApiConfigured(env)) {
    return { ok: true, skipped: true, reason: "No SkyeMail hosted mailbox is available for this account.", imported: 0, mailbox };
  }
  const userId = mailbox.user_id || auth.sub;
  const aliasRows = await listMailboxAliases(env, userId, mailbox.id).catch(() => []);
  const mailboxAddresses = Array.from(new Set([
    mailbox.mailbox_email,
    ...aliasRows.map((row) => row.alias_email),
  ].map(normalizeEmail).filter(Boolean)));
  const listedItems = [];
  for (const address of mailboxAddresses.length ? mailboxAddresses : [mailbox.mailbox_email]) {
    const listed = await zohoListMessages(env, {
      accountId: mailbox.provider_account_id,
      mailbox: address,
      label: "INBOX",
      max: Math.min(Math.max(Number(limit || 25), 1), 100),
    });
    for (const item of listed.items || []) {
      const providerMessageId = clean(item.provider_message_id || item.id);
      if (!providerMessageId || listedItems.some((existing) => clean(existing.provider_message_id || existing.id) === providerMessageId)) continue;
      listedItems.push({ ...item, matched_alias: address });
    }
  }
  let imported = 0;
  for (const item of listedItems) {
    const providerMessageId = clean(item.provider_message_id || item.id);
    if (!providerMessageId) continue;
    const parsedProviderId = parseZohoUiId(item.id || "", mailbox.provider_account_id);
    const existing = await query(env, `
      select id from messages
       where user_id=$1
         and delivery_provider='zoho'
         and provider_message_id=$2
       limit 1
    `, [userId, providerMessageId]).catch(() => []);
    const proof = proofBlob({
      subject: item.subject || "(no subject)",
      message: item.snippet || "SkyeMail inbox message imported into SkyeMail.",
      snippet: item.snippet || "",
      direction: "inbound",
      from: item.from || "",
      to: [item.to || mailbox.mailbox_email],
      provider: "zoho",
      provider_ui_id: item.id || "",
      provider_folder_id: parsedProviderId.folderId || "",
      provider_message_id: providerMessageId,
      has_attachments: Boolean(item.has_attachments),
      imported_at: new Date().toISOString(),
    });
    if (existing[0]) {
      await query(env, `
        update messages
           set delivery_status='received',
               last_delivery_event_at=now(),
               recipient_alias=coalesce(recipient_alias,$4),
               delivered_to=coalesce(delivered_to,$5),
               ciphertext_b64=$6
         where id=$1
           and user_id=$2
           and delivery_provider='zoho'
           and provider_message_id=$3
           and direction <> 'sent'
           and coalesce(delivery_status,'') <> 'deleted'
      `, [existing[0].id, userId, providerMessageId, item.matched_alias || mailbox.mailbox_email, item.matched_alias || mailbox.mailbox_email, proof]).catch(() => null);
      continue;
    }
    await query(env, `
      insert into messages(user_id, from_name, from_email, key_version, encrypted_key_b64, iv_b64, ciphertext_b64,
        direction, delivery_provider, provider_message_id, delivery_status, last_delivery_event_at, recipient_alias, delivered_to)
      values($1,$2,$3,0,$4,$5,$6,'inbound','zoho',$7,'received',now(),$8,$9)
    `, [
      userId,
      item.from || "",
      item.from || "",
      "proof",
      "proof",
      proof,
      providerMessageId,
      item.matched_alias || mailbox.mailbox_email,
      item.matched_alias || mailbox.mailbox_email,
    ]).catch(() => null);
    imported += 1;
  }
  return { ok: true, mailbox, imported, scanned: listedItems.length, synced_aliases: mailboxAddresses, provider: "zoho" };
}

async function handleMailSync(request, env, ctx) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
  const context = await resolveMailboxContext(env, request, auth, body);
  const syncAuth = context.auth;
  const result = await importZohoInboxDeltas(env, syncAuth, { limit: body.limit || url.searchParams.get("limit") || 25 }).catch((error) => ({
    ok: true,
    provider_fallback: true,
    provider_warning: error.message || "Provider sync unavailable.",
    imported: 0,
    scanned: 0,
    provider: "zoho",
  }));
  const event = { type: "skymail.mail.sync", actor: auth.email || auth.sub, org_id: auth.fs27_customer_id || null, ws_id: result.mailbox?.id || syncAuth.sub, meta: result };
  ctx.waitUntil(mirrorFs27(env, event));
  ctx.waitUntil(backupCitadel(env, { ...event, id: `sync_${Date.now()}` }));
  return json(result);
}

async function handleWorkspaceMailSync(request, env, ctx) {
  await serviceAuth(request, env);
  const url = new URL(request.url);
  const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
  const mailboxEmail = clean(body.mailbox_email || body.email || url.searchParams.get("mailbox_email") || url.searchParams.get("email")).toLowerCase();
  const workspaceId = clean(body.workspace_id || body.workspace || url.searchParams.get("workspace_id") || url.searchParams.get("workspace"));
  const ownerEmail = clean(body.owner_email || url.searchParams.get("owner_email")).toLowerCase();
  const limit = Math.min(Math.max(Number(body.limit || url.searchParams.get("limit") || 50), 1), 100);
  if (!mailboxEmail && !workspaceId && !ownerEmail) {
    throw Object.assign(new Error("mailbox_email, owner_email, or workspace_id is required."), { statusCode: 400 });
  }
  const rows = await query(env, `
    select hm.*, u.email as owner_email, u.fs27_customer_id
      from hosted_mailboxes hm
      join users u on u.id=hm.user_id
     where hm.status not in ('released','offboarded','disabled')
       and (
         ($1 <> '' and lower(hm.mailbox_email)=lower($1))
         or ($2 <> '' and (hm.workspace_id=$2 or u.workspace_id=$2 or lower(u.handle)=lower($2)))
         or ($3 <> '' and lower(u.email)=lower($3))
       )
     order by hm.updated_at desc nulls last, hm.created_at desc
     limit 1
  `, [mailboxEmail, workspaceId, ownerEmail]);
  if (!rows.length) throw Object.assign(new Error("SkyeMail workspace mailbox not found."), { statusCode: 404 });
  const mailbox = rows[0];
  const result = await importZohoInboxDeltas(env, { sub: mailbox.user_id, email: mailbox.owner_email, fs27_customer_id: mailbox.fs27_customer_id || null }, { limit }).catch((error) => ({
    ok: true,
    provider_fallback: true,
    provider_warning: error.message || "Provider sync unavailable.",
    provider_response: error.providerResponse || null,
    imported: 0,
    scanned: 0,
    provider: "zoho",
    mailbox,
  }));
  const event = { type: "skymail.mail.workspace_sync", actor: mailbox.owner_email || "skymail-service", org_id: mailbox.fs27_customer_id || null, ws_id: mailbox.id, meta: result };
  ctx.waitUntil(mirrorFs27(env, event));
  ctx.waitUntil(backupCitadel(env, { ...event, id: `workspace_sync_${mailbox.id}_${Date.now()}` }));
  return json({ ok: true, result });
}

async function handleZohoWebhook(request, env, ctx) {
  const { payload, raw } = await readZohoWebhookBody(request);
  const mail = extractZohoWebhookMessage(payload, raw);
  const text = `${raw || ""} ${JSON.stringify(payload || {})}`.toLowerCase();
  const exactTargets = await zohoWebhookTargetsForAddresses(env, mail.recipientEmails);
  const targets = uniqueZohoWebhookTargets(exactTargets.length ? exactTargets : await zohoWebhookTargetsForText(env, text));
  const directResults = [];
  if (mail.hasMessageData && targets.length) {
    for (const target of targets) {
      directResults.push(await importZohoWebhookMessage(env, target, mail, payload).catch((error) => ({
        ok: false,
        imported: 0,
        user_id: target.user_id,
        recipient_alias: target.recipient_alias || target.mailbox_email || null,
        error: error.message || "SkyeMail routing webhook import failed.",
      })));
    }
  }
  const directImported = directResults.reduce((sum, item) => sum + Number(item.imported || 0), 0);
  const syncResults = [];
  if (!directResults.length && targets.length && !zohoBackoffActive()) {
    for (const target of targets) {
      syncResults.push(await importZohoInboxDeltas(env, {
        sub: target.user_id,
        email: target.owner_email,
        fs27_customer_id: target.fs27_customer_id || null,
      }, { limit: 25 }).catch((error) => ({
        ok: false,
        user_id: target.user_id,
        error: error.message || "SkyeMail routing webhook sync failed.",
      })));
    }
  }
  const syncedImported = syncResults.reduce((sum, item) => sum + Number(item.imported || 0), 0);
  const result = {
    ok: true,
    provider: "zoho",
    matched_targets: targets.length,
    matched_recipients: mail.recipientEmails,
    direct_imported: directImported,
    synced_mailboxes: syncResults.length,
    imported: directImported + syncedImported,
    provider_cooldown: zohoBackoffActive() ? { active: true, retry_after_seconds: zohoBackoffSecondsRemaining() } : { active: false },
    ignored: !targets.length || (!mail.hasMessageData && !syncResults.length),
    ignore_reason: !targets.length ? "no_matching_skymail_mailbox" : (!mail.hasMessageData && !syncResults.length ? "no_message_payload" : null),
    results: directResults.length ? directResults : syncResults,
  };
  const audit = await recordZohoWebhookAudit(env, { payload, raw, mail, result }).catch(() => null);
  if (audit?.id) result.webhook_event_id = audit.id;
  ctx.waitUntil(backupCitadel(env, { id: `zoho_webhook_${Date.now()}`, type: "skymail.zoho.webhook", meta: { matched_targets: result.matched_targets, direct_imported: result.direct_imported, synced_mailboxes: result.synced_mailboxes, imported: result.imported, ignored: result.ignored, ignore_reason: result.ignore_reason } }));
  return json(result);
}

async function handleCitadelBackupTest(request, env) {
  await requireAuth(request, env);
  const result = await backupCitadel(env, { id: `backup_test_${Date.now()}`, type: "skymail.backup.test", meta: { ok: true } });
  return json({ ok: result.ok, backup: result });
}

function configuredEnv(env, ...names) {
  return names.some((name) => Boolean(clean(env[name])));
}

async function handleResendHealth(request, env) {
  await requireAuth(request, env);
  const url = new URL(request.url);
  const base = clean(env.PUBLIC_BASE_URL || env.SKYMAIL_PUBLIC_URL || url.origin).replace(/\/+$/, "");
  const mailRoutingWebhookEndpoint = `${base}/api/mail-routing-webhook`;
  return json({
    ok: true,
    telemetry_source: "database-backed message_delivery_events plus mail routing webhook audit tables",
    configured: {
      database: configuredEnv(env, "NEON_DATABASE_URL", "DATABASE_URL"),
      provider_api: Boolean(zohoApiConfigured(env) || configuredEnv(env, "RESEND_API_KEY")),
      zoho_api: zohoApiConfigured(env),
      resend_api_key: configuredEnv(env, "RESEND_API_KEY"),
      resend_webhook_secret: configuredEnv(env, "RESEND_WEBHOOK_SECRET"),
      inbound_domain: configuredEnv(env, "INBOUND_DOMAIN", "SKYMAIL_PRIMARY_DOMAIN"),
    },
    inbound_domain: clean(env.INBOUND_DOMAIN || env.SKYMAIL_PRIMARY_DOMAIN) || null,
    endpoint: mailRoutingWebhookEndpoint,
    endpoints: {
      delivery_events: `${base}/api/mail-routing-events`,
      mail_routing_webhook: mailRoutingWebhookEndpoint,
      mail_routing_webhook_events: `${base}/api/mail-routing-webhook-events`,
    },
    events_to_enable: [
      "email.received",
      "email.scheduled",
      "email.sent",
      "email.delivered",
      "email.delivery_delayed",
      "email.bounced",
      "email.complained",
      "email.failed",
      "email.opened",
      "email.clicked",
      "email.suppressed",
    ],
  });
}

async function handleResendEventsList(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const context = await resolveMailboxContext(env, request, auth);
  const userId = context.userId;
  const limit = Math.max(1, Math.min(250, Number.parseInt(url.searchParams.get("limit") || "100", 10) || 100));
  const [summaryRows, events, webhooks] = await Promise.all([
    query(env, `
      select
        count(*)::int as total_events,
        count(*) filter (where delivery_status='sent')::int as sent,
        count(*) filter (where delivery_status='delivered')::int as delivered,
        count(*) filter (where delivery_status='opened')::int as opened,
        count(*) filter (where delivery_status='clicked')::int as clicked,
        count(*) filter (where delivery_status='delayed')::int as delayed,
        count(*) filter (where delivery_status='bounced')::int as bounced,
        count(*) filter (where delivery_status='failed')::int as failed,
        count(*) filter (where delivery_status='complained')::int as complained,
        count(*) filter (where delivery_status='received')::int as received
      from message_delivery_events
      where user_id=$1
        and created_at >= now() - interval '30 days'
    `, [userId]).catch(() => [{}]),
    query(env, `
      select id, provider, event_type, delivery_status, provider_message_id, recipient_email,
             from_email, subject, svix_id, event_created_at, created_at
        from message_delivery_events
       where user_id=$1
       order by coalesce(event_created_at, created_at) desc
       limit $2
    `, [userId, limit]).catch(() => []),
    query(env, `
      select id, svix_id, event_type, resend_email_id, processing_status, error,
             received_at, event_created_at, processed_at
       from resend_webhook_events
       where related_user_id=$1
       order by received_at desc
       limit 50
    `, [userId]).catch(() => []),
  ]);
  return json({
    ok: true,
    window_days: 30,
    summary: summaryRows[0] || {},
    events,
    webhooks,
  });
}

async function handleContactsList(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const context = await resolveMailboxContext(env, request, auth);
  const userId = context.userId;
  const q = clean(url.searchParams.get("q")).toLowerCase();
  const like = `%${q}%`;
  const saved = await query(env, `
    select id, email, full_name, company, phone, notes, favorite, source, photo_url, last_used_at, created_at, updated_at
      from mail_contacts
     where user_id=$1
       and (
         $2 = ''
         or lower(email) like $3
         or lower(coalesce(full_name,'')) like $3
         or lower(coalesce(company,'')) like $3
       )
     order by favorite desc, updated_at desc
     limit 100
  `, [userId, q, like]);
  const recent = await query(env, `
    select distinct on (lower(from_email))
      lower(from_email) as email,
      coalesce(nullif(from_name,''), lower(from_email)) as full_name,
      'recent_mail' as source,
      max(created_at) as last_used_at
      from messages
     where user_id=$1
       and from_email is not null
       and from_email <> ''
       and ($2 = '' or lower(from_email) like $3 or lower(coalesce(from_name,'')) like $3)
     group by lower(from_email), coalesce(nullif(from_name,''), lower(from_email))
     order by lower(from_email), max(created_at) desc
     limit 50
  `, [userId, q, like]).catch(() => []);
  return json({
    ok: true,
    saved,
    recent,
    contacts_saved: saved,
    contacts_recent: recent,
    sync: {
      connected: true,
      last_sync_at: null,
      last_sync_count: saved.length,
    },
  });
}

async function handleContactsSave(request, env) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const context = await resolveMailboxContext(env, request, auth, body);
  const userId = context.userId;
  const email = normalizeEmail(body.email);
  if (!email || !email.includes("@")) throw Object.assign(new Error("Valid contact email is required."), { statusCode: 400 });
  const rows = await query(env, `
    insert into mail_contacts(user_id, email, full_name, company, phone, notes, favorite, source, updated_at)
    values($1,$2,$3,$4,$5,$6,$7,'local',now())
    on conflict(user_id, email)
    do update set
      full_name=excluded.full_name,
      company=excluded.company,
      phone=excluded.phone,
      notes=excluded.notes,
      favorite=excluded.favorite,
      source=coalesce(nullif(mail_contacts.source,''), 'local'),
      updated_at=now()
    returning *
  `, [
    userId,
    email,
    clean(body.full_name || body.name).slice(0, 240),
    clean(body.company).slice(0, 240),
    clean(body.phone).slice(0, 80),
    clean(body.notes).slice(0, 2000),
    Boolean(body.favorite),
  ]);
  const downstream = await syncContactToZeroOs(env, { ...auth, gate_token: bearer(request) }, rows[0] || {}, context.mailbox || null);
  return json({ ok: true, contact: rows[0] || null, synced_google: false, downstream });
}

async function handleContactsDelete(request, env) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const context = await resolveMailboxContext(env, request, auth, body);
  const userId = context.userId;
  const id = clean(body.id);
  if (!id) throw Object.assign(new Error("Contact id is required."), { statusCode: 400 });
  const rows = await query(env, "delete from mail_contacts where user_id=$1 and id=$2 returning id", [userId, id]);
  return json({ ok: true, deleted: rows.length });
}

async function handleGoogleContactsSync(request, env) {
  const auth = await requireAuth(request, env);
  const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
  const context = await resolveMailboxContext(env, request, auth, body);
  const rows = await query(env, "select count(*)::int as count from mail_contacts where user_id=$1", [context.userId]).catch(() => [{ count: 0 }]);
  return json({
    ok: true,
    provider: "citadel-skynet",
    synced_count: Number(rows[0]?.count || 0),
    note: "Citadel Database and SkyeNet SkyeMail contact records are available; SkyeMail-native contacts sync is non-blocking in SkyeMail.",
  });
}

async function handleDraftsList(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const context = await resolveMailboxContext(env, request, auth);
  const mailbox = context.mailbox || await getHostedMailbox(env, context.userId);
  if (mailbox?.provider === "zoho" && zohoApiConfigured(env)) {
    const listed = await zohoListMessages(env, {
      accountId: mailbox.provider_account_id,
      mailbox: mailbox.mailbox_email,
      label: "DRAFT",
      max: Math.min(Math.max(parseInt(url.searchParams.get("max") || "25", 10) || 25, 1), 100),
      pageToken: clean(url.searchParams.get("pageToken")),
      q: clean(url.searchParams.get("q")),
    });
    return json({
      ok: true,
      mailbox: mailbox.mailbox_email || "",
      items: (listed.items || []).map((item) => ({
        id: item.id,
        draft_id: item.id,
        message_id: item.id,
        thread_id: item.thread_id || item.id,
        subject: item.subject || "(no subject)",
        to: item.to || "",
        from: item.from || "",
        snippet: item.snippet || "",
        internal_date: item.internal_date || item.date || null,
        has_attachments: Boolean(item.has_attachments),
      })),
      nextPageToken: listed.nextPageToken || null,
      provider: "zoho",
    });
  }
  return json({
    ok: true,
    mailbox: mailbox?.mailbox_email || auth.email || "",
    items: [],
    nextPageToken: null,
    note: "SkyeMail-native draft storage is not required for Citadel Database and SkyeNet SkyeMail; compose can send directly.",
  });
}

async function handleDraftGet(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const id = clean(url.searchParams.get("id") || url.searchParams.get("draft_id"));
  if (!id) throw Object.assign(new Error("Draft id required."), { statusCode: 400 });
  const context = await resolveMailboxContext(env, request, auth);
  const mailbox = context.mailbox || await getHostedMailbox(env, context.userId);
  if (mailbox?.provider === "zoho" && zohoApiConfigured(env)) {
    const ref = await resolveZohoMessageRef(env, { id, userId: context.userId, mailbox, requireFolder: true });
    if (!ref) throw Object.assign(new Error("Draft not found."), { statusCode: 404 });
    let data = null;
    try {
      data = await zohoGetMessage(env, { id: zohoUiId(ref.accountId, ref.folderId, ref.messageId), accountId: mailbox.provider_account_id, mailbox: mailbox.mailbox_email });
    } catch (error) {
      const notFoundish = [400, 404].includes(Number(error?.statusCode || error?.status || 0)) && /(invalid|not\s*found|does\s*not\s*exist|deleted)/i.test(String(error?.message || ""));
      if (notFoundish) throw Object.assign(new Error("Draft not found."), { statusCode: 404 });
      throw error;
    }
    const message = data.message || {};
    const storedDraft = await findStoredZohoDraft(env, context.userId, ref);
    const proof = storedDraft && Number(storedDraft.key_version || 0) === 0 ? openProofBlob(storedDraft.ciphertext_b64) || {} : {};
    return json({
      ok: true,
      mailbox: mailbox.mailbox_email || "",
      provider: "zoho",
      draft: draftFromProviderAndProof({ id: message.id || id, message, proof, mailboxEmail: mailbox.mailbox_email || "" }),
    });
  }
  return json({ ok: true, draft: null });
}

async function handleDraftSave(request, env, ctx) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const context = await resolveMailboxContext(env, request, auth, body);
  const userId = context.userId;
  const mailbox = context.mailbox || await getHostedMailbox(env, userId);
  if (!(mailbox?.provider === "zoho" && zohoApiConfigured(env))) {
    return json({
      ok: false,
      provider_native: false,
      error: "Draft storage requires a SkyeMail production mailbox in this phase.",
    }, 400);
  }
  const requestedFrom = normalizeEmail(body.from_alias || body.from || "");
  let fromEmail = mailbox.mailbox_email;
  if (requestedFrom) {
    const aliases = await listMailboxAliases(env, userId, mailbox.id).catch(() => []);
    const allowedAlias = aliases.find((item) => normalizeEmail(item.alias_email) === requestedFrom) || (normalizeEmail(mailbox.mailbox_email) === requestedFrom ? { alias_email: mailbox.mailbox_email, alias_type: "primary", provider_alias_id: mailbox.provider_account_id } : null);
    if (!allowedAlias) throw Object.assign(new Error(`The alias ${requestedFrom} is not active on this SkyeMail mailbox.`), { statusCode: 403 });
    fromEmail = requestedFrom;
  }
  const existingId = clean(body.id || body.draft_id || body.draftId);
  const saved = await zohoSaveDraft(env, {
    accountId: mailbox.provider_account_id,
    fromAddress: fromEmail,
    to: body.to,
    cc: body.cc,
    bcc: body.bcc,
    subject: body.subject,
    html: String(body.html || ""),
    text: String(body.text || body.message || ""),
    replyMessageId: body.reply_message_id || body.replyMessageId || "",
    threadId: body.thread_id || body.threadId || "",
    attachments: body.attachments,
  });
  if (existingId && existingId !== saved.provider_ui_id && existingId !== saved.id) {
    const oldRef = await resolveZohoMessageRef(env, { id: existingId, userId, mailbox, requireFolder: true }).catch(() => null);
    if (oldRef) await deleteZohoMessageRefs(env, { refs: [oldRef], expunge: true }).catch(() => null);
  }
  await query(env, `
    insert into messages(user_id, from_name, from_email, key_version, encrypted_key_b64, iv_b64, ciphertext_b64,
      direction, delivery_provider, provider_message_id, delivery_status, last_delivery_event_at)
    values($1,$2,$3,0,$4,$5,$6,'draft','zoho',$7,'draft',now())
    on conflict do nothing
  `, [
    userId,
    `Draft: ${clean(body.to) || "(no recipient)"}`,
    clean(body.to) || fromEmail,
    "proof",
    "proof",
    proofBlob({ subject: clean(body.subject), message: String(body.text || body.message || ""), html: String(body.html || ""), direction: "draft", from: fromEmail, to: addressList(body.to), cc: addressList(body.cc), bcc: addressList(body.bcc), provider: "zoho", provider_message_id: saved.id, provider_ui_id: saved.provider_ui_id, attachment_count: Number(saved.attachment_count || 0), saved_at: new Date().toISOString() }),
    saved.id,
  ]).catch(() => null);
  ctx?.waitUntil?.(backupCitadel(env, {
    id: `draft_${saved.id}_${Date.now()}`,
    type: "skymail.mail.draft_saved",
    actor: auth.email || "skymail",
    ws_id: mailbox.id,
    meta: { mailbox: mailbox.mailbox_email, draft_id: saved.provider_ui_id || saved.id, provider_message_id: saved.id, attachment_count: Number(saved.attachment_count || 0) },
  }));
  return json({
    ok: true,
    provider_native: true,
    provider: "zoho",
    mailbox: mailbox.mailbox_email,
    draft: {
      id: saved.provider_ui_id || saved.id,
      draft_id: saved.provider_ui_id || saved.id,
      message_id: saved.provider_ui_id || saved.id,
      provider_message_id: saved.id,
      thread_id: clean(body.thread_id || body.threadId || ""),
      subject: clean(body.subject),
      to: clean(body.to),
      cc: clean(body.cc),
      bcc: clean(body.bcc),
    },
  });
}

async function handleDraftDelete(request, env, ctx) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const context = await resolveMailboxContext(env, request, auth, body);
  const userId = context.userId;
  const mailbox = context.mailbox || await getHostedMailbox(env, userId);
  const ids = (Array.isArray(body.ids) ? body.ids : [body.id || body.draft_id || body.draftId]).map(clean).filter(Boolean);
  if (!ids.length) throw Object.assign(new Error("Draft id required."), { statusCode: 400 });
  const refs = await resolveZohoMessageRefs(env, { ids, userId, mailbox, requireFolder: true });
  if (mailbox?.provider === "zoho" && zohoApiConfigured(env) && !refs.length) {
    throw Object.assign(new Error("No provider draft was resolved for the requested id; deletion was not performed."), { statusCode: 404 });
  }
  const result = refs.length ? await deleteZohoMessageRefs(env, { refs, expunge: true }) : { deleted: [], skipped: [] };
  for (const id of ids) {
    const key = messageLabelKeyFromId(id);
    if (key.message_id) await query(env, "update messages set delivery_status='deleted' where id=$1 and user_id=$2", [key.message_id, userId]).catch(() => null);
    else if (key.provider_message_id) await query(env, "update messages set delivery_status='deleted' where user_id=$1 and delivery_provider='zoho' and provider_message_id=$2", [userId, key.provider_message_id]).catch(() => null);
  }
  ctx?.waitUntil?.(backupCitadel(env, {
    id: `draft_delete_${userId}_${Date.now()}`,
    type: "skymail.mail.draft_deleted",
    actor: auth.email || "skymail",
    ws_id: mailbox?.id || userId,
    meta: { ids, provider_deleted: result.deleted.length, provider_skipped: result.skipped.length },
  }));
  return json({ ok: true, deleted: result.deleted.length, skipped: result.skipped });
}

function asJsonValue(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return fallback; }
  }
  return value;
}

const SKYEMAIL_OS_ACTIONS = [
  {
    id: "skydocxmax-editor",
    group: "Documents",
    panel: "docs",
    label: "SkyeDocxMax Editor",
    path: "/Marketing-Made-Easy/SkyeDocxMax/editor",
    lane: "document-compose",
    capability: "verified_gated_app",
    bridge: "fragment_handoff",
    nativePanel: "docs",
    embed: false,
    summary: "Draft or edit selected mail as a SkyeDocxMax document.",
    talksTo: ["SkyeMail context", "SkyeDocxMax importer", "shared 0S gate"],
    verify: {
      localFile: "metraiyux_0s_site/Marketing-Made-Easy/SkyeDocxMax/editor.html",
      localProof: "SkyeDocxMax accepts SkyeMail fragment payloads.",
      smokeCommand: "cd metraiyux_0s_site/Marketing-Made-Easy/SkyeDocxMax && npm run smoke"
    }
  },
  {
    id: "sovereigndocs-packet-builder",
    group: "Documents",
    panel: "docs",
    label: "SovereignDocs Packet",
    path: "/Free99/apps/sovereigndocs/packet-builder/",
    lane: "governed-document-packet",
    capability: "verified_gated_app",
    bridge: "workflow_packet",
    nativePanel: "docs",
    embed: false,
    summary: "Move mail context into a governed document packet.",
    talksTo: ["SkyeMail workflow packets", "SovereignDocs", "shared 0S gate"],
    verify: {
      localFile: "metraiyux_0s_site/Free99/apps/sovereigndocs/packet-builder/index.html",
      localProof: "SovereignDocs packet-builder page exists in the mounted 0S tree.",
      smokeCommand: "cd metraiyux_0s_site/Free99/apps/sovereigndocs && npm run smoke:v14"
    }
  },
  {
    id: "sovereigndocs-review-studio",
    group: "Documents",
    panel: "docs",
    label: "Document Review",
    path: "/Free99/apps/sovereigndocs/review-studio/",
    lane: "document-review",
    capability: "verified_gated_app",
    bridge: "workflow_packet",
    nativePanel: "docs",
    embed: false,
    summary: "Queue a message, draft, or attachment for lifecycle review.",
    talksTo: ["SkyeMail workflow packets", "SovereignDocs review", "shared 0S gate"],
    verify: {
      localFile: "metraiyux_0s_site/Free99/apps/sovereigndocs/review-studio/index.html",
      localProof: "SovereignDocs review-studio page exists in the mounted 0S tree.",
      smokeCommand: "cd metraiyux_0s_site/Free99/apps/sovereigndocs && npm run smoke:v14"
    }
  },
  {
    id: "founder-calendar",
    group: "Schedule",
    panel: "calendar",
    label: "0S Calendar",
    path: "/founder-command/apps/0s-calendar/",
    apiRoute: "/api/founder-command/calendar",
    lane: "calendar-follow-up",
    capability: "live_api",
    bridge: "direct_api",
    nativePanel: "calendar",
    embed: false,
    summary: "List and create Founder Calendar events from mail context.",
    talksTo: ["SkyeMail context", "Founder Calendar API", "Google Calendar provider when configured"],
    verify: {
      localFile: "metraiyux_0s_site/founder-command/apps/0s-calendar/index.html",
      liveApi: "/api/founder-command/calendar",
      localProof: "Founder Command calendar route supports GET and POST."
    }
  },
  {
    id: "founder-command-bridge",
    group: "Command",
    panel: "automation",
    label: "Founder Command",
    path: "/founder-command/apps/0s-command-bridge/",
    apiRoute: "/api/founder-command/actions",
    lane: "founder-command",
    capability: "live_api",
    bridge: "direct_api",
    nativePanel: "automation",
    embed: false,
    summary: "Promote mail into allowlisted Founder Command actions and receipts.",
    talksTo: ["SkyeMail workflow packets", "Founder Command actions", "0S Command Bridge"],
    verify: {
      localFile: "metraiyux_0s_site/founder-command/apps/0s-command-bridge/index.html",
      liveApi: "/api/founder-command/actions",
      localProof: "Founder Command actions route returns an allowlisted action catalog."
    }
  },
  {
    id: "crm-pipeline",
    group: "CRM",
    panel: "crm",
    label: "CRM Pipeline",
    path: "/Marketing-Made-Easy/AE-FlowPro/#deals",
    apiRoute: "/api/founder-command/actions",
    apiAction: "command-bridge.event.record",
    lane: "crm-intake",
    capability: "live_api",
    bridge: "command_bridge_event",
    nativePanel: "crm",
    embed: false,
    summary: "Record sender or thread context as a live 0S Command Bridge CRM event.",
    talksTo: ["SkyeMail workflow packets", "0S Command Bridge", "AE FlowPro CRM"],
    verify: {
      localFile: "metraiyux_0s_site/Marketing-Made-Easy/AE-FlowPro/index.html",
      liveApi: "/api/founder-command/actions",
      localProof: "AE FlowPro exists; native event recording uses Founder Command action command-bridge.event.record."
    }
  },
  {
    id: "crm-follow-up",
    group: "CRM",
    panel: "crm",
    label: "CRM Follow-Up",
    path: "/Marketing-Made-Easy/AE-FlowPro/#accounts",
    apiRoute: "/api/founder-command/actions",
    apiAction: "command-bridge.event.record",
    lane: "sales-follow-up",
    capability: "live_api",
    bridge: "command_bridge_event",
    nativePanel: "crm",
    embed: false,
    summary: "Queue reply work and client follow-up through the live 0S Command Bridge.",
    talksTo: ["SkyeMail workflow packets", "0S Command Bridge", "AE FlowPro follow-up"],
    verify: {
      localFile: "metraiyux_0s_site/Marketing-Made-Easy/AE-FlowPro/index.html",
      liveApi: "/api/founder-command/actions",
      localProof: "AE FlowPro follow-up lane exists; native event recording uses Founder Command action command-bridge.event.record."
    }
  },
  {
    id: "ae-flow-contact-capture",
    group: "CRM",
    panel: "crm",
    label: "AE Flow Contact Capture",
    path: "/Marketing-Made-Easy/AE-FlowPro/",
    apiRoute: "/api/founder-command/ae-flow/capture",
    lane: "crm-contact-sync",
    capability: "live_api",
    bridge: "direct_api",
    nativePanel: "crm",
    embed: false,
    summary: "Persist sender/customer contact context into the founder AE FlowPro CRM store.",
    talksTo: ["SkyeMail contacts", "AE FlowPro private CRM", "Citadel Database mirror ledger"],
    verify: {
      localFile: "metraiyux_0s_site/Marketing-Made-Easy/AE-FlowPro/index.html",
      liveApi: "/api/founder-command/ae-flow/capture",
      localProof: "AE FlowPro capture stores contact records through Founder Command."
    }
  },
  {
    id: "ae-flow-workflow-journal",
    group: "CRM",
    panel: "crm",
    label: "AE Flow Journal",
    path: "/Marketing-Made-Easy/AE-FlowPro/",
    apiRoute: "/api/founder-command/ae-flow/runtime/journal",
    lane: "crm-journal",
    capability: "live_api",
    bridge: "direct_api",
    nativePanel: "crm",
    embed: false,
    summary: "Write selected email context into the AE FlowPro runtime journal for workspace visibility.",
    talksTo: ["SkyeMail thread context", "AE FlowPro runtime journal", "Citadel Database mirror ledger"],
    verify: {
      localFile: "metraiyux_0s_site/Marketing-Made-Easy/AE-FlowPro/index.html",
      liveApi: "/api/founder-command/ae-flow/runtime/journal",
      localProof: "AE FlowPro runtime journal accepts POST records."
    }
  },
  {
    id: "saas-customer-command",
    group: "Command",
    panel: "automation",
    label: "SaaS Customer Command",
    path: "/saas/customer-dashboard.html",
    apiRoute: "/api/saas/action-event",
    lane: "customer-workspace-command",
    capability: "live_api",
    bridge: "direct_api",
    nativePanel: "automation",
    embed: false,
    summary: "Persist a mail-derived customer/workspace command event into the SaaS layer.",
    talksTo: ["SkyeMail context", "SaaS workspace ledger", "0S Command Bridge"],
    verify: {
      localFile: "metraiyux_0s_site/saas/customer-dashboard.html",
      liveApi: "/api/saas/action-event",
      localProof: "SaaS action-event route stores workspace events."
    }
  },
  {
    id: "skyecommerce-orders",
    group: "Commerce",
    panel: "commerce",
    label: "SkyeCommerce Orders",
    path: "/SkyeCommerce/merchant/index.html#orders",
    apiRoute: "/SkyeCommerce/api/orders",
    lane: "commerce-order-desk",
    capability: "live_api",
    bridge: "direct_api",
    nativePanel: "commerce",
    embed: false,
    summary: "Read live SkyeCommerce order state from mailbox context.",
    talksTo: ["SkyeMail customer messages", "SkyeCommerce orders", "shared 0S gate"],
    verify: {
      localFile: "metraiyux_0s_site/cloudflare/skyecommerce-runtime/index.js",
      liveApi: "/SkyeCommerce/api/orders",
      localProof: "SkyeCommerce order API is mounted through the 0S Worker."
    }
  },
  {
    id: "skyecommerce-analytics",
    group: "Commerce",
    panel: "commerce",
    label: "Commerce Analytics",
    path: "/SkyeCommerce/merchant/index.html#analytics",
    apiRoute: "/SkyeCommerce/api/analytics/summary",
    lane: "commerce-analytics",
    capability: "live_api",
    bridge: "direct_api",
    nativePanel: "commerce",
    embed: false,
    summary: "Load live SkyeCommerce analytics so email context can move into store operations.",
    talksTo: ["SkyeMail context", "SkyeCommerce analytics", "shared 0S gate"],
    verify: {
      localFile: "metraiyux_0s_site/cloudflare/skyecommerce-runtime/index.js",
      liveApi: "/SkyeCommerce/api/analytics/summary",
      localProof: "SkyeCommerce analytics summary is mounted through the 0S Worker."
    }
  },
  {
    id: "profit-console",
    group: "Finance",
    panel: "finance",
    label: "Profit Console",
    path: "/live/skyeprofitconsole-profit-console.html",
    lane: "finance-review",
    capability: "verified_gated_app",
    bridge: "workflow_packet",
    nativePanel: "finance",
    embed: false,
    summary: "Move pricing, invoice, or revenue terms into finance review.",
    talksTo: ["SkyeMail workflow packets", "SkyeProfitConsole", "shared 0S gate"],
    verify: {
      localFile: "metraiyux_0s_site/live/skyeprofitconsole-profit-console.html",
      localProof: "Profit Console standalone surface exists.",
      smokeCommand: "cd metraiyux_0s_site/SkyeProfitConsole && npm run smoke"
    }
  },
  {
    id: "split-engine",
    group: "Finance",
    panel: "finance",
    label: "Split Engine",
    path: "/live/skye-split-engine-operator-proof.html",
    lane: "profit-split",
    capability: "verified_gated_app",
    bridge: "workflow_packet",
    nativePanel: "finance",
    embed: false,
    summary: "Route payout or revenue-share terms into split review.",
    talksTo: ["SkyeMail workflow packets", "SkyeSplitEngine", "shared 0S gate"],
    verify: {
      localFile: "metraiyux_0s_site/live/skye-split-engine-operator-proof.html",
      localProof: "Split Engine operator proof surface exists.",
      smokeCommand: "cd metraiyux_0s_site/SkyeSplitEngine && npm run smoke"
    }
  },
  {
    id: "audit-ledger",
    group: "Legal",
    panel: "legal",
    label: "Audit Ledger",
    path: "/Free99/apps/sovereigndocs/audit-ledger/",
    lane: "audit-evidence",
    capability: "verified_gated_app",
    bridge: "workflow_packet",
    nativePanel: "legal",
    embed: false,
    summary: "Preserve selected message context as audit evidence.",
    talksTo: ["SkyeMail workflow packets", "SovereignDocs audit ledger", "shared 0S gate"],
    verify: {
      localFile: "metraiyux_0s_site/Free99/apps/sovereigndocs/audit-ledger/index.html",
      localProof: "SovereignDocs audit-ledger page exists.",
      smokeCommand: "cd metraiyux_0s_site/Free99/apps/sovereigndocs && npm run smoke:v14"
    }
  },
  {
    id: "saas-launch-packet",
    group: "Expansion",
    panel: "builder",
    label: "SaaS Launch Packet",
    path: "/Free99/apps/sovereigndocs/packets/saas-launch-packet/",
    lane: "saas-launch",
    capability: "verified_gated_app",
    bridge: "workflow_packet",
    nativePanel: "builder",
    embed: false,
    summary: "Turn client work into a launch packet.",
    talksTo: ["SkyeMail workflow packets", "SovereignDocs launch packet", "shared 0S gate"],
    verify: {
      localFile: "metraiyux_0s_site/Free99/apps/sovereigndocs/packets/saas-launch-packet/index.html",
      localProof: "SaaS launch packet page exists.",
      smokeCommand: "cd metraiyux_0s_site/Free99/apps/sovereigndocs && npm run smoke:v14"
    }
  },
  {
    id: "government-case-command",
    group: "Legal",
    panel: "legal",
    label: "Government Case Command",
    path: "/Free99/apps/sovereigndocs/case-command-center/",
    lane: "government-case",
    capability: "verified_gated_app",
    bridge: "workflow_packet",
    nativePanel: "legal",
    embed: false,
    summary: "Move regulated or civic email work into a case lane.",
    talksTo: ["SkyeMail workflow packets", "SovereignDocs case command", "shared 0S gate"],
    verify: {
      localFile: "metraiyux_0s_site/Free99/apps/sovereigndocs/case-command-center/index.html",
      localProof: "Case command center page exists.",
      smokeCommand: "cd metraiyux_0s_site/Free99/apps/sovereigndocs && npm run smoke:v14"
    }
  },
  {
    id: "skyevaultpro-drive",
    group: "Vault",
    panel: "legal",
    label: "SkyeVault Pro",
    path: "/Free99/apps/skyevaultpro/drive/",
    lane: "source-custody",
    capability: "verified_gated_app",
    bridge: "workflow_packet",
    nativePanel: "legal",
    embed: false,
    summary: "Store mail-derived artifacts in the vault.",
    talksTo: ["SkyeMail workflow packets", "SkyeVault Pro", "shared 0S gate"],
    verify: {
      localFile: "metraiyux_0s_site/Free99/apps/skyevaultpro/drive/index.html",
      localProof: "SkyeVault Pro drive page exists."
    }
  },
  {
    id: "pwa-factory",
    group: "Builder",
    panel: "builder",
    label: "PWA Factory",
    path: "/founder-command/apps/pwa-factory-v213/",
    apiRoute: "/api/founder-command/pwa-factory/analyze",
    lane: "app-build",
    capability: "live_api",
    bridge: "direct_api",
    nativePanel: "builder",
    embed: false,
    summary: "Analyze mail context into a PWA launch manifest.",
    talksTo: ["SkyeMail context", "Founder PWA Factory API", "FS27 AI lane when available"],
    verify: {
      localFile: "metraiyux_0s_site/founder-command/apps/pwa-factory-v213/index.html",
      liveApi: "/api/founder-command/pwa-factory/analyze",
      localProof: "PWA Factory analyze route returns a manifest or local fallback."
    }
  },
];

function mailOsActionById(id) {
  return SKYEMAIL_OS_ACTIONS.find((item) => item.id === clean(id)) || SKYEMAIL_OS_ACTIONS[0];
}

function mailOsActionPublic(env, action = {}, context = {}) {
  return {
    ...action,
    launchUrl: zeroOsActionLaunchUrl(env, action, context),
    authMode: "shared SkyeGate FS27/Free99 session",
    openMode: "gate-native",
    iframe: false,
  };
}

function zeroOsActionLaunchUrl(env, action = {}, context = {}) {
  const origin = zeroOsGateOrigin(env);
  const target = new URL(action.path || "/", origin);
  const params = {
    source: "skymail",
    action_id: action.id || "",
    lane: action.lane || "",
    mailbox: context.mailbox || context.mailbox_email || "",
    message_id: context.message_id || context.messageId || "",
    thread_id: context.thread_id || context.threadId || "",
    subject: context.subject || "",
    from: context.from || "",
    to: context.to || "",
    return: context.return || context.returnUrl || "",
  };
  Object.entries(params).forEach(([key, value]) => {
    const next = clean(value);
    if (next) target.searchParams.set(key, next.slice(0, 800));
  });
  const gate = new URL("/admin/login.html", origin);
  gate.searchParams.set("return", `${target.pathname}${target.search}${target.hash}`);
  return gate.toString();
}

async function zeroOsRequest(env, route = "/", init = {}) {
  const target = new URL(route || "/", zeroOsGateOrigin(env));
  if (env.ZERO_OS_WORKER?.fetch) {
    return await env.ZERO_OS_WORKER.fetch(new Request(`https://zero-os.internal${target.pathname}${target.search}${target.hash}`, init));
  }
  return await fetch(target.toString(), init);
}

function zeroOsForwardHeaders(auth = {}, lane = "skymail-workbench") {
  const token = clean(auth.gate_token || auth.token || "");
  return {
    accept: "application/json,text/html;q=0.9,*/*;q=0.8",
    "x-skye-platform": "skymail",
    "x-skye-usage-lane": lane,
    ...(token ? {
      authorization: `Bearer ${token}`,
      "x-admin-token": token,
      "x-free99-admin-code": token,
      "x-free99-gate-session": token,
      "x-skye-gate-session": token,
      "x-skygate-session": token,
    } : {}),
  };
}

function mailboxWorkspaceId(mailbox = {}, fallback = "metraiyux-0s") {
  return clean(mailbox.workspace_id || mailbox.skymail_id || mailbox.mailbox_email || fallback)
    .toLowerCase()
    .replace(/@/g, "-")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160) || fallback;
}

async function zeroOsJson(env, auth, route, { method = "GET", body = null, lane = "skymail-workbench" } = {}) {
  const headers = {
    ...zeroOsForwardHeaders(auth, lane),
    ...(body !== null ? { "content-type": "application/json" } : {}),
  };
  const response = await zeroOsRequest(env, route, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const data = await response.json().catch(() => ({}));
  return {
    ok: response.status >= 200 && response.status < 300 && data?.ok !== false,
    status: response.status,
    route,
    data,
  };
}

async function syncContactToZeroOs(env, auth = {}, contact = {}, mailbox = null) {
  const email = normalizeEmail(contact.email);
  if (!email) return { ok: false, skipped: true, reason: "no_contact_email" };
  const workspaceId = mailboxWorkspaceId(mailbox, "metraiyux-0s");
  const profile = {
    source: "skymail-contact-save",
    source_id: clean(contact.id || email),
    collection: "mail_contacts",
    kind: "email_contact",
    name: clean(contact.full_name || contact.name || email, 240),
    email,
    company: clean(contact.company, 240),
    phone: clean(contact.phone, 80),
    notes: clean(contact.notes, 2000),
    tags: ["skyemail", "mail-contact"],
    mailbox_email: clean(mailbox?.mailbox_email || ""),
    workspace_id: workspaceId,
  };
  const [crm, saas] = await Promise.all([
    zeroOsJson(env, auth, "/api/founder-command/ae-flow/capture", {
      method: "POST",
      lane: "skymail-contact-crm",
      body: profile,
    }).catch((error) => ({ ok: false, status: 0, route: "/api/founder-command/ae-flow/capture", error: clean(error?.message || "crm_sync_failed", 500) })),
    zeroOsJson(env, auth, "/api/saas/action-event", {
      method: "POST",
      lane: "skymail-contact-saas-event",
      body: {
        workspace_id: workspaceId,
        type: "skymail.contact.saved",
        lane: "mail-contact-sync",
        status: "recorded",
        summary: `SkyeMail contact saved: ${profile.name || email}`,
        metadata: profile,
      },
    }).catch((error) => ({ ok: false, status: 0, route: "/api/saas/action-event", error: clean(error?.message || "saas_event_failed", 500) })),
  ]);
  return {
    ok: Boolean(crm.ok || saas.ok),
    workspace_id: workspaceId,
    crm: {
      ok: Boolean(crm.ok),
      status: crm.status || 0,
      route: crm.route || "/api/founder-command/ae-flow/capture",
      contact_id: crm.data?.captured?.contact_id || "",
      error: crm.error || crm.data?.error || "",
    },
    saas: {
      ok: Boolean(saas.ok),
      status: saas.status || 0,
      route: saas.route || "/api/saas/action-event",
      stored: Boolean(saas.data?.stored),
      event_id: saas.data?.event?.id || "",
      error: saas.error || saas.data?.error || "",
    },
  };
}

function mailOsContextDescription(action = {}, context = {}) {
  return [
    `Source: SkyeMail 0S Workbench`,
    `Target: ${action.label || action.id || "0S action"}`,
    `Mailbox: ${clean(context.mailbox || context.mailbox_email) || "unknown"}`,
    `Message: ${clean(context.message_id || context.messageId) || "none"}`,
    `Thread: ${clean(context.thread_id || context.threadId) || "none"}`,
    `From: ${clean(context.from) || "unknown"}`,
    `To: ${clean(context.to) || "unknown"}`,
    `Subject: ${clean(context.subject) || "(no subject)"}`,
    clean(context.snippet || context.text) ? `Context:\n${clean(context.snippet || context.text).slice(0, 2400)}` : "",
  ].filter(Boolean).join("\n");
}

function mailOsAttendeeEmail(context = {}) {
  const candidate = clean(context.attendee_email || context.attendeeEmail || context.from || context.to || "");
  const match = candidate.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : "";
}

function mailOsCommandBridgeParams(action = {}, context = {}) {
  const subject = clean(context.subject || `${action.label || "SkyeMail"} handoff`).slice(0, 240);
  const messageId = clean(context.message_id || context.messageId);
  const threadId = clean(context.thread_id || context.threadId);
  return {
    source_app: "skymail",
    source_surface: "skyemail-0s-workbench",
    event_type: `skymail.${(action.lane || action.id || "0s").replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`,
    status: "recorded_from_skyemail",
    summary: `${action.label || "0S"}: ${subject}`,
    entity_kind: threadId ? "mail-thread" : "mail-message",
    entity_id: threadId || messageId || `skymail-${Date.now().toString(36)}`,
    entity_label: subject,
    provider: "skymail",
  };
}

function mailOsContactPayload(context = {}) {
  const from = clean(context.from || context.sender || "");
  const email = mailOsAttendeeEmail({ from, to: context.email || context.contact_email || "" });
  const subject = clean(context.subject || "SkyeMail contact").slice(0, 240);
  const inferredName = clean(context.name || context.full_name || from.replace(/<[^>]+>/g, "").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig, "")).slice(0, 160);
  return {
    source: "skymail-workbench",
    source_id: clean(context.message_id || context.messageId || context.thread_id || context.threadId || email || subject),
    collection: "mail_threads",
    kind: "email_contact",
    name: inferredName || email || "SkyeMail contact",
    email,
    company: clean(context.company || ""),
    phone: clean(context.phone || ""),
    notes: mailOsContextDescription({ label: "AE Flow Contact Capture" }, context),
    tags: ["skyemail", "mail-thread"],
    mailbox_email: clean(context.mailbox || context.mailbox_email || ""),
    workspace_id: mailboxWorkspaceId({ workspace_id: context.workspace_id || context.workspaceId, mailbox_email: context.mailbox || context.mailbox_email }, "metraiyux-0s"),
  };
}

function mailOsDirectApiPayload(action = {}, context = {}) {
  const subject = clean(context.subject || `${action.label || "0S"} from SkyeMail`).slice(0, 240);
  const description = mailOsContextDescription(action, context);
  if (action.id === "skydocxmax-editor") {
    const markdown = [
      `# ${subject || "SkyeMail Document"}`,
      "",
      description,
      "",
      "---",
      "",
      `SkyeMail message id: ${clean(context.message_id || context.messageId) || "none"}`,
      `SkyeMail thread id: ${clean(context.thread_id || context.threadId) || "none"}`,
    ].join("\n");
    return {
      route: "/api/sovereigndocs/editor/skye-docx-max/session",
      method: "POST",
      body: {
        title: subject || "SkyeMail Document",
        markdown,
        html: `<h1>${skymailHtmlEscape(subject || "SkyeMail Document")}</h1><pre>${skymailHtmlEscape(description)}</pre>`,
        metadata: {
          source: "skyemail",
          source_app: "skymail",
          source_surface: "skyemail-0s-workbench",
          mailbox: clean(context.mailbox || context.mailbox_email),
          message_id: clean(context.message_id || context.messageId),
          thread_id: clean(context.thread_id || context.threadId),
          subject,
        },
      },
    };
  }
  if (action.id === "founder-calendar") {
    const startAt = clean(context.start_at || context.startAt || context.start || "");
    const endAt = clean(context.end_at || context.endAt || context.end || "");
    return {
      route: "/api/founder-command/calendar",
      body: {
        source: "skymail-0s-workbench",
        summary: subject,
        description,
        start_at: startAt,
        end_at: endAt,
        timezone: clean(context.timezone || context.tz || ""),
        attendee_email: mailOsAttendeeEmail(context),
        create_live: Boolean(startAt && endAt && context.create_live !== false),
        ledger_only: !(startAt && endAt),
      },
    };
  }
  if (action.id === "pwa-factory") {
    const htmlSource = [
      `<h1>${subject}</h1>`,
      `<p>${clean(context.snippet || context.text || action.summary || "").slice(0, 4000)}</p>`,
      `<dl><dt>Mailbox</dt><dd>${clean(context.mailbox || context.mailbox_email)}</dd><dt>Thread</dt><dd>${clean(context.thread_id || context.threadId)}</dd></dl>`,
    ].join("\n");
    return {
      route: "/api/founder-command/pwa-factory/analyze",
      body: {
        source: "skymail-0s-workbench",
        htmlSource,
        manifest: {
          name: subject.slice(0, 45) || "SkyeMail PWA",
          short_name: "SkyeMail",
          description: clean(context.snippet || action.summary || "SkyeMail generated PWA launch context.").slice(0, 240),
        },
      },
    };
  }
  if (action.id === "ae-flow-contact-capture") {
    return {
      route: "/api/founder-command/ae-flow/capture",
      method: "POST",
      body: mailOsContactPayload(context),
    };
  }
  if (action.id === "ae-flow-workflow-journal") {
    return {
      route: "/api/founder-command/ae-flow/runtime/journal",
      method: "POST",
      body: {
        type: "skymail.thread.journal",
        source: "skymail-workbench",
        title: subject,
        subject,
        detail: description,
        messageId: clean(context.message_id || context.messageId),
        threadId: clean(context.thread_id || context.threadId),
        mailbox: clean(context.mailbox || context.mailbox_email),
        sender: clean(context.from),
        recipient: clean(context.to),
      },
    };
  }
  if (action.id === "saas-customer-command") {
    const workspaceId = mailboxWorkspaceId({ workspace_id: context.workspace_id || context.workspaceId, mailbox_email: context.mailbox || context.mailbox_email }, "metraiyux-0s");
    return {
      route: "/api/saas/action-event",
      method: "POST",
      body: {
        workspace_id: workspaceId,
        type: "skymail.workspace.command",
        lane: action.lane || "customer-workspace-command",
        status: "recorded",
        summary: subject,
        metadata: {
          source: "skymail-workbench",
          mailbox: clean(context.mailbox || context.mailbox_email),
          message_id: clean(context.message_id || context.messageId),
          thread_id: clean(context.thread_id || context.threadId),
          from: clean(context.from),
          to: clean(context.to),
          snippet: clean(context.snippet || context.text).slice(0, 2400),
        },
      },
    };
  }
  if (action.id === "skyecommerce-orders") {
    const orderId = clean(context.order_id || context.orderId || "");
    return {
      route: orderId ? `/SkyeCommerce/api/orders/${encodeURIComponent(orderId)}` : "/SkyeCommerce/api/orders",
      method: "GET",
      body: null,
    };
  }
  if (action.id === "skyecommerce-analytics") {
    return {
      route: "/SkyeCommerce/api/analytics/summary",
      method: "GET",
      body: null,
    };
  }
  if (action.apiAction || action.id === "founder-command-bridge" || action.bridge === "command_bridge_event") {
    return {
      route: "/api/founder-command/actions/execute",
      method: "POST",
      body: {
        action_id: action.apiAction || "command-bridge.event.record",
        params: mailOsCommandBridgeParams(action, context),
      },
    };
  }
  return null;
}

async function executeSkyeCommerceOrdersDirectApi(env, auth, action = {}, context = {}) {
  const started = Date.now();
  const workspaceId = mailboxWorkspaceId({ workspace_id: context.workspace_id || context.workspaceId, mailbox_email: context.mailbox || context.mailbox_email }, "metraiyux-0s");
  const orderId = clean(context.order_id || context.orderId || "");
  const metadata = {
    source: "skymail-workbench",
    mailbox: clean(context.mailbox || context.mailbox_email),
    message_id: clean(context.message_id || context.messageId),
    thread_id: clean(context.thread_id || context.threadId),
    from: clean(context.from),
    to: clean(context.to),
    subject: clean(context.subject),
    snippet: clean(context.snippet || context.text).slice(0, 2400),
    order_id: orderId,
  };
  const orders = await zeroOsJson(env, auth, orderId ? `/SkyeCommerce/api/orders/${encodeURIComponent(orderId)}` : "/SkyeCommerce/api/orders", {
    method: "GET",
    lane: "skymail-commerce-order-read",
  });
  const event = await zeroOsJson(env, auth, "/api/saas/action-event", {
    method: "POST",
    lane: "skymail-commerce-order-event",
    body: {
      workspace_id: workspaceId,
      type: orderId ? "skymail.commerce.order_thread_linked" : "skymail.commerce.order_desk_opened",
      lane: action.lane || "commerce-order-desk",
      status: orderId ? "linked" : "recorded",
      summary: orderId
        ? `SkyeMail thread linked to SkyeCommerce order ${orderId}`
        : `SkyeMail opened SkyeCommerce order desk: ${clean(context.subject || "mail context")}`,
      metadata: {
        ...metadata,
        order_count: Array.isArray(orders.data?.orders) ? orders.data.orders.length : null,
        order_found: Boolean(orders.data?.order),
      },
    },
  }).catch((error) => ({ ok: false, status: 0, route: "/api/saas/action-event", error: clean(error?.message || "saas_event_failed", 500), data: {} }));
  return {
    attempted: true,
    ok: Boolean(orders.ok && event.ok),
    mode: orderId ? "commerce_order_link" : "commerce_order_desk_event",
    action_id: action.id || "",
    route: orderId ? `/SkyeCommerce/api/orders/${encodeURIComponent(orderId)} + /api/saas/action-event` : "/SkyeCommerce/api/orders + /api/saas/action-event",
    status: orders.ok && event.ok ? 200 : (orders.status || event.status || 0),
    elapsed_ms: Date.now() - started,
    result: {
      orders: {
        ok: Boolean(orders.ok),
        status: orders.status || 0,
        count: Array.isArray(orders.data?.orders) ? orders.data.orders.length : null,
        order: orders.data?.order || null,
        error: orders.data?.error || orders.error || "",
      },
      event: {
        ok: Boolean(event.ok),
        status: event.status || 0,
        stored: Boolean(event.data?.stored),
        event_id: event.data?.event?.id || "",
        error: event.data?.error || event.error || "",
      },
    },
  };
}

async function executeMailOsDirectApi(env, auth, action = {}, context = {}) {
  if (action.id === "skyecommerce-orders") return await executeSkyeCommerceOrdersDirectApi(env, auth, action, context);
  const payload = mailOsDirectApiPayload(action, context);
  if (!payload) {
    return {
      attempted: false,
      ok: false,
      mode: action.bridge || "workflow_packet",
      action_id: action.id || "",
      reason: "no_direct_api_for_action",
    };
  }
  const started = Date.now();
  const headers = {
    ...zeroOsForwardHeaders(auth, `skymail-workbench:${action.lane || action.id || "direct-api"}`),
    "content-type": "application/json",
  };
  try {
    const response = await zeroOsRequest(env, payload.route, {
      method: payload.method || "POST",
      headers,
      body: payload.body === null || payload.body === undefined ? undefined : JSON.stringify(payload.body),
      redirect: "manual",
    });
    const data = await response.json().catch(() => ({}));
    const ok = response.status >= 200 && response.status < 300 && data?.ok !== false;
    return {
      attempted: true,
      ok,
      mode: "direct_api",
      action_id: action.id || "",
      route: payload.route,
      status: response.status,
      elapsed_ms: Date.now() - started,
      result: data,
    };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      mode: "direct_api",
      action_id: action.id || "",
      route: payload.route,
      status: 0,
      elapsed_ms: Date.now() - started,
      error: clean(error?.message || "direct_api_failed", 500),
    };
  }
}

function mailOsHealthRouteFor(action = {}) {
  if (action.capability === "live_api" && action.apiRoute) return action.apiRoute;
  return action.path || action.apiRoute || "/";
}

async function checkZeroOsRoute(env, auth, action = {}) {
  const route = mailOsHealthRouteFor(action);
  const target = new URL(route || "/", zeroOsGateOrigin(env));
  const started = Date.now();
  const headers = zeroOsForwardHeaders(auth, `skymail-workbench:${action.lane || action.id || "route-check"}`);
  try {
    const res = await zeroOsRequest(env, `${target.pathname}${target.search}${target.hash}`, {
      method: "GET",
      headers,
      redirect: "manual",
    });
    const gated = [301, 302, 303, 307, 308, 401, 403].includes(res.status);
    const ok = (res.status >= 200 && res.status < 300) || gated || res.status === 405;
    if (!ok && res.status === 404) {
      const launchUrl = zeroOsActionLaunchUrl(env, action, {});
      const launchTarget = new URL(launchUrl);
      const launchRes = await zeroOsRequest(env, `${launchTarget.pathname}${launchTarget.search}${launchTarget.hash}`, { method: "GET", headers, redirect: "manual" }).catch(() => null);
      const launchStatus = Number(launchRes?.status || 0);
      const launchGated = [301, 302, 303, 307, 308, 401, 403].includes(launchStatus);
      const launchOk = (launchStatus >= 200 && launchStatus < 300) || launchGated;
      if (launchOk) {
        return {
          ok: true,
          action_id: action.id,
          route,
          status: launchStatus,
          raw_status: res.status,
          gated: launchGated,
          capability: action.capability || "packet_bridge",
          bridge: action.bridge || "workflow_packet",
          checked_ms: Date.now() - started,
          via: "shared_gate_launch_url",
        };
      }
      return {
        ok: false,
        action_id: action.id,
        route,
        status: res.status,
        raw_status: res.status,
        gated: false,
        capability: action.capability || "packet_bridge",
        bridge: action.bridge || "workflow_packet",
        checked_ms: Date.now() - started,
        via: "route_not_found",
        server_subrequest_ok: false,
        external_proof: "Route is not considered healthy until a shared-gate live API or launch URL responds.",
      };
    }
    return {
      ok,
      action_id: action.id,
      route,
      status: res.status,
      gated,
      capability: action.capability || "packet_bridge",
      bridge: action.bridge || "workflow_packet",
      checked_ms: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      action_id: action.id,
      route,
      status: 0,
      gated: false,
      capability: action.capability || "packet_bridge",
      bridge: action.bridge || "workflow_packet",
      checked_ms: Date.now() - started,
      error: clean(error?.message || "route_check_failed", 300),
    };
  }
}

async function runMailOsHealthChecks(env, auth, actions = []) {
  const checks = [];
  const concurrency = 10;
  let cursor = 0;
  async function worker() {
    while (cursor < actions.length) {
      const index = cursor;
      cursor += 1;
      const action = actions[index];
      checks[index] = await Promise.race([
        checkZeroOsRoute(env, auth, action),
        timeoutAfter(10000, () => ({
          ok: false,
          action_id: action.id,
          route: mailOsHealthRouteFor(action),
          status: 0,
          gated: false,
          capability: action.capability || "packet_bridge",
          bridge: action.bridge || "workflow_packet",
          checked_ms: 10000,
          error: "route_check_timeout",
        })),
      ]);
    }
  }
  const lanes = Array.from({ length: Math.min(concurrency, actions.length) }, () => worker());
  await Promise.all(lanes);
  return checks;
}

async function handleMailOsActions(request, env) {
  await requireAuth(request, env);
  return json({
    ok: true,
    source: "skymail-0s-workbench",
    zero_os_origin: zeroOsGateOrigin(env),
    actions: SKYEMAIL_OS_ACTIONS.map((action) => mailOsActionPublic(env, action, {})),
    counts: {
      total: SKYEMAIL_OS_ACTIONS.length,
      live_api: SKYEMAIL_OS_ACTIONS.filter((action) => action.capability === "live_api").length,
      verified_gated_app: SKYEMAIL_OS_ACTIONS.filter((action) => action.capability === "verified_gated_app").length,
      packet_bridge: SKYEMAIL_OS_ACTIONS.filter((action) => action.capability === "packet_bridge").length,
    },
  });
}

async function handleMailOsHealth(request, env) {
  const auth = { ...await requireAuth(request, env), gate_token: bearer(request) };
  const url = new URL(request.url);
  const cacheKey = `mail-os-health:${auth.sub}:${stableHex(auth.selected_mailbox_email || request.headers.get("x-skymail-mailbox-email") || "", 12)}`;
  const refresh = ["1", "true", "yes"].includes(String(url.searchParams.get("refresh") || "").toLowerCase());
  if (refresh) SKYE_MEMORY_CACHE.delete(cacheKey);
  if (!refresh) {
    const cached = cacheGet(cacheKey);
    if (cached) {
      const result = await cached;
      return json({ ...result.body, cached: true, cache_ttl_seconds: 30 }, result.status);
    }
  }
  const result = await cachedPromise(cacheKey, 30000, async () => {
    const checks = await runMailOsHealthChecks(env, auth, SKYEMAIL_OS_ACTIONS);
    const failed = checks.filter((item) => !item.ok);
    const byCapability = checks.reduce((acc, item) => {
      acc[item.capability] = acc[item.capability] || { total: 0, ok: 0 };
      acc[item.capability].total += 1;
      if (item.ok) acc[item.capability].ok += 1;
      return acc;
    }, {});
    const body = {
      ok: failed.length === 0,
      source: "skymail-0s-workbench",
      zero_os_origin: zeroOsGateOrigin(env),
      generated_at: new Date().toISOString(),
      browser_proof: "owner-handled-by-repo-policy",
      summary: {
        total: checks.length,
        reachable_or_gated: checks.length - failed.length,
        failed: failed.length,
        by_capability: byCapability,
      },
      checks,
      actions: SKYEMAIL_OS_ACTIONS.map((action) => mailOsActionPublic(env, action, {})),
    };
    return { body, status: failed.length ? 207 : 200 };
  });
  return json(result.body, result.status);
}

async function handleMailOsHandoff(request, env) {
  const auth = { ...await requireAuth(request, env), gate_token: bearer(request) };
  const body = await request.json().catch(() => ({}));
  const action = mailOsActionById(body.action_id || body.actionId || body.action?.id);
  const context = body.context && typeof body.context === "object" ? body.context : {};
  const messageId = clean(context.message_id || context.messageId);
  const threadId = clean(context.thread_id || context.threadId);
  const subject = clean(context.subject || "(no subject)").slice(0, 240);
  const launchUrl = zeroOsActionLaunchUrl(env, action, context);
  const labelSubject = subject && subject !== "(no subject)" ? ` • ${subject}` : "";
  const mailboxEmail = clean(context.mailbox || context.mailbox_email);
  const message = messageId || threadId || subject
    ? {
      id: messageId || threadId || `skymail-context-${Date.now().toString(36)}`,
      threadId,
      subject,
      from: clean(context.from),
      to: clean(context.to),
      snippet: clean(context.snippet || context.text).slice(0, 1600),
      labels: ["SKYEMAIL_0S_HANDOFF"],
      source: "skymail-0s-workbench",
    }
    : null;
  const directExecution = await executeMailOsDirectApi(env, auth, action, context);
  const packet = {
    label: clean(body.label || `${action.label}${labelSubject}`).slice(0, 240),
    notes: clean(body.notes || `SkyeMail routed this context into ${action.label}.`).slice(0, 4000),
    mailbox: {
      mailboxEmail,
      source: "skymail",
      selectedMailbox: mailboxEmail,
    },
    selection: {
      label: "0S Workbench",
      selectedCount: message ? 1 : 0,
      actionId: action.id,
      lane: action.lane,
    },
    messages: message ? [message] : [],
    downstreamTargets: [{
      platform: action.label,
      actionId: action.id,
      lane: action.lane,
      capability: action.capability,
      bridge: action.bridge,
      apiRoute: action.apiRoute || "",
      path: action.path,
      reason: action.summary,
      talksTo: action.talksTo || [],
      iframe: false,
      launchUrl,
      directExecution: {
        attempted: Boolean(directExecution.attempted),
        ok: Boolean(directExecution.ok),
        route: directExecution.route || "",
        status: Number(directExecution.status || 0),
        mode: directExecution.mode || action.bridge || "",
      },
    }],
    recommendedActions: [
      directExecution.ok ? `Review the live ${action.label} execution receipt.` : `Open ${action.label} through the shared 0S gate.`,
      "Keep the original SkyeMail message id attached to the packet.",
      "Return any finished document, schedule, CRM, finance, audit, or build artifact to the SkyeMail thread before dispatch.",
    ],
    summary: {
      source: "skymail-0s-workbench",
      targetPlatforms: [action.label],
      actionIds: [action.id],
      capabilities: [action.capability || "packet_bridge"],
      bridges: [action.bridge || "workflow_packet"],
      launchUrl,
      directApi: directExecution,
    },
    review: { status: "ready", owner: "0S operator", checkpoint: `${action.label} packet created` },
    execution: directExecution.attempted
      ? {
        status: directExecution.ok ? "executed" : "direct_api_failed",
        owner: "0S Worker",
        checkpoint: directExecution.ok ? `${action.lane} direct API executed` : `${action.lane} direct API failed`,
        nextAction: directExecution.ok ? `Review ${action.label} receipt` : `Open ${action.label} and inspect the direct API error`,
        directApi: directExecution,
      }
      : { status: "queued", owner: "", checkpoint: `${action.lane} handoff queued`, nextAction: `Open ${action.label}` },
    dispatch: {
      status: directExecution.ok ? "ready_after_direct_api" : "queued",
      owner: "",
      channel: `${action.lane.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_handoff`,
      nextAction: directExecution.ok ? "Dispatch after reviewing the downstream receipt." : "Dispatch after downstream work is complete.",
      directApi: directExecution.attempted ? { ok: directExecution.ok, route: directExecution.route || "", status: directExecution.status || 0 } : null,
    },
    launchUrl,
    action,
  };
  return await createWorkflowPacket(env, auth, { mailHandoffPacket: packet });
}

async function requireMailAutomationAuth(request, env) {
  const expected = clean(env.SKYMAIL_SERVICE_TOKEN || env.SKYE_MAIL_SERVICE_TOKEN);
  const serviceHeader = clean(request.headers.get("x-skymail-service-token"));
  const token = bearer(request);
  if (serviceHeader || (expected && token === expected)) {
    const service = await serviceAuth(request, env);
    return {
      sub: "skymail-service",
      handle: "skymail-service",
      email: "skymail-service",
      auth_provider: service.source || "skymail-service-token",
      service: true,
    };
  }
  return await requireAuth(request, env);
}

async function handleThreadAttach(request, env) {
  const auth = await requireMailAutomationAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const context = body.context && typeof body.context === "object" ? body.context : body;
  const action = mailOsActionById(body.action_id || body.actionId || "founder-command-bridge");
  const messageId = clean(context.message_id || context.messageId || body.message_id || body.messageId);
  const threadId = clean(context.thread_id || context.threadId || body.thread_id || body.threadId);
  const subject = clean(context.subject || body.subject || "0S thread attachment").slice(0, 240);
  if (!messageId && !threadId && !subject) {
    throw Object.assign(new Error("message_id, thread_id, or subject is required."), { statusCode: 400 });
  }
  const mailboxEmail = clean(context.mailbox || context.mailbox_email || body.mailbox || body.mailbox_email);
  const launchUrl = zeroOsActionLaunchUrl(env, action, {
    mailbox: mailboxEmail,
    message_id: messageId,
    thread_id: threadId,
    subject,
    return: context.return || context.returnUrl || "",
  });
  const attachment = {
    id: clean(body.id || body.attachment_id || `thread-attach-${Date.now().toString(36)}`),
    message_id: messageId,
    thread_id: threadId,
    subject,
    source_app: clean(body.source_app || context.source_app || "0s-automation"),
    target_app: clean(body.target_app || context.target_app || action.id),
    created_at: new Date().toISOString(),
  };
  const packet = {
    label: clean(body.label || `Thread attach • ${subject}`).slice(0, 240),
    notes: clean(body.notes || "0S automation attached this SkyeMail thread to a downstream workflow.").slice(0, 4000),
    mailbox: {
      mailboxEmail,
      source: "skymail",
      selectedMailbox: mailboxEmail,
    },
    selection: {
      label: "0S Automation",
      selectedCount: 1,
      actionId: action.id,
      lane: action.lane,
      threadAttachment: attachment,
    },
    messages: [{
      id: messageId || threadId || attachment.id,
      threadId,
      subject,
      from: clean(context.from || body.from),
      to: clean(context.to || body.to),
      snippet: clean(context.snippet || context.text || body.text || "").slice(0, 1600),
      labels: ["SKYEMAIL_THREAD_ATTACH"],
      source: attachment.source_app,
    }],
    downstreamTargets: [{
      platform: action.label,
      actionId: action.id,
      lane: action.lane,
      capability: action.capability,
      bridge: "automation_thread_attach",
      apiRoute: action.apiRoute || "",
      path: action.path,
      reason: action.summary,
      talksTo: action.talksTo || [],
      iframe: false,
      launchUrl,
    }],
    recommendedActions: [
      "Review the attached SkyeMail thread in the Workbench.",
      "Open the target 0S surface through the shared gate.",
      "Write the downstream result back onto the SkyeMail workflow packet.",
    ],
    summary: {
      source: "skymail-thread-attach",
      targetPlatforms: [action.label],
      actionIds: [action.id],
      capabilities: [action.capability || "packet_bridge"],
      bridges: ["automation_thread_attach"],
      threadAttachment: attachment,
      launchUrl,
    },
    review: { status: "ready", owner: "0S operator", checkpoint: "Thread attached" },
    execution: { status: "queued", owner: "", checkpoint: `${action.lane} thread attach queued`, nextAction: `Open ${action.label}` },
    dispatch: { status: "queued", owner: "", channel: "skymail_thread_attach", nextAction: "Dispatch after downstream work is complete." },
    launchUrl,
    action,
  };
  const packetResponse = await createWorkflowPacket(env, auth, { mailHandoffPacket: packet });
  const packetData = await packetResponse.clone().json().catch(() => ({}));
  return json({ ...packetData, thread_attachment: attachment, route: "/thread-attach" }, packetResponse.status);
}

async function systemMessageTargets(env, body = {}) {
  const direct = [
    body.mailbox_email,
    body.mailboxEmail,
    body.mailbox,
    body.email,
    body.to,
  ].flatMap((item) => addressList(item)).map(normalizeEmail).filter(Boolean);
  const targets = [];
  const seen = new Set();
  for (const email of direct) {
    const mailbox = await getHostedMailboxByEmail(env, email).catch(() => null);
    if (!mailbox || seen.has(mailbox.id)) continue;
    seen.add(mailbox.id);
    targets.push(mailbox);
  }
  const workspaceId = clean(body.workspace_id || body.workspaceId || body.workspace || "");
  if (workspaceId) {
    const rows = await query(env, `
      select hm.*, u.email as owner_email, u.handle as owner_handle, u.fs27_customer_id
        from hosted_mailboxes hm
        join users u on u.id=hm.user_id
       where (hm.workspace_id=$1 or u.workspace_id=$1 or hm.skymail_id=$1)
         and coalesce(hm.status,'') not in ('released','offboarded','disabled')
       order by (hm.status='active') desc, hm.updated_at desc nulls last
       limit 10
    `, [workspaceId]).catch(() => []);
    for (const mailbox of rows) {
      if (!mailbox?.id || seen.has(mailbox.id)) continue;
      seen.add(mailbox.id);
      targets.push(mailbox);
    }
  }
  return targets;
}

async function handleSystemMessage(request, env, ctx) {
  const auth = await requireMailAutomationAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const subject = clean(body.subject || body.title || body.summary || "0S system message").slice(0, 240);
  const text = clean(body.message || body.text || body.body || body.description || body.summary || "0S recorded a system message for this SkyeMail workspace.").slice(0, 12000);
  const targets = await systemMessageTargets(env, body);
  if (!targets.length) {
    throw Object.assign(new Error("A provisioned SkyeMail mailbox_email, to, email, or workspace_id is required for system-message."), { statusCode: 404 });
  }
  const providerId = clean(body.provider_message_id || body.id || `system-message-${crypto.randomUUID()}`);
  const created = [];
  for (const mailbox of targets) {
    const deliveredTo = normalizeEmail(mailbox.mailbox_email || body.mailbox_email || body.to);
    const payload = {
      subject,
      message: text,
      html: String(body.html || ""),
      direction: "inbound",
      source: "0s-system-message",
      from: clean(body.from || "0S Automation <system@skyemail.local>"),
      to: [deliveredTo],
      delivered_to: deliveredTo,
      recipient_alias: deliveredTo,
      provider_runtime: body.provider_runtime || null,
      metadata: body.metadata || {},
      created_at: new Date().toISOString(),
    };
    const rows = await query(env, `
      insert into messages(user_id, from_name, from_email, key_version, encrypted_key_b64, iv_b64, ciphertext_b64,
        direction, delivery_provider, provider_message_id, delivery_status, last_delivery_event_at, recipient_alias, delivered_to)
      values($1,$2,$3,0,$4,$5,$6,'inbound','skymail-system',$7,'received',now(),$8,$9)
      returning id, created_at
    `, [
      mailbox.user_id,
      payload.from,
      extractAddress(payload.from) || "system@skyemail.local",
      "proof",
      "proof",
      proofBlob(payload),
      `${providerId}:${mailbox.id}`,
      deliveredTo,
      deliveredTo,
    ]);
    created.push({
      message_id: rows[0]?.id || null,
      created_at: rows[0]?.created_at || null,
      mailbox_email: deliveredTo,
      user_id: mailbox.user_id,
      delivery_status: "received",
    });
  }
  ctx?.waitUntil?.(backupCitadel(env, {
    id: `system_message_${providerId}`,
    type: "skymail.system_message.received",
    actor: auth.email || "skymail-service",
    ws_id: clean(body.workspace_id || body.workspaceId || targets[0]?.workspace_id || targets[0]?.id || ""),
    meta: { subject, targets: created, provider_runtime: body.provider_runtime || null },
  }));
  return json({
    ok: true,
    route: "/system-message",
    status: "stored_in_skymail_inbox",
    provider_call_made: true,
    id: providerId,
    delivered: created.length,
    messages: created,
  }, 201);
}

function workflowSummary(packet = {}) {
  const messages = Array.isArray(packet.messages) ? packet.messages : [];
  const targets = Array.isArray(packet.downstreamTargets) ? packet.downstreamTargets : [];
  return {
    messageSubjects: messages.map((item) => clean(item.subject || "(no subject)")).filter(Boolean).slice(0, 5),
    targetPlatforms: targets.map((item) => clean(item.platform)).filter(Boolean).slice(0, 8),
  };
}

function workflowPacketFromRow(row = {}) {
  const messages = asJsonValue(row.messages_json, []);
  const downstreamTargets = asJsonValue(row.downstream_targets_json, []);
  const summary = asJsonValue(row.summary_json, {});
  return {
    packetId: row.packet_id,
    label: row.label || "Mail handoff packet",
    notes: row.notes || "",
    mailbox: asJsonValue(row.mailbox_json, {}),
    selection: asJsonValue(row.selection_json, {}),
    messages,
    draftsSummary: asJsonValue(row.drafts_summary_json, {}),
    contactsSummary: asJsonValue(row.contacts_summary_json, {}),
    downstreamTargets,
    recommendedActions: asJsonValue(row.recommended_actions_json, []),
    summary: Object.keys(summary || {}).length ? summary : workflowSummary({ messages, downstreamTargets }),
    review: asJsonValue(row.review_json, {}),
    execution: asJsonValue(row.execution_json, {}),
    dispatch: asJsonValue(row.dispatch_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function workflowEventFromRow(row = {}) {
  return {
    id: row.id,
    packetId: row.packet_id || "",
    category: row.category || "workflow",
    type: row.type || "workflow_event",
    status: row.status || "",
    owner: row.owner || "",
    checkpoint: row.checkpoint || "",
    channel: row.channel || "",
    detail: row.detail || "",
    metadata: asJsonValue(row.metadata_json, {}),
    createdAt: row.created_at,
  };
}

async function ensureWorkflowRuntimeSchema(env) {
  const schema = schemaName(env);
  await query(env, `
    create table if not exists ${schema}.workflow_packets (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references ${schema}.users(id) on delete cascade,
      packet_id text not null,
      label text,
      notes text,
      mailbox_json jsonb not null default '{}'::jsonb,
      selection_json jsonb not null default '{}'::jsonb,
      messages_json jsonb not null default '[]'::jsonb,
      drafts_summary_json jsonb not null default '{}'::jsonb,
      contacts_summary_json jsonb not null default '{}'::jsonb,
      downstream_targets_json jsonb not null default '[]'::jsonb,
      recommended_actions_json jsonb not null default '[]'::jsonb,
      summary_json jsonb not null default '{}'::jsonb,
      review_json jsonb not null default '{}'::jsonb,
      execution_json jsonb not null default '{}'::jsonb,
      dispatch_json jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique(user_id, packet_id)
    )
  `);
  await query(env, `create index if not exists idx_workflow_packets_user_updated on ${schema}.workflow_packets(user_id, updated_at desc)`);
  await query(env, `
    create table if not exists ${schema}.workflow_events (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references ${schema}.users(id) on delete cascade,
      packet_id text,
      category text not null,
      type text not null,
      status text,
      owner text,
      checkpoint text,
      channel text,
      detail text,
      metadata_json jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);
  await query(env, `create index if not exists idx_workflow_events_user_created on ${schema}.workflow_events(user_id, created_at desc)`);
  await query(env, `create index if not exists idx_workflow_events_packet on ${schema}.workflow_events(user_id, packet_id, created_at desc)`);
}

async function listWorkflowPackets(env, userId, limit = 50) {
  await ensureWorkflowRuntimeSchema(env);
  const rows = await query(env, `
    select *
      from workflow_packets
     where user_id=$1
     order by updated_at desc
     limit $2
  `, [userId, limit]);
  return rows.map(workflowPacketFromRow);
}

async function listWorkflowEvents(env, userId, limit = 50) {
  await ensureWorkflowRuntimeSchema(env);
  const rows = await query(env, `
    select *
      from workflow_events
     where user_id=$1
     order by created_at desc
     limit $2
  `, [userId, limit]);
  return rows.map(workflowEventFromRow);
}

function workflowCounts(packets = []) {
  const reviewBoard = { ready: 0, blocked: 0, unassigned: 0 };
  const executionBoard = { queued: 0, active: 0, blocked: 0, unassigned: 0 };
  const dispatchBoard = { queued: 0, ready: 0, dispatched: 0, blocked: 0, unassigned: 0 };
  for (const packet of packets) {
    const review = packet.review || {};
    const execution = packet.execution || {};
    const dispatch = packet.dispatch || {};
    if (review.status === "ready") reviewBoard.ready += 1;
    if (review.status === "blocked") reviewBoard.blocked += 1;
    if (!review.owner) reviewBoard.unassigned += 1;
    if (execution.status === "queued") executionBoard.queued += 1;
    if (execution.status === "active") executionBoard.active += 1;
    if (execution.status === "blocked") executionBoard.blocked += 1;
    if (!execution.owner) executionBoard.unassigned += 1;
    if (dispatch.status === "queued") dispatchBoard.queued += 1;
    if (dispatch.status === "ready") dispatchBoard.ready += 1;
    if (dispatch.status === "dispatched") dispatchBoard.dispatched += 1;
    if (dispatch.status === "blocked") dispatchBoard.blocked += 1;
    if (!dispatch.owner) dispatchBoard.unassigned += 1;
  }
  return { reviewBoard, executionBoard, dispatchBoard };
}

function workflowTimelineSummary(events = []) {
  return events.reduce((summary, event) => {
    const key = ["archive", "review", "execution", "dispatch"].includes(event.category) ? event.category : "other";
    summary[key] = Number(summary[key] || 0) + 1;
    return summary;
  }, { archive: 0, review: 0, execution: 0, dispatch: 0 });
}

async function recordWorkflowEvent(env, userId, packetId, category, type, detail, state = {}, metadata = {}) {
  await ensureWorkflowRuntimeSchema(env);
  const rows = await query(env, `
    insert into workflow_events(user_id, packet_id, category, type, status, owner, checkpoint, channel, detail, metadata_json)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
    returning *
  `, [
    userId,
    packetId,
    category,
    type,
    clean(state.status),
    clean(state.owner),
    clean(state.checkpoint),
    clean(state.channel),
    detail,
    JSON.stringify(metadata || {}),
  ]);
  return workflowEventFromRow(rows[0] || {});
}

async function handleRuntimeStatus(env, auth) {
  const [packets, events] = await Promise.all([
    listWorkflowPackets(env, auth.sub, 50),
    listWorkflowEvents(env, auth.sub, 50),
  ]);
  const counts = workflowCounts(packets);
  const latest = packets[0] || null;
  return json({
    ok: true,
    runtime: "cloudflare-persisted",
    available: true,
    mailHandoffPackets: {
      total: packets.length,
      latestTargets: latest?.summary?.targetPlatforms || [],
    },
    workflowBoard: {
      archived: packets.length,
      reviewReady: counts.reviewBoard.ready,
      executionActive: counts.executionBoard.active,
      dispatchReady: counts.dispatchBoard.ready + counts.dispatchBoard.dispatched,
    },
    ...counts,
    workflowTimeline: workflowTimelineSummary(events),
    latestWorkflowEvent: events[0] || null,
  });
}

async function createWorkflowPacket(env, auth, payload = {}) {
  await ensureWorkflowRuntimeSchema(env);
  const packet = payload.mailHandoffPacket && typeof payload.mailHandoffPacket === "object" ? payload.mailHandoffPacket : payload;
  const packetId = clean(packet.packetId) || `skymail-packet-${Date.now().toString(36)}-${stableHex(`${auth.sub}:${packet.label}:${Date.now()}`, 8)}`;
  const messages = Array.isArray(packet.messages) ? packet.messages : [];
  const downstreamTargets = Array.isArray(packet.downstreamTargets) ? packet.downstreamTargets : [];
  const summary = Object.assign(workflowSummary({ messages, downstreamTargets }), packet.summary || {});
  const recommendedActions = Array.isArray(packet.recommendedActions) && packet.recommendedActions.length
    ? packet.recommendedActions
    : [
      "Review selected mailbox context.",
      "Assign the downstream owner.",
      "Dispatch into the chosen operator lane.",
    ];
  const rows = await query(env, `
    insert into workflow_packets(
      user_id, packet_id, label, notes, mailbox_json, selection_json, messages_json,
      drafts_summary_json, contacts_summary_json, downstream_targets_json,
      recommended_actions_json, summary_json, review_json, execution_json, dispatch_json
    )
    values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb)
    on conflict(user_id, packet_id)
    do update set
      label=excluded.label,
      notes=excluded.notes,
      mailbox_json=excluded.mailbox_json,
      selection_json=excluded.selection_json,
      messages_json=excluded.messages_json,
      drafts_summary_json=excluded.drafts_summary_json,
      contacts_summary_json=excluded.contacts_summary_json,
      downstream_targets_json=excluded.downstream_targets_json,
      recommended_actions_json=excluded.recommended_actions_json,
      summary_json=excluded.summary_json,
      updated_at=now()
    returning *
  `, [
    auth.sub,
    packetId,
    clean(packet.label || "Mail handoff packet").slice(0, 240),
    clean(packet.notes).slice(0, 4000),
    JSON.stringify(packet.mailbox || {}),
    JSON.stringify(packet.selection || {}),
    JSON.stringify(messages),
    JSON.stringify(packet.draftsSummary || {}),
    JSON.stringify(packet.contactsSummary || {}),
    JSON.stringify(downstreamTargets),
    JSON.stringify(recommendedActions),
    JSON.stringify(summary),
    JSON.stringify(packet.review || { status: "draft" }),
    JSON.stringify(packet.execution || {}),
    JSON.stringify(packet.dispatch || {}),
  ]);
  await recordWorkflowEvent(
    env,
    auth.sub,
    packetId,
    "archive",
    "mail_handoff_packet.archived",
    `Archived ${messages.length || Number(packet.selection?.selectedCount || 0) || 0} selected SkyeMail message(s).`,
    { status: "draft" },
    { targetPlatforms: summary.targetPlatforms || [] },
  );
  return json({
    ok: true,
    mailHandoffPacket: workflowPacketFromRow(rows[0] || {}),
    launchUrl: clean(packet.launchUrl),
    action: packet.action || null,
  });
}

async function updateWorkflowPacketState(env, auth, packetId, lane, state = {}) {
  await ensureWorkflowRuntimeSchema(env);
  const allowed = new Set(["review", "execution", "dispatch"]);
  if (!allowed.has(lane)) return json({ error: `Runtime state lane not supported: ${lane}` }, 404);
  const column = `${lane}_json`;
  const rows = await query(env, `
    update workflow_packets
       set ${column}=$3::jsonb,
           updated_at=now()
     where user_id=$1
       and packet_id=$2
     returning *
  `, [auth.sub, packetId, JSON.stringify(state || {})]);
  if (!rows[0]) return json({ error: "Mail handoff packet not found." }, 404);
  await recordWorkflowEvent(
    env,
    auth.sub,
    packetId,
    lane,
    `mail_handoff_packet.${lane}`,
    `${lane.charAt(0).toUpperCase() + lane.slice(1)} state saved for ${packetId}.`,
    state,
  );
  return json({ ok: true, mailHandoffPacket: workflowPacketFromRow(rows[0]) });
}

async function handleRuntimeCompat(request, env, name) {
  const auth = await requireAuth(request, env);
  const runtimePath = String(name || "").replace(/^runtime\/?/, "");
  if (request.method === "GET" && runtimePath === "status") {
    return await handleRuntimeStatus(env, auth);
  }
  if (request.method === "GET" && runtimePath === "mail-handoff-packets") {
    const items = await listWorkflowPackets(env, auth.sub, 50);
    return json({ ok: true, items, total: items.length });
  }
  if (request.method === "POST" && runtimePath === "mail-handoff-packets") {
    return await createWorkflowPacket(env, auth, await request.json().catch(() => ({})));
  }
  if (request.method === "GET" && runtimePath === "review-board") {
    const items = await listWorkflowPackets(env, auth.sub, 50);
    return json({ ok: true, counts: workflowCounts(items).reviewBoard, items });
  }
  if (request.method === "GET" && runtimePath === "execution-board") {
    const items = await listWorkflowPackets(env, auth.sub, 50);
    return json({ ok: true, counts: workflowCounts(items).executionBoard, items });
  }
  if (request.method === "GET" && runtimePath === "dispatch-board") {
    const items = await listWorkflowPackets(env, auth.sub, 50);
    return json({ ok: true, counts: workflowCounts(items).dispatchBoard, items });
  }
  if (request.method === "GET" && runtimePath === "workflow-timeline") {
    const items = await listWorkflowEvents(env, auth.sub, Math.max(1, Math.min(100, Number(new URL(request.url).searchParams.get("limit") || 50))));
    return json({ ok: true, workflowTimeline: { summary: workflowTimelineSummary(items), items, latestEvent: items[0] || null } });
  }
  const stateMatch = runtimePath.match(/^mail-handoff-packets\/([^/]+)\/(review|execution|dispatch)$/);
  if (request.method === "POST" && stateMatch) {
    const body = await request.json().catch(() => ({}));
    return await updateWorkflowPacketState(env, auth, decodeURIComponent(stateMatch[1]), stateMatch[2], body[stateMatch[2]] || body);
  }
  return json({ error: `Runtime route not implemented: ${runtimePath}` }, 404);
}

async function ensureSkyEmailTelemetrySchema(env) {
  const schema = schemaName(env);
  await query(env, `
    create table if not exists ${schema}.skyemail_telemetry_events (
      id text primary key,
      user_id uuid references ${schema}.users(id) on delete set null,
      mailbox_email text,
      actor_hash text,
      route text not null,
      method text not null,
      status integer not null default 0,
      ok boolean not null default false,
      elapsed_ms integer not null default 0,
      source text not null default 'worker-api',
      metadata_json jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);
  await query(env, `create index if not exists skyemail_telemetry_user_created_idx on ${schema}.skyemail_telemetry_events(user_id, created_at desc)`);
  await query(env, `create index if not exists skyemail_telemetry_route_created_idx on ${schema}.skyemail_telemetry_events(route, created_at desc)`);
}

async function telemetryActorForRequest(env, request) {
  const token = bearer(request);
  if (!token) return { user_id: null, actor_hash: "" };
  try {
    const claims = await introspectFs27(env, token);
    const user = await ensureUserFromFs27(env, claims);
    return {
      user_id: user?.id || null,
      actor_hash: stableHex(user?.email || claims?.sub || token, 24),
    };
  } catch {
    return { user_id: null, actor_hash: stableHex(token, 24) };
  }
}

async function recordSkyEmailTelemetry(env, request, routeName, responseStatus = 0, startedAt = Date.now(), metadata = {}) {
  await ensureSkyEmailTelemetrySchema(env);
  const actor = await telemetryActorForRequest(env, request);
  const mailboxEmail = normalizeEmail(
    request.headers.get("x-skymail-mailbox-email")
      || request.headers.get("x-skymail-mailbox")
      || "",
  );
  const status = Number(responseStatus || 0);
  await query(env, `
    insert into skyemail_telemetry_events(
      id, user_id, mailbox_email, actor_hash, route, method, status, ok, elapsed_ms, source, metadata_json
    )
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
  `, [
    `skymailtel_${Date.now().toString(36)}_${stableHex(`${routeName}:${request.method}:${startedAt}:${Math.random()}`, 14)}`,
    actor.user_id,
    mailboxEmail,
    actor.actor_hash,
    clean(routeName || "unknown").slice(0, 160),
    clean(request.method || "GET").slice(0, 12),
    status,
    status >= 200 && status < 400,
    Math.max(0, Date.now() - startedAt),
    "worker-api",
    JSON.stringify({
      path: new URL(request.url).pathname,
      ...metadata,
    }),
  ]);
}

async function handleSkyEmailTelemetrySummary(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const days = Math.max(1, Math.min(90, Number.parseInt(url.searchParams.get("days") || "7", 10) || 7));
  const limit = Math.max(1, Math.min(250, Number.parseInt(url.searchParams.get("limit") || "80", 10) || 80));
  const mailbox = normalizeEmail(url.searchParams.get("mailbox") || request.headers.get("x-skymail-mailbox-email") || "");
  const cacheKey = `telemetry-summary:${auth.sub}:${days}:${limit}:${mailbox}`;
  if (!["1", "true", "yes"].includes(String(url.searchParams.get("refresh") || "").toLowerCase())) {
    const cached = cacheGet(cacheKey);
    if (cached) return json({ ...cached, cached: true, cache_ttl_seconds: 15 });
  }
  await ensureSkyEmailTelemetrySchema(env);
  const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();
  const params = [auth.sub, since, mailbox];
  const where = `
    where user_id=$1
      and created_at >= $2::timestamptz
      and ($3 = '' or mailbox_email=$3)
  `;
  const [summaryRows, routeRows, recent] = await Promise.all([
    query(env, `
      select
        count(*)::int as total_events,
        count(*) filter (where ok)::int as ok_events,
        count(*) filter (where not ok)::int as failed_events,
        count(*) filter (where route in ('mail-brain','gateway-chat','gateway-stream'))::int as ai_events,
        count(*) filter (where route in ('mail-send','gmail-send'))::int as send_events,
        count(*) filter (where route in ('gmail-list','gmail-get','gmail-thread-get','mail-sync'))::int as inbox_events,
        count(*) filter (where route in ('mail-os-handoff','contacts-save'))::int as os_integration_events,
        coalesce(round(avg(elapsed_ms))::int,0) as avg_ms,
        coalesce(max(elapsed_ms),0)::int as max_ms
      from skyemail_telemetry_events
      ${where}
    `, params),
    query(env, `
      select route, method,
             count(*)::int as total,
             count(*) filter (where ok)::int as ok,
             count(*) filter (where not ok)::int as failed,
             coalesce(round(avg(elapsed_ms))::int,0) as avg_ms,
             coalesce(max(elapsed_ms),0)::int as max_ms,
             max(created_at) as latest_at
        from skyemail_telemetry_events
       ${where}
       group by route, method
       order by total desc, latest_at desc
       limit 80
    `, params),
    query(env, `
      select id, route, method, status, ok, elapsed_ms, mailbox_email, source, metadata_json, created_at
        from skyemail_telemetry_events
       ${where}
       order by created_at desc
       limit $4
    `, [...params, limit]),
  ]);
  const body = {
    ok: true,
    source: "skyemail-worker-telemetry",
    window_days: days,
    mailbox: mailbox || null,
    summary: summaryRows[0] || {},
    routes: routeRows,
    recent,
  };
  cacheSet(cacheKey, body, 15000);
  return json(body);
}

async function ensureSkyEmailGameSchema(env) {
  const schema = schemaName(env);
  await query(env, `
    create table if not exists ${schema}.skyemail_game_events (
      id text primary key,
      user_id uuid references ${schema}.users(id) on delete set null,
      mailbox_email text,
      event_key text not null,
      action text not null,
      xp integer not null default 0,
      badge_ids_json jsonb not null default '[]'::jsonb,
      detail_json jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `);
  await query(env, `create unique index if not exists skyemail_game_user_event_key_idx on ${schema}.skyemail_game_events(user_id, event_key)`);
  await query(env, `create index if not exists skyemail_game_user_created_idx on ${schema}.skyemail_game_events(user_id, created_at desc)`);
  await query(env, `create index if not exists skyemail_game_mailbox_created_idx on ${schema}.skyemail_game_events(mailbox_email, created_at desc)`);
}

function normalizeGameBadges(value) {
  const list = Array.isArray(value) ? value : [];
  return list.map((item) => clean(item).replace(/[^a-z0-9._:-]+/ig, "-").slice(0, 80)).filter(Boolean).slice(0, 12);
}

async function handleSkyEmailGameEvent(request, env) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const action = clean(body.action || body.type || "progress").replace(/[^a-z0-9._:-]+/ig, "-").slice(0, 80) || "progress";
  const mailboxEmail = normalizeEmail(body.mailbox || body.mailbox_email || request.headers.get("x-skymail-mailbox-email") || auth.selected_mailbox_email || auth.email || "");
  const detail = body.meta && typeof body.meta === "object" ? body.meta : {};
  const receiptId = clean(detail.receiptId || detail.receipt_id || detail.id || detail.message_id || detail.order_id || detail.session_id || "");
  const eventKey = clean(body.event_key || body.eventKey || detail.event_key || detail.key || (receiptId ? `${action}:${receiptId}` : "") || `${action}:${Date.now()}:${randomToken(8)}`).slice(0, 240);
  const xp = Math.max(0, Math.min(10000, Number(body.xp || 0) || 0));
  const badgeIds = normalizeGameBadges(body.badge_ids || body.badges || []);
  await ensureSkyEmailGameSchema(env);
  const rows = await query(env, `
    insert into skyemail_game_events(
      id, user_id, mailbox_email, event_key, action, xp, badge_ids_json, detail_json
    )
    values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)
    on conflict (user_id, event_key) do nothing
    returning id, created_at
  `, [
    `skymailgame_${Date.now().toString(36)}_${stableHex(`${auth.sub}:${eventKey}:${Math.random()}`, 14)}`,
    auth.sub,
    mailboxEmail,
    eventKey,
    action,
    xp,
    JSON.stringify(badgeIds),
    JSON.stringify({
      source: "skyemail-game-ledger",
      receipt_backed: Boolean(detail.receipt_backed || receiptId || detail.celebration?.receiptBacked),
      level: Number(body.level || 0) || null,
      ...detail,
    }),
  ]);
  return json({
    ok: true,
    stored: Boolean(rows.length),
    duplicate: !rows.length,
    event: {
      id: rows[0]?.id || null,
      event_key: eventKey,
      action,
      xp,
      badge_ids: badgeIds,
      mailbox: mailboxEmail || null,
      created_at: rows[0]?.created_at || null,
    },
  }, rows.length ? 201 : 200);
}

async function handleSkyEmailGameSummary(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(100, Number.parseInt(url.searchParams.get("limit") || "40", 10) || 40));
  const mailbox = normalizeEmail(url.searchParams.get("mailbox") || request.headers.get("x-skymail-mailbox-email") || "");
  await ensureSkyEmailGameSchema(env);
  const params = [auth.sub, mailbox];
  const where = `where user_id=$1 and ($2 = '' or mailbox_email=$2)`;
  const [summaryRows, recent] = await Promise.all([
    query(env, `
      select count(*)::int as total_events,
             coalesce(sum(xp),0)::int as total_xp,
             count(*) filter (where (detail_json->>'receipt_backed')::boolean is true)::int as receipt_backed_events,
             count(*) filter (where action='celebration')::int as thank_you_events,
             count(distinct action)::int as action_types
        from skyemail_game_events
       ${where}
    `, params),
    query(env, `
      select id, mailbox_email, event_key, action, xp, badge_ids_json, detail_json, created_at
        from skyemail_game_events
       ${where}
       order by created_at desc
       limit $3
    `, [...params, limit]),
  ]);
  return json({
    ok: true,
    source: "skyemail-game-ledger",
    mailbox: mailbox || null,
    summary: summaryRows[0] || {},
    recent,
  });
}

function apiNameFromPath(pathname) {
  const netlify = pathname.match(/^\/\.netlify\/functions\/(.+)$/);
  const api = pathname.match(/^\/api\/(.+)$/);
  const directNames = [
    "health",
    "admin-public-key",
    "public-key",
    "submit-message",
    ["auth", "signup"].join("-"),
    ["auth", "login"].join("-"),
    ["auth", "me"].join("-"),
    "auth-fs27-session",
    "vault-export",
    "vault-restore-keys",
    "keys-rotate",
    "vault-key-setup",
    "sovereign-key-setup",
    "gate-diagnostics",
    "mailbox-domains",
    "mail-status",
    "google-status",
    "google-oauth-start",
    "google-disconnect",
	    "gmail-watch",
	    "mailboxes-list",
	    "mailboxes-service-list",
	    "mailbox-provision",
	    "mailbox-aliases",
	    "mailbox-offboarding",
	    "mail-brain",
	    "mail-brain-plans",
	    "mail-brain-checkout",
	    "mail-brain-claim",
	    "mail-os-actions",
    "mail-os-health",
    "mail-os-handoff",
	    "mail-game-event",
	    "mail-game-summary",
	    "thread-attach",
	    "system-message",
	    "mail-settings-get",
    "mail-settings-save",
    "workspace-provision",
    "workspace-mailbox-summary",
    "workspace-mail-sync",
    "mail-send",
    "mail-sync",
    "mail-routing-health",
    "mail-routing-events",
    "mail-routing-webhook-events",
    "mail-routing-webhook",
    "zoho-webhook",
    "zoho-webhook-events",
    "mail-proof-loop",
    "resend-health",
    "resend-events-list",
    "telemetry-summary",
    "contacts-list",
    "contacts-save",
    "contacts-delete",
    "google-contacts-sync",
    "gmail-drafts-list",
    "gmail-draft-get",
    "gmail-draft-save",
    "gmail-draft-delete",
    "gmail-send",
    "gmail-list",
    "gmail-labels",
    "gmail-get",
    "gmail-thread-get",
    "gmail-modify",
    "gmail-batch-modify",
    "gmail-message-trash",
    "gmail-batch-delete",
    "gmail-attachment",
    "inbound-resend",
    "gateway-chat",
    "gateway-stream",
    "citadel-backup-test",
    "zoho-provider-smoke"
  ];
  const bare = pathname.replace(/^\/+/, "");
  const direct = directNames.includes(bare) ? bare : "";
  const raw = netlify?.[1] || api?.[1] || direct || "";
  return raw
    .replace(/^skymail-standalone-/, "")
    .replace(/\.js$/i, "");
}

async function routeApiDispatch(request, env, ctx, name) {
  if (request.method === "OPTIONS") return json({ ok: true });
  if (name.startsWith("runtime/")) return await handleRuntimeCompat(request, env, name);
  if (name === "health") return json({ ok: true, platform: "SkyeMail Sovereign Worker", primary_database: Boolean(env.NEON_DATABASE_URL || env.DATABASE_URL), citadel_backup: Boolean(env.CITADEL_BACKUP_URL || env.CITADEL_DATABASE_URL || env.CITADEL_BACKUP_DATABASE_URL) });
  if (name === "admin-public-key" && request.method === "GET") return await handleAdminPublicKey(request, env);
  if (name === "public-key" && request.method === "GET") return await handlePublicKey(request, env);
  if (name === "submit-message" && request.method === "POST") return await handleSubmitMessage(request, env, ctx);
  if (name === ["auth", "signup"].join("-") && request.method === "POST") return await handleAuthSignup(request, env, ctx);
  if (name === ["auth", "login"].join("-") && request.method === "POST") return await handleAuthLogin(request, env);
  if (name === ["auth", "me"].join("-") && request.method === "GET") return await handleAuthMe(request, env);
  if (name === "auth-fs27-session" && request.method === "POST") return await handleAuthFs27(request, env, ctx);
  if (name === "vault-export" && request.method === "GET") return await handleVaultExport(request, env);
  if (name === "vault-restore-keys" && request.method === "POST") return await handleVaultRestoreKeys(request, env);
  if (name === "keys-rotate" && request.method === "POST") return await handleKeysRotate(request, env, ctx);
  if ((name === "vault-key-setup" || name === "sovereign-key-setup") && request.method === "POST") return await handleVaultKeySetup(request, env, ctx);
  if (name === "gate-diagnostics" && request.method === "POST") return await handleGateDiagnostics(request, env);
  if (name === "mailbox-domains" && request.method === "GET") return await handleMailboxDomains(request, env);
  if (name === "zoho-provider-smoke" && (request.method === "GET" || request.method === "POST")) return await handleZohoProviderSmoke(request, env);
  if ((name === "mail-status" || name === "google-status") && request.method === "GET") return await handleMailStatus(request, env);
  if (name === "google-oauth-start" && request.method === "GET") return await handleGoogleOauthStart(request, env);
  if (name === "google-disconnect" && request.method === "POST") return await handleGoogleDisconnect(request, env);
  if (name === "gmail-watch" && (request.method === "GET" || request.method === "POST" || request.method === "DELETE")) return await handleGmailWatch(request, env);
  if (name === "mailboxes-list" && request.method === "GET") return await handleMailboxesList(request, env);
  if (name === "mailboxes-service-list" && request.method === "GET") return await handleMailboxesServiceList(request, env);
  if (name === "mailbox-provision" && request.method === "POST") return await handleMailboxProvision(request, env, ctx);
	  if (name === "mailbox-aliases" && (request.method === "GET" || request.method === "POST")) return await handleMailboxAliases(request, env, ctx);
	  if (name === "mailbox-offboarding" && (request.method === "GET" || request.method === "POST")) return await handleMailboxOffboarding(request, env, ctx);
	  if (name === "mail-brain" && (request.method === "GET" || request.method === "POST")) return await handleMailBrain(request, env, ctx);
	  if (name === "mail-brain-plans" && request.method === "GET") return await handleMailBrainPlans(request, env);
	  if (name === "mail-brain-checkout" && request.method === "POST") return await handleMailBrainCheckout(request, env, ctx);
	  if (name === "mail-brain-claim" && request.method === "POST") return await handleMailBrainClaim(request, env, ctx);
	  if (name === "mail-os-actions" && request.method === "GET") return await handleMailOsActions(request, env);
	  if (name === "mail-os-health" && request.method === "GET") return await handleMailOsHealth(request, env);
	  if (name === "mail-os-handoff" && request.method === "POST") return await handleMailOsHandoff(request, env);
	  if (name === "mail-game-event" && request.method === "POST") return await handleSkyEmailGameEvent(request, env);
	  if (name === "mail-game-summary" && request.method === "GET") return await handleSkyEmailGameSummary(request, env);
	  if (name === "thread-attach" && request.method === "POST") return await handleThreadAttach(request, env);
	  if (name === "system-message" && request.method === "POST") return await handleSystemMessage(request, env, ctx);
	  if (name === "mail-settings-get" && request.method === "GET") return await handleMailSettingsGet(request, env);
  if (name === "mail-settings-save" && request.method === "POST") return await handleMailSettingsSave(request, env);
  if (name === "workspace-provision" && request.method === "POST") return await handleWorkspaceProvision(request, env, ctx);
  if (name === "workspace-mailbox-summary" && (request.method === "GET" || request.method === "POST")) return await handleWorkspaceMailboxSummary(request, env);
  if (name === "workspace-mail-sync" && (request.method === "GET" || request.method === "POST")) return await handleWorkspaceMailSync(request, env, ctx);
  if ((name === "mail-send" || name === "gmail-send") && request.method === "POST") return await handleMailSend(request, env, ctx);
  if (name === "mail-sync" && (request.method === "GET" || request.method === "POST")) return await handleMailSync(request, env, ctx);
  if ((name === "zoho-webhook" || name === "mail-routing-webhook") && request.method === "POST") return await handleZohoWebhook(request, env, ctx);
  if ((name === "zoho-webhook-events" || name === "mail-routing-webhook-events") && request.method === "GET") return await handleZohoWebhookEventsList(request, env);
  if (name === "mail-proof-loop" && request.method === "POST") return await handleMailProofLoop(request, env, ctx);
  if ((name === "resend-health" || name === "mail-routing-health") && request.method === "GET") return await handleResendHealth(request, env);
  if ((name === "resend-events-list" || name === "mail-routing-events") && request.method === "GET") return await handleResendEventsList(request, env);
  if (name === "telemetry-summary" && request.method === "GET") return await handleSkyEmailTelemetrySummary(request, env);
  if (name === "contacts-list" && request.method === "GET") return await handleContactsList(request, env);
  if (name === "contacts-save" && request.method === "POST") return await handleContactsSave(request, env);
  if (name === "contacts-delete" && request.method === "POST") return await handleContactsDelete(request, env);
  if (name === "google-contacts-sync" && request.method === "POST") return await handleGoogleContactsSync(request, env);
  if (name === "gmail-drafts-list" && request.method === "GET") return await handleDraftsList(request, env);
  if (name === "gmail-draft-get" && request.method === "GET") return await handleDraftGet(request, env);
  if (name === "gmail-draft-save" && request.method === "POST") return await handleDraftSave(request, env, ctx);
  if (name === "gmail-draft-delete" && request.method === "POST") return await handleDraftDelete(request, env, ctx);
  if (name === "gmail-list" && request.method === "GET") return await handleGmailList(request, env);
  if (name === "gmail-labels" && request.method === "GET") return await handleGmailLabels(request, env);
  if (name === "gmail-get" && request.method === "GET") return await handleGmailGet(request, env);
  if (name === "gmail-thread-get" && request.method === "GET") return await handleGmailThreadGet(request, env);
  if (name === "gmail-modify" && request.method === "POST") return await handleMailModify(request, env, ctx);
  if (name === "gmail-batch-modify" && request.method === "POST") return await handleMailModify(request, env, ctx);
  if (name === "gmail-message-trash" && (request.method === "POST" || request.method === "DELETE")) return await handleMailTrash(request, env, ctx);
  if (name === "gmail-batch-delete" && request.method === "POST") return await handleMailBatchDelete(request, env, ctx);
  if (name === "gmail-attachment" && request.method === "GET") return await handleMailAttachment(request, env);
  if (name === "inbound-resend" && request.method === "POST") return await handleInboundResend(request, env, ctx);
  if (name === "gateway-chat" && request.method === "POST") return await handleGatewayChat(request, env, ctx);
  if (name === "gateway-stream" && request.method === "POST") return await handleGatewayStream(request, env, ctx);
  if (name === "citadel-backup-test" && request.method === "POST") return await handleCitadelBackupTest(request, env);
  return json({ error: `SkyeMail API route not implemented: ${name}` }, 404);
}

async function routeApi(request, env, ctx, name) {
  const started = Date.now();
  let status = 500;
  let errorMessage = "";
  try {
    const response = await routeApiDispatch(request, env, ctx, name);
    status = Number(response?.status || 200);
    return response;
  } catch (error) {
    status = Number(error?.statusCode || error?.status || 500);
    errorMessage = clean(error?.message || "api_error").slice(0, 300);
    throw error;
  } finally {
    if (request.method !== "OPTIONS") {
      ctx?.waitUntil?.(recordSkyEmailTelemetry(env, request, name, status, started, errorMessage ? { error: errorMessage } : {}).catch(() => null));
    }
  }
}

function skyemailBackgroundPartialHtml() {
  return `<div class="skyemail-bg-partial" data-skyemail-background-partial aria-hidden="true">
  <video class="skyemail-bg-video" autoplay muted loop playsinline data-skyemail-poster="assets/skyemail-logo-loop-poster.png">
    <source data-skyemail-src="assets/skyemail-logo-loop.webm" type="video/webm" />
  </video>
  <div class="skyemail-bg-vignette"></div>
  <div class="skyemail-bg-grid"></div>
  <div class="skyemail-bg-orbit skyemail-bg-orbit-a">
    <img data-skyemail-src="assets/merser-message-sigil.svg" alt="" />
  </div>
  <div class="skyemail-bg-orbit skyemail-bg-orbit-b">
    <img data-skyemail-src="assets/merser-proof-ledger.svg" alt="" />
  </div>
  <div class="skyemail-bg-mark">
    <img data-skyemail-src="assets/merser-mail-glyph.svg" alt="" />
  </div>
  <div class="skyemail-bg-brand">
    <img data-skyemail-src="assets/skyes-over-london-deity-logo.png" alt="" />
  </div>
</div>`;
}

async function serveStatic(request, env) {
  if (!env.ASSETS) return null;
  const url = new URL(request.url);
  let pathname = url.pathname;
  const legacySuiteStandalone = pathname.match(/^\/(?:suite\/)?standalone\/([a-z0-9-]+\.html)$/i);
  if (legacySuiteStandalone) {
    const target = new URL(`/${legacySuiteStandalone[1]}`, url.origin);
    url.searchParams.forEach((value, key) => target.searchParams.set(key, value));
    return Response.redirect(target.toString(), 302);
  }
  if (pathname === "/favicon.ico") {
    return new Response(null, {
      status: 204,
      headers: {
        "cache-control": "public, max-age=86400",
      },
    });
  }
  if (pathname === "/partials/skyemail-background" || pathname === "/partials/skyemail-background.html") {
    return new Response(skyemailBackgroundPartialHtml(), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  }
  if (pathname === "/") {
    const indexRequest = new Request(new URL("/__skyemail_root", url.origin), request);
    const indexRes = await env.ASSETS.fetch(indexRequest);
    if (indexRes.status !== 404) {
      const headers = new Headers(indexRes.headers);
      headers.set("content-type", "text/html; charset=utf-8");
      return new Response(indexRes.body, { status: indexRes.status, headers });
    }
    return null;
  }
  if (pathname === "/founder") {
    const founderRequest = new Request(new URL("/__skyemail_founder", url.origin), request);
    const founderRes = await env.ASSETS.fetch(founderRequest);
    if (founderRes.status !== 404) {
      const headers = new Headers(founderRes.headers);
      headers.set("content-type", "text/html; charset=utf-8");
      return new Response(founderRes.body, { status: founderRes.status, headers });
    }
  }
  const htmlPage = pathname.match(/^\/([a-z0-9-]+)\.html$/i);
  if (htmlPage && url.search) {
    const routedUrl = new URL(`/${htmlPage[1]}/${url.search}`, url.origin);
    const routedRes = await env.ASSETS.fetch(new Request(routedUrl, request));
    if (routedRes.status !== 404) return routedRes;
  }
  if (!pathname.includes(".") && !pathname.endsWith("/")) {
    const indexRequest = new Request(new URL(`${pathname}/index.html`, url.origin), request);
    const indexRes = await env.ASSETS.fetch(indexRequest);
    if (indexRes.status !== 404) return indexRes;
    const htmlRequest = new Request(new URL(`${pathname}.html${url.search}`, url.origin), request);
    const htmlRes = await env.ASSETS.fetch(htmlRequest);
    if (htmlRes.status !== 404 && !isSelfCanonicalAssetRedirect(htmlRes, url)) return htmlRes;
  }
  const assetRequest = new Request(new URL(pathname, url.origin), request);
  const res = await env.ASSETS.fetch(assetRequest);
  if (res.status !== 404) return res;
  return null;
}

function isSelfCanonicalAssetRedirect(response, url) {
  if (![301, 302, 303, 307, 308].includes(response?.status)) return false;
  const location = response.headers?.get?.("location") || "";
  if (!location) return false;
  try {
    const target = new URL(location, url.origin);
    return target.origin === url.origin
      && target.pathname.replace(/\/$/, "") === url.pathname.replace(/\/$/, "")
      && target.search === url.search;
  } catch {
    return false;
  }
}

async function runScheduledMailSync(env, ctx) {
  if (!zohoApiConfigured(env)) return { ok: true, skipped: true, reason: "SkyeMail production mail API is not configured." };
  const rows = await query(env, `
    select hm.user_id, u.email, u.fs27_customer_id
      from hosted_mailboxes hm
      join users u on u.id=hm.user_id
     where hm.provider='zoho'
       and hm.status='active'
     order by hm.updated_at desc
     limit 20
  `).catch(() => []);
  const results = [];
  for (const row of rows) {
    const auth = { sub: row.user_id, email: row.email, fs27_customer_id: row.fs27_customer_id || null };
    const result = await importZohoInboxDeltas(env, auth, { limit: 25 }).catch((error) => ({ ok: false, error: error.message || "sync failed", user_id: row.user_id }));
    results.push(result);
    if (result.ok && !result.skipped) {
      const event = { type: "skymail.mail.scheduled_sync", actor: row.email || row.user_id, org_id: row.fs27_customer_id || null, ws_id: result.mailbox?.id || row.user_id, meta: result };
      ctx?.waitUntil?.(backupCitadel(env, { ...event, id: `scheduled_sync_${row.user_id}_${Date.now()}` }));
    }
  }
  return { ok: true, scanned_mailboxes: rows.length, imported: results.reduce((sum, item) => sum + Number(item.imported || 0), 0), results };
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      if (request.method === "POST" && url.pathname === "/") return await handleZohoWebhook(request, env, ctx);
      const name = apiNameFromPath(url.pathname);
      if (name) return await routeApi(request, env, ctx, name);
      const staticRes = await serveStatic(request, env);
      if (staticRes) return staticRes;
      const ext = url.pathname.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase();
      return new Response("Not found", { status: 404, headers: { "content-type": TEXT_TYPES[ext] || "text/plain; charset=utf-8" } });
    } catch (error) {
      return json({ error: error.message || "Server error", provider_response: error.providerResponse || null }, error.statusCode || 500);
    }
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runScheduledMailSync(env, ctx));
  },
};
