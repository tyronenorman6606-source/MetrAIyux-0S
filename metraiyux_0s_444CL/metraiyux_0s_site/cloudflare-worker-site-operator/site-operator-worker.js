
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const json = (body, status=200) => new Response(JSON.stringify(body, null, 2), { status, headers: { ...cors, 'content-type':'application/json' }});
    const now = new Date().toISOString();
    const routeMap = [
      ['lead|price|proposal|close|pipeline|revenue', 'Celeste Monroe Brain', 'Sales & Account Executive Cabinet'],
      ['candidate|resume|job order|placement|recruit|staffing', 'Sienna Brooks Brain', 'Human Resources & Staffing Cabinet'],
      ['client|onboard|renewal|complaint|escalation|qbr', 'Adrian Cross Brain', 'Client Success Cabinet'],
      ['contract|legal|compliance|insurance|risk|policy', 'Julian Mercer Brain', 'Legal & Compliance Cabinet'],
      ['website|system|bug|cloudflare|worker|brain|api|deploy', 'Orion Hayes Brain', 'Technology & Systems Cabinet'],
      ['invoice|budget|payroll|margin|commission|expense', 'Naomi Sterling Brain', 'Finance & Accounting Cabinet'],
      ['brand|marketing|seo|blog|campaign|copy', 'Valentina Reyes Brain', 'Marketing & Brand Cabinet'],
      ['government|sam|naics|bid|procurement|contracting', 'Donovan Pierce Brain', 'Government & Enterprise Contracting Cabinet'],
      ['vendor|partner|subcontractor|referral', 'Helena Ward Brain', 'Partnerships & Vendor Relations Cabinet'],
      ['proof|qa|audit|claim|receipt|verification', 'Victor Saint Brain', 'Quality Assurance & Performance Cabinet'],
      ['innovation|ai|automation|expansion|new market', 'Amara Voss Brain', 'Expansion & Innovation Cabinet'],
      ['founder|approval|strategy|override|gray', 'Client Founder Founder Brain', 'Executive Command Cabinet']
    ];
    function classify(text='') {
      const lower = text.toLowerCase();
      for (const [pattern, brain, cabinet] of routeMap) if (new RegExp(pattern).test(lower)) return { brain, cabinet };
      return { brain:'Site Operator Brain', cabinet:'Central Operating Layer' };
    }
    async function readBody() { try { return await request.json(); } catch { return {}; } }
    async function recordEvent(event) {
      if (env.SITE_OPERATOR_KV) await env.SITE_OPERATOR_KV.put(`${event.type}:${event.id}`, JSON.stringify(event));
      if (env.SITE_OPERATOR_DB) await env.SITE_OPERATOR_DB.prepare('insert into events (id,type,payload,created_at) values (?1,?2,?3,?4)').bind(event.id,event.type,JSON.stringify(event),event.created_at).run();
    }
    async function recordTask(task) {
      if (env.SITE_OPERATOR_KV) await env.SITE_OPERATOR_KV.put(`task:${task.id}`, JSON.stringify(task));
      if (env.SITE_OPERATOR_DB) await env.SITE_OPERATOR_DB.prepare('insert into tasks (id,title,cabinet,owner_brain,status,human_gate,payload,created_at) values (?1,?2,?3,?4,?5,?6,?7,?8)').bind(task.id,task.title,task.cabinet,task.owner_brain,task.status,task.approval_gate === 'human approval required' ? 1 : 0,JSON.stringify(task),task.created_at).run();
    }
    if (url.pathname === '/api/site-operator/status') return json({ ok:true, service:'Site Operator Brain Worker', version:'QUANTUM-OPS-1.0', total_system_brains:16, connected_brains:16, time:now, storage:{ kv:!!env.SITE_OPERATOR_KV, queue:!!env.SITE_OPERATOR_QUEUE, d1:!!env.SITE_OPERATOR_DB }});
    if (url.pathname === '/api/site-operator/route' && request.method === 'POST') {
      const body = await readBody();
      const input = body.message || body.text || body.request || '';
      const routed = classify(input);
      const receipt = { id: crypto.randomUUID(), type:'route', created_at:now, input, primary_brain:routed.brain, primary_cabinet:routed.cabinet, secondary_review:'Central Company Command Brain', approval_gate: /legal|compliance|contract|founder|approval|money movement|hire|terminate/i.test(input) ? 'human approval required' : 'operator may draft and route', status:'routed' };
      await recordEvent(receipt);
      return json({ok:true, receipt, stored:{kv:!!env.SITE_OPERATOR_KV, d1:!!env.SITE_OPERATOR_DB}});
    }
    if (url.pathname === '/api/site-operator/task' && request.method === 'POST') {
      const body = await readBody();
      const input = body.message || body.text || body.title || '';
      const routed = classify(input);
      const task = { id: crypto.randomUUID(), type:'task', created_at:now, title:body.title || 'Autonomous business task', text:input, owner_brain:routed.brain, cabinet:routed.cabinet, approval_gate: body.approval_gate || 'operator may draft and route', proof_required:body.proof_required || 'completion receipt with source, owner, result, and verification', status:'open' };
      await recordTask(task);
      if (env.SITE_OPERATOR_QUEUE) await env.SITE_OPERATOR_QUEUE.send(task);
      return json({ok:true, task, queued:!!env.SITE_OPERATOR_QUEUE, stored:{kv:!!env.SITE_OPERATOR_KV, d1:!!env.SITE_OPERATOR_DB}});
    }
    if (url.pathname === '/api/site-operator/event' && request.method === 'POST') {
      const body = await readBody();
      const event = { id: crypto.randomUUID(), type:'event', created_at:now, source:body.source || 'site', text:body.text || '', status:'recorded' };
      await recordEvent(event);
      return json({ok:true, event, stored:{kv:!!env.SITE_OPERATOR_KV, d1:!!env.SITE_OPERATOR_DB}});
    }
    if (url.pathname === '/api/site-operator/ledger') {
      if (env.SITE_OPERATOR_DB) {
        const events = await env.SITE_OPERATOR_DB.prepare('select id,type,payload,created_at from events order by created_at desc limit 100').all();
        const tasks = await env.SITE_OPERATOR_DB.prepare('select id,title,cabinet,owner_brain,status,created_at from tasks order by created_at desc limit 100').all();
        return json({ ok:true, persistence:'d1', events:events.results||[], tasks:tasks.results||[] });
      }
      if (!env.SITE_OPERATOR_KV) return json({ ok:false, note:'KV not bound. Local-only mode active.', items:[] });
      const prefix = url.searchParams.get('prefix') || '';
      const list = await env.SITE_OPERATOR_KV.list({ prefix, limit: 50 });
      return json({ ok:true, persistence:'kv_fallback', prefix, keys:list.keys.map(k=>k.name) });
    }
    return json({ ok:false, error:'Not found', routes:['/api/site-operator/status','/api/site-operator/route','/api/site-operator/task','/api/site-operator/event','/api/site-operator/ledger'] }, 404);
  }
}
