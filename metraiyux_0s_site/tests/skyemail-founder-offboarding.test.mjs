import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

if (!globalThis.crypto) globalThis.crypto = webcrypto;
const siteWorker = (await import('../cloudflare/worker.js')).default;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');
const OWNER_CODE = 'owner-code';
const SERVICE_TOKEN = 'skymail-service-token-for-tests';
const AUTH_HEADERS = {
  authorization: `Bearer ${OWNER_CODE}`,
  'x-admin-token': OWNER_CODE,
  'x-free99-admin-code': OWNER_CODE
};

function ctx() {
  const pending = [];
  return {
    pending,
    waitUntil(promise) {
      pending.push(Promise.resolve(promise).catch(() => null));
    }
  };
}

function req(pathname, { method = 'GET', headers = {}, body } = {}) {
  return new Request(`https://metraiyux.example${pathname}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

function kvStub() {
  const store = new Map();
  return {
    store,
    async put(key, value) {
      store.set(key, value);
    },
    async get(key, options = {}) {
      const value = store.get(key) || null;
      return options.type === 'json' && value ? JSON.parse(value) : value;
    },
    async list({ prefix = '' } = {}) {
      return { keys: [...store.keys()].filter((name) => name.startsWith(prefix)).map((name) => ({ name })) };
    }
  };
}

function queueStub(items) {
  return {
    async send(item) {
      items.push(item);
    }
  };
}

function skygateBinding() {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === '/admin/login') {
        return Response.json({
          ok: true,
          token: 'fs27-test-owner-token',
          user: { email: 'owner@example.com', role: 'owner' }
        });
      }
      if (['/auth-introspect', '/auth/introspect', '/.netlify/functions/auth-introspect'].includes(url.pathname)) {
        return Response.json({
          active: true,
          role: 'owner',
          scope: 'admin.read admin.write keys.write gateway.invoke skyevault.admin',
          email: 'owner@example.com',
          username: 'owner@example.com',
          sub: 'owner-test',
          customer_id: 'test-owner'
        });
      }
      return Response.json({ ok: false, error: 'unexpected_skygate_path', path: url.pathname }, { status: 404 });
    }
  };
}

function skyemailBinding(calls) {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      const raw = request.method === 'GET' ? '' : await request.text();
      const body = raw ? JSON.parse(raw) : {};
      calls.push({
        method: request.method,
        path: url.pathname,
        search: url.search,
        serviceToken: request.headers.get('x-skymail-service-token') || '',
        authorization: request.headers.get('authorization') || '',
        body
      });
      assert.equal(request.headers.get('x-skymail-service-token'), SERVICE_TOKEN);
      if (url.pathname.endsWith('workspace-mailbox-summary')) {
        assert.equal(request.headers.get('authorization') || '', `Bearer ${SERVICE_TOKEN}`);
      } else {
        assert.equal(request.headers.get('authorization') || '', '');
      }
      if (url.pathname !== '/mailbox-offboarding') {
        if (url.pathname === '/workspace-provision') {
          return Response.json({
            ok: true,
            user: { id: 'user_1', handle: body.workspace_slug || 'client-workspace', email: body.owner_email },
            mailbox: {
              id: 'mailbox_workspace',
              mailbox_email: `${body.local_part}@${body.domain}`,
              workspace_id: body.workspace_id,
              status: 'active',
              provisioning_status: 'provisioned',
              provider: 'zoho'
            },
            key_card: {
              id: 'keycard_1',
              setup_url: `https://skyemail.test/login?workspace_id=${encodeURIComponent(body.workspace_id || '')}`,
              status: 'issued'
            }
          });
        }
        if (url.pathname === '/workspace-mailbox-summary') {
          return Response.json({
            ok: true,
            mailbox: {
              id: 'mailbox_workspace',
              mailbox_email: url.searchParams.get('mailbox_email') || 'metraiyux-0s@solenterprises.org',
              workspace_id: url.searchParams.get('workspace_id') || 'metraiyux-0s-owner',
              status: 'active',
              provisioning_status: 'provisioned',
              provider: 'zoho'
            },
            counts: { total: 3, inbox_total: 2, inbox_unread: 1, sent_total: 1 },
            labels: [{ id: 'INBOX', name: 'Inbox', messagesTotal: 2, messagesUnread: 1 }],
            aliases: [{ alias_email: 'metraiyux-0s@solenterprises.org', alias_type: 'primary', status: 'active' }],
            recent_messages: [{ id: 'msg_1', subject: 'Pocket inbox proof', from: 'client@example.com', created_at: '2026-05-25T00:00:00.000Z' }],
            synced_at: '2026-05-25T00:00:00.000Z'
          });
        }
        return Response.json({ ok: false, error: 'unexpected_path', path: url.pathname }, { status: 404 });
      }
      return Response.json({
        ok: true,
        action: body.action || url.searchParams.get('action') || 'status',
        mailbox: {
          id: 'mailbox_1',
          mailbox_email: body.mailbox_email || url.searchParams.get('mailbox_email') || 'client@solenterprises.org',
          workspace_id: body.workspace_id || url.searchParams.get('workspace_id') || 'client-workspace',
          status: body.action === 'release' ? 'released' : 'offboarding_pending',
          provisioning_status: body.action === 'release' ? 'released_provider_seat_available' : 'archive_required',
          provider: 'zoho'
        },
        checklist: {
          ready_to_release: Boolean(body.confirm_archive_exported && body.confirm_provider_released),
          items: []
        },
        aliases: [],
        recent_events: []
      });
    }
  };
}

