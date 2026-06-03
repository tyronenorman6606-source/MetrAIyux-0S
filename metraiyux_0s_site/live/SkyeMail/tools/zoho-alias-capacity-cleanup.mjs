#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skymailRoot = path.resolve(__dirname, "..");

function findRepoRoot(start) {
  let current = start;
  while (current && current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, ".git"))) return current;
    current = path.dirname(current);
  }
  return path.resolve(start, "../../..");
}

const repoRoot = findRepoRoot(skymailRoot);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(repoRoot, "test-artifacts", "skyemail-zoho-alias-capacity", stamp);
const receiptPath = path.join(outDir, "receipt.json");
fs.mkdirSync(outDir, { recursive: true });

const aliases = {
  ZOHO_CLIENT_ID: ["Client_ID", "ZOHO_MAIL_CLIENT_ID"],
  ZOHO_CLIENT_SECRET: ["Client_Secret", "ZOHO_MAIL_CLIENT_SECRET"],
  ZOHO_REFRESH_TOKEN: ["Refresh_Token_ID", "Refresh_Token_ID2", "Refresh_Token", "ZOHO_MAIL_REFRESH_TOKEN"],
  ZOHO_ORG_ID: ["Org_ID", "Organization_ID", "ZOHO_ORGANIZATION_ID", "ZOHO_ZOID"],
  ZOHO_ACCOUNT_ID: ["Account_ID", "Zoho_User_ID", "ZOHO_MAIL_ACCOUNT_ID"],
  ZOHO_ORG_USER_ID: ["ZOHO_ZUID", "ZOHO_MAIL_ZUID", "ZOHO_USER_ZUID"],
  ZOHO_DEFAULT_FROM: ["Default_From_Email", "ZOHO_FROM_EMAIL", "ZOHO_MAIL_FROM"],
};

const datacenters = [
  { id: "us", accountsBase: "https://accounts.zoho.com", mailBase: "https://mail.zoho.com" },
  { id: "eu", accountsBase: "https://accounts.zoho.eu", mailBase: "https://mail.zoho.eu" },
  { id: "in", accountsBase: "https://accounts.zoho.in", mailBase: "https://mail.zoho.in" },
  { id: "au", accountsBase: "https://accounts.zoho.com.au", mailBase: "https://mail.zoho.com.au" },
  { id: "jp", accountsBase: "https://accounts.zoho.jp", mailBase: "https://mail.zoho.jp" },
  { id: "ca", accountsBase: "https://accounts.zohocloud.ca", mailBase: "https://mail.zohocloud.ca" },
];

const generatedAliasPatterns = [
  /^grayscape467-mp[a-z0-9]{6,}@solenterprises\.org$/i,
];
const falseSuccessDbPatterns = [
  "^grayscape467-mp[a-z0-9]{6,}@solenterprises\\.org$",
  "^graylondonskyes-grayscap-[0-9]+@solenterprises\\.org$",
];

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const repairDb = args.has("--repair-db");
const maxAliases = Number(process.argv.find((arg) => arg.startsWith("--max="))?.split("=")[1] || 30);
const runMode = apply ? "apply" : (repairDb ? "provider-dry-run-db-repair" : "dry-run");

function parseEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim().replace(/^export\s+/, "");
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(index + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");
    if (value && !value.includes("...") && !value.includes("${")) out[key] = value;
  }
  return out;
}

function normalizeEnv(env) {
  const next = { ...env };
  for (const [canonical, names] of Object.entries(aliases)) {
    if (next[canonical]) continue;
    const match = names.find((name) => next[name]);
    if (match) next[canonical] = next[match];
  }
  return next;
}

function cleanBase(value, fallback) {
  const text = String(value || fallback || "").trim().replace(/\/+$/, "");
  return text || fallback;
}

function extractEmailStrings(value, found = new Set()) {
  if (typeof value === "string") {
    for (const match of value.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) {
      found.add(match[0].toLowerCase());
    }
  } else if (Array.isArray(value)) {
    value.forEach((item) => extractEmailStrings(item, found));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => extractEmailStrings(item, found));
  }
  return found;
}

function matchesGeneratedProofAlias(email) {
  return generatedAliasPatterns.some((pattern) => pattern.test(email));
}

function entries(payload) {
  const data = payload?.data || payload;
  return Array.isArray(data) ? data : (data ? [data] : []);
}

function entryZuid(entry, env) {
  return String(env.ZOHO_ORG_USER_ID || entry?.zuid || entry?.userId || entry?.id || "").trim();
}

function chunk(items, size) {
  const batches = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

async function readJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw_status_only: Boolean(text) };
  }
}

