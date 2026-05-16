
const ApprovalInbox = (() => {
  const ledgerKey='sovereign13.adminBrain.ledger.v1';
  const approvalKey='sovereign13.adminApprovals.v1';
  const defaultWorkerOrigin='https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
  const $=id=>document.getElementById(id);
  const now=()=>new Date().toISOString();
  const get=(k,f=[])=>JSON.parse(localStorage.getItem(k)||JSON.stringify(f));
  const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v,null,2));
  const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function endpoint(){return localStorage.getItem('adminBrainEndpoint')||defaultWorkerOrigin;}
  function token(){return sessionStorage.getItem('adminBrainToken')||'';}
  function renderStatus(){
    const gateReady = window.SkygateAuthBridge?.token?.() ? 'FS27 token loaded' : 'FS27 token not loaded';
    if($('approvalStatus')) $('approvalStatus').innerHTML=`<span class="status-pill">${endpoint()?'Cloudflare Worker mode':'Browser-local mode'}</span><span class="status-pill">${gateReady}</span><span class="status-pill">Resend notifications supported</span><span class="status-pill">Approval gates active</span>`;
    if($('endpointInput')) $('endpointInput').value=endpoint();
    const item=new URLSearchParams(location.search).get('item'); if(item && $('manualItem')) $('manualItem').value=item;
  }
  function queueItems(){
    const ledger=get(ledgerKey); const approvals=get(approvalKey);
    const approved=new Set(approvals.map(a=>a.item_id));
    return ledger.filter(x=>String(x.status||'').includes('approval') || x.approval_required || /publish|send|email|contract|payment|hire|fire|legal|price|public/i.test(x.message||'')).filter(x=>!approved.has(x.id));
  }
  function render(){
    const box=$('approvalQueue'); if(!box) return; const items=queueItems();
    box.innerHTML=items.map(x=>`<article><b>${esc(x.primary||'Approval item')}</b><span>${esc(x.id||'')} · ${esc(x.created_at||'')}</span><p>${esc(x.message||'').slice(0,220)}</p><button class="admin-btn secondary" data-approve="${esc(x.id)}">Approve</button><button class="admin-btn secondary" data-revise="${esc(x.id)}">Needs Revision</button></article>`).join('')||'<p>No local approval items are currently waiting. Load the Worker ledger if your tasks live in Cloudflare D1.</p>';
    box.querySelectorAll('[data-approve]').forEach(b=>b.addEventListener('click',()=>record(b.dataset.approve,'approved','Approved from inbox.')));
    box.querySelectorAll('[data-revise]').forEach(b=>b.addEventListener('click',()=>record(b.dataset.revise,'needs_revision','Needs revision from inbox.')));
  }
  async function record(item_id, decision, notes){
    const approval={id:'approval_'+Date.now(),item_id,decision,approver:'admin',notes,created_at:now()};
    const arr=get(approvalKey); arr.unshift(approval); set(approvalKey,arr.slice(0,500));
    if(endpoint()){
      try{await fetch(endpoint().replace(/\/$/,'')+'/api/admin/approval',{method:'POST',headers:{'content-type':'application/json','authorization':token()?`Bearer ${token()}`:''},body:JSON.stringify(approval)});}catch(e){console.warn(e)}
    }
    render();
  }
  async function loadLedger(){
    if(!endpoint()) return alert('Set Worker endpoint first.');
    const res=await fetch(endpoint().replace(/\/$/,'')+'/api/admin/ledger',{headers:{'authorization':token()?`Bearer ${token()}`:''}}); const json=await res.json();
    if(!res.ok || json.error) throw new Error(json.error || `Worker returned ${res.status}`);
    const rows=(json.ledger||[]).map(r=>{try{return {...JSON.parse(r.payload), id:JSON.parse(r.payload).id||r.id, created_at:r.created_at, type:r.type}}catch(e){return r}});
    set(ledgerKey, rows.concat(get(ledgerKey)).slice(0,500)); render();
  }
  async function sendTestEmail(){
    const box=$('emailTestResult'); if(!endpoint()) {box.innerHTML='<p class="warning">Set Worker endpoint first.</p>'; return;}
    try{const res=await fetch(endpoint().replace(/\/$/,'')+'/api/admin/approval-email/test',{method:'POST',headers:{'content-type':'application/json','authorization':token()?`Bearer ${token()}`:''},body:JSON.stringify({message:'Test approval email from Admin Approval Inbox.'})}); const j=await res.json(); box.innerHTML=`<pre>${esc(JSON.stringify(j,null,2))}</pre>`;}catch(e){box.innerHTML=`<p class="warning">${esc(e.message)}</p>`;}
  }
  function exportAll(){const data={exported_at:now(),approvals:get(approvalKey),pending:queueItems()};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='admin-approval-inbox-export-'+Date.now()+'.json';a.click();URL.revokeObjectURL(a.href)}
  function boot(){renderStatus();render();$('saveEndpoint')?.addEventListener('click',()=>{const v=$('endpointInput').value.trim(); if(v)localStorage.setItem('adminBrainEndpoint',v); else localStorage.removeItem('adminBrainEndpoint'); renderStatus();});$('saveToken')?.addEventListener('click',async()=>{if(window.SkygateAuthBridge){await window.SkygateAuthBridge.saveTokenFromInput('tokenInput','skygateAuthStatus');}else{sessionStorage.setItem('adminBrainToken',$('tokenInput').value.trim());} renderStatus();});$('submitApproval')?.addEventListener('click',()=>record($('manualItem').value.trim(),$('manualDecision').value,$('manualNotes').value));$('loadLedger')?.addEventListener('click',()=>loadLedger().catch(e=>alert(e.message)));$('sendTestEmail')?.addEventListener('click',sendTestEmail);$('exportApprovals')?.addEventListener('click',exportAll);$('clearLocalApprovals')?.addEventListener('click',()=>{localStorage.removeItem(approvalKey);render();});}
  return {boot};
})();
document.addEventListener('DOMContentLoaded',()=>ApprovalInbox.boot());
