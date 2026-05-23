#!/usr/bin/env node
import { access, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import path from "node:path";
import { readRecord, factoryRoot, repoRoot, slugify } from "./factory-engine.mjs";

const clientId = slugify(process.argv[2] || "empire-pallets");
const dataDir = path.join(factoryRoot, "data");
const genericOutputPath = path.join(dataDir, "factory-scan-report.json");
const clientOutputPath = path.join(dataDir, `${clientId}-scan-report.json`);

const sourceTemplateFolder = path.join(factoryRoot, "templates", "SKyeAppTemplate");
const factoryRequired = [
  "index.html",
  "manifest.webmanifest",
  "service-worker.js",
  "offline.html",
  "APP_PATH_MANIFEST.json",
  "CLIENT_APP_FACTORY_PROOF.md",
  "MCP_TOOLING_RECEIPT.json",
  "package.json",
  "server.mjs",
  "scripts/factory-engine.mjs",
  "scripts/factory-core.mjs",
  "scripts/factory-enhance.mjs",
  "scripts/factory-verify.mjs",
  "scripts/factory-pipeline.mjs",
  "scripts/factory-scan.mjs",
  "data/factory-schema.json",
  "storage/uploads/.gitkeep",
  "storage/generated-apps/.gitkeep",
  "storage/records/.gitkeep",
  "storage/scans/.gitkeep",
  "storage/ledger/.gitkeep"
];

const mediaExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".mp4", ".webm", ".mov"]);

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, options = {}) {
  const entries = [];
  if (!(await exists(dir))) return entries;
  const skip = new Set(options.skip || []);

  async function visit(current) {
    let items = [];
    try {
      items = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const item of items) {
      if (skip.has(item.name)) continue;
      const fullPath = path.join(current, item.name);
      if (item.isDirectory()) {
        await visit(fullPath);
        continue;
      }
      let fileStat;
      try {
        fileStat = await stat(fullPath);
      } catch {
        continue;
      }
      entries.push({
        path: fullPath,
        relative: path.relative(dir, fullPath),
        bytes: fileStat.size,
        ext: path.extname(item.name).toLowerCase()
      });
    }
  }

  await visit(dir);
  return entries;
}

