import fs from "node:fs";
import path from "node:path";
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

const aliases = {
  ZOHO_CLIENT_ID: ["Client_ID", "ZOHO_MAIL_CLIENT_ID"],
  ZOHO_CLIENT_SECRET: ["Client_Secret", "ZOHO_MAIL_CLIENT_SECRET"],
  ZOHO_REFRESH_TOKEN: ["Refresh_Token_ID", "Refresh_Token_ID2", "Refresh_Token", "ZOHO_MAIL_REFRESH_TOKEN"],
  ZOHO_ORG_ID: ["Org_ID", "Organization_ID", "ZOHO_ORGANIZATION_ID", "ZOHO_ZOID"],
  ZOHO_ACCOUNT_ID: ["Account_ID", "Zoho_User_ID", "ZOHO_MAIL_ACCOUNT_ID"],
  ZOHO_DEFAULT_FROM: ["Default_From_Email", "ZOHO_FROM_EMAIL", "ZOHO_MAIL_FROM"],
};

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

const datacenters = [
  { id: "us", accountsBase: "https://accounts.zoho.com", mailBase: "https://mail.zoho.com" },
  { id: "eu", accountsBase: "https://accounts.zoho.eu", mailBase: "https://mail.zoho.eu" },
  { id: "in", accountsBase: "https://accounts.zoho.in", mailBase: "https://mail.zoho.in" },
  { id: "au", accountsBase: "https://accounts.zoho.com.au", mailBase: "https://mail.zoho.com.au" },
  { id: "jp", accountsBase: "https://accounts.zoho.jp", mailBase: "https://mail.zoho.jp" },
  { id: "ca", accountsBase: "https://accounts.zohocloud.ca", mailBase: "https://mail.zohocloud.ca" },
];

function publicError(data) {
  if (!data || typeof data !== "object") return {};
  return {
    error: typeof data.error === "string" ? data.error : undefined,
    description: typeof data.error_description === "string" ? data.error_description : data?.status?.description,
    statusCode: data?.status?.code,
  };
}

function extractAccountId(payload) {
  const data = payload?.data || payload;
  const candidates = [
    data?.accountId,
    data?.account_id,
    data?.zuid,
    data?.userId,
    data?.id,
    data?.account?.accountId,
    Array.isArray(data) ? data[0]?.accountId : null,
  ];
  return candidates.some((value) => value != null && String(value).trim());
}

function extractDefaultFrom(payload) {
  const data = payload?.data || payload;
  const candidates = [
    data?.primaryEmailAddress,
    data?.mailboxAddress,
    data?.emailAddress,
    data?.email,
    Array.isArray(data) ? data[0]?.primaryEmailAddress : null,
    Array.isArray(data) ? data[0]?.mailboxAddress : null,
    Array.isArray(data) ? data[0]?.emailAddress : null,
  ];
  return candidates.some((value) => value != null && String(value).includes("@"));
}

function extractOrgId(payload) {
  const data = payload?.data || payload;
  const candidates = [
    data?.zoid,
    data?.orgId,
    data?.organizationId,
    data?.organization_id,
    data?.id,
    Array.isArray(data) ? data[0]?.zoid : null,
    Array.isArray(data) ? data[0]?.orgId : null,
  ];
  return candidates.some((value) => value != null && String(value).trim());
}

async function readJsonResponse(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw_status_only: Boolean(text) };
  }
}

const repoRoot = findRepoRoot(skymailRoot);
const env = normalizeEnv({
  ...parseEnv(path.join(repoRoot, ".env")),
  ...parseEnv(path.join(skymailRoot, ".env")),
  ...process.env,
});
const configuredAccountsBase = cleanBase(env.ZOHO_ACCOUNTS_BASE, "");
const configuredMailBase = cleanBase(env.ZOHO_MAIL_BASE, "");
const candidates = configuredAccountsBase
  ? [{ id: "configured", accountsBase: configuredAccountsBase, mailBase: configuredMailBase || "https://mail.zoho.com" }]
  : datacenters;
