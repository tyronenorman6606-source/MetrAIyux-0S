
import { createSkyeMailClient, skymailConfigured } from './skymail-sdk.js';

const PLANS = {
  "starter-command": { name: "Starter Command", monthly: 297, setup: 997 },
  "growth-cabinet": { name: "Growth Cabinet", monthly: 797, setup: 2500 },
  "autonomous-office": { name: "Autonomous Office", monthly: 1497, setup: 5000 },
  "enterprise-command": { name: "Enterprise / Government Readiness", monthly: "Custom", setup: "Custom" }
};
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type,Authorization"};
const json = (data, status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{"content-type":"application/json",...cors}});
const id = (p)=>`${p}_${crypto.randomUUID()}`;
const now = ()=>new Date().toISOString();
async function body(req){ try{return await req.json()}catch(e){return {}} }
function slugify(s){return String(s||'workspace').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64)||'workspace'}
function auth(req, env){ const need = env.ADMIN_TOKEN; if(!need) return true; const got = (req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,''); return got === need; }
function omegaScan(text){ const t=String(text||''); const findings=[]; const add=(id,why)=>findings.push({id,why}); if(/owner|founder|gray|main orchestrator|mega brain|production social|admin social|admin brain|company social/i.test(t)) add('owner_connector_or_admin_brain_request','Customer command references owner/admin systems.'); if(/admin token|secret|api key|credential|password|bypass|all tenants|global ledger|root access|oauth/i.test(t)) add('privilege_escalation','Customer command requests privileged credentials or global access.'); if(/publish|post|send email|send sms|dispatch|go live|public claim|announce/i.test(t)) add('external_action','Customer command requests public/external action.'); if(/contract|signature|legal|tax|filing|incorporat|hire|fire|payroll|payment|refund|price|billing/i.test(t)) add('regulated_or_approval_sensitive','Customer command touches legal, finance, HR, pricing, or filing-sensitive work.'); if(/other customer|all workspaces|cross tenant|client list|candidate list|export everything/i.test(t)) add('tenant_boundary_risk','Customer command may cross tenant boundaries.'); let decision='allow_customer_scoped'; if(findings.some(f=>['owner_connector_or_admin_brain_request','privilege_escalation','tenant_boundary_risk'].includes(f.id))) decision='quarantine_for_admin_review'; else if(findings.length) decision='approval_required'; return {reviewer:'0meg4kAI', decision, findings}; }
function routeCommand(text){ const t=String(text||'').toLowerCase(); if(/post|social|content|blog|marketing/.test(t)) return {primary:'Valentina Reyes / Marketing Brain', secondary:'Victor Saint / QA Brain', approval_required:true}; if(/hire|candidate|recruit|staff|worker/.test(t)) return {primary:'Sienna Brooks / Staffing Brain', secondary:'Marcus Vale / Operations Brain', approval_required:true}; if(/contract|legal|compliance|filing|claim/.test(t)) return {primary:'Julian Mercer / Compliance Brain', secondary:'Victor Saint / QA Brain', approval_required:true}; if(/invoice|price|billing|payment/.test(t)) return {primary:'Naomi Sterling / Finance Brain', secondary:'Marcus Vale / Operations Brain', approval_required:true}; if(/lead|sale|proposal|close/.test(t)) return {primary:'Celeste Monroe / Revenue Brain', secondary:'Adrian Cross / Client Success Brain', approval_required:false}; return {primary:'Site Operator Brain', secondary:'Central Company Command Brain', approval_required:false}; }
async function email(env, subject, html){ if(!env.RESEND_API_KEY || !env.ADMIN_APPROVAL_EMAIL || !env.RESEND_FROM_EMAIL) return {sent:false, reason:'resend_not_configured'}; const res = await fetch('https://api.resend.com/emails',{method:'POST',headers:{'Authorization':`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.RESEND_FROM_EMAIL,to:[env.ADMIN_APPROVAL_EMAIL],subject,html})}); return {sent:res.ok, status:res.status, body: await res.text()}; }
async function audit(env, actor, action, resource_type, resource_id, payload){
  const row={id:id('audit'),actor,action,resource_type,resource_id,payload:payload||{},created_at:now()};
  if(env.SAAS_KV) await env.SAAS_KV.put(`audit:${row.id}`,JSON.stringify(row));
  if(env.SAAS_DB) await env.SAAS_DB.prepare('INSERT INTO audit_log (id,actor,action,resource_type,resource_id,payload,created_at) VALUES (?,?,?,?,?,?,?)').bind(row.id,actor,action,resource_type,resource_id,JSON.stringify(payload||{}),row.created_at).run();
  return row;
}
async function recordProvisioningEvent(env, workspaceId, eventType, payload, status='recorded'){
  const row={id:id('prov'),workspace_id:workspaceId,event_type:eventType,payload:payload||{},status,created_at:now()};
  if(env.SAAS_KV) await env.SAAS_KV.put(`provisioning_event:${row.id}`,JSON.stringify(row));
  if(env.SAAS_DB) await env.SAAS_DB.prepare('INSERT INTO provisioning_events (id,workspace_id,event_type,payload,status,created_at) VALUES (?,?,?,?,?,?)').bind(row.id,workspaceId,eventType,JSON.stringify(payload||{}),status,row.created_at).run();
  return row;
}
async function recordWorkspaceMailbox(env, workspaceId, skymail){
  const mailbox=skymail?.data?.mailbox || null;
  const row={
    id:id('mbx'),
    workspace_id:workspaceId,
    provider:mailbox?.provider || 'skymail',
    mailbox_email:mailbox?.mailbox_email || '',
    status:mailbox?.status || (skymail?.skipped ? 'skipped' : 'pending'),
    provisioning_status:mailbox?.provisioning_status || (skymail?.skipped ? 'skymail_not_configured' : 'unknown'),
    skymail_user_id:skymail?.data?.user?.id || '',
    skymail_mailbox_id:mailbox?.id || '',
    inbox_ready:skymail?.data?.inbox_ready ? 1 : 0,
    provider_ready:skymail?.data?.provider_ready ? 1 : 0,
    key_state:skymail?.data?.key_state || {},
    payload:skymail?.data || skymail || {},
    created_at:now(),
    updated_at:now()
  };
  if(env.SAAS_KV) await env.SAAS_KV.put(`workspace_mailbox:${workspaceId}`,JSON.stringify(row));
  if(env.SAAS_DB) {
    await env.SAAS_DB.prepare(`INSERT INTO workspace_mailboxes
      (id,workspace_id,provider,mailbox_email,status,provisioning_status,skymail_user_id,skymail_mailbox_id,inbox_ready,provider_ready,key_state,payload,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(row.id,row.workspace_id,row.provider,row.mailbox_email,row.status,row.provisioning_status,row.skymail_user_id,row.skymail_mailbox_id,row.inbox_ready,row.provider_ready,JSON.stringify(row.key_state),JSON.stringify(row.payload),row.created_at,row.updated_at).run();
  }
  return row;
}
export default { async fetch(req, env){
  if(req.method==='OPTIONS') return new Response(null,{headers:cors});
  const url=new URL(req.url); const path=url.pathname;
  try{
    if(path==='/' || path==='/health' || path==='/api/saas/status') return json({ok:true, service:'saas-self-serve-provisioning', plans:Object.keys(PLANS), d1:!!env.SAAS_DB, kv:!!env.SAAS_KV, queue:!!env.SAAS_QUEUE, resend:!!env.RESEND_API_KEY, skymail:skymailConfigured(env), skymail_url:env.SKYMAIL_API_URL||env.SKYMAIL_PUBLIC_URL||null, time:now()});
    if(path==='/api/saas/plans') return json({plans:PLANS});
    if(path==='/api/saas/signup' && req.method==='POST'){
      const b=await body(req); const customer_id=id('cus'); const plan_id=b.plan_id||b.plan||'starter-command';
      const customer={id:customer_id,full_name:b.full_name||'',email:b.email||'',company_name:b.company_name||'',phone:b.phone||'',plan_id,status:'signup_received',created_at:now()};
      if(env.SAAS_KV) await env.SAAS_KV.put(`customer:${customer_id}`,JSON.stringify(customer));
      if(env.SAAS_DB) await env.SAAS_DB.prepare('INSERT INTO customers (id,full_name,email,company_name,phone,plan_id,status,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(customer_id,customer.full_name,customer.email,customer.company_name,customer.phone,plan_id,customer.status,customer.created_at).run();
      await audit(env,b.email||'public','signup','customer',customer_id,b);
      return json({ok:true, customer_id, plan_id, next:'create_workspace', persistence:env.SAAS_DB?'d1':'kv_fallback'});
    }
    if(path==='/api/saas/workspaces' && req.method==='POST'){
	      const b=await body(req);
	      const workspace_id=id('ws'); const slug=slugify(b.company_name||b.slug||workspace_id); const plan_id=b.plan_id||'starter-command';
	      const workspace={id:workspace_id,customer_id:b.customer_id||'',company_name:b.company_name||slug,slug,plan_id,status:'pending_provisioning',approval_email:b.approval_email||'',created_at:now(),updated_at:now(),services:Array.isArray(b.services)?b.services:[]};
      if(env.SAAS_KV) await env.SAAS_KV.put(`workspace:${workspace_id}`,JSON.stringify(workspace));
      if(env.SAAS_DB) {
        await env.SAAS_DB.prepare('INSERT INTO workspaces (id,customer_id,company_name,slug,plan_id,status,approval_email,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(workspace_id,workspace.customer_id,workspace.company_name,slug,plan_id,workspace.status,workspace.approval_email,workspace.created_at,workspace.updated_at).run();
        for(const s of workspace.services){ await env.SAAS_DB.prepare('INSERT INTO workspace_services (id,workspace_id,service_key,status,created_at) VALUES (?,?,?,?,?)').bind(id('svc'),workspace_id,String(s),'selected',now()).run(); }
      }
	      const owner={email:b.owner_email||b.email||b.approval_email||'', full_name:b.full_name||b.owner_name||''};
	      const skymail = await createSkyeMailClient(env).provisionWorkspaceMailbox(workspace, owner);
	      const mailboxReceipt = await recordWorkspaceMailbox(env, workspace_id, skymail);
	      await recordProvisioningEvent(env, workspace_id, 'skymail.workspace_mailbox', {skymail, mailboxReceipt}, skymail.ok?'completed':(skymail.skipped?'skipped':'needs_attention'));
	      if(env.SAAS_QUEUE) await env.SAAS_QUEUE.send({type:'workspace_provisioning', workspace_id, plan_id, services:workspace.services, skymail:mailboxReceipt, at:now()});
	      await audit(env,'system','create_workspace','workspace',workspace_id,b);
	      await email(env,'Workspace provisioning approval needed',`<h2>Workspace pending</h2><p>Workspace ${workspace_id} for ${b.company_name||slug} is ready for approval.</p><p>Plan: ${plan_id}</p><p>SkyeMail: ${mailboxReceipt.mailbox_email || mailboxReceipt.provisioning_status}</p>`);
	      return json({ok:true, workspace_id, slug, status:'pending_provisioning', queued:!!env.SAAS_QUEUE, persistence:env.SAAS_DB?'d1':'kv_fallback', skymail:{ok:skymail.ok, skipped:!!skymail.skipped, mailbox:mailboxReceipt, response:skymail.data||null, error:skymail.error||null}});
	    }
	    if(path==='/api/saas/skymail/status'){
	      const workspace_id=url.searchParams.get('workspace_id')||'';
	      if(!workspace_id) return json({ok:false,error:'workspace_id_required'},400);
	      if(env.SAAS_DB){ const rows=await env.SAAS_DB.prepare('SELECT * FROM workspace_mailboxes WHERE workspace_id=? ORDER BY created_at DESC LIMIT 10').bind(workspace_id).all(); return json({ok:true, rows:rows.results||[]}); }
	      if(env.SAAS_KV){ const row=await env.SAAS_KV.get(`workspace_mailbox:${workspace_id}`,'json'); return json({ok:true, rows:row?[row]:[]}); }
	      return json({ok:false,error:'no_persistence_bound'},500);
	    }
    if(path==='/api/saas/billing/checkout-session' && req.method==='POST'){
      const b=await body(req); const subscription_id=id('sub'); const sub={id:subscription_id,customer_id:b.customer_id||'',workspace_id:b.workspace_id||'',plan_id:b.plan_id||'starter-command',provider:'stripe_or_manual',provider_subscription_id:'',status:env.STRIPE_SECRET_KEY?'checkout_requested':'manual_billing_required',created_at:now()};
      if(env.SAAS_KV) await env.SAAS_KV.put(`subscription:${subscription_id}`,JSON.stringify(sub));
      if(env.SAAS_DB) await env.SAAS_DB.prepare('INSERT INTO subscriptions (id,customer_id,workspace_id,plan_id,provider,provider_subscription_id,status,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(subscription_id,sub.customer_id,sub.workspace_id,sub.plan_id,sub.provider,sub.provider_subscription_id,sub.status,sub.created_at).run();
      await audit(env,'system','billing_intent','subscription',subscription_id,b);
      return json({ok:true, subscription_id, mode: env.STRIPE_SECRET_KEY?'stripe_secret_present_connect_checkout_next':'manual_billing_required', persistence:env.SAAS_DB?'d1':'kv_fallback', note:'Checkout provider call is intentionally stubbed; wire Stripe API or invoice provider here.'});
    }
    if(path==='/api/saas/customer-command' && req.method==='POST'){
      const b=await body(req); const cmd_id=id('cmd'); const omega=omegaScan(b.command_text||b.command||''); const route=routeCommand(b.command_text||b.command||''); if(omega.decision==='quarantine_for_admin_review'){ route.primary='0meg4kAI / Security QA Brain'; route.secondary='Main Automation Brain approval queue'; route.approval_required=true; } else if(omega.decision==='approval_required'){ route.secondary='0meg4kAI / Security QA Brain'; route.approval_required=true; }
      const command={id:cmd_id,workspace_id:b.workspace_id||'',command_text:b.command_text||b.command||'',primary_brain:route.primary,secondary_brain:route.secondary,approval_required:!!route.approval_required,status:route.approval_required?'approval_required':'queued',created_at:now(),route,omega};
      if(env.SAAS_KV) await env.SAAS_KV.put(`customer_command:${cmd_id}`,JSON.stringify(command));
      if(env.SAAS_DB) await env.SAAS_DB.prepare('INSERT INTO customer_commands (id,workspace_id,command_text,primary_brain,secondary_brain,approval_required,status,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(cmd_id,command.workspace_id,command.command_text,route.primary,route.secondary,route.approval_required?1:0,command.status,command.created_at).run();
      if(route.approval_required) await email(env,'Customer command needs approval',`<h2>Approval needed</h2><p><b>Primary:</b> ${route.primary}</p><p><b>Secondary:</b> ${route.secondary}</p><pre>${b.command_text||b.command||''}</pre>`);
      if(env.SAAS_QUEUE) await env.SAAS_QUEUE.send({type:'customer_command', command_id:cmd_id, route, at:now()});
      await audit(env,b.workspace_id||'customer','customer_command','command',cmd_id,{...b,route,omega});
      return json({ok:true, command_id:cmd_id, route, omega_review:omega, queued:!!env.SAAS_QUEUE, persistence:env.SAAS_DB?'d1':'kv_fallback', boundary:'customer commands never access owner Main Automation Brain or owner production connectors directly'});
    }
    if(path==='/api/saas/ledger'){
      if(!auth(req,env)) return json({ok:false,error:'unauthorized'},401);
      if(!env.SAAS_DB) {
        if(!env.SAAS_KV) return json({ok:false,error:'SAAS_KV_not_bound'},500);
        const list=await env.SAAS_KV.list({prefix:'audit:',limit:100}); const rows=[]; for(const k of list.keys) rows.push(await env.SAAS_KV.get(k.name,'json')); return json({ok:true, rows:rows.filter(Boolean), persistence:'kv_fallback'});
      }
      const rows = await env.SAAS_DB.prepare('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100').all(); return json({ok:true, rows:rows.results||[]});
    }
    return json({ok:false,error:'not_found',path},404);
  }catch(err){return json({ok:false,error:String(err && err.message || err)},500)}
}}
