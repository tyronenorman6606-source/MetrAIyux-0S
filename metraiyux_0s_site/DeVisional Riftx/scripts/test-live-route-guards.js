const http = require('http');
const { createServer } = require('../server/create-server');
const { fail, ok, repoPath, writeJson } = require('./lib');

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address())));
}

async function login(base) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ operator: 'Skyes Over London', passphrase: 'sovereign-build-passphrase' })
  });
  const data = await response.json();
  if (!data.ok || !data.access_token) fail('[live-route-guards] FAIL :: login');
  return data.access_token;
}

(async () => {
  const { server } = createServer({
    SKYE_RUNTIME_MODE: 'test',
    SKYE_PORTAL_AUTOMATION_ENABLE: '1',
    SKYE_SUBMIT_APPLE_URL: 'http://127.0.0.1:9911/apple_books',
    SKYE_SUBMIT_KOBO_URL: 'http://127.0.0.1:9911/kobo',
    SKYE_SUBMIT_KDP_EBOOK_URL: 'http://127.0.0.1:9911/kdp_ebook',
    SKYE_SUBMIT_KDP_PRINT_URL: 'http://127.0.0.1:9911/kdp_print_prep',
    SKYE_PORTAL_DEFAULT_PASSWORD: 'portal-test-password',
    STRIPE_SECRET_KEY: ''
  });
  const addr = await listen(server);
  const base = `http://127.0.0.1:${addr.port}`;
  const token = await login(base);
  const authHeaders = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

  const readinessRes = await fetch(`${base}/api/submissions/live-readiness`, { headers: { authorization: `Bearer ${token}` } });
  const readinessData = await readinessRes.json();
  if (readinessRes.status !== 409 || readinessData.ok !== false || readinessData.readiness.channels.apple_books.ok !== false) fail('[live-route-guards] FAIL :: live-readiness');

  const stripeReadinessRes = await fetch(`${base}/api/payments/stripe/probe/readiness`, { headers: { authorization: `Bearer ${token}` } });
  const stripeReadinessData = await stripeReadinessRes.json();
  if (!stripeReadinessData.ok || stripeReadinessData.readiness.probe_ready !== false) fail('[live-route-guards] FAIL :: stripe-readiness');

  const stripeProbeRes = await fetch(`${base}/api/payments/stripe/probe/run`, { method: 'POST', headers: authHeaders, body: '{}' });
  const stripeProbeData = await stripeProbeRes.json();
  if (stripeProbeRes.status !== 409 || stripeProbeData.error !== 'stripe-probe-not-ready') fail('[live-route-guards] FAIL :: stripe-probe-guard');

  const createJobRes = await fetch(`${base}/api/submissions/from-package`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ slug: 'sovereign-author-publishing-os', mode: 'skydocx', channel: 'apple_books', title: 'Sovereign Author Publishing OS', metadata: { operator: 'Skyes Over London', portal_password: 'portal-test-password' } }) });
  const createJobData = await createJobRes.json();
  if (!createJobData.ok || !createJobData.job?.job_id) fail('[live-route-guards] FAIL :: create-job');

  const livePlanRes = await fetch(`${base}/api/submissions/jobs/${createJobData.job.job_id}/portal-live-plan`, { method: 'POST', headers: authHeaders, body: '{}' });
  const livePlanData = await livePlanRes.json();
  if (livePlanRes.status !== 409 || livePlanData.error !== 'portal-live-not-ready') fail('[live-route-guards] FAIL :: live-plan-guard');

  server.close();
  writeJson(repoPath('artifacts', 'live-proof', 'route-guards.json'), { ok: true, portal_live_readiness: readinessData.readiness, stripe_probe_readiness: stripeReadinessData.readiness, live_plan_guard: livePlanData.error, stripe_probe_guard: stripeProbeData.error });
  ok('[live-route-guards] PASS');
})().catch((error) => fail(error.stack || error.message));