function assetsBinding() {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      const pathname = decodeURIComponent(url.pathname || '/');
      const target = path.resolve(siteRoot, `.${pathname}`);
      if (!target.startsWith(siteRoot)) return new Response('Forbidden', { status: 403 });
      try {
        const body = await fs.readFile(target);
        const contentType = pathname.endsWith('.json')
          ? 'application/json; charset=utf-8'
          : pathname.endsWith('.html')
            ? 'text/html; charset=utf-8'
            : 'application/octet-stream';
        return new Response(body, { status: 200, headers: { 'content-type': contentType } });
      } catch {
        return new Response('Not found', { status: 404 });
      }
    }
  };
}

function env(calls = [], queueItems = []) {
  return {
    FREE99_ADMIN_CODE: OWNER_CODE,
    OWNER_ADMIN_SESSION_SECRET: 'test-owner-session-secret',
    SKYMAIL_SERVICE_TOKEN: SERVICE_TOKEN,
    SKYGATEFS27_WORKER: skygateBinding(),
    SKYEMAIL_PLATFORM_WORKER: skyemailBinding(calls),
    ASSETS: assetsBinding(),
    SITE_EVENTS_KV: kvStub(),
    SITE_TASK_QUEUE: queueStub(queueItems)
  };
}

test('Founder Command exposes the SkyeMail offboarding control plane behind owner auth', async () => {
  const e = env();
  const c = ctx();
  const res = await siteWorker.fetch(req('/api/founder-command/status', { headers: AUTH_HEADERS }), e, c);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.skyemail.offboarding.route, '/api/founder-command/skyemail/offboarding');
  assert.equal(body.skyemail.offboarding.service_token_configured, true);
  assert.equal(body.skyemail.pocket.route, '/api/founder-command/skyemail/pocket');
  assert.equal(body.skyemail.handoffs.route, '/api/founder-command/skyemail/handoffs');
  assert.ok(body.links.some((link) => link.href === '/founder-command/?view=mailboxes'));
});

