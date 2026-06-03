(() => {
const DEFAULT_API_BASES = {
  sovereigndocs: '/api/sovereigndocs',
  platform: '/api'
};
window.METRAIYUX_API_BASES = { ...DEFAULT_API_BASES, ...(window.METRAIYUX_API_BASES || {}) };
function apiBase(app='sovereigndocs'){
  return String(window.METRAIYUX_API_BASES?.[app] || DEFAULT_API_BASES[app] || '/api').replace(/\/+$/,'');
}
function apiPath(path, app='sovereigndocs'){
  const raw=String(path||'');
  if(/^https?:\/\//i.test(raw)) return raw;
  const sameOrigin = value => new URL(value, location.origin).href;
  if(app==='platform') return raw.startsWith('/api/') ? sameOrigin(raw) : raw;
  const base=apiBase(app);
  if(raw===base || raw.startsWith(`${base}/`)) return sameOrigin(raw);
  if(raw.startsWith('/api/')) return sameOrigin(`${base}${raw.slice('/api'.length)}`);
  return sameOrigin(`${base}/${raw.replace(/^\/+/,'')}`);
}
async function api(path, options={}){
  const { app='sovereigndocs', ...fetchOptions } = options;
  const requestPath=apiPath(path, app);
  const headers={ 'accept':'application/json', ...(options.body?{'content-type':'application/json'}:{}) };
  const res=await fetch(requestPath,{...fetchOptions,headers});
  const text=await res.text();
  let body; try{ body=text?JSON.parse(text):{}; }catch{ body={ raw:text }; }
  if(!res.ok) throw Object.assign(new Error(body.error||`${requestPath} returned ${res.status}`),{status:res.status,body});
  return body;
}
function $(id){return document.getElementById(id)}
function renderJSON(id,data){ const el=$(id); if(el) el.textContent=JSON.stringify(data,null,2); }
function safe(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function card(title, body, foot=''){ return `<article class="workflow-panel"><h3>${safe(title)}</h3><p>${safe(body)}</p>${foot}</article>`; }
function sdFormValue(id, fallback=''){ return $(id)?.value?.trim?.() || fallback; }
function sdSlug(value='business'){ return String(value||'business').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80) || 'business'; }
function sdFormationWorkflowCards(rows=[]){
  if(!rows.length) return '<p>No LLC-to-0S business launch workflows are visible to this session yet.</p>';
  return rows.map(w=>`<article class="workflow-panel">
    <h3>${safe(w.businessName||w.id)}</h3>
    <p>${sdBadge(w.status||'pending')} ${sdBadge(w.jurisdiction||'US')} ${sdBadge(w.clientId||'client')}</p>
    <div class="workflow-row">
      <a class="button" href="/Free99/apps/sovereigndocs/business-formation/?workflow=${safe(encodeURIComponent(w.id||''))}">Open</a>
      <a class="button" href="/api/sovereigndocs/business-formation/workflows/${safe(encodeURIComponent(w.id||''))}/client-dashboard">Client status</a>
      ${w.dashboards?.workforce ? `<a class="button" href="${safe(w.dashboards.workforce)}">Workforce</a>` : ''}
      ${w.dashboards?.clientApp ? `<a class="button" href="${safe(w.dashboards.clientApp)}">Webpage</a>` : ''}
      <button class="button approve-llc-workflow" data-id="${safe(w.id)}">Approve prep</button>
    </div>
    <div class="workflow-row">
      <input class="input" data-receipt-ref="${safe(w.id)}" placeholder="Official receipt/reference">
      <input class="input" data-receipt-url="${safe(w.id)}" placeholder="Official source URL">
      <button class="button attach-llc-receipt" data-id="${safe(w.id)}">Attach receipt</button>
    </div>
    <div class="workflow-row">
      <input class="input" data-skynet-url="${safe(w.id)}" placeholder="SkyeNet live URL">
      <input class="input" data-skynet-receipt="${safe(w.id)}" placeholder="SkyeNet receipt id">
      <button class="button attach-skynet-receipt" data-id="${safe(w.id)}">Attach SkyeNet proof</button>
    </div>
  </article>`).join('');
}
async function initWorkspaceDashboard(){
  try{ const data=await api('/api/workspace/summary');
    $('dashboard-cards').innerHTML=Object.entries(data.counts||{}).map(([k,v])=>card(k.replace(/[A-Z]/g,m=>' '+m).replace(/^./,m=>m.toUpperCase()), String(v))).join('');
    $('dashboard-actions').innerHTML=(data.nextActions||[]).map(a=>`<a class="button" href="${safe(a.href)}">${safe(a.label)}</a>`).join(' ');
    const formations=$('dashboard-formation-list');
    if(formations) formations.innerHTML=sdFormationWorkflowCards(data.panels?.businessFormationWorkflows||[]);
    renderJSON('dashboard-raw',data);
  }catch(e){ $('dashboard-cards').innerHTML=card('Dashboard needs API mode',e.message,'<a class="button" href="/documents/">Browse documents</a>'); }
}
async function initPacketBuilder(){
  try{ const search=await api('/api/templates/search?limit=20&risk=low');
    $('packet-template-list').innerHTML=(search.items||[]).map(t=>`<label><input type="checkbox" value="${safe(t.id)}"> ${safe(t.title||t.id)} <span class="pill">${safe(t.risk_level||'risk')}</span></label>`).join('');
  }catch(e){ $('packet-template-list').innerHTML=`<p>${safe(e.message)}</p>`; }
  $('packet-form')?.addEventListener('submit',async ev=>{ ev.preventDefault();
    const templateIds=[...document.querySelectorAll('#packet-template-list input:checked')].map(i=>i.value);
    try{ const out=await api('/api/packets/assemble',{method:'POST',body:JSON.stringify({title:$('packet-title').value||'SovereignDocs Packet',templateIds,acceptBoundary:true,answersByTemplate:{}})}); renderJSON('packet-output',out); }
    catch(e){ renderJSON('packet-output',{ok:false,error:e.message,details:e.body}); }
  });
}
async function initReminders(){
  async function refresh(){ try{ const data=await api('/api/reminders'); $('reminder-list').innerHTML=(data.items||[]).map(r=>`<article class="workflow-panel"><h3>${safe(r.title)}</h3><p>Status: ${safe(r.status)} · Due: ${safe(r.dueDate)}</p><button data-id="${safe(r.id)}" class="button complete-reminder">Mark complete</button></article>`).join('')||'<p>No reminders yet.</p>'; }catch(e){ $('reminder-list').innerHTML=`<p>${safe(e.message)}</p>`; }}
  $('reminder-form')?.addEventListener('submit',async ev=>{ ev.preventDefault(); try{ await api('/api/reminders',{method:'POST',body:JSON.stringify({title:$('reminder-title').value,dueDate:$('reminder-date').value,sourceType:$('reminder-source').value||'manual',jurisdiction:$('reminder-jurisdiction').value||null,note:$('reminder-note').value||''})}); await refresh(); }catch(e){ renderJSON('reminder-output',{ok:false,error:e.message,details:e.body}); }});
  document.addEventListener('click',async ev=>{ if(ev.target?.classList?.contains('complete-reminder')){ try{ await api(`/api/reminders/${ev.target.dataset.id}/transition`,{method:'POST',body:JSON.stringify({status:'completed',note:'Completed from v16 reminder console'})}); await refresh(); }catch(e){ renderJSON('reminder-output',{ok:false,error:e.message}); } }});
  await refresh();
}
async function initPartnerWorkbench(){
  async function refresh(){ try{ const data=await api('/api/legal-review/submissions'); const rows=data.items||data.submissions||[]; $('partner-review-list').innerHTML=rows.map(r=>`<article class="workflow-panel"><h3>${safe(r.title||r.templateTitle||r.id)}</h3><p>${safe(r.status)} · ${safe(r.riskLevel||'risk')}</p><div class="workflow-row"><input placeholder="Partner ID" data-pid="${safe(r.id)}"><button class="button route-review" data-id="${safe(r.id)}">Route</button><button class="button return-review" data-id="${safe(r.id)}">Mark returned</button></div></article>`).join('')||'<p>No submissions visible to this session.</p>'; }catch(e){ $('partner-review-list').innerHTML=`<p>${safe(e.message)}</p>`; }}
  document.addEventListener('click',async ev=>{ if(ev.target?.classList?.contains('route-review')){ const id=ev.target.dataset.id; const partnerId=document.querySelector(`[data-pid="${CSS.escape(id)}"]`)?.value || 'operator-configured-legal-network'; try{ await api(`/api/legal-review/submissions/${id}/route`,{method:'POST',body:JSON.stringify({partnerId,routingNote:'Routed from v16 partner workbench'})}); await refresh(); }catch(e){ renderJSON('partner-output',{ok:false,error:e.message,details:e.body}); }} if(ev.target?.classList?.contains('return-review')){ const id=ev.target.dataset.id; try{ await api(`/api/legal-review/submissions/${id}/partner-update`,{method:'POST',body:JSON.stringify({status:'partner_review_returned',note:'Returned from v16 workbench'})}); await refresh(); }catch(e){ renderJSON('partner-output',{ok:false,error:e.message,details:e.body}); }} });
  await refresh();
}
async function initTemplateOps(){
  async function refresh(){ try{ const data=await api('/api/template-ops/summary'); $('template-ops-summary').innerHTML=card('Patch requests',data.patchRequests,`Overrides: ${data.overrides}`)+card('Source records',data.records,`Version: ${data.version}`); $('template-patch-list').innerHTML=(data.recentPatches||[]).map(p=>`<article class="workflow-panel"><h3>${safe(p.templateId)}</h3><p>${safe(p.status)} · ${safe(p.reason||'No reason')}</p><button class="button approve-patch" data-id="${safe(p.id)}">Approve</button> <button class="button apply-patch" data-id="${safe(p.id)}">Apply override</button></article>`).join('')||'<p>No patch requests yet.</p>'; }catch(e){ $('template-ops-summary').innerHTML=card('Template ops unavailable',e.message); }}
  $('template-patch-form')?.addEventListener('submit',async ev=>{ ev.preventDefault(); let patch={}; try{patch=JSON.parse($('patch-json').value||'{}')}catch{renderJSON('template-ops-output',{ok:false,error:'Patch JSON is invalid'});return;} try{ const out=await api('/api/templates/patch-requests',{method:'POST',body:JSON.stringify({templateId:$('patch-template-id').value,reason:$('patch-reason').value,patch})}); renderJSON('template-ops-output',out); await refresh(); }catch(e){ renderJSON('template-ops-output',{ok:false,error:e.message,details:e.body}); }});
  document.addEventListener('click',async ev=>{ if(ev.target?.classList?.contains('approve-patch')){ try{ await api(`/api/templates/patch-requests/${ev.target.dataset.id}/transition`,{method:'POST',body:JSON.stringify({status:'approved',note:'Approved from v16 template ops'})}); await refresh(); }catch(e){ renderJSON('template-ops-output',{ok:false,error:e.message}); }} if(ev.target?.classList?.contains('apply-patch')){ try{ await api(`/api/templates/patch-requests/${ev.target.dataset.id}/apply`,{method:'POST',body:JSON.stringify({note:'Applied from v16 template ops'})}); await refresh(); }catch(e){ renderJSON('template-ops-output',{ok:false,error:e.message}); }} });
  await refresh();
}
async function initSkyeDocxMax(){
  const canonicalEditor = '/Marketing-Made-Easy/SkyeDocxMax/editor?source=sovereigndocs&ws_id=sovereigndocs&returnTo=/Free99/apps/sovereigndocs/vault/';
  let lastLaunch=canonicalEditor;
  try{
    const config=await api('/api/editor/skye-docx-max/config');
    renderJSON('skye-config',config);
    if(config.canonicalEditor) setLaunch(`${config.canonicalEditor}?source=sovereigndocs&ws_id=sovereigndocs&returnTo=/Free99/apps/sovereigndocs/vault/`);
  }catch(e){ renderJSON('skye-config',{ok:false,error:e.message}); }
  function setLaunch(url){
    if(!url) return;
    lastLaunch=new URL(url, location.origin).href;
    const a=$('skye-launch-link'); if(a) a.href=lastLaunch;
    const frame=$('skye-frame');
    const btn=$('skye-refresh-frame');
    if(btn) btn.onclick=()=>{ if(frame) frame.src=lastLaunch; };
  }
  setLaunch(lastLaunch);
  $('skye-handoff-form')?.addEventListener('submit',async ev=>{ ev.preventDefault(); try{
    const out=await api('/api/editor/skye-docx-max/session',{method:'POST',body:JSON.stringify({templateId:$('skye-template-id').value||null,title:$('skye-title').value||'SovereignDocs Document',markdown:$('skye-markdown').value,metadata:{source:'v16-integrated-page'}})});
    renderJSON('skye-output',out);
    setLaunch(out.launchUrl || out.handoff?.launchUrl);
    if(out.launchUrl || out.handoff?.launchUrl) window.open(out.launchUrl || out.handoff.launchUrl, '_blank', 'noopener');
  }catch(e){ renderJSON('skye-output',{ok:false,error:e.message,details:e.body}); }});
}

async function initCaseCommandCenter(){
  async function refresh(){
    try{
      const data=await api('/api/cases');
      $('case-list').innerHTML=(data.items||[]).map(c=>`<article class="workflow-panel"><h3>${safe(c.title||c.id)}</h3><p>${safe(c.status)} · ${safe(c.templateCount)} templates · ${safe(c.documentCount)} docs</p><p>Risk: ${safe(JSON.stringify(c.riskSummary||{}))}</p><button class="button advance-case" data-id="${safe(c.id)}" data-status="opened_in_skye_docx_max">Mark opened</button> <button class="button advance-case" data-id="${safe(c.id)}" data-status="completed">Complete</button></article>`).join('')||'<p>No cases yet.</p>';
    }catch(e){ $('case-list').innerHTML=`<p>${safe(e.message)}</p>`; }
  }
  $('case-form')?.addEventListener('submit',async ev=>{ ev.preventDefault();
    const templateIds=($('case-template-ids').value||'').split(/[\s,]+/).map(x=>x.trim()).filter(Boolean);
    let answers={}; try{ answers=JSON.parse($('case-answers').value||'{}'); }catch{ renderJSON('case-output',{ok:false,error:'Answers JSON is invalid'}); return; }
    try{
      const out=await api('/api/cases/start',{method:'POST',body:JSON.stringify({
        title:$('case-title').value||'SovereignDocs End-to-End Case',
        caseType:$('case-type').value||'document_packet_to_skye_docx_max',
        templateIds,
        answers,
        acceptBoundary:true,
        acceptHighRiskGate:true,
        createPacket:templateIds.length>1,
        submitForPartnerReview:$('case-review').checked,
        acceptPartnerReviewTerms:true,
        acceptNoGuarantee:true,
        acceptNoSovereignDocsLiabilityForOutcome:true,
        acceptUserFactsResponsibility:true
      })});
      renderJSON('case-output',out);
      const a=$('case-launch-link'); if(a && out.launchUrl){ a.href=out.launchUrl; a.textContent='Open this case in SkyeDocx Max'; }
      await refresh();
    }catch(e){ renderJSON('case-output',{ok:false,error:e.message,details:e.body}); }
  });
  document.addEventListener('click',async ev=>{ if(ev.target?.classList?.contains('advance-case')){ try{ await api(`/api/cases/${ev.target.dataset.id}/advance`,{method:'POST',body:JSON.stringify({status:ev.target.dataset.status,note:'Advanced from v16 case command center'})}); await refresh(); }catch(e){ renderJSON('case-output',{ok:false,error:e.message,details:e.body}); } } });
  await refresh();
}

async function initIntakeWizard(){
  async function refresh(){
    try{
      const data=await api('/api/case-intakes');
      $('intake-list').innerHTML=(data.items||[]).map(i=>`<article class="workflow-panel"><h3>${safe(i.title)}</h3><p>${safe(i.status)} · ${safe(i.jurisdiction||'no jurisdiction')} · ${safe(i.riskFlags?.join(', ')||'no flags')}</p><button class="button convert-intake" data-id="${safe(i.id)}">Convert to case</button></article>`).join('')||'<p>No intakes yet.</p>';
    }catch(e){ $('intake-list').innerHTML=`<p>${safe(e.message)}</p>`; }
  }
  try{
    const bp=await api('/api/intake/blueprints');
    $('intake-blueprints').innerHTML=(bp.blueprints||[]).map(b=>card(b.title, `${b.category} · ${b.defaultJurisdiction}`, `<button class="button use-blueprint" data-id="${safe(b.id)}" data-title="${safe(b.title)}" data-cat="${safe(b.category)}" data-j="${safe(b.defaultJurisdiction)}">Use</button>`)).join('');
  }catch(e){ $('intake-blueprints').innerHTML=card('Blueprints unavailable',e.message); }
  document.addEventListener('click',async ev=>{
    if(ev.target?.classList?.contains('use-blueprint')){
      $('intake-title').value=ev.target.dataset.title||''; $('intake-type').value=ev.target.dataset.id||''; $('intake-category').value=ev.target.dataset.cat||''; $('intake-jurisdiction').value=ev.target.dataset.j||'US-AZ';
    }
    if(ev.target?.classList?.contains('convert-intake')){
      try{ const out=await api(`/api/case-intakes/${ev.target.dataset.id}/convert-to-case`,{method:'POST',body:JSON.stringify({acceptBoundary:true})}); renderJSON('intake-output',out); await refresh(); }
      catch(e){ renderJSON('intake-output',{ok:false,error:e.message,details:e.body}); }
    }
  });
  $('intake-form')?.addEventListener('submit',async ev=>{ ev.preventDefault(); let facts={}; try{ facts=JSON.parse($('intake-facts').value||'{}'); }catch{ renderJSON('intake-output',{ok:false,error:'Facts JSON is invalid'}); return; }
    try{ const out=await api('/api/intake/start',{method:'POST',body:JSON.stringify({title:$('intake-title').value,intakeType:$('intake-type').value,jurisdiction:$('intake-jurisdiction').value,category:$('intake-category').value,facts,acceptBoundary:$('intake-boundary').checked,readyForCase:true})}); renderJSON('intake-output',out); await refresh(); }
    catch(e){ renderJSON('intake-output',{ok:false,error:e.message,details:e.body}); }
  });
  await refresh();
}
async function initCaseTimeline(){
  $('timeline-form')?.addEventListener('submit',async ev=>{ ev.preventDefault(); const id=$('timeline-case-id').value.trim(); if(!id) return; try{ const out=await api(`/api/cases/${encodeURIComponent(id)}/timeline`); $('timeline-list').innerHTML=(out.items||[]).map(t=>`<article class="workflow-panel"><h3>${safe(t.label)}</h3><p>${safe(t.type)} · ${safe(t.status)} · ${safe(t.at)}</p><p>${safe(t.title||t.note||'')}</p></article>`).join('')||'<p>No timeline events.</p>'; renderJSON('timeline-output',out); }catch(e){ renderJSON('timeline-output',{ok:false,error:e.message,details:e.body}); } });
}
async function initClientStatus(){
  $('client-status-form')?.addEventListener('submit',async ev=>{ ev.preventDefault(); const id=$('client-status-case-id').value.trim(); if(!id) return; try{ const out=await api(`/api/cases/${encodeURIComponent(id)}/client-status`); $('client-status-card').innerHTML=card(out.case.title, `${out.case.status} · ${out.progress.percent}%`, `<p>${safe(out.nextClientAction)}</p>`)+(out.steps||[]).slice(-6).map(s=>card(s.label, `${s.status} · ${s.at}`, s.title||'')).join(''); renderJSON('client-status-output',out); }catch(e){ renderJSON('client-status-output',{ok:false,error:e.message,details:e.body}); } });
}
async function initReviewerNotes(){
  async function refresh(id){ if(!id) return; try{ const [notes, artifacts]=await Promise.all([api(`/api/cases/${encodeURIComponent(id)}/notes`), api(`/api/cases/${encodeURIComponent(id)}/artifacts`)]); $('case-note-list').innerHTML=[...(notes.items||[]).map(n=>card(`${n.visibility} · ${n.noteType}`, n.body, n.createdAt)), ...(artifacts.items||[]).map(a=>card(a.title, `${a.artifactType} · ${a.filename||''}`, a.createdAt))].join('')||'<p>No notes or artifacts yet.</p>'; }catch(e){ $('case-note-list').innerHTML=`<p>${safe(e.message)}</p>`; } }
  $('case-note-form')?.addEventListener('submit',async ev=>{ ev.preventDefault(); const id=$('note-case-id').value.trim(); try{ const out=await api(`/api/cases/${encodeURIComponent(id)}/notes`,{method:'POST',body:JSON.stringify({visibility:$('note-visibility').value,noteType:$('note-type').value,body:$('note-body').value})}); renderJSON('case-note-output',out); await refresh(id); }catch(e){ renderJSON('case-note-output',{ok:false,error:e.message,details:e.body}); } });
  $('artifact-form')?.addEventListener('submit',async ev=>{ ev.preventDefault(); const id=$('note-case-id').value.trim(); try{ const out=await api(`/api/cases/${encodeURIComponent(id)}/artifacts`,{method:'POST',body:JSON.stringify({title:$('artifact-title').value,filename:$('artifact-filename').value,artifactType:$('artifact-type').value})}); renderJSON('case-note-output',out); await refresh(id); }catch(e){ renderJSON('case-note-output',{ok:false,error:e.message,details:e.body}); } });
}
async function initCaseExport(){
  $('case-export-form')?.addEventListener('submit',async ev=>{ ev.preventDefault(); const id=$('case-export-id').value.trim(); if(!id) return; try{ const out=await api(`/api/cases/${encodeURIComponent(id)}/export-bundle`); renderJSON('case-export-output',out); }catch(e){ renderJSON('case-export-output',{ok:false,error:e.message,details:e.body}); } });
  $('partner-packet-button')?.addEventListener('click',async()=>{ const id=$('case-export-id').value.trim(); if(!id) return; try{ const out=await api(`/api/cases/${encodeURIComponent(id)}/partner-packet`); renderJSON('case-export-output',out); }catch(e){ renderJSON('case-export-output',{ok:false,error:e.message,details:e.body}); } });
}
async function initWorkQueues(){
  async function refresh(){ try{ const out=await api('/api/work-queues'); const q=out.queues||{}; $('work-queues-list').innerHTML=Object.entries(q).map(([name,queue])=>card(name.replace(/[A-Z]/g,m=>' '+m).replace(/^./,m=>m.toUpperCase()), `${queue.count} items`, (queue.items||[]).slice(0,3).map(i=>`<p>${safe(i.title||i.id||i.status)}</p>`).join(''))).join(''); renderJSON('work-queues-output',out); }catch(e){ renderJSON('work-queues-output',{ok:false,error:e.message,details:e.body}); } }
  $('work-queues-refresh')?.addEventListener('click',refresh); await refresh();
}

async function initLlcTo0sWorkflow(){
  const stateSelect=$('llc-state');
  async function refresh(){
    try{
      const out=await api('/api/business-formation/workflows');
      const rows=out.items||[];
      if($('llc-formation-list')) $('llc-formation-list').innerHTML=sdFormationWorkflowCards(rows);
      if($('formation-workflow-list')) $('formation-workflow-list').innerHTML=sdFormationWorkflowCards(rows);
      renderJSON('llc-formation-output',out);
      renderJSON('formation-output',out);
    }catch(e){
      if($('llc-formation-list')) $('llc-formation-list').innerHTML=`<p>${safe(e.message)}</p>`;
      renderJSON('llc-formation-output',{ok:false,error:e.message,details:e.body});
      renderJSON('formation-output',{ok:false,error:e.message,details:e.body});
    }
  }
  if(stateSelect){
    try{
      const out=await api('/api/business-formation/states');
      stateSelect.innerHTML=(out.states||[]).map(s=>`<option value="${safe(s.code)}"${s.code==='AZ'?' selected':''}>${safe(s.name)} (${safe(s.code)})</option>`).join('');
    }catch(e){ stateSelect.innerHTML='<option value="AZ">Arizona (AZ)</option>'; }
  }
  $('llc-0s-form')?.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const businessName=sdFormValue('llc-business-name','New 0S Business LLC');
    const clientId=sdFormValue('llc-client-id',sdSlug(businessName));
    const payload={
      businessName,
      clientId,
      ownerName:sdFormValue('llc-owner-name','Owner'),
      ownerEmail:sdFormValue('llc-owner-email',`${clientId}@metraiyux.local`),
      state:sdFormValue('llc-state','AZ'),
      city:sdFormValue('llc-city','Phoenix'),
      industry:sdFormValue('llc-industry','local services'),
      services:sdFormValue('llc-services','Client services, sales, operations, customer support, and 0S-managed business workflows.'),
      memberCount:Number(sdFormValue('llc-member-count','1')) || 1,
      operatingModel:sdFormValue('llc-operating-model','owner-managed'),
      acceptBoundary:Boolean($('llc-boundary')?.checked)
    };
    if(!payload.acceptBoundary){
      renderJSON('llc-formation-output',{ok:false,error:'boundary_acknowledgment_required'});
      return;
    }
    try{
      const out=await api('/api/business-formation/start-to-0s',{method:'POST',body:JSON.stringify(payload)});
      renderJSON('llc-formation-output',out);
      await refresh();
    }catch(e){ renderJSON('llc-formation-output',{ok:false,error:e.message,details:e.body}); }
  });
  document.addEventListener('click',async ev=>{
    const approve=ev.target?.closest?.('.approve-llc-workflow');
    if(approve){
      try{
        const out=await api(`/api/business-formation/workflows/${encodeURIComponent(approve.dataset.id)}/approve`,{method:'POST',body:JSON.stringify({note:'Owner/admin approved LLC-to-0S prep from SovereignDocs UI.'})});
        renderJSON('llc-formation-output',out);
        renderJSON('formation-output',out);
        await refresh();
      }catch(e){ renderJSON('llc-formation-output',{ok:false,error:e.message,details:e.body}); }
    }
    const receipt=ev.target?.closest?.('.attach-llc-receipt');
    if(receipt){
      const id=receipt.dataset.id;
      const ref=document.querySelector(`[data-receipt-ref="${CSS.escape(id)}"]`)?.value || '';
      const url=document.querySelector(`[data-receipt-url="${CSS.escape(id)}"]`)?.value || '';
      try{
        const out=await api(`/api/business-formation/workflows/${encodeURIComponent(id)}/official-receipt`,{method:'POST',body:JSON.stringify({reference:ref,officialUrl:url,note:'Attached from SovereignDocs LLC-to-0S UI.'})});
        renderJSON('llc-formation-output',out);
        renderJSON('formation-output',out);
        await refresh();
      }catch(e){ renderJSON('llc-formation-output',{ok:false,error:e.message,details:e.body}); }
    }
    const skynet=ev.target?.closest?.('.attach-skynet-receipt');
    if(skynet){
      const id=skynet.dataset.id;
      const liveUrl=document.querySelector(`[data-skynet-url="${CSS.escape(id)}"]`)?.value || '';
      const receiptId=document.querySelector(`[data-skynet-receipt="${CSS.escape(id)}"]`)?.value || '';
      try{
        const out=await api(`/api/business-formation/workflows/${encodeURIComponent(id)}/skyenet-receipt`,{method:'POST',body:JSON.stringify({liveUrl,receiptId,note:'Attached from SovereignDocs LLC-to-0S UI.'})});
        renderJSON('llc-formation-output',out);
        renderJSON('formation-output',out);
        await refresh();
      }catch(e){ renderJSON('llc-formation-output',{ok:false,error:e.message,details:e.body}); }
    }
  });
  await refresh();
}

async function initFormationDashboard(){
  await initLlcTo0sWorkflow();
  if($('closure-dashboard')||$('dashboard-cards')) await initClosureDashboard();
}

window.SDWorkflow={initWorkspaceDashboard,initPacketBuilder,initReminders,initPartnerWorkbench,initTemplateOps,initSkyeDocxMax,initCaseCommandCenter,initIntakeWizard,initCaseTimeline,initClientStatus,initReviewerNotes,initCaseExport,initWorkQueues,initLlcTo0sWorkflow,initFormationDashboard};


// v17 premium workflow surface helpers: stateful filters, role-aware panels, action tables, and SkyeDocx Max launch affordances.
function sdBadge(value){ return `<span class="pill">${safe(value||'—')}</span>`; }
function sdTable(rows=[], columns=[]){ if(!rows.length) return '<div class="empty-state"><h3>No records yet</h3><p>Create an intake, case, packet, reminder, or partner review to populate this workspace.</p></div>'; return `<div class="table-wrap"><table class="workflow-table"><thead><tr>${columns.map(c=>`<th>${safe(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${columns.map(c=>`<td>${typeof c.render==='function'?c.render(row):safe(row[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
function sdFilterBox(id, placeholder='Filter visible records'){ return `<input id="${safe(id)}" class="input" placeholder="${safe(placeholder)}" />`; }
async function initPremiumCaseOverview(caseId){ const target=$('premium-case-overview'); if(!target || !caseId) return; try{ const out=await api(`/api/v17/cases/${encodeURIComponent(caseId)}/overview`); target.innerHTML=`<section class="workflow-panel premium"><h2>${safe(out.case.title)}</h2><p>${sdBadge(out.case.status)} ${sdBadge(out.case.caseType)} ${sdBadge(out.case.owner?.orgId||'no org')}</p><div class="workflow-row">${(out.actions||[]).map(a=>a.method==='POST'?`<button class="button premium-open-skye" data-case="${safe(out.case.id)}">${safe(a.label)}</button>`:`<a class="button" href="${safe(a.href)}">${safe(a.label)}</a>`).join('')}</div></section>`+sdTable(out.documents||[],[{label:'Document',render:r=>safe(r.title||r.templateTitle||r.templateId)},{label:'Status',render:r=>sdBadge(r.status)},{label:'Risk',render:r=>sdBadge(r.riskLevel)},{label:'Updated',key:'updatedAt'}]); }catch(e){ target.innerHTML=card('Case overview unavailable',e.message); } }
async function initPremiumWorkQueues(){ const wrap=$('work-queues-list'); if(!wrap) return; try{ const [out,manifest]=await Promise.all([api('/api/work-queues'),api('/api/routes/manifest',{app:'platform'})]); const q=out.queues||{}; wrap.innerHTML=`<div class="workflow-toolbar">${sdFilterBox('queue-filter','Filter queues')}</div>`+Object.entries(q).map(([name,queue])=>`<section class="workflow-panel"><div class="panel-head"><h3>${safe(name.replace(/[A-Z]/g,m=>' '+m).replace(/^./,m=>m.toUpperCase()))}</h3>${sdBadge(`${queue.count} items`)}</div>${sdTable((queue.items||[]).slice(0,10),[{label:'Title / ID',render:i=>safe(i.title||i.id||i.templateId||'record')},{label:'Status',render:i=>sdBadge(i.status||i.riskLevel||'open')},{label:'Updated',render:i=>safe(i.updatedAt||i.createdAt||'')}])}</section>`).join('')+`<section class="workflow-panel"><h3>Route modules</h3>${sdTable(manifest.modules||manifest.apps||[],[{label:'Module',render:m=>safe(m.name||m.id)},{label:'Area',render:m=>safe(m.area||m.status||m.routing_model)},{label:'Routes',render:m=>safe((m.routes||[]).length || m.base || '')}])}</section>`; $('queue-filter')?.addEventListener('input',ev=>{ const term=ev.target.value.toLowerCase(); document.querySelectorAll('#work-queues-list section.workflow-panel').forEach(panel=>{ panel.style.display=panel.textContent.toLowerCase().includes(term)?'':'none'; }); }); renderJSON('work-queues-output',out); }catch(e){ renderJSON('work-queues-output',{ok:false,error:e.message,details:e.body}); } }
document.addEventListener('click',async ev=>{ if(ev.target?.classList?.contains('premium-open-skye')){ const id=ev.target.dataset.case; try{ const out=await api(`/api/v17/cases/${encodeURIComponent(id)}/open-in-skye-docx-max`,{method:'POST',body:JSON.stringify({})}); window.open(out.launchUrl,'_blank','noopener'); }catch(e){ alert(e.message); } } });
window.SDWorkflow={...window.SDWorkflow,initPremiumCaseOverview,initPremiumWorkQueues};


// v18 closure UI: richer API-backed panels, role-aware dashboard, and case state controls.
async function initClosureDashboard(){
  const rootEl=$('closure-dashboard')||$('dashboard-cards');
  if(!rootEl) return;
  try{
    const out=await api('/api/v18/workspace/dashboard');
    const counts=out.counts||{};
    rootEl.innerHTML=`<div class="workflow-toolbar">${sdFilterBox('closure-filter','Filter cases, actions, reviews, reminders')}</div>`+
      `<section class="stats-grid">${Object.entries(counts).map(([k,v])=>card(k.replace(/[A-Z]/g,m=>' '+m).replace(/^./,m=>m.toUpperCase()),String(v))).join('')}</section>`+
      `<section class="workflow-panel"><h2>Action needed</h2>${sdTable(out.actionNeeded||[],[{label:'Type',key:'type'},{label:'Action',key:'label'},{label:'Open',render:r=>`<a class="button" href="${safe(r.href)}">Open</a>`}])}</section>`+
      `<section class="workflow-panel"><h2>LLC to 0S business launches</h2><div class="workflow-grid">${sdFormationWorkflowCards(out.panels?.businessFormationWorkflows||[])}</div></section>`+
      `<section class="workflow-panel"><h2>Cases</h2>${sdTable(out.panels?.cases||[],[{label:'Case',render:r=>safe(r.title||r.id)},{label:'Status',render:r=>sdBadge(r.status)},{label:'Docs',key:'documentCount'},{label:'Open',render:r=>`<button class="button v18-case-state" data-id="${safe(r.id)}">State</button>`}])}</section>`+
      `<section class="workflow-panel"><h2>Documents</h2>${sdTable(out.panels?.documents||[],[{label:'Document',render:r=>safe(r.title||r.templateId||r.id)},{label:'Status',render:r=>sdBadge(r.status)},{label:'Risk',render:r=>sdBadge(r.riskLevel)}])}</section>`;
    $('closure-filter')?.addEventListener('input',ev=>{ const term=ev.target.value.toLowerCase(); document.querySelectorAll('.workflow-panel').forEach(panel=>{ panel.style.display=panel.textContent.toLowerCase().includes(term)?'':'none'; }); });
    renderJSON('dashboard-raw',out);
  }catch(e){ rootEl.innerHTML=card('Closure dashboard unavailable',e.message); }
}
async function renderV18CaseState(id,targetId='case-output'){
  try{ const out=await api(`/api/v18/cases/${encodeURIComponent(id)}/state`); const el=$(targetId); if(el){ el.innerHTML=`<section class="workflow-panel premium"><h2>${safe(out.case.title)}</h2><p>${sdBadge(out.case.status)} ${sdBadge(out.scope?.orgId||'org')}</p><div class="workflow-row"><button class="button premium-open-skye-v18" data-case="${safe(id)}">Open in SkyeDocx Max</button><button class="button close-case-v18" data-case="${safe(id)}">Mark completed</button></div></section>`+sdTable(out.timeline?.items||out.timeline||[],[{label:'Type',render:r=>safe(r.type||r.label||'event')},{label:'Status',render:r=>sdBadge(r.status)},{label:'When',render:r=>safe(r.at||r.createdAt||'')}]); } else renderJSON(targetId,out); return out; }catch(e){ renderJSON(targetId,{ok:false,error:e.message,details:e.body}); }
}
document.addEventListener('click',async ev=>{
  if(ev.target?.classList?.contains('v18-case-state')) await renderV18CaseState(ev.target.dataset.id,'dashboard-raw');
  if(ev.target?.classList?.contains('premium-open-skye-v18')){ const id=ev.target.dataset.case; try{ const out=await api(`/api/v18/cases/${encodeURIComponent(id)}/open-in-skye-docx-max`,{method:'POST',body:JSON.stringify({})}); window.open(out.launchUrl,'_blank','noopener'); }catch(e){ alert(e.message); } }
  if(ev.target?.classList?.contains('close-case-v18')){ const id=ev.target.dataset.case; try{ const out=await api(`/api/v18/cases/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({status:'completed',note:'Completed from v18 closure UI'})}); renderJSON('dashboard-raw',out); }catch(e){ alert(e.message); } }
});
window.SDWorkflow={...window.SDWorkflow,initClosureDashboard,renderV18CaseState,initLlcTo0sWorkflow,initFormationDashboard};


