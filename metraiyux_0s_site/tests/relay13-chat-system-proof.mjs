import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.cwd());
const origin = (process.env.RELAY13_ORIGIN || 'https://relay13-core.graylondonskyes.workers.dev').replace(/\/$/, '');
const gateOrigin = (process.env.SKYGATEFS27_ORIGIN || 'https://skyegatefs27-citadeldb.graylondonskyes.workers.dev').replace(/\/$/, '');
const reportPath = path.join(root, 'test-artifacts', 'relay13-chat-system-proof.json');
const publicReportPath = path.join(root, 'metraiyux_0s_site', 'data', 'relay13-chat-system-proof.json');

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

const env = parseEnv(path.join(root, '.env'));
const mirrorSecret = process.env.SKYGATE_EVENT_MIRROR_SECRET
  || process.env.SKYGATEFS27_EVENT_MIRROR_SECRET
  || env.SKYGATE_EVENT_MIRROR_SECRET
  || env.SKYGATEFS27_EVENT_MIRROR_SECRET
  || '';

const accounts = [
  {
    label: 'MetrAIyux 0S',
    account_code: 'METRAIYUX-0S-SKM',
    workspace: 'connectlog-main',
    expected_workspace_id: 'ws_2533ccd0-08e2-48ec-b74c-f1389c7062a7',
    origin: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev',
    source_url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/',
    card_id: 'metraiyux-0s-public-site',
    message: '0S public chat proof: route this as a brain-assisted website question.',
    followup: '0S public chat proof follow-up: direct operator route stays persisted too.'
  },
  {
    label: "Bob's Smoke Shop",
    account_code: 'BOBS-SMOKE-SHOP-SKM',
    workspace: 'bobs-smoke-shop',
    expected_workspace_id: 'ws_bobs_smoke_shop',
    origin: 'https://bobs-smoke-shop.pages.dev',
    source_url: 'https://bobs-smoke-shop.pages.dev/',
    card_id: 'bobs-smoke-shop-client-workspace',
    message: "Bob's customer proof: asking about smoke shop bundles and local pickup.",
    followup: "Bob's customer proof follow-up: this second message should persist in the same thread."
  },
  {
    label: 'Empire Pallets',
    account_code: 'EMPIRE-PALLETS-SKM',
    workspace: 'empire-pallets',
    expected_workspace_id: 'ws_empire_pallets',
    origin: 'https://empire-pallets.pages.dev',
    source_url: 'https://empire-pallets.pages.dev/',
    card_id: 'empire-pallets-client-workspace',
    message: 'Empire customer proof: asking about pallet supply, delivery, and recurring orders.',
    followup: 'Empire customer proof follow-up: this second message should persist in the same thread.'
  }
];

const checks = [];

function sanitize(data) {
  return JSON.parse(JSON.stringify(data, (key, value) => {
    if (/token|authorization|api_?key|secret/i.test(key)) return value ? '<redacted>' : value;
    return value;
  }));
}

async function relay(pathname, { name, account, method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${origin}${pathname}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(account?.origin ? { origin: account.origin } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  const ok = res.ok && data.ok !== false;
  if (name) checks.push({ name, ok, status: res.status, workspace: account?.workspace || null });
  if (!ok) throw new Error(`${name || pathname} failed ${res.status}: ${JSON.stringify(data).slice(0, 500)}`);
  return data;
}

function waitForWebSocket(url, name, workspace) {
  return new Promise((resolve, reject) => {
    if (typeof WebSocket === 'undefined') {
      reject(new Error('Global WebSocket is not available in this Node runtime.'));
      return;
    }
    const ws = new WebSocket(url);
    const messages = [];
    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error(`${name} timed out`));
    }, 9000);
    ws.addEventListener('message', (event) => {
      messages.push(String(event.data || ''));
      if (messages.some((item) => item.includes('"type":"ready"') || item.includes('"type": "ready"'))) {
        clearTimeout(timer);
        try { ws.close(); } catch {}
        checks.push({ name, ok: true, status: 101, workspace });
        resolve(messages);
      }
    });
    ws.addEventListener('error', () => {
      clearTimeout(timer);
      checks.push({ name, ok: false, status: 0, workspace });
      reject(new Error(`${name} websocket error`));
    });
  });
}

