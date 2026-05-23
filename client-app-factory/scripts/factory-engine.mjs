#!/usr/bin/env node
import { access, cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
export const factoryRoot = path.resolve(path.dirname(__filename), "..");
export const repoRoot = path.resolve(factoryRoot, "..");
export const storageRoot = path.join(factoryRoot, "storage");
export const recordsDir = path.join(storageRoot, "records");
export const uploadsDir = path.join(storageRoot, "uploads");
export const scansDir = path.join(storageRoot, "scans");
export const generatedDir = path.join(storageRoot, "generated-apps");
export const ledgerDir = path.join(storageRoot, "ledger");
export const eventLedgerPath = path.join(ledgerDir, "factory-events.json");
export const proofLedgerPath = path.join(storageRoot, "proof-ledger.json");

const defaultClientId = "skye-app-template";
const defaultSourceFolder = path.join(factoryRoot, "templates", "SKyeAppTemplate");
const seedRecordPath = path.join(factoryRoot, "data/skye-app-template-record.json");
const valleyBusinessesPath = path.join(repoRoot, "metraiyux_0s_site", "valley-verified", "data", "businesses.json");
const publicClientAppsDir = path.join(factoryRoot, "client-apps");
const textExtensions = new Set([".html", ".css", ".js", ".mjs", ".json", ".webmanifest", ".xml", ".txt", ".toml"]);
const mediaExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".mp4", ".webm", ".mov"]);
const privateRouteNames = new Set(["preview.html"]);
const ignoreCopyNames = new Set(["node_modules", ".git", ".DS_Store", "storage", "test-artifacts"]);

export function slugify(value = "client-app") {
  const slug = String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `client-${Date.now()}`;
}

function safeName(value = "file") {
  return String(value)
    .trim()
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140) || "file";
}

function assertInside(base, target) {
  const resolvedBase = path.resolve(base);
  const resolvedTarget = path.resolve(target);
  if (resolvedTarget !== resolvedBase && !resolvedTarget.startsWith(`${resolvedBase}${path.sep}`)) {
    throw new Error(`Path escaped safe root: ${resolvedTarget}`);
  }
  return resolvedTarget;
}

function safeJoin(base, ...parts) {
  return assertInside(base, path.join(base, ...parts));
}

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function walk(dir, options = {}) {
  const files = [];
  if (!(await exists(dir))) return files;
  const skip = new Set(options.skip || []);

  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (skip.has(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else {
        const fileStat = await stat(fullPath);
        files.push({
          path: fullPath,
          relative: path.relative(dir, fullPath),
          bytes: fileStat.size,
          ext: path.extname(entry.name).toLowerCase()
        });
      }
    }
  }

  await visit(dir);
  return files;
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function uniqueStrings(values = []) {
  return Array.from(new Set(normalizeArray(values)));
}

function pickFirst(values = []) {
  return Array.isArray(values) ? values.find((value) => Boolean(String(value || "").trim())) || "" : "";
}

function buildPreviewCode(displayName = "", fallback = "preview") {
  const initials = String(displayName)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 6);
  return `${initials || safeName(fallback).replace(/-/g, "").slice(0, 6).toUpperCase() || "CLIENT"}-7DAY`;
}

function buildIndustryLabel(business = {}) {
  return [business.category, business.niche, business.subcategory]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .join(" · ");
}

