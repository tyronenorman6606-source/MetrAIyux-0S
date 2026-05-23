import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const ROOT_ENV = '/workspaces/MetrAIyux-0S/.env';
const REPO_ROOT = '/workspaces/MetrAIyux-0S';
const WRANGLER_CONFIG = 'metraiyux_0s_site/wrangler.toml';
const WORKER_NAME = process.env.ZERO_OS_WORKER_NAME || 'metraiyux-0s-full-system';

function unquote(value) {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

function sha12(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 12);
}

function tokenShaped(value) {
  return /^[A-Za-z0-9_.-]{20,}$/.test(String(value || ''));
}

function addCandidate(candidates, candidate) {
  if (!candidate.token || !candidate.account || !tokenShaped(candidate.token)) return;
  if (candidates.some((item) => item.token === candidate.token && item.account === candidate.account)) return;
  candidates.push(candidate);
}

function readCloudflareCandidates() {
  const lines = readFileSync(ROOT_ENV, 'utf8').split(/\r?\n/);
  const candidates = [];
  const formal = {};

  if (process.env.CLOUDFLARE_API_TOKEN && (process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID)) {
    addCandidate(candidates, {
      source: 'process-env:CLOUDFLARE_API_TOKEN',
      line: null,
      score: 90,
      token: process.env.CLOUDFLARE_API_TOKEN,
      account: process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID
    });
  }

  lines.forEach((raw, index) => {
    const line = index + 1;
    const assignment = raw.trim().match(/^(?:export\s+)?(CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID|CF_API_TOKEN|CF_ACCOUNT_ID)\s*=\s*(.*)$/);
    if (assignment) {
      formal[assignment[1]] = { value: unquote(assignment[2]), line };
    }

    const proseToken = raw.match(/Your API Token\s*=\s*"([^"]+)"/i);
    if (!proseToken) return;

    let account = '';
    let accountLine = null;
    for (let offset = 1; offset <= 4; offset += 1) {
      const accountMatch = (lines[index + offset] || '').match(/Account ID\s*=\s*"([^"]+)"/i);
      if (accountMatch) {
        account = accountMatch[1];
        accountLine = line + offset;
        break;
      }
    }

    const label = lines.slice(Math.max(0, index - 4), index).reverse().find((item) => item.trim())?.trim() || 'root-env-prose-token';
    addCandidate(candidates, {
      source: `root-env-prose:${label.slice(0, 64)}`,
      line,
      accountLine,
      score: /super\s+api\s+token/i.test(label) ? 110 : 50,
      token: proseToken[1],
      account
    });
  });

  addCandidate(candidates, {
    source: 'root-env:CLOUDFLARE_API_TOKEN',
    line: formal.CLOUDFLARE_API_TOKEN?.line,
    score: 80,
    token: formal.CLOUDFLARE_API_TOKEN?.value,
    account: formal.CLOUDFLARE_ACCOUNT_ID?.value || formal.CF_ACCOUNT_ID?.value
  });

  addCandidate(candidates, {
    source: 'root-env:CF_API_TOKEN',
    line: formal.CF_API_TOKEN?.line,
    score: 70,
    token: formal.CF_API_TOKEN?.value,
    account: formal.CF_ACCOUNT_ID?.value || formal.CLOUDFLARE_ACCOUNT_ID?.value
  });

  return candidates.sort((a, b) => b.score - a.score || (b.line || 0) - (a.line || 0));
}

async function cloudflareGet(candidate, path) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: {
      Authorization: `Bearer ${candidate.token}`,
      'Content-Type': 'application/json'
    }
  });
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  return {
    status: response.status,
    success: Boolean(body.success),
    errors: Array.isArray(body.errors) ? body.errors.map((error) => ({
      code: error.code,
      message: error.message
    })).slice(0, 3) : []
  };
}

async function resolveCloudflareEnv() {
  const candidates = readCloudflareCandidates();
  const failures = [];

  for (const candidate of candidates) {
    const verify = await cloudflareGet(candidate, '/user/tokens/verify');
    const service = await cloudflareGet(candidate, `/accounts/${candidate.account}/workers/services/${WORKER_NAME}`);

    const redacted = {
      source: candidate.source,
      line: candidate.line,
      accountLine: candidate.accountLine,
      tokenHash: sha12(candidate.token),
      accountSuffix: candidate.account.slice(-6),
      verify,
      service
    };

    if (service.success) {
      console.log(JSON.stringify({
        ok: true,
        using: {
          source: redacted.source,
          line: redacted.line,
          accountLine: redacted.accountLine,
          tokenHash: redacted.tokenHash,
          accountSuffix: redacted.accountSuffix,
          worker: WORKER_NAME,
          verifyStatus: verify.status,
          serviceStatus: service.status
        }
      }, null, 2));

      return {
        ...process.env,
        TMPDIR: '/tmp',
        WRANGLER_SEND_METRICS: 'false',
        WRANGLER_WRITE_LOGS: 'false',
        CLOUDFLARE_API_TOKEN: candidate.token,
        CLOUDFLARE_ACCOUNT_ID: candidate.account,
        CF_ACCOUNT_ID: candidate.account
      };
    }

    failures.push(redacted);
  }

  console.error(JSON.stringify({
    ok: false,
    error: `No Cloudflare token candidate could access Worker service ${WORKER_NAME}.`,
    failures
  }, null, 2));
  process.exit(1);
}

const result = spawnSync('npx', ['wrangler', 'deploy', '--config', WRANGLER_CONFIG], {
  cwd: REPO_ROOT,
  env: await resolveCloudflareEnv(),
  stdio: 'inherit'
});

process.exit(result.status ?? 1);
