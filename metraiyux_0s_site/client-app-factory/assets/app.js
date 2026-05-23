const root = document.documentElement;
const body = document.body;
const STORAGE_KEY = "clientAppFactory.currentRecord";
const RUN_STATE_KEY = "clientAppFactory.pipelineSnapshots";
const APP_BASE_URL = new URL(import.meta.url.includes("/client-app-factory/") ? "/client-app-factory/" : "../", import.meta.url);
const APP_BASE_PATH = APP_BASE_URL.pathname.endsWith("/") ? APP_BASE_URL.pathname : `${APP_BASE_URL.pathname}/`;
const STILL2VID_URL = new URL("../Free99/apps/still2vid-forge/index.html", APP_BASE_URL).toString();
const MEDIA_HANDOFF_KEY = "METRAIYUX_MEDIA_HANDOFF";
const CONFIG = window.__CLIENT_APP_FACTORY__ || {};
const API_BASE = String(
  CONFIG.apiBase
  || document.querySelector('meta[name="client-app-factory-api-base"]')?.getAttribute("content")
  || (APP_BASE_PATH === "/" ? "/api" : "/api/client-app-factory")
).replace(/\/+$/, "");

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const fallbackRecord = {
  clientId: "empire-pallets",
  displayName: "Empire Pallets",
  industry: "Industrial logistics and pallet operations",
  contacts: [{ name: "Empire Pallets Sales", phone: "480-662-6551", email: "sales@empirepalletsaz.com" }],
  locations: [{ address: "631 S 31st Ave, Phoenix, AZ 85009" }],
  services: [
    "New manufactured pallets",
    "Recycled pallets",
    "Custom pallet design",
    "Heat-treated export pallets",
    "Drop trailer support",
    "Pallet recycling"
  ],
  sourceUrls: ["https://www.epalletsaz.com/"],
  sourceFolders: ["/workspaces/MetrAIyux-0S/Skye-Clients/empire-pallets-v3-app"],
  assetFolders: ["/workspaces/MetrAIyux-0S/Skye-Clients/empire-pallets-v3-app/assets"],
  logoAssets: [],
  mediaAssets: [],
  publicRoutes: ["/index.html", "/services.html", "/quote.html", "/scan.html"],
  privateRoutes: ["/preview.html"],
  workspacePlan: {
    freeTesterDays: 7,
    includedScans: 7,
    includedCommands: 25,
    continuationDiscountMonths: 6
  },
  trialUsage: { scansUsed: 0, commandsUsed: 0, status: "preview-ready" },
  paymentPlan: {
    provider: "SkyePay",
    mode: "preview-first",
    lane: "../SkyeGateFS27/skyepay.html?client=empire-pallets",
    status: "linked-preview-lane"
  },
  deploymentTargets: [{
    provider: "Netlify or Cloudflare Pages",
    publishFolder: "/workspaces/MetrAIyux-0S/Skye-Clients/empire-pallets-v3-app",
    finalQrTarget: "https://www.epalletsaz.com/scan.html",
    status: "preview-ready"
  }],
  proofArtifacts: [
    "empire-pallets-v3-app/APP_UPGRADE_PROOF.md",
    "MCP_TOOLING_RECEIPT.json",
    "APP_PATH_MANIFEST.json"
  ],
  mcpReceipts: [
    "MCP_TOOLING_RECEIPT.json",
    "empire-pallets-v3-app/MCP_TOOLING_RECEIPT.json"
  ],
  scannerReports: ["data/empire-pallets-scan-report.json"],
  status: "preview-ready",
  notes: "Seed record from the Empire Pallets packet. The factory keeps the source packet preserved and tracks app generation through proof."
};

const embeddedFallbackRecords = {
  "empire-pallets": fallbackRecord
};

const recordFallbackPaths = {
  "empire-pallets": [
    "storage/records/empire-pallets.json",
    "data/empire-pallets-record.json"
  ],
  "skye-app-template": [
    "storage/records/skye-app-template.json",
    "data/skye-app-template-record.json"
  ],
  "next-level-gaming-az": [
    "storage/records/next-level-gaming-az.json",
    "storage/records/next-level-gaming-goodyear.json"
  ],
  "next-level-gaming-goodyear": [
    "storage/records/next-level-gaming-goodyear.json",
    "storage/records/next-level-gaming-az.json"
  ],
  "fade-masters-phx": ["storage/records/fade-masters-phx.json"],
  "as-you-wish-pottery-westgate": ["storage/records/as-you-wish-pottery-westgate.json"]
};

const outcomeStates = [
  "intake-created",
  "assets-unpacked",
  "source-scanned",
  "mcp-before-run",
  "app-generated",
  "workspace-linked",
  "payment-lane-linked",
  "browser-proofed",
  "mcp-after-green",
  "scanner-proofed",
  "preview-ready",
  "client-approved",
  "production-deployed",
  "live-verified",
  "continuation-offered",
  "converted"
];

const stageConfig = {
  core: { path: "/factory/core", success: "Core package built and linked" },
  enhance: { path: "/factory/enhance", success: "Enhance lane applied to generated app" },
  verify: { path: "/factory/verify", success: "Verification pass completed" },
  full: { path: "/factory/run", success: "Full factory pipeline completed" }
};

const pageConfig = {
  home: {
    label: "Overview",
    href: "",
    kicker: "Start Here",
    title: "Pick a client, build the app, review it, and launch it.",
    description: "This should feel obvious on day one. Choose the client, run the build, preview the app, check the proof, then publish what passed."
  },
  clients: {
    label: "Choose Client",
    href: "clients/",
    kicker: "Step 1",
    title: "Choose the business you want to turn into an app.",
    description: "Search Valley Verified, import a client, and move straight into the build path."
  },
  client: {
    label: "Client Profile",
    href: "client/",
    kicker: "Step 2",
    title: "See the active client and decide what still needs work.",
    description: "This is the one-page profile for the client you’re building right now."
  },
  surfaces: {
    label: "Source Check",
    href: "surfaces/",
    kicker: "Live Surface Audit",
    title: "Check the source before you trust the build.",
    description: "Use this when you need to inspect the live site and its harvested evidence."
  },
  brand: {
    label: "Brand Pack",
    href: "brand/",
    kicker: "Identity",
    title: "Make sure the app carries the real client identity.",
    description: "Logos, marks, and contact signal live here."
  },
  media: {
    label: "Media Pack",
    href: "media/",
    kicker: "Media Vault",
    title: "Keep the client’s media in one clean place.",
    description: "Hero reels, screenshots, posters, uploads, and provenance belong here."
  },
  design: {
    label: "Experience",
    href: "design/",
    kicker: "Design Direction",
    title: "Choose how the finished app should feel.",
    description: "This is the creative lane, not the technical one."
  },
  builder: {
    label: "Build",
    href: "builder/",
    kicker: "Step 3",
    title: "Run the app builder.",
    description: "Use this page to run the stages or run the full build."
  },
  generated: {
    label: "Preview App",
    href: "generated-apps/",
    kicker: "Step 4",
    title: "Open the generated app and see what was made.",
    description: "This page is for previewing what the factory actually produced."
  },
  proofs: {
    label: "QA Check",
    href: "proofs/",
    kicker: "Step 5",
    title: "Check whether the app is actually ready.",
    description: "Use the proof reel and the release checks to catch what still needs fixing."
  },
  deployments: {
    label: "Go Live",
    href: "deployments/",
    kicker: "Step 6",
    title: "Launch only the app that cleared review.",
    description: "Deployment targets and release readiness live here."
  },
  workspace: {
    label: "Workspace",
    href: "workspace/",
    kicker: "Client Workspace",
    title: "Prepare the client workspace handoff.",
    description: "Workspace plan, tester days, included scans, and command allowance live here."
  },
  payment: {
    label: "Payment",
    href: "payment/",
    kicker: "SkyePay",
    title: "Connect the payment lane.",
    description: "Keep the app launch tied to the right billing and preview-first lane."
  },
  auren: {
    label: "Auren",
    href: "auren/",
    kicker: "Auren",
    title: "Ask for help instead of guessing.",
    description: "Auren should tell you what is broken, what is missing, and what to do next."
  },
  activity: {
    label: "Activity Log",
    href: "activity/",
    kicker: "Factory Activity",
    title: "Read the event trail only when you need it.",
    description: "This is the history page, not the main product surface."
  },
  settings: {
    label: "Settings",
    href: "settings/",
    kicker: "Platform Wiring",
    title: "Check the wiring and export what you need.",
    description: "Keep platform settings and backend status out of the way until you need them."
  }
};

const primaryPages = ["home", "clients", "client", "surfaces", "brand", "media", "design", "builder", "generated", "proofs", "workspace", "payment", "deployments", "auren"];
const flowSteps = [
  { id: "clients", label: "01", name: "Choose client" },
  { id: "client", label: "02", name: "Confirm info" },
  { id: "surfaces", label: "03", name: "Check sources" },
  { id: "brand", label: "04", name: "Brand pack" },
  { id: "media", label: "05", name: "Media pack" },
  { id: "design", label: "06", name: "Experience" },
  { id: "builder", label: "07", name: "Build app" },
  { id: "generated", label: "08", name: "Preview app" },
  { id: "proofs", label: "09", name: "QA check" },
  { id: "workspace", label: "10", name: "Workspace" },
  { id: "payment", label: "11", name: "Payment" },
  { id: "deployments", label: "12", name: "Launch" },
  { id: "auren", label: "AI", name: "Ask Auren" }
];

const designEngines = [
  {
    name: "Retail theater lane",
    recipe: "collectible-proof-stage",
    notes: "Good when the client wins through display, product mood, and community pull."
  },
  {
    name: "Ops foundry lane",
    recipe: "industrial-process-atlas",
    notes: "Good for logistics, scheduling, route, and fulfillment clients that need clarity over hype."
  },
  {
    name: "Trust dossier lane",
    recipe: "editorial-proof-atlas",
    notes: "Good when the client needs receipts, before/after, and strong proof framing."
  },
  {
    name: "Premium membership lane",
    recipe: "membership-experience-suite",
    notes: "Good when a client needs exclusive access, bookings, or ongoing account value."
  }
];

const completionGate = [
  "Source packet preserved",
  "Live surface harvested",
  "Brand assets attached",
  "Core build generated",
  "Enhancement report written",
  "Verification report written",
  "Desktop proof captured",
  "Mobile proof captured",
  "QR route confirmed",
  "Preview route confirmed",
  "Payment lane linked",
  "Deploy target ready"
];

