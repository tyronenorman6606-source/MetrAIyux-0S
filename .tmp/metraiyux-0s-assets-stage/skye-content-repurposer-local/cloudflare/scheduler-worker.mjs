export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(callScheduler(env, event.cron || 'cloudflare-cron'));
  },
  async fetch(request, env) {
    if (new URL(request.url).pathname !== '/tick') return new Response('Not found', { status: 404 });
    return callScheduler(env, 'cloudflare-manual-fetch');
  }
};

async function callScheduler(env, source) {
  const base = String(env.APP_BASE_URL || '').replace(/\/$/, '');
  const token = env.SCHEDULER_API_KEY || env.APP_ACCESS_TOKEN || '';
  if (!base || !token) return new Response('Missing APP_BASE_URL or SCHEDULER_API_KEY.', { status: 500 });
  const response = await fetch(`${base}/api/automation/tick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-App-Token': token },
    body: JSON.stringify({ source: `cloudflare-worker:${source}`, backup: true })
  });
  const text = await response.text();
  return new Response(text, { status: response.ok ? 200 : 500, headers: { 'Content-Type': 'application/json' } });
}
