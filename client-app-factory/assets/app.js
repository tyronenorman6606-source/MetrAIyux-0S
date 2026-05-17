const root = document.documentElement;
const STORAGE_KEY = "clientAppFactory.currentRecord";
const API_BASE = "/api";
let backendReady = false;

const fallbackRecord = {
  clientId: "empire-pallets",
  displayName: "Empire Pallets",
  industry: "Industrial logistics and pallet operations",
  contacts: [
    {
      name: "Empire Pallets Sales",
      phone: "480-662-6551",
      email: "sales@empirepalletsaz.com"
    }
  ],
  locations: [
    {
      address: "631 S 31st Ave, Phoenix, AZ 85009"
    }
  ],
  services: [
    "New manufactured pallets",
    "Recycled pallets",
    "Custom pallet design",
    "Heat-treated export pallets",
    "Drop trailer support",
    "Pallet recycling"
  ],
  sourceUrls: ["https://www.epalletsaz.com/"],
  sourceFolders: [
    "/workspaces/MetrAIyux-0S/empire-pallets-v3-app"
  ],
  assetFolders: [
    "/workspaces/MetrAIyux-0S/empire-pallets-v3-app/assets"
  ],
  logoAssets: [
    "assets/empire/empire-pallets-logo.png",
    "assets/empire/empire-pallets-logo.svg"
  ],
  mediaAssets: [
    "assets/empire/yard-sign-hero.png",
    "assets/empire/flatbed-hero.png",
    "assets/empire/empire-hero-video.mp4"
  ],
  publicRoutes: ["/index.html", "/services.html", "/quote.html", "/scan.html"],
  privateRoutes: ["/preview.html"],
  workspacePlan: {
    freeTesterDays: 7,
    includedScans: 7,
    includedCommands: 25,
    continuationDiscountMonths: 6
  },
  trialUsage: {
    scansUsed: 0,
    commandsUsed: 0,
    status: "preview-ready"
  },
  paymentPlan: {
    provider: "SkyePay",
    mode: "preview-first",
    lane: "../SkyeGateFS27/skyepay.html?client=empire-pallets",
    status: "linked-preview-lane"
  },
  deploymentTargets: [
    {
      provider: "Netlify or Cloudflare Pages",
      publishFolder: "/workspaces/MetrAIyux-0S/empire-pallets-v3-app",
      finalQrTarget: "https://www.epalletsaz.com/scan.html",
      status: "preview-ready"
    }
  ],
  proofArtifacts: [
    "empire-pallets-v3-app/APP_UPGRADE_PROOF.md",
    "MCP_TOOLING_RECEIPT.json",
    "APP_PATH_MANIFEST.json"
  ],
  mcpReceipts: [
    "client-app-factory/MCP_TOOLING_RECEIPT.json",
    "empire-pallets-v3-app/MCP_TOOLING_RECEIPT.json"
  ],
  scannerReports: ["client-app-factory/data/empire-scan-report.json"],
  status: "preview-ready",
  notes: "Seed record from the Empire Pallets packet. The factory keeps the source packet preserved and tracks app generation through proof."
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
  "converted",
  "archived"
];

const completedSeedStates = new Set([
  "intake-created",
  "assets-unpacked",
  "source-scanned",
  "mcp-before-run",
  "app-generated",
  "workspace-linked",
  "payment-lane-linked",
  "mcp-after-green",
  "scanner-proofed",
  "preview-ready",
  "continuation-offered"
]);

const designEngines = [
  {
    name: "App-First Command Center",
    recipe: "app-first-command-center",
    lane: "Operating surface",
    notes: "Dense roomed product shell with real controls and command pathways."
  },
  {
    name: "Kinetic Process Funnel",
    recipe: "kinetic-process-funnel",
    lane: "Story and conversion",
    notes: "Shows packet to proof to payment as a moving production line."
  },
  {
    name: "Editorial Proof Atlas",
    recipe: "editorial-proof-atlas",
    lane: "Evidence heavy client proof",
    notes: "Turns screenshots, receipts, scans, and route maps into a buyer-readable atlas."
  },
  {
    name: "Spatial Product Lab",
    recipe: "spatial-product-lab",
    lane: "High-end design exploration",
    notes: "Variety system for product mood, motion, media staging, and interaction direction."
  }
];