let currentRecord = fallbackRecord;
let valleyBusinesses = [];
let scanReport = null;
let backendHealth = null;
let backendReady = false;
let factoryLedger = [];
let pipelineSnapshots = {};
let supportDrawerOpen = false;
let aurenState = { clientId: "", history: [], latest: null };
let autorunTriggered = false;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function normalizeFactoryPath(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw
    .replace(/^\/+/, "")
    .replace(/^client-app-factory\//, "")
    .replace(/^metraiyux_0s_site\/client-app-factory\//, "");
}

function appHref(path = "") {
  return new URL(path, APP_BASE_URL).toString();
}

function pageHref(pageId, params = null) {
  const config = pageConfig[pageId] || pageConfig.home;
  const url = new URL(config.href || "", APP_BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    });
  }
  return url.toString();
}

function still2vidHref(extra = {}) {
  const url = new URL(STILL2VID_URL, window.location.href);
  url.searchParams.set("source", "client-app-factory");
  url.searchParams.set("client", getCurrentClientId(currentRecord));
  url.searchParams.set("return", window.location.href);
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });
  return url.toString();
}

function toFactoryHref(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw;
  if (raw.startsWith("/workspaces/") || raw.startsWith("../") || raw.startsWith("test-artifacts/")) return null;
  return appHref(normalizeFactoryPath(raw));
}

function renderHref(value, label = "Open") {
  const href = toFactoryHref(value);
  return href
    ? `<a class="text-link" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`
    : `<span class="quiet-pill">filesystem only</span>`;
}

function getCurrentPage() {
  return body.dataset.factoryPage || "home";
}

function getPrimaryContact(record = currentRecord) {
  return record.contacts?.[0] || {};
}

function getCurrentClientId(record = currentRecord) {
  const fromQuery = new URL(window.location.href).searchParams.get("clientId");
  return fromQuery || record.clientId || "empire-pallets";
}

function latestGeneratedApp(record = currentRecord) {
  return record.generatedApps?.[0] || null;
}

function buildClientAppBase(record = currentRecord) {
  const clientId = record.clientId || "client";
  if (/^(127\\.0\\.0\\.1|localhost)$/i.test(window.location.hostname)) {
    return `client-apps/${clientId}`;
  }
  const latestApp = latestGeneratedApp(record);
  const raw = latestApp?.publicBasePath || record.runtimeAppBase || latestApp?.publishFolder || `client-apps/${clientId}`;
  const normalized = String(raw).replace(/\\/g, "/");
  if (normalized.includes("/client-app-factory/client-apps/")) return `client-apps/${clientId}`;
  if (normalized.includes("/client-app-factory/runtime-app/")) return "runtime-app";
  if (normalized.startsWith("/workspaces/")) return `client-apps/${clientId}`;
  return normalized.replace(/^\/+/, "").replace(/\/+$/, "");
}

function pathLabel(value = "") {
  return String(value).split("/").pop() || value;
}

function buildClientSummary(record = currentRecord) {
  const services = (record.services || []).slice(0, 3).join(" · ");
  return record.notes || services || "Client record ready for intake, build, proof, and deployment handoff.";
}

function saveLocalRecord(record) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

function loadLocalRecord() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function savePipelineState(state = pipelineSnapshots) {
  try {
    sessionStorage.setItem(RUN_STATE_KEY, JSON.stringify(state || {}));
  } catch {}
}

function loadPipelineState() {
  try {
    return JSON.parse(sessionStorage.getItem(RUN_STATE_KEY) || "{}");
  } catch {
    return {};
  }
}