function publicError(data) {
  if (!data || typeof data !== "object") return {};
  return {
    error: typeof data.error === "string" ? data.error : undefined,
    description: typeof data.error_description === "string" ? data.error_description : data?.status?.description,
    statusCode: data?.status?.code,
    moreInfo: typeof data?.data?.moreInfo === "string" ? data.data.moreInfo : undefined,
  };
}

async function getZohoSession(env) {
  const configuredAccountsBase = cleanBase(env.ZOHO_ACCOUNTS_BASE, "");
  const configuredMailBase = cleanBase(env.ZOHO_MAIL_BASE, "");
  const candidates = configuredAccountsBase
    ? [{ id: "configured", accountsBase: configuredAccountsBase, mailBase: configuredMailBase || "https://mail.zoho.com" }]
    : datacenters;
  const missing = ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_REFRESH_TOKEN"].filter((key) => !env[key]);
  if (missing.length) throw new Error(`Missing Zoho credential keys: ${missing.join(", ")}`);
  let lastError = null;
  for (const candidate of candidates) {
    const tokenParams = new URLSearchParams({
      refresh_token: env.ZOHO_REFRESH_TOKEN,
      client_id: env.ZOHO_CLIENT_ID,
      client_secret: env.ZOHO_CLIENT_SECRET,
      grant_type: "refresh_token",
    });
    const tokenRes = await fetch(`${candidate.accountsBase}/oauth/v2/token?${tokenParams.toString()}`, {
      method: "POST",
      headers: { accept: "application/json" },
    });
    const data = await readJson(tokenRes);
    if (tokenRes.ok && data?.access_token) {
      return { ...candidate, accessToken: data.access_token, apiDomain: data.api_domain || "" };
    }
    lastError = publicError(data);
  }
  throw Object.assign(new Error("Zoho token refresh failed."), { publicError: lastError });
}

async function zohoFetch(session, pathName, init = {}) {
  const res = await fetch(`${session.mailBase}${pathName}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Zoho-oauthtoken ${session.accessToken}`,
      ...(init.headers || {}),
    },
  });
  const data = await readJson(res);
  if (!res.ok) throw Object.assign(new Error(data?.data?.moreInfo || data?.status?.description || `Zoho request failed (${res.status}).`), {
    statusCode: res.status,
    publicError: publicError(data),
  });
  return data;
}

async function resolveOrgId(env, session) {
  if (env.ZOHO_ORG_ID) return String(env.ZOHO_ORG_ID);
  const payload = await zohoFetch(session, "/api/organization");
  const row = entries(payload)[0] || payload?.data || {};
  const orgId = row.zoid || row.orgId || row.organizationId || row.id;
  if (!orgId) throw new Error("Zoho organization id not found.");
  return String(orgId);
}

function candidateGroups(accountsPayload, env) {
  const groups = new Map();
  for (const account of entries(accountsPayload)) {
    const zuid = entryZuid(account, env);
    if (!zuid) continue;
    const matches = [...extractEmailStrings(account)]
      .filter(matchesGeneratedProofAlias)
      .sort()
      .slice(0, Math.max(0, maxAliases));
    if (!matches.length) continue;
    groups.set(zuid, [...new Set([...(groups.get(zuid) || []), ...matches])].slice(0, maxAliases));
  }
  return [...groups.entries()].map(([zuid, aliases]) => ({ zuid, aliases }));
}

function repairFalseSuccessDb(env) {
  const db = env.NEON_DATABASE_URL || env.DATABASE_URL || env.NETLIFY_DATABASE_URL;
  if (!db) return { ok: false, skipped: true, reason: "database_url_missing" };
  const regexClause = falseSuccessDbPatterns.map((pattern) => `ma.alias_email ~* '${pattern}'`).join(" or ");
  const sql = `
with target_aliases as (
  select ma.id as alias_id, hm.id as mailbox_id, ma.alias_email
    from skymail.mailbox_aliases ma
    join skymail.hosted_mailboxes hm on hm.id = ma.mailbox_id
   where upper(coalesce(ma.provider_alias_id, '')) = 'EMAIL_ALIAS_LIMIT_REACHED'
     and (${regexClause})
),
updated_aliases as (
  update skymail.mailbox_aliases ma
     set status = 'failed',
         provider_payload_json = coalesce(ma.provider_payload_json, '{}'::jsonb) || jsonb_build_object('repaired_at', now(), 'repair_source', 'zoho-alias-capacity-cleanup', 'repair_reason', 'Zoho alias limit response was not a provider alias id.'),
         updated_at = now()
    from target_aliases ta
   where ma.id = ta.alias_id
   returning ta.alias_email
),
updated_mailboxes as (
  update skymail.hosted_mailboxes hm
     set status = 'failed',
         provisioning_status = 'failed',
         last_error = 'Zoho alias limit response was not a provider alias id; mailbox is not sendable/receivable until reprovisioned.',
         provider_payload_json = coalesce(hm.provider_payload_json, '{}'::jsonb) || jsonb_build_object('repaired_at', now(), 'repair_source', 'zoho-alias-capacity-cleanup', 'repair_reason', 'Zoho alias limit response was not a provider alias id.'),
         updated_at = now()
    from target_aliases ta
   where hm.id = ta.mailbox_id
   returning hm.mailbox_email
)
select 'alias' as kind, alias_email from updated_aliases
union all
select 'mailbox' as kind, mailbox_email from updated_mailboxes
order by kind, alias_email;
`;
  const result = spawnSync("psql", [db, "-At", "-F", "\t", "-c", sql], {
    encoding: "utf8",
    env: { ...process.env, PGSSLMODE: "require" },
  });
  if (result.status !== 0) {
    return { ok: false, status: result.status, stderr: result.stderr.slice(0, 1000) };
  }
  const rows = result.stdout.trim()
    ? result.stdout.trim().split("\n").map((line) => {
      const [kind, email] = line.split("\t");
      return { kind, email };
    })
    : [];
  return { ok: true, updated: rows.length, rows };
}

