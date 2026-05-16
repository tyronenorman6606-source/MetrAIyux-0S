/**
 * auth-card.js — Gateway Identity Card (SkyeVerse Card)
 *
 * Returns a rich, structured identity card for the current principal.
 * This is the "passport" concept — one call gives you everything you need
 * to know about who the caller is, what they can do, and their current
 * budget/usage state.
 *
 * Unlike auth-presence (which is purely soft), auth-card returns 401
 * if no valid token is present — it's for authenticated surfaces that
 * need the full picture.
 *
 * Response shape:
 * {
 *   card: {
 *     issued_at:    <ISO>,
 *     principal:    "api_key" | "session" | "oauth",
 *     tier:         "api" | "session" | "admin",
 *     identity: {
 *       sub, email, customer_id, role, label
 *     },
 *     permissions: {
 *       scope:             string[],
 *       allowed_providers: string[] | null,
 *       allowed_models:    object | null,
 *       max_devices:       number | null
 *     },
 *     budget: {
 *       monthly_cap_cents:    number | null,
 *       key_cap_cents:        number | null,
 *       spent_cents:          number,
 *       remaining_cents:      number | null,
 *       extra_cents:          number
 *     },
 *     limits: {
 *       rpm:  number | null,
 *       rpd:  number | null
 *     },
 *     operations: {
 *       can_invoke_gateway:  boolean,
 *       can_manage_keys:     boolean,
 *       can_admin:           boolean,
 *       can_bill:            boolean
 *     }
 *   }
 * }
 */

import { wrap } from "./_lib/wrap.js";
import { buildCors, json, monthKeyUTC } from "./_lib/http.js";
import { verifySessionToken } from "./_lib/sessions.js";
import { lookupKey } from "./_lib/authz.js";
import { verifyAccessToken } from "./_lib/oauth.js";
import { q } from "./_lib/db.js";
import { AUTH_TIERS, operationsForRole, operationsForScope } from "./_lib/policy.js";

