#!/usr/bin/env node
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const artifactRoot = path.join(repoRoot, 'test-artifacts', 'ai-gate-audit');
const receiptPath = path.join(artifactRoot, `ai-gate-audit-${stamp}.json`);
const latestPath = path.join(artifactRoot, 'ai-gate-audit-latest.json');

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function filesUnder(relDir, matcher = /\.(html|js|mjs|css)$/) {
  const root = path.join(repoRoot, relDir);
  const out = [];
  function walk(dir) {
    for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
      if (name.name === 'node_modules' || name.name === 'dist' || name.name === 'build') continue;
      const full = path.join(dir, name.name);
      if (name.isDirectory()) walk(full);
      else if (matcher.test(name.name)) out.push(full);
    }
  }
  if (fs.existsSync(root)) walk(root);
  return out;
}

function includesAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

function check(name, pass, details = {}) {
  return { name, pass: Boolean(pass), ...details };
}

const worker = read('metraiyux_0s_site/cloudflare/worker.js');
const founderApp = read('metraiyux_0s_site/founder-command/app.js');
const founderIndex = read('metraiyux_0s_site/founder-command/index.html');
const skyehawkJs = read('metraiyux_0s_site/assets/js/skyehawk-os.js');
const skyehawkIndex = read('metraiyux_0s_site/skyehawk/index.html');
const calendarIndex = read('metraiyux_0s_site/founder-command/apps/0s-calendar/index.html');

const founderMountedFiles = [
  ...filesUnder('metraiyux_0s_site/founder-command/apps'),
  ...filesUnder('metraiyux_0s_site/skyehawk'),
  ...filesUnder('metraiyux_0s_site/skyerrors')
];
const mountedPasswordForms = founderMountedFiles
  .map((file) => ({ file: path.relative(repoRoot, file), text: fs.readFileSync(file, 'utf8') }))
  .filter((item) => /type=["']password["']|app-local password|local admin password|client admin password/i.test(item.text))
  .map((item) => item.file);

const directOpenAiPatterns = [
  'https://api.openai.com',
  'chat/completions',
  '0s-openai-direct',
  'openai_direct_configured',
  'OPENAI_API_KEY'
];
const directOpenAiHits = directOpenAiPatterns.filter((pattern) => worker.includes(pattern));

const results = [
  check('Worker has no direct OpenAI provider fallback', directOpenAiHits.length === 0, { directOpenAiHits }),
  check('Paid AI helper requires FS27/SkyGate gateway', includesAll(worker, [
    'fs27_ai_gateway_not_configured',
    'fs27-gateway-required',
    "provider_path: 'fs27-gateway-chat'",
    "'x-0s-gate-session': bearer(request)"
  ])),
  check('Business Card Factory copy pass is gateway-or-local only', includesAll(worker, [
    'direct_provider_disabled: true',
    "provider_path: 'local-deterministic-copy-gateway-required'",
    "provider_path: 'local-deterministic-copy-after-gateway-failure'",
    "provider_path: 'fs27-gateway-chat'"
  ])),
  check('Founder Command API authenticates before AI/PWA analyze route', worker.indexOf("const auth = await requireOperatorAuth(request, env, 'Founder Command')") > -1
    && worker.indexOf("if (url.pathname === '/api/founder-command/pwa-factory/analyze')") > worker.indexOf("const auth = await requireOperatorAuth(request, env, 'Founder Command')")),
  check('Founder PWA Factory uses shared paid lane helper', includesAll(worker, [
    'FOUNDER_PWA_FACTORY_AI_CONFIG',
    'paidLaneCallAi(request, env, FOUNDER_PWA_FACTORY_AI_CONFIG'
  ])),
  check('0S gate prefixes include SuperIDE, SkyeHawk, SkyErrors, Founder Command', includesAll(worker, [
    "'/devisional-riftx'",
    "'/skyehawk'",
    "'/skyerrors'",
    "'/founder-command'"
  ])),
  check('SkyeNet private path keeps DeVisional Riftx protected', includesAll(worker, [
    "'/skyenet/devisional-riftx'",
    "/^\\/skyenet\\/devisional-riftx"
  ])),
  check('SkyeHawk extends into command bridge instead of standalone AI auth', includesAll(skyehawkJs, [
    'SkyeCommandBridge.capture',
    "source_app: 'skyehawk'",
    'ZERO_OS_SOURCE_COPY'
  ])),
  check('SkyeHawk page declares shared gate/no app password posture', /shared gate/i.test(skyehawkIndex) && /without creating a separate AI lane or app password/i.test(skyehawkIndex)),
  check('SuperIDE calendar is mounted through Founder Command gate lane', includesAll(calendarIndex, [
    '/Free99/free99-gate.js',
    'data-platform-id="founder-command-0s-calendar"',
    '/api/founder-command/calendar'
  ])),
  check('Founder Command menu exposes repo vault and song vault surfaces', includesAll(founderIndex, [
    'commandMenuSearch',
    'data-view="repo-vault"',
    'data-view="songs"'
  ])),
  check('Founder Command app forwards shared gate headers', includesAll(founderApp, [
    'x-skye-gate-session',
    'x-free99-gate-session',
    'authorization: `Bearer ${token}`'
  ])),
  check('Mounted Founder/SuperIDE/SkyeHawk/SkyErrors files do not add app-local password forms', mountedPasswordForms.length === 0, { mountedPasswordForms })
];

const failures = results.filter((item) => !item.pass);
const receipt = {
  ok: failures.length === 0,
  generatedAt: new Date().toISOString(),
  scope: [
    'metraiyux_0s_site/cloudflare/worker.js',
    'metraiyux_0s_site/founder-command/',
    'metraiyux_0s_site/skyehawk/',
    'metraiyux_0s_site/skyerrors/'
  ],
  policy: 'AI-capable 0S surfaces must use the shared FS27/SkyGate/Free99 gate and route provider calls through the FS27 gateway or local deterministic fallback.',
  results,
  failures
};

await fsp.mkdir(artifactRoot, { recursive: true });
await fsp.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
await fsp.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ ok: receipt.ok, checks: results.length, failures: failures.length, receipt: path.relative(repoRoot, receiptPath), latest: path.relative(repoRoot, latestPath) }, null, 2));
if (!receipt.ok) process.exit(1);
