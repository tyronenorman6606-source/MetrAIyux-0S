import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { smokeEnv } from './smoke-env.mjs';

const root = process.cwd();
const proofDir = path.join(root, 'proof');
fs.mkdirSync(proofDir, { recursive: true });

const startedAt = new Date().toISOString();
const runId = Date.now().toString(36);
const port = Number(process.env.STRESS_PORT || 5899);
const baseUrl = `http://127.0.0.1:${port}`;
const dbPath = path.join(root, 'data', `stress-concurrency-${runId}.json`);
const providerCount = Number(process.env.STRESS_PROVIDERS || 8);
const contractorCount = Number(process.env.STRESS_CONTRACTORS || 48);
const jobCount = Number(process.env.STRESS_JOBS || 24);
const applicantsPerJob = Number(process.env.STRESS_APPLICANTS_PER_JOB || 4);
const requestTimeoutMs = Number(process.env.STRESS_REQUEST_TIMEOUT_MS || 20000);

const env = smokeEnv({
  PORT: String(port),
  DATABASE_PATH: dbPath,
  SKYE_ADMIN_EMAIL: `admin-stress-${runId}@internal.invalid`,
  SKYE_ADMIN_PASSWORD: 'AdminStress123!'
});

let logs = '';
const server = spawn('node', ['src/server.js'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
server.stdout.on('data', chunk => { logs += chunk.toString(); });
server.stderr.on('data', chunk => { logs += chunk.toString(); });

const metrics = [];
const checks = [];
const pass = (name, data = {}) => checks.push({ status: 'PASS', name, data });

function assert(condition, message, data) {
  if (!condition) {
    const error = new Error(message);
    error.data = data;
    throw error;
  }
}

function percentile(values, pct) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length))];
}

function metricSummary() {
  const durations = metrics.map(item => item.ms);
  const statusCounts = {};
  for (const item of metrics) statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
  return {
    requests: metrics.length,
    status_counts: statusCounts,
    min_ms: Math.min(...durations),
    max_ms: Math.max(...durations),
    avg_ms: Number((durations.reduce((sum, ms) => sum + ms, 0) / durations.length).toFixed(2)),
    p50_ms: percentile(durations, 50),
    p95_ms: percentile(durations, 95),
    p99_ms: percentile(durations, 99)
  };
}

async function req(method, url, body, session, expected = 200) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  const started = Date.now();
  try {
    const headers = { 'content-type': 'application/json', connection: 'close' };
    if (session) headers['x-skye-session'] = session;
    const res = await fetch(`${baseUrl}${url}`, {
      method,
      headers,
      body: body === undefined || body === null ? undefined : JSON.stringify(body),
      signal: controller.signal
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
    const ms = Date.now() - started;
    metrics.push({ method, url, status: res.status, ms });
    const expectedStatuses = Array.isArray(expected) ? expected : [expected];
    if (!expectedStatuses.includes(res.status)) {
      throw Object.assign(new Error(`${method} ${url} returned ${res.status}, expected ${expectedStatuses.join('/')}`), { data: { status: res.status, json } });
    }
    return { status: res.status, json, ms };
  } finally {
    clearTimeout(timer);
  }
}

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('server did not become ready');
}

async function login(email, password) {
  const response = await req('POST', '/api/auth/login', { email, password });
  return response.json.session;
}

function contractorForIndex(contractors, index) {
  return contractors[index % contractors.length];
}

