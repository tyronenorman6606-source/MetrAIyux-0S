import crypto from "crypto";
import { q } from "./db.js";
import { audit } from "./audit.js";
import { createUser, ensureCustomerForUser, getUserByEmail, sanitizeContactValue, sanitizeDisplayName, setUserProvisioningState, updateUserPassword } from "./identity.js";
import { getClientIp, getUserAgent } from "./http.js";
import { hashPassword } from "./passwords.js";

const COOKIE_NAME = "sip_session";
const SESSION_HOURS = Number.parseInt(process.env.SIGNINPRO_SESSION_HOURS || "12", 10) || 12;
const LOGIN_FAIL_LIMIT = Number.parseInt(process.env.SIGNINPRO_LOGIN_FAIL_LIMIT || "8", 10) || 8;
const LOGIN_WINDOW_MINUTES = Number.parseInt(process.env.SIGNINPRO_LOGIN_WINDOW_MINUTES || "15", 10) || 15;
const PUBLIC_REQUEST_LIMIT = Number.parseInt(process.env.SIGNINPRO_PUBLIC_RPM || "60", 10) || 60;
const PRIVATE_REQUEST_LIMIT = Number.parseInt(process.env.SIGNINPRO_PRIVATE_RPM || "240", 10) || 240;

export const ROLE_PERMISSIONS = Object.freeze({
  owner: ["read", "write", "settings", "users", "audit", "backup", "provision"],
  admin: ["read", "write", "settings", "users", "audit", "backup"],
  operator: ["read", "write", "audit", "backup"],
  viewer: ["read", "audit"]
});

export function readJsonBody(req) {
  return req.json().catch(() => ({}));
}

export function safeText(value, max = 240) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function slugify(value) {
  return safeText(value, 140)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function permissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

export function requirePermission(session, permission) {
  if (!permissionsForRole(session?.user?.role).includes(permission)) {
    const error = new Error(`Role ${session?.user?.role || "unknown"} does not have ${permission} permission.`);
    error.status = 403;
    error.code = "WORKSPACE_PERMISSION_DENIED";
    throw error;
  }
}

export function requireRole(session, roles) {
  if (!session?.user?.role || !roles.includes(session.user.role)) {
    const error = new Error(`Role ${session?.user?.role || "unknown"} is not allowed.`);
    error.status = 403;
    error.code = "WORKSPACE_ROLE_DENIED";
    throw error;
  }
}

function sessionSecret() {
  const secret = String(
    process.env.SIGNINPRO_SESSION_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    ""
  );
  if (secret.length < 32) {
    const error = new Error("SIGNINPRO_SESSION_SECRET or SESSION_SECRET must be configured with at least 32 characters.");
    error.status = 500;
    error.code = "SIGNINPRO_SESSION_SECRET_MISSING";
    throw error;
  }
  return secret;
}

function hmac(input) {
  return crypto.createHmac("sha256", sessionSecret()).update(input).digest("base64url");
}

function signCookiePayload(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body)}`;
}

function readCookie(req, name) {
  const raw = String(req.headers.get("cookie") || req.headers.get("Cookie") || "");
  const parts = raw.split(";").map((part) => part.trim()).filter(Boolean);
  const found = parts.find((part) => part.startsWith(`${name}=`));
  return found ? found.slice(name.length + 1) : "";
}

function verifyCookiePayload(token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const expected = hmac(body);
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload?.sid || !payload?.exp || Date.now() > Number(payload.exp)) return null;
    return payload;
  } catch {
    return null;
  }
}

function isSecureRequest(req) {
  try {
    if (String(process.env.SIGNINPRO_COOKIE_SECURE || "").toLowerCase() === "false") return false;
    const url = new URL(req.url);
    if (url.protocol === "https:") return true;
    return !/^(localhost|127\.0\.0\.1)$/i.test(url.hostname);
  } catch {
    return true;
  }
}

export function buildSessionCookie(req, token) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_HOURS * 60 * 60}${isSecureRequest(req) ? "; Secure" : ""}`;
}

