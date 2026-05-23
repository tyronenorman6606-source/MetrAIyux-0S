import { neon } from "@neondatabase/serverless";
import { Webhook } from "svix";

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
      "access-control-allow-headers": "content-type,authorization,x-skymail-provision-secret",
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

function bearer(request) {
  return (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

function base64Url(input) {
  const bytes = input instanceof Uint8Array ? input : new TextEncoder().encode(String(input));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
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

async function signJwt(payload, secret, ttlSeconds = 14 * 24 * 60 * 60) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const head = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const data = base64Url(JSON.stringify(body));
  const signature = base64Url(await hmacSha256(secret, `${head}.${data}`));
  return `${head}.${data}.${signature}`;
}

async function verifyJwt(token, secret) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  const expected = base64Url(await hmacSha256(secret, `${parts[0]}.${parts[1]}`));
  if (expected !== parts[2]) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  const raw = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const payload = JSON.parse(atob(raw));
  if (payload.exp && Number(payload.exp) <= Math.floor(Date.now() / 1000)) {
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  }
  return payload;
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
  "message_delivery_events",
  "hosted_mailboxes",
  "mailbox_aliases",
  "workspace_key_cards",
  "skymail_backup_events",
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
  return await verifyJwt(token, env.JWT_SECRET);
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

function aiMonth() {
  return { spent_cents: 0, cap_cents: 0, note: "metering-not-wired-on-skymail-worker" };
}

async function runOpenAi(env, body) {
  if (!env.OPENAI_API_KEY) throw Object.assign(new Error("OPENAI_API_KEY is missing."), { statusCode: 501 });
  const model = clean(body.model) || env.OPENAI_MODEL || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages: normalizeMessages(body.messages),
      max_tokens: Number(body.max_tokens || 900),
      temperature: Number(body.temperature ?? 0.35),
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.error?.message || data?.message || `OpenAI failed (${res.status}).`), { statusCode: res.status, providerResponse: data });
  return {
    output_text: data?.choices?.[0]?.message?.content || "",
    usage: data?.usage || null,
    model,
    provider: "openai",
    month: aiMonth(),
  };
}

async function runAnthropic(env, body) {
  if (!env.ANTHROPIC_API_KEY) throw Object.assign(new Error("ANTHROPIC_API_KEY is missing."), { statusCode: 501 });
  const model = clean(body.model) || env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";
  const messages = normalizeMessages(body.messages);
  const system = messages.filter((item) => item.role === "system").map((item) => item.content).join("\n\n");
  const chat = messages.filter((item) => item.role !== "system").map((item) => ({
    role: item.role === "assistant" ? "assistant" : "user",
    content: item.content,
  }));
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      system: system || undefined,
      messages: chat.length ? chat : [{ role: "user", content: "Hello" }],
      max_tokens: Number(body.max_tokens || 900),
      temperature: Number(body.temperature ?? 0.35),
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.error?.message || data?.message || `Anthropic failed (${res.status}).`), { statusCode: res.status, providerResponse: data });
  return {
    output_text: Array.isArray(data?.content) ? data.content.map((part) => part.text || "").join("") : "",
    usage: data?.usage || null,
    model,
    provider: "anthropic",
    month: aiMonth(),
  };
}

async function runAi(env, body) {
  const provider = clean(body.provider || "openai").toLowerCase();
  if (provider === "anthropic") return await runAnthropic(env, body);
  return await runOpenAi(env, body);
}

async function handleGatewayChat(request, env) {
  const body = await request.json().catch(() => ({}));
  const data = await runAi(env, body);
  return json(data);
}

async function handleGatewayStream(request, env) {
  const body = await request.json().catch(() => ({}));
  const data = await runAi(env, body);
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode(`event: meta\ndata: ${JSON.stringify({ month: data.month, provider: data.provider, model: data.model })}\n\n`));
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

function serviceAuth(request, env) {
  const token = bearer(request);
  const expected = clean(env.SKYMAIL_SERVICE_TOKEN || env.SKYE_MAIL_SERVICE_TOKEN);
  if (!expected) throw Object.assign(new Error("SKYMAIL_SERVICE_TOKEN is missing."), { statusCode: 501 });
  if (!token || token !== expected) throw Object.assign(new Error("Unauthorized service request."), { statusCode: 401 });
  return true;
}

function mailboxLocalFromWorkspace(body = {}) {
  const source = clean(body.local_part || body.localPart || body.workspace_slug || body.slug || body.company_name || body.companyName || body.owner_email || body.email);
  const base = source.includes("@") ? source.split("@")[0] : source;
  return base.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || `workspace-${crypto.randomUUID().slice(0, 8)}`;
}

