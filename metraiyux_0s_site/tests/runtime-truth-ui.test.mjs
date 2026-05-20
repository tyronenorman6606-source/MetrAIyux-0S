import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const SHELLS = [
  ['index.html', 'home-shell'],
  ['0s/index.html', 'launcher'],
  ['admin/index.html', 'admin-os'],
  ['operator/index.html', 'site-operator-api'],
  ['saas/index.html', 'saas-skyemerit'],
  ['saas/skyemerit.html', 'saas-skyemerit'],
  ['Free99/apps/sovereigndocs/index.html', 'sovereigndocs'],
  ['Free99/apps/sovereigndocs/closure-dashboard/index.html', 'sovereigndocs'],
  ['Free99/apps/kaixu-codestudio/index.html', 'kaixu-codestudio'],
  ['SkyeMusicNexus/index.html', 'skymusicnexus'],
  ['SkyeMediaCenter/index.html', 'skyemediacenter'],
  ['SkyeProfitConsole/index.html', 'skyeprofitconsole'],
  ['SkyeRouteX/index.html', 'skyeroutex'],
  ['HouseOperations/index.html', 'houseoperations'],
  ['SkyeSplitEngine/index.html', 'skyesplitengine'],
  ['Marketing-Made-Easy/index.html', 'marketing-made-easy'],
  ['connectlog-v7.7-relay13-operator-proof/app.html', 'connectlog-relay13'],
  ['relay13-core-v1.7-connectlog-operator-proof/public/index.html', 'connectlog-relay13'],
  ['valley-verified/index.html', 'valley-verified'],
  ['northstar/index.html', 'northstar'],
  ['blog/index.html', 'blog-proof-docs']
];

const REQUIRED_ERROR_LABELS = [
  'Auth required',
  'Access denied',
  'API route not mounted',
  'Method not allowed',
  'Backend missing configuration',
  'Network error'
];

async function readSiteFile(relativePath) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('UI-01 attaches the runtime truth badge asset to every major app shell', async () => {
  for (const [file, surfaceId] of SHELLS) {
    const html = await readSiteFile(file);
    assert.match(html, /data-runtime-truth-style/, `${file} missing runtime truth stylesheet`);
    assert.match(html, /\/assets\/css\/0s-runtime-truth\.css/, `${file} missing runtime truth CSS`);
    assert.match(html, /\/assets\/js\/0s-runtime-truth\.js/, `${file} missing runtime truth JS`);
    assert.match(html, new RegExp(`data-surface-id="${surfaceId}"`), `${file} has wrong surface id`);
  }
});

test('UI-02 shared widget renders mode, backend, auth, storage, and health state', async () => {
  const source = await readSiteFile('assets/js/0s-runtime-truth.js');
  const styles = await readSiteFile('assets/css/0s-runtime-truth.css');

  for (const token of ['Mode', 'Backend', 'Auth', 'Storage', 'Backend health', 'No 0S API mounted']) {
    assert.equal(source.includes(token), true, `${token} missing from runtime truth source`);
  }
  for (const token of ['os-runtime-truth', 'os-runtime-truth__grid', 'os-runtime-truth__cell', 'os-runtime-truth__badge']) {
    assert.equal(styles.includes(token), true, `${token} missing from runtime truth CSS`);
  }
});

test('UI-03 rewrites backend-backed empty states when the backend is not mounted', async () => {
  const source = await readSiteFile('assets/js/0s-runtime-truth.js');
  const styles = await readSiteFile('assets/css/0s-runtime-truth.css');

  assert.match(source, /normalizeEmptyStates/);
  assert.match(source, /Backend not mounted/);
  assert.match(source, /os-runtime-empty-warning/);
  assert.match(styles, /\.os-runtime-empty-warning/);
});

test('UI-04 replaces vague operational copy on the SovereignDocs closure dashboard', async () => {
  const html = await readSiteFile('Free99/apps/sovereigndocs/closure-dashboard/index.html');

  assert.equal(/premium operational view/i.test(html), false);
  assert.match(html, /Gated SovereignDocs runtime/);
  assert.match(html, /runtime truth badge/);
});

test('UI-05 gives admin and operator users repair links from the shared widget', async () => {
  const source = await readSiteFile('assets/js/0s-runtime-truth.js');
  const shells = await Promise.all(SHELLS.map(([file]) => readSiteFile(file)));

  assert.match(source, /Repair notes/);
  assert.match(source, /0S_SURFACE_FUNCTIONALITY_AUDIT_2026-05-19\.md#phase-4-ui-truth-layer/);
  for (const [index, [file]] of SHELLS.entries()) {
    assert.match(shells[index], /data-repair-href="\/audits\/0S_SURFACE_FUNCTIONALITY_AUDIT_2026-05-19\.md#phase-4-ui-truth-layer"/, `${file} missing repair link`);
  }
});

test('UI-06 exposes a shared API error component with distinct status labels', async () => {
  const source = await readSiteFile('assets/js/0s-runtime-truth.js');
  const styles = await readSiteFile('assets/css/0s-runtime-truth.css');

  assert.match(source, /window\.MetrAIyuxRuntimeTruth/);
  assert.match(source, /describeApiError/);
  assert.match(source, /renderApiError/);
  assert.match(source, /shouldMonitorApi/);
  assert.match(styles, /\.os-runtime-api-error/);
  for (const label of REQUIRED_ERROR_LABELS) {
    assert.equal(source.includes(label), true, `${label} missing from API error labels`);
  }
});