test('Founder Command exposes a synced Pocket SkyeMail summary for the phone command dock', async () => {
  const calls = [];
  const e = env(calls);
  const c = ctx();
  await siteWorker.fetch(req('/api/founder-command/skyemail/handoffs', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: {
      action: 'main-0s',
      owner_email: 'gray@solenterprises.org',
      domain: 'solenterprises.org'
    }
  }), e, c);
  const res = await siteWorker.fetch(req('/api/founder-command/skyemail/pocket', { headers: AUTH_HEADERS }), e, c);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.mode, 'service-summary');
  assert.equal(body.summary.counts.inbox_unread, 1);
  assert.equal(calls.at(-1).path, '/workspace-mailbox-summary');
  assert.equal(JSON.stringify(body).includes(SERVICE_TOKEN), false);
});

test('0S live SkyeMail compatibility URLs redirect to the real SkyeMail platform', async () => {
  const e = env();
  const c = ctx();
  const res = await siteWorker.fetch(req('/live/SkyeMail/dashboard.html?from=founder-command', {
    headers: AUTH_HEADERS
  }), e, c);

  assert.equal(res.status, 302);
  assert.equal(
    res.headers.get('location'),
    'https://skyemail-platform.graylondonskyes.workers.dev/dashboard.html?from=founder-command'
  );
  assert.equal(res.headers.get('x-0s-live-redirect'), 'dedicated-gated-system');
});

test('0S live SkyeMail session handoff stays on 0S long enough to transfer the shared gate session', async () => {
  const e = env();
  const c = ctx();
  const path = '/live/SkyeMail/session-handoff.html?next=dashboard.html&from=founder-command';
  const unauth = await siteWorker.fetch(req(path, { headers: { accept: 'text/html' } }), e, c);
  const unauthHtml = await unauth.text();
  assert.equal(unauth.status, 200);
  assert.equal(unauth.headers.get('x-0s-skyemail-handoff'), 'free99-session');
  assert.ok(unauthHtml.includes('data-skyemail-session-handoff="true"'));
  assert.ok(unauthHtml.includes('/admin/login.html'));
  assert.ok(unauthHtml.includes('return'));
  assert.ok(unauthHtml.includes('FREE99_PLATFORM_GATE_SESSION'));

  const res = await siteWorker.fetch(req(path, {
    headers: { ...AUTH_HEADERS, accept: 'text/html' }
  }), e, c);
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-0s-skyemail-handoff'), 'free99-session');
  assert.ok(html.includes('data-skyemail-session-handoff="true"'));
  assert.ok(html.includes('/gate-return.html'));
  assert.ok(html.includes('FREE99_PLATFORM_GATE_SESSION'));
});

test('Founder Command returns a runbook for empty offboarding status requests', async () => {
  const calls = [];
  const e = env(calls);
  const c = ctx();
  const res = await siteWorker.fetch(req('/api/founder-command/skyemail/offboarding', { headers: AUTH_HEADERS }), e, c);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.founder_command, '/founder-command/?view=mailboxes');
  assert.equal(calls.length, 0);
});

test('Founder Command proxies mailbox offboarding without leaking service secrets', async () => {
  const calls = [];
  const queueItems = [];
  const e = env(calls, queueItems);
  const c = ctx();
  const res = await siteWorker.fetch(req('/api/founder-command/skyemail/offboarding', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: {
      action: 'prepare',
      mailbox_email: 'client@solenterprises.org',
      workspace_id: 'vv-client',
      reason: 'client requested mailbox release'
    }
  }), e, c);
  const body = await res.json();
  await Promise.all(c.pending);

  assert.equal(res.status, 201);
  assert.equal(body.ok, true);
  assert.equal(body.offboarding.mailbox.mailbox_email, 'client@solenterprises.org');
  assert.equal(body.record.provider_runtime.status, 'executed');
  assert.equal(body.record.provider_runtime.action, 'skymail.mailbox.offboarding');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, '/mailbox-offboarding');
  assert.equal(calls[0].serviceToken, SERVICE_TOKEN);
  assert.equal(calls[0].body.source, 'founder-command');
  assert.equal(JSON.stringify(body).includes(SERVICE_TOKEN), false);
  assert.equal(queueItems.length, 1);
});

