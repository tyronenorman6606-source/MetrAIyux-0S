
const CORS = {
  'content-type':'application/json',
  'access-control-allow-origin':'*',
  'access-control-allow-methods':'GET,POST,OPTIONS',
  'access-control-allow-headers':'content-type,authorization'
};
const routes = [
  {keys:['post','social','content','campaign','blog','seo','linkedin','instagram','facebook','twitter','x ','tiktok'], primary:'Valentina Reyes — Marketing & Brand Brain', secondary:'Victor Saint — QA Brain', task:'Draft content, run claims/brand review, queue social draft for approval.'},
  {keys:['lead','deal','prospect','proposal','close','pipeline','ae'], primary:'Celeste Monroe — Sales & AE Brain', secondary:'Marcus Vale — Operations Brain', task:'Qualify lead, create AE follow-up plan, update pipeline task.'},
  {keys:['client','onboard','renewal','complaint','escalation'], primary:'Adrian Cross — Client Success Brain', secondary:'Victor Saint — QA Brain', task:'Create client success action plan and escalation receipt.'},
  {keys:['candidate','resume','job order','placement','recruit'], primary:'Sienna Brooks — Staffing Brain', secondary:'Julian Mercer — Compliance Brain', task:'Create staffing placement checklist and compliance documentation task.'},
  {keys:['contract','legal','compliance','insurance','risk','incorporation'], primary:'Julian Mercer — Compliance Brain', secondary:'Client Founder — Founder Command Brain', task:'Create risk note and professional escalation checklist.'},
  {keys:['cloudflare','worker','api','automation','brain','deploy','admin'], primary:'Orion Hayes — Technology Systems Brain', secondary:'Victor Saint — QA Brain', task:'Create deployment task, smoke test list, and proof receipt.'},
  {keys:['finance','invoice','budget','margin','payroll','forecast'], primary:'Naomi Sterling — Finance Brain', secondary:'Marcus Vale — Operations Brain', task:'Create finance review packet and approval note.'},
  {keys:['government','sam','procurement','bid','capability','contracting'], primary:'Donovan Pierce — Government & Enterprise Brain', secondary:'Julian Mercer — Compliance Brain', task:'Create government readiness packet.'},
  {keys:['vendor','partner','subcontractor','referral'], primary:'Helena Ward — Partnerships Brain', secondary:'Julian Mercer — Compliance Brain', task:'Create vendor/partner intake and risk scorecard.'},
  {keys:['quality','qa','proof','claim','audit','test','receipt'], primary:'Victor Saint — Quality Assurance Brain', secondary:'Client Founder — Founder Command Brain', task:'Create QA proof receipt and public claims review.'},
  {keys:['expand','innovation','new product','automation idea','ai workflow'], primary:'Amara Voss — Expansion & Innovation Brain', secondary:'Orion Hayes — Technology Brain', task:'Create innovation pilot brief and risk/cost review.'}
];
function auth(request, env){
  if (!env.ADMIN_TOKEN) return {ok:false, error:'ADMIN_TOKEN is not configured on this Worker.'};
  const hdr = request.headers.get('authorization') || '';
  const token = hdr.replace(/^Bearer\s+/i,'').trim();
  return token && token === env.ADMIN_TOKEN ? {ok:true} : {ok:false, error:'Unauthorized admin request.'};
}
function classify(message){
  const m = String(message || '').toLowerCase();
  let best = null, score = -1;
  for (const r of routes){
    const s = r.keys.reduce((n,k)=> n + (m.includes(k) ? (k.length > 5 ? 4 : 2) : 0), 0);
    if (s > score){ score = s; best = r; }
  }
  if (!best || score <= 0) best = {primary:'Central Company Command Brain', secondary:'Site Operator Brain', task:'Clarify business objective, split into cabinet tasks, and create operator approval plan.'};
  const approval_required = /(publish|post|send|email|contract|payment|hire|fire|legal|tax|file|incorporat|price|refund|public claim|bind|signature)/i.test(message);
  const social_intent = /(post|publish|social|linkedin|facebook|instagram|twitter|x |tiktok|campaign|content)/i.test(message);
  return {...best, approval_required, social_intent};
}
async function log(env, type, payload){
  const row = { id: crypto.randomUUID(), type, payload, created_at: new Date().toISOString() };
  if (env.ADMIN_KV) await env.ADMIN_KV.put(`${type}:${row.id}`, JSON.stringify(row));
  if (env.ADMIN_DB) await env.ADMIN_DB.prepare('insert into audit_log (id,type,payload,created_at) values (?1,?2,?3,?4)').bind(row.id,type,JSON.stringify(payload),row.created_at).run();
  return row;
}
async function createTask(env, title, owner, payload){
  const task = { id: crypto.randomUUID(), title, owner, status:'queued_admin_review', payload, created_at:new Date().toISOString() };
  if (env.ADMIN_KV) await env.ADMIN_KV.put(`task:${task.id}`, JSON.stringify(task));
  if (env.ADMIN_DB) await env.ADMIN_DB.prepare('insert into brain_tasks (id,title,owner,status,payload,created_at) values (?1,?2,?3,?4,?5,?6)').bind(task.id,task.title,task.owner,task.status,JSON.stringify(payload),task.created_at).run();
  if (env.ADMIN_QUEUE) await env.ADMIN_QUEUE.send({kind:'brain_task', task});
  return task;
}