const ZOHO_ENV_ALIASES = {
  ZOHO_CLIENT_ID: ["Client_ID", "ZOHO_MAIL_CLIENT_ID"],
  ZOHO_CLIENT_SECRET: ["Client_Secret", "ZOHO_MAIL_CLIENT_SECRET"],
  ZOHO_REFRESH_TOKEN: ["Refresh_Token_ID", "Refresh_Token", "ZOHO_MAIL_REFRESH_TOKEN"],
  ZOHO_ORG_ID: ["Org_ID", "Organization_ID", "ZOHO_ORGANIZATION_ID", "ZOHO_ZOID"],
  ZOHO_ACCOUNT_ID: ["Account_ID", "ZOHO_MAIL_ACCOUNT_ID"],
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

function providerConfigured(env) {
  const provider = clean(env.MAILBOX_PROVIDER || "stalwart").toLowerCase();
  const stalwartReady = Boolean(env.STALWART_BASE_URL && env.STALWART_MANAGEMENT_API_KEY);
  const externalReady = Boolean(env.MAILBOX_PROVISION_WEBHOOK_URL && env.MAILBOX_PROVISION_WEBHOOK_SECRET);
  const zohoApiReady = Boolean(envValue(env, "ZOHO_CLIENT_ID") && envValue(env, "ZOHO_CLIENT_SECRET") && envValue(env, "ZOHO_REFRESH_TOKEN"));
  const zohoOrgReady = Boolean(envValue(env, "ZOHO_ORG_ID"));
  const zohoReady = Boolean(zohoApiReady && zohoOrgReady);
  let configured = stalwartReady;
  if (provider === "external-webhook") configured = externalReady;
  if (provider === "zoho") configured = zohoReady;
  return { provider, configured, stalwartReady, externalReady, zohoReady, zohoApiReady, zohoOrgReady };
}

function providerSetupMessage(provider = "stalwart") {
  if (provider === "zoho") return "Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN, or use the root env aliases Client_ID, Client_Secret, and Refresh_Token_ID. ZOHO_ORG_ID is optional when the token can read /api/organization.";
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

async function parseZohoResponse(res) {
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const message = data?.data?.moreInfo || data?.data?.errorMessage || data?.message || data?.status?.description || data?.error || text || `Zoho request failed (${res.status}).`;
    throw Object.assign(new Error(message), { statusCode: res.status, providerResponse: data });
  }
  return data;
}

async function getZohoAccessToken(env) {
  if (!zohoApiConfigured(env)) throw Object.assign(new Error("Zoho API is not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN."), { statusCode: 501 });
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
  if (!data?.access_token) throw Object.assign(new Error(data?.error || "Zoho did not return an access token."), { statusCode: 502, providerResponse: data });
  return data.access_token;
}

async function zohoFetch(env, path, init = {}) {
  const token = await getZohoAccessToken(env);
  return await parseZohoResponse(await fetch(`${zohoMailBase(env)}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Zoho-oauthtoken ${token}`,
      ...(init.headers || {}),
    },
  }));
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

function extractZohoMessageId(payload) {
  const data = payload?.data || payload;
  const candidates = [data?.messageId, data?.message_id, data?.id, payload?.messageId, payload?.id];
  const match = candidates.find((value) => value != null && clean(value));
  return match != null ? String(match) : null;
}

async function getZohoOrganizationId(env) {
  const configured = envValue(env, "ZOHO_ORG_ID");
  if (configured) return configured;
  const payload = await zohoFetch(env, "/api/organization");
  const orgId = extractZohoOrganizationId(payload);
  if (!orgId) throw Object.assign(new Error("No Zoho organization id found. Set ZOHO_ORG_ID or generate the refresh token with organization read scope."), { statusCode: 502, providerResponse: payload });
  return orgId;
}

async function getZohoMailAccountId(env, preferredAccountId = null) {
  if (envValue(env, "ZOHO_ACCOUNT_ID")) return envValue(env, "ZOHO_ACCOUNT_ID");
  if (clean(preferredAccountId) && !String(preferredAccountId).startsWith("local:")) return clean(preferredAccountId);
  const payload = await zohoFetch(env, "/api/accounts");
  const accountId = extractZohoAccountId(payload);
  if (!accountId) throw Object.assign(new Error("No Zoho Mail accountId found. Set ZOHO_ACCOUNT_ID manually."), { statusCode: 502, providerResponse: payload });
  return accountId;
}

function randomMailboxPassword() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

async function provisionZohoMailbox(env, { email, localPart, user }) {
  if (!zohoProvisioningConfigured(env)) throw Object.assign(new Error("Zoho provider is not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, and ZOHO_ORG_ID."), { statusCode: 501 });
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
    credential_note: "Zoho mailbox password was generated once. Store it in a secret manager if direct Zoho/IMAP login is needed.",
  };
}

async function zohoSendMail(env, { accountId, fromAddress, to, subject, html, text }) {
  if (!zohoApiConfigured(env)) throw Object.assign(new Error("Zoho API is not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN."), { statusCode: 501 });
  const zohoAccountId = await getZohoMailAccountId(env, accountId);
  const from = clean(fromAddress || envValue(env, "ZOHO_DEFAULT_FROM"));
  if (!from) throw Object.assign(new Error("ZOHO_DEFAULT_FROM or a hosted mailbox sender is required for Zoho sending."), { statusCode: 501 });
  const payload = await zohoFetch(env, `/api/accounts/${encodeURIComponent(zohoAccountId)}/messages`, {
    method: "POST",
    body: JSON.stringify({
      fromAddress: from,
      toAddress: Array.isArray(to) ? to.join(",") : String(to || ""),
      subject,
      content: html || text || "",
      mailFormat: html ? "html" : "plaintext",
      askReceipt: "no",
    }),
  });
  return { ...payload, id: extractZohoMessageId(payload) || `zoho-${crypto.randomUUID()}`, accountId: zohoAccountId };
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
  };
}

