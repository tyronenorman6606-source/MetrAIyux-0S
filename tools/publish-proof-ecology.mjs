#!/usr/bin/env node
import fs from "fs";
import path from "path";

const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const artifactRoot = path.join(repoRoot, "test-artifacts");
const siteRoot = path.join(repoRoot, "marketing", "metraiyux-0s");
const ecologyDir = path.join(siteRoot, "proof-ecology");
const ledgerPath = path.join(ecologyDir, "ledger.json");
const pagePath = path.join(siteRoot, "proof-ecology.html");
const cssPath = path.join(ecologyDir, "proof-ecology.css");
const jsPath = path.join(ecologyDir, "proof-ecology.js");
const maxPublished = Number(process.env.PROOF_ECOLOGY_LIMIT || 240);

const proofNameHints = [
  "proof",
  "receipt",
  "report",
  "browser",
  "qa",
  "mcp",
  "stress",
  "smoke",
  "live",
  "deploy"
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (!/\.(json|md)$/i.test(entry.name)) continue;
    const rel = path.relative(repoRoot, fullPath).replaceAll(path.sep, "/");
    const lower = rel.toLowerCase();
    if (!proofNameHints.some((hint) => lower.includes(hint))) continue;
    files.push(fullPath);
  }
  return files;
}

function statSafe(file) {
  try {
    return fs.statSync(file);
  } catch {
    return null;
  }
}

