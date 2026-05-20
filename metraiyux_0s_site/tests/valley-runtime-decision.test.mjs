import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import siteWorker from '../cloudflare/worker.js';

const VALLEY_ROOT = new URL('../valley-verified/', import.meta.url);

function ctx() {
  return { waitUntil() {} };
}

function env() {
  return {
    ASSETS: {
      async fetch(request) {
        return new Response(`asset:${new URL(request.url).pathname}`, { status: 200 });
      }
    }
  };
}

function req(path) {
  return new Request(`https://metraiyux.example${path}`);
}

async function readValley(path) {
  return readFile(new URL(path, VALLEY_ROOT), 'utf8');
}

test('VALLEY-01/VALLEY-03 records Valley as public static plus external proof-only admin', async () => {
  const decision = JSON.parse(await readValley('VALLEY_RUNTIME_DECISION.json'));
  assert.equal(decision.decision, 'public_directory_static_admin_external_proof_only');
  assert.equal(decision.mounted0sBehavior.publicDirectory, 'live_static');
  assert.equal(decision.mounted0sBehavior.apiFolder, 'manifest_only');
  assert.equal(decision.mounted0sBehavior.adminConsole, 'external_proof_only');
  assert.equal(decision.mounted0sBehavior.payments, 'external_gate_owned');
  assert.match(decision.operatorTruth, /do not run on the 0S static mount/);
  assert.match(decision.liveBackends.skyePayGateOffer, /skyegatefs27-citadeldb/);
  assert.equal(decision.closure['VALLEY-02'], 'Not applicable because the selected decision is not to mount PHX admin/payment functions on 0S.');
  assert.deepEqual(decision.notMountedOn0s.sort(), [
    '/valley-verified/.netlify/functions/phx-action',
    '/valley-verified/.netlify/functions/phx-admin',
    '/valley-verified/.netlify/functions/phx-lead',
    '/valley-verified/.netlify/functions/phx-payment'
  ].sort());
});

test('VALLEY-03 removes live PHX function calls from admin browser scripts and labels admin pages honestly', async () => {
  const adminJs = await readValley('assets/admin-console.js');
  const protectedAdminJs = await readValley('assets/protected-admin-app.js');
  const adminHtml = await readValley('admin-console/index.html');
  const adminApiHtml = await readValley('admin-api/index.html');
  const quoteRouterHtml = await readValley('quote-router/index.html');

  for (const source of [adminJs, protectedAdminJs, adminHtml, adminApiHtml, quoteRouterHtml]) {
    assert.doesNotMatch(source, /\/valley-verified\/\.netlify\/functions/);
  }

  assert.match(adminJs, /not_executed:true/);
  assert.match(protectedAdminJs, /not_executed:true/);
  assert.match(adminHtml, /proof-only on the 0S Valley mount/);
  assert.match(adminHtml, /VALLEY_RUNTIME_DECISION\.json/);
  assert.match(adminHtml, /skyegatefs27-citadeldb/);
  assert.match(adminApiHtml, /model-only on this 0S mount/);
  assert.match(quoteRouterHtml, /VALLEY_RUNTIME_DECISION\.json/);
});

test('VALLEY-03 blocks old PHX Netlify function paths and keeps public Valley routes reachable', async () => {
  const blocked = [
    '/valley-verified/.netlify/functions/phx-admin',
    '/valley-verified/.netlify/functions/phx-payment',
    '/valley-verified/.netlify/functions/phx-action',
    '/valley-verified/.netlify/functions/phx-lead'
  ];

  for (const path of blocked) {
    const res = await siteWorker.fetch(req(path), env(), ctx());
    assert.equal(res.status, 404, path);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow', path);
  }

  const publicRoutes = [
    '/valley-verified/',
    '/valley-verified/admin-console/index.html',
    '/valley-verified/admin-api/index.html',
    '/valley-verified/VALLEY_RUNTIME_DECISION.json',
    '/valley-verified/data/businesses.json',
    '/valley-verified/data/search-index.json'
  ];

  for (const path of publicRoutes) {
    const res = await siteWorker.fetch(req(path), env(), ctx());
    assert.equal(res.status, 200, path);
  }
});
