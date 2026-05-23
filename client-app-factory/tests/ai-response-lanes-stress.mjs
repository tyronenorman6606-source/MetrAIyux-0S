#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  evaluateAiResponseUsage,
  listAiResponseLanes,
  simulateAiResponseLoad
} from "../../metraiyux_0s_site/cloudflare/relay13-ai-lanes.mjs";

const expectations = [
  ["relay13-ai-response-starter", 125, 31],
  ["relay13-ai-response-plus", 425, 76],
  ["relay13-managed-ai-inbox", 1000, 222]
];

const plans = listAiResponseLanes();
assert.equal(plans.length, 3, "Expected three Relay13 AI response lanes.");

for (const [planId, primary, backup] of expectations) {
  const stress = simulateAiResponseLoad({ planId, messageCount: primary + backup + 25 });
  assert.equal(stress.primaryAi, primary, `${planId} primary bucket should be capped.`);
  assert.equal(stress.backupAi, backup, `${planId} backup bucket should be capped.`);
  assert.equal(stress.localManualQueue, 25, `${planId} should fall back after protected quota.`);
  assert.equal(stress.capturedLeads, primary + backup + 25, `${planId} must capture every message.`);
  assert.equal(stress.persistedFs27, primary + backup + 25, `${planId} must persist every message to FS27 path.`);
  assert.equal(stress.relay13Threads, primary + backup + 25, `${planId} must open/keep Relay13 thread path.`);
  assert.equal(stress.connectLogEvents, primary + backup + 25, `${planId} must write ConnectLog event path.`);
  assert.equal(stress.leadLossRisk, false, `${planId} must not create lead-loss risk.`);
  assert.equal(stress.providerCallsCapped, true, `${planId} provider calls must be quota capped.`);

  const backupEval = evaluateAiResponseUsage({ planId, usedThisMonth: primary });
  assert.equal(backupEval.status, "backup_bucket_ai_allowed", `${planId} should enter backup bucket at primary limit.`);
  assert.equal(backupEval.aiCallAllowed, true, `${planId} should allow AI inside backup bucket.`);

  const exhaustedEval = evaluateAiResponseUsage({ planId, usedThisMonth: primary + backup });
  assert.equal(exhaustedEval.status, "local_brain_manual_queue", `${planId} should stop paid provider calls after backup.`);
  assert.equal(exhaustedEval.aiCallAllowed, false, `${planId} must hard-stop provider calls after backup.`);
  assert.equal(exhaustedEval.captureLead, true, `${planId} must still capture leads after backup.`);
}

const inactive = evaluateAiResponseUsage({
  planId: "relay13-ai-response-starter",
  addOnActive: false,
  usedThisMonth: 0
});
assert.equal(inactive.aiCallAllowed, false, "Inactive add-on must not allow provider calls.");
assert.equal(inactive.captureLead, true, "Inactive add-on must still capture leads.");

const managedRoutine = evaluateAiResponseUsage({
  planId: "relay13-managed-ai-inbox",
  usedThisMonth: 10,
  message: { routine: true, text: "Can I get a quote and availability?" }
});
assert.equal(managedRoutine.lane.managedInbox, true, "Managed lane must be marked as managed.");
assert.equal(managedRoutine.managedAction, "triage_draft_allowlisted_send_and_log", "Managed lane must perform real managed inbox action for routine messages.");

const managedRisky = evaluateAiResponseUsage({
  planId: "relay13-managed-ai-inbox",
  usedThisMonth: 11,
  message: { routine: false, text: "I need a legal exception and custom refund promise." }
});
assert.equal(managedRisky.managedAction, "triage_draft_escalate_to_human", "Managed lane must escalate risky messages.");

console.log("Relay13 AI response lane stress test passed.");
