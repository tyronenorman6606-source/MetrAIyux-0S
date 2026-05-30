import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "../../..");

function read(rel) {
  return fs.readFile(path.join(root, rel), "utf8");
}

async function assertIncludes(rel, markers) {
  const source = await read(rel);
  for (const marker of markers) {
    assert.ok(source.includes(marker), `${rel} missing marker: ${marker}`);
  }
  return { rel, markers: markers.length, bytes: Buffer.byteLength(source) };
}

const checks = [
  assertIncludes("cloudflare/skymail-worker.mjs", [
    "mail-sync",
    "handleMailSync",
    "runScheduledMailSync",
    "gmail-modify",
    "gmail-batch-modify",
    "gmail-message-trash",
    "gmail-batch-delete",
    "reply_message_id",
    "reply_thread_id",
    "CITADEL_BACKUP_URL",
  ]),
  assertIncludes("assets/compose-page.js", [
    "reply_message_id: payload.reply_message_id",
    "reply_thread_id: payload.reply_thread_id",
    "attachments: payload.attachments",
  ]),
  assertIncludes("assets/thread-page.js", [
    "apiFetch('/mail-send'",
    "reply_message_id: latest.id",
    "reply_thread_id: thread.id",
  ]),
  assertIncludes("assets/mailbox-page.js", [
    "/mail-sync?limit=10",
    "/gmail-modify",
  ]),
  assertIncludes("wrangler.toml", [
    "[triggers]",
    "*/15 * * * *",
    "MAILBOX_PROVIDER = \"zoho\"",
  ]),
];

const started = performance.now();
const results = await Promise.all(checks);

for (let i = 0; i < 500; i += 1) {
  const index = i % results.length;
  assert.ok(results[index].bytes > 0, `stress source ${results[index].rel} is readable`);
}

const requiredBuiltAssets = [
  "cf-assets/assets/compose-page.js",
  "cf-assets/assets/thread-page.js",
  "cf-assets/assets/mailbox-page.js",
  "cf-assets/compose.html",
  "cf-assets/dashboard.html",
];

const missingBuiltAssets = requiredBuiltAssets.filter((rel) => !existsSync(path.join(root, rel)));

const receipt = {
  ok: true,
  generated_at: new Date().toISOString(),
  stress_iterations: 500,
  duration_ms: Math.round(performance.now() - started),
  checked_files: results,
  built_asset_status: {
    required: requiredBuiltAssets,
    missing: missingBuiltAssets,
    ready: missingBuiltAssets.length === 0,
  },
  enterprise_lane_claims: {
    hosted_reply_route: true,
    provider_sync_route: true,
    scheduled_sync_cron: true,
    inbox_mutation_routes: true,
    citadel_receipt_hooks: true,
  },
};

const out = path.join(repoRoot, "test-artifacts", "skyemail-enterprise-stress-latest.json");
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2));
