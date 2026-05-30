#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const pagesBase = (process.env.VALLEY_VERIFIED_PAGES_BASE || 'https://valley-verified.pages.dev').replace(/\/+$/, '');
const deployBase = (process.env.VALLEY_VERIFIED_DEPLOY_BASE || 'https://f516cb6b.valley-verified.pages.dev').replace(/\/+$/, '');
const workerBase = (process.env.ZERO_OS_WORKER_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const workerVersionId = process.env.ZERO_OS_WORKER_VERSION || arg('worker-version');
const pagesDeploymentId = process.env.VALLEY_VERIFIED_PAGES_DEPLOYMENT_ID || 'f516cb6b-e0f7-4027-be1e-922f2322ae21';
const sample = '/business/bobs-smoke-shop-litchfield-park/';
const artifactDir = path.join(repoRoot, 'test-artifacts', 'cloudflare-pages');
const zeroOsDir = path.join(repoRoot, 'test-artifacts', '0s-browser-end-to-end');
const latestReceiptPath = path.join(artifactDir, 'valley-verified-no-generated-business-pages-http-smoke.json');
const workerReceiptPath = path.join(zeroOsDir, 'valley-verified-worker-deploy-receipt.json');
const proofPath = path.join(repoRoot, 'metraiyux_0s_site/_platform-sources/valley-verified/proof/no-generated-business-pages.json');
const mountReceiptPath = path.join(repoRoot, 'metraiyux_0s_site/valley-verified/MOUNTED_IN_0S.json');
const distRoot = path.join(repoRoot, 'metraiyux_0s_site/_platform-sources/valley-verified/dist');
const mountRoot = path.join(repoRoot, 'metraiyux_0s_site/valley-verified');
const mountBusinessDir = path.join(repoRoot, 'metraiyux_0s_site/valley-verified/business');
const distBusinessDir = path.join(repoRoot, 'metraiyux_0s_site/_platform-sources/valley-verified/dist/business');

function arg(name, fallback = '') {
  const prefix = `--${name}=`;
  const hit = process.argv.find((item) => item.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function businessPageCount(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  let count = 0;
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'page') continue;
    if (await exists(path.join(dir, entry.name, 'index.html'))) count += 1;
  }
  return count;
}

async function walkFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walkFiles(file));
    else if (entry.isFile()) out.push(file);
  }
  return out;
}

async function fetchText(url, options = {}) {
  let last = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const started = Date.now();
    const response = await fetch(url, {
      redirect: options.redirect || 'follow',
      headers: { 'user-agent': 'valley-verified-no-generated-live-smoke/1.0' },
      signal: AbortSignal.timeout(30000)
    }).catch((error) => ({ error }));
    if (response.error) {
      last = { url, ok: false, status: 0, attempts: attempt, ms: Date.now() - started, error: response.error.message, text: '' };
    } else {
      const text = await response.text().catch(() => '');
      last = {
        url,
        ok: response.ok,
        status: response.status,
        attempts: attempt,
        ms: Date.now() - started,
        location: response.headers.get('location') || '',
        bytes: text.length,
        text
      };
      if (response.status !== 429 && response.status < 500) break;
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }
  return last;
}

function cleanFetch(record) {
  const { text, ok, ...rest } = record;
  return rest;
}

function includesAll(text, fragments) {
  return fragments.every((fragment) => text.includes(fragment));
}

function excludesAll(text, fragments) {
  const lower = text.toLowerCase();
  return fragments.every((fragment) => !lower.includes(fragment));
}

async function scanPublicCopy() {
  const banned = [
    'generated business profile',
    'generated company page',
    'generated profile page',
    'profile-template-preview',
    'profile-template-options'
  ];
  const matches = [];
  for (const root of [distRoot, mountRoot]) {
    const files = (await walkFiles(root)).filter((file) => /\.(html|json|txt|xml)$/i.test(file));
    for (const file of files) {
      const lower = (await fs.readFile(file, 'utf8')).toLowerCase();
      for (const fragment of banned) {
        if (lower.includes(fragment)) {
          matches.push({ file: path.relative(repoRoot, file), fragment });
          break;
        }
      }
    }
  }
  return matches;
}