async function fetchJson(path, fallback) {
  try {
    const response = await fetch(appHref(normalizeFactoryPath(path)), { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json();
  } catch {
    return fallback;
  }
}

async function fetchFirstJson(paths = [], fallback = null) {
  for (const path of paths) {
    const href = toFactoryHref(path);
    if (!href) continue;
    try {
      const response = await fetch(href, { cache: "no-store" });
      if (!response.ok) continue;
      return await response.json();
    } catch {
      continue;
    }
  }
  return fallback;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      "content-type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `${response.status} ${response.statusText}`);
  }
  return payload;
}

function aiBadge() {
  if (!backendHealth?.ai) return "AI pending";
  const ai = backendHealth.ai;
  if (ai.liveAvailable) return `Auren live · ${ai.model}`;
  if (ai.configured) return `Auren fallback · ${ai.model}`;
  return "Auren offline";
}

async function refreshBackendStatus() {
  try {
    backendHealth = await apiRequest("/health");
    backendReady = backendHealth?.ok !== false;
  } catch {
    backendHealth = null;
    backendReady = false;
  }
}

async function refreshLedger() {
  if (!backendReady) return;
  try {
    const response = await apiRequest("/factory/proof-ledger");
    factoryLedger = response.ledger || [];
  } catch {
    factoryLedger = [];
  }
}

async function loadValleyBusinesses() {
  if (backendReady) {
    try {
      const response = await apiRequest("/factory/valley/businesses");
      valleyBusinesses = response.businesses || [];
      if (valleyBusinesses.length) return;
    } catch {
      valleyBusinesses = [];
    }
  }

  const fallbackPaths = [
    "data/client-app-factory-index.json",
    "../valley-verified/data/client-app-factory-index.json"
  ];
  for (const path of fallbackPaths) {
    try {
      const response = await fetch(appHref(path), { cache: "no-store" });
      if (!response.ok) continue;
      const payload = await response.json();
      const records = payload.records || payload.businesses || [];
      valleyBusinesses = records.map((record) => ({
        id: record.valleyBusinessId || record.clientId || record.id,
        name: record.displayName || record.name || record.clientId || "Unnamed client",
        niche: record.niche || record.category || record.signatureModule || "App-ready client",
        category: record.category || record.signatureModule || "Client app",
        subcategory: record.subcategory || "",
        city: record.city || "",
        state: record.state || "",
        description: record.description || record.valleyProfilePath || record.appUrl || "Imported from the Valley Verified app index."
      })).filter((business) => business.id && business.name);
      if (valleyBusinesses.length) return;
    } catch {
      valleyBusinesses = [];
    }
  }
}

function setTitle() {
  const current = pageConfig[getCurrentPage()] || pageConfig.home;
  document.title = getCurrentPage() === "home" ? "Client App Factory" : `Client App Factory · ${current.label}`;
}

function selectedClientHref() {
  return pageHref("client", { clientId: currentRecord.clientId || "empire-pallets" });
}

function updateClientQuery() {
  if (getCurrentPage() !== "client") return;
  const url = new URL(window.location.href);
  url.searchParams.set("clientId", currentRecord.clientId || "empire-pallets");
  history.replaceState({}, "", url);
}

function renderHeader() {
  const current = pageConfig[getCurrentPage()] || pageConfig.home;
  const header = $("[data-shell-header]");
  if (!header) return;
  const navItems = primaryPages.filter((id) => id !== "home").map((id) => {
    const config = pageConfig[id];
    return `
    <a class="nav-pill ${id === getCurrentPage() ? "active" : ""}" href="${escapeHtml(id === "client" ? selectedClientHref() : pageHref(id, { clientId: currentRecord.clientId || "empire-pallets" }))}">
      <span>${escapeHtml(config.kicker || config.label)}</span>
      <strong>${escapeHtml(config.label)}</strong>
    </a>
  `;
  }).join("");
  const liveUrl = currentRecord.sourceUrls?.[0] || "";
  const flowHtml = flowSteps.map((step) => `
    <a class="flow-chip ${step.id === getCurrentPage() ? "active" : ""}" href="${escapeHtml(step.id === "client" ? selectedClientHref() : pageHref(step.id, { clientId: currentRecord.clientId || "empire-pallets" }))}">
      <span>${escapeHtml(step.label)}</span>
      <strong>${escapeHtml(step.name)}</strong>
    </a>
  `).join("");
  header.innerHTML = `
    <div class="topbar">
      <div class="brand-lockup">
        <a class="brand-link" href="${escapeHtml(pageHref("home"))}">
          <span class="brand-mark"><img src="${escapeHtml(appHref("assets/icon-192.png"))}" alt="" aria-hidden="true"></span>
          <span>
            <strong>Client App Factory</strong>
            <small>studio-grade build foundry</small>
          </span>
        </a>
        <p class="brand-note">One client. Twelve focused steps. No hidden console maze.</p>
      </div>
      <div class="topbar-actions">
        <span class="status-chip ${backendReady ? "ok" : "warn"}" data-backend-status>${escapeHtml(pipelineSnapshots.statusMessage || (backendReady ? "Factory API live" : "Factory API offline"))}</span>
        <span class="status-chip ${backendHealth?.ai?.liveAvailable ? "ok" : "quiet"}">${escapeHtml(aiBadge())}</span>
        <a class="action-btn accent" href="${escapeHtml(pageHref("clients"))}">Start</a>
      </div>
    </div>
    <nav class="flow-ribbon" aria-label="Client App Factory workflow">
      ${flowHtml}
    </nav>
    <details class="route-ribbon">
      <summary>Other pages</summary>
      <div class="route-ribbon-inner">${navItems}</div>
    </details>
    <section class="client-band">
      <div class="client-band-copy">
        <p class="eyebrow">Active client</p>
        <h2 data-client-name>${escapeHtml(currentRecord.displayName || "No client selected")}</h2>
        <p>${escapeHtml(currentRecord.industry || "Pick a Valley client to begin.")}</p>
      </div>
      <dl class="client-band-meta">
        <div><dt>Status</dt><dd>${escapeHtml(currentRecord.status || "intake-created")}</dd></div>
        <div><dt>Contact</dt><dd>${escapeHtml(getPrimaryContact(currentRecord).name || "Not set")}</dd></div>
        <div><dt>Live site</dt><dd>${liveUrl ? `<a class="text-link" href="${escapeHtml(liveUrl)}" target="_blank" rel="noreferrer">Open</a>` : "Missing"}</dd></div>
        <div><dt>Preview</dt><dd>${renderHref(`${buildClientAppBase(currentRecord)}/index.html`, "Open")}</dd></div>
      </dl>
    </section>
  `;
}

function renderHero() {
  const hero = $("[data-page-hero]");
  if (!hero) return;
  const current = pageConfig[getCurrentPage()] || pageConfig.home;
  const step = flowSteps.find((item) => item.id === getCurrentPage());
  hero.innerHTML = `
    <section class="page-hero">
      <div class="page-hero-copy">
        <p class="eyebrow">${escapeHtml(step ? `${step.label} / ${current.kicker}` : current.kicker)}</p>
        <h1>${escapeHtml(current.title)}</h1>
        <p>${escapeHtml(current.description)}</p>
        <div class="hero-actions">
          <a class="action-btn accent" href="${escapeHtml(pageHref("clients"))}">Choose Client</a>
          <a class="action-btn" href="${escapeHtml(pageHref("builder", { clientId: currentRecord.clientId || "empire-pallets" }))}">Build</a>
          <a class="action-btn" href="${escapeHtml(pageHref("auren", { clientId: currentRecord.clientId || "empire-pallets" }))}">Ask Auren</a>
        </div>
      </div>
    </section>
  `;
}

function renderStateRail() {
  const completed = new Set(currentRecord.completedStates || []);
  return `
    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">State rail</p>
          <h2>Where this client stands now.</h2>
        </div>
      </div>
      <div class="state-rail">
        ${outcomeStates.map((state) => `
          <article class="state-node ${completed.has(state) ? "complete" : ""}">
            <strong>${escapeHtml(state.replaceAll("-", " "))}</strong>
            <span>${completed.has(state) ? "Recorded" : "Waiting"}</span>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderArtifactTiles() {
  const latestApp = latestGeneratedApp(currentRecord);
  const items = [
    latestApp?.publishFolder ? { title: "Generated app", note: "Current package", href: `${buildClientAppBase(currentRecord)}/index.html` } : null,
    currentRecord.enhancementReports?.[0] ? { title: "Enhancement report", note: "Bespoke pass", href: currentRecord.enhancementReports[0] } : null,
    currentRecord.verificationReports?.[0] ? { title: "Verification report", note: "Release check", href: currentRecord.verificationReports[0] } : null,
    getScanReportHref() ? { title: "Scan report", note: "Source risk", href: getScanReportHref() } : null,
    currentRecord.paymentPlan?.lane ? { title: "SkyePay lane", note: currentRecord.paymentPlan.status || "linked", href: currentRecord.paymentPlan.lane } : null
  ].filter(Boolean);
  return `
    <div class="artifact-grid">
      ${items.map((item) => `
        <article class="artifact-card">
          <p>${escapeHtml(item.note)}</p>
          <h3>${escapeHtml(item.title)}</h3>
          ${renderHref(item.href, "Open")}
        </article>
      `).join("")}
    </div>
  `;
}

function getScanReportHref(record = currentRecord) {
  return record.scannerReports?.[0] || null;
}

function getProofVideoCard() {
  const proofPoster = appHref("assets/proof/client-app-factory-workflow-poster.png");
  const proofVideo = appHref("assets/proof/client-app-factory-workflow.webm");
  return `
    <article class="media-feature">
      <a class="proof-poster-link" href="${escapeHtml(proofVideo)}" aria-label="Open Client App Factory browser proof video">
        <img data-proof-video-poster src="${escapeHtml(proofPoster)}" alt="Client App Factory browser proof reel poster">
      </a>
      <div class="media-copy">
        <p class="eyebrow">Proof reel</p>
        <h3>Keep the browser run visible.</h3>
        <p>This reel is treated like a first-class artifact so proof stays buyer-readable and operator-usable.</p>
      </div>
    </article>
  `;
}

function pageTemplate() {
  const page = getCurrentPage();
  const contact = getPrimaryContact(currentRecord);
  if (page === "home") {
    return `
      <section class="section">
        <article class="wizard-focus">
          <p class="eyebrow">Start here</p>
          <h2>Build one client app from left to right.</h2>
          <p>Everything in this product is now a step. Pick a Valley client, confirm the record, check source/brand/media, build, preview, QA, connect workspace/payment, then launch.</p>
          <div class="wizard-map">
            ${flowSteps.map((step) => `
              <a class="wizard-map-card" href="${escapeHtml(pageHref(step.id, { clientId: currentRecord.clientId || "empire-pallets" }))}">
                <span>${escapeHtml(step.label)}</span>
                <strong>${escapeHtml(step.name)}</strong>
                <span>${escapeHtml(pageConfig[step.id]?.description || "")}</span>
              </a>
            `).join("")}
          </div>
        </article>
      </section>
      <section class="section">
        <article class="wizard-focus compact">
          <p class="eyebrow">Current client</p>
          <h2>${escapeHtml(currentRecord.displayName || "No client selected yet")}</h2>
          <p>${escapeHtml(currentRecord.displayName ? buildClientSummary(currentRecord) : "Pick a client first. The rest of the builder will stay attached to that business.")}</p>
          <div class="detail-grid">
            <div><dt>Status</dt><dd>${escapeHtml(currentRecord.status || "waiting for client")}</dd></div>
            <div><dt>Current step</dt><dd>${escapeHtml(pipelineSnapshots.statusMessage || "Choose a client to begin")}</dd></div>
          </div>
          <div class="hero-actions">
            <a class="action-btn accent" href="${escapeHtml(pageHref("clients"))}">Choose Client</a>
            <a class="action-btn" href="${escapeHtml(pageHref("builder"))}">Open Builder</a>
            <a class="action-btn" href="${escapeHtml(pageHref("auren"))}">Ask Auren</a>
          </div>
        </article>
      </section>
    `;
  }

  if (page === "clients") {
    return `
      <section class="section">
        <article class="wizard-focus compact">
          <p class="eyebrow">Step 1</p>
          <h2>Choose the business you want to turn into an app.</h2>
          <p>Search Valley Verified. Pick <strong>Import Record</strong> to review first, or <strong>Import + Build</strong> to start the factory immediately.</p>
          <div class="form-row">
            <input class="field-input" type="search" placeholder="Search by business name, niche, city, or category" data-valley-search>
            <button class="action-btn" type="button" data-load-valley>Refresh list</button>
          </div>
          <details class="support-block">
            <summary>Open internal reference records</summary>
            <div class="seed-list" style="margin-top:0.85rem;">
              <button class="seed-row" type="button" data-load-template><strong>White Label Base</strong><span>Internal scaffold only</span></button>
              <button class="seed-row" type="button" data-load-empire><strong>Empire Pallets</strong><span>Ops and logistics reference</span></button>
              <button class="seed-row" type="button" data-load-next-level><strong>Next Level Gaming</strong><span>Retail and community reference</span></button>
            </div>
          </details>
        </article>
      </section>
      <section class="section">
        <div class="section-head"><div><p class="eyebrow">Valley Clients</p><h2>Pick one and move on.</h2></div></div>
        <div class="result-grid" data-valley-results></div>
      </section>
    `;
  }

  if (page === "client") {
    return `
      <section class="section split-section">
        <article class="wizard-focus compact">
          <p class="eyebrow">Step 2</p>
          <h2>${escapeHtml(currentRecord.displayName || "Client")}</h2>
          <p>Check the basics here before you build. If the name, contact, source URL, or services are wrong, fix them now instead of dragging bad data through the rest of the workflow.</p>
          <dl class="detail-grid">
            <div><dt>Industry</dt><dd>${escapeHtml(currentRecord.industry || "Not set")}</dd></div>
            <div><dt>Contact</dt><dd>${escapeHtml(contact.name || "Not set")}</dd></div>
            <div><dt>Phone</dt><dd>${escapeHtml(contact.phone || "Not set")}</dd></div>
            <div><dt>Email</dt><dd>${escapeHtml(contact.email || "Not set")}</dd></div>
            <div><dt>Location</dt><dd>${escapeHtml(currentRecord.locations?.[0]?.address || "Not set")}</dd></div>
            <div><dt>Live surface</dt><dd>${currentRecord.sourceUrls?.[0] ? `<a class="text-link" href="${escapeHtml(currentRecord.sourceUrls[0])}" target="_blank" rel="noreferrer">Open source</a>` : "Missing"}</dd></div>
          </dl>
          <div class="tag-row">
            ${(currentRecord.services || []).slice(0, 8).map((service) => `<span class="tag">${escapeHtml(service)}</span>`).join("")}
          </div>
          <div class="hero-actions">
            <a class="action-btn accent" href="${escapeHtml(pageHref("builder"))}">Go to Build</a>
            <a class="action-btn" href="${escapeHtml(pageHref("surfaces"))}">Check Source</a>
            <a class="action-btn" href="${escapeHtml(pageHref("brand"))}">Check Brand</a>
          </div>
        </article>
        <article class="wizard-focus compact">
          <p class="eyebrow">If Something Is Wrong</p>
          <h2>Edit the client details.</h2>
          <details class="support-block" open>
            <summary>Open edit form</summary>
            <form class="edit-form" data-intake-form style="margin-top:0.9rem;">
              <label>Client name<input class="field-input" name="displayName" required></label>
              <label>Industry<input class="field-input" name="industry"></label>
              <label>Primary contact<input class="field-input" name="primaryContact"></label>
              <label>Phone<input class="field-input" name="phone"></label>
              <label>Email<input class="field-input" name="email" type="email"></label>
              <label>Live URL<input class="field-input" name="liveUrl" type="url"></label>
              <label>Services<textarea class="field-area" name="services"></textarea></label>
              <label>Notes<textarea class="field-area" name="notes"></textarea></label>
              <button class="action-btn accent" type="submit">Save client dossier</button>
            </form>
          </details>
        </article>
      </section>
      <section class="section">
        <article class="wizard-focus compact">
          <p class="eyebrow">Workspace Plan</p>
          <h2>What this client gets by default.</h2>
          <div class="metric-strip">
            <article><span>Tester days</span><strong>${escapeHtml(String(currentRecord.workspacePlan?.freeTesterDays || 0))}</strong></article>
            <article><span>Included scans</span><strong>${escapeHtml(String(currentRecord.workspacePlan?.includedScans || 0))}</strong></article>
            <article><span>Commands included</span><strong>${escapeHtml(String(currentRecord.workspacePlan?.includedCommands || 0))}</strong></article>
            <article><span>Continuation months</span><strong>${escapeHtml(String(currentRecord.workspacePlan?.continuationDiscountMonths || 0))}</strong></article>
          </div>
        </article>
      </section>
    `;
  }

  if (page === "surfaces") {
    return `
      <section class="section split-section">
        <article class="wizard-focus compact">
          <p class="eyebrow">Live source</p>
          <h2>Judge the client surface before trusting the enhancement lane.</h2>
          <p>${currentRecord.sourceUrls?.[0] ? `Current primary source: ${currentRecord.sourceUrls[0]}` : "No live surface attached yet."}</p>
          <div class="hero-actions">
            ${currentRecord.sourceUrls?.[0] ? `<a class="action-btn" href="${escapeHtml(currentRecord.sourceUrls[0])}" target="_blank" rel="noreferrer">Open live site</a>` : ""}
            <button class="action-btn accent" type="button" data-load-scan>Run fresh scan</button>
          </div>
          <div class="source-list">
            ${(currentRecord.sourceFolders || []).map((item) => `<div><span>Source folder</span><strong>${escapeHtml(item)}</strong></div>`).join("")}
            ${(currentRecord.assetFolders || []).map((item) => `<div><span>Asset folder</span><strong>${escapeHtml(item)}</strong></div>`).join("")}
          </div>
        </article>
        <article class="wizard-focus compact">
          <p class="eyebrow">Scan summary</p>
          <h2>Read the result without living inside a console.</h2>
          <div class="metric-strip">
            <article><span>Files</span><strong>${escapeHtml(String(scanReport?.totals?.files || 0))}</strong></article>
            <article><span>Media</span><strong>${escapeHtml(String(scanReport?.totals?.media || 0))}</strong></article>
            <article><span>Routes</span><strong>${escapeHtml(String(scanReport?.totals?.routes || 0))}</strong></article>
            <article><span>Gate</span><strong>${escapeHtml(scanReport?.ok ? "green" : "pending")}</strong></article>
          </div>
          <details class="support-block">
            <summary>Open raw scan payload</summary>
            <pre class="support-console">${escapeHtml(pretty(scanReport || { message: "No scan loaded yet" }))}</pre>
          </details>
        </article>
      </section>
    `;
  }

  if (page === "brand") {
    return `
      <section class="section split-section">
        <article class="wizard-focus compact">
          <p class="eyebrow">Brand signal</p>
          <h2>Use the actual client identity, not a placeholder mood.</h2>
          <p>${escapeHtml(buildClientSummary(currentRecord))}</p>
          <div class="tag-row">
            <span class="tag">${escapeHtml(currentRecord.industry || "unknown industry")}</span>
            <span class="tag">${escapeHtml(currentRecord.status || "intake-created")}</span>
            <span class="tag">${escapeHtml((currentRecord.locations?.[0]?.address || "location pending"))}</span>
          </div>
        </article>
        <article class="wizard-focus compact">
          <p class="eyebrow">Logo and mark review</p>
          <h2>Current client assets.</h2>
          <div class="asset-grid" data-brand-grid></div>
        </article>
      </section>
    `;
  }

  if (page === "media") {
    return `
      <section class="section split-section">
        <form class="wizard-focus compact" data-asset-upload>
          <p class="eyebrow">Catalog asset</p>
          <h2>Attach new media with provenance.</h2>
          <label>Attach asset<input class="field-input" name="assetFile" type="file"></label>
          <label>Provenance note<input class="field-input" name="provenance" placeholder="operator-uploaded"></label>
          <button class="action-btn accent" type="submit">Catalog asset</button>
        </form>
        <article class="wizard-focus compact">
          <p class="eyebrow">Still2Vid handoff</p>
          <h2>Turn a real client asset into motion.</h2>
          <p>The forge accepts uploaded, harvested, licensed, or AI-receipted media only. It stores the handoff in this browser and opens the Free99 gated app.</p>
          <div class="hero-actions">
            <button class="action-btn accent" type="button" data-open-still2vid>Open Still2Vid</button>
            <button class="action-btn" type="button" data-ai-identity-request>Generate AI identity image</button>
          </div>
          <div class="snapshot-box" data-media-handoff-status>No handoff sent yet.</div>
        </article>
      </section>
      <section class="section">
        ${getProofVideoCard()}
      </section>
      <section class="section">
        <div class="section-head"><div><p class="eyebrow">Vault</p><h2>Media tied to this client.</h2></div></div>
        <div class="asset-grid" data-asset-grid></div>
      </section>
    `;
  }

  if (page === "design") {
    return `
      <section class="section split-section">
        <article class="wizard-focus compact">
          <p class="eyebrow">Design lane</p>
          <h2>Choose a client-specific direction before the build hardens.</h2>
          <div class="engine-list">
            ${designEngines.map((engine) => `
              <article class="engine-card">
                <span>${escapeHtml(engine.recipe)}</span>
                <strong>${escapeHtml(engine.name)}</strong>
                <p>${escapeHtml(engine.notes)}</p>
              </article>
            `).join("")}
          </div>
        </article>
        <article class="wizard-focus compact">
          <p class="eyebrow">Current surface subject</p>
          <h2>Use real proof as the creative center.</h2>
          <img class="still-frame" src="${escapeHtml(appHref("assets/proof/client-app-factory-workflow-poster.png"))}" alt="Client App Factory browser proof poster">
        </article>
      </section>
    `;
  }

  if (page === "builder") {
    return `
      <section class="section">
        <article class="wizard-focus compact">
          <p class="eyebrow">Step 3</p>
          <h2>Run the build.</h2>
          <p>If you do not have a special reason to isolate one stage, use <strong>Full Factory</strong>. The other buttons are here for repair work and debugging, not normal operation.</p>
        </article>
      </section>
      <section class="section">
        <div class="runway">
          <button class="runway-stage" type="button" data-run-core><span>1</span><strong>Core</strong><p>Clone and stamp the white-label base.</p></button>
          <button class="runway-stage" type="button" data-run-enhance><span>2</span><strong>Enhance</strong><p>Harvest surfaces and apply client-specific media and design.</p></button>
          <button class="runway-stage" type="button" data-run-verify><span>3</span><strong>Verify</strong><p>Check routes, assets, proof, and release health.</p></button>
          <button class="runway-stage accent" type="button" data-run-factory><span>4</span><strong>Full Factory</strong><p>Run the complete pipeline for this client.</p></button>
        </div>
      </section>
      <section class="section split-section">
        <article class="wizard-focus compact">
          <p class="eyebrow">What just happened</p>
          <h2>Latest build result.</h2>
          <div class="snapshot-box" data-run-summary></div>
          <div class="hero-actions">
            <a class="action-btn" href="${escapeHtml(pageHref("generated"))}">Open Preview App</a>
            <a class="action-btn" href="${escapeHtml(pageHref("proofs"))}">Open QA Check</a>
          </div>
        </article>
        <article class="wizard-focus compact">
          <p class="eyebrow">If the build looks wrong</p>
          <h2>Get help instead of guessing.</h2>
          <p>Open Auren for a plain-language diagnosis, or open Details only when you need the raw payloads.</p>
          <div class="hero-actions">
            <a class="action-btn" href="${escapeHtml(pageHref("auren"))}">Ask Auren</a>
          </div>
        </article>
      </section>
    `;
  }

  if (page === "generated") {
    return `
      <section class="section">
        <div class="section-head"><div><p class="eyebrow">Step 4</p><h2>Open the generated app.</h2></div></div>
        ${renderArtifactTiles()}
      </section>
      <section class="section split-section">
        <article class="wizard-focus compact">
          <p class="eyebrow">Preview Routes</p>
          <h2>Use these to review what was built.</h2>
          <div class="route-table" data-route-map></div>
        </article>
        <article class="wizard-focus compact">
          <p class="eyebrow">Next step</p>
          <h2>If the app looks good, continue to QA.</h2>
          <p>Do not deploy from here. Use this page only to open the routes and visually inspect the generated package.</p>
          <div class="hero-actions">
            <a class="action-btn accent" href="${escapeHtml(pageHref("proofs"))}">Go to QA Check</a>
            <a class="action-btn" href="${escapeHtml(pageHref("auren"))}">Ask Auren to review it</a>
          </div>
          <details class="support-block">
            <summary>Open path manifest</summary>
            <pre class="support-console" data-path-manifest></pre>
          </details>
        </article>
      </section>
    `;
  }

  if (page === "proofs") {
    return `
      <section class="section split-section">
        ${getProofVideoCard()}
        <article class="wizard-focus compact">
          <p class="eyebrow">Step 5</p>
          <h2>Decide whether the app is actually ready.</h2>
          <p>This page is the gate. If proof is missing or the app still looks wrong, stop here and fix it before you think about deployment.</p>
          <div class="artifact-grid" data-proof-grid></div>
          <div class="hero-actions">
            <a class="action-btn accent" href="${escapeHtml(pageHref("deployments"))}">Go to Launch</a>
            <a class="action-btn" href="${escapeHtml(pageHref("builder"))}">Back to Build</a>
          </div>
        </article>
      </section>
      <section class="section">
        <details class="support-block">
          <summary>Open recent proof events</summary>
          <div class="ledger-list" data-proof-ledger style="margin-top:0.85rem;"></div>
        </details>
      </section>
    `;
  }

  if (page === "deployments") {
    return `
      <section class="section split-section">
        <article class="wizard-focus compact">
          <p class="eyebrow">Step 12</p>
          <h2>Launch only what passed review.</h2>
          <p>This is the last stop. Confirm the target, make sure the release gates are clean, then push the approved app live.</p>
          <div class="snapshot-box" data-deploy-summary></div>
        </article>
        <article class="wizard-focus compact">
          <p class="eyebrow">Release Gates</p>
          <h2>Do not skip these checks.</h2>
          <div class="gate-list" data-gate-list></div>
        </article>
      </section>
    `;
  }

  if (page === "workspace") {
    return `
      <section class="section split-section">
        <article class="wizard-focus compact">
          <p class="eyebrow">Step 10</p>
          <h2>Prepare the workspace handoff.</h2>
          <p>This is where the client trial, included scans, command allowance, and handoff readiness are reviewed before launch.</p>
          <div class="metric-strip">
            <article><span>Tester days</span><strong>${escapeHtml(String(currentRecord.workspacePlan?.freeTesterDays || 0))}</strong></article>
            <article><span>Included scans</span><strong>${escapeHtml(String(currentRecord.workspacePlan?.includedScans || 0))}</strong></article>
            <article><span>Commands included</span><strong>${escapeHtml(String(currentRecord.workspacePlan?.includedCommands || 0))}</strong></article>
            <article><span>Trial status</span><strong>${escapeHtml(currentRecord.trialUsage?.status || "pending")}</strong></article>
          </div>
          <div class="hero-actions">
            <a class="action-btn accent" href="${escapeHtml(pageHref("payment", { clientId: currentRecord.clientId || "empire-pallets" }))}">Next: Payment</a>
          </div>
        </article>
        <article class="wizard-focus compact">
          <p class="eyebrow">Workspace notes</p>
          <h2>What the client should understand.</h2>
          <p>The workspace is the client-facing control room after the app is generated. Keep it simple: tester access, usage limits, and how they continue after the preview window.</p>
        </article>
      </section>
    `;
  }

  if (page === "payment") {
    return `
      <section class="section split-section">
        <article class="wizard-focus compact">
          <p class="eyebrow">Step 11</p>
          <h2>Connect the SkyePay lane.</h2>
          <p>Payment should be visible before launch so the client has a clean preview-first conversion path.</p>
          <dl class="detail-grid">
            <div><dt>Provider</dt><dd>${escapeHtml(currentRecord.paymentPlan?.provider || "Not set")}</dd></div>
            <div><dt>Status</dt><dd>${escapeHtml(currentRecord.paymentPlan?.status || "Not set")}</dd></div>
            <div><dt>Mode</dt><dd>${escapeHtml(currentRecord.paymentPlan?.mode || "Not set")}</dd></div>
            <div><dt>Lane</dt><dd>${renderHref(currentRecord.paymentPlan?.lane || "", "Open lane")}</dd></div>
          </dl>
          <div class="hero-actions">
            <a class="action-btn accent" href="${escapeHtml(pageHref("deployments", { clientId: currentRecord.clientId || "empire-pallets" }))}">Next: Go Live</a>
          </div>
        </article>
        <article class="wizard-focus compact">
          <p class="eyebrow">Payment rule</p>
          <h2>No launch without a conversion lane.</h2>
          <p>The app can be previewed without billing, but production handoff needs a clear continuation path.</p>
        </article>
      </section>
    `;
  }

  if (page === "auren") {
    return `
      <section class="section split-section auren-layout">
        <article class="auren-thread">
          <div class="section-head"><div><p class="eyebrow">Conversation</p><h2>Auren stays in the build with us.</h2></div></div>
          <div class="auren-log" data-auren-log></div>
          <form class="auren-form" data-auren-form>
            <textarea class="field-area" name="message" placeholder="What is weak here, what is broken, what should we do next?"></textarea>
            <div class="hero-actions">
              <label class="toggle-line"><input type="checkbox" data-auren-live-ai> Use live Auren when available</label>
              <button class="action-btn accent" type="submit">Ask Auren</button>
              <button class="action-btn" type="button" data-auren-clear>Reset thread</button>
            </div>
          </form>
        </article>
        <article class="studio-sheet">
          <p class="eyebrow">Context</p>
          <h2>Current build picture.</h2>
          <div class="context-grid" data-auren-context></div>
          <div class="section-head mini"><div><p class="eyebrow">Issues</p><h3>What Auren sees right now.</h3></div></div>
          <div class="issue-list" data-auren-issues></div>
          <div class="section-head mini"><div><p class="eyebrow">Next actions</p><h3>Use these instead of guessing.</h3></div></div>
          <div class="action-stack" data-auren-actions></div>
          <div class="prompt-row" data-auren-prompts></div>
        </article>
      </section>
    `;
  }

  if (page === "activity") {
    return `
      <section class="section split-section">
        <article class="studio-sheet">
          <p class="eyebrow">Recent events</p>
          <h2>Factory event trail.</h2>
          <div class="ledger-list" data-ledger-list></div>
        </article>
        <article class="studio-sheet">
          <p class="eyebrow">Latest snapshot</p>
          <h2>Most recent run summary.</h2>
          <div class="snapshot-box" data-run-summary></div>
        </article>
      </section>
    `;
  }

  return `
    <section class="section split-section">
      <article class="studio-sheet">
        <p class="eyebrow">Factory health</p>
        <h2>Runtime and AI readiness.</h2>
        <div class="context-grid">
          <article><span>API</span><strong>${escapeHtml(backendReady ? "live" : "offline")}</strong></article>
          <article><span>AI</span><strong>${escapeHtml(aiBadge())}</strong></article>
          <article><span>Records</span><strong>${escapeHtml(String(backendHealth?.records || 0))}</strong></article>
        </div>
      </article>
      <article class="studio-sheet">
        <p class="eyebrow">Seed loaders</p>
        <h2>Jump into a baseline fast.</h2>
        <div class="seed-list">
          <button class="seed-row" type="button" data-load-template><strong>White Label Base</strong><span>Internal scaffold only</span></button>
          <button class="seed-row" type="button" data-load-empire><strong>Empire Pallets</strong><span>Ops reference</span></button>
          <button class="seed-row" type="button" data-load-next-level><strong>Next Level Gaming</strong><span>Retail reference</span></button>
        </div>
      </article>
    </section>
    <section class="section split-section">
      <article class="studio-sheet">
        <p class="eyebrow">Export</p>
        <h2>Carry the current record out cleanly.</h2>
        <button class="action-btn accent" type="button" data-export-record>Export current record</button>
      </article>
      <article class="studio-sheet">
        <p class="eyebrow">Wiring</p>
        <h2>Current platform map.</h2>
        <div class="wiring-list" data-wiring-grid></div>
      </article>
    </section>
  `;
}

function renderBrandGrid() {
  const container = $("[data-brand-grid]");
  if (!container) return;
  const items = [
    ...(currentRecord.logoAssets || []).map((asset) => ({ asset, type: "Logo asset" })),
    ...(currentRecord.mediaAssets || []).filter((asset) => /\.(png|jpe?g|webp|svg)$/i.test(asset)).slice(0, 4).map((asset) => ({ asset, type: "Surface still" }))
  ];
  container.innerHTML = items.length ? items.map(({ asset, type }) => {
    const href = toFactoryHref(asset) || asset;
    return `
      <article class="asset-card">
        <div class="asset-card-media"><img src="${escapeHtml(href)}" alt="${escapeHtml(type)}"></div>
        <strong>${escapeHtml(type)}</strong>
        <span>${escapeHtml(pathLabel(asset))}</span>
        <button class="action-btn small" type="button" data-open-still2vid="${escapeHtml(asset)}" data-source-type="${escapeHtml(type === "Logo asset" ? "live-surface" : "operator-upload")}">Animate in Still2Vid</button>
      </article>
    `;
  }).join("") : `<article class="empty-state"><strong>No brand assets attached yet.</strong><span>Enhance or upload media to build out the identity surface.</span></article>`;
}

function renderAssets() {
  const container = $("[data-asset-grid]");
  if (!container) return;
  const uploadedItems = (currentRecord.assetVault || []).map((item) => ({
    asset: item.publicPath || item.fileName,
    type: item.type === "media" ? "Cataloged media" : "Cataloged document",
    provenance: item.provenance
  }));
  const items = [
    ...(currentRecord.logoAssets || []).map((asset) => ({ asset, type: "Logo asset", provenance: "harvested" })),
    ...(currentRecord.mediaAssets || []).map((asset) => ({ asset, type: /\.(mp4|webm)$/i.test(asset) ? "Video asset" : "Media asset", provenance: "harvested" })),
    ...uploadedItems
  ];
  container.innerHTML = items.length ? items.map(({ asset, type, provenance }) => {
    const isVideo = /\.(mp4|webm|mov)$/i.test(asset);
    const isImage = /\.(png|jpe?g|webp|gif|svg)$/i.test(asset);
    const href = toFactoryHref(asset) || asset;
    const media = isVideo
      ? `<video preload="none" src="${escapeHtml(href)}" muted playsinline loop controls></video>`
      : isImage
        ? `<img src="${escapeHtml(href)}" alt="${escapeHtml(type)}">`
        : `<div class="file-pill">${escapeHtml(pathLabel(asset))}</div>`;
    return `
      <article class="asset-card">
        <div class="asset-card-media">${media}</div>
        <strong>${escapeHtml(type)}</strong>
        <span>${escapeHtml(pathLabel(asset))}</span>
        <p>${escapeHtml(provenance || "attached")}</p>
        ${isImage ? `<button class="action-btn small" type="button" data-open-still2vid="${escapeHtml(asset)}" data-source-type="${escapeHtml(provenance === "harvested" ? "live-surface" : "operator-upload")}">Animate in Still2Vid</button>` : ""}
      </article>
    `;
  }).join("") : `<article class="empty-state"><strong>No media attached yet.</strong><span>Run enhance or upload a real asset.</span></article>`;
}

function renderValleyBusinesses() {
  const container = $("[data-valley-results]");
  if (!container) return;
  const query = ($("[data-valley-search]")?.value || "").trim().toLowerCase();
  const matches = valleyBusinesses.filter((business) => {
    if (!query) return true;
    const haystack = [
      business.name,
      business.niche,
      business.category,
      business.subcategory,
      business.city,
      business.state
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });
  const limit = query ? 24 : 12;
  const filtered = matches.slice(0, limit);
  container.innerHTML = filtered.length ? filtered.map((business) => `
    <article class="result-card">
      <div class="result-mark" aria-hidden="true"></div>
      <div class="result-copy">
        <strong>${escapeHtml(business.name)}</strong>
        <span>${escapeHtml([business.niche || business.category, [business.city, business.state].filter(Boolean).join(", ")].filter(Boolean).join(" · "))}</span>
        <p>${escapeHtml(business.description || "Verified business ready for import.")}</p>
      </div>
      <div class="result-actions">
        <button class="action-btn" type="button" data-import-valley="${escapeHtml(business.id)}">Import Record</button>
        <button class="action-btn accent" type="button" data-import-run-valley="${escapeHtml(business.id)}">Import + Build</button>
      </div>
    </article>
  `).join("") + `
    <article class="empty-state">
      <strong>${escapeHtml(query ? `Showing ${filtered.length} of ${matches.length} matches.` : `Showing ${filtered.length} starter clients.`)}</strong>
      <span>${escapeHtml(query ? "Refine the search if this still feels too broad." : "Search by name, niche, city, or category to reveal more Valley clients.")}</span>
    </article>
  ` : `<article class="empty-state"><strong>No Valley matches.</strong><span>Try a broader search or refresh the list.</span></article>`;
}

function renderRouteMap() {
  const container = $("[data-route-map]");
  if (!container) return;
  const routeBase = buildClientAppBase(currentRecord);
  const publicRoutes = (currentRecord.publicRoutes || []).map((route) => ({ route, type: "Public", href: `${routeBase}${route}` }));
  const privateRoutes = (currentRecord.privateRoutes || []).map((route) => ({ route, type: "Private", href: `${routeBase}${route}` }));
  const routes = [...publicRoutes, ...privateRoutes];
  container.innerHTML = routes.length ? routes.map((item) => `
    <article class="route-row">
      <strong>${escapeHtml(item.route)}</strong>
      <span>${escapeHtml(item.type)}</span>
      <a class="text-link" href="${escapeHtml(appHref(item.href))}">Open route</a>
    </article>
  `).join("") : `<article class="empty-state"><strong>No routes written yet.</strong><span>Run the core stage first.</span></article>`;
  const manifest = {
    client: currentRecord.displayName,
    sourceFolder: currentRecord.sourceFolders?.[0] || "",
    upgradedFolder: latestGeneratedApp(currentRecord)?.publishFolder || currentRecord.deploymentTargets?.[0]?.publishFolder || "",
    assetFolder: currentRecord.assetFolders?.[0] || "",
    publicEntry: "/index.html",
    qrRoute: (currentRecord.publicRoutes || []).includes("/scan.html") ? "/scan.html" : "",
    previewRoute: currentRecord.privateRoutes?.[0] || "",
    quoteRoute: (currentRecord.publicRoutes || []).includes("/quote.html") ? "/quote.html" : "",
    finalQrTarget: currentRecord.deploymentTargets?.[0]?.finalQrTarget || ""
  };
  const manifestNode = $("[data-path-manifest]");
  if (manifestNode) manifestNode.textContent = pretty(manifest);
}

function renderProofGrid() {
  const container = $("[data-proof-grid]");
  if (!container) return;
  const proofItems = [
    { name: "Factory MCP receipt", status: "Recorded", href: "MCP_TOOLING_RECEIPT.json" },
    { name: "Path manifest", status: "Generated", href: "APP_PATH_MANIFEST.json" },
    { name: "Generated app", status: latestGeneratedApp(currentRecord) ? "Linked" : "Waiting", href: `${buildClientAppBase(currentRecord)}/index.html` },
    { name: "Workflow reel", status: "Browser proof", href: "assets/proof/client-app-factory-workflow.webm" },
    { name: "Scanner report", status: scanReport?.ok ? "Green" : "Pending", href: getScanReportHref() },
    ...((currentRecord.proofArtifacts || []).map((href) => ({ name: pathLabel(href), status: "Attached", href })))
  ];
  const unique = proofItems.filter((item, index, list) => list.findIndex((other) => other.href === item.href) === index);
  container.innerHTML = unique.map((item) => `
    <article class="artifact-card">
      <p>${escapeHtml(item.status)}</p>
      <h3>${escapeHtml(item.name)}</h3>
      ${renderHref(item.href, "Open artifact")}
    </article>
  `).join("");
}

function renderLedger() {
  const listHtml = (factoryLedger || []).slice().reverse().slice(0, 12).map((event) => `
    <article class="ledger-event">
      <strong>${escapeHtml(event.type || "event")}</strong>
      <span>${escapeHtml(event.message || event.artifact || "Factory event recorded")}</span>
      <time>${escapeHtml(event.createdAt ? new Date(event.createdAt).toLocaleString() : "")}</time>
    </article>
  `).join("") || `<article class="empty-state"><strong>No backend events yet.</strong><span>Run or import something and the trail will appear here.</span></article>`;
  $$("[data-ledger-list], [data-proof-ledger]").forEach((node) => {
    node.innerHTML = listHtml;
  });
}

function renderRunSummary() {
  const summary = pipelineSnapshots.last ? pretty(pipelineSnapshots.last) : "No pipeline run recorded yet.";
  $$("[data-run-summary]").forEach((node) => {
    node.innerHTML = `<pre class="support-console">${escapeHtml(summary)}</pre>`;
  });
}

function renderDeploySummary() {
  const target = currentRecord.deploymentTargets?.[0] || {};
  const node = $("[data-deploy-summary]");
  if (!node) return;
  node.innerHTML = `
    <dl class="detail-grid">
      <div><dt>Provider</dt><dd>${escapeHtml(target.provider || "Not set")}</dd></div>
      <div><dt>Status</dt><dd>${escapeHtml(target.status || "Not set")}</dd></div>
      <div><dt>Publish folder</dt><dd>${escapeHtml(target.publishFolder || "Not set")}</dd></div>
      <div><dt>Final QR target</dt><dd>${escapeHtml(target.finalQrTarget || "Not set")}</dd></div>
    </dl>
  `;
}

function renderGateList() {
  const gate = $("[data-gate-list]");
  if (!gate) return;
  gate.innerHTML = completionGate.map((item) => {
    const ok = scanReport?.completionGate?.[item] ?? false;
    return `
      <article class="gate-row">
        <strong>${escapeHtml(item)}</strong>
        <span class="status-chip ${ok ? "ok" : "warn"}">${ok ? "tracked" : "needs proof"}</span>
      </article>
    `;
  }).join("");
}

function renderWiringGrid() {
  const container = $("[data-wiring-grid]");
  if (!container) return;
  const rows = [
    ["Local MCP", "quantumskyes stdio server via npm run mcp:mine", ".mcp.json"],
    ["Source packet", currentRecord.sourceFolders?.[0] || "Not set", null],
    ["Asset vault", currentRecord.assetFolders?.[0] || "Not set", null],
    ["Generated app", latestGeneratedApp(currentRecord)?.publishFolder || "Run core first", `${buildClientAppBase(currentRecord)}/index.html`],
    ["Payment lane", currentRecord.paymentPlan?.lane || "Not set", currentRecord.paymentPlan?.lane || null],
    ["Verification report", currentRecord.verificationReports?.[0] || "Not set", currentRecord.verificationReports?.[0] || null]
  ];
  container.innerHTML = rows.map(([label, value, href]) => `
    <article class="wire-row">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(value)}</span>
      ${href ? renderHref(href, "Open") : ""}
    </article>
  `).join("");
}

function pushAurenMessage(role, payload = {}) {
  const entry = {
    id: `${role}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    role,
    message: payload.message || payload.reply || "",
    engine: payload.engine || "",
    note: payload.note || "",
    createdAt: new Date().toISOString(),
    context: payload.context || null,
    issues: payload.issues || [],
    actions: payload.actions || [],
    prompts: payload.prompts || []
  };
  aurenState.history = [...aurenState.history, entry].slice(-24);
  if (role === "assistant") aurenState.latest = entry;
}

function resetAurenThread(seed = true) {
  aurenState = {
    clientId: getCurrentClientId(currentRecord),
    history: [],
    latest: null
  };
  if (!seed) return;
  pushAurenMessage("assistant", {
    message: `I’m here with ${currentRecord.displayName}. Ask me what still looks weak, what is actually blocking release, or what the next smartest move is.`,
    engine: "factory-context",
    context: {
      displayName: currentRecord.displayName,
      status: currentRecord.status,
      industry: currentRecord.industry,
      liveSurface: currentRecord.sourceUrls?.[0] || "",
      previewCode: currentRecord.previewConfig?.accessCode || ""
    },
    actions: [
      { label: "Go review proof", href: pageHref("proofs") },
      { label: "Open build runway", href: pageHref("builder") },
      { label: "Check live surfaces", href: pageHref("surfaces") }
    ],
    prompts: [
      `What should we fix before we ship ${currentRecord.displayName}?`,
      `How should ${currentRecord.displayName} feel more bespoke?`,
      `What is the next smartest move on ${currentRecord.displayName}?`
    ]
  });
}

function renderAuren() {
  const log = $("[data-auren-log]");
  const prompts = $("[data-auren-prompts]");
  const context = $("[data-auren-context]");
  const issues = $("[data-auren-issues]");
  const actions = $("[data-auren-actions]");
  if (!log || !prompts || !context || !issues || !actions) return;
  if (aurenState.clientId !== getCurrentClientId(currentRecord) || !aurenState.history.length) resetAurenThread(true);
  log.innerHTML = aurenState.history.map((entry) => `
    <article class="auren-bubble ${entry.role}">
      <div class="auren-meta">
        <strong>${entry.role === "assistant" ? "Auren" : "You"}</strong>
        ${entry.engine ? `<span>${escapeHtml(entry.engine)}</span>` : ""}
      </div>
      <p>${escapeHtml(entry.message)}</p>
      ${entry.note ? `<span class="quiet-pill">${escapeHtml(entry.note)}</span>` : ""}
    </article>
  `).join("");
  const latest = aurenState.latest || {};
  const latestContext = latest.context || {};
  context.innerHTML = [
    ["Client", latestContext.displayName || currentRecord.displayName],
    ["Status", latestContext.status || currentRecord.status],
    ["Industry", latestContext.industry || currentRecord.industry || "Not set"],
    ["Live surface", latestContext.liveSurface || currentRecord.sourceUrls?.[0] || "Missing"],
    ["Engine", latest.engine || "factory-context"]
  ].map(([label, value]) => `
    <article class="context-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "Pending")}</strong>
    </article>
  `).join("");
  issues.innerHTML = (latest.issues?.length ? latest.issues : [{
    title: "No issue digest yet",
    detail: "Ask Auren about the current client and she’ll summarize the sharpest problems.",
    severity: "ok"
  }]).map((issue) => `
    <article class="issue-card">
      <strong>${escapeHtml(issue.title)}</strong>
      <p>${escapeHtml(issue.detail || "")}</p>
      <span class="status-chip ${issue.severity === "critical" ? "warn" : "ok"}">${escapeHtml(issue.severity || "info")}</span>
    </article>
  `).join("");
  actions.innerHTML = (latest.actions || []).map((action, index) => `
    <button class="action-link" type="button" data-auren-action="${index}">
      <strong>${escapeHtml(action.label)}</strong>
      <span>${escapeHtml(action.reason || "Open the right lane next.")}</span>
    </button>
  `).join("");
  prompts.innerHTML = (latest.prompts || []).map((prompt, index) => `
    <button class="quick-prompt" type="button" data-auren-prompt="${index}">${escapeHtml(prompt)}</button>
  `).join("");
  log.scrollTop = log.scrollHeight;
}

function renderSupportDrawer() {
  const drawer = $("[data-support-drawer]");
  if (!drawer) return;
  drawer.hidden = !supportDrawerOpen;
  drawer.innerHTML = `
    <div class="support-drawer-head">
      <div>
        <p class="eyebrow">Details</p>
        <h2>Support layers stay available without owning the product.</h2>
      </div>
      <button class="action-btn" type="button" data-support-close>Close</button>
    </div>
    <div class="support-grid">
      <article class="support-card">
        <p class="eyebrow">Backend health</p>
        <pre class="support-console">${escapeHtml(pretty(backendHealth || { ok: false, error: "offline" }))}</pre>
      </article>
      <article class="support-card">
        <p class="eyebrow">Latest pipeline snapshot</p>
        <pre class="support-console">${escapeHtml(pretty(pipelineSnapshots.last || { message: "No pipeline run recorded yet." }))}</pre>
      </article>
      <article class="support-card wide">
        <p class="eyebrow">Latest scan report</p>
        <pre class="support-console">${escapeHtml(pretty(scanReport || { message: "No scan report loaded yet." }))}</pre>
      </article>
    </div>
  `;
}

function renderPage() {
  const mount = $("[data-page-mount]");
  if (!mount) return;
  mount.innerHTML = pageTemplate();
  renderValleyBusinesses();
  renderAssets();
  renderBrandGrid();
  renderRouteMap();
  renderProofGrid();
  renderLedger();
  renderRunSummary();
  renderDeploySummary();
  renderGateList();
  renderWiringGrid();
  renderAuren();
  populateIntakeForm();
}

function populateIntakeForm() {
  const form = $("[data-intake-form]");
  if (!form) return;
  const contact = getPrimaryContact(currentRecord);
  form.displayName.value = currentRecord.displayName || "";
  form.industry.value = currentRecord.industry || "";
  form.primaryContact.value = contact.name || "";
  form.phone.value = contact.phone || "";
  form.email.value = contact.email || "";
  form.liveUrl.value = currentRecord.sourceUrls?.[0] || "";
  form.services.value = (currentRecord.services || []).join("\n");
  form.notes.value = currentRecord.notes || "";
}

function renderApp() {
  setTitle();
  renderHeader();
  renderHero();
  renderPage();
  renderSupportDrawer();
  updateClientQuery();
  saveLocalRecord(currentRecord);
  savePipelineState();
}

async function loadClientRecord(clientId, options = {}) {
  let record = null;
  if (backendReady) {
    try {
      const response = await apiRequest(`/factory/records/${clientId}`);
      record = response.record;
    } catch {}
  }
  const fallbackPaths = [
    ...(options.fallbackPaths || []),
    ...(recordFallbackPaths[clientId] || [])
  ];
  if (!record && fallbackPaths.length) {
    record = await fetchFirstJson(fallbackPaths, embeddedFallbackRecords[clientId] || null);
  }
  if (!record) {
    const localRecord = loadLocalRecord();
    if (localRecord?.clientId === clientId) record = localRecord;
  }
  if (!record) return;
  const nextClientId = record.clientId || clientId;
  const activePipelineClient = pipelineSnapshots.clientId || currentRecord.clientId;
  currentRecord = record;
  if (activePipelineClient !== nextClientId) {
    pipelineSnapshots = {};
    savePipelineState();
  }
  resetAurenThread(true);
  renderApp();
}

async function loadTemplateRecord() {
  await loadClientRecord("skye-app-template");
}

async function loadEmpireRecord() {
  await loadClientRecord("empire-pallets");
}

async function loadNextLevelRecord() {
  await loadClientRecord("next-level-gaming-goodyear", {
    fallbackPaths: recordFallbackPaths["next-level-gaming-az"]
  });
}

async function importValleyBusiness(businessId, options = {}) {
  if (!backendReady) return;
  try {
    const response = await apiRequest("/factory/valley/import", {
      method: "POST",
      body: { businessId }
    });
    currentRecord = response.record;
    pipelineSnapshots = {};
    pipelineSnapshots.clientId = currentRecord.clientId;
    pipelineSnapshots.statusMessage = options.runFactory ? "Client imported. Opening build runway…" : "Client imported.";
    savePipelineState();
    resetAurenThread(true);
    renderApp();
    await refreshLedger();
    if (options.runFactory) {
      window.location.href = pageHref("builder", { clientId: currentRecord.clientId, autorun: "full" });
      return;
    }
    window.location.href = pageHref("client", { clientId: currentRecord.clientId });
  } catch (error) {
    console.warn("Valley import failed", error);
  }
}

async function loadScanReport({ runBackend = true } = {}) {
  if (backendReady && runBackend) {
    try {
      const response = await apiRequest("/factory/scan", {
        method: "POST",
        body: { clientId: getCurrentClientId(currentRecord) }
      });
      scanReport = response.report;
      if (response.record) currentRecord = response.record;
      renderApp();
      await refreshLedger();
      return;
    } catch {}
  }
  const href = getScanReportHref(currentRecord);
  scanReport = href ? await fetchJson(href, scanReport) : scanReport;
  renderApp();
}

async function runFactoryStage(stage) {
  const config = stageConfig[stage];
  if (!config || !backendReady) return;
  try {
    pipelineSnapshots.statusMessage = `Running ${stage} stage…`;
    renderHeader();
    const response = await apiRequest(config.path, {
      method: "POST",
      body: { clientId: getCurrentClientId(currentRecord) }
    });
    currentRecord = response.record || currentRecord;
    scanReport = response.scan || response.core?.scan || scanReport;
    pipelineSnapshots.last = {
      stage,
      completedAt: new Date().toISOString(),
      summary: {
        ok: response.ok,
        clientId: response.clientId || currentRecord.clientId,
        routes: response.generated?.routes?.publicRoutes?.length || currentRecord.publicRoutes?.length || 0,
        report: response.reportPath || response.record?.verificationReports?.[0] || null
      }
    };
    pipelineSnapshots.clientId = response.clientId || currentRecord.clientId;
    pipelineSnapshots.statusMessage = config.success;
    savePipelineState();
    renderApp();
    await refreshLedger();
    if (stage === "full") {
      const url = new URL(window.location.href);
      url.searchParams.delete("autorun");
      history.replaceState({}, "", url);
      window.location.href = pageHref("proofs", { clientId: currentRecord.clientId });
    }
  } catch (error) {
    pipelineSnapshots.last = {
      stage,
      completedAt: new Date().toISOString(),
      summary: { ok: false, error: error.message }
    };
    pipelineSnapshots.clientId = currentRecord.clientId;
    pipelineSnapshots.statusMessage = `Unable to finish ${stage}: ${error.message}`;
    savePipelineState();
    renderApp();
  }
}

async function askAuren(message) {
  const clean = String(message || "").trim();
  if (!clean) return;
  pushAurenMessage("user", { message: clean });
  renderAuren();
  try {
    if (!backendReady) throw new Error("Factory API offline. Auren needs the live backend.");
    const allowLiveAi = Boolean($("[data-auren-live-ai]")?.checked);
    const response = await apiRequest("/factory/assistant", {
      method: "POST",
      body: {
        clientId: getCurrentClientId(currentRecord),
        room: "auren",
        message: clean,
        allowLiveAi,
        record: currentRecord,
        scanReport,
        verificationReport: pipelineSnapshots.last?.summary || null
      }
    });
    pushAurenMessage("assistant", response);
  } catch (error) {
    pushAurenMessage("assistant", {
      message: `I couldn't finish the reply cleanly: ${error.message}`,
      engine: "factory-context-fallback",
      note: "Check the backend or rerun the current stage."
    });
  }
  renderAuren();
}

function exportRecord() {
  const blob = new Blob([pretty(currentRecord)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${currentRecord.clientId || "client"}-factory-record.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",").pop() : result);
    });
    reader.addEventListener("error", () => reject(reader.error || new Error("Unable to read file.")));
    reader.readAsDataURL(file);
  });
}

