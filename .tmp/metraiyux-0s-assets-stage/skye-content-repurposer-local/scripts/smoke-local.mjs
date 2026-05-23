import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const required = [
  'server.js',
  'package.json',
  '.env.example',
  'public/index.html',
  'public/styles.css',
  'public/gate-session.js',
  'public/mcp-effects.js',
  'public/app.js',
  'public/skye-content-forge-logo.svg',
  'docs/SETUP.md',
  'docs/LEGAL_AND_COPYRIGHT_NOTES.md',
  'docs/PUBLISHING_ARCHITECTURE.md',
  'docs/LIVE_ALWAYS_ON_DEPLOYMENT.md',
  'Dockerfile',
  'docker-compose.yml',
  '.github/workflows/skye-content-automation.yml',
  'cloudflare/scheduler-worker.mjs',
  'cloudflare/wrangler.toml',
  'netlify/functions/skye-content-scheduler.mjs',
  'ops/skye-content-forge.service',
  'ops/pm2.ecosystem.cjs',
  'scripts/run-scheduler-once.mjs',
  'README.md'
];

for (const file of required) {
  const full = path.join(root, file);
  if (!existsSync(full)) throw new Error(`Missing required file: ${file}`);
}

await fs.mkdir(path.join(root, 'data'), { recursive: true });
await fs.mkdir(path.join(root, 'exports'), { recursive: true });
const envPath = path.join(root, '.env');
const createdTempEnv = !existsSync(envPath);
if (createdTempEnv) {
  await fs.writeFile(envPath, 'PORT=4399\nOPENAI_MODEL=gpt-5.4-mini\nEXPORT_DIR=exports\nAPP_ACCESS_TOKEN=FREE99-CONTENT-LOCAL\nSCHEDULER_API_KEY=FREE99-CONTENT-LOCAL\n');
}

const authHeaders = {
  'X-App-Token': 'FREE99-CONTENT-LOCAL',
  'X-Skye-Gate-Session': 'FREE99-CONTENT-LOCAL'
};

const child = spawn(process.execPath, ['server.js'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: '4399',
    EXPORT_DIR: 'exports',
    APP_ACCESS_TOKEN: process.env.APP_ACCESS_TOKEN || 'FREE99-CONTENT-LOCAL',
    SCHEDULER_API_KEY: process.env.SCHEDULER_API_KEY || 'FREE99-CONTENT-LOCAL'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let logs = '';
child.stdout.on('data', (chunk) => { logs += chunk.toString(); });
child.stderr.on('data', (chunk) => { logs += chunk.toString(); });

try {
  await waitForServer('http://localhost:4399/', 7000);
  const ungated = await fetch('http://localhost:4399/api/health');
  if (ungated.status !== 401) throw new Error(`Ungated health should be rejected with 401, got ${ungated.status}`);

  const health = await fetch('http://localhost:4399/api/health', { headers: authHeaders }).then((res) => res.json());
  if (!health.ok) throw new Error('Health endpoint did not return ok:true');
  if (!Array.isArray(health.sources) || health.sources.length < 8) throw new Error('Source registry did not expose all expected sources');

  const sourceRegistry = await fetch('http://localhost:4399/api/sources', { headers: authHeaders }).then((res) => res.json());
  if (!sourceRegistry.ok || sourceRegistry.sources.length < 8) throw new Error('Sources endpoint failed');

  const exportStatus = await fetch('http://localhost:4399/api/export/status', { headers: authHeaders }).then((res) => res.json());
  if (!exportStatus.ok || !exportStatus.local?.exportDir) throw new Error('Export status endpoint failed');

  const pipeline = await fetch('http://localhost:4399/api/pipeline/status', { headers: authHeaders }).then((res) => res.json());
  if (!pipeline.ok || !pipeline.status?.targets?.github) throw new Error('Pipeline status endpoint failed');

  const queue = await fetch('http://localhost:4399/api/publish/queue', { headers: authHeaders }).then((res) => res.json());
  if (!queue.ok || !Array.isArray(queue.queue)) throw new Error('Publish queue endpoint failed');

  const runtime = await fetch('http://localhost:4399/api/runtime/status', { headers: authHeaders }).then((res) => res.json());
  if (!runtime.ok || !runtime.runtime?.schedulerEndpoint || !runtime.backup || runtime.runtime.gateSessionRequired !== true) throw new Error('Runtime status endpoint failed');

  const tick = await fetch('http://localhost:4399/api/automation/tick', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ source: 'smoke-test', dryRun: true, backup: false })
  }).then((res) => res.json());
  if (!tick.ok || !tick.publisher) throw new Error('Automation tick endpoint failed');

  const rebuild = await fetch('http://localhost:4399/api/site/rebuild', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ includeQueued: true })
  }).then((res) => res.json());
  if (!rebuild.ok || !rebuild.site?.files?.includes('index.html')) throw new Error('Static site rebuild route failed');

  const exportResponse = await fetch('http://localhost:4399/api/export/local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ title: 'Smoke Test Export', output: '# Smoke Test\n\nLocal export route works.' })
  }).then((res) => res.json());
  if (!exportResponse.ok || !exportResponse.export?.relativePath) throw new Error('Local export route failed');

  const index = await fetch('http://localhost:4399/').then((res) => res.text());
  if (!index.includes('Skye Content Forge')) throw new Error('Index page did not render expected app name');
  if (!index.includes('Google Drive')) throw new Error('Index page does not include Drive export UI');
  if (!index.includes('Schedule Publish')) throw new Error('Index page does not include publisher UI');
  if (!index.includes('Runtime + recovery')) throw new Error('Index page does not include always-on recovery UI');
  if (!index.includes('gate-session.js')) throw new Error('Index page does not load gate session script');
  if (!index.includes('mcp-effects.js')) throw new Error('Index page does not load MCP browser effects script');
  if (!index.includes('Free99 means no charge')) throw new Error('Index page does not explain Free99 no-charge boundary');

  const draftsPath = path.join(root, 'data', 'drafts.json');
  if (!existsSync(draftsPath)) throw new Error('Drafts storage was not created');

  console.log('✅ Smoke passed: files exist, server starts, health works, source registry works, export route works, publisher routes work, automation tick works, runtime status works, static rebuild works, frontend renders, storage exists, always-on templates exist.');
  console.log(`AI configured in this smoke run: ${health.keyConfigured ? 'yes' : 'no'}`);
  console.log(`Google Drive configured in this smoke run: ${health.googleDrive?.configured ? 'yes' : 'no'}`);
} finally {
  child.kill('SIGTERM');
  if (createdTempEnv) await fs.rm(envPath, { force: true });
}

async function waitForServer(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error(`Server did not start in time. Logs:\n${logs}`);
}
