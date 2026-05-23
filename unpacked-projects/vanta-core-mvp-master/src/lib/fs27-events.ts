import { firstEnv, fs27EventEndpoint, fs27EventSecret } from "@/lib/runtime-env";

type MirrorPayload = {
  tenantId?: string | null;
  actor: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  result?: string | null;
  error?: string | null;
  input?: unknown;
};

const SENSITIVE_KEY = /password|secret|token|api[_-]?key|authorization|cookie|private/i;

export async function mirrorFs27Event(payload: MirrorPayload): Promise<void> {
  const endpoint = fs27EventEndpoint();
  if (!endpoint) return;

  const body = {
    source_app: firstEnv("VANTACORE_SOURCE_APP", "METRAIYUX_0S_SKYGATE_SOURCE_APP") || "vantacore-service-crm",
    event_type: "vantacore.audit",
    occurred_at: new Date().toISOString(),
    tenant_id: payload.tenantId || null,
    actor: payload.actor,
    action: payload.action,
    entity_type: payload.entityType,
    entity_id: payload.entityId || null,
    result: payload.result || null,
    error: payload.error || null,
    input: sanitize(payload.input),
  };

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const secret = fs27EventSecret();
  if (secret) headers.authorization = `Bearer ${secret}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok && process.env.VANTACORE_REQUIRE_FS27_EVENT_MIRROR === "true") {
    throw new Error(`FS27 event mirror rejected audit event with ${response.status}`);
  }
}

function sanitize(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sanitize);

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : sanitize(entry);
  }
  return out;
}
