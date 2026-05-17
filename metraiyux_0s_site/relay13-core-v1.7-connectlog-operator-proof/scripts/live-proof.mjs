const origin = (process.env.RELAY13_ORIGIN || '').replace(/\/$/, '');
const apiKey = process.env.RELAY13_API_KEY || '';
const workspaceId = process.env.RELAY13_WORKSPACE_ID || '';
const fail = (message) => { console.error(JSON.stringify({ ok: false, error: message }, null, 2)); process.exit(1); };
if (!origin) fail('RELAY13_ORIGIN is required');
if (!apiKey) fail('RELAY13_API_KEY is required');
if (!workspaceId) fail('RELAY13_WORKSPACE_ID is required');
async function get(path) {
  const res = await fetch(`${origin}${path}`, { headers: { 'x-relay13-api-key': apiKey } });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok && data.ok !== false, data };
}
async function post(path, body) {
  const res = await fetch(`${origin}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-relay13-api-key': apiKey }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok && data.ok !== false, data };
}
const checks = [];
const health = await fetch(`${origin}/api/health`).then(async (res) => ({ status: res.status, ok: res.ok, data: await res.json().catch(() => ({})) })).catch((error) => ({ ok: false, error: error.message }));
checks.push({ name: 'worker_health', ok: Boolean(health.ok), status: health.status, service: health.data?.service || '' });
const bridge = await fetch(`${origin}/api/v1/connectlog/health`).then(async (res) => ({ status: res.status, ok: res.ok, data: await res.json().catch(() => ({})) })).catch((error) => ({ ok: false, error: error.message }));
checks.push({ name: 'connectlog_bridge_health', ok: Boolean(bridge.ok && bridge.data?.bridge === 'connectlog'), status: bridge.status });
const proof = await get(`/api/v1/connectlog/proof?workspace_id=${encodeURIComponent(workspaceId)}`);
checks.push({ name: 'proof_endpoint', ok: proof.ok, status: proof.status, migrations: proof.data?.migrations || [] });
const activation = await get(`/api/v1/connectlog/activation?workspace_id=${encodeURIComponent(workspaceId)}`);
checks.push({ name: 'activation_endpoint', ok: activation.ok, status: activation.status, checks: activation.data?.checks || [] });
const live = await get(`/api/v1/connectlog/live-proof?workspace_id=${encodeURIComponent(workspaceId)}`);
checks.push({ name: 'live_proof_endpoint', ok: live.ok, status: live.status, production_ready: live.data?.production_ready === true, gates: live.data?.gates || [] });
const report = { ok: checks.every((item) => item.ok) && live.data?.production_ready === true, production_ready: live.data?.production_ready === true, checked_at: new Date().toISOString(), origin, workspace_id: workspaceId, checks, live_proof: live.data };
await post('/api/v1/connectlog/live-proof-runs', { ...report, summary: report.ok ? 'Relay13 live proof passed' : 'Relay13 live proof completed with open gates' }).catch(() => null);
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
