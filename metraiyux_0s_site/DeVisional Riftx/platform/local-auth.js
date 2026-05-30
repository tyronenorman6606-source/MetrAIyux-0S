const crypto = require('crypto');
const { canonicalize } = require('./export-import');
const { cleanCredential, verifyGateCredentialSync } = require('./fs27-gate');

function hashPayload(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

function createUnsignedLocalSession({ operator, org, sessionTtlMinutes = 240, gatewayMode = 'fs27-skygate-only', nowMs = Date.now(), gateSession = '' }) {
  const token = cleanCredential(gateSession);
  if (!token) throw new Error('FS27/SkyGate gate session is required.');
  return canonicalize({
    schema: 'skye.fs27.session.receipt',
    version: '1.0.0',
    auth_mode: 'fs27-shared-gate-session',
    auth_owner: 'FS27/SkyGate/Free99 shared gate',
    operator: operator || 'FS27 Operator',
    org: org || 'MetrAIyux 0S',
    gateway_mode: gatewayMode,
    gate_session_present: true,
    minted_at: nowMs,
    expires_at: nowMs + (sessionTtlMinutes * 60 * 1000)
  });
}

function signLocalSession(unsignedSession, gateSession) {
  const token = cleanCredential(gateSession);
  if (!token) throw new Error('FS27/SkyGate gate session is required.');
  return hashPayload({ gate_session: token, payload: unsignedSession });
}

function mintLocalSession(args, gateSession) {
  const unsignedSession = createUnsignedLocalSession({ ...args, gateSession });
  return canonicalize({ ...unsignedSession, signature: signLocalSession(unsignedSession, gateSession) });
}

function verifyLocalSession(session, gateSession, nowMs = Date.now()) {
  const issues = [];
  if (!session || session.schema !== 'skye.fs27.session.receipt') issues.push('schema');
  if (!session || session.auth_owner !== 'FS27/SkyGate/Free99 shared gate') issues.push('auth-owner');
  if (!session || typeof session.expires_at !== 'number') issues.push('expires_at');
  if (!session || typeof session.signature !== 'string') issues.push('signature');
  if (!issues.length && nowMs >= session.expires_at) issues.push('expired');
  const gate = verifyGateCredentialSync(gateSession);
  if (!gate.ok) issues.push('gate-session-not-shared');
  let expectedSignature = null;
  if (!issues.includes('schema') && !issues.includes('signature') && cleanCredential(gateSession)) {
    const unsignedSession = { ...session };
    delete unsignedSession.signature;
    expectedSignature = signLocalSession(unsignedSession, gateSession);
    if (expectedSignature !== session.signature) issues.push('tampered');
  }
  return canonicalize({
    schema: 'skye.fs27.session.verification',
    version: '1.0.0',
    ok: issues.length === 0,
    issues,
    expected_signature: expectedSignature,
    summary: summarizeLocalSession(session),
    gate
  });
}

function summarizeLocalSession(session) {
  return canonicalize({
    schema: 'skye.fs27.session.summary',
    version: '1.0.0',
    auth_mode: session?.auth_mode || null,
    auth_owner: session?.auth_owner || null,
    operator: session?.operator || null,
    org: session?.org || null,
    gateway_mode: session?.gateway_mode || null,
    expires_at: typeof session?.expires_at === 'number' ? session.expires_at : null
  });
}

module.exports = { hashPayload, createUnsignedLocalSession, signLocalSession, mintLocalSession, verifyLocalSession, summarizeLocalSession };