export function clearSessionCookie(req) {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecureRequest(req) ? "; Secure" : ""}`;
}

export function hashIpValue(ip) {
  const pepper = String(process.env.AUDIT_HASH_PEPPER || process.env.SIGNINPRO_HASH_PEPPER || process.env.SESSION_SECRET || "signinpro-local-pepper");
  const clean = safeText(ip, 160);
  return clean ? crypto.createHmac("sha256", pepper).update(clean).digest("hex") : "";
}

export function requestIpHash(req) {
  return hashIpValue(getClientIp(req) || "");
}

function windowStartIso(windowSeconds) {
  const ms = Math.max(1, Number(windowSeconds) || 60) * 1000;
  return new Date(Math.floor(Date.now() / ms) * ms).toISOString();
}

export async function enforceWorkspaceRateLimit({
  request,
  workspaceId = null,
  workspaceSlug = "",
  route = "generic",
  scope = "public",
  limit = PUBLIC_REQUEST_LIMIT,
  windowSeconds = 60
}) {
  const ipHash = requestIpHash(request);
  const startIso = windowStartIso(windowSeconds);
  const key = `${scope}:${workspaceId || workspaceSlug || "global"}:${route}:${ipHash || "noip"}:${startIso}`;
  const result = await q(
    `insert into workspace_request_windows (bucket_key, workspace_id, workspace_slug, route, ip_hash, scope, window_start, count, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,1,now())
     on conflict (bucket_key) do update
       set count = workspace_request_windows.count + 1,
           updated_at = now()
     returning count`,
    [key, workspaceId || null, workspaceSlug || null, safeText(route, 120), ipHash || null, safeText(scope, 60), startIso]
  );
  const count = Number(result.rows[0]?.count || 0);
  if (count > limit) {
    const error = new Error("NorthStar request rate limit exceeded. Please try again shortly.");
    error.status = 429;
    error.code = "SIGNINPRO_RATE_LIMITED";
    throw error;
  }
  return count;
}

export async function countRecentFailedLogins(req, workspaceSlug, email) {
  const result = await q(
    `select count(*)::int as count
       from workspace_login_attempts
      where workspace_slug=$1
        and email=$2
        and coalesce(ip_hash, '')=$3
        and ok=false
        and created_at > now() - ($4 || ' minutes')::interval`,
    [workspaceSlug, email, requestIpHash(req), String(LOGIN_WINDOW_MINUTES)]
  );
  return Number(result.rows[0]?.count || 0);
}

export async function recordLoginAttempt(req, workspaceSlug, email, ok, reason = "") {
  await q(
    `insert into workspace_login_attempts(workspace_slug, email, ip_hash, ok, reason)
     values ($1,$2,$3,$4,$5)`,
    [workspaceSlug, email, requestIpHash(req) || null, ok === true, safeText(reason, 120) || null]
  );
}

export function enforceLoginWindow(failCount) {
  if (Number(failCount) >= LOGIN_FAIL_LIMIT) {
    const error = new Error("Too many failed login attempts. Try again later or ask NorthStar to rotate the workspace login.");
    error.status = 429;
    error.code = "SIGNINPRO_LOGIN_RATE_LIMIT";
    throw error;
  }
}

function sessionExpiryDate() {
  return new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
}

function normalizeJsonObject(value, fallback = {}) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
}

function mapWorkspaceSessionRow(row, csrfToken) {
  const workspace = {
    id: row.workspace_id,
    slug: row.slug,
    name: row.name,
    status: row.workspace_status,
    plan: row.plan,
    metadata: normalizeJsonObject(row.metadata),
    primaryCustomerId: row.primary_customer_id,
    communicationEmail: row.workspace_communication_email || null,
    skyemail: row.workspace_skyemail || null,
    branding: normalizeJsonObject(row.branding),
    appSettings: normalizeJsonObject(row.app_settings),
    securitySettings: normalizeJsonObject(row.security_settings)
  };
  const user = {
    id: row.workspace_user_id,
    email: row.workspace_user_email,
    role: row.workspace_user_role,
    status: row.workspace_user_status,
    linkedUserId: row.linked_user_id || null,
    communicationEmail: row.workspace_user_communication_email || null,
    skyemail: row.workspace_user_skyemail || null,
    gateUserEmail: row.gate_user_email || null,
    permissions: permissionsForRole(row.workspace_user_role)
  };
  return { workspace, user, csrfToken };
}

export async function createWorkspaceSession(req, workspaceUserRow, workspaceRow, apiKeyId = null) {
  const csrfToken = crypto.randomBytes(18).toString("base64url");
  const sessionId = crypto.randomUUID();
  const expiresAt = sessionExpiryDate();
  const meta = {
    source_app: "northstar-signinpro",
    workspace_id: workspaceRow.id,
    workspace_slug: workspaceRow.slug,
    workspace_user_id: workspaceUserRow.id,
    csrf_token: csrfToken,
    gate_owned: true,
    free99_rate_limited: true,
    ip_hash: requestIpHash(req) || null,
    user_agent: getUserAgent(req) || null
  };
  await q(
    `insert into user_sessions(
        id, user_id, customer_id, api_key_id, session_kind, token_family, token_version, title,
        scope, meta, last_seen_at, last_seen_ip, last_seen_user_agent, expires_at, created_at
      )
      values (
        $1,$2,$3,$4,'northstar_workspace','cookie',1,$5,
        $6::text[],$7::jsonb,now(),$8,$9,$10,now()
      )`,
    [
      sessionId,
      workspaceUserRow.linked_user_id || null,
      workspaceRow.primary_customer_id || null,
      apiKeyId || null,
      `${workspaceRow.name} workspace session`,
      permissionsForRole(workspaceUserRow.role),
      JSON.stringify(meta),
      getClientIp(req) || null,
      getUserAgent(req) || null,
      expiresAt.toISOString()
    ]
  );
  const token = signCookiePayload({
    sid: sessionId,
    csrf: csrfToken,
    exp: expiresAt.getTime(),
    ws: workspaceRow.id,
    wsu: workspaceUserRow.id
  });
  return {
    sessionId,
    csrfToken,
    expiresAt: expiresAt.toISOString(),
    cookie: buildSessionCookie(req, token)
  };
}

export async function revokeWorkspaceSession(sessionId, reason = "logout") {
  if (!sessionId) return;
  await q(
    `update user_sessions
        set revoked_at = now(),
            revocation_reason = $2
      where id = $1
        and session_kind = 'northstar_workspace'
        and revoked_at is null`,
    [sessionId, safeText(reason, 160)]
  );
}

export async function resolveWorkspaceSession(req) {
  const token = readCookie(req, COOKIE_NAME);
  const payload = verifyCookiePayload(token);
  if (!payload?.sid) return null;
  const result = await q(
    `select
        s.id as session_id,
        s.customer_id,
        s.api_key_id,
        s.meta,
        s.expires_at,
        wu.id as workspace_user_id,
        wu.email as workspace_user_email,
        wu.role as workspace_user_role,
        wu.status as workspace_user_status,
        wu.linked_user_id,
        wu.communication_email as workspace_user_communication_email,
        wu.skyemail as workspace_user_skyemail,
        w.id as workspace_id,
        w.slug,
        w.name,
        w.status as workspace_status,
        w.plan,
        w.metadata,
        w.primary_customer_id,
        w.communication_email as workspace_communication_email,
        w.skyemail as workspace_skyemail,
        ws.branding,
        ws.app_settings,
        ws.security_settings,
        u.email as gate_user_email
      from user_sessions s
      join workspace_users wu on wu.id = ((s.meta->>'workspace_user_id')::uuid)
      join workspaces w on w.id = ((s.meta->>'workspace_id')::uuid)
      left join workspace_settings ws on ws.workspace_id = w.id
      left join users u on u.id = wu.linked_user_id
      where s.id = $1
        and s.session_kind = 'northstar_workspace'
        and s.revoked_at is null
        and s.expires_at > now()
      limit 1`,
    [payload.sid]
  );
  const row = result.rows[0];
  if (!row) return null;
  if (row.workspace_status !== "active" || row.workspace_user_status !== "active") return null;
  if (payload.ws && payload.ws !== row.workspace_id) return null;
  if (payload.wsu && payload.wsu !== row.workspace_user_id) return null;
  const session = mapWorkspaceSessionRow(row, payload.csrf || row.meta?.csrf_token || "");
  session.sessionId = row.session_id;
  session.customerId = row.customer_id || row.primary_customer_id || null;
  session.apiKeyId = row.api_key_id || null;
  session.expiresAt = row.expires_at;
  session.meta = normalizeJsonObject(row.meta);
  return session;
}

export async function touchWorkspaceSession(sessionId, req) {
  if (!sessionId) return;
  await q(
    `update user_sessions
        set last_seen_at = now(),
            last_seen_ip = $2,
            last_seen_user_agent = $3
      where id = $1`,
    [sessionId, getClientIp(req) || null, getUserAgent(req) || null]
  );
}

export function requireCsrf(req, session) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(String(req.method || "GET").toUpperCase())) return;
  const actual = String(req.headers.get("x-csrf-token") || req.headers.get("X-CSRF-Token") || "");
  if (!session?.csrfToken || !actual || actual !== session.csrfToken) {
    const error = new Error("CSRF token missing or invalid. Refresh the session and try again.");
    error.status = 403;
    error.code = "SIGNINPRO_CSRF_INVALID";
    throw error;
  }
}

export function sanitizeStateForStore(input, workspace) {
  const state = input && typeof input === "object" ? input : {};
  const clean = { ...state };
  clean.workspace = {
    id: workspace.id,
    slug: workspace.slug,
    name: workspace.name,
    role: clean.workspace?.role || "operator"
  };
  clean.schemaVersion = 4;
  clean.appVersion = safeText(clean.appVersion, 80) || "6.4.1-0s";
  clean.settings = normalizeJsonObject(clean.settings);
  clean.attendees = Array.isArray(clean.attendees) ? clean.attendees.slice(0, 25000) : [];
  clean.audit = Array.isArray(clean.audit) ? clean.audit.slice(-1000) : [];
  return clean;
}

export function stateHash(state) {
  return crypto.createHash("sha256").update(JSON.stringify(state || {})).digest("hex");
}

export function cleanObject(value, maxText = 1000) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  for (const [key, raw] of Object.entries(value).slice(0, 80)) {
    const cleanKey = safeText(key, 80);
    if (!cleanKey) continue;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) out[cleanKey] = cleanObject(raw, maxText);
    else if (typeof raw === "boolean" || typeof raw === "number") out[cleanKey] = raw;
    else out[cleanKey] = safeText(raw, maxText);
  }
  return out;
}

export async function auditWorkspaceEvent(req, session, action, detail = "", data = {}) {
  if (!session?.workspace?.id || !action) return;
  await q(
    `insert into workspace_audit_events(workspace_id, user_id, action, detail, data, ip_hash, user_agent)
     values ($1,$2,$3,$4,$5::jsonb,$6,$7)`,
    [
      session.workspace.id,
      session.user?.id || null,
      safeText(action, 120),
      safeText(detail, 300) || null,
      JSON.stringify(data || {}),
      requestIpHash(req) || null,
      getUserAgent(req) || null
    ]
  );
  await audit("northstar-signinpro", `NORTHSTAR_${safeText(action, 120).toUpperCase()}`, `workspace:${session.workspace.slug}`, {
    source_app: "northstar-signinpro",
    workspace_id: session.workspace.id,
    workspace_slug: session.workspace.slug,
    workspace_user_id: session.user?.id || null,
    linked_user_id: session.user?.linkedUserId || null,
    customer_id: session.workspace.primaryCustomerId || null,
    detail: safeText(detail, 300) || null,
    ...data
  });
}

function operatorTokens() {
  return [
    process.env.NORTHSTAR_OPERATOR_TOKEN,
    process.env.SITE_OPERATOR_ADMIN_TOKEN,
    process.env.METRAIYUX_ADMIN_TOKEN,
    process.env.ADMIN_TOKEN
  ].map((value) => String(value || "").trim()).filter(Boolean);
}

export function requireOperatorBearer(req) {
  const header = String(req.headers.get("authorization") || req.headers.get("Authorization") || "");
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : String(req.headers.get("x-operator-token") || req.headers.get("X-Operator-Token") || "").trim();
  const allowed = operatorTokens();
  if (!token || !allowed.includes(token)) {
    const error = new Error("Operator provisioning token is missing or invalid.");
    error.status = 401;
    error.code = "SIGNINPRO_OPERATOR_UNAUTHORIZED";
    throw error;
  }
  return token;
}

async function ensureGateUser({
  email,
  passwordHash,
  displayName = null,
  communicationEmail = null,
  skyemail = null,
  customerId = null,
  role = "user",
  provisionedBy = "northstar-signinpro",
  profilePatch = {}
}) {
  const existing = await getUserByEmail(email);
  if (existing) {
    await updateUserPassword(existing.id, passwordHash);
    return setUserProvisioningState(existing.id, {
      customerId,
      displayName,
      communicationEmail,
      skyemail,
      role,
      passwordResetRequired: true,
      provisionedBy,
      profilePatch
    });
  }
  return createUser({
    email,
    passwordHash,
    displayName,
    communicationEmail,
    skyemail,
    customerId,
    role,
    profile: profilePatch,
    passwordResetRequired: true,
    provisionedBy
  });
}

export async function upsertWorkspaceGateUser({
  workspaceId,
  workspaceSlug,
  customerId,
  email,
  password,
  role = "operator",
  displayName = null,
  communicationEmail = null,
  skyemail = null,
  provisionedBy = "northstar-signinpro"
}) {
  const normalizedEmail = safeText(email, 254).toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    const error = new Error("A valid email is required.");
    error.status = 400;
    error.code = "SIGNINPRO_EMAIL_REQUIRED";
    throw error;
  }
  const passwordHash = await hashPassword(String(password || ""));
  const gateUser = await ensureGateUser({
    email: normalizedEmail,
    passwordHash,
    displayName,
    communicationEmail,
    skyemail,
    customerId,
    role: role === "owner" ? "owner" : role === "admin" ? "admin" : "user",
    provisionedBy,
    profilePatch: {
      source_app: "northstar-signinpro",
      workspace_slug: workspaceSlug || null,
      workspace_id: workspaceId || null,
      workspace_role: role
    }
  });
  const result = await q(
    `insert into workspace_users(
        workspace_id, linked_user_id, email, communication_email, skyemail, password_hash, role, status, updated_at
      )
      values ($1,$2,$3,$4,$5,$6,$7,'active',now())
      on conflict (workspace_id, email) do update
        set linked_user_id = excluded.linked_user_id,
            communication_email = coalesce(excluded.communication_email, workspace_users.communication_email),
            skyemail = coalesce(excluded.skyemail, workspace_users.skyemail),
            password_hash = excluded.password_hash,
            role = excluded.role,
            status = 'active',
            updated_at = now()
      returning *`,
    [
      workspaceId,
      gateUser.id,
      normalizedEmail,
      sanitizeContactValue(communicationEmail),
      sanitizeContactValue(skyemail),
      passwordHash,
      safeText(role, 40) || "operator"
    ]
  );
  return { gateUser, workspaceUser: result.rows[0], oneTimePassword: password };
}

export async function provisionWorkspaceBundle({
  name,
  slug,
  ownerEmail,
  ownerPassword,
  role = "owner",
  plan = "free99-gate-owned",
  communicationEmail = null,
  skyemail = null,
  metadata = {},
  initialState = null,
  initialBranding = {},
  initialAppSettings = {},
  initialSecuritySettings = {},
  provisionedBy = "northstar-signinpro"
}) {
  const cleanName = safeText(name, 180);
  const cleanSlug = slugify(slug || name);
  const normalizedEmail = safeText(ownerEmail, 254).toLowerCase();
  if (!cleanName || !cleanSlug || !normalizedEmail) {
    const error = new Error("name, slug, and ownerEmail are required.");
    error.status = 400;
    error.code = "SIGNINPRO_PROVISION_FIELDS_REQUIRED";
    throw error;
  }
  const customer = await ensureCustomerForUser({
    email: normalizedEmail,
    planName: safeText(plan, 80) || "free99-gate-owned",
    communicationEmail,
    skyemail
  });
  const workspaceRes = await q(
    `insert into workspaces(slug, name, status, plan, primary_customer_id, communication_email, skyemail, metadata, updated_at)
     values ($1,$2,'active',$3,$4,$5,$6,$7::jsonb,now())
     on conflict (slug) do update set
       name = excluded.name,
       status = 'active',
       plan = excluded.plan,
       primary_customer_id = coalesce(workspaces.primary_customer_id, excluded.primary_customer_id),
       communication_email = coalesce(excluded.communication_email, workspaces.communication_email),
       skyemail = coalesce(excluded.skyemail, workspaces.skyemail),
       metadata = workspaces.metadata || excluded.metadata,
       updated_at = now()
     returning *`,
    [
      cleanSlug,
      cleanName,
      safeText(plan, 80) || "free99-gate-owned",
      customer.id,
      sanitizeContactValue(communicationEmail),
      sanitizeContactValue(skyemail),
      JSON.stringify(metadata || {})
    ]
  );
  const workspace = workspaceRes.rows[0];
  const owner = await upsertWorkspaceGateUser({
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    customerId: customer.id,
    email: normalizedEmail,
    password: String(ownerPassword || crypto.randomBytes(18).toString("base64url")),
    role,
    displayName: cleanName,
    communicationEmail,
    skyemail,
    provisionedBy
  });

  await q(
    `insert into workspace_settings(workspace_id, branding, app_settings, security_settings, updated_by, updated_at)
     values ($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,now())
     on conflict (workspace_id) do update set
       branding = workspace_settings.branding || excluded.branding,
       app_settings = workspace_settings.app_settings || excluded.app_settings,
       security_settings = workspace_settings.security_settings || excluded.security_settings,
       updated_by = excluded.updated_by,
       updated_at = now()`,
    [
      workspace.id,
      JSON.stringify(cleanObject(initialBranding)),
      JSON.stringify(cleanObject(initialAppSettings)),
      JSON.stringify(cleanObject(initialSecuritySettings)),
      owner.workspaceUser.id
    ]
  );

  const state = initialState && typeof initialState === "object"
    ? sanitizeStateForStore(initialState, { id: workspace.id, slug: workspace.slug, name: workspace.name })
    : sanitizeStateForStore({
        schemaVersion: 4,
        appVersion: "6.4.1-0s",
        workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name, role },
        settings: {
          eventName: `${workspace.name} Guest Access`,
          idLabel: "Event ID",
          enableSound: true,
          allowDuplicateEmails: false,
          syncEnabled: true,
          retentionNote: "Workspace-local storage with FS27 backup."
        },
        attendees: [],
        audit: [{ at: new Date().toISOString(), action: "workspace_provisioned", detail: "Workspace provisioned through the 0S NorthStar lane." }]
      }, { id: workspace.id, slug: workspace.slug, name: workspace.name });

  await q(
    `insert into workspace_states(workspace_id, state, state_hash, revision, updated_by, updated_at)
     values ($1,$2::jsonb,$3,1,$4,now())
     on conflict (workspace_id) do nothing`,
    [workspace.id, JSON.stringify(state), stateHash(state), owner.workspaceUser.id]
  );

  await q(
    `insert into workspace_audit_events(workspace_id, user_id, action, detail, data)
     values ($1,$2,'workspace_provisioned','Workspace created or refreshed.', $3::jsonb)`,
    [
      workspace.id,
      owner.workspaceUser.id,
      JSON.stringify({
        owner_email: normalizedEmail,
        customer_id: customer.id,
        linked_user_id: owner.gateUser.id,
        source_app: "northstar-signinpro"
      })
    ]
  );

  await audit("northstar-signinpro", "NORTHSTAR_WORKSPACE_PROVISIONED", `workspace:${workspace.slug}`, {
    source_app: "northstar-signinpro",
    workspace_id: workspace.id,
    workspace_slug: workspace.slug,
    customer_id: customer.id,
    owner_email: normalizedEmail,
    linked_user_id: owner.gateUser.id
  });

  return {
    workspace,
    customer,
    gateUser: owner.gateUser,
    workspaceUser: owner.workspaceUser,
    oneTimePassword: owner.oneTimePassword
  };
}
