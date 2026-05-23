export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"content-type,authorization,x-admin-token"};
    if (request.method === 'OPTIONS') return new Response(null,{headers:cors});
    const json = (data, status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{...cors,'content-type':'application/json'}});
    if (url.pathname === '/' || url.pathname === '/health' || url.pathname === '/api/sentinel/status') return json({ok:true, service:'Sentinel Site Operator Brain', brains:16, persistence:{d1:!!env.DB, kv:!!env.SENTINEL_LEDGER, queue:!!env.SENTINEL_QUEUE}, mode:'worker-ready', time:new Date().toISOString()});
    if (url.pathname === '/api/sentinel/intake' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const text = String(body.text || body.message || body.title || '').toLowerCase();
      const route = chooseRoute(text);
      const receipt = {id: crypto.randomUUID(), type:'public_intake', created_at:new Date().toISOString(), input_excerpt:text.slice(0,500), ...route, status:'intake_pending_review', public_intake:true};
      if (env.SENTINEL_LEDGER) await env.SENTINEL_LEDGER.put(`intake:${receipt.id}`, JSON.stringify(receipt));
      if (env.SENTINEL_QUEUE) await env.SENTINEL_QUEUE.send(receipt);
      if (env.DB) await env.DB.prepare('insert into events (id,type,payload,created_at) values (?1,?2,?3,?4)').bind(receipt.id,'public_intake',JSON.stringify(receipt),receipt.created_at).run();
      return json({ok:true, intake:receipt});
    }
    if (url.pathname === '/api/sentinel/route' && request.method === 'POST') {
      if (!authorized(request, env)) return unauthorized(json);
      const body = await request.json().catch(()=>({}));
      const text = String(body.text || body.message || '').toLowerCase();
      const route = chooseRoute(text);
      const receipt = {id: crypto.randomUUID(), type:'route', created_at:new Date().toISOString(), input_excerpt:text.slice(0,500), ...route, status:'queued_for_human_review'};
      if (env.SENTINEL_LEDGER) await env.SENTINEL_LEDGER.put(`route:${receipt.id}`, JSON.stringify(receipt));
      if (env.SENTINEL_QUEUE) await env.SENTINEL_QUEUE.send(receipt);
      if (env.DB) await env.DB.prepare('insert into events (id,type,payload,created_at) values (?1,?2,?3,?4)').bind(receipt.id,'route',JSON.stringify(receipt),receipt.created_at).run();
      return json(receipt);
    }
    if (url.pathname === '/api/sentinel/task' && request.method === 'POST') {
      if (!authorized(request, env)) return unauthorized(json);
      const body = await request.json().catch(()=>({}));
      const task = {id: crypto.randomUUID(), type:'task', title: body.title || 'Untitled task', cabinet: body.cabinet || 'Site Operator', owner_brain: body.owner_brain || 'Site Operator Brain', status:'pending_review', human_gate: !!body.human_gate, created_at:new Date().toISOString(), payload: body};
      if (env.SENTINEL_LEDGER) await env.SENTINEL_LEDGER.put(`task:${task.id}`, JSON.stringify(task));
      if (env.DB) await env.DB.prepare('insert into tasks (id,title,cabinet,owner_brain,status,human_gate,payload,created_at) values (?1,?2,?3,?4,?5,?6,?7,?8)').bind(task.id,task.title,task.cabinet,task.owner_brain,task.status,task.human_gate?1:0,JSON.stringify(task.payload),task.created_at).run();
      return json(task);
    }
    if (url.pathname === '/api/sentinel/ledger' && request.method === 'GET') {
      if (env.DB) {
        const events = await env.DB.prepare('select id,type,payload,created_at from events order by created_at desc limit 100').all();
        const tasks = await env.DB.prepare('select id,title,cabinet,owner_brain,status,created_at from tasks order by created_at desc limit 100').all();
        return json({ok:true, persistence:'d1', events:events.results||[], tasks:tasks.results||[]});
      }
      if (!env.SENTINEL_LEDGER) return json({ok:false,error:'KV binding SENTINEL_LEDGER not configured', items:[]}, 501);
      const list = await env.SENTINEL_LEDGER.list({limit:50});
      const items=[]; for (const key of list.keys) items.push({key:key.name, value: await env.SENTINEL_LEDGER.get(key.name,'json')});
      return json({ok:true, persistence:'kv_fallback', items});
    }
    return json({ok:false,error:'Not found', routes:['/api/sentinel/status','/api/sentinel/route','/api/sentinel/task','/api/sentinel/ledger']},404);
  }
}
function authorized(request, env){
  const expected = String(env.SENTINEL_ADMIN_TOKEN || env.ADMIN_TOKEN || '').trim();
  if (!expected) return false;
  const bearer = String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i,'').trim();
  const header = String(request.headers.get('x-admin-token') || '').trim();
  return bearer === expected || header === expected;
}
function unauthorized(json){
  return json({ok:false, error:'operator_auth_required', public_intake:'/api/sentinel/intake'}, 401);
}
function chooseRoute(text){
  const rules = [
    [/lead|proposal|pricing|pipeline|close/, 'Celeste Monroe Brain','Marcus Vale Brain','Sales & AE'],
    [/client|complaint|renewal|onboard|qbr/, 'Adrian Cross Brain','Victor Saint Brain','Client Success'],
    [/candidate|job order|resume|placement|staffing/, 'Sienna Brooks Brain','Naomi Sterling Brain','HR & Staffing'],
    [/contract|legal|compliance|risk|insurance|policy/, 'Julian Mercer Brain','Victor Saint Brain','Legal & Compliance'],
    [/website|cloudflare|worker|api|automation|brain/, 'Orion Hayes Brain','Site Operator Brain','Technology & Systems'],
    [/brand|seo|campaign|content|blog/, 'Valentina Reyes Brain','Central Company Command Brain','Marketing & Brand'],
    [/government|sam|naics|bid|procurement|enterprise/, 'Donovan Pierce Brain','Julian Mercer Brain','Government & Enterprise'],
    [/vendor|partner|subcontractor|referral/, 'Helena Ward Brain','Julian Mercer Brain','Partnerships & Vendors'],
    [/proof|audit|claim|quality|test/, 'Victor Saint Brain','Site Operator Brain','QA & Performance'],
    [/branch|innovation|expansion|market/, 'Amara Voss Brain','Marcus Vale Brain','Expansion & Innovation']
  ];
  for (const [rx,primary,secondary,cabinet] of rules) if (rx.test(text)) return {primary_brain:primary, secondary_brain:secondary, cabinet, human_gate:/contract|legal|payment|hire|fire|filing|tax|bank|compliance|government/.test(text)};
  return {primary_brain:'Site Operator Brain', secondary_brain:'Central Company Command Brain', cabinet:'Executive Command', human_gate:true};
}
