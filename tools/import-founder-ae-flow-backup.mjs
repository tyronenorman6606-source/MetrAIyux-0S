#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { resolveZeroOsGateAuth } from "./lib/zero-os-gate-auth.mjs";

const ROOT = process.cwd();
const DEFAULT_BACKUP = path.join(ROOT, "Zenith", "AE-FLOW-backup-2026-03-17.json");
const DEFAULT_ORIGIN = "https://metraiyux-0s-full-system.graylondonskyes.workers.dev";
const OUT_DIR = path.join(ROOT, "test-artifacts", "ae-flow-founder-import");
const OUT_FILE = path.join(OUT_DIR, "latest-import-receipt.json");

function argValue(name, fallback = "") {
  const prefixed = `${name}=`;
  const direct = process.argv.find((arg) => arg.startsWith(prefixed));
  if (direct) return direct.slice(prefixed.length);
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function collectRecords(backup) {
  const collections = [
    ["visits", "visit"],
    ["accounts", "account"],
    ["deals", "deal"],
    ["handoff_log", "handoff"]
  ];
  const records = [];
  const counts = {};
  for (const [collection, kind] of collections) {
    const items = Array.isArray(backup[collection]) ? backup[collection] : [];
    counts[collection] = items.length;
    for (const item of items) {
      records.push({
        source: `founder-backup-2026-03-17:${collection}`,
        collection,
        kind,
        raw: item
      });
    }
  }
  return { records, counts };
}

async function postBatch(origin, token, batch, index, total) {
  const res = await fetch(`${origin.replace(/\/+$/, "")}/api/founder-command/ae-flow/import-batch`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      "x-skye-gate-session": token,
      "x-free99-gate-session": token
    },
    body: JSON.stringify({
      source: "founder-ae-flow-backup-2026-03-17",
      batch_index: index,
      batch_total: total,
      records: batch
    })
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.ok === false) {
    throw new Error(`batch ${index + 1}/${total} failed: ${res.status} ${payload.error || "unknown_error"}`);
  }
  return {
    batch: index + 1,
    status: res.status,
    accepted: payload.imported?.accepted || 0,
    skipped: payload.imported?.skipped || 0,
    by_collection: payload.imported?.by_collection || {}
  };
}

async function main() {
  const backupPath = path.resolve(argValue("--backup", DEFAULT_BACKUP));
  const origin = argValue("--origin", process.env.AE_FLOW_IMPORT_ORIGIN || DEFAULT_ORIGIN);
  const batchSize = Math.max(1, Math.min(250, Number(argValue("--batch-size", "100")) || 100));
  const dryRun = process.argv.includes("--dry-run");
  const gateAuth = dryRun ? { ok: true, token: "", credential: { key: "dry-run", source: "none" } } : await resolveZeroOsGateAuth({ zeroOsBase: origin });
  if (!fs.existsSync(backupPath)) throw new Error(`Backup file not found: ${backupPath}`);
  if (!dryRun && !gateAuth.token) throw new Error("Missing shared FS27/SkyGate/Free99 gate bearer.");

  const raw = fs.readFileSync(backupPath);
  const backup = JSON.parse(raw.toString("utf8"));
  const { records, counts } = collectRecords(backup);
  const batches = [];
  for (let index = 0; index < records.length; index += batchSize) batches.push(records.slice(index, index + batchSize));

  const receipt = {
    ok: false,
    mode: dryRun ? "dry_run" : "live",
    generated_at: new Date().toISOString(),
    origin,
    backup_file: path.relative(ROOT, backupPath),
    backup_sha256: sha256(raw),
    source_counts: counts,
    total_records_seen: records.length,
    batch_size: batchSize,
    batch_count: batches.length,
    credential_source: gateAuth.credential?.key || "",
    imported: [],
    totals: { accepted: 0, skipped: 0 }
  };

  if (!dryRun) {
    for (let index = 0; index < batches.length; index += 1) {
      const item = await postBatch(origin, gateAuth.token, batches[index], index, batches.length);
      receipt.imported.push(item);
      receipt.totals.accepted += item.accepted;
      receipt.totals.skipped += item.skipped;
      console.log(JSON.stringify({ ok: true, batch: item.batch, accepted: item.accepted, skipped: item.skipped }));
    }
  }

  receipt.ok = true;
  receipt.completed_at = new Date().toISOString();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: true,
    mode: receipt.mode,
    source_counts: receipt.source_counts,
    total_records_seen: receipt.total_records_seen,
    totals: receipt.totals,
    receipt: OUT_FILE
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
