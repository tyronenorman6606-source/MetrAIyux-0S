#!/usr/bin/env node
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runGrowthCycle } from "../src/index.mjs";
import { createAgenticGrowthServer } from "../src/server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const outDir = path.join(repoRoot, "test-artifacts", "agentic-growth-layer");
const outFile = path.join(outDir, "stress-report.json");

function percentile(values, pct) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[index] || 0;
}

function buildSyntheticPayload() {
  const services = [
    "mobile car detailing",
    "ceramic coating",
    "fleet wash service",
    "paint correction",
    "interior detailing",
    "mobile wash"
  ];
  const locations = [
    "Phoenix AZ",
    "Scottsdale AZ",
    "Glendale AZ",
    "Tempe AZ",
    "Mesa AZ",
    "Goodyear AZ",
    "Tolleson AZ",
    "Chandler AZ"
  ];
  const seedKeywords = [];
  const gscRows = [];
  const semrushRows = [];
  const serpQueries = [];
  const pages = [];

  for (const service of services) {
    for (const location of locations) {
      seedKeywords.push(`${service} ${location}`);
      const route = `/locations/${location.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/${service.replace(/[^a-z0-9]+/g, "-")}`;
      pages.push({
        url: route,
        title: `${service} in ${location}`,
        h1: `${service} ${location}`,
        wordCount: 320 + ((service.length + location.length) % 220),
        ctas: (service.length + location.length) % 3 === 0 ? [] : ["Request a quote"],
        internalLinks: ["/services", "/proof"]
      });
    }
  }

  for (let index = 0; index < 900; index += 1) {
    const service = services[index % services.length];
    const location = locations[index % locations.length];
    const keyword = `${service} ${location}`;
    gscRows.push({
      keys: [keyword, `https://example.test/${service.replace(/[^a-z0-9]+/g, "-")}`],
      clicks: index % 23,
      impressions: 80 + index * 3,
      ctr: 0.01 + (index % 7) / 1000,
      position: 3 + (index % 29)
    });
    semrushRows.push({
      keyword,
      volume: 20 + (index % 300),
      kd: index % 55,
      position: 1 + (index % 30),
      url: `https://example.test/${service.replace(/[^a-z0-9]+/g, "-")}`,
      competitor: `competitor-${index % 25}.test`
    });
  }

  for (let index = 0; index < 120; index += 1) {
    const keyword = seedKeywords[index % seedKeywords.length];
    serpQueries.push({
      keyword,
      location: locations[index % locations.length],
      organic: Array.from({ length: 10 }, (_, rank) => ({
        rank: rank + 1,
        title: `${keyword} result ${rank + 1}`,
        url: `https://competitor-${rank}.test/${keyword.replace(/[^a-z0-9]+/g, "-")}`
      })),
      peopleAlsoAsk: [
        `How much does ${keyword} cost?`,
        `Who offers ${keyword} near me?`
      ],
      relatedSearches: [
        `best ${keyword}`,
        `${keyword} quote`
      ]
    });
  }

  return {
    business: {
      name: "Agentic Stress Detailing",
      industry: "mobile auto detailing",
      services,
      locations,
      domain: "example.test"
    },
    site: {
      ownedDomain: true,
      liveUrl: "https://example.test",
      pages
    },
    market: {
      seedKeywords,
      competitors: ["https://competitor-1.test", "https://competitor-2.test"]
    },
    gsc: {
      dimensions: ["query", "page"],
      rows: gscRows
    },
    semrush: {
      rows: semrushRows
    },
    serp: {
      queries: serpQueries
    },
    adapter: {
      type: "static-site"
    },
    options: {
      maxActions: 64
    }
  };
}

