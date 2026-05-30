
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = { 'content-type':'application/json', 'access-control-allow-origin':'*', 'access-control-allow-methods':'GET,POST,OPTIONS', 'access-control-allow-headers':'content-type,authorization,x-admin-token,x-0s-shared-gate,x-0s-internal-proxy-secret' };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (url.pathname === '/' || url.pathname === '/health' || url.pathname === '/api/crown/status') return Response.json({ ok:true, service:'CROWN Site Operator Brain', brains:16, persistence:{d1:!!env.CROWN_DB, kv:!!env.CROWN_KV, queue:!!env.CROWN_QUEUE}, mode:'worker-ready', time:new Date().toISOString() }, { headers:cors });
    if (url.pathname === '/api/crown/intake' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const signal = String(body.signal || body.message || body.text || body.title || '');
      const route = classify(signal);
      const row = { id: safeRandomUUID(), type:'public_intake', signal, route, created_at:new Date().toISOString(), status:'intake_pending_review', public_intake:true };
      if (env.CROWN_KV) await env.CROWN_KV.put(`intake:${row.id}`, JSON.stringify(row));
      if (env.CROWN_DB) await env.CROWN_DB.prepare('insert into crown_events (id,type,payload,created_at) values (?1,?2,?3,?4)').bind(row.id,'public_intake',JSON.stringify(row),row.created_at).run();
      if (env.CROWN_QUEUE) await env.CROWN_QUEUE.send(row);
      return Response.json({ok:true, intake:row}, { headers:cors });
    }
    if (url.pathname === '/api/crown/route' && request.method === 'POST') {
      if (!authorized(request, env)) return unauthorized(cors);
      const body = await request.json().catch(()=>({}));
      const signal = String(body.signal || body.message || body.text || '');
      const route = classify(signal);
      const id = safeRandomUUID();
      const row = { id, type:'route', signal, route, created_at:new Date().toISOString(), status:'draft_receipt' };
      if (env.CROWN_KV) await env.CROWN_KV.put(`event:${id}`, JSON.stringify(row));
      if (env.CROWN_DB) await env.CROWN_DB.prepare('insert into crown_events (id,type,payload,created_at) values (?1,?2,?3,?4)').bind(id,'route',JSON.stringify(row),row.created_at).run();
      if (env.CROWN_QUEUE) await env.CROWN_QUEUE.send(row);
      return Response.json(row, { headers:cors });
    }
    if (url.pathname === '/api/crown/task' && request.method === 'POST') {
      if (!authorized(request, env)) return unauthorized(cors);
      const body = await request.json().catch(()=>({}));
      const id = safeRandomUUID();
      const task = { id, type:'task', title:body.title||'Untitled task', owner:body.owner||'Site Operator Brain', approval_required: body.approval_required ?? true, status:'pending_human_review', created_at:new Date().toISOString() };
      if (env.CROWN_KV) await env.CROWN_KV.put(`task:${id}`, JSON.stringify(task));
      if (env.CROWN_DB) await env.CROWN_DB.prepare('insert into crown_tasks (id,title,owner,status,payload,created_at) values (?1,?2,?3,?4,?5,?6)').bind(id,task.title,task.owner,task.status,JSON.stringify(task),task.created_at).run();
      if (env.CROWN_QUEUE) await env.CROWN_QUEUE.send(task);
      return Response.json(task, { headers:cors });
    }
    if (url.pathname === '/api/crown/ledger') {
      if (!env.CROWN_DB) {
        if (!env.CROWN_KV) return Response.json({ ok:true, ledger:[], note:'D1 and KV not bound.' }, { headers:cors });
        const list = await env.CROWN_KV.list({limit:100});
        const ledger = []; for (const key of list.keys) ledger.push(await env.CROWN_KV.get(key.name, 'json'));
        return Response.json({ ok:true, ledger:ledger.filter(Boolean), mode:'kv_fallback' }, { headers:cors });
      }
      const rows = await env.CROWN_DB.prepare('select id,type,payload,created_at from crown_events order by created_at desc limit 100').all();
      return Response.json({ ok:true, ledger:rows.results||[], persistence:'d1' }, { headers:cors });
    }
    if (url.pathname === '/api/crown/approval' && request.method === 'POST') {
      if (!authorized(request, env)) return unauthorized(cors);
      const body = await request.json().catch(()=>({}));
      const id = safeRandomUUID();
      const approval = { id, item_id:body.item_id||null, decision:body.decision||'pending', approver:body.approver||'human_operator', notes:body.notes||'', created_at:new Date().toISOString() };
      if (env.CROWN_KV) await env.CROWN_KV.put(`approval:${id}`, JSON.stringify(approval));
      if (env.CROWN_DB) await env.CROWN_DB.prepare('insert into crown_approvals (id,item_id,decision,approver,notes,created_at) values (?1,?2,?3,?4,?5,?6)').bind(id,approval.item_id,approval.decision,approval.approver,approval.notes,approval.created_at).run();
      return Response.json(approval, { headers:cors });
    }
    return Response.json({ ok:false, error:'Not found', routes:['/api/crown/status','/api/crown/route','/api/crown/task','/api/crown/ledger','/api/crown/approval'] }, { status:404, headers:cors });
  }
}
function authorized(request, env){
  const proxySecret = String(env.ZERO_OS_INTERNAL_PROXY_SECRET || env.METRAIYUX_0S_INTERNAL_PROXY_SECRET || env.CROWN_INTERNAL_PROXY_SECRET || '').trim();
  const sharedGate = String(request.headers.get('x-0s-shared-gate') || '').trim();
  const presentedProxySecret = String(request.headers.get('x-0s-internal-proxy-secret') || '').trim();
  if (proxySecret) return sharedGate === 'operator' && presentedProxySecret === proxySecret;
  const expected = String(env.CROWN_ADMIN_TOKEN || env.ADMIN_TOKEN || '').trim();
  if (!expected) return false;
  const bearer = String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i,'').trim();
  const header = String(request.headers.get('x-admin-token') || '').trim();
  return bearer === expected || header === expected;
}
function unauthorized(cors){
  return Response.json({ok:false, error:'operator_auth_required', public_intake:'/api/crown/intake'}, {status:401, headers:cors});
}
function classify(signal){
  const s = signal.toLowerCase();
  const tests = [
    [['lead','prospect','proposal','quote','deal'],'Celeste Monroe — Sales & AE Brain','Marcus Vale — Operations Brain'],
    [['client','renewal','onboard','complaint'],'Adrian Cross — Client Success Brain','Victor Saint — QA Brain'],
    [['candidate','resume','job order','placement'],'Sienna Brooks — Staffing Brain','Julian Mercer — Compliance Brain'],
    [['contract','legal','compliance','insurance','risk'],'Julian Mercer — Compliance Brain','Gray London Skyes — Founder Command Brain'],
    [['worker','cloudflare','site','automation','brain'],'Orion Hayes — Technology Brain','Victor Saint — QA Brain']
  ];
  const hit = tests.find(([keys])=>keys.some(k=>s.includes(k)));
  const approval_required = /(contract|payment|hire|fire|legal|tax|send|publish|price|refund|public claim)/i.test(signal);
  return { primary: hit?hit[1]:'Central Company Command Brain', secondary: hit?hit[2]:'Site Operator Brain', approval_required };
}

function safeRandomUUID(){
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `uuid_${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
}