async function main() {
  const env = normalizeEnv({
    ...parseEnv(path.join(repoRoot, ".env")),
    ...parseEnv(path.join(skymailRoot, ".env")),
    ...process.env,
  });
  const receipt = {
    ok: false,
    at: new Date().toISOString(),
    mode: runMode,
    repaired_db: false,
    provider: {
      selected_datacenter: "",
      org_id_present: Boolean(env.ZOHO_ORG_ID),
      groups: [],
      delete_batches: [],
      candidates_before: 0,
      candidates_after: null,
    },
    db_repair: { skipped: true },
    notes: [
      "Only generated GRAYSCAPE467 proof aliases matching grayscape467-mp*@solenterprises.org are candidates for Zoho deletion.",
      "No owner/business aliases are selected by this tool.",
    ],
  };

  const session = await getZohoSession(env);
  receipt.provider.selected_datacenter = session.id;
  const orgId = await resolveOrgId(env, session);
  receipt.provider.org_id_present = Boolean(orgId);
  const accounts = await zohoFetch(session, `/api/organization/${encodeURIComponent(orgId)}/accounts`);
  const beforeGroups = candidateGroups(accounts, env);
  receipt.provider.groups = beforeGroups.map((group) => ({ zuid: group.zuid, aliases: group.aliases }));
  receipt.provider.candidates_before = beforeGroups.reduce((sum, group) => sum + group.aliases.length, 0);

  if (apply) {
    for (const group of beforeGroups) {
      for (const aliases of chunk(group.aliases, 10)) {
        const data = await zohoFetch(session, `/api/organization/${encodeURIComponent(orgId)}/accounts/${encodeURIComponent(group.zuid)}`, {
          method: "PUT",
          body: JSON.stringify({
            zuid: group.zuid,
            mode: "deleteEmailAlias",
            emailAlias: aliases,
          }),
        });
        receipt.provider.delete_batches.push({
          zuid: group.zuid,
          aliases,
          status_code: data?.status?.code || null,
          status_description: data?.status?.description || "",
        });
      }
    }
  }

  if (repairDb) {
    receipt.db_repair = repairFalseSuccessDb(env);
    receipt.repaired_db = Boolean(receipt.db_repair.ok && receipt.db_repair.updated);
  }

  const afterAccounts = await zohoFetch(session, `/api/organization/${encodeURIComponent(orgId)}/accounts`);
  const afterGroups = candidateGroups(afterAccounts, env);
  receipt.provider.candidates_after = afterGroups.reduce((sum, group) => sum + group.aliases.length, 0);
  receipt.ok = (!apply || receipt.provider.delete_batches.every((item) => Number(item.status_code) === 200))
    && (!repairDb || receipt.db_repair.ok !== false);

  fs.writeFileSync(receiptPath, `${JSON.stringify({ ...receipt, receipt: path.relative(repoRoot, receiptPath) }, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: receipt.ok,
    mode: receipt.mode,
    candidates_before: receipt.provider.candidates_before,
    candidates_after: receipt.provider.candidates_after,
    deleted_batches: receipt.provider.delete_batches.length,
    db_repair: receipt.db_repair,
    receipt: path.relative(repoRoot, receiptPath),
  }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main().catch((error) => {
  const receipt = {
    ok: false,
    at: new Date().toISOString(),
    mode: runMode,
    error: error?.message || String(error),
    public_error: error?.publicError || null,
  };
  fs.writeFileSync(receiptPath, `${JSON.stringify({ ...receipt, receipt: path.relative(repoRoot, receiptPath) }, null, 2)}\n`);
  console.error(JSON.stringify({ ...receipt, receipt: path.relative(repoRoot, receiptPath) }, null, 2));
  process.exit(1);
});
