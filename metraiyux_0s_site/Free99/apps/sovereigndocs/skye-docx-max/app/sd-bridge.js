(() => {
  const params = new URLSearchParams(window.location.search);
  const handoffId = params.get('sd_handoff');
  const state = { handoff: null, imported: false };
  const esc = (value = '') => String(value).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function markdownToHtml(markdown = ''){
    const lines = String(markdown || '').split(/\r?\n/);
    let html = '';
    let inList = false;
    for(const line of lines){
      const trimmed = line.trim();
      if(trimmed.startsWith('- ')){
        if(!inList){ html += '<ul>'; inList = true; }
        html += `<li>${esc(trimmed.slice(2))}</li>`;
        continue;
      }
      if(inList){ html += '</ul>'; inList = false; }
      if(!trimmed){ html += '<p><br></p>'; continue; }
      if(trimmed.startsWith('### ')) html += `<h3>${esc(trimmed.slice(4))}</h3>`;
      else if(trimmed.startsWith('## ')) html += `<h2>${esc(trimmed.slice(3))}</h2>`;
      else if(trimmed.startsWith('# ')) html += `<h1>${esc(trimmed.slice(2))}</h1>`;
      else html += `<p>${esc(trimmed)}</p>`;
    }
    if(inList) html += '</ul>';
    return html || '<p><br></p>';
  }
  function waitForApp(timeoutMs = 15000){
    const started = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        if(window.App && window.App.quill && typeof window.App.createDoc === 'function') return resolve(window.App);
        if(Date.now() - started > timeoutMs) return reject(new Error('SkyeDocxMax runtime did not become ready.'));
        setTimeout(tick, 200);
      };
      tick();
    });
  }
  function toast(message){
    try{ window.App?.showToast?.(message); }catch{}
    console.log('[SovereignDocs bridge]', message);
  }
  function injectPanel(){
    if(document.getElementById('sovereigndocs-bridge-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'sovereigndocs-bridge-panel';
    panel.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:100000;max-width:360px;background:rgba(20,17,36,.96);border:1px solid rgba(255,215,0,.35);box-shadow:0 18px 55px rgba(0,0,0,.45);border-radius:18px;color:#fff;font-family:Inter,system-ui,sans-serif;padding:14px;display:flex;flex-direction:column;gap:10px;';
    panel.innerHTML = `<div style="font-weight:800;color:#FFD700">SovereignDocs ↔ SkyeDocxMax</div><div id="sd-bridge-status" style="font-size:12px;line-height:1.4;color:#c8c4da">${handoffId ? 'Preparing governed handoff import…' : 'Open from SovereignDocs to import a governed draft.'}</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="sd-bridge-return" style="border:0;border-radius:12px;background:#FFD700;color:#120d1d;font-weight:800;padding:9px 11px;cursor:pointer">Return edited package</button><button id="sd-bridge-hide" style="border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.08);color:#fff;font-weight:800;padding:9px 11px;cursor:pointer">Hide</button></div>`;
    document.body.appendChild(panel);
    document.getElementById('sd-bridge-hide')?.addEventListener('click', () => panel.remove());
    document.getElementById('sd-bridge-return')?.addEventListener('click', () => returnToSovereignDocs().catch(err => setStatus(err.message || String(err))));
  }
  function setStatus(message){
    const el = document.getElementById('sd-bridge-status');
    if(el) el.textContent = message;
  }
  async function importHandoff(){
    if(!handoffId || state.imported) return;
    injectPanel();
    setStatus('Fetching SovereignDocs handoff…');
    const res = await fetch(`/api/editor/skye-docx-max/session/${encodeURIComponent(handoffId)}`, { headers:{ accept:'application/json' } });
    const json = await res.json().catch(() => ({}));
    if(!res.ok || !json.handoff) throw new Error(json.error || 'Unable to load SovereignDocs handoff.');
    state.handoff = json.handoff;
    const app = await waitForApp();
    const html = state.handoff.html || markdownToHtml(state.handoff.markdown || '');
    const title = state.handoff.title || 'SovereignDocs Document';
    setStatus(`Importing ${title}…`);
    const docId = await app.createDoc(title, html, null);
    state.imported = true;
    try{ localStorage.setItem('sovereigndocs.lastSkyeHandoff', JSON.stringify({ handoffId, docId, title, importedAt:new Date().toISOString() })); }catch{}
    await fetch(`/api/editor/skye-docx-max/session/${encodeURIComponent(handoffId)}/opened`, { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ activeDocId:docId }) }).catch(() => null);
    setStatus(`Imported ${title}. Edit here, then return the edited package to SovereignDocs.`);
    toast('SovereignDocs handoff imported into SkyeDocxMax.');
  }
  async function returnToSovereignDocs(){
    injectPanel();
    const app = await waitForApp();
    await app.saveCurrentDoc?.();
    const active = app.getActiveDocRecord?.() || {};
    const html = String(app.quill?.root?.innerHTML || active.content || '').trim();
    const text = String(app.quill?.getText?.() || '').trim();
    const payload = {
      handoffId: state.handoff?.id || handoffId,
      activeDocId: active.id || app.activeDocId || null,
      title: active.title || state.handoff?.title || 'SkyeDocxMax Return',
      html,
      text,
      metadata:{ returnedFrom:'bundled-skye-docx-max', url:window.location.pathname, returnedAt:new Date().toISOString() }
    };
    if(!payload.handoffId) throw new Error('No SovereignDocs handoff ID is attached to this editor session.');
    setStatus('Returning edited package to SovereignDocs…');
    const res = await fetch('/api/editor/skye-docx-max/return', { method:'POST', headers:{ 'content-type':'application/json', accept:'application/json' }, body:JSON.stringify(payload) });
    const json = await res.json().catch(() => ({}));
    if(!res.ok || !json.ok) throw new Error(json.error || 'SovereignDocs return endpoint rejected the editor package.');
    setStatus(`Returned to SovereignDocs. Return ID: ${json.returned?.id || 'created'}`);
    toast('Edited package returned to SovereignDocs.');
    try{ window.opener?.postMessage({ type:'sovereigndocs:skye-return', payload:json }, window.location.origin); }catch{}
  }
  window.SovereignDocsSkyeBridge = { importHandoff, returnToSovereignDocs, state };
  window.addEventListener('load', () => {
    injectPanel();
    if(handoffId) setTimeout(() => importHandoff().catch(err => setStatus(err.message || String(err))), 700);
  });
})();
