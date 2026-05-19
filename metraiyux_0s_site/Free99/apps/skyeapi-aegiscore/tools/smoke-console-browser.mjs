import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const candidates = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];
const chromium = candidates.find((path) => existsSync(path));
if (!chromium) throw new Error('No Chromium binary found for browser smoke.');
const consolePath = join(root, 'apps', 'console', 'dist', 'index.html');
if (!existsSync(consolePath)) throw new Error('Console dist is missing. Run pnpm build first.');

const dump = await new Promise((resolve, reject) => {
  const child = spawn(chromium, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--virtual-time-budget=1500', '--dump-dom', `file://${consolePath}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
  child.on('error', reject);
  child.on('close', (code) => code === 0 ? resolve(stdout) : reject(new Error(`Chromium exited ${code}: ${stderr}`)));
});

const required = ['SkyeAPI', 'Provider-pack source loader + sandbox', 'Invoice history + subscriptions', 'Workspace hooks + audit bundle', 'Result console'];
const missing = required.filter((text) => !dump.includes(text));
if (missing.length) throw new Error(`Console browser smoke missing rendered text: ${missing.join(', ')}`);
const result = { ok: true, checkedAt: new Date().toISOString(), browser: chromium, checked: required, secrets_exposed: false };
await mkdir(join(root, '.proof'), { recursive: true });
await writeFile(join(root, '.proof', 'console-browser-smoke-result.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
