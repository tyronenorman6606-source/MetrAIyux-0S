#!/usr/bin/env node
import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runGrowthCycle, runConnectedGrowthCycle, buildFallbackBrief } from "../src/index.mjs";
import { createAgenticGrowthServer } from "../src/server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");

async function loadExample(name) {
  return JSON.parse(await readFile(path.join(packageRoot, "examples", name), "utf8"));
}

async function request(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: options.method || "GET",
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

const noDomainPayload = await loadExample("no-domain-cycle.json");
const noDomain = runGrowthCycle(noDomainPayload, { includeStaticPatch: true });

assert.equal(noDomain.ok, true);
assert.equal(noDomain.snapshot.mode, "no_gsc_preview_or_no_domain");
assert.equal(noDomain.snapshot.noGscCapable, true);
assert.equal(noDomain.receipt.noGscCapable, true);
assert.ok(noDomain.plan.prioritizedActions.length >= 6);
assert.ok(noDomain.plan.publishPolicy.canDraftWithoutGsc);
assert.ok(noDomain.adapter.files.some((file) => file.path === "agentic-growth/AGENTIC_GROWTH_RECEIPT.json"));

const connectedPayload = await loadExample("connected-cycle.json");
const connected = runGrowthCycle(connectedPayload);

assert.equal(connected.ok, true);
assert.equal(connected.snapshot.mode, "connected_search_console");
assert.equal(connected.snapshot.sources.gsc.connected, true);
assert.ok(connected.plan.prioritizedActions.some((action) => action.type === "faq_expand"));
assert.ok(connected.plan.monetization.suggestedUnits > noDomain.plan.monetization.suggestedUnits - 10);

const fallbackBrief = buildFallbackBrief(noDomainPayload);
assert.equal(fallbackBrief.ok, true);
assert.equal(fallbackBrief.brief.canStartBeforeDomain, true);
assert.ok(fallbackBrief.brief.firstActions.length > 0);

const priorFetch = globalThis.fetch;
const providerCalls = [];
globalThis.fetch = async (url, init = {}) => {
  providerCalls.push({ url: String(url), headers: init.headers || {}, body: init.body ? String(init.body) : "" });
  const href = String(url);
  if (href.includes("searchconsole.googleapis.com")) {
    return new Response(JSON.stringify({ rows: [{ keys: ["agentic website phoenix", "https://example.test/"], clicks: 4, impressions: 120, ctr: 0.03, position: 9 }] }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }
  if (href.includes("api.semrush.com")) {
    return new Response("Ph;Po;Nq;Cp;Ur;Tr\nagentic seo;8;210;0.34;https://example.test/agentic-seo;22\n", {
      status: 200,
      headers: { "content-type": "text/plain" }
    });
  }
  if (href.includes("api.dataforseo.com")) {
    return new Response(JSON.stringify({
      tasks: [{
        data: { keyword: "agentic website phoenix" },
        result: [{ items: [{ type: "organic", rank_group: 1, title: "Agentic Website", url: "https://competitor.test/", description: "Proof backed result" }] }]
      }]
    }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }
  return priorFetch(url, init);
};

try {
  const connectedByRef = await runConnectedGrowthCycle({
    ...noDomainPayload,
    business: { ...noDomainPayload.business, domain: "sc-domain:example.test" },
    sourceConfig: {
      gsc: { credentialRef: "kg13_gsc", siteUrl: "sc-domain:example.test" },
      semrush: { credentialRef: "kg13_semrush", domain: "example.test" },
      dataForSeo: { credentialRef: "kg13_dataforseo", keywords: ["agentic website phoenix"] }
    }
  }, {}, {
    secretBroker: "key-gate-13th",
    secretResolver: async ({ vendorKey }) => {
      if (vendorKey === "google-search-console") return { credential: "gsc_ref_secret" };
      if (vendorKey === "semrush") return { credential: "semrush_ref_secret" };
      if (vendorKey === "dataforseo") return { credential: { login: "dfs_login", password: "dfs_password" } };
      throw new Error(`unexpected vendor ${vendorKey}`);
    }
  });
  assert.equal(connectedByRef.ok, true);
  assert.ok(connectedByRef.sourcePullReceipt.receipts.some((receipt) => receipt.broker === "key-gate-13th" && receipt.ok === true));
  assert.ok(providerCalls.length >= 3);
  assert.equal(JSON.stringify(connectedByRef).includes("semrush_ref_secret"), false);
  assert.equal(JSON.stringify(connectedByRef).includes("dfs_password"), false);
} finally {
  globalThis.fetch = priorFetch;
}

const server = createAgenticGrowthServer({
  allowedOrigins: "*",
  introspectGateToken: async (token) => ({
    active: token === "fs27_smoke",
    email: "agentic-smoke@example.invalid",
    role: "operator",
    scope: "gateway.invoke"
  })
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
  const health = await request(baseUrl, "/api/agentic-growth/health");
  assert.equal(health.response.status, 200);
  assert.equal(health.json.ok, true);

  const denied = await request(baseUrl, "/api/agentic-growth/v1/cycles", {
    method: "POST",
    body: noDomainPayload
  });
  assert.equal(denied.response.status, 401);

  const cycle = await request(baseUrl, "/api/agentic-growth/v1/cycles", {
    method: "POST",
    headers: { authorization: "Bearer fs27_smoke" },
    body: noDomainPayload
  });
  assert.equal(cycle.response.status, 200);
  assert.equal(cycle.json.ok, true);
  assert.equal(cycle.json.auth.mode, "fs27-gate");
  assert.equal(cycle.json.snapshot.mode, "no_gsc_preview_or_no_domain");

  const pulledCycle = await request(baseUrl, "/api/agentic-growth/v1/cycles/pull", {
    method: "POST",
    headers: { authorization: "Bearer fs27_smoke" },
    body: noDomainPayload
  });
  assert.equal(pulledCycle.response.status, 200);
  assert.equal(pulledCycle.json.ok, true);
  assert.ok(pulledCycle.json.sourcePullReceipt.receipts.every((receipt) => receipt.skipped === true));

  const patch = await request(baseUrl, "/api/agentic-growth/v1/adapters/static-site/patch", {
    method: "POST",
    headers: { "x-free99-gate-session": "fs27_smoke" },
    body: connectedPayload
  });
  assert.equal(patch.response.status, 200);
  assert.equal(patch.json.ok, true);
  assert.ok(patch.json.operations.length > 0);
} finally {
  server.close();
  await once(server, "close");
}

console.log(JSON.stringify({
  ok: true,
  noDomainMode: noDomain.snapshot.mode,
  connectedMode: connected.snapshot.mode,
  noDomainActions: noDomain.plan.prioritizedActions.length,
  connectedActions: connected.plan.prioritizedActions.length
}, null, 2));
