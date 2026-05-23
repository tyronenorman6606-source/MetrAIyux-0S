export type RuntimeMode = "disabled" | "mock" | "local-bypass" | "enforced" | "live" | "skypay" | "auto" | "signed";

export function firstEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

export function envList(value?: string): string[] {
  return (value || "")
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function envFlag(key: string, fallback = false): boolean {
  const value = process.env[key];
  if (value == null || value === "") return fallback;
  return /^(1|true|yes|on)$/i.test(value);
}

export function isLocalUrl(value?: string): boolean {
  if (!value) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local");
  } catch {
    return false;
  }
}

export function currentAppUrl(): string {
  return firstEnv("NEXT_PUBLIC_APP_URL", "VANTACORE_APP_URL") || "http://localhost:3000";
}

export function isLocalRuntime(): boolean {
  return isLocalUrl(currentAppUrl()) || envFlag("VANTACORE_ALLOW_LOCAL_BYPASS", false);
}

export function fs27IntrospectionUrl(): string | undefined {
  return firstEnv(
    "FS27_INTROSPECTION_URL",
    "SKYEGATE_INTROSPECT_URL",
    "SKYGATE_INTROSPECT_URL",
    "METRAIYUX_0S_SKYGATE_FS27_INTROSPECT_ENDPOINT",
    "METRAIYUX_0S_SKYGATE_FS27_INTROSPECT_FUNCTION_ENDPOINT"
  );
}

export function fs27EventEndpoint(): string | undefined {
  return firstEnv(
    "FS27_EVENT_ENDPOINT",
    "SKYGATEFS27_EVENT_ENDPOINT",
    "METRAIYUX_0S_SKYGATE_FS27_EVENT_ENDPOINT",
    "METRAIYUX_0S_SKYGATE_BROWSER_EVENT_ENDPOINT"
  );
}

export function fs27EventSecret(): string | undefined {
  return firstEnv("FS27_EVENT_SECRET", "SKYGATEFS27_EVENT_MIRROR_SECRET", "SKYGATE_EVENT_MIRROR_SECRET");
}

export function fs27GateMode(): "enforced" | "local-bypass" {
  const configured = firstEnv("FS27_GATE_MODE", "VANTACORE_FS27_GATE_MODE");
  if (configured === "local-bypass") return "local-bypass";
  if (configured === "enforced") return "enforced";
  return process.env.NODE_ENV === "production" ? "enforced" : "local-bypass";
}

export function fs27RequiredScopes(): string[] {
  return envList(firstEnv("FS27_REQUIRED_SCOPES", "VANTACORE_FS27_REQUIRED_SCOPES") || "gateway.read");
}

export function fs27RequiredRoles(): string[] {
  return envList(firstEnv("FS27_REQUIRED_ROLES", "VANTACORE_FS27_REQUIRED_ROLES"));
}

export function healthSecret(): string | undefined {
  return firstEnv("HEALTH_CHECK_SECRET", "SKYGATEFS13_JOB_WORKER_SECRET", "PHC_SESSION_SECRET");
}

export function storageMode(): "disabled" | "auto" | "r2" | "s3" {
  const mode = firstEnv("VANTACORE_STORAGE_MODE")?.toLowerCase();
  if (mode === "auto" || mode === "r2" || mode === "s3") return mode;
  return "disabled";
}

export function paymentMode(): "disabled" | "mock" | "skypay" {
  const mode = firstEnv("VANTACORE_PAYMENT_MODE", "PAYMENT_PROVIDER")?.toLowerCase();
  if (mode === "skypay") return "skypay";
  if (mode === "mock" || mode === "local") return "mock";
  return isLocalRuntime() ? "mock" : "disabled";
}

export function messagingMode(): "disabled" | "mock" | "live" {
  const mode = firstEnv("VANTACORE_MESSAGING_MODE")?.toLowerCase();
  if (mode === "mock" || mode === "local") return "mock";
  if (mode === "live") return "live";
  return "disabled";
}

export function webhookMode(): "signed" | "local-bypass" {
  const mode = firstEnv("VANTACORE_WEBHOOK_MODE")?.toLowerCase();
  if (mode === "local-bypass") return "local-bypass";
  return process.env.NODE_ENV === "production" ? "signed" : "local-bypass";
}

export function skyPayBaseUrl(): string | undefined {
  return firstEnv(
    "SKYPAY_BASE_URL",
    "SKYPAY_PUBLIC_ORIGIN",
    "SKYGATEFS27_WORKER_ORIGIN",
    "SKYGATEFS27_WORKER_URL",
    "SKYEGATE_FS27_URL",
    "SKYEGATE_FS27_WORKER_URL",
    "SKYGATEFS27_ORIGIN"
  );
}

export function vanta13Endpoint(): string | undefined {
  return firstEnv("VANTA13_CLASSIFY_URL", "VANTA13_CLOUDFLARE_WORKER_URL");
}