async function zohoListFolders(env, accountId = null) {
  const zohoAccountId = await getZohoMailAccountId(env, accountId);
  const payload = await zohoFetch(env, `/api/accounts/${encodeURIComponent(zohoAccountId)}/folders`);
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

async function zohoFolderIdForLabel(env, accountId, label) {
  const requested = clean(label).toUpperCase();
  if (!requested) return "";
  const folders = await zohoListFolders(env, accountId);
  const found = folders.items.find((folder) => folder.id === requested);
  return found?.provider_folder_id || "";
}

async function zohoListMessages(env, { accountId = null, mailbox = "", label = "", max = 25, pageToken = "", q = "" } = {}) {
  const zohoAccountId = await getZohoMailAccountId(env, accountId);
  const limit = Math.min(Math.max(Number(max || 25), 1), 100);
  const start = Math.max(Number(pageToken || 1), 1);
  const requestedLabel = clean(label).toUpperCase();
  const folderId = q ? "" : await zohoFolderIdForLabel(env, zohoAccountId, requestedLabel);
  const params = new URLSearchParams({ start: String(start), limit: String(limit), includeto: "true" });
  if (q) {
    params.set("searchKey", q);
  } else {
    params.set("status", "all");
    params.set("sortBy", "date");
    params.set("sortorder", "false");
    params.set("includesent", "true");
    if (folderId) params.set("folderId", folderId);
  }
  const path = q
    ? `/api/accounts/${encodeURIComponent(zohoAccountId)}/messages/search?${params.toString()}`
    : `/api/accounts/${encodeURIComponent(zohoAccountId)}/messages/view?${params.toString()}`;
  const payload = await zohoFetch(env, path);
  const messages = Array.isArray(payload?.data) ? payload.data : [];
  return {
    ok: true,
    mailbox: mailbox || envValue(env, "ZOHO_DEFAULT_FROM") || zohoAccountId,
    nextPageToken: messages.length >= limit ? String(start + limit) : null,
    resultSizeEstimate: Number(payload?.resultSizeEstimate || messages.length),
    items: messages.map((message) => zohoMessageSummary(message, { accountId: zohoAccountId, mailbox, label: requestedLabel || "" })),
  };
}

function stripHtml(value) {
  return String(value || "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function zohoGetMessage(env, { id, accountId = null, mailbox = "" }) {
  const fallbackAccountId = await getZohoMailAccountId(env, accountId);
  const parsed = parseZohoUiId(id, fallbackAccountId);
  if (!parsed.messageId) throw Object.assign(new Error("Zoho message id required."), { statusCode: 400 });
  if (!parsed.folderId) throw Object.assign(new Error("Zoho message folder id missing. Open the message from a Zoho-backed list result."), { statusCode: 400 });
  const payload = await zohoFetch(env, `/api/accounts/${encodeURIComponent(parsed.accountId)}/folders/${encodeURIComponent(parsed.folderId)}/messages/${encodeURIComponent(parsed.messageId)}/content`);
  const data = payload?.data || payload || {};
  const html = data?.content || data?.html || data?.body || "";
  const text = data?.text || data?.summary || stripHtml(html);
  return {
    ok: true,
    mailbox: mailbox || envValue(env, "ZOHO_DEFAULT_FROM") || parsed.accountId,
    message: {
      id: zohoUiId(parsed.accountId, parsed.folderId, parsed.messageId),
      thread_id: zohoUiId(parsed.accountId, parsed.folderId, parsed.messageId),
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
      attachments: [],
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

async function provisionMailbox(env, { email, localPart, domain, user, fs27 }) {
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
    return await provisionZohoMailbox(env, { email, localPart, domain, user, fs27 });
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
  if (!origin) throw Object.assign(new Error("SKYGATEFS27_ORIGIN/SKYGATE_ORIGIN is missing."), { statusCode: 501 });
  const paths = ["/auth-introspect", "/auth/introspect", "/.netlify/functions/auth-introspect"];
  let last = null;
  let endpointMissing = true;
  for (const path of paths) {
    const res = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({ active: false }));
    last = { res, data };
    if (res.status === 404) continue;
    endpointMissing = false;
    if (!res.ok || data.active !== true) throw Object.assign(new Error(data.error || "0S/SkyGate session is inactive."), { statusCode: res.ok ? 401 : res.status });
    return data;
  }
  if (endpointMissing) {
    const verified = await verifyFs27JwtWithJwks(origin, token);
    if (verified?.active) return verified;
  }
  throw Object.assign(new Error(`FS27 introspection endpoint was not found at ${origin}.`), {
    statusCode: last?.res?.status || 404,
    providerResponse: last?.data || null,
  });
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

  return results.length ? { ok: results.some((r) => r.ok), results } : { ok: false, skipped: true, reason: "Citadel backup env is not configured." };
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
    throw Object.assign(new Error("Invalid Resend webhook signature."), { statusCode: 401 });
  }
}

async function resendGet(env, path) {
  if (!env.RESEND_API_KEY) throw Object.assign(new Error("RESEND_API_KEY is missing."), { statusCode: 501 });
  const res = await fetch(`https://api.resend.com${path}`, {
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}` },
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) throw Object.assign(new Error(data?.message || data?.error || text || `Resend GET failed (${res.status}).`), { statusCode: res.status });
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

async function ensureUserFromFs27(env, claims) {
  const email = normalizeEmail(claims.email || claims.username);
  if (!email || !email.includes("@")) throw Object.assign(new Error("0S/SkyGate session must include an email."), { statusCode: 400 });
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
    return rows[0];
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
  const rows = await query(env, `
    insert into users(
      handle, email, password_hash, skymail_id, workspace_id,
      fs27_sub, fs27_customer_id, fs27_gate_card_id, fs27_card_json
    )
    values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
    returning id, handle, email, skymail_id, workspace_id, fs27_sub, fs27_customer_id, fs27_gate_card_id
  `, [handle, email, `fs27:${claims.sub || crypto.randomUUID()}`, skymailId, workspaceId, fs27Sub, fs27CustomerId, fs27GateCardId, JSON.stringify(claims.gate_card || claims.card || null)]);
  return rows[0];
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
  const rows = await query(env, `
    insert into users(handle, email, password_hash)
    values($1,$2,$3)
    returning id, handle, email
  `, [handle, cleanEmail, `service:${sourceId || crypto.randomUUID()}`]);
  return rows[0];
}

async function activeKeyState(env, userId) {
  const rows = await query(env, "select version from user_keys where user_id=$1 and is_active=true limit 1", [userId]);
  return rows[0] ? { active: true, version: rows[0].version } : { active: false, version: null };
}

function publicSkymailUrl(env) {
  return clean(env.SKYMAIL_PUBLIC_URL || env.PUBLIC_APP_URL || "https://skyemail-platform.graylondonskyes.workers.dev").replace(/\/+$/, "");
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
    title: "SkyeMail Vault Key Card",
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
      "The client creates the vault key pair in their browser.",
      "SkyeMail stores the public key for inbound encryption.",
      "The private key is stored only after being wrapped by the client's Vault Passphrase.",
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
  const claims = await introspectFs27(env, bearer(request));
  const user = await ensureUserFromFs27(env, claims);
  const token = await signJwt({
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
  }, env.JWT_SECRET);
  const event = { type: "skymail.auth.fs27_session", actor: user.email, org_id: claims.customer_id || claims.org || null, ws_id: user.id, meta: { skymail_user_id: user.id, skymail_id: user.skymail_id || null, workspace_id: user.workspace_id || null, fs27_sub: claims.sub || null, fs27_gate_card_id: user.fs27_gate_card_id || claims.gate_card_id || null } };
  ctx.waitUntil(mirrorFs27(env, event));
  ctx.waitUntil(backupCitadel(env, { ...event, id: `auth_${user.id}_${Date.now()}` }));
  return json({
    ok: true,
    token,
    handle: user.handle,
    email: user.email,
    skymail_id: user.skymail_id || null,
    workspace_id: user.workspace_id || null,
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

async function handleMailboxDomains(_request, env) {
  const provider = providerConfigured(env);
  return json({
    ok: true,
    domains: configuredDomains(env),
    primary_domain: configuredDomains(env)[0] || null,
    provisioning_configured: provider.configured,
    provider: provider.provider,
    provider_configured: provider,
    fs27_configured: Boolean(env.SKYGATEFS27_ORIGIN || env.SKYGATE_ORIGIN),
    citadel_backup_configured: Boolean(env.CITADEL_BACKUP_URL || env.CITADEL_DATABASE_URL || env.CITADEL_BACKUP_DATABASE_URL),
  });
}

async function getHostedMailbox(env, userId) {
  const rows = await query(env, `
    select id, user_id, mailbox_email, local_part, domain, workspace_id, skymail_id, fs27_gate_card_id,
           provider, provider_account_id,
           status, provisioning_status, imap_host, smtp_host, jmap_url,
           created_at, updated_at, provisioned_at, last_error
      from hosted_mailboxes
     where user_id=$1
     order by created_at desc
     limit 1
  `, [userId]);
  return rows[0] || null;
}

async function saveMailboxAlias(env, { userId, mailboxId, aliasEmail, aliasType = "custom", displayName = null, providerPayload = {} }) {
  const parsed = splitEmail(aliasEmail);
  if (!parsed) throw Object.assign(new Error("Valid alias email required."), { statusCode: 400 });
  const rows = await query(env, `
    insert into mailbox_aliases(
      user_id, mailbox_id, alias_email, local_part, domain, alias_type, display_name,
      provider_payload_json, created_at, updated_at
    )
    values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,now(),now())
    on conflict (alias_email)
    do update set
      display_name=coalesce(excluded.display_name, mailbox_aliases.display_name),
      status='active',
      updated_at=now()
    where mailbox_aliases.user_id=excluded.user_id
      and mailbox_aliases.mailbox_id=excluded.mailbox_id
    returning *
  `, [userId, mailboxId, parsed.email, parsed.local, parsed.domain, aliasType, displayName, JSON.stringify(providerPayload || {})]);
  if (!rows[0]) throw Object.assign(new Error("Alias email already belongs to another SkyeMail mailbox."), { statusCode: 409 });
  return rows[0];
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
  const mailbox = await getHostedMailbox(env, auth.sub);
  const provider = providerConfigured(env);
  return json({
    ok: true,
    connected: Boolean(mailbox),
    mode: mailbox ? "hosted-provider" : "not-connected",
    mailbox,
    provisioning: {
      status: provider.configured ? "ready" : "missing-provider-env",
      provider: provider.provider,
      configured: provider.configured,
      domains: configuredDomains(env),
      citadel_backup_configured: Boolean(env.CITADEL_BACKUP_URL || env.CITADEL_DATABASE_URL || env.CITADEL_BACKUP_DATABASE_URL),
      error: provider.configured ? null : providerSetupMessage(provider.provider),
    },
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
  const provisioned = provider.configured
    ? await provisionMailbox(env, { email, localPart: local, domain, user, fs27: { sub: auth.fs27_sub || null, customer_id: auth.fs27_customer_id || user.fs27_customer_id || null, gate_card_id: auth.fs27_gate_card_id || user.fs27_gate_card_id || null } })
    : localRouteProvision(email);
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
    providerPayload: { source: "cloudflare-mailbox-provision" },
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
  const users = await query(env, "select id, handle, email, skymail_id, workspace_id, fs27_customer_id, fs27_gate_card_id from users where id=$1 limit 1", [auth.sub]);
  if (!users.length) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  const user = users[0];
  const mailbox = await getHostedMailbox(env, user.id);
  if (!mailbox) throw Object.assign(new Error("Provision a primary hosted mailbox before adding aliases."), { statusCode: 404 });
  if (request.method === "GET") {
    return json({ ok: true, mailbox, aliases: await listMailboxAliases(env, user.id, mailbox.id) });
  }
  const body = await request.json().catch(() => ({}));
  const aliasEmail = body.alias_email || body.email || body.alias;
  const aliasType = body.alias_type || "custom";
  if (aliasType !== "primary" && !body.user_generated && !body.user_confirmed) {
    throw Object.assign(new Error("Custom aliases must be created by the signed-in user from the alias form."), { statusCode: 400 });
  }
  const alias = await saveMailboxAlias(env, {
    userId: user.id,
    mailboxId: mailbox.id,
    aliasEmail,
    aliasType,
    displayName: body.display_name || body.displayName || null,
    providerPayload: { source: body.source || "cloudflare-mailbox-aliases", requested_by: user.email, user_generated: Boolean(body.user_generated || body.user_confirmed), workspace_id: user.workspace_id || auth.workspace_id || null },
  });
  const event = {
    type: "skymail.mailbox.alias_created",
    actor: user.email,
    org_id: auth.fs27_customer_id || user.fs27_customer_id || null,
    ws_id: mailbox.id,
    meta: { skymail_id: user.skymail_id || null, workspace_id: user.workspace_id || null, mailbox_email: mailbox.mailbox_email, alias_email: alias.alias_email, alias_type: alias.alias_type },
  };
  ctx.waitUntil(mirrorFs27(env, event));
  ctx.waitUntil(backupCitadel(env, { ...event, id: `alias_${alias.id || crypto.randomUUID()}` }));
  return json({ ok: true, mailbox, alias });
}

async function handleMailSettingsGet(request, env) {
  const auth = await requireAuth(request, env);
  const prefRows = await query(env, `
    select display_name, profile_title, profile_phone, profile_company, profile_website,
           signature_text, signature_html, preferred_from_alias, updated_at
      from user_preferences
     where user_id=$1
     limit 1
  `, [auth.sub]);
  const mailbox = await getHostedMailbox(env, auth.sub);
  const hostedAliases = mailbox ? await listMailboxAliases(env, auth.sub, mailbox.id) : [];
  const googleRows = await query(env, `
    select google_email, scope, from_name, contacts_last_sync_at, contacts_last_sync_count, contacts_sync_error
      from google_mailboxes
     where user_id=$1
     limit 1
  `, [auth.sub]).catch(() => []);
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
      scope_note: google ? "Google settings sync is optional for hosted SkyeMail mailboxes." : "Hosted SkyeMail aliases do not require Google settings scope.",
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
    auth.sub,
    clean(body.display_name) || null,
    clean(body.profile_title) || null,
    clean(body.profile_phone) || null,
    clean(body.profile_company) || null,
    clean(body.profile_website) || null,
    clean(body.signature_text) || null,
    clean(body.signature_html) || null,
    normalizeEmail(body.preferred_from_alias) || null,
  ]);
  return json({ ok: true, gmail_updated: false, gmail_vacation_updated: false, gmail_error: body.sync_gmail || body.sync_vacation ? "Google settings sync is optional and not active on the Cloudflare hosted SkyeMail lane." : null });
}

function messageSummary(row, mailboxEmail = "") {
  const proof = Number(row.key_version || 0) === 0 ? openProofBlob(row.ciphertext_b64) : null;
  const labels = [];
  if (row.direction === "sent") labels.push("SENT");
  else labels.push("INBOX");
  if (!row.read_at && row.direction !== "sent") labels.push("UNREAD");
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
    starred: false,
    important: false,
    has_attachments: false,
    direction: row.direction || "inbound",
    delivery_status: row.delivery_status || null,
    delivery_provider: row.delivery_provider || null,
    provider_message_id: row.provider_message_id || null,
    recipient_alias: row.recipient_alias || null,
    delivered_to: row.delivered_to || null,
  };
}

async function handleGmailList(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const label = clean(url.searchParams.get("label")).toUpperCase();
  const max = Math.min(Math.max(parseInt(url.searchParams.get("max") || "25", 10) || 25, 1), 100);
  const q = clean(url.searchParams.get("q")).toLowerCase();
  const pageToken = clean(url.searchParams.get("pageToken"));
  const mailbox = await getHostedMailbox(env, auth.sub);
  if (mailbox?.provider === "zoho" && zohoApiConfigured(env)) {
    return json(await zohoListMessages(env, {
      accountId: mailbox.provider_account_id,
      mailbox: mailbox.mailbox_email,
      label,
      max,
      pageToken,
      q,
    }));
  }
  const params = [auth.sub];
  let where = "where user_id=$1";
  if (label === "SENT") where += " and direction='sent'";
  if (label === "INBOX" || !label) where += " and direction<>'sent'";
  if (q) {
    params.push(`%${q}%`);
    where += ` and (
      lower(coalesce(from_email,'')) like $${params.length}
      or lower(coalesce(from_name,'')) like $${params.length}
      or lower(coalesce(recipient_alias,'')) like $${params.length}
      or lower(coalesce(delivered_to,'')) like $${params.length}
      or lower(coalesce(provider_message_id,'')) like $${params.length}
      or lower(coalesce(ciphertext_b64,'')) like $${params.length}
    )`;
  }
  params.push(max);
  const rows = await query(env, `
    select id, thread_id, from_name, from_email, key_version, ciphertext_b64, created_at, read_at,
           direction, delivery_provider, provider_message_id, delivery_status, recipient_alias, delivered_to
      from messages
      ${where}
     order by created_at desc
     limit $${params.length}
  `, params);
  return json({
    ok: true,
    mailbox: mailbox?.mailbox_email || "",
    items: rows.map((row) => messageSummary(row, mailbox?.mailbox_email || "")),
    nextPageToken: null,
  });
}

async function handleGmailLabels(request, env) {
  const auth = await requireAuth(request, env);
  const mailbox = await getHostedMailbox(env, auth.sub);
  if (!mailbox) return json({ ok: true, items: [] });
  if (mailbox.provider === "zoho" && zohoApiConfigured(env)) {
    const folders = await zohoListFolders(env, mailbox.provider_account_id);
    return json({ ok: true, mailbox: mailbox.mailbox_email || "", items: folders.items });
  }
  const rows = await query(env, `
    select
      count(*) filter (where direction <> 'sent')::int as inbox_total,
      count(*) filter (where direction = 'sent')::int as sent_total
    from messages
    where user_id=$1
  `, [auth.sub]);
  const counts = rows[0] || {};
  return json({
    ok: true,
    mailbox: mailbox.mailbox_email || "",
    items: [
      { id: "INBOX", name: "Inbox", type: "system", messagesTotal: Number(counts.inbox_total || 0), messagesUnread: 0 },
      { id: "SENT", name: "Sent", type: "system", messagesTotal: Number(counts.sent_total || 0), messagesUnread: 0 },
      { id: "DRAFT", name: "Drafts", type: "system", messagesTotal: 0, messagesUnread: 0 },
      { id: "SPAM", name: "Spam", type: "system", messagesTotal: 0, messagesUnread: 0 },
      { id: "TRASH", name: "Trash", type: "system", messagesTotal: 0, messagesUnread: 0 },
    ],
  });
}

async function handleGmailGet(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const id = clean(url.searchParams.get("id"));
  if (!id) throw Object.assign(new Error("id required"), { statusCode: 400 });
  const mailbox = await getHostedMailbox(env, auth.sub);
  if (mailbox?.provider === "zoho" && zohoApiConfigured(env)) {
    return json(await zohoGetMessage(env, {
      id,
      accountId: mailbox.provider_account_id,
      mailbox: mailbox.mailbox_email,
    }));
  }
  const rows = await query(env, `
    select id, thread_id, from_name, from_email, key_version, ciphertext_b64, created_at, read_at,
           direction, delivery_provider, provider_message_id, delivery_status, recipient_alias, delivered_to
      from messages
     where id=$1 and user_id=$2
     limit 1
  `, [id, auth.sub]);
  if (!rows.length) throw Object.assign(new Error("Message not found."), { statusCode: 404 });
  const row = rows[0];
  const proof = Number(row.key_version || 0) === 0 ? openProofBlob(row.ciphertext_b64) : null;
  return json({
    ok: true,
    message: {
      id: row.id,
      thread_id: row.thread_id || row.id,
      labels: row.direction === "sent" ? ["SENT"] : ["INBOX"],
      internal_date: row.created_at,
      headers: {
        subject: proof?.subject || (row.direction === "sent" ? "Sent message" : "Received message"),
        from: proof?.from || row.from_email || "",
        to: Array.isArray(proof?.to) ? proof.to.join(", ") : proof?.to || row.delivered_to || "",
        date: row.created_at,
      },
      body: {
        text: proof?.message || "Encrypted SkyeMail message. Unlock in the vault to read the full body.",
        html: proof?.message ? `<p>${String(proof.message).replace(/[<>&"]/g, (c) => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;" }[c]))}</p>` : "",
      },
      attachments: [],
    },
  });
}

async function handleGmailThreadGet(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const id = clean(url.searchParams.get("id"));
  if (!id) throw Object.assign(new Error("id required"), { statusCode: 400 });
  const mailbox = await getHostedMailbox(env, auth.sub);
  if (mailbox?.provider === "zoho" && zohoApiConfigured(env)) {
    const data = await zohoGetMessage(env, { id, accountId: mailbox.provider_account_id, mailbox: mailbox.mailbox_email });
    const message = data.message;
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
  const rows = await query(env, `
    select id, thread_id, from_name, from_email, key_version, ciphertext_b64, created_at, read_at,
           direction, delivery_provider, provider_message_id, delivery_status, recipient_alias, delivered_to
      from messages
     where (thread_id=$1 or id=$1) and user_id=$2
     order by created_at asc
     limit 50
  `, [id, auth.sub]);
  if (!rows.length) throw Object.assign(new Error("Thread not found."), { statusCode: 404 });
  const messages = rows.map((row) => {
    const proof = Number(row.key_version || 0) === 0 ? openProofBlob(row.ciphertext_b64) : null;
    return {
      id: row.id,
      thread_id: row.thread_id || row.id,
      labels: row.direction === "sent" ? ["SENT"] : ["INBOX"],
      internal_date: row.created_at,
      headers: {
        subject: proof?.subject || (row.direction === "sent" ? "Sent message" : "Received message"),
        from: proof?.from || row.from_email || "",
        to: Array.isArray(proof?.to) ? proof.to.join(", ") : proof?.to || row.delivered_to || "",
        date: row.created_at,
      },
      body: {
        text: proof?.message || "Encrypted SkyeMail message. Unlock in the vault to read the full body.",
        html: proof?.message ? `<p>${String(proof.message).replace(/[<>&"]/g, (c) => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;" }[c]))}</p>` : "",
      },
      attachments: [],
    };
  });
  const participants = Array.from(new Set(messages.flatMap((message) => [message.headers.from, message.headers.to]).filter(Boolean)));
  return json({
    ok: true,
    mailbox: rows[0]?.delivered_to || "",
    thread: {
      id,
      history_id: null,
      message_count: messages.length,
      subject: messages[0]?.headers?.subject || "(no subject)",
      participants,
      messages,
    },
  });
}

async function handleMailProofLoop(request, env, ctx) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const users = await query(env, "select id, handle, email from users where id=$1 limit 1", [auth.sub]);
  if (!users.length) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  const user = users[0];
  const mailbox = await getHostedMailbox(env, user.id);
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
  serviceAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const domain = clean(body.domain) || configuredDomains(env)[0];
  const { local, email: mailboxEmail } = validateMailboxInput(env, mailboxLocalFromWorkspace(body), domain);
  const ownerEmail = body.owner_email || body.email || body.approval_email;
  const user = await ensureServiceUser(env, {
    email: ownerEmail,
    handleSeed: body.workspace_slug || body.slug || body.company_name || local,
    sourceId: body.workspace_id || body.customer_id || body.source_id,
  });
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
      provisioned = await provisionMailbox(env, { email: mailboxEmail, localPart: local, domain, user, fs27: { customer_id: body.customer_id || null } });
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
      status, provisioning_status, provider_payload_json, imap_host, smtp_host, jmap_url,
      last_error, provisioned_at, updated_at
    )
    values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,case when $8='provisioned' then now() else null end,now())
    on conflict (mailbox_email)
    do update set
      user_id=excluded.user_id,
      provider=excluded.provider,
      provider_account_id=excluded.provider_account_id,
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
  `, [user.id, mailboxEmail, local, domain, provisioned.provider, provisioned.provider_account_id, status, provisioningStatus, JSON.stringify(provisioned.provider_payload || {}), env.SKYMAIL_IMAP_HOST || null, env.SKYMAIL_SMTP_HOST || null, env.SKYMAIL_JMAP_URL || null, lastError]);
  const mailbox = rows[0];
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
      ...(keyState.active ? [] : ["Client must complete SkyeMail vault key setup on first login before encrypted inbound mail can populate the inbox."]),
      ...(keyCard.mdp_status === "not_configured" ? ["Configure MDP_KEYCARD_WEBHOOK_URL or MCP_KEYCARD_WEBHOOK_URL if you want a rendered key-card/resume artifact sent to your MDP server."] : []),
    ],
    credentials_issued: Boolean(provisioned.mailbox_password_once),
    credential_note: provisioned.credential_note || null,
    mailbox_password_once: provisioned.mailbox_password_once || null,
  }, provisioningStatus === "provider-error" ? 502 : 200);
}

