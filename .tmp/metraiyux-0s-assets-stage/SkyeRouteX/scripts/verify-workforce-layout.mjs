import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const routexRoot = path.resolve(path.dirname(__filename), '..');
const siteRoot = path.resolve(routexRoot, '..');
const repoRoot = path.resolve(siteRoot, '..');
const workforceRoot = path.join(routexRoot, 'workforce-command-v0.4.0');
const legacyRoot = path.join(siteRoot, 'skyeroutex-workforce-command-v0.4.0');
const quarantineRoot = path.join(repoRoot, 'about to delete', 'skyeroutex-workforce-command-v0.4.0');
const archivedLegacyRoot = path.join(workforceRoot, 'data', 'legacy-root-quarantine-2026-05-20');
const archivedLegacyArtifacts = [
  'data/integration-smoke-exports/JOB_PACKET_job_2e620f6d96f45ac846_2026-05-17T19-43-30-476Z.json',
  'data/integration-smoke-exports/MARKET_REPORT_Phoenix_Arizona_2026-05-17T19-43-30-482Z.json',
  'data/storage-export-media/prf_bb85698fcf1c832f74.txt',
  'data/storage-export-packets/JOB_PACKET_job_0714eb57525473224b_2026-05-17T19-43-28-912Z.json',
  'data/storage-export-packets/MARKET_REPORT_Phoenix_Arizona_2026-05-17T19-43-28-924Z.json'
];

function assert(condition, message, data = {}) {
  if (!condition) {
    const error = new Error(message);
    error.data = data;
    throw error;
  }
}

const proof = {
  ok: false,
  checkedAt: new Date().toISOString(),
  routexRoot,
  workforceRoot,
  legacyRoot,
  quarantineRoot,
  archivedLegacyRoot,
  checks: []
};

function pass(name, data = {}) {
  proof.checks.push({ status: 'PASS', name, data });
}

try {
  assert(fs.existsSync(path.join(routexRoot, 'package.json')), 'SkyeRouteX package is missing', { routexRoot });
  pass('skyeroutex_parent_package_exists');

  assert(fs.existsSync(path.join(workforceRoot, 'package.json')), 'Workforce Command must stay nested inside SkyeRouteX', { workforceRoot });
  assert(fs.existsSync(path.join(workforceRoot, 'src', 'server.js')), 'Nested Workforce Command API server is missing', { workforceRoot });
  pass('workforce_command_is_nested_under_skyeroutex');

  assert(!fs.existsSync(legacyRoot), 'Legacy Workforce Command path must not exist inside the deployed 0S site tree', { legacyRoot });
  pass('legacy_path_removed_from_deployed_site_tree');

  for (const artifact of archivedLegacyArtifacts) {
    assert(fs.existsSync(path.join(archivedLegacyRoot, artifact)), 'Archived legacy RouteX artifact is missing from canonical app', { artifact, archivedLegacyRoot });
  }
  pass('legacy_unique_artifacts_archived_inside_canonical_app', { artifactCount: archivedLegacyArtifacts.length });

  if (fs.existsSync(quarantineRoot)) {
    assert(fs.existsSync(path.join(quarantineRoot, 'package.json')), 'Quarantined legacy Workforce Command copy is incomplete', { quarantineRoot });
    assert(fs.existsSync(path.join(quarantineRoot, 'src', 'server.js')), 'Quarantined legacy Workforce Command server evidence is incomplete', { quarantineRoot });
    pass('legacy_path_still_quarantined_outside_deployed_site_tree');
  } else {
    pass('legacy_quarantine_copy_deleted_after_archive');
  }

  proof.ok = true;
  console.log(JSON.stringify(proof, null, 2));
} catch (error) {
  proof.error = error.message;
  proof.data = error.data || null;
  console.error(JSON.stringify(proof, null, 2));
  process.exit(1);
}
