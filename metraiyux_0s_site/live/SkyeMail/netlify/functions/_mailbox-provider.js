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

function providerConfigured() {
  const provider = clean(process.env.MAILBOX_PROVIDER || process.env.HOSTED_MAILBOX_PROVIDER || "stalwart").toLowerCase();
  const stalwartReady = Boolean(process.env.STALWART_BASE_URL && process.env.STALWART_MANAGEMENT_API_KEY);
  const externalReady = Boolean(process.env.MAILBOX_PROVISION_WEBHOOK_URL && process.env.MAILBOX_PROVISION_WEBHOOK_SECRET);
  return {
    provider,
    configured: provider === "external-webhook" ? externalReady : stalwartReady,
    stalwartReady,
    externalReady
  };
}

function randomMailboxPassword() {
  return crypto.randomBytes(24).toString("base64url");
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
  validateMailboxInput,
  validateAliasInput,
  provisionHostedMailbox,
  getHostedMailbox,
  saveHostedMailbox,
  saveMailboxAlias,
  listMailboxAliases,
  findMailboxByAddress
};
