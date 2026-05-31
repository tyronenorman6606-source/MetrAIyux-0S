#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const repoRoot = process.cwd();
const BASE_URL = String(process.env.ZERO_OS_LIVE_BASE || process.env.LLC_TO_0S_LIVE_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const OUT_DIR = path.join(repoRoot, 'test-artifacts', 'llc-to-0s-business-workflow');
const LATEST = path.join(OUT_DIR, 'llc-to-0s-business-workflow-live-http-latest.json');
async function liveCredential() {
  const auth = await resolveZeroOsGateAuth({ zeroOsBase: BASE_URL });
  return { key: auth.credential?.key || 'shared-fs27-gate', value: auth.token || '' };
}

async function fetchAny(label, url, init = {}) {
  const started = performance.now();
  const controller = new AbortController();
  const timeoutMs = Number(init.timeoutMs || 25000) || 25000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    clearTimeout(timer);
    return {
      label,
      url,
      method: init.method || 'GET',
      status: 0,
      ok: false,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      location: null,
      body: { ok: false, error: error?.name === 'AbortError' ? 'request_timeout' : (error?.message || String(error)) }
    };
  }
  clearTimeout(timer);
  const elapsedMs = Number((performance.now() - started).toFixed(2));
  const text = await response.text().catch(() => '');
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { text: text.slice(0, 2000) };
  }
  return {
    label,
    url,
    method: init.method || 'GET',
    status: response.status,
    ok: response.ok && body?.ok !== false,
    elapsedMs,
    location: response.headers.get('location') || null,
    body
  };
}

function authHeaders(token, extra = {}) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    ...extra
  };
}

function compact(call, extra = {}) {
  return {
    label: call.label,
    status: call.status,
    ok: Boolean(call.ok),
    elapsedMs: call.elapsedMs,
    error: call.body?.error || '',
    ...extra
  };
}

function check(label, ok, details = {}) {
  return { label, ...details, ok: Boolean(ok) };
}

function hasAction(actions = [], id) {
  return actions.some((action) => action.id === id);
}

function percentile(sorted, pct) {
  return sorted[Math.max(0, Math.ceil(sorted.length * pct) - 1)] || 0;
}

