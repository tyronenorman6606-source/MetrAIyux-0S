/**
 * Auth Tier System — how apps should gate features
 *
 * PUBLIC  — no token needed. Browsing, reading, navigating.
 *           Apps like AuraConsole, SkyeHawk, SkyeDocxMax UI should work here.
 *           Call auth-presence to optionally enhance UX when a token exists.
 *
 * SESSION — light identity (user logged in). Enables personalization,
 *           saved state, user-specific views. No AI/spending required.
 *
 * API     — token required for AI gateway calls, metered operations,
 *           key-bound resource access, usage tracking.
 *
 * ADMIN   — admin role required. Mutation of customers, keys, billing,
 *           platform config.
 *
 * Usage:
 *   import { AUTH_TIERS, tierForOperation } from "./_lib/policy.js";
 *   const tier = tierForOperation("gateway.invoke"); // "api"
 *   // check against caller's tier before proceeding
 */
export const AUTH_TIERS = {
  PUBLIC:  "public",
  SESSION: "session",
  API:     "api",
  ADMIN:   "admin"
};

const TIER_RANK = { public: 0, session: 1, api: 2, admin: 3 };

export function tierMeets(callerTier, requiredTier) {
  return (TIER_RANK[callerTier] ?? -1) >= (TIER_RANK[requiredTier] ?? 99);
}

/** Map a scope string or operation name to the minimum auth tier required */
export function tierForOperation(op) {
  const publicOps = new Set(["read", "browse", "view", "health", "ping"]);
  const sessionOps = new Set(["profile", "me", "preferences", "saved", "notes"]);
  const adminOps = new Set([
    "admin.read","admin.write","keys.read","keys.write",
    "billing.read","billing.write","customers.write"
  ]);
  if (publicOps.has(op)) return AUTH_TIERS.PUBLIC;
  if (sessionOps.has(op)) return AUTH_TIERS.SESSION;
  if (adminOps.has(op)) return AUTH_TIERS.ADMIN;
  return AUTH_TIERS.API;
}

/** Return operations object based on role */
export function operationsForRole(role) {
  const r = (role || "viewer").toLowerCase();
  const isAdmin   = ["owner","admin","founder"].includes(r);
  const isOp      = ["deployer","operator"].includes(r) || isAdmin;
  return {
    can_invoke_gateway: isOp,
    can_manage_keys:    isAdmin,
    can_admin:          isAdmin,
    can_bill:           isAdmin,
    can_read_usage:     isOp || isAdmin,
    can_write_content:  isOp || isAdmin
  };
}

/** Return operations object based on OAuth scope array + role */
export function operationsForScope(scope, role) {
  const s = new Set(Array.isArray(scope) ? scope : []);
  const r = (role || "viewer").toLowerCase();
  const isAdmin = ["owner","admin","founder"].includes(r);
  return {
    can_invoke_gateway: s.has("gateway.invoke") || isAdmin,
    can_manage_keys:    s.has("keys.write")     || isAdmin,
    can_admin:          s.has("admin.write")    || isAdmin,
    can_bill:           s.has("billing.write")  || isAdmin,
    can_read_usage:     s.has("gateway.read")   || s.has("billing.read") || isAdmin,
    can_write_content:  s.has("gateway.invoke") || isAdmin
  };
}

export const KNOWN_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "gateway.invoke",
  "gateway.read",
  "keys.read",
  "keys.write",
  "admin.read",
  "admin.write",
  "billing.read",
  "billing.write"
];

export function hasScope(scopeList, required) {
  const scopes = new Set(Array.isArray(scopeList) ? scopeList : []);
  if (!required) return true;
  if (Array.isArray(required)) return required.every((scope) => scopes.has(scope));
  return scopes.has(required);
}

export function requireScopes(scopeList, required) {
  if (!hasScope(scopeList, required)) {
    const err = new Error("Insufficient scope");
    err.status = 403;
    err.code = "INSUFFICIENT_SCOPE";
    throw err;
  }
}

export function principalSummary(principal) {
  if (!principal) return null;
  return {
    type: principal.type || principal.payload?.type || "unknown",
    subject: principal.user?.id || principal.payload?.sub || null,
    role: principal.user?.role || principal.payload?.role || null,
    scope: principal.scope || principal.payload?.scope || []
  };
}