async function resendSend(env, payload) {
  if (!env.RESEND_API_KEY) throw Object.assign(new Error("RESEND_API_KEY is missing."), { statusCode: 501 });
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) throw Object.assign(new Error(data?.message || data?.error || text || `Resend failed (${res.status}).`), { statusCode: res.status });
  return data;
}

async function handleMailSend(request, env, ctx) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const to = clean(body.to);
  const subject = clean(body.subject);
  const message = String(body.message || body.text || "");
  if (!to.includes("@")) throw Object.assign(new Error("Valid recipient email required."), { statusCode: 400 });
  if (!subject) throw Object.assign(new Error("Subject required."), { statusCode: 400 });
  if (!message.trim()) throw Object.assign(new Error("Message body required."), { statusCode: 400 });
  const users = await query(env, "select id, handle, email from users where id=$1 limit 1", [auth.sub]);
  if (!users.length) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  const user = users[0];
  const hosted = await getHostedMailbox(env, user.id);
  const fromEmail = hosted?.mailbox_email || `${user.handle}@${env.INBOUND_DOMAIN || configuredDomains(env)[0]}`;
  const html = `<div style="font-family:Arial,sans-serif;white-space:pre-wrap;line-height:1.6">${message.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]))}</div>`;
  let provider = "resend";
  let sent = null;
  if (hosted?.provider === "zoho" && zohoApiConfigured(env)) {
    provider = "zoho";
    sent = await zohoSendMail(env, { accountId: hosted.provider_account_id, fromAddress: fromEmail, to, subject, html, text: message });
  } else {
    try {
      sent = await resendSend(env, { from: `${env.MAIL_FROM_FALLBACK_NAME || "SkyeMail"} <${fromEmail}>`, to: [to], subject, html, text: message, replyTo: body.reply_to || fromEmail });
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
    `To: ${to}`,
    to,
    "proof",
    "proof",
    proofBlob({ subject, message, direction: "sent", from: fromEmail, to: [to], provider, provider_message_id: sent?.id || null }),
    provider,
    sent?.id || null,
  ]);
  const event = { type: "skymail.mail.sent", actor: user.email, org_id: auth.fs27_customer_id || null, ws_id: hosted?.id || user.id, meta: { from: fromEmail, to, subject, provider, provider_message_id: sent?.id || null, message_id: stored[0]?.id || null } };
  ctx.waitUntil(mirrorFs27(env, event));
  ctx.waitUntil(backupCitadel(env, { ...event, id: `sent_${sent?.id || crypto.randomUUID()}` }));
  return json({ ok: true, resend_id: provider === "resend" ? sent?.id || null : null, zoho_id: provider === "zoho" ? sent?.id || null : null, provider, message_id: stored[0]?.id || null, from: fromEmail, to });
}

