import crypto from "crypto";
import { q } from "./db.js";
import { hashOpaqueToken, randomOpaqueToken } from "./passwords.js";
import { publicProviderRuntime, runZeroOsProviderAction } from "./providerRuntime.js";

function webhookUrl() {
  return (process.env.AUTH_EMAIL_WEBHOOK_URL || "").toString().trim();
}

function resendConfig() {
  const from = (process.env.RESEND_FROM || process.env.RESEND_FROM_EMAIL || process.env.SKYEMAIL_FROM || "").toString().trim();
  return from ? { from } : null;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function baseEmail(kind, payload = {}) {
  if (kind === "verify_email") {
    return {
      subject: "Confirm your SkyeGate FS27 account",
      text: [
        "Your SkyeGate FS27 account is ready.",
        "",
        "Confirm your email here:",
        payload.verify_url
      ].join("\n"),
      html: `<p>Your SkyeGate FS27 account is ready.</p><p><a href="${esc(payload.verify_url)}">Confirm your email</a></p>`
    };
  }
  if (kind === "reset_password") {
    return {
      subject: "Reset your SkyeGate FS27 password",
      text: [
        "Use this secure link to reset your SkyeGate FS27 password.",
        "",
        payload.reset_url
      ].join("\n"),
      html: `<p>Use this secure link to reset your SkyeGate FS27 password.</p><p><a href="${esc(payload.reset_url)}">Reset password</a></p>`
    };
  }
  if (kind === "recovery_codes") {
    return {
      subject: "Your SkyeGate FS27 recovery codes",
      text: [
        "Store these one-time recovery codes somewhere safe.",
        "",
        ...(payload.recovery_codes || [])
      ].join("\n"),
      html: [
        "<p>Store these one-time recovery codes somewhere safe.</p>",
        "<ul>",
        ...(payload.recovery_codes || []).map((code) => `<li><code>${esc(code)}</code></li>`),
        "</ul>"
      ].join("")
    };
  }
  if (kind === "client_provisioned") {
    const lines = [
      "Your MetrAIyux 0S workspace account is ready.",
      "",
      `Login email: ${payload.login_email || payload.to || ""}`,
      payload.temporary_password ? `Temporary password: ${payload.temporary_password}` : null,
      payload.skyemail ? `SkyEmail: ${payload.skyemail}` : null,
      payload.force_password_reset ? "You will be required to set a new password after signing in." : null,
      "",
      `Open your dashboard: ${payload.dashboard_url || payload.login_url || ""}`
    ].filter(Boolean);
    return {
      subject: "Your MetrAIyux 0S workspace is ready",
      text: lines.join("\n"),
      html: [
        "<p>Your MetrAIyux 0S workspace account is ready.</p>",
        "<ul>",
        `<li><strong>Login email:</strong> ${esc(payload.login_email || payload.to || "")}</li>`,
        payload.temporary_password ? `<li><strong>Temporary password:</strong> <code>${esc(payload.temporary_password)}</code></li>` : "",
        payload.skyemail ? `<li><strong>SkyEmail:</strong> ${esc(payload.skyemail)}</li>` : "",
        "</ul>",
        payload.force_password_reset ? "<p>You will be required to set a new password after signing in.</p>" : "",
        `<p><a href="${esc(payload.dashboard_url || payload.login_url || "")}">Open your dashboard</a></p>`
      ].join("")
    };
  }
  if (kind === "client_app_intake") {
    const fields = [
      ["Business", payload.business_name],
      ["Service", payload.service],
      ["Company/name", payload.company],
      ["Contact", payload.contact],
      ["Email", payload.email],
      ["Phone", payload.phone],
      ["Area", payload.area],
      ["Timing", payload.timing],
      ["Details", payload.requirements],
      ["App URL", payload.page_url]
    ].filter(([, value]) => value);
    const lines = [
      `New ${payload.business_name || "client app"} intake received.`,
      "",
      ...fields.map(([label, value]) => `${label}: ${value}`),
      "",
      payload.dashboard_url ? `Open 0S dashboard: ${payload.dashboard_url}` : null
    ].filter(Boolean);
    return {
      subject: `New ${payload.business_name || "client app"} intake: ${payload.service || "request"}`,
      text: lines.join("\n"),
      html: [
        `<p>New ${esc(payload.business_name || "client app")} intake received.</p>`,
        "<ul>",
        ...fields.map(([label, value]) => `<li><strong>${esc(label)}:</strong> ${esc(value)}</li>`),
        "</ul>",
        payload.dashboard_url ? `<p><a href="${esc(payload.dashboard_url)}">Open 0S dashboard</a></p>` : ""
      ].join("")
    };
  }
  return {
    subject: "SkyeGate FS27 notification",
    text: JSON.stringify(payload, null, 2),
    html: `<pre>${esc(JSON.stringify(payload, null, 2))}</pre>`
  };
}

async function sendResendEmail(kind, payload) {
  const config = resendConfig();
  if (!config) return { delivered: false, mode: "preview" };
  const message = baseEmail(kind, payload);
  const to = Array.isArray(payload.to) ? payload.to : [payload.to];
  const runtime = await runZeroOsProviderAction({
    provider_id: "resend",
    action: "resend.email.send",
    app_id: "skygatefs27-auth",
    workspace_id: "skygatefs27",
    customer_id: to[0] || "auth-email",
    client_id: to[0] || "",
    usage_lane: `skygatefs27:auth_email:${kind}`,
    payload: {
      from: config.from,
      to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      ...(payload.reply_to ? { reply_to: payload.reply_to } : {})
    }
  });
  const receipt = runtime.receipt || null;
  return {
    delivered: runtime.ok,
    mode: "resend-provider-runtime",
    status: runtime.status,
    id: receipt?.provider_result?.id || null,
    error: runtime.ok ? null : (receipt?.error || runtime.response?.error || "Resend delivery failed"),
    provider_runtime: publicProviderRuntime(receipt)
  };
}

async function sendEmail(kind, payload) {
  const url = webhookUrl();
  if (url) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, ...payload })
    });
    if (res.ok || !resendConfig()) {
      return { delivered: res.ok, mode: "webhook", status: res.status };
    }
  }
  return await sendResendEmail(kind, payload);
}