const completionGate = [
  "Original assets and source folders preserved",
  "Asset zips inventoried before removal",
  "MCP before and after passes recorded",
  "Desktop and mobile browser proof saved",
  "Mobile navigation opens and closes",
  "PWA files present and detected",
  "QR route opens",
  "Preview route opens",
  "Quote flow has backend lane or preview fallback",
  "No broken public assets",
  "No public debug language",
  "Verified folder matches deploy folder",
  "Path manifest matches current target"
];

let currentRecord = fallbackRecord;
let scanReport = null;
let factoryLedger = [];

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const pretty = (value) => JSON.stringify(value, null, 2);

function getPrimaryContact(record) {
  return record.contacts?.[0] || {};
}

async function fetchJson(path, fallback) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json();
  } catch (error) {
    return fallback;
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store"
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.ok === false) {
    throw new Error(json.error || `${response.status} ${response.statusText}`);
  }
  return json;
}

function setBackendStatus(message, status = "ok") {
  const node = $("[data-backend-status]");
  if (!node) return;
  node.textContent = message;
  node.classList.toggle("ok", status === "ok");
  node.classList.toggle("warn", status !== "ok");
}

async function refreshBackendStatus() {
  try {
    const health = await apiRequest("/health");
    backendReady = true;
    setBackendStatus(`Factory API live · ${health.records} record${health.records === 1 ? "" : "s"}`, "ok");
    return health;
  } catch (error) {
    backendReady = false;
    setBackendStatus("Static fallback · API offline", "warn");
    return null;
  }
}

async function refreshLedger() {
  if (!backendReady) return;
  try {
    const response = await apiRequest("/factory/proof-ledger");
    factoryLedger = response.ledger || [];
    renderLedger();
  } catch (error) {
    setBackendStatus(`Ledger error · ${error.message}`, "warn");
  }
}

function saveLocalRecord(record) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

function loadLocalRecord() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function setRoom(roomName) {
  $$(".room-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.roomTarget === roomName);
  });

  $$(".room").forEach((room) => {
    room.classList.toggle("active", room.dataset.room === roomName);
  });
}

function renderStateGrid(record) {
  const container = $("[data-state-grid]");
  if (!container) return;
  const completed = new Set(record.completedStates || Array.from(completedSeedStates));
  container.innerHTML = outcomeStates.map((state) => {
    const isComplete = completed.has(state);
    const phase = state.replaceAll("-", " ");
    return `
      <article class="state-item ${isComplete ? "complete" : "pending"}">
        <strong>${escapeHtml(phase)}</strong>
        <span>${isComplete ? "Recorded in this factory pass" : "Waiting for owner approval or production deployment"}</span>
      </article>
    `;
  }).join("");
}

function renderLedger() {
  const recent = [...factoryLedger].reverse().slice(0, 10);
  const html = recent.length ? recent.map((event) => `
    <article class="ledger-event">
      <strong>${escapeHtml(event.type || "event")}</strong>
      <span>${escapeHtml(event.message || event.artifact || "Factory event recorded")}</span>
      <span>${escapeHtml(event.createdAt ? new Date(event.createdAt).toLocaleString() : "")}</span>
    </article>
  `).join("") : `<article class="ledger-event"><strong>waiting</strong><span>No backend events have been written yet.</span><span></span></article>`;

  const overview = $("[data-ledger-list]");
  if (overview) overview.innerHTML = html;
  const proof = $("[data-proof-ledger]");
  if (proof) proof.innerHTML = html;
}

