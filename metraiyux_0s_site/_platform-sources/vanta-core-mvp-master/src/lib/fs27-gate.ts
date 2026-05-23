import type { NextRequest } from "next/server";
import {
  envList,
  firstEnv,
  fs27GateMode,
  fs27IntrospectionUrl,
  fs27RequiredRoles,
  fs27RequiredScopes,
  isLocalRuntime,
  isLocalUrl,
} from "@/lib/runtime-env";

export type Fs27Claims = {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number | null;
  iat?: number | null;
  sub?: string;
  role?: string | null;
  sub_type?: string | null;
  aud?: string;
  customer_id?: string;
  session_id?: string;
  api_key_id?: string;
  email?: string;
  org?: string;
  gate_card_id?: string;
  reason?: string;
};

export type GateResult =
  | { ok: true; mode: "fs27"; claims: Fs27Claims }
  | { ok: true; mode: "local-bypass"; claims: Fs27Claims }
  | { ok: false; status: number; reason: string };

const TOKEN_COOKIE_NAMES = [
  "FS27_SESSION",
  "SKYGATE_USER_TOKEN",
  "SKYGATE_SESSION",
  "skygate_token",
  "fs27_token",
  "vanta_core_token",
];

export function claimsToForwardHeaders(claims: Fs27Claims, mode: "fs27" | "local-bypass") {
  const headers = new Headers();
  headers.set("x-vantacore-auth-mode", mode);
  if (claims.sub) headers.set("x-vantacore-fs27-sub", claims.sub);
  if (claims.customer_id || claims.org) headers.set("x-vantacore-fs27-customer-id", claims.customer_id || claims.org || "");
  if (claims.session_id) headers.set("x-vantacore-fs27-session-id", claims.session_id);
  if (claims.api_key_id) headers.set("x-vantacore-fs27-api-key-id", claims.api_key_id);
  if (claims.email) headers.set("x-vantacore-fs27-email", claims.email);
  if (claims.role) headers.set("x-vantacore-fs27-role", claims.role);
  if (claims.scope) headers.set("x-vantacore-fs27-scope", claims.scope);
  if (claims.gate_card_id) headers.set("x-vantacore-fs27-gate-card-id", claims.gate_card_id);
  return headers;
}

export function mergeForwardHeaders(requestHeaders: Headers, claims: Fs27Claims, mode: "fs27" | "local-bypass") {
  const headers = new Headers(requestHeaders);
  for (const [key, value] of claimsToForwardHeaders(claims, mode)) {
    headers.set(key, value);
  }
  return headers;
}

export async function authorizeWithFs27(request: NextRequest): Promise<GateResult> {
  const localBypass = fs27GateMode() === "local-bypass" && (isLocalRuntime() || isLocalUrl(request.nextUrl.origin));
  if (localBypass) {
    return {
      ok: true,
      mode: "local-bypass",
      claims: {
        active: true,
        sub: "local-vantacore-operator",
        role: "owner",
        customer_id: firstEnv("VANTACORE_LOCAL_TENANT_ID") || "00000000-0000-0000-0000-000000000000",
        scope: ["gateway.read", "admin.read", "admin.write", ...fs27RequiredScopes()].join(" "),
      },
    };
  }

  const token = readBearerToken(request);
  if (!token) {
    return { ok: false, status: 401, reason: "Missing FS27 bearer token" };
  }

  const endpoint = fs27IntrospectionUrl();
  if (!endpoint) {
    return { ok: false, status: 503, reason: "FS27 introspection endpoint is not configured" };
  }

  let claims: Fs27Claims;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ token: `Bearer ${token}` }),
      cache: "no-store",
    });
    if (!response.ok) {
      return { ok: false, status: 503, reason: `FS27 introspection returned ${response.status}` };
    }
    claims = await response.json();
  } catch (error) {
    return {
      ok: false,
      status: 503,
      reason: error instanceof Error ? `FS27 introspection failed: ${error.message}` : "FS27 introspection failed",
    };
  }

  if (!claims?.active) {
    return { ok: false, status: 401, reason: claims?.reason || "FS27 token is not active" };
  }

  const missingScopes = fs27RequiredScopes().filter((scope) => !hasScope(claims.scope, scope));
  if (missingScopes.length > 0) {
    return { ok: false, status: 403, reason: `Missing FS27 scope(s): ${missingScopes.join(", ")}` };
  }

  const roles = fs27RequiredRoles();
  if (roles.length > 0 && !roles.includes(String(claims.role || ""))) {
    return { ok: false, status: 403, reason: "FS27 role is not allowed for VantaCore" };
  }

  return { ok: true, mode: "fs27", claims };
}

function readBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (match?.[1]) return match[1].trim();

  for (const name of TOKEN_COOKIE_NAMES) {
    const value = request.cookies.get(name)?.value;
    if (value) return value;
  }
  return null;
}

function hasScope(scopeValue: string | undefined, required: string): boolean {
  if (!required) return true;
  const scopes = new Set(envList(scopeValue));
  return scopes.has(required) || scopes.has("admin.write") || scopes.has("admin.read");
}
