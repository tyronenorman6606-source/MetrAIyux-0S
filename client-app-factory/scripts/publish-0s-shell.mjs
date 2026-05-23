#!/usr/bin/env node
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(__filename);
const repoRoot = path.resolve(scriptDir, "../..");
const sourceRoot = path.join(repoRoot, "client-app-factory");
const targetRoot = path.join(repoRoot, "metraiyux_0s_site", "client-app-factory");
const staticApiRoot = path.join(repoRoot, "metraiyux_0s_site", "api", "client-app-factory");

const COPY_ENTRIES = [
  "index.html",
  "clients",
  "client",
  "surfaces",
  "brand",
  "media",
  "design",
  "builder",
  "generated-apps",
  "proofs",
  "workspace",
  "payment",
  "deployments",
  "auren",
  "activity",
  "settings",
  "offline.html",
  "manifest.webmanifest",
  "service-worker.js",
  "APP_PATH_MANIFEST.json",
  "CLIENT_APP_FACTORY_PROOF.md",
  "FACTORY_OPERATOR_GUIDE.md",
  "MCP_TOOLING_RECEIPT.json",
  "assets",
  "data",
  "client-apps",
  "runtime-app",
  "storage/records"
];

function resolveWithin(root, relativePath) {
  return path.resolve(root, relativePath);
}

await rm(targetRoot, { recursive: true, force: true });
await mkdir(targetRoot, { recursive: true });

for (const entry of COPY_ENTRIES) {
  const source = resolveWithin(sourceRoot, entry);
  const target = resolveWithin(targetRoot, entry);
  await cp(source, target, { recursive: true, force: true });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  sourceRoot: path.relative(repoRoot, sourceRoot),
  targetRoot: path.relative(repoRoot, targetRoot),
  copied: COPY_ENTRIES
};

await writeFile(
  path.join(targetRoot, "DEPLOYMENT_PACKAGE.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);

await mkdir(staticApiRoot, { recursive: true });
await writeFile(
  path.join(staticApiRoot, "health"),
  `${JSON.stringify({
    ok: false,
    service: "client-app-factory",
    storage: "static-shell",
    records: 0,
    ai: { configured: false, liveAvailable: false, model: "static-fallback" },
    checkedAt: new Date().toISOString()
  }, null, 2)}\n`,
  "utf8"
);

console.log(JSON.stringify({ ok: true, targetRoot, copied: COPY_ENTRIES.length }, null, 2));