function approvalEmailConfigured(env){
  return Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL && env.ADMIN_APPROVAL_EMAIL);
}
function adminApprovalUrl(env, receiptId){
  const base = (env.PUBLIC_ADMIN_URL || '').replace(/\/$/, '');
  if (!base) return '';
  return `${base}/admin/approval-inbox.html?item=${encodeURIComponent(receiptId || '')}`;
}
function escapeHtmlEmail(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function approvalEmailHtml(payload){
  const route = payload.route || {};
  const link = payload.approval_url || '';
  return `<!doctype html><html><body style="margin:0;background:#08101d;color:#f7fbff;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:720px;margin:0 auto;padding:28px;">
    <div style="border:1px solid rgba(255,255,255,.14);border-radius:22px;padding:24px;background:linear-gradient(135deg,#111827,#0b1220);">
      <p style="margin:0 0 10px;color:#f2c76e;letter-spacing:.16em;text-transform:uppercase;font-size:12px;">Admin approval required</p>
      <h1 style="margin:0 0 14px;font-size:26px;line-height:1.15;">Main Automation Brain needs your approval</h1>
      <p style="line-height:1.6;color:#d8e6ff;">A command was routed to the cabinet-brain system and was blocked from external action until you approve it.</p>
      <table style="width:100%;border-collapse:collapse;margin:18px 0;color:#f7fbff;">
        <tr><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.12);color:#9fb3d9;">Receipt</td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.12);">${escapeHtmlEmail(payload.id)}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.12);color:#9fb3d9;">Primary brain</td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.12);">${escapeHtmlEmail(route.primary)}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.12);color:#9fb3d9;">Secondary review</td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.12);">${escapeHtmlEmail(route.secondary)}</td></tr>
        <tr><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.12);color:#9fb3d9;">Status</td><td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.12);">${escapeHtmlEmail(payload.status)}</td></tr>
      </table>
      <p style="white-space:pre-wrap;background:#050a12;border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px;color:#eaf2ff;">${escapeHtmlEmail(payload.message || payload.topic || payload.title || '')}</p>
      ${link ? `<p style="margin:24px 0;"><a href="${escapeHtmlEmail(link)}" style="background:#f2c76e;color:#07101d;text-decoration:none;font-weight:800;padding:14px 18px;border-radius:14px;display:inline-block;">Open Admin Approval Inbox</a></p>` : `<p style="color:#f2c76e;">PUBLIC_ADMIN_URL is not configured, so no direct admin link was included.</p>`}
      <p style="font-size:12px;color:#94a3b8;line-height:1.6;">Guardrail: approval is required before publishing, sending email, client commitments, pricing changes, legal/tax/HR actions, payments, signatures, or public claims.</p>
    </div>
  </div></body></html>`;
}
async function sendApprovalNotification(env, payload){
  if (!approvalEmailConfigured(env)) {
    await log(env, 'approval_email_skipped', {reason:'RESEND_API_KEY, RESEND_FROM_EMAIL, or ADMIN_APPROVAL_EMAIL missing', payload});
    return {ok:false, skipped:true, reason:'Resend approval email is not configured.'};
  }
  const approval_url = adminApprovalUrl(env, payload.id);
  const emailPayload = {...payload, approval_url};
  const subject = `[Approval Required] ${payload.route?.primary || payload.owner || 'Main Automation Brain'} — ${String(payload.message || payload.title || 'New command').slice(0,80)}`;
  const res = await fetch('https://api.resend.com/emails', {
    method:'POST',
    headers:{'content-type':'application/json','authorization':`Bearer ${env.RESEND_API_KEY}`},
    body:JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [env.ADMIN_APPROVAL_EMAIL],
      reply_to: env.RESEND_REPLY_TO || undefined,
      subject,
      html: approvalEmailHtml(emailPayload),
      text: `Approval required\n\nReceipt: ${payload.id}\nPrimary: ${payload.route?.primary || payload.owner || ''}\nSecondary: ${payload.route?.secondary || ''}\nStatus: ${payload.status || ''}\n\nCommand:\n${payload.message || payload.topic || payload.title || ''}\n\nOpen: ${approval_url || 'PUBLIC_ADMIN_URL not configured'}\n`
    })
  });
  const data = await res.json().catch(async()=>({raw: await res.text().catch(()=> '')}));
  const record = {id:crypto.randomUUID(), item_id:payload.id || null, provider:'resend', status:res.ok ? 'sent' : 'failed', response:data, created_at:new Date().toISOString()};
  if (env.ADMIN_DB) await env.ADMIN_DB.prepare('insert into notification_log (id,item_id,provider,status,payload,created_at) values (?1,?2,?3,?4,?5,?6)').bind(record.id,record.item_id,record.provider,record.status,JSON.stringify({request:{to:env.ADMIN_APPROVAL_EMAIL,subject},response:data}),record.created_at).run().catch(()=>{});
  await log(env, 'approval_email', record);
  return {ok:res.ok, status:res.status, data, record};
}

