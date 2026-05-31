import { buildCors } from "./http.js";

const TOKEN_RE = /[^a-zA-Z0-9:_-]/g;

export function skyePayHeaders(req, extra = {}) {
  const cors = buildCors(req);
  const requestOrigin = normalizeOrigin(req.headers.get("origin") || req.headers.get("Origin"));
  const allowed = skyePayAllowedOrigins(req);
  if (requestOrigin && allowed.has(requestOrigin)) {
    cors["access-control-allow-origin"] = requestOrigin;
    cors.vary = "Origin";
  } else {
    delete cors["access-control-allow-origin"];
  }

  return {
    ...cors,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    ...extra
  };
}

export function normalizeOrigin(value) {
  if (!value) return "";
  try {
    const url = new URL(String(value).trim());
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
}

export function cleanRequestToken(value, max = 180) {
  return String(value || "").trim().replace(TOKEN_RE, "").slice(0, max);
}

function skyePayAllowedOrigins(req) {
  const requestUrl = new URL(req.url);
  const selfOrigin = `${requestUrl.protocol}//${requestUrl.host}`;
  const allowed = new Set([
    selfOrigin,
    "https://metraiyux-0s-full-system.graylondonskyes.workers.dev"
  ]);
  const explicit = normalizeOrigin(process.env.SKYPAY_PUBLIC_ORIGIN);
  if (explicit) allowed.add(explicit);

  for (const raw of [
    process.env.SKYPAY_ALLOWED_ORIGINS || "",
    process.env.SKYPAY_ALLOWED_RETURN_ORIGINS || "",
    process.env.METRAIYUX_0S_RETURN_ORIGIN || "",
    process.env.ALLOWED_ORIGINS || "",
    process.env.SKYPAY_TRUST_PUBLIC_APP_ORIGIN === "true" ? process.env.PUBLIC_APP_ORIGIN || "" : ""
  ]) {
    for (const item of String(raw).split(",")) {
      const origin = normalizeOrigin(item);
      if (origin) allowed.add(origin);
    }
  }
  return allowed;
}

export function resolveSkyePayReturnOrigin(req) {
  const explicit = normalizeOrigin(process.env.SKYPAY_PUBLIC_ORIGIN);
  if (explicit) return explicit;

  const requestUrl = new URL(req.url);
  const selfOrigin = `${requestUrl.protocol}//${requestUrl.host}`;
  const allowed = skyePayAllowedOrigins(req);

  const requestOrigin = normalizeOrigin(req.headers.get("origin") || req.headers.get("Origin"));
  if (requestOrigin && allowed.has(requestOrigin)) return requestOrigin;
  return selfOrigin;
}

export function resolveSkyePayReturnUrl(req, value, fallback) {
  const candidate = String(value || "").trim();
  if (!candidate) return fallback;
  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol)) return fallback;
    if (!skyePayAllowedOrigins(req).has(`${url.protocol}//${url.host}`)) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

export function maskEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  const [name, domain] = email.split("@");
  if (!name || !domain) return null;
  const visible = name.length <= 2 ? `${name[0] || ""}*` : `${name.slice(0, 2)}***`;
  return `${visible}@${domain}`;
}

function skyeVaultAgentStatusActive(status = "") {
  return ["paid", "complete", "no_payment_required", "active", "trialing"].includes(String(status || "").toLowerCase());
}

function skyeVaultAgentProvisioningActive(status = "") {
  return ["workspace_unlocked", "auto_unlock_pending", "ready_to_unlock"].includes(String(status || "").toLowerCase());
}

function safeRepoEnv(repoEnv = {}) {
  const allowed = [
    "SKYEVAULT_DROP_URL",
    "SKYEVAULT_PORTAL_KEY",
    "SKYEVAULT_WORKSPACE_ID",
    "SKYEVAULT_DEVELOPER_ID",
    "SKYEVAULT_DEVELOPER_NAME",
    "SKYEVAULT_DESTINATION_ID"
  ];
  const out = {};
  for (const key of allowed) {
    const value = String(repoEnv?.[key] || "").trim();
    if (value) out[key] = value;
  }
  return out;
}