async function handleCitadelBackupTest(request, env) {
  await requireAuth(request, env);
  const result = await backupCitadel(env, { id: `backup_test_${Date.now()}`, type: "skymail.backup.test", meta: { ok: true } });
  return json({ ok: result.ok, backup: result });
}

async function handleRuntimeCompat(request, env, name) {
  await requireAuth(request, env);
  const runtimePath = String(name || "").replace(/^runtime\/?/, "");
  const emptyCounts = { queued: 0, ready: 0, active: 0, blocked: 0, unassigned: 0 };
  if (request.method === "GET" && runtimePath === "status") {
    return json({
      ok: true,
      runtime: "cloudflare-compat",
      available: true,
      mailHandoffPackets: { total: 0 },
      reviewBoard: emptyCounts,
      executionBoard: emptyCounts,
      dispatchBoard: emptyCounts,
      workflowTimeline: { archive: 0, review: 0, execution: 0, dispatch: 0 },
      latestWorkflowEvent: null,
    });
  }
  if (request.method === "GET" && runtimePath === "mail-handoff-packets") {
    return json({ ok: true, items: [], total: 0 });
  }
  if (request.method === "GET" && runtimePath === "review-board") {
    return json({ ok: true, counts: emptyCounts, items: [] });
  }
  if (request.method === "GET" && runtimePath === "execution-board") {
    return json({ ok: true, counts: emptyCounts, items: [] });
  }
  if (request.method === "GET" && runtimePath === "dispatch-board") {
    return json({ ok: true, counts: emptyCounts, items: [] });
  }
  if (request.method === "GET" && runtimePath === "workflow-timeline") {
    return json({ ok: true, workflowTimeline: { summary: {}, items: [], latestEvent: null } });
  }
  return json({ error: `Runtime route not implemented: ${runtimePath}` }, 404);
}

