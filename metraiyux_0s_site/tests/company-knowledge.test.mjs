import test from 'node:test';
import assert from 'node:assert/strict';
import siteWorker from '../cloudflare/worker.js';

class MemoryKV {
  constructor() { this.map = new Map(); }
  async put(key, value) { this.map.set(key, String(value)); }
  async get(key, options) {
    const value = this.map.get(key);
    if (value == null) return null;
    return options?.type === 'json' ? JSON.parse(value) : value;
  }
  async delete(key) { this.map.delete(key); }
  async list({ prefix = '', limit = 1000 } = {}) {
    return {
      keys: [...this.map.keys()]
        .filter((key) => key.startsWith(prefix))
        .slice(0, limit)
        .map((name) => ({ name }))
    };
  }
}

class MemoryR2 {
  constructor() { this.map = new Map(); }
  async put(key, value, options = {}) {
    const body = typeof value === 'string' ? value : await new Response(value).text();
    this.map.set(key, {
      body,
      size: Buffer.byteLength(body),
      uploaded: new Date(),
      customMetadata: options.customMetadata || {},
      httpMetadata: options.httpMetadata || {}
    });
    return { key };
  }
  async get(key) {
    const stored = this.map.get(key);
    if (!stored) return null;
    return {
      key,
      size: stored.size,
      uploaded: stored.uploaded,
      customMetadata: stored.customMetadata,
      httpMetadata: stored.httpMetadata,
      async text() { return stored.body; },
      async json() { return JSON.parse(stored.body); }
    };
  }
  async delete(key) { this.map.delete(key); }
}

function ctx() {
  return { waitUntil() {} };
}

function gateWorker() {
  return {
    async fetch(request) {
      const body = await request.json().catch(() => ({}));
      const token = body.token || '';
      if (token === 'owner-token') {
        return Response.json({
          active: true,
          sub: 'owner',
          email: 'owner@example.invalid',
          role: 'admin',
          scope: 'admin.read admin.write gateway.invoke',
          workspace_id: 'metraiyux-0s-owner'
        });
      }
      if (token === 'tenant-token') {
        return Response.json({
          active: true,
          sub: 'tenant-user',
          email: 'ops@empire.example.invalid',
          role: 'member',
          scope: 'workspace.read workspace.write',
          workspace_id: 'empire-pallets-preview-001',
          client_id: 'empire-pallets'
        });
      }
      return Response.json({ active: false }, { status: 200 });
    }
  };
}

function env(overrides = {}) {
  const kv = new MemoryKV();
  return {
    ASSETS: {
      async fetch(request) {
        return new Response(`asset:${new URL(request.url).pathname}`, { status: 404 });
      }
    },
    SITE_EVENTS_KV: kv,
    COMPANY_KNOWLEDGE_BUCKET: new MemoryR2(),
    SKYGATEFS27_WORKER: gateWorker(),
    ...overrides
  };
}

function req(path, { method = 'GET', token, body } = {}) {
  return new Request(`https://metraiyux.example${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

async function call(e, path, options = {}) {
  const response = await siteWorker.fetch(req(path, options), e, ctx());
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

test('CK-01 company knowledge routes require the shared 0S gate', async () => {
  const e = env();
  const result = await call(e, '/api/0s/company-knowledge/status');
  assert.equal(result.response.status, 401);
  assert.match(result.data.error, /Missing|Unauthorized|required/i);
});

test('CK-02 owner creates platform knowledge, stores content in R2, and builds context', async () => {
  const e = env();
  const token = 'owner-token';

  const base = await call(e, '/api/0s/company-knowledge/bases', {
    method: 'POST',
    token,
    body: {
      ownerType: 'platform',
      knowledgeBaseId: 'metraiyux-0s',
      displayName: 'MetrAIyux 0S Company Knowledge',
      description: 'Owner 0S facts'
    }
  });
  assert.equal(base.response.status, 201);
  assert.equal(base.data.base.ownerType, 'platform');

  const item = await call(e, '/api/0s/company-knowledge/items', {
    method: 'POST',
    token,
    body: {
      ownerType: 'platform',
      knowledgeBaseId: 'metraiyux-0s',
      title: 'Cloudflare storage decision',
      content: 'Company knowledge stores object bodies in Cloudflare R2 and indexes metadata in KV. Drive is backup reference only.',
      tags: ['cloudflare', 'r2', 'knowledge']
    }
  });
  assert.equal(item.response.status, 201);
  assert.equal(item.data.item.storage, 'cloudflare_r2');
  assert.match(item.data.item.objectKey, /^company-knowledge\/v1\/metraiyux-0s\//);

  const context = await call(e, '/api/0s/company-knowledge/context', {
    method: 'POST',
    token,
    body: {
      knowledgeBaseId: 'metraiyux-0s',
      query: 'Where does company knowledge store object bodies?'
    }
  });
  assert.equal(context.response.status, 200);
  assert.equal(context.data.hits.length, 1);
  assert.match(context.data.context, /Cloudflare R2/);
  assert.equal(context.data.citations[0].itemId, item.data.item.id);
});

test('CK-03 tenant knowledge is workspace scoped and cannot write the platform base', async () => {
  const e = env();
  const token = 'tenant-token';

  const denied = await call(e, '/api/0s/company-knowledge/items', {
    method: 'POST',
    token,
    body: {
      ownerType: 'platform',
      knowledgeBaseId: 'metraiyux-0s',
      title: 'Bad platform write',
      content: 'A tenant should not write platform memory.'
    }
  });
  assert.equal(denied.response.status, 403);

  const tenantItem = await call(e, '/api/0s/company-knowledge/items', {
    method: 'POST',
    token,
    body: {
      ownerType: 'tenant',
      clientId: 'empire-pallets',
      workspaceId: 'empire-pallets-preview-001',
      knowledgeBaseId: 'tenant-empire-pallets',
      title: 'Forklift policy',
      content: 'Empire Pallets requires forklift questions to route to the operations desk before publishing.',
      tags: ['operations']
    }
  });
  assert.equal(tenantItem.response.status, 201);
  assert.equal(tenantItem.data.base.ownerType, 'tenant');
  assert.equal(tenantItem.data.base.clientId, 'empire-pallets');

  const tenantContext = await call(e, '/api/0s/company-knowledge/context', {
    method: 'POST',
    token,
    body: {
      knowledgeBaseId: 'tenant-empire-pallets',
      query: 'forklift operations desk'
    }
  });
  assert.equal(tenantContext.response.status, 200);
  assert.match(tenantContext.data.context, /forklift/);
});

