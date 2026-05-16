
const AdminAutomationBrain = (() => {
  const chatKey = 'clientCommandDeck.adminBrain.chat.v1';
  const ledgerKey = 'clientCommandDeck.adminBrain.ledger.v1';
  let brainConfig = null;
  let personaConfig = null;
  const defaultWorkerOrigin = window.location.origin;
  const $ = (id) => document.getElementById(id);
  const now = () => new Date().toISOString();
  const get = (key, fallback=[]) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  const set = (key, value) => localStorage.setItem(key, JSON.stringify(value, null, 2));
  const escapeHtml = (s) => String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  async function boot(){
    brainConfig = await fetch('../brain/automation-brain.json').then(r=>r.json());
    personaConfig = await fetch('../brain/persona-brains.json').then(r=>r.json()).catch(()=>({profiles:[]}));
    renderStatus(); renderChat(); renderLedger(); bind();
  }

  function endpoint(){ return sessionStorage.getItem('adminBrainEndpoint') || localStorage.getItem('adminBrainEndpoint') || defaultWorkerOrigin; }
  function token(){ return sessionStorage.getItem('adminBrainToken') || ''; }
  function isWorkerMode(){ return Boolean(endpoint()); }

  function classify(message){
    const text = String(message||'').toLowerCase();
    let best = null, score = -1;
    for (const route of brainConfig.command_routes){
      const s = route.trigger.reduce((n,t)=> n + (text.includes(t) ? (t.length > 5 ? 4 : 2) : 0), 0);
      if (s > score){ score = s; best = route; }
    }
    if (!best || score <= 0) best = {primary:'Central Company Command Brain', primary_brain_id:'central-company-command-brain', secondary:'Site Operator Brain', task:'Clarify business objective, split into cabinet tasks, and create operator approval plan.'};
    const approvalRequired = /(publish|post|send|email|contract|pay|payment|hire|fire|legal|tax|file|incorporat|price|refund|public claim|bind|signature|customer|tenant|workspace|credential|oauth|connector)/i.test(message);
    const socialIntent = /(post|publish|social|linkedin|facebook|instagram|x |twitter|tiktok|blog|campaign|content)/i.test(message);
    const taskId = 'cmd_' + Date.now();
    if (/customer|tenant|workspace|signup|self serve|portal/i.test(message) && best.primary !== 'Security Gate Brain') { best.secondary = best.primary; best.primary = 'Security Gate Brain'; best.primary_brain_id = '0meg4kai-security-brain'; best.task = 'Run tenant-isolation, privilege, connector, approval, and customer-boundary review before routing to any cabinet brain.'; }
    const actions = [
      `Primary brain: ${best.primary}`,
      `Secondary review: ${best.secondary}`,
      best.task,
      approvalRequired ? 'Require admin approval before external/public action.' : 'Can draft and queue internally without external action.',
      socialIntent ? 'If social connector is configured, create a draft first; publish only after approval policy allows.' : 'Record internal task and proof receipt.'
    ];
    return {id:taskId, created_at:now(), message, primary:best.primary, primary_brain_id:best.primary_brain_id, secondary:best.secondary, recommended_task:best.task, approval_required:approvalRequired, social_intent:socialIntent, status: approvalRequired ? 'approval_required' : 'queued_internal', actions};
  }

  function localReply(message){
    const receipt = classify(message);
    const text = `Command received. I am routing this to ${receipt.primary} with ${receipt.secondary} as secondary review.\n\nTask: ${receipt.recommended_task}\n\n${receipt.approval_required ? 'Admin approval is required before anything public, paid, legal, hiring-related, or externally sent happens.' : 'I can queue this internally as an operator task.'}\n\nNext actions:\n- ${receipt.actions.join('\n- ')}`;
    addLedger(receipt); return {text, receipt};
  }

  async function workerReply(message){
    const url = endpoint().replace(/\/$/,'') + '/api/admin/brain/chat';
    const res = await fetch(url, {method:'POST', headers:{'content-type':'application/json','authorization': token() ? `Bearer ${token()}` : ''}, body:JSON.stringify({message})});
    const json = await res.json().catch(()=>({ok:false,error:'Invalid Worker response'}));
    if(!res.ok || json.error) throw new Error(json.error || `Worker returned ${res.status}`);
    return {text: (json.reply || 'Worker command recorded.') + (json.approval_email ? `\n\nApproval email: ${json.approval_email.ok ? 'sent through Resend' : (json.approval_email.reason || 'not sent')}.` : ''), receipt: json.receipt || json};
  }

  async function send(message){
    if(!message.trim()) return;
    addChat({role:'user', text:message, at:now()}); renderChat();
    let out;
    try { out = isWorkerMode() ? await workerReply(message) : localReply(message); }
    catch(err){ out = localReply(message); out.text = `Worker unavailable or unauthorized, so I kept this local. Error: ${err.message}\n\n${out.text}`; }
    addChat({role:'brain', text:out.text, receipt:out.receipt, at:now()}); renderChat(); renderLedger();
  }

  function addChat(msg){ const items = get(chatKey); items.push(msg); set(chatKey, items.slice(-120)); }
  function addLedger(item){ const items = get(ledgerKey); items.unshift(item); set(ledgerKey, items.slice(0,500)); }
  function renderChat(){
    const box = $('chatWindow'); if(!box) return;
    const items = get(chatKey);
    box.innerHTML = items.map(m => `<div class="message ${m.role==='user'?'user':'brain'}"><div>${escapeHtml(m.text).replace(/\n/g,'<br>')}</div><small>${m.at || ''}</small></div>`).join('') || `<div class="message brain">Main Automation Brain online with Security Gate Brain security assistant active. Tell me what to run: leads, client follow-up, social content, candidate placement, proof review, Cloudflare deployment, or cabinet tasks.</div>`;
    box.scrollTop = box.scrollHeight;
  }
  function renderLedger(){
    const box = $('adminLedger'); if(!box) return;
    const items = get(ledgerKey);
    box.innerHTML = items.slice(0,12).map(x=>`<article><b>${escapeHtml(x.primary || 'Command')}</b><span>${escapeHtml(x.status || '')} · ${escapeHtml(x.created_at || '')}</span><p>${escapeHtml(x.message || '').slice(0,160)}</p></article>`).join('') || '<p>No admin commands yet.</p>';
  }
  function renderStatus(){
    if($('adminBrainStatus')) $('adminBrainStatus').innerHTML = `<span class="status-pill">${brainConfig.total_connected_brains} connected brains</span><span class="status-pill">${endpoint() ? 'Cloudflare Worker mode' : 'Browser-local mode'}</span><span class="status-pill">Approval gates active</span>`;
    if($('endpointInput')) $('endpointInput').value = endpoint();
  }
  function exportAll(){
    const data = {exported_at:now(), chat:get(chatKey), ledger:get(ledgerKey), endpoint:endpoint() ? 'configured' : 'local-only'};
    const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`admin-automation-brain-export-${Date.now()}.json`; a.click(); URL.revokeObjectURL(a.href);
  }
  function clearAll(){ localStorage.removeItem(chatKey); localStorage.removeItem(ledgerKey); renderChat(); renderLedger(); }
  function bind(){
    $('adminChatForm')?.addEventListener('submit', e=>{ e.preventDefault(); const v=$('adminMessage').value; $('adminMessage').value=''; send(v); });
    document.querySelectorAll('[data-prompt]').forEach(btn=>btn.addEventListener('click',()=>{ $('adminMessage').value = btn.dataset.prompt; $('adminMessage').focus(); }));
    $('saveEndpoint')?.addEventListener('click',()=>{ const v=$('endpointInput').value.trim(); if(v) localStorage.setItem('adminBrainEndpoint',v); else localStorage.removeItem('adminBrainEndpoint'); renderStatus(); });
    $('saveToken')?.addEventListener('click',()=>{ sessionStorage.setItem('adminBrainToken', $('tokenInput').value.trim()); renderStatus(); });
    $('exportAdminBrain')?.addEventListener('click', exportAll);
    $('clearAdminBrain')?.addEventListener('click', clearAll);
  }
  return {boot, send};
})();
document.addEventListener('DOMContentLoaded',()=>AdminAutomationBrain.boot());