test('Founder Command creates SkyeMail workspace handoff packets with QR-safe claim data', async () => {
  const calls = [];
  const queueItems = [];
  const e = env(calls, queueItems);
  const c = ctx();
  const res = await siteWorker.fetch(req('/api/founder-command/skyemail/handoffs', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: {
      company_name: 'Valley Client',
      owner_email: 'owner@example.com',
      workspace_handle: 'valley-client',
      mailbox_local: 'valley-client',
      domain: 'solenterprises.org',
      send_email: true
    }
  }), e, c);
  const body = await res.json();
  await Promise.all(c.pending);

  assert.equal(res.status, 201);
  assert.equal(body.ok, true);
  assert.equal(body.record.mailbox_email, 'valley-client@solenterprises.org');
  assert.equal(body.record.credential_model.founder_command_stores_plaintext_password, false);
  assert.equal(body.record.provision.provider_runtime.status, 'executed');
  assert.equal(body.record.provision.provider_runtime.action, 'skymail.mailbox.provision');
  assert.ok(body.record.qr_payload.includes('skyemail-platform'));
  assert.ok(body.record.skyemerit_offer.prompt.includes('SkyeMerit'));
  assert.equal(body.record.public_contact_email, 'mediaoverlondon@solenterprises.org');
  assert.deepEqual(body.record.workspace_confirmation_recipients, [
    'grayskyes@solenterprises.org',
    'skyesoverlondonlc@solenterprises.org',
    'skyesoverlondon222@gmail.com'
  ]);
  assert.equal(body.email_delivery.ok, true);
  assert.equal(body.email_delivery.provider_runtime_status, 'executed_sandbox');
  assert.ok(body.email_delivery.provider_runtime_receipt_id);
  assert.equal(calls.at(-1).path, '/workspace-provision');
  assert.equal(calls.at(-1).body.workspace_slug, 'valley-client');
  assert.equal(JSON.stringify(body).includes(SERVICE_TOKEN), false);
  assert.equal(queueItems.length, 1);
});

test('Founder Command can stage SkyeMail handoff packets without provider provisioning', async () => {
  const calls = [];
  const queueItems = [];
  const e = env(calls, queueItems);
  const c = ctx();
  const res = await siteWorker.fetch(req('/api/founder-command/skyemail/handoffs', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: {
      action: 'stage-only',
      handoff_id: 'skymail_handoff_stage_only_test',
      skip_provision: true,
      provider_safe_only: true,
      company_name: 'Stage Only Client',
      owner_email: 'owner@example.com',
      workspace_handle: 'stage-only-client',
      mailbox_local: 'stage-only-client',
      domain: 'solenterprises.org',
      send_email: false
    }
  }), e, c);
  const body = await res.json();
  await Promise.all(c.pending);

  assert.equal(res.status, 202);
  assert.equal(body.ok, true);
  assert.equal(body.record.id, 'skymail_handoff_stage_only_test');
  assert.equal(body.record.status, 'handoff_staged_provider_pending');
  assert.equal(body.record.provision.skipped, true);
  assert.match(body.record.provision.reason, /staged without provider provisioning/i);
  assert.equal(calls.length, 0);
  assert.equal(queueItems.length, 1);

  const read = await siteWorker.fetch(req('/api/founder-command/skyemail/handoffs?id=skymail_handoff_stage_only_test', { headers: AUTH_HEADERS }), e, c);
  const readBody = await read.json();
  assert.equal(read.status, 200);
  assert.equal(readBody.ok, true);
  assert.equal(readBody.record.mailbox_email, 'stage-only-client@solenterprises.org');
});

test('Founder Command can create the MetrAIyux-0s main contact workspace', async () => {
  const calls = [];
  const e = env(calls);
  const c = ctx();
  const res = await siteWorker.fetch(req('/api/founder-command/skyemail/handoffs', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: {
      action: 'main-0s',
      owner_email: 'gray@solenterprises.org',
      domain: 'solenterprises.org'
    }
  }), e, c);
  const body = await res.json();
  await Promise.all(c.pending);

  assert.equal(res.status, 201);
  assert.equal(body.ok, true);
  assert.equal(body.record.workspace_handle_display, 'MetrAIyux-0s');
  assert.equal(body.record.mailbox_email, 'metraiyux-0s@solenterprises.org');
  assert.equal(calls.at(-1).path, '/workspace-provision');
});

