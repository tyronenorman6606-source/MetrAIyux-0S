export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"content-type,authorization,x-admin-token,x-free99-admin-code,x-free99-gate-session,x-skye-gate-session,x-skygate-session,x-0s-shared-gate,x-0s-internal-proxy-secret"};
    if (request.method === 'OPTIONS') return new Response(null,{headers:cors});
    const json = (data, status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{...cors,'content-type':'application/json'}});
    if (url.pathname === '/' || url.pathname === '/health' || url.pathname === '/api/sentinel/status') return json({ok:true, service:'Sentinel Site Operator Brain', brains:16, persistence:{d1:!!env.DB, kv:!!env.SENTINEL_LEDGER, queue:!!env.SENTINEL_QUEUE}, mode:'worker-ready', time:new Date().toISOString()});
    if (url.pathname === '/api/sentinel/intake' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const text = String(body.text || body.message || body.title || '').toLowerCase();
      const route = chooseRoute(text);
      const receipt = {id: safeRandomUUID(), type:'public_intake', created_at:new Date().toISOString(), input_excerpt:text.slice(0,500), ...route, status:'intake_pending_review', public_intake:true};
      if (env.SENTINEL_LEDGER) await env.SENTINEL_LEDGER.put(`intake:${receipt.id}`, JSON.stringify(receipt));
      if (env.SENTINEL_QUEUE) await env.SENTINEL_QUEUE.send(receipt);
      if (env.DB) await env.DB.prepare('insert into events (id,type,payload,created_at) values (?1,?2,?3,?4)').bind(receipt.id,'public_intake',JSON.stringify(receipt),receipt.created_at).run();
      return json({ok:true, intake:receipt});
    }
    if (url.pathname === '/api/sentinel/route' && request.method === 'POST') {
      const auth = await authorized(request, env);
      if (!auth.ok) return unauthorized(json, auth);
      const body = await request.json().catch(()=>({}));
      const text = String(body.text || body.message || '').toLowerCase();
      const route = chooseRoute(text);
      const receipt = {id: safeRandomUUID(), type:'route', created_at:new Date().toISOString(), input_excerpt:text.slice(0,500), ...route, status:'queued_for_human_review'};
      if (env.SENTINEL_LEDGER) await env.SENTINEL_LEDGER.put(`route:${receipt.id}`, JSON.stringify(receipt));
      if (env.SENTINEL_QUEUE) await env.SENTINEL_QUEUE.send(receipt);
      if (env.DB) await env.DB.prepare('insert into events (id,type,payload,created_at) values (?1,?2,?3,?4)').bind(receipt.id,'route',JSON.stringify(receipt),receipt.created_at).run();
      return json(receipt);
    }
    if (url.pathname === '/api/sentinel/task' && request.method === 'POST') {
      const auth = await authorized(request, env);
      if (!auth.ok) return unauthorized(json, auth);
      const body = await request.json().catch(()=>({}));
      const task = {id: safeRandomUUID(), type:'task', title: body.title || 'Untitled task', cabinet: body.cabinet || 'Site Operator', owner_brain: body.owner_brain || 'Site Operator Brain', status:'pending_review', human_gate: !!body.human_gate, created_at:new Date().toISOString(), payload: body};
      if (env.SENTINEL_LEDGER) await env.SENTINEL_LEDGER.put(`task:${task.id}`, JSON.stringify(task));
      if (env.DB) await env.DB.prepare('insert into tasks (id,title,cabinet,owner_brain,status,human_gate,payload,created_at) values (?1,?2,?3,?4,?5,?6,?7,?8)').bind(task.id,task.title,task.cabinet,task.owner_brain,task.status,task.human_gate?1:0,JSON.stringify(task.payload),task.created_at).run();
      return json(task);
    }
    if (url.pathname === '/api/sentinel/ledger' && request.method === 'GET') {
      const auth = await authorized(request, env);
      if (!auth.ok) return unauthorized(json, auth);
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
async function authorized(request, env){
  return requireFs27OperatorAuth(request, env, ['SENTINEL_ADMIN_TOKEN', 'ADMIN_TOKEN']);
}
function unauthorized(json, auth={}){
  return json({ok:false, error:auth.error || 'operator_auth_required', code:auth.code || undefined, public_intake:'/api/sentinel/intake'}, auth.status || 401);
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
  if (!fs27Configured(env)) return fs27RequiredResult('SENTINEL operator request');
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
