import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const routexRoot = path.resolve(path.dirname(__filename), '..');
const siteRoot = path.resolve(routexRoot, '..');
const workforceRoot = path.join(routexRoot, 'workforce-command-v0.4.0');
const legacyRoot = path.join(siteRoot, 'skyeroutex-workforce-command-v0.4.0');

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

  const legacyStat = fs.lstatSync(legacyRoot);
  assert(legacyStat.isSymbolicLink(), 'Legacy Workforce Command path must remain a symlink, not a separate folder', { legacyRoot });
  const legacyReal = fs.realpathSync(legacyRoot);
  const workforceReal = fs.realpathSync(workforceRoot);
  assert(legacyReal === workforceReal, 'Legacy Workforce Command symlink points away from canonical SkyeRouteX folder', { legacyReal, workforceReal });
  pass('legacy_path_points_to_nested_workforce_command', { legacyReal });

  proof.ok = true;
  console.log(JSON.stringify(proof, null, 2));
} catch (error) {
  proof.error = error.message;
  proof.data = error.data || null;
  console.error(JSON.stringify(proof, null, 2));
  process.exit(1);
}
