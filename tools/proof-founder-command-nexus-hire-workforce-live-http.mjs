import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { resolveZeroOsGateAuth } from './lib/zero-os-gate-auth.mjs';

const BASE_URL = process.env.FOUNDER_COMMAND_LIVE_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const OUT_DIR = path.resolve('test-artifacts/founder-command-nexus-hire-workforce');
const LATEST = path.join(OUT_DIR, 'founder-command-nexus-hire-workforce-live-http-latest.json');

async function fetchJson(url, init = {}) {
  const started = performance.now();
  const controller = new AbortController();
  const timeoutMs = Number(init.timeoutMs || 60000) || 60000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {...init, signal: controller.signal});
    clearTimeout(timer);
    const elapsedMs = performance.now() - started;
    const body = await response.json().catch(() => ({}));
    return {status: response.status, ok: response.ok && body.ok !== false, elapsedMs, body};
  } catch (error) {
    clearTimeout(timer);
    return {
      status: 0,
      ok: false,
      elapsedMs: performance.now() - started,
      body: {ok:false, error:error?.name === 'AbortError' ? 'request_timeout' : (error?.message || String(error))}
    };
  }
}

function percentile(sorted, pct) {
  return sorted[Math.max(0, Math.ceil(sorted.length * pct) - 1)] || 0;
}

function sharedGateHeaders(token, extra = {}) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
    'x-free99-gate-session': token,
    'x-skye-gate-session': token,
    ...extra
  };
}

