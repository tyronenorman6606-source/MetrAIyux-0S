import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalEnv } from "./_local-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "..");
loadLocalEnv({ root, repoRoot });

function repeatedEnvValues(key) {
  const file = path.join(repoRoot, ".env");
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf8");
  const pattern = new RegExp(`^\\s*${key}\\s*=\\s*['"]?([^'"\\n]+)['"]?\\s*$`, "gm");
  return [...text.matchAll(pattern)].map((match) => match[1]).filter(Boolean);
}

const cloudflareTokenCandidates = repeatedEnvValues("CLOUDFLARE_API_TOKEN");
if (cloudflareTokenCandidates.length > 1) {
  process.env.CLOUDFLARE_API_TOKEN = cloudflareTokenCandidates[1];
}

const PUBLIC_ORIGIN = process.env.SKYPAY_PUBLIC_ORIGIN || "https://skyesol.netlify.app";
const ALLOWED_ORIGINS = process.env.SKYPAY_ALLOWED_ORIGINS || [
  "https://skyesol.netlify.app",
  "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev",
  "https://metraiyux-0s-public-spectacle.pages.dev",
  "https://metraiyux-ecosystem-portal.pages.dev",
  "https://bobs-smoke-shop-metraiyux-preview.pages.dev",
  "https://bobs-smoke-shop-metraiyux-preview.netlify.app"
].join(",");

const envMap = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || "",
  STRIPE_CURRENCY: process.env.STRIPE_CURRENCY || "usd",
  SKYPAY_PUBLIC_ORIGIN: PUBLIC_ORIGIN,
  SKYPAY_ALLOWED_ORIGINS: ALLOWED_ORIGINS,
  SKYPAY_TRUST_PUBLIC_APP_ORIGIN: process.env.SKYPAY_TRUST_PUBLIC_APP_ORIGIN || "false",
  SKYPAY_ALLOW_PUBLIC_DRY_RUN: process.env.SKYPAY_ALLOW_PUBLIC_DRY_RUN || "false",
  SKYPAY_ALLOW_PUBLIC_ORDER_LOOKUP: process.env.SKYPAY_ALLOW_PUBLIC_ORDER_LOOKUP || "false",
  DATABASE_URL: process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL || "",
  NETLIFY_DATABASE_URL: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || ""
};

const required = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "DATABASE_URL",
  "NETLIFY_DATABASE_URL"
];

function assertReady() {
  const missing = required.filter((key) => !envMap[key]);
  const deployMissing = [];
  if (!process.env.NETLIFY_AUTH_TOKEN) deployMissing.push("NETLIFY_AUTH_TOKEN");
  if (!process.env.NETLIFY_SITE_ID) deployMissing.push("NETLIFY_SITE_ID");
  if (!process.env.CLOUDFLARE_API_TOKEN) deployMissing.push("CLOUDFLARE_API_TOKEN");
  if (!process.env.CLOUDFLARE_ACCOUNT_ID) deployMissing.push("CLOUDFLARE_ACCOUNT_ID");
  if (missing.length || deployMissing.length) {
    console.error(JSON.stringify({ ok: false, missing, deployMissing }, null, 2));
    process.exit(1);
  }
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || root,
      env: options.env || process.env,
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} failed with ${code}\n${stderr || stdout}`));
    });
    if (options.stdin) child.stdin.end(options.stdin);
    else child.stdin.end();
  });
}

async function setNetlifyEnv(key, value) {
  await run("npx", [
    "netlify",
    "env:set",
    key,
    value,
    "--context",
    "production",
    "--site",
    process.env.NETLIFY_SITE_ID,
    "--auth",
    process.env.NETLIFY_AUTH_TOKEN,
    "--force",
    "--secret"
  ]);
}

async function setCloudflareSecret(key, value) {
  await run("npx", [
    "wrangler",
    "secret",
    "put",
    key,
    "--config",
    "wrangler.toml"
  ], {
    cwd: root,
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID
    },
    stdin: `${value}\n`
  });
}

async function main() {
  assertReady();
  const keys = Object.keys(envMap).filter((key) => envMap[key] !== "");
  const result = {
    ok: true,
    publicOrigin: PUBLIC_ORIGIN,
    allowedOriginCount: ALLOWED_ORIGINS.split(",").filter(Boolean).length,
    cloudflareTokenSlot: cloudflareTokenCandidates.length > 1 ? 2 : 1,
    netlify: [],
    cloudflare: []
  };

  for (const key of keys) {
    await setNetlifyEnv(key, envMap[key]);
    result.netlify.push(key);
  }

  for (const key of keys) {
    await setCloudflareSecret(key, envMap[key]);
    result.cloudflare.push(key);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
