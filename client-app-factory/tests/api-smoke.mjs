#!/usr/bin/env node
const baseUrl = process.argv[2] || "http://127.0.0.1:4199";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers: { "content-type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.ok === false) {
    throw new Error(`${options.method || "GET"} ${path} failed: ${json.error || response.status}`);
  }
  return json;
}

const health = await request("/api/health");
const intake = await request("/api/factory/intake", {
  method: "POST",
  body: {
    clientId: "empire-pallets",
    displayName: "Empire Pallets",
    industry: "Industrial logistics and pallet operations",
    primaryContact: "Empire Pallets Sales",
    phone: "480-662-6551",
    email: "sales@empirepalletsaz.com",
    liveUrl: "https://www.epalletsaz.com/",
    services: ["New manufactured pallets", "Recycled pallets", "Custom pallet design"],
    notes: "API smoke intake write"
  }
});

const asset = await request("/api/factory/assets", {
  method: "POST",
  body: {
    clientId: "empire-pallets",
    fileName: "api-smoke-proof.txt",
    mimeType: "text/plain",
    base64: Buffer.from("Client App Factory API smoke asset").toString("base64"),
    provenance: "api-smoke-generated"
  }
});

const generated = await request("/api/factory/generate", {
  method: "POST",
  body: { clientId: "empire-pallets" }
});

const workspace = await request("/api/factory/workspace", {
  method: "POST",
  body: { clientId: "empire-pallets" }
});

const payment = await request("/api/factory/skyepay", {
  method: "POST",
  body: { clientId: "empire-pallets" }
});

const aiPlans = await request("/api/factory/ai-response/plans");
const aiRoute = await request("/api/factory/ai-response/route", {
  method: "POST",
  body: {
    planId: "relay13-managed-ai-inbox",
    usedThisMonth: 1000,
    message: { routine: true, text: "Can I get a quote and availability?" }
  }
});
const aiStress = await request("/api/factory/ai-response/stress", {
  method: "POST",
  body: {
    planId: "relay13-ai-response-plus",
    messageCount: 525
  }
});

const proof = await request("/api/factory/proof", {
  method: "POST",
  body: { clientId: "empire-pallets" }
});

const ledger = await request("/api/factory/proof-ledger");

const assertions = {
  healthOk: health.ok === true,
  intakeSaved: intake.record?.completedStates?.includes("intake-created"),
  assetCataloged: asset.record?.assetVault?.some((item) => item.originalName === "api-smoke-proof.txt"),
  generatedManifest: generated.manifest?.publishFolder?.includes("client-apps/empire-pallets"),
  workspaceLinked: workspace.record?.completedStates?.includes("workspace-linked"),
  paymentLinked: payment.record?.completedStates?.includes("payment-lane-linked"),
  aiPlansLoaded: aiPlans.plans?.length === 3,
  aiBackupAllowed: aiRoute.result?.status === "backup_bucket_ai_allowed" && aiRoute.result?.managedAction === "triage_draft_allowlisted_send_and_log",
  aiStressCapped: aiStress.result?.primaryAi === 425 && aiStress.result?.backupAi === 76 && aiStress.result?.localManualQueue === 24 && aiStress.result?.leadLossRisk === false,
  proofRecorded: proof.record?.completedStates?.includes("browser-proofed"),
  ledgerWritten: ledger.ledger?.length >= 5
};

const failures = Object.entries(assertions)
  .filter(([, pass]) => !pass)
  .map(([name]) => name);

console.log(JSON.stringify({ baseUrl, assertions, ledgerCount: ledger.ledger?.length || 0 }, null, 2));

if (failures.length) {
  console.error(`API smoke failed: ${failures.join(", ")}`);
  process.exit(1);
}
