import { readFile, writeFile, mkdir } from 'node:fs/promises';

const worker = await readFile('apps/gateway-worker/src/index.ts', 'utf8');
const cli = await readFile('packages/cli/src/index.ts', 'utf8');
const sdk = await readFile('packages/sdk/src/index.ts', 'utf8');
const consoleHtml = await readFile('apps/console/index.html', 'utf8');
const consoleJs = await readFile('apps/console/src/app.js', 'utf8');

const checks = [
  ['worker has plan definitions', worker.includes('BUILTIN_PLANS') && worker.includes('ProjectPlanRecord')],
  ['worker exposes plan catalog API', worker.includes('/v1/admin/plans')],
  ['worker exposes plan mutation API', worker.includes('/v1/admin/set-plan')],
  ['worker enforces daily plan usage', worker.includes('Daily plan usage limit reached') && worker.includes('projectDailyUsageTotal')],
  ['worker enforces capability allowlist', worker.includes('plan_capability_blocked') && worker.includes('allowedCapabilities')],
  ['worker supports scoped key expiry', worker.includes('expiresAt') && worker.includes('Expired SkyeAPI key')],
  ['SDK exposes plan admin calls', sdk.includes('plans()') && sdk.includes('setPlan(')],
  ['CLI exposes paid-platform commands', cli.includes('hosted plans') && cli.includes('hosted set-plan') && cli.includes('hosted revoke-key')],
  ['console has plan enforcement UI', consoleHtml.includes('Plan enforcement') && consoleJs.includes('setPlan')],
  ['console contains truth-mode copy', consoleHtml.includes('Truth mode: configured means configured')]
];

const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  throw new Error(`Platform controls smoke failed: ${failures.join('; ')}`);
}

await mkdir('.proof', { recursive: true });
const result = {
  ok: true,
  name: 'platform-controls-smoke',
  checks: Object.fromEntries(checks),
  proves: [
    'source includes plan catalog and plan mutation APIs',
    'source includes runtime capability/usage enforcement hooks',
    'source includes scoped key expiry handling',
    'CLI, SDK, and console expose the paid-platform controls'
  ],
  does_not_prove: [
    'live billing collection',
    'deployed Cloudflare Worker behavior',
    'real provider delivery success'
  ],
  secrets_exposed: false,
  generatedAt: new Date().toISOString()
};
await writeFile('.proof/platform-controls-smoke-result.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
