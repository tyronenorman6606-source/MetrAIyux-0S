#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const apiBase = process.env.CLOUDFLARE_API_BASE_URL || 'https://api.cloudflare.com/client/v4';
const artifactDir = path.join(repoRoot, 'test-artifacts', 'deployment-agent');

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  const hit = process.argv.find((item) => item.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1] || fallback;
  return fallback;
}

function unquote(value) {
  const text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return text.slice(1, -1);
  return text;
}

function tokenShaped(value) {
  return /^[A-Za-z0-9_.-]{20,}$/.test(String(value || ''));
}

function sha12(value) {
  return createHash('sha256').update(String(value || '')).digest('hex').slice(0, 12);
}

function addCandidate(candidates, candidate) {
  if (!candidate.token || !candidate.account || !tokenShaped(candidate.token)) return;
  if (candidates.some((item) => item.token === candidate.token && item.account === candidate.account)) return;
  candidates.push(candidate);
}

function rootEnvFiles() {
  const files = [
    process.env.ROOT_ENV_FILE,
    process.env.METRAIYUX_ROOT_ENV,
    path.join(repoRoot, '.env'),
    path.join(repoRoot, 'env.txt'),
    '/workspaces/MetrAIyux-0S/.env',
    '/workspaces/MetrAIyux-0S/env.txt'
  ].filter(Boolean);
  return [...new Set(files.map((file) => path.resolve(file)))].filter((file) => fs.existsSync(file));
}

function readCloudflareCandidates() {
  const candidates = [];

  addCandidate(candidates, {
    source: 'process-env:CLOUDFLARE_API_TOKEN',
    line: null,
    score: 100,
    token: process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN,
    account: process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID
  });

  for (const envPath of rootEnvFiles()) {
    const labelPrefix = path.relative(repoRoot, envPath) || path.basename(envPath);
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    const formal = {};

    lines.forEach((raw, index) => {
      const line = index + 1;
      const assignment = raw.trim().match(/^(?:export\s+)?(CLOUDFLARE_API_TOKEN|CLOUDFLARE_DEPLOY_API_TOKEN|CLOUDFLARE_MANAGEMENT_API_TOKEN|CLOUDFLARE_ACCOUNT_ID|CF_API_TOKEN|CF_ACCOUNT_ID|METRAIYUX_0S_CLOUDFLARE_ACCOUNT_ID)\s*=\s*(.*)$/);
      if (assignment) formal[assignment[1]] = { value: unquote(assignment[2]), line };

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

      const label = lines.slice(Math.max(0, index - 4), index).reverse().find((item) => item.trim())?.trim() || `${labelPrefix}-prose-token`;
      addCandidate(candidates, {
        source: `${labelPrefix}:prose:${label.slice(0, 64)}`,
        line,
        accountLine,
        score: /super\s+api\s+token|pages|deploy|worker/i.test(label) ? 120 : 60,
        token: proseToken[1],
        account
      });
    });

    const formalAccount = formal.CLOUDFLARE_ACCOUNT_ID?.value || formal.CF_ACCOUNT_ID?.value || formal.METRAIYUX_0S_CLOUDFLARE_ACCOUNT_ID?.value;
    addCandidate(candidates, {
      source: `${labelPrefix}:CLOUDFLARE_DEPLOY_API_TOKEN`,
      line: formal.CLOUDFLARE_DEPLOY_API_TOKEN?.line,
      score: 115,
      token: formal.CLOUDFLARE_DEPLOY_API_TOKEN?.value,
      account: formalAccount
    });
    addCandidate(candidates, {
      source: `${labelPrefix}:CLOUDFLARE_API_TOKEN`,
      line: formal.CLOUDFLARE_API_TOKEN?.line,
      score: 90,
      token: formal.CLOUDFLARE_API_TOKEN?.value,
      account: formalAccount
    });
    addCandidate(candidates, {
      source: `${labelPrefix}:CF_API_TOKEN`,
      line: formal.CF_API_TOKEN?.line,
      score: 80,
      token: formal.CF_API_TOKEN?.value,
      account: formalAccount
    });
  }

  return candidates.sort((a, b) => b.score - a.score || (b.line || 0) - (a.line || 0));
}

async function cfGet(candidate, endpoint) {
  const response = await fetch(`${apiBase}${endpoint}`, {
    headers: {
      authorization: `Bearer ${candidate.token}`,
      'content-type': 'application/json'
    }
  }).catch((error) => ({ error }));
  if (response.error) return { ok: false, status: 0, error: response.error.message };
  const body = await response.json().catch(() => ({}));
  return {
    ok: response.ok && body.success !== false,
    status: response.status,
    success: Boolean(body.success),
    errors: Array.isArray(body.errors) ? body.errors.map((error) => ({ code: error.code || null, message: error.message || String(error) })).slice(0, 3) : []
  };
}

