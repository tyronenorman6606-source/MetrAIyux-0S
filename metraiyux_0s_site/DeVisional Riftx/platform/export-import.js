const crypto = require('crypto');

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = canonicalize(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function deriveKey(gateSession) {
  if (typeof gateSession !== 'string' || gateSession.trim().length < 8) throw new Error('FS27/SkyGate session is required.');
  return crypto.createHash('sha256').update(`devisional-riftx:fs27:${gateSession.trim()}`).digest('hex');
}

function signPayload(payload, gateSession) {
  const key = deriveKey(gateSession);
  const serialized = JSON.stringify(canonicalize(payload));
  return crypto.createHmac('sha256', key).update(serialized).digest('hex');
}

function createUnsignedPayload(workspace) {
  return {
    schema: 'skye.workspace.export',
    version: '4.0.0',
    exported_at: new Date().toISOString(),
    workspace_mode: workspace.mode || 'code',
    workspace: canonicalize(workspace.files ? workspace.files : workspace),
    publishing: canonicalize(workspace.publishing || {}),
    commerce: canonicalize(workspace.commerce || {}),
    checkout_session: canonicalize(workspace.checkoutSession || null),
    catalog: canonicalize(workspace.catalog || null),
    release_history: canonicalize(workspace.releaseHistory || null),
    active_title_id: workspace.activeTitleId || null
  };
}

function summarizeBundlePayload(payload) {
  const commerce = payload.commerce || {};
  const catalog = payload.catalog || {};
  const releaseHistory = payload.release_history || {};
  return canonicalize({
    schema: 'skye.workspace.export.summary',
    version: '3.8.0',
    workspace_mode: payload.workspace_mode || 'code',
    file_count: Object.keys(payload.workspace || {}).length,
    has_checkout_session: !!payload.checkout_session,
    catalog_titles: Array.isArray(catalog.titles) ? catalog.titles.length : 0,
    release_runs: Array.isArray(releaseHistory.runs) ? releaseHistory.runs.length : 0,
    library_count: Array.isArray(commerce.library) ? commerce.library.length : 0,
    active_title_id: payload.active_title_id || null
  });
}

function exportWorkspace(workspace, gateSession) {
  const payload = createUnsignedPayload(workspace);
  return { ...payload, signature: signPayload(payload, gateSession) };
}

function verifyWorkspaceBundle(bundle, gateSession) {
  if (!bundle || bundle.schema !== 'skye.workspace.export') throw new Error('Unsupported bundle schema.');
  const { signature, ...unsigned } = bundle;
  const expected = signPayload(unsigned, gateSession);
  return canonicalize({
    schema: 'skye.workspace.export.verification',
    version: '4.0.0',
    signature_valid: signature === expected,
    expected_signature: expected,
    received_signature: signature || null,
    summary: summarizeBundlePayload(unsigned)
  });
}

function importWorkspace(bundle, gateSession) {
  const verification = verifyWorkspaceBundle(bundle, gateSession);
  if (!verification.signature_valid) throw new Error('Signature mismatch.');
  const { signature, ...unsigned } = bundle;
  return {
    mode: unsigned.workspace_mode || 'code',
    files: unsigned.workspace,
    publishing: unsigned.publishing || {},
    commerce: unsigned.commerce || {},
    checkoutSession: unsigned.checkout_session || null,
    catalog: unsigned.catalog || null,
    releaseHistory: unsigned.release_history || null,
    activeTitleId: unsigned.active_title_id || null
  };
}

module.exports = { canonicalize, deriveKey, signPayload, createUnsignedPayload, summarizeBundlePayload, verifyWorkspaceBundle, exportWorkspace, importWorkspace };