async function submitAssetUpload(form) {
  const file = form.assetFile.files?.[0];
  if (!file || !backendReady) return;
  const response = await apiRequest("/factory/assets", {
    method: "POST",
    body: {
      clientId: getCurrentClientId(currentRecord),
      fileName: file.name,
      mimeType: file.type,
      base64: await fileToBase64(file),
      provenance: form.provenance.value || "operator-uploaded"
    }
  });
  currentRecord = response.record;
  pipelineSnapshots.clientId = currentRecord.clientId;
  pipelineSnapshots.statusMessage = "Asset cataloged.";
  savePipelineState();
  form.reset();
  renderApp();
  await refreshLedger();
}

function mediaHandoffStatus(message) {
  const node = $("[data-media-handoff-status]");
  if (node) node.textContent = message;
}

function firstStill2VidAsset(record = currentRecord) {
  const vaultImage = (record.assetVault || [])
    .map((item) => item.publicPath || item.storagePath || item.fileName)
    .find((asset) => /\.(png|jpe?g|webp|gif|svg)$/i.test(String(asset || "")));
  return (record.logoAssets || [])[0]
    || (record.mediaAssets || []).find((asset) => /\.(png|jpe?g|webp|gif|svg)$/i.test(String(asset || "")))
    || vaultImage
    || "";
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("Unable to read media blob.")));
    reader.readAsDataURL(blob);
  });
}

