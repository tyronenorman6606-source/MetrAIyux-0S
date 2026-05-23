const DEFAULT_RELAY13_ORIGIN = "https://relay13-core.graylondonskyes.workers.dev";
const AI_ADDON_OFFER_ID = "relay13-ai-response-starter";

function clean(value, max = 500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeOrigin(value) {
  return clean(value, 500).replace(/\/+$/, "");
}

function line(label, value) {
  const text = clean(value, 900);
  return text ? `${label}: ${text}` : "";
}

function relayOrigin() {
  return normalizeOrigin(
    process.env.RELAY13_ORIGIN ||
    process.env.RELAY13_WORKER_ORIGIN ||
    DEFAULT_RELAY13_ORIGIN
  );
}

function clientRelayConfig(client = {}, normalized = {}) {
  const sourceApp = clean(normalized.source_app || client.sourceApp || "", 120);
  return {
    workspace: clean(client.relay13WorkspaceSlug || sourceApp, 120),
    workspaceId: clean(client.relay13WorkspaceId || "", 120),
    accountCode: clean(client.relay13AccountCode || `${sourceApp.toUpperCase()}-SKM`, 160),
    connectlogCardId: clean(client.connectlogCardId || `${sourceApp}-client-workspace`, 160),
    apiKeyEnv: clean(client.relay13ApiKeyEnv || "", 120)
  };
}

export function buildClientAppRelay13Payload({ client, normalized, intakeId, crm }) {
  const relay = clientRelayConfig(client, normalized);
  const customerName = clean(normalized.contact || normalized.company || "Website lead", 180);
  const service = clean(normalized.service || "General inquiry", 180);
  const sourceUrl = clean(normalized.page_url || normalized.app_url || client.appUrl || "", 600);
  const body = [
    line("Client app", client.businessName),
    line("Contact", normalized.contact),
    line("Company", normalized.company),
    line("Email", normalized.email),
    line("Phone", normalized.phone),
    line("Service", service),
    line("Area", normalized.area),
    line("Timing", normalized.timing),
    line("Request", normalized.requirements),
    line("FS27 lead", crm?.lead?.id),
    line("FS27 contact", crm?.contact?.id)
  ].filter(Boolean).join("\n");

  return {
    workspace: relay.workspace,
    workspace_id: relay.workspaceId || undefined,
    channel: "client-app-intake",
    subject: `${client.businessName} app lead: ${service}`,
    customer_name: customerName,
    customer_email: clean(normalized.email, 320),
    customer_phone: clean(normalized.phone, 80),
    source_url: sourceUrl,
    external_user_id: `client-app-intake:${intakeId}`,
    body,
    connectlog_bridge: true,
    connectlog_card_id: relay.connectlogCardId,
    connectlog_card_label: `${client.businessName} client app leads`,
    connectlog_campaign: "client-app-intake",
    connectlog_owner_name: "MetrAIyux Operator",
    connectlog_owner_company: client.businessName,
    connectlog_owner_role: "Client workspace operator",
    connectlog_welcome_message: `New ${client.businessName} lead captured from the live client app. Local brain triage is active; AI-generated responses stay locked until the paid Relay13 AI add-on is active.`,
    connectlog_tags: [
      "client-app",
      "fs27",
      "relay13",
      "connectlog",
      clean(normalized.source_app, 80),
      clean(client.tenantKey, 120)
    ].filter(Boolean),
    metadata: {
      relay13_bridge_version: "client-app-intake-v1",
      source_app: normalized.source_app,
      tenant_key: client.tenantKey,
      business_name: client.businessName,
      account_code: relay.accountCode,
      intake_id: intakeId,
      lead_id: crm?.lead?.id || "",
      contact_id: crm?.contact?.id || "",
      workspace_id: normalized.workspace_id,
      app_url: normalized.app_url || client.appUrl || "",
      page_url: normalized.page_url || "",
      local_brain_mode: "enabled",
      local_brain_default_route: "draft_or_operator_review",
      ai_response_mode: "paid_addon_required",
      ai_addon_offer_id: AI_ADDON_OFFER_ID,
      ai_auto_reply_enabled: false,
      ai_usage_policy: "local_first_no_provider_call_until_stripe_addon_active"
    }
  };
}

export async function sendClientAppLeadToRelay13({ client, normalized, intakeId, crm }) {
  if (String(process.env.CLIENT_APP_RELAY13_BRIDGE_DISABLED || "").toLowerCase() === "true") {
    return { ok: true, status: "skipped", reason: "CLIENT_APP_RELAY13_BRIDGE_DISABLED" };
  }

  const origin = relayOrigin();
  if (!origin) return { ok: false, status: "failed", error: "Relay13 origin is not configured" };

  const payload = buildClientAppRelay13Payload({ client, normalized, intakeId, crm });
  const relay = clientRelayConfig(client, normalized);
  const headers = { "content-type": "application/json" };
  const apiKey = relay.apiKeyEnv ? clean(process.env[relay.apiKeyEnv] || "", 400) : "";
  if (apiKey) headers["x-relay13-api-key"] = apiKey;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(`${origin}/api/v1/conversations`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      return {
        ok: false,
        status: "failed",
        http_status: response.status,
        error: clean(data?.error || `Relay13 returned HTTP ${response.status}`, 700),
        relay13_origin: origin
      };
    }
    return {
      ok: true,
      status: "sent",
      http_status: response.status,
      relay13_origin: origin,
      workspace_id: clean(data.workspace_id, 160),
      conversation_id: clean(data.conversation_id, 180),
      connectlog_card_record_id: clean(data.connectlog_card_record_id, 180),
      bridge: clean(data.bridge, 80),
      ai_policy: data.ai_policy || null,
      guardrail: data.guardrail || null
    };
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      relay13_origin: origin,
      error: error?.name === "AbortError" ? "Relay13 bridge timed out" : clean(error?.message || "Relay13 bridge failed", 700)
    };
  } finally {
    clearTimeout(timeout);
  }
}
