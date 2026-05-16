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

function getPrimarySql(env) {
  const url = databaseUrlWithSearchPath(env.NEON_DATABASE_URL || env.DATABASE_URL, env);
  if (!url) throw Object.assign(new Error("NEON_DATABASE_URL/DATABASE_URL is missing."), { statusCode: 501 });
  return neon(url);
}

function getCitadelSql(env) {
  const url = databaseUrlWithSearchPath(env.CITADEL_DATABASE_URL || env.CITADEL_BACKUP_DATABASE_URL, env);
  return url ? neon(url) : null;
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
  return await sql(text, params);
}

async function queryCitadel(env, text, params = []) {
  const sql = getCitadelSql(env);
  if (!sql) return { skipped: true, reason: "CITADEL_DATABASE_URL is not configured." };
  return await sql(text, params);
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

function providerConfigured(env) {
  const provider = clean(env.MAILBOX_PROVIDER || "stalwart").toLowerCase();
  const stalwartReady = Boolean(env.STALWART_BASE_URL && env.STALWART_MANAGEMENT_API_KEY);
  const externalReady = Boolean(env.MAILBOX_PROVISION_WEBHOOK_URL && env.MAILBOX_PROVISION_WEBHOOK_SECRET);
  return { provider, configured: provider === "external-webhook" ? externalReady : stalwartReady, stalwartReady, externalReady };
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

  const password = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().slice(0, 8);
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
  for (const path of paths) {
    const res = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({ active: false }));
    last = { res, data };
    if (res.status === 404) continue;
    if (!res.ok || data.active !== true) throw Object.assign(new Error(data.error || "FS27 token is inactive."), { statusCode: res.ok ? 401 : res.status });
    return data;
  }
  throw Object.assign(new Error(`FS27 introspection endpoint was not found at ${origin}.`), { statusCode: last?.res?.status || 404 });
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
  const handles = Array.from(new Set(recipients.map(handleFromAddress).filter(Boolean)));
  if (!handles.length) return { ignored: true, reason: "no_handles" };

  const created = [];
  for (const handle of handles) {
    const users = await query(env, `
      select u.id, u.handle, uk.version, uk.rsa_public_key_pem
        from users u
        join user_keys uk on uk.user_id = u.id and uk.is_active = true
       where lower(u.handle) = $1
       limit 1
    `, [handle]);
    if (!users.length) continue;
    const user = users[0];
    const bodyText = received.text || htmlToText(received.html || "");
    const enc = await hybridEncrypt(user.rsa_public_key_pem, {
      subject: received.subject || "(no subject)",
      message: bodyText || "",
      direction: "inbound",
      source: "resend",
      from: received.from || "",
      to: received.to || [],
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
        direction, delivery_provider, provider_message_id, delivery_status, last_delivery_event_at
      )
      values($1,$2,$3,$4,$5,$6,$7,'inbound','resend',$8,'received',coalesce($9, now()))
      returning id
    `, [
      user.id,
      received.from || null,
      extractAddress(received.from || "") || null,
      user.version,
      enc.encrypted_key_b64,
      enc.iv_b64,
      enc.ciphertext_b64,
      providerMessageId,
      eventCreatedAt(payload),
    ]);
    const messageId = rows[0].id;

    for (const attachment of (Array.isArray(received.attachments) ? received.attachments : [])) {
      try {
        const meta = await resendGet(env, `/emails/receiving/${encodeURIComponent(providerMessageId)}/attachments/${encodeURIComponent(attachment.id)}`);
        if (!meta?.download_url) continue;
        const fileRes = await fetch(meta.download_url);
        if (!fileRes.ok) continue;
        const bytes = new Uint8Array(await fileRes.arrayBuffer());
        const encAtt = await hybridEncrypt(user.rsa_public_key_pem, bytes);
        await query(env, `
          insert into attachments(message_id, filename, mime_type, size_bytes, encrypted_key_b64, iv_b64, ciphertext)
          values($1,$2,$3,$4,$5,$6,decode($7,'base64'))
        `, [messageId, meta.filename || attachment.filename || "attachment", meta.content_type || attachment.content_type || "application/octet-stream", Number(meta.size || bytes.length || 0), encAtt.encrypted_key_b64, encAtt.iv_b64, encAtt.ciphertext_b64]);
      } catch {
        // Keep the inbox message even if one attachment cannot be fetched or encrypted.
      }
    }
    created.push({ handle: user.handle, user_id: user.id, message_id: messageId });
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
  const email = clean(claims.email || claims.username).toLowerCase();
  if (!email || !email.includes("@")) throw Object.assign(new Error("FS27 token must include an email."), { statusCode: 400 });
  const found = await query(env, "select id, handle, email from users where lower(email)=lower($1) limit 1", [email]);
  if (found.length) return found[0];
  const handleBase = email.replace(/@.*$/, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28) || "skymail-user";
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
  `, [handle, email, `fs27:${claims.sub || crypto.randomUUID()}`]);
  return rows[0];
}

async function ensureServiceUser(env, { email, handleSeed, sourceId }) {
  const cleanEmail = clean(email).toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) throw Object.assign(new Error("owner_email/email is required for SkyeMail workspace provisioning."), { statusCode: 400 });
  const found = await query(env, "select id, handle, email from users where lower(email)=lower($1) limit 1", [cleanEmail]);
  if (found.length) return found[0];
  const handleBase = clean(handleSeed || cleanEmail.split("@")[0]).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 28) || "skymail-user";
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