// v19 premium surface alignment: product chrome, command deck, visual dock, pointer halo, and richer state treatment.
(function(){
  const premiumPages = new Set([
    '/customer-dashboard/','/case-command-center/','/closure-dashboard/','/intake-wizard/','/case-timeline/','/client-status/',
    '/reviewer-notes/','/case-export/','/work-queues/','/packet-builder/','/reminders/','/partner-workbench/',
    '/template-ops/','/skye-docx-max/','/formation-dashboard/','/order-status/'
  ]);
  function pageLooksOperational(){
    return !!document.querySelector('.workflow-shell,.page-shell,#closure-dashboard,#dashboard-cards,#work-queues-list,#partner-review-list');
  }
  function commandDeck(){
    const path = location.pathname;
    const isEditor = path.includes('skye-docx-max');
    const primaryText = isEditor ? 'SkyeDocxMax Bridge' : 'SovereignDocs Command Surface';
    const subText = isEditor ? 'Launch, inspect, and return governed document sessions.' : 'Cases, packets, review, reminders, and partner routing in one premium operating layer.';
    return `<section class="sd-command-deck" aria-label="SovereignDocs command deck">
      <article class="sd-command-card primary"><strong>${safe(primaryText)}</strong><span>${safe(subText)}</span><a class="mini-link" href="/closure-dashboard/">Open command center</a></article>
      <article class="sd-command-card"><strong>Editor Engine</strong><span>SkyeDocxMax handles serious document editing; SovereignDocs controls workflow and governance.</span></article>
      <article class="sd-command-card"><strong>Review Safe</strong><span>High-risk work stays gated, routed, and auditable. No legal-advice claims.</span></article>
      <article class="sd-command-card"><strong>Workspace Ready</strong><span>Role-aware panels, API-backed actions, tables, filters, and empty states.</span></article>
    </section>`;
  }
  function dock(){
    if(document.querySelector('.sd-premium-dock')) return;
    document.body.insertAdjacentHTML('beforeend',`<nav class="sd-premium-dock" aria-label="Workspace shortcuts"><a href="/customer-dashboard/">Dashboard</a><a href="/case-command-center/">Cases</a><a href="/packet-builder/">Packets</a><a href="/partner-workbench/">Review</a><a href="/skye-docx-max/">Editor</a></nav>`);
  }
  function upgradeMetricCards(){
    document.querySelectorAll('#dashboard-cards .workflow-panel, .stats-grid .workflow-panel').forEach(card=>{
      if(card.dataset.sd19) return;
      card.dataset.sd19='1';
      const h = card.querySelector('h3');
      const p = card.querySelector('p');
      if(h && p && /^\d+$/.test((p.textContent||'').trim())){
        const value = p.textContent.trim();
        p.innerHTML = `<span class="sd-kpi-number">${safe(value)}</span><span class="sd-kpi-label">${safe(h.textContent||'Metric')}</span><span class="sd-progress-rail"><span style="width:${Math.max(9, Math.min(100, Number(value)||12))}%"></span></span>`;
      }
    });
  }
  function addStatusPills(){
    document.querySelectorAll('.workflow-panel h2,.workflow-panel h3').forEach(h=>{
      if(h.dataset.sd19 || h.closest('.stats-grid')) return;
      h.dataset.sd19='1';
      const text=(h.textContent||'').toLowerCase();
      let label='Operational';
      if(text.includes('review')) label='Review lane';
      if(text.includes('case')) label='Case scoped';
      if(text.includes('packet')) label='Packet ready';
      if(text.includes('reminder')) label='Reminder engine';
      if(text.includes('skye')) label='Editor bridge';
      h.insertAdjacentHTML('afterend',`<span class="sd-status-pill">${safe(label)}</span>`);
    });
  }
  function installPointerHalo(){
    let last=0;
    window.addEventListener('pointermove',ev=>{
      const now=Date.now(); if(now-last<32) return; last=now;
      document.body.style.setProperty('--sd-mx', `${ev.clientX}px`);
      document.body.style.setProperty('--sd-my', `${ev.clientY}px`);
    },{passive:true});
  }
  function initPremiumVisualSystem(){
    if(!premiumPages.has(location.pathname) && !pageLooksOperational()) return;
    document.body.classList.add('sd-premium-surface');
    const main=document.querySelector('main.workflow-shell, main.page-shell, main');
    if(main && !main.querySelector('.sd-command-deck')){
      const hero=main.querySelector('.hero,.page-head');
      if(hero) hero.insertAdjacentHTML('afterend', commandDeck());
      else main.insertAdjacentHTML('afterbegin', commandDeck());
    }
    dock();
    installPointerHalo();
    const observer = new MutationObserver(()=>{ upgradeMetricCards(); addStatusPills(); });
    observer.observe(document.body,{childList:true,subtree:true});
    upgradeMetricCards(); addStatusPills();
  }
  window.SDWorkflow = {...(window.SDWorkflow||{}), initPremiumVisualSystem};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPremiumVisualSystem);
  else initPremiumVisualSystem();
})();

