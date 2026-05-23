import fs from 'node:fs';
import { spawn } from 'node:child_process';

const wranglerVersion = process.env.WRANGLER_VERSION || '4.14.0';
const envFile = process.env.ROOT_ENV_FILE || '.env';

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
const rootEnv = {};
for (const row of rows) rootEnv[row.key] = row.value;

function valuesFor(pattern) {
  const seen = new Set();
  return rows
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
  return [
    { label: 'workers', path: 'workers/services', query: { per_page: '1' } },
    { label: 'd1', path: 'd1/database', query: { per_page: '1' } },
    { label: 'pages', path: 'pages/projects', query: { per_page: '1' } }
  ];
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
  for (const candidate of candidates) {
    for (const probe of probes) {
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

const accountId = rootEnv.METRAIYUX_0S_CLOUDFLARE_ACCOUNT_ID || rootEnv.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '';
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

const args = ['-y', `wrangler@${wranglerVersion}`, ...wranglerArgs];
const child = spawn('npx', args, { env: childEnv, stdio: 'inherit' });
child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`wrangler exited via ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});
