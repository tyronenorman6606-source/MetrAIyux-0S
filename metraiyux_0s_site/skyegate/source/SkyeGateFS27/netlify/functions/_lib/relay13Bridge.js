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

function cents(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function money(value) {
  return `$${(cents(value) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
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

export function buildSkyePayRelay13Payload({
  client,
  offer,
  body = {},
  orderId = "",
  metadata = {},
  skyeMeritCheckout = null,
  checkoutUrl = "",
  sessionId = ""
}) {
  const workspace = clean(body.workspace_slug || client?.relay13WorkspaceSlug || client?.workspace_slug || client?.slug || "skyepay", 120);
  const customerName = clean(body.customer_name || metadata.customer_name || body.company_name || metadata.company_name || "SkyePay buyer", 180);
  const customerEmail = clean(body.customer_email || metadata.customer_email, 320);
  const companyName = clean(body.company_name || metadata.company_name || client?.company_name || client?.client_name, 180);
  const listedValue = cents(skyeMeritCheckout?.original_due_cents || metadata.original_amount_due_today_cents);
  const discount = cents(skyeMeritCheckout?.applied_discount_cents || metadata.skyemerit_discount_cents);
  const dueToday = cents(skyeMeritCheckout?.adjusted_due_cents || metadata.amount_due_today_cents);
  const meritCode = clean(skyeMeritCheckout?.code || skyeMeritCheckout?.requested_code || metadata.skyemerit_code, 120);
  const launchWindow = clean(offer?.launch_window_ends_on || metadata.launch_window_ends_on || "", 80);
  const channel = clean(offer?.relay13_channel || "skyepay-checkout", 120);
  const bodyText = [
    line("SkyePay offer", offer?.title || offer?.id),
    line("Client", client?.client_name || client?.slug),
    line("Company", companyName),
    line("Customer", customerName),
    line("Customer email", customerEmail),
    line("Listed value", listedValue ? money(listedValue) : ""),
    line("SkyeMerit", discount ? `${meritCode || "applied"} for ${money(discount)}` : meritCode),
    line("Due today", dueToday || discount ? money(dueToday) : ""),
    line("Launch window ends", launchWindow),
    line("Order", orderId || metadata.order_id),
    line("Stripe session", sessionId),
    line("Checkout", checkoutUrl),
    line("Activation", offer?.activation_path || metadata.activation_path)
  ].filter(Boolean).join("\n");

  return {
    workspace,
    workspace_id: clean(client?.relay13WorkspaceId || "", 120) || undefined,
    channel,
    subject: `SkyePay: ${clean(offer?.title || offer?.id || "checkout", 140)} for ${customerName}`,
    customer_name: customerName,
    customer_email: customerEmail,
    source_url: clean(checkoutUrl, 700),
    external_user_id: `skyepay:${clean(orderId || sessionId || metadata.order_id || Date.now(), 180)}`,
    body: bodyText,
    connectlog_bridge: true,
    connectlog_card_id: clean(client?.connectlogCardId || `${workspace}-skyepay-orders`, 160),
    connectlog_card_label: `${clean(client?.client_name || client?.slug || "SkyePay", 120)} SkyePay orders`,
    connectlog_campaign: "skyepay-checkout",
    connectlog_owner_name: "MetrAIyux Operator",
    connectlog_owner_company: clean(client?.company_name || client?.client_name || "MetrAIyux 0S", 160),
    connectlog_owner_role: "0S owner operator",
    connectlog_welcome_message: "SkyePay checkout created. FS27 owns paid status and owner-approved activation; Relay13 carries the inbox handoff.",
    connectlog_tags: [
      "skyepay",
      "fs27",
      "relay13",
      "skyemerit",
      clean(offer?.family, 80),
      clean(offer?.id, 140),
      clean(meritCode, 120)
    ].filter(Boolean),
    metadata: {
      relay13_bridge_version: "skyepay-order-v1",
      source_app: "skyepay",
      client_slug: client?.slug || "",
      workspace_slug: workspace,
      offer_id: offer?.id || "",
      offer_family: offer?.family || "",
      order_id: orderId || metadata.order_id || "",
      stripe_session_id: sessionId,
      checkout_url: checkoutUrl,
      skyemerit_code: meritCode,
      skyemerit_discount_cents: String(discount),
      amount_due_today_cents: String(dueToday),
      listed_value_cents: String(listedValue),
      launch_window_ends_on: launchWindow,
      skye_merit_pack_id: clean(skyeMeritCheckout?.pack_id || metadata.skyemerit_pack_id, 120),
      activation_path: offer?.activation_path || metadata.activation_path || "",
      owner_approval_required: String(offer?.owner_approval_required === true)
    }
  };
}

export async function sendSkyePayOrderToRelay13(args = {}) {
  if (String(process.env.SKYPAY_RELAY13_BRIDGE_DISABLED || "").toLowerCase() === "true") {
    return { ok: true, status: "skipped", reason: "SKYPAY_RELAY13_BRIDGE_DISABLED" };
  }

  const origin = relayOrigin();
  if (!origin) return { ok: false, status: "failed", error: "Relay13 origin is not configured" };

  const payload = buildSkyePayRelay13Payload(args);
  const headers = { "content-type": "application/json" };
  const apiKeyEnv = clean(args.client?.relay13ApiKeyEnv || "RELAY13_API_KEY", 120);
  const apiKey = clean(process.env[apiKeyEnv] || process.env.RELAY13_API_KEY || "", 400);
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
      bridge: clean(data.bridge, 80)
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
