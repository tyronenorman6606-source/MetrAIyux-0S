#!/usr/bin/env node
import path from "node:path";
import { existsSync } from "node:fs";
import {
  appendEvent,
  createIntake,
  factoryRoot,
  generateApp,
  linkSkyePay,
  provisionWorkspace,
  readRecord,
  runScanner,
  saveRecord,
  slugify
} from "./factory-engine.mjs";
import { markState } from "./factory-pipeline-shared.mjs";

export async function runFactoryCore(payload = {}) {
  const clientId = slugify(payload.clientId || "skye-app-template");
  let record = await readRecord(clientId);

  if (!record.completedStates?.includes("intake-created")) {
    record = await createIntake({ ...record, clientId });
  }

  if (existsSync(path.join(factoryRoot, "MCP_TOOLING_RECEIPT.json"))) {
    const mcpEvent = await appendEvent(clientId, "mcp-before-run", `MCP receipt attached before factory run for ${record.displayName}`, {
      artifact: "client-app-factory/MCP_TOOLING_RECEIPT.json"
    });
    record = await saveRecord(markState(record, "mcp-before-run"), mcpEvent);
  }

  const preflightScan = await runScanner(clientId);
  const generated = await generateApp({ clientId, sourceFolder: payload.sourceFolder });
  const scan = await runScanner(clientId);
  const workspace = await provisionWorkspace({ clientId, ...(payload.workspacePlan || {}) });
  const payment = await linkSkyePay({ clientId, ...(payload.paymentPlan || {}) });

  return {
    ok: true,
    clientId,
    record: await readRecord(clientId),
    scan: scan.report,
    preflightScan: preflightScan.report,
    generated: generated.manifest,
    workspace: workspace.workspacePlan,
    payment: payment.paymentPlan
  };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const result = await runFactoryCore({ clientId: process.argv[2] || "skye-app-template" });
  console.log(JSON.stringify(result, null, 2));
}