export function skyeVaultAgentDeliveryForOrder(row, { includeSecrets = false } = {}) {
  if (!row) return null;
  const offer = row.offer_snapshot && typeof row.offer_snapshot === "object" ? row.offer_snapshot : {};
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const vault = metadata.vault_provisioning && typeof metadata.vault_provisioning === "object"
    ? metadata.vault_provisioning
    : {};
  const isVault = offer.family === "skyevault" || String(row.offer_id || "").startsWith("skyevault-");
  if (!isVault) return null;
  const paymentActive = skyeVaultAgentStatusActive(row.payment_status);
  const provisioningActive = skyeVaultAgentProvisioningActive(row.provisioning_status);
  const repoEnv = safeRepoEnv(vault.repoEnv || vault.repo_env || {});
  return {
    type: "skyevault-agent",
    unlocked: paymentActive && provisioningActive,
    workspace_id: vault.workspaceId || vault.workspace_id || row.workspace_slug || null,
    key_created: vault.keyCreated === true || vault.key_created === true,
    portal_key_available: Boolean(repoEnv.SKYEVAULT_PORTAL_KEY),
    install_center: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/skye-vault-os/agent/",
    package_manifest: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/downloads/skyevault-agent/latest.json",
    agent_package: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/downloads/skyevault-agent/releases/latest/skyevault-agent-latest.tar.gz",
    ...(includeSecrets && paymentActive && provisioningActive && repoEnv.SKYEVAULT_PORTAL_KEY ? { repo_env: repoEnv } : {})
  };
}

export function publicSkyePayOrder(row, options = {}) {
  if (!row) return null;
  const offer = row.offer_snapshot && typeof row.offer_snapshot === "object" ? row.offer_snapshot : {};
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const skyemerit = metadata.skyemerit_code ? {
    applied: String(metadata.skyemerit_applied || "").toLowerCase() === "true",
    code: metadata.skyemerit_code || null,
    pack_id: metadata.skyemerit_pack_id || null,
    title: metadata.skyemerit_title || null,
    eligible_cents: Number(metadata.skyemerit_eligible_cents || 0),
    discount_cents: Number(metadata.skyemerit_discount_cents || 0),
    adjusted_due_cents: Number(metadata.skyemerit_adjusted_due_cents || 0),
    kaixu_credit_cents: Number(metadata.skyemerit_kaixu_credit_cents || 0),
    gate_required: String(metadata.skyemerit_gate_required || "").toLowerCase() === "true"
  } : null;
  return {
    id: row.id,
    client_slug: row.client_slug,
    workspace_slug: row.workspace_slug,
    offer_id: row.offer_id,
    offer: {
      title: offer.title || row.offer_id,
      plan_name: offer.plan_name || null,
      setup_cents: row.amount_setup_cents,
      recurring_cents: row.amount_recurring_cents,
      currency: row.currency || offer.currency || "usd",
      activation_path: offer.activation_path || null
    },
    checkout_mode: row.checkout_mode,
    payment_status: row.payment_status,
    approval_status: row.approval_status,
    owner_status: row.owner_status,
    provisioning_status: row.provisioning_status,
    skyemerit,
    customer_hint: maskEmail(row.customer_email),
    paid_at: row.paid_at,
    approved_at: row.approved_at,
    provisioned_at: row.provisioned_at,
    agent_delivery: skyeVaultAgentDeliveryForOrder(row, { includeSecrets: options.includeVaultAgentSecrets === true }),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export function canApproveSkyePayOrder(order) {
  const approval = String(order?.approval_status || "").toLowerCase();
  if (["void", "refunded", "expired"].includes(approval)) return false;
  const payment = String(order?.payment_status || "").toLowerCase();
  return ["paid", "complete", "no_payment_required"].includes(payment);
}
