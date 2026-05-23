import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const root = process.cwd();
const proofDir = path.join(root, 'proof');
fs.mkdirSync(proofDir, { recursive: true });
const dbPath = path.join(root, 'data', 'manual-compliance-smoke-db.json');
const mediaRoot = path.join(root, 'data', 'manual-compliance-media');
const exportRoot = path.join(root, 'data', 'manual-compliance-exports');
for (const p of [dbPath, mediaRoot, exportRoot]) if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });

const port = 5867;
const env = {
  ...process.env,
  SKYEROUTEX_DISABLE_ROOT_ENV: '1',
  PORT: String(port),
  DATABASE_DRIVER: 'local-json',
  DATABASE_PATH: dbPath,
  STORAGE_DRIVER: 'local-json',
  MEDIA_ROOT: mediaRoot,
  EXPORT_ROOT: exportRoot,
  SKYE_ALLOW_LOCAL_PROOF_SERVICES: '1',
  PAYMENT_PROVIDER: 'ledger-only',
  NOTIFICATION_PROVIDER: 'in-app-ledger',
  ROUTE_INTELLIGENCE_PROVIDER: 'route-structure-only',
  IDENTITY_COMPLIANCE_PROVIDER: 'manual-government-check',
  COMPLIANCE_OPERATING_STATE: 'AZ',
  COMPLIANCE_BUSINESS_MODE: 'az_llc_admin_assist',
  SKYEHANDS_RUNTIME_PROVIDER: 'standalone-local-events',
  SKYE_ADMIN_EMAIL: 'admin@manual-compliance.internal.invalid',
  SKYE_ADMIN_PASSWORD: 'AdminManual123!'
};

const server = spawn('node', ['src/server.js'], { cwd: root, env, stdio: 'ignore' });

async function req(method, url, body, session) {
  const headers = { 'content-type': 'application/json', connection: 'close' };
  if (session) headers['x-skye-session'] = session;
  const res = await fetch(`http://localhost:${port}${url}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}
function assert(cond, msg, data) { if (!cond) { const e = new Error(msg); e.data = data; throw e; } }
async function login(email, password) {
  const r = await req('POST', '/api/auth/login', { email, password });
  assert(r.status === 200, `login failed for ${email}`, r);
  return r.json.session;
}

const proof = { started_at: new Date().toISOString(), smoke: 'manual-compliance', checks: [] };
const pass = (name, data = {}) => proof.checks.push({ status: 'PASS', name, data });

try {
  for (let i = 0; i < 80; i += 1) {
    try { const r = await fetch(`http://localhost:${port}/api/health`); if (r.ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  const admin = await login('admin@manual-compliance.internal.invalid', 'AdminManual123!');
  const integrations = await req('GET', '/api/integrations/status', null, admin);
  const complianceIntegration = integrations.json.integrations.find(x => x.name === 'identity_compliance');
  assert(integrations.status === 200 && complianceIntegration?.driver === 'manual-government-check' && complianceIntegration?.status === 'manual-compliance', 'manual compliance provider was not active', integrations);
  pass('manual_government_check_provider_active', complianceIntegration);

  const contractor = await req('POST', '/api/auth/signup', {
    email: 'manual-compliance-worker@example.test',
    password: 'WorkerManual123!',
    name: 'Manual Compliance Worker',
    role: 'contractor',
    city: 'Phoenix',
    state: 'Arizona',
    skills: ['route', 'field']
  });
  assert(contractor.status === 201, 'contractor signup failed', contractor);
  pass('signup_creates_manual_compliance_intake', { user_id: contractor.json.id });

  const manual = await req('POST', '/api/compliance/manual-checks', {
    user_id: contractor.json.id,
    status: 'submitted',
    checks: ['standalone_disclosure_authorization', 'manual_public_record_review', 'az_e_verify_i9_tracking', 'proof_vault_upload'],
    source: 'Arizona manual public record workflow',
    proof_reference: 'smoke-proof-reference',
    notes: 'Client/internal employer owns adjudication; RouteX stores proof and audit trail.',
    subject_authorization_recorded: true,
    standalone_disclosure_recorded: true,
    media_base64: Buffer.from('manual compliance smoke proof').toString('base64'),
    media_ext: 'txt',
    media_mime: 'text/plain'
  }, admin);
  assert(manual.status === 201 && manual.json.compliance_check.provider === 'manual-government-check' && manual.json.proof_media?.sha256, 'manual compliance proof was not recorded with media', manual);
  pass('manual_compliance_proof_recorded_with_media', { compliance_check: manual.json.compliance_check.id, media: manual.json.proof_media.id });

  const rows = await req('GET', '/api/compliance/checks', null, admin);
  assert(rows.status === 200 && rows.json.compliance_checks.some(row => row.id === manual.json.compliance_check.id && row.manual_workflow?.operating_state === 'AZ'), 'manual compliance ledger did not return AZ workflow row', rows);
  pass('manual_compliance_ledger_returns_az_workflow');

  const outbox = await req('GET', '/api/integrations/outbox?provider_kind=identity_compliance', null, admin);
  assert(outbox.status === 200 && outbox.json.outbox.some(row => row.event_type === 'manual_compliance_proof_recorded' && row.driver === 'manual-government-check'), 'manual compliance outbox evidence missing', outbox);
  pass('identity_compliance_outbox_contains_manual_proof_event');

  const storage = await req('GET', '/api/storage/integrity', null, admin);
  assert(storage.status === 200 && storage.json.storage_integrity.ok === true && storage.json.storage_integrity.media_count >= 1, 'manual compliance proof media failed integrity check', storage);
  pass('manual_compliance_media_integrity_passes', storage.json.storage_integrity);

  proof.status = 'PASS';
  proof.completed_at = new Date().toISOString();
} catch (err) {
  proof.failed_at = new Date().toISOString();
  proof.status = 'FAIL';
  proof.failure = err.message;
  proof.data = err.data || null;
  console.error(err);
  process.exitCode = 1;
} finally {
  const out = path.join(proofDir, `SMOKE_MANUAL_COMPLIANCE_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(out, JSON.stringify(proof, null, 2));
  console.log(`Manual compliance proof written: ${out}`);
  try { process.kill(server.pid, 'SIGKILL'); } catch {}
  process.exit(process.exitCode || 0);
}
