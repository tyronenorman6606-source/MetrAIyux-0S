import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import siteWorker from '../cloudflare/worker.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

class MemoryKV {
  constructor() { this.map = new Map(); }
  async put(key, value) { this.map.set(key, String(value)); }
  async get(key, options) {
    const value = this.map.get(key);
    if (value == null) return null;
    return options?.type === 'json' ? JSON.parse(value) : value;
  }
  async list({limit = 1000} = {}) {
    return {keys:[...this.map.keys()].slice(0, limit).map(name => ({name}))};
  }
}

function ctx() {
  return {waitUntil() {}};
}

function env(overrides = {}) {
  return {
    ASSETS: {
      async fetch(request) {
        return new Response(`asset fallthrough:${new URL(request.url).pathname}`, {status:404});
      }
    },
    ...overrides
  };
}

function req(path, {method = 'GET', body, token} = {}) {
  const headers = body ? {'content-type':'application/json'} : {};
  if (token) headers['x-admin-token'] = token;
  return new Request(`https://metraiyux.example${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
}

async function data(response) {
  return response.json();
}

test('KAI-02 root /api/platform routes are blocked with a namespaced repair path', async () => {
  const res = await siteWorker.fetch(req('/api/platform/projects', {token:'secret'}), env({ADMIN_TOKEN:'secret'}), ctx());
  assert.equal(res.status, 409);
  const body = await data(res);
  assert.equal(body.error, 'api_root_collision');
  assert.equal(body.namespaced_base, '/api/kaixu-codestudio');
  assert.equal(body.namespaced_path, '/api/kaixu-codestudio/platform/projects');
});

test('KAI-01 health marks CodeStudio as same-domain local/static proof adapter', async () => {
  const res = await siteWorker.fetch(req('/api/kaixu-codestudio/health', {token:'secret'}), env({ADMIN_TOKEN:'secret'}), ctx());
  assert.equal(res.status, 200);
  const body = await data(res);
  assert.equal(body.app_id, 'kaixuCodestudio');
  assert.equal(body.mounted, true);
  assert.equal(body.status, 'LIVE/PARTIAL');
  assert.equal(body.execution_mode, 'same_domain_control_plane_adapter');
  assert.equal(body.platform_api_base, '/api/kaixu-codestudio/platform');
  assert.equal(body.storage_mode, 'not_configured');
  assert.match(body.execution_semantics.external_provider_call, /provider_call_made:true/);
});

test('KAI-02 public catalog/status routes are namespaced and non-404', async () => {
  const e = env({ADMIN_TOKEN:'secret'});
  const packs = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/provider-packs', {token:'secret'}), e, ctx());
  assert.equal(packs.status, 200);
  const packsBody = await data(packs);
  assert.equal(packsBody.packs.some(pack => pack.id === 'stripe'), true);

  const openapi = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/openapi.json', {token:'secret'}), e, ctx());
  assert.equal(openapi.status, 200);
  const openapiBody = await data(openapi);
  assert.ok(openapiBody.paths['/api/kaixu-codestudio/platform/projects']);

  const projects = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/projects', {token:'secret'}), e, ctx());
  assert.equal(projects.status, 200);
  const projectsBody = await data(projects);
  assert.equal(projectsBody.projects[0].id, 'default');
});

test('KAI-02 platform mutations require operator auth before storage writes', async () => {
  const e = env({KAIXU_CODESTUDIO_KV:new MemoryKV(), ADMIN_TOKEN:'secret'});
  const res = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/projects', {
    method:'POST',
    body:{project:{id:'client-a', name:'Client A'}}
  }), e, ctx());
  assert.equal(res.status, 401);
  const body = await data(res);
  assert.match(body.error, /Unauthorized/);
});

test('KAI-02 configured CodeStudio service bindings still get edge auth on platform mutations', async () => {
  const calls = [];
  const e = env({
    ADMIN_TOKEN:'secret',
    KAIXU_CODESTUDIO_WORKER: {
      async fetch(request) {
        calls.push(new URL(request.url).pathname);
        return Response.json({ok:true, path:new URL(request.url).pathname});
      }
    }
  });

  const blocked = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/projects', {
    method:'POST',
    body:{project:{id:'client-a', name:'Client A'}}
  }), e, ctx());
  assert.equal(blocked.status, 401);
  assert.deepEqual(calls, []);

  const allowed = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/projects', {
    method:'POST',
    token:'secret',
    body:{project:{id:'client-a', name:'Client A'}}
  }), e, ctx());
  assert.equal(allowed.status, 200);
  const allowedBody = await data(allowed);
  assert.equal(allowedBody.path, '/api/platform/projects');
  assert.deepEqual(calls, ['/api/platform/projects']);
});

test('KAI-02 authenticated project mutation persists through the namespaced adapter', async () => {
  const e = env({KAIXU_CODESTUDIO_KV:new MemoryKV(), ADMIN_TOKEN:'secret'});
  const created = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/projects', {
    method:'POST',
    token:'secret',
    body:{project:{id:'client-a', name:'Client A'}}
  }), e, ctx());
  assert.equal(created.status, 200);
  const createdBody = await data(created);
  assert.equal(createdBody.project.id, 'client-a');
  assert.equal(createdBody.receipt.type, 'project_upsert');

  const listed = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/projects', {token:'secret'}), e, ctx());
  const listedBody = await data(listed);
  assert.equal(listedBody.projects.some(project => project.id === 'client-a'), true);
});

test('KAI-01 authenticated paid/provider actions are queued, not fake-executed', async () => {
  const e = env({KAIXU_CODESTUDIO_KV:new MemoryKV(), ADMIN_TOKEN:'secret'});
  const res = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/provider-packs/stripe/actions/checkout.create/run', {
    method:'POST',
    token:'secret',
    body:{projectId:'default', input:{amountCents:1300}}
  }), e, ctx());
  assert.equal(res.status, 202);
  const body = await data(res);
  assert.equal(body.ok, false);
  assert.equal(body.executed, false);
  assert.equal(body.status, 'queued_for_operator_review');
  assert.equal(body.receipt.type, 'provider_action_owner_approval_required');
  assert.equal(body.receipt.execution_mode, 'queued_for_owner_approval');
  assert.equal(body.receipt.external_provider_boundary, 'not_crossed');
});

test('KAI-03 owner-approved Twilio actions execute through the shared 0S provider runtime in sandbox', async () => {
  const sharedKv = new MemoryKV();
  const e = env({
    KAIXU_CODESTUDIO_KV:new MemoryKV(),
    SITE_EVENTS_KV:sharedKv,
    ADMIN_TOKEN:'secret',
    TWILIO_ACCOUNT_SID:'AC00000000000000000000000000000000',
    TWILIO_AUTH_TOKEN:'twilio-secret-not-returned',
    TWILIO_FROM:'+15555550100'
  });
  const res = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/provider-packs/twilio/actions/sms.send/run', {
    method:'POST',
    token:'secret',
    body:{
      projectId:'default',
      ownerApproved:true,
      sandbox:true,
      to:'+15555550123',
      body:'CodeStudio shared provider runtime proof.',
      sms_opt_in:true
    }
  }), e, ctx());
  assert.equal(res.status, 200);
  const body = await data(res);
  assert.equal(body.executed, true);
  assert.equal(body.provider_call_made, false);
  assert.equal(body.execution_mode, 'sandbox_receipt');
  assert.equal(body.external_provider_boundary, 'not_crossed');
  assert.equal(body.provider.id, 'twilio');
  assert.equal(body.shared_runtime_receipt.executed, true);
  assert.equal(body.shared_runtime_receipt.status, 'executed_sandbox');
});

test('KAI-04 dead-letter retry receipts carry attempt lineage before execution', async () => {
  const e = env({KAIXU_CODESTUDIO_KV:new MemoryKV(), ADMIN_TOKEN:'secret'});
  const seed = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/dead-letters', {
    method:'POST',
    token:'secret',
    body:{
      id:'dead-retry-proof',
      projectId:'default',
      providerId:'zero_os_executor',
      actionRoute:'deadletter.retry',
      reason:'lineage proof'
    }
  }), e, ctx());
  assert.equal(seed.status, 200);

  const retry = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/dead-letters/dead-retry-proof/retry', {
    method:'POST',
    token:'secret',
    body:{projectId:'default', ownerApproved:true}
  }), e, ctx());
  assert.equal(retry.status, 200);
  const retryBody = await data(retry);
  assert.equal(retryBody.executed, false);
  assert.equal(retryBody.receipt.retryAttempt, 1);
  assert.equal(retryBody.receipt.execution_mode, 'retry_queued_no_execution');
  assert.equal(retryBody.deadLetter.retry_count, 1);
  assert.equal(retryBody.deadLetter.retryHistory[0].jobId, retryBody.job.id);

  const run = await siteWorker.fetch(req(`/api/kaixu-codestudio/platform/jobs/${retryBody.job.id}/run`, {
    method:'POST',
    token:'secret',
    body:{projectId:'default', ownerApproved:true, providerId:'zero_os_executor', actionRoute:'deadletter.retry', input:{deadLetterId:'dead-retry-proof'}}
  }), e, ctx());
  assert.equal(run.status, 200);
  const runBody = await data(run);
  assert.equal(runBody.executed, true);
  assert.equal(runBody.receipt.retryAttempt, 1);
  assert.equal(runBody.receipt.retry_of_dead_letter_id, 'dead-retry-proof');
  assert.equal(runBody.receipt.execution_mode, 'internal_receipt_executor');

  const deadLetters = await siteWorker.fetch(req('/api/kaixu-codestudio/platform/dead-letters', {token:'secret'}), e, ctx());
  const deadBody = await data(deadLetters);
  const row = deadBody.deadLetters.find((item) => item.id === 'dead-retry-proof');
  assert.equal(row.status, 'retried_and_closed');
  assert.equal(row.retryHistory[0].receiptId, runBody.receipt.id);
});

test('KAI-02 CodeStudio browser bridge maps root platform paths to the namespaced 0S base', async () => {
  const source = await readFile(new URL('../Free99/apps/kaixu-codestudio/app/app.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../Free99/apps/kaixu-codestudio/app/index.html', import.meta.url), 'utf8');
  assert.match(source, /PLATFORM_0S_BACKEND_BASE = '\/api\/kaixu-codestudio'/);
  assert.match(source, /function platformBackendUrl/);
  assert.match(source, /raw\.slice\('\/api'\.length\)/);
  assert.match(html, /metraiyux-api-bases\.js/);
});
