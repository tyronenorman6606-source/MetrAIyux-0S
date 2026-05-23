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
  async list({ limit = 1000 } = {}) {
    return { keys: [...this.map.keys()].slice(0, limit).map((name) => ({ name })) };
  }
}

function ctx() {
  return { waitUntil() {} };
}

function req(path, { method = 'GET', token, body, headers = {} } = {}) {
  return new Request(`https://metraiyux.example${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

function gateWorker() {
  return {
    async fetch(request) {
      const body = await request.json().catch(() => ({}));
      return Response.json({
        active: body.token === 'gate-token',
        sub: 'tenant-operator',
        email: 'operator@example.invalid',
        role: 'admin',
        scope: 'admin.read admin.write gateway.invoke'
      });
    }
  };
}

function relayWorker(calls) {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      const payload = await request.json().catch(() => ({}));
      calls.push({ method: request.method, path: url.pathname, payload });
      if (url.pathname === '/api/v1/connectlog/scan') {
        return Response.json({
          ok: true,
          conversation_id: 'conv_tenant_backbone',
          connectlog_card_record_id: 'card_tenant_backbone'
        }, { status: 201 });
      }
      return Response.json({ ok: false, error: 'unexpected_relay_path', path: url.pathname }, { status: 404 });
    }
  };
}

function env(overrides = {}) {
  const kv = new MemoryKV();
  const calls = [];
  return {
    ASSETS: {
      async fetch(request) {
        return new Response(`asset:${new URL(request.url).pathname}`, { status: 404 });
      }
    },
    SITE_EVENTS_KV: kv,
    CONTENT_ENGINE_KV: kv,
    CLIENT_APP_FACTORY_KV: kv,
    SKYE_MEDIA_CENTER_KV: kv,
    SKYGATEFS27_WORKER: gateWorker(),
    RELAY13_WORKER: relayWorker(calls),
    relayCalls: calls,
    ...overrides
  };
}

async function call(e, path, options = {}) {
  const response = await siteWorker.fetch(req(path, options), e, ctx());
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  return { response, body };
}

test('TENANT-01 exposes a Gate-owned canonical tenant map', async () => {
  const e = env();
  const result = await call(e, '/api/0s/tenant-map');
  assert.equal(result.response.status, 200);
  assert.equal(result.body.gateAuthority, 'metraiyux-0s-gate');
  assert.match(result.body.northStarSignInProRule, /mounted app/i);
  const realty = result.body.tenants.find((tenant) => tenant.clientId === '480-realty-property-management');
  assert.equal(realty.valleyBusinessId, '480-realty-property-management-mesa-85209');
  assert.equal(realty.relayInboxId, 'relay13:480-realty-property-management');
  assert.equal(realty.installQr, '/client-app-factory/client-apps/480-realty-property-management/scan.html');
});

test('TENANT-02 Client App Factory intake lands in tenant backbone and Relay13 inbox', async () => {
  const e = env();
  const intake = await call(e, '/api/client-app-factory/factory/intake', {
    method: 'POST',
    body: {
      clientId: 'fade-masters-phx',
      displayName: 'Fade Masters PHX',
      primaryContact: 'Walk-in Visitor',
      phone: '(602) 555-0101',
      services: ['Skin Fade'],
      sourceUrl: 'https://example.invalid/client-app',
      notes: 'Preferred time is 3 PM.'
    }
  });
  assert.equal(intake.response.status, 200);
  assert.equal(intake.body.tenantLead.ok, true);
  assert.equal(intake.body.tenantLead.lead.workspaceId, 'fade-masters-phx-preview-001');
  assert.equal(intake.body.tenantLead.delivery.connectLog.status, 'landed_or_forwarded_to_connectlog_bridge');
  assert.equal(intake.body.tenantLead.delivery.sovereignMirror.ok, true);
  assert.equal(intake.body.tenantLead.delivery.sovereignMirror.status, 'needs_citadel_catchup');
  assert.equal(e.relayCalls.length, 1);
  assert.equal(e.relayCalls[0].path, '/api/v1/connectlog/scan');
  assert.equal(e.relayCalls[0].payload.workspace_id, 'fade-masters-phx-preview-001');

  const inbox = await call(e, '/api/0s/tenant-inbox?clientId=fade-masters-phx', { token: 'gate-token' });
  assert.equal(inbox.response.status, 200);
  assert.equal(inbox.body.events.length, 1);
  assert.equal(inbox.body.events[0].relayInboxId, 'relay13:fade-masters-phx');

  const exportPack = await call(e, '/api/0s/tenant-export?clientId=fade-masters-phx', { token: 'gate-token' });
  assert.equal(exportPack.response.status, 200);
  assert.equal(exportPack.body.sovereignExport, true);
  assert.equal(exportPack.body.leads.length, 1);
  assert.equal(exportPack.body.leads[0].delivery.sovereignMirror.status, 'needs_citadel_catchup');

  const ledger = await call(e, '/api/citadel/ledger?appId=client-app-factory', { token: 'gate-token' });
  assert.equal(ledger.response.status, 200);
  assert.equal(ledger.body.events.some((event) => event.table === 'tenant_leads' && event.recordId === intake.body.tenantLead.lead.id), true);
  assert.equal(ledger.body.events[0].primary.system, 'cloudflare_worker_kv');
});

test('TENANT-03 SkyeDocxMax, media reuse, and Content Engine packages persist through shared Worker lanes', async () => {
  const e = env();
  const token = 'gate-token';

  const docx = await call(e, '/api/0s/skye-docx-max/share', {
    method: 'POST',
    token,
    body: {
      clientId: 'empire-pallets',
      title: 'Quote Follow Up',
      documentId: 'doc_1',
      html: '<p>Quote ready.</p>',
      text: 'Quote ready.',
      targets: ['skyeBlog', 'skyeDrive', 'skyeMail']
    }
  });
  assert.equal(docx.response.status, 201);
  assert.equal(docx.body.share.skyeBlog.status, 'queued');
  assert.equal(docx.body.share.skyeDrive.status, 'queued');
  assert.equal(docx.body.share.skyeMail.status, 'queued');

  const upload = await call(e, '/api/media/assets', {
    method: 'POST',
    token,
    body: {
      action: 'upload',
      title: 'Client Proof Image',
      type: 'document',
      filename: 'proof.txt',
      content_base64: Buffer.from('proof asset', 'utf8').toString('base64'),
      tags: ['client-app', 'content-engine'],
      description: 'Reusable proof asset'
    }
  });
  assert.equal(upload.response.status, 201);

  const reuse = await call(e, '/api/media/reuse', {
    method: 'POST',
    token,
    body: {
      clientId: 'empire-pallets',
      assetId: upload.body.asset.id,
      targets: ['client_app_factory', 'content_engine']
    }
  });
  assert.equal(reuse.response.status, 201);
  assert.equal(reuse.body.package.contentEngineEndpoint, '/api/admin/content-engine/from-media-center');
  assert.equal(reuse.body.package.clientAppFactoryEndpoint, '/api/client-app-factory/factory/assets');

  const content = await call(e, '/api/admin/content-engine/from-marketing-made-easy', {
    method: 'POST',
    token,
    body: {
      clientId: 'empire-pallets',
      title: 'Pallet Buyer Follow Up',
      brief: { title: 'Pallet Buyer Follow Up', summary: 'Turn quote request into a follow-up campaign.' },
      generatedAssets: [{ id: 'asset_1', type: 'email' }],
      aiPlan: 'relay13-ai-response-starter',
      aiAddOnActive: true,
      usedThisMonth: 120
    }
  });
  assert.equal(content.response.status, 201);
  assert.equal(content.body.run.source_package.clientId, 'empire-pallets');
  assert.equal(content.body.run.ai_response_policy.bucket, 'primary');

  const dispatch = await call(e, '/api/admin/content-engine/dispatch', {
    method: 'POST',
    token,
    body: {
      run_id: content.body.run.id,
      approved: true,
      aiPlan: 'relay13-ai-response-starter',
      aiAddOnActive: true,
      usedThisMonth: 125
    }
  });
  assert.equal(dispatch.response.status, 200);
  assert.equal(dispatch.body.provider_call_made, false);
  assert.equal(dispatch.body.ai_response_policy.bucket, 'backup');
  assert.equal(dispatch.body.ai_response_policy.backupRemaining, 30);
});