// BEGIN quantumskyes:adaptive-neon-scrollbar-shared-js
(function(){
  if(window.__mcpVisibleNeonScrollbars) return;
  window.__mcpVisibleNeonScrollbars = true;

  function clamp(value, min, max){
    return Math.min(max, Math.max(min, value));
  }
  function boot(){
    document.documentElement.setAttribute('data-mcp-neon-scrollbar', '');
    document.querySelectorAll('.mcp-neon-scroll-rail,.mcp-neon-scroll-corner').forEach(node => node.remove());

    const yRail = document.createElement('div');
    yRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-y';
    yRail.dataset.mcpScrollbarRail = 'y';
    yRail.setAttribute('aria-hidden', 'true');
    yRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const xRail = document.createElement('div');
    xRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-x';
    xRail.dataset.mcpScrollbarRail = 'x';
    xRail.setAttribute('aria-hidden', 'true');
    xRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const corner = document.createElement('div');
    corner.className = 'mcp-neon-scroll-corner';
    corner.setAttribute('aria-hidden', 'true');
    document.body.append(yRail, xRail, corner);

    const yThumb = yRail.querySelector('.mcp-neon-scroll-thumb');
    const xThumb = xRail.querySelector('.mcp-neon-scroll-thumb');
    let raf = 0;
    function update(){
      raf = 0;
      const doc = document.scrollingElement || document.documentElement;
      const yTrack = Math.max(1, yRail.clientHeight);
      const yMax = Math.max(1, doc.scrollHeight - window.innerHeight);
      const ySize = clamp((window.innerHeight / Math.max(doc.scrollHeight, window.innerHeight)) * yTrack, 78, yTrack);
      const yRatio = clamp(window.scrollY / yMax, 0, 1);
      yThumb.style.height = `${Math.floor(ySize)}px`;
      yRail.style.setProperty('--mcp-scroll-y', `${Math.round(yRatio * Math.max(0, yTrack - ySize))}px`);

      const xTrack = Math.max(1, xRail.clientWidth);
      const xSize = clamp(xTrack * .24, 84, Math.max(84, xTrack * .38));
      xThumb.style.width = `${Math.floor(xSize)}px`;
      xRail.style.setProperty('--mcp-scroll-x', `${Math.round(yRatio * Math.max(0, xTrack - xSize))}px`);
      xRail.dataset.scrollMode = 'page';
    }
    function schedule(){
      if(!raf) raf = requestAnimationFrame(update);
    }
    window.addEventListener('scroll', schedule, { passive:true });
    window.addEventListener('resize', schedule, { passive:true });
    update();
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once:true })
    : boot();
})();
// END quantumskyes:adaptive-neon-scrollbar-shared-js
})();
