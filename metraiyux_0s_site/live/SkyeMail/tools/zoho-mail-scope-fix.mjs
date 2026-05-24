import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skymailRoot = path.resolve(__dirname, "..");

const REQUIRED_SCOPES = [
  "ZohoMail.accounts.READ",
  "ZohoMail.folders.READ",
  "ZohoMail.messages.ALL",
  "ZohoMail.organization.accounts.ALL",
  "ZohoMail.partner.organization.READ",
].join(",");

function findRepoRoot(start) {
  let current = start;
  while (current && current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, ".git"))) return current;
    current = path.dirname(current);
  }
  return path.resolve(start, "../../..");
}

function parseEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim().replace(/^export\s+/, "");
    let value = line.slice(index + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");
    if (key) out[key] = value;
  }
  return out;
}

function envValue(env, canonical, aliases = []) {
  return env[canonical] || aliases.map((key) => env[key]).find(Boolean) || "";
}

function cleanAuthCode(value) {
  return String(value || "").trim().replace(/^<|>$/g, "");
}

function clientPairs(env) {
  const pairs = [
    {
      label: "canonical",
      id: envValue(env, "ZOHO_CLIENT_ID"),
      secret: envValue(env, "ZOHO_CLIENT_SECRET"),
    },
    {
      label: "handoff-client",
      id: envValue(env, "Client_ID"),
      secret: envValue(env, "Client_Secret"),
    },
    {
      label: "api-console",
      id: envValue(env, "ZOHO_API_CONSOLE_Client_ID"),
      secret: envValue(env, "ZOHO_API_CONSOLE_secret"),
    },
  ].filter((item) => item.id && item.secret);
  return pairs.filter((item, index) => pairs.findIndex((other) => other.id === item.id && other.secret === item.secret) === index);
}

function updateEnvValue(file, key, value, afterKey = "") {
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text ? text.split(/\r?\n/) : [];
  for (let i = 0; i < lines.length; i += 1) {
    if (new RegExp(`^\\s*${key}\\s*=`).test(lines[i])) {
      lines[i] = `${key}=${value}`;
      fs.writeFileSync(file, lines.join(newline));
      return { action: "updated", line: i + 1 };
    }
  }
  let insertAt = afterKey
    ? lines.findIndex((line) => new RegExp(`^\\s*${afterKey}\\s*=`).test(line))
    : -1;
  if (insertAt >= 0) {
    lines.splice(insertAt + 1, 0, `${key}=${value}`);
    fs.writeFileSync(file, lines.join(newline));
    return { action: "inserted", line: insertAt + 2 };
  }
  if (lines.length && lines[lines.length - 1] !== "") lines.push("");
  lines.push(`${key}=${value}`);
  fs.writeFileSync(file, lines.join(newline));
  return { action: "appended", line: lines.length };
}