function fileSummary(files) {
  return {
    files: files.length,
    bytes: files.reduce((sum, file) => sum + file.bytes, 0),
    media: files.filter((file) => mediaExtensions.has(file.ext)).length,
    html: files.filter((file) => file.ext === ".html").length,
    css: files.filter((file) => file.ext === ".css").length,
    js: files.filter((file) => file.ext === ".js" || file.ext === ".mjs").length,
    zips: files.filter((file) => file.ext === ".zip").length
  };
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function resolveRecordPath(record = {}, candidate = "") {
  if (!candidate) return "";
  const attempts = [];
  if (path.isAbsolute(candidate)) attempts.push(candidate);
  attempts.push(path.join(repoRoot, candidate));
  attempts.push(path.join(factoryRoot, candidate));
  for (const source of record.sourceFolders || []) attempts.push(path.join(source, candidate));
  for (const assets of record.assetFolders || []) attempts.push(path.join(path.dirname(assets), candidate));
  for (const target of attempts) {
    if (await exists(target)) return target;
  }
  return "";
}

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function toRouteName(route = "") {
  return String(route).replace(/^\//, "");
}

const record = await readRecord(clientId);
const latestApp = record.generatedApps?.[0] || null;
const sourceFolder = path.resolve(record.sourceFolders?.[0] || latestApp?.sourceFolder || sourceTemplateFolder);
const generatedFolder = path.resolve(
  latestApp?.publishFolder || path.join(factoryRoot, "client-apps", record.clientId || clientId)
);
const assetFolder = path.resolve(record.assetFolders?.[0] || path.join(sourceFolder, "assets"));
const preferredRouteFolder = existsSync(generatedFolder) ? generatedFolder : sourceFolder;
const requiredRoutes = unique([
  ...(record.publicRoutes || []).map(toRouteName),
  ...(record.privateRoutes || []).map(toRouteName)
]).filter(Boolean);

const [sourceFiles, generatedFiles, assetFiles, factoryFiles] = await Promise.all([
  walk(sourceFolder, { skip: ["node_modules", ".git"] }),
  walk(generatedFolder, { skip: ["node_modules", ".git"] }),
  walk(assetFolder, { skip: ["node_modules", ".git"] }),
  walk(factoryRoot, { skip: ["node_modules", ".git", "client-apps"] })
]);

const routeChecks = Object.fromEntries(
  await Promise.all(requiredRoutes.map(async (route) => [route, await exists(path.join(preferredRouteFolder, route))]))
);

const factoryChecks = Object.fromEntries(
  await Promise.all(factoryRequired.map(async (route) => [route, await exists(path.join(factoryRoot, route))]))
);

const assetReferences = unique([...(record.logoAssets || []), ...(record.mediaAssets || [])]);
const assetReferenceChecks = await Promise.all(assetReferences.map(async (asset) => ({
  asset,
  resolved: await resolveRecordPath(record, asset)
})));

const pathManifest = await readJson(path.join(preferredRouteFolder, "APP_PATH_MANIFEST.json"));
const factoryManifest = await readJson(path.join(factoryRoot, "APP_PATH_MANIFEST.json"));
const sourceFolderExists = await exists(sourceFolder);
const generatedFolderExists = await exists(generatedFolder);
const assetFolderExists = await exists(assetFolder);

const completionGate = {
  "Live source URLs recorded": (record.sourceUrls || []).length > 0,
  "Source folder reachable": sourceFolderExists,
  "Asset folder reachable or not required": assetFolderExists || assetReferences.length === 0,
  "Record media references resolve cleanly": assetReferenceChecks.every((item) => Boolean(item.resolved)) || assetReferenceChecks.length === 0,
  "Factory backend service exists": factoryChecks["server.mjs"] && factoryChecks["scripts/factory-engine.mjs"],
  "Factory pipeline stages exist": factoryChecks["scripts/factory-core.mjs"] && factoryChecks["scripts/factory-enhance.mjs"] && factoryChecks["scripts/factory-verify.mjs"] && factoryChecks["scripts/factory-pipeline.mjs"],
  "Factory shell files exist": factoryChecks["index.html"] && factoryChecks["manifest.webmanifest"] && factoryChecks["service-worker.js"],
  "Required client routes exist in source or generated app": Object.values(routeChecks).every(Boolean),
  "Source app path manifest present": Boolean(pathManifest),
  "Factory path manifest present": Boolean(factoryManifest),
  "No zipped packet dependency remains in asset folder": assetFiles.filter((file) => file.ext === ".zip").length === 0,
  "Generated client folder is optional before core package": generatedFolderExists || true
};

const checks = {
  sourceFolderExists,
  generatedFolderExists,
  assetFolderExists,
  sourceUrls: record.sourceUrls || [],
  requiredRoutes: routeChecks,
  factoryFiles: factoryChecks,
  sourcePathManifestPresent: Boolean(pathManifest),
  factoryPathManifestPresent: Boolean(factoryManifest),
  sourcePathManifestMatches: pathManifest?.sourceFolder ? path.resolve(pathManifest.sourceFolder) === sourceFolder : null,
  factoryPathManifestMatches: factoryManifest?.publishFolder === factoryRoot,
  assetReferences: assetReferenceChecks.map((item) => ({
    asset: item.asset,
    resolved: item.resolved ? path.relative(repoRoot, item.resolved).replaceAll(path.sep, "/") : ""
  }))
};

const report = {
  ok: Object.values(completionGate).every(Boolean),
  checkedAt: new Date().toISOString(),
  clientId: record.clientId,
  displayName: record.displayName,
  repoRoot,
  factoryRoot,
  sourceFolder,
  generatedFolder,
  assetFolder,
  sourceUrls: record.sourceUrls || [],
  totals: {
    source: fileSummary(sourceFiles),
    generated: fileSummary(generatedFiles),
    assets: fileSummary(assetFiles),
    factory: fileSummary(factoryFiles),
    files: sourceFiles.length + generatedFiles.length + assetFiles.length + factoryFiles.length,
    media: [...sourceFiles, ...generatedFiles, ...assetFiles, ...factoryFiles].filter((file) => mediaExtensions.has(file.ext)).length
  },
  checks,
  completionGate,
  sampleAssets: assetFiles.filter((file) => mediaExtensions.has(file.ext)).slice(0, 20).map((file) => file.relative)
};

await writeFile(genericOutputPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(clientOutputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
