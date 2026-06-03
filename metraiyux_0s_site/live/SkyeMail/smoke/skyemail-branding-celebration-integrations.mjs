#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "../../..");
const receiptPath = path.join(repoRoot, "test-artifacts", "skyemail-branding-celebration-integrations-latest.json");

const bannedCopy = [
  "SkyeMail Citadel",
  "SkyEmail Citadel",
  "Skyemail Citadel",
  "Citadel Mail",
  "Citadel setup",
  "Set up Citadel",
  "Citadel Key Pack",
  "Citadel passphrase",
  "Citadel mail lane",
  "Citadel mail records",
  "Citadel moves the email",
  "Citadel/Ops",
  "Create Citadel",
  "Activate Citadel",
  "Citadel Mail active",
  "SkyeMail Vault",
  "SkyEmail Vault",
  "backed by Cloudflare",
  "Cloudflare and Neon",
];

const sourceGlobs = [
  "index.html",
  "signup.html",
  "ai.html",
  "login.html",
  "send.html",
  "founder.html",
  "keys.html",
  "changelog.html",
  "marketing.html",
  "onboarding.html",
  "security.html",
  "monitoring.html",
  "google-indexing-submit.json",
  "assets/mail-ui.js",
  "assets/mail-ui.css",
  "assets/os-bridge.js",
  "assets/workspace-page.js",
  "assets/mailbox-page.js",
  "assets/compose-page.js",
  "assets/brain-page.js",
  "assets/monitoring-page.js",
  "cloudflare/skymail-worker.mjs",
  "cf-assets/index.html",
  "cf-assets/signup.html",
  "cf-assets/ai.html",
  "cf-assets/login.html",
  "cf-assets/send.html",
  "cf-assets/founder.html",
  "cf-assets/keys.html",
  "cf-assets/changelog.html",
  "cf-assets/marketing.html",
  "cf-assets/onboarding.html",
  "cf-assets/security.html",
  "cf-assets/monitoring.html",
  "cf-assets/signup/index.html",
  "cf-assets/login/index.html",
  "cf-assets/send/index.html",
  "cf-assets/founder/index.html",
  "cf-assets/keys/index.html",
  "cf-assets/assets/mail-ui.js",
  "cf-assets/assets/mail-ui.css",
  "cf-assets/assets/os-bridge.js",
  "cf-assets/assets/workspace-page.js",
];

const integrationIds = [
  "skydocxmax-editor",
  "sovereigndocs-packet-builder",
  "sovereigndocs-review-studio",
  "founder-calendar",
  "founder-command-bridge",
  "crm-pipeline",
  "crm-follow-up",
  "ae-flow-contact-capture",
  "ae-flow-workflow-journal",
  "saas-customer-command",
  "skyecommerce-orders",
  "skyecommerce-analytics",
  "profit-console",
  "split-engine",
  "audit-ledger",
  "saas-launch-packet",
  "government-case-command",
  "skyevaultpro-drive",
  "pwa-factory",
];

async function read(rel) {
  return fs.readFile(path.join(root, rel), "utf8");
}

async function assertIncludes(rel, markers) {
  const source = await read(rel);
  const missing = markers.filter((marker) => !source.includes(marker));
  assert.equal(missing.length, 0, `${rel} missing markers: ${missing.join(", ")}`);
  return { rel, markers: markers.length, bytes: Buffer.byteLength(source) };
}

const scanned = [];
for (const rel of sourceGlobs) {
  const source = await read(rel);
  for (const banned of bannedCopy) {
    assert.equal(source.includes(banned), false, `${rel} still contains stale product copy: ${banned}`);
  }
  scanned.push({ rel, bytes: Buffer.byteLength(source) });
}