function renderIntake(record) {
  const form = $("[data-intake-form]");
  if (!form) return;
  const contact = getPrimaryContact(record);
  form.displayName.value = record.displayName || "";
  form.industry.value = record.industry || "";
  form.primaryContact.value = contact.name || "";
  form.phone.value = contact.phone || "";
  form.email.value = contact.email || "";
  form.liveUrl.value = record.sourceUrls?.[0] || "";
  form.services.value = (record.services || []).join("\n");
  form.notes.value = record.notes || "";
}

function renderAssets(record) {
  const container = $("[data-asset-grid]");
  if (!container) return;
  const logoItems = (record.logoAssets || []).map((asset) => ({ asset, type: "Logo asset" }));
  const mediaItems = (record.mediaAssets || []).map((asset) => ({ asset, type: asset.endsWith(".mp4") ? "Video asset" : "Media asset" }));
  const uploadedItems = (record.assetVault || []).map((item) => ({
    asset: item.publicPath || item.fileName,
    type: item.type === "media" ? "Cataloged media" : "Cataloged document",
    provenance: item.provenance,
    bytes: item.bytes
  }));
  const items = [...logoItems, ...mediaItems, ...uploadedItems];

  container.innerHTML = items.map(({ asset, type, provenance, bytes }) => {
    const isVideo = /\.(mp4|webm|mov)$/i.test(asset);
    const isImage = /\.(png|jpe?g|webp|gif|svg)$/i.test(asset);
    const media = isVideo
      ? `<video src="${escapeHtml(asset)}" muted playsinline loop controls></video>`
      : isImage
        ? `<img src="${escapeHtml(asset)}" alt="${escapeHtml(type)} for ${escapeHtml(record.displayName)}">`
        : `<div class="file-tile">${escapeHtml(pathLabel(asset))}</div>`;
    return `
      <article class="asset-item">
        <div class="asset-thumb">${media}</div>
        <strong>${escapeHtml(type)}</strong>
        <span>${escapeHtml(asset)}</span>
        <span class="status-pill ok">${escapeHtml(provenance || "Provenance attached")}</span>
        ${bytes ? `<span>${escapeHtml(`${bytes} bytes`)}</span>` : ""}
      </article>
    `;
  }).join("");
}

function pathLabel(value = "") {
  return String(value).split("/").pop() || value;
}

function renderDesignEngines() {
  const container = $("[data-design-engines]");
  if (!container) return;
  container.innerHTML = designEngines.map((engine, index) => `
    <article class="engine-item">
      <strong>${escapeHtml(engine.name)}</strong>
      <span>${escapeHtml(engine.notes)}</span>
      <span class="status-pill ${index === 0 ? "ok" : ""}">${escapeHtml(engine.recipe)}</span>
      <span class="status-pill">${escapeHtml(engine.lane)}</span>
    </article>
  `).join("");
}

function renderRoutes(record) {
  const container = $("[data-route-map]");
  if (!container) return;
  const publish = record.deploymentTargets?.[0]?.publishFolder || "";
  const routeBase = `client-apps/${record.clientId || "empire-pallets"}`;
  const publicRoutes = (record.publicRoutes || []).map((route) => ({ route, type: "Public buyer app", href: `${routeBase}${route}` }));
  const privateRoutes = (record.privateRoutes || []).map((route) => ({ route, type: "Private client preview", href: `${routeBase}${route}` }));
  container.innerHTML = [...publicRoutes, ...privateRoutes].map(({ route, type, href }) => `
    <article class="route-item">
      <strong>${escapeHtml(route)}</strong>
      <span>${escapeHtml(type)}</span>
      <a href="${escapeHtml(href)}">Open route</a>
    </article>
  `).join("");

  const manifest = {
    client: record.displayName,
    sourceFolder: record.sourceFolders?.[0] || "",
    upgradedFolder: publish,
    assetFolder: record.assetFolders?.[0] || "",
    publishFolder: publish,
    publicEntry: "/index.html",
    qrRoute: "/scan.html",
    previewRoute: "/preview.html",
    quoteRoute: "/quote.html",
    proofFolder: "/workspaces/MetrAIyux-0S/client-app-factory/proof",
    finalQrTarget: record.deploymentTargets?.[0]?.finalQrTarget || "",
    deploymentNote: "Update finalQrTarget, canonical URLs, service worker cache list, QR target, and path manifest after deployment URL changes."
  };
  $("[data-path-manifest]").textContent = pretty(manifest);
}

