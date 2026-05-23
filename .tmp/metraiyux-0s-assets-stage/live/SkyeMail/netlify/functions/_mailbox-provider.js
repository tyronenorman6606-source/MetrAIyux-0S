const crypto = require("crypto");
const { query } = require("./_db");
const { splitEmail, validEmail } = require("./_identity");

function clean(value) {
  return String(value || "").trim();
}

function cleanBaseUrl(value) {
  return clean(value).replace(/\/+$/, "");
}

function configuredDomains() {
  const primary = clean(process.env.SKYMAIL_PRIMARY_DOMAIN || process.env.INBOUND_DOMAIN);
  const extras = clean(process.env.SKYMAIL_ALLOWED_DOMAINS)
    .split(",")
    .map((v) => clean(v).toLowerCase())
    .filter(Boolean);
  const all = [primary.toLowerCase(), ...extras].filter(Boolean);
  return Array.from(new Set(all));
}

function validateMailboxInput(localPart, domain) {
  const local = clean(localPart).toLowerCase();
  const dom = clean(domain).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$/.test(local)) {
    const err = new Error("Mailbox local part must be 3-64 chars and use letters, numbers, dot, underscore, or hyphen.");
    err.statusCode = 400;
    throw err;
  }
  const domains = configuredDomains();
  if (!domains.length) {
    const err = new Error("SKYMAIL_PRIMARY_DOMAIN or INBOUND_DOMAIN must be configured before mailbox provisioning.");
    err.statusCode = 501;
    throw err;
  }
  if (!domains.includes(dom)) {
    const err = new Error("Requested mailbox domain is not allowed for this SkyeMail deployment.");
    err.statusCode = 400;
    throw err;
  }
  return { local, domain: dom, email: `${local}@${dom}` };
}

const ZOHO_ENV_ALIASES = {
  ZOHO_CLIENT_ID: ["Client_ID", "ZOHO_MAIL_CLIENT_ID"],
  ZOHO_CLIENT_SECRET: ["Client_Secret", "ZOHO_MAIL_CLIENT_SECRET"],
  ZOHO_REFRESH_TOKEN: ["Refresh_Token_ID", "Refresh_Token", "ZOHO_MAIL_REFRESH_TOKEN"],
  ZOHO_ORG_ID: ["Org_ID", "Organization_ID", "ZOHO_ORGANIZATION_ID", "ZOHO_ZOID"],
  ZOHO_ACCOUNT_ID: ["Account_ID", "ZOHO_MAIL_ACCOUNT_ID"],
  ZOHO_DEFAULT_FROM: ["Default_From_Email", "ZOHO_FROM_EMAIL", "ZOHO_MAIL_FROM"],
};

