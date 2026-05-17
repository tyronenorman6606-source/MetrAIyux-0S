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

async function chooseCloudflareToken(accountId) {
  const explicit = process.env.CLOUDFLARE_API_TOKEN;
  if (explicit && process.env.ROOT_WRANGLER_SKIP_PROBE === '1') {
    return { value: explicit, label: 'process.env:CLOUDFLARE_API_TOKEN' };
  }

  const candidates = valuesFor(/^CLOUDFLARE_API_TOKEN$|^cloudflare_api_token$/i);
  if (!accountId || !candidates.length) {
    return { value: explicit || rootEnv.CLOUDFLARE_API_TOKEN || '', label: 'fallback' };
  }

  for (const candidate of candidates) {
    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database?per_page=1`, {
        headers: { authorization: `Bearer ${candidate.value}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { value: candidate.value, label: `${candidate.key}@line${candidate.line}` };
      }
    } catch {
      // Try the next token candidate.
    }
  }

  return { value: explicit || rootEnv.CLOUDFLARE_API_TOKEN || '', label: 'fallback-no-d1-probe-pass' };
}

const accountId = rootEnv.METRAIYUX_0S_CLOUDFLARE_ACCOUNT_ID || rootEnv.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || '';
const selected = await chooseCloudflareToken(accountId);
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

const args = ['-y', `wrangler@${wranglerVersion}`, ...process.argv.slice(2)];
const child = spawn('npx', args, { env: childEnv, stdio: 'inherit' });
child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`wrangler exited via ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 0);
});