async function probeCandidate(candidate, { project, worker }) {
  const verify = await cfGet(candidate, '/user/tokens/verify');
  const pagesProject = await cfGet(candidate, `/accounts/${candidate.account}/pages/projects/${encodeURIComponent(project)}`);
  const zeroOsWorker = await cfGet(candidate, `/accounts/${candidate.account}/workers/services/${encodeURIComponent(worker)}`);
  return {
    source: candidate.source,
    line: candidate.line,
    accountLine: candidate.accountLine,
    tokenHash: sha12(candidate.token),
    accountSuffix: String(candidate.account).slice(-6),
    verify,
    pagesProject,
    zeroOsWorker,
    usableForPages: pagesProject.ok === true,
    usableForWorker: zeroOsWorker.ok === true
  };
}

async function diagnose({ project, worker }) {
  const candidates = readCloudflareCandidates();
  const probes = [];
  let selected = null;
  for (const candidate of candidates) {
    const probe = await probeCandidate(candidate, { project, worker });
    probes.push(probe);
    if (!selected && (probe.usableForPages || probe.usableForWorker)) {
      selected = { candidate, probe };
    }
  }
  return {
    ok: Boolean(selected),
    agent: 'skyenet-deployment-agent',
    mode: 'diagnose',
    project,
    worker,
    selected: selected ? selected.probe : null,
    probes
  };
}

function writeReceipt(mode, receipt) {
  fs.mkdirSync(artifactDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(artifactDir, `${stamp}-${mode}.json`);
  fs.writeFileSync(file, `${JSON.stringify({ ...receipt, receiptPath: path.relative(repoRoot, file), finishedAt: new Date().toISOString() }, null, 2)}\n`);
  return file;
}

async function deployPages({ project, dir, worker }) {
  const diagnosis = await diagnose({ project, worker });
  if (!diagnosis.selected?.usableForPages) {
    return { ok: false, mode: 'deploy-pages', project, dir, error: 'no_cloudflare_candidate_can_access_pages_project', diagnosis };
  }
  const selectedProbe = diagnosis.selected;
  const selectedCandidate = readCloudflareCandidates().find((candidate) => sha12(candidate.token) === selectedProbe.tokenHash && String(candidate.account).endsWith(selectedProbe.accountSuffix));
  const env = {
    ...process.env,
    PAGES_PROJECT: project,
    PAGES_DIR: dir,
    PAGES_COMMIT_MESSAGE: `SkyeNet Deployment Agent deploy ${project}`,
    CLOUDFLARE_API_TOKEN: selectedCandidate.token,
    CLOUDFLARE_ACCOUNT_ID: selectedCandidate.account
  };
  const result = spawnSync('node', ['tools/cloudflare-pages-direct-upload.mjs'], { cwd: repoRoot, env, encoding: 'utf8' });
  return {
    ok: result.status === 0,
    mode: 'deploy-pages',
    project,
    dir,
    selected: selectedProbe,
    status: result.status,
    stdout: result.stdout.slice(-4000),
    stderr: result.stderr.slice(-4000)
  };
}

function selectedCandidateFromProbe(probe) {
  return readCloudflareCandidates().find((candidate) => sha12(candidate.token) === probe.tokenHash && String(candidate.account).endsWith(probe.accountSuffix));
}

function safeOutput(value, candidate) {
  return String(value || '')
    .replaceAll(candidate.token, '[redacted-token]')
    .replaceAll(candidate.account, '[redacted-account]')
    .slice(-4000);
}

function putWorkerSecret({ worker, name, value, candidate }) {
  const env = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: candidate.token,
    CLOUDFLARE_ACCOUNT_ID: candidate.account
  };
  const result = spawnSync('npx', ['wrangler@4.14.0', 'secret', 'put', name, '--name', worker], {
    cwd: repoRoot,
    env,
    input: `${value}\n`,
    encoding: 'utf8'
  });
  return {
    name,
    ok: result.status === 0,
    status: result.status,
    stdout: safeOutput(result.stdout, candidate),
    stderr: safeOutput(result.stderr, candidate)
  };
}

async function syncWorkerSecrets({ project, worker }) {
  const diagnosis = await diagnose({ project, worker });
  if (!diagnosis.selected?.usableForWorker) {
    return { ok: false, mode: 'sync-worker-secrets', project, worker, error: 'no_cloudflare_candidate_can_access_worker', diagnosis };
  }
  const selectedCandidate = selectedCandidateFromProbe(diagnosis.selected);
  if (!selectedCandidate) {
    return { ok: false, mode: 'sync-worker-secrets', project, worker, error: 'selected_candidate_not_found', selected: diagnosis.selected };
  }
  const writes = [
    putWorkerSecret({ worker, name: 'CLOUDFLARE_DEPLOY_API_TOKEN', value: selectedCandidate.token, candidate: selectedCandidate }),
    putWorkerSecret({ worker, name: 'CLOUDFLARE_ACCOUNT_ID', value: selectedCandidate.account, candidate: selectedCandidate })
  ];
  return {
    ok: writes.every((item) => item.ok),
    mode: 'sync-worker-secrets',
    project,
    worker,
    selected: diagnosis.selected,
    writes,
    boundary: 'Secrets were sent to Cloudflare Workers secret storage through Wrangler stdin; raw values are not written to receipts or stdout.'
  };
}

