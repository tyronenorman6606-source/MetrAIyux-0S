
function mediaApiBase(){
  const configured = window.METRAIYUX_API_BASES?.media;
  if(configured) return String(configured).replace(/\/+$/,'');
  if(/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)) return '/.netlify/functions';
  return '/api/media';
}
const API = mediaApiBase();
function mediaApiPath(name){
  const functionName = String(name || '').replace(/^\/+/,'');
  if(API.includes('/.netlify/functions')) return `${API}/${functionName}`;
  const routes = {
    'media-assets':'assets',
    'media-file':'file',
    'media-publish':'publish',
    'media-search':'search',
    'media-stats':'stats',
    'skygate-session':'session'
  };
  return `${API}/${routes[functionName] || functionName}`;
}
const view = document.body.dataset.view || 'nerve';
const page = document.body.dataset.page || 'index.html';
const stateKey = 'skye-media-center:p3-experience';
const typeIcons = { image:'🖼️', video:'🎞️', audio:'🎧', document:'📄', other:'◈' };
const demoAssets = [
  {title:'Gold pressure hero loop', filename:'pressure-loop.mp4', type:'video', status:'draft', fileSize:9300000, tags:['hero','campaign']},
  {title:'Valley launch stills', filename:'valley-stills.zip', type:'image', status:'published', fileSize:14000000, tags:['local','brand']},
  {title:'Proof packet intro', filename:'proof-intro.pdf', type:'document', status:'active', fileSize:820000, tags:['proof','sales']},
  {title:'Audio bed one', filename:'ambient-bed.wav', type:'audio', status:'scheduled', fileSize:5200000, tags:['audio','drop']},
];
const runtimeTiles = [
  ['Asset Intake',mediaApiPath('media-assets'),'upload, list, review, execution, dispatch'],
  ['Search Vector',mediaApiPath('media-search'),'keyword relevance over stored assets'],
  ['Publish Queue',mediaApiPath('media-publish'),'web, social, email target queue'],
  ['File Delivery',mediaApiPath('media-file'),'protected file serving'],
  ['Stats Pulse',mediaApiPath('media-stats'),'operator-only storage and recent upload metrics'],
  ['SkyGate Session',mediaApiPath('skygate-session'),'FS27/SkyGate bearer verification for Free99 access'],
];
const readState = () => JSON.parse(localStorage.getItem(stateKey) || '{"checks":[],"theme":"reactor"}');
const writeState = (next) => localStorage.setItem(stateKey, JSON.stringify(next));
async function requireGateSession(){ if(window.SkyeMediaGate?.requireSession) return window.SkyeMediaGate.requireSession(); return null; }
function gateHeaders(){ return window.SkyeMediaGate?.headers?.() || {}; }
function fmtBytes(b){ if(!b) return '0 B'; if(b<1024) return b+' B'; if(b<1048576) return (b/1024).toFixed(1)+' KB'; return (b/1048576).toFixed(1)+' MB'; }
function escapeHtml(value){ return String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function toast(message){ const old=document.querySelector('.toast'); if(old) old.remove(); const el=document.createElement('div'); el.className='toast'; el.textContent=message; document.body.appendChild(el); setTimeout(()=>el.remove(),2600); }
function routeActive(){ document.querySelectorAll('.command-nav a').forEach(a=>a.classList.toggle('active', a.getAttribute('href').endsWith(page))); }
async function fetchJson(url, opts={}){ const headers = {...(opts.headers || {}), ...gateHeaders()}; const res = await fetch(url, {...opts, headers}); if(!res.ok) throw new Error(url+' returned '+res.status); return res.json(); }
async function loadRuntime(){
  let stats = null; let assets = [];
  try { const listed = await fetchJson(`${mediaApiPath('media-assets')}?action=list`); assets = Array.isArray(listed.assets) ? listed.assets : []; } catch {}
  try { stats = await fetchJson(mediaApiPath('media-stats')); } catch {}
  const records = assets.length ? assets : demoAssets;
  const total = stats?.totalAssets ?? assets.length;
  const byStatus = stats?.byStatus || records.reduce((acc,a)=>{acc[a.status]=(acc[a.status]||0)+1; return acc;},{});
  const totalSize = stats?.totalFileSize ?? records.reduce((sum,a)=>sum+(Number(a.fileSize)||0),0);
  document.getElementById('core-total-assets').textContent = String(total || records.length);
  document.getElementById('signal-size').textContent = fmtBytes(totalSize);
  document.getElementById('signal-drafts').textContent = String(byStatus.draft || 0);
  document.getElementById('signal-published').textContent = String(byStatus.published || 0);
  document.getElementById('signal-search').textContent = assets.length ? 'live' : 'demo';
  document.getElementById('runtime-state').textContent = assets.length || stats ? 'Live API' : 'Static Ready';
  return {records,total,byStatus,totalSize,stats};
}
function shell(title, label, body, aside=''){
  return `<section class="lens-grid"><article class="lens-card"><span class="lens-label">${label}</span><h2>${title}</h2>${body}</article><aside class="control-card">${aside}</aside></section>`;
}
function assetRows(records){
  return `<div class="asset-table">${records.slice(0,8).map(a=>`<div class="asset-row"><span class="asset-icon">${typeIcons[a.type]||typeIcons.other}</span><div><b>${escapeHtml(a.title||a.filename||'Untitled asset')}</b><small>${escapeHtml(a.filename||'')} · ${fmtBytes(a.fileSize)} · ${(a.tags||[]).slice(0,3).map(escapeHtml).join(' / ')}</small></div><span class="status-chip">${escapeHtml(a.status||'draft')}</span></div>`).join('')}</div>`;
}
function constellation(records){
  const positions = [[22,30],[48,19],[75,33],[62,62],[31,68],[84,74]];
  return `<div class="media-constellation">${records.slice(0,6).map((a,i)=>`<div class="node" style="left:${positions[i][0]}%;top:${positions[i][1]}%;animation-delay:${i*.23}s"><b>${typeIcons[a.type]||'◈'}</b><span>${escapeHtml(a.status||'asset')}</span></div>`).join('')}</div>`;
}
function flowLanes(data){
  const labels = [['draft','Intake'],['approved','Review'],['active','Execution'],['published','Dispatch']];
  return `<div class="flow-lanes">${labels.map(([status,label])=>`<div class="flow-lane"><h3>${label}</h3><span class="status-chip">${status}</span><div class="pill-list">${data.records.filter(a => (a.review?.status===status)||(a.execution?.status===status)||(a.dispatch?.status===status)||(a.status===status)).slice(0,5).map(a=>`<span class="pill">${escapeHtml(a.title||a.filename)}<br><small>${escapeHtml(a.filename||'')}</small></span>`).join('') || '<span class="pill">No live items in this lane yet.</span>'}</div></div>`).join('')}</div>`;
}
function runtimeMap(){ return `<div class="runtime-map">${runtimeTiles.map(([name,url,desc])=>`<div class="runtime-tile"><span class="data-kicker">function lane</span><h3>${name}</h3><code>${url}</code><p>${desc}</p></div>`).join('')}</div>`; }
function proofList(){
  const proofs = ['Static surfaces are routed as real pages, not a single inert card stack.','Upload, search, publish, review, execution, dispatch, stats, and session functions are preserved.','Browser token storage remains session scoped through skygate-auth.js.','0S Cloudflare Worker production adapter serves the media API routes with KV storage.','Free99 means no charge, while FS27/SkyGate bearer introspection still gates every media action.'];
  return `<div class="proof-list">${proofs.map(p=>`<div class="proof-item"><span>✅</span><div>${p}</div></div>`).join('')}</div>`;
}
async function render(){
  routeActive();
  const data = await loadRuntime();
  const stage = document.getElementById('view-stage');
  if(view === 'nerve'){
    stage.innerHTML = shell('The media center is now an instrument, not a dashboard.', 'command cortex', `<p>This platform turns media intake into a spatial control surface. Operators can enter through the public intake portal, jump into the operator theater, inspect runtime routes, and see asset motion as signals instead of dead cards.</p>${constellation(data.records)}`, `<span class="data-kicker">live read</span><h2>${data.records.length}</h2><p>records rendered from the media assets endpoint when available, with demo matter used only when the API has no records.</p><a href="./public/index.html">Launch Intake</a>`);
  } else if(view === 'atlas'){
    stage.innerHTML = shell('Signal Atlas turns the library into an orbital asset map.', 'asset atlas', `${constellation(data.records)}`, `<h2>Recent Matter</h2>${assetRows(data.records)}`);
  } else if(view === 'flows'){
    stage.innerHTML = shell('The pipeline is staged as a reactor with four visible energy lanes.', 'workflow reactor', `${flowLanes(data)}`, `<h2>Operator Theater</h2><p>Review, execution, dispatch, and timeline controls live in the protected operator surface.</p><a href="./public/admin.html">Open Flow Controls</a>`);
  } else if(view === 'vault'){
    stage.innerHTML = shell('Vault Loom renders records as usable media matter.', 'records lattice', `${assetRows(data.records)}`, `<h2>Search Path</h2><p>Public list and search remain available from the media functions. Draft file access stays protected until publish.</p><button data-command="search-proof">Run Search Pulse</button>`);
  } else if(view === 'runtime'){
    stage.innerHTML = shell('Runtime Spine keeps the production media routes visible.', 'runtime spine', runtimeMap(), `<h2>Launch Targets</h2><p>Public intake, operator theater, worker smoke, and contract files are linked from the rebuilt command surface.</p><a href="./smoke/smoke-proof.mjs">Open Smoke Proof</a>`);
  } else if(view === 'proof'){
    stage.innerHTML = shell('Proof Forge separates what is verified from what still needs hosted proof.', 'proof forge', proofList(), `<h2>Truth Files</h2><p>PLATFORM_TRUTH.json, PROOF_STATUS.md, and docs/PLATFORM_STATUS.md were kept and refreshed for this build.</p><a href="./PLATFORM_TRUTH.json">Open Truth Marker</a>`);
  } else {
    const local = readState();
    stage.innerHTML = shell('Control Core stores operator preferences and check receipts locally.', 'control core', `<div class="proof-list"><div class="proof-item"><span>◈</span><div>Theme lane: ${escapeHtml(local.theme || 'reactor')}</div></div>${(local.checks||[]).slice(0,8).map(c=>`<div class="proof-item"><span>✅</span><div>${escapeHtml(c.action)} checked from ${escapeHtml(c.page)}<br><small>${escapeHtml(c.at)}</small></div></div>`).join('') || '<div class="proof-item"><span>☐</span><div>No browser-local check receipts yet.</div></div>'}</div>`, `<h2>Reset Surface</h2><p>Clears only local UI receipts. Runtime asset storage is untouched.</p><button data-command="reset-local">Reset Local Receipts</button>`);
  }
}
document.addEventListener('click', async (event)=>{
  const target = event.target.closest('[data-command]');
  if(!target) return;
  const cmd = target.dataset.command;
  if(cmd === 'mark-check'){
    const st = readState();
    st.checks.unshift({action:target.dataset.action || 'unknown', page, at:new Date().toISOString()});
    st.checks = st.checks.slice(0,40); writeState(st); target.textContent='Checked ✓'; toast('Recorded browser-local check receipt.');
  }
  if(cmd === 'sync-runtime'){ await render(); toast('Runtime pulse synced.'); }
  if(cmd === 'reset-local'){ writeState({checks:[],theme:'reactor'}); await render(); toast('Local receipts cleared.'); }
  if(cmd === 'search-proof'){
    try{ const res = await fetchJson(`${mediaApiPath('media-search')}?q=proof`); toast(`Search pulse returned ${Array.isArray(res.results)?res.results.length:0} hits.`); }catch{ toast('Search pulse could not reach API in this environment.'); }
  }
});
document.addEventListener('pointermove', (e)=>{ document.querySelectorAll('.lens-card,.control-card').forEach(card=>{ const r=card.getBoundingClientRect(); card.style.setProperty('--x', `${e.clientX-r.left}px`); card.style.setProperty('--y', `${e.clientY-r.top}px`); }); });
requireGateSession().then(render);
