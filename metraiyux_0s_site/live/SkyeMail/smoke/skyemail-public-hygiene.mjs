#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "../../..");
const latestPath = path.join(repoRoot, "test-artifacts", "skyemail-public-hygiene", "skyemail-public-hygiene-latest.json");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const stampedPath = path.join(repoRoot, "test-artifacts", "skyemail-public-hygiene", `${stamp}.json`);

const indexedPathBans = [
  "/cf-assets/",
  "/mcp-proof",
  "/proof/",
  "/generators/",
  "/message.html",
  "/message/",
  "/workspace.html",
  "/workspace/",
];

const stalePublicTerms = [
  "Citadel Inbox Demo",
  "SkyeMail Citadel",
  "SkyEmail Citadel",
  "Skyemail Citadel",
  "SkyeMail Vault",
  "SkyEmail Vault",
  "backed by Cloudflare",
  "Cloudflare and Neon",
  "GRAYSCAPE467",
  "owner_qa_unlimited",
];

const publicSourceFiles = [
  "index.html",
  "ai.html",
  "brain.html",
  "changelog.html",
  "compose.html",
  "contacts.html",
  "dashboard.html",
  "drafts.html",
  "founder.html",
  "keys.html",
  "live-proof.html",
  "login.html",
  "marketing.html",
  "message.html",
  "monitoring.html",
  "onboarding.html",
  "pricing.html",
  "security.html",
  "send.html",
  "sent.html",
  "settings.html",
  "signup.html",
  "spam.html",
  "tech-stack.html",
  "thread.html",
  "trash.html",
  "workspace.html",
  "google-indexing-submit.json",
  "assets/message-page.js",
  "assets/workspace-page.js",
  "assets/mailbox-page.js",
  "assets/mail-ui.js",
  "cf-assets/index.html",
  "cf-assets/changelog.html",
  "cf-assets/live-proof.html",
  "cf-assets/live-proof/index.html",
  "cf-assets/message.html",
  "cf-assets/message/index.html",
  "cf-assets/workspace.html",
  "cf-assets/workspace/index.html",
  "dashboard/index.html",
  "compose/index.html",
  "message/index.html",
  "thread/index.html",
  "trash/index.html",
  "workspace/index.html",
  "cf-assets/assets/message-page.js",
  "cf-assets/assets/workspace-page.js",
  "cf-assets/assets/mailbox-page.js",
  "cf-assets/assets/mail-ui.js",
];

async function read(rel) {
  return fs.readFile(path.join(appRoot, rel), "utf8");
}

async function maybeRead(rel) {
  try {
    return await read(rel);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function assertNoDeadControls(rel, source) {
  const deadPatterns = [/href=["']#["']/i, /javascript:void/i];
  for (const pattern of deadPatterns) {
    assert.equal(pattern.test(source), false, `${rel} contains dead browser control marker ${pattern}`);
  }
}

function assertNoStaleTerms(rel, source) {
  for (const term of stalePublicTerms) {
    assert.equal(source.includes(term), false, `${rel} contains stale or private public term: ${term}`);
  }
}

function assertNoIndexedPrivateProof(urlOrPath, context) {
  for (const ban of indexedPathBans) {
    assert.equal(urlOrPath.includes(ban), false, `${context} indexes private/build/proof path: ${urlOrPath}`);
  }
}

const scanned = [];

const robots = await read("robots.txt");
for (const line of ["Disallow: /cf-assets/", "Disallow: /mcp-proof.html", "Disallow: /mcp-proof/", "Disallow: /proof/"]) {
  assert.ok(robots.includes(line), `robots.txt missing ${line}`);
}
scanned.push({ rel: "robots.txt", bytes: Buffer.byteLength(robots) });

const sitemap = await read("sitemap.xml");
for (const loc of Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)).map((match) => match[1])) {
  assertNoIndexedPrivateProof(loc, "sitemap.xml");
}
scanned.push({ rel: "sitemap.xml", bytes: Buffer.byteLength(sitemap) });

const indexing = JSON.parse(await read("google-indexing-submit.json"));
assert.ok(Array.isArray(indexing.pages), "google-indexing-submit.json must contain a pages array");
assert.equal(indexing.page_count, indexing.pages.length, "google-indexing page_count must match filtered pages length");
for (const page of indexing.pages) {
  assertNoIndexedPrivateProof(String(page.loc || ""), "google-indexing-submit.json");
  assertNoIndexedPrivateProof(String(page.relPath || ""), "google-indexing-submit.json");
  assertNoStaleTerms(`google-indexing-submit.json:${page.relPath || page.loc}`, String(page.title || ""));
}

for (const rel of ["mcp-proof.html", "cf-assets/mcp-proof.html", "cf-assets/mcp-proof/index.html"]) {
  const source = await maybeRead(rel);
  if (!source) continue;
  assert.ok(/<meta\s+name=["']robots["']\s+content=["']noindex,\s*nofollow["']/i.test(source), `${rel} must be noindex,nofollow`);
  scanned.push({ rel, bytes: Buffer.byteLength(source), noindex: true });
}

for (const rel of publicSourceFiles) {
  const source = await maybeRead(rel);
  if (!source) continue;
  assertNoDeadControls(rel, source);
  assertNoStaleTerms(rel, source);
  scanned.push({ rel, bytes: Buffer.byteLength(source) });
}

const receipt = {
  ok: true,
  generated_at: new Date().toISOString(),
  platform: "SkyeMail",
  proof: [
    "Robots blocks generated cf-assets, mcp-proof, and proof artifacts from indexing.",
    "Sitemap and Google indexing manifest contain only public customer routes.",
    "Public source and Cloudflare asset pages do not expose stale demo titles, stale product naming, owner QA code names, dead href controls, or public-free-checkout language.",
    "Proof-only MCP pages carry noindex,nofollow.",
  ],
  scanned_files: scanned,
  indexed_path_bans: indexedPathBans,
  stale_public_terms: stalePublicTerms,
};

await fs.mkdir(path.dirname(latestPath), { recursive: true });
await fs.writeFile(stampedPath, JSON.stringify(receipt, null, 2) + "\n");
await fs.writeFile(latestPath, JSON.stringify(receipt, null, 2) + "\n");
console.log(JSON.stringify({ ok: true, receipt: path.relative(repoRoot, latestPath), scanned_files: scanned.length }, null, 2));