async function main() {
  const stamp = new Date().toISOString().replace(/[^0-9A-Za-z]+/g, '-').replace(/-+$/g, '').toLowerCase();
  const idempotencyKey = `live-nexus-hire-workforce-${stamp}`;
  const candidateEmail = `live.nexus.hire.${stamp}@metraiyux.local`;
  const gateAuth = await resolveZeroOsGateAuth({ zeroOsBase: BASE_URL });
  const receipt = {
    ok: false,
    generatedAt: new Date().toISOString(),
    lane: 'founder-command-nexus-hire-workforce-live-http',
    baseUrl: BASE_URL,
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    credentialSource: gateAuth.credential?.key || gateAuth.credential?.source || 'missing',
    login: null,
    smoke: null,
    stress: null
  };
  receipt.login = {
    status: gateAuth.response?.status || 0,
    ok: Boolean(gateAuth.ok && gateAuth.token),
    tokenReceived: Boolean(gateAuth.token),
    via: gateAuth.response?.via || gateAuth.credential?.source || '',
    elapsedMs: Number(Number(gateAuth.response?.elapsedMs || 0).toFixed(2))
  };
  if (!gateAuth.token) {
    receipt.error = gateAuth.response?.body?.error || gateAuth.response?.error || 'Shared FS27/SkyGate helper did not return a bearer.';
    await fs.mkdir(OUT_DIR, {recursive: true});
    await fs.writeFile(LATEST, `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(JSON.stringify({ok: false, receipt: LATEST, error: receipt.error}, null, 2));
    process.exitCode = 1;
    return;
  }

  const token = gateAuth.token;
  if (!token) {
    receipt.error = 'Shared FS27/SkyGate helper did not return a bearer.';
  } else {
    const headers = sharedGateHeaders(token);
    const jsonHeaders = {...headers, 'content-type': 'application/json'};
    const catalog = await fetchJson(`${BASE_URL}/api/founder-command/actions/catalog`, {headers});
    const action = (catalog.body?.actions || []).find((row) => row.id === 'nexus.proof.ad-hire-enrollment-claim') || null;
    const plan = await fetchJson(`${BASE_URL}/api/founder-command/actions/plan`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        action_id: 'nexus.proof.ad-hire-enrollment-claim',
        idempotency_key: idempotencyKey,
        params: {
          candidate_name: 'Live Nexus Hire Proof AE',
          candidate_email: candidateEmail,
          campaign_id: `live_nexus_hire_${stamp}`,
          job_title: 'Live Nexus hire workforce test job'
        }
      })
    });
    const execute = await fetchJson(`${BASE_URL}/api/founder-command/actions/execute`, {
      method: 'POST',
      headers: jsonHeaders,
      timeoutMs: 120000,
      body: JSON.stringify({
        action_id: 'nexus.proof.ad-hire-enrollment-claim',
        confirm: true,
        idempotency_key: idempotencyKey,
        params: {
          candidate_name: 'Live Nexus Hire Proof AE',
          candidate_email: candidateEmail,
          candidate_phone: '+15550100333',
          campaign_id: `live_nexus_hire_${stamp}`,
          campaign_business: 'Skyes Over London LC Hiring Desk',
          ad_slot: 'discover_chart_rail',
          job_title: 'Live Nexus hire workforce test job',
          job_description: 'No-payout production HTTP proof job for Founder Command operational chain.',
          notes: 'Live HTTP proof of ad hire to Workforce enrollment and test job claim.'
        }
      })
    });
    const proof = execute.body?.result?.proof || execute.body?.proof || {};
    const job = execute.body?.result?.job || proof.job || {};
    const hire = execute.body?.result?.hire || proof.hire || {};
    const workforce = execute.body?.result?.workforce || proof.workforce || {};
    const ad = execute.body?.result?.ad || proof.ad || {};
    const routexUserId = workforce.routex_user_id || '';
    const jobId = job.routex_job_id || '';
    const assignmentId = job.assignment_id || '';
    const aeFlowContacts = await fetchJson(`${BASE_URL}/api/founder-command/ae-flow/contacts?limit=100&detail=1`, {headers, timeoutMs: 60000});
    const routexUsers = await fetchJson(`${BASE_URL}/api/routex/admin/users`, {headers, timeoutMs: 60000});
    const routexJob = jobId ? await fetchJson(`${BASE_URL}/api/routex/jobs/${encodeURIComponent(jobId)}`, {headers, timeoutMs: 60000}) : {status:0, ok:false, body:{}};
    const routexAssignments = await fetchJson(`${BASE_URL}/api/routex/assignments`, {headers, timeoutMs: 60000});
    const routexAePool = await fetchJson(`${BASE_URL}/api/routex/ae/pool`, {headers, timeoutMs: 60000});
    const aeFlowContactRows = Array.isArray(aeFlowContacts.body?.contacts) ? aeFlowContacts.body.contacts : [];
    const routexUserRows = Array.isArray(routexUsers.body?.users) ? routexUsers.body.users : [];
    const assignmentRows = Array.isArray(routexAssignments.body?.assignments) ? routexAssignments.body.assignments : [];
    const aeProfileRows = Array.isArray(routexAePool.body?.profiles) ? routexAePool.body.profiles : [];
    const aeFlowCandidate = aeFlowContactRows.find((row) => String(row.email || '').toLowerCase() === candidateEmail);
    const routexCandidate = routexUserRows.find((row) => row.id === routexUserId || String(row.email || '').toLowerCase() === candidateEmail);
    const assignmentReadback = assignmentRows.find((row) => row.id === assignmentId || row.assignment?.id === assignmentId);
    const aePoolReadback = aeProfileRows.find((row) => row.user_id === routexUserId || row.user?.id === routexUserId || String(row.user?.email || row.email || '').toLowerCase() === candidateEmail);
    receipt.smoke = {
      catalogStatus: catalog.status,
      actionPresent: Boolean(action),
      actionHighRisk: action?.risk === 'high',
      actionIdempotencyRequired: Boolean(action?.idempotency_required),
      planStatus: plan.status,
      planRequiresApproval: Boolean(plan.body?.approval?.required),
      planIdempotencyRequired: Boolean(plan.body?.idempotency?.required),
      executeStatus: execute.status,
      proofStatus: proof.status || '',
      campaignId: ad.campaign_id || '',
      placementId: ad.placement_id || '',
      clickEventId: ad.click_event_id || '',
      candidateEmail: hire.candidate_email || '',
      aeFlowStored: Boolean(hire.ae_flow_stored),
      routexUserId: workforce.routex_user_id || '',
      routexRole: workforce.routex_role || '',
      contractorProfileReady: Boolean(workforce.contractor_profile_ready),
      jobId: job.routex_job_id || '',
      jobSystemTest: Boolean(job.system_job),
      assignmentId: job.assignment_id || '',
      assignmentStatus: job.assignment_status || '',
      assignmentPaymentStatus: job.assignment_payment_status || '',
      blockedSecondClaimStatus: job.blocked_second_claim_status || 0,
      readback: {
        aeFlowContactsStatus: aeFlowContacts.status,
        aeFlowCandidateFound: Boolean(aeFlowCandidate),
        aeFlowCandidateStatus: aeFlowCandidate?.status || '',
        routexUsersStatus: routexUsers.status,
        routexCandidateFound: Boolean(routexCandidate),
        routexCandidateRole: routexCandidate?.role || '',
        routexJobStatus: routexJob.status,
        routexJobFound: routexJob.body?.job?.id === jobId,
        routexAssignmentsStatus: routexAssignments.status,
        routexAssignmentFound: Boolean(assignmentReadback),
        routexAssignmentStatus: assignmentReadback?.status || assignmentReadback?.assignment?.status || '',
        routexAePoolStatus: routexAePool.status,
        routexAePoolCandidateFound: Boolean(aePoolReadback)
      }
    };

    const samples = [];
    const stressRoutes = [
      '/api/founder-command/actions/catalog',
      '/api/founder-command/ae-flow/status'
    ];
    for (let i = 0; i < 10; i += 1) {
      const route = stressRoutes[i % stressRoutes.length];
      samples.push(await fetchJson(`${BASE_URL}${route}`, {headers, timeoutMs: 30000}));
    }
    const durations = samples.map((item) => item.elapsedMs).sort((a, b) => a - b);
    receipt.stress = {
      requests: samples.length,
      ok: samples.every((item) => item.status === 200 && item.body?.ok),
      p95Ms: Number(percentile(durations, 0.95).toFixed(2)),
      maxMs: Number(Math.max(...durations).toFixed(2))
    };
  }

  receipt.ok = Boolean(
    receipt.login?.ok
    && receipt.smoke?.catalogStatus === 200
    && receipt.smoke?.actionPresent
    && receipt.smoke?.actionHighRisk
    && receipt.smoke?.actionIdempotencyRequired
    && receipt.smoke?.planRequiresApproval
    && receipt.smoke?.planIdempotencyRequired
    && receipt.smoke?.executeStatus === 201
    && receipt.smoke?.proofStatus === 'ad_clicked_hired_enrolled_test_job_claimed'
    && receipt.smoke?.candidateEmail === candidateEmail
    && receipt.smoke?.aeFlowStored
    && receipt.smoke?.routexRole === 'ae'
    && receipt.smoke?.contractorProfileReady
    && receipt.smoke?.jobSystemTest
    && receipt.smoke?.assignmentStatus === 'contractor_confirmed'
    && receipt.smoke?.assignmentPaymentStatus === 'founder_operational_test_no_external_payout'
    && [400, 409].includes(receipt.smoke?.blockedSecondClaimStatus)
    && receipt.smoke?.readback?.aeFlowCandidateFound
    && receipt.smoke?.readback?.routexCandidateFound
    && receipt.smoke?.readback?.routexCandidateRole === 'ae'
    && receipt.smoke?.readback?.routexJobFound
    && receipt.smoke?.readback?.routexAssignmentFound
    && receipt.smoke?.readback?.routexAssignmentStatus === 'contractor_confirmed'
    && receipt.smoke?.readback?.routexAePoolCandidateFound
    && receipt.stress?.ok
  );
  await fs.mkdir(OUT_DIR, {recursive: true});
  await fs.writeFile(LATEST, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ok: receipt.ok, receipt: LATEST, smoke: receipt.smoke, stress: receipt.stress}, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
