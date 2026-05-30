import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const SKYEROUTEX_URL = (process.env.SKYEROUTEX_SKYNET_URL || 'https://skyenet.skyeroutex-logistics').replace(/\/+$/, '');
const SKYESOL_URL = (process.env.SKYESOL_SKYNET_URL || 'https://skyenet.skyesol').replace(/\/+$/, '');
const SOLENTERPRISES_URL = (process.env.SOLENTERPRISES_SKYNET_URL || 'https://skyenet.solenterprises').replace(/\/+$/, '');
const ZERO_OS_URL = (process.env.ZERO_OS_BASE_URL || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');
const OUT_DIR = path.resolve('test-artifacts');
const FETCH_TIMEOUT_MS = Number(process.env.COMPANY_SKYNET_FETCH_TIMEOUT_MS || 30000);

const checks = [
  {
    id: 'skyeroutex-home',
    url: `${SKYEROUTEX_URL}/`,
    expects: ['SkyeRouteX Logistics', 'https://skyenet.skyesol/', 'https://skyenet.solenterprises/', 'skyeroutex-logistics@solenterprises.org', '/assets/site.css', 'hero-video', `${ZERO_OS_URL}/api/skyeroutex/operator-entry?return=%2FSkyeRouteX%2Fworkforce-command-v0.4.0%2Findex.html`],
    rejects: ['./assets/site.css']
  },
  {
    id: 'skyeroutex-home-noslash',
    url: SKYEROUTEX_URL,
    expects: ['SkyeRouteX Logistics', '/assets/site.css', '/assets/site.js', 'hero-video', `${ZERO_OS_URL}/api/skyeroutex/operator-entry?return=%2FSkyeRouteX%2Fworkforce-command-v0.4.0%2Findex.html`],
    rejects: ['./assets/site.css']
  },
  {
    id: 'skyeroutex-tour',
    url: `${SKYEROUTEX_URL}/tour.html`,
    expects: ['SkyeRouteX Logistics', 'Read-only platform tour', 'read-only', '/assets/site.css', `${ZERO_OS_URL}/api/skyeroutex/operator-entry?return=%2FSkyeRouteX%2Fworkforce-command-v0.4.0%2Findex.html`],
    rejects: ['./assets/site.css']
  },
  {
    id: 'skyeroutex-site-js',
    url: `${SKYEROUTEX_URL}/assets/site.js`,
    expects: ['/api/skyeroutex/tour-token', '/api/skyeroutex/tour-token/status', 'skyeroutex.tour.read']
  },
  {
    id: 'skyeroutex-site-css',
    url: `${SKYEROUTEX_URL}/assets/site.css`,
    expects: ['.proof-hero', '.hero-video', 'object-fit: cover']
  },
  {
    id: 'skyeroutex-proof-video',
    url: `${SKYEROUTEX_URL}/assets/skyeroutex-live-ops-reel.webm`,
    expects: []
  },
  {
    id: 'skyeroutex-operator-entry-anonymous',
    url: `${ZERO_OS_URL}/api/skyeroutex/operator-entry?return=%2FSkyeRouteX%2Fworkforce-command-v0.4.0%2Findex.html`,
    status: 302,
    locationIncludes: ['/admin/login.html', 'return=%2FSkyeRouteX%2Fworkforce-command-v0.4.0%2Findex.html'],
    expects: []
  },
  {
    id: 'skyesol-home',
    url: `${SKYESOL_URL}/`,
    expects: ['Skyes Over London LC', 'https://skyenet.skyeroutex-logistics/', 'https://skyenet.solenterprises/'],
    rejects: ['https://www.solenterprises.org/']
  },
  {
    id: 'skyesol-migration',
    url: `${SKYESOL_URL}/skyenet-migration.json`,
    expects: ['skyesol-company-public', 'https://skyenet.skyesol/']
  },
  {
    id: 'solenterprises-home',
    url: `${SOLENTERPRISES_URL}/`,
    expects: ['SOLEnterprises', 'https://skyenet.skyesol/', 'https://skyenet.skyeroutex-logistics/']
  },
  {
    id: 'solenterprises-migration',
    url: `${SOLENTERPRISES_URL}/skyenet-migration.json`,
    expects: ['solenterprises-public', 'https://skyenet.solenterprises/']
  },
  {
    id: 'solenterprises-manifest',
    url: `${SOLENTERPRISES_URL}/manifest.webmanifest`,
    expects: ['SOLEnterprises']
  }
];

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function fetchText(url) {
  const started = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      headers: { accept: 'text/html,application/json,text/plain,*/*' },
      signal: controller.signal
    });
    const body = await response.text();
    return {
      status: response.status,
      redirected: response.status >= 300 && response.status < 400,
      location: response.headers.get('location') || '',
      contentType: response.headers.get('content-type') || '',
      body,
      elapsedMs: Number((performance.now() - started).toFixed(2))
    };
  } catch (error) {
    return {
      status: 0,
      redirected: false,
      location: '',
      contentType: '',
      body: '',
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      error: error?.name === 'AbortError' ? `request timed out after ${FETCH_TIMEOUT_MS}ms` : error?.message || String(error)
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const generatedAt = new Date().toISOString();
  const receiptPath = path.join(OUT_DIR, `company-public-skynet-crosslinks-${nowStamp()}.json`);
  const latestPath = path.join(OUT_DIR, 'company-public-skynet-crosslinks-latest.json');
  const results = [];

  for (const check of checks) {
    const url = check.url;
    const response = await fetchText(url);
    const missing = (check.expects || []).filter((needle) => !response.body.includes(needle));
    const rejected = (check.rejects || []).filter((needle) => response.body.includes(needle));
    const adminRedirect = response.redirected && /\/admin\/login\.html/i.test(response.location);
    const expectedStatus = check.status || 200;
    const locationMissing = (check.locationIncludes || []).filter((needle) => !response.location.includes(needle));
    const allowRedirect = expectedStatus >= 300 && expectedStatus < 400;
    const ok = response.status === expectedStatus
      && (allowRedirect || !response.redirected)
      && (allowRedirect || !adminRedirect)
      && missing.length === 0
      && rejected.length === 0
      && locationMissing.length === 0;
    results.push({
      id: check.id,
      url,
      status: response.status,
      ok,
      elapsedMs: response.elapsedMs,
      contentType: response.contentType,
      redirected: response.redirected,
      location: response.location,
      missing,
      rejected,
      locationMissing,
      adminRedirect,
      error: response.error || ''
    });
  }

  const receipt = {
    ok: results.every((result) => result.ok),
    generatedAt,
    lane: 'company-public-skynet-crosslinks',
    platformNativeUrls: {
      skyeroutex: SKYEROUTEX_URL,
      skyesol: SKYESOL_URL,
      solenterprises: SOLENTERPRISES_URL
    },
    zeroOsUrl: ZERO_OS_URL,
    noBrowserProofRun: true,
    ownerManualLiveCheck: true,
    checks: results
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await fs.writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ ok: receipt.ok, receipt: receiptPath, latest: latestPath, checks: results }, null, 2));
  if (!receipt.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