const required = ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_REFRESH_TOKEN"];
const missing = required.filter((key) => !env[key]);
const report = {
  ok: false,
  at: new Date().toISOString(),
  env: {
    client_id_present: Boolean(env.ZOHO_CLIENT_ID),
    client_secret_present: Boolean(env.ZOHO_CLIENT_SECRET),
    refresh_token_present: Boolean(env.ZOHO_REFRESH_TOKEN),
    org_id_present: Boolean(env.ZOHO_ORG_ID),
    account_id_present: Boolean(env.ZOHO_ACCOUNT_ID),
    default_from_present: Boolean(env.ZOHO_DEFAULT_FROM),
    aliases_accepted: Boolean(env.Client_ID || env.Client_Secret || env.Refresh_Token_ID || env.Refresh_Token_ID2),
  },
  token: { ok: false, attempted_datacenters: [] },
  accounts: { ok: false },
  organization: { ok: false },
  result: {
    api_ready: false,
    account_id_discovered: false,
    default_from_discovered: false,
    organization_id_discovered: false,
    provisioning_ready: false,
  },
};

if (missing.length) {
  report.error = `Missing required Zoho credential keys: ${missing.join(", ")}`;
} else {
  let tokenData = null;
  let selected = null;
  let lastTokenError = null;
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
    const data = await readJsonResponse(tokenRes);
    report.token.attempted_datacenters.push({ id: candidate.id, status: tokenRes.status, ok: tokenRes.ok && Boolean(data?.access_token) });
    if (tokenRes.ok && data?.access_token) {
      tokenData = data;
      selected = candidate;
      break;
    }
    lastTokenError = publicError(data);
  }
    report.token.ok = Boolean(tokenData?.access_token);
    report.token.selected_datacenter = selected?.id || "";
    report.token.api_domain = tokenData?.api_domain || "";
    if (!report.token.ok) {
      report.token.error = lastTokenError || {};
    } else {
      const auth = { authorization: `Zoho-oauthtoken ${tokenData.access_token}`, accept: "application/json" };
      const accountsRes = await fetch(`${selected.mailBase}/api/accounts`, { headers: auth });
    const accountsData = await readJsonResponse(accountsRes);
    report.accounts = {
      ok: accountsRes.ok,
      status: accountsRes.status,
      count: Array.isArray(accountsData?.data) ? accountsData.data.length : (accountsData?.data ? 1 : 0),
    };
    if (!accountsRes.ok) report.accounts.error = publicError(accountsData);
    report.result.account_id_discovered = extractAccountId(accountsData) || Boolean(env.ZOHO_ACCOUNT_ID);
    report.result.default_from_discovered = extractDefaultFrom(accountsData) || Boolean(env.ZOHO_DEFAULT_FROM);

    if (env.ZOHO_ORG_ID) {
      const organizationRes = await fetch(`${selected.mailBase}/api/organization/${encodeURIComponent(env.ZOHO_ORG_ID)}`, { headers: auth });
      const organizationData = await readJsonResponse(organizationRes);
      report.organization = { ok: organizationRes.ok, status: organizationRes.status };
      if (!organizationRes.ok) report.organization.error = publicError(organizationData);
      report.result.organization_id_discovered = extractOrgId(organizationData) || Boolean(env.ZOHO_ORG_ID);
    } else {
      report.organization = {
        ok: false,
        skipped: true,
        reason: "ZOHO_ORG_ID is not configured; Zoho organization details require /api/organization/{zoid}.",
      };
      report.result.organization_id_discovered = false;
    }
    report.result.api_ready = report.token.ok && report.accounts.ok && report.result.account_id_discovered;
    report.result.provisioning_ready = report.result.api_ready && report.organization.ok && report.result.organization_id_discovered;
    report.ok = report.result.provisioning_ready;
  }
}

const outDir = path.join(repoRoot, "test-artifacts", "skyemail-zoho-provider-smoke");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "zoho-provider-smoke.json");
fs.writeFileSync(outFile, JSON.stringify({ ...report, receipt: path.relative(repoRoot, outFile) }, null, 2));
console.log(JSON.stringify({ ...report, receipt: path.relative(repoRoot, outFile) }, null, 2));
process.exit(report.ok ? 0 : 1);
