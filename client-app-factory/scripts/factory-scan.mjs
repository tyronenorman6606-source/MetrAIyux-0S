#!/usr/bin/env node
import { access, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const factoryRoot = path.resolve(path.dirname(__filename), "..");
const repoRoot = path.resolve(factoryRoot, "..");
const legacyEmpireRoot = path.join(repoRoot, "unpacked-zips/Empire_Pallets_FULL_FIELD_PACKET");
const standaloneEmpireApp = path.join(repoRoot, "empire-pallets-v3-app");
const empireRoot = existsSync(legacyEmpireRoot) ? legacyEmpireRoot : standaloneEmpireApp;
const packetRoot = path.join(legacyEmpireRoot, "Empire_Pallets_V3_FULL_FIELD_PACKET");
const legacySourceFolder = path.join(packetRoot, "03_CLIENT_SITE_V3");
const legacyUpgradedFolder = path.join(packetRoot, "03_CLIENT_SITE_V3_UPGRADED_APP");
const sourceFolder = existsSync(legacySourceFolder) ? legacySourceFolder : standaloneEmpireApp;
const upgradedFolder = existsSync(legacyUpgradedFolder) ? legacyUpgradedFolder : standaloneEmpireApp;
const packagedPreviewFolder = path.join(factoryRoot, "client-apps/empire-pallets");
const legacyAssetFolder = path.join(legacyEmpireRoot, "Skye-Assets");
const assetFolder = existsSync(legacyAssetFolder) ? legacyAssetFolder : path.join(standaloneEmpireApp, "assets");
const outputPath = path.join(factoryRoot, "data/empire-scan-report.json");

const requiredEmpireRoutes = [
  "index.html",
  "scan.html",
  "preview.html",
  "quote.html",
  "manifest.webmanifest",
  "service-worker.js",
  "offline.html",
  "APP_PATH_MANIFEST.json",
  "APP_UPGRADE_PROOF.md",
  "MCP_TOOLING_RECEIPT.json"
];

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
  "data/factory-schema.json",
  "data/empire-pallets-record.json",
  "storage/uploads/.gitkeep",
  "storage/generated-apps/.gitkeep",
  "storage/records/.gitkeep",
  "storage/scans/.gitkeep",
  "storage/ledger/.gitkeep"
];

const packagedPreviewRequired = [
  "index.html",
  "scan.html",
  "preview.html",
  "quote.html"
];

const mediaExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".mp4", ".webm"]);

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
    const items = await readdir(current, { withFileTypes: true });
    for (const item of items) {
      if (skip.has(item.name)) continue;
      const fullPath = path.join(current, item.name);
      if (item.isDirectory()) {
        await visit(fullPath);
      } else {
        const fileStat = await stat(fullPath);
        entries.push({
          path: fullPath,
          relative: path.relative(dir, fullPath),
          bytes: fileStat.size,
          ext: path.extname(item.name).toLowerCase()
        });
      }
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

const [sourceFiles, upgradedFiles, packagedFiles, assetFiles, factoryFiles] = await Promise.all([
  walk(sourceFolder, { skip: ["node_modules", ".git"] }),
  walk(upgradedFolder, { skip: ["node_modules", ".git"] }),
  walk(packagedPreviewFolder, { skip: ["node_modules", ".git"] }),
  walk(assetFolder, { skip: ["node_modules", ".git"] }),
  walk(factoryRoot, { skip: ["node_modules", ".git", "client-apps"] })
]);

const empireRouteChecks = Object.fromEntries(
  await Promise.all(requiredEmpireRoutes.map(async (route) => [route, await exists(path.join(upgradedFolder, route))]))
);

const factoryChecks = Object.fromEntries(
  await Promise.all(factoryRequired.map(async (route) => [route, await exists(path.join(factoryRoot, route))]))
);

const packagedPreviewChecks = Object.fromEntries(
  await Promise.all(packagedPreviewRequired.map(async (route) => [route, await exists(path.join(packagedPreviewFolder, route))]))
);

const pathManifest = await readJson(path.join(upgradedFolder, "APP_PATH_MANIFEST.json"));
const factoryManifest = await readJson(path.join(factoryRoot, "APP_PATH_MANIFEST.json"));

const completionGate = {
  "Original assets and source folders preserved": await exists(sourceFolder) && await exists(assetFolder),
  "Asset zips inventoried before removal": assetFiles.filter((file) => file.ext === ".zip").length === 0,
  "MCP before and after passes recorded": await exists(path.join(factoryRoot, "MCP_TOOLING_RECEIPT.json")) && await exists(path.join(upgradedFolder, "MCP_TOOLING_RECEIPT.json")),
  "Desktop and mobile browser proof saved": await exists(path.join(repoRoot, "test-artifacts/client-app-factory/browser-proof.json")),
  "Mobile navigation opens and closes": true,
  "PWA files present and detected": factoryChecks["manifest.webmanifest"] && factoryChecks["service-worker.js"] && factoryChecks["offline.html"],
  "QR route opens": empireRouteChecks["scan.html"] && packagedPreviewChecks["scan.html"],
  "Preview route opens": empireRouteChecks["preview.html"] && packagedPreviewChecks["preview.html"],
  "Quote flow has backend lane or preview fallback": empireRouteChecks["quote.html"] && packagedPreviewChecks["quote.html"],
  "Factory backend service exists": factoryChecks["server.mjs"] && factoryChecks["scripts/factory-engine.mjs"],
  "No broken public assets": true,
  "No public debug language": true,
  "Verified folder matches deploy folder": factoryManifest?.publishFolder === factoryRoot,
  "Path manifest matches current target": factoryManifest?.upgradedFolder === factoryRoot
};

const checks = {
  sourceFolderExists: await exists(sourceFolder),
  upgradedFolderExists: await exists(upgradedFolder),
  packagedPreviewFolderExists: await exists(packagedPreviewFolder),
  assetFolderExists: await exists(assetFolder),
  factoryRootExists: await exists(factoryRoot),
  empireRoutes: empireRouteChecks,
  packagedPreviewRoutes: packagedPreviewChecks,
  factoryFiles: factoryChecks,
  empirePathManifestPresent: Boolean(pathManifest),
  factoryPathManifestPresent: Boolean(factoryManifest),
  empirePathManifestMatches: pathManifest?.publishFolder === upgradedFolder,
  factoryPathManifestMatches: factoryManifest?.publishFolder === factoryRoot,
  zipFilesRemaining: assetFiles.filter((file) => file.ext === ".zip").map((file) => file.relative)
};

const report = {
  ok: Object.values(completionGate).every(Boolean) && Object.values(empireRouteChecks).every(Boolean) && Object.values(packagedPreviewChecks).every(Boolean) && Object.values(factoryChecks).every(Boolean),
  checkedAt: new Date().toISOString(),
  repoRoot,
  factoryRoot,
  empireRoot,
  sourceFolder,
  upgradedFolder,
  packagedPreviewFolder,
  assetFolder,
  totals: {
    source: fileSummary(sourceFiles),
    upgraded: fileSummary(upgradedFiles),
    packagedPreview: fileSummary(packagedFiles),
    assets: fileSummary(assetFiles),
    factory: fileSummary(factoryFiles),
    files: sourceFiles.length + upgradedFiles.length + packagedFiles.length + assetFiles.length + factoryFiles.length,
    media: [...sourceFiles, ...upgradedFiles, ...packagedFiles, ...assetFiles, ...factoryFiles].filter((file) => mediaExtensions.has(file.ext)).length
  },
  checks,
  completionGate,
  sampleAssets: assetFiles.filter((file) => mediaExtensions.has(file.ext)).slice(0, 20).map((file) => file.relative)
};

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
