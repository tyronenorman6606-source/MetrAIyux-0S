import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const steps = [
  ['generate-northstar-seed', ['scripts/generate-northstar-seed.mjs']],
  ['build-core', ['scripts/build-core.mjs', ...process.argv.slice(2)]],
  ['v17-enhance', ['scripts/v17-enhance.mjs']],
  ['v18-enhance', ['scripts/v18-enhance.mjs']],
  ['v19-enhance', ['scripts/v19-enhance.mjs']],
  ['v20-enhance', ['scripts/v20-enhance.mjs']],
  ['v22-enhance', ['scripts/v22-enhance.mjs']],
  ['v23-enhance', ['scripts/v23-enhance.mjs']],
  ['client-facing-copy', ['scripts/client-facing-copy.mjs']],
  ['path-route-prefix', ['scripts/path-route-prefix.mjs']]
];

for (const [label, args] of steps) {
  if (process.argv.includes('--data-only') && !['generate-northstar-seed', 'build-core'].includes(label)) continue;
  const result = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit', env: process.env });
  if (result.status !== 0) {
    console.error(`PHX build step failed: ${label}`);
    process.exit(result.status || 1);
  }
}
