const { canonicalize } = require('./export-import');

function getTruthBoundaryStatus(env = process.env) {
  const authConfigured = !!(env.MCP_GATE_SESSION || env.ZERO_OS_GATE_SESSION || env.SKYE_GATE_SESSION || env.FS27_GATE_SESSION || env.SKYE_GATE_INTROSPECT_URL || env.FS27_AUTH_INTROSPECT_URL);
  const paymentsConfigured = true;
  const submissionsConfigured = true;
  return canonicalize({
    schema: 'skye.truth.boundaries',
    version: '4.0.0',
    auth: { mode: 'fs27-gate-session', live_ready: authConfigured, reason: authConfigured ? 'FS27/SkyGate shared session or introspection is configured.' : 'FS27/SkyGate session or introspection must be available before protected routes unlock.' },
    payments: { mode: 'skypay-handoff', live_ready: paymentsConfigured, reason: 'Payment movement is handed to SkyPay/FS27; this copied app does not own provider keys.' },
    submissions: { mode: 'fs27-owner-approval', live_ready: submissionsConfigured, reason: 'Publishing jobs queue FS27 owner-approval receipts before any external dispatch.' }
  });
}

function assertCapability(kind, env = process.env) {
  const boundaries = getTruthBoundaryStatus(env);
  const target = boundaries[kind];
  return canonicalize({ schema: 'skye.truth.boundary.assertion', version: '4.0.0', kind, ok: !!target && target.live_ready === true, mode: target?.mode || null, reason: target?.reason || 'unsupported-boundary' });
}

module.exports = { getTruthBoundaryStatus, assertCapability };
