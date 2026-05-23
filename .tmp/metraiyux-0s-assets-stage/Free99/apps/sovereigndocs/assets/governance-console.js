const SD_GOVERNANCE_ROOT = (() => {
  try {
    const scriptUrl = new URL(document.currentScript?.src || '/Free99/apps/sovereigndocs/assets/governance-console.js', location.href);
    return scriptUrl.pathname.replace(/assets\/[^/]+$/, '');
  } catch {
    return '/Free99/apps/sovereigndocs/';
  }
})();
function sdAppPath(value){
  const text = String(value || '');
  if(/^https?:\/\//i.test(text) || text.startsWith('//')) return text;
  if(text.startsWith('/api/')) return new URL(`/api/sovereigndocs${text.slice('/api'.length)}`, location.origin).href;
  const clean = text.replace(/^\/+/, '');
  if(clean.startsWith('Free99/apps/sovereigndocs/')) return `/${clean}`;
  return `${SD_GOVERNANCE_ROOT}${clean}`;
}
async function sdFetchJSON(url, fallback){ try{ const res = await fetch(sdAppPath(url), { cache:'no-store' }); if(!res.ok) throw new Error(`${res.status}`); return await res.json(); } catch(error){ return fallback; } }
function escapeHTML(value=''){ return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function number(value){ return new Intl.NumberFormat().format(value || 0); }
function sdLabel(value){ return String(value || '').replaceAll('-', ' ').replaceAll('_', ' ').replace(/\b\w/g, ch => ch.toUpperCase()); }
function sdOfficialMarkdown(workflow, answers){
  const rows = Object.entries(answers || {}).map(([key, value]) => `- ${sdLabel(key)}: ${String(value || '').trim() || '[not provided]'}`).join('\n');
  return `# ${workflow.title} Prep Packet\n\nStatus: prep packet ready; external official site still required.\n\n## Boundary\n\nSovereignDocs prepared this worksheet and checklist only. It has not submitted anything to an agency, court, tax authority, USPTO, or government system. Final action must happen on the linked official source or through a separately proven live integration.\n\n## Official Source\n\n${workflow.official_url || '[official source not configured]'}\n\n## Prep Facts\n\n${rows || '- No prep facts entered.'}\n\n## Checklist\n\n- Review every field for accuracy.\n- Confirm the official source is current before relying on it.\n- Use the official source link for the final submission or filing step.\n- Save proof of any external submission outside SovereignDocs.\n`;
}
function sdOfficialPacket(workflow, answers){
  const packet = {
    id: crypto.randomUUID?.() || `official_prep_${Date.now()}`,
    workflowId: workflow.id,
    title: workflow.title,
    category: workflow.category,
    riskLevel: workflow.risk_level,
    status: 'prep_packet_ready_external_official_site_required',
    completionModel: 'prep_packet_plus_external_official_site',
    externalSubmissionRequired: true,
    sovereignDocsSubmitted: false,
    officialUrl: workflow.official_url || null,
    answers,
    createdAt: new Date().toISOString()
  };
  packet.markdown = sdOfficialMarkdown(workflow, answers);
  return packet;
}
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
  document.getElementById('reviewPriorityRows').innerHTML = board.queueSample.slice(0,30).map(row => `<div class="vault-item"><div><strong>${escapeHTML(row.title)}</strong><br><span class="mini">${escapeHTML(row.id)} · ${escapeHTML(row.jurisdiction)} · ${escapeHTML(row.category)}</span></div><a class="button" href="${escapeHTML(sdAppPath(`builder/?template=${encodeURIComponent(row.id || '')}`))}">Inspect</a></div>`).join('');
  const btn = document.getElementById('saveReviewDecision');
  if(btn) btn.addEventListener('click', async ()=>{
    const body = { templateId:document.getElementById('decisionTemplateId').value.trim(), status:document.getElementById('decisionStatus').value, notes:document.getElementById('decisionNotes').value.trim(), reviewer:'local-operator' };
    const out = document.getElementById('decisionResult');
    if(!body.templateId){ out.textContent = 'Template ID is required.'; return; }
    try{
      const res = await fetch(sdAppPath('/api/review/decisions'), { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body) });
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
  const fieldMount = document.getElementById('officialPrepFields');
  function selectedWorkflow(){ return data.workflows.find(x=>x.id===select.value); }
  function render(){
    const w = selectedWorkflow();
    detail.innerHTML = w ? `<strong>${escapeHTML(w.title)}</strong><br>${escapeHTML(w.category)} · ${escapeHTML(w.risk_level)} risk<br><span class="mini">${escapeHTML(w.document_generation_policy || '')}</span><br><a href="${escapeHTML(w.official_url || '#')}" target="_blank" rel="noreferrer">Open external official site</a>` : 'Choose a workflow.';
    if(fieldMount) fieldMount.innerHTML = w ? (w.prep_fields || []).map(field => `<label class="field-row"><span>${escapeHTML(sdLabel(field))}</span><input class="input" data-official-studio-field="${escapeHTML(field)}" placeholder="${escapeHTML(sdLabel(field))}"></label>`).join('') : '';
  }
  select.addEventListener('change', render); render();
  const btn = document.getElementById('prepareOfficialPacket');
  if(btn) btn.addEventListener('click', async ()=>{
    const out = document.getElementById('officialPacketOutput');
    const workflow = selectedWorkflow();
    if(!workflow){ out.textContent = 'Choose a workflow first.'; return; }
    const answers = Object.fromEntries([...document.querySelectorAll('[data-official-studio-field]')].map(input => [input.dataset.officialStudioField, input.value || '']));
    const packet = sdOfficialPacket(workflow, answers);
    let apiReceipt = null;
    try{
      const res = await fetch(sdAppPath('/api/official-workflows/prepare'), { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ workflow, workflowId:workflow.id, answers, source:'official-workflow-studio' }) });
      apiReceipt = await res.json().catch(() => null);
    } catch(error){
      apiReceipt = { ok:false, saved:false, message:`0S API persistence unavailable in this browser context: ${error.message}` };
    }
    out.textContent = JSON.stringify({ ok:true, packet, apiReceipt, nextStep:'Open the external official site. SovereignDocs has not submitted this packet.' }, null, 2);
    out.classList.add('is-ready');
  });
}
initPublisherConsole(); initReviewStudio(); initOfficialStudio();
