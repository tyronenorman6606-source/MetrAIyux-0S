#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = path.join(root, "metraiyux_0s_site");
const free99Dir = path.join(siteDir, "Free99");
const appDir = path.join(free99Dir, "apps");
const tmpScan = "/tmp/free99-scan";

throw new Error("tools/integrate-free99-apps.mjs is retired. It injects app-level free99-gate.js overlays, which violates the 0S Worker-owned auth architecture. Use the 0S Integration Agent workflow and enforceZeroOsGate instead.");

const apps = [
  {
    platform_id: "skyeopsconsole",
    slug: "skyeopsconsole",
    name: "SkyeOpsConsole v2.13",
    source: "skyeopsconsolev2.13",
    entry: "index.html",
    billing: "free99",
    price: "Free99 / $0",
    summary: "Offline operations console. This is the only no-charge app in the new Free99 intake."
  },
  {
    platform_id: "skyeapi-aegiscore",
    slug: "skyeapi-aegiscore",
    name: "SkyeAPI + AegisCore",
    source: "skyeapi-aegiscore-platform-v0.17.0/skyeapi-aegiscore-platform-v0.17.0",
    entry: "apps/console/index.html",
    secondary_entry: "apps/website/index.html",
    billing: "paid_pending_sku",
    price: "Usage-metered or quote after provider-cost review",
    summary: "Credential, capability, provider, and gateway control plane. Paid platform lane."
  },
  {
    platform_id: "sovereigndocs",
    slug: "sovereigndocs",
    name: "SovereignDocs v20",
    source: "sovereigndocs-recovered-v20/sovereigndocs",
    entry: "index.html",
    billing: "paid_pending_sku",
    price: "Plans: Starter/Growth/Pro/Enterprise; legal review uses SkyePay / Stripe checkout",
    summary: "Document workflow platform with export quotas, template library, partner review, and paid plans."
  },
  {
    platform_id: "kaixu-codestudio",
    slug: "kaixu-codestudio",
    name: "kAIxU CodeStudio Platform",
    source: "codestudio-platform-notheater-5.9.1",
    entry: "index.html",
    secondary_entry: "app/index.html",
    billing: "quote_only",
    price: "Quote after provider/backplane scope",
    summary: "Provider backplane, policy, and code platform with approval rules for costly calls."
  },
  {
    platform_id: "skaixu-code-evaluator",
    slug: "skaixu-code-evaluator",
    name: "skAIxU Code Evaluator",
    source: "skaixu-code-evaluator-platform-2.6.0",
    entry: "index.html",
    billing: "quote_only",
    price: "Quote after rubric/workflow scope",
    summary: "Evaluation platform with rubric, workflow, browser-proof, and seed materialization packs."
  },
  {
    platform_id: "skyevaultpro",
    slug: "skyevaultpro",
    name: "SkyeVaultPro",
    source: "skyevaultpro",
    entry: "index.html",
    billing: "paid_pending_scope",
    price: "Paid hosted backup, AI helper, or profile-sync lane after scope",
    summary: "Offline-first vault with hosted backup, AI helper, identity, and profile sync paths."
  },
  {
    platform_id: "doctor-ops-personal-vault",
    slug: "doctor-ops-personal-vault",
    name: "Doctor Ops Personal Vault",
    source: "doctor-ops-personal-vault-v6",
    entry: "index.html",
    billing: "paid_pending_owner_approval",
    price: "Personal subscription candidate; owner approval before checkout",
    summary: "Local-first personal doctor workflow vault. Not an EHR or regulated medical advice product."
  },
  {
    platform_id: "documorph",
    slug: "documorph",
    name: "Documorph",
    source: "skyesoverlondon-documorph",
    entry: "index.html",
    secondary_entry: "app/index.html",
    billing: "quote_only",
    price: "Quote after DB/runtime proof",
    summary: "Document transform app with database-backed runtime surfaces."
  },
  {
    platform_id: "skyearcade",
    slug: "skyearcade",
    name: "SkyeArcade Sovereign Vault",
    source: "skyearcade-sovereign-vault-v1.8.1/skyearcade_sovereign_vault_v1_8_1",
    entry: "index.html",
    billing: "paid_or_member_add_on",
    price: "Paid/member add-on candidate",
    summary: "Static game vault with local saves and upstream bridge events."
  },
  {
    platform_id: "skyebox-authenticator",
    slug: "skyebox-authenticator",
    name: "SkyeBox Authenticator Vault",
    source: "skye-box-authenticator-vault",
    entry: "index.html",
    billing: "bundle_candidate",
    price: "Local-first bundle candidate; no hosted recovery claim",
    summary: "Encrypted local TOTP vault using browser crypto. Hosted recovery must be scoped separately."
  },
  {
    platform_id: "kaixu-storefront",
    slug: "kaixu-storefront",
    name: "kAIxU Storefront",
    source: "kaixustorefront",
    entry: "index.html",
    billing: "catalog_source_only",
    price: "Catalog/source only, not direct checkout",
    summary: "Mini storefront and product-ecology source for future approved offers."
  }
];

