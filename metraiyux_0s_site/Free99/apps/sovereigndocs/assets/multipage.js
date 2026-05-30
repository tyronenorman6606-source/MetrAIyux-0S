const SD_STORAGE = {
  vault: 'sovereigndocs.vault.v8',
  audit: 'sovereigndocs.audit.v8'
};
const SD_APP_ROOT = (() => {
  try {
    const scriptUrl = new URL(document.currentScript?.src || '/Free99/apps/sovereigndocs/assets/multipage.js', location.href);
    return scriptUrl.pathname.replace(/assets\/[^/]+$/, '');
  } catch {
    return '/Free99/apps/sovereigndocs/';
  }
})();
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const slugLabel = value => String(value || '').replaceAll('-', ' ').replaceAll('_',' ').replace(/\b\w/g, m => m.toUpperCase());
const getJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
const setJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
function appPath(value){
  const text = String(value || '');
  if(/^https?:\/\//i.test(text) || text.startsWith('//')) return text;
  if(text.startsWith('/api/')) return new URL(`/api/sovereigndocs${text.slice('/api'.length)}`, location.origin).href;
  const clean = text.replace(/^\/+/, '');
  if(clean.startsWith('Free99/apps/sovereigndocs/')) return `/${clean}`;
  return `${SD_APP_ROOT}${clean}`;
}
function canonicalSkyeDocxMaxEditorUrl(params={}){
  const url = new URL('/Marketing-Made-Easy/SkyeDocxMax/editor.html', location.origin);
  url.searchParams.set('source', 'sovereigndocs');
  url.searchParams.set('ws_id', 'sovereigndocs');
  url.searchParams.set('returnTo', appPath('vault/'));
  Object.entries(params || {}).forEach(([key, value]) => {
    if(value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  return url.href;
}
function audit(type, detail={}){ const rows = getJSON(SD_STORAGE.audit, []); rows.unshift({ id: crypto.randomUUID?.() || String(Date.now()), type, detail, at: new Date().toISOString() }); setJSON(SD_STORAGE.audit, rows.slice(0, 1000)); }
async function fetchJSON(path){ const url = appPath(path); const res = await fetch(url, { cache:'no-store' }); if(!res.ok) throw new Error(`Failed to load ${url}`); return res.json(); }
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
function download(filename, content, type='text/plain'){ const blob = new Blob([content], {type}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=filename; a.style.display='none'; document.body.appendChild(a); a.click(); setTimeout(()=>{ a.remove(); URL.revokeObjectURL(url); }, 1200); }
const SD_BRAND = Object.freeze({
  platform: 'SovereignDocs',
  operatorCompany: "Skye's Over London LC",
  operatingSystem: 'MetrAIyux 0S',
  watermarkAsset: 'assets/brand/skyes-over-london-deity-logo.png',
  marker: 'SKYESOVERLONDON_BACKING_NOTICE',
  backingNotice: "Powered and workflow-backed by Skye's Over London LC through MetrAIyux 0S.",
  boundary: "Operational backing means document automation, vault/export tooling, workflow routing, and optional paid legal-review routing. It is not financing, legal advice, an attorney-client relationship, a filing/submission guarantee, a business outcome guarantee, or responsibility for the company's performance, approvals, compliance, or use of the documents.",
  legalReview: 'Legal review is optional and paid up front through the SkyePay/Stripe legal-review lane before partner routing.'
});
function absoluteAppPath(value){
  try { return new URL(appPath(value), location.href).href; } catch { return appPath(value); }
}
function brandedMarkdown(markdown, title='SovereignDocs document'){
  const body = String(markdown || '').trim() || `# ${title}`;
  if(body.includes(SD_BRAND.marker)) return body;
  return `${body}\n\n---\n\n## ${SD_BRAND.marker}\n\n${SD_BRAND.backingNotice}\n\n${SD_BRAND.boundary}\n\n${SD_BRAND.legalReview}\n`;
}
function brandedPlainText(text, title='SovereignDocs document'){
  return brandedMarkdown(text, title);
}
function brandedPackage(payload){
  return {
    ...payload,
    brand: {
      ...SD_BRAND,
      watermarkUrl: absoluteAppPath(SD_BRAND.watermarkAsset)
    }
  };
}
function brandedHtmlDocument(title, bodyHtml, options={}){
  const safeTitle = esc(title || 'SovereignDocs document');
  const watermarkUrl = absoluteAppPath(SD_BRAND.watermarkAsset);
  const kind = esc(options.kind || 'SovereignDocs export');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="generator" content="SovereignDocs + Skye's Over London"><title>${safeTitle}</title><style>body{margin:0;background:#d8d8dc;color:#171313;font-family:Arial,sans-serif;line-height:1.6;padding:32px 16px}.page{position:relative;max-width:820px;min-height:10.5in;margin:0 auto;background:#fff;padding:1in;box-shadow:0 14px 44px rgba(0,0,0,.16);overflow:hidden}.page:before{content:"";position:absolute;inset:.35in;background:url("${watermarkUrl}") center 45%/52% auto no-repeat;opacity:.035;pointer-events:none}.doc-content,.sd-backed-notice{position:relative;z-index:1}h1,h2,h3{line-height:1.2}blockquote{border-left:4px solid #9b7a32;background:#fff7df;padding:10px 14px}.sd-backed-notice{margin-top:36px;border-top:1px solid #d7c89a;padding-top:14px;color:#4a4237;font-size:12px}.sd-backed-notice strong{display:block;color:#1e1914;text-transform:uppercase;letter-spacing:.08em}@media print{body{background:#fff;padding:0}.page{box-shadow:none;max-width:none;margin:0;min-height:auto}}</style></head><body><main class="page"><section class="doc-content">${bodyHtml}</section><footer class="sd-backed-notice"><strong>${esc(SD_BRAND.marker)} · ${kind}</strong><p>${esc(SD_BRAND.backingNotice)}</p><p>${esc(SD_BRAND.boundary)}</p><p>${esc(SD_BRAND.legalReview)}</p></footer></main></body></html>`;
}
async function openSkyeDocxHandoff({ title, markdown, html='', metadata={} }){
  const safeTitle = title || 'SovereignDocs Document';
  let opened = null;
  try { opened = window.open('', '_blank'); if(opened) opened.opener = null; } catch {}
  const launch = url => {
    if(opened && !opened.closed) opened.location.href = url;
    else window.open(url, '_blank', 'noopener');
  };
  const payload = {
    title:safeTitle,
    markdown:brandedMarkdown(markdown, safeTitle),
    html:html || mdToHtml(brandedMarkdown(markdown, safeTitle)),
    metadata:{ source:'sovereigndocs-public-builder', ...metadata, brand:brandedPackage({}).brand }
  };
  try {
    const res = await fetch(appPath('/api/editor/skye-docx-max/session'), { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if(res.ok && data.launchUrl){
      audit('skye_docx_handoff_created', { mode:'api', handoffId:data.handoff?.id || null, title:safeTitle });
      launch(new URL(data.launchUrl, location.origin).href);
      return;
    }
  } catch {}
  const localId = crypto.randomUUID?.() || `local_${Date.now()}`;
  const localHandoff = { ...payload, id:localId, status:'local_canonical_handoff_created', createdAt:new Date().toISOString() };
  try { sessionStorage.setItem(`sovereigndocs.localSkyeHandoff.${localId}`, JSON.stringify(localHandoff)); } catch {}
  try { localStorage.setItem(`sovereigndocs.localSkyeHandoff.${localId}`, JSON.stringify(localHandoff)); } catch {}
  const launchUrl = canonicalSkyeDocxMaxEditorUrl({ sd_local_handoff: localId });
  audit('skye_docx_handoff_created', { mode:'local_static', handoffId:localId, title:safeTitle });
  launch(launchUrl);
}
function plainTextFromHtml(html=''){
  const div = document.createElement('div');
  div.innerHTML = String(html || '');
  return div.textContent || div.innerText || '';
}
function normalizeSkyeReturnPayload(payload={}){
  const source = payload.returned || payload.payload?.returned || payload.payload || payload;
  return {
    id:source.id || source.returnId || '',
    returnId:source.returnId || source.id || '',
    handoffId:source.handoffId || '',
    documentId:source.documentId || '',
    vaultRecordId:source.vaultRecordId || '',
    caseId:source.caseId || null,
    title:source.title || 'SkyeDocxMax Return',
    html:source.html || '',
    text:source.text || source.contentMarkdown || plainTextFromHtml(source.html || ''),
    metadata:source.metadata || {},
    createdAt:source.createdAt || source.metadata?.returnedAt || new Date().toISOString()
  };
}
function skyeReturnVaultRow(payload={}, mode='local'){
  const item = normalizeSkyeReturnPayload(payload);
  const stable = item.returnId || item.vaultRecordId || item.documentId || item.handoffId || item.createdAt;
  return {
    id:`skye-return-${String(stable || Date.now()).replace(/[^a-zA-Z0-9_-]/g,'-')}`,
    title:item.title,
    templateId:item.documentId || item.handoffId || null,
    sourceType:`skye_docx_max_return_${mode}`,
    riskLevel:'editor-return',
    disclaimerAccepted:true,
    content:item.text,
    brandedContent:brandedMarkdown(item.text, item.title),
    html:item.html,
    brand:brandedPackage({}).brand,
    answers:{},
    skyeReturn:item,
    createdAt:item.createdAt
  };
}
function mergeVaultRows(incoming=[]){
  const rows = getJSON(SD_STORAGE.vault, []);
  const known = new Set(rows.map(row => row.id));
  const next = [...rows];
  for(const row of incoming){
    if(!row?.id || known.has(row.id)) continue;
    known.add(row.id);
    next.unshift(row);
  }
  if(next.length !== rows.length) setJSON(SD_STORAGE.vault, next);
  return next.length - rows.length;
}
function syncLocalSkyeReturnsToVault(){
  const rows = [];
  try {
    for(let index = 0; index < localStorage.length; index += 1){
      const key = localStorage.key(index);
      if(!key || !key.startsWith('sovereigndocs.localSkyeReturn.')) continue;
      const payload = JSON.parse(localStorage.getItem(key) || '{}');
      rows.push(skyeReturnVaultRow(payload, 'local'));
    }
    const list = JSON.parse(localStorage.getItem('sovereigndocs.skyeDocxReturns') || '[]');
    if(Array.isArray(list)) rows.push(...list.map(item => skyeReturnVaultRow(item, 'bridge')));
  } catch {}
  const imported = mergeVaultRows(rows);
  if(imported) audit('skye_docx_returns_imported_local', { count:imported });
  return imported;
}
async function syncApiSkyeReturnsToVault({ showAlert=false }={}){
  const data = await fetchJSON('/api/editor/skye-docx-max/returns');
  const rows = (data.items || []).map(item => skyeReturnVaultRow(item, 'api'));
  const imported = mergeVaultRows(rows);
  if(imported) audit('skye_docx_returns_imported_api', { count:imported });
  if(showAlert) alert(imported ? `Synced ${imported} SkyeDocxMax return(s) into the local vault.` : 'No new SkyeDocxMax returns found.');
  return imported;
}
async function syncSkyeDocxReturnsToVault(options={}){
  const localCount = syncLocalSkyeReturnsToVault();
  let apiCount = 0;
  try { apiCount = await syncApiSkyeReturnsToVault(options); } catch(error) {
    if(options.showAlert && !localCount) alert(`API sync is not available from this session yet: ${error.message}`);
  }
  if(options.rerender !== false) renderVault();
  return localCount + apiCount;
}
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
function skyeDocxTemplateUrl(r, mode='build'){
  return canonicalSkyeDocxMaxEditorUrl({
    template: r?.id || '',
    templatePath: r?.path || '',
    sd_mode: mode
  });
}
function recordUrl(r){ return skyeDocxTemplateUrl(r, 'details'); }
function buildUrl(r){ return skyeDocxTemplateUrl(r, 'build'); }
function reviewUrl(r){
  return canonicalSkyeDocxMaxEditorUrl({
    template: r?.id || '',
    templatePath: r?.path || '',
    sd_mode: 'review',
    reviewQueue: 'high-risk'
  });
}
function riskBadge(risk){ return `<span class="chip risk-${esc(risk || 'low')}">${esc(risk || 'unknown')}</span>`; }
const SD_TERM_GLOSSARY = [
  { key:'principal', title:'Principal', aliases:['principal','business principal','owner principal','signing principal'], body:'The main person or entity the document is centered on. In business documents this is usually the owner, signer, decision maker, or accountable party, depending on the template.' },
  { key:'llc', title:'LLC', aliases:['llc','limited liability company'], body:'A limited liability company. It is a business entity that can separate company obligations from personal obligations when it is formed and maintained correctly.' },
  { key:'member', title:'Member', aliases:['member','llc member','members'], body:'An owner of an LLC. A member can be a person or another business entity.' },
  { key:'manager', title:'Manager', aliases:['manager','managing member','llc manager'], body:'The person or entity authorized to run day-to-day LLC operations when the company is manager-managed or delegates authority.' },
  { key:'organizer', title:'Organizer', aliases:['organizer','llc organizer'], body:'The person or service that signs or files formation paperwork for an LLC. The organizer is not automatically the owner unless the document says so.' },
  { key:'registered_agent', title:'Registered Agent', aliases:['registered agent','statutory agent','agent for service'], body:'The person or company officially designated to receive legal notices and government mail for a business entity.' },
  { key:'operating_agreement', title:'Operating Agreement', aliases:['operating agreement','company agreement'], body:'The internal rulebook for an LLC. It usually covers ownership, roles, voting, profit splits, transfers, and what happens if someone leaves.' },
  { key:'articles_of_organization', title:'Articles of Organization', aliases:['articles of organization','certificate of formation','formation filing'], body:'The public filing that creates an LLC with the state or applicable filing office.' },
  { key:'governing_law', title:'Governing Law', aliases:['governing law','law governing','state law'], body:'The law the document says will be used to interpret the agreement. This does not always decide where a dispute must be filed.' },
  { key:'jurisdiction', title:'Jurisdiction', aliases:['jurisdiction','venue jurisdiction','state code','state full name'], body:'The place, court, agency, or legal authority connected to the document. Requirements can change by state, county, court, or agency.' },
  { key:'effective_date', title:'Effective Date', aliases:['effective date','start date','date effective'], body:'The date the document starts to matter. It can be different from the signing date if the document says so.' },
  { key:'party', title:'Party', aliases:['party','parties','counterparty'], body:'A person or entity that has rights, duties, or promises in the document.' },
  { key:'entity', title:'Entity', aliases:['entity','business entity','company entity'], body:'A legally recognized organization, such as an LLC, corporation, partnership, nonprofit, or trust.' },
  { key:'agent', title:'Agent', aliases:['agent','authorized agent'], body:'A person or entity allowed to act for someone else in the specific way the document authorizes.' },
  { key:'beneficiary', title:'Beneficiary', aliases:['beneficiary','beneficiaries'], body:'A person or entity meant to receive money, property, rights, or another benefit from the document.' },
  { key:'assignor_assignee', title:'Assignor / Assignee', aliases:['assignor','assignee','assignment'], body:'The assignor transfers a right or obligation. The assignee receives it. The document should make the transfer and limits clear.' },
  { key:'indemnification', title:'Indemnification', aliases:['indemnification','indemnify','hold harmless'], body:'A promise to cover certain losses, claims, damages, or costs. These clauses can carry serious financial risk.' },
  { key:'consideration', title:'Consideration', aliases:['consideration','payment consideration'], body:'The value exchanged for an agreement, such as money, services, promises, property, or another benefit.' },
  { key:'venue', title:'Venue', aliases:['venue','dispute venue'], body:'The location where a dispute is supposed to be brought, often a specific county, court, arbitration forum, or state.' },
  { key:'notary', title:'Notary', aliases:['notary','notarized','notarization'], body:'A notary verifies identity and witnesses a signature according to local rules. Notarization does not make a weak document legally correct by itself.' },
  { key:'witness', title:'Witness', aliases:['witness','witnesses'], body:'A person who observes a signing and may later confirm it happened. Some documents require specific witness rules.' },
  { key:'acknowledgment', title:'Acknowledgment', aliases:['acknowledgment','acknowledgement','typed signature','signature acknowledgment'], body:'A statement or signature record showing that someone reviewed, accepted, or signed something. It is not the same as notarization or official filing unless the workflow specifically requires that.' },
  { key:'fiduciary', title:'Fiduciary', aliases:['fiduciary','fiduciary duty'], body:'Someone required to act for another person or entity with a high duty of care, loyalty, or trust.' },
  { key:'trustee', title:'Trustee', aliases:['trustee'], body:'A person or entity that manages trust property for beneficiaries under the trust terms.' },
  { key:'grantor', title:'Grantor', aliases:['grantor','settlor','trustor'], body:'The person who creates a trust or transfers property or rights in certain documents.' },
  { key:'dba', title:'DBA', aliases:['dba','doing business as','trade name'], body:'A public-facing business name that may differ from the legal entity name. It usually does not create a separate company by itself.' },
  { key:'ein', title:'EIN', aliases:['ein','tax id','federal tax id','employer identification number'], body:'An employer identification number issued by the IRS for tax and business identification.' },
  { key:'bylaws', title:'Bylaws', aliases:['bylaws','corporate bylaws'], body:'Internal operating rules for a corporation, often covering directors, officers, meetings, voting, and governance.' },
  { key:'board_of_directors', title:'Board of Directors', aliases:['board of directors','director','directors'], body:'The governing group that oversees a corporation or nonprofit, depending on the entity and its rules.' },
  { key:'shareholder', title:'Shareholder', aliases:['shareholder','stockholder'], body:'A person or entity that owns shares in a corporation.' },
  { key:'amendment', title:'Amendment', aliases:['amendment','amended','modify agreement'], body:'A formal change to an existing document. It should identify what is changing and what remains in force.' },
  { key:'dissolution', title:'Dissolution', aliases:['dissolution','wind up','winding up'], body:'The process of ending an entity or relationship and handling remaining obligations, assets, notices, and filings.' },
  { key:'official_source', title:'Official Source', aliases:['official source','official site','agency site','external official'], body:'The government, court, agency, tax, or registry source where final filing or confirmation happens. SovereignDocs can prepare packets, but final action requires the official source unless a live integration is proven.' }
];
function normalizeTermText(value){ return ` ${String(value || '').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim()} `; }
function termHelpFor(label, id=''){
  const haystack = normalizeTermText(`${label || ''} ${id || ''}`);
  return SD_TERM_GLOSSARY.find(entry => entry.aliases.some(alias => haystack.includes(normalizeTermText(alias))));
}
function termHelpButton(label, id=''){
  const term = termHelpFor(label, id);
  if(!term) return '';
  return `<button type="button" class="sd-term-help-button" data-sd-term="${esc(term.key)}" aria-label="Explain ${esc(term.title)}">?</button>`;
}
function fieldLabelHtml(q){
  return `<span class="sd-field-label-line"><span>${esc(q.label)} ${q.required?'<span class="mini">required</span>':''}</span>${termHelpButton(q.label, q.id)}</span>`;
}
function detectTermsFromBundle(bundle){
  const source = [
    bundle?.item?.title,
    bundle?.meta?.category,
    bundle?.document,
    ...(bundle?.questions || []).flatMap(q => [q.id, q.label])
  ].join(' ');
  const haystack = normalizeTermText(source);
  return SD_TERM_GLOSSARY.filter(entry => entry.aliases.some(alias => haystack.includes(normalizeTermText(alias)))).slice(0, 7);
}
function termHelpRail(bundle){
  const terms = detectTermsFromBundle(bundle);
  if(!terms.length) return '';
  return `<div class="sd-term-help-rail" aria-label="Detected document terms">${terms.map(term => `<button type="button" class="sd-term-chip" data-sd-term="${esc(term.key)}"><span>?</span>${esc(term.title)}</button>`).join('')}</div>`;
}
function ensureTermHelpModal(){
  let modal = document.getElementById('sd-term-help-modal');
  if(modal) return modal;
  modal = document.createElement('div');
  modal.id = 'sd-term-help-modal';
  modal.className = 'sd-term-help-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = '<div class="sd-term-help-dialog"><button type="button" class="sd-term-help-close" data-sd-term-close aria-label="Close term help">X</button><p class="mini">Document term help</p><h2 id="sd-term-help-title"></h2><p id="sd-term-help-body"></p><div class="notice"><strong>Boundary:</strong> Plain-language helper only. Confirm current requirements with the official source or a qualified professional before relying on it.</div></div>';
  modal.addEventListener('click', event => {
    if(event.target === modal || event.target.closest('[data-sd-term-close]')) modal.classList.remove('active');
  });
  document.addEventListener('keydown', event => {
    if(event.key === 'Escape') modal.classList.remove('active');
  });
  document.body.appendChild(modal);
  return modal;
}
function showTermHelp(key){
  const term = SD_TERM_GLOSSARY.find(entry => entry.key === key);
  if(!term) return;
  const modal = ensureTermHelpModal();
  $('#sd-term-help-title', modal).textContent = term.title;
  $('#sd-term-help-body', modal).textContent = term.body;
  modal.classList.add('active');
}
function wireTermHelp(root=document){
  if(root.__sdTermHelpWired) return;
  root.__sdTermHelpWired = true;
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-sd-term]');
    if(!button) return;
    event.preventDefault();
    event.stopPropagation();
    showTermHelp(button.dataset.sdTerm);
  });
}
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
    $('#libraryGrid').innerHTML = rows.slice(0, limit).map(r => `<article class="document-card"><h3>${esc(r.title)}</h3><p>${esc(r.category_name)} · ${esc(r.state_name)}</p><div class="document-meta">${riskBadge(r.risk_level)}<span class="chip">${esc(r.jurisdiction_id)}</span><span class="chip">${esc(r.status)}</span></div><p class="mini">${esc(r.base_id)}</p><div class="actions"><a class="button gold" href="${esc(buildUrl(r))}">Open in SkyeDocxMax</a><a class="button" href="${esc(recordUrl(r))}">Details</a></div></article>`).join('') || `<div class="empty"><h2>No matches.</h2><p>Try a broader query or filter.</p></div>`;
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
    disclaimer: 'This SovereignDocs record is self-help document automation only. It is not legal advice, not attorney-reviewed, and does not create an attorney-client relationship. Sensitive or state-specific documents should be reviewed by qualified professionals before use.'
  };
}

function prepWorksheet(bundle, answers){
  const rows = Object.entries(answers || {}).map(([key,value]) => `- ${key}: ${String(value || '').trim() || '[not provided]'}`).join('\n');
  return `# Prep Worksheet: ${bundle.item.title}\n\nSovereignDocs sensitive-workflow prep worksheet.\n\nThis is not a completed legal document, not state-compliant, not court-ready, not attorney-reviewed, and not an official filing. Use it as an intake packet for review or official-source routing.\n\n## Template Reference\n\n- Template ID: ${bundle.item.id}\n- Risk level: ${bundle.meta.riskLevel}\n- Source path: ${bundle.item.path}\n- Export class: prep_worksheet_static_mode\n\n## User-provided intake values\n\n${rows || '- No user answers supplied.'}\n\n## Next-step checklist\n\n- Confirm current official, state, local, court, tax, or agency requirements.\n- Seek licensed attorney or qualified professional review when needed.\n- Do not submit this worksheet as an official filing.\n- Do not treat this worksheet as legal advice.\n`;
}
function assemble(template, answers){
  let out = String(template || '');
  out = out.replace(/{{#if\s+([\w-]+)}}([\s\S]*?){{\/if}}/g, (_, key, inner) => String(answers[key] || '').trim() ? inner : '');
  out = out.replace(/{{\s*([\w-]+)\s*}}/g, (_, key) => (answers[key] ?? '').toString().trim() || `[${slugLabel(key)}]`);
  return out;
}
async function renderBuilder(){
  const mount = $('#builderMount');
  if(!mount) return;
  const params = new URLSearchParams(location.search);
  const templateId = mount.dataset.templateId || params.get('template') || params.get('templateId') || '';
  const launchUrl = canonicalSkyeDocxMaxEditorUrl({
    template: templateId,
    sd_mode: 'build',
    sourceSurface: 'sovereigndocs'
  });
  mount.innerHTML = `<article class="card"><h2>Opening SkyeDocxMax</h2><p>SovereignDocs uses SkyeDocxMax as the single canonical document builder and editor across the 0S.</p><div class="download-row"><a class="button gold" href="${esc(launchUrl)}">Open SkyeDocxMax</a><a class="button" href="${appPath('vault/')}">Return to Vault</a></div></article>`;
  audit('builder_routed_to_canonical_skye_docx_max', { templateId });
  location.replace(launchUrl);
}
function renderOfficialPrepForm(workflow){
  const mount = $('#officialPrepMount');
  if(!mount) return;
  const fields = (workflow.prep_fields || []).map(field => `<label class="field-row"><span class="sd-field-label-line"><span>${esc(slugLabel(field))}</span>${termHelpButton(slugLabel(field), field)}</span><input class="input" data-official-field="${esc(field)}" placeholder="${esc(slugLabel(field))}"></label>`).join('');
  mount.innerHTML = `<article class="card sd-official-prep-panel"><h3>${esc(workflow.title)}</h3><p>${esc(workflow.category)} · ${esc(workflow.risk_level)} risk</p><p><strong>What this workflow does:</strong> collects facts, generates a prep packet/checklist, saves a local packet record, and hands off to the official source. It does not submit anything for you.</p><form id="officialPrepForm" class="field-grid">${fields || '<p>No configured prep fields; packet will include the workflow metadata only.</p>'}<label class="question sd-official-boundary"><input id="officialPrepBoundary" type="checkbox" required> I understand SovereignDocs has not filed or submitted anything; the linked official site is the final action step.</label><div class="download-row"><button class="button gold" type="submit">Generate prep packet</button><button class="button gold" type="button" id="officialPrepEdit">Edit Generated Packet</button><a class="button" href="${esc(workflow.official_url || '#')}" target="_blank" rel="noopener">Open external official site</a></div></form><pre id="officialPrepOutput" class="source-tree" style="margin-top:14px">No prep packet generated yet.</pre></article>`;
  wireTermHelp(mount);
  $('#officialPrepForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const answers = Object.fromEntries($$('[data-official-field]', mount).map(input => [input.dataset.officialField, input.value || '']));
    const packet = officialPrepPacket(workflow, answers);
    const rows = getJSON(SD_OFFICIAL_PREP_STORAGE, []);
    rows.unshift(packet);
    setJSON(SD_OFFICIAL_PREP_STORAGE, rows.slice(0, 250));
    audit('official_source_prep_packet_ready', { workflowId: workflow.id, status: packet.status });
    let apiReceipt = null;
    try {
      const res = await fetch(appPath('/api/official-workflows/prepare'), { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ workflow, workflowId:workflow.id, answers, source:'official-source-ui' }) });
      apiReceipt = await res.json().catch(() => null);
    } catch {}
    const output = $('#officialPrepOutput');
    output.textContent = JSON.stringify({ ok:true, packet, apiReceipt, nextStep:'Open the external official site. SovereignDocs has not submitted this packet.' }, null, 2);
    output.classList.add('is-ready');
  });
  $('#officialPrepEdit')?.addEventListener('click', async () => {
    const form = $('#officialPrepForm');
    if(form && !form.reportValidity()) return;
    const answers = Object.fromEntries($$('[data-official-field]', mount).map(input => [input.dataset.officialField, input.value || '']));
    const packet = officialPrepPacket(workflow, answers);
    const rows = getJSON(SD_OFFICIAL_PREP_STORAGE, []);
    rows.unshift(packet);
    setJSON(SD_OFFICIAL_PREP_STORAGE, rows.slice(0, 250));
    audit('official_source_prep_packet_opened_in_skye_docx', { workflowId: workflow.id, status: packet.status });
    await openSkyeDocxHandoff({ title:packet.title, markdown:packet.markdown, html:mdToHtml(packet.markdown), metadata:{ workflowId:workflow.id, source:'official-source-prep' } });
  });
}
async function renderGovernance(){
  const gatesMount = $('#publishGatesMount');
  if(gatesMount){ const gates = await fetchJSON('/audit/publish-gates.json'); const rows = gates.release_gates || gates.gates || []; gatesMount.innerHTML = `<div class="grid">${rows.map(g => `<article class="card"><h3>${esc(slugLabel(g.gate))}</h3><div class="statusbar"><span class="chip ${g.status?.includes('fail')?'danger':''}">${esc(g.status)}</span></div><p>${esc(g.basis)}</p></article>`).join('')}</div>`; }
  const officialMount = $('#officialWorkflowsMount');
  if(officialMount){
    const data = await fetchJSON('/official-source-library/official-workflows.json');
    const workflows = data.workflows || [];
    officialMount.innerHTML = `<div class="notice"><strong>${data.count}</strong> official-source prep workflows. Each workflow collects facts, creates a prep packet/checklist, records prep status locally, and then sends final action to the external official site. SovereignDocs does not submit to agencies, courts, tax authorities, or USPTO from this lane.</div><div id="officialPrepMount"></div><div class="grid">${workflows.map(w => `<article class="card"><h3>${esc(w.title)}</h3><p>${esc(w.category)} · ${esc(w.risk_level)} risk</p><p>${esc(w.document_generation_policy || '')}</p><div class="download-row"><button class="button gold" data-official-workflow="${esc(w.id)}">Start prep workflow</button><a class="button" href="${esc(w.official_url)}" target="_blank" rel="noopener">Open external official site</a></div></article>`).join('')}</div>`;
    officialMount.addEventListener('click', (event) => {
      const button = event.target?.closest?.('[data-official-workflow]');
      if(!button) return;
      const workflow = workflows.find(item => item.id === button.dataset.officialWorkflow);
      if(workflow) renderOfficialPrepForm(workflow);
    });
    if(workflows[0]) renderOfficialPrepForm(workflows[0]);
  }
  const reviewMount = $('#reviewQueueMount');
  if(reviewMount){ const data = await fetchJSON('/review-workflow/review-queue-high-risk.json'); reviewMount.innerHTML = `<div class="notice"><strong>Document governance workspace</strong> Sensitive templates route through internal QA and SkyeDocxMax before public export. Open items from this lane for canonical editing, vault return, and operator proof.</div><div class="grid">${(data.records||[]).slice(0,300).map(r => `<a class="card editor-card" href="${esc(reviewUrl(r))}"><h3>${esc(r.title)}</h3><p>${esc(r.jurisdiction)} · ${esc(r.category)}</p><div class="statusbar">${riskBadge(r.risk_level)}<span class="chip">SkyeDocxMax review lane</span></div><p class="mini">${esc(r.path)}</p><span class="button gold">Open in SkyeDocxMax</span></a>`).join('')}</div>`; }
  const azMount = $('#azOverlayMount');
  if(azMount){ const data = await fetchJSON('/template-library/state-overlays-v2/US-AZ.json'); azMount.innerHTML = `<article class="card"><h3>Arizona official-source overlay</h3><p>${esc(data.overlay_policy)}</p><div class="grid">${(data.official_source_targets||[]).map(t => `<article><h4>${esc(slugLabel(t.target))}</h4><p>${esc(t.notes)}</p>${t.verified_url?`<a class="button" href="${esc(t.verified_url)}" target="_blank" rel="noopener">Open source</a>`:'<span class="chip danger">not verified</span>'}</article>`).join('')}</div></article>`; }
  const healthMount = $('#templateHealthMount');
  if(healthMount){ const {records,categories,jurisdictions}=await loadSource(); const risks=records.reduce((a,r)=>(a[r.risk_level]=(a[r.risk_level]||0)+1,a),{}); healthMount.innerHTML = `<div class="metric-grid"><div class="metric"><b>${records.length.toLocaleString()}</b><span>Records</span></div><div class="metric"><b>${categories.length}</b><span>Categories</span></div><div class="metric"><b>${jurisdictions.length}</b><span>Jurisdictions</span></div><div class="metric"><b>${(risks.high||0).toLocaleString()}</b><span>High risk</span></div></div><pre class="source-tree">${esc(JSON.stringify(risks,null,2))}</pre>`; }
}
function renderVault(){
  const mount=$('#vaultMount'); if(!mount) return;
  syncLocalSkyeReturnsToVault();
  const rows=getJSON(SD_STORAGE.vault,[]);
  const exportRows = rows.map(row => ({...row, brandedContent:row.brandedContent || brandedMarkdown(row.content || '', row.title || row.templateId || 'SovereignDocs document'), brand:row.brand || brandedPackage({}).brand}));
  mount.innerHTML=`<div class="toolbar"><button class="button" id="syncSkyeReturns">Sync SkyeDocxMax Returns</button><button class="button" id="exportVault">Export Vault JSON</button><button class="button danger" id="clearVault">Clear Local Vault</button></div>${rows.length?`<div class="vault-list">${rows.map(row=>`<article class="vault-item"><div><h3>${esc(row.title)}</h3><p class="mini">${esc(row.templateId||row.sourceType||'uploaded')} · ${esc(row.riskLevel||'unknown')} · ${esc(row.createdAt||'')}</p></div><div class="download-row"><button class="button" data-download="${esc(row.id)}">Download</button><button class="button" data-edit="${esc(row.id)}">Edit in SkyeDocxMax</button><button class="button danger" data-delete="${esc(row.id)}">Delete</button></div></article>`).join('')}</div>`:'<div class="empty">No saved local documents yet.</div>'}`;
  $('#syncSkyeReturns')?.addEventListener('click',()=>syncSkyeDocxReturnsToVault({showAlert:true}).catch(error=>alert(error.message)));
  $('#exportVault')?.addEventListener('click',()=>download('sovereigndocs-vault-v8.json',JSON.stringify(brandedPackage({items:exportRows, exportedAt:new Date().toISOString()}),null,2),'application/json'));
  $('#clearVault')?.addEventListener('click',()=>{if(confirm('Clear local vault?')){setJSON(SD_STORAGE.vault,[]);audit('vault_cleared');renderVault();}});
  $$('[data-download]').forEach(btn=>btn.addEventListener('click',()=>{const row=rows.find(x=>x.id===btn.dataset.download); if(row) download(`${row.templateId||'document'}.md`, row.brandedContent || brandedMarkdown(row.content||'', row.title || row.templateId || 'SovereignDocs document'), 'text/markdown');}));
  $$('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>{const row=rows.find(x=>x.id===btn.dataset.edit); if(row) openSkyeDocxHandoff({ title:row.title || 'Vault document', markdown:row.brandedContent || row.content || '', html:mdToHtml(row.brandedContent || row.content || ''), metadata:{ source:'sovereigndocs-vault', vaultRecordId:row.id, templateId:row.templateId || null } });}));
  $$('[data-delete]').forEach(btn=>btn.addEventListener('click',()=>{setJSON(SD_STORAGE.vault, rows.filter(x=>x.id!==btn.dataset.delete)); audit('vault_deleted',{id:btn.dataset.delete}); renderVault();}));
}
function renderWorkspace(){
  const mount=$('#workspaceMount'); if(!mount) return;
  mount.innerHTML=`<div class="grid two"><article><label class="question"><b>Upload text/markdown</b><input id="fileInput" class="input" type="file" accept=".txt,.md,.markdown,.csv,.json"/></label><label class="question"><b>Document title</b><input id="workspaceTitle" class="input" placeholder="Uploaded document"/></label><textarea id="workspaceText" class="textarea editor-area" placeholder="Paste document text here..."></textarea><div class="toolbar"><button class="button gold" id="saveWorkspace">Save to Vault</button><button class="button gold" id="editWorkspaceSkyeDocx">Edit in SkyeDocxMax</button><button class="button" id="downloadWorkspace">Download Markdown</button><button class="button" id="downloadWorkspaceHtml">Download HTML</button></div></article><article class="preview" id="workspacePreview"></article></div>`;
  const text=$('#workspaceText'), preview=$('#workspacePreview');
  const title=()=>$('#workspaceTitle').value||'Uploaded document';
  const current=()=>String(text.value || '').trim() ? brandedMarkdown(text.value, title()) : '';
  const sync=()=>preview.innerHTML=mdToHtml(current() || 'Paste or upload text to preview it here.');
  text.addEventListener('input',sync); sync();
  $('#fileInput').addEventListener('change', async e=>{const file=e.target.files[0]; if(!file)return; $('#workspaceTitle').value=file.name.replace(/\.[^.]+$/,''); text.value=await file.text(); sync();});
  $('#saveWorkspace').addEventListener('click',()=>{const content=text.value; if(!content.trim())return alert('Add document text first.'); const rows=getJSON(SD_STORAGE.vault,[]); rows.unshift({id:crypto.randomUUID?.()||String(Date.now()),title:title(),templateId:null,riskLevel:'uploaded',disclaimerAccepted:false,content,brandedContent:current(),brand:brandedPackage({}).brand,answers:{},createdAt:new Date().toISOString()}); setJSON(SD_STORAGE.vault,rows); audit('workspace_saved',{title:title()}); alert('Saved to local vault.');});
  $('#editWorkspaceSkyeDocx').addEventListener('click',async()=>{if(!text.value.trim())return alert('Add document text first.'); await openSkyeDocxHandoff({title:title(), markdown:text.value, html:mdToHtml(current()), metadata:{source:'sovereigndocs-workspace-upload'}});});
  $('#downloadWorkspace').addEventListener('click',()=>download(`${title().toLowerCase().replace(/[^a-z0-9]+/g,'-')}.md`, current(), 'text/markdown'));
  $('#downloadWorkspaceHtml').addEventListener('click',()=>download(`${title().toLowerCase().replace(/[^a-z0-9]+/g,'-')}.html`, brandedHtmlDocument(title(), mdToHtml(current()), {kind:'workspace-html-export'}), 'text/html'));
}
function renderAudit(){ const mount=$('#auditMount'); if(!mount)return; const rows=getJSON(SD_STORAGE.audit,[]); mount.innerHTML=`<div class="toolbar"><button class="button" id="exportAudit">Export Audit JSON</button><button class="button danger" id="clearAudit">Clear Audit</button></div>${rows.length?`<pre class="source-tree">${esc(JSON.stringify(rows,null,2))}</pre>`:'<div class="empty">No local audit events yet.</div>'}`; $('#exportAudit')?.addEventListener('click',()=>download('sovereigndocs-audit-v8.json',JSON.stringify(rows,null,2),'application/json')); $('#clearAudit')?.addEventListener('click',()=>{if(confirm('Clear local audit?')){setJSON(SD_STORAGE.audit,[]);renderAudit();}}); }
async function renderApiStatus(){ const mount=$('#apiStatusMount'); if(!mount)return; try{ const data=await fetchJSON('/api/health'); mount.innerHTML=`<div class="notice">0S workflow API online: ${data.templates.toLocaleString()} records, ${data.categories} categories, version ${esc(data.version)}</div><pre class="source-tree">${esc(JSON.stringify(data,null,2))}</pre>`;}catch(e){ mount.innerHTML=`<div class="notice">SovereignDocs is mounted through the shared 0S gate. Browser tools remain available here; owner workflow APIs are served by <span class="kbd">/api/sovereigndocs</span> when the shared FS27 session is present.</div>`; } }
window.addEventListener('message', event => {
  if(event.origin !== window.location.origin) return;
  if(!['sovereigndocs:skye-return','sovereigndocs:skye-return-local'].includes(event.data?.type)) return;
  mergeVaultRows([skyeReturnVaultRow(event.data.payload, event.data.type.endsWith('local') ? 'local' : 'api')]);
  audit('skye_docx_return_received_message', { type:event.data.type });
  renderVault();
});
document.addEventListener('DOMContentLoaded', () => { renderLibrary().catch(console.error); renderBuilder().catch(console.error); renderGovernance().catch(console.error); renderVault(); renderWorkspace(); renderAudit(); renderApiStatus().catch(console.error); });
