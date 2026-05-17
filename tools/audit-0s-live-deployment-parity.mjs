import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = process.env.SITE_DIR || path.join(root, "metraiyux_0s_site");
const baseUrl = process.env.BASE_URL || "https://metraiyux-0s-full-system.graylondonskyes.workers.dev/";
const reportPath = process.env.REPORT_PATH || path.join(root, "test-artifacts", "0s-live-deployment-parity.json");
const concurrency = Math.max(1, Number(process.env.LIVE_PARITY_CONCURRENCY || 12));
const failures = [];

const ignoredDirs = new Set([".git", ".wrangler", "node_modules", "coming-soon", "live"]);

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function rel(filePath) {
  return path.relative(siteDir, filePath).split(path.sep).join("/");
}

function routeFor(relativePath) {
  return new URL(relativePath, baseUrl).href;
}

function titleOf(html) {
  return normalizeText((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
}

function h1Of(html) {
  return normalizeText((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]?.replace(/<[^>]+>/g, "") || "");
}

function expectedSignatures(localHtml) {
  const title = titleOf(localHtml);
  const h1 = h1Of(localHtml);
  return { title, h1 };
}

function liveIncludes(liveHtml, value) {
  if (!value) return false;
  const needle = value.slice(0, 120);
  if (!needle) return true;
  return normalizeText(liveHtml).includes(needle);
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

async function fetchRoute(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "MetrAIyux-0S-live-parity-audit/1.0" }
    });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      final_url: res.url,
      content_type: res.headers.get("content-type") || "",
      bytes: text.length,
      text
    };
  } catch (error) {
    return { ok: false, status: 0, final_url: url, content_type: "", bytes: 0, error: error?.message || String(error), text: "" };
  } finally {
    clearTimeout(timer);
  }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const htmlFiles = (await walk(siteDir)).sort();
let checked = 0;
const results = await mapLimit(htmlFiles, concurrency, async (file) => {
  const relative = rel(file);
  const localHtml = await fs.readFile(file, "utf8");
  const signatures = expectedSignatures(localHtml);
  const route = routeFor(relative);
  const live = await fetchRoute(route);
  const isHtml = /text\/html/i.test(live.content_type) || live.text.includes("<html");
  const titleMatch = live.ok && isHtml && liveIncludes(live.text, signatures.title);
  const h1Match = live.ok && isHtml && liveIncludes(live.text, signatures.h1);
  const hasSignature = Boolean(signatures.title || signatures.h1);
  const signatureMatch = !hasSignature || titleMatch || h1Match;
  const drift = live.ok && isHtml && signatureMatch && signatures.title && !titleMatch
    ? "title_drift"
    : null;
  const ok = live.ok && isHtml && signatureMatch;
  checked += 1;
  if (checked % 50 === 0 || checked === htmlFiles.length) {
    console.log(`[0S live parity] ${checked}/${htmlFiles.length}`);
  }
  return {
    ok,
    relative,
    route,
    final_url: live.final_url,
    status: live.status,
    bytes: live.bytes,
    signatures,
    title_match: titleMatch,
    h1_match: h1Match,
    drift,
    live_title: titleOf(live.text),
    reason: ok ? null : (!live.ok ? "not_served" : !isHtml ? "not_html" : "signature_mismatch"),
    error: live.error || null
  };
});

const missing = results.filter((row) => !row.ok);
const drift = results.filter((row) => row.drift);
const sampleMissing = missing.slice(0, 100);
const training = results.filter((row) => row.relative.startsWith("training-academy/"));
const newVisuals = results.filter((row) => [
  "saas/customer-data.html",
  "saas/customer-dashboard.html",
  "saas/index.html"
].includes(row.relative));

const report = {
  ok: missing.length === 0,
  checked_at: new Date().toISOString(),
  base_url: baseUrl,
  site_dir: siteDir,
  total_html: results.length,
  live_ok: results.length - missing.length,
  live_missing_or_stale: missing.length,
  content_drift: drift.length,
  training_academy: training.map(({ relative, ok, route, final_url, status, live_title, reason }) => ({ relative, ok, route, final_url, status, live_title, reason })),
  current_visual_surfaces: newVisuals.map(({ relative, ok, route, final_url, status, live_title, reason }) => ({ relative, ok, route, final_url, status, live_title, reason })),
  drift_sample: drift.slice(0, 100).map(({ relative, route, final_url, status, drift, signatures, live_title, bytes }) => ({ relative, route, final_url, status, drift, signatures, live_title, bytes })),
  missing_sample: sampleMissing.map(({ relative, route, final_url, status, reason, signatures, live_title, bytes, error }) => ({ relative, route, final_url, status, reason, signatures, live_title, bytes, error })),
  results
};

await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (missing.length) {
  console.error(`0S live deployment parity failed: ${missing.length}/${results.length} local HTML routes are not live or do not match Cloudflare.`);
  console.error(`Report: ${reportPath}`);
  for (const row of sampleMissing.slice(0, 20)) {
    console.error(`- ${row.relative} -> ${row.status} ${row.reason} (${row.final_url})`);
  }
  process.exit(1);
}

console.log(`0S live deployment parity passed: ${results.length} local HTML routes match Cloudflare.`);
console.log(`Report: ${reportPath}`);
