import { q } from "./db.js";
import { keyHashHex, legacyKeyHashHex, verifyJwt } from "./crypto.js";
import { getBearer, json, monthKeyUTC } from "./http.js";
import { verifySessionToken } from "./sessions.js";
import { verifyAccessToken } from "./oauth.js";

function baseSelect() {
  return `select k.id as api_key_id, k.customer_id, k.key_last4, k.label, k.role,
                 k.monthly_cap_cents as key_cap_cents, k.rpm_limit, k.rpd_limit,
                 k.max_devices, k.require_install_id, k.allowed_providers, k.allowed_models,
                 k.expires_at, k.metadata as key_metadata,
                 c.monthly_cap_cents as customer_cap_cents, c.is_active,
                 c.default_rpm_limit as customer_default_rpm_limit,
                 c.default_rpd_limit as customer_default_rpd_limit,
                 c.vault_storage_mb as customer_vault_storage_mb,
                 c.vault_file_limit as customer_vault_file_limit,
                 c.vault_workspace_limit as customer_vault_workspace_limit,
                 c.skypay_policy as customer_skypay_policy,
                 c.max_devices_per_key as customer_max_devices_per_key, c.require_install_id as customer_require_install_id,
                 c.allowed_providers as customer_allowed_providers, c.allowed_models as customer_allowed_models,
                 c.plan_name as customer_plan_name, c.email as customer_email
          from api_keys k
          join customers c on c.id = k.customer_id`;
}

export async function lookupKey(plainKey) {
  // Preferred hash (peppered if enabled)
  const preferred = keyHashHex(plainKey);
  let keyRes = await q(
    `${baseSelect()}
     where k.key_hash=$1
       and k.revoked_at is null
       and (k.expires_at is null or k.expires_at > now())
     limit 1`,
    [preferred]
  );
  if (keyRes.rowCount) return keyRes.rows[0];

  // If KEY_PEPPER is enabled, allow legacy SHA-256 hashes and auto-migrate on first hit.
  if (process.env.KEY_PEPPER) {
    const legacy = legacyKeyHashHex(plainKey);
    keyRes = await q(
      `${baseSelect()}
       where k.key_hash=$1
         and k.revoked_at is null
         and (k.expires_at is null or k.expires_at > now())
       limit 1`,
      [legacy]
    );
    if (!keyRes.rowCount) return null;

    const row = keyRes.rows[0];
    try {
      await q(
        `update api_keys set key_hash=$1
         where id=$2 and key_hash=$3`,
        [preferred, row.api_key_id, legacy]
      );
    } catch {
      // ignore migration errors
    }

    return row;
  }

  return null;
}

export async function lookupKeyById(api_key_id) {
  const keyRes = await q(
    `${baseSelect()}
     where k.id=$1
       and k.revoked_at is null
       and (k.expires_at is null or k.expires_at > now())
     limit 1`,
    [api_key_id]
  );
  if (!keyRes.rowCount) return null;
  return keyRes.rows[0];
}

/**
 * Resolve an Authorization Bearer token.
 * Supported:
 * - Kaixu sub-key (plain virtual key, must start with "kx_live_")
 * - Short-lived user session JWT (type: 'user_session')
 */
export async function resolveAuth(token) {
  if (!token) return null;

  // JWTs have 3 dot-separated parts. Kaixu keys do not.
  const parts = token.split(".");
  if (parts.length === 3) {
    const payload = verifyJwt(token);
    if (payload?.type === "user_session") {
      const row = await lookupKeyById(payload.api_key_id);
      if (row) return row;
    }
  }

  const session = await verifySessionToken(token);
  if (session?.session?.api_key_id) {
    return await lookupKeyById(session.session.api_key_id);
  }

  const access = await verifyAccessToken(token);
  if (access?.payload?.api_key_id) {
    return await lookupKeyById(access.payload.api_key_id);
  }

  // Reject tokens that are clearly not kAIxu keys.
  // Prevents provider API keys (OpenAI sk-*, Gemini AI…, Anthropic sk-ant-*) from
  // being hashed and looked up needlessly.
  if (!token.startsWith("kx_live_")) return null;

  return await lookupKey(token);
}

function gateHeader(req, name) {
  return (req.headers.get(name) || req.headers.get(name.toLowerCase()) || req.headers.get(name.toUpperCase()) || "").toString().trim();
}

