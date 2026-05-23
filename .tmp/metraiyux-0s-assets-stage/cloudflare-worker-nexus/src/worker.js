
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const json = (data, status=200) => new Response(JSON.stringify(data,null,2), {status, headers:{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization,x-admin-token'}});
    if (request.method === 'OPTIONS') return json({ok:true});
    if (url.pathname === '/' || url.pathname === '/health' || url.pathname === '/api/nexus/status') return json({ok:true, service:'NEXUS Site Operator Brain', brains:16, persistence:{d1:!!env.NEXUS_DB, kv:!!env.NEXUS_KV, queue:!!env.NEXUS_QUEUE}, mode:'edge-ready'});
    if (url.pathname === '/api/nexus/intake' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const text = String(body.message || body.note || body.title || '');
      const lane = classify(text);
      const route = routeFor(lane);
      const receipt = { id: crypto.randomUUID(), created_at: new Date().toISOString(), lane, primary_brain: route[0], secondary_review: route[1], status:'intake_pending_review', public_intake:true, message:text };
      if (env.NEXUS_KV) await env.NEXUS_KV.put(`intake:${receipt.id}`, JSON.stringify(receipt));
      if (env.NEXUS_DB) await env.NEXUS_DB.prepare('insert into nexus_events (id, created_at, lane, primary_brain, secondary_review, status, payload) values (?1,?2,?3,?4,?5,?6,?7)').bind(receipt.id,receipt.created_at,lane,route[0],route[1],receipt.status,JSON.stringify(body)).run();
      if (env.NEXUS_QUEUE) await env.NEXUS_QUEUE.send(receipt);
      return json({ok:true, intake:receipt});
    }
    if (url.pathname === '/api/nexus/route' && request.method === 'POST') {
      if (!authorized(request, env)) return unauthorized(json);
      const body = await request.json().catch(()=>({}));
      const text = String(body.message || body.note || '');
      const lane = classify(text);
      const route = routeFor(lane);
      const receipt = { id: crypto.randomUUID(), created_at: new Date().toISOString(), lane, primary_brain: route[0], secondary_review: route[1], status:'routed', message:text };
      if (env.NEXUS_KV) await env.NEXUS_KV.put(`event:${receipt.id}`, JSON.stringify(receipt));
      if (env.NEXUS_DB) await env.NEXUS_DB.prepare('insert into nexus_events (id, created_at, lane, primary_brain, secondary_review, status, payload) values (?1,?2,?3,?4,?5,?6,?7)').bind(receipt.id,receipt.created_at,lane,route[0],route[1],receipt.status,JSON.stringify(body)).run();
      if (env.NEXUS_QUEUE) await env.NEXUS_QUEUE.send(receipt);
      return json(receipt);
    }
    if (url.pathname === '/api/nexus/task' && request.method === 'POST') {
      if (!authorized(request, env)) return unauthorized(json);
      const body = await request.json().catch(()=>({}));
      const task = { id: crypto.randomUUID(), created_at: new Date().toISOString(), title: body.title || 'Untitled NEXUS task', owner_brain: body.owner_brain || 'Site Operator Brain', status:'open', payload: body };
      if (env.NEXUS_KV) await env.NEXUS_KV.put(`task:${task.id}`, JSON.stringify(task));
      if (env.NEXUS_DB) await env.NEXUS_DB.prepare('insert into nexus_tasks (id, created_at, title, owner_brain, status, payload) values (?1,?2,?3,?4,?5,?6)').bind(task.id,task.created_at,task.title,task.owner_brain,task.status,JSON.stringify(body)).run();
      if (env.NEXUS_QUEUE) await env.NEXUS_QUEUE.send(task);
      return json(task);
    }
    if (url.pathname === '/api/nexus/ledger') {
      if (!env.NEXUS_DB) {
        if (!env.NEXUS_KV) return json({ok:false, error:'NEXUS_KV binding not configured', events:[]}, 200);
        const list = await env.NEXUS_KV.list({limit:100}); const events=[]; for (const key of list.keys) events.push(await env.NEXUS_KV.get(key.name,'json'));
        return json({ok:true, events:events.filter(Boolean), mode:'kv_fallback'});
      }
      const {results} = await env.NEXUS_DB.prepare('select id, created_at, lane, primary_brain, secondary_review, status from nexus_events order by created_at desc limit 100').all();
      return json({ok:true, events:results});
    }
    return json({ok:false, error:'not_found', available:['/api/nexus/status','/api/nexus/route','/api/nexus/task','/api/nexus/ledger']}, 404);
  }
};
function authorized(request, env){
  const expected = String(env.NEXUS_ADMIN_TOKEN || env.ADMIN_TOKEN || '').trim();
  if (!expected) return false;
  const bearer = String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i,'').trim();
  const header = String(request.headers.get('x-admin-token') || '').trim();
  return bearer === expected || header === expected;
}
function unauthorized(json){
  return json({ok:false, error:'operator_auth_required', public_intake:'/api/nexus/intake'}, 401);
}
function classify(t){t=(t||'').toLowerCase(); if(/lead|prospect|deal|quote|pipeline|proposal/.test(t))return'lead'; if(/client|renewal|onboard|complaint|launch/.test(t))return'client'; if(/candidate|resume|worker|staff|recruit/.test(t))return'candidate'; if(/vendor|partner|subcontractor/.test(t))return'vendor'; if(/legal|compliance|contract|risk|insurance/.test(t))return'compliance'; if(/proof|qa|receipt|audit|claim/.test(t))return'proof'; if(/invoice|billing|payroll|budget|margin/.test(t))return'finance'; if(/website|api|cloudflare|brain|database|worker/.test(t))return'technology'; if(/government|procurement|sam|rfp|bid/.test(t))return'government'; if(/founder|gray|approval|override/.test(t))return'founder'; return'general'}
function routeFor(lane){return ({lead:['Celeste Monroe Revenue Brain','Marcus Vale Operations Review'],client:['Adrian Cross Client Success Brain','Victor Saint QA Review'],candidate:['Sienna Brooks Staffing Brain','Julian Mercer Compliance Review'],vendor:['Helena Ward Vendor Brain','Julian Mercer Compliance Review'],compliance:['Julian Mercer Compliance Brain','Gray London Skyes Founder Review'],proof:['Victor Saint QA Brain','Site Operator Brain'],finance:['Naomi Sterling Finance Brain','Marcus Vale Operations Review'],technology:['Orion Hayes Technology Brain','Site Operator Brain'],government:['Donovan Pierce Gov/Enterprise Brain','Julian Mercer Compliance Review'],founder:['Gray London Skyes Founder Brain','Site Operator Brain'],general:['Site Operator Brain','Central Company Command Brain']})[lane] || ['Site Operator Brain','Central Company Command Brain'];}