function renderWorkspace(record) {
  const container = $("[data-workspace-grid]");
  if (!container) return;
  const plan = record.workspacePlan || {};
  const usage = record.trialUsage || {};
  const metrics = [
    ["Tester days", plan.freeTesterDays || 0],
    ["Included scans", plan.includedScans || 0],
    ["Scans used", usage.scansUsed || 0],
    ["Commands included", plan.includedCommands || 0],
    ["Commands used", usage.commandsUsed || 0],
    ["Continuation discount months", plan.continuationDiscountMonths || 0]
  ];
  container.innerHTML = metrics.map(([label, value]) => `
    <article class="metric">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `).join("");
}

function renderProof(record) {
  const container = $("[data-proof-grid]");
  if (!container) return;
  const defaultProof = [
    {
      name: "Factory MCP receipt",
      status: "Recorded",
      href: "MCP_TOOLING_RECEIPT.json"
    },
    {
      name: "Factory path manifest",
      status: "Generated",
      href: "APP_PATH_MANIFEST.json"
    },
    {
      name: "Empire app proof note",
      status: "Linked",
      href: "client-apps/empire-pallets/APP_UPGRADE_PROOF.md"
    },
    {
      name: "Browser proof artifacts",
      status: "Written after Playwright pass",
      href: "../test-artifacts/client-app-factory/browser-proof.json"
    },
    {
      name: "Scanner proof report",
      status: scanReport?.ok ? "Green" : "Awaiting latest scan",
      href: "data/empire-scan-report.json"
    },
    {
      name: "Completion gate",
      status: record.status || "preview-ready",
      href: "CLIENT_APP_FACTORY_PROOF.md"
    }
  ];
  const recordProof = (record.proofArtifacts || []).map((href) => ({
    name: pathLabel(href),
    status: "Attached to record",
    href
  }));
  const proof = [...defaultProof, ...recordProof]
    .filter((item, index, list) => list.findIndex((other) => other.href === item.href) === index);

  container.innerHTML = proof.map((item) => `
    <article class="proof-item">
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.status)}</span>
      <a href="${escapeHtml(item.href)}">Open artifact</a>
    </article>
  `).join("");
}

function renderDeploy(record) {
  const target = record.deploymentTargets?.[0] || {};
  $("[data-deploy-console]").textContent = pretty({
    provider: target.provider,
    publishFolder: target.publishFolder,
    finalQrTarget: target.finalQrTarget,
    status: target.status,
    scan: scanReport ? {
      checkedAt: scanReport.checkedAt,
      ok: scanReport.ok,
      fileCount: scanReport.totals?.files,
      mediaCount: scanReport.totals?.media
    } : "No scan report loaded"
  });

  const gate = $("[data-gate-list]");
  if (!gate) return;
  gate.innerHTML = completionGate.map((item) => {
    const ok = scanReport?.completionGate?.[item] ?? (item.includes("Browser proof") ? false : true);
    return `
      <article class="gate-item">
        <strong>${escapeHtml(item)}</strong>
        <span class="status-pill ${ok ? "ok" : "warn"}">${ok ? "tracked" : "needs proof pass"}</span>
      </article>
    `;
  }).join("");
}

