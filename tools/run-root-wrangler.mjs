import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const wranglerVersion = process.env.WRANGLER_VERSION || '4.14.0';
const requestedEnvFile = process.env.ROOT_ENV_FILE || process.env.METRAIYUX_ROOT_ENV || '.env';

function resolveEnvFile(requested) {
  const candidates = [
    requested,
    path.join(path.dirname(requested), 'env.txt'),
    path.join(process.cwd(), 'env.txt'),
    path.resolve(process.cwd(), '..', 'env.txt'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env')
  ];
  const seen = new Set();
  for (const candidate of candidates) {
    const resolved = path.resolve(process.cwd(), candidate);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (fs.existsSync(resolved)) return resolved;
  }
  return requested;
}

const envFile = resolveEnvFile(requestedEnvFile);

function parseEnvRows(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).flatMap((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return [];
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) return [];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return [{ key: match[1], value, line: index + 1 }];
  });
}

const rows = parseEnvRows(envFile);
function parseProseCloudflareRows(file) {
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const found = [];
  lines.forEach((raw, index) => {
    const token = raw.match(/Your API Token\s*=\s*"([^"]+)"/i);
    if (!token) return;
    found.push({ key: 'CLOUDFLARE_API_TOKEN', value: token[1], line: index + 1, source: 'root-env-prose' });
  });
  return found;
}

const proseRows = parseProseCloudflareRows(envFile);
const allRows = [...rows, ...proseRows];
const rootEnv = {};
for (const row of rows) rootEnv[row.key] = row.value;

function valuesFor(pattern) {
  const seen = new Set();
  return allRows
    .filter((row) => pattern.test(row.key) && row.value)
    .filter((row) => {
      if (seen.has(row.value)) return false;
      seen.add(row.value);
      return true;
    });
}

async function probeToken(accountId, token, probe) {
  const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${accountId}/${probe.path}`);
  for (const [key, value] of Object.entries(probe.query || {})) url.searchParams.set(key, value);
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` }
  });
  const data = await res.json().catch(() => ({}));
  return res.ok && data.success;
}

function preferredTokenProbes(args) {
  const command = args.join(' ');
  if (/^pages(\s|$)/.test(command)) {
    return [
      { label: 'pages', path: 'pages/projects', query: { per_page: '1' } },
      { label: 'workers', path: 'workers/services', query: { per_page: '1' } },
      { label: 'd1', path: 'd1/database', query: { per_page: '1' } }
    ];
  }
  if (/^d1(\s|$)/.test(command)) {
    return [
      { label: 'd1', path: 'd1/database', query: { per_page: '1' } },
      { label: 'workers', path: 'workers/services', query: { per_page: '1' } },
      { label: 'pages', path: 'pages/projects', query: { per_page: '1' } }
    ];
  }
  const workerName = workerNameFromArgs(args);
  if (/^deploy(\s|$)/.test(command) && workerName) {
    return [
      { label: `worker:${workerName}`, path: `workers/services/${workerName}` },
      { label: 'workers', path: 'workers/services', query: { per_page: '1' } },
      { label: 'd1', path: 'd1/database', query: { per_page: '1' } },
      { label: 'pages', path: 'pages/projects', query: { per_page: '1' } }
    ];
  }
  return [
    { label: 'workers', path: 'workers/services', query: { per_page: '1' } },
    { label: 'd1', path: 'd1/database', query: { per_page: '1' } },
    { label: 'pages', path: 'pages/projects', query: { per_page: '1' } }
  ];
}

function workerNameFromArgs(args) {
  const configIndex = args.findIndex((arg) => arg === '--config' || arg === '-c');
  const configPath = configIndex >= 0 ? args[configIndex + 1] : 'wrangler.toml';
  if (!configPath) return '';
  const resolved = path.resolve(process.cwd(), configPath);
  if (!fs.existsSync(resolved)) return '';
  const match = fs.readFileSync(resolved, 'utf8').match(/^\s*name\s*=\s*"([^"]+)"/m);
  return match?.[1] || '';
}

async function chooseCloudflareToken(accountId, args) {
  const explicit = process.env.CLOUDFLARE_API_TOKEN;
  if (explicit && process.env.ROOT_WRANGLER_SKIP_PROBE === '1') {
    return { value: explicit, label: 'process.env:CLOUDFLARE_API_TOKEN' };
  }

  const candidates = valuesFor(/^CLOUDFLARE_API_TOKEN$|^cloudflare_api_token$/i);
  if (!accountId || !candidates.length) {
    return { value: explicit || rootEnv.CLOUDFLARE_API_TOKEN || '', label: 'fallback' };
  }

  const probes = preferredTokenProbes(args);
  for (const probe of probes) {
    for (const candidate of candidates) {
      try {
        if (await probeToken(accountId, candidate.value, probe)) {
          return { value: candidate.value, label: `${candidate.key}@line${candidate.line}:${probe.label}` };
        }
      } catch {
        // Try the next token/probe candidate.
      }
    }
  }

  return { value: explicit || rootEnv.CLOUDFLARE_API_TOKEN || '', label: 'fallback-no-d1-probe-pass' };
}

const accountFromRows = rows.find((row) => /^(METRAIYUX_0S_)?CLOUDFLARE_ACCOUNT_ID$/i.test(row.key) || /^CF_ACCOUNT_ID$/i.test(row.key))?.value || '';
const accountId = rootEnv.METRAIYUX_0S_CLOUDFLARE_ACCOUNT_ID || rootEnv.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || accountFromRows;
const wranglerArgs = process.argv.slice(2);
const selected = await chooseCloudflareToken(accountId, wranglerArgs);
const childEnv = {
  ...process.env,
  ...rootEnv,
  CLOUDFLARE_ACCOUNT_ID: accountId,
  CLOUDFLARE_API_TOKEN: selected.value,
  PLATFORM_ADMIN_TOKEN: rootEnv.PLATFORM_ADMIN_TOKEN || rootEnv.SKYGATEFS13_WORKER_ADMIN_TOKEN || process.env.PLATFORM_ADMIN_TOKEN || '',
  NO_COLOR: process.env.NO_COLOR || '1',
  WRANGLER_SEND_METRICS: process.env.WRANGLER_SEND_METRICS || 'false',
  CI: process.env.CI || '1'
};

if (!childEnv.CLOUDFLARE_ACCOUNT_ID || !childEnv.CLOUDFLARE_API_TOKEN) {
  console.error('Missing Cloudflare account/token after root env load.');
  process.exit(1);
}

console.error(`run-root-wrangler: using ${selected.label}`);

const args = ['-y', '-p', `wrangler@${wranglerVersion}`, 'wrangler', ...wranglerArgs];
const child = spawn('npx', args, { env: childEnv, stdio: 'inherit' });
child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`wrangler exited via ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});