function splitGateCards(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function gateRoleFromRequest(req) {
  const declared = gateHeader(req, "x-0s-role") || gateHeader(req, "x-skye-role");
  const role = String(declared || "").toLowerCase();
  if (["owner", "founder"].includes(role)) return "owner";
  if (["admin", "operator", "security"].includes(role)) return "admin";
  if (["deployer", "runner", "builder"].includes(role)) return "deployer";
  if (["viewer", "reader", "user"].includes(role)) return "viewer";

  const cards = splitGateCards(`${gateHeader(req, "x-0s-gate-cards")},${gateHeader(req, "x-skye-gate-cards")}`);
  if (cards.some((card) => /(^|[-_:])(owner|founder|admin)([-_:]|$)/.test(card))) return "owner";
  if (cards.some((card) => /(^|[-_:])(deployer|deploy|runner|builder)([-_:]|$)/.test(card))) return "deployer";
  return cards.length ? "viewer" : "";
}

function numericGateCustomerId(req) {
  const raw = gateHeader(req, "x-0s-customer-id") || gateHeader(req, "x-skye-customer-id");
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function gateSessionToken(req) {
  return (
    getBearer(req) ||
    gateHeader(req, "x-0s-gate-session") ||
    gateHeader(req, "x-skye-gate-session") ||
    gateHeader(req, "x-skygate-session") ||
    gateHeader(req, "x-fs27-session") ||
    ""
  ).toString().trim();
}

function gateAuthError(status, code, message, hint = "") {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  if (hint) err.hint = hint;
  return err;
}

export function gateAuthErrorResponse(error, cors) {
  return json(error?.status || 401, {
    error: error?.message || "0S/SkyeGate FS27 session required",
    code: error?.code || "GATE_AUTH_REQUIRED",
    ...(error?.hint ? { hint: error.hint } : {})
  }, cors);
}

export async function requireGateAuth(req, requiredRole = "viewer") {
  const token = gateSessionToken(req);
  if (token) {
    const row = await resolveAuth(token);
    if (row) {
      requireKeyRole(row, requiredRole);
      return { ...row, gate_bearer_token: token, gate_auth_source: "resolved-session" };
    }
  }

  const customerId = numericGateCustomerId(req);
  const role = gateRoleFromRequest(req);
  if (token && customerId && role) {
    const row = {
      api_key_id: 0,
      customer_id: customerId,
      customer_email: gateHeader(req, "x-0s-email") || null,
      key_last4: "gate",
      label: "0S/SkyeGate FS27 session",
      role,
      key_metadata: { type: "0s_gate_session", source: gateHeader(req, "x-metraiyux-session-source") || "0s-gate-card-bridge" },
      is_active: true,
      gate_bearer_token: token,
      gate_auth_source: "0s-gate-card-header"
    };
    requireKeyRole(row, requiredRole);
    return row;
  }

  if (!token) {
    throw gateAuthError(401, "GATE_SESSION_REQUIRED", "0S/SkyeGate FS27 session required", "Sign into the 0S gate; apps should inherit that session instead of asking for a Kaixu key.");
  }
  throw gateAuthError(401, "GATE_SESSION_UNVERIFIED", "0S/SkyeGate FS27 session could not be verified by this gate", "The app sent a token, but the gate could not resolve it to an active session or scoped gate card.");
}

export async function getMonthRollup(customer_id, month = monthKeyUTC()) {
  const roll = await q(
    `select spent_cents, extra_cents, input_tokens, output_tokens
     from monthly_usage where customer_id=$1 and month=$2`,
    [customer_id, month]
  );
  if (roll.rowCount === 0) return { spent_cents: 0, extra_cents: 0, input_tokens: 0, output_tokens: 0 };
  return roll.rows[0];
}

export async function getKeyMonthRollup(api_key_id, month = monthKeyUTC()) {
  const roll = await q(
    `select spent_cents, input_tokens, output_tokens, calls
     from monthly_key_usage where api_key_id=$1 and month=$2`,
    [api_key_id, month]
  );
  if (roll.rowCount) return roll.rows[0];

  // Backfill for migrated installs (when monthly_key_usage did not exist yet).
  const keyMeta = await q(`select customer_id from api_keys where id=$1`, [api_key_id]);
  const customer_id = keyMeta.rowCount ? keyMeta.rows[0].customer_id : null;

  const agg = await q(
    `select coalesce(sum(cost_cents),0)::int as spent_cents,
            coalesce(sum(input_tokens),0)::int as input_tokens,
            coalesce(sum(output_tokens),0)::int as output_tokens,
            count(*)::int as calls
     from usage_events
     where api_key_id=$1 and to_char(created_at at time zone 'UTC','YYYY-MM')=$2`,
    [api_key_id, month]
  );

  const row = agg.rows[0] || { spent_cents: 0, input_tokens: 0, output_tokens: 0, calls: 0 };

  if (customer_id != null) {
    await q(
      `insert into monthly_key_usage(api_key_id, customer_id, month, spent_cents, input_tokens, output_tokens, calls)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (api_key_id, month)
       do update set
         spent_cents = excluded.spent_cents,
         input_tokens = excluded.input_tokens,
         output_tokens = excluded.output_tokens,
         calls = excluded.calls,
         updated_at = now()`,
      [api_key_id, customer_id, month, row.spent_cents || 0, row.input_tokens || 0, row.output_tokens || 0, row.calls || 0]
    );
  }

  return row;
}

export function effectiveCapCents(keyRow, rollup) {
  const base = keyRow.key_cap_cents ?? keyRow.customer_cap_cents;
  const extra = rollup.extra_cents || 0;
  return (base || 0) + extra;
}

export function customerCapCents(keyRow, customerRollup) {
  const base = keyRow.customer_cap_cents || 0;
  const extra = customerRollup.extra_cents || 0;
  return base + extra;
}

export function keyCapCents(keyRow, customerRollup) {
  // If a key override exists, it's a hard cap for that key. Otherwise it inherits the customer cap.
  if (keyRow.key_cap_cents != null) return keyRow.key_cap_cents;
  return customerCapCents(keyRow, customerRollup);
}

function policyObject(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function firstFiniteLimit(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function normalizePlatformId(value, fallback = "") {
  const raw = String(value || "").trim().toLowerCase();
  const cleaned = raw
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || fallback || "";
}

export function platformIdFromKeyRow(keyRow, fallback = "metraiyux-0s") {
  const keyMeta = policyObject(keyRow?.key_metadata);
  const customerPolicy = policyObject(keyRow?.customer_skypay_policy);
  return normalizePlatformId(
    keyMeta.platform_id ||
      keyMeta.platform ||
      keyMeta.app_id ||
      customerPolicy.default_platform_id ||
      customerPolicy.platform_id ||
      fallback,
    fallback
  );
}

export function platformUsageBucket(keyRow, platformId) {
  const customerPolicy = policyObject(keyRow?.customer_skypay_policy);
  const buckets = policyObject(customerPolicy.platform_usage_buckets || customerPolicy.platforms);
  const normalized = normalizePlatformId(platformId, "");
  if (!normalized) return {};
  return policyObject(buckets[normalized] || buckets[platformId] || {});
}

export function hasPlatformUsageBucket(keyRow, platformId) {
  return Object.keys(platformUsageBucket(keyRow, platformId)).length > 0;
}

export function effectiveRpmLimit(keyRow, fallback = null, platformId = null) {
  const bucket = platformId ? platformUsageBucket(keyRow, platformId) : {};
  return firstFiniteLimit(
    bucket.default_rpm_limit,
    bucket.rpm_limit,
    bucket.rpm,
    keyRow?.rpm_limit,
    keyRow?.customer_default_rpm_limit,
    fallback
  );
}

export function effectiveRpdLimit(keyRow, fallback = null, platformId = null) {
  const bucket = platformId ? platformUsageBucket(keyRow, platformId) : {};
  return firstFiniteLimit(
    bucket.default_rpd_limit,
    bucket.rpd_limit,
    bucket.rpd,
    keyRow?.rpd_limit,
    keyRow?.customer_default_rpd_limit,
    fallback
  );
}


const ROLE_ORDER = ["viewer","deployer","admin","owner"];

export function roleAtLeast(actual, required) {
  const a = ROLE_ORDER.indexOf((actual || "deployer").toLowerCase());
  const r = ROLE_ORDER.indexOf((required || "deployer").toLowerCase());
  return a >= r && a !== -1 && r !== -1;
}

export function requireKeyRole(keyRow, requiredRole) {
  const actual = (keyRow?.role || "deployer").toLowerCase();
  const cardType = keyRow?.key_metadata?.card_type || keyRow?.key_metadata?.type || null;
  if (cardType === "pentest_hour_key" && requiredRole !== "viewer") {
    const err = new Error("Pentest cards cannot perform mutating deployment/admin operations");
    err.status = 403;
    err.code = "PENTEST_CARD_SCOPE_LIMIT";
    err.hint = "This one-hour tester card is allowed for gateway/read testing only.";
    throw err;
  }
  if (!roleAtLeast(actual, requiredRole)) {
    const err = new Error("Forbidden");
    err.status = 403;
    err.code = "FORBIDDEN";
    err.hint = `Requires role '${requiredRole}', but gate role is '${actual}'.`;
    throw err;
  }
}
