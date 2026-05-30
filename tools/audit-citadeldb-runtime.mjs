#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "test-artifacts", "citadeldb-runtime-audit");
const outFile = path.join(outDir, "receipt.json");
const wranglerPath = path.join(repoRoot, "metraiyux_0s_site", "wrangler.toml");
const adapterPath = path.join(repoRoot, "metraiyux_0s_site", "cloudflare", "citadeldb-adapter.mjs");

function run(command, args) {
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: "utf8" });
  return {
    status: result.status ?? 0,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

function parseProcesses(text) {
  return text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/);
      if (!match) return null;
      return {
        pid: Number(match[1]),
        ppid: Number(match[2]),
        command: match[3],
        args: match[4]
      };
    })
    .filter(Boolean);
}

function localDbMatches(processes) {
  const currentPid = process.pid;
  const dbServerPattern = /\b(postgres|postmaster|pg_ctl|initdb|citadeldb-server)\b/i;
  const edgeDevPattern = /^(workerd|wrangler)$/i;
  return processes.filter((item) => {
    if (item.pid === currentPid || item.ppid === currentPid) return false;
    if (/audit-citadeldb-runtime|rg -i|ps -eo/.test(item.args)) return false;
    return dbServerPattern.test(`${item.command} ${item.args}`) || edgeDevPattern.test(item.command);
  });
}

function parseListeners(text) {
  return text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^LISTEN\b/.test(line))
    .map((line) => ({
      raw: line,
      local: line.match(/\s(127\.0\.0\.1|\[::1\]|0\.0\.0\.0|\[::\]):?(\d+)\s/)?.[0]?.trim() || "",
      process: line.match(/users:\(\("([^"]+)",pid=(\d+)/)?.slice(1, 3) || null
    }));
}

function findDbFiles() {
  const result = run("find", [
    ".",
    "-maxdepth", "4",
    "(",
    "-name", "*.db",
    "-o", "-name", "*.sqlite",
    "-o", "-name", "*.sqlite3",
    "-o", "-name", "postmaster.pid",
    "-o", "-name", "PG_VERSION",
    ")",
    "-not", "-path", "./node_modules/*",
    "-not", "-path", "./.git/*",
    "-not", "-path", "./.wrangler/*",
    "-not", "-path", "./test-artifacts/*"
  ]);
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

const ps = run("ps", ["-eo", "pid,ppid,comm,args"]);
const processes = parseProcesses(ps.stdout);
const dbProcesses = localDbMatches(processes);
const listeners = parseListeners(run("ss", ["-ltnp"]).stdout);
const dbFiles = findDbFiles();
const wrangler = fs.existsSync(wranglerPath) ? fs.readFileSync(wranglerPath, "utf8") : "";
const adapter = fs.existsSync(adapterPath) ? fs.readFileSync(adapterPath, "utf8") : "";

const receipt = {
  ok: dbProcesses.length === 0,
  generated_at: new Date().toISOString(),
  repo_root: repoRoot,
  local_runtime: {
    citadel_database_running_on_local_machine: dbProcesses.length > 0,
    matching_processes: dbProcesses.map((item) => ({
      pid: item.pid,
      command: item.command,
      args: item.args
    })),
    listening_ports: listeners,
    local_database_files_found: dbFiles
  },
  cloudflare_runtime: {
    worker: "metraiyux-0s-full-system",
    site_events_kv_binding_configured: /binding\s*=\s*"SITE_EVENTS_KV"/.test(wrangler),
    citadeldb_kv_binding_configured: /binding\s*=\s*"CITADELDB_KV"/.test(wrangler),
    d1_binding_configured: /\[\[d1_databases\]\]/.test(wrangler) && /binding\s*=\s*"CITADELDB"/.test(wrangler),
    d1_database_name: (wrangler.match(/database_name\s*=\s*"([^"]*citadel[^"]*)"/i) || [])[1] || "",
    d1_database_id_present: /database_id\s*=\s*"5b572a90-75e0-4126-8d91-0bf370a8ba9d"/.test(wrangler),
    adapter_storage_expression: adapter.includes("env.CITADELDB || env.CITADELDB_D1")
      ? "env.CITADELDB || env.CITADELDB_D1 || env.METRAIYUX_CITADELDB"
      : "not_detected",
    mounted_route: "/api/citadel/*",
    current_lane: "CitadelDB Edge on Cloudflare Worker + dedicated Cloudflare D1 database",
    receipt_mirror: "SITE_EVENTS_KV remains a secondary receipt mirror/fallback.",
    next_hardening_lane: "Add Durable Objects SQLite for tenant locks/live coordination and Queues/Workflows for background catch-up when volume requires it."
  },
  operator_411: [
    "No local CitadelDB or Postgres server process is expected for production.",
    "CitadelDB is now configured as a dedicated Cloudflare D1 database bound to the 0S Worker as CITADELDB.",
    "Neon can remain an upstream sync source during cutover, but payload-backed writes are mirrored into CitadelDB D1 and catch-up jobs track any missing row payloads.",
    "SITE_EVENTS_KV remains a receipt mirror/fallback, not the primary CitadelDB database."
  ]
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({
  ok: receipt.ok,
  local_citadel_database_running: receipt.local_runtime.citadel_database_running_on_local_machine,
  site_events_kv_binding_configured: receipt.cloudflare_runtime.site_events_kv_binding_configured,
  d1_binding_configured: receipt.cloudflare_runtime.d1_binding_configured,
  receipt: path.relative(repoRoot, outFile)
}, null, 2));

if (!receipt.ok) process.exit(1);