function inferServicesFromBusiness(business = {}) {
  const niche = `${business.niche || ""} ${business.subcategory || ""} ${business.category || ""}`.toLowerCase();
  if (/(trading card|tcg|gaming|collectible|pokemon|magic)/.test(niche)) {
    return [
      "Featured inventory and sealed product",
      "Singles, binders, and deck essentials",
      "League nights and event promotions",
      "Preorders, drops, and community updates",
      "Workspace preview and QR handoff"
    ];
  }
  if (/(pallet|industrial|logistics|recycling|warehouse|fleet)/.test(niche)) {
    return [
      "Core supply and recycled stock",
      "Custom runs and recurring orders",
      "Pickup, drop trailer, and dispatch lanes",
      "Operational proof and quote routing",
      "Workspace preview and QR handoff"
    ];
  }
  if (/(barber|salon|beauty|hair)/.test(niche)) {
    return [
      "Booking-first homepage",
      "Service menu and pricing lanes",
      "Gallery, reviews, and local SEO",
      "Offers, bundles, and event promos",
      "Workspace preview and QR handoff"
    ];
  }
  if (/(restaurant|food|cafe|coffee|bakery)/.test(niche)) {
    return [
      "Menu highlights and featured drops",
      "Hours, directions, and contact flow",
      "Specials, gallery, and local SEO",
      "Event promos and community updates",
      "Workspace preview and QR handoff"
    ];
  }
  return [
    "Homepage and service positioning",
    "Inventory, offers, or capability highlights",
    "Gallery, FAQ, and contact routes",
    "Workspace preview and QR handoff",
    "Local SEO and conversion support"
  ];
}

function buildLocationFromBusiness(business = {}) {
  const city = String(business.city || "").trim();
  const state = String(business.state || "").trim().toUpperCase();
  const postalCode = String(business.zip || "").trim();
  return {
    address: "",
    street: "",
    city,
    state,
    postalCode
  };
}

function normalizeRecord(record = {}) {
  const displayName = record.displayName || record.clientName || "Client App";
  const clientId = slugify(record.clientId || displayName);
  const completedStates = Array.from(new Set(record.completedStates || []));
  return {
    clientId,
    displayName,
    industry: record.industry || "",
    contacts: Array.isArray(record.contacts) ? record.contacts : [],
    locations: Array.isArray(record.locations) ? record.locations : [],
    services: normalizeArray(record.services),
    sourceUrls: normalizeArray(record.sourceUrls),
    sourceFolders: normalizeArray(record.sourceFolders),
    assetFolders: normalizeArray(record.assetFolders),
    logoAssets: normalizeArray(record.logoAssets),
    mediaAssets: normalizeArray(record.mediaAssets),
    assetVault: Array.isArray(record.assetVault) ? record.assetVault : [],
    publicRoutes: normalizeArray(record.publicRoutes),
    privateRoutes: normalizeArray(record.privateRoutes),
    workspacePlan: record.workspacePlan || {},
    previewConfig: record.previewConfig || {},
    trialUsage: record.trialUsage || {},
    paymentPlan: record.paymentPlan || {},
    brandProfile: record.brandProfile || {},
    designProfile: record.designProfile || {},
    valleySync: record.valleySync || {},
    deploymentTargets: Array.isArray(record.deploymentTargets) ? record.deploymentTargets : [],
    generatedApps: Array.isArray(record.generatedApps) ? record.generatedApps : [],
    enhancementReports: normalizeArray(record.enhancementReports),
    verificationReports: normalizeArray(record.verificationReports),
    proofArtifacts: normalizeArray(record.proofArtifacts),
    mcpReceipts: normalizeArray(record.mcpReceipts),
    scannerReports: normalizeArray(record.scannerReports),
    ledger: Array.isArray(record.ledger) ? record.ledger : [],
    status: record.status || completedStates.at(-1) || "intake-created",
    notes: record.notes || "",
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedStates
  };
}

function markState(record, state) {
  const completed = new Set(record.completedStates || []);
  completed.add(state);
  return {
    ...record,
    status: state,
    completedStates: Array.from(completed),
    updatedAt: new Date().toISOString()
  };
}

export async function ensureStorage() {
  await Promise.all([
    mkdir(recordsDir, { recursive: true }),
    mkdir(uploadsDir, { recursive: true }),
    mkdir(scansDir, { recursive: true }),
    mkdir(generatedDir, { recursive: true }),
    mkdir(ledgerDir, { recursive: true })
  ]);

  const existingEvents = await readJson(eventLedgerPath, null);
  if (!Array.isArray(existingEvents)) {
    await writeJson(eventLedgerPath, []);
    await writeJson(proofLedgerPath, []);
  }

  const seedRecordFile = path.join(recordsDir, `${defaultClientId}.json`);
  if (!(await exists(seedRecordFile)) && (await exists(seedRecordPath))) {
    const seed = normalizeRecord(await readJson(seedRecordPath, {}));
    await writeJson(seedRecordFile, seed);
  }
}

