
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const json = (data, status=200) => new Response(JSON.stringify(data,null,2), {status, headers:{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization,x-admin-token,x-free99-admin-code,x-free99-gate-session,x-skye-gate-session,x-skygate-session,x-0s-shared-gate,x-0s-internal-proxy-secret'}});
    if (request.method === 'OPTIONS') return json({ok:true});
    if (url.pathname === '/' || url.pathname === '/health' || url.pathname === '/api/nexus/status') return json({ok:true, service:'NEXUS Site Operator Brain', brains:16, persistence:{d1:!!env.NEXUS_DB, kv:!!env.NEXUS_KV, queue:!!env.NEXUS_QUEUE}, mode:'edge-ready'});
    if (url.pathname === '/api/nexus/intake' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const text = String(body.message || body.note || body.title || '');
      const lane = classify(text);
      const route = routeFor(lane);
      const receipt = { id: safeRandomUUID(), created_at: new Date().toISOString(), lane, primary_brain: route[0], secondary_review: route[1], status:'intake_pending_review', public_intake:true, message:text };
      if (env.NEXUS_KV) await env.NEXUS_KV.put(`intake:${receipt.id}`, JSON.stringify(receipt));
      if (env.NEXUS_DB) await env.NEXUS_DB.prepare('insert into nexus_events (id, created_at, lane, primary_brain, secondary_review, status, payload) values (?1,?2,?3,?4,?5,?6,?7)').bind(receipt.id,receipt.created_at,lane,route[0],route[1],receipt.status,JSON.stringify(body)).run();
      if (env.NEXUS_QUEUE) await env.NEXUS_QUEUE.send(receipt);
      return json({ok:true, intake:receipt});
    }
    if (url.pathname === '/api/nexus/route' && request.method === 'POST') {
      const auth = await authorized(request, env);
      if (!auth.ok) return unauthorized(json, auth);
      const body = await request.json().catch(()=>({}));
      const text = String(body.message || body.note || '');
      const lane = classify(text);
      const route = routeFor(lane);
      const receipt = { id: safeRandomUUID(), created_at: new Date().toISOString(), lane, primary_brain: route[0], secondary_review: route[1], status:'routed', message:text };
      if (env.NEXUS_KV) await env.NEXUS_KV.put(`event:${receipt.id}`, JSON.stringify(receipt));
      if (env.NEXUS_DB) await env.NEXUS_DB.prepare('insert into nexus_events (id, created_at, lane, primary_brain, secondary_review, status, payload) values (?1,?2,?3,?4,?5,?6,?7)').bind(receipt.id,receipt.created_at,lane,route[0],route[1],receipt.status,JSON.stringify(body)).run();
      if (env.NEXUS_QUEUE) await env.NEXUS_QUEUE.send(receipt);
      return json(receipt);
    }
    if (url.pathname === '/api/nexus/task' && request.method === 'POST') {
      const auth = await authorized(request, env);
      if (!auth.ok) return unauthorized(json, auth);
      const body = await request.json().catch(()=>({}));
      const task = { id: safeRandomUUID(), created_at: new Date().toISOString(), title: body.title || 'Untitled NEXUS task', owner_brain: body.owner_brain || 'Site Operator Brain', status:'open', payload: body };
      if (env.NEXUS_KV) await env.NEXUS_KV.put(`task:${task.id}`, JSON.stringify(task));
      if (env.NEXUS_DB) await env.NEXUS_DB.prepare('insert into nexus_tasks (id, created_at, title, owner_brain, status, payload) values (?1,?2,?3,?4,?5,?6)').bind(task.id,task.created_at,task.title,task.owner_brain,task.status,JSON.stringify(body)).run();
      if (env.NEXUS_QUEUE) await env.NEXUS_QUEUE.send(task);
      return json(task);
    }
    if (url.pathname === '/api/nexus/ledger') {
      const auth = await authorized(request, env);
      if (!auth.ok) return unauthorized(json, auth);
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
async function authorized(request, env){
  return requireFs27OperatorAuth(request, env, ['NEXUS_ADMIN_TOKEN', 'ADMIN_TOKEN']);
}
function unauthorized(json, auth={}){
  return json({ok:false, error:auth.error || 'operator_auth_required', code:auth.code || undefined, public_intake:'/api/nexus/intake'}, auth.status || 401);
}
function classify(t){t=(t||'').toLowerCase(); if(/lead|prospect|deal|quote|pipeline|proposal/.test(t))return'lead'; if(/client|renewal|onboard|complaint|launch/.test(t))return'client'; if(/candidate|resume|worker|staff|recruit/.test(t))return'candidate'; if(/vendor|partner|subcontractor/.test(t))return'vendor'; if(/legal|compliance|contract|risk|insurance/.test(t))return'compliance'; if(/proof|qa|receipt|audit|claim/.test(t))return'proof'; if(/invoice|billing|payroll|budget|margin/.test(t))return'finance'; if(/website|api|cloudflare|brain|database|worker/.test(t))return'technology'; if(/government|procurement|sam|rfp|bid/.test(t))return'government'; if(/founder|gray|approval|override/.test(t))return'founder'; return'general'}
function routeFor(lane){return ({lead:['Celeste Monroe Revenue Brain','Marcus Vale Operations Review'],client:['Adrian Cross Client Success Brain','Victor Saint QA Review'],candidate:['Sienna Brooks Staffing Brain','Julian Mercer Compliance Review'],vendor:['Helena Ward Vendor Brain','Julian Mercer Compliance Review'],compliance:['Julian Mercer Compliance Brain','Gray London Skyes Founder Review'],proof:['Victor Saint QA Brain','Site Operator Brain'],finance:['Naomi Sterling Finance Brain','Marcus Vale Operations Review'],technology:['Orion Hayes Technology Brain','Site Operator Brain'],government:['Donovan Pierce Gov/Enterprise Brain','Julian Mercer Compliance Review'],founder:['Gray London Skyes Founder Brain','Site Operator Brain'],general:['Site Operator Brain','Central Company Command Brain']})[lane] || ['Site Operator Brain','Central Company Command Brain'];}
function safeRandomUUID(){if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();return `uuid_${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;}
function skygateOrigin(env){return String(env.SKYGATEFS27_ORIGIN || env.SKYGATE_ORIGIN || '').replace(/\/+$/,'');}
function fs27Configured(env){return Boolean(env.SKYGATEFS27_WORKER?.fetch || skygateOrigin(env));}
function fs27RequiredResult(label='operator request'){return {ok:false,status:503,code:'fs27_required',error:`Canonical FS27/SkyGate session is required for ${label}. Configure SKYGATEFS27_WORKER or SKYGATEFS27_ORIGIN/SKYGATE_ORIGIN.`};}
function bearer(request){return String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i,'').trim();}
function cookieValue(request, name){const cookie=request.headers.get('cookie') || ''; const hit=cookie.split(';').map(part=>part.trim()).find(part=>part.startsWith(`${name}=`)); return hit ? decodeURIComponent(hit.slice(name.length + 1)) : '';}
function presentedGateCredentials(request){const values=[bearer(request),request.headers.get('x-admin-token'),request.headers.get('x-free99-admin-code'),request.headers.get('x-free99-gate-session'),request.headers.get('x-skye-gate-session'),request.headers.get('x-skygate-session'),cookieValue(request,'free99_gate_session'),cookieValue(request,'skye_gate_session'),cookieValue(request,'skygate_session')].map(value=>String(value || '').replace(/^Bearer\s+/i,'').trim()).filter(Boolean); return [...new Set(values)];}
function scopeList(scope){if(Array.isArray(scope))return scope.map(String); return String(scope || '').split(/\s+/).filter(Boolean);}
function emailAllowlist(env){return String(env.SKYGATE_ADMIN_EMAILS || '').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);}
function allowsAdminGate(claims, env){if(!claims?.active && !claims?.ok)return false; const role=String(claims.role || claims.user?.role || '').toLowerCase(); const scopes=new Set(scopeList(claims.scope || claims.scopes || claims.user?.scope).map(x=>x.toLowerCase())); const email=String(claims.email || claims.username || claims.user?.email || '').toLowerCase(); const allowedEmails=emailAllowlist(env); return ['founder','owner','admin','operator'].includes(role) || scopes.has('admin.write') || scopes.has('admin.read') || scopes.has('keys.write') || scopes.has('gateway.invoke') || (allowedEmails.length && allowedEmails.includes(email));}
async function skygateRequest(env,path,init={}){const origin=skygateOrigin(env); if(env.SKYGATEFS27_WORKER?.fetch){try{const response=await env.SKYGATEFS27_WORKER.fetch(new Request(`https://skygatefs27.internal${path}`, init)); if(response.status !== 404 || !origin)return response;}catch{if(!origin)throw new Error('SkyGate FS27 service binding failed and no origin is configured.');}} if(!origin)throw new Error('SKYGATEFS27_ORIGIN/SKYGATE_ORIGIN is not configured.'); return fetch(`${origin}${path}`, init);}
async function introspectFs27Token(token, env){if(!fs27Configured(env))return fs27RequiredResult('operator request'); if(!token)return {ok:false,status:401,error:'Missing FS27/SkyGate bearer or gate session.'}; const paths=['/auth-introspect','/auth/introspect','/.netlify/functions/auth-introspect']; let last=null; for(const path of paths){const res=await skygateRequest(env,path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})}); const data=await res.json().catch(()=>({active:false,error:'Invalid FS27/SkyGate response'})); last={res,data,path}; if(res.status===404)continue; if(!res.ok || data.active !== true)return {ok:false,status:res.ok ? 401 : res.status,error:data.error || 'FS27/SkyGate token is inactive or invalid.',skygate:data}; if(!allowsAdminGate(data, env))return {ok:false,status:403,error:'FS27/SkyGate token is active but not operator-scoped.',skygate:data}; return {ok:true,via:'fs27-skygate',actor:data.email || data.username || data.sub || 'skygate-operator',skygate:data};} return {ok:false,status:404,error:last ? 'FS27/SkyGate introspection endpoint was not found.' : 'FS27/SkyGate introspection did not run.'};}
async function loginFs27Gate(code, env){if(!fs27Configured(env))return fs27RequiredResult('legacy operator code exchange'); const password=String(code || '').trim(); if(!password)return {ok:false,status:401,error:'Missing FS27/SkyGate exchange credential.'}; const res=await skygateRequest(env,'/admin/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password,code:password})}); const data=await res.json().catch(()=>({})); return {ok:res.ok && Boolean(data.token || data.gateToken || data.gateBearerToken),status:res.status,data,error:data.error || null};}
async function requireFs27OperatorAuth(request, env, legacyEnvNames=[]){if(!fs27Configured(env))return fs27RequiredResult('NEXUS operator request'); const credentials=presentedGateCredentials(request); if(!credentials.length)return {ok:false,status:401,error:'Missing FS27/SkyGate bearer or gate session.'}; const credential=credentials[0]; const legacyCodes=legacyEnvNames.map(name=>String(env[name] || '').trim()).filter(Boolean); if(legacyCodes.includes(credential)){const exchange=await loginFs27Gate(credential, env); if(!exchange.ok)return {ok:false,status:exchange.status || 401,error:'Canonical FS27/SkyGate admin session is required for legacy operator code exchange.',skygate:exchange.data || null}; const exchangedToken=exchange.data.token || exchange.data.gateToken || exchange.data.gateBearerToken || ''; return introspectFs27Token(exchangedToken, env);} return introspectFs27Token(credential, env);}
