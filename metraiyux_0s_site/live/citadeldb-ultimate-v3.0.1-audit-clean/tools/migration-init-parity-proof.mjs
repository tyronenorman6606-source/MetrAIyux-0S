import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
mkdirSync(join(root, 'proof'), { recursive: true });
const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
const out = join(root, 'proof', `migration-init-parity-${stamp}.json`);

const migDir = join(root, 'migrations/citadel-core');
const initDir = join(root, 'deploy/vps-postgres/init');

function sha(path) {
  return crypto.createHash('sha256').update(readFileSync(path)).digest('hex');
}

const migrations = readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
const init = readdirSync(initDir).filter(f => f.endsWith('.sql')).sort();

const checks = migrations.map(file => {
  const migPath = join(migDir, file);
  const initPath = join(initDir, file);
  const exists = init.includes(file);
  const same = exists ? sha(migPath) === sha(initPath) : false;
  return { file, existsInInit: exists, sameContent: same, ok: exists && same };
});

const report = {
  ok: checks.every(c => c.ok),
  generatedAt: new Date().toISOString(),
  migrations,
  init,
  checks,
  failed: checks.filter(c => !c.ok)
};

writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, proof: out.replace(root + '/', ''), failed: report.failed }, null, 2));
process.exit(report.ok ? 0 : 1);