async function maybeAI(env, message, route){
  // Optional Workers AI binding. Deterministic fallback is used if no AI binding is present.
  if (!env.AI) return null;
  try {
    const prompt = `You are the Main Automation Brain for a 13-department business OS. Reply as an admin operator. Route to ${route.primary} with ${route.secondary}. Keep approval boundaries clear. User command: ${message}`;
    const out = await env.AI.run(env.WORKERS_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct', {messages:[{role:'system',content:'You route business tasks, require proof receipts, and never fake external execution.'},{role:'user',content:prompt}]});
    return out.response || out.result?.response || null;
  } catch(e){ return null; }
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, {headers:CORS});
    if (url.pathname === '/api/admin/status') return Response.json({ok:true, service:'Admin Automation Brain Worker', brains:16, durable_mode:Boolean(env.ADMIN_DB), queue:Boolean(env.ADMIN_QUEUE), kv:Boolean(env.ADMIN_KV), social_connector:Boolean(env.SOCIAL_DISPATCH_WEBHOOK), resend_approval_email:approvalEmailConfigured(env), approval_recipient: env.ADMIN_APPROVAL_EMAIL ? 'configured' : 'missing', time:new Date().toISOString()}, {headers:CORS});
    if (url.pathname.startsWith('/api/admin/') && request.method !== 'GET') { const a = auth(request, env); if(!a.ok) return Response.json({ok:false,error:a.error}, {status:401, headers:CORS}); }
    if (url.pathname === '/api/admin/brain/chat' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const message = String(body.message || '');
      const route = classify(message);
      const receipt = { id:crypto.randomUUID(), message, route, status:route.approval_required ? 'approval_required' : 'queued_internal', created_at:new Date().toISOString(), guardrail:'Admin approval required before publishing, sending, legal/financial/HR action, payments, or client promises.' };
      const aiText = await maybeAI(env, message, route);
      const reply = aiText || `Command received. Routing to ${route.primary}; secondary review: ${route.secondary}. Task: ${route.task}. ${route.approval_required ? 'Approval required before external/public action.' : 'Queued as internal operator task.'}`;
      await log(env, 'chat_command', receipt);
      await createTask(env, route.task, route.primary, receipt);
      let approval_email = null;
      if (route.approval_required) approval_email = await sendApprovalNotification(env, receipt);
      if (route.social_intent) await createSocialDraft(env, {source_command:receipt.id, topic:message, draft:`Draft requested: ${message}`, status:'draft_pending_approval'});
      return Response.json({ok:true, reply, receipt, approval_email}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/task' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const task = await createTask(env, body.title || 'Untitled admin task', body.owner || 'Site Operator Brain', body);
      let approval_email = null;
      if (body.approval_required || body.requires_approval) approval_email = await sendApprovalNotification(env, {id:task.id, title:task.title, owner:task.owner, message:body.message || body.description || task.title, status:'approval_required', route:{primary:task.owner, secondary:body.secondary || 'Site Operator Brain'}});
      return Response.json({ok:true, task, approval_email}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/social/draft' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const draft = await createSocialDraft(env, {...body, status:'draft_pending_approval'});
      const approval_email = await sendApprovalNotification(env, {id:draft.id, message:draft.content || draft.topic || 'Social draft pending approval', status:'approval_required', route:{primary:'Valentina Reyes — Marketing & Brand Brain', secondary:'Victor Saint — QA Brain'}, platform:draft.platform});
      return Response.json({ok:true, draft, approval_email}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/social/publish' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      if (!body.approved) return Response.json({ok:false,error:'Publish blocked: approved=true is required.'}, {status:403,headers:CORS});
      if (!env.SOCIAL_DISPATCH_WEBHOOK) return Response.json({ok:false,error:'Publish blocked: SOCIAL_DISPATCH_WEBHOOK is not configured. Draft remains queued.'}, {status:409,headers:CORS});
      const dispatch = await fetch(env.SOCIAL_DISPATCH_WEBHOOK, {method:'POST',headers:{'content-type':'application/json','authorization': env.SOCIAL_DISPATCH_TOKEN ? `Bearer ${env.SOCIAL_DISPATCH_TOKEN}` : ''},body:JSON.stringify({platform:body.platform||'generic', text:body.text||body.content||'', metadata:body})});
      const text = await dispatch.text();
      const record = await log(env, 'social_publish_attempt', {request:body, status:dispatch.status, response:text.slice(0,1000)});
      return Response.json({ok:dispatch.ok, dispatch_status:dispatch.status, record}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/approval' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const approval = { id:crypto.randomUUID(), item_id:body.item_id||null, decision:body.decision||'pending', approver:body.approver||'admin', notes:body.notes||'', created_at:new Date().toISOString() };
      if (env.ADMIN_DB) await env.ADMIN_DB.prepare('insert into approvals (id,item_id,decision,approver,notes,created_at) values (?1,?2,?3,?4,?5,?6)').bind(approval.id,approval.item_id,approval.decision,approval.approver,approval.notes,approval.created_at).run();
      await log(env, 'approval', approval);
      return Response.json({ok:true, approval}, {headers:CORS});
    }

    if (url.pathname === '/api/admin/approval-email/test' && request.method === 'POST') {
      const body = await request.json().catch(()=>({}));
      const testPayload = {id:crypto.randomUUID(), message:body.message || 'Test approval email from the Admin Automation Brain.', status:'approval_required', route:{primary:'Site Operator Brain', secondary:'Victor Saint — QA Brain'}};
      const approval_email = await sendApprovalNotification(env, testPayload);
      return Response.json({ok:approval_email.ok, approval_email, testPayload}, {headers:CORS});
    }
    if (url.pathname === '/api/admin/ledger') {
      if (!env.ADMIN_DB) {
        if (!env.ADMIN_KV) return Response.json({ok:true, ledger:[], note:'ADMIN_DB and ADMIN_KV not bound.'}, {headers:CORS});
        const list = await env.ADMIN_KV.list({limit:200});
        const ledger = [];
        for (const key of list.keys) ledger.push(await env.ADMIN_KV.get(key.name, 'json'));
        return Response.json({ok:true, ledger:ledger.filter(Boolean), mode:'kv_fallback'}, {headers:CORS});
      }
      const rows = await env.ADMIN_DB.prepare('select id,type,payload,created_at from audit_log order by created_at desc limit 200').all();
      return Response.json({ok:true, ledger:rows.results||[]}, {headers:CORS});
    }
    return Response.json({ok:false,error:'Not found',routes:['/api/admin/status','/api/admin/brain/chat','/api/admin/task','/api/admin/social/draft','/api/admin/social/publish','/api/admin/approval','/api/admin/approval-email/test','/api/admin/ledger']}, {status:404, headers:CORS});
  }
}
async function createSocialDraft(env, payload){
  const draft = { id:crypto.randomUUID(), content:payload.content || payload.draft || '', topic:payload.topic || '', platform:payload.platform || 'generic', status:payload.status || 'draft_pending_approval', payload, created_at:new Date().toISOString() };
  if (env.ADMIN_KV) await env.ADMIN_KV.put(`social_draft:${draft.id}`, JSON.stringify(draft));
  if (env.ADMIN_DB) await env.ADMIN_DB.prepare('insert into social_drafts (id,platform,content,status,payload,created_at) values (?1,?2,?3,?4,?5,?6)').bind(draft.id,draft.platform,draft.content,draft.status,JSON.stringify(payload),draft.created_at).run();
  if (env.ADMIN_QUEUE) await env.ADMIN_QUEUE.send({kind:'social_draft', draft});
  await log(env, 'social_draft', draft);
  return draft;
}
