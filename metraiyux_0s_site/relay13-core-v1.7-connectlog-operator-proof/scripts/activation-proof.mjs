const origin = (process.env.RELAY13_ORIGIN || '').replace(/\/$/, '');
const apiKey = process.env.RELAY13_API_KEY || '';
const workspaceId = process.env.RELAY13_WORKSPACE_ID || '';
const workspaceSlug = process.env.RELAY13_WORKSPACE_SLUG || 'connectlog-main';
const mutate = process.env.RELAY13_MUTATE_PROOF === 'true';

if (!origin) throw new Error('Set RELAY13_ORIGIN to your deployed Worker origin.');
if (!apiKey) throw new Error('Set RELAY13_API_KEY to a scoped Relay13 API key.');

async function request(path, options = {}) {
  const useAuth = options.auth !== false;
  const { auth, ...fetchOptions } = options;
  const headers = { ...(fetchOptions.body ? { 'content-type': 'application/json' } : {}), ...(useAuth ? { 'x-relay13-api-key': apiKey } : {}), ...(fetchOptions.headers || {}) };
  const res = await fetch(`${origin}${path}`, {
    ...fetchOptions,
    headers
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && data.ok !== false, status: res.status, data };
}

const report = { proof: 'relay13-connectlog-activation-cli', origin, workspace_id: workspaceId, workspace_slug: workspaceSlug, mutate, checks: [], started_at: new Date().toISOString() };
const push = (name, result) => report.checks.push({ name, ok: Boolean(result.ok), status: result.status, data: result.data });

push('worker_health', await request('/api/health', { auth: false }));
push('connectlog_bridge_health', await request('/api/v1/connectlog/health', { auth: false }));
const qs = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : '';
push('connectlog_activation', await request(`/api/v1/connectlog/activation${qs}`));
push('connectlog_stats', await request(`/api/v1/connectlog/stats${qs}`));

if (mutate) {
  const cardId = `activation-proof-${Date.now()}`;
  const cardPayload = {
    workspace_id: workspaceId,
    connectlog_bridge: true,
    connectlog_card_id: cardId,
    connectlog_card_label: 'Relay13 Activation Proof Card',
    connectlog_campaign: 'activation-proof',
    connectlog_owner_name: 'ConnectLog Operator',
    connectlog_welcome_message: 'Relay13 activation proof welcome message.'
  };
  push('connectlog_card_upsert', await request('/api/v1/connectlog/cards', { method: 'POST', body: JSON.stringify(cardPayload) }));
  const scanPayload = {
    workspace: workspaceSlug,
    channel: 'connectlog-card',
    customer_name: 'Activation Proof Visitor',
    customer_email: 'proof@example.com',
    body: 'Relay13 activation proof conversation.',
    ...cardPayload
  };
  push('connectlog_scan_conversation', await request('/api/v1/connectlog/scan', { method: 'POST', body: JSON.stringify(scanPayload), auth: false }));
}

report.finished_at = new Date().toISOString();
report.ok = report.checks.every((check) => check.ok);
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