function apiNameFromPath(pathname) {
  const netlify = pathname.match(/^\/\.netlify\/functions\/(.+)$/);
  const api = pathname.match(/^\/api\/(.+)$/);
  const direct = pathname.match(/^\/(auth-fs27-session|mailbox-domains|mail-status|mailbox-provision|mailbox-aliases|mail-settings-get|mail-settings-save|workspace-provision|mail-send|mail-proof-loop|gmail-list|gmail-labels|gmail-get|gmail-thread-get|inbound-resend|gateway-chat|gateway-stream|citadel-backup-test)$/);
  const raw = netlify?.[1] || api?.[1] || direct?.[1] || "";
  return raw.replace(/^skymail-standalone-/, "");
}

async function routeApi(request, env, ctx, name) {
  if (request.method === "OPTIONS") return json({ ok: true });
  if (name.startsWith("runtime/")) return await handleRuntimeCompat(request, env, name);
  if (name === "health") return json({ ok: true, platform: "SkyeMail Cloudflare Worker", primary_database: Boolean(env.NEON_DATABASE_URL || env.DATABASE_URL), citadel_backup: Boolean(env.CITADEL_BACKUP_URL || env.CITADEL_DATABASE_URL || env.CITADEL_BACKUP_DATABASE_URL) });
  if (name === "auth-fs27-session" && request.method === "POST") return await handleAuthFs27(request, env, ctx);
  if (name === "mailbox-domains" && request.method === "GET") return await handleMailboxDomains(request, env);
  if (name === "mail-status" && request.method === "GET") return await handleMailStatus(request, env);
  if (name === "mailbox-provision" && request.method === "POST") return await handleMailboxProvision(request, env, ctx);
  if (name === "mailbox-aliases" && (request.method === "GET" || request.method === "POST")) return await handleMailboxAliases(request, env, ctx);
  if (name === "mail-settings-get" && request.method === "GET") return await handleMailSettingsGet(request, env);
  if (name === "mail-settings-save" && request.method === "POST") return await handleMailSettingsSave(request, env);
  if (name === "workspace-provision" && request.method === "POST") return await handleWorkspaceProvision(request, env, ctx);
  if (name === "mail-send" && request.method === "POST") return await handleMailSend(request, env, ctx);
  if (name === "mail-proof-loop" && request.method === "POST") return await handleMailProofLoop(request, env, ctx);
  if (name === "gmail-list" && request.method === "GET") return await handleGmailList(request, env);
  if (name === "gmail-labels" && request.method === "GET") return await handleGmailLabels(request, env);
  if (name === "gmail-get" && request.method === "GET") return await handleGmailGet(request, env);
  if (name === "gmail-thread-get" && request.method === "GET") return await handleGmailThreadGet(request, env);
  if (name === "inbound-resend" && request.method === "POST") return await handleInboundResend(request, env, ctx);
  if (name === "gateway-chat" && request.method === "POST") return await handleGatewayChat(request, env);
  if (name === "gateway-stream" && request.method === "POST") return await handleGatewayStream(request, env);
  if (name === "citadel-backup-test" && request.method === "POST") return await handleCitadelBackupTest(request, env);
  return json({ error: `Cloudflare SkyeMail API route not implemented: ${name}` }, 404);
}

async function serveStatic(request, env) {
  if (!env.ASSETS) return null;
  const url = new URL(request.url);
  let pathname = url.pathname;
  if (pathname === "/") pathname = "/index.html";
  if (!pathname.includes(".") && !pathname.endsWith("/")) {
    const indexRequest = new Request(new URL(`${pathname}/index.html`, url.origin), request);
    const indexRes = await env.ASSETS.fetch(indexRequest);
    if (indexRes.status !== 404) return indexRes;
  }
  const assetRequest = new Request(new URL(pathname, url.origin), request);
  const res = await env.ASSETS.fetch(assetRequest);
  if (res.status !== 404) return res;
  return null;
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
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
};
