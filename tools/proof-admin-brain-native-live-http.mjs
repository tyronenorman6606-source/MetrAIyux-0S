import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const BASE_URL = process.env.ADMIN_BRAIN_LIVE_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const OUT_DIR = path.resolve('test-artifacts/admin-brain-native');
const LATEST = path.join(OUT_DIR, 'admin-brain-native-live-http-latest.json');
const ALLOW_LIVE_PROVIDER_CALLS = ['1', 'true', 'yes', 'on'].includes(String(process.env.ADMIN_BRAIN_ALLOW_LIVE_PROVIDER_CALLS || '').trim().toLowerCase());
async function fetchAny(label, url, init = {}) {
  const started = performance.now();
  const response = await fetch(url, init);
  const text = await response.text().catch(() => '');
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { text: text.slice(0, 2000) }; }
  return {
    label,
    url,
    method: init.method || 'GET',
    status: response.status,
    ok: response.ok && body.ok !== false,
    elapsedMs: Number((performance.now() - started).toFixed(2)),
    location: response.headers.get('location') || null,
    body
  };
}

async function main() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase: BASE_URL });
  const token = auth.token || '';
  const receipt = {
    ok: false,
    generatedAt: new Date().toISOString(),
    lane: 'admin-brain-native-live-http',
    baseUrl: BASE_URL,
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    liveProviderCallsAllowed: ALLOW_LIVE_PROVIDER_CALLS,
    credentialSource: auth.credential?.key || auth.credential?.source || 'missing',
    deploymentRequirement: '0S Worker with native /api/admin brain persistence endpoints',
    checks: [],
    stress: null,
    failures: []
  };

  receipt.checks.push({
    label: 'Shared FS27/SkyGate auth helper resolves owner bearer',
    status: Number(auth.response?.status || 0) || 0,
    ok: Boolean(auth.ok && token),
    tokenReceived: Boolean(token),
    via: auth.response?.via || auth.credential?.source || ''
  });

  if (!token) {
    receipt.failures.push(auth.response?.body?.error || auth.response?.error || 'No shared FS27/SkyGate bearer or owner gate exchange credential found.');
    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(LATEST, `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(JSON.stringify({ ok: false, receipt: LATEST, failures: receipt.failures }, null, 2));
    process.exit(1);
  }

  const headers = {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token
  };

  const unauth = await fetchAny('Admin ledger blocks anonymous API read', `${BASE_URL}/api/admin/ledger`, {
    headers: { accept: 'application/json' }
  });
  receipt.checks.push({
    label: unauth.label,
    status: unauth.status,
    ok: [401, 403].includes(unauth.status),
    elapsedMs: unauth.elapsedMs,
    error: unauth.body?.error || null
  });

  if (token) {
    const marker = `native-admin-proof-${Date.now()}`;
    const status = await fetchAny('Founder Command status exposes Worker queue binding', `${BASE_URL}/api/founder-command/status`, {
      headers
    });
    receipt.checks.push({
      label: status.label,
      status: status.status,
      ok: status.ok && status.body?.bindings?.queue === true,
      elapsedMs: status.elapsedMs,
      queueConfigured: Boolean(status.body?.bindings?.queue),
      kvConfigured: Boolean(status.body?.bindings?.kv),
      sharedGate: true
    });

    const chat = await fetchAny('Admin Brain chat persists command receipt', `${BASE_URL}/api/admin/brain/chat`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ message: `Draft a social post for ${marker} and send it for owner approval before publishing.` })
    });
    const commandId = chat.body?.receipt?.id || '';
    receipt.checks.push({
      label: chat.label,
      status: chat.status,
      ok: chat.ok
        && chat.body?.persistence === 'site-events-kv'
        && chat.body?.receipt?.approval_required === true
        && chat.body?.queued === true,
      elapsedMs: chat.elapsedMs,
      commandId,
      persistence: chat.body?.persistence || null,
      queued: Boolean(chat.body?.queued),
      sharedGate: Boolean(chat.body?.shared_gate)
    });

    const approval = await fetchAny('Admin Approval Inbox persists decision', `${BASE_URL}/api/admin/approval`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ item_id: commandId, decision: 'approved', notes: `Approved by live HTTP proof for ${marker}.` })
    });
    receipt.checks.push({
      label: approval.label,
      status: approval.status,
      ok: approval.ok && approval.body?.persistence === 'site-events-kv' && approval.body?.approval?.item_id === commandId,
      elapsedMs: approval.elapsedMs,
      approvalId: approval.body?.approval?.id || '',
      persistence: approval.body?.persistence || null,
      sharedGate: Boolean(approval.body?.shared_gate)
    });

    const email = await fetchAny('Admin approval email test records provider receipt', `${BASE_URL}/api/admin/approval-email/test`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ message: `Live HTTP approval email test for ${marker}.` })
    });
    receipt.checks.push({
      label: email.label,
      status: email.status,
      ok: email.ok && email.body?.persistence === 'site-events-kv' && Boolean(email.body?.receipt?.delivery),
      elapsedMs: email.elapsedMs,
      delivery: email.body?.approval_email || null,
      persistence: email.body?.persistence || null,
      sharedGate: Boolean(email.body?.shared_gate)
    });

    const ledger = await fetchAny('Admin ledger reads back persisted command and approval', `${BASE_URL}/api/admin/ledger?limit=40`, { headers });
    const ledgerPayloads = Array.isArray(ledger.body?.ledger)
      ? ledger.body.ledger.map((row) => {
        try { return JSON.parse(row.payload || '{}'); } catch { return {}; }
      })
      : [];
    receipt.checks.push({
      label: ledger.label,
      status: ledger.status,
      ok: ledger.ok
        && ledger.body?.persistence === 'site-events-kv'
        && ledgerPayloads.some((row) => row.id === commandId)
        && ledgerPayloads.some((row) => row.item_id === commandId),
      elapsedMs: ledger.elapsedMs,
      count: ledger.body?.count || 0,
      commandReadBack: ledgerPayloads.some((row) => row.id === commandId),
      approvalReadBack: ledgerPayloads.some((row) => row.item_id === commandId)
    });

    const automationProjectId = `admin-brain-proof-${marker}`;
    const platformStorage = await fetchAny('Automation platform storage exposes queue/dead-letter state', `${BASE_URL}/api/kaixu-codestudio/platform/storage`, { headers });
    receipt.checks.push({
      label: platformStorage.label,
      status: platformStorage.status,
      ok: platformStorage.ok && platformStorage.body?.storage_mode === 'kv',
      elapsedMs: platformStorage.elapsedMs,
      storageMode: platformStorage.body?.storage_mode || null,
      stats: platformStorage.body?.stats || null
    });

    const providerProbe = await fetchAny('Automation platform provider probe marks owner-approved executable providers', `${BASE_URL}/api/kaixu-codestudio/platform/providers/probe`, { headers });
    const executorProbe = providerProbe.body?.providers?.zero_os_executor || {};
    const resendProbe = providerProbe.body?.providers?.resend || {};
    const twilioProbe = providerProbe.body?.providers?.twilio || {};
    receipt.checks.push({
      label: providerProbe.label,
      status: providerProbe.status,
      ok: providerProbe.ok
        && providerProbe.body?.mode === 'same_domain_adapter'
        && executorProbe.configured === true
        && executorProbe.executable_here === true
        && executorProbe.execution_boundary === 'internal_receipt_executor'
        && resendProbe.configured === true
        && resendProbe.executable_here === true
        && resendProbe.execution_boundary === 'shared_0s_provider_runtime'
        && twilioProbe.configured === true
        && twilioProbe.executable_here === true,
      elapsedMs: providerProbe.elapsedMs,
      mode: providerProbe.body?.mode || null,
      executableProviders: providerProbe.body?.executable_providers || [],
      zeroOsExecutorExecutable: Boolean(executorProbe.executable_here),
      resendExecutable: Boolean(resendProbe.executable_here),
      twilioConfigured: Boolean(twilioProbe.configured),
      twilioExecutionBoundary: twilioProbe.execution_boundary || null,
      twilioReason: twilioProbe.reason || null
    });

    const scorecard = await fetchAny('Automation platform scorecard exposes provider execution boundaries', `${BASE_URL}/api/kaixu-codestudio/platform/scorecard`, { headers });
    const scoreChecks = Array.isArray(scorecard.body?.checks) ? scorecard.body.checks : [];
    receipt.checks.push({
      label: scorecard.label,
      status: scorecard.status,
      ok: scorecard.ok
        && scorecard.body?.mode === 'same_domain_adapter'
        && /provider_call_made:true/.test(String(scorecard.body?.execution_semantics?.external_provider_call || ''))
        && scorecard.body?.score?.liveProviderSecrets === true
        && scoreChecks.some((check) => check.id === 'owner_approved_provider_execution' && check.ok === true)
        && scoreChecks.some((check) => check.id === 'live_provider_execution' && check.ok === true)
        && scoreChecks.some((check) => check.id === 'twilio_live_sms_execution' && check.ok === false),
      elapsedMs: scorecard.elapsedMs,
      mode: scorecard.body?.mode || null,
      executionSemantics: scorecard.body?.execution_semantics || null,
      liveProviderSecrets: Boolean(scorecard.body?.score?.liveProviderSecrets),
      executableProviders: scorecard.body?.score?.executableProviders || [],
      ownerApprovedExecutionCheck: scoreChecks.find((check) => check.id === 'owner_approved_provider_execution') || null,
      liveProviderExecutionCheck: scoreChecks.find((check) => check.id === 'live_provider_execution') || null,
      twilioExecutionCheck: scoreChecks.find((check) => check.id === 'twilio_live_sms_execution') || null
    });

    const queuedJob = await fetchAny('Automation platform queues approved operator job', `${BASE_URL}/api/kaixu-codestudio/platform/jobs`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId: automationProjectId,
        workflowId: 'admin_brain_approved_social_post',
        providerId: 'zero_os_executor',
        actionRoute: 'job.run',
        input: {
          adminBrainCommandId: commandId,
          marker,
          approvalRequired: true,
          externalActionPolicy: 'owner-approved-before-send',
          ownerApproved: true
        },
        priority: 5
      })
    });
    const jobId = queuedJob.body?.job?.id || '';
    receipt.checks.push({
      label: queuedJob.label,
      status: queuedJob.status,
      ok: queuedJob.ok
        && queuedJob.body?.job?.status === 'queued_for_operator_review'
        && Boolean(queuedJob.body?.receipt?.id),
      elapsedMs: queuedJob.elapsedMs,
      jobId,
      jobStatus: queuedJob.body?.job?.status || null,
      receiptId: queuedJob.body?.receipt?.id || null
    });

    const jobsReadback = await fetchAny('Automation platform reads back queued job', `${BASE_URL}/api/kaixu-codestudio/platform/jobs?projectId=${encodeURIComponent(automationProjectId)}&limit=20`, { headers });
    const jobs = Array.isArray(jobsReadback.body?.jobs) ? jobsReadback.body.jobs : [];
    receipt.checks.push({
      label: jobsReadback.label,
      status: jobsReadback.status,
      ok: jobsReadback.ok && jobs.some((job) => job.id === jobId),
      elapsedMs: jobsReadback.elapsedMs,
      count: jobs.length,
      jobReadBack: jobs.some((job) => job.id === jobId)
    });

    const jobRun = await fetchAny('Automation platform runs approved internal executor job with executed:true', `${BASE_URL}/api/kaixu-codestudio/platform/jobs/${encodeURIComponent(jobId)}/run`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId: automationProjectId,
        providerId: 'zero_os_executor',
        actionRoute: 'job.run',
        ownerApproved: true,
        input: {
          marker,
          adminBrainCommandId: commandId,
          proof: 'admin-brain-native-live-http'
        }
      })
    });
    receipt.checks.push({
      label: jobRun.label,
      status: jobRun.status,
      ok: jobRun.status === 200
        && jobRun.body?.executed === true
        && jobRun.body?.internal_provider_execution === true
        && jobRun.body?.fixture === false
        && Boolean(jobRun.body?.receipt?.id),
      elapsedMs: jobRun.elapsedMs,
      executed: Boolean(jobRun.body?.executed),
      internalProviderExecution: Boolean(jobRun.body?.internal_provider_execution),
      fixture: Boolean(jobRun.body?.fixture),
      receiptId: jobRun.body?.receipt?.id || null
    });

    const resendExecuted = await fetchAny('Automation platform returns honest Resend runtime receipt without default live send', `${BASE_URL}/api/kaixu-codestudio/platform/provider-packs/resend/actions/email.send/run`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId: automationProjectId,
        subject: `Admin Brain owner-approved execution proof ${marker}`,
        text: `Live HTTP proof for Admin Brain provider execution ${marker}. Owner-approved action; no fixture.`,
        ownerApproved: true,
        live: ALLOW_LIVE_PROVIDER_CALLS,
        sandbox: !ALLOW_LIVE_PROVIDER_CALLS,
        input: {
          marker,
          adminBrainCommandId: commandId,
          live: ALLOW_LIVE_PROVIDER_CALLS
        }
      })
    });
    receipt.checks.push({
      label: resendExecuted.label,
      status: resendExecuted.status,
      ok: resendExecuted.status === 200
        && resendExecuted.body?.executed === true
        && resendExecuted.body?.provider_call_made === ALLOW_LIVE_PROVIDER_CALLS
        && (ALLOW_LIVE_PROVIDER_CALLS
          ? resendExecuted.body?.execution_mode === 'live_provider_call'
          : resendExecuted.body?.execution_mode === 'sandbox_receipt')
        && resendExecuted.body?.fixture === false
        && resendExecuted.body?.provider?.id === 'resend'
        && Boolean(resendExecuted.body?.receipt?.id),
      elapsedMs: resendExecuted.elapsedMs,
      executed: Boolean(resendExecuted.body?.executed),
      providerCallMade: Boolean(resendExecuted.body?.provider_call_made),
      executionMode: resendExecuted.body?.execution_mode || null,
      externalProviderBoundary: resendExecuted.body?.external_provider_boundary || null,
      liveProviderCallsAllowed: ALLOW_LIVE_PROVIDER_CALLS,
      fixture: Boolean(resendExecuted.body?.fixture),
      receiptId: resendExecuted.body?.receipt?.id || null
    });

    const twilioBlocked = await fetchAny('Automation platform Twilio SMS refuses execution without explicit SMS opt-in', `${BASE_URL}/api/kaixu-codestudio/platform/provider-packs/twilio/actions/sms.send/run`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId: automationProjectId,
        to: '+15550100000',
        body: `Admin Brain proof Twilio boundary for ${marker}`,
        ownerApproved: true,
        live: true,
        sandbox: false
      })
    });
    receipt.checks.push({
      label: twilioBlocked.label,
      status: twilioBlocked.status,
      ok: twilioBlocked.status === 502
        && twilioBlocked.body?.status === 'provider_execution_failed'
        && twilioBlocked.body?.executed === false
        && twilioBlocked.body?.provider_call_made === false
        && /sms_consent_required/i.test(String(twilioBlocked.body?.receipt?.reason || ''))
        && Boolean(twilioBlocked.body?.receipt?.id),
      elapsedMs: twilioBlocked.elapsedMs,
      executed: Boolean(twilioBlocked.body?.executed),
      providerCallMade: Boolean(twilioBlocked.body?.provider_call_made),
      boundaryStatus: twilioBlocked.body?.status || null,
      receiptId: twilioBlocked.body?.receipt?.id || null,
      reason: twilioBlocked.body?.receipt?.reason || null
    });

    const deadLetters = await fetchAny('Automation platform exposes dead-letter board', `${BASE_URL}/api/kaixu-codestudio/platform/dead-letters?projectId=${encodeURIComponent(automationProjectId)}&limit=20`, { headers });
    receipt.checks.push({
      label: deadLetters.label,
      status: deadLetters.status,
      ok: deadLetters.ok && Array.isArray(deadLetters.body?.deadLetters),
      elapsedMs: deadLetters.elapsedMs,
      count: Array.isArray(deadLetters.body?.deadLetters) ? deadLetters.body.deadLetters.length : null
    });

    const deadLetterSeed = await fetchAny('Automation platform seeds a dead-letter for owner-approved retry', `${BASE_URL}/api/kaixu-codestudio/platform/dead-letters`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        id: `${automationProjectId}-synthetic`,
        projectId: automationProjectId,
        providerId: 'zero_os_executor',
        actionRoute: 'deadletter.retry',
        reason: 'Admin Brain native proof seeds retryable dead-letter for owner-approved execution.',
        input: {
          marker,
          ownerApproved: true,
          commandId
        }
      })
    });
    const deadLetterId = deadLetterSeed.body?.deadLetter?.id || `${automationProjectId}-synthetic`;
    receipt.checks.push({
      label: deadLetterSeed.label,
      status: deadLetterSeed.status,
      ok: deadLetterSeed.ok
        && deadLetterSeed.body?.deadLetter?.projectId === automationProjectId
        && deadLetterSeed.body?.deadLetter?.providerId === 'zero_os_executor'
        && Boolean(deadLetterSeed.body?.receipt?.id),
      elapsedMs: deadLetterSeed.elapsedMs,
      deadLetterId,
      receiptId: deadLetterSeed.body?.receipt?.id || null
    });

    const retry = await fetchAny('Automation platform retry endpoint queues a retry job with receipt', `${BASE_URL}/api/kaixu-codestudio/platform/dead-letters/${encodeURIComponent(deadLetterId)}/retry`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId: automationProjectId,
        providerId: 'zero_os_executor',
        actionRoute: 'deadletter.retry',
        reason: 'Admin Brain native proof verifies retry surface before owner-approved execution.',
        commandId,
        ownerApproved: true,
        input: {
          marker,
          ownerApproved: true
        }
      })
    });
    const retryJobId = retry.body?.job?.id || '';
    receipt.checks.push({
      label: retry.label,
      status: retry.status,
      ok: retry.status === 200
        && retry.body?.status === 'retry_queued'
        && retry.body?.executed === false
        && Boolean(retryJobId)
        && Boolean(retry.body?.receipt?.id),
      elapsedMs: retry.elapsedMs,
      executed: Boolean(retry.body?.executed),
      retryStatus: retry.body?.status || null,
      retryJobId,
      receiptId: retry.body?.receipt?.id || null,
      reason: retry.body?.receipt?.reason || null
    });

    const retryRun = await fetchAny('Automation platform runs retry job with executed:true and closes dead-letter', `${BASE_URL}/api/kaixu-codestudio/platform/jobs/${encodeURIComponent(retryJobId)}/run`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        projectId: automationProjectId,
        providerId: 'zero_os_executor',
        actionRoute: 'deadletter.retry',
        deadLetterId,
        ownerApproved: true,
        input: {
          marker,
          ownerApproved: true,
          deadLetterId
        }
      })
    });
    receipt.checks.push({
      label: retryRun.label,
      status: retryRun.status,
      ok: retryRun.status === 200
        && retryRun.body?.executed === true
        && retryRun.body?.internal_provider_execution === true
        && retryRun.body?.fixture === false
        && Boolean(retryRun.body?.receipt?.id),
      elapsedMs: retryRun.elapsedMs,
      executed: Boolean(retryRun.body?.executed),
      internalProviderExecution: Boolean(retryRun.body?.internal_provider_execution),
      fixture: Boolean(retryRun.body?.fixture),
      receiptId: retryRun.body?.receipt?.id || null
    });

    const platformReceipts = await fetchAny('Automation platform receipts read back executed job, Resend, Twilio boundary, and retry receipts', `${BASE_URL}/api/kaixu-codestudio/platform/receipts?projectId=${encodeURIComponent(automationProjectId)}&limit=80`, { headers });
    const automationReceipts = Array.isArray(platformReceipts.body?.receipts) ? platformReceipts.body.receipts : [];
    receipt.checks.push({
      label: platformReceipts.label,
      status: platformReceipts.status,
      ok: platformReceipts.ok
        && automationReceipts.some((item) => item.jobId === jobId)
        && automationReceipts.some((item) => item.providerId === 'resend' && item.executed === true && item.provider_call_made === ALLOW_LIVE_PROVIDER_CALLS)
        && automationReceipts.some((item) => item.path?.includes('/provider-packs/twilio/actions/sms.send/run'))
        && automationReceipts.some((item) => item.deadLetterId === deadLetterId && item.executed === true && Number(item.retryAttempt || 0) >= 1),
      elapsedMs: platformReceipts.elapsedMs,
      count: automationReceipts.length,
      jobReceiptReadBack: automationReceipts.some((item) => item.jobId === jobId),
      resendExecutionReceiptReadBack: automationReceipts.some((item) => item.providerId === 'resend' && item.executed === true && item.provider_call_made === ALLOW_LIVE_PROVIDER_CALLS),
      twilioBoundaryReceiptReadBack: automationReceipts.some((item) => item.path?.includes('/provider-packs/twilio/actions/sms.send/run')),
      retryExecutionReceiptReadBack: automationReceipts.some((item) => item.deadLetterId === deadLetterId && item.executed === true && Number(item.retryAttempt || 0) >= 1)
    });

    const redirects = await fetchAny('Admin automation page redirects anonymous browser request to shared gate', `${BASE_URL}/admin/automation-brain.html`, {
      headers: { accept: 'text/html' },
      redirect: 'manual'
    });
    receipt.checks.push({
      label: redirects.label,
      status: redirects.status,
      ok: redirects.status === 302 && String(redirects.location || '').includes('/admin/login.html'),
      elapsedMs: redirects.elapsedMs,
      location: redirects.location
    });

    const samples = [];
    for (let i = 0; i < 18; i += 1) {
      samples.push(await fetchAny(`Admin ledger stress ${i + 1}`, `${BASE_URL}/api/admin/ledger?limit=10`, { headers }));
    }
    const durations = samples.map((sample) => sample.elapsedMs).sort((a, b) => a - b);
    receipt.stress = {
      requests: samples.length,
      ok: samples.every((sample) => sample.status === 200 && sample.body?.ok === true && Array.isArray(sample.body?.ledger)),
      p95Ms: Number((durations[Math.max(0, Math.ceil(durations.length * 0.95) - 1)] || 0).toFixed(2)),
      maxMs: Number((Math.max(...durations) || 0).toFixed(2))
    };
  }

  receipt.failures = receipt.checks.filter((check) => !check.ok).map((check) => `${check.label}: ${check.status}`);
  if (!receipt.stress?.ok) receipt.failures.push('Admin ledger stress failed');
  receipt.ok = receipt.failures.length === 0;

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(LATEST, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ ok: receipt.ok, receipt: LATEST, checks: receipt.checks.length, stress: receipt.stress, failures: receipt.failures }, null, 2));
  if (!receipt.ok) process.exit(1);
}

main().catch(async (error) => {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const receipt = {
    ok: false,
    generatedAt: new Date().toISOString(),
    lane: 'admin-brain-native-live-http',
    error: error?.message || String(error),
    stack: error?.stack || ''
  };
  await fs.writeFile(LATEST, `${JSON.stringify(receipt, null, 2)}\n`);
  console.error(JSON.stringify({ ok: false, receipt: LATEST, error: receipt.error }, null, 2));
  process.exit(1);
});
