#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import os from "node:os";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);

function loadBlake3() {
  const candidates = ["blake3-wasm", ...findCachedBlake3Wasm()];
  for (const name of candidates) {
    try {
      return require(name);
    } catch {
      // Try the next known install location.
    }
  }

  const wranglerVersion = process.env.WRANGLER_VERSION || "4.94.0";
  const boot = spawnSync("npx", ["--yes", `wrangler@${wranglerVersion}`, "--version"], { stdio: "ignore" });
  if (boot.status === 0) {
    for (const name of findCachedBlake3Wasm()) {
      try {
        return require(name);
      } catch {
        // Keep scanning cache candidates.
      }
    }
  }

  throw new Error("Missing blake3-wasm. The direct Pages uploader tried npm cache discovery and Wrangler bootstrap, but no BLAKE3 module was available.");
}

function findCachedBlake3Wasm() {
  const roots = [
    path.join(os.homedir(), ".npm", "_npx")
  ];
  const matches = [];
  for (const root of roots) {
    walkSearch(root, matches);
  }
  return matches;
}

function walkSearch(dir, matches, depth = 0) {
  if (matches.length > 20 || depth > 5 || !fs.existsSync(dir)) return;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const absPath = path.join(dir, entry.name);
    if (!entry.isDirectory()) continue;
    if (entry.name === "blake3-wasm") {
      matches.push(absPath);
      continue;
    }
    if (entry.name === "node_modules" || depth < 4) walkSearch(absPath, matches, depth + 1);
  }
}

const blake3 = loadBlake3();
const repoRoot = process.cwd();
const projectName = process.env.PAGES_PROJECT || process.argv[2] || "";
const distDir = path.resolve(process.env.PAGES_DIR || process.argv[3] || "");
const branch = process.env.PAGES_BRANCH || "main";
const apiBase = process.env.CLOUDFLARE_API_BASE_URL || "https://api.cloudflare.com/client/v4";
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const apiToken = process.env.CLOUDFLARE_API_TOKEN || "";
const commitMessage = process.env.PAGES_COMMIT_MESSAGE || `Direct upload ${projectName}`;
const commitHash = process.env.PAGES_COMMIT_HASH || "0000000000000000000000000000000000000000";
const receiptPath = path.resolve(process.env.PAGES_RECEIPT || `test-artifacts/cloudflare-pages/${projectName || "pages"}-direct-upload-receipt.json`);
const manifestPath = path.resolve(process.env.PAGES_MANIFEST || `test-artifacts/cloudflare-pages/${projectName || "pages"}-direct-upload-manifest.json`);

if (!projectName || !distDir || !fs.existsSync(distDir)) {
  console.error("Usage: PAGES_PROJECT=<project> PAGES_DIR=<folder> CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... node tools/cloudflare-pages-direct-upload.mjs");
  process.exit(2);
}
if (!accountId || !apiToken) throw new Error("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN.");

const contentTypes = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webm", "video/webm"],
  [".webp", "image/webp"],
  [".xml", "application/xml; charset=utf-8"]
]);

const ignoredNames = new Set(["_headers", "_redirects", "_routes.json", "_worker.js", ".DS_Store"]);

function shouldIgnore(relativePath) {
  const parts = relativePath.split(path.sep);
  if (ignoredNames.has(parts.at(-1))) return true;
  return parts.includes("node_modules") || parts.includes(".git") || parts.includes(".wrangler") || parts[0] === "functions";
}

function walk(dir, fileMap = new Map(), root = dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absPath = path.join(dir, entry.name);
    const relativeFsPath = path.relative(root, absPath);
    if (shouldIgnore(relativeFsPath) || entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      walk(absPath, fileMap, root);
      continue;
    }
    if (!entry.isFile()) continue;
    const sizeInBytes = fs.statSync(absPath).size;
    if (sizeInBytes > 25 * 1024 * 1024) throw new Error(`Cloudflare Pages asset exceeds 25 MiB: ${relativeFsPath}`);
    const name = relativeFsPath.split(path.sep).join("/");
    const ext = path.extname(absPath);
    const base64Contents = fs.readFileSync(absPath).toString("base64");
    const hash = blake3.hash(base64Contents + ext.slice(1)).toString("hex").slice(0, 32);
    fileMap.set(name, {
      path: absPath,
      sizeInBytes,
      hash,
      contentType: contentTypes.get(ext.toLowerCase()) || "application/octet-stream"
    });
  }
  return fileMap;
}