const checkedAt = new Date().toISOString();
const proof = await readJson(proofPath, {});
const mount = await readJson(mountReceiptPath, {});
const distBusinessPages = await businessPageCount(distBusinessDir);
const mountedBusinessPages = await businessPageCount(mountBusinessDir);
const publicCopyMatches = await scanPublicCopy();
const fallbackFiles = [
  'business-profile/index.html',
  '_redirects',
  'profile-template-preview/index.html',
  'data/profile-template-options.json'
];
const mountedFallbackPresent = [];
for (const rel of fallbackFiles) {
  if (await exists(path.join(repoRoot, 'metraiyux_0s_site/valley-verified', rel))) mountedFallbackPresent.push(rel);
}

const checks = [];

const pagesHome = await fetchText(`${pagesBase}/`);
checks.push({
  label: 'pages canonical home clean copy',
  ok: pagesHome.status === 200 && includesAll(pagesHome.text, ['Verified business pages']) && excludesAll(pagesHome.text, ['generated business profiles']),
  ...cleanFetch(pagesHome)
});

const deployHome = await fetchText(`${deployBase}/`);
checks.push({
  label: 'pages deploy home clean copy',
  ok: deployHome.status === 200 && includesAll(deployHome.text, ['Verified business pages']) && excludesAll(deployHome.text, ['generated business profiles']),
  ...cleanFetch(deployHome)
});

const pagesSample = await fetchText(`${pagesBase}${sample}`);
checks.push({
  label: 'pages sample business static skyemail',
  ok: pagesSample.status === 200
    && includesAll(pagesSample.text, ['data-static-hand-page="true"', 'Accept SkyEmail'])
    && excludesAll(pagesSample.text, ['generated company template', 'generated business profile', 'generated company page', 'generated profile page', 'profile-template-preview', 'profile-template-options']),
  ...cleanFetch(pagesSample)
});

const pagesCity = await fetchText(`${pagesBase}/city/phoenix/`);
checks.push({
  label: 'pages city hub says static business pages',
  ok: pagesCity.status === 200
    && includesAll(pagesCity.text, ['static business pages'])
    && excludesAll(pagesCity.text, ['generated profile pages']),
  ...cleanFetch(pagesCity)
});

const deployCity = await fetchText(`${deployBase}/city/phoenix/`);
checks.push({
  label: 'pages deploy city hub says static business pages',
  ok: deployCity.status === 200
    && includesAll(deployCity.text, ['static business pages'])
    && excludesAll(deployCity.text, ['generated profile pages']),
  ...cleanFetch(deployCity)
});

const policyRecord = await fetchText(`${pagesBase}/data/static-page-policy.json`);
let policy = {};
try {
  policy = JSON.parse(policyRecord.text || '{}');
} catch {
  policy = {};
}
checks.push({
  label: 'pages static policy disables generated profiles',
  ok: policyRecord.status === 200 && policy.generated_profile_pages_enabled === false,
  generated_profile_pages_enabled: policy.generated_profile_pages_enabled,
  ...cleanFetch(policyRecord)
});

for (const route of ['/business-profile/', '/profile-template-preview/', '/data/profile-template-options.json']) {
  const record = await fetchText(`${pagesBase}${route}`, { redirect: 'manual' });
  checks.push({
    label: `pages fallback gone ${route}`,
    ok: record.status === 404,
    ...cleanFetch(record)
  });
}

for (const route of ['/valley-verified/', `/valley-verified${sample}`]) {
  const record = await fetchText(`${workerBase}${route}`, { redirect: 'manual' });
  checks.push({
    label: `0S gated ${route}`,
    ok: record.status === 302 && /\/admin\/login\.html/.test(record.location),
    ...cleanFetch(record)
  });
}

