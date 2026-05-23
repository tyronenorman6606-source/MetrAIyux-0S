(() => {
  const params = new URLSearchParams(window.location.search);
  const handoffId = params.get('sd_handoff');
  const localHandoffId = params.get('sd_local_handoff');
  const state = { handoff: null, imported: false };
  const esc = (value = '') => String(value).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  window.METRAIYUX_API_BASES = { sovereigndocs:'/api/sovereigndocs', ...(window.METRAIYUX_API_BASES || {}) };
  function sdApiPath(path){
    const raw = String(path || '');
    if(/^https?:\/\//i.test(raw)) return raw;
    const base = String(window.METRAIYUX_API_BASES.sovereigndocs || '/api/sovereigndocs').replace(/\/+$/,'');
    if(raw === base || raw.startsWith(`${base}/`)) return raw;
    if(raw.startsWith('/api/')) return `${base}${raw.slice('/api'.length)}`;
    return `${base}/${raw.replace(/^\/+/,'')}`;
  }
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
  function readJsonList(key){
    try{
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    }catch{
      return [];
    }
  }
  function writeJsonList(key, entry, limit = 120){
    try{
      const next = [entry, ...readJsonList(key).filter(item => String(item.id || item.handoffId || item.returnId || '') !== String(entry.id || entry.handoffId || entry.returnId || ''))].slice(0, limit);
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    }catch{
      return [];
    }
  }
  function persistBridgeEvent(kind, payload){
    const entry = { id:`sd_bridge_${kind}_${Date.now()}_${Math.random().toString(16).slice(2)}`, kind, ...payload, persistedAt:new Date().toISOString() };
    writeJsonList('sovereigndocs.skyeDocxBridgeEvents', entry, 200);
    return entry;
  }
  async function shareWithZeroOS(payload, apiReturn){
    try{
      const res = await fetch('/api/0s/skye-docx-max/share', {
        method:'POST',
        credentials:'include',
        headers:{ 'content-type':'application/json', accept:'application/json' },
        body:JSON.stringify({
          clientId: payload.metadata?.clientId || payload.metadata?.client_id || 'sovereigndocs',
          workspaceId: payload.metadata?.workspaceId || payload.metadata?.workspace_id || payload.metadata?.workspace || '',
          handoffId: payload.handoffId,
          documentId: apiReturn?.returned?.documentId || payload.activeDocId,
          activeDocId: payload.activeDocId,
          title: payload.title,
          html: payload.html,
          text: payload.text,
          targets:['skyeBlog','skyeDrive','skyeMail'],
          metadata:{ ...(payload.metadata || {}), sovereignDocsReturnId:apiReturn?.returned?.id || null, source:'sovereigndocs-skye-docx-max-bridge' }
        })
      });
      const json = await res.json().catch(() => ({}));
      if(res.ok && json.ok) persistBridgeEvent('shared-0s', { handoffId:payload.handoffId, shareId:json.share?.id || null, title:payload.title });
      return json;
    }catch(error){
      persistBridgeEvent('shared-0s-queued-local', { handoffId:payload.handoffId, title:payload.title, reason:error?.message || String(error) });
      return null;
    }
  }
  function injectPanel(){
    if(document.getElementById('sovereigndocs-bridge-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'sovereigndocs-bridge-panel';
    panel.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:100000;max-width:360px;background:rgba(20,17,36,.96);border:1px solid rgba(255,215,0,.35);box-shadow:0 18px 55px rgba(0,0,0,.45);border-radius:18px;color:#fff;font-family:Inter,system-ui,sans-serif;padding:14px;display:flex;flex-direction:column;gap:10px;';
    panel.innerHTML = `<div style="font-weight:800;color:#FFD700">SovereignDocs ↔ SkyeDocxMax</div><div id="sd-bridge-status" style="font-size:12px;line-height:1.4;color:#c8c4da">${handoffId || localHandoffId ? 'Preparing governed handoff import...' : 'Open from SovereignDocs to import a governed draft.'}</div><div style="font-size:11px;line-height:1.35;color:#9ff0ff">Skye-backed draft. Exports keep the light SKYESOVERLONDON watermark and boundary notice.</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="sd-bridge-return" style="border:0;border-radius:12px;background:#FFD700;color:#120d1d;font-weight:800;padding:9px 11px;cursor:pointer">Return edited package</button><button id="sd-bridge-hide" style="border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(255,255,255,.08);color:#fff;font-weight:800;padding:9px 11px;cursor:pointer">Hide</button></div>`;
    document.body.appendChild(panel);
    document.getElementById('sd-bridge-hide')?.addEventListener('click', () => panel.remove());
    document.getElementById('sd-bridge-return')?.addEventListener('click', () => returnToSovereignDocs().catch(err => setStatus(err.message || String(err))));
  }
  function setStatus(message){
    const el = document.getElementById('sd-bridge-status');
    if(el) el.textContent = message;
  }
  async function importHandoff(){
    if((!handoffId && !localHandoffId) || state.imported) return;
    injectPanel();
    if(localHandoffId){
      setStatus('Loading local SovereignDocs handoff...');
      const localKey = `sovereigndocs.localSkyeHandoff.${localHandoffId}`;
      const raw = sessionStorage.getItem(localKey) || localStorage.getItem(localKey);
      if(!raw) throw new Error('Unable to load local SovereignDocs handoff.');
      state.handoff = JSON.parse(raw);
    } else {
      setStatus('Fetching SovereignDocs handoff...');
      const res = await fetch(sdApiPath(`/api/editor/skye-docx-max/session/${encodeURIComponent(handoffId)}`), { headers:{ accept:'application/json' } });
      const json = await res.json().catch(() => ({}));
      if(!res.ok || !json.handoff) throw new Error(json.error || 'Unable to load SovereignDocs handoff.');
      state.handoff = json.handoff;
    }
    const app = await waitForApp();
    const html = state.handoff.html || markdownToHtml(state.handoff.markdown || '');
    const title = state.handoff.title || 'SovereignDocs Document';
    setStatus(`Importing ${title}…`);
    const docId = await app.createDoc(title, html, null);
    state.imported = true;
    try{ localStorage.setItem('sovereigndocs.lastSkyeHandoff', JSON.stringify({ handoffId:state.handoff.id || handoffId || localHandoffId, docId, title, importedAt:new Date().toISOString() })); }catch{}
    writeJsonList('sovereigndocs.skyeDocxHandoffs', { handoffId:state.handoff.id || handoffId || localHandoffId, docId, title, mode:handoffId ? 'api' : 'local', importedAt:new Date().toISOString(), metadata:state.handoff.metadata || {} });
    persistBridgeEvent('imported', { handoffId:state.handoff.id || handoffId || localHandoffId, docId, title, mode:handoffId ? 'api' : 'local' });
    if(handoffId) await fetch(sdApiPath(`/api/editor/skye-docx-max/session/${encodeURIComponent(handoffId)}/opened`), { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ activeDocId:docId }) }).catch(() => null);
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
      handoffId: state.handoff?.id || handoffId || localHandoffId,
      activeDocId: active.id || app.activeDocId || null,
      title: active.title || state.handoff?.title || 'SkyeDocxMax Return',
      html,
      text,
      metadata:{ returnedFrom:'bundled-skye-docx-max', url:window.location.pathname, returnedAt:new Date().toISOString() }
    };
    if(!payload.handoffId) throw new Error('No SovereignDocs handoff ID is attached to this editor session.');
    if(localHandoffId && !handoffId){
      try{ localStorage.setItem(`sovereigndocs.localSkyeReturn.${localHandoffId}`, JSON.stringify(payload)); }catch{}
      writeJsonList('sovereigndocs.skyeDocxReturns', { ...payload, mode:'local', returnId:payload.handoffId, storedAt:new Date().toISOString() });
      persistBridgeEvent('returned-local', { handoffId:payload.handoffId, activeDocId:payload.activeDocId, title:payload.title });
      await shareWithZeroOS(payload, null);
      setStatus('Saved edited package locally. API return requires the 0S-mounted route.');
      toast('Edited package saved locally for SovereignDocs.');
      try{ window.opener?.postMessage({ type:'sovereigndocs:skye-return-local', payload }, window.location.origin); }catch{}
      return;
    }
    setStatus('Returning edited package to SovereignDocs…');
    const res = await fetch(sdApiPath('/api/editor/skye-docx-max/return'), { method:'POST', headers:{ 'content-type':'application/json', accept:'application/json' }, body:JSON.stringify(payload) });
    const json = await res.json().catch(() => ({}));
    if(!res.ok || !json.ok) throw new Error(json.error || 'SovereignDocs return endpoint rejected the editor package.');
    writeJsonList('sovereigndocs.skyeDocxReturns', { ...payload, ...json.returned, mode:'api', storedAt:new Date().toISOString() });
    persistBridgeEvent('returned-api', { handoffId:payload.handoffId, activeDocId:payload.activeDocId, title:payload.title, returnId:json.returned?.id || null, documentId:json.returned?.documentId || null, vaultRecordId:json.returned?.vaultRecordId || null });
    await shareWithZeroOS(payload, json);
    setStatus(`Returned to SovereignDocs. Return ID: ${json.returned?.id || 'created'}`);
    toast('Edited package returned to SovereignDocs.');
    try{ window.opener?.postMessage({ type:'sovereigndocs:skye-return', payload:json }, window.location.origin); }catch{}
  }
  window.SovereignDocsSkyeBridge = { importHandoff, returnToSovereignDocs, state };
  window.addEventListener('load', () => {
    injectPanel();
    if(handoffId || localHandoffId) setTimeout(() => importHandoff().catch(err => setStatus(err.message || String(err))), 700);
  });
})();