function readText(file, limit = 1_000_000) {
  const stat = statSafe(file);
  if (!stat) return "";
  const fd = fs.openSync(file, "r");
  try {
    const bytes = Math.min(stat.size, limit);
    const buffer = Buffer.alloc(bytes);
    fs.readSync(fd, buffer, 0, bytes, 0);
    return buffer.toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function titleCase(value) {
  return String(value || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function compact(value, limit = 170) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function pushUnique(list, value, limit = 18) {
  if (!value || list.length >= limit) return;
  const normalized = String(value).trim();
  if (!normalized || list.includes(normalized)) return;
  list.push(normalized);
}

function collect(data, predicate, out = [], limit = 2000) {
  if (out.length >= limit) return out;
  if (Array.isArray(data)) {
    for (const item of data) collect(item, predicate, out, limit);
    return out;
  }
  if (!isPlainObject(data)) return out;
  for (const [key, value] of Object.entries(data)) {
    if (predicate(key, value)) out.push(value);
    if (out.length >= limit) return out;
    if (isPlainObject(value) || Array.isArray(value)) collect(value, predicate, out, limit);
  }
  return out;
}

function countNamedArrays(data, names) {
  return collect(data, (key, value) => names.includes(key) && Array.isArray(value))
    .reduce((sum, value) => sum + value.length, 0);
}

function countFailures(data) {
  let count = 0;
  for (const failureList of collect(data, (key, value) => /failures?|errors?/i.test(key) && Array.isArray(value))) {
    count += failureList.length;
  }
  for (const okValue of collect(data, (key, value) => key === "ok" && typeof value === "boolean")) {
    if (okValue === false) count += 1;
  }
  return count;
}

function collectStatuses(data) {
  return [...new Set(collect(data, (key, value) => /status/i.test(key) && Number.isFinite(value))
    .map((value) => Number(value))
    .filter((value) => value >= 100 && value <= 599))]
    .sort((a, b) => a - b);
}

function collectUrls(data) {
  const urls = [];
  const add = (value) => {
    if (typeof value === "string" && /^https?:\/\//i.test(value)) pushUnique(urls, value, 16);
  };
  collect(data, (key, value) => {
    if (/url|href|surface|base/i.test(key)) {
      if (typeof value === "string") add(value);
      if (Array.isArray(value)) value.forEach((item) => {
        if (typeof item === "string") add(item);
        if (isPlainObject(item)) Object.values(item).forEach(add);
      });
    }
    return false;
  });
  return urls;
}

function collectViewports(data) {
  const seen = new Set();
  const viewports = [];
  collect(data, (key, value) => {
    if ((key === "viewport" || key === "viewports") && (isPlainObject(value) || Array.isArray(value))) {
      const items = Array.isArray(value) ? value : [value];
      for (const item of items) {
        if (!isPlainObject(item)) continue;
        const width = Number(item.width);
        const height = Number(item.height);
        if (!width || !height) continue;
        const label = item.name ? `${item.name}: ${width}x${height}` : `${width}x${height}`;
        if (!seen.has(label)) {
          seen.add(label);
          viewports.push(label);
        }
      }
    }
    return false;
  });
  return viewports.slice(0, 8);
}

function inferCategory(relPath, data) {
  const lower = relPath.toLowerCase();
  const haystack = `${lower} ${firstString(data?.product, data?.name, data?.surface, data?.url)}`.toLowerCase();
  if (haystack.includes("live-browser") || haystack.includes("headed")) return "Headed Browser";
  if (haystack.includes("mcp")) return "MCP Tooling";
  if (haystack.includes("free99")) return "Free99 / Gate";
  if (haystack.includes("keygate") || haystack.includes("key-gate")) return "Key Gate";
  if (haystack.includes("company-knowledge")) return "Company Knowledge";
  if (haystack.includes("skyeroutex") || haystack.includes("routex")) return "SkyeRouteX";
  if (haystack.includes("stripe") || haystack.includes("pricing")) return "Pricing / Stripe";
  if (haystack.includes("vault") || haystack.includes("skysecure")) return "Vault / Security";
  if (haystack.includes("marketing")) return "Marketing Surface";
  if (haystack.includes("deploy")) return "Deployment";
  return "Proof Receipt";
}

function inferStatus(data, failures) {
  if (data?.ok === true) return "pass";
  if (data?.ok === false) return failures > 0 ? "attention" : "mixed";
  if (failures > 0) return "attention";
  return "recorded";
}

function timeFromData(data, stat) {
  return firstString(
    data?.generatedAt,
    data?.checkedAt,
    data?.completedAt,
    data?.createdAt,
    data?.timestamp,
    data?.time
  ) || stat.mtime.toISOString();
}

function summarizeJson(file, relPath, stat, data) {
  const failures = countFailures(data);
  const actions = countNamedArrays(data, ["actions"]);
  const scrollStops = countNamedArrays(data, ["scrollStops", "scroll_stops"]);
  const checks = countNamedArrays(data, ["checks"]);
  const statuses = collectStatuses(data);
  const urls = collectUrls(data);
  const viewports = collectViewports(data);
  const status = inferStatus(data, failures);
  const mode = firstString(data.mode, data.browser, data.version);
  const headless = typeof data.headless === "boolean" ? data.headless : null;
  const title = firstString(
    data.product,
    data.name,
    data.title,
    data.surface,
    data.productionUrl,
    data.url
  ) || titleCase(path.basename(file));
  const highlights = [];
  if (mode) pushUnique(highlights, mode);
  if (headless === false) pushUnique(highlights, "headed browser");
  if (viewports.length) pushUnique(highlights, `${viewports.length} viewport${viewports.length === 1 ? "" : "s"}`);
  if (actions) pushUnique(highlights, `${actions} recorded action${actions === 1 ? "" : "s"}`);
  if (scrollStops) pushUnique(highlights, `${scrollStops} scroll stop${scrollStops === 1 ? "" : "s"}`);
  if (statuses.length) pushUnique(highlights, `HTTP ${statuses.join(", ")}`);
  if (failures === 0) pushUnique(highlights, "no recorded failures");
  else pushUnique(highlights, `${failures} attention signal${failures === 1 ? "" : "s"}`);
  if (urls.length) pushUnique(highlights, `${urls.length} live URL${urls.length === 1 ? "" : "s"}`);

  return {
    id: relPath.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120),
    type: "json",
    title: compact(title, 120),
    category: inferCategory(relPath, data),
    status,
    ok: data?.ok === true,
    generatedAt: timeFromData(data, stat),
    updatedAt: stat.mtime.toISOString(),
    source: relPath,
    size: stat.size,
    sizeLabel: formatBytes(stat.size),
    mode,
    headless,
    urls,
    primaryUrl: firstString(data.productionUrl, data.surface, data.url, data.base_url, urls[0]),
    viewports,
    counts: {
      actions,
      scrollStops,
      checks,
      failures,
      statuses: statuses.length
    },
    statuses,
    highlights,
    summary: compact(`${status.toUpperCase()}: ${highlights.join(" / ")}`, 220)
  };
}

function summarizeMarkdown(file, relPath, stat, text) {
  const heading = text.match(/^#\s+(.+)$/m)?.[1] || titleCase(path.basename(file));
  const firstParagraph = text
    .split(/\n\s*\n/)
    .map((part) => part.replace(/^#+\s+/gm, "").trim())
    .find((part) => part && !part.startsWith("|")) || "";
  const lower = text.toLowerCase();
  const failures = /\bfail(ed|ure|ures)\b/.test(lower) && !/\bno failures?\b/.test(lower) ? 1 : 0;
  const status = /pass(ed|ing)?|verified|live/.test(lower) && failures === 0 ? "pass" : failures ? "attention" : "recorded";
  return {
    id: relPath.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120),
    type: "markdown",
    title: compact(heading, 120),
    category: inferCategory(relPath, { title: heading }),
    status,
    ok: status === "pass",
    generatedAt: stat.mtime.toISOString(),
    updatedAt: stat.mtime.toISOString(),
    source: relPath,
    size: stat.size,
    sizeLabel: formatBytes(stat.size),
    mode: "",
    headless: null,
    urls: [...new Set(text.match(/https?:\/\/[^\s)]+/g) || [])].slice(0, 16),
    primaryUrl: "",
    viewports: [],
    counts: {
      actions: 0,
      scrollStops: 0,
      checks: 0,
      failures,
      statuses: 0
    },
    statuses: [],
    highlights: [status === "pass" ? "verified note" : "recorded note", "markdown packet"],
    summary: compact(firstParagraph || `${status.toUpperCase()}: markdown proof packet`, 220)
  };
}

function summarize(file) {
  const stat = statSafe(file);
  if (!stat) return null;
  const relPath = path.relative(repoRoot, file).replaceAll(path.sep, "/");
  const text = readText(file);
  try {
    if (/\.json$/i.test(file)) {
      return summarizeJson(file, relPath, stat, JSON.parse(text));
    }
    return summarizeMarkdown(file, relPath, stat, text);
  } catch (error) {
    return {
      id: relPath.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120),
      type: path.extname(file).slice(1),
      title: titleCase(path.basename(file)),
      category: "Proof Receipt",
      status: "attention",
      ok: false,
      generatedAt: stat.mtime.toISOString(),
      updatedAt: stat.mtime.toISOString(),
      source: relPath,
      size: stat.size,
      sizeLabel: formatBytes(stat.size),
      mode: "",
      headless: null,
      urls: [],
      primaryUrl: "",
      viewports: [],
      counts: { actions: 0, scrollStops: 0, checks: 0, failures: 1, statuses: 0 },
      statuses: [],
      highlights: ["parse attention"],
      summary: compact(`Could not parse safely: ${error.message}`, 180)
    };
  }
}

function renderPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Proof Ecology - MetrAIyux 0S</title>
  <meta name="description" content="A public proof ecology for MetrAIyux 0S: live browser checks, deployment receipts, MCP receipts, stress reports, and production evidence summarized from test artifacts.">
  <link rel="icon" href="/assets/favicon-32.png">
  <link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="proof-ecology/proof-ecology.css">
</head>
<body class="proof-ecology-page skyesol-living-page" data-experience-mode="operator">
  <canvas class="living-background skyesol-living-field" aria-hidden="true"></canvas>
  <div class="skyesol-grain" aria-hidden="true"></div>
  <div class="skyesol-scanline" aria-hidden="true"></div>
  <div class="motion-chrome scroll-progress" data-motion-chrome aria-hidden="true"><span></span></div>

  <header class="topbar">
    <nav class="nav-shell" aria-label="Primary navigation">
      <a class="brand" href="index.html">
        <img src="/assets/metraiyux-0s-emblem-transparent.png" alt="MetrAIyux 0S emblem">
        MetrAIyux 0S
      </a>
      <button class="menu-button" type="button" data-menu-button aria-label="Open navigation" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
      <div class="nav-search" role="search">
        <input class="nav-search-input" type="search" placeholder="Search..." aria-label="Search" autocomplete="off">
        <ul class="nav-search-results" role="listbox" hidden></ul>
      </div>
      <div class="nav-links" data-nav-links>
        <a href="index.html">Overview</a>
        <a href="capabilities.html">Capabilities</a>
        <a href="sell-sheet.html">Sell Sheet</a>
        <a href="white-label.html">White Label</a>
        <a href="proof.html">Live Proof</a>
        <a class="is-active" href="proof-ecology.html">Proof Ecology</a>
        <a href="valuation.html">Valuation</a>
        <a href="the-gap.html">No Competitors</a>
        <a href="social.html">Social</a>
        <a class="platform-link" href="https://metraiyux-0s-full-system.graylondonskyes.workers.dev/" target="_blank" rel="noopener">Main Platform</a>
        <a class="nav-cta" href="index.html#pricing">Pricing</a>
      </div>
    </nav>
  </header>

  <main>
    <section class="proof-ecology-hero">
      <div>
        <p class="eyebrow reveal">Proof Ecology</p>
        <h1 class="reveal">The artifact pile is now a public proof surface.</h1>
        <p class="hero-sub reveal">I keep the deep receipts in the repo for operator depth, then publish the safe layer here: SkyeGateFS27 gate checks, command-room routes, operating-brain receipts, client workspace proof, live URLs touched, headed-browser status, and the original local receipt path.</p>
        <div class="cta-row reveal">
          <a class="btn-primary" href="#proof-ledger">Open Proof Ledger</a>
          <a class="btn-ghost" href="proof-ecology/ledger.json" target="_blank" rel="noopener">Raw Public Ledger</a>
          <a class="btn-ghost" href="proof.html">System Stress Proof</a>
        </div>
      </div>
      <aside class="proof-ecology-console reveal" aria-label="Proof ecology summary">
        <dl>
          <div><dt>Published receipts</dt><dd data-ledger-stat="published">...</dd></div>
          <div><dt>Passing</dt><dd data-ledger-stat="pass">...</dd></div>
          <div><dt>Headed browser</dt><dd data-ledger-stat="headed">...</dd></div>
          <div><dt>Live URLs</dt><dd data-ledger-stat="urls">...</dd></div>
        </dl>
        <p data-ledger-generated>Loading generated ledger...</p>
      </aside>
    </section>

    <section class="proof-ecology-band reveal" aria-label="Publishing policy">
      <div>
        <span>01</span>
        <strong>Receipts become surface</strong>
        <p>JSON and Markdown proofs from gates, command rooms, deployment routes, and operating brains are summarized into public cards instead of being treated as disposable local clutter.</p>
      </div>
      <div>
        <span>02</span>
        <strong>Secrets stay out</strong>
        <p>The published ledger is metadata and proof posture only. Raw tokens, bearer values, owner sessions, and large local media are not copied into Pages.</p>
      </div>
      <div>
        <span>03</span>
        <strong>R2 is the next vault</strong>
        <p>Large browser screenshots and workflow videos should graduate to Cloudflare R2 or a SkyeGateFS27-gated artifact Worker when we want full media retention online.</p>
      </div>
    </section>

    <section class="section" id="proof-ledger">
      <div class="section-head reveal">
        <div>
          <p class="eyebrow">Generated Ledger</p>
          <h2>Search by product, proof type, URL, status, or artifact path.</h2>
        </div>
        <p>This ledger is generated from <code>test-artifacts</code>. The static site publishes compact proof receipts for routing gates, client workspaces, Cloudflare deployments, MCP mining, and live browser checks while heavyweight screenshots/videos wait for dedicated object storage.</p>
      </div>

      <div class="proof-ecology-controls reveal">
        <label>
          <span>Search proofs</span>
          <input data-proof-search type="search" placeholder="Try headed browser, Free99, MCP, pricing, vault..." autocomplete="off">
        </label>
        <label>
          <span>Status</span>
          <select data-proof-status>
            <option value="all">All statuses</option>
            <option value="pass">Passing</option>
            <option value="attention">Needs attention</option>
            <option value="recorded">Recorded</option>
          </select>
        </label>
        <label>
          <span>Category</span>
          <select data-proof-category>
            <option value="all">All categories</option>
          </select>
        </label>
      </div>

      <div class="proof-ecology-meta reveal" data-proof-meta>Loading receipts...</div>
      <div class="proof-ecology-grid" data-proof-grid></div>
    </section>
  </main>

  <footer class="footer">
    <div class="footer-inner">
      <div>
        <strong>MetrAIyux 0S</strong>
        <p>Proof ecology generated from local receipts and published to the marketing surface as a living evidence layer.</p>
      </div>
      <div class="footer-links">
        <a href="index.html">Overview</a>
        <a href="proof.html">Live Proof</a>
        <a href="proof-ecology.html">Proof Ecology</a>
        <a href="capabilities.html">Capabilities</a>
      </div>
      <div class="footer-links">
        <a href="proof-ecology/ledger.json">Public Ledger JSON</a>
        <a href="https://metraiyux-0s-full-system.graylondonskyes.workers.dev/" target="_blank" rel="noopener">Main Platform</a>
        <a href="mailto:contact@metraiyux.com">contact@metraiyux.com</a>
      </div>
    </div>
  </footer>

  <script>
    (function() {
      const button = document.querySelector('[data-menu-button]');
      const links = document.querySelector('[data-nav-links]');
      if (!button || !links) return;
      button.addEventListener('click', () => {
        const open = links.classList.toggle('is-open');
        button.setAttribute('aria-expanded', String(open));
      });
    })();
    (function() {
      const items = document.querySelectorAll('.reveal');
      if (!items.length || !('IntersectionObserver' in window)) {
        items.forEach((item) => item.classList.add('is-visible'));
        return;
      }
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.1 });
      items.forEach((item) => observer.observe(item));
    })();
  </script>
  <script src="proof-ecology/proof-ecology.js"></script>
  <script src="script.js"></script>
  <script src="site-search.js"></script>
</body>
</html>
`;
}

function renderCss() {
  return `.proof-ecology-page {
  background: #03070d;
}

.proof-ecology-hero {
  max-width: var(--wrap);
  margin: 0 auto;
  padding: 150px 24px 72px;
  display: grid;
  grid-template-columns: minmax(0, .9fr) minmax(320px, .45fr);
  gap: 40px;
  align-items: end;
}

.proof-ecology-hero h1 {
  max-width: 940px;
  margin: 0 0 22px;
  font-family: var(--font-display);
  font-size: clamp(2.8rem, 7vw, 6.7rem);
  line-height: .98;
  letter-spacing: 0;
}

.proof-ecology-hero .hero-sub {
  max-width: 760px;
  color: var(--soft);
}

.proof-ecology-console {
  border: 1px solid rgba(100, 217, 255, .24);
  background: linear-gradient(160deg, rgba(100, 217, 255, .10), rgba(244, 199, 91, .055));
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 22px 90px rgba(0, 0, 0, .34);
}

.proof-ecology-console dl {
  display: grid;
  gap: 14px;
  margin: 0;
}

.proof-ecology-console div {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
  align-items: baseline;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, .09);
}

.proof-ecology-console dt {
  color: var(--muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .12em;
}

.proof-ecology-console dd {
  margin: 0;
  color: var(--gold);
  font-family: var(--font-mono);
  font-size: 22px;
}

.proof-ecology-console p {
  margin: 18px 0 0;
  color: var(--soft);
  font-size: 13px;
}

.proof-ecology-band {
  max-width: var(--wrap);
  margin: 0 auto;
  padding: 0 24px 72px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.proof-ecology-band div,
.proof-ecology-controls,
.proof-ecology-card {
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, .025);
  border-radius: 8px;
}

.proof-ecology-band div {
  padding: 22px;
}

.proof-ecology-band span,
.proof-ecology-card .proof-path,
.proof-ecology-card .proof-date,
.proof-ecology-card .proof-chip,
.proof-ecology-meta {
  font-family: var(--font-mono);
}

.proof-ecology-band span {
  display: block;
  color: var(--cyan);
  font-size: 12px;
  margin-bottom: 18px;
}

.proof-ecology-band strong {
  display: block;
  font-family: var(--font-display);
  font-size: 20px;
  margin-bottom: 8px;
}

.proof-ecology-band p {
  margin: 0;
  color: var(--muted);
  line-height: 1.65;
}

.proof-ecology-controls {
  margin: 34px 0 18px;
  padding: 18px;
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 190px 240px;
  gap: 14px;
  align-items: end;
}

.proof-ecology-controls label {
  display: grid;
  gap: 8px;
}

.proof-ecology-controls span {
  color: var(--muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .12em;
}

.proof-ecology-controls input,
.proof-ecology-controls select {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, .12);
  background: rgba(0, 0, 0, .34);
  color: var(--soft);
  border-radius: 6px;
  padding: 12px 12px;
  font: inherit;
}

.proof-ecology-meta {
  color: var(--muted);
  font-size: 12px;
  margin: 0 0 18px;
}

.proof-ecology-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.proof-ecology-card {
  padding: 20px;
  min-height: 292px;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 14px;
  position: relative;
  overflow: hidden;
}

.proof-ecology-card::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, var(--cyan), var(--gold));
  opacity: .78;
}

