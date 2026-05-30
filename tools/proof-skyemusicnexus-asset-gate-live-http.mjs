#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const checkedAt = new Date().toISOString();
const stamp = checkedAt.replace(/[:.]/g, '-');
const outDir = path.join(repoRoot, 'test-artifacts', 'skyemusicnexus-asset-download-gate');
const pagesBase = (process.env.SKYEMUSICNEXUS_PAGES_BASE || 'https://skye-music-nexus.pages.dev').replace(/\/+$/, '');
const workerBase = (process.env.ZERO_OS_WORKER_BASE || 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev').replace(/\/+$/, '');

function cacheBust(url) {
  const join = url.includes('?') ? '&' : '?';
  return `${url}${join}assetGateProof=${encodeURIComponent(stamp)}`;
}

const probes = [
  {
    id: 'pages_raw_storefront_audio_requires_artist_or_paid_skypay',
    method: 'GET',
    url: cacheBust(`${pagesBase}/artist-storefronts/reflection/audio/reflection.mp3`),
    expectStatus: [402, 404],
    expectHeader: ['x-skye-download-gate', 'artist-or-paid-skypay'],
    expectJsonCode: 'SKYEPAY_ASSET_PURCHASE_REQUIRED',
    expectHeaderOnlyWhenStatus: 402,
    expectJsonOnlyWhenStatus: 402,
  },
  {
    id: 'pages_approved_public_drop_audio_remains_playable',
    method: 'HEAD',
    url: cacheBust(`${pagesBase}/artist-storefronts/gray-skyes/drops/skyline-pact/audio/skyline-pact.mp3`),
    expectStatus: 200,
    expectContentType: /^audio\//,
  },
  {
    id: 'pages_rejected_creation_bin_audio_not_public',
    method: 'HEAD',
    url: cacheBust(`${pagesBase}/song-creation-bin/reflection/wooooah-factor/wooooah-factor.mp3`),
    expectStatus: 404,
  },
  {
    id: 'zero_os_mount_requires_shared_gate_before_raw_audio',
    method: 'GET',
    url: `${workerBase}/SkyeMusicNexus/artist-storefronts/reflection/audio/reflection.mp3`,
    expectStatus: 302,
    expectHeader: ['x-0s-gate', 'fs27-required'],
    expectLocationIncludes: '/admin/login.html',
  },
  {
    id: 'zero_os_mount_requires_shared_gate_before_public_drop_audio',
    method: 'GET',
    url: `${workerBase}/SkyeMusicNexus/artist-storefronts/gray-skyes/drops/skyline-pact/audio/skyline-pact.mp3`,
    expectStatus: 302,
    expectHeader: ['x-0s-gate', 'fs27-required'],
    expectLocationIncludes: '/admin/login.html',
  },
];

function slimHeaders(headers) {
  const keys = [
    'content-type',
    'cache-control',
    'location',
    'x-0s-gate',
    'x-skye-download-gate',
    'x-robots-tag',
  ];
  return Object.fromEntries(keys.map((key) => [key, headers.get(key)]).filter(([, value]) => value));
}

function fail(message, details = {}) {
  const error = new Error(message);
  error.details = details;
  throw error;
}

async function probe(item) {
  const response = await fetch(item.url, {
    method: item.method,
    redirect: 'manual',
    signal: AbortSignal.timeout(30000),
  });

  const headers = slimHeaders(response.headers);
  let json = null;
  let text = '';
  if (item.method !== 'HEAD') {
    const contentType = response.headers.get('content-type') || '';
    if (/application\/json/i.test(contentType)) {
      json = await response.json().catch(() => null);
    } else {
      text = await response.text().catch(() => '');
    }
  }

  const expectedStatuses = Array.isArray(item.expectStatus) ? item.expectStatus : [item.expectStatus];
  if (!expectedStatuses.includes(response.status)) {
    fail(`${item.id} returned ${response.status}, expected ${expectedStatuses.join(' or ')}`, { headers, json, text: text.slice(0, 180) });
  }
  if (item.expectHeader && (!item.expectHeaderOnlyWhenStatus || response.status === item.expectHeaderOnlyWhenStatus)) {
    const [name, value] = item.expectHeader;
    if (response.headers.get(name) !== value) {
      fail(`${item.id} header ${name} was ${response.headers.get(name)}, expected ${value}`, { headers, json });
    }
  }
  if (item.expectContentType && !item.expectContentType.test(response.headers.get('content-type') || '')) {
    fail(`${item.id} content-type was ${response.headers.get('content-type') || 'missing'}`, { headers });
  }
  if (item.expectLocationIncludes && !String(response.headers.get('location') || '').includes(item.expectLocationIncludes)) {
    fail(`${item.id} location did not include ${item.expectLocationIncludes}`, { headers });
  }
  if (item.expectJsonCode && (!item.expectJsonOnlyWhenStatus || response.status === item.expectJsonOnlyWhenStatus) && json?.code !== item.expectJsonCode) {
    fail(`${item.id} JSON code was ${json?.code || 'missing'}, expected ${item.expectJsonCode}`, { headers, json });
  }

  return {
    id: item.id,
    ok: true,
    method: item.method,
    url: item.url,
    status: response.status,
    headers,
    jsonCode: json?.code || null,
    blockedBy: response.status === 402 ? 'pages_worker_gate' : response.status === 404 ? 'omitted_static_asset' : 'expected_status',
  };
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const receipt = {
    schema: 'skyemusicnexus.asset-gate-live-http.v1',
    ok: false,
    checkedAt,
    browserOpened: false,
    playwrightStarted: false,
    pagesBase,
    workerBase,
    checks: [],
    guarantees: [
      'Live SkyeMusicNexus Pages blocks or omits raw storefront audio so it is not publicly downloadable outside the artist/SkyPay gated route.',
      'Live approved public drop audio remains playable on Pages.',
      'Live 0S mounted SkyeMusicNexus requires the shared FS27/SkyGate lane before any asset request reaches the app.',
      'Rejected creation-bin audio is not publicly downloadable.',
    ],
  };

  try {
    for (const item of probes) {
      receipt.checks.push(await probe(item));
    }
    receipt.ok = true;
    receipt.finishedAt = new Date().toISOString();
  } catch (error) {
    receipt.ok = false;
    receipt.finishedAt = new Date().toISOString();
    receipt.error = error.message;
    receipt.errorDetails = error.details || {};
  }

  const timestampPath = path.join(outDir, `live-http-${stamp}.json`);
  const latestPath = path.join(outDir, 'live-http-latest.json');
  await writeFile(timestampPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await writeFile(latestPath, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ ok: receipt.ok, receipt: path.relative(repoRoot, timestampPath), checks: receipt.checks.length }, null, 2));

  if (!receipt.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
