#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalEnv } from "./_local-env.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const gateRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(gateRoot, "..");
if (process.argv.includes("--use-backup-db")) {
  process.env.SKYGATE_USE_BACKUP_DATABASE = "true";
}
loadLocalEnv({ root: gateRoot, repoRoot });

const defaultQueue = path.join(
  repoRoot,
  "metraiyux_0s_site",
  "valley-verified",
  "data",
  "0s-workspace-provisioning-queue.json"
);

function argValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] || fallback) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function deriveSkyemail(item) {
  if (item.provisioning_request?.skyemail) return item.provisioning_request.skyemail;
  const domain = (process.env.SKYEMAIL_DOMAIN || "").trim().replace(/^@/, "");
  if (!domain) return "";
  return `${slug(item.name || item.business_id)}@${domain}`;
}

async function main() {
  const queuePath = path.resolve(argValue("--queue", process.env.VALLEY_PROVISIONING_QUEUE || defaultQueue));
  const dryRun = hasFlag("--dry-run");
  const showPasswords = hasFlag("--show-passwords");
  const directLocal = hasFlag("--direct-local");
  const includeValidation = hasFlag("--include-validation");
  const origin = (
    argValue(
      "--origin",
      process.env.SKYGATE_BASE_URL ||
        process.env.SKYEGATE_BASE_URL ||
        process.env.SKYGATEFS27_ORIGIN ||
        process.env.SKYGATEFS27_WORKER_ORIGIN ||
        process.env.SKYEGATE_FS27_URL ||
        "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev"
    ) || ""
  ).replace(/\/$/, "");
  const receiptPath = argValue("--receipt", process.env.PROVISIONING_RECEIPT_PATH || "");
  const adminPassword =
    process.env.ADMIN_PASSWORD ||
    process.env.SKYGATE_ADMIN_PASSWORD ||
    process.env.SKYEGATE_ADMIN_PASSWORD ||
    process.env.SKYGATEFS13_ADMIN_PASSWORD ||
    "";
  const bearer =
    process.env.ADMIN_BEARER_TOKEN ||
    process.env.SKYGATE_ADMIN_TOKEN ||
    process.env.SKYEGATE_ADMIN_TOKEN ||
    process.env.SKYGATE_ADMIN_JWT ||
    process.env.SKYEGATE_ADMIN_JWT ||
    process.env.SKYGATEFS13_WORKER_ADMIN_TOKEN ||
    "";

  const queue = JSON.parse(await fs.readFile(queuePath, "utf8"));
  const selected = [
    ...(queue.provision_ready || []),
    ...(includeValidation ? (queue.validation_required || []) : [])
  ];
  const localHandler = directLocal
    ? (await import("../netlify/functions/admin-client-provisioning.js")).default
    : null;

  if (!selected.length) {
    console.log(`No provisionable workspaces found in ${queuePath}`);
    return;
  }

  if (!dryRun && !adminPassword && !bearer) {
    throw new Error("Missing admin auth. Set ADMIN_PASSWORD or ADMIN_BEARER_TOKEN before live provisioning.");
  }

  const results = [];
  for (const item of selected) {
    const request = {
      ...(item.provisioning_request || {}),
      skyemail: deriveSkyemail(item) || undefined,
      force_password_reset: true
    };

    if (dryRun) {
      results.push({
        business_id: item.business_id,
        name: item.name,
        dry_run: true,
        endpoint: directLocal
          ? "local:SkyeGateFS27/netlify/functions/admin-client-provisioning.js"
          : `${origin}/.netlify/functions/admin-client-provisioning`,
        request: {
          ...request,
          temporary_password: request.temporary_password ? "[provided]" : undefined
        }
      });
      continue;
    }

    const headers = { "content-type": "application/json" };
    if (directLocal && adminPassword) headers["x-admin-password"] = adminPassword;
    else if (bearer) headers.authorization = `Bearer ${bearer}`;
    else headers["x-admin-password"] = adminPassword;

    const res = directLocal
      ? await localHandler(new Request("http://local.test/.netlify/functions/admin-client-provisioning", {
          method: "POST",
          headers,
          body: JSON.stringify(request)
        }))
      : await fetch(`${origin}/.netlify/functions/admin-client-provisioning`, {
          method: "POST",
          headers,
          body: JSON.stringify(request)
        });
    const data = await res.json().catch(() => ({}));
    results.push({
      business_id: item.business_id,
      name: item.name,
      ok: res.ok && data.ok !== false,
      status: res.status,
      customer_id: data.customer?.id || null,
      user_id: data.user?.id || null,
      email: data.credentials?.email || request.email,
      temporary_password: showPasswords
        ? (data.credentials?.temporary_password || null)
        : (data.credentials?.temporary_password ? "[withheld]" : null),
      password_reset_required: data.credentials?.password_reset_required === true,
      notification: data.notification || null,
      vault: data.vault || null,
      error: data.error || null
    });
  }

  const output = {
    generated_at: new Date().toISOString(),
    origin,
    mode: directLocal ? "direct-local" : "http",
    queue_path: queuePath,
    dry_run: dryRun,
    count: results.length,
    results
  };

  if (receiptPath) {
    const absoluteReceiptPath = path.resolve(receiptPath);
    await fs.mkdir(path.dirname(absoluteReceiptPath), { recursive: true });
    await fs.writeFile(absoluteReceiptPath, `${JSON.stringify(output, null, 2)}\n`);
    console.log(`Wrote provisioning receipt to ${absoluteReceiptPath}`);
  }

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
