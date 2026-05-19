async function sdFetchJSON(url, fallback){ try{ const res = await fetch(url, { cache:'no-store' }); if(!res.ok) throw new Error(`${res.status}`); return await res.json(); } catch(error){ return fallback; } }
function escapeHTML(value=''){ return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function number(value){ return new Intl.NumberFormat().format(value || 0); }
async function initPublisherConsole(){
  if(!document.getElementById('publisherCategoryRows')) return;
  const report = await sdFetchJSON('/data/publishability-report.json', null);
  if(!report) return;
  const set = (id, text) => { const el = document.getElementById(id); if(el) el.textContent = text; };
  set('lane-public-draft', `${number(report.byLane.public_draft)} records can publish only as draft automation with boundary acceptance.`);
  set('lane-public-gated-draft', `${number(report.byLane.public_gated_draft)} records require warning gates and draft badges.`);
  set('lane-admin-review-only', `${number(report.byLane.admin_review_only)} records remain review-only or prep-only.`);
  set('official-workflow-count', `${number(report.totals.officialWorkflows)} official-source prep workflows.`);
  document.getElementById('publisherCategoryRows').innerHTML = report.byCategory.map(row => `<tr><td><strong>${escapeHTML(row.categoryName)}</strong><br><span class="mini">${escapeHTML(row.categorySlug)}</span></td><td>${number(row.total)}</td><td>${number(row.low)}</td><td>${number(row.medium)}</td><td>${number(row.high)}</td></tr>`).join('');
}
async function initReviewStudio(){
  if(!document.getElementById('reviewPriorityRows')) return;
  const board = await sdFetchJSON('/data/review-priority-board.json', { queueSample:[] });
  document.getElementById('reviewPriorityRows').innerHTML = board.queueSample.slice(0,30).map(row => `<div class="vault-item"><div><strong>${escapeHTML(row.title)}</strong><br><span class="mini">${escapeHTML(row.id)} · ${escapeHTML(row.jurisdiction)} · ${escapeHTML(row.category)}</span></div><a class="button" href="/build/${escapeHTML(row.jurisdiction)}/${escapeHTML(row.category)}/${escapeHTML((row.id||'').split('-').slice(4).join('-'))}/">Inspect</a></div>`).join('');
  const btn = document.getElementById('saveReviewDecision');
  if(btn) btn.addEventListener('click', async ()=>{
    const body = { templateId:document.getElementById('decisionTemplateId').value.trim(), status:document.getElementById('decisionStatus').value, notes:document.getElementById('decisionNotes').value.trim(), reviewer:'local-operator' };
    const out = document.getElementById('decisionResult');
    if(!body.templateId){ out.textContent = 'Template ID is required.'; return; }
    try{
      const res = await fetch('/api/review/decisions', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body) });
      out.textContent = JSON.stringify(await res.json(), null, 2);
    }catch(error){ out.textContent = `API mode is required to save decisions: ${error.message}`; }
  });
}
async function initOfficialStudio(){
  if(!document.getElementById('officialWorkflowSelect')) return;
  const data = await sdFetchJSON('/official-source-library/official-workflows.json', { workflows:[] });
  const select = document.getElementById('officialWorkflowSelect');
  select.innerHTML = data.workflows.map(w => `<option value="${escapeHTML(w.id)}">${escapeHTML(w.title)}</option>`).join('');
  const detail = document.getElementById('officialWorkflowDetail');
  function render(){ const w = data.workflows.find(x=>x.id===select.value); detail.innerHTML = w ? `<strong>${escapeHTML(w.title)}</strong><br>${escapeHTML(w.category)} · ${escapeHTML(w.risk_level)} risk<br><span class="mini">${escapeHTML(w.document_generation_policy || '')}</span><br><a href="${escapeHTML(w.official_url || '#')}" target="_blank" rel="noreferrer">Open official source</a>` : 'Choose a workflow.'; }
  select.addEventListener('change', render); render();
  const btn = document.getElementById('prepareOfficialPacket');
  if(btn) btn.addEventListener('click', async ()=>{
    const out = document.getElementById('officialPacketOutput');
    try{
      const res = await fetch('/api/official-workflows/prepare', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ workflowId:select.value, answers:{ prepared_by:'Local Operator', workspace:'SovereignDocs' } }) });
      const data = await res.json(); out.textContent = data.markdown || JSON.stringify(data,null,2);
    } catch(error){ out.textContent = `API mode is required to generate prep packets: ${error.message}`; }
  });
}
initPublisherConsole(); initReviewStudio(); initOfficialStudio();
