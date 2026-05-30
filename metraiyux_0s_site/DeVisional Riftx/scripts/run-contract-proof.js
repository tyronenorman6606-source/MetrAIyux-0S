const { spawnSync } = require('child_process');
const { repoPath, writeJson } = require('./lib');

function runCheck(check) {
  const attempts = (check.retries || 0) + 1;
  let last = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const startedAt = Date.now();
    const result = spawnSync(check.command, check.args, { cwd: repoPath(), encoding: 'utf8', stdio: 'pipe', timeout: check.timeout_ms || 300000 });
    last = { id: check.id, ok: result.status === 0, exit_code: result.status ?? 1, duration_ms: Date.now() - startedAt, stdout: result.stdout || '', stderr: result.stderr || '', attempts: attempt };
    if (last.ok) return last;
  }
  return last;
}

const checks = [
  { id:'gateway_only', command:'node', args:[repoPath('scripts','check-gateway-only.js')] },
  { id:'external_endpoints', command:'node', args:[repoPath('scripts','check-external-ai-endpoints.js')] },
  { id:'provider_strings', command:'node', args:[repoPath('scripts','check-provider-strings.js')] },
  { id:'secure_defaults', command:'node', args:[repoPath('scripts','check-secure-defaults.js')] },
  { id:'protected_apps', command:'node', args:[repoPath('scripts','check-protected-apps.js')] },
  { id:'skye_schema', command:'node', args:[repoPath('scripts','check-skye-schema.js')] },
  { id:'publishing_packages', command:'node', args:[repoPath('scripts','test-publishing-packages.js')] },
  { id:'publishing_binaries', command:'node', args:[repoPath('scripts','test-publishing-binaries.js')] },
  { id:'retailer_package_emitters', command:'node', args:[repoPath('scripts','test-retailer-package-emitters.js')] },
  { id:'retailer_validator', command:'node', args:[repoPath('scripts','validate-retailer-packages.js')] },
  { id:'direct_sale_commerce', command:'node', args:[repoPath('scripts','test-direct-sale-commerce.js')] },
  { id:'release_history', command:'node', args:[repoPath('scripts','test-release-history.js')] },
  { id:'multi_title_catalog', command:'node', args:[repoPath('scripts','test-multi-title-catalog.js')] },
  { id:'gateway_shape', command:'node', args:[repoPath('scripts','test-gateway-shape-fixtures.js')] },
  { id:'auth_regression', command:'node', args:[repoPath('scripts','test-auth-regressions.js')] },
  { id:'export_import_schema', command:'node', args:[repoPath('scripts','test-export-import-schema.js')] },
  { id:'artifact_consistency', command:'node', args:[repoPath('scripts','test-artifact-consistency.js')] },
  { id:'local_auth', command:'node', args:[repoPath('scripts','test-local-auth.js')] },
  { id:'server_auth', command:'node', args:[repoPath('scripts','test-server-auth.js')] },
  { id:'payment_gateway', command:'node', args:[repoPath('scripts','test-payment-gateway.js')] },
  { id:'submission_adapters', command:'node', args:[repoPath('scripts','test-submission-adapters.js')] },
  { id:'truth_boundaries', command:'node', args:[repoPath('scripts','test-truth-boundaries.js')] },
  { id:'production_lanes', command:'node', args:[repoPath('scripts','smoke-production-lanes.js')], timeout_ms: 600000, retries: 1 },
  { id:'ui_server_bridge', command:'node', args:[repoPath('scripts','test-ui-server-bridge.js')], timeout_ms: 240000, retries: 1 },
  { id:'production_config', command:'node', args:[repoPath('scripts','test-production-config.js')] },
  { id:'submission_contract_preview', command:'node', args:[repoPath('scripts','test-submission-contract-preview.js')] },
  { id:'submission_job_routes', command:'node', args:[repoPath('scripts','test-submission-job-routes.js')], timeout_ms: 600000, retries: 1 },
  { id:'submission_state_persistence', command:'node', args:[repoPath('scripts','test-submission-state-persistence.js')] },
  { id:'portal_automation', command:'node', args:[repoPath('scripts','test-portal-automation.js')], timeout_ms: 600000, retries: 1 },
  { id:'portal_target_readiness', command:'node', args:[repoPath('scripts','test-portal-target-readiness.js')] },
  { id:'live_route_guards', command:'node', args:[repoPath('scripts','test-live-route-guards.js')] },
  { id:'live_proof_external_targets', command:'node', args:[repoPath('scripts','test-live-proof-external-targets.js')], timeout_ms: 240000 },
  { id:'artifact_freshness', command:'node', args:[repoPath('scripts','test-artifact-freshness.js')] },
  { id:'no_theater', command:'node', args:[repoPath('scripts','check-no-theater.js')] },
  { id:'legacy_archives', command:'node', args:[repoPath('scripts','check-legacy-archives.js')] },
  { id:'build', command:'node', args:[repoPath('scripts','build-static.js')] },
];

const results = checks.map(runCheck);
const failed = results.filter((item) => !item.ok);
writeJson(repoPath('artifacts','contract-proof.json'), { generated_at: new Date().toISOString(), ok: failed.length === 0, checks_total: results.length, checks_failed: failed.length, checks: results });
if (failed.length) process.exit(1);
