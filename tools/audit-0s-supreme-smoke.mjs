#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const artifactRoot = path.join(repoRoot, "test-artifacts", "0s-supreme-audit");
const artifactDir = path.join(artifactRoot, stamp);
const latestPath = path.join(artifactRoot, "supreme-audit-latest.json");

const config = {
  zeroOsBase: String(process.env.ZERO_OS_LIVE_BASE || "https://metraiyux-0s-full-system.graylondonskyes.workers.dev").replace(/\/+$/, ""),
  marketingBase: String(process.env.ZERO_OS_MARKETING_BASE || "https://metraiyux-0s-marketing.pages.dev").replace(/\/+$/, ""),
  skyemailBase: String(process.env.SKYEMAIL_LIVE_BASE || "https://skyemail-platform.graylondonskyes.workers.dev").replace(/\/+$/, ""),
  skygateBase: String(process.env.SKYGATE_LIVE_BASE || "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev").replace(/\/+$/, ""),
  cycles: Number(process.env.AUDIT_STRESS_CYCLES || 1),
  concurrency: Number(process.env.AUDIT_CONCURRENCY || 8),
};

const fatalBodyMarkers = [
  "Cloudflare SkyeMail API route not implemented",
  "SkyeNet route not found",
  "Server functions not found",
  "Cannot GET",
  "Cannot POST",
  "Internal Server Error",
  "Worker threw exception",
  "No such function",
];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function stripHtml(html) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseAppDefs() {
  const source = read(path.join(repoRoot, "metraiyux_0s_site", "0s", "os.js"));
  const appBlocks = [...source.matchAll(/\{\s*id:\s*"([^"]+)"[\s\S]*?\n\s*\}/g)].map((match) => match[0]);
  const apps = [];
  for (const block of appBlocks) {
    const pick = (key) => block.match(new RegExp(`${key}:\\s*"([^"]+)"`))?.[1] || null;
    const id = pick("id");
    const name = pick("name");
    if (!id || !name) continue;
    apps.push({
      id,
      name,
      kind: pick("kind") || "unknown",
      url: pick("url"),
      summary: pick("summary") || "",
    });
  }
  return apps;
}

function parseDossiers() {
  const file = path.join(repoRoot, "marketing", "metraiyux-0s", "data", "platform-dossiers.json");
  if (!fs.existsSync(file)) return [];
  const data = JSON.parse(read(file));
  return Array.isArray(data.platforms) ? data.platforms : [];
}

function resolveMountedPath(url) {
  if (!url || /^https?:\/\//i.test(url)) return null;
  const normalized = path.posix.normalize(`/0s/${url.replace(/^\.\.\//, "")}`);
  return normalized;
}

const routeContracts = [
  {
    group: "marketing",
    name: "0S mega dossier",
    url: `${config.marketingBase}/0s-dossier`,
    expectStatus: [200],
    mustInclude: ["sovereign operating layer"],
  },
  {
    group: "marketing",
    name: "platform dossier hub",
    url: `${config.marketingBase}/platform-dossiers/`,
    expectStatus: [200],
    mustInclude: ["Platform Dossier Hub"],
  },
  {
    group: "marketing",
    name: "SkyeNet dossier",
    url: `${config.marketingBase}/skyenet`,
    expectStatus: [200],
    mustInclude: ["SkyeNet"],
    mustNotInclude: ["Cloudflare"],
  },
  {
    group: "skyemail",
    name: "SkyEmail home",
    url: `${config.skyemailBase}/`,
    expectStatus: [200],
    mustInclude: ["SkyeMail"],
  },
  {
    group: "skyemail",
    name: "SkyEmail founder page",
    url: `${config.skyemailBase}/founder`,
    expectStatus: [200],
    mustInclude: ["Gray Skyes"],
  },
  {
    group: "skyemail",
    name: "SkyEmail admin recovery key direct",
    url: `${config.skyemailBase}/admin-public-key`,
    expectStatus: [200],
    expectJson: (body) => body?.enabled === true && typeof body?.public_key_pem === "string",
  },
  {
    group: "skyemail",
    name: "SkyEmail Netlify .js signup compatibility",
    url: `${config.skyemailBase}/.netlify/functions/skymail-standalone-auth-signup.js`,
    method: "POST",
    body: {},
    expectStatus: [410],
    mustInclude: ["app_local_auth_disabled_by_shared_gate"],
  },
  {
    group: "skyemail",
    name: "SkyEmail API .js signup compatibility",
    url: `${config.skyemailBase}/api/auth-signup.js`,
    method: "POST",
    body: {},
    expectStatus: [410],
    mustInclude: ["app_local_auth_disabled_by_shared_gate"],
  },
  {
    group: "skygate",
    name: "SkyGate/Citadel health or gate",
    url: `${config.skygateBase}/health`,
    expectStatus: [200, 401, 403, 404],
  },
  {
    group: "0s",
    name: "0S owner login reachable",
    url: `${config.zeroOsBase}/admin/login.html`,
    expectStatus: [200, 302],
    mustNotInclude: ["not found"],
  },
  {
    group: "0s",
    name: "SkyeNet gated mount resolves or gates",
    url: `${config.zeroOsBase}/skyenet/index.html`,
    expectStatus: [200, 302, 401, 403],
    mustNotInclude: ["SkyeNet route not found"],
  },
];

for (const dossier of parseDossiers()) {
  if (!dossier?.slug) continue;
  routeContracts.push({
    group: "marketing-dossier",
    name: `${dossier.name || dossier.slug} dossier`,
    url: `${config.marketingBase}/platform-dossiers/${dossier.slug}`,
    expectStatus: [200],
    mustInclude: [dossier.name || dossier.slug],
  });
}

const mountedApps = parseAppDefs()
  .filter((app) => app.url)
  .map((app) => ({ ...app, mountedPath: resolveMountedPath(app.url) }))
  .filter((app) => app.mountedPath);

for (const app of mountedApps) {
  routeContracts.push({
    group: "0s-mounted-app",
    name: app.name,
    app_id: app.id,
    app_kind: app.kind,
    url: `${config.zeroOsBase}${app.mountedPath}`,
    expectStatus: [200, 302, 401, 403],
    mustNotInclude: ["not found", "route not found", "Cannot GET"],
  });
}

async function timedFetch(contract) {
  const started = performance.now();
  const response = await fetch(contract.url, {
    method: contract.method || "GET",
    redirect: "manual",
    headers: {
      accept: "application/json,text/html,text/plain;q=0.9,*/*;q=0.8",
      ...(contract.body ? { "content-type": "application/json" } : {}),
    },
    body: contract.body ? JSON.stringify(contract.body) : undefined,
  });
  const ms = Math.round(performance.now() - started);
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text().catch(() => "");
  let json = null;
  if (contentType.includes("json") || raw.trim().startsWith("{")) {
    try {
      json = JSON.parse(raw);
    } catch {}
  }
  return {
    ...contract,
    status: response.status,
    ok: response.ok,
    ms,
    contentType,
    location: response.headers.get("location") || null,
    bodyText: raw.slice(0, 1500),
    textForSearch: stripHtml(raw).slice(0, 1500),
    json,
  };
}

function verify(result) {
  const failures = [];
  if (!result.expectStatus.includes(result.status)) failures.push(`status ${result.status} not in ${result.expectStatus.join(",")}`);
  const haystack = `${result.bodyText}\n${result.textForSearch}`;
  const forbidden = [...fatalBodyMarkers, ...(result.mustNotInclude || [])];
  for (const marker of forbidden) {
    if (haystack.toLowerCase().includes(String(marker).toLowerCase())) failures.push(`forbidden marker found: ${marker}`);
  }
  for (const marker of result.mustInclude || []) {
    if (!haystack.includes(marker)) failures.push(`required marker missing: ${marker}`);
  }
  if (result.expectJson && result.expectJson(result.json) !== true) failures.push("JSON contract failed");
  return failures;
}

async function runPool(items, worker) {
  const queue = [...items];
  const results = [];
  const workers = Array.from({ length: Math.max(1, Math.min(config.concurrency, queue.length)) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      results.push(await worker(item));
    }
  });
  await Promise.all(workers);
  return results;
}

await fsp.mkdir(artifactDir, { recursive: true });

const expanded = [];
for (let cycle = 0; cycle < Math.max(1, config.cycles); cycle += 1) {
  for (const contract of routeContracts) expanded.push({ ...contract, cycle });
}

const results = await runPool(expanded, async (contract) => {
  try {
    const result = await timedFetch(contract);
    const failures = verify(result);
    return {
      group: result.group,
      name: result.name,
      app_id: result.app_id || null,
      app_kind: result.app_kind || null,
      cycle: result.cycle,
      method: result.method || "GET",
      url: result.url,
      status: result.status,
      ms: result.ms,
      contentType: result.contentType,
      location: result.location,
      failures,
      ok: failures.length === 0,
    };
  } catch (error) {
    return {
      group: contract.group,
      name: contract.name,
      app_id: contract.app_id || null,
      app_kind: contract.app_kind || null,
      cycle: contract.cycle,
      method: contract.method || "GET",
      url: contract.url,
      status: 0,
      ms: 0,
      contentType: "",
      location: null,
      failures: [error.message],
      ok: false,
    };
  }
});

const durations = results.map((item) => item.ms).filter(Boolean).sort((a, b) => a - b);
const p95 = durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))] || 0;
const failures = results.filter((item) => !item.ok);
const byGroup = {};
for (const result of results) {
  byGroup[result.group] ||= { total: 0, ok: 0, failed: 0 };
  byGroup[result.group].total += 1;
  byGroup[result.group][result.ok ? "ok" : "failed"] += 1;
}

const receipt = {
  ok: failures.length === 0,
  generated_at: new Date().toISOString(),
  config,
  inventory: {
    registered_0s_apps: parseAppDefs().length,
    mounted_0s_apps: mountedApps.length,
    public_dossiers: parseDossiers().length,
    contracts_per_cycle: routeContracts.length,
    total_requests: results.length,
  },
  latency: {
    p95_ms: p95,
    max_ms: durations.at(-1) || 0,
    min_ms: durations[0] || 0,
  },
  by_group: byGroup,
  failures,
  results,
  next_stage: [
    "Add authenticated owner-session API workflows per app.",
    "Add browser-level visual receipts when owner allows browser proof.",
    "Add synthetic signup/drop/send/reply scenarios against paid-safe sandboxes.",
  ],
};

await fsp.writeFile(path.join(artifactDir, "receipt.json"), JSON.stringify(receipt, null, 2));
await fsp.writeFile(latestPath, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({
  ok: receipt.ok,
  generated_at: receipt.generated_at,
  inventory: receipt.inventory,
  latency: receipt.latency,
  by_group: receipt.by_group,
  failures: receipt.failures.slice(0, 20),
  receipt: latestPath,
}, null, 2));

if (!receipt.ok) process.exit(1);
