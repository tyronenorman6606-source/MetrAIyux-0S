const ContentEngineLane = (() => {
  const defaultWorkerOrigin = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let articles = [];
  let selectedPackage = null;

  function endpoint(){
    return (localStorage.getItem('adminBrainEndpoint') || defaultWorkerOrigin).replace(/\/$/, '');
  }

  function token(){
    return window.SkygateAuthBridge?.token?.() || sessionStorage.getItem('adminBrainToken') || '';
  }

  function authHeaders(extra = {}){
    return window.SkygateAuthBridge?.authHeaders ? window.SkygateAuthBridge.authHeaders(extra) : {...extra, ...(token() ? {authorization:`Bearer ${token()}`} : {})};
  }

  function selectedArticle(){
    return articles.find((article) => article.slug === $('articleSelect')?.value) || articles[0] || null;
  }

  function channels(){
    return [...document.querySelectorAll('[data-channel]')]
      .filter((input) => input.checked)
      .map((input) => input.dataset.channel);
  }

  function setOutput(value){
    const box = $('contentEngineOutput');
    if (!box) return;
    box.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  }

  function renderStatus(connectorData = null){
    const gateReady = window.SkygateAuthBridge?.token?.() ? 'FS27 token loaded' : 'FS27 token not loaded';
    const connectors = connectorData?.connectors || [];
    const configured = connectors.filter((connector) => connector.configured).length;
    $('contentEngineStatus').innerHTML = [
      `<span class="status-pill">Worker mode</span>`,
      `<span class="status-pill">${gateReady}</span>`,
      `<span class="status-pill">${articles.length || 0} articles loaded</span>`,
      `<span class="status-pill">${connectors.length ? `${configured}/${connectors.length} connectors configured` : 'Connector status pending'}</span>`
    ].join('');
    if ($('endpointInput')) $('endpointInput').value = endpoint();
  }

  function renderArticles(){
    const select = $('articleSelect');
    if (!select) return;
    select.innerHTML = articles.map((article) => `<option value="${esc(article.slug)}">${esc(article.title)}</option>`).join('');
    renderArticlePreview();
  }

  function renderArticlePreview(){
    const article = selectedArticle();
    const box = $('articlePreview');
    if (!box) return;
    if (!article) {
      box.textContent = 'Load the article engine first.';
      return;
    }
    const routes = (article.directAppRoutes || []).slice(0, 6).map((route) => `- ${route.title}: ${route.route || ''}\n  ${route.use || ''}`).join('\n');
    box.textContent = `${article.title}\n\n${article.subtitle || article.marketingUse || ''}\n\nAudience: ${article.audience || ''}\nProof rule: ${article.proofRule || ''}\n\nDirect app routes:\n${routes}`;
  }

  function renderRuns(runs = []){
    const box = $('runList');
    if (!box) return;
    box.innerHTML = runs.map((run) => `<article>
      <b>${esc(run.article_title || run.article?.title || run.id)}</b>
      <span>${esc(run.status || '')} · ${esc(run.created_at || '')}</span>
      <p>${esc(run.article_slug || '')}</p>
      <button class="admin-btn secondary" data-run-id="${esc(run.id)}" type="button">Open Run</button>
    </article>`).join('') || '<p>No Worker runs found.</p>';
    box.querySelectorAll('[data-run-id]').forEach((button) => button.addEventListener('click', () => loadRun(button.dataset.runId)));
  }

  function renderSelectedPackage(data){
    selectedPackage = data;
    const box = $('selectedRun');
    if (!box) return;
    if (!data?.run) {
      box.innerHTML = '<p>No package selected.</p>';
      return;
    }
    const assets = data.assets || data.run.package?.assets || [];
    const events = data.connector_events || [];
    box.innerHTML = [
      `<article class="admin-card"><h3>${esc(data.run.article_title || data.run.article?.title || 'Content engine run')}</h3><p>${esc(data.run.status || '')} · ${esc(data.run.id)}</p><p>${esc(data.run.article_slug || '')}</p></article>`,
      ...assets.map((asset) => `<article class="admin-card">
        <h3>${esc(asset.title || asset.asset_type || asset.type)}</h3>
        <p>${esc(asset.destination || '')} ${asset.platform ? `· ${esc(asset.platform)}` : ''}</p>
        <pre class="mini-pre">${esc(asset.content || JSON.stringify(asset.payload || {}, null, 2)).slice(0, 1200)}</pre>
      </article>`),
      `<article class="admin-card"><h3>Connector Events</h3><p>${events.length} event(s)</p><pre class="mini-pre">${esc(JSON.stringify(events.map((event) => ({id:event.id, type:event.connector_type, action:event.action, status:event.status})), null, 2))}</pre></article>`
    ].join('');
    setOutput(data);
  }

  async function api(path, options = {}){
    const res = await fetch(endpoint() + path, {
      ...options,
      headers:authHeaders({'content-type':'application/json', ...(options.headers || {})})
    });
    const data = await res.json().catch(() => ({ok:false, error:'Invalid Worker response'}));
    if (!res.ok || data.error) throw new Error(data.error || `Worker returned ${res.status}`);
    return data;
  }

  async function loadArticles(){
    const data = await fetch('../blog/content-engine.json').then((res) => {
      if (!res.ok) throw new Error(`Article engine returned ${res.status}`);
      return res.json();
    });
    articles = data.articles || [];
    renderArticles();
    renderStatus();
    setOutput({ok:true, loaded_articles:articles.length, generatedAt:data.generatedAt});
  }

  async function loadConnectorStatus(){
    if (!token()) {
      renderStatus();
      setOutput({ok:true, warning:'Connector status locked until an admin token is validated. No protected Worker request was sent.'});
      return null;
    }
    const data = await api('/api/admin/connectors/status', {method:'GET'});
    renderStatus(data);
    return data;
  }

  async function activateRun(){
    const article = selectedArticle();
    if (!article) throw new Error('Load and select an article first.');
    const data = await api('/api/admin/content-engine/activate', {
      method:'POST',
      body:JSON.stringify({article, channels:channels()})
    });
    renderSelectedPackage(data);
    await loadRuns().catch(() => null);
  }

  async function loadRuns(){
    const data = await api('/api/admin/content-engine/runs', {method:'GET'});
    renderRuns(data.runs || []);
    setOutput(data);
    return data;
  }

  async function loadRun(runId){
    const data = await api(`/api/admin/content-engine/run?id=${encodeURIComponent(runId)}`, {method:'GET'});
    renderSelectedPackage(data);
  }

  async function approveDispatch(){
    const runId = selectedPackage?.run?.id;
    if (!runId) throw new Error('Open or create a run first.');
    const data = await api('/api/admin/content-engine/dispatch', {
      method:'POST',
      body:JSON.stringify({run_id:runId, approved:true, notes:'Approved from Content Engine Lane admin page.'})
    });
    renderSelectedPackage({...data, assets:selectedPackage.assets || [], connector_events:data.dispatches?.map((item) => item.event).filter(Boolean) || selectedPackage.connector_events || []});
    await loadRun(runId).catch(() => null);
  }

  async function loadBrainFeed(){
    const data = await api('/api/admin/content-engine/local-brain-feed', {method:'GET'});
    setOutput(data);
  }

  function exportPackage(){
    if (!selectedPackage) throw new Error('No package selected.');
    const blob = new Blob([JSON.stringify(selectedPackage, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `content-engine-package-${selectedPackage.run?.article_slug || Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handle(buttonId, fn){
    $(buttonId)?.addEventListener('click', () => fn().catch((error) => setOutput({ok:false, error:error.message})));
  }

  function bind(){
    $('articleSelect')?.addEventListener('change', renderArticlePreview);
    $('saveEndpoint')?.addEventListener('click', () => {
      const value = $('endpointInput').value.trim();
      if (value) localStorage.setItem('adminBrainEndpoint', value);
      else localStorage.removeItem('adminBrainEndpoint');
      renderStatus();
    });
    $('saveToken')?.addEventListener('click', async () => {
      if (window.SkygateAuthBridge) await window.SkygateAuthBridge.saveTokenFromInput('tokenInput', 'skygateAuthStatus');
      else sessionStorage.setItem('adminBrainToken', $('tokenInput').value.trim());
      renderStatus();
    });
    handle('loadArticles', loadArticles);
    handle('activateRun', activateRun);
    handle('loadRuns', loadRuns);
    handle('loadBrainFeed', loadBrainFeed);
    handle('approveDispatch', approveDispatch);
    handle('exportPackage', () => Promise.resolve(exportPackage()));
  }

  async function boot(){
    renderStatus();
    bind();
    await loadArticles().catch((error) => setOutput({ok:false, error:error.message}));
    await loadConnectorStatus().catch((error) => setOutput({ok:false, warning:'Connector status unavailable until the Worker token is valid.', detail:error.message}));
  }

  return {boot};
})();

document.addEventListener('DOMContentLoaded', () => ContentEngineLane.boot());