async function tokenRequest(accountsBase, params) {
  const url = `${accountsBase.replace(/\/+$/, "")}/oauth/v2/token?${params.toString()}`;
  const res = await fetch(url, { method: "POST", headers: { accept: "application/json" } });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function getAccessToken(env) {
  const accountsBase = envValue(env, "ZOHO_ACCOUNTS_BASE") || "https://accounts.zoho.com";
  const params = new URLSearchParams({
    refresh_token: envValue(env, "ZOHO_REFRESH_TOKEN", ["Refresh_Token_ID", "Refresh_Token_ID2", "Refresh_Token"]),
    client_id: envValue(env, "ZOHO_CLIENT_ID", ["Client_ID"]),
    client_secret: envValue(env, "ZOHO_CLIENT_SECRET", ["Client_Secret"]),
    grant_type: "refresh_token",
  });
  const { res, data } = await tokenRequest(accountsBase, params);
  if (!res.ok || !data.access_token) {
    throw new Error(`Zoho refresh failed: ${res.status} ${data.error || data.error_description || "no access token"}`);
  }
  return data.access_token;
}

async function probe(env, accessToken, label, apiPath) {
  const mailBase = (envValue(env, "ZOHO_MAIL_BASE") || "https://mail.zoho.com").replace(/\/+$/, "");
  const res = await fetch(`${mailBase}${apiPath}`, {
    headers: {
      accept: "application/json",
      authorization: `Zoho-oauthtoken ${accessToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  return {
    label,
    status: res.status,
    ok: res.ok,
    error_code: data?.data?.errorCode || data?.error || null,
    description: data?.status?.description || data?.error_description || null,
  };
}

async function exchangeCode(repoRoot, env, code) {
  const accountsBase = envValue(env, "ZOHO_ACCOUNTS_BASE") || "https://accounts.zoho.com";
  let winner = null;
  const failures = [];
  for (const client of clientPairs(env)) {
    const params = new URLSearchParams({
      code,
      client_id: client.id,
      client_secret: client.secret,
      grant_type: "authorization_code",
    });
    const { res, data } = await tokenRequest(accountsBase, params);
    if (res.ok && data.refresh_token) {
      winner = { client, data };
      break;
    }
    failures.push({ client: client.label, status: res.status, error: data.error || null, error_description: data.error_description || null });
  }
  if (!winner) {
    console.log(JSON.stringify({
      ok: false,
      tried_clients: failures,
      hint: "The Zoho code is short-lived and one-time-use. Generate a fresh Self Client code with the printed scopes.",
    }, null, 2));
    process.exit(1);
  }
  const envFile = path.join(repoRoot, ".env");
  const refreshResult = updateEnvValue(envFile, "ZOHO_REFRESH_TOKEN", winner.data.refresh_token, "Refresh_Token_ID2");
  const clientIdResult = updateEnvValue(envFile, "ZOHO_CLIENT_ID", winner.client.id, "Client_ID");
  const clientSecretResult = updateEnvValue(envFile, "ZOHO_CLIENT_SECRET", winner.client.secret, "Client_Secret");
  console.log(JSON.stringify({
    ok: true,
    matched_client: winner.client.label,
    updated: {
      ZOHO_REFRESH_TOKEN: { action: refreshResult.action, line: refreshResult.line, length: String(winner.data.refresh_token).length },
      ZOHO_CLIENT_ID: { action: clientIdResult.action, line: clientIdResult.line, length: String(winner.client.id).length },
      ZOHO_CLIENT_SECRET: { action: clientSecretResult.action, line: clientSecretResult.line, length: String(winner.client.secret).length },
    },
    api_domain: winner.data.api_domain || null,
    expires_in: winner.data.expires_in || null,
  }, null, 2));
}

async function verify(env) {
  const accountId = envValue(env, "ZOHO_ACCOUNT_ID", ["Zoho_User_ID", "Account_ID"]);
  const orgId = envValue(env, "ZOHO_ORG_ID", ["Organization_ID", "Org_ID"]);
  const accessToken = await getAccessToken(env);
  const checks = [
    await probe(env, accessToken, "accounts", "/api/accounts"),
  ];
  if (accountId) {
    checks.push(await probe(env, accessToken, "folders", `/api/accounts/${encodeURIComponent(accountId)}/folders`));
    checks.push(await probe(env, accessToken, "messages_view", `/api/accounts/${encodeURIComponent(accountId)}/messages/view?limit=1`));
  }
  if (orgId) {
    checks.push(await probe(env, accessToken, "organization", `/api/organization/${encodeURIComponent(orgId)}`));
  }
  console.log(JSON.stringify({
    ok: checks.every((item) => item.ok),
    account_id_present: Boolean(accountId),
    org_id_present: Boolean(orgId),
    default_from_present: Boolean(envValue(env, "ZOHO_DEFAULT_FROM", ["Default_From_Email", "ZOHO_FROM_EMAIL", "ZOHO_MAIL_FROM"])),
    checks,
  }, null, 2));
}

const command = process.argv[2] || "scopes";
const repoRoot = findRepoRoot(skymailRoot);
const env = { ...parseEnv(path.join(repoRoot, ".env")), ...process.env };

if (command === "scopes") {
  console.log(REQUIRED_SCOPES);
  process.exit(0);
}

if (command === "self-client" || command === "url" || command === "auth-url") {
  console.log(JSON.stringify({
    ok: true,
    method: "Zoho API Console Self Client > Generate Code",
    console_url: "https://api-console.zoho.com/",
    warning: "Do not use the redirect OAuth URL for this repo fix. The redirect URI must match a registered server app and is the lane that broke.",
    steps: [
      "Open Zoho API Console.",
      "Open the Self Client that matches either the api-console or handoff client pair in root .env.",
      "Go to Generate Code.",
      "Paste the scopes exactly as shown.",
      "Choose the longest available expiry.",
      "Use a plain description like SkyeMail Mail API scopes.",
      "Click Create and copy the generated code before it expires.",
      "Run npm run zoho:exchange -- '<GENERATED_CODE>'.",
    ],
    scopes: REQUIRED_SCOPES,
    known_client_labels: clientPairs(env).map((client) => client.label),
  }, null, 2));
  process.exit(0);
}

if (command === "exchange") {
  const code = cleanAuthCode(process.argv[3] || process.env.ZOHO_AUTH_CODE || "");
  if (!code) {
    console.error("Missing code. Run: node tools/zoho-mail-scope-fix.mjs exchange '<ZOHO_CODE>'");
    process.exit(1);
  }
  await exchangeCode(repoRoot, env, code);
  process.exit(0);
}

if (command === "verify") {
  await verify(env);
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
process.exit(1);
