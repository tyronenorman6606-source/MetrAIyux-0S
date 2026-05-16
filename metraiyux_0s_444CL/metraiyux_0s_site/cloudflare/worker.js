
const VERSION = 'AUTONOMOUS_BUSINESS_SITE_OPERATOR_1.0.0';
const ROUTES = [
  ['buyer_lead', /lead|buyer|sale|proposal|close|ae|discovery|quote|pricing/i, 'celeste-monroe-brain', 'adrian-cross-brain', 'AE discovery follow-up and buyer qualification'],
  ['client_onboarding', /client|onboard|renewal|escalation|launch|status/i, 'adrian-cross-brain', 'marcus-vale-brain', 'Client onboarding and delivery status setup'],
  ['candidate_or_staffing', /candidate|recruit|job order|staff|worker|placement|resume/i, 'sienna-brooks-brain', 'adrian-cross-brain', 'Candidate screening or job order fulfillment'],
  ['finance_or_pricing', /finance|invoice|billing|payroll|margin|commission|price|cost/i, 'naomi-sterling-brain', 'celeste-monroe-brain', 'Pricing, margin, billing, or commission review'],
  ['compliance_or_contracting', /contract|legal|compliance|policy|filing|incorporation|insurance|risk/i, 'julian-mercer-brain', 'donovan-pierce-brain', 'Compliance routing and professional review flag'],
  ['technology_or_site', /site|deploy|worker|cloudflare|automation|brain|api|dashboard|system/i, 'orion-hayes-brain', 'site-operator-autonomous-business-brain', 'Technology, deployment, automation, or site operation review'],
  ['marketing_or_content', /marketing|brand|copy|seo|content|campaign|public claim/i, 'valentina-reyes-brain', 'victor-saint-brain', 'Marketing copy, content control, or public claim review'],
  ['government_enterprise', /government|enterprise|sam|naics|procurement|bid|subcontract/i, 'donovan-pierce-brain', 'julian-mercer-brain', 'Government/enterprise readiness review'],
  ['vendor_partner', /vendor|partner|subcontractor|referral|alliance/i, 'helena-ward-brain', 'julian-mercer-brain', 'Partner/vendor intake and risk review'],
  ['quality_proof', /proof|qa|claim|audit|receipt|smoke|test|verify/i, 'victor-saint-brain', 'marcus-vale-brain', 'Proof receipt, QA review, or claims validation'],
  ['innovation_expansion', /innovation|expansion|new market|automation|acquisition|branch/i, 'amara-voss-brain', 'founder-operator-brain', 'Expansion, innovation, or new lane evaluation'],
  ['founder_strategy', /founder|owner|vision|strategy|ownership|doctrine|command/i, 'founder-operator-brain', 'central-company-command-brain', 'Founder strategy and executive command review']
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {status, headers: {'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*'}});
}
async function readJson(request) { try { return await request.json(); } catch { return {}; } }
function routeMessage(message = '') {
  const hit = ROUTES.find(r => r[1].test(message)) || ['general_company_command', /./, 'central-company-command-brain', 'site-operator-autonomous-business-brain', 'General company command review'];
  return { id: `evt_${Date.now()}`, created_at: new Date().toISOString(), intent: hit[0], primary_brain: hit[2], secondary_brain: hit[3], recommended_task: hit[4], message, guardrail: 'Human operator approval required for contracts, filings, hiring/firing, payments, legal advice, or public claims.' };
}
async function saveKV(env, key, value) {
  if (env.SITE_EVENTS_KV) await env.SITE_EVENTS_KV.put(key, JSON.stringify(value), {expirationTtl: 60 * 60 * 24 * 90});
}
const PROXIES = [
  ['/api/site-operator/', 'SITE_OPERATOR_WORKER_ORIGIN', 'SITE_OPERATOR_WORKER'],
  ['/api/admin/', 'ADMIN_WORKER_ORIGIN', 'ADMIN_WORKER'],
  ['/api/saas/', 'SAAS_WORKER_ORIGIN', 'SAAS_WORKER'],
  ['/api/omega/', 'OMEGA_WORKER_ORIGIN', 'OMEGA_WORKER'],
  ['/api/crown/', 'CROWN_WORKER_ORIGIN', 'CROWN_WORKER'],
  ['/api/nexus/', 'NEXUS_WORKER_ORIGIN', 'NEXUS_WORKER'],
  ['/api/sentinel/', 'SENTINEL_WORKER_ORIGIN', 'SENTINEL_WORKER']
];
async function proxyApi(request, env, url) {
  const hit = PROXIES.find(([prefix]) => url.pathname.startsWith(prefix));
  if (!hit) return null;
  const service = env[hit[2]];
  if (service) return service.fetch(request);
  const origin = env[hit[1]];
  if (!origin) return json({ok:false, error:`${hit[1]} is not configured`}, 502);
  const upstream = new URL(request.url);
  const target = new URL(origin);
  upstream.protocol = target.protocol;
  upstream.host = target.host;
  return fetch(new Request(upstream, request));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return json({ok:true});
    const proxied = await proxyApi(request, env, url);
    if (proxied) return proxied;
    if (url.pathname === '/api/site-operator/status') return json({ok:true, version: VERSION, total_system_brains: 16, connected_brains: 16, mode: 'worker-ready'});
    if (url.pathname === '/api/site-operator/route' && request.method === 'POST') {
      const body = await readJson(request);
      const receipt = routeMessage(body.message || body.text || '');
      ctx.waitUntil(saveKV(env, receipt.id, receipt));
      return json({ok:true, receipt});
    }
    if (url.pathname === '/api/site-operator/event' && request.method === 'POST') {
      const body = await readJson(request);
      const receipt = {...body, id: body.id || `evt_${Date.now()}`, created_at: body.created_at || new Date().toISOString(), type: body.type || 'site_event'};
      ctx.waitUntil(saveKV(env, receipt.id, receipt));
      return json({ok:true, receipt, stored: Boolean(env.SITE_EVENTS_KV)});
    }
    if (url.pathname === '/api/site-operator/task' && request.method === 'POST') {
      const body = await readJson(request);
      const task = {id: body.id || `task_${Date.now()}`, created_at: new Date().toISOString(), status: 'queued_for_operator_review', ...body};
      if (env.SITE_TASK_QUEUE) ctx.waitUntil(env.SITE_TASK_QUEUE.send(task));
      ctx.waitUntil(saveKV(env, task.id, task));
      return json({ok:true, task, queued: Boolean(env.SITE_TASK_QUEUE), stored: Boolean(env.SITE_EVENTS_KV)});
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Site Operator Brain Worker is running. Static asset binding not configured.', {status: 200});
  }
};