test('Founder Command streams the SkyeVault repo vault proof behind owner auth', async () => {
  const e = env();
  const c = ctx();
  const res = await siteWorker.fetch(req('/api/founder-command/repo-vault', { headers: AUTH_HEADERS }), e, c);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.ready, true);
  assert.equal(body.route, '/api/founder-command/repo-vault');
  assert.equal(body.repo.name, 'MetrAIyux-0S');
  assert.equal(body.safety.raw_file_bodies_exposed, false);
  assert.equal(body.safety.secret_values_exposed, false);
  assert.ok(body.project_manifest.coverage.safe_browser_entry_count > 1000);
  assert.ok(body.project_manifest.top_level.some((item) => item.path === 'metraiyux_0s_site'));
  assert.ok(body.project_manifest.chunks.some((chunk) => chunk.id === 'entries-000'));
  assert.ok(body.stream_files.some((file) => file.id === 'autosync-proof'));
  assert.ok(body.stream_files.some((file) => file.id === 'project-manifest'));
  assert.ok(body.links.some((link) => link.href === '/Free99/apps/skyevaultpro/drive/index.html'));
  assert.ok(body.core_apps.some((app) => app.id === 'core-zero-os-browser'));
  assert.equal(JSON.stringify(body).includes(SERVICE_TOKEN), false);
});

test('Founder Command repo vault file stream only exposes allowlisted proof files', async () => {
  const e = env();
  const c = ctx();
  const res = await siteWorker.fetch(req('/api/founder-command/repo-vault?file=autosync-proof', { headers: AUTH_HEADERS }), e, c);
  const body = await res.json();
  const denied = await siteWorker.fetch(req('/api/founder-command/repo-vault?file=env.txt', { headers: AUTH_HEADERS }), e, c);
  const deniedBody = await denied.json();

  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.file.id, 'autosync-proof');
  assert.equal(body.safety.raw_file_bodies_exposed, false);
  assert.equal(body.data.schema, 'skyevault.autosync-public-proof.v1');
  assert.equal(denied.status, 404);
  assert.equal(deniedBody.ok, false);
});

test('Founder Command streams chunked full-project repo vault paths', async () => {
  const e = env();
  const c = ctx();
  const res = await siteWorker.fetch(req('/api/founder-command/repo-vault?chunk=entries-000', { headers: AUTH_HEADERS }), e, c);
  const body = await res.json();
  const denied = await siteWorker.fetch(req('/api/founder-command/repo-vault?chunk=../../env', { headers: AUTH_HEADERS }), e, c);

  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.file.id, 'entries-000');
  assert.equal(body.data.schema, 'skyevault.project-manifest-chunk.v1');
  assert.ok(body.data.entries.length > 0);
  assert.equal(body.safety.raw_file_bodies_exposed, false);
  assert.equal(denied.status, 404);
});

test('Founder Command chat routes mailbox questions to the offboarding tutorial', async () => {
  const e = env();
  const c = ctx();
  const res = await siteWorker.fetch(req('/api/founder-command/chat', {
    method: 'POST',
    headers: AUTH_HEADERS,
    body: { message: 'how do I offboard a skyemail mailbox and reuse the provider seat' }
  }), e, c);
  const body = await res.json();
  await Promise.all(c.pending);

  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.receipt.intent, 'skyemail_offboarding');
  assert.ok(body.answer.links.some((link) => link.href.includes('29-skyemail-mailbox-offboarding')));
});

