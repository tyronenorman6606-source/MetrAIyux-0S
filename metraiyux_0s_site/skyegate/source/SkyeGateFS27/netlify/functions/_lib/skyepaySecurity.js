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

function orderPaymentActive(status = "") {
  return ["paid", "complete", "no_payment_required", "active", "trialing"].includes(String(status || "").toLowerCase());
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

function objectOrNull(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function cleanPublicText(value, max = 220) {
  return String(value || "").trim().slice(0, max) || null;
}

function normalizePublicEmail(value) {
  const email = String(value || "").trim().toLowerCase().slice(0, 254);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function orderMetadata(row) {
  const metadata = objectOrNull(row?.metadata) || {};
  const nested = objectOrNull(metadata.metadata) || {};
  return { ...nested, ...metadata };
}

function skyemailMailboxOffer(row, metadata) {
  const offer = objectOrNull(row?.offer_snapshot) || {};
  const policy = objectOrNull(offer.gate_policy) || {};
  return Boolean(policy.skyemail_mailbox)
    || String(metadata?.skyemail_mailbox || "").toLowerCase() === "true"
    || ["skyemail-starter-mailbox", "skyemail-business-mailbox", "skyemail-operator-mailbox"].includes(String(row?.offer_id || ""));
}

function fulfillmentText(value, max = 360) {
  return cleanPublicText(value, max) || "";
}

function activationRequiresOperatorReview(offer = {}) {
  const activationPath = String(offer.activation_path || "").toLowerCase();
  return offer.owner_approval_required === true
    || activationPath.includes("owner_approved")
    || activationPath.includes("pending_owner")
    || activationPath.includes("pending_capacity")
    || activationPath.includes("triage")
    || activationPath.includes("scope");
}

function skyemailMailboxOfferFromOffer(offer = {}) {
  return Boolean(skyemailMailboxPolicyFromOffer(offer))
    || ["skyemail-starter-mailbox", "skyemail-business-mailbox", "skyemail-operator-mailbox"].includes(String(offer.id || ""));
}

function skyemailMailboxPolicyFromOffer(offer = {}) {
  const policy = objectOrNull(offer.gate_policy) || {};
  return objectOrNull(policy.skyemail_mailbox);
}

function skyemailMailboxAutoProvisionEnabled(offer = {}) {
  const policy = skyemailMailboxPolicyFromOffer(offer);
  return Boolean(policy)
    && policy.enabled_after_skyepay !== false
    && !activationRequiresOperatorReview(offer);
}

export function skyePayCustomerFulfillment(offer = {}, row = null) {
  const offerId = String(row?.offer_id || offer.id || "").trim();
  const activationPath = cleanPublicText(offer.activation_path || row?.offer?.activation_path, 160);
  const paymentStatus = String(row?.payment_status || "").toLowerCase();
  const approvalStatus = String(row?.approval_status || row?.owner_status || "").toLowerCase();
  const provisioningStatus = String(row?.provisioning_status || "").toLowerCase();
  const paymentActive = row ? orderPaymentActive(paymentStatus) : false;
  const operatorReview = activationRequiresOperatorReview(offer);
  const supportEmail = "SkyesOverLondonLC@solenterprises.org";

  let type = "operator_review";
  let activationLabel = "SkyePay records payment, then the SkyePay operator reviews and activates the order.";
  let customerNextStep = "After checkout, keep the SkyePay return page open. Your order status will show payment state, activation state, and the next action.";
  let deliverySurface = "SkyePay order status";
  let selfServeAfterPayment = false;

  if (skyemailMailboxOfferFromOffer(offer)) {
    type = "skyemail_mailbox";
    if (skyemailMailboxAutoProvisionEnabled(offer)) {
      activationLabel = "SkyePay-confirmed payment provisions the requested SkyeMail mailbox through the SkyeMail account lane.";
      customerNextStep = "Choose the mailbox address during checkout. After payment confirms, SkyePay shows the SkyeMail mailbox and readiness state.";
      deliverySurface = "SkyeMail mailbox status";
      selfServeAfterPayment = true;
    } else {
      activationLabel = "SkyePay records the paid SkyeMail mailbox request, then the SkyePay operator verifies SkyeMail capacity before mailbox activation.";
      customerNextStep = "Choose the requested mailbox address during checkout. Payment records the request; mailbox use begins only after SkyeMail capacity is confirmed and the activation state is updated.";
      deliverySurface = "SkyeMail capacity approval status";
      selfServeAfterPayment = false;
    }
  } else if (String(offer.family || "").toLowerCase() === "skyevault" || offerId.startsWith("skyevault-")) {
    type = "skyevault_agent";
    activationLabel = "SkyePay-confirmed payment unlocks the gated SkyeVault agent delivery lane tied to this order.";
    customerNextStep = "After payment confirms, return to the SkyePay status page to unlock the SkyeVault install lane and order-scoped access details.";
    deliverySurface = "SkyeVault agent install center";
    selfServeAfterPayment = true;
  } else if (String(offer.family || "").toLowerCase() === "skyecommerce" || activationPath === "skyecommerce_order_payment_confirmed") {
    type = "skyecommerce_order";
    activationLabel = "Payment confirms the merchant order and writes the SkyeCommerce receivable ledger.";
    customerNextStep = "After payment confirms, the merchant order ledger receives the paid status and the storefront can continue fulfillment.";
    deliverySurface = "SkyeCommerce order ledger";
    selfServeAfterPayment = true;
  } else if (String(offer.family || "").toLowerCase() === "sovereigndocs" || activationPath?.includes("legal_review")) {
    type = "operator_triage";
    activationLabel = "Payment creates a review packet for operator triage. It does not promise legal outcome, attorney acceptance, or partner approval.";
    customerNextStep = "After checkout, SkyePay records the packet and routes it for controlled operator triage before any partner handoff.";
    deliverySurface = "SovereignDocs review packet";
  } else if (!operatorReview) {
    type = "paid_access";
    activationLabel = "SkyePay-confirmed payment activates the paid access lane for this offer.";
    customerNextStep = "After payment confirms, SkyePay records the paid state and exposes the order-specific access or delivery lane.";
    deliverySurface = "SkyePay paid access status";
    selfServeAfterPayment = true;
  }

  let accessState = row ? "waiting_for_payment" : "pre_checkout";
  if (row) {
    if (paymentActive && (provisioningStatus.includes("failed") || approvalStatus.includes("failed"))) {
      accessState = "needs_operator_attention";
      customerNextStep = "Payment is recorded, but fulfillment needs SkyePay operator attention. Keep the order status and contact support with the order id.";
    } else if (paymentActive && (provisioningStatus.includes("unlocked") || provisioningStatus.includes("provisioned") || approvalStatus === "approved")) {
      accessState = "available_or_approved";
    } else if (paymentActive && operatorReview) {
      accessState = "paid_pending_operator_review";
      customerNextStep = "Payment is recorded. The SkyePay operator must review and activate this scoped order before customer-facing delivery continues.";
    } else if (paymentActive) {
      accessState = "paid_processing";
    }
  }

  return {
    type,
    activation_path: activationPath,
    activation_label: fulfillmentText(activationLabel),
    owner_review_required: operatorReview,
    self_serve_after_payment: selfServeAfterPayment,
    access_state: accessState,
    delivery_surface: fulfillmentText(deliverySurface, 180),
    customer_next_step: fulfillmentText(customerNextStep),
    support_email: supportEmail,
    support_note: "Use the SkyePay order id when contacting support so the paid ledger and activation record can be located."
  };
}

function safeSkyeMailMailboxForOrder(row) {
  if (!row) return null;
  const metadata = orderMetadata(row);
  const provisioning = objectOrNull(metadata.skyemail_provisioning) || {};
  const error = objectOrNull(metadata.skyemail_provisioning_error) || {};
  const mailboxEmail = normalizePublicEmail(
    provisioning.mailbox_email
      || metadata.skyemail_mailbox_email
      || metadata.mailbox_email
      || metadata.skyemail
  );
  const [emailLocal = "", emailDomain = ""] = mailboxEmail ? mailboxEmail.split("@") : [];
  const localPart = cleanPublicText(metadata.skyemail_mailbox_local_part || metadata.mailbox_local_part || emailLocal, 80);
  const domain = cleanPublicText(metadata.skyemail_mailbox_domain || metadata.mailbox_domain || emailDomain, 120);
  const isMailbox = skyemailMailboxOffer(row, metadata) || Boolean(mailboxEmail || provisioning.mailbox_id || error.message);
  if (!isMailbox) return null;
  return {
    type: "skyemail-mailbox",
    mailbox_email: mailboxEmail,
    local_part: localPart,
    domain,
    mailbox_id: cleanPublicText(provisioning.mailbox_id, 140),
    mailbox_status: cleanPublicText(provisioning.provisioning_status, 120),
    provisioning_status: cleanPublicText(row.provisioning_status, 120),
    inbox_ready: provisioning.inbox_ready === true,
    key_state_active: provisioning.key_state_active === true,
    needs_customer_mailbox_claim: provisioning.needs_customer_mailbox_claim === true || row.provisioning_status === "skyemail_mailbox_claim_required",
    claim_reason: cleanPublicText(provisioning.claim_reason, 120),
    error: error.message ? {
      message: cleanPublicText(error.message, 280),
      status: cleanPublicText(error.status, 40)
    } : null,
    provisioned_at: cleanPublicText(provisioning.provisioned_at || row.provisioned_at, 80)
  };
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
  const metadata = orderMetadata(row);
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
    fulfillment: skyePayCustomerFulfillment(offer, row),
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
    skyemail_mailbox: safeSkyeMailMailboxForOrder(row),
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
