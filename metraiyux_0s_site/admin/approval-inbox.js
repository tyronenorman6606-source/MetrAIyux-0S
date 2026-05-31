
const ApprovalInbox = (() => {
	  const ledgerKey='sovereign13.adminBrain.ledger.v1';
	  const approvalKey='sovereign13.adminApprovals.v1';
	  const formationKey='sovereign13.llcTo0sWorkflows.v1';
	  const defaultWorkerOrigin='https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
  const $=id=>document.getElementById(id);
  const now=()=>new Date().toISOString();
  const get=(k,f=[])=>JSON.parse(localStorage.getItem(k)||JSON.stringify(f));
  const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v,null,2));
  const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function endpoint(){return localStorage.getItem('adminBrainEndpoint')||defaultWorkerOrigin;}
	  function token(){return window.SkygateAuthBridge?.token?.() || window.MetrAIyuxGateBridge?.current?.()?.token || '';}
  function authHeaders(extra={}){return window.SkygateAuthBridge?.authHeaders ? window.SkygateAuthBridge.authHeaders(extra) : {...extra, ...(token()?{'authorization':`Bearer ${token()}`}: {})};}
  function renderStatus(){
    const gateReady = window.SkygateAuthBridge?.token?.() ? 'FS27 token loaded' : 'FS27 token not loaded';
	    if($('approvalStatus')) $('approvalStatus').innerHTML=`<span class="status-pill">${endpoint()?'Worker target configured':'Browser-local target only'}</span><span class="status-pill">${gateReady}</span><span class="status-pill">Worker receipt required for live approval</span><span class="status-pill">Approval gates active</span>`;
    if($('endpointInput')) $('endpointInput').value=endpoint();
    const item=new URLSearchParams(location.search).get('item'); if(item && $('manualItem')) $('manualItem').value=item;
  }
	  function queueItems(){
		    const ledger=get(ledgerKey); const formations=get(formationKey); const approvals=get(approvalKey);
		    const approved=new Set(approvals.filter(a=>a.runtime_status === 'worker_confirmed' || a.runtime_status === 'browser_local_only').map(a=>a.item_id));
	    const brainItems = ledger.filter(x=>String(x.status||'').includes('approval') || x.approval_required || /publish|send|email|contract|payment|hire|fire|legal|price|public/i.test(x.message||''));
	    const formationItems = formations
	      .filter(x=>!['closed','completed','cancelled'].includes(String(x.status||'').toLowerCase()))
	      .map(x=>({
	        id:x.id,
	        primary:x.businessName || 'LLC-to-0S business launch',
	        created_at:x.createdAt || x.updatedAt || '',
	        message:`LLC-to-0S workflow ${x.id} is ${x.status || 'pending'} for ${x.jurisdiction || 'US'}; packet, legal review, workforce, webpage, and SkyeNet publish intent need owner tracking.`,
	        status:x.status,
	        source:'sovereigndocs_llc_to_0s',
	        workflow:x
	      }));
	    return brainItems.concat(formationItems).filter(x=>!approved.has(x.id));
	  }
  function render(){
    const box=$('approvalQueue'); if(!box) return; const items=queueItems();
		    box.innerHTML=items.map(x=>`<article><b>${esc(x.primary||'Approval item')}</b><span>${esc(x.id||'')} · ${esc(x.created_at||'')} · ${esc(x.source||x.type||'approval')}</span><p>${esc(x.message||'').slice(0,260)}</p><button class="admin-btn secondary" data-approve="${esc(x.id)}">Approve</button><button class="admin-btn secondary" data-revise="${esc(x.id)}">Needs Revision</button>${x.source==='sovereigndocs_llc_to_0s'?` <a class="admin-btn secondary" href="../Free99/apps/sovereigndocs/business-formation/?workflow=${esc(encodeURIComponent(x.id))}">Open LLC Workflow</a>`:''}</article>`).join('')||'<p>No locally cached approval items are currently waiting. Load the Worker ledger or LLC workflows to verify live queues.</p>';
    box.querySelectorAll('[data-approve]').forEach(b=>b.addEventListener('click',()=>record(b.dataset.approve,'approved','Approved from inbox.')));
    box.querySelectorAll('[data-revise]').forEach(b=>b.addEventListener('click',()=>record(b.dataset.revise,'needs_revision','Needs revision from inbox.')));
  }
	  async function record(item_id, decision, notes){
		    const approval={id:'approval_'+Date.now(),item_id,decision,approver:'shared_gate_operator',notes,created_at:now(),source:'browser-local-cache',worker_confirmed:false,runtime_status:'browser_pending_worker_confirmation'};
		    const arr=get(approvalKey); arr.unshift(approval); set(approvalKey,arr.slice(0,500));
		    if(endpoint()){
		      const base=endpoint().replace(/\/$/,'');
		      const workflow=get(formationKey).find(item=>item.id===item_id);
		      try{
		        if(workflow && decision==='approved'){
		          const workflowRes = await fetch(base+`/api/sovereigndocs/business-formation/workflows/${encodeURIComponent(item_id)}/approve`,{method:'POST',headers:authHeaders({'content-type':'application/json'}),body:JSON.stringify({status:'owner_approved_for_filing_prep',note:notes || 'Approved from Admin Approval Inbox.'})});
		          if(!workflowRes.ok) throw new Error(`workflow approval returned ${workflowRes.status}`);
		        }
		        const approvalRes = await fetch(base+'/api/admin/approval',{method:'POST',headers:authHeaders({'content-type':'application/json'}),body:JSON.stringify(approval)});
		        const approvalBody = await approvalRes.json().catch(()=>({}));
		        if(!approvalRes.ok || approvalBody.error) throw new Error(approvalBody.error || `approval ledger returned ${approvalRes.status}`);
		        approval.worker_confirmed = true;
		        approval.runtime_status = 'worker_confirmed';
		        approval.worker_receipt = approvalBody.receipt || approvalBody;
		      }catch(e){
		        approval.worker_confirmed = false;
		        approval.runtime_status = 'worker_failed_local_copy';
		        approval.worker_error = e.message || String(e);
		        console.warn(e);
		      }
		    }else{
		      approval.runtime_status = 'browser_local_only';
		    }
		    set(approvalKey,arr.slice(0,500));
		    render();
		  }
	  async function loadLedger(){
	    if(!endpoint()) return alert('Set Worker endpoint first.');
	    const res=await fetch(endpoint().replace(/\/$/,'')+'/api/admin/ledger',{headers:authHeaders()}); const json=await res.json();
	    if(!res.ok || json.error) throw new Error(json.error || `Worker returned ${res.status}`);
	    const rows=(json.ledger||[]).map(r=>{try{return {...JSON.parse(r.payload), id:JSON.parse(r.payload).id||r.id, created_at:r.created_at, type:r.type}}catch(e){return r}});
	    set(ledgerKey, rows.concat(get(ledgerKey)).slice(0,500)); render();
	  }
	  async function loadLlcWorkflows(){
	    if(!endpoint()) return alert('Set Worker endpoint first.');
	    const base=endpoint().replace(/\/$/,'');
	    const res=await fetch(base+'/api/sovereigndocs/v18/workspace/dashboard',{headers:authHeaders()}); const json=await res.json();
	    if(!res.ok || json.error) throw new Error(json.error || `Worker returned ${res.status}`);
	    set(formationKey, (json.panels?.businessFormationWorkflows||[]).slice(0,500));
	    render();
	  }
  async function sendTestEmail(){
    const box=$('emailTestResult'); if(!endpoint()) {box.innerHTML='<p class="warning">Set Worker endpoint first.</p>'; return;}
    try{const res=await fetch(endpoint().replace(/\/$/,'')+'/api/admin/approval-email/test',{method:'POST',headers:authHeaders({'content-type':'application/json'}),body:JSON.stringify({message:'Test approval email from Admin Approval Inbox.'})}); const j=await res.json(); box.innerHTML=`<pre>${esc(JSON.stringify(j,null,2))}</pre>`;}catch(e){box.innerHTML=`<p class="warning">${esc(e.message)}</p>`;}
  }
	  function exportAll(){const data={exported_at:now(),approvals:get(approvalKey),llc_workflows:get(formationKey),pending:queueItems()};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='admin-approval-inbox-export-'+Date.now()+'.json';a.click();URL.revokeObjectURL(a.href)}
		  function boot(){renderStatus();render();$('saveEndpoint')?.addEventListener('click',()=>{const v=$('endpointInput').value.trim(); if(v)localStorage.setItem('adminBrainEndpoint',v); else localStorage.removeItem('adminBrainEndpoint'); renderStatus();});$('saveToken')?.addEventListener('click',async()=>{await window.SkygateAuthBridge?.saveTokenFromInput?.('tokenInput','skygateAuthStatus'); renderStatus();});$('submitApproval')?.addEventListener('click',()=>record($('manualItem').value.trim(),$('manualDecision').value,$('manualNotes').value));$('loadLedger')?.addEventListener('click',()=>loadLedger().catch(e=>alert(e.message)));$('loadLlcWorkflows')?.addEventListener('click',()=>loadLlcWorkflows().catch(e=>alert(e.message)));$('sendTestEmail')?.addEventListener('click',sendTestEmail);$('exportApprovals')?.addEventListener('click',exportAll);$('clearLocalApprovals')?.addEventListener('click',()=>{localStorage.removeItem(approvalKey);render();});}
  return {boot};
})();
document.addEventListener('DOMContentLoaded',()=>ApprovalInbox.boot());
