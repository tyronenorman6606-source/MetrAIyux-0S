export const AI_RESPONSE_LANES = Object.freeze({
  'relay13-ai-response-starter': Object.freeze({
    id: 'relay13-ai-response-starter',
    shortId: 'starter',
    name: 'Relay13 AI Response Starter',
    priceMonthlyUsd: 35,
    includedMessages: 125,
    backupBucketMessages: 31,
    skyePayOffer: 'relay13-ai-response-starter',
    mode: 'owner_reviewed_drafts',
    managedInbox: false,
    localBrainFirst: true,
    customerSendPolicy: 'owner_review_required',
    description: 'Entry paid lane for owner-reviewed AI response drafts after local brain triage.',
    monitor: {
      warningAtPercent: 80,
      backupWarningAtPercent: 50,
      hardStopProviderCallsAfterBackup: true
    }
  }),
  'relay13-ai-response-plus': Object.freeze({
    id: 'relay13-ai-response-plus',
    shortId: 'plus',
    name: 'Relay13 AI Response Plus',
    priceMonthlyUsd: 79,
    includedMessages: 425,
    backupBucketMessages: 76,
    skyePayOffer: 'relay13-ai-response-plus',
    mode: 'priority_owner_reviewed_drafts',
    managedInbox: false,
    localBrainFirst: true,
    customerSendPolicy: 'owner_review_required',
    description: 'Higher-volume response lane with priority routing, expanded FAQ tuning, and owner-reviewed drafts.',
    monitor: {
      warningAtPercent: 80,
      backupWarningAtPercent: 50,
      hardStopProviderCallsAfterBackup: true
    }
  }),
  'relay13-managed-ai-inbox': Object.freeze({
    id: 'relay13-managed-ai-inbox',
    shortId: 'managed',
    name: 'Relay13 Managed AI Inbox',
    priceMonthlyUsd: 149,
    priceQualifier: 'from',
    includedMessages: 1000,
    backupBucketMessages: 222,
    skyePayOffer: 'relay13-managed-ai-inbox',
    mode: 'managed_inbox',
    managedInbox: true,
    localBrainFirst: true,
    customerSendPolicy: 'policy_allowlisted_auto_send_with_human_escalation',
    description: 'Actual managed inbox lane: AI triages, labels, drafts, follows approved playbooks, sends allowlisted routine responses, and escalates anything risky.',
    managedActions: [
      'auto_triage',
      'intent_labeling',
      'priority_scoring',
      'policy_allowlisted_auto_reply',
      'follow_up_timer',
      'human_escalation',
      'connectlog_summary'
    ],
    monitor: {
      warningAtPercent: 80,
      backupWarningAtPercent: 50,
      hardStopProviderCallsAfterBackup: true,
      managedReviewEveryMessages: 50
    }
  })
});

const LANE_ALIASES = Object.freeze({
  starter: 'relay13-ai-response-starter',
  plus: 'relay13-ai-response-plus',
  managed: 'relay13-managed-ai-inbox',
  'managed-ai-inbox': 'relay13-managed-ai-inbox',
  'ai-managed-inbox': 'relay13-managed-ai-inbox'
});

export function getAiResponseLane(planId = 'relay13-ai-response-starter') {
  const key = String(planId || 'relay13-ai-response-starter').trim();
  const resolved = LANE_ALIASES[key] || key;
  const lane = AI_RESPONSE_LANES[resolved];
  if (!lane) throw new Error(`Unknown Relay13 AI response lane: ${planId}`);
  return lane;
}

export function listAiResponseLanes() {
  return Object.values(AI_RESPONSE_LANES).map((lane) => ({
    ...lane,
    totalProtectedMessages: lane.includedMessages + lane.backupBucketMessages
  }));
}

function numberValue(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) && next >= 0 ? Math.floor(next) : fallback;
}

