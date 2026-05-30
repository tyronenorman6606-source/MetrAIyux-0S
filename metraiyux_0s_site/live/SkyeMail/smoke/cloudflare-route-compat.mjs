#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "../../..");
const base = String(process.env.SKYEMAIL_LIVE_BASE || "https://skyemail-platform.graylondonskyes.workers.dev").replace(/\/+$/, "");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const artifactDir = path.join(repoRoot, "test-artifacts", "skyemail-cloudflare-route-compat", stamp);
const latestPath = path.join(repoRoot, "test-artifacts", "skyemail-cloudflare-route-compat-latest.json");

const forbiddenBodyMarkers = [
  "SkyeMail API route not implemented",
  "route not implemented",
  "Server functions not found",
  "Admin recovery is not available right now",
];

const checks = [
  {
    method: "GET",
    path: "/admin-public-key",
    expectStatus: [200],
    expectJson: (body) => body?.enabled === true && typeof body?.public_key_pem === "string" && body.public_key_pem.includes("BEGIN PUBLIC KEY"),
    description: "direct admin recovery public key",
  },
  {
    method: "GET",
    path: "/.netlify/functions/skymail-standalone-admin-public-key.js",
    expectStatus: [200],
    expectJson: (body) => body?.enabled === true && typeof body?.public_key_pem === "string" && body.public_key_pem.includes("BEGIN PUBLIC KEY"),
    description: "standalone Netlify-style .js admin key route",
  },
  {
    method: "POST",
    path: "/.netlify/functions/skymail-standalone-auth-signup.js",
    body: {},
    expectStatus: [410],
    expectText: "app_local_auth_disabled_by_shared_gate",
    description: "standalone Netlify-style .js signup route delegates to shared 0S gate",
  },
  {
    method: "POST",
    path: "/.netlify/functions/auth-signup.js",
    body: {},
    expectStatus: [410],
    expectText: "app_local_auth_disabled_by_shared_gate",
    description: "plain Netlify-style .js signup route delegates to shared 0S gate",
  },
  {
    method: "POST",
    path: "/api/auth-signup.js",
    body: {},
    expectStatus: [410],
    expectText: "app_local_auth_disabled_by_shared_gate",
    description: "api .js signup route delegates to shared 0S gate",
  },
  {
    method: "POST",
    path: "/api/skymail-standalone-auth-signup.js",
    body: {},
    expectStatus: [410],
    expectText: "app_local_auth_disabled_by_shared_gate",
    description: "api standalone .js signup route delegates to shared 0S gate",
  },
  {
    method: "POST",
    path: "/.netlify/functions/skymail-standalone-gmail-send.js",
    body: {},
    expectStatus: [401],
    expectText: "Unauthorized",
    description: "standalone Netlify-style .js gmail-send compatibility route",
  },
  {
    method: "POST",
    path: "/api/gmail-send.js",
    body: {},
    expectStatus: [401],
    expectText: "Unauthorized",
    description: "api .js gmail-send compatibility route",
  },
];

async function timedFetch(check) {
  const started = performance.now();
  const response = await fetch(`${base}${check.path}`, {
    method: check.method,
    headers: {
      accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
      ...(check.body ? { "content-type": "application/json" } : {}),
    },
    body: check.body ? JSON.stringify(check.body) : undefined,
  });
  const ms = Math.round(performance.now() - started);
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();
  let json = null;
  if (contentType.includes("json") || raw.trim().startsWith("{")) {
    json = JSON.parse(raw);
  }
  return {
    ...check,
    url: `${base}${check.path}`,
    status: response.status,
    ok: response.ok,
    ms,
    contentType,
    bodyText: raw.slice(0, 800),
    json,
  };
}

function verify(result) {
  assert.ok(result.expectStatus.includes(result.status), `${result.description} returned ${result.status}`);
  for (const marker of forbiddenBodyMarkers) {
    assert.equal(result.bodyText.includes(marker), false, `${result.description} leaked forbidden body marker: ${marker}`);
  }
  if (result.expectText) assert.ok(result.bodyText.includes(result.expectText), `${result.description} missing text: ${result.expectText}`);
  if (result.expectJson) assert.equal(result.expectJson(result.json), true, `${result.description} JSON contract failed`);
}

await fs.mkdir(artifactDir, { recursive: true });

const results = [];
for (const check of checks) {
  const result = await timedFetch(check);
  verify(result);
  results.push({
    description: result.description,
    method: result.method,
    path: result.path,
    url: result.url,
    status: result.status,
    ms: result.ms,
    contentType: result.contentType,
  });
}

const receipt = {
  ok: true,
  generated_at: new Date().toISOString(),
  base,
  checks: results,
  note: "Covers the exact Cloudflare/Netlify route compatibility gaps that previously surfaced as auth-signup.js and gmail-send not implemented.",
};

await fs.writeFile(path.join(artifactDir, "receipt.json"), JSON.stringify(receipt, null, 2));
await fs.writeFile(latestPath, JSON.stringify(receipt, null, 2));
console.log(JSON.stringify(receipt, null, 2));