async function handleAuthFs27(request, env, ctx) {
  const claims = await introspectFs27(env, bearer(request));
  const user = await ensureUserFromFs27(env, claims);
  const token = await signJwt({
    sub: user.id,
    handle: user.handle,
    email: user.email,
    auth_provider: "skygatefs27",
    fs27_sub: claims.sub || null,
    fs27_customer_id: claims.customer_id || claims.org || null,
    fs27_role: claims.role || null,
  }, env.JWT_SECRET);
  const event = { type: "skymail.auth.fs27_session", actor: user.email, org_id: claims.customer_id || claims.org || null, ws_id: user.id, meta: { skymail_user_id: user.id, fs27_sub: claims.sub || null } };
  ctx.waitUntil(mirrorFs27(env, event));
  ctx.waitUntil(backupCitadel(env, { ...event, id: `auth_${user.id}_${Date.now()}` }));
  return json({ ok: true, token, handle: user.handle, email: user.email, auth_provider: "skygatefs27", fs27: { active: true, sub: claims.sub || null, role: claims.role || null } });
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
    select id, user_id, mailbox_email, local_part, domain, provider, provider_account_id,
           status, provisioning_status, imap_host, smtp_host, jmap_url,
           created_at, updated_at, provisioned_at, last_error
      from hosted_mailboxes
     where user_id=$1
     order by created_at desc
     limit 1
  `, [userId]);
  return rows[0] || null;
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
      error: provider.configured ? null : "Set hosted mailbox provider env before provisioning a real mailbox.",
    },
  });
}

async function handleMailboxProvision(request, env, ctx) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const { local, domain, email } = validateMailboxInput(env, body.local_part || body.localPart, body.domain);
  const users = await query(env, "select id, handle, email from users where id=$1 limit 1", [auth.sub]);
  if (!users.length) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  const user = users[0];
  const provisioned = await provisionMailbox(env, { email, localPart: local, domain, user, fs27: { sub: auth.fs27_sub || null, customer_id: auth.fs27_customer_id || null } });
  const rows = await query(env, `
    insert into hosted_mailboxes(
      user_id, mailbox_email, local_part, domain, provider, provider_account_id,
      status, provisioning_status, provider_payload_json, imap_host, smtp_host, jmap_url,
      provisioned_at, updated_at
    )
    values($1,$2,$3,$4,$5,$6,'active','provisioned',$7::jsonb,$8,$9,$10,now(),now())
    on conflict (mailbox_email)
    do update set
      user_id=excluded.user_id,
      provider=excluded.provider,
      provider_account_id=excluded.provider_account_id,
      status='active',
      provisioning_status='provisioned',
      provider_payload_json=excluded.provider_payload_json,
      imap_host=excluded.imap_host,
      smtp_host=excluded.smtp_host,
      jmap_url=excluded.jmap_url,
      provisioned_at=coalesce(hosted_mailboxes.provisioned_at, now()),
      updated_at=now(),
      last_error=null
    returning *
  `, [user.id, email, local, domain, provisioned.provider, provisioned.provider_account_id, JSON.stringify(provisioned.provider_payload || {}), env.SKYMAIL_IMAP_HOST || null, env.SKYMAIL_SMTP_HOST || null, env.SKYMAIL_JMAP_URL || null]);
  const mailbox = rows[0];
  const event = { type: "skymail.mailbox.provisioned", actor: user.email, org_id: auth.fs27_customer_id || null, ws_id: mailbox.id, meta: { mailbox_email: mailbox.mailbox_email, provider: mailbox.provider, provider_account_id: mailbox.provider_account_id } };
  ctx.waitUntil(mirrorFs27(env, event));
  ctx.waitUntil(backupCitadel(env, { ...event, id: `mailbox_${mailbox.id}` }));
  return json({ ok: true, mailbox, credentials_issued: Boolean(provisioned.mailbox_password_once), credential_note: provisioned.credential_note || null, mailbox_password_once: provisioned.mailbox_password_once || null });
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
  let lastError = provider.configured ? null : "Set STALWART_MANAGEMENT_API_KEY or external provisioner env before live mailbox account creation.";
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
  const keyState = await activeKeyState(env, user.id);
  const event = {
    type: "skymail.workspace.mailbox_provisioned",
    actor: user.email,
    org_id: body.customer_id || null,
    ws_id: body.workspace_id || mailbox.id,
    meta: { workspace_id: body.workspace_id || null, mailbox_email: mailbox.mailbox_email, provider: mailbox.provider, provisioning_status: mailbox.provisioning_status, key_state: keyState },
  };
  ctx.waitUntil(mirrorFs27(env, event));
  ctx.waitUntil(backupCitadel(env, { ...event, id: `workspace_mailbox_${body.workspace_id || mailbox.id}` }));
  return json({
    ok: provisioningStatus !== "provider-error",
    user,
    mailbox,
    workspace_id: body.workspace_id || null,
    customer_id: body.customer_id || null,
    skymail_url: env.SKYMAIL_PUBLIC_URL || "https://skymail-platform.graylondonskyes.workers.dev",
    inbox_ready: mailbox.status === "active" && keyState.active,
    provider_ready: provider.configured,
    key_state: keyState,
    next_steps: [
      ...(provider.configured ? [] : ["Configure hosted mailbox provider credentials, currently STALWART_MANAGEMENT_API_KEY or external provisioner env."]),
      ...(keyState.active ? [] : ["Client must complete SkyeMail vault key setup on first login before encrypted inbound mail can populate the inbox."]),
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
  const sent = await resendSend(env, { from: `${env.MAIL_FROM_FALLBACK_NAME || "SkyeMail"} <${fromEmail}>`, to: [to], subject, html, text: message, replyTo: body.reply_to || fromEmail });
  const event = { type: "skymail.mail.sent", actor: user.email, org_id: auth.fs27_customer_id || null, ws_id: hosted?.id || user.id, meta: { from: fromEmail, to, subject, provider: "resend", provider_message_id: sent?.id || null } };
  ctx.waitUntil(mirrorFs27(env, event));
  ctx.waitUntil(backupCitadel(env, { ...event, id: `sent_${sent?.id || crypto.randomUUID()}` }));
  return json({ ok: true, resend_id: sent?.id || null, from: fromEmail, to });
}

async function handleCitadelBackupTest(request, env) {
  await requireAuth(request, env);
  const result = await backupCitadel(env, { id: `backup_test_${Date.now()}`, type: "skymail.backup.test", meta: { ok: true } });
  return json({ ok: result.ok, backup: result });
}

function apiNameFromPath(pathname) {
  const netlify = pathname.match(/^\/\.netlify\/functions\/(.+)$/);
  const api = pathname.match(/^\/api\/(.+)$/);
  const direct = pathname.match(/^\/(auth-fs27-session|mailbox-domains|mail-status|mailbox-provision|workspace-provision|mail-send|inbound-resend|gateway-chat|gateway-stream|citadel-backup-test)$/);
  const raw = netlify?.[1] || api?.[1] || direct?.[1] || "";
  return raw.replace(/^skymail-standalone-/, "");
}

async function routeApi(request, env, ctx, name) {
  if (request.method === "OPTIONS") return json({ ok: true });
  if (name === "health") return json({ ok: true, platform: "SkyeMail Cloudflare Worker", primary_database: Boolean(env.NEON_DATABASE_URL || env.DATABASE_URL), citadel_backup: Boolean(env.CITADEL_BACKUP_URL || env.CITADEL_DATABASE_URL || env.CITADEL_BACKUP_DATABASE_URL) });
  if (name === "auth-fs27-session" && request.method === "POST") return await handleAuthFs27(request, env, ctx);
  if (name === "mailbox-domains" && request.method === "GET") return await handleMailboxDomains(request, env);
  if (name === "mail-status" && request.method === "GET") return await handleMailStatus(request, env);
  if (name === "mailbox-provision" && request.method === "POST") return await handleMailboxProvision(request, env, ctx);
  if (name === "workspace-provision" && request.method === "POST") return await handleWorkspaceProvision(request, env, ctx);
  if (name === "mail-send" && request.method === "POST") return await handleMailSend(request, env, ctx);
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
