const { query } = require("./_db");
const {
  normalizeEmail,
  normalizeHandle,
  makeSkyeMailId,
  makeWorkspaceId,
  makeGateCardId
} = require("./_identity");

function cleanOrigin(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function getHeader(event, name) {
  const wanted = String(name || "").toLowerCase();
  const headers = event.headers || {};
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === wanted) return String(value || "");
  }
  return "";
}

function getCookie(event, name) {
  const header = getHeader(event, "cookie");
  if (!header) return "";
  const wanted = String(name || "").trim();
  return header
    .split(";")
    .map((part) => part.trim())
    .map((part) => {
      const idx = part.indexOf("=");
      return idx >= 0 ? [part.slice(0, idx), part.slice(idx + 1)] : [part, ""];
    })
    .find(([key]) => key === wanted)?.[1] || "";
}

function getBearer(event) {
  const h = getHeader(event, "authorization");
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (m) return m[1].trim();
  const directHeaders = [
    "x-free99-gate-session",
    "x-skye-gate-session",
    "x-skygate-session",
    "x-0s-gate-session"
  ];
  for (const name of directHeaders) {
    const value = getHeader(event, name).replace(/^Bearer\s+/i, "").trim();
    if (value) return value;
  }
  const cookieNames = [
    "METRAIYUX_GATE_SESSION",
    "SKYGATEFS27_GATE_SESSION",
    "SKYE_GATE_SESSION"
  ];
  for (const name of cookieNames) {
    const value = decodeURIComponent(getCookie(event, name) || "").replace(/^Bearer\s+/i, "").trim();
    if (!value) continue;
    try {
      const parsed = JSON.parse(value);
      const token = String(parsed.token || parsed.session || parsed.sessionToken || "").replace(/^Bearer\s+/i, "").trim();
      if (token) return token;
    } catch (_err) {}
    return value;
  }
  return "";
}

function fs27Origin() {
  return cleanOrigin(process.env.SKYGATEFS27_ORIGIN || process.env.SKYGATE_ORIGIN || "");
}

function mirrorSecret() {
  return String(process.env.SKYGATE_EVENT_MIRROR_SECRET || process.env.SKYGATEFS27_EVENT_MIRROR_SECRET || "").trim();
}

function normalizeScope(scope) {
  if (Array.isArray(scope)) return scope.map(String).filter(Boolean);
  return String(scope || "").split(/\s+/).map((v) => v.trim()).filter(Boolean);
}

function hasAnyScope(claims, wanted = []) {
  const scopes = new Set(normalizeScope(claims?.scope).map((scope) => scope.toLowerCase()));
  return wanted.some((scope) => scopes.has(String(scope).toLowerCase()));
}

function isAdminLike(claims = {}) {
  const role = String(claims.role || "").toLowerCase();
  return ["founder", "owner", "admin", "operator"].includes(role)
    || hasAnyScope(claims, ["admin.read", "admin.write", "mail.admin", "skymail.admin"]);
}

async function introspectToken(token) {
  const origin = fs27Origin();
  if (!origin) {
    const err = new Error("SKYGATEFS27_ORIGIN/SKYGATE_ORIGIN env var missing.");
    err.statusCode = 501;
    throw err;
  }
  const cleanToken = String(token || "").replace(/^Bearer\s+/i, "").trim();
  if (!cleanToken) {
    const err = new Error("Missing 0S/SkyeGate session.");
    err.statusCode = 401;
    throw err;
  }

  const paths = ["/auth-introspect", "/auth/introspect", "/.netlify/functions/auth-introspect"];
  let last = null;
  for (const path of paths) {
    const res = await fetch(`${origin}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: cleanToken })
    });
    const data = await res.json().catch(() => ({ active: false, error: "Invalid 0S/SkyeGate response." }));
    last = { status: res.status, data, path };
    if (res.status === 404) continue;
    if (!res.ok || data.active !== true) {
      const err = new Error(data.error || "0S/SkyeGate session is inactive.");
      err.statusCode = res.ok ? 401 : res.status;
      err.skygate = data;
      throw err;
    }
    return { ...data, _introspection_path: path };
  }

  const err = new Error(`0S/SkyeGate introspection endpoint was not found at ${origin}.`);
  err.statusCode = last?.status || 404;
  throw err;
}

async function linkFs27AppSpine(claims = {}, user = {}, options = {}) {
  const origin = fs27Origin();
  if (!origin) return { ok: false, skipped: true, reason: "FS27 origin missing." };
  const token = String(options.token || "").replace(/^Bearer\s+/i, "").trim();
  const secret = mirrorSecret();
  if (!token && !secret) return { ok: false, skipped: true, reason: "FS27 app-spine auth missing." };

  const card = claims.card || claims.gate_card || claims.skyegate_card || null;
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
      fs27_gate_card_id: user.fs27_gate_card_id || claims.gate_card_id || null
    }
  };

  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  else headers["x-skygate-mirror-secret"] = secret;

  const paths = ["/app-spine/link", "/auth/app-spine/link", "/.netlify/functions/app-spine-link"];
  let last = null;
  for (const path of paths) {
    const res = await fetch(`${origin}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({ ok: res.ok, status: res.status }));
    last = { ok: res.ok, status: res.status, data, path };
    if (res.status === 404) continue;
    return last;
  }
  return last || { ok: false, skipped: true, reason: "FS27 app-spine endpoint not found." };
}

