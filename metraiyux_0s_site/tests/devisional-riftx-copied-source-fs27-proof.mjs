import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const appRoot = path.join(repoRoot, 'metraiyux_0s_site', 'DeVisional Riftx');

function read(rel) {
  return fs.readFileSync(path.join(appRoot, rel), 'utf8');
}

for (const dir of ['app', 'platform', 'server', 'scripts', 'config', 'fixtures']) {
  assert.equal(fs.existsSync(path.join(appRoot, dir)), true, `copied source folder missing: ${dir}`);
}
assert.equal(fs.existsSync(path.join(appRoot, 'public', 'SkyeCalendar', 'index.html')), true, 'copied SuperIDE SkyeCalendar source missing');

const serverAuth = await import(`file://${path.join(appRoot, 'platform', 'server-auth.js')}`);
assert.equal(serverAuth.verifyPassphrase('sovereign-build-passphrase', serverAuth.hashPassphrase()), false, 'local passphrase auth must be disabled');

const payment = await import(`file://${path.join(appRoot, 'platform', 'payment-gateways.js')}`);
const resolvedPayment = payment.resolvePaymentProvider({ provider: 'stripe' });
assert.equal(resolvedPayment.provider, 'skypay');
assert.equal(resolvedPayment.legacy_alias, 'stripe-disabled');
const session = await payment.createPaymentSession({ title: 'Proof', amount_usd: 49, customer_email: 'proof@example.com' }, {});
assert.equal(session.provider, 'skypay');
assert.match(session.checkout_url, /skyepay/i);

const submissions = await import(`file://${path.join(appRoot, 'platform', 'submission-adapters.js')}`);
const fixturePackage = path.join(appRoot, 'package.json');
const job = submissions.createSubmissionJob({ channel: 'kobo', package_path: fixturePackage, title: 'Proof', slug: 'proof' });
const workflow = submissions.createVendorWorkflow(job, { gateSession: 'proof_gate_session_1234567890' });
assert.equal(workflow.delivery_mode, 'fs27-ledger');
assert.equal(workflow.steps.some((step) => step.name === 'queue_owner_approval'), true);

const appJs = read('app/app.js');
const indexHtml = read('app/index.html');
const skyeCalendar = read('public/SkyeCalendar/index.html');
assert.match(indexHtml, /Free99\/free99-gate\.js/);
assert.doesNotMatch(indexHtml, /Workspace Passphrase|Stripe gateway|browser fallback/i);
assert.match(appJs, /fs27-gate/);
assert.doesNotMatch(appJs, /api\/auth\/login`, \{ method:'POST', headers:\{ 'content-type':'application\/json' \}, body:JSON\.stringify\(\{ operator, passphrase/i);
assert.match(skyeCalendar, /SkyeCalendar Command Surface/);
assert.match(skyeCalendar, /Dependency Timeline/);

const { createServer } = await import(`file://${path.join(appRoot, 'server', 'create-server.js')}`);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devisional-riftx-fs27-'));
const gateToken = 'proof_gate_session_1234567890';
const { server, readiness } = createServer({
  ZERO_OS_GATE_SESSION: gateToken,
  SKYE_RUNTIME_STATE_PATH: path.join(tempDir, 'state.json')
});
assert.equal(readiness.ok, true);

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;
const headers = { authorization: `Bearer ${gateToken}`, 'x-skye-gate-session': gateToken, 'content-type': 'application/json' };
try {
  const verify = await fetch(`${base}/api/auth/verify`, { headers }).then((res) => res.json());
  assert.equal(verify.ok, true);

  const checkout = await fetch(`${base}/api/payments/checkout/session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ title: 'Proof', amount_usd: 49, customer_email: 'proof@example.com' })
  }).then((res) => res.json());
  assert.equal(checkout.ok, true);
  assert.equal(checkout.session.provider, 'skypay');

  const targets = await fetch(`${base}/api/submissions/targets/validate`, { headers }).then((res) => res.json());
  assert.equal(targets.ok, true);
  assert.equal(targets.targets.kobo.summary.target_mode, 'fs27-ledger');
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log(JSON.stringify({
  ok: true,
  copied_source: path.relative(repoRoot, appRoot),
  auth_owner: 'FS27/SkyGate/Free99 shared gate',
  payment_owner: 'SkyPay',
  submission_owner: 'FS27 owner approval'
}, null, 2));
