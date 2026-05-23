import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(projectRoot, "..", "..");
const envPath = path.join(repoRoot, ".env");
const seedPath = path.join(projectRoot, "northstar", "assets", "data", "seed-workspaces.json");
const outDir = path.join(projectRoot, "integration");

async function loadEnv() {
  const text = await fs.readFile(envPath, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_.-]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function normalizeOwnerEmail(ownerEmail, slug) {
  const clean = String(ownerEmail || "").trim().toLowerCase();
  if (clean && !clean.endsWith("@northstar.local")) return clean;
  return `graylondonskyes+northstar-${slug}@gmail.com`;
}

function makePassword() {
  return crypto.randomBytes(18).toString("base64url");
}

async function main() {
  await loadEnv();
  await fs.mkdir(outDir, { recursive: true });

  const { provisionWorkspaceBundle } = await import(
    path.join(repoRoot, "SkyeGateFS27", "netlify", "functions", "_lib", "signinpro.js")
  );

  const seeds = JSON.parse(await fs.readFile(seedPath, "utf8"));
  const receipts = [];

  for (const seed of seeds) {
    const slug = String(seed.slug || "").trim();
    const ownerEmail = normalizeOwnerEmail(seed.ownerEmail, slug);
    const ownerPassword = makePassword();
    const result = await provisionWorkspaceBundle({
      name: seed.name,
      slug,
      ownerEmail,
      ownerPassword,
      role: seed.role || "owner",
      plan: seed.plan || "free99-gate-owned",
      communicationEmail: process.env.LEGAL_REVIEW_ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL || ownerEmail,
      skyemail: null,
      metadata: {
        ...(seed.metadata || {}),
        source_project: "glendale-northstar-valley-verified-v6-final",
        source_app: "northstar-signinpro",
        ownership_mode: "gate-owned-free99",
        operator_managed: true
      },
      initialState: seed.initialState || null,
      initialBranding: seed.metadata?.branding || {},
      initialAppSettings: seed.metadata?.appSettings || {},
      initialSecuritySettings: seed.metadata?.securitySettings || {},
      provisionedBy: "northstar-0s-live-provisioner"
    });

    receipts.push({
      slug,
      name: seed.name,
      ownerEmail,
      communicationEmail: process.env.LEGAL_REVIEW_ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL || ownerEmail,
      oneTimePassword: result.oneTimePassword,
      workspaceId: result.workspace.id,
      customerId: result.customer.id,
      gateUserId: result.gateUser.id,
      workspaceUserId: result.workspaceUser.id,
      workspaceRoute: `/northstar/index.html?workspace=${slug}`,
      valleyRoute: `/valley-verified/business/${slug}/`
    });
  }

  const outPath = path.join(outDir, "NORTHSTAR_0S_WORKSPACE_PROVISIONING_2026-05-19.secret.json");
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        source_seed: path.relative(projectRoot, seedPath),
        count: receipts.length,
        owner_strategy: "placeholder northstar.local owners upgraded to operator Gmail plus-addresses for live gate ownership",
        receipts
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  console.log(outPath);
  console.log(JSON.stringify({ count: receipts.length, slugs: receipts.map((item) => item.slug) }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
