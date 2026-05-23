import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const PLATFORM_SOURCES_ROOT = path.resolve(ROOT, "..");
const NORTHSTAR_PROJECT_ROOT = path.join(PLATFORM_SOURCES_ROOT, "glendale-northstar-valley-verified-v6-final");
const STAGING_ROOT = path.join(NORTHSTAR_PROJECT_ROOT, "valley-verified-override-staging");
const GENERATOR = path.join(NORTHSTAR_PROJECT_ROOT, "scripts", "generate-valley-override-staging.mjs");
const TARGETS = [
  path.join(ROOT, "dist"),
  path.join(ROOT, "dist-cloudflare-pages")
];

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(target) {
  await fs.mkdir(target, { recursive: true });
}

async function copyTree(source, destination) {
  await ensureDir(destination);
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(source, entry.name);
    const dest = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyTree(src, dest);
      continue;
    }
    await ensureDir(path.dirname(dest));
    await fs.copyFile(src, dest);
  }
}

function html(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function walkHtml(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walkHtml(full));
    else if (entry.name === "index.html") out.push(full);
  }
  return out;
}

async function enhanceCopiedBusinessPages(targetRoot) {
  const businessRoot = path.join(targetRoot, "business");
  const files = await walkHtml(businessRoot);
  let changed = 0;
  for (const file of files) {
    const rel = path.relative(businessRoot, file).replace(/\\/g, "/");
    const businessId = rel.split("/")[0];
    if (!businessId || rel !== `${businessId}/index.html`) continue;
    let body = await fs.readFile(file, "utf8");
    const before = body;
    if (body.includes("</head>") && !body.includes("/assets/valley-brain.css")) {
      body = body.replace("</head>", '<link rel="stylesheet" href="/assets/valley-brain.css"></head>');
    }
    const needsActionStrip = !body.includes("/claim/?business=") || !body.includes("/request/?business=") || !body.includes("Save shortlist") || !body.includes("/compare/?ids=");
    if (needsActionStrip) {
      const actionStrip = `<section class="section glass vv-profile-action-strip"><div class="section-head"><div><p class="eyebrow">Business actions</p><h2>Claim, request, save, or compare this profile.</h2></div></div><div class="button-row"><a class="btn primary" href="/claim/?business=${html(businessId)}">Claim / update</a><a class="btn" href="/request/?business=${html(businessId)}">Request quote</a><button class="btn" data-save-business data-business-id="${html(businessId)}" data-business-name="${html(businessId.replaceAll("-", " "))}" data-url="/business/${html(businessId)}/">Save shortlist</button><a class="btn" href="/compare/?ids=${html(businessId)}">Compare</a></div></section>`;
      body = body.includes("</main>") ? body.replace("</main>", `${actionStrip}</main>`) : body.replace("</body>", `${actionStrip}</body>`);
    }
    if (body.includes("</body>") && !body.includes("/assets/valley-brain.js")) {
      body = body.replace("</body>", '<script type="module" src="/assets/valley-brain.js"></script></body>');
    }
    if (body !== before) {
      await fs.writeFile(file, body, "utf8");
      changed += 1;
    }
  }
  return changed;
}

const refresh = spawnSync(process.execPath, [GENERATOR], {
  cwd: NORTHSTAR_PROJECT_ROOT,
  stdio: "inherit",
  env: process.env
});

if (refresh.status !== 0) {
  console.error("NorthStar override staging generation failed.");
  process.exit(refresh.status || 1);
}

const copied = [];
let enhancedBusinessPages = 0;
for (const target of TARGETS) {
  if (!(await exists(target))) continue;
  await copyTree(path.join(STAGING_ROOT, "business"), path.join(target, "business"));
  await copyTree(path.join(STAGING_ROOT, "_shared"), path.join(target, "_shared"));
  enhancedBusinessPages += await enhanceCopiedBusinessPages(target);
  copied.push(path.relative(ROOT, target));
}

const receipt = {
  generated_at: new Date().toISOString(),
  staging_root: path.relative(ROOT, STAGING_ROOT),
  copied_targets: copied,
  business_pages_root: "business/",
  shared_assets_root: "_shared/",
  enhanced_business_pages: enhancedBusinessPages,
  valley_brain_assets: ["/assets/valley-brain.css", "/assets/valley-brain.js"],
  standard_actions: ["claim", "request", "save_shortlist", "compare"]
};

await fs.writeFile(
  path.join(STAGING_ROOT, "SYNC_RECEIPT.json"),
  JSON.stringify(receipt, null, 2) + "\n",
  "utf8"
);

console.log(path.join(STAGING_ROOT, "SYNC_RECEIPT.json"));
console.log(`targets_synced=${copied.length}`);
console.log(`enhanced_business_pages=${enhancedBusinessPages}`);
