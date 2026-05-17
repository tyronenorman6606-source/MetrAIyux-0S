import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
mkdirSync(join(root, 'proof'), { recursive: true });
const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
const out = join(root, 'proof', `worker-allowlist-proof-${stamp}.json`);

const runner = readFileSync(join(root, 'workers/job-runner/runner.mjs'), 'utf8');
const required = [
  'health',
  'backup-now',
  'backup-encrypted',
  'restore-test',
  'smoke-all',
  'object-backup-sync',
  'validate-env',
  'policy-check',
  'backup-manifest',
  'branch-clone',
  'app-write-smoke'
];

const checks = required.map(job => ({
  job,
  ok: runner.includes(`'${job}'`) || runner.includes(`"${job}"`)
}));

const report = { ok: checks.every(c => c.ok), generatedAt: new Date().toISOString(), checks, failed: checks.filter(c => !c.ok) };
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, proof: out.replace(root + '/', ''), failed: report.failed }, null, 2));
process.exit(report.ok ? 0 : 1);
