import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OS_BASE = process.env.OS_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
const FS27_BASE = process.env.FS27_BASE || 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev';
const ARTIFACT = process.env.ARTIFACT || 'test-artifacts/sovereigndocs-legal-review-live-proof.json';
const WORKER_VERSION = process.env.WORKER_VERSION || 'recorded-by-deploy-output';
const FS27_VERSION = process.env.FS27_VERSION || '6b11e610-030e-454d-88bb-27c9638b98d5';

async function read(url) {
  const res = await fetch(url);
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await res.json().catch(() => ({}))
    : await res.text();
  return { url, status: res.status, ok: res.ok, body };
}

function textOf(body) {
  return typeof body === 'string' ? body : JSON.stringify(body);
}

const checks = [];

checks.push({
  ...(await read(`${OS_BASE}/valley-verified/legal-review-lane/`)),
  expect: 'legal lane page renders',
  pass(result) {
    const text = textOf(result.body);
    return result.status === 200 && text.includes('SovereignDocs') && text.includes('Legal Review');
  }
});

checks.push({
  ...(await read(`${OS_BASE}/valley-verified/legal-review-lane/platz-juris-pllc/`)),
  expect: 'PLATZ JURIS legal lane page renders',
  pass(result) {
    return result.status === 200 && textOf(result.body).includes('PLATZ JURIS');
  }
});

checks.push({
  ...(await read(`${OS_BASE}/valley-verified/data/legal-review-partner-candidates.json`)),
  expect: 'seven candidate legal partners are published as data',
  pass(result) {
    const partners = Array.isArray(result.body?.candidates) ? result.body.candidates : (Array.isArray(result.body?.partners) ? result.body.partners : result.body);
    return result.status === 200 && Array.isArray(partners) && partners.length === 7;
  }
});

checks.push({
  ...(await read(`${OS_BASE}/client-app-factory/client-apps/platz-juris-pllc-phoenix-85016-4e77b1f/`)),
  expect: 'PLATZ JURIS client app handoff page renders',
  pass(result) {
    const text = textOf(result.body);
    return result.status === 200 && text.includes('PLATZ JURIS') && text.includes('SovereignDocs');
  }
});

checks.push({
  ...(await read(`${OS_BASE}/api/sovereigndocs/routes/manifest`)),
  expect: 'SovereignDocs route manifest exposes legal review submit route',
  pass(result) {
    return result.status === 200 && textOf(result.body).includes('POST /legal-review/submit');
  }
});

checks.push({
  ...(await read(`${OS_BASE}/api/sovereigndocs/legal-partners/network`)),
  expect: 'legal partner network API is protected without session',
  pass(result) {
    return result.status === 401;
  }
});

checks.push({
  ...(await read(`${FS27_BASE}/skyepay/offers?client=metraiyux-0s`)),
  expect: 'FS27 SkyePay exposes sovereign legal review offer',
  pass(result) {
    return result.status === 200 && textOf(result.body).includes('sovereigndocs-legal-review-lane');
  }
});

checks.push({
  ...(await read(`${OS_BASE}/changelog/`)),
  expect: 'public changelog includes the SovereignDocs legal review release',
  pass(result) {
    const text = textOf(result.body);
    return result.status === 200 && text.includes('SovereignDocs Legal Review') && text.includes('legal review lane');
  }
});

const serialized = checks.map((check) => {
  const pass = check.pass(check);
  const body = check.body;
  const bodyText = textOf(body);
  return {
    url: check.url,
    status: check.status,
    expected: check.expect,
    ok: pass,
    partnerCount: Array.isArray(body?.candidates) ? body.candidates.length : (Array.isArray(body?.partners) ? body.partners.length : (Array.isArray(body) ? body.length : null)),
    routeManifestHasLegalSubmit: bodyText.includes('POST /legal-review/submit'),
    skyePayOfferPresent: bodyText.includes('sovereigndocs-legal-review-lane'),
    textSignals: {
      legalLane: bodyText.includes('Legal Review'),
      platz: bodyText.includes('PLATZ JURIS'),
      app: bodyText.includes('client app') || bodyText.includes('Client App'),
      changelog: bodyText.includes('SovereignDocs Legal Review')
    }
  };
});

const receipt = {
  ok: serialized.every((check) => check.ok),
  checkedAt: new Date().toISOString(),
  workerVersion: WORKER_VERSION,
  fs27Version: FS27_VERSION,
  boundary: 'Live public proof verifies rendered pages, public data, SkyePay offer presence, route manifest, changelog, and the protected API boundary. It does not mutate live legal review records without an authenticated admin/session token.',
  checks: serialized
};

await mkdir(path.dirname(ARTIFACT), { recursive: true });
await writeFile(ARTIFACT, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
if (!receipt.ok) process.exit(1);