export async function appendEvent(clientId, type, message, details = {}) {
  await ensureStorage();
  const event = {
    id: `evt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    clientId: slugify(clientId),
    type,
    message,
    createdAt: new Date().toISOString(),
    ...details
  };
  const ledger = await readJson(eventLedgerPath, []);
  ledger.push(event);
  await writeJson(eventLedgerPath, ledger);
  await writeJson(proofLedgerPath, ledger);
  return event;
}

export async function readLedger(clientId = null) {
  await ensureStorage();
  const ledger = await readJson(eventLedgerPath, []);
  if (!clientId) return ledger;
  const id = slugify(clientId);
  return ledger.filter((event) => event.clientId === id);
}

export async function listRecords() {
  await ensureStorage();
  const files = await readdir(recordsDir).catch(() => []);
  const records = [];
  for (const file of files.filter((name) => name.endsWith(".json"))) {
    const record = await readJson(path.join(recordsDir, file), null);
    if (record) records.push(normalizeRecord(record));
  }
  return records.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function listValleyBusinesses(options = {}) {
  const payload = await readJson(valleyBusinessesPath, { businesses: [] });
  const businesses = Array.isArray(payload?.businesses) ? payload.businesses : [];
  const onlyWithWebsite = options.onlyWithWebsite ?? false;
  const query = String(options.query || "").trim().toLowerCase();
  const featuredOnly = options.featuredOnly ?? false;

  const filtered = businesses.filter((business) => {
    if (featuredOnly && !business.featured) return false;
    if (onlyWithWebsite && !(business.website || business.source_url)) return false;
    if (!query) return true;
    const haystack = [
      business.id,
      business.name,
      business.category,
      business.niche,
      business.subcategory,
      business.city,
      business.state,
      business.website
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });

  return filtered
    .map((business) => ({
      ...business,
      source_surface: business.website || business.source_url || "",
      has_live_surface: Boolean(business.website || business.source_url),
      verification_score: Number(business.verification_score || 0)
    }))
    .sort((a, b) => {
      if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
      if ((b.verification_score || 0) !== (a.verification_score || 0)) return (b.verification_score || 0) - (a.verification_score || 0);
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
}

export async function getValleyBusiness(businessId) {
  const targetId = slugify(businessId || "");
  const businesses = await listValleyBusinesses();
  const match = businesses.find((business) => slugify(business.id || business.name) === targetId);
  if (!match) throw new Error(`Valley business not found: ${businessId}`);
  return match;
}

export async function importValleyBusiness(payload = {}) {
  await ensureStorage();
  const business = await getValleyBusiness(payload.businessId || payload.clientId || payload.id);
  const clientId = slugify(payload.clientId || business.id || business.name);
  const templateSeed = normalizeRecord(await readJson(seedRecordPath, {}));
  const storedRecord = await readJson(path.join(recordsDir, `${clientId}.json`), null);
  const packagedRecord = await readJson(path.join(factoryRoot, "data", `${clientId}-record.json`), null);
  const existing = storedRecord || packagedRecord || null;
  const seededFromTemplate = !existing;
  const base = normalizeRecord(existing || {
    ...templateSeed,
    clientId,
    displayName: business.name,
    completedStates: [],
    generatedApps: [],
    enhancementReports: [],
    verificationReports: [],
    scannerReports: [],
    proofArtifacts: [],
    ledger: []
  });
  const sourceUrl = pickFirst([
    payload.sourceUrl,
    business.website,
    business.source_url,
    business.booking_url,
    business.landing_page_url
  ]);
  const valleyProfileUrl = pickFirst([business.landing_page_url, business.url ? `https://metraiyux-0s-full-system.graylondonskyes.workers.dev${business.url}` : ""]);
  const displayName = payload.displayName || business.name || base.displayName;
  const next = markState({
    ...base,
    clientId,
    displayName,
    industry: buildIndustryLabel(business) || base.industry,
    contacts: [{
      name: `${displayName} Team`,
      phone: business.phone || base.contacts?.[0]?.phone || "",
      email: business.email || base.contacts?.[0]?.email || ""
    }],
    locations: [buildLocationFromBusiness(business)],
    services: seededFromTemplate ? inferServicesFromBusiness(business) : (base.services?.length ? base.services : inferServicesFromBusiness(business)),
    sourceUrls: uniqueStrings([sourceUrl, business.website, business.source_url, ...base.sourceUrls]),
    sourceFolders: base.sourceFolders?.length ? base.sourceFolders : [defaultSourceFolder],
    assetFolders: base.assetFolders?.length ? base.assetFolders : [path.join(defaultSourceFolder, "assets")],
    logoAssets: seededFromTemplate ? [] : base.logoAssets,
    mediaAssets: seededFromTemplate ? [] : base.mediaAssets,
    assetVault: seededFromTemplate ? [] : base.assetVault,
    publicRoutes: base.publicRoutes?.length ? base.publicRoutes : templateSeed.publicRoutes,
    privateRoutes: base.privateRoutes?.length ? base.privateRoutes : templateSeed.privateRoutes,
    previewConfig: {
      accessCode: base.previewConfig?.accessCode || buildPreviewCode(displayName, clientId),
      workspaceId: base.previewConfig?.workspaceId || `${clientId}-preview-001`,
      workspaceName: base.previewConfig?.workspaceName || `${displayName} Preview Workspace`,
      workspaceSlug: base.previewConfig?.workspaceSlug || clientId
    },
    brandProfile: {
      ...(base.brandProfile || {}),
      city: business.city || base.brandProfile?.city || "",
      state: business.state || base.brandProfile?.state || "",
      postalCode: business.zip || base.brandProfile?.postalCode || "",
      publicUrl: business.website || base.brandProfile?.publicUrl || sourceUrl
    },
    valleySync: {
      ...(base.valleySync || {}),
      businessId: business.id,
      profilePath: business.url || base.valleySync?.profilePath || "",
      profileUrl: valleyProfileUrl || base.valleySync?.profileUrl || "",
      landingPageUrl: business.landing_page_url || base.valleySync?.landingPageUrl || "",
      directorySource: "valley-verified"
    },
    paymentPlan: {
      provider: seededFromTemplate ? "SkyePay" : (base.paymentPlan?.provider || "SkyePay"),
      mode: seededFromTemplate ? "preview-first" : (base.paymentPlan?.mode || "preview-first"),
      lane: seededFromTemplate ? `../SkyeGateFS27/skyepay.html?client=${clientId}` : (base.paymentPlan?.lane || `../SkyeGateFS27/skyepay.html?client=${clientId}`),
      status: seededFromTemplate ? "intake-ready" : (base.paymentPlan?.status || "preview-first")
    },
    workspacePlan: {
      freeTesterDays: Number(base.workspacePlan?.freeTesterDays ?? 7),
      includedScans: Number(base.workspacePlan?.includedScans ?? 7),
      includedCommands: Number(base.workspacePlan?.includedCommands ?? 25),
      continuationDiscountMonths: Number(base.workspacePlan?.continuationDiscountMonths ?? 6)
    },
    trialUsage: seededFromTemplate
      ? { scansUsed: 0, commandsUsed: 0, status: "intake-ready" }
      : (base.trialUsage || {}),
    deploymentTargets: seededFromTemplate
      ? [{
          provider: "Local factory package",
          publishFolder: "",
          packagedPreviewFolder: path.join(factoryRoot, "client-apps", clientId),
          finalQrTarget: `client-apps/${clientId}/index.html`,
          status: "intake-ready"
        }]
      : base.deploymentTargets,
    generatedApps: seededFromTemplate ? [] : base.generatedApps,
    enhancementReports: seededFromTemplate ? [] : base.enhancementReports,
    verificationReports: seededFromTemplate ? [] : base.verificationReports,
    scannerReports: seededFromTemplate ? [] : base.scannerReports,
    proofArtifacts: seededFromTemplate ? [] : base.proofArtifacts,
    mcpReceipts: seededFromTemplate ? [] : base.mcpReceipts,
    completedStates: seededFromTemplate ? [] : base.completedStates,
    notes: [base.notes, `Imported from Valley Verified on ${new Date().toISOString()} from ${business.id}.`, business.price_note || ""]
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .filter((item, index, list) => list.indexOf(item) === index)
      .join("\n\n")
  }, "intake-created");

  const event = await appendEvent(clientId, "intake-created", `Imported ${displayName} from Valley Verified`, {
    artifact: business.url || business.landing_page_url || business.website || "",
    valleyBusinessId: business.id
  });
  const record = await saveRecord(next, event);
  return { record, business };
}

export async function readRecord(clientId = defaultClientId) {
  await ensureStorage();
  const id = slugify(clientId);
  const record = await readJson(path.join(recordsDir, `${id}.json`), null);
  if (record) return normalizeRecord(record);
  if (id === defaultClientId && (await exists(seedRecordPath))) {
    return normalizeRecord(await readJson(seedRecordPath, {}));
  }
  throw new Error(`Client record not found: ${id}`);
}

export async function saveRecord(record, event = null) {
  await ensureStorage();
  const normalized = normalizeRecord(record);
  const nextEvent = event || {
    id: `local_${Date.now()}`,
    type: normalized.status,
    message: `Record saved at ${normalized.status}`,
    createdAt: new Date().toISOString()
  };
  normalized.ledger = [nextEvent, ...(normalized.ledger || [])].slice(0, 80);
  await writeJson(path.join(recordsDir, `${normalized.clientId}.json`), normalized);
  return normalized;
}

export async function createIntake(payload = {}) {
  const displayName = payload.displayName || payload.clientName || "Client App";
  const clientId = slugify(payload.clientId || displayName);
  const existing = await readJson(path.join(recordsDir, `${clientId}.json`), {});
  const contact = {
    name: payload.primaryContact || payload.contactName || payload.contacts?.[0]?.name || "",
    phone: payload.phone || payload.contacts?.[0]?.phone || "",
    email: payload.email || payload.contacts?.[0]?.email || ""
  };
  const base = normalizeRecord({ ...existing, clientId, displayName });
  const next = markState({
    ...base,
    displayName,
    industry: payload.industry ?? base.industry,
    contacts: payload.contacts || [contact].filter((item) => item.name || item.phone || item.email),
    locations: payload.locations || base.locations,
    services: normalizeArray(payload.services).length ? normalizeArray(payload.services) : base.services,
    sourceUrls: normalizeArray(payload.sourceUrls || payload.liveUrl).length ? normalizeArray(payload.sourceUrls || payload.liveUrl) : base.sourceUrls,
    sourceFolders: normalizeArray(payload.sourceFolders).length ? normalizeArray(payload.sourceFolders) : base.sourceFolders,
    assetFolders: normalizeArray(payload.assetFolders).length ? normalizeArray(payload.assetFolders) : base.assetFolders,
    notes: payload.notes ?? base.notes
  }, "intake-created");
  const event = await appendEvent(clientId, "intake-created", `Saved intake record for ${displayName}`, {
    artifact: path.relative(repoRoot, path.join(recordsDir, `${clientId}.json`))
  });
  return saveRecord(next, event);
}

export async function catalogAsset(payload = {}) {
  const clientId = slugify(payload.clientId || "empire-pallets");
  const record = await readRecord(clientId);
  const originalName = safeName(payload.fileName || "uploaded-asset.bin");
  const targetDir = safeJoin(uploadsDir, clientId);
  await mkdir(targetDir, { recursive: true });

  const base64 = String(payload.base64 || "").replace(/^data:[^,]+,/, "");
  const buffer = base64 ? Buffer.from(base64, "base64") : Buffer.from(String(payload.text || ""), "utf8");
  if (!buffer.length) throw new Error("Uploaded asset payload is empty.");

  const fileName = `${Date.now()}-${originalName}`;
  const filePath = safeJoin(targetDir, fileName);
  await writeFile(filePath, buffer);

  const ext = path.extname(fileName).toLowerCase();
  const relativePath = path.relative(factoryRoot, filePath);
  const item = {
    id: `asset_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
    fileName,
    originalName,
    mimeType: payload.mimeType || "application/octet-stream",
    bytes: buffer.length,
    ext,
    type: mediaExtensions.has(ext) ? "media" : "document",
    storagePath: filePath,
    publicPath: relativePath.replaceAll(path.sep, "/"),
    provenance: payload.provenance || "operator-uploaded",
    rights: payload.rights || "client-provided or operator-approved",
    uploadedAt: new Date().toISOString()
  };

  const assetVault = [...(record.assetVault || []), item];
  const next = markState({
    ...record,
    assetVault,
    mediaAssets: mediaExtensions.has(ext) && !record.mediaAssets.includes(item.publicPath)
      ? [...record.mediaAssets, item.publicPath]
      : record.mediaAssets
  }, "assets-unpacked");
  const event = await appendEvent(clientId, "assets-unpacked", `Cataloged ${originalName}`, {
    artifact: item.publicPath,
    bytes: buffer.length
  });
  return saveRecord(next, event);
}

export async function runScanner(clientId = defaultClientId) {
  const record = await readRecord(clientId);
  if (record.clientId === defaultClientId) {
    const report = {
      ok: false,
      skipped: true,
      reason: "Template base skips the Empire-specific factory scanner."
    };
    const next = markState(record, "source-scanned");
    const event = await appendEvent(record.clientId, "source-scanned", `Skipped scanner for ${record.displayName}`, report);
    return { record: await saveRecord(next, event), report };
  }
  const scannerPath = path.join(factoryRoot, "scripts/factory-scan.mjs");
  const reportRelativePath = `client-app-factory/data/${record.clientId}-scan-report.json`;
  await execFileAsync(process.execPath, [scannerPath, record.clientId], { cwd: repoRoot, maxBuffer: 1024 * 1024 * 12 });
  const report = await readJson(path.join(factoryRoot, "data", `${record.clientId}-scan-report.json`), {});
  const scanPath = path.join(scansDir, `${record.clientId}-${Date.now()}-scan.json`);
  await writeJson(scanPath, report);

  let next = markState(record, "source-scanned");
  next = report.ok ? markState(next, "scanner-proofed") : next;
  next.scannerReports = Array.from(new Set([
    ...(next.scannerReports || []),
    reportRelativePath,
    path.relative(repoRoot, scanPath).replaceAll(path.sep, "/")
  ]));
  const event = await appendEvent(record.clientId, report.ok ? "scanner-proofed" : "source-scanned", `Scanner ${report.ok ? "passed" : "recorded"} for ${record.displayName}`, {
    artifact: path.relative(repoRoot, scanPath).replaceAll(path.sep, "/"),
    ok: Boolean(report.ok)
  });
  return { record: await saveRecord(next, event), report };
}

async function rewriteDeploymentPaths(appDir) {
  const files = await walk(appDir, { skip: ["node_modules", ".git"] });
  await Promise.all(files
    .filter((file) => textExtensions.has(file.ext))
    .map(async (file) => {
      let content = await readFile(file.path, "utf8");
      const before = content;
      content = content
        .replaceAll('href="/', 'href="')
        .replaceAll("href='/", "href='")
        .replaceAll('src="/', 'src="')
        .replaceAll("src='/", "src='")
        .replaceAll('poster="/', 'poster="')
        .replaceAll("poster='/", "poster='")
        .replaceAll('content="/', 'content="')
        .replaceAll("content='/", "content='")
        .replaceAll('url("/', 'url("')
        .replaceAll("url('/", "url('")
        .replace(/(["'])\/(assets\/|manifest\.webmanifest|service-worker\.js|offline\.html|index\.html|scan\.html|preview\.html|quote\.html|services\.html)/g, "$1$2");
      if (content !== before) await writeFile(file.path, content);
    }));
}

async function discoverRoutes(appDir) {
  const entries = await readdir(appDir, { withFileTypes: true }).catch(() => []);
  const htmlRoutes = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => `/${entry.name}`)
    .sort((a, b) => (a === "/index.html" ? -1 : b === "/index.html" ? 1 : a.localeCompare(b)));
  return {
    publicRoutes: htmlRoutes.filter((route) => !privateRouteNames.has(route.slice(1))),
    privateRoutes: htmlRoutes.filter((route) => privateRouteNames.has(route.slice(1)))
  };
}

async function copyClientApp(sourceFolder, destination) {
  const resolvedSource = path.resolve(sourceFolder);
  if (!existsSync(resolvedSource)) throw new Error(`Source app folder not found: ${resolvedSource}`);
  assertInside(generatedDir, destination);
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await cp(resolvedSource, destination, {
    recursive: true,
    filter: (source) => !ignoreCopyNames.has(path.basename(source))
  });
  await rewriteDeploymentPaths(destination);
}

export async function generateApp(payload = {}) {
  const clientId = slugify(payload.clientId || defaultClientId);
  const record = await readRecord(clientId);
  const sourceFolder = path.resolve(payload.sourceFolder || record.sourceFolders?.[0] || defaultSourceFolder);
  const storageAppDir = safeJoin(generatedDir, clientId);
  const publicAppDir = safeJoin(publicClientAppsDir, clientId);

  await copyClientApp(sourceFolder, storageAppDir);
  await rm(publicAppDir, { recursive: true, force: true });
  await mkdir(path.dirname(publicAppDir), { recursive: true });
  await cp(storageAppDir, publicAppDir, { recursive: true });

  const routes = await discoverRoutes(publicAppDir);
  const manifest = {
    client: record.displayName,
    sourceFolder,
    upgradedFolder: publicAppDir,
    assetFolder: record.assetFolders?.[0] || path.join(sourceFolder, "assets"),
    publishFolder: publicAppDir,
    publicEntry: "/index.html",
    qrRoute: routes.publicRoutes.includes("/scan.html") ? "/scan.html" : "",
    previewRoute: routes.privateRoutes.includes("/preview.html") ? "/preview.html" : "",
    quoteRoute: routes.publicRoutes.includes("/quote.html") ? "/quote.html" : "",
    proofFolder: path.join(factoryRoot, "proof"),
    finalQrTarget: payload.finalQrTarget || `client-apps/${clientId}/scan.html`,
    deploymentNote: "This generated copy is safe to move as a deployable app folder. Re-run MCP and browser proof against this exact folder after any deployment URL changes."
  };
  await writeJson(path.join(publicAppDir, "APP_PATH_MANIFEST.json"), manifest);
  await writeJson(path.join(storageAppDir, "APP_PATH_MANIFEST.json"), manifest);

  let next = markState(record, "app-generated");
  next.publicRoutes = routes.publicRoutes;
  next.privateRoutes = routes.privateRoutes;
  const nextGeneratedApp = {
    generatedAt: new Date().toISOString(),
    sourceFolder,
    storageFolder: storageAppDir,
    publishFolder: publicAppDir,
    routes
  };
  next.generatedApps = [
    nextGeneratedApp,
    ...(next.generatedApps || []).filter((entry) => entry.publishFolder !== publicAppDir)
  ].slice(0, 12);

  const nextDeploymentTarget = {
    provider: "Local factory package",
    publishFolder: publicAppDir,
    packagedPreviewFolder: publicAppDir,
    finalQrTarget: manifest.finalQrTarget,
    status: "generated-preview-ready"
  };
  next.deploymentTargets = [
    nextDeploymentTarget,
    ...(next.deploymentTargets || []).filter((entry) => {
      return !(entry.publishFolder === publicAppDir && entry.finalQrTarget === manifest.finalQrTarget);
    })
  ].slice(0, 8);
  const event = await appendEvent(clientId, "app-generated", `Generated deployable app package for ${record.displayName}`, {
    artifact: path.relative(repoRoot, publicAppDir).replaceAll(path.sep, "/"),
    routeCount: routes.publicRoutes.length + routes.privateRoutes.length
  });
  return { record: await saveRecord(next, event), manifest, routes };
}

export async function provisionWorkspace(payload = {}) {
  const clientId = slugify(payload.clientId || defaultClientId);
  const record = await readRecord(clientId);
  const next = markState({
    ...record,
    workspacePlan: {
      freeTesterDays: Number(payload.freeTesterDays ?? record.workspacePlan?.freeTesterDays ?? 7),
      includedScans: Number(payload.includedScans ?? record.workspacePlan?.includedScans ?? 7),
      includedCommands: Number(payload.includedCommands ?? record.workspacePlan?.includedCommands ?? 25),
      continuationDiscountMonths: Number(payload.continuationDiscountMonths ?? record.workspacePlan?.continuationDiscountMonths ?? 6)
    },
    trialUsage: {
      scansUsed: Number(record.trialUsage?.scansUsed ?? 0),
      commandsUsed: Number(record.trialUsage?.commandsUsed ?? 0),
      status: "tester-workspace-ready",
      linkedAt: new Date().toISOString()
    }
  }, "workspace-linked");
  const event = await appendEvent(clientId, "workspace-linked", `Provisioned tester workspace for ${record.displayName}`, {
    artifact: `storage/records/${clientId}.json`
  });
  return saveRecord(next, event);
}

export async function linkSkyePay(payload = {}) {
  const clientId = slugify(payload.clientId || defaultClientId);
  const record = await readRecord(clientId);
  const next = markState({
    ...record,
    paymentPlan: {
      provider: payload.provider || record.paymentPlan?.provider || "SkyePay",
      mode: payload.mode || record.paymentPlan?.mode || "preview-first",
      lane: payload.lane || record.paymentPlan?.lane || `../SkyeGateFS27/skyepay.html?client=${clientId}`,
      status: "linked-preview-lane",
      pricingMode: payload.pricingMode || "free-now-paid-ready",
      linkedAt: new Date().toISOString()
    }
  }, "payment-lane-linked");
  const event = await appendEvent(clientId, "payment-lane-linked", `Linked SkyePay continuation lane for ${record.displayName}`, {
    artifact: next.paymentPlan.lane
  });
  return saveRecord(next, event);
}

export async function recordProof(payload = {}) {
  const clientId = slugify(payload.clientId || defaultClientId);
  const record = await readRecord(clientId);
  const proofFiles = [
    "test-artifacts/client-app-factory/browser-proof.json",
    "client-app-factory/assets/proof/client-app-factory-workflow.webm",
    "client-app-factory/MCP_TOOLING_RECEIPT.json",
    "client-app-factory/APP_PATH_MANIFEST.json",
    `client-app-factory/data/${clientId}-scan-report.json`,
    "client-app-factory/data/factory-scan-report.json",
    "client-app-factory/assets/proof/client-app-factory-desktop.png",
    "client-app-factory/assets/proof/client-app-factory-mobile.png",
    `client-app-factory/client-apps/${clientId}/CLIENT_IDENTITY_MAP.json`,
    `client-app-factory/client-apps/${clientId}/CLIENT_ENHANCEMENT_REPORT.json`,
    `client-app-factory/client-apps/${clientId}/CLIENT_VERIFICATION_REPORT.json`,
    `client-app-factory/client-apps/${clientId}/VALLEY_SYNC_PAYLOAD.json`
  ].filter((relative) => existsSync(path.join(repoRoot, relative)));

  let next = markState(record, "browser-proofed");
  if (proofFiles.some((file) => file.includes("MCP_TOOLING_RECEIPT"))) next = markState(next, "mcp-after-green");
  if (proofFiles.some((file) => /scan-report\.json$/i.test(file))) next = markState(next, "scanner-proofed");
  next = markState(next, "preview-ready");
  next.proofArtifacts = Array.from(new Set([...(next.proofArtifacts || []), ...proofFiles]));
  const event = await appendEvent(clientId, "browser-proofed", `Recorded browser proof ledger for ${record.displayName}`, {
    artifacts: proofFiles
  });
  return saveRecord(next, event);
}

export async function runFactoryPass(payload = {}) {
  const { runFactoryPipeline } = await import("./factory-pipeline.mjs");
  return runFactoryPipeline(payload);
}

if (process.argv[1] === __filename) {
  const result = await runFactoryPass({ clientId: process.argv[2] || defaultClientId });
  console.log(JSON.stringify(result, null, 2));
}
