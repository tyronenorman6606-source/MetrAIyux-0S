import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
const SOURCE = path.join(
  REPO_ROOT,
  "metraiyux_0s_site",
  "_platform-sources",
  "glendale-northstar-valley-verified-v6-final",
  "northstar"
);
const DEST = path.join(REPO_ROOT, "metraiyux_0s_site", "northstar");
const API_BASE_BEFORE = "const API_BASE = '/api';";
const API_BASE_AFTER = "const API_BASE = '/api/northstar';";

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}

async function main() {
  if (!(await exists(SOURCE))) throw new Error(`NorthStar source is missing: ${SOURCE}`);
  await fs.rm(DEST, { recursive: true, force: true });
  await fs.mkdir(DEST, { recursive: true });

  const entriesToCopy = [
    "index.html",
    "manifest.webmanifest",
    "sw.js",
    "_headers",
    "icons",
    "assets"
  ];

  for (const entry of entriesToCopy) {
    const from = path.join(SOURCE, entry);
    if (!(await exists(from))) continue;
    await fs.cp(from, path.join(DEST, entry), { recursive: true });
  }

  const workspaceClient = path.join(DEST, "assets", "workspace-client.js");
  const current = await fs.readFile(workspaceClient, "utf8");
  await fs.writeFile(workspaceClient, current.replace(API_BASE_BEFORE, API_BASE_AFTER));

  const files = await walk(DEST);
  const receipt = {
    synced_at: new Date().toISOString(),
    source_folder: path.relative(REPO_ROOT, SOURCE),
    target_folder: path.relative(REPO_ROOT, DEST),
    mounted_route: "/northstar/",
    api_base: "/api/northstar",
    copied_files: files.length
  };
  await fs.writeFile(path.join(DEST, "MOUNTED_IN_0S.json"), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
