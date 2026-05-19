const SD_STORAGE = {
  vault: 'sovereigndocs.vault.v8',
  audit: 'sovereigndocs.audit.v8'
};
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const slugLabel = value => String(value || '').replaceAll('-', ' ').replaceAll('_',' ').replace(/\b\w/g, m => m.toUpperCase());
const getJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
const setJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
function audit(type, detail={}){ const rows = getJSON(SD_STORAGE.audit, []); rows.unshift({ id: crypto.randomUUID?.() || String(Date.now()), type, detail, at: new Date().toISOString() }); setJSON(SD_STORAGE.audit, rows.slice(0, 1000)); }
async function fetchJSON(path){ const res = await fetch(path, { cache:'no-store' }); if(!res.ok) throw new Error(`Failed to load ${path}`); return res.json(); }
function mdToHtml(md){
  return String(md || '').split(/\n+/).map(line => {
    if(line.startsWith('### ')) return `<h3>${esc(line.slice(4))}</h3>`;
    if(line.startsWith('## ')) return `<h2>${esc(line.slice(3))}</h2>`;
    if(line.startsWith('# ')) return `<h1>${esc(line.slice(2))}</h1>`;
    if(line.startsWith('- ')) return `<p>• ${esc(line.slice(2))}</p>`;
    if(line.startsWith('>')) return `<blockquote>${esc(line.replace(/^>\s*/,''))}</blockquote>`;
    return line.trim() ? `<p>${esc(line)}</p>` : '';
  }).join('');
}
function download(filename, content, type='text/plain'){ const blob = new Blob([content], {type}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 500); }
let cache = {};
async function loadSource(){
  if(cache.manifest) return cache;
  const [manifest, categories, jurisdictions] = await Promise.all([
    fetchJSON('/template-library/manifest.json'), fetchJSON('/template-library/categories.json'), fetchJSON('/template-library/jurisdictions.json')
  ]);
  cache.manifest = manifest;
  cache.records = manifest.records || [];
  cache.categories = categories;
  cache.jurisdictions = jurisdictions;
  return cache;
}
function recordUrl(r){ return `/templates/${encodeURIComponent(r.jurisdiction_id)}/${encodeURIComponent(r.category_slug)}/${encodeURIComponent((r.base_id||'').split('/').pop())}/`; }
function buildUrl(r){ return `/build/${encodeURIComponent(r.jurisdiction_id)}/${encodeURIComponent(r.category_slug)}/${encodeURIComponent((r.base_id||'').split('/').pop())}/`; }
function riskBadge(risk){ return `<span class="chip risk-${esc(risk || 'low')}">${esc(risk || 'unknown')}</span>`; }
async function renderLibrary(){
  const mount = $('#libraryMount'); if(!mount) return;
  const {records, categories, jurisdictions} = await loadSource();
  let state = mount.dataset.state || 'all';
  let category = mount.dataset.category || 'all';
  let risk = mount.dataset.risk || 'all';
  const limit = Number(mount.dataset.limit || 360);
  const initial = { state, category, risk, q:'' };
  mount.innerHTML = `<div class="filters no-print"><input id="librarySearch" class="input" placeholder="Search ${records.length.toLocaleString()} records..."/><select id="stateFilter" class="select"><option value="all">All jurisdictions</option>${jurisdictions.map(j => `<option value="${esc(j.jurisdiction_id)}" ${initial.state===j.jurisdiction_id?'selected':''}>${esc(j.state_name)} (${esc(j.state_code)})</option>`).join('')}</select><select id="categoryFilter" class="select"><option value="all">All categories</option>${categories.map(c => `<option value="${esc(c.slug)}" ${initial.category===c.slug?'selected':''}>${esc(c.name)}</option>`).join('')}</select><select id="riskFilter" class="select"><option value="all">All risks</option>${['low','medium','high'].map(r => `<option value="${r}" ${initial.risk===r?'selected':''}>${slugLabel(r)}</option>`).join('')}</select></div><div class="notice" id="libraryCount"></div><div class="grid" id="libraryGrid"></div>`;
  const draw = () => {
    const q = ($('#librarySearch')?.value || '').toLowerCase().trim();
    const s = $('#stateFilter')?.value || state; const c = $('#categoryFilter')?.value || category; const rk = $('#riskFilter')?.value || risk;
    const rows = records.filter(r => (!q || `${r.title} ${r.category_name} ${r.state_name} ${r.base_id}`.toLowerCase().includes(q)) && (s==='all'||r.jurisdiction_id===s) && (c==='all'||r.category_slug===c) && (rk==='all'||r.risk_level===rk));
    $('#libraryCount').innerHTML = `<strong>${rows.length.toLocaleString()}</strong> matching records. Showing first ${Math.min(limit, rows.length).toLocaleString()} for browser performance. Use search/filter or API for the full set.`;
    $('#libraryGrid').innerHTML = rows.slice(0, limit).map(r => `<article class="document-card"><h3>${esc(r.title)}</h3><p>${esc(r.category_name)} · ${esc(r.state_name)}</p><div class="document-meta">${riskBadge(r.risk_level)}<span class="chip">${esc(r.jurisdiction_id)}</span><span class="chip">${esc(r.status)}</span></div><p class="mini">${esc(r.base_id)}</p><div class="actions"><a class="button gold" href="${buildUrl(r)}">Build</a><a class="button" href="${recordUrl(r)}">Details</a></div></article>`).join('') || `<div class="empty"><h2>No matches.</h2><p>Try a broader query or filter.</p></div>`;
  };
  ['input','change'].forEach(evt => { $('#librarySearch')?.addEventListener(evt, draw); $('#stateFilter')?.addEventListener(evt, draw); $('#categoryFilter')?.addEventListener(evt, draw); $('#riskFilter')?.addEventListener(evt, draw); });
  draw();
}
async function loadTemplateBundle(templateId){
  const {records} = await loadSource();
  const item = records.find(t => t.id === templateId) || records[0];
  if(!item) throw new Error('No template records found.');
  const raw = await fetchJSON('/' + item.path.replace(/^\/+/, ''));
  const questions = (raw.questionnaire || []).map(q => ({ id: q.id || q.key, label: q.label || q.key, type: q.type === 'system' ? 'hidden' : (q.type || 'text'), required: !!q.required, options: q.options || [], system: q.type === 'system' }));
  return {
    item,
    raw,
    meta: { id: raw.id || item.id, title: raw.title || item.title, version: raw.version || 'unknown', riskLevel: raw.risk_level || item.risk_level, status: raw.status || item.status, category: raw.category, jurisdiction: raw.jurisdiction, notLegalAdvice: raw.not_legal_advice !== false, review: raw.review || {}, rights: raw.rights || {} },
    questions,
    document: raw.render_markdown || (raw.sections || []).map(s => `## ${s.heading}\n${s.body}`).join('\n\n'),
    disclaimer: 'This SovereignDocs record is self-help document automation only. It is not legal advice, not attorney-reviewed, and does not create an attorney-client relationship. High-risk or state-specific documents should be reviewed by qualified professionals before use.'
  };
}