async function fetchAssetAsDataUrl(assetUrl) {
  if (!assetUrl || assetUrl.startsWith("data:")) return assetUrl;
  const response = await fetch(assetUrl, { mode: "cors" });
  if (!response.ok) throw new Error(`Media fetch failed: ${response.status}`);
  const blob = await response.blob();
  if (!/^image\//i.test(blob.type || "")) throw new Error("Still2Vid handoff needs an image asset.");
  return blobToDataUrl(blob);
}

async function openStill2Vid(asset = "", sourceType = "operator-upload", receipt = "") {
  const selectedAsset = asset || firstStill2VidAsset(currentRecord);
  const sourceUrl = selectedAsset ? (toFactoryHref(selectedAsset) || selectedAsset) : "";
  const payload = {
    sourceApp: "client-app-factory",
    clientId: getCurrentClientId(currentRecord),
    client: currentRecord.displayName || "",
    sourceName: selectedAsset ? pathLabel(selectedAsset) : "manual-upload-required",
    sourceType,
    sourceUrl,
    receipt: receipt || (selectedAsset ? `factory-media:${sourceType}:${pathLabel(selectedAsset)}` : "manual upload required"),
    returnTo: window.location.href
  };
  if (sourceUrl) {
    try {
      payload.imageDataUrl = await fetchAssetAsDataUrl(sourceUrl);
      mediaHandoffStatus(`Handoff ready: ${payload.sourceName}`);
    } catch (error) {
      payload.url = sourceUrl;
      mediaHandoffStatus(`Handoff sent by URL: ${error.message}`);
    }
  }
  localStorage.setItem(MEDIA_HANDOFF_KEY, JSON.stringify(payload));
  window.location.href = still2vidHref();
}

async function requestAiIdentityImage() {
  if (!backendReady) {
    mediaHandoffStatus("Factory API is offline, so AI identity generation cannot run from this surface.");
    return;
  }
  mediaHandoffStatus("Requesting AI identity image from the gated factory backend...");
  try {
    const response = await apiRequest("/factory/identity-image", {
      method: "POST",
      body: {
        clientId: getCurrentClientId(currentRecord),
        displayName: currentRecord.displayName,
        industry: currentRecord.industry,
        services: currentRecord.services || [],
        sourceUrls: currentRecord.sourceUrls || []
      }
    });
    if (response.record) currentRecord = response.record;
    if (!response.dataUrl) throw new Error(response.message || "AI image response did not include an image.");
    localStorage.setItem(MEDIA_HANDOFF_KEY, JSON.stringify({
      sourceApp: "client-app-factory",
      clientId: getCurrentClientId(currentRecord),
      client: currentRecord.displayName || "",
      sourceName: response.fileName || `${getCurrentClientId(currentRecord)}-ai-identity.png`,
      sourceType: "ai-generated",
      imageDataUrl: response.dataUrl,
      receipt: response.receipt?.summary || response.receipt?.provider || "ai-generated identity image",
      sourceUrl: response.receipt?.sourceUrl || "",
      returnTo: window.location.href
    }));
    mediaHandoffStatus("AI identity image generated and handed to Still2Vid.");
    saveLocalRecord(currentRecord);
    window.location.href = still2vidHref({ source_type: "ai-generated" });
  } catch (error) {
    mediaHandoffStatus(`AI identity generation did not complete: ${error.message}`);
  }
}

async function saveIntakeForm(form) {
  const data = new FormData(form);
  const nextRecord = {
    ...currentRecord,
    displayName: data.get("displayName"),
    industry: data.get("industry"),
    contacts: [{
      name: data.get("primaryContact"),
      phone: data.get("phone"),
      email: data.get("email")
    }],
    sourceUrls: [data.get("liveUrl")].filter(Boolean),
    services: String(data.get("services") || "").split("\n").map((item) => item.trim()).filter(Boolean),
    notes: data.get("notes"),
    status: "intake-created"
  };
  if (backendReady) {
    try {
      const response = await apiRequest("/factory/intake", {
        method: "POST",
        body: {
          ...nextRecord,
          liveUrl: data.get("liveUrl"),
          primaryContact: data.get("primaryContact"),
          phone: data.get("phone"),
          email: data.get("email")
        }
      });
      currentRecord = response.record;
      pipelineSnapshots.clientId = currentRecord.clientId;
      pipelineSnapshots.statusMessage = "Client dossier saved.";
      savePipelineState();
      await refreshLedger();
    } catch {
      currentRecord = nextRecord;
    }
  } else {
    currentRecord = nextRecord;
  }
  if (!backendReady) {
    pipelineSnapshots.clientId = currentRecord.clientId;
    pipelineSnapshots.statusMessage = "Client dossier saved locally.";
    savePipelineState();
  }
  renderApp();
}

function bindStaticEvents() {
  document.addEventListener("click", async (event) => {
    const target = event.target.closest("button, a");
    if (!target) return;
    if (target.matches("[data-support-toggle]")) {
      supportDrawerOpen = !supportDrawerOpen;
      renderSupportDrawer();
      target.setAttribute("aria-expanded", String(supportDrawerOpen));
      return;
    }
    if (target.matches("[data-support-close]")) {
      supportDrawerOpen = false;
      renderSupportDrawer();
      const toggle = $("[data-support-toggle]");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
      return;
    }
    if (target.matches("[data-top-action='clients']")) {
      window.location.href = pageHref("clients");
      return;
    }
    if (target.matches("[data-top-action='full-factory']")) {
      event.preventDefault();
      await runFactoryStage("full");
      return;
    }
    if (target.matches("[data-load-valley]")) {
      event.preventDefault();
      await loadValleyBusinesses();
      renderValleyBusinesses();
      return;
    }
    if (target.matches("[data-load-scan]")) {
      event.preventDefault();
      await loadScanReport();
      return;
    }
    if (target.matches("[data-run-core]")) {
      event.preventDefault();
      await runFactoryStage("core");
      return;
    }
    if (target.matches("[data-run-enhance]")) {
      event.preventDefault();
      await runFactoryStage("enhance");
      return;
    }
    if (target.matches("[data-run-verify]")) {
      event.preventDefault();
      await runFactoryStage("verify");
      return;
    }
    if (target.matches("[data-run-factory]")) {
      event.preventDefault();
      await runFactoryStage("full");
      return;
    }
    if (target.matches("[data-load-template]")) {
      event.preventDefault();
      await loadTemplateRecord();
      return;
    }
    if (target.matches("[data-load-empire]")) {
      event.preventDefault();
      await loadEmpireRecord();
      return;
    }
    if (target.matches("[data-load-next-level]")) {
      event.preventDefault();
      await loadNextLevelRecord();
      return;
    }
    if (target.matches("[data-export-record]")) {
      event.preventDefault();
      exportRecord();
      return;
    }
    if (target.matches("[data-open-still2vid]")) {
      event.preventDefault();
      await openStill2Vid(target.getAttribute("data-open-still2vid") || "", target.getAttribute("data-source-type") || "operator-upload");
      return;
    }
    if (target.matches("[data-ai-identity-request]")) {
      event.preventDefault();
      await requestAiIdentityImage();
      return;
    }
    if (target.matches("[data-import-valley]")) {
      event.preventDefault();
      await importValleyBusiness(target.getAttribute("data-import-valley"));
      return;
    }
    if (target.matches("[data-import-run-valley]")) {
      event.preventDefault();
      await importValleyBusiness(target.getAttribute("data-import-run-valley"), { runFactory: true });
      return;
    }
    if (target.matches("[data-auren-clear]")) {
      event.preventDefault();
      resetAurenThread(true);
      renderAuren();
      return;
    }
    if (target.matches("[data-auren-prompt]")) {
      event.preventDefault();
      const latest = aurenState.latest || {};
      const prompt = latest.prompts?.[Number(target.getAttribute("data-auren-prompt"))];
      const field = $("[data-auren-form] textarea[name='message']");
      if (field && prompt) {
        field.value = prompt;
        field.focus();
      }
      return;
    }
    if (target.matches("[data-auren-action]")) {
      event.preventDefault();
      const latest = aurenState.latest || {};
      const action = latest.actions?.[Number(target.getAttribute("data-auren-action"))];
      if (!action) return;
      if (action.href) {
        window.location.href = action.href;
      }
    }
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (form.matches("[data-intake-form]")) {
      event.preventDefault();
      await saveIntakeForm(form);
      return;
    }
    if (form.matches("[data-asset-upload]")) {
      event.preventDefault();
      await submitAssetUpload(form);
      return;
    }
    if (form.matches("[data-auren-form]")) {
      event.preventDefault();
      const field = form.querySelector("textarea[name='message']");
      const message = field?.value || "";
      if (!message.trim()) return;
      field.value = "";
      await askAuren(message);
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.matches("[data-valley-search]")) {
      renderValleyBusinesses();
    }
  });
}

function startScrollProgress() {
  const progress = $(".scroll-progress");
  if (!progress) return;
  const update = () => {
    const max = Math.max(document.body.scrollHeight - window.innerHeight, 1);
    progress.style.width = `${Math.min(100, (window.scrollY / max) * 100)}%`;
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

function startLivingField() {
  const canvas = $(".factory-living-field");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nodes = Array.from({ length: reduced ? 18 : 42 }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    depth: 0.35 + Math.random() * 0.9,
    phase: Math.random() * Math.PI * 2,
    tone: index % 3
  }));
  let width = 0;
  let height = 0;
  const colors = ["rgba(224, 179, 90, 0.62)", "rgba(109, 196, 137, 0.5)", "rgba(128, 189, 213, 0.48)"];
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const draw = (time = 0) => {
    ctx.clearRect(0, 0, width, height);
    nodes.forEach((node, index) => {
      const drift = reduced ? 0 : Math.sin(time * 0.0003 + node.phase) * 18 * node.depth;
      const px = node.x * width + drift;
      const py = node.y * height + Math.cos(time * 0.00025 + node.phase) * 16 * node.depth;
      ctx.beginPath();
      ctx.arc(px, py, 1.2 + node.depth * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = colors[node.tone];
      ctx.fill();
      for (let i = index + 1; i < nodes.length; i += 1) {
        const other = nodes[i];
        const ox = other.x * width;
        const oy = other.y * height;
        const dx = px - ox;
        const dy = py - oy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 145) {
          ctx.globalAlpha = (1 - distance / 145) * 0.16;
          ctx.strokeStyle = colors[node.tone];
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(ox, oy);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    });
    if (!reduced) requestAnimationFrame(draw);
  };
  resize();
  window.addEventListener("resize", resize);
  draw();
}

async function init() {
  bindStaticEvents();
  startScrollProgress();
  startLivingField();
  pipelineSnapshots = loadPipelineState();
  await refreshBackendStatus();
  const localRecord = loadLocalRecord();
  if (backendReady) {
    if (getCurrentPage() === "client" && new URL(window.location.href).searchParams.get("clientId")) {
      await loadClientRecord(new URL(window.location.href).searchParams.get("clientId"));
    } else if (localRecord?.clientId) {
      await loadClientRecord(localRecord.clientId);
    } else {
      await loadTemplateRecord();
    }
  } else if (localRecord?.clientId) {
    currentRecord = localRecord;
  } else {
    await loadTemplateRecord();
  }
  await loadValleyBusinesses();
  if (!scanReport) await loadScanReport({ runBackend: false });
  await refreshLedger();
  renderApp();
  const url = new URL(window.location.href);
  if (getCurrentPage() === "builder" && url.searchParams.get("autorun") === "full" && !autorunTriggered) {
    autorunTriggered = true;
    await runFactoryStage("full");
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(appHref("service-worker.js"), { scope: APP_BASE_PATH }).catch(() => {});
  }
}

init();

// BEGIN quantumskyes:skyesol-living-background-js
function mountSkyeSolLivingBackground({
  canvasSelector = '.skyesol-living-field',
  particleDensity = 16000,
  maxParticles = 120,
  minParticles = 58
} = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.querySelector(canvasSelector);
  if (!canvas || !canvas.getContext || reduceMotion) return () => {};

  const ctx = canvas.getContext('2d');
  const palette = [
    'rgba(201,168,76,',
    'rgba(138,99,255,',
    'rgba(39,242,255,'
  ];
  let width = 0;
  let height = 0;
  let particles = [];
  let raf = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(maxParticles, Math.max(minParticles, Math.floor(width * height / particleDensity)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + .4,
      a: Math.random() * .34 + .12,
      s: Math.random() * .34 + .08,
      phase: Math.random() * Math.PI * 2,
      color: palette[index % palette.length]
    }));
  }

  function drawWave(time, yOffset, colorA, colorB, amp, speed) {
    const gradient = ctx.createLinearGradient(0, yOffset - amp * 2, width, yOffset + amp * 2);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(.5, colorB);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 18) {
      const n = Math.sin((x * .006) + time * speed) * amp;
      const n2 = Math.cos((x * .011) - time * speed * .7) * amp * .46;
      ctx.lineTo(x, yOffset + n + n2);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function animate(now) {
    if (document.body.classList.contains('motion-paused')) {
      raf = requestAnimationFrame(animate);
      return;
    }
    const t = now * .001;
    pointer.x += (pointer.tx - pointer.x) * .035;
    pointer.y += (pointer.ty - pointer.y) * .035;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';
    drawWave(t, height * .28 + pointer.y * 12, 'rgba(138,99,255,0)', 'rgba(138,99,255,.10)', 36, .34);
    drawWave(t, height * .54 - pointer.y * 10, 'rgba(39,242,255,0)', 'rgba(39,242,255,.08)', 42, .24);
    drawWave(t, height * .82, 'rgba(201,168,76,0)', 'rgba(201,168,76,.07)', 28, .28);
    particles.forEach((particle) => {
      const px = particle.x + Math.sin(t * particle.s + particle.phase) * 28 + pointer.x * 10;
      const py = particle.y + Math.cos(t * particle.s * .8 + particle.phase) * 18 + pointer.y * 8;
      ctx.beginPath();
      ctx.arc(px, py, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = `${particle.color}${particle.a})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(animate);
  }

  function onPointerMove(event) {
    pointer.tx = (event.clientX / Math.max(width, 1) - .5) * 2;
    pointer.ty = (event.clientY / Math.max(height, 1) - .5) * 2;
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onPointerMove, { passive: true });
  raf = requestAnimationFrame(animate);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onPointerMove);
  };
}


(function(){
  if(window.__mcpSkyeSolLivingBackgroundMounted) return;
  window.__mcpSkyeSolLivingBackgroundMounted = true;
  function boot(){
    if(typeof mountSkyeSolLivingBackground === 'function') mountSkyeSolLivingBackground();
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
// END quantumskyes:skyesol-living-background-js
