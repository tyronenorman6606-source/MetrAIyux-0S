#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runGrowthCycle } from "../src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const packageRoot = path.resolve(__dirname, "..");
const siteRoot = path.join(repoRoot, "marketing", "agentic-growth-layer");

const noDomainPayload = JSON.parse(await readFile(path.join(packageRoot, "examples", "no-domain-cycle.json"), "utf8"));
const connectedPayload = JSON.parse(await readFile(path.join(packageRoot, "examples", "connected-cycle.json"), "utf8"));
const noDomainCycle = runGrowthCycle(noDomainPayload, { includeStaticPatch: true });
const connectedCycle = runGrowthCycle(connectedPayload, { includeStaticPatch: true });
const stressPath = path.join(repoRoot, "test-artifacts", "agentic-growth-layer", "stress-report.json");
const stressReport = JSON.parse(await readFile(stressPath, "utf8"));

const serviceProof = {
  generatedAt: new Date().toISOString(),
  product: "Agentic Growth Layer",
  modes: {
    noDomain: {
      mode: noDomainCycle.snapshot.mode,
      actions: noDomainCycle.plan.prioritizedActions.length,
      patchOperations: noDomainCycle.adapter.operations.length,
      firstActions: noDomainCycle.plan.prioritizedActions.slice(0, 5)
    },
    connected: {
      mode: connectedCycle.snapshot.mode,
      actions: connectedCycle.plan.prioritizedActions.length,
      patchOperations: connectedCycle.adapter.operations.length,
      firstActions: connectedCycle.plan.prioritizedActions.slice(0, 5)
    }
  },
  stress: stressReport,
  endpoints: [
    "GET /api/agentic-growth/health",
    "POST /api/agentic-growth/v1/cycles",
    "POST /api/agentic-growth/v1/cycles/pull",
    "POST /api/agentic-growth/v1/adapters/static-site/patch"
  ],
  skyepayOffers: [
    {
      id: "agentic-growth-starter",
      label: "Agentic Growth Starter",
      setup: 1500,
      monthly: 497,
      checkout: "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=metraiyux-0s&offer=agentic-growth-starter"
    },
    {
      id: "agentic-growth-connected",
      label: "Agentic Growth Connected",
      setup: 3500,
      monthly: 1497,
      checkout: "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=metraiyux-0s&offer=agentic-growth-connected"
    },
    {
      id: "agentic-growth-operator",
      label: "Agentic Growth Operator",
      setup: 7500,
      monthly: 2997,
      checkout: "https://skyegatefs27-citadeldb.graylondonskyes.workers.dev/skyepay.html?client=metraiyux-0s&offer=agentic-growth-operator"
    }
  ]
};

await mkdir(path.join(siteRoot, "data"), { recursive: true });
await mkdir(path.join(siteRoot, "proof"), { recursive: true });
await writeFile(path.join(siteRoot, "data", "service-proof.json"), `${JSON.stringify(serviceProof, null, 2)}\n`);
await writeFile(path.join(siteRoot, "proof", "stress-report.json"), `${JSON.stringify(stressReport, null, 2)}\n`);

console.log(JSON.stringify({
  ok: true,
  siteRoot,
  noDomainActions: serviceProof.modes.noDomain.actions,
  connectedActions: serviceProof.modes.connected.actions,
  stressReceipt: "proof/stress-report.json"
}, null, 2));