async function requireFs27(event, options = {}) {
  const claims = await introspectToken(getBearer(event));
  if (options.admin && !isAdminLike(claims)) {
    const err = new Error("0S/SkyeGate session is active but not admin/operator scoped for SkyeMail.");
    err.statusCode = 403;
    throw err;
  }
  if (Array.isArray(options.anyScope) && options.anyScope.length && !hasAnyScope(claims, options.anyScope)) {
    const err = new Error(`0S/SkyeGate session is missing required scope: ${options.anyScope.join(" or ")}`);
    err.statusCode = 403;
    throw err;
  }
  return claims;
}

function slugHandle(value) {
  return normalizeHandle(value).slice(0, 28) || "skyemail-user";
}

async function uniqueHandle(base) {
  const root = slugHandle(base);
  for (let i = 0; i < 25; i += 1) {
    const candidate = i ? `${root.slice(0, 24)}-${i}` : root;
    const res = await query("select 1 from users where lower(handle)=lower($1) limit 1", [candidate]);
    if (!res.rows.length) return candidate;
  }
  return `${root.slice(0, 18)}-${randomToken(4).toLowerCase()}`;
}

async function ensureSkyeMailUser(claims = {}, options = {}) {
  const email = normalizeEmail(claims.email || claims.username || "");
  if (!email || !email.includes("@")) {
    const err = new Error("0S/SkyeGate session must include an email/username email before SkyeMail can create a workspace user.");
    err.statusCode = 400;
    throw err;
  }

  const fs27Sub = claims.sub || null;
  const fs27CustomerId = claims.customer_id || claims.org || null;
  const card = claims.card || claims.gate_card || claims.skyegate_card || null;
  const fs27GateCardId = makeGateCardId({
    fs27CardId: card?.id || card?.card_id || claims.gate_card_id || null,
    fs27Sub,
    email
  });

  const existing = await query(
    `select id, handle, email, skymail_id, workspace_id, fs27_sub, fs27_customer_id, fs27_gate_card_id
       from users
      where lower(email)=lower($1)
         or ($2::text is not null and lower(fs27_sub)=lower($2))
      limit 1`,
    [email, fs27Sub]
  );
  if (existing.rows.length) {
    const user = existing.rows[0];
    const skymailId = user.skymail_id || makeSkyeMailId({ email, handle: user.handle, fs27Sub });
    const workspaceId = user.workspace_id || makeWorkspaceId({ email, handle: user.handle, fs27CustomerId, fs27Sub });
    const updated = await query(
      `update users
          set skymail_id=coalesce(skymail_id, $2),
              workspace_id=coalesce(workspace_id, $3),
              fs27_sub=coalesce(fs27_sub, $4),
              fs27_customer_id=coalesce($5, fs27_customer_id),
              fs27_gate_card_id=coalesce($6, fs27_gate_card_id),
              fs27_card_json=coalesce($7::jsonb, fs27_card_json)
        where id=$1
        returning id, handle, email, skymail_id, workspace_id, fs27_sub, fs27_customer_id, fs27_gate_card_id`,
      [user.id, skymailId, workspaceId, fs27Sub, fs27CustomerId, fs27GateCardId, card ? JSON.stringify(card) : null]
    );
    const linked = updated.rows[0];
    await linkFs27AppSpine(claims, linked, options).catch(() => null);
    return linked;
  }

  const handle = await uniqueHandle(email);
  const skymailId = makeSkyeMailId({ email, handle, fs27Sub });
  const workspaceId = makeWorkspaceId({ email, handle, fs27CustomerId, fs27Sub });
  const inserted = await query(
    `insert into users(
       handle, email, skymail_id, workspace_id,
       fs27_sub, fs27_customer_id, fs27_gate_card_id, fs27_card_json
     )
     values($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
     returning id, handle, email, skymail_id, workspace_id, fs27_sub, fs27_customer_id, fs27_gate_card_id`,
    [handle, email, skymailId, workspaceId, fs27Sub, fs27CustomerId, fs27GateCardId, card ? JSON.stringify(card) : null]
  );
  const linked = inserted.rows[0];
  await linkFs27AppSpine(claims, linked, options).catch(() => null);
  return linked;
}

function sessionFromGateUser(user, claims = {}, token = "") {
  return {
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
    gate_token: token || null,
    fs27_claims: claims
  };
}

async function mirrorPlatformEvent(payload = {}) {
  const origin = fs27Origin();
  const secret = mirrorSecret();
  if (!origin || !secret) return { ok: false, skipped: true, reason: "FS27 origin or mirror secret is not configured." };
  const res = await fetch(`${origin}/platform/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-skygate-mirror-secret": secret
    },
    body: JSON.stringify({
      source_app: process.env.SKYGATE_SOURCE_APP || "skymail",
      actor: payload.actor || "skymail",
      org_id: payload.org_id || null,
      ws_id: payload.ws_id || null,
      type: payload.type || "skymail.event",
      event_ts: payload.event_ts || new Date().toISOString(),
      meta: payload.meta || {}
    })
  });
  const data = await res.json().catch(() => ({ ok: res.ok, status: res.status }));
  return { ok: res.ok, status: res.status, data };
}

module.exports = {
  fs27Origin,
  mirrorSecret,
  getBearer,
  introspectToken,
  requireFs27,
  isAdminLike,
  ensureSkyeMailUser,
  linkFs27AppSpine,
  sessionFromGateUser,
  mirrorPlatformEvent
};
