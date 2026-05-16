
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization"};
const j=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{"content-type":"application/json",...CORS}});
const now=()=>new Date().toISOString();
const uuid=()=>crypto.randomUUID();
async function body(req){try{return await req.json()}catch{return {}}}
function adminAuth(req,env){const need=env.ADMIN_TOKEN; if(!need) return false; return (req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'')===need;}
function customerAuth(req,env){if(!env.CUSTOMER_COMMAND_TOKEN) return true; return (req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'')===env.CUSTOMER_COMMAND_TOKEN;}
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
    const b=await body(req); const result=scan(b.command_text||b.command||'',b); const event={id:uuid(),source:b.source||'manual_scan',workspace_id:b.workspace_id||'',command_text:b.command_text||b.command||'',payload:b,created_at:now(),...result};
    await record(env,event); const approval_email=event.decision==='allow_customer_scoped'?{sent:false,reason:'not_needed'}:await notify(env,event); return j({ok:true,event,approval_email});
  }
  if(url.pathname==='/api/omega/customer-command' && req.method==='POST'){
    if(!customerAuth(req,env)) return j({ok:false,error:'unauthorized_customer_command'},401);
    const b=await body(req); const result=scan(b.command_text||b.command||'',b); const event={id:uuid(),source:'customer_command',workspace_id:b.workspace_id||'',command_text:b.command_text||b.command||'',payload:b,created_at:now(),...result};
    await record(env,event); const approval_email=event.decision==='allow_customer_scoped'?{sent:false,reason:'not_needed'}:await notify(env,event); return j({ok:true,event,approval_email});
  }
  if(url.pathname==='/api/omega/audit'){
    if(!adminAuth(req,env)) return j({ok:false,error:'unauthorized_admin_audit'},401);
    if(!env.OMEGA_DB) return j({ok:true,rows:[],note:'OMEGA_DB not bound'});
    const rows=await env.OMEGA_DB.prepare('SELECT * FROM omega_security_events ORDER BY created_at DESC LIMIT 200').all(); return j({ok:true,rows:rows.results||[]});
  }
  return j({ok:false,error:'not_found'},404);
}};