async function proveAccount(account) {
  const created = await relay('/api/v1/conversations', {
    name: `${account.workspace}:create_conversation`,
    account,
    method: 'POST',
    body: {
      workspace: account.workspace,
      workspace_id: account.expected_workspace_id,
      channel: 'website-widget',
      customer_name: `${account.label} SKM proof visitor`,
      subject: `${account.label} Relay13 SKM proof`,
      message: account.message,
      source_url: account.source_url,
      connectlog_bridge: true,
      connectlog_card_id: account.card_id,
      connectlog_card_label: `${account.label} SKM workspace`,
      connectlog_campaign: 'relay13-chat-system-proof',
      connectlog_owner_name: 'MetrAIyux Operator',
      connectlog_owner_company: account.label,
      connectlog_owner_role: 'Operator',
      connectlog_welcome_message: `${account.label} SKM workspace opened through Relay13.`,
      connectlog_tags: ['relay13', 'connectlog', 'skm', account.account_code.toLowerCase()],
      metadata: {
        account_code: account.account_code,
        skye_merit_account: true,
        source_app: account.workspace,
        source_lane: 'relay13-chat-system-proof'
      }
    }
  });
  if (created.workspace_id !== account.expected_workspace_id) {
    throw new Error(`${account.workspace} expected workspace ${account.expected_workspace_id}, got ${created.workspace_id}`);
  }

  await relay(`/api/v1/conversations/${encodeURIComponent(created.conversation_id)}/messages`, {
    name: `${account.workspace}:visitor_followup`,
    account,
    method: 'POST',
    body: {
      visitor_token: created.visitor_token,
      sender_name: `${account.label} SKM visitor`,
      body: account.followup
    }
  });

  const history = await relay(`/api/v1/conversations/${encodeURIComponent(created.conversation_id)}/messages?visitor_token=${encodeURIComponent(created.visitor_token)}`, {
    name: `${account.workspace}:message_history`,
    account
  });
  if ((history.messages || []).length < 2) throw new Error(`${account.workspace} message history did not persist both messages.`);

  const wsOrigin = origin.replace(/^http/, 'ws');
  await waitForWebSocket(`${wsOrigin}/api/ws/${encodeURIComponent(created.conversation_id)}?role=customer&token=${encodeURIComponent(created.visitor_token)}&name=${encodeURIComponent(`${account.label} SKM visitor`)}`, `${account.workspace}:customer_websocket`, account.workspace);

  return {
    account_code: account.account_code,
    workspace_slug: account.workspace,
    workspace_id: created.workspace_id,
    conversation_id: created.conversation_id,
    bridge: created.bridge,
    connectlog_card_record_id: created.connectlog_card_record_id,
    persisted_message_count: history.messages.length,
    latest_message_names: history.messages.slice(-3).map((message) => message.sender_name || message.sender_role)
  };
}