async function main() {
  await waitForServer();
  const health = await req('GET', '/api/health');
  assert(health.json.ok && health.json.version === '0.4.0', 'health/version failed', health);
  pass('server_booted', { version: health.json.version, port });

  const admin = await login(env.SKYE_ADMIN_EMAIL, env.SKYE_ADMIN_PASSWORD);
  const market = await req('POST', '/api/markets', { city: 'Phoenix', state: 'Arizona', status: 'open' }, admin, 201);
  const marketId = market.json.market.id;
  pass('admin_market_seeded', { marketId });

  const providers = await Promise.all(Array.from({ length: providerCount }, async (_, i) => {
    const email = `provider-stress-${runId}-${i}@example.test`;
    const password = 'ProviderStress123!';
    const signup = await req('POST', '/api/auth/signup', {
      email,
      password,
      name: `Stress Provider ${i}`,
      role: 'provider',
      city: 'Phoenix',
      state: 'Arizona',
      company_name: `Stress Provider ${i} LLC`
    }, null, 201);
    const session = await login(email, password);
    return { id: signup.json.id, email, session };
  }));
  pass('providers_created_concurrently', { providerCount: providers.length });

  const contractors = await Promise.all(Array.from({ length: contractorCount }, async (_, i) => {
    const email = `contractor-stress-${runId}-${i}@example.test`;
    const password = 'ContractorStress123!';
    const signup = await req('POST', '/api/auth/signup', {
      email,
      password,
      name: `Stress Contractor ${i}`,
      role: 'contractor',
      city: 'Phoenix',
      state: 'Arizona',
      skills: ['route', 'field_route', 'delivery', i % 2 ? 'warehouse' : 'event']
    }, null, 201);
    const session = await login(email, password);
    return { id: signup.json.id, email, session };
  }));
  pass('contractors_created_concurrently', { contractorCount: contractors.length });

  const jobs = await Promise.all(Array.from({ length: jobCount }, async (_, i) => {
    const provider = providers[i % providers.length];
    const slots = i % 3 === 0 ? 2 : 1;
    const response = await req('POST', '/api/jobs', {
      market_id: marketId,
      title: `Stress route lane ${i}`,
      category: i % 2 ? 'delivery' : 'route',
      description: 'Concurrency stress route with proof, payments, route stops, export packet, and audit checks.',
      location: `Phoenix stress yard ${i}`,
      starts_at: '2026-05-21T12:00:00.000Z',
      pay_type: 'fixed',
      pay_amount_cents: 12000 + i,
      slots,
      acceptance_mode: slots === 1 ? 'single' : 'multi',
      proof_required: true,
      route_required: true,
      route_mode: 'field_route',
      vehicle_type: 'car_or_van',
      arrival_window: '30 minutes before start',
      pickup_location: `Phoenix pickup ${i}`,
      dropoff_location: `Phoenix dropoff ${i}`,
      route_stops: [
        { label: 'Pickup', address: `Pickup ${i}`, proof_required: true },
        { label: 'Dropoff', address: `Dropoff ${i}`, proof_required: true }
      ]
    }, provider.session, 201);
    return { ...response.json.job, provider_session: provider.session, expected_accepts: slots };
  }));
  pass('jobs_created_concurrently', { jobCount: jobs.length });

  const applicationMatrix = await Promise.all(jobs.map(async (job, jobIndex) => {
    const applicants = Array.from({ length: applicantsPerJob }, (_, i) => contractorForIndex(contractors, jobIndex * applicantsPerJob + i));
    const applications = await Promise.all(applicants.map(contractor => req('POST', `/api/jobs/${job.id}/apply`, {
      note: `Stress applicant ${contractor.id} for ${job.id}`
    }, contractor.session, 201).then(response => ({ ...response.json.application, contractor_session: contractor.session }))));
    return { job, applications };
  }));
  pass('applications_created_concurrently', { applicationCount: applicationMatrix.reduce((sum, row) => sum + row.applications.length, 0) });

  const assignmentMatrix = await Promise.all(applicationMatrix.map(async ({ job, applications }) => {
    const attempts = await Promise.all(applications.map(application => req('POST', `/api/jobs/${job.id}/accept-applicant`, {
      application_id: application.id
    }, job.provider_session, [201, 409]).then(response => ({ response, application }))));
    const accepted = attempts.filter(item => item.response.status === 201).map(item => ({
      ...item.response.json.assignment,
      provider_session: job.provider_session,
      contractor_session: item.application.contractor_session
    }));
    const blocked = attempts.filter(item => item.response.status === 409);
    assert(accepted.length === job.expected_accepts, 'slot lock accepted the wrong number of applicants', { jobId: job.id, expected: job.expected_accepts, accepted: accepted.length, blocked: blocked.length });
    return { job, accepted, blocked: blocked.length };
  }));
  const assignments = assignmentMatrix.flatMap(row => row.accepted);
  pass('concurrent_acceptance_locks_held', { assignments: assignments.length, blocked_attempts: assignmentMatrix.reduce((sum, row) => sum + row.blocked, 0) });

  await Promise.all(assignments.map(async assignment => {
    for (const action of ['confirm', 'on-the-way', 'check-in', 'check-out']) {
      await req('POST', `/api/assignments/${assignment.id}/${action}`, {}, assignment.contractor_session);
    }
  }));
  pass('assignment_state_transitions_completed_concurrently', { assignments: assignments.length });

  const routesResponse = await req('GET', '/api/route-jobs', null, admin);
  const routesByJob = new Map(routesResponse.json.routes.map(route => [route.job_id, route]));
  await Promise.all(jobs.map(async job => {
    const route = routesByJob.get(job.id);
    assert(route && route.stops.length === 2, 'route missing for stressed job', { jobId: job.id, route });
    const assignment = assignments.find(item => item.job_id === job.id);
    assert(assignment, 'assignment missing for route completion', { jobId: job.id });
    for (const stop of route.stops) {
      await req('POST', `/api/route-jobs/${route.id}/complete-stop`, {
        stop_id: stop.id,
        proof_note: `Stress stop ${stop.sequence} complete.`
      }, assignment.contractor_session);
    }
  }));
  pass('route_stops_completed_concurrently', { routeCount: jobs.length, stopCount: jobs.length * 2 });

  await Promise.all(assignments.map((assignment, i) => req('POST', `/api/assignments/${assignment.id}/proof`, {
    proof_type: 'stress_media',
    body: `Stress proof body ${i}`,
    media_base64: Buffer.from(`stress proof media ${runId} ${i}`).toString('base64'),
    media_ext: 'txt',
    media_mime: 'text/plain'
  }, assignment.contractor_session, 201)));
  pass('proof_media_submitted_concurrently', { expectedProofItems: assignments.length });

  await Promise.all(assignments.map(assignment => req('POST', `/api/assignments/${assignment.id}/approve`, {}, assignment.provider_session)));
  pass('provider_approvals_completed_concurrently', { assignments: assignments.length });

  await Promise.all(jobs.map(job => req('GET', `/api/jobs/${job.id}/export-packet`, null, job.provider_session)));
  pass('export_packets_generated_concurrently', { expectedExports: jobs.length });

  await Promise.all(Array.from({ length: 8 }, () => req('GET', '/api/house-command/market-report?city=Phoenix&state=Arizona', null, admin)));
  pass('market_reports_generated_concurrently', { reports: 8 });

  const storage = await req('GET', '/api/storage/status', null, admin);
  assert(storage.json.storage.proof_media_count === assignments.length, 'proof media count mismatch after concurrent proof writes', storage.json.storage);
  assert(storage.json.storage.export_packet_count >= jobs.length + 8, 'export packet count mismatch after concurrent exports', storage.json.storage);
  pass('storage_counters_survived_concurrency', storage.json.storage);

  const payments = await req('GET', '/api/payments/ledger', null, admin);
  const payoutEligible = payments.json.payments.filter(payment => payment.assignment_id && payment.status === 'payout_eligible').length;
  assert(payoutEligible === assignments.length, 'payment ledger did not advance all assignments', { payoutEligible, expected: assignments.length });
  pass('payment_ledger_survived_concurrency', { payoutEligible });

  const auditIntegrity = await req('GET', '/api/admin/audit-integrity', null, admin);
  assert(auditIntegrity.json.audit_integrity.ok, 'audit chain integrity failed after stress', auditIntegrity.json.audit_integrity);
  pass('audit_chain_valid_after_stress', auditIntegrity.json.audit_integrity);

  const finalHealth = await req('GET', '/api/health', null, admin);
  assert(finalHealth.json.ok, 'final health failed after stress', finalHealth.json);
  const finalDb = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const persistedTotals = {
    jobs: finalDb.jobs.length,
    assignments: finalDb.job_assignments.length,
    proof_items: finalDb.proof_items.length,
    proof_media: finalDb.proof_media.length,
    export_packets: finalDb.export_packets.length,
    audit_events: finalDb.audit_events.length,
    health_jobs_open: finalHealth.json.jobs_open,
    health_assignments_open: finalHealth.json.assignments_open,
    health_routes_open: finalHealth.json.routes_open
  };
  assert(persistedTotals.jobs === jobs.length, 'persisted job total mismatch', persistedTotals);
  assert(persistedTotals.assignments === assignments.length, 'persisted assignment total mismatch', persistedTotals);
  assert(persistedTotals.proof_items === assignments.length, 'persisted proof total mismatch', persistedTotals);
  pass('persisted_totals_match_stress_shape', persistedTotals);

  const report = {
    ok: true,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    shape: { providerCount, contractorCount, jobCount, applicantsPerJob, expectedAssignments: assignments.length },
    checks,
    metrics: metricSummary(),
    dbPath,
    server_log_excerpt: logs.slice(-3000)
  };
  const out = path.join(proofDir, `STRESS_CONCURRENCY_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, report: out, metrics: report.metrics, shape: report.shape }, null, 2));
}

main().catch(error => {
  const report = {
    ok: false,
    started_at: startedAt,
    failed_at: new Date().toISOString(),
    failure: error.message,
    data: error.data || null,
    checks,
    metrics: metrics.length ? metricSummary() : null,
    dbPath,
    server_log_excerpt: logs.slice(-5000)
  };
  const out = path.join(proofDir, `STRESS_CONCURRENCY_FAILED_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.error(JSON.stringify({ ok: false, report: out, failure: report.failure, data: report.data, metrics: report.metrics }, null, 2));
  process.exitCode = 1;
}).finally(() => {
  try { process.kill(server.pid, 'SIGKILL'); } catch {}
});