.proof-ecology-card[data-status="attention"]::before {
  background: linear-gradient(90deg, var(--rose), var(--gold));
}

.proof-ecology-card[data-status="recorded"]::before,
.proof-ecology-card[data-status="mixed"]::before {
  background: linear-gradient(90deg, var(--violet), var(--cyan));
}

.proof-card-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.proof-chip {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, .12);
  color: var(--cyan);
  background: rgba(100, 217, 255, .08);
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .08em;
  white-space: nowrap;
}

.proof-chip[data-status="pass"] {
  color: var(--mint);
  background: rgba(111, 242, 199, .08);
}

.proof-chip[data-status="attention"] {
  color: var(--rose);
  background: rgba(255, 107, 139, .08);
}

.proof-ecology-card h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.04rem;
  line-height: 1.25;
}

.proof-ecology-card p {
  margin: 0;
  color: var(--soft);
  line-height: 1.62;
  font-size: 13px;
}

.proof-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.proof-metrics span {
  color: var(--muted);
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 11px;
}

.proof-path {
  color: var(--muted);
  font-size: 10px;
  line-height: 1.5;
  word-break: break-word;
}

.proof-date {
  color: var(--gold);
  font-size: 11px;
  white-space: nowrap;
}

.proof-links {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.proof-links a {
  color: var(--cyan);
  font-size: 12px;
  font-weight: 700;
}

@media (max-width: 1060px) {
  .proof-ecology-hero,
  .proof-ecology-band,
  .proof-ecology-grid,
  .proof-ecology-controls {
    grid-template-columns: 1fr 1fr;
  }

  .proof-ecology-controls label:first-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .proof-ecology-hero,
  .proof-ecology-band,
  .proof-ecology-grid,
  .proof-ecology-controls {
    grid-template-columns: 1fr;
  }

  .proof-ecology-hero {
    padding-top: 128px;
  }
}
`;
}

function renderJs() {
  return `(function () {
  const state = { receipts: [], filtered: [] };
  const grid = document.querySelector('[data-proof-grid]');
  const meta = document.querySelector('[data-proof-meta]');
  const search = document.querySelector('[data-proof-search]');
  const status = document.querySelector('[data-proof-status]');
  const category = document.querySelector('[data-proof-category]');

  function text(value) {
    return String(value == null ? '' : value);
  }

  function escapeHtml(value) {
    return text(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  function setStat(name, value) {
    const node = document.querySelector('[data-ledger-stat="' + name + '"]');
    if (node) node.textContent = value;
  }

  function formatDate(value) {
    if (!value) return 'undated';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().replace('.000Z', 'Z');
  }

  function receiptText(item) {
    return [
      item.title,
      item.category,
      item.status,
      item.source,
      item.summary,
      item.mode,
      (item.urls || []).join(' '),
      (item.highlights || []).join(' ')
    ].join(' ').toLowerCase();
  }

  function renderCard(item) {
    const metrics = [];
    if (item.counts && item.counts.actions) metrics.push(item.counts.actions + ' actions');
    if (item.counts && item.counts.scrollStops) metrics.push(item.counts.scrollStops + ' scroll stops');
    if (item.viewports && item.viewports.length) metrics.push(item.viewports.join(' / '));
    if (item.headless === false) metrics.push('headed');
    if (item.sizeLabel) metrics.push(item.sizeLabel);
    const firstUrl = item.primaryUrl || (item.urls || [])[0] || '';
    return '<article class="proof-ecology-card reveal is-visible" data-status="' + escapeHtml(item.status) + '">' +
      '<div class="proof-card-top">' +
        '<span class="proof-chip" data-status="' + escapeHtml(item.status) + '">' + escapeHtml(item.status) + '</span>' +
        '<span class="proof-date">' + escapeHtml(formatDate(item.generatedAt)) + '</span>' +
      '</div>' +
      '<div>' +
        '<p class="eyebrow">' + escapeHtml(item.category) + '</p>' +
        '<h3>' + escapeHtml(item.title) + '</h3>' +
      '</div>' +
      '<p>' + escapeHtml(item.summary) + '</p>' +
      '<div>' +
        '<div class="proof-metrics">' + metrics.slice(0, 6).map((metric) => '<span>' + escapeHtml(metric) + '</span>').join('') + '</div>' +
        '<p class="proof-path">' + escapeHtml(item.source) + '</p>' +
        '<div class="proof-links">' +
          (firstUrl ? '<a href="' + escapeHtml(firstUrl) + '" target="_blank" rel="noopener">Open live URL</a>' : '') +
          '<a href="proof-ecology/ledger.json" target="_blank" rel="noopener">Ledger JSON</a>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function applyFilters() {
    const q = (search && search.value || '').trim().toLowerCase();
    const selectedStatus = status && status.value || 'all';
    const selectedCategory = category && category.value || 'all';
    state.filtered = state.receipts.filter((item) => {
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (q && !receiptText(item).includes(q)) return false;
      return true;
    });
    render();
  }

  function render() {
    if (!grid || !meta) return;
    meta.textContent = state.filtered.length + ' of ' + state.receipts.length + ' published proof receipts visible.';
    grid.innerHTML = state.filtered.map(renderCard).join('');
  }

  function initCategories(receipts) {
    if (!category) return;
    const categories = Array.from(new Set(receipts.map((item) => item.category).filter(Boolean))).sort();
    categories.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      category.appendChild(option);
    });
  }

  fetch('proof-ecology/ledger.json', { cache: 'no-store' })
    .then((response) => response.json())
    .then((ledger) => {
      state.receipts = ledger.receipts || [];
      initCategories(state.receipts);
      setStat('published', ledger.summary && ledger.summary.published || state.receipts.length);
      setStat('pass', ledger.summary && ledger.summary.pass || 0);
      setStat('headed', ledger.summary && ledger.summary.headedBrowser || 0);
      setStat('urls', ledger.summary && ledger.summary.liveUrls || 0);
      const generated = document.querySelector('[data-ledger-generated]');
      if (generated) generated.textContent = 'Generated ' + formatDate(ledger.generatedAt) + ' from ' + (ledger.summary && ledger.summary.scanned || 0) + ' local proof files.';
      applyFilters();
    })
    .catch((error) => {
      if (meta) meta.textContent = 'Could not load the proof ecology ledger: ' + error.message;
    });

  [search, status, category].forEach((control) => {
    if (control) control.addEventListener('input', applyFilters);
  });
})();
`;
}

function main() {
  const files = walk(artifactRoot)
    .map((file) => ({ file, stat: statSafe(file) }))
    .filter((item) => item.stat)
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);

  const receipts = files
    .slice(0, maxPublished)
    .map(({ file }) => summarize(file))
    .filter(Boolean)
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

  const urlSet = new Set();
  for (const receipt of receipts) {
    for (const url of receipt.urls || []) urlSet.add(url);
    if (receipt.primaryUrl) urlSet.add(receipt.primaryUrl);
  }

  const ledger = {
    generatedAt: new Date().toISOString(),
    publisher: "tools/publish-proof-ecology.mjs",
    sourceRoot: "test-artifacts",
    policy: {
      publishedLimit: maxPublished,
      rawSecrets: "not copied",
      heavyMedia: "kept in local artifacts until promoted to Cloudflare R2 or a gated artifact Worker"
    },
    summary: {
      scanned: files.length,
      published: receipts.length,
      pass: receipts.filter((item) => item.status === "pass").length,
      attention: receipts.filter((item) => item.status === "attention").length,
      recorded: receipts.filter((item) => item.status === "recorded").length,
      headedBrowser: receipts.filter((item) => item.headless === false || /headed/i.test(item.mode || "")).length,
      liveUrls: urlSet.size,
      categories: [...new Set(receipts.map((item) => item.category))].sort()
    },
    receipts
  };

  fs.mkdirSync(ecologyDir, { recursive: true });
  fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
  fs.writeFileSync(pagePath, renderPage());
  fs.writeFileSync(cssPath, renderCss());
  fs.writeFileSync(jsPath, renderJs());
  console.log(JSON.stringify({
    ok: true,
    pagePath,
    ledgerPath,
    scanned: files.length,
    published: receipts.length,
    pass: ledger.summary.pass,
    attention: ledger.summary.attention,
    headedBrowser: ledger.summary.headedBrowser,
    liveUrls: ledger.summary.liveUrls
  }, null, 2));
}

main();