async function createToken(tableName, user, ttlMinutes = 60) {
  const raw = randomOpaqueToken(32);
  const id = crypto.randomUUID();
  await q(
    `insert into ${tableName}(id, user_id, token_hash, email, expires_at)
     values ($1,$2,$3,$4, now() + ($5 * interval '1 minute'))`,
    [id, user.id, hashOpaqueToken(raw), user.email, parseInt(ttlMinutes, 10)]
  );
  return raw;
}

export async function createVerificationToken(user) {
  return await createToken("verification_tokens", user, 24 * 60);
}

export async function createResetToken(user) {
  return await createToken("reset_tokens", user, 60);
}

async function consumeToken(tableName, rawToken) {
  const res = await q(
    `update ${tableName}
     set used_at = coalesce(used_at, now())
     where token_hash=$1
       and used_at is null
       and expires_at > now()
     returning *`,
    [hashOpaqueToken(rawToken)]
  );
  return res.rowCount ? res.rows[0] : null;
}

export async function consumeVerificationToken(rawToken) {
  return await consumeToken("verification_tokens", rawToken);
}

export async function consumeResetToken(rawToken) {
  return await consumeToken("reset_tokens", rawToken);
}

export async function sendVerificationEmail(user, token, origin) {
  const verify_url = `${origin}/.netlify/functions/auth-verify-email?token=${encodeURIComponent(token)}`;
  return await sendEmail("verify_email", { to: user.email, verify_url, token_preview: token });
}

export async function sendResetEmail(user, token, origin) {
  const reset_url = `${origin}/.netlify/functions/auth-reset-password?token=${encodeURIComponent(token)}`;
  return await sendEmail("reset_password", { to: user.email, reset_url, token_preview: token });
}

export async function sendRecoveryCodesEmail(user, { gateId, codes = [] }) {
  return await sendEmail("recovery_codes", {
    to: user.email,
    gate_id: gateId,
    recovery_codes: codes,
    recovery_code_count: codes.length
  });
}

export async function sendProvisioningEmail(user, {
  temporaryPassword = "",
  dashboardUrl = "",
  loginUrl = "",
  forcePasswordReset = true,
  skyemail = "",
  communicationEmail = ""
} = {}) {
  return await sendEmail("client_provisioned", {
    to: user.email,
    login_email: user.email,
    communication_email: communicationEmail || user.communication_email || user.email,
    skyemail: skyemail || user.skyemail || "",
    temporary_password: temporaryPassword || "",
    dashboard_url: dashboardUrl,
    login_url: loginUrl || dashboardUrl,
    force_password_reset: !!forcePasswordReset
  });
}

export async function sendClientAppIntakeEmail(payload = {}) {
  return await sendEmail("client_app_intake", payload);
}
