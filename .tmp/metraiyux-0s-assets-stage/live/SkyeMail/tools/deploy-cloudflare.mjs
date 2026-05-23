import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
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
const aliases = {
  ZOHO_CLIENT_ID: ["Client_ID", "ZOHO_MAIL_CLIENT_ID"],
  ZOHO_CLIENT_SECRET: ["Client_Secret", "ZOHO_MAIL_CLIENT_SECRET"],
  ZOHO_REFRESH_TOKEN: ["Refresh_Token_ID", "Refresh_Token", "ZOHO_MAIL_REFRESH_TOKEN"],
  ZOHO_ORG_ID: ["Org_ID", "Organization_ID", "ZOHO_ORGANIZATION_ID", "ZOHO_ZOID"],
  ZOHO_ACCOUNT_ID: ["Account_ID", "ZOHO_MAIL_ACCOUNT_ID"],
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

const env = { ...process.env, ...parseEnv(path.join(repoRoot, ".env")) };
for (const [canonical, names] of Object.entries(aliases)) {
  if (env[canonical]) continue;
  const match = names.find((name) => env[name]);
  if (match) env[canonical] = env[match];
}
const child = spawn("npx", ["wrangler", "deploy"], {
  cwd: skymailRoot,
  env,
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.on("data", (chunk) => process.stdout.write(chunk));
child.stderr.on("data", (chunk) => process.stderr.write(chunk));

const heartbeat = setInterval(() => {
  console.log("wrangler deploy still running...");
}, 5000);

const code = await new Promise((resolve) => child.on("close", resolve));
clearInterval(heartbeat);
process.exit(code || 0);