async function cloudflareFetch(endpoint, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
    options.body = JSON.stringify(options.json);
  }
  if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${apiToken}`);
  const response = await fetch(`${apiBase}${endpoint}`, { ...options, headers });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }
  if (!response.ok || data?.success === false) {
    const errors = data?.errors ? JSON.stringify(data.errors) : text.slice(0, 500);
    throw new Error(`Cloudflare API ${response.status} for ${endpoint}: ${errors}`);
  }
  if (data && Object.prototype.hasOwnProperty.call(data, "result")) return data.result;
  return data;
}

async function uploadAssets(fileMap, jwt) {
  const files = [...fileMap.values()];
  const hashes = files.map((file) => file.hash);
  const missing = await cloudflareFetch("/pages/assets/check-missing", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    json: { hashes }
  });
  const missingSet = new Set(Array.isArray(missing) ? missing : missing?.hashes || []);
  const toUpload = files.filter((file) => missingSet.has(file.hash)).sort((a, b) => b.sizeInBytes - a.sizeInBytes);
  console.log(`Asset cache: ${files.length - toUpload.length} cached, ${toUpload.length} to upload.`);

  const buckets = [];
  let current = [];
  let currentBytes = 0;
  for (const file of toUpload) {
    if (current.length && currentBytes + file.sizeInBytes > 35 * 1024 * 1024) {
      buckets.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(file);
    currentBytes += file.sizeInBytes;
  }
  if (current.length) buckets.push(current);

  let uploaded = 0;
  for (const [index, bucket] of buckets.entries()) {
    const payload = bucket.map((file) => ({
      key: file.hash,
      value: fs.readFileSync(file.path).toString("base64"),
      metadata: { contentType: file.contentType },
      base64: true
    }));
    await cloudflareFetch("/pages/assets/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      json: payload
    });
    uploaded += bucket.length;
    console.log(`Uploaded bucket ${index + 1}/${buckets.length}: ${uploaded}/${toUpload.length} files.`);
  }

  await cloudflareFetch("/pages/assets/upsert-hashes", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    json: { hashes }
  });

  return Object.fromEntries([...fileMap.entries()].map(([fileName, file]) => [`/${fileName}`, file.hash]));
}

async function deploy() {
  const startedAt = new Date().toISOString();
  const project = await cloudflareFetch(`/accounts/${accountId}/pages/projects/${projectName}`);
  const tokenResponse = await cloudflareFetch(`/accounts/${accountId}/pages/projects/${projectName}/upload-token`);
  const jwt = tokenResponse.jwt;
  if (!jwt) throw new Error("Cloudflare did not return a Pages upload JWT.");

  const fileMap = walk(distDir);
  console.log(`Prepared ${fileMap.size} deployable assets from ${path.relative(repoRoot, distDir)}.`);
  const manifest = await uploadAssets(fileMap, jwt);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const formData = new FormData();
  formData.append("manifest", JSON.stringify(manifest));
  formData.append("branch", branch);
  formData.append("commit_message", commitMessage);
  formData.append("commit_hash", commitHash);
  formData.append("commit_dirty", "true");

  for (const specialFile of ["_headers", "_redirects"]) {
    const specialPath = path.join(distDir, specialFile);
    if (fs.existsSync(specialPath)) {
      formData.append(specialFile, new File([fs.readFileSync(specialPath)], specialFile));
    }
  }

  const deployment = await cloudflareFetch(`/accounts/${accountId}/pages/projects/${projectName}/deployments`, {
    method: "POST",
    body: formData
  });

  const receipt = {
    ok: true,
    projectName,
    projectCanonicalUrl: `https://${projectName}.pages.dev/`,
    productionBranch: project.production_branch,
    deployedBranch: branch,
    deploymentId: deployment.id,
    deploymentUrl: deployment.url,
    aliases: deployment.aliases || [],
    environment: deployment.environment,
    latestStage: deployment.latest_stage,
    assetCount: fileMap.size,
    manifestPath: path.relative(repoRoot, manifestPath),
    startedAt,
    finishedAt: new Date().toISOString()
  };
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt, null, 2));
}

deploy().catch((error) => {
  const receipt = {
    ok: false,
    projectName,
    projectCanonicalUrl: `https://${projectName}.pages.dev/`,
    error: error.message,
    failedAt: new Date().toISOString()
  };
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.error(error.message);
  process.exit(1);
});