function rel(from, to) {
  return path.relative(from, to).replaceAll(path.sep, "/") || ".";
}

function cpFiltered(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, {
    recursive: true,
    dereference: false,
    filter(source) {
      const base = path.basename(source);
      if ([".git", "node_modules", ".DS_Store"].includes(base)) return false;
      return true;
    }
  });
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

function escapeAttr(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

function injectGate(htmlFile, app) {
  void htmlFile;
  void app;
  // Mounted apps are protected by the main Worker through enforceZeroOsGate.
  // Do not inject app-local client auth overlays or fallback token prompts.
}

function patchMountedApp(app, dest) {
  if (app.slug !== "sovereigndocs") return;
  const workflowUi = path.join(dest, "assets", "workflow-ui.js");
  if (!fs.existsSync(workflowUi)) return;
  const source = fs.readFileSync(workflowUi, "utf8");
  if (source.startsWith("(() => {")) return;
  fs.writeFileSync(workflowUi, `(() => {\n${source}\n})();\n`);
}

function writeGateScript() {
  const gatePath = path.join(free99Dir, "free99-gate.js");
  if (fs.existsSync(gatePath)) return;
  fs.writeFileSync(gatePath, "(() => { console.warn('0S Worker owns mounted-app auth through enforceZeroOsGate.'); })();\n");
}

function writeHub() {
  const cards = apps.map((app) => {
    const href = `apps/${app.slug}/${app.entry}`;
    const secondary = app.secondary_entry ? `<a href="apps/${app.slug}/${app.secondary_entry}">Secondary surface</a>` : "";
    const freeClass = app.billing === "free99" ? " free" : "";
    return `<article class="app-card${freeClass}">
      <span>${app.billing === "free99" ? "Free99" : "Paid / gated"}</span>
      <h2>${app.name}</h2>
      <p>${app.summary}</p>
      <p><strong>${app.price}</strong></p>
      <div class="actions"><a class="primary" href="${href}">Open app</a>${secondary}</div>
      <code>platform_id=${app.platform_id}</code>
    </article>`;
  }).join("\n");
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Free99 Platform Intake · MetrAIyux 0S</title>
  <link rel="stylesheet" href="../style.css">
  <style>
    body{background:#060913;color:#f8fafc}
    .free99-shell{max-width:1180px;margin:0 auto;padding:28px}
    .app-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:24px}
    .app-card{border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:18px;background:rgba(255,255,255,.05)}
    .app-card.free{border-color:rgba(34,197,94,.55)}
    .app-card span{display:inline-block;margin-bottom:10px;color:#fde68a;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
    .app-card h2{margin:0 0 10px;font-size:24px;letter-spacing:0}
    .app-card p{color:#cbd5e1;line-height:1.5}
    .actions{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}
    .actions a,.top-actions a{border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:10px 12px;color:#fff;text-decoration:none;font-weight:800}
    .actions .primary,.top-actions .primary{background:#fde68a;color:#111827}
    code{white-space:normal;color:#a7f3d0}
  </style>
</head>
<body>
  <main class="free99-shell">
    <p class="eyebrow">0S mounted app intake</p>
    <h1>Free99 has one free app. The rest are paid platform lanes.</h1>
    <p class="hero-lede">Every app below is now unpacked under the 0S, wired with the shared Free99 platform gate, and tagged for FS27 usage splitting with <code>platform_id</code> and <code>usage_lane</code>. SkyeOpsConsole is the only Free99/no-charge lane.</p>
    <div class="top-actions">
      <a class="primary" href="../proof/free99-platform-intake-receipt.html">Open integration receipt</a>
      <a href="../operator/index.html">Operator center</a>
      <a href="../sales/live-proof-router.html">Proof router</a>
    </div>
    <section class="app-grid">
      ${cards}
    </section>
  </main>
</body>
</html>`;
  fs.writeFileSync(path.join(free99Dir, "index.html"), html);
}

function writeReceipt() {
  const rows = apps.map((app) => `<tr><td>${app.name}</td><td><code>${app.platform_id}</code></td><td>${app.billing}</td><td><a href="../Free99/apps/${app.slug}/${app.entry}">open</a></td></tr>`).join("");
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Free99 Platform Intake Receipt · MetrAIyux 0S</title>
  <link rel="stylesheet" href="../style.css">
  <style>table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border:1px solid rgba(255,255,255,.16);padding:12px;text-align:left}code{color:#a7f3d0}.receipt{max-width:1100px;margin:0 auto;padding:28px}</style>
</head>
<body>
  <main class="receipt">
    <p class="eyebrow">Integration receipt</p>
    <h1>Free99 app fleet is mounted under the 0S gate.</h1>
    <p>SkyeOpsConsole is the only Free99/no-charge app. Every Paid-Apps import is mounted for gated review and tagged for platform-aware usage splitting, but live paid use still requires owner-approved SKU/add-on activation.</p>
    <table><thead><tr><th>App</th><th>Platform</th><th>Billing state</th><th>Route</th></tr></thead><tbody>${rows}</tbody></table>
  </main>
</body>
</html>`;
  fs.mkdirSync(path.join(siteDir, "proof"), { recursive: true });
  fs.writeFileSync(path.join(siteDir, "proof", "free99-platform-intake-receipt.html"), html);
}

function writeManifest() {
  const manifest = {
    version: "2026-05-18-free99-app-mount",
    mounted_at: new Date().toISOString(),
    hub: "metraiyux_0s_site/Free99/index.html",
    gate_script: "metraiyux_0s_site/Free99/free99-gate.js",
    rule: "Only SkyeOpsConsole is Free99. Paid-Apps routes are mounted behind a gate and remain paid/pending owner approval.",
    apps: apps.map((app) => ({
      ...app,
      route: `metraiyux_0s_site/Free99/apps/${app.slug}/${app.entry}`,
      url: `../Free99/apps/${app.slug}/${app.entry}`
    }))
  };
  fs.writeFileSync(path.join(free99Dir, "app-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}

function insertBefore(source, marker, block) {
  if (source.includes(block.trim().slice(0, 80))) return source;
  const index = source.indexOf(marker);
  if (index === -1) return source;
  return source.slice(0, index) + block + "\n" + source.slice(index);
}

function updateRouteSurfaces() {
  const additions = [
    {
      file: path.join(siteDir, "operator", "index.html"),
      marker: "        <a class=\"route-card\" href=\"platform-integration-ledger.html\">",
      block: `        <a class="route-card" href="../Free99/index.html"><h3>Free99 Platform Intake</h3><p>Open the mounted SkyeOpsConsole Free99 app and every paid platform lane from the new Free99/Paid-Apps import.</p></a>
        <a class="route-card" href="../proof/free99-platform-intake-receipt.html"><h3>Free99 Intake Receipt</h3><p>Review the app mount, platform_id usage split, gate policy, and paid/free boundary.</p></a>`
    },
    {
      file: path.join(siteDir, "proof", "index.html"),
      marker: "      <a class=\"route-card\" href=\"../sales/live-proof-router.html\">",
      block: `      <a class="route-card" href="../Free99/index.html"><h3>Free99 Platform Intake</h3><p>Mounted app hub for SkyeOpsConsole and the paid platform intake under a shared 0S gate.</p></a>
      <a class="route-card" href="free99-platform-intake-receipt.html"><h3>Free99 Intake Receipt</h3><p>Proof that all Free99/Paid-Apps imports are mounted, gated, and tagged for platform-aware usage splitting.</p></a>`
    },
    {
      file: path.join(siteDir, "sales", "live-proof-router.html"),
      marker: "          <a class=\"button\" href=\"../live/marketing-made-easy-growth-suite.html\">Open Marketing Made Easy</a>",
      block: `          <a class="button" href="../Free99/index.html">Open Free99 Platform Intake</a>`
    }
  ];
  for (const item of additions) {
    if (!fs.existsSync(item.file)) continue;
    const current = fs.readFileSync(item.file, "utf8");
    fs.writeFileSync(item.file, insertBefore(current, item.marker, item.block));
  }
}

function updateJsonRegistries() {
  const gatewayPath = path.join(siteDir, "data", "skyepay-gateway.json");
  const gateway = JSON.parse(fs.readFileSync(gatewayPath, "utf8"));
  gateway.free99_non_checkout.skyeopsconsole = {
    label: "SkyeOpsConsole Free99",
    price: "$0 setup + $0/mo",
    url: "../Free99/apps/skyeopsconsole/index.html",
    checkout: false,
    gate_session_required: true,
    platform_id: "skyeopsconsole",
    copy: "SkyeOpsConsole is the only no-charge app in the new Free99 intake. It still requires a 0S or FS27 gate session."
  };
  gateway.free99_routes.skyeopsconsole = {
    label: "SkyeOpsConsole Free99 gated feature",
    price: "Free99 / $0",
    checkout: false,
    gate_session_required: true,
    platform_id: "skyeopsconsole",
    url: "../Free99/apps/skyeopsconsole/index.html"
  };
  gateway.free99_routes.free99_paid_platform_intake = {
    label: "Free99 Paid Platform Intake gated review hub",
    price: "Paid or quote-only lanes; no direct checkout until approved",
    checkout: false,
    gate_session_required: true,
    platform_id: "free99-paid-platform-intake",
    url: "../Free99/index.html"
  };
  gateway.updated_for = "free99-platform-app-mount";
  gateway.updated_at = "2026-05-18T00:00:00Z";
  fs.writeFileSync(gatewayPath, JSON.stringify(gateway, null, 2) + "\n");

  const registryPath = path.join(siteDir, "brain", "live-surface-registry.json");
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const surfaces = [
    {
      id: "free99-platform-intake-hub",
      name: "Free99 Platform Intake Hub",
      url: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/Free99/index.html",
      local_path: path.join(siteDir, "Free99", "index.html"),
      audience: "operators, buyers, technical evaluators",
      privacy: "gated review",
      purpose: "Mounted app hub for SkyeOpsConsole and every paid Free99/Paid-Apps platform lane.",
      route_when: ["free99", "paid platform intake", "new tech", "sovereigndocs", "skyeopsconsole"],
      sales_use: "Use when someone asks what came in with the new Free99 tech bundle and what is actually free.",
      primary_brain: "orion-hayes-brain",
      secondary_brain: "naomi-sterling-brain"
    },
    {
      id: "free99-platform-intake-receipt",
      name: "Free99 Platform Intake Receipt",
      url: "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/proof/free99-platform-intake-receipt.html",
      local_path: path.join(siteDir, "proof", "free99-platform-intake-receipt.html"),
      audience: "operators, proof reviewers",
      privacy: "public proof",
      purpose: "Receipt proving the Free99 app fleet is mounted under the 0S gate with platform-aware usage tags.",
      route_when: ["proof", "free99", "paid platform intake", "platform_id", "usage_lane"],
      sales_use: "Use after the hub when a buyer or operator asks whether all imported apps were actually wired.",
      primary_brain: "orion-hayes-brain",
      secondary_brain: "naomi-sterling-brain"
    }
  ];
  for (const surface of surfaces) {
    const index = registry.surfaces.findIndex((item) => item.id === surface.id);
    if (index >= 0) registry.surfaces[index] = surface;
    else registry.surfaces.push(surface);
  }
  registry.surface_count = registry.surfaces.length;
  registry.updated_at = "2026-05-18T00:00:00Z";
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
}

if (!fs.existsSync(tmpScan)) {
  throw new Error(`Missing ${tmpScan}. Run the Free99 extraction scan first.`);
}

fs.mkdirSync(appDir, { recursive: true });
writeGateScript();

for (const app of apps) {
  const src = path.join(tmpScan, app.source);
  const dest = path.join(appDir, app.slug);
  if (!fs.existsSync(src)) throw new Error(`Missing source for ${app.slug}: ${src}`);
  console.log(`Mounting ${app.platform_id} -> ${rel(root, dest)}`);
  cpFiltered(src, dest);
  patchMountedApp(app, dest);
  for (const htmlFile of walkFiles(dest).filter((file) => file.toLowerCase().endsWith(".html"))) {
    injectGate(htmlFile, app);
  }
}

writeHub();
writeReceipt();
writeManifest();
updateRouteSurfaces();
updateJsonRegistries();

console.log(JSON.stringify({
  ok: true,
  mounted_apps: apps.length,
  hub: rel(root, path.join(free99Dir, "index.html")),
  manifest: rel(root, path.join(free99Dir, "app-manifest.json"))
}, null, 2));