async function proveIntroRoom() {
  const account = accounts[0];
  const created = await relay('/api/v1/conversations', {
    name: 'skm_intro:create_room',
    account,
    method: 'POST',
    body: {
      workspace: account.workspace,
      workspace_id: account.expected_workspace_id,
      channel: 'website-widget',
      customer_name: 'Bob + Empire SKM intro room',
      subject: 'Bob + Empire SKM money-move intro',
      message: "Bob's Smoke Shop SKM: looking at better display, storage, and local delivery packaging.",
      source_url: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/live/relay13-chat-hub.html',
      connectlog_bridge: true,
      connectlog_card_id: 'bob-empire-skm-intro',
      connectlog_card_label: 'Bob + Empire SKM intro room',
      connectlog_campaign: 'relay13-chat-system-proof',
      connectlog_owner_name: 'MetrAIyux Operator',
      connectlog_owner_company: 'MetrAIyux 0S',
      connectlog_owner_role: 'Operator',
      connectlog_welcome_message: 'Operator-mediated Bob + Empire SKM intro room opened in Relay13.',
      connectlog_tags: ['relay13', 'connectlog', 'skm', 'bob', 'empire', 'money-moves'],
      metadata: {
        account_code: 'BOB-EMPIRE-SKM-INTRO',
        source_app: 'relay13-chat-hub',
        source_lane: 'operator-mediated-account-intro'
      }
    }
  });

  for (const message of [
    {
      sender_name: 'Empire Pallets SKM',
      body: 'Empire Pallets SKM: we can discuss recurring pallet supply, pickup/drop routing, and display-ready pallet bundles.'
    },
    {
      sender_name: "Bob's Smoke Shop SKM",
      body: "Bob's Smoke Shop SKM: we can explore bulk display orders and local logistics if the numbers make sense."
    }
  ]) {
    await relay(`/api/v1/conversations/${encodeURIComponent(created.conversation_id)}/messages`, {
      name: `skm_intro:${message.sender_name}`,
      account,
      method: 'POST',
      body: {
        visitor_token: created.visitor_token,
        sender_name: message.sender_name,
        body: message.body
      }
    });
  }

  const history = await relay(`/api/v1/conversations/${encodeURIComponent(created.conversation_id)}/messages?visitor_token=${encodeURIComponent(created.visitor_token)}`, {
    name: 'skm_intro:message_history',
    account
  });
  const names = new Set((history.messages || []).map((message) => message.sender_name));
  if (!names.has('Empire Pallets SKM') || !names.has("Bob's Smoke Shop SKM")) throw new Error('SKM intro room did not persist both account-named messages.');
  return {
    account_code: 'BOB-EMPIRE-SKM-INTRO',
    workspace_slug: account.workspace,
    workspace_id: created.workspace_id,
    conversation_id: created.conversation_id,
    bridge: created.bridge,
    persisted_message_count: history.messages.length,
    participant_names_observed: [...names].filter(Boolean)
  };
}

async function mirrorGate(report) {
  if (!mirrorSecret) return { skipped: true, reason: 'SKYGATE_EVENT_MIRROR_SECRET not configured' };
  const res = await fetch(`${gateOrigin}/.netlify/functions/platform-event-ingest`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-skygate-mirror-secret': mirrorSecret
    },
    body: JSON.stringify({
      source_app: 'relay13-chat-hub',
      actor: 'SkyesOverLondonLC@solenterprises.org',
      ws_id: 'ws_2533ccd0-08e2-48ec-b74c-f1389c7062a7',
      type: 'relay13.chat_system.live_proof',
      event_ts: report.checked_at,
      meta: {
        billable: false,
        skye_merit_account: true,
        account_codes: report.accounts.map((item) => item.account_code),
        intro_conversation_id: report.intro_room.conversation_id,
        checks_passed: report.checks.filter((check) => check.ok).length,
        checks_total: report.checks.length
      }
    })
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.ok !== false, status: res.status, data: sanitize(data) };
}

try {
  await relay('/api/health', { name: 'relay13:health' });
  await relay('/api/v1/connectlog/health', { name: 'connectlog:bridge_health' });

  const accountProofs = [];
  for (const account of accounts) accountProofs.push(await proveAccount(account));
  const introRoom = await proveIntroRoom();

  const report = {
    ok: checks.every((check) => check.ok),
    origin,
    gate_origin: gateOrigin,
    checked_at: new Date().toISOString(),
    accounts: accountProofs,
    intro_room: introRoom,
    checks,
    boundaries: [
      'Customer messages persisted through Relay13 D1 and were read back through the message-history API.',
      'Customer WebSocket rooms opened for each account proof conversation.',
      'Bob and Empire SKM intro proof is operator-mediated in one Relay13 room; separate authenticated business-to-business rooms require the next participant-token feature.',
      'Automatic brain replies require a server-side brain bridge. The current widget stores brain-assisted/direct-operator route metadata without exposing owner secrets.'
    ]
  };
  report.skgate_mirror = await mirrorGate(report);
  await fsp.mkdir(path.dirname(reportPath), { recursive: true });
  await fsp.mkdir(path.dirname(publicReportPath), { recursive: true });
  await fsp.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await fsp.writeFile(publicReportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
} catch (error) {
  const report = {
    ok: false,
    origin,
    gate_origin: gateOrigin,
    checked_at: new Date().toISOString(),
    error: error.message,
    checks
  };
  await fsp.mkdir(path.dirname(reportPath), { recursive: true });
  await fsp.mkdir(path.dirname(publicReportPath), { recursive: true });
  await fsp.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await fsp.writeFile(publicReportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
