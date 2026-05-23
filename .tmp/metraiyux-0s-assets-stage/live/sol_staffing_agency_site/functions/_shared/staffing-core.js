export const COOKIE_NAME = "sol_staffing_auth";

export const COLLECTIONS = [
  "leads",
  "job_orders",
  "candidates",
  "placements",
  "timesheets",
  "gov_pursuits",
  "ae_leads",
  "vendors",
  "risks",
  "brain_feedback",
  "documents",
  "audit"
];

export function json(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

export function envValue(env, names) {
  for (const name of names) {
    if (env?.[name]) return env[name];
  }
  return "";
}

export function cleanToken(value) {
  return String(value || "").replace(/^Bearer\s+/i, "").trim();
}

export function bearerToken(request) {
  return cleanToken(request.headers.get("authorization") || "");
}

export function cookieToken(request) {
  const cookie = request.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) return decodeURIComponent(rest.join("="));
  }
  return "";
}

export function safeIp(request) {
  return request.headers.get("cf-connecting-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown";
}

export function publicClaims(claims) {
  if (!claims) return null;
  return {
    active: Boolean(claims.active),
    sub: claims.sub || claims.username || claims.email || null,
    email: claims.email || claims.username || null,
    username: claims.username || claims.email || null,
    role: claims.role || null,
    scope: claims.scope || "",
    org: claims.org || claims.customer_id || null,
    customer_id: claims.customer_id || null,
    session_id: claims.session_id || null,
    source: claims.source || "skyegate-fs27"
  };
}

export async function introspectToken(token, env) {
  const clean = cleanToken(token);
  if (!clean) return null;

  const devToken = cleanToken(envValue(env, ["SOL_STAFFING_DEV_TOKEN"]));
  if (devToken && clean === devToken) {
    return {
      active: true,
      sub: "cloudflare-dev",
      email: envValue(env, ["SOL_STAFFING_DEV_EMAIL"]) || "operator@localhost",
      username: envValue(env, ["SOL_STAFFING_DEV_EMAIL"]) || "operator@localhost",
      role: envValue(env, ["SOL_STAFFING_DEV_ROLE"]) || "admin",
      scope: "admin.read admin.write staffing.read staffing.write",
      org: "cloudflare",
      source: "dev-token"
    };
  }

  const url = envValue(env, [
    "SKYGATE_FS27_INTROSPECT_URL",
    "SKYEGATE_FS27_INTROSPECT_URL",
    "SKYGATE_INTROSPECT_URL",
    "SKYEGATE_INTROSPECT_URL"
  ]);
  if (!url) return null;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: clean })
  }).catch(() => null);
  if (!res || !res.ok) return null;
  const claims = await res.json().catch(() => null);
  if (!claims || !claims.active) return null;
  return claims;
}

export async function authFromRequest(request, env) {
  const token = cleanToken(bearerToken(request) || cookieToken(request));
  if (!token) return { token: "", claims: null };
  const claims = await introspectToken(token, env);
  return { token, claims: claims ? publicClaims(claims) : null };
}

export function allowedRoles(env) {
  return String(envValue(env, ["SOL_STAFFING_ADMIN_ROLES"]) || "owner,admin,operator")
    .split(",")
    .map(role => role.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAuth(request, env, options = {}) {
  const { token, claims } = await authFromRequest(request, env);
  if (!claims || !claims.active) return { ok: false, response: json({ error: "Skyegate FS27 auth required" }, 401) };
  if (options.admin && !allowedRoles(env).includes(String(claims.role || "").toLowerCase())) {
    return { ok: false, response: json({ error: "Admin role required", role: claims.role || null }, 403) };
  }
  return { ok: true, token, claims };
}

export function sessionCookie(token, env, maxAgeSeconds) {
  const maxAge = Number(maxAgeSeconds || envValue(env, ["SOL_STAFFING_SESSION_SECONDS"]) || 28800);
  return `${COOKIE_NAME}=${encodeURIComponent(cleanToken(token))}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function sanitizeValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeValue).join(", ").slice(0, 4000);
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, 12000);
}

export function sanitizeData(input) {
  const output = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (!key || key.startsWith("_") || key === "bot-field") continue;
    output[key.slice(0, 80)] = sanitizeValue(value);
  }
  return output;
}

export function classify(formName, data = {}) {
  const form = String(formName || data["form-name"] || data.form_name || "general-intake").toLowerCase();
  const keys = Object.keys(data).join(" ").toLowerCase();
  const haystack = `${form} ${keys}`;
  if (/government|prime|procurement|capability|rfp|rfq|sam|uei|cage|gov/.test(haystack)) return "gov_pursuits";
  if (/candidate|recruiter|resume|apply|application|screening|readiness|submission/.test(haystack)) return "candidates";
  if (/job-order|job_order|staffing-request|role|headcount|employer/.test(haystack)) return "job_orders";
  if (/placement/.test(haystack)) return "placements";
  if (/timesheet|invoice|hours/.test(haystack)) return "timesheets";
  if (/ae-|ae_|account executive|commission/.test(haystack)) return "ae_leads";
  if (/vendor|subcontractor/.test(haystack)) return "vendors";
  if (/risk|mitigation/.test(haystack)) return "risks";
  if (/brain/.test(haystack)) return "brain_feedback";
  return "leads";
}

export function summaryFields(record) {
  const data = record.data || {};
  return {
    id: record.id,
    collection: record.collection,
    status: record.status,
    created_at: record.created_at,
    title: data.company || data.employer || data.candidate_name || data.name || data.risk_title || data.vendor_name || data.topic || data.role || "Untitled",
    contact: data.contact || data.contact_name || data.email || data.phone || "",
    type: record.form_name || record.type || ""
  };
}

export function recordId(prefix = "rec") {
  return `${prefix}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

export async function list(env, collection, limit = 250) {
  const raw = await env.SOL_STAFFING_KV.get(`records:${collection}`);
  const records = raw ? JSON.parse(raw) : [];
  return records.slice(0, limit);
}

export async function append(env, collection, record) {
  const records = await list(env, collection, 5000);
  records.unshift(record);
  await env.SOL_STAFFING_KV.put(`records:${collection}`, JSON.stringify(records.slice(0, 5000)));
  return record;
}

export async function getRecord(env, collection, id) {
  const records = await list(env, collection, 5000);
  return records.find(record => record.id === id) || null;
}

export async function putRecord(env, collection, record) {
  const records = await list(env, collection, 5000);
  const index = records.findIndex(item => item.id === record.id);
  if (index === -1) records.unshift(record);
  else records[index] = record;
  await env.SOL_STAFFING_KV.put(`records:${collection}`, JSON.stringify(records));
  return record;
}

export async function audit(env, action, collection, recordIdValue, actor, record) {
  await append(env, "audit", {
    id: recordId("audit"),
    action,
    collection,
    record_id: recordIdValue,
    at: new Date().toISOString(),
    actor,
    summary: summaryFields(record)
  });
}

export function safeName(name) {
  return String(name || "document").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
}

export function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
