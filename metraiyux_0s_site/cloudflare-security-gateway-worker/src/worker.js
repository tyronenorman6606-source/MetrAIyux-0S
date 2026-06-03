
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization,x-0s-gate-session,x-skye-gate-session,x-skygate-session,x-fs27-session,x-0s-shared-gate,x-0s-internal-proxy-secret"};
const j=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{"content-type":"application/json",...CORS}});
const now=()=>new Date().toISOString();
const uuid=()=>globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `uuid_${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
async function body(req){try{return await req.json()}catch{return {}}}
function sharedGateRequired(env){return ['1','true','yes','on'].includes(String(env.ZERO_OS_SHARED_GATE_REQUIRED||env.SKYE_SHARED_GATE_REQUIRED||'').toLowerCase());}
function sharedProxySecret(env){return String(env.ZERO_OS_INTERNAL_PROXY_SECRET||env.METRAIYUX_0S_INTERNAL_PROXY_SECRET||env.OMEGA_INTERNAL_PROXY_SECRET||'').trim();}
function sharedProxyAuth(req,env){
  const secret=sharedProxySecret(env);
  if(!secret) return false;
  return String(req.headers.get('x-0s-shared-gate')||'').toLowerCase()==='operator' && String(req.headers.get('x-0s-internal-proxy-secret')||'').trim()===secret;
}
function boolEnv(value){return /^(1|true|yes|on)$/i.test(String(value||'').trim());}
function skygateOrigin(env){return String(env.SKYGATEFS27_ORIGIN||env.SKYGATE_ORIGIN||'').replace(/\/+$/,'');}
function fs27Configured(env){return Boolean(env.SKYGATEFS27_WORKER?.fetch||skygateOrigin(env));}
function bearer(req){return String(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'').trim();}
function scopeList(scope){return Array.isArray(scope)?scope.map(String):String(scope||'').split(/\s+/).filter(Boolean);}
function gateTokens(req){return [
  bearer(req),
  req.headers.get('x-0s-gate-session'),
  req.headers.get('x-skye-gate-session'),
  req.headers.get('x-skygate-session'),
  req.headers.get('x-fs27-session')
].map(v=>String(v||'').trim()).filter(Boolean);}
function operatorClaims(data){
  if(!data?.active&&!data?.ok) return false;
  const role=String(data.role||data.user?.role||'').toLowerCase();
  const scopes=new Set(scopeList(data.scope||data.scopes||data.user?.scope).map(s=>s.toLowerCase()));
  return ['founder','owner','admin','operator'].includes(role)||scopes.has('admin.read')||scopes.has('admin.write')||scopes.has('gateway.invoke');
}
async function skygateRequest(env,path,init={}){
  const origin=skygateOrigin(env);
  if(env.SKYGATEFS27_WORKER?.fetch){
    const res=await env.SKYGATEFS27_WORKER.fetch(new Request(`https://skygatefs27.internal${path}`,init));
    if(res.status!==404||!origin) return res;
  }
  if(!origin) throw new Error('SKYGATEFS27_ORIGIN/SKYGATE_ORIGIN is not configured.');
  return fetch(`${origin}${path}`,init);
}
async function introspectGate(token,env,{operator=false}={}){
  if(!fs27Configured(env)) return {ok:false,status:503,code:'fs27_required',error:'Canonical FS27/SkyGate session is required.'};
  if(!token) return {ok:false,status:401,error:'Missing FS27/SkyGate bearer.'};
  for(const path of ['/auth-introspect','/auth/introspect','/.netlify/functions/auth-introspect','/api/skygate/auth-introspect']){
    const res=await skygateRequest(env,path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})});
    if(res.status===404) continue;
    const data=await res.json().catch(()=>({active:false,error:'Invalid FS27/SkyGate response'}));
    if(!res.ok||data.active!==true) return {ok:false,status:res.ok?401:res.status,error:data.error||'FS27/SkyGate token is inactive or invalid.',skygate:data};
    if(operator&&!operatorClaims(data)) return {ok:false,status:403,error:'FS27/SkyGate token is active but not operator-scoped.',skygate:data};
    return {ok:true,via:'fs27-skygate',skygate:data};
  }
  return {ok:false,status:404,error:'FS27/SkyGate introspection endpoint was not found.'};
}
function tokenFromExchange(data){
  return String(data?.gateBearerToken||data?.gateToken||data?.session?.token||data?.token||data?.access_token||'').replace(/^Bearer\s+/i,'').trim();
}
async function exchangeLegacyCredential(credential,env,{operator=false,envName='legacy'}={}){
  if(!fs27Configured(env)) return {ok:false,status:503,code:'fs27_required',error:'Canonical FS27/SkyGate session is required.'};
  if(!credential) return {ok:false,status:401,error:'Missing legacy exchange credential.'};
  const paths=operator
    ? ['/admin/login','/.netlify/functions/admin-login','/api/owner/admin-login']
    : ['/session/token','/.netlify/functions/session-token','/auth/exchange','/auth-exchange','/.netlify/functions/auth-exchange'];
  let last={ok:false,status:404,error:'FS27/SkyGate exchange endpoint was not found.'};
  for(const path of paths){
    const res=await skygateRequest(env,path,{
      method:'POST',
      headers:{'content-type':'application/json','authorization':`Bearer ${credential}`},
      body:JSON.stringify({
        token:credential,
        code:credential,
        password:credential,
        credential,
        legacy_env:envName,
        source:'0meg4kai-security-gateway'
      })
    });
    if(res.status===404||res.status===405) continue;
    const data=await res.json().catch(()=>({error:'Invalid FS27/SkyGate exchange response'}));
    const exchanged=tokenFromExchange(data);
    if(!res.ok||!exchanged){
      last={ok:false,status:res.status,error:data.error||'FS27/SkyGate legacy credential exchange failed.',skygate:data};
      continue;
    }
    const gate=await introspectGate(exchanged,env,{operator});
    if(!gate.ok) return gate;
    return {...gate,via:`${gate.via}-legacy-exchange`,exchange:{env:envName,path}};
  }
  return last;
}
function legacyBearer(req,env,{flag,envName}){
  const token=bearer(req);
  const expected=String(env?.[envName]||'').trim();
  if(!boolEnv(env?.[flag])||!expected||token!==expected) return '';
  return token;
}
async function adminAuth(req,env){
  if(sharedProxyAuth(req,env)) return {ok:true,via:'0s-internal-proxy'};
  const token=gateTokens(req)[0];
  if(token){
    const gate=await introspectGate(token,env,{operator:true});
    if(gate.ok) return gate;
    const legacy=legacyBearer(req,env,{flag:'OMEGA_ALLOW_LEGACY_ADMIN_TOKEN',envName:'ADMIN_TOKEN'});
    if(legacy) return exchangeLegacyCredential(legacy,env,{operator:true,envName:'ADMIN_TOKEN'});
    return gate;
  }
  return {ok:false,status:401,error:'FS27/SkyGate operator session required.'};
}
async function customerAuth(req,env){
  if(sharedProxyAuth(req,env)) return {ok:true,via:'0s-internal-proxy'};
  const token=gateTokens(req)[0];
  if(token){
    const gate=await introspectGate(token,env);
    if(gate.ok) return gate;
    const legacy=legacyBearer(req,env,{flag:'OMEGA_ALLOW_LEGACY_CUSTOMER_TOKEN',envName:'CUSTOMER_COMMAND_TOKEN'});
    if(legacy) return exchangeLegacyCredential(legacy,env,{envName:'CUSTOMER_COMMAND_TOKEN'});
    return gate;
  }
  return {ok:false,status:401,error:'FS27/SkyGate customer session required.'};
}
function scan(command,payload={}){
  const text=String(command||'');
  const tests=[
    ['owner_connector_risk',/(owner|founder|gray|main orchestrator|mega brain|production social|admin social|company social|admin brain)/i,30,'References owner/admin connector or privileged brain.'],
    ['privilege_escalation',/(admin token|secret|api key|credential|password|bypass|all tenants|global ledger|root access|oauth)/i,40,'Requests privileged secret/global access.'],
    ['public_action',/(publish|post|send email|send sms|dispatch|go live|public claim|announce)/i,15,'Requests external or public action.'],
    ['legal_finance_hr',/(contract|signature|legal|tax|filing|incorporat|hire|fire|payroll|payment|refund|price|billing)/i,20,'Touches legal/finance/HR/pricing/filing-sensitive work.'],
    ['data_boundary',/(customer data|client list|candidate list|all workspaces|other customer|export everything|cross tenant)/i,35,'May cross customer/tenant data boundary.']
  ];
  const findings=tests.filter(t=>t[1].test(text)).map(([id,rx,score,why])=>({id,score,why}));
  const risk_score=findings.reduce((n,f)=>n+f.score,0);
  let decision='allow_customer_scoped';
  if(findings.some(f=>['owner_connector_risk','privilege_escalation','data_boundary'].includes(f.id))) decision='quarantine_for_admin_review';
  else if(findings.some(f=>['public_action','legal_finance_hr'].includes(f.id))) decision='approval_required';
  return {decision,risk_score,findings,primary_brain:'0meg4kAI',secondary_brain: decision==='allow_customer_scoped'?'customer_workspace_brain':'Main Automation Brain approval queue'};
}
async function record(env,event){
  if(env.OMEGA_DB) await env.OMEGA_DB.prepare('INSERT INTO omega_security_events (id,workspace_id,source,decision,risk_score,findings,command_text,payload,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(event.id,event.workspace_id||'',event.source||'',event.decision,event.risk_score,JSON.stringify(event.findings||[]),event.command_text||'',JSON.stringify(event.payload||{}),event.created_at).run();
  if(env.OMEGA_KV) await env.OMEGA_KV.put(`omega:${event.id}`,JSON.stringify(event));
  if(env.OMEGA_QUEUE && event.decision!=='allow_customer_scoped') await env.OMEGA_QUEUE.send({type:'omega_review',event});
}
async function notify(env,event){
  if(!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL || !env.ADMIN_APPROVAL_EMAIL) return {sent:false,reason:'resend_not_configured'};
  const link=(env.PUBLIC_ADMIN_URL||'').replace(/\/$/,'')+'/admin/approval-inbox.html?omega='+encodeURIComponent(event.id);
  const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${env.RESEND_API_KEY}`},body:JSON.stringify({from:env.RESEND_FROM_EMAIL,to:[env.ADMIN_APPROVAL_EMAIL],subject:`0meg4kAI review: ${event.decision}`,html:`<h2>0meg4kAI review</h2><p>Decision: <b>${event.decision}</b></p><p>Risk score: ${event.risk_score}</p><pre>${String(event.command_text||'').replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</pre><p><a href="${link}">Open admin approval inbox</a></p>`})});
  return {sent:res.ok,status:res.status};
}
export default {async fetch(req,env){
  if(req.method==='OPTIONS') return new Response(null,{headers:CORS});
  const url=new URL(req.url);
  if(url.pathname==='/' || url.pathname==='/health' || url.pathname==='/api/omega/status') return j({ok:true,service:'0meg4kAI Security Gateway',d1:!!env.OMEGA_DB,kv:!!env.OMEGA_KV,queue:!!env.OMEGA_QUEUE,resend:!!env.RESEND_API_KEY,time:now()});
  if(url.pathname==='/api/omega/scan' && req.method==='POST'){
    const auth=await adminAuth(req,env); if(!auth.ok) return j({ok:false,error:auth.error,code:auth.code},auth.status||401);
    const b=await body(req); const result=scan(b.command_text||b.command||'',b); const event={id:uuid(),source:b.source||'manual_scan',workspace_id:b.workspace_id||'',command_text:b.command_text||b.command||'',payload:b,created_at:now(),...result};
    await record(env,event); const approval_email=event.decision==='allow_customer_scoped'?{sent:false,reason:'not_needed'}:await notify(env,event); return j({ok:true,event,approval_email});
  }
  if(url.pathname==='/api/omega/customer-command' && req.method==='POST'){
    const auth=await customerAuth(req,env); if(!auth.ok) return j({ok:false,error:auth.error,code:auth.code},auth.status||401);
    const b=await body(req); const result=scan(b.command_text||b.command||'',b); const event={id:uuid(),source:'customer_command',workspace_id:b.workspace_id||'',command_text:b.command_text||b.command||'',payload:b,created_at:now(),...result};
    await record(env,event); const approval_email=event.decision==='allow_customer_scoped'?{sent:false,reason:'not_needed'}:await notify(env,event); return j({ok:true,event,approval_email});
  }
  if(url.pathname==='/api/omega/audit'){
    const auth=await adminAuth(req,env); if(!auth.ok) return j({ok:false,error:auth.error,code:auth.code},auth.status||401);
    if(!env.OMEGA_DB) return j({ok:true,rows:[],note:'OMEGA_DB not bound'});
    const rows=await env.OMEGA_DB.prepare('SELECT * FROM omega_security_events ORDER BY created_at DESC LIMIT 200').all(); return j({ok:true,rows:rows.results||[]});
  }
  return j({ok:false,error:'not_found'},404);
}};