export default wrap(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "GET" && req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  const token = extractToken(req);
  if (!token) return json(401, { error: "No credentials — provide Authorization: Bearer <token>" }, cors);

  const now = new Date().toISOString();
  const month = monthKeyUTC();

  // ── API key path ──
  if (token.startsWith("kx_live_")) {
    const keyRow = await lookupKey(token).catch(() => null);
    if (!keyRow || !keyRow.is_active) return json(401, { error: "Invalid or revoked key" }, cors);

    const usage = await fetchKeyUsage(keyRow.api_key_id, keyRow.customer_id, month);
    const role  = (keyRow.role || "deployer").toLowerCase();
    const scope = keyScopes(keyRow);
    const ops   = operationsForRole(role);
    const cap   = effectiveCap(keyRow);
    const spent = usage.spent_cents || 0;

    return json(200, { card: {
      issued_at:  now,
      principal:  "api_key",
      tier:       adminRole(role) ? AUTH_TIERS.ADMIN : AUTH_TIERS.API,
      identity: {
        sub:         `api_key:${keyRow.api_key_id}`,
        email:       keyRow.customer_email || null,
        customer_id: keyRow.customer_id,
        role,
        label:       keyRow.label || null,
        key_last4:   keyRow.key_last4 || null,
        plan:        keyRow.customer_plan_name || null
      },
      permissions: {
        scope,
        allowed_providers: keyRow.allowed_providers || null,
        allowed_models:    keyRow.allowed_models    || null,
        max_devices:       keyRow.max_devices       || keyRow.customer_max_devices_per_key || null,
        require_install_id:keyRow.require_install_id ?? keyRow.customer_require_install_id ?? false
      },
      budget: {
        monthly_cap_cents: cap,
        key_cap_cents:     keyRow.key_cap_cents || null,
        customer_cap_cents:keyRow.customer_cap_cents || null,
        spent_cents:       spent,
        extra_cents:       usage.extra_cents || 0,
        remaining_cents:   cap != null ? Math.max(0, cap + (usage.extra_cents||0) - spent) : null
      },
      limits: {
        rpm: keyRow.rpm_limit || null,
        rpd: keyRow.rpd_limit || null
      },
      operations: ops
    }}, cors);
  }

  // ── Session JWT path ──
  const session = await verifySessionToken(token).catch(() => null);
  if (session) {
    const c     = session.payload;
    const role  = (c.role || "viewer").toLowerCase();
    const scope = scopeArr(c.scope);
    const ops   = operationsForScope(scope, role);

    return json(200, { card: {
      issued_at:  now,
      principal:  "session",
      tier:       adminRole(role) ? AUTH_TIERS.ADMIN : AUTH_TIERS.SESSION,
      identity: {
        sub:         c.sub,
        email:       c.email || null,
        customer_id: c.customer_id || null,
        role,
        session_id:  c.sid || null
      },
      permissions: {
        scope,
        allowed_providers: null,
        allowed_models:    null,
        max_devices:       null,
        require_install_id:false
      },
      budget:  { monthly_cap_cents: null, spent_cents: 0, remaining_cents: null, extra_cents: 0 },
      limits:  { rpm: null, rpd: null },
      operations: ops
    }}, cors);
  }

  // ── OAuth access token path ──
  const access = await verifyAccessToken(token).catch(() => null);
  if (access) {
    const c     = access.payload;
    const role  = (c.role || "viewer").toLowerCase();
    const scope = scopeArr(c.scope);
    const ops   = operationsForScope(scope, role);

    return json(200, { card: {
      issued_at:  now,
      principal:  "oauth",
      tier:       adminRole(role) ? AUTH_TIERS.ADMIN : AUTH_TIERS.SESSION,
      identity: {
        sub:         c.sub,
        email:       c.email || null,
        customer_id: c.customer_id || null,
        role,
        client_id:   c.client_id || null
      },
      permissions: {
        scope,
        allowed_providers: null,
        allowed_models:    null,
        max_devices:       null,
        require_install_id:false
      },
      budget:  { monthly_cap_cents: null, spent_cents: 0, remaining_cents: null, extra_cents: 0 },
      limits:  { rpm: null, rpd: null },
      operations: ops
    }}, cors);
  }

  return json(401, { error: "Invalid or expired credentials" }, cors);
});

// ── helpers ──

function extractToken(req) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  const xSkye = req.headers.get("x-skye-token") || "";
  if (xSkye) return xSkye.trim();
  const cookie = req.headers.get("cookie") || "";
  const match  = cookie.match(/(?:^|;\s*)skyegate_session=([^;]+)/);
  if (match) return match[1].trim();
  return null;
}

async function fetchKeyUsage(api_key_id, customer_id, month) {
  try {
    const res = await q(
      `select coalesce(ku.spent_cents,0) as spent_cents, coalesce(mu.extra_cents,0) as extra_cents
       from (select 1) x
       left join monthly_key_usage ku on ku.api_key_id=$1 and ku.month_key=$3
       left join monthly_usage mu on mu.customer_id=$2 and mu.month_key=$3
       limit 1`,
      [api_key_id, customer_id, month]
    );
    return res.rows[0] || { spent_cents: 0, extra_cents: 0 };
  } catch {
    return { spent_cents: 0, extra_cents: 0 };
  }
}

function effectiveCap(keyRow) {
  if (keyRow.key_cap_cents != null) return keyRow.key_cap_cents;
  if (keyRow.customer_cap_cents != null) return keyRow.customer_cap_cents;
  return null;
}

function adminRole(role) {
  return ["owner","admin","founder"].includes(role);
}

function scopeArr(scope) {
  if (!scope) return [];
  if (Array.isArray(scope)) return scope;
  return String(scope).split(/\s+/).filter(Boolean);
}

function keyScopes(keyRow) {
  const base = ["gateway.invoke", "gateway.read"];
  const role = String(keyRow?.role || "").toLowerCase();
  if (["owner","admin"].includes(role)) base.push("keys.read","keys.write","admin.read","admin.write","billing.read","billing.write");
  else if (role === "deployer") base.push("keys.read","billing.read");
  return base;
}
