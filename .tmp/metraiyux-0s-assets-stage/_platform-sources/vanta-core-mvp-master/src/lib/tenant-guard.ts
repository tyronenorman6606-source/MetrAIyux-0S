import { NextResponse } from "next/server";
import { firstEnv, isLocalRuntime } from "@/lib/runtime-env";

export class TenantAccessError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "TenantAccessError";
    this.status = status;
  }
}

type TenantMap = Record<string, string>;

export function ownedTenantId(request: Request, candidate?: string | null): string {
  const headers = request.headers;
  const mode = headers.get("x-vantacore-auth-mode");
  const localBypass = mode === "local-bypass" || (firstEnv("FS27_GATE_MODE") === "local-bypass" && isLocalRuntime());
  if (localBypass) {
    const localTenant = firstEnv("VANTACORE_LOCAL_TENANT_ID");
    return candidate || localTenant || "00000000-0000-0000-0000-000000000000";
  }

  const fs27CustomerId = headers.get("x-vantacore-fs27-customer-id");
  if (!fs27CustomerId) {
    throw new TenantAccessError("FS27 customer context is missing", 401);
  }

  const expectedTenantId = mappedTenantId(fs27CustomerId) || fs27CustomerId;
  if (!candidate) {
    return expectedTenantId;
  }

  if (candidate === expectedTenantId) {
    return candidate;
  }

  throw new TenantAccessError("Requested tenant is not owned by this FS27 caller");
}

export function tenantGuardResponse(error: unknown) {
  if (error instanceof TenantAccessError) {
    return NextResponse.json({ error: "TENANT_FORBIDDEN", detail: error.message }, { status: error.status });
  }
  return null;
}

export function assertGateAdmin(request: Request): void {
  const mode = request.headers.get("x-vantacore-auth-mode");
  if (mode === "local-bypass") return;

  const role = request.headers.get("x-vantacore-fs27-role") || "";
  const scopes = new Set((request.headers.get("x-vantacore-fs27-scope") || "").split(/\s+/).filter(Boolean));
  if (role === "owner" || role === "admin" || scopes.has("admin.write") || scopes.has("admin.read")) {
    return;
  }
  throw new TenantAccessError("FS27 admin scope is required", 403);
}

function mappedTenantId(fs27CustomerId: string): string | undefined {
  const raw = firstEnv("VANTACORE_FS27_TENANT_MAP_JSON");
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as TenantMap;
    return parsed[fs27CustomerId];
  } catch {
    throw new TenantAccessError("VANTACORE_FS27_TENANT_MAP_JSON is invalid", 500);
  }
}