async function fetchStatus(target) {
  const spec = typeof target === 'string' ? { url: target, contains: [] } : target;
  const url = spec.url;
  const started = Date.now();
  const response = await fetch(url, { headers: { 'user-agent': 'skyenet-deployment-agent/1.0' } }).catch((error) => ({ error }));
  if (response.error) return { url, ok: false, status: 0, ms: Date.now() - started, error: response.error.message };
  const text = await response.text().catch(() => '');
  const contains = Array.isArray(spec.contains) ? spec.contains : [];
  const missing = contains.filter((fragment) => !text.includes(fragment));
  return { url, ok: response.ok && missing.length === 0, status: response.status, ms: Date.now() - started, bytes: text.length, missing };
}

async function smokeDevooderator() {
  const urls = [
    {
      url: 'https://devooderator.pages.dev/',
      contains: ['blog/2026-05-29-0s-production-closure-gate-repair.html']
    },
    {
      url: 'https://devooderator.pages.dev/blog/2026-05-29-0s-production-closure-gate-repair',
      contains: [
        'The 0S got a real production closure pass today',
        'e4e69cb7-768a-4266-862e-4cd2ec5de685',
        'Production closure receipt',
        'SkyeProfitConsole',
        'Admin Brain automation',
        'Real closure is not all-green theater'
      ]
    },
    {
      url: 'https://devooderator.pages.dev/blog/2026-05-27-bobs-skynet-sovereign-client-app.html',
      contains: [
        "Bob's Smoke Shop is live on SkyeNet",
        'test-artifacts/bobs-skynet-live-browser/2026-05-27T22-59-32-141Z/receipt.json',
        'conv_bd40795b-4f60-4f54-a775-53b5c417b58f',
        'npm run 0s:skyenet:functions-proof',
        'Unrestricted arbitrary customer functions'
      ]
    },
    {
      url: 'https://devooderator.pages.dev/blog/2026-05-26-valley-verified-static-closure.html',
      contains: [
        '339</b>published static business pages',
        '0</b>generated business pages remaining',
        'afc3d848-7325-4d8d-8155-2118fc00f0da',
        'valley-verified-worker-deploy-receipt.json',
        'dep_valley_verified_20260527_1709',
        'valley-verified-skynet-citadeldb-live-proof-latest.json'
      ]
    },
    {
      url: 'https://devooderator.pages.dev/sitemap.xml',
      contains: [
        'blog/2026-05-29-0s-production-closure-gate-repair',
        'blog/2026-05-27-bobs-skynet-sovereign-client-app',
        'blog/2026-05-26-valley-verified-static-closure'
      ]
    },
    'https://devooderator.pages.dev/mirrors/business-cards',
    'https://devooderator.pages.dev/assets/vendor/qrcode-generator.js',
    'https://devooderator.pages.dev/assets/valley-verified/businesses-lite.json'
  ];
  const checks = await Promise.all(urls.map(fetchStatus));
  return { ok: checks.every((item) => item.ok), mode: 'smoke-devooderator', checks };
}

async function stressDevooderator() {
  const urls = [
    'https://devooderator.pages.dev/',
    'https://devooderator.pages.dev/mirrors/business-cards'
  ];
  const requests = [];
  for (let index = 0; index < 80; index += 1) requests.push(fetchStatus(urls[index % urls.length]));
  const checks = await Promise.all(requests);
  const failures = checks.filter((item) => !item.ok);
  const sortedMs = checks.map((item) => item.ms).sort((a, b) => a - b);
  return {
    ok: failures.length === 0,
    mode: 'stress-devooderator',
    total: checks.length,
    failures,
    p50_ms: sortedMs[Math.floor(sortedMs.length * 0.5)] || 0,
    p95_ms: sortedMs[Math.floor(sortedMs.length * 0.95)] || 0,
    max_ms: sortedMs.at(-1) || 0
  };
}

const mode = process.argv[2] || 'diagnose';
const project = arg('project', 'devooderator');
const dir = arg('dir', 'marketing/devooderator');
const worker = arg('worker', 'metraiyux-0s-full-system');

let receipt;
if (mode === 'diagnose') receipt = await diagnose({ project, worker });
else if (mode === 'deploy-pages') receipt = await deployPages({ project, dir, worker });
else if (mode === 'sync-worker-secrets') receipt = await syncWorkerSecrets({ project, worker });
else if (mode === 'smoke-devooderator') receipt = await smokeDevooderator();
else if (mode === 'stress-devooderator') receipt = await stressDevooderator();
else receipt = { ok: false, mode, error: 'unknown_deployment_agent_mode' };

const receiptPath = writeReceipt(mode, receipt);
console.log(JSON.stringify({ ...receipt, receiptPath: path.relative(repoRoot, receiptPath) }, null, 2));
process.exit(receipt.ok ? 0 : 1);