function percent(used, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

export function evaluateAiResponseUsage(input = {}) {
  const lane = getAiResponseLane(input.planId || input.laneId || input.plan || 'relay13-ai-response-starter');
  const active = input.addOnActive !== false && input.active !== false;
  const usedThisMonth = numberValue(input.usedThisMonth ?? input.used ?? 0);
  const message = input.message && typeof input.message === 'object' ? input.message : {};
  const totalProtectedMessages = lane.includedMessages + lane.backupBucketMessages;
  const primaryRemaining = Math.max(0, lane.includedMessages - usedThisMonth);
  const backupUsed = Math.max(0, usedThisMonth - lane.includedMessages);
  const backupRemaining = Math.max(0, lane.backupBucketMessages - backupUsed);
  const alerts = [];

  if (!active) {
    alerts.push('add_on_inactive_local_brain_only');
    return {
      ok: true,
      lane,
      status: 'local_brain_manual_queue',
      aiCallAllowed: false,
      captureLead: true,
      persistToFs27: true,
      openRelay13Thread: true,
      writeConnectLogEvent: true,
      usedThisMonth,
      primaryRemaining,
      backupRemaining,
      totalProtectedMessages,
      alerts,
      customerFacingAction: 'Capture and route locally. Owner/manual response required.',
      managedAction: lane.managedInbox ? 'managed_policy_paused_until_payment_active' : 'none'
    };
  }

  if (usedThisMonth >= totalProtectedMessages) {
    alerts.push('backup_bucket_exhausted');
    alerts.push('provider_calls_hard_stopped');
    return {
      ok: true,
      lane,
      status: 'local_brain_manual_queue',
      aiCallAllowed: false,
      captureLead: true,
      persistToFs27: true,
      openRelay13Thread: true,
      writeConnectLogEvent: true,
      usedThisMonth,
      primaryRemaining: 0,
      backupRemaining: 0,
      totalProtectedMessages,
      alerts,
      customerFacingAction: 'Capture, persist, and queue the message. No paid provider call until the owner upgrades or resets.',
      managedAction: lane.managedInbox ? 'managed_triage_local_only_human_escalation' : 'none'
    };
  }

  const usingBackup = usedThisMonth >= lane.includedMessages;
  if (percent(usedThisMonth, lane.includedMessages) >= lane.monitor.warningAtPercent && !usingBackup) {
    alerts.push('approaching_primary_limit');
  }
  if (usingBackup) {
    alerts.push('backup_bucket_active');
    if (percent(backupUsed + 1, lane.backupBucketMessages) >= lane.monitor.backupWarningAtPercent) {
      alerts.push('backup_bucket_half_used');
    }
  }
  if (lane.managedInbox && (usedThisMonth + 1) % lane.monitor.managedReviewEveryMessages === 0) {
    alerts.push('managed_inbox_review_checkpoint');
  }

  const routine = Boolean(message.routine === true || /hours|price|quote|availability|appointment|status|estimate/i.test(String(message.text || '')));
  return {
    ok: true,
    lane,
    status: usingBackup ? 'backup_bucket_ai_allowed' : 'primary_ai_allowed',
    bucket: usingBackup ? 'backup' : 'primary',
    aiCallAllowed: true,
    captureLead: true,
    persistToFs27: true,
    openRelay13Thread: true,
    writeConnectLogEvent: true,
    usedThisMonth,
    primaryRemaining: usingBackup ? 0 : Math.max(0, lane.includedMessages - usedThisMonth - 1),
    backupRemaining: usingBackup ? Math.max(0, lane.backupBucketMessages - backupUsed - 1) : lane.backupBucketMessages,
    totalProtectedMessages,
    alerts,
    customerFacingAction: lane.managedInbox && routine
      ? 'AI may send an allowlisted routine response, then log it for owner review.'
      : 'AI drafts a response and holds it for owner review.',
    managedAction: lane.managedInbox
      ? (routine ? 'triage_draft_allowlisted_send_and_log' : 'triage_draft_escalate_to_human')
      : 'owner_reviewed_draft_only'
  };
}

export function buildAiResponseMonitorSnapshot(input = {}) {
  const lane = getAiResponseLane(input.planId || input.laneId || input.plan || 'relay13-ai-response-starter');
  const usedThisMonth = numberValue(input.usedThisMonth ?? input.used ?? 0);
  const totalProtectedMessages = lane.includedMessages + lane.backupBucketMessages;
  const evaluation = evaluateAiResponseUsage({ ...input, planId: lane.id, usedThisMonth });
  return {
    ok: true,
    laneId: lane.id,
    laneName: lane.name,
    priceMonthlyUsd: lane.priceMonthlyUsd,
    includedMessages: lane.includedMessages,
    backupBucketMessages: lane.backupBucketMessages,
    totalProtectedMessages,
    usedThisMonth,
    primaryUsedPercent: percent(Math.min(usedThisMonth, lane.includedMessages), lane.includedMessages),
    protectedUsedPercent: percent(Math.min(usedThisMonth, totalProtectedMessages), totalProtectedMessages),
    status: evaluation.status,
    aiCallAllowed: evaluation.aiCallAllowed,
    alerts: evaluation.alerts,
    leadLossRisk: false,
    providerCostRisk: evaluation.aiCallAllowed ? 'metered_inside_paid_lane' : 'stopped_or_local_only',
    nextRecommendedAction: evaluation.alerts.includes('backup_bucket_exhausted')
      ? 'Upgrade, reset, or keep routing locally with manual owner response.'
      : evaluation.alerts.includes('backup_bucket_active')
        ? 'Notify owner that the safety bucket is active and watch upgrade/reset timing.'
        : evaluation.alerts.includes('approaching_primary_limit')
          ? 'Warn owner before the backup bucket activates.'
          : 'Healthy.'
  };
}

export function simulateAiResponseLoad(input = {}) {
  const lane = getAiResponseLane(input.planId || input.laneId || input.plan || 'relay13-ai-response-starter');
  const messageCount = numberValue(input.messageCount ?? input.messages ?? input.count ?? 0);
  const active = input.addOnActive !== false && input.active !== false;
  const summary = {
    ok: true,
    laneId: lane.id,
    laneName: lane.name,
    active,
    attemptedMessages: messageCount,
    primaryAi: 0,
    backupAi: 0,
    localManualQueue: 0,
    capturedLeads: 0,
    persistedFs27: 0,
    relay13Threads: 0,
    connectLogEvents: 0,
    managedAutoActions: 0,
    alerts: new Set()
  };

  for (let i = 0; i < messageCount; i += 1) {
    const evaluation = evaluateAiResponseUsage({
      planId: lane.id,
      addOnActive: active,
      usedThisMonth: i,
      message: { routine: i % 3 !== 0, text: i % 3 === 0 ? 'urgent custom owner question' : 'quote and availability request' }
    });
    if (evaluation.bucket === 'primary') summary.primaryAi += 1;
    if (evaluation.bucket === 'backup') summary.backupAi += 1;
    if (!evaluation.aiCallAllowed) summary.localManualQueue += 1;
    if (evaluation.captureLead) summary.capturedLeads += 1;
    if (evaluation.persistToFs27) summary.persistedFs27 += 1;
    if (evaluation.openRelay13Thread) summary.relay13Threads += 1;
    if (evaluation.writeConnectLogEvent) summary.connectLogEvents += 1;
    if (String(evaluation.managedAction || '').includes('allowlisted_send')) summary.managedAutoActions += 1;
    for (const alert of evaluation.alerts || []) summary.alerts.add(alert);
  }

  return {
    ...summary,
    alerts: [...summary.alerts],
    leadLossRisk: summary.capturedLeads !== messageCount || summary.persistedFs27 !== messageCount,
    providerCallsCapped: summary.primaryAi <= lane.includedMessages && summary.backupAi <= lane.backupBucketMessages,
    totalProtectedMessages: lane.includedMessages + lane.backupBucketMessages
  };
}