function prepWorksheet(bundle, answers){
  const rows = Object.entries(answers || {}).map(([key,value]) => `- ${key}: ${String(value || '').trim() || '[not provided]'}`).join('\n');
  return `# Prep Worksheet: ${bundle.item.title}\n\nSovereignDocs high-risk prep worksheet.\n\nThis is not a completed legal document, not state-compliant, not court-ready, not attorney-reviewed, and not an official filing. Use it as an intake packet for review or official-source routing.\n\n## Template Reference\n\n- Template ID: ${bundle.item.id}\n- Risk level: ${bundle.meta.riskLevel}\n- Source path: ${bundle.item.path}\n- Export class: prep_worksheet_static_mode\n\n## User-provided intake values\n\n${rows || '- No user answers supplied.'}\n\n## Next-step checklist\n\n- Confirm current official, state, local, court, tax, or agency requirements.\n- Seek licensed attorney or qualified professional review when needed.\n- Do not submit this worksheet as an official filing.\n- Do not treat this worksheet as legal advice.\n`;
}
function assemble(template, answers){
  let out = String(template || '');
  out = out.replace(/{{#if\s+([\w-]+)}}([\s\S]*?){{\/if}}/g, (_, key, inner) => String(answers[key] || '').trim() ? inner : '');
  out = out.replace(/{{\s*([\w-]+)\s*}}/g, (_, key) => (answers[key] ?? '').toString().trim() || `[${slugLabel(key)}]`);
  return out;
}
async function renderBuilder(){
  const mount = $('#builderMount'); if(!mount) return;
  try{
    const {records} = await loadSource();
    const params = new URLSearchParams(location.search);
    const templateId = mount.dataset.templateId || params.get('template') || records[0]?.id;
    const bundle = await loadTemplateBundle(templateId);
    const isHigh = bundle.meta.riskLevel === 'high';
    const picker = `<select id="templatePicker" class="select"><option value="${esc(bundle.item.id)}">${esc(bundle.item.title)} — ${esc(bundle.item.state_name)}</option>${records.slice(0, 600).filter(r=>r.id!==bundle.item.id).map(r => `<option value="${esc(r.id)}">${esc(r.title)} — ${esc(r.state_name)}</option>`).join('')}</select><small>Picker shows first 600 records for performance. Search from /documents for all ${records.length.toLocaleString()}.</small>`;
    const fields = bundle.questions.map(q => {
      const value = q.id === 'state_full_name' ? (bundle.item.state_name || '') : q.id === 'state_code' ? (bundle.item.state_code || '') : q.id === 'document_title' ? (bundle.item.title || '') : '';
      if(q.system || q.type === 'hidden') return `<input type="hidden" data-qid="${esc(q.id)}" data-required="${q.required?'true':'false'}" value="${esc(value)}"/>`;
      if(q.type === 'textarea') return `<div class="field-row"><label for="q_${esc(q.id)}">${esc(q.label)} ${q.required?'<span class="mini">required</span>':''}</label><textarea id="q_${esc(q.id)}" data-qid="${esc(q.id)}" data-required="${q.required?'true':'false'}" class="textarea"></textarea></div>`;
      if(q.type === 'select') return `<div class="field-row"><label for="q_${esc(q.id)}">${esc(q.label)} ${q.required?'<span class="mini">required</span>':''}</label><select id="q_${esc(q.id)}" data-qid="${esc(q.id)}" data-required="${q.required?'true':'false'}" class="select"><option value="">Select...</option>${q.options.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select></div>`;
      return `<div class="field-row"><label for="q_${esc(q.id)}">${esc(q.label)} ${q.required?'<span class="mini">required</span>':''}</label><input id="q_${esc(q.id)}" data-qid="${esc(q.id)}" data-required="${q.required?'true':'false'}" class="input" type="${q.type === 'date' ? 'date' : q.type === 'number' || q.type === 'currency' ? 'number' : 'text'}" value="${esc(value)}"/></div>`;
    }).join('');
    mount.innerHTML = `<div class="builder-form"><aside class="builder-fields"><div class="question"><label>Template</label>${picker}</div><div class="notice"><strong>Boundary:</strong> ${esc(bundle.disclaimer)}</div><div class="statusbar"><span class="chip" id="completionChip">0% complete</span><span class="chip" id="missingChip">Required missing</span>${riskBadge(bundle.meta.riskLevel)}<span class="chip">${esc(bundle.item.jurisdiction_id)}</span></div>${isHigh ? '<div class="notice danger"><strong>High-risk gate:</strong> This record is in the review queue. Public use should be restricted until review, or treated as a guarded prep worksheet only.</div>' : ''}<div class="field-grid" style="margin-top:12px">${fields}</div><label class="field-row"><span>Typed signature / acknowledgment</span><input id="signatureField" class="input" placeholder="Optional typed name for local signature record"/></label><label class="question"><input type="checkbox" id="boundaryCheck"/> I accept the self-help / not-legal-advice boundary.</label>${isHigh ? '<label class="question"><input type="checkbox" id="reviewGateCheck"/> I understand this is high risk, not attorney-reviewed, not state-compliant, and blocked from completed public-document export.</label><label class="question"><input type="checkbox" id="prepWorksheetCheck"/> Export only as a prep worksheet / intake packet, not a completed document.</label>' : ''}<div class="download-row"><button class="button gold" id="saveVault">Save to Vault</button><button class="button" id="downloadMd">Export Markdown</button><button class="button" id="downloadDoc">Export Word-Compatible</button><button class="button" id="downloadHtml">Export HTML</button><button class="button" id="downloadPackage">Export Package JSON</button><button class="button" id="copyOutput">Copy</button><button class="button" id="printPdf">Print / Save PDF</button></div></aside><section><div class="split-tabs"><button class="tab active" data-view="preview">Preview</button><button class="tab" data-view="markdown">Markdown</button><button class="tab" data-view="package">Package</button></div><div id="builderOutput" class="preview builder-preview"></div><textarea id="markdownOutput" class="textarea editor-area hidden"></textarea><textarea id="packageOutput" class="textarea editor-area hidden"></textarea></section></div>`;
    const output = $('#builderOutput', mount); const markdownOut = $('#markdownOutput', mount); const packageOut = $('#packageOutput', mount);
    const collect = () => Object.fromEntries($$('[data-qid]', mount).map(el => [el.dataset.qid, el.value]));
    const makePackage = () => ({ platform:'SovereignDocs', packageVersion:'8.0.0', exportedAt:new Date().toISOString(), sourceTruth:'template-library/manifest.json', template:{ id:bundle.item.id, title:bundle.item.title, path:bundle.item.path, version:bundle.meta.version, riskLevel:bundle.meta.riskLevel, status:bundle.meta.status, jurisdiction:bundle.meta.jurisdiction, category:bundle.meta.category }, gates:{ boundaryAccepted:!!$('#boundaryCheck', mount)?.checked, highRiskAcknowledged:!isHigh || !!$('#reviewGateCheck', mount)?.checked, prepWorksheetOnly:!isHigh || !!$('#prepWorksheetCheck', mount)?.checked, exportClass:isHigh ? 'prep_worksheet_static_mode' : 'public_draft_static_mode' }, signature:$('#signatureField', mount)?.value || '', answers:collect(), contentMarkdown:markdownOut.value });
    const update = () => { let md = isHigh ? prepWorksheet(bundle, collect()) : assemble(bundle.document, collect()); const sig = $('#signatureField', mount)?.value?.trim(); if(sig) md += `\n\n## Local Signature Record\n\nTyped signature / acknowledgment: ${sig}\n\nSignature timestamp: ${new Date().toISOString()}\n`; markdownOut.value = md; output.innerHTML = mdToHtml(md); const required = $$('[data-qid][data-required="true"]', mount); const done = required.filter(el => String(el.value || '').trim()).length; const pct = required.length ? Math.round((done / required.length) * 100) : 100; $('#completionChip', mount).textContent = `${pct}% complete`; $('#missingChip', mount).textContent = `${Math.max(required.length - done, 0)} required missing`; packageOut.value = JSON.stringify(makePackage(), null, 2); };
    $$('[data-qid]', mount).forEach(el => el.addEventListener('input', update)); $('#signatureField', mount)?.addEventListener('input', update); $('#boundaryCheck', mount)?.addEventListener('change', update); $('#reviewGateCheck', mount)?.addEventListener('change', update); $('#prepWorksheetCheck', mount)?.addEventListener('change', update); update();
    $('#templatePicker', mount).addEventListener('change', e => { location.href = `/builder/?template=${encodeURIComponent(e.target.value)}`; });
    $$('.tab', mount).forEach(tab => tab.addEventListener('click', () => { $$('.tab', mount).forEach(x=>x.classList.remove('active')); tab.classList.add('active'); const view=tab.dataset.view; markdownOut.classList.toggle('hidden', view !== 'markdown'); packageOut.classList.toggle('hidden', view !== 'package'); output.classList.toggle('hidden', view !== 'preview'); }));
    const guard = () => { if(!$('#boundaryCheck', mount).checked){ alert('Accept the self-help / not legal advice boundary before export or save.'); return false; } if(isHigh && !$('#reviewGateCheck', mount).checked){ alert('This high-risk record requires the high-risk review-gate acknowledgment.'); return false; } if(isHigh && !$('#prepWorksheetCheck', mount).checked){ alert('High-risk static exports are prep worksheet only. Check the prep worksheet box to continue.'); return false; } return true; };
    const htmlDoc = () => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(bundle.item.title)}</title><style>body{font-family:Arial,sans-serif;line-height:1.6;max-width:820px;margin:40px auto;color:#141414}h1,h2,h3{line-height:1.2}blockquote{border-left:4px solid #9b7a32;background:#fff7df;padding:10px 14px}</style></head><body>${mdToHtml(markdownOut.value)}<hr><p><strong>Boundary:</strong> Generated by SovereignDocs self-help document automation. Not legal advice. No attorney-client relationship.</p></body></html>`;
    $('#saveVault', mount).addEventListener('click', () => { if(!guard()) return; const rows=getJSON(SD_STORAGE.vault,[]); rows.unshift({ id:crypto.randomUUID?.() || String(Date.now()), title:bundle.item.title, templateId:bundle.item.id, templateVersion:bundle.meta.version, riskLevel:bundle.meta.riskLevel, sourcePath:bundle.item.path, disclaimerAccepted:true, signature:$('#signatureField', mount)?.value || '', answers:collect(), content:markdownOut.value, package:makePackage(), createdAt:new Date().toISOString() }); setJSON(SD_STORAGE.vault, rows); audit('vault_saved', { templateId:bundle.item.id, riskLevel:bundle.meta.riskLevel }); alert('Saved to local vault.'); });
    $('#downloadMd', mount).addEventListener('click', () => { if(!guard()) return; audit('export_markdown', { templateId:bundle.item.id }); download(`${bundle.item.id}.md`, markdownOut.value, 'text/markdown'); });
    $('#downloadDoc', mount).addEventListener('click', () => { if(!guard()) return; audit('export_word_compatible_doc', { templateId:bundle.item.id }); download(`${bundle.item.id}.doc`, markdownOut.value, 'application/msword'); });
    $('#downloadHtml', mount).addEventListener('click', () => { if(!guard()) return; audit('export_html', { templateId:bundle.item.id }); download(`${bundle.item.id}.html`, htmlDoc(), 'text/html'); });
    $('#downloadPackage', mount).addEventListener('click', () => { if(!guard()) return; audit('export_package_json', { templateId:bundle.item.id }); download(`${bundle.item.id}.sovereigndocs.json`, JSON.stringify(makePackage(), null, 2), 'application/json'); });
    $('#copyOutput', mount).addEventListener('click', async () => { await navigator.clipboard?.writeText(markdownOut.value); audit('copy_markdown', { templateId:bundle.item.id }); alert('Copied current document markdown.'); });
    $('#printPdf', mount).addEventListener('click', () => { if(!guard()) return; audit('print_pdf', { templateId:bundle.item.id }); window.print(); });
  } catch(error){ mount.innerHTML = `<div class="empty"><h2>Builder failed.</h2><p>${esc(error.message)}</p></div>`; }
}
async function renderGovernance(){
  const gatesMount = $('#publishGatesMount');
  if(gatesMount){ const gates = await fetchJSON('/audit/publish-gates.json'); const rows = gates.release_gates || gates.gates || []; gatesMount.innerHTML = `<div class="grid">${rows.map(g => `<article class="card"><h3>${esc(slugLabel(g.gate))}</h3><div class="statusbar"><span class="chip ${g.status?.includes('fail')?'danger':''}">${esc(g.status)}</span></div><p>${esc(g.basis)}</p></article>`).join('')}</div>`; }
  const officialMount = $('#officialWorkflowsMount');
  if(officialMount){ const data = await fetchJSON('/official-source-library/official-workflows.json'); officialMount.innerHTML = `<div class="notice"><strong>${data.count}</strong> official-source workflows. Completion model: prep packet plus official-source route.</div><div class="grid">${(data.workflows||[]).map(w => `<article class="card"><h3>${esc(w.title)}</h3><p>${esc(w.category)} · ${esc(w.risk_level)} risk</p><p>${esc(w.document_generation_policy || '')}</p><a class="button" href="${esc(w.official_url)}" target="_blank" rel="noopener">Open official source</a></article>`).join('')}</div>`; }
  const reviewMount = $('#reviewQueueMount');
  if(reviewMount){ const data = await fetchJSON('/review-workflow/review-queue-high-risk.json'); reviewMount.innerHTML = `<div class="notice"><strong>${(data.count||0).toLocaleString()}</strong> high-risk records queued. Showing first 300.</div><div class="grid">${(data.records||[]).slice(0,300).map(r => `<article class="card"><h3>${esc(r.title)}</h3><p>${esc(r.jurisdiction)} · ${esc(r.category)}</p><div class="statusbar">${riskBadge(r.risk_level)}<span class="chip">${esc(r.recommended_next_status)}</span></div><p class="mini">${esc(r.path)}</p></article>`).join('')}</div>`; }
  const azMount = $('#azOverlayMount');
  if(azMount){ const data = await fetchJSON('/template-library/state-overlays-v2/US-AZ.json'); azMount.innerHTML = `<article class="card"><h3>Arizona official-source overlay</h3><p>${esc(data.overlay_policy)}</p><div class="grid">${(data.official_source_targets||[]).map(t => `<article><h4>${esc(slugLabel(t.target))}</h4><p>${esc(t.notes)}</p>${t.verified_url?`<a class="button" href="${esc(t.verified_url)}" target="_blank" rel="noopener">Open source</a>`:'<span class="chip danger">not verified</span>'}</article>`).join('')}</div></article>`; }
  const healthMount = $('#templateHealthMount');
  if(healthMount){ const {records,categories,jurisdictions}=await loadSource(); const risks=records.reduce((a,r)=>(a[r.risk_level]=(a[r.risk_level]||0)+1,a),{}); healthMount.innerHTML = `<div class="metric-grid"><div class="metric"><b>${records.length.toLocaleString()}</b><span>Records</span></div><div class="metric"><b>${categories.length}</b><span>Categories</span></div><div class="metric"><b>${jurisdictions.length}</b><span>Jurisdictions</span></div><div class="metric"><b>${(risks.high||0).toLocaleString()}</b><span>High risk</span></div></div><pre class="source-tree">${esc(JSON.stringify(risks,null,2))}</pre>`; }
}
function renderVault(){
  const mount=$('#vaultMount'); if(!mount) return; const rows=getJSON(SD_STORAGE.vault,[]); mount.innerHTML=`<div class="toolbar"><button class="button" id="exportVault">Export Vault JSON</button><button class="button danger" id="clearVault">Clear Local Vault</button></div>${rows.length?`<div class="vault-list">${rows.map(row=>`<article class="vault-item"><div><h3>${esc(row.title)}</h3><p class="mini">${esc(row.templateId||'uploaded')} · ${esc(row.riskLevel||'unknown')} · ${esc(row.createdAt||'')}</p></div><div class="download-row"><button class="button" data-download="${esc(row.id)}">Download</button><button class="button danger" data-delete="${esc(row.id)}">Delete</button></div></article>`).join('')}</div>`:'<div class="empty">No saved local documents yet.</div>'}`; $('#exportVault')?.addEventListener('click',()=>download('sovereigndocs-vault-v8.json',JSON.stringify(rows,null,2),'application/json')); $('#clearVault')?.addEventListener('click',()=>{if(confirm('Clear local vault?')){setJSON(SD_STORAGE.vault,[]);audit('vault_cleared');renderVault();}}); $$('[data-download]').forEach(btn=>btn.addEventListener('click',()=>{const row=rows.find(x=>x.id===btn.dataset.download); if(row) download(`${row.templateId||'document'}.md`, row.content||'', 'text/markdown');})); $$('[data-delete]').forEach(btn=>btn.addEventListener('click',()=>{setJSON(SD_STORAGE.vault, rows.filter(x=>x.id!==btn.dataset.delete)); audit('vault_deleted',{id:btn.dataset.delete}); renderVault();}));
}
function renderWorkspace(){
  const mount=$('#workspaceMount'); if(!mount) return; mount.innerHTML=`<div class="grid two"><article><label class="question"><b>Upload text/markdown</b><input id="fileInput" class="input" type="file" accept=".txt,.md,.markdown,.csv,.json"/></label><label class="question"><b>Document title</b><input id="workspaceTitle" class="input" placeholder="Uploaded document"/></label><textarea id="workspaceText" class="textarea editor-area" placeholder="Paste document text here..."></textarea><div class="toolbar"><button class="button gold" id="saveWorkspace">Save to Vault</button><button class="button" id="downloadWorkspace">Download Markdown</button></div></article><article class="preview" id="workspacePreview"></article></div>`; const text=$('#workspaceText'), preview=$('#workspacePreview'); const sync=()=>preview.innerHTML=mdToHtml(text.value || 'Paste or upload text to preview it here.'); text.addEventListener('input',sync); sync(); $('#fileInput').addEventListener('change', async e=>{const file=e.target.files[0]; if(!file)return; $('#workspaceTitle').value=file.name.replace(/\.[^.]+$/,''); text.value=await file.text(); sync();}); $('#saveWorkspace').addEventListener('click',()=>{const title=$('#workspaceTitle').value||'Uploaded document'; const content=text.value; if(!content.trim())return alert('Add document text first.'); const rows=getJSON(SD_STORAGE.vault,[]); rows.unshift({id:crypto.randomUUID?.()||String(Date.now()),title,templateId:null,riskLevel:'uploaded',disclaimerAccepted:false,content,answers:{},createdAt:new Date().toISOString()}); setJSON(SD_STORAGE.vault,rows); audit('workspace_saved',{title}); alert('Saved to local vault.');}); $('#downloadWorkspace').addEventListener('click',()=>download(`${($('#workspaceTitle').value||'document').toLowerCase().replace(/[^a-z0-9]+/g,'-')}.md`, text.value, 'text/markdown'));
}
function renderAudit(){ const mount=$('#auditMount'); if(!mount)return; const rows=getJSON(SD_STORAGE.audit,[]); mount.innerHTML=`<div class="toolbar"><button class="button" id="exportAudit">Export Audit JSON</button><button class="button danger" id="clearAudit">Clear Audit</button></div>${rows.length?`<pre class="source-tree">${esc(JSON.stringify(rows,null,2))}</pre>`:'<div class="empty">No local audit events yet.</div>'}`; $('#exportAudit')?.addEventListener('click',()=>download('sovereigndocs-audit-v8.json',JSON.stringify(rows,null,2),'application/json')); $('#clearAudit')?.addEventListener('click',()=>{if(confirm('Clear local audit?')){setJSON(SD_STORAGE.audit,[]);renderAudit();}}); }
async function renderApiStatus(){ const mount=$('#apiStatusMount'); if(!mount)return; try{ const data=await fetchJSON('/api/health'); mount.innerHTML=`<div class="notice">✅ API online: ${data.templates.toLocaleString()} records, ${data.categories} categories, version ${esc(data.version)}</div><pre class="source-tree">${esc(JSON.stringify(data,null,2))}</pre>`;}catch(e){ mount.innerHTML=`<div class="notice">Static mode is active. Optional Node API is offline until you run <span class="kbd">npm start</span>.</div>`; } }
document.addEventListener('DOMContentLoaded', () => { renderLibrary().catch(console.error); renderBuilder().catch(console.error); renderGovernance().catch(console.error); renderVault(); renderWorkspace(); renderAudit(); renderApiStatus().catch(console.error); });