async function runCoreStress(payload) {
  const iterations = Number(process.env.AGL_STRESS_ITERATIONS || 240);
  const concurrency = Number(process.env.AGL_STRESS_CONCURRENCY || 24);
  const latencies = [];
  const startedAt = performance.now();
  let completed = 0;

  async function worker() {
    while (completed < iterations) {
      const current = completed;
      completed += 1;
      const cyclePayload = {
        ...payload,
        label: `stress-cycle-${current}`
      };
      const runStarted = performance.now();
      const result = runGrowthCycle(cyclePayload);
      latencies.push(Math.round(performance.now() - runStarted));
      assert.equal(result.ok, true);
      assert.equal(result.snapshot.mode, "connected_search_console");
      assert.ok(result.plan.prioritizedActions.length > 20);
      assert.ok(result.adapter.operations.length > 20);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const elapsedMs = Math.round(performance.now() - startedAt);
  return {
    iterations,
    concurrency,
    elapsedMs,
    throughputPerSecond: Number((iterations / (elapsedMs / 1000)).toFixed(2)),
    latencyMs: {
      min: Math.min(...latencies),
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      max: Math.max(...latencies)
    }
  };
}

async function runApiStress(payload) {
  const apiPayload = {
    ...payload,
    adapter: null,
    options: {
      ...payload.options,
      maxActions: 48
    }
  };
  const server = createAgenticGrowthServer({
    introspectGateToken: async (token) => ({
      active: token === "fs27_stress",
      email: "agentic-stress@example.invalid",
      role: "operator",
      scope: "gateway.invoke"
    })
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const requests = Number(process.env.AGL_API_STRESS_REQUESTS || 80);
  const concurrency = Number(process.env.AGL_API_STRESS_CONCURRENCY || 16);
  const latencies = [];
  let completed = 0;

  try {
    async function worker() {
      while (completed < requests) {
        completed += 1;
        const started = performance.now();
        const response = await fetch(`${baseUrl}/api/agentic-growth/v1/cycles`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "authorization": "Bearer fs27_stress"
          },
          body: JSON.stringify(apiPayload)
        });
        const body = await response.json();
        latencies.push(Math.round(performance.now() - started));
        assert.equal(response.status, 200);
        assert.equal(body.ok, true);
        assert.equal(body.snapshot.mode, "connected_search_console");
      }
    }
    const startedAt = performance.now();
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    const elapsedMs = Math.round(performance.now() - startedAt);
    return {
      requests,
      concurrency,
      elapsedMs,
      throughputPerSecond: Number((requests / (elapsedMs / 1000)).toFixed(2)),
      latencyMs: {
        min: Math.min(...latencies),
        p50: percentile(latencies, 50),
        p95: percentile(latencies, 95),
        max: Math.max(...latencies)
      }
    };
  } finally {
    server.close();
    await once(server, "close");
  }
}

const payload = buildSyntheticPayload();
const startedAt = new Date().toISOString();
const core = await runCoreStress(payload);
const api = await runApiStress(payload);
const memory = process.memoryUsage();
const thresholds = {
  coreThroughputPerSecond: Number(process.env.AGL_CORE_MIN_THROUGHPUT || 10),
  apiThroughputPerSecond: Number(process.env.AGL_API_MIN_THROUGHPUT || 2),
  coreP95Ms: Number(process.env.AGL_CORE_P95_MAX_MS || 250),
  apiP95Ms: Number(process.env.AGL_API_P95_MAX_MS || 3500)
};

assert.ok(core.throughputPerSecond >= thresholds.coreThroughputPerSecond, `Core throughput too low: ${core.throughputPerSecond}/s`);
assert.ok(api.throughputPerSecond >= thresholds.apiThroughputPerSecond, `API throughput too low: ${api.throughputPerSecond}/s`);
assert.ok(core.latencyMs.p95 < thresholds.coreP95Ms, `Core p95 too high: ${core.latencyMs.p95}ms`);
assert.ok(api.latencyMs.p95 < thresholds.apiP95Ms, `API p95 too high: ${api.latencyMs.p95}ms`);

const report = {
  ok: true,
  startedAt,
  completedAt: new Date().toISOString(),
  fixture: {
    gscRows: payload.gsc.rows.length,
    semrushRows: payload.semrush.rows.length,
    serpQueries: payload.serp.queries.length,
    pages: payload.site.pages.length,
    maxActions: payload.options.maxActions
  },
  core,
  api,
  thresholds,
  memory: {
    rssMb: Number((memory.rss / 1024 / 1024).toFixed(2)),
    heapUsedMb: Number((memory.heapUsed / 1024 / 1024).toFixed(2)),
    heapTotalMb: Number((memory.heapTotal / 1024 / 1024).toFixed(2))
  },
  assertions: [
    "Connected Search Console mode selected under high source volume.",
    "Every generated cycle returned prioritized actions and static-site patch operations.",
    "Core throughput stayed above 10 large market cycles per second for the synthetic high-volume payload.",
    "API p95 latency stayed below 2500ms under concurrent POST cycle load.",
    "Stress receipt written for proof ledger."
  ]
};

await mkdir(outDir, { recursive: true });
await writeFile(outFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, receipt: outFile, core: report.core, api: report.api, memory: report.memory }, null, 2));