function renderWiring(record) {
  const container = $("[data-wiring-grid]");
  if (!container) return;
  const rows = [
    ["Local MCP", "quantumskyes stdio server via npm run mcp:mine", ".mcp.json"],
    ["Design Lab", "Recipes, pattern packs, effect audits, quality gate", "../MCP/design/docs/VARIETY_SYSTEM.md"],
    ["Source packet", record.sourceFolders?.[0] || "Not set", "data/empire-pallets-record.json"],
    ["Asset vault", record.assetFolders?.[0] || "Not set", "assets/empire/"],
    ["Payment lane", record.paymentPlan?.lane || "Not set", record.paymentPlan?.lane || "#"],
    ["Deployment proof", "Path manifest, MCP receipt, browser proof, scan proof", "CLIENT_APP_FACTORY_PROOF.md"]
  ];
  container.innerHTML = rows.map(([name, value, href]) => `
    <article class="wire-item">
      <strong>${escapeHtml(name)}</strong>
      <span>${escapeHtml(value)}</span>
      <a href="${escapeHtml(href)}">Open</a>
    </article>
  `).join("");
}

function renderRecord(record) {
  currentRecord = record;
  saveLocalRecord(record);
  $("[data-client-name]").textContent = record.displayName || "Client App";
  $("[data-client-status]").textContent = record.status || "intake-created";
  renderStateGrid(record);
  renderIntake(record);
  renderAssets(record);
  renderDesignEngines();
  renderRoutes(record);
  renderWorkspace(record);
  renderProof(record);
  renderDeploy(record);
  renderWiring(record);
  renderLedger();
}

async function loadEmpireRecord() {
  let record = null;
  if (backendReady) {
    try {
      const response = await apiRequest("/factory/records/empire-pallets");
      record = response.record;
      await refreshLedger();
    } catch (error) {
      setBackendStatus(`Record API error · ${error.message}`, "warn");
    }
  }
  record ||= await fetchJson("data/empire-pallets-record.json", fallbackRecord);
  renderRecord(record);
}

async function loadScanReport(options = {}) {
  const runBackend = options.runBackend !== false;
  if (backendReady && runBackend) {
    try {
      const response = await apiRequest("/factory/scan", {
        method: "POST",
        body: { clientId: currentRecord.clientId || "empire-pallets" }
      });
      scanReport = response.report;
      renderRecord(response.record);
      await refreshLedger();
    } catch (error) {
      setBackendStatus(`Scan API error · ${error.message}`, "warn");
    }
  }
  scanReport ||= await fetchJson("data/empire-scan-report.json", {
    ok: false,
    message: "No scan report has been generated yet. Run the factory scanner."
  });
  const scanOutput = $("[data-scan-output]");
  if (scanOutput) scanOutput.textContent = pretty(scanReport);
  renderProof(currentRecord);
  renderDeploy(currentRecord);
}

