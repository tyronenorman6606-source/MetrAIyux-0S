import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const ROOT_ENV = '/workspaces/MetrAIyux-0S/.env';
const SITE_DIR = '/workspaces/MetrAIyux-0S/metraiyux_0s_site';
const WRANGLER = '/home/codespace/.npm/_npx/32026684e21afda6/node_modules/.bin/wrangler';

function unquote(value) {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

function cloudflareEnv() {
  const env = {
    ...process.env,
    TMPDIR: '/tmp',
    WRANGLER_SEND_METRICS: 'false',
    WRANGLER_WRITE_LOGS: 'false'
  };
  for (const raw of readFileSync(ROOT_ENV, 'utf8').split(/\r?\n/)) {
    const match = raw.trim().match(/^(?:export\s+)?(CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID|CF_API_TOKEN|CF_ACCOUNT_ID)\s*=\s*(.*)$/);
    if (!match) continue;
    env[match[1]] = unquote(match[2]);
  }
  return env;
}

const result = spawnSync(WRANGLER, ['deploy', '--config', 'wrangler.toml'], {
  cwd: SITE_DIR,
  env: cloudflareEnv(),
  stdio: 'inherit'
});

process.exit(result.status ?? 1);
