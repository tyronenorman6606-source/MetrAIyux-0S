
const AdminAutomationBrain = (() => {
  const chatKey = 'sovereign13.adminBrain.chat.v1';
  const ledgerKey = 'sovereign13.adminBrain.ledger.v1';
  let brainConfig = null;
  let personaConfig = null;
  let surfaceRegistry = null;
  const defaultWorkerOrigin = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
  const $ = (id) => document.getElementById(id);
  const now = () => new Date().toISOString();
  const get = (key, fallback=[]) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  const set = (key, value) => localStorage.setItem(key, JSON.stringify(value, null, 2));
  const escapeHtml = (s) => String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  async function boot(){
    brainConfig = await fetch('../brain/automation-brain.json').then(r=>r.json());
    personaConfig = await fetch('../brain/persona-brains.json').then(r=>r.json()).catch(()=>({profiles:[]}));
    surfaceRegistry = await fetch('../brain/live-surface-registry.json').then(r=>r.json()).catch(()=>null);
    renderStatus(); renderChat(); renderLedger(); bind();
  }

  function endpoint(){ return sessionStorage.getItem('adminBrainEndpoint') || localStorage.getItem('adminBrainEndpoint') || defaultWorkerOrigin; }
  function token(){ return window.SkygateAuthBridge?.token?.() || window.MetrAIyuxGateBridge?.current?.()?.token || ''; }
  function isWorkerMode(){ return Boolean(endpoint()); }
  function authHeaders(extra={}){ return window.SkygateAuthBridge?.authHeaders ? window.SkygateAuthBridge.authHeaders(extra) : {...extra, ...(token() ? {'authorization':`Bearer ${token()}`} : {})}; }

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
    if (/customer|tenant|workspace|signup|self serve|portal/i.test(message) && best.primary !== '0meg4kAI') { best.secondary = best.primary; best.primary = '0meg4kAI'; best.primary_brain_id = '0meg4kai-security-brain'; best.task = 'Run tenant-isolation, privilege, connector, approval, and customer-boundary review before routing to any cabinet brain.'; }
    const actions = [
      `Primary brain: ${best.primary}`,
      `Secondary review: ${best.secondary}`,
      best.task,
      approvalRequired ? 'Require admin approval before external/public action.' : 'Can draft and queue internally without external action.',
      socialIntent ? 'If social connector is configured, create a draft first; publish only after approval policy allows.' : 'Record internal task and proof receipt.'
    ];
    return {id:taskId, created_at:now(), message, primary:best.primary, primary_brain_id:best.primary_brain_id, secondary:best.secondary, recommended_task:best.task, approval_required:approvalRequired, social_intent:socialIntent, status: approvalRequired ? 'approval_required' : 'queued_internal', actions, live_surfaces: surfaceMatches(message)};
  }

  function localReply(message){
    const receipt = classify(message);
    receipt.source = 'browser-local-classifier';
    receipt.worker_confirmed = false;
    receipt.runtime_status = 'browser_local_only';
    const surfaces = (receipt.live_surfaces || []).map(s => `- ${s.name}: ${s.url}`).join('\n');
    const text = `Command received. I am routing this to ${receipt.primary} with ${receipt.secondary} as secondary review.\n\nTask: ${receipt.recommended_task}\n\n${receipt.approval_required ? 'Admin approval is required before anything public, paid, legal, hiring-related, or externally sent happens.' : 'I can queue this internally as an operator task.'}\n\nNext actions:\n- ${receipt.actions.join('\n- ')}${surfaces ? `\n\nRegistered surfaces to inspect:\n${surfaces}` : ''}`;
    return {text, receipt};
  }

  function surfaceMatches(message, limit=3){
    const text = String(message || '').toLowerCase();
    return (surfaceRegistry?.surfaces || [])
      .map(surface => {
        const hay = [surface.name, surface.audience, surface.privacy, surface.purpose, surface.sales_use, ...(surface.route_when || [])].join(' ').toLowerCase();
        let score = 0;
        for (const term of text.split(/[^a-z0-9-]+/).filter(Boolean)) if (hay.includes(term)) score += term.length > 5 ? 3 : 1;
        if (/sell|buyer|prospect|client|lead|website|white[- ]?label|command deck|deployment|proof|gate|auth|skygate|fs27/i.test(text)) score += 6;
        return {...surface, score};
      })
      .filter(surface => surface.score > 0)
      .sort((a,b)=>b.score-a.score)
      .slice(0,limit)
      .map(({score, ...surface}) => surface);
  }

  async function workerReply(message){
    const url = endpoint().replace(/\/$/,'') + '/api/admin/brain/chat';
    const res = await fetch(url, {method:'POST', headers:authHeaders({'content-type':'application/json'}), body:JSON.stringify({message})});
    const json = await res.json().catch(()=>({ok:false,error:'Invalid Worker response'}));
    if(!res.ok || json.error) throw new Error(json.error || `Worker returned ${res.status}`);
    const receipt = json.receipt || json;
    receipt.source = receipt.source || 'worker';
    receipt.worker_confirmed = true;
    receipt.runtime_status = 'worker_confirmed';
    return {text: (json.reply || 'Worker command recorded.') + (json.approval_email ? `\n\nApproval email: ${json.approval_email.ok ? 'sent through Resend' : (json.approval_email.reason || 'not sent')}.` : ''), receipt};
  }

  async function send(message){
    if(!message.trim()) return;
    addChat({role:'user', text:message, at:now()}); renderChat();
    let out;
    try { out = isWorkerMode() ? await workerReply(message) : localReply(message); }
    catch(err){
      out = localReply(message);
      out.receipt.runtime_status = 'worker_failed_local_copy';
      out.receipt.worker_error = err.message;
      out.text = `Worker unavailable or unauthorized, so I kept this as a browser-local copy only. Error: ${err.message}\n\n${out.text}`;
    }
    addLedger(out.receipt);
    addChat({role:'brain', text:out.text, receipt:out.receipt, at:now()}); renderChat(); renderLedger();
  }

  function addChat(msg){ const items = get(chatKey); items.push(msg); set(chatKey, items.slice(-120)); }
  function addLedger(item){ const items = get(ledgerKey); items.unshift(item); set(ledgerKey, items.slice(0,500)); }
  function renderChat(){
    const box = $('chatWindow'); if(!box) return;
    const items = get(chatKey);
    box.innerHTML = items.map(m => `<div class="message ${m.role==='user'?'user':'brain'}"><div>${escapeHtml(m.text).replace(/\n/g,'<br>')}</div><small>${m.at || ''}</small></div>`).join('') || `<div class="message brain">Main Automation Brain online with 0meg4kAI security assistant active. Tell me what to run: leads, client follow-up, social content, candidate placement, proof review, Cloudflare deployment, or cabinet tasks.</div>`;
    box.scrollTop = box.scrollHeight;
  }
  function renderLedger(){
    const box = $('adminLedger'); if(!box) return;
    const items = get(ledgerKey);
    box.innerHTML = items.slice(0,12).map(x=>`<article><b>${escapeHtml(x.primary || 'Command')}</b><span>${escapeHtml(x.status || '')} · ${escapeHtml(x.runtime_status || x.source || 'unknown-source')} · ${escapeHtml(x.created_at || '')}</span><p>${escapeHtml(x.message || '').slice(0,160)}</p></article>`).join('') || '<p>No admin commands yet.</p>';
  }
  function renderStatus(){
    const gateReady = window.SkygateAuthBridge?.token?.() ? 'FS27 token loaded' : 'FS27 token not loaded';
    if($('adminBrainStatus')) $('adminBrainStatus').innerHTML = `<span class="status-pill">${brainConfig.total_connected_brains} connected brains</span><span class="status-pill">${endpoint() ? 'Worker target configured' : 'Browser-local target only'}</span><span class="status-pill">${gateReady}</span><span class="status-pill">${surfaceRegistry ? surfaceRegistry.surface_count : 0} registered surfaces</span><span class="status-pill">Worker receipt required for live logs</span>`;
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
    $('saveToken')?.addEventListener('click',async()=>{ await window.SkygateAuthBridge?.saveTokenFromInput?.('tokenInput','skygateAuthStatus'); renderStatus(); });
    $('exportAdminBrain')?.addEventListener('click', exportAll);
    $('clearAdminBrain')?.addEventListener('click', clearAll);
  }
  return {boot, send};
})();
document.addEventListener('DOMContentLoaded',()=>AdminAutomationBrain.boot());
