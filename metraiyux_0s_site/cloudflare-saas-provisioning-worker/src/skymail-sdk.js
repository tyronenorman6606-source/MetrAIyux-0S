const DEFAULT_SKYMAIL_URL = "https://skymail-platform.graylondonskyes.workers.dev";

function clean(value) {
  return String(value || "").trim();
}

function normalizeOrigin(value) {
  return clean(value || DEFAULT_SKYMAIL_URL).replace(/\/+$/, "");
}

function localPart(value) {
  const base = clean(value).toLowerCase();
  return base
    .replace(/@.*$/, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function skymailConfigured(env) {
  return Boolean(clean(env.SKYMAIL_SERVICE_TOKEN || env.SKYE_MAIL_SERVICE_TOKEN));
}

export function createSkyeMailClient(env) {
  const baseUrl = normalizeOrigin(env.SKYMAIL_API_URL || env.SKYMAIL_PUBLIC_URL);
  const token = clean(env.SKYMAIL_SERVICE_TOKEN || env.SKYE_MAIL_SERVICE_TOKEN);

  async function request(path, payload) {
    if (!token) {
      return {
        ok: false,
        skipped: true,
        status: 501,
        error: "SKYMAIL_SERVICE_TOKEN is not configured on the 0S SaaS worker.",
      };
    }
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload || {}),
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    return {
      ok: res.ok && data?.ok !== false,
      status: res.status,
      data,
      error: res.ok ? null : (data?.error || text || `SkyeMail request failed (${res.status}).`),
    };
  }

  async function provisionWorkspaceMailbox(workspace, owner = {}) {
    const ownerEmail = clean(owner.email || workspace.approval_email || workspace.owner_email || workspace.email);
    const domain = clean(env.SKYMAIL_PRIMARY_DOMAIN || env.INBOUND_DOMAIN);
    const mailboxLocal = localPart(workspace.slug || workspace.company_name || ownerEmail);
    const payload = {
      workspace_id: workspace.id,
      customer_id: workspace.customer_id,
      company_name: workspace.company_name,
      workspace_slug: workspace.slug,
      plan_id: workspace.plan_id,
      owner_email: ownerEmail,
      owner_name: owner.full_name || owner.name || "",
      local_part: mailboxLocal,
      domain: domain || undefined,
      source_app: "metraiyux-0s",
    };
    const result = await request("/.netlify/functions/workspace-provision", payload);
    return {
      ...result,
      requested_local_part: mailboxLocal,
      requested_domain: domain || null,
      skymail_url: baseUrl,
    };
  }

  return { baseUrl, configured: Boolean(token), provisionWorkspaceMailbox };
}
