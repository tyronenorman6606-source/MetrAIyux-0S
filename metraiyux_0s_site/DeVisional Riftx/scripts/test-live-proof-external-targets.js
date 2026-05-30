const http = require('http');
const { createServer } = require('../server/create-server');
const { fail, ok, repoPath, writeJson } = require('./lib');
const { OFFICIAL_PORTAL_BASES } = require('../platform/vendor-portal-profiles');

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
  if (!data.ok || !data.access_token) fail('[live-proof-external-targets] FAIL :: login');
  return data.access_token;
}
(async () => {
  const stripeStub = http.createServer((req, res) => {
    if (req.url === '/v1/balance') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ object:'balance', livemode:false, available:[{ amount:100000, currency:'usd' }], pending:[{ amount:0, currency:'usd' }] }));
    }
    res.writeHead(404, { 'content-type':'application/json' });
    res.end(JSON.stringify({ error:'missing' }));
  });
  const stripeAddr = await listen(stripeStub);
  const { server } = createServer({
    SKYE_RUNTIME_MODE: 'test',
    SKYE_PORTAL_AUTOMATION_ENABLE: '1',
    SKYE_SUBMIT_APPLE_URL: OFFICIAL_PORTAL_BASES.apple_books,
    SKYE_SUBMIT_KOBO_URL: OFFICIAL_PORTAL_BASES.kobo,
    SKYE_SUBMIT_KDP_EBOOK_URL: OFFICIAL_PORTAL_BASES.kdp_ebook,
    SKYE_SUBMIT_KDP_PRINT_URL: OFFICIAL_PORTAL_BASES.kdp_print_prep,
    SKYE_PORTAL_DEFAULT_PASSWORD: 'portal-test-password',
    STRIPE_SECRET_KEY: 'sk_test_liveproof',
    STRIPE_WEBHOOK_SECRET: 'whsec_liveproof',
    STRIPE_API_BASE: `http://127.0.0.1:${stripeAddr.port}`
  });
  const addr = await listen(server);
  const base = `http://127.0.0.1:${addr.port}`;
  const token = await login(base);
  const authHeaders = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

  const readinessRes = await fetch(`${base}/api/submissions/live-readiness`, { headers: { authorization: `Bearer ${token}` } });
  const readinessData = await readinessRes.json();
  if (readinessRes.status !== 200 || !readinessData.ok || !readinessData.readiness.channels.apple_books.ok) fail('[live-proof-external-targets] FAIL :: live-readiness');

  const stripeReadinessRes = await fetch(`${base}/api/payments/stripe/probe/readiness`, { headers: { authorization: `Bearer ${token}` } });
  const stripeReadinessData = await stripeReadinessRes.json();
  if (!stripeReadinessData.ok || stripeReadinessData.readiness.probe_ready !== true || stripeReadinessData.readiness.webhook_ready !== true) fail('[live-proof-external-targets] FAIL :: stripe-readiness');

  const stripeProbeRes = await fetch(`${base}/api/payments/stripe/probe/run`, { method:'POST', headers: authHeaders, body: '{}' });
  const stripeProbeData = await stripeProbeRes.json();
  if (stripeProbeRes.status !== 200 || !stripeProbeData.ok || stripeProbeData.probe.provider !== 'stripe') fail('[live-proof-external-targets] FAIL :: stripe-probe-run');

  const createJobRes = await fetch(`${base}/api/submissions/from-package`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ slug: 'sovereign-author-publishing-os', mode: 'skydocx', channel: 'apple_books', title: 'Sovereign Author Publishing OS', metadata: { operator: 'Skyes Over London', portal_password: 'portal-test-password' } }) });
  const createJobData = await createJobRes.json();
  if (!createJobData.ok || !createJobData.job?.job_id) fail('[live-proof-external-targets] FAIL :: create-job');

  const livePlanRes = await fetch(`${base}/api/submissions/jobs/${createJobData.job.job_id}/portal-live-plan`, { method: 'POST', headers: authHeaders, body: '{}' });
  const livePlanData = await livePlanRes.json();
  if (livePlanRes.status !== 200 || !livePlanData.ok || livePlanData.plan.target.target_mode !== 'external' || livePlanData.plan.execution_mode !== 'live-proof') fail('[live-proof-external-targets] FAIL :: live-plan');

  const targetMap = Object.fromEntries(Object.entries(readinessData.readiness.channels).map(([channel, entry]) => [channel, { ok: entry.ok, summary: entry.summary, validation: entry.validation }]));
  writeJson(repoPath('artifacts', 'production-lanes', 'portal-targets.json'), { generated_at:new Date().toISOString(), ok:true, targets: targetMap });
  writeJson(repoPath('artifacts', 'live-proof', 'manifest.json'), {
    generated_at:new Date().toISOString(),
    ok:true,
    version:'3.8.0',
    route_guards:{ portal_live_guard:'portal-live-not-ready', stripe_probe_guard:'stripe-probe-not-ready' },
    ready_routes:{ channel: livePlanData.plan.channel, target_mode: livePlanData.plan.target.target_mode, secure: livePlanData.plan.target.target.secure, execution_mode: livePlanData.plan.execution_mode, step_count: livePlanData.plan.steps.length },
    channels:Object.fromEntries(Object.entries(readinessData.readiness.channels).map(([channel, entry]) => [channel, { ok: entry.ok, target_mode: entry.summary.target_mode, secure: entry.summary.target.secure, origin: entry.summary.target.origin }])),
    stripe:{ ...stripeReadinessData.readiness, probe: { provider: stripeProbeData.probe.provider, provider_mode: stripeProbeData.probe.provider_mode, api_base: stripeProbeData.probe.api_base, available_count: stripeProbeData.probe.available_count, livemode: stripeProbeData.probe.livemode } }
  });
  writeJson(repoPath('artifacts', 'live-proof', 'ready-routes.json'), { ok: true, portal_live_readiness: readinessData.readiness, stripe_probe_readiness: stripeReadinessData.readiness, live_plan: { channel: livePlanData.plan.channel, target_mode: livePlanData.plan.target.target_mode, secure: livePlanData.plan.target.target.secure, execution_mode: livePlanData.plan.execution_mode, step_count: livePlanData.plan.steps.length } });

  server.close(); stripeStub.close();
  ok('[live-proof-external-targets] PASS');
})().catch((error) => fail(error.stack || error.message));
