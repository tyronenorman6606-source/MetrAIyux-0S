import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import siteWorker from '../cloudflare/worker.js';

const REQUIRED_SURFACE_IDS = [
  'home-shell',
  'launcher',
  'admin-os',
  'site-operator-api',
  'saas-skyemerit',
  'crown-nexus-sentinel-omega',
  'sovereigndocs',
  'kaixu-codestudio',
  'skymusicnexus',
  'skyemediacenter',
  'skyeprofitconsole',
  'skyeroutex',
  'houseoperations',
  'skyesplitengine',
  'marketing-made-easy',
  'connectlog-relay13',
  'valley-verified',
  'northstar',
  'blog-proof-docs'
];

const REQUIRED_APP_FAMILY_IDS = [
  'sovereigndocs',
  'kaixu-codestudio',
  'skymusicnexus',
  'skyemediacenter',
  'skyeprofitconsole',
  'skyeroutex',
  'houseoperations',
  'skyesplitengine',
  'marketing-made-easy',
  'connectlog-relay13',
  'valley-verified',
  'northstar'
];

const REQUIRED_BADGE_LABELS = [
  'Production live',
  'Gate required',
  'Local only',
  'Static proof',
  'Backend missing',
  'Proof only',
  'Partial'
];

async function readRegistry() {
  const source = await readFile(new URL('../audits/0S_SURFACE_STATUS.json', import.meta.url), 'utf8');
  return JSON.parse(source);
}

function ctx() {
  return { waitUntil() {} };
}

function env() {
  return {
    ASSETS: {
      async fetch(request) {
        const path = new URL(request.url).pathname;
        return new Response(`asset:${path}`, { status: 200 });
      }
    },
    SKYGATEFS27_WORKER: {
      async fetch(request) {
        const body = await request.json().catch(() => ({}));
        return Response.json({
          active: body.token === 'gate-token',
          sub: 'surface-status-test',
          email: 'surface-status-test@example.invalid',
          role: 'admin',
          scope: 'admin.read admin.write gateway.invoke'
        });
      }
    }
  };
}

function req(path, options = {}) {
  return new Request(`https://metraiyux.example${path}`, options);
}

test('AUD-02 publishes a machine-readable 0S surface registry', async () => {
  const registry = await readRegistry();

  assert.equal(registry.schema, 'metraiyux-0s-surface-status.v1');
  assert.equal(registry.sourceAudit, '/audits/0S_SURFACE_FUNCTIONALITY_AUDIT_2026-05-19.md');
  assert.deepEqual(registry.badgeLabels, REQUIRED_BADGE_LABELS);
  assert.equal(Array.isArray(registry.surfaces), true);
  assert.equal(registry.surfaces.length >= REQUIRED_SURFACE_IDS.length, true);

  const ids = registry.surfaces.map((surface) => surface.id);
  assert.equal(new Set(ids).size, ids.length, 'surface ids must be unique');
  for (const id of REQUIRED_SURFACE_IDS) {
    assert.equal(ids.includes(id), true, `${id} missing from surface registry`);
  }
});

test('AUD-03 covers every major app family with allowed status metadata', async () => {
  const registry = await readRegistry();
  const allowedTags = new Set(registry.allowedStatusTags);
  const allowedBadges = new Set(registry.badgeLabels);
  const byId = new Map(registry.surfaces.map((surface) => [surface.id, surface]));

  for (const id of REQUIRED_APP_FAMILY_IDS) {
    const surface = byId.get(id);
    assert.ok(surface, `${id} missing`);
    assert.equal(surface.publicRoute.startsWith('/'), true, `${id} must use public absolute route`);
    assert.equal(typeof surface.proof, 'string', `${id} must include proof text`);
    assert.equal(surface.proof.length > 20, true, `${id} proof must be specific`);
    assert.equal(allowedBadges.has(surface.runtimeBadge), true, `${id} has unknown badge`);
    assert.equal(Array.isArray(surface.statusTags), true, `${id} must have status tags`);
    assert.equal(surface.statusTags.length > 0, true, `${id} must have status tags`);
    for (const tag of surface.statusTags) {
      assert.equal(allowedTags.has(tag), true, `${id} has unknown tag ${tag}`);
    }
  }
});

test('AUD-04 wires visible runtime badges into shared homepage UI', async () => {
  const script = await readFile(new URL('../script.js', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../style.css', import.meta.url), 'utf8');

  assert.match(script, /SURFACE_STATUS_REGISTRY_PATH/);
  assert.match(script, /audits\/0S_SURFACE_STATUS\.json/);
  assert.match(script, /SURFACE_STATUS_HINTS/);
  assert.match(script, /data-runtime-badge-for/);
  assert.match(script, /mountSurfaceStatusBadges/);
  assert.match(script, /surfaceIdForItem/);
  assert.match(styles, /\.runtime-badge/);
  assert.match(styles, /\.runtime-badge-live/);
  assert.match(styles, /\.runtime-badge-gated/);
  assert.match(styles, /\.runtime-badge-local/);
  assert.match(styles, /\.runtime-badge-static/);
  assert.match(styles, /\.runtime-badge-broken/);

  for (const label of REQUIRED_BADGE_LABELS.slice(0, 5)) {
    assert.equal(script.includes(label), true, `${label} must be visible in the homepage legend or badge map`);
  }
});

test('AUD-02 registry remains gate-owned static data, not blocked source', async () => {
  const publicRes = await siteWorker.fetch(req('/audits/0S_SURFACE_STATUS.json'), env(), ctx());
  assert.equal(publicRes.status, 302);
  assert.equal(publicRes.headers.get('x-0s-gate'), 'fs27-required');

  const res = await siteWorker.fetch(
    req('/audits/0S_SURFACE_STATUS.json', { headers: { authorization: 'Bearer gate-token' } }),
    env(),
    ctx()
  );
  assert.equal(res.status, 200);
});

test('AUD-05 Valley Verified business profiles stay behind the shared 0S gate', async () => {
  const publicRes = await siteWorker.fetch(req('/valley-verified/business/next-level-gaming-goodyear/'), env(), ctx());
  assert.equal(publicRes.status, 302);
  assert.equal(publicRes.headers.get('x-0s-gate'), 'fs27-required');
  assert.match(publicRes.headers.get('location') || '', /\/admin\/login\.html\?return=%2Fvalley-verified%2Fbusiness%2Fnext-level-gaming-goodyear%2F/i);

  const authedRes = await siteWorker.fetch(
    req('/valley-verified/business/next-level-gaming-goodyear/', { headers: { authorization: 'Bearer gate-token' } }),
    env(),
    ctx()
  );
  assert.equal(authedRes.status, 200);
});
