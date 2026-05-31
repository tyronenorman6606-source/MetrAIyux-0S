
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = { 'content-type':'application/json', 'access-control-allow-origin':'*', 'access-control-allow-methods':'GET,POST,OPTIONS', 'access-control-allow-headers':'content-type,authorization,x-admin-token,x-free99-admin-code,x-free99-gate-session,x-skye-gate-session,x-skygate-session,x-0s-shared-gate,x-0s-internal-proxy-secret' };
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
      const auth = await authorized(request, env);
      if (!auth.ok) return unauthorized(cors, auth);
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
      const auth = await authorized(request, env);
      if (!auth.ok) return unauthorized(cors, auth);
      const body = await request.json().catch(()=>({}));
      const id = safeRandomUUID();
      const task = { id, type:'task', title:body.title||'Untitled task', owner:body.owner||'Site Operator Brain', approval_required: body.approval_required ?? true, status:'pending_human_review', created_at:new Date().toISOString() };
      if (env.CROWN_KV) await env.CROWN_KV.put(`task:${id}`, JSON.stringify(task));
      if (env.CROWN_DB) await env.CROWN_DB.prepare('insert into crown_tasks (id,title,owner,status,payload,created_at) values (?1,?2,?3,?4,?5,?6)').bind(id,task.title,task.owner,task.status,JSON.stringify(task),task.created_at).run();
      if (env.CROWN_QUEUE) await env.CROWN_QUEUE.send(task);
      return Response.json(task, { headers:cors });
    }
    if (url.pathname === '/api/crown/ledger') {
      const auth = await authorized(request, env);
      if (!auth.ok) return unauthorized(cors, auth);
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
      const auth = await authorized(request, env);
      if (!auth.ok) return unauthorized(cors, auth);
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
async function authorized(request, env){
  return requireFs27OperatorAuth(request, env, ['CROWN_ADMIN_TOKEN', 'ADMIN_TOKEN']);
}
function unauthorized(cors, auth={}){
  return Response.json({ok:false, error:auth.error || 'operator_auth_required', code:auth.code || undefined, public_intake:'/api/crown/intake'}, {status:auth.status || 401, headers:cors});
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
function skygateOrigin(env){
  return String(env.SKYGATEFS27_ORIGIN || env.SKYGATE_ORIGIN || '').replace(/\/+$/,'');
}
function fs27Configured(env){
  return Boolean(env.SKYGATEFS27_WORKER?.fetch || skygateOrigin(env));
}
function fs27RequiredResult(label='operator request'){
  return {
    ok:false,
    status:503,
    code:'fs27_required',
    error:`Canonical FS27/SkyGate session is required for ${label}. Configure SKYGATEFS27_WORKER or SKYGATEFS27_ORIGIN/SKYGATE_ORIGIN.`
  };
}
function bearer(request){
  return String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i,'').trim();
}
function cookieValue(request, name){
  const cookie = request.headers.get('cookie') || '';
  const hit = cookie.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : '';
}
function presentedGateCredentials(request){
  const values = [
    bearer(request),
    request.headers.get('x-admin-token'),
    request.headers.get('x-free99-admin-code'),
    request.headers.get('x-free99-gate-session'),
    request.headers.get('x-skye-gate-session'),
    request.headers.get('x-skygate-session'),
    cookieValue(request, 'free99_gate_session'),
    cookieValue(request, 'skye_gate_session'),
    cookieValue(request, 'skygate_session')
  ].map(value => String(value || '').replace(/^Bearer\s+/i,'').trim()).filter(Boolean);
  return [...new Set(values)];
}
function scopeList(scope){
  if (Array.isArray(scope)) return scope.map(String);
  return String(scope || '').split(/\s+/).filter(Boolean);
}
function emailAllowlist(env){
  return String(env.SKYGATE_ADMIN_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
}
function allowsAdminGate(claims, env){
  if (!claims?.active && !claims?.ok) return false;
  const role = String(claims.role || claims.user?.role || '').toLowerCase();
  const scopes = new Set(scopeList(claims.scope || claims.scopes || claims.user?.scope).map(x => x.toLowerCase()));
  const email = String(claims.email || claims.username || claims.user?.email || '').toLowerCase();
  const allowedEmails = emailAllowlist(env);
  return ['founder', 'owner', 'admin', 'operator'].includes(role)
    || scopes.has('admin.write')
    || scopes.has('admin.read')
    || scopes.has('keys.write')
    || scopes.has('gateway.invoke')
    || (allowedEmails.length && allowedEmails.includes(email));
}
async function skygateRequest(env, path, init={}){
  const origin = skygateOrigin(env);
  if (env.SKYGATEFS27_WORKER?.fetch) {
    try {
      const response = await env.SKYGATEFS27_WORKER.fetch(new Request(`https://skygatefs27.internal${path}`, init));
      if (response.status !== 404 || !origin) return response;
    } catch {
      if (!origin) throw new Error('SkyGate FS27 service binding failed and no origin is configured.');
    }
  }
  if (!origin) throw new Error('SKYGATEFS27_ORIGIN/SKYGATE_ORIGIN is not configured.');
  return fetch(`${origin}${path}`, init);
}
async function introspectFs27Token(token, env){
  if (!fs27Configured(env)) return fs27RequiredResult('operator request');
  if (!token) return {ok:false, status:401, error:'Missing FS27/SkyGate bearer or gate session.'};
  const paths = ['/auth-introspect', '/auth/introspect', '/.netlify/functions/auth-introspect'];
  let last = null;
  for (const path of paths) {
    const res = await skygateRequest(env, path, {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({token})
    });
    const data = await res.json().catch(() => ({active:false, error:'Invalid FS27/SkyGate response'}));
    last = {res, data, path};
    if (res.status === 404) continue;
    if (!res.ok || data.active !== true) return {ok:false, status:res.ok ? 401 : res.status, error:data.error || 'FS27/SkyGate token is inactive or invalid.', skygate:data};
    if (!allowsAdminGate(data, env)) return {ok:false, status:403, error:'FS27/SkyGate token is active but not operator-scoped.', skygate:data};
    return {ok:true, via:'fs27-skygate', actor:data.email || data.username || data.sub || 'skygate-operator', skygate:data};
  }
  return {ok:false, status:404, error:last ? 'FS27/SkyGate introspection endpoint was not found.' : 'FS27/SkyGate introspection did not run.'};
}
async function loginFs27Gate(code, env){
  if (!fs27Configured(env)) return fs27RequiredResult('legacy operator code exchange');
  const password = String(code || '').trim();
  if (!password) return {ok:false, status:401, error:'Missing FS27/SkyGate exchange credential.'};
  const res = await skygateRequest(env, '/admin/login', {
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({password, code:password})
  });
  const data = await res.json().catch(() => ({}));
  return {ok:res.ok && Boolean(data.token || data.gateToken || data.gateBearerToken), status:res.status, data, error:data.error || null};
}
async function requireFs27OperatorAuth(request, env, legacyEnvNames=[]){
  if (!fs27Configured(env)) return fs27RequiredResult('CROWN operator request');
  const credentials = presentedGateCredentials(request);
  if (!credentials.length) return {ok:false, status:401, error:'Missing FS27/SkyGate bearer or gate session.'};
  const credential = credentials[0];
  const legacyCodes = legacyEnvNames.map(name => String(env[name] || '').trim()).filter(Boolean);
  if (legacyCodes.includes(credential)) {
    const exchange = await loginFs27Gate(credential, env);
    if (!exchange.ok) return {ok:false, status:exchange.status || 401, error:'Canonical FS27/SkyGate admin session is required for legacy operator code exchange.', skygate:exchange.data || null};
    const exchangedToken = exchange.data.token || exchange.data.gateToken || exchange.data.gateBearerToken || '';
    return introspectFs27Token(exchangedToken, env);
  }
  return introspectFs27Token(credential, env);
}