function envValue(key) {
  const direct = clean(process.env[key]).replace(/^['"]|['"]$/g, "");
  if (direct) return direct;
  for (const alias of ZOHO_ENV_ALIASES[key] || []) {
    const value = clean(process.env[alias]).replace(/^['"]|['"]$/g, "");
    if (value) return value;
  }
  return "";
}

function providerConfigured() {
  const provider = clean(process.env.MAILBOX_PROVIDER || process.env.HOSTED_MAILBOX_PROVIDER || "stalwart").toLowerCase();
  const stalwartReady = Boolean(process.env.STALWART_BASE_URL && process.env.STALWART_MANAGEMENT_API_KEY);
  const externalReady = Boolean(process.env.MAILBOX_PROVISION_WEBHOOK_URL && process.env.MAILBOX_PROVISION_WEBHOOK_SECRET);
  const zohoApiReady = Boolean(envValue("ZOHO_CLIENT_ID") && envValue("ZOHO_CLIENT_SECRET") && envValue("ZOHO_REFRESH_TOKEN"));
  const zohoOrgReady = Boolean(envValue("ZOHO_ORG_ID"));
  const zohoReady = Boolean(zohoApiReady && zohoOrgReady);
  let configured = stalwartReady;
  if (provider === "external-webhook") configured = externalReady;
  if (provider === "zoho") configured = zohoReady;
  return {
    provider,
    configured,
    stalwartReady,
    externalReady,
    zohoReady,
    zohoApiReady,
    zohoOrgReady
  };
}

function providerSetupMessage(provider = "stalwart") {
  if (provider === "zoho") return "Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN, or use the root env aliases Client_ID, Client_Secret, and Refresh_Token_ID. ZOHO_ORG_ID is optional when the token can read /api/organization.";
  if (provider === "external-webhook") return "Set MAILBOX_PROVISION_WEBHOOK_URL and MAILBOX_PROVISION_WEBHOOK_SECRET before live mailbox account creation.";
  return "Set STALWART_BASE_URL and STALWART_MANAGEMENT_API_KEY before live mailbox account creation.";
}

function randomMailboxPassword() {
  return crypto.randomBytes(24).toString("base64url");
}

function zohoAccountsBase() {
  return cleanBaseUrl(envValue("ZOHO_ACCOUNTS_BASE") || "https://accounts.zoho.com");
}

function zohoMailBase() {
  return cleanBaseUrl(envValue("ZOHO_MAIL_BASE") || "https://mail.zoho.com");
}

function zohoApiConfigured() {
  return Boolean(envValue("ZOHO_CLIENT_ID") && envValue("ZOHO_CLIENT_SECRET") && envValue("ZOHO_REFRESH_TOKEN"));
}

function zohoProvisioningConfigured() {
  return zohoApiConfigured();
}

async function parseZohoResponse(res) {
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const message = data?.data?.moreInfo || data?.data?.errorMessage || data?.message || data?.status?.description || data?.error || text || `Zoho request failed (${res.status}).`;
    const err = new Error(message);
    err.statusCode = res.status;
    err.providerResponse = data;
    throw err;
  }
  return data;
}

async function getZohoAccessToken() {
  if (!zohoApiConfigured()) {
    const err = new Error("Zoho API is not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN.");
    err.statusCode = 501;
    throw err;
  }
  const params = new URLSearchParams({
    refresh_token: envValue("ZOHO_REFRESH_TOKEN"),
    client_id: envValue("ZOHO_CLIENT_ID"),
    client_secret: envValue("ZOHO_CLIENT_SECRET"),
    grant_type: "refresh_token"
  });
  const data = await parseZohoResponse(await fetch(`${zohoAccountsBase()}/oauth/v2/token?${params.toString()}`, {
    method: "POST",
    headers: { "accept": "application/json" }
  }));
  if (!data?.access_token) {
    const err = new Error(data?.error || "Zoho did not return an access token.");
    err.statusCode = 502;
    err.providerResponse = data;
    throw err;
  }
  return data.access_token;
}

async function zohoFetch(path, init = {}) {
  const token = await getZohoAccessToken();
  return await parseZohoResponse(await fetch(`${zohoMailBase()}${path}`, {
    ...init,
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "authorization": `Zoho-oauthtoken ${token}`,
      ...(init.headers || {})
    }
  }));
}

function extractZohoAccountId(payload) {
  const data = payload?.data || payload;
  const candidates = [
    data?.accountId,
    data?.account_id,
    data?.zuid,
    data?.userId,
    data?.id,
    data?.account?.accountId,
    Array.isArray(data) ? data[0]?.accountId : null
  ];
  return candidates.find((value) => value != null && clean(value)) ? String(candidates.find((value) => value != null && clean(value))) : null;
}

function extractZohoOrganizationId(payload) {
  const data = payload?.data || payload;
  const candidates = [
    data?.zoid,
    data?.orgId,
    data?.organizationId,
    data?.organization_id,
    data?.id,
    Array.isArray(data) ? data[0]?.zoid : null,
    Array.isArray(data) ? data[0]?.orgId : null
  ];
  const match = candidates.find((value) => value != null && clean(value));
  return match != null ? String(match) : null;
}

function extractZohoMessageId(payload) {
  const data = payload?.data || payload;
  const candidates = [data?.messageId, data?.message_id, data?.id, payload?.messageId, payload?.id];
  return candidates.find((value) => value != null && clean(value)) ? String(candidates.find((value) => value != null && clean(value))) : null;
}

async function getZohoOrganizationId() {
  const configured = envValue("ZOHO_ORG_ID");
  if (configured) return configured;
  const payload = await zohoFetch("/api/organization");
  const orgId = extractZohoOrganizationId(payload);
  if (!orgId) {
    const err = new Error("No Zoho organization id found. Set ZOHO_ORG_ID or generate the refresh token with organization read scope.");
    err.statusCode = 502;
    err.providerResponse = payload;
    throw err;
  }
  return orgId;
}

async function getZohoMailAccountId(preferredAccountId = null) {
  if (envValue("ZOHO_ACCOUNT_ID")) return envValue("ZOHO_ACCOUNT_ID");
  if (clean(preferredAccountId) && !String(preferredAccountId).startsWith("local:")) return clean(preferredAccountId);
  const payload = await zohoFetch("/api/accounts");
  const accountId = extractZohoAccountId(payload);
  if (!accountId) {
    const err = new Error("No Zoho Mail accountId found. Set ZOHO_ACCOUNT_ID manually.");
    err.statusCode = 502;
    err.providerResponse = payload;
    throw err;
  }
  return accountId;
}

async function provisionZohoMailbox({ email, localPart, displayName }) {
  if (!zohoProvisioningConfigured()) {
    const err = new Error("Zoho provider is not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN, and ZOHO_ORG_ID.");
    err.statusCode = 501;
    throw err;
  }
  const orgId = await getZohoOrganizationId();
  const password = randomMailboxPassword();
  const safeDisplayName = clean(displayName || localPart || email);
  const nameParts = safeDisplayName.split(/\s+/).filter(Boolean);
  const data = await zohoFetch(`/api/organization/${encodeURIComponent(orgId)}/accounts`, {
    method: "POST",
    body: JSON.stringify({
      primaryEmailAddress: email,
      password,
      displayName: safeDisplayName,
      firstName: nameParts[0] || localPart,
      lastName: nameParts.slice(1).join(" ") || safeDisplayName || localPart
    })
  });
  return {
    provider: "zoho",
    provider_account_id: extractZohoAccountId(data),
    provider_payload: {
      createAccount: data,
      organization_id: orgId,
      mail_base: zohoMailBase()
    },
    credentials_issued: true,
    credential_note: "Zoho mailbox password was generated once during provisioning. Store it in your secret manager if direct Zoho/IMAP login is needed.",
    mailbox_password_once: password
  };
}

async function zohoSendMail({ accountId, fromAddress, to, subject, html, text }) {
  if (!zohoApiConfigured()) {
    const err = new Error("Zoho API is not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN.");
    err.statusCode = 501;
    throw err;
  }
  const zohoAccountId = await getZohoMailAccountId(accountId);
  const from = clean(fromAddress || envValue("ZOHO_DEFAULT_FROM"));
  if (!from) {
    const err = new Error("ZOHO_DEFAULT_FROM or a hosted mailbox sender is required for Zoho sending.");
    err.statusCode = 501;
    throw err;
  }
  const payload = await zohoFetch(`/api/accounts/${encodeURIComponent(zohoAccountId)}/messages`, {
    method: "POST",
    body: JSON.stringify({
      fromAddress: from,
      toAddress: Array.isArray(to) ? to.join(",") : String(to || ""),
      subject,
      content: html || text || "",
      mailFormat: html ? "html" : "plaintext",
      askReceipt: "no"
    })
  });
  return {
    ...payload,
    id: extractZohoMessageId(payload) || `zoho-${crypto.randomUUID()}`,
    accountId: zohoAccountId
  };
}

function zohoUiId(accountId, folderId, messageId) {
  return `zoho:${encodeURIComponent(String(accountId || ""))}:${encodeURIComponent(String(folderId || ""))}:${encodeURIComponent(String(messageId || ""))}`;
}

function parseZohoUiId(value, fallbackAccountId = null) {
  const raw = String(value || "");
  const parts = raw.split(":");
  if (parts[0] === "zoho" && parts.length >= 4) {
    return {
      accountId: decodeURIComponent(parts[1] || "") || fallbackAccountId,
      folderId: decodeURIComponent(parts[2] || ""),
      messageId: decodeURIComponent(parts.slice(3).join(":") || "")
    };
  }
  return { accountId: fallbackAccountId, folderId: "", messageId: raw };
}

function zohoDate(value) {
  const numeric = Number(value || 0);
  if (!numeric) return null;
  return new Date(numeric).toISOString();
}

function zohoFolderName(folder) {
  return clean(folder?.displayName || folder?.folderName || folder?.path || folder?.name || folder?.folderId);
}

function zohoSystemLabel(folderOrName) {
  const name = clean(typeof folderOrName === "string" ? folderOrName : zohoFolderName(folderOrName)).toLowerCase();
  if (name.includes("sent")) return "SENT";
  if (name.includes("draft")) return "DRAFT";
  if (name.includes("spam") || name.includes("junk")) return "SPAM";
  if (name.includes("trash") || name.includes("bin")) return "TRASH";
  if (name.includes("inbox")) return "INBOX";
  return clean(typeof folderOrName === "object" ? folderOrName?.folderId : folderOrName).toUpperCase() || "INBOX";
}

function zohoMessageSummary(message, { accountId, mailbox, label }) {
  const messageId = String(message?.messageId || message?.id || "");
  const folderId = message?.folderId != null ? String(message.folderId) : "";
  const systemLabel = label || zohoSystemLabel(message?.folderName || message?.folderPath || "INBOX");
  const status = clean(message?.status).toLowerCase();
  const unread = status.includes("unread") || status === "0";
  const labels = [systemLabel, unread ? "UNREAD" : null].filter(Boolean);
  const internalDate = zohoDate(message?.receivedtime || message?.sentDateInGMT || message?.sentDate || message?.date);
  return {
    id: zohoUiId(accountId, folderId, messageId),
    thread_id: zohoUiId(accountId, folderId, messageId),
    subject: message?.subject || "(no subject)",
    from: message?.sender || message?.fromAddress || "",
    to: message?.toAddress || mailbox || "",
    snippet: message?.summary || "",
    labels,
    unread,
    starred: false,
    important: false,
    has_attachments: Number(message?.hasAttachment || 0) > 0,
    internal_date: internalDate,
    date: internalDate,
    direction: systemLabel === "SENT" ? "outbound" : "inbound",
    delivery_provider: "zoho",
    provider_message_id: messageId
  };
}

async function zohoListFolders(accountId = null) {
  const zohoAccountId = await getZohoMailAccountId(accountId);
  const payload = await zohoFetch(`/api/accounts/${encodeURIComponent(zohoAccountId)}/folders`);
  const folders = Array.isArray(payload?.data) ? payload.data : [];
  return {
    accountId: zohoAccountId,
    items: folders.map((folder) => {
      const id = zohoSystemLabel(folder);
      return {
        id,
        provider_folder_id: folder?.folderId != null ? String(folder.folderId) : id,
        name: zohoFolderName(folder) || id,
        type: ["INBOX", "SENT", "DRAFT", "SPAM", "TRASH"].includes(id) ? "system" : "user",
        messagesTotal: Number(folder?.count || folder?.messagesTotal || 0),
        messagesUnread: Number(folder?.unreadCount || folder?.messagesUnread || 0),
        threadsTotal: Number(folder?.count || folder?.messagesTotal || 0),
        threadsUnread: Number(folder?.unreadCount || folder?.messagesUnread || 0),
        labelListVisibility: null,
        messageListVisibility: null,
        color: null
      };
    })
  };
}

async function zohoFolderIdForLabel(accountId, label) {
  const requested = clean(label).toUpperCase();
  if (!requested) return "";
  const folders = await zohoListFolders(accountId);
  const found = folders.items.find((folder) => folder.id === requested);
  return found?.provider_folder_id || "";
}

async function zohoListMessages({ accountId = null, mailbox = "", label = "", max = 25, pageToken = "", q = "" } = {}) {
  const zohoAccountId = await getZohoMailAccountId(accountId);
  const limit = Math.min(Math.max(Number(max || 25), 1), 100);
  const start = Math.max(Number(pageToken || 1), 1);
  const requestedLabel = clean(label).toUpperCase();
  const folderId = q ? "" : await zohoFolderIdForLabel(zohoAccountId, requestedLabel);
  const params = new URLSearchParams({
    start: String(start),
    limit: String(limit),
    includeto: "true"
  });
  if (q) {
    params.set("searchKey", q);
  } else {
    params.set("status", "all");
    params.set("sortBy", "date");
    params.set("sortorder", "false");
    params.set("includesent", "true");
    if (folderId) params.set("folderId", folderId);
  }
  const path = q
    ? `/api/accounts/${encodeURIComponent(zohoAccountId)}/messages/search?${params.toString()}`
    : `/api/accounts/${encodeURIComponent(zohoAccountId)}/messages/view?${params.toString()}`;
  const payload = await zohoFetch(path);
  const messages = Array.isArray(payload?.data) ? payload.data : [];
  return {
    ok: true,
    mailbox: mailbox || envValue("ZOHO_DEFAULT_FROM") || zohoAccountId,
    nextPageToken: messages.length >= limit ? String(start + limit) : null,
    resultSizeEstimate: Number(payload?.resultSizeEstimate || messages.length),
    items: messages.map((message) => zohoMessageSummary(message, { accountId: zohoAccountId, mailbox, label: requestedLabel || "" }))
  };
}

function stripHtml(value) {
  return String(value || "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function zohoGetMessage({ id, accountId = null, mailbox = "" }) {
  const fallbackAccountId = await getZohoMailAccountId(accountId);
  const parsed = parseZohoUiId(id, fallbackAccountId);
  if (!parsed.messageId) {
    const err = new Error("Zoho message id required.");
    err.statusCode = 400;
    throw err;
  }
  if (!parsed.folderId) {
    const err = new Error("Zoho message folder id missing. Open the message from a Zoho-backed list result.");
    err.statusCode = 400;
    throw err;
  }
  const payload = await zohoFetch(`/api/accounts/${encodeURIComponent(parsed.accountId)}/folders/${encodeURIComponent(parsed.folderId)}/messages/${encodeURIComponent(parsed.messageId)}/content`);
  const data = payload?.data || payload || {};
  const html = data?.content || data?.html || data?.body || "";
  const text = data?.text || data?.summary || stripHtml(html);
  return {
    ok: true,
    mailbox: mailbox || envValue("ZOHO_DEFAULT_FROM") || parsed.accountId,
    message: {
      id: zohoUiId(parsed.accountId, parsed.folderId, parsed.messageId),
      thread_id: zohoUiId(parsed.accountId, parsed.folderId, parsed.messageId),
      snippet: data?.summary || text.slice(0, 240),
      labels: [zohoSystemLabel(data?.folderName || "INBOX")],
      unread: false,
      starred: false,
      important: false,
      internal_date: zohoDate(data?.receivedtime || data?.sentDateInGMT || data?.sentDate || data?.date),
      headers: {
        from: data?.sender || data?.fromAddress || "",
        to: data?.toAddress || mailbox || "",
        cc: data?.ccAddress || "",
        subject: data?.subject || "(no subject)",
        date: data?.receivedDate || data?.sentDate || "",
        message_id: String(data?.messageId || parsed.messageId),
        references: data?.references || "",
        in_reply_to: data?.inReplyTo || ""
      },
      body: { text, html },
      attachments: []
    }
  };
}

function authHeaders() {
  const scheme = clean(process.env.STALWART_MANAGEMENT_AUTH_SCHEME || "Bearer");
  const key = clean(process.env.STALWART_MANAGEMENT_API_KEY);
  return {
    "content-type": "application/json",
    "accept": "application/json",
    "authorization": `${scheme} ${key}`
  };
}

async function postJson(url, body, headers = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "accept": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(data?.detail || data?.error || data?.message || text || `Provider request failed (${res.status}).`);
    err.statusCode = res.status;
    err.providerResponse = data;
    throw err;
  }
  return data;
}

async function provisionStalwartMailbox({ email, localPart, displayName }) {
  const base = cleanBaseUrl(process.env.STALWART_BASE_URL);
  if (!base || !process.env.STALWART_MANAGEMENT_API_KEY) {
    const err = new Error("Stalwart provider is not configured. Set STALWART_BASE_URL and STALWART_MANAGEMENT_API_KEY.");
    err.statusCode = 501;
    throw err;
  }
  const password = randomMailboxPassword();
  const body = {
    type: "individual",
    quota: Number(process.env.SKYMAIL_MAILBOX_QUOTA || 0),
    name: localPart,
    description: displayName || `SkyeMail mailbox ${email}`,
    secrets: [password],
    emails: [email],
    urls: [],
    memberOf: [],
    roles: ["user"],
    lists: [],
    members: [],
    enabledPermissions: [],
    disabledPermissions: [],
    externalMembers: []
  };

  const candidates = base.endsWith("/api")
    ? [`${base}/principal`]
    : [`${base}/api/principal`, `${base}/principal`];
  let lastErr = null;
  for (const url of candidates) {
    try {
      const data = await postJson(url, body, authHeaders());
      return {
        provider: "stalwart",
        provider_account_id: data?.data != null ? String(data.data) : null,
        provider_payload: { createPrincipal: data, management_url: url },
        credentials_issued: true,
        credential_note: "Provider password was generated once during provisioning. Store it in your secret manager if client IMAP/JMAP login is needed.",
        mailbox_password_once: password
      };
    } catch (err) {
      lastErr = err;
      if (![404, 405].includes(Number(err.statusCode || 0))) throw err;
    }
  }
  throw lastErr || new Error("Stalwart principal endpoint was not found.");
}

async function provisionExternalWebhook({ email, localPart, domain, user, claims }) {
  const url = clean(process.env.MAILBOX_PROVISION_WEBHOOK_URL);
  const secret = clean(process.env.MAILBOX_PROVISION_WEBHOOK_SECRET);
  if (!url || !secret) {
    const err = new Error("External mailbox provisioning webhook is not configured.");
    err.statusCode = 501;
    throw err;
  }
  const data = await postJson(url, {
    platform: "SkyeMail",
    email,
    local_part: localPart,
    domain,
    user: { id: user.id, handle: user.handle, email: user.email },
    fs27: claims || null
  }, { "x-skymail-provision-secret": secret });
  return {
    provider: "external-webhook",
    provider_account_id: data?.provider_account_id || data?.id || null,
    provider_payload: data,
    credentials_issued: Boolean(data?.credentials_issued),
    credential_note: data?.credential_note || null,
    mailbox_password_once: data?.mailbox_password_once || null
  };
}

async function provisionHostedMailbox({ email, localPart, domain, user, claims }) {
  const cfg = providerConfigured();
  if (!cfg.configured) {
    const err = new Error("Hosted mailbox provider is not configured.");
    err.statusCode = 501;
    throw err;
  }
  if (cfg.provider === "external-webhook") {
    return await provisionExternalWebhook({ email, localPart, domain, user, claims });
  }
  if (cfg.provider === "zoho") {
    return await provisionZohoMailbox({ email, localPart, displayName: user?.handle || email });
  }
  return await provisionStalwartMailbox({ email, localPart, displayName: user?.handle || email });
}

async function getHostedMailbox(userId) {
  const res = await query(
    `select id, user_id, mailbox_email, local_part, domain, provider, provider_account_id,
            status, provisioning_status, imap_host, smtp_host, jmap_url,
            created_at, updated_at, provisioned_at, last_error
       from hosted_mailboxes
      where user_id=$1
      order by created_at desc
      limit 1`,
    [userId]
  );
  return res.rows[0] || null;
}

async function saveHostedMailbox({ userId, localPart, domain, email, provisioned }) {
  const providerPayload = JSON.stringify(provisioned.provider_payload || {});
  const res = await query(
    `insert into hosted_mailboxes(
       user_id, mailbox_email, local_part, domain, provider, provider_account_id,
       workspace_id, skymail_id, fs27_gate_card_id,
       status, provisioning_status, provider_payload_json, imap_host, smtp_host, jmap_url,
       provisioned_at, updated_at
     )
     values($1,$2,$3,$4,$5,$6,$7,$8,$9,'active','provisioned',$10::jsonb,$11,$12,$13,now(),now())
     on conflict (mailbox_email)
     do update set
       provider=excluded.provider,
       provider_account_id=excluded.provider_account_id,
       workspace_id=coalesce(excluded.workspace_id, hosted_mailboxes.workspace_id),
       skymail_id=coalesce(excluded.skymail_id, hosted_mailboxes.skymail_id),
       fs27_gate_card_id=coalesce(excluded.fs27_gate_card_id, hosted_mailboxes.fs27_gate_card_id),
       status='active',
       provisioning_status='provisioned',
       provider_payload_json=excluded.provider_payload_json,
       imap_host=excluded.imap_host,
       smtp_host=excluded.smtp_host,
       jmap_url=excluded.jmap_url,
       provisioned_at=coalesce(hosted_mailboxes.provisioned_at, now()),
       updated_at=now(),
       last_error=null
     where hosted_mailboxes.user_id=excluded.user_id
     returning *`,
    [
      userId,
      email,
      localPart,
      domain,
      provisioned.provider,
      provisioned.provider_account_id,
      provisioned.workspace_id || null,
      provisioned.skymail_id || null,
      provisioned.fs27_gate_card_id || null,
      providerPayload,
      process.env.SKYMAIL_IMAP_HOST || null,
      process.env.SKYMAIL_SMTP_HOST || null,
      process.env.SKYMAIL_JMAP_URL || null,
    ]
  );
  if (!res.rows[0]) {
    const err = new Error("Mailbox email already belongs to another SkyeMail workspace.");
    err.statusCode = 409;
    throw err;
  }
  return res.rows[0];
}

function validateAliasInput(aliasEmail) {
  const parsed = splitEmail(aliasEmail);
  if (!parsed || !validEmail(parsed.email)) {
    const err = new Error("Valid alias email required.");
    err.statusCode = 400;
    throw err;
  }
  return parsed;
}

async function saveMailboxAlias({
  userId,
  mailboxId,
  aliasEmail,
  aliasType = "custom",
  displayName = null,
  providerAliasId = null,
  providerPayload = null
}) {
  const parsed = validateAliasInput(aliasEmail);
  const res = await query(
    `insert into mailbox_aliases(
       user_id, mailbox_id, alias_email, local_part, domain, alias_type, display_name,
       provider_alias_id, provider_payload_json, created_at, updated_at
     )
     values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,now(),now())
     on conflict (alias_email)
     do update set
       display_name=coalesce(excluded.display_name, mailbox_aliases.display_name),
       status='active',
       updated_at=now()
     where mailbox_aliases.user_id=excluded.user_id
       and mailbox_aliases.mailbox_id=excluded.mailbox_id
     returning *`,
    [
      userId,
      mailboxId,
      parsed.email,
      parsed.local,
      parsed.domain,
      aliasType || "custom",
      displayName || null,
      providerAliasId || null,
      JSON.stringify(providerPayload || {})
    ]
  );
  if (!res.rows[0]) {
    const err = new Error("Alias email already belongs to another SkyeMail mailbox.");
    err.statusCode = 409;
    throw err;
  }
  return res.rows[0];
}

async function listMailboxAliases(userId, mailboxId = null) {
  const params = [userId];
  let clause = "where ma.user_id=$1";
  if (mailboxId) {
    params.push(mailboxId);
    clause += " and ma.mailbox_id=$2";
  }
  const res = await query(
    `select ma.*, hm.mailbox_email
       from mailbox_aliases ma
       join hosted_mailboxes hm on hm.id=ma.mailbox_id
      ${clause}
      order by ma.alias_type='primary' desc, ma.created_at asc`,
    params
  );
  return res.rows;
}

async function findMailboxByAddress(address) {
  const parsed = splitEmail(address);
  if (!parsed) return null;
  const aliasRes = await query(
    `select ma.alias_email, ma.alias_type, hm.*, u.handle, uk.version, uk.rsa_public_key_pem
       from mailbox_aliases ma
       join hosted_mailboxes hm on hm.id=ma.mailbox_id
       join users u on u.id=ma.user_id
       join user_keys uk on uk.user_id=u.id and uk.is_active=true
      where lower(ma.alias_email)=lower($1)
        and ma.status='active'
      limit 1`,
    [parsed.email]
  );
  if (aliasRes.rows[0]) return aliasRes.rows[0];

  const mailboxRes = await query(
    `select hm.mailbox_email as alias_email, 'primary' as alias_type, hm.*, u.handle, uk.version, uk.rsa_public_key_pem
       from hosted_mailboxes hm
       join users u on u.id=hm.user_id
       join user_keys uk on uk.user_id=u.id and uk.is_active=true
      where lower(hm.mailbox_email)=lower($1)
        and hm.status='active'
      limit 1`,
    [parsed.email]
  );
  return mailboxRes.rows[0] || null;
}

module.exports = {
  configuredDomains,
  providerConfigured,
  providerSetupMessage,
  validateMailboxInput,
  validateAliasInput,
  provisionHostedMailbox,
  zohoApiConfigured,
  zohoSendMail,
  zohoListFolders,
  zohoListMessages,
  zohoGetMessage,
  getHostedMailbox,
  saveHostedMailbox,
  saveMailboxAlias,
  listMailboxAliases,
  findMailboxByAddress
};