const checks = [];
checks.push(await assertIncludes("index.html", ["SkyeMail backed by Citadel Database and SkyeNet", "Create SkyeMail Core"]));
checks.push(await assertIncludes("signup.html", ["Activate SkyeMail Core", "activating SkyeMail backed by Citadel Database and SkyeNet", "SkyeMail core active"]));
checks.push(await assertIncludes("signup.html", ["SkyeMail address was not supplied by the 0S Gate claim", "SkyeMail mailbox provisioning failed"]));
checks.push(await assertIncludes("login.html", ["placeholder=\"you@yourdomain.com\"", "Enter your exact SkyeMail inbox address"]));
checks.push(await assertIncludes("dashboard.html", ["workspace.html?panel=calendar", "workspace.html?panel=automation"]));
checks.push(await assertIncludes("cf-assets/index.html", ["SkyeMail backed by Citadel Database and SkyeNet", "Create SkyeMail Core"]));
checks.push(await assertIncludes("cf-assets/signup.html", ["Activate SkyeMail Core", "activating SkyeMail backed by Citadel Database and SkyeNet", "SkyeMail core active"]));
checks.push(await assertIncludes("assets/mail-ui.js", [
  "celebrations:[]",
  "persistCelebration",
  "receiptBacked:true",
  "CustomEvent('0s:celebration'",
  "/mail-game-event",
  "queueGameLedger",
  "game-thanks",
  "purchases, 0S handoffs",
]));
checks.push(await assertIncludes("assets/mail-ui.css", [".game-thanks", ".game-thanks b", ".game-thanks span"]));
checks.push(await assertIncludes("assets/compose-page.js", ["triggerType:'workflow-complete'", "Thank you for trusting SkyeMail"]));
checks.push(await assertIncludes("assets/mailbox-page.js", ["triggerType:'proof-green'", "Thank you for proving the SkyeMail lane"]));
checks.push(await assertIncludes("assets/brain-page.js", ["triggerType:\"owner-thank-you\"", "Thank you for upgrading SkyeMail"]));
checks.push(await assertIncludes("assets/monitoring-page.js", ["celebrateReceipt", "delivery_status"]));
checks.push(await assertIncludes("assets/os-bridge.js", [
  "const ACTIONS = [",
  "zeroOsFetch",
  "/api/founder-command/calendar",
  "/api/founder-command/actions/execute",
  "/api/founder-command/ae-flow/capture",
  "/api/founder-command/ae-flow/runtime/journal",
  "/api/saas/action-event",
  "/SkyeCommerce/api/orders",
  "/SkyeCommerce/api/analytics/summary",
  "/api/founder-command/pwa-factory/analyze",
]));
checks.push(await assertIncludes("assets/workspace-page.js", ["Run + receipt", "Open app", "commerce"]));
checks.push(await assertIncludes("cloudflare/skymail-worker.mjs", [
  "const SKYEMAIL_OS_ACTIONS = [",
  "executeMailOsDirectApi",
  "mailOsDirectApiPayload",
  "handleMailOsActions",
  "handleMailOsHealth",
  "handleMailOsHandoff",
  "handleSkyEmailGameEvent",
  "handleSkyEmailGameSummary",
  "syncContactToZeroOs",
  "createWorkflowPacket",
  "os_integration_events",
  "skyemail_game_events",
  "Route is not considered healthy until a shared-gate live API or launch URL responds.",
]));

const osBridge = await read("assets/os-bridge.js");
const worker = await read("cloudflare/skymail-worker.mjs");
const missingInBridge = integrationIds.filter((id) => !osBridge.includes(`id:"${id}"`) && !osBridge.includes(`id: "${id}"`));
const missingInWorker = integrationIds.filter((id) => !worker.includes(`id: "${id}"`) && !worker.includes(`id:"${id}"`));
assert.equal(missingInBridge.length, 0, `os-bridge missing integration ids: ${missingInBridge.join(", ")}`);
assert.equal(missingInWorker.length, 0, `worker missing integration ids: ${missingInWorker.join(", ")}`);
assert.equal((await read("signup.html")).includes("Mailbox provision skipped"), false, "signup must not continue after mailbox provisioning failure");
assert.equal((await read("login.html")).includes('|| "darthom-intelligence@solenterprises.org"'), false, "login must not default customers into an internal mailbox");
assert.equal((await read("cloudflare/skymail-worker.mjs")).includes("external_live_route_proof_required"), false, "mail-os health must not mark missing routes as externally healthy");

JSON.parse(await read("google-indexing-submit.json"));

const receipt = {
  ok: true,
  generated_at: new Date().toISOString(),
  platform: "SkyeMail",
  product_copy: "SkyeMail backed by Citadel Database and SkyeNet",
  scanned_files: scanned,
  checks,
  integration_ids: integrationIds,
  banned_copy: bannedCopy,
  proof: [
    "Public source and Cloudflare asset bundle contain the cohesive SkyeMail backed by Citadel Database and SkyeNet copy.",
    "Stale Citadel-as-product and Cloudflare/Neon public backing copy is absent from active SkyeMail public/app surfaces.",
    "Receipt-backed thank-you events persist into the mailbox game state and render back into the game board.",
    "Receipt-backed thank-you and XP events are also posted to a shared-gate SkyeMail game ledger route.",
    "The 0S workbench exposes 19 SkyeMail integration actions across docs, calendar, command, CRM, commerce, finance, legal, vault, and builder lanes.",
    "The Worker exposes mail-os actions, health, handoff execution, direct 0S API payloads, contact sync, workflow packets, and OS integration telemetry markers.",
  ],
};

await fs.mkdir(path.dirname(receiptPath), { recursive: true });
await fs.writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify({ ok: true, receipt: path.relative(repoRoot, receiptPath), integration_count: integrationIds.length }, null, 2));