test('SkyeMail and Founder Command static offboarding markers are present', async () => {
  const worker = await fs.readFile(path.join(siteRoot, 'live/SkyeMail/cloudflare/skymail-worker.mjs'), 'utf8');
  const schema = await fs.readFile(path.join(siteRoot, 'live/SkyeMail/sql/schema.sql'), 'utf8');
  const skymailIndex = await fs.readFile(path.join(siteRoot, 'live/SkyeMail/index.html'), 'utf8');
  const app = await fs.readFile(path.join(siteRoot, 'founder-command/app.js'), 'utf8');
  const html = await fs.readFile(path.join(siteRoot, 'founder-command/index.html'), 'utf8');
  const free99Gate = await fs.readFile(path.join(siteRoot, 'Free99/free99-gate.js'), 'utf8');
  const tutorial = await fs.readFile(path.join(siteRoot, 'admin/tutorial/29-skyemail-mailbox-offboarding.html'), 'utf8');
  const handoffTutorial = await fs.readFile(path.join(siteRoot, 'admin/tutorial/30-skyemail-workspace-handoffs.html'), 'utf8');
  const pocketTutorial = await fs.readFile(path.join(siteRoot, 'admin/tutorial/31-founder-command-pocket-0s.html'), 'utf8');

  assert.ok(worker.includes('handleMailboxOffboarding'));
  assert.ok(worker.includes('mailbox-offboarding'));
  assert.ok(worker.includes('handleWorkspaceMailboxSummary'));
  assert.ok(worker.includes('workspace-mailbox-summary'));
  assert.ok(worker.includes('confirm_provider_released'));
  assert.ok(schema.includes('create table if not exists skymail.mailbox_offboarding_events'));
  assert.ok(skymailIndex.includes('SkyeMail Launch Spark'));
  assert.ok(skymailIndex.includes('handoffWelcomeToast'));
  assert.ok(app.includes('/api/founder-command/skyemail/offboarding'));
  assert.ok(app.includes('/api/founder-command/skyemail/handoffs'));
  assert.ok(app.includes('/api/founder-command/skyemail/pocket'));
  assert.ok(app.includes('/api/founder-command/repo-vault'));
  assert.ok(app.includes('project_manifest'));
  assert.ok(app.includes('DEFAULT_CORE_APPS'));
  assert.ok(app.includes('core-zero-os-browser'));
  assert.ok(app.includes('core-skyevault-drive'));
  assert.ok(app.includes('SovereignDocs'));
  assert.ok(app.includes('SkyeMusicNexus'));
  assert.ok(app.includes('SkyeRouteX Workforce'));
  assert.ok(app.includes('/live/SkyeMail/session-handoff.html?next=dashboard.html&from=founder-command'));
  assert.ok(app.includes('SKYEMAIL_PLATFORM_ORIGIN'));
  assert.ok(free99Gate.includes('FREE99_PENDING_APP_RETURN'));
  const adminLogin = await fs.readFile(path.join(siteRoot, 'cloudflare/generated-admin-login-page.mjs'), 'utf8');
  assert.ok(adminLogin.includes("returnParams.get('return_to')"));
  assert.ok(adminLogin.includes('FREE99_PENDING_APP_RETURN'));
  assert.ok(app.includes('Business Card Factory'));
  assert.ok(html.includes('id="view-mailboxes"'));
  assert.ok(html.includes('id="view-core"'));
  assert.ok(html.includes('id="view-repo-vault"'));
  assert.ok(html.includes('id="repoVaultStreamGrid"'));
  assert.ok(html.includes('id="repoVaultCommandList"'));
  assert.ok(html.includes('id="repoVaultProjectTree"'));
  assert.ok(html.includes('id="repoVaultChunkGrid"'));
  assert.ok(html.includes('id="pocket-skyemail"'));
  assert.ok(html.includes('id="coreAppsGrid"'));
  assert.ok(html.includes('id="workspace-handoffs"'));
  assert.ok(html.includes('/assets/vendor/qrcode-generator.js'));
  assert.ok(tutorial.includes('SkyeMail mailbox offboarding'));
  assert.ok(handoffTutorial.includes('SkyeMail workspace handoffs'));
  assert.ok(pocketTutorial.includes('Founder Command Pocket 0S'));
});