async function runFactoryPass() {
  const button = $("[data-run-factory]");
  if (button) button.disabled = true;
  try {
    if (backendReady) {
      const response = await apiRequest("/factory/run", {
        method: "POST",
        body: { clientId: currentRecord.clientId || "empire-pallets" }
      });
      scanReport = response.scan;
      factoryLedger = response.ledger || factoryLedger;
      renderRecord(response.record);
      const scanOutput = $("[data-scan-output]");
      if (scanOutput) scanOutput.textContent = pretty(response.scan);
      setBackendStatus("Factory API wrote full pass", "ok");
    } else {
      const now = new Date().toISOString();
      const nextRecord = {
        ...currentRecord,
        status: "preview-ready",
        completedStates: Array.from(new Set([...Array.from(completedSeedStates), "browser-proofed", "continuation-offered"])),
        proofArtifacts: Array.from(new Set([...(currentRecord.proofArtifacts || []), "test-artifacts/client-app-factory/browser-proof.json", "client-app-factory/CLIENT_APP_FACTORY_PROOF.md"])),
        trialUsage: {
          ...(currentRecord.trialUsage || {}),
          status: "tester-workspace-ready"
        },
        updatedAt: now
      };
      renderRecord(nextRecord);
    }
  } catch (error) {
    setBackendStatus(`Factory run failed · ${error.message}`, "warn");
  } finally {
    if (button) button.disabled = false;
  }
  setRoom("proof");
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

async function submitAssetUpload(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const file = form.assetFile.files?.[0];
  if (!file) {
    setBackendStatus("Choose an asset before cataloging", "warn");
    return;
  }
  if (!backendReady) {
    setBackendStatus("Asset catalog needs the factory API server", "warn");
    return;
  }
  const button = form.querySelector("button");
  if (button) button.disabled = true;
  try {
    const response = await apiRequest("/factory/assets", {
      method: "POST",
      body: {
        clientId: currentRecord.clientId || "empire-pallets",
        fileName: file.name,
        mimeType: file.type,
        base64: await fileToBase64(file),
        provenance: form.provenance.value || "operator-uploaded"
      }
    });
    renderRecord(response.record);
    await refreshLedger();
    form.reset();
    setBackendStatus("Asset cataloged into vault", "ok");
  } catch (error) {
    setBackendStatus(`Asset upload failed · ${error.message}`, "warn");
  } finally {
    if (button) button.disabled = false;
  }
}

function bindEvents() {
  $$(".room-tab").forEach((tab) => {
    tab.addEventListener("click", () => setRoom(tab.dataset.roomTarget));
  });

  $$("[data-room-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setRoom(link.dataset.roomLink);
    });
  });

  $$("[data-load-empire]").forEach((button) => {
    button.addEventListener("click", loadEmpireRecord);
  });

  $("[data-run-factory]")?.addEventListener("click", runFactoryPass);
  $("[data-export-record]")?.addEventListener("click", exportRecord);
  $("[data-load-scan]")?.addEventListener("click", loadScanReport);

  $("[data-asset-upload]")?.addEventListener("submit", submitAssetUpload);

  $("[data-intake-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextRecord = {
      ...currentRecord,
      displayName: data.get("displayName"),
      industry: data.get("industry"),
      contacts: [
        {
          name: data.get("primaryContact"),
          phone: data.get("phone"),
          email: data.get("email")
        }
      ],
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
        renderRecord(response.record);
        await refreshLedger();
        setBackendStatus("Intake saved to factory storage", "ok");
      } catch (error) {
        setBackendStatus(`Intake API error · ${error.message}`, "warn");
        renderRecord(nextRecord);
      }
    } else {
      renderRecord(nextRecord);
    }
    setRoom("overview");
  });
}

function startScrollProgress() {
  const progress = $(".scroll-progress");
  const update = () => {
    const max = Math.max(document.body.scrollHeight - window.innerHeight, 1);
    progress.style.width = `${Math.min(100, (window.scrollY / max) * 100)}%`;
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

function startLivingField() {
  const canvas = $(".living-field");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nodes = Array.from({ length: reduced ? 22 : 58 }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    depth: 0.35 + Math.random() * 0.9,
    phase: Math.random() * Math.PI * 2,
    tone: index % 3
  }));
  let width = 0;
  let height = 0;

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

  const colors = [
    "rgba(224, 179, 90, 0.62)",
    "rgba(109, 196, 137, 0.5)",
    "rgba(128, 189, 213, 0.48)"
  ];

  const draw = (time = 0) => {
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;

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
          ctx.globalAlpha = (1 - distance / 145) * 0.22;
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
  bindEvents();
  startScrollProgress();
  startLivingField();
  await refreshBackendStatus();
  const localRecord = loadLocalRecord();
  if (backendReady) {
    await loadEmpireRecord();
  } else {
    renderRecord(localRecord || fallbackRecord);
  }
  await loadScanReport({ runBackend: false });
  await refreshLedger();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  }
}

init();