async function writeReceipt(receipt) {
  const stamp = receipt.generatedAt.replace(/[:.]/g, '-');
  const stamped = path.join(OUT_DIR, stamp, 'receipt.json');
  await fs.mkdir(path.dirname(stamped), { recursive: true });
  await fs.writeFile(stamped, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(LATEST, `${JSON.stringify({ ...receipt, stampedReceipt: path.relative(repoRoot, stamped) }, null, 2)}\n`);
  return { stamped, latest: LATEST };
}

async function main() {
  const generatedAt = new Date().toISOString();
  const stamp = generatedAt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const clientId = `llc-proof-${stamp}`.slice(0, 80);
  const businessName = `LLC to 0S Proof ${stamp}`;
  const ownerEmail = `${clientId}@metraiyux.local`;
  const receipt = {
    ok: false,
    generatedAt,
    lane: 'llc-to-0s-business-workflow-live-http',
    baseUrl: BASE_URL,
    noBrowserProofRun: true,
    ownerManualBrowserVerification: true,
    credentialSource: '',
    workflowId: '',
    clientId,
    caseId: '',
    packetId: '',
    reviewId: '',
    routexJobId: '',
    skynetProjectId: '',
    links: {},
    calls: {},
    checks: [],
    stress: null,
    failures: [],
    boundaries: [
      'This proof uses the shared FS27/SkyGate/Free99 owner session headers and does not create an app-local LLC/admin password.',
      'SovereignDocs prepares the LLC packet, dashboard state, review request, vault record, and workflow receipts; it does not provide legal advice.',
      'State filing, EIN, attorney review, contractor completion, payout release, bank setup, and SkyeNet production publish require separate external/provider receipts.',
      'Browser verification is owner-handled by repo policy; this proof uses live HTTP/API checks only.'
    ]
  };

  const credential = await liveCredential();
  receipt.credentialSource = credential.key || 'missing';
  if (!credential.value) {
    receipt.failures.push('No owner credential found in process env, .env, or env.txt.');
    const paths = await writeReceipt(receipt);
    console.log(JSON.stringify({ ok: false, receipt: path.relative(repoRoot, paths.latest), failures: receipt.failures }, null, 2));
    process.exitCode = 1;
    return;
  }

  const login = await fetchAny('Founder Command login issues shared gate token', `${BASE_URL}/api/owner/admin-login`, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ code: credential.value })
  });
  const token = login.body?.gateBearerToken || login.body?.gateToken || login.body?.token || '';
  receipt.calls.login = compact(login, { tokenReceived: Boolean(token) });
  receipt.checks.push(check(login.label, login.ok && Boolean(token), receipt.calls.login));

  if (token) {
    const h = authHeaders(token);
    const jsonH = authHeaders(token, { 'content-type': 'application/json' });

    const unauthStatic = await fetchAny('SovereignDocs business formation page redirects anonymous traffic to shared gate', `${BASE_URL}/Free99/apps/sovereigndocs/business-formation/`, {
      headers: { accept: 'text/html' },
      redirect: 'manual'
    });
    receipt.checks.push(check(unauthStatic.label, [302, 303, 307, 308].includes(unauthStatic.status) && String(unauthStatic.location || '').includes('/admin/login.html'), compact(unauthStatic, { location: unauthStatic.location })));

    const manifest = await fetchAny('SovereignDocs manifest exposes LLC-to-0S workflow routes', `${BASE_URL}/api/sovereigndocs/routes/manifest`, { headers: h });
    const manifestRoutes = (manifest.body?.modules || []).flatMap((module) => module.routes || []);
    receipt.checks.push(check(manifest.label, manifest.ok
      && manifestRoutes.includes('POST /business-formation/start-to-0s')
      && manifestRoutes.includes('POST /business-formation/workflows/:id/approve')
      && manifestRoutes.includes('POST /business-formation/workflows/:id/skyenet-receipt'), compact(manifest, { routeCount: manifestRoutes.length })));

    const states = await fetchAny('SovereignDocs state profile list includes Arizona and nationwide LLC routing labels', `${BASE_URL}/api/sovereigndocs/business-formation/states`, { headers: h });
    const stateRows = Array.isArray(states.body?.states) ? states.body.states : [];
    receipt.checks.push(check(states.label, states.ok && stateRows.length >= 51 && stateRows.some((state) => state.code === 'AZ' && state.officialUrl), compact(states, { count: stateRows.length, az: stateRows.find((state) => state.code === 'AZ') || null })));

    const payload = {
      businessName,
      clientId,
      ownerName: 'LLC to 0S Proof Owner',
      ownerEmail,
      state: 'AZ',
      city: 'Phoenix',
      industry: 'local services and digital operations',
      services: 'CRM setup, customer intake, document workflow, contractor coordination, business webpage, and SkyeNet publish readiness.',
      memberCount: 1,
      operatingModel: 'owner-managed',
      acceptBoundary: true
    };
    const start = await fetchAny('Start LLC-to-0S workflow creates docs, review, workforce, app factory, and SkyeNet intent', `${BASE_URL}/api/sovereigndocs/business-formation/start-to-0s`, {
      method: 'POST',
      headers: jsonH,
      body: JSON.stringify(payload),
      timeoutMs: 45000
    });
    const workflow = start.body?.workflow || {};
    receipt.workflowId = workflow.id || '';
    receipt.caseId = start.body?.case?.id || workflow.caseId || '';
    receipt.packetId = start.body?.packet?.id || workflow.packetId || '';
    receipt.reviewId = start.body?.legalReview?.id || workflow.legalReviewId || '';
    receipt.routexJobId = workflow.routexJobId || start.body?.workforce?.job?.id || '';
    receipt.skynetProjectId = workflow.skynetIntent?.projectId || '';
    receipt.links = {
      businessFormation: `${BASE_URL}/Free99/apps/sovereigndocs/business-formation/?workflow=${encodeURIComponent(receipt.workflowId)}`,
      sovereignDocsCustomerDashboard: `${BASE_URL}/Free99/apps/sovereigndocs/customer-dashboard/`,
      zeroOsCustomerDashboard: `${BASE_URL}/saas/customer-dashboard.html?workflow=${encodeURIComponent(receipt.workflowId)}`,
      workflowApi: `${BASE_URL}/api/sovereigndocs/business-formation/workflows/${encodeURIComponent(receipt.workflowId)}`,
      clientDashboardApi: `${BASE_URL}/api/sovereigndocs/business-formation/workflows/${encodeURIComponent(receipt.workflowId)}/client-dashboard`,
      routexJob: receipt.routexJobId ? `${BASE_URL}/api/routex/jobs/${encodeURIComponent(receipt.routexJobId)}` : '',
      generatedWebpage: `${BASE_URL}/client-app-factory/generated/${encodeURIComponent(clientId)}/`,
      skynetIntentHost: workflow.skynetIntent?.targetHost || ''
    };
    receipt.checks.push(check(start.label, start.status === 201
      && workflow.type === 'llc_to_0s_business_launch'
      && start.body?.case?.caseType === 'llc_to_0s_business_launch'
      && Array.isArray(start.body?.documents)
      && start.body.documents.length >= 5
      && Boolean(start.body?.legalReview?.id)
      && Boolean(start.body?.payment?.checkoutUrl)
      && Boolean(start.body?.vaultRecord?.id)
      && start.body?.clientApp?.ok === true
      && start.body?.workforce?.ok === true
      && workflow.skynetIntent?.status === 'intent_recorded_owner_deploy_required', compact(start, {
      workflowId: receipt.workflowId,
      caseId: receipt.caseId,
      packetId: receipt.packetId,
      documentCount: start.body?.documents?.length || 0,
      reviewId: receipt.reviewId,
      routexJobId: receipt.routexJobId,
      clientAppOk: Boolean(start.body?.clientApp?.ok),
      workforceOk: Boolean(start.body?.workforce?.ok),
      skynetIntent: workflow.skynetIntent || null
    })));

    if (receipt.workflowId) {
      const workflowRead = await fetchAny('Workflow readback returns packet, docs, payment, review, and timeline', receipt.links.workflowApi, { headers: h });
      receipt.checks.push(check(workflowRead.label, workflowRead.ok
        && workflowRead.body?.workflow?.id === receipt.workflowId
        && workflowRead.body?.packet?.id === receipt.packetId
        && workflowRead.body?.legalReview?.id === receipt.reviewId
        && Array.isArray(workflowRead.body?.documents)
        && workflowRead.body.documents.length >= 5, compact(workflowRead, {
        documentCount: workflowRead.body?.documents?.length || 0,
        timelineCount: workflowRead.body?.timeline?.length || 0
      })));

      const clientDashboard = await fetchAny('Client dashboard exposes packet, checkout, workforce, webpage, and SkyeNet next actions', receipt.links.clientDashboardApi, { headers: h });
      const actions = clientDashboard.body?.nextActions || [];
      receipt.checks.push(check(clientDashboard.label, clientDashboard.ok
        && clientDashboard.body?.workflowId === receipt.workflowId
        && hasAction(actions, 'review_packet')
        && hasAction(actions, 'legal_review_checkout')
        && hasAction(actions, 'workforce_support')
        && hasAction(actions, 'business_webpage')
        && hasAction(actions, 'skyenet_publish'), compact(clientDashboard, {
        actionIds: actions.map((action) => action.id),
        status: clientDashboard.body?.status || ''
      })));

      const dashboard = await fetchAny('Workspace dashboard lists the LLC workflow as pending/actionable', `${BASE_URL}/api/sovereigndocs/v18/workspace/dashboard`, { headers: h });
      const dashboardWorkflows = dashboard.body?.panels?.businessFormationWorkflows || [];
      receipt.checks.push(check(dashboard.label, dashboard.ok
        && dashboard.body?.counts?.businessFormationWorkflows >= 1
        && dashboardWorkflows.some((item) => item.id === receipt.workflowId), compact(dashboard, {
        businessFormationCount: dashboard.body?.counts?.businessFormationWorkflows || 0,
        workflowReadBack: dashboardWorkflows.some((item) => item.id === receipt.workflowId)
      })));

      const queues = await fetchAny('Work queues expose LLC workflow for contractor/operator pickup', `${BASE_URL}/api/sovereigndocs/work-queues`, { headers: h });
      const formationQueue = queues.body?.queues?.businessFormation || {};
      receipt.checks.push(check(queues.label, queues.ok
        && formationQueue.count >= 1
        && (formationQueue.items || []).some((item) => item.id === receipt.workflowId), compact(queues, {
        businessFormationQueueCount: formationQueue.count || 0,
        queueReadBack: (formationQueue.items || []).some((item) => item.id === receipt.workflowId)
      })));

      const approval = await fetchAny('Owner/admin approval updates the actual SovereignDocs workflow', `${BASE_URL}/api/sovereigndocs/business-formation/workflows/${encodeURIComponent(receipt.workflowId)}/approve`, {
        method: 'POST',
        headers: jsonH,
        body: JSON.stringify({ note: `Approved by LLC-to-0S live HTTP proof for ${stamp}.` })
      });
      receipt.checks.push(check(approval.label, approval.ok
        && approval.body?.workflow?.id === receipt.workflowId
        && approval.body?.workflow?.status === 'owner_approved_for_filing_prep', compact(approval, {
        status: approval.body?.workflow?.status || ''
      })));

      const officialReceiptGuard = await fetchAny('Official filing receipt lane refuses empty/non-proof attachments', `${BASE_URL}/api/sovereigndocs/business-formation/workflows/${encodeURIComponent(receipt.workflowId)}/official-receipt`, {
        method: 'POST',
        headers: jsonH,
        body: JSON.stringify({})
      });
      receipt.checks.push(check(officialReceiptGuard.label, officialReceiptGuard.status === 400 && officialReceiptGuard.body?.error === 'official_receipt_reference_or_content_required', compact(officialReceiptGuard)));

      const skynetReceiptGuard = await fetchAny('SkyeNet receipt lane refuses empty publish claims', `${BASE_URL}/api/sovereigndocs/business-formation/workflows/${encodeURIComponent(receipt.workflowId)}/skyenet-receipt`, {
        method: 'POST',
        headers: jsonH,
        body: JSON.stringify({})
      });
      receipt.checks.push(check(skynetReceiptGuard.label, skynetReceiptGuard.status === 400 && skynetReceiptGuard.body?.error === 'skyenet_receipt_reference_required', compact(skynetReceiptGuard)));

      const commandBridge = await fetchAny('Command Bridge records docs, workforce, app factory, owner, and SkyeNet events for this workflow', `${BASE_URL}/api/0s-command-bridge/events?entity=${encodeURIComponent(receipt.workflowId)}&limit=50`, { headers: h, timeoutMs: 60000 });
      const workflowEvents = commandBridge.body?.events || [];
      const eventTypes = workflowEvents.map((event) => event.event_type);
      receipt.checks.push(check(commandBridge.label, commandBridge.ok
        && eventTypes.includes('llc.workflow.created')
        && eventTypes.includes('llc.workforce.job_created')
        && eventTypes.includes('llc.client_app.created')
        && eventTypes.includes('llc.skyenet.intent_recorded')
        && eventTypes.includes('llc.owner_dashboard.pending'), compact(commandBridge, {
        eventTypes,
        count: workflowEvents.length
      })));
    }

    if (receipt.routexJobId) {
      const routexJob = await fetchAny('RouteX workforce job lands with legal review and payout boundaries', `${BASE_URL}/api/routex/jobs/${encodeURIComponent(receipt.routexJobId)}`, { headers: h });
      const job = routexJob.body?.job || {};
      receipt.checks.push(check(routexJob.label, routexJob.ok
        && job.category === 'llc_formation_packet_review'
        && job.source_workflow === 'llc_to_0s_business_launch'
        && job.legal_certification_required === true
        && job.external_filing_status === 'not_filed_no_official_receipt'
        && job.payout_status === 'owner_review_required_before_release', compact(routexJob, {
        jobId: job.id || '',
        category: job.category || '',
        sourceWorkflow: job.source_workflow || '',
        externalFilingStatus: job.external_filing_status || '',
        payoutStatus: job.payout_status || ''
      })));
    }

    const factoryCore = await fetchAny('Client App Factory generates webpage deployment target for the LLC clientId', `${BASE_URL}/api/client-app-factory/factory/core`, {
      method: 'POST',
      headers: jsonH,
      body: JSON.stringify({ clientId }),
      timeoutMs: 45000
    });
    receipt.checks.push(check(factoryCore.label, factoryCore.ok
      && factoryCore.body?.record?.clientId === clientId
      && Array.isArray(factoryCore.body?.record?.generatedApps)
      && factoryCore.body.record.generatedApps.length >= 1
      && Array.isArray(factoryCore.body?.record?.deploymentTargets)
      && factoryCore.body.record.deploymentTargets.length >= 1, compact(factoryCore, {
      generatedApps: factoryCore.body?.record?.generatedApps?.length || 0,
      deploymentTargets: factoryCore.body?.record?.deploymentTargets?.length || 0,
      runtimeAppBase: factoryCore.body?.record?.runtimeAppBase || ''
    })));

    const factoryVerify = await fetchAny('Client App Factory verification report names readiness issues honestly', `${BASE_URL}/api/client-app-factory/factory/verify`, {
      method: 'POST',
      headers: jsonH,
      body: JSON.stringify({ clientId })
    });
    receipt.checks.push(check(factoryVerify.label, factoryVerify.ok
      && factoryVerify.body?.record?.clientId === clientId
      && Array.isArray(factoryVerify.body?.report?.issues), compact(factoryVerify, {
      issueCount: factoryVerify.body?.report?.issueCount ?? null,
      issues: factoryVerify.body?.report?.issues || []
    })));

    const factoryRecord = await fetchAny('Client App Factory record reads back by clientId', `${BASE_URL}/api/client-app-factory/factory/records/${encodeURIComponent(clientId)}`, { headers: h });
    receipt.checks.push(check(factoryRecord.label, factoryRecord.ok
      && factoryRecord.body?.record?.clientId === clientId
      && Array.isArray(factoryRecord.body?.record?.generatedApps)
      && factoryRecord.body.record.generatedApps.length >= 1, compact(factoryRecord, {
      status: factoryRecord.body?.record?.status || '',
      generatedApps: factoryRecord.body?.record?.generatedApps?.length || 0
    })));

    const factoryReport = await fetchAny('Client App Factory verification JSON is saved for the LLC webpage', `${BASE_URL}/api/client-app-factory/factory/reports/${encodeURIComponent(clientId)}/verification.json`, { headers: h });
    receipt.checks.push(check(factoryReport.label, factoryReport.status === 200
      && factoryReport.body?.clientId === clientId
      && Array.isArray(factoryReport.body?.issues), compact(factoryReport, {
      okReport: Boolean(factoryReport.body?.ok),
      issueCount: factoryReport.body?.issueCount ?? null,
      issues: factoryReport.body?.issues || []
    })));

    const generatedPage = await fetchAny('Generated company webpage route renders through Client App Factory', `${BASE_URL}/client-app-factory/generated/${encodeURIComponent(clientId)}/index.html`, {
      headers: { ...h, accept: 'text/html' }
    });
    receipt.checks.push(check(generatedPage.label, generatedPage.status === 200 && typeof generatedPage.body?.text === 'string' && generatedPage.body.text.length > 200, compact(generatedPage, {
      textBytes: generatedPage.body?.text?.length || 0
    })));

    const skynetStatus = await fetchAny('SkyeNet platform API is reachable for later owner-approved publish closeout', `${BASE_URL}/api/skyenet/status`, { headers: h });
    receipt.checks.push(check(skynetStatus.label, skynetStatus.ok && skynetStatus.body?.ok === true, compact(skynetStatus, {
      mode: skynetStatus.body?.mode || skynetStatus.body?.service || ''
    })));

    const samples = [];
    if (receipt.workflowId) {
      const urls = [
        receipt.links.workflowApi,
        receipt.links.clientDashboardApi,
        `${BASE_URL}/api/sovereigndocs/v18/workspace/dashboard`,
        `${BASE_URL}/api/sovereigndocs/work-queues`
      ];
      for (let i = 0; i < 12; i += 1) {
        samples.push(await fetchAny(`LLC workflow stress ${i + 1}`, urls[i % urls.length], { headers: h }));
      }
    }
    const durations = samples.map((sample) => sample.elapsedMs).sort((a, b) => a - b);
    receipt.stress = {
      requests: samples.length,
      ok: samples.length > 0 && samples.every((sample) => sample.status === 200 && sample.body?.ok !== false),
      p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
      maxMs: Number((Math.max(...durations, 0)).toFixed(2))
    };
  }

  receipt.failures = receipt.checks.filter((item) => !item.ok).map((item) => `${item.label}: ${item.status ?? 'failed'}`);
  if (!receipt.stress?.ok) receipt.failures.push('LLC workflow stress failed');
  receipt.ok = receipt.failures.length === 0;

  const paths = await writeReceipt(receipt);
  console.log(JSON.stringify({
    ok: receipt.ok,
    receipt: path.relative(repoRoot, paths.latest),
    workflowId: receipt.workflowId,
    clientId: receipt.clientId,
    routexJobId: receipt.routexJobId,
    checks: receipt.checks.length,
    stress: receipt.stress,
    failures: receipt.failures
  }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch(async (error) => {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const receipt = {
    ok: false,
    generatedAt: new Date().toISOString(),
    lane: 'llc-to-0s-business-workflow-live-http',
    error: error?.message || String(error),
    stack: error?.stack || ''
  };
  await fs.writeFile(LATEST, `${JSON.stringify(receipt, null, 2)}\n`);
  console.error(JSON.stringify({ ok: false, receipt: path.relative(repoRoot, LATEST), error: receipt.error }, null, 2));
  process.exitCode = 1;
});
