const { clean, compact, nowISO } = require('./housecircle-cloud-store');
const { isProductionMode } = require('./housecircle-auth');
const { readNeonConfig } = require('./housecircle-neon-store');

function boolEnv(name) {
  return ['1', 'true', 'yes', 'on'].includes(clean(process.env[name]).toLowerCase());
}

function productionReadiness() {
  const prod = isProductionMode() || boolEnv('PHC_PRODUCTION') || boolEnv('PHC_REQUIRE_PRODUCTION_READY');
  const neon = readNeonConfig();
  const requireNeon = boolEnv('PHC_REQUIRE_NEON_PRIMARY') || (prod && boolEnv('PHC_PRODUCTION_REQUIRES_NEON'));
  const gateConfigured = !!(clean(process.env.SKYGATEFS27_ORIGIN || process.env.SKYGATE_ORIGIN) || boolEnv('ZERO_OS_SHARED_GATE_REQUIRED') || boolEnv('SKYE_SHARED_GATE_REQUIRED'));
  const checks = [
    { key: 'sharedGateConfigured', ok: gateConfigured, fatal: prod, detail: 'RouteX Netlify legacy surfaces must be reached through the shared FS27/SkyGate/Free99 gate.' },
    { key: 'neonConfiguredWhenRequired', ok: !requireNeon || neon.configured, fatal: requireNeon, detail: 'PHC_REQUIRE_NEON_PRIMARY requires NEON_DATABASE_URL / DATABASE_URL.' }
  ];
  const failing = checks.filter((c) => !c.ok && c.fatal);
  return {
    ok: failing.length === 0,
    production: prod,
    requireNeonPrimary: requireNeon,
    generatedAt: nowISO(),
    checks,
    failing,
    neon: { configured: neon.configured, mode: neon.mode, schema: neon.schema, branch: neon.branch || '' }
  };
}

function requireRuntimeReady(kind) {
  const ready = productionReadiness();
  if (!ready.ok) return { ok: false, statusCode: 503, error: 'Runtime is not production-ready for ' + compact(kind || 'this route') + '.', readiness: ready };
  return { ok: true, readiness: ready };
}

module.exports = { boolEnv, productionReadiness, requireRuntimeReady };