checks.push({
  label: 'local mounted Valley business count matches generated-proof count',
  ok: proof.businessCount === 339 && distBusinessPages === 339 && mountedBusinessPages === 339,
  proofBusinessCount: proof.businessCount,
  distBusinessPages,
  mountedBusinessPages
});

checks.push({
  label: 'local mounted fallback artifacts absent and sync fallback disabled',
  ok: mountedFallbackPresent.length === 0 && mount.profile_fallbacks === 'disabled',
  mountedFallbackPresent,
  profile_fallbacks: mount.profile_fallbacks
});

checks.push({
  label: 'latest no-generated proof is clean',
  ok: proof.ok === true
    && proof.generatedBusinessPagesRemaining === 0
    && proof.generatedFallbackArtifactsPresent === 0
    && proof.skyemailAcceptanceRequired === true,
  proofCheckedAt: proof.checkedAt,
  generatedBusinessPagesRemaining: proof.generatedBusinessPagesRemaining,
  generatedFallbackArtifactsPresent: proof.generatedFallbackArtifactsPresent,
  skyemailAcceptanceRequired: proof.skyemailAcceptanceRequired
});

checks.push({
  label: 'local dist and 0S mount contain no generated/fallback public copy',
  ok: publicCopyMatches.length === 0,
  matchCount: publicCopyMatches.length,
  sampleMatches: publicCopyMatches.slice(0, 20)
});

const receipt = {
  ok: checks.every((check) => check.ok),
  schema: 'metraiyux.valley-verified.no-generated-business-pages.http-smoke.v1',
  checkedAt,
  pagesBase,
  deployBase,
  pagesDeploymentId,
  workerBase,
  workerVersionId,
  sample,
  proofPath: path.relative(repoRoot, proofPath),
  proofCheckedAt: proof.checkedAt,
  mountReceiptPath: path.relative(repoRoot, mountReceiptPath),
  mountedAt: mount.mounted_at,
  browserProof: 'not-run-owner-manual-browser-verification-policy',
  checks
};

const stamp = checkedAt.replace(/[:.]/g, '-');
const timestampedReceiptPath = path.join(artifactDir, `valley-verified-no-generated-business-pages-http-smoke-${stamp}.json`);
const workerReceipt = {
  ok: receipt.ok,
  schema: 'metraiyux.0s.valley-verified.worker-deploy-receipt.v1',
  checkedAt,
  workerBase,
  workerVersionId,
  deployedCommand: 'npm run 0s:worker:deploy',
  mountedAt: mount.mounted_at,
  valleyProofCheckedAt: proof.checkedAt,
  changedSurfaces: [
    '/valley-verified/',
    '/valley-verified/business/bobs-smoke-shop-litchfield-park/',
    '/valley-verified/MOUNTED_IN_0S.json'
  ],
  smokeReceipt: path.relative(repoRoot, latestReceiptPath),
  timestampedSmokeReceipt: path.relative(repoRoot, timestampedReceiptPath),
  noGeneratedProof: path.relative(repoRoot, proofPath),
  profileFallbacks: mount.profile_fallbacks,
  browserProof: 'not-run-owner-manual-browser-verification-policy'
};

await fs.mkdir(artifactDir, { recursive: true });
await fs.mkdir(zeroOsDir, { recursive: true });
await fs.writeFile(latestReceiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
await fs.writeFile(timestampedReceiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
await fs.writeFile(workerReceiptPath, `${JSON.stringify(workerReceipt, null, 2)}\n`);

console.log(JSON.stringify({
  ok: receipt.ok,
  receiptPath: path.relative(repoRoot, latestReceiptPath),
  timestampedReceiptPath: path.relative(repoRoot, timestampedReceiptPath),
  workerReceiptPath: path.relative(repoRoot, workerReceiptPath),
  failedChecks: checks.filter((check) => !check.ok)
}, null, 2));

process.exit(receipt.ok ? 0 : 1);
