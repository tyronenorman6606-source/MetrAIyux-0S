#!/usr/bin/env node
import { readLedger, recordProof, slugify } from "./factory-engine.mjs";
import { runFactoryCore } from "./factory-core.mjs";
import { runFactoryEnhance } from "./factory-enhance.mjs";
import { runFactoryVerify } from "./factory-verify.mjs";

export async function runFactoryPipeline(payload = {}) {
  const clientId = slugify(payload.clientId || "skye-app-template");
  const core = await runFactoryCore(payload);
  const enhanced = await runFactoryEnhance({ clientId, ...(payload.enhancementPlan || {}) });
  const verified = await runFactoryVerify({ clientId, ...(payload.verificationPlan || {}) });
  const proof = await recordProof({ clientId });

  return {
    ok: verified.ok,
    clientId,
    record: proof,
    core,
    enhanced: {
      profile: enhanced.profile,
      reportPath: enhanced.reportPath
    },
    verified: verified.report,
    ledger: await readLedger(clientId)
  };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const result = await runFactoryPipeline({ clientId: process.argv[2] || "skye-app-template" });
  console.log(JSON.stringify(result, null, 2));
}
