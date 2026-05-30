import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const root = path.resolve(process.cwd());
const require = createRequire(import.meta.url);
const WebSocketCtor = globalThis.WebSocket || require('ws');
const reportPath = path.join(root, 'test-artifacts', 'connectlog-relay13-production-proof.json');
const origin = (process.env.RELAY13_ORIGIN || 'https://relay13-core.graylondonskyes.workers.dev').replace(/\/$/, '');

function parseEnv(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[match[1]] = value;
  }
  return out;
}

const rootEnv = parseEnv(path.join(root, '.env'));
const adminToken = process.env.PLATFORM_ADMIN_TOKEN || rootEnv.PLATFORM_ADMIN_TOKEN || rootEnv.SKYGATEFS13_WORKER_ADMIN_TOKEN || '';
if (!adminToken || adminToken.length < 32) throw new Error('Missing usable PLATFORM_ADMIN_TOKEN/SKYGATEFS13_WORKER_ADMIN_TOKEN.');

const checks = [];
const startedAt = new Date().toISOString();
let workspace = null;
let apiKey = '';
let conversation = null;

async function request(name, urlPath, options = {}) {
  const headers = { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) };
  const res = await fetch(`${origin}${urlPath}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  const ok = res.ok && data.ok !== false;
  checks.push({ name, ok, status: res.status });
  if (!ok) throw new Error(`${name} failed with ${res.status}: ${JSON.stringify(data).slice(0, 500)}`);
  return data;
}

function adminHeaders() {
  return { authorization: `Bearer ${adminToken}` };
}

function keyHeaders() {
  return { 'x-relay13-api-key': apiKey };
}

function sanitizeData(data) {
  if (!data || typeof data !== 'object') return data;
  return JSON.parse(JSON.stringify(data, (key, value) => {
    if (/api_?key|token|authorization/i.test(key)) return value ? '<redacted>' : value;
    return value;
  }));
}

function waitForWebSocket(url, label) {
  return new Promise((resolve, reject) => {
    if (typeof WebSocketCtor !== 'function') {
      reject(new Error('WebSocket client is not available in this Node runtime.'));
      return;
    }
    const ws = new WebSocketCtor(url);
    const messages = [];
    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error(`${label} WebSocket timed out`));
    }, 9000);
    ws.addEventListener('message', (event) => {
      messages.push(String(event.data || ''));
      if (messages.some((item) => item.includes('"type":"ready"') || item.includes('"type": "ready"'))) {
        clearTimeout(timer);
        try { ws.close(); } catch {}
        resolve(messages);
      }
    });
    ws.addEventListener('error', () => {
      clearTimeout(timer);
      reject(new Error(`${label} WebSocket error`));
    });
  });
}

try {
  await request('worker_health', '/api/health');
  await request('connectlog_bridge_health', '/api/v1/connectlog/health');

  const bootstrap = await request('bootstrap_workspace', '/api/bootstrap', { method: 'POST', headers: adminHeaders() });
  workspace = bootstrap.workspace;

  for (const domain of [
    'metraiyux-0s-full-system.graylondonskyes.workers.dev',
    'relay13-core.graylondonskyes.workers.dev',
    'metraiyux-0s-marketing.pages.dev',
    'metraiyux-0s-public-spectacle.pages.dev'
  ]) {
    await request(`domain:${domain}`, '/api/admin/workspace-domains', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ workspace_id: workspace.id, domain })
    });
  }

  const createdKey = await request('create_scoped_api_key', '/api/admin/api-keys', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({
      workspace_id: workspace.id,
      name: `ConnectLog production proof ${new Date().toISOString()}`,
      scopes: ['workspace:admin', 'widget:read', 'conversations:create', 'conversations:read', 'conversations:write', 'messages:read', 'messages:write', 'connectlog:read', 'connectlog:write']
    })
  });
  apiKey = createdKey.api_key.key;

  const cardId = `prod-proof-${Date.now()}`;
  await request('connectlog_card_upsert', '/api/v1/connectlog/cards', {
    method: 'POST',
    headers: keyHeaders(),
    body: JSON.stringify({
      workspace_id: workspace.id,
      connectlog_bridge: true,
      connectlog_card_id: cardId,
      connectlog_card_label: 'MetrAIyux 0S Production Proof Card',
      connectlog_campaign: 'connectlog-relay13-production-proof',
      connectlog_owner_name: 'MetrAIyux 0S Operator',
      connectlog_welcome_message: 'Relay13 production proof welcome message.'
    })
  });

  conversation = await request('connectlog_scan_conversation', '/api/v1/connectlog/scan', {
    method: 'POST',
    headers: keyHeaders(),
    body: JSON.stringify({
      workspace_id: workspace.id,
      workspace: workspace.slug,
      channel: 'connectlog-card',
      customer_name: 'Production Proof Visitor',
      customer_email: 'proof@example.com',
      body: 'Relay13 production proof conversation from ConnectLog.',
      connectlog_bridge: true,
      connectlog_card_id: cardId,
      connectlog_card_label: 'MetrAIyux 0S Production Proof Card',
      connectlog_campaign: 'connectlog-relay13-production-proof',
      connectlog_owner_name: 'MetrAIyux 0S Operator',
      connectlog_welcome_message: 'Relay13 production proof welcome message.'
    })
  });

  await request('message_history_pull', `/api/v1/conversations/${encodeURIComponent(conversation.conversation_id)}/messages?workspace_id=${encodeURIComponent(workspace.id)}`, {
    headers: keyHeaders()
  });

  await request('record_activation_run', '/api/v1/connectlog/activation-runs', {
    method: 'POST',
    headers: keyHeaders(),
    body: JSON.stringify({
      ok: true,
      status: 'passed',
      conversation_id: conversation.conversation_id,
      summary: 'ConnectLog + Relay13 production activation proof passed.'
    })
  });

  const activation = await request('activation_endpoint', `/api/v1/connectlog/activation?workspace_id=${encodeURIComponent(workspace.id)}`, {
    headers: keyHeaders()
  });
  const liveProof = await request('live_proof_endpoint', `/api/v1/connectlog/live-proof?workspace_id=${encodeURIComponent(workspace.id)}`, {
    headers: keyHeaders()
  });
  if (liveProof.production_ready !== true) throw new Error('Live proof endpoint did not report production_ready=true.');

  const wsOrigin = origin.replace(/^http/, 'ws');
  const customerMessages = await waitForWebSocket(`${wsOrigin}/api/ws/${encodeURIComponent(conversation.conversation_id)}?role=customer&token=${encodeURIComponent(conversation.visitor_token)}&name=Production%20Proof%20Visitor`, 'customer');
  checks.push({ name: 'customer_websocket_ready', ok: customerMessages.length > 0, status: 101 });
  const operatorMessages = await waitForWebSocket(`${wsOrigin}/api/ws/${encodeURIComponent(conversation.conversation_id)}?role=operator&workspace_id=${encodeURIComponent(workspace.id)}&token=${encodeURIComponent(adminToken)}&name=Operator`, 'operator');
  checks.push({ name: 'operator_websocket_ready', ok: operatorMessages.length > 0, status: 101 });

  await request('record_live_proof_run', '/api/v1/connectlog/live-proof-runs', {
    method: 'POST',
    headers: keyHeaders(),
    body: JSON.stringify({
      ok: true,
      production_ready: true,
      summary: 'Relay13 production live proof passed with HTTP and WebSocket gates.',
      activation: sanitizeData(activation),
      live_proof: sanitizeData(liveProof)
    })
  });

  const report = {
    ok: checks.every((check) => check.ok),
    origin,
    workspace: { id: workspace.id, slug: workspace.slug, name: workspace.name },
    api_key_prefix: createdKey.api_key.key_prefix,
    conversation_id: conversation.conversation_id,
    checked_at: new Date().toISOString(),
    started_at: startedAt,
    checks,
    live_proof: sanitizeData(liveProof)
  };
  await fsp.mkdir(path.dirname(reportPath), { recursive: true });
  await fsp.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
} catch (error) {
  const report = { ok: false, origin, workspace: workspace ? { id: workspace.id, slug: workspace.slug, name: workspace.name } : null, conversation_id: conversation?.conversation_id || null, checked_at: new Date().toISOString(), started_at: startedAt, error: error.message, checks };
  await fsp.mkdir(path.dirname(reportPath), { recursive: true });
  await fsp.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
