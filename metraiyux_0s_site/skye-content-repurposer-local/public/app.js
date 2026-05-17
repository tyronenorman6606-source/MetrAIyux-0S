const state = {
  sources: [],
  posts: [],
  filteredPosts: [],
  selectedPost: null,
  article: null,
  output: '',
  lastDraft: null,
  drafts: [],
  exports: [],
  queue: [],
  publishLog: [],
  pipeline: null,
  health: null,
  runtime: null,
  accessToken: ''
};

const $ = (selector) => document.querySelector(selector);

const els = {
  scanBtn: $('#scanBtn'),
  scanAllBtn: $('#scanAllBtn'),
  healthBtn: $('#healthBtn'),
  fetchUrlBtn: $('#fetchUrlBtn'),
  extractBtn: $('#extractBtn'),
  clearArticleBtn: $('#clearArticleBtn'),
  generateBtn: $('#generateBtn'),
  saveBtn: $('#saveBtn'),
  copyBtn: $('#copyBtn'),
  downloadBtn: $('#downloadBtn'),
  saveAsBtn: $('#saveAsBtn'),
  localExportBtn: $('#localExportBtn'),
  driveUploadBtn: $('#driveUploadBtn'),
  refreshExportsBtn: $('#refreshExportsBtn'),
  sourceSelect: $('#sourceSelect'),
  manualUrl: $('#manualUrl'),
  postSearch: $('#postSearch'),
  posts: $('#posts'),
  selectedTitle: $('#selectedTitle'),
  sourceLink: $('#sourceLink'),
  articleMeta: $('#articleMeta'),
  articleText: $('#articleText'),
  format: $('#format'),
  audience: $('#audience'),
  keywords: $('#keywords'),
  cta: $('#cta'),
  brandProfile: $('#brandProfile'),
  output: $('#output'),
  outputTitle: $('#outputTitle'),
  drafts: $('#drafts'),
  exportList: $('#exportList'),
  engineStatus: $('#engineStatus'),
  postCount: $('#postCount'),
  draftCount: $('#draftCount'),
  exportStatus: $('#exportStatus'),
  toast: $('#toast'),
  targetChecks: Array.from(document.querySelectorAll('[data-publish-target]')),
  publishAt: $('#publishAt'),
  schedulePublishBtn: $('#schedulePublishBtn'),
  runDueBtn: $('#runDueBtn'),
  rebuildSiteBtn: $('#rebuildSiteBtn'),
  deployNetlifyBtn: $('#deployNetlifyBtn'),
  deployCloudflareBtn: $('#deployCloudflareBtn'),
  refreshQueueBtn: $('#refreshQueueBtn'),
  pipelineStatus: $('#pipelineStatus'),
  queueList: $('#queueList'),
  publishLog: $('#publishLog'),
  accessToken: $('#accessToken'),
  saveAccessTokenBtn: $('#saveAccessTokenBtn'),
  runtimeStatus: $('#runtimeStatus'),
  runAutomationTickBtn: $('#runAutomationTickBtn'),
  backupNowBtn: $('#backupNowBtn'),
  restoreBackupBtn: $('#restoreBackupBtn')
};

boot();

async function boot() {
  bindEvents();
  hydrateLocalSettings();
  await requireGateSession();
  await checkHealth();
  await loadSources();
  await loadDrafts();
  await loadExports();
  await loadPipelineStatus();
  await loadPublishQueue();
  await loadRuntimeStatus();
}

async function requireGateSession() {
  if (!window.SkyeContentGate?.requireSession) {
    const stored = localStorage.getItem('skye-content-forge-access-token') || sessionStorage.getItem('skye-content-forge-access-token') || '';
    state.accessToken = stored.trim();
    if (els.accessToken) els.accessToken.value = state.accessToken;
    return;
  }
  const session = await window.SkyeContentGate.requireSession();
  state.accessToken = session?.token || '';
  if (els.accessToken) els.accessToken.value = state.accessToken;
}


function bindEvents() {
  els.scanBtn.addEventListener('click', () => scanSelectedSource());
  els.scanAllBtn.addEventListener('click', () => scanAllSources());
  els.healthBtn.addEventListener('click', () => checkHealth(true));
  els.fetchUrlBtn.addEventListener('click', () => handleManualLoad());
  els.extractBtn.addEventListener('click', () => extractSelectedArticle());
  els.clearArticleBtn.addEventListener('click', clearArticle);
  els.generateBtn.addEventListener('click', generateAsset);
  els.saveBtn.addEventListener('click', saveCurrentDraft);
  els.copyBtn.addEventListener('click', copyOutput);
  els.downloadBtn.addEventListener('click', downloadMarkdown);
  els.saveAsBtn.addEventListener('click', saveMarkdownWithPicker);
  els.localExportBtn.addEventListener('click', exportLocal);
  els.driveUploadBtn.addEventListener('click', uploadToDrive);
  els.refreshExportsBtn.addEventListener('click', loadExports);
  if (els.accessToken) els.accessToken.value = state.accessToken;
  if (els.saveAccessTokenBtn) els.saveAccessTokenBtn.addEventListener('click', saveAccessToken);
  if (els.runAutomationTickBtn) els.runAutomationTickBtn.addEventListener('click', runAutomationTick);
  if (els.backupNowBtn) els.backupNowBtn.addEventListener('click', backupNow);
  if (els.restoreBackupBtn) els.restoreBackupBtn.addEventListener('click', restoreBackupPreview);
  setDefaultPublishAt();
  els.postSearch.addEventListener('input', filterPosts);
  els.sourceSelect.addEventListener('change', syncManualUrlToSource);

  for (const id of ['format', 'audience', 'keywords', 'cta', 'brandProfile']) {
    els[id].addEventListener('input', persistLocalSettings);
  }
}


function saveAccessToken() {
  state.accessToken = (els.accessToken?.value || '').trim();
  if (state.accessToken && window.SkyeContentGate?.persist) {
    window.SkyeContentGate.persist({
      token: state.accessToken,
      source: 'manual-dashboard-token',
      client: 'Skye Content Forge',
      status: 'free99_gate_session'
    });
  } else if (state.accessToken) {
    localStorage.setItem('skye-content-forge-access-token', state.accessToken);
  } else {
    localStorage.removeItem('skye-content-forge-access-token');
    sessionStorage.removeItem('skye-content-forge-access-token');
    window.SkyeContentGate?.clear?.();
  }
  toast(state.accessToken ? 'Access token saved in this browser.' : 'Access token cleared.');
  checkHealth(true);
}

async function loadRuntimeStatus() {
  if (!els.runtimeStatus) return;
  try {
    const data = await api('/api/runtime/status');
    state.runtime = data;
    renderRuntimeStatus();
  } catch (error) {
    els.runtimeStatus.className = 'publish-status empty-state';
    els.runtimeStatus.textContent = `Could not load runtime status: ${error.message}`;
  }
}

function renderRuntimeStatus() {
  const runtime = state.runtime?.runtime || {};
  const backup = state.runtime?.backup || {};
  els.runtimeStatus.className = 'publish-status';
  const backupText = backup.configured ? `ready · ${backup.backupDir}` : `missing ${backup.missing?.join(', ') || 'GitHub vars'}`;
  els.runtimeStatus.innerHTML = `
    <p><strong>Runtime:</strong> ${runtime.mode || 'development'} · <strong>Uptime:</strong> ${runtime.uptimeSeconds || 0}s · <strong>Process:</strong> ${runtime.processManager || 'node'}</p>
    <p><strong>Autorun:</strong> ${runtime.publisherAutorun ? 'enabled' : 'off'} · <strong>Scheduler endpoint:</strong> ${runtime.schedulerEndpoint || '/api/automation/tick'} · <strong>Poll:</strong> ${runtime.pollSeconds || 900}s</p>
    <p><strong>Backup:</strong> ${backupText} · <strong>Auto backup on tick:</strong> ${backup.autoBackupOnTick ? 'enabled' : 'off'}</p>
  `;
}

async function runAutomationTick() {
  setBusy(els.runAutomationTickBtn, true, 'Running…');
  try {
    const data = await api('/api/automation/tick', { method: 'POST', body: { source: 'dashboard', backup: true } });
    await loadPublishQueue();
    await loadRuntimeStatus();
    toast(`Automation tick complete. Processed ${data.publisher?.processedCount || 0} item(s).`);
  } catch (error) {
    toast(error.message, true);
  } finally {
    setBusy(els.runAutomationTickBtn, false, 'Run Scheduler Tick');
  }
}

async function backupNow() {
  setBusy(els.backupNowBtn, true, 'Backing up…');
  try {
    const data = await api('/api/backup/github', { method: 'POST', body: {} });
    await loadRuntimeStatus();
    toast(`GitHub backup complete: ${data.backup?.files?.length || 0} file(s), ${data.backup?.counts?.drafts || 0} draft(s).`);
  } catch (error) {
    toast(error.message, true);
  } finally {
    setBusy(els.backupNowBtn, false, 'Backup to GitHub');
  }
}

async function restoreBackupPreview() {
  setBusy(els.restoreBackupBtn, true, 'Checking…');
  try {
    const preview = await api('/api/backup/github/restore', { method: 'POST', body: { apply: false } });
    const counts = preview.restore?.counts || {};
    const apply = confirm(`Backup found from ${preview.restore?.snapshotCreatedAt || 'unknown time'}. Drafts: ${counts.drafts || 0}, Queue: ${counts.publishQueue || 0}, Logs: ${counts.publishLog || 0}. Apply this restore now?`);
    if (!apply) return toast('Restore preview loaded. No files changed.');
    const restored = await api('/api/backup/github/restore', { method: 'POST', body: { apply: true } });
    await Promise.all([loadDrafts(), loadPublishQueue(), loadRuntimeStatus()]);
    toast(`Restore applied from ${restored.restore?.sourcePath}.`);
  } catch (error) {
    toast(error.message, true);
  } finally {
    setBusy(els.restoreBackupBtn, false, 'Restore from GitHub');
  }
}


async function loadPipelineStatus() {
  if (!els.pipelineStatus) return;
  try {
    const data = await api('/api/pipeline/status');
    state.pipeline = data.status;
    renderPipelineStatus();
  } catch (error) {
    els.pipelineStatus.className = 'publish-status empty-state';
    els.pipelineStatus.textContent = `Could not load publisher status: ${error.message}`;
  }
}

function renderPipelineStatus() {
  const targets = state.pipeline?.targets || {};
  const rows = Object.entries(targets).map(([key, value]) => {
    const configured = value.configured ? 'ready' : 'missing';
    const missing = value.missing?.length ? ` — ${value.missing.join(', ')}` : '';
    return `<div class="target-status ${value.configured ? 'ok' : 'warn'}"><strong>${labelTarget(key)}</strong><span>${configured}${missing}</span></div>`;
  }).join('');
  els.pipelineStatus.className = 'publish-status';
  els.pipelineStatus.innerHTML = `<p><strong>Autorun:</strong> ${state.pipeline?.autorun ? 'enabled' : 'manual'} · <strong>Poll:</strong> ${state.pipeline?.pollSeconds || 900}s · <strong>Static build:</strong> ${state.pipeline?.staticSiteDir || 'site-build'}</p>${rows}`;
}

function setDefaultPublishAt() {
  if (!els.publishAt) return;
  const now = new Date(Date.now() + 10 * 60 * 1000);
  now.setSeconds(0, 0);
  els.publishAt.value = toLocalInputValue(now);
}

function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function selectedPublishTargets() {
  const checked = (els.targetChecks || []).filter((box) => box.checked).map((box) => box.dataset.publishTarget);
  return checked.length ? checked : ['local'];
}

async function scheduleCurrentOutput() {
  if (!state.output.trim()) return toast('Generate or load a draft first.', true);
  setBusy(els.schedulePublishBtn, true, 'Scheduling…');
  try {
    const body = {
      draftId: state.lastDraft?.id || '',
      title: currentOutputTitle(),
      output: state.output,
      sourceUrl: state.article?.url || state.selectedPost?.url || els.manualUrl.value,
      sourceTitle: state.article?.title || state.selectedPost?.title || '',
      sourceName: state.article?.sourceName || state.selectedPost?.source || '',
      format: els.format.value,
      targets: selectedPublishTargets(),
      publishAt: els.publishAt?.value ? new Date(els.publishAt.value).toISOString() : new Date().toISOString()
    };
    const data = await api('/api/publish/schedule', { method: 'POST', body });
    await loadPublishQueue();
    toast(`Scheduled “${data.item.title}” for ${new Date(data.item.publishAt).toLocaleString()}.`);
  } catch (error) {
    toast(error.message, true);
  } finally {
    setBusy(els.schedulePublishBtn, false, 'Schedule Publish');
  }
}

async function runDuePublisher() {
  setBusy(els.runDueBtn, true, 'Publishing…');
  try {
    const data = await api('/api/publish/run', { method: 'POST', body: { mode: 'due' } });
    await loadPublishQueue();
    await loadPipelineStatus();
    toast(`Publisher processed ${data.processedCount} item(s).`);
  } catch (error) {
    toast(error.message, true);
  } finally {
    setBusy(els.runDueBtn, false, 'Run Due Now');
  }
}

async function rebuildStaticSite() {
  setBusy(els.rebuildSiteBtn, true, 'Building…');
  try {
    const data = await api('/api/site/rebuild', { method: 'POST', body: { includeQueued: true } });
    toast(`Static blog rebuilt in ${data.site.staticSiteDir} with ${data.site.postCount} post(s).`);
  } catch (error) {
    toast(error.message, true);
  } finally {
    setBusy(els.rebuildSiteBtn, false, 'Rebuild Static Blog');
  }
}

async function deployProvider(provider) {
  const button = provider === 'netlify' ? els.deployNetlifyBtn : els.deployCloudflareBtn;
  setBusy(button, true, 'Deploying…');
  try {
    const data = await api(`/api/deploy/${provider}`, { method: 'POST', body: { mode: 'hook' } });
    toast(`${provider === 'netlify' ? 'Netlify' : 'Cloudflare'} deploy triggered. Status: ${data.deploy.status || 'ok'}.`);
  } catch (error) {
    toast(error.message, true);
  } finally {
    setBusy(button, false, provider === 'netlify' ? 'Trigger Netlify' : 'Trigger Cloudflare');
  }
}

async function loadPublishQueue() {
  if (!els.queueList) return;
  try {
    const [queueData, logData] = await Promise.all([api('/api/publish/queue'), api('/api/publish/log')]);
    state.queue = queueData.queue || [];
    state.publishLog = logData.log || [];
    renderPublishQueue();
    renderPublishLog();
  } catch (error) {
    els.queueList.className = 'queue-list empty-state';
    els.queueList.textContent = `Could not load queue: ${error.message}`;
  }
}

function renderPublishQueue() {
  if (!state.queue.length) {
    els.queueList.className = 'queue-list empty-state';
    els.queueList.textContent = 'No scheduled publish items yet.';
    return;
  }
  els.queueList.className = 'queue-list';
  els.queueList.innerHTML = '';
  for (const item of state.queue.slice(0, 30)) {
    const card = document.createElement('article');
    card.className = `queue-card ${item.status}`;
    card.innerHTML = `
      <div class="draft-title"></div>
      <div class="draft-meta"></div>
      <div class="target-row"></div>
      <button class="tiny publish-one" type="button">Run Item</button>
    `;
    card.querySelector('.draft-title').textContent = item.title;
    card.querySelector('.draft-meta').textContent = `${item.status} · ${new Date(item.publishAt).toLocaleString()} · attempts ${item.attempts || 0}`;
    card.querySelector('.target-row').innerHTML = (item.targets || []).map((target) => `<span>${labelTarget(target)}</span>`).join('');
    card.querySelector('.publish-one').addEventListener('click', () => runOnePublisher(item.id));
    els.queueList.appendChild(card);
  }
}

async function runOnePublisher(itemId) {
  try {
    const data = await api('/api/publish/run', { method: 'POST', body: { itemId } });
    await loadPublishQueue();
    toast(`Item processed. Result count: ${data.processedCount}.`);
  } catch (error) {
    toast(error.message, true);
  }
}

function renderPublishLog() {
  if (!els.publishLog) return;
  if (!state.publishLog.length) {
    els.publishLog.className = 'log-list empty-state';
    els.publishLog.textContent = 'No publish log entries yet.';
    return;
  }
  els.publishLog.className = 'log-list';
  els.publishLog.innerHTML = state.publishLog.slice(0, 20).map((entry) => `<article class="log-card"><strong>${entry.type}</strong><span>${new Date(entry.createdAt).toLocaleString()} · ${entry.title || entry.itemId || ''} · ${entry.status || ''}</span></article>`).join('');
}

function labelTarget(value) {
  return {
    local: 'Local Export',
    'google-drive': 'Google Drive',
    github: 'GitHub',
    'netlify-hook': 'Netlify Hook',
    'netlify-cli': 'Netlify CLI',
    'cloudflare-hook': 'Cloudflare Hook',
    'cloudflare-wrangler': 'Cloudflare Wrangler',
    facebook: 'Facebook Page',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    googleDrive: 'Google Drive',
    netlifyHook: 'Netlify Hook',
    netlifyCli: 'Netlify CLI',
    cloudflareHook: 'Cloudflare Hook',
    cloudflareWrangler: 'Cloudflare Wrangler'
  }[value] || value;
}

async function loadSources() {
  try {
    const data = await api('/api/sources');
    state.sources = data.sources || [];
    renderSources();
  } catch (error) {
    toast(error.message, true);
  }
}

function renderSources() {
  els.sourceSelect.innerHTML = '';
  for (const source of state.sources) {
    const option = document.createElement('option');
    option.value = source.id;
    option.textContent = source.name;
    option.dataset.url = source.homeUrl;
    els.sourceSelect.appendChild(option);
  }
  const saved = localStorage.getItem('skye-content-forge-source');
  if (saved && state.sources.some((source) => source.id === saved)) els.sourceSelect.value = saved;
  syncManualUrlToSource(false);
}

function syncManualUrlToSource(shouldToast = true) {
  const source = currentSource();
  if (!source) return;
  localStorage.setItem('skye-content-forge-source', source.id);
  if (!els.manualUrl.value || isKnownHomeUrl(els.manualUrl.value) || shouldToast) {
    els.manualUrl.value = source.homeUrl;
  }
}

function currentSource() {
  return state.sources.find((source) => source.id === els.sourceSelect.value) || state.sources[0];
}

function isKnownHomeUrl(value) {
  const cleaned = value.replace(/\/$/, '');
  return state.sources.some((source) => source.homeUrl.replace(/\/$/, '') === cleaned);
}

function hydrateLocalSettings() {
  const saved = safeJson(localStorage.getItem('skye-content-forge-settings'), null);
  if (!saved) return;
  for (const [key, value] of Object.entries(saved)) {
    if (els[key] && typeof value === 'string') els[key].value = value;
  }
}

function persistLocalSettings() {
  const payload = {
    format: els.format.value,
    audience: els.audience.value,
    keywords: els.keywords.value,
    cta: els.cta.value,
    brandProfile: els.brandProfile.value
  };
  localStorage.setItem('skye-content-forge-settings', JSON.stringify(payload));
}

async function checkHealth(showToast = false) {
  try {
    const data = await api('/api/health');
    state.health = data;
    els.engineStatus.textContent = data.keyConfigured ? 'AI ready' : 'Key missing';
    els.engineStatus.classList.toggle('danger', !data.keyConfigured);
    els.exportStatus.textContent = data.googleDrive?.configured ? 'Drive ready' : 'Local only';
    els.exportStatus.classList.toggle('danger', !data.googleDrive?.configured);
    await loadPipelineStatus();
    await loadRuntimeStatus();
    if (showToast) {
      const drive = data.googleDrive?.configured ? 'Google Drive ready.' : `Drive local-only. Missing: ${(data.googleDrive?.missing || []).join(', ') || 'none'}.`;
      toast(data.keyConfigured ? `Local engine ready. Model: ${data.model}. ${drive}` : `Server running, but OPENAI_API_KEY is missing. ${drive}`);
    }
  } catch (error) {
    els.engineStatus.textContent = 'Offline';
    els.engineStatus.classList.add('danger');
    if (showToast) toast(error.message, true);
  }
}

async function scanSelectedSource() {
  const source = currentSource();
  if (!source) return toast('No source selected.', true);
  setBusy(els.scanBtn, true, 'Scanning…');
  try {
    const target = els.manualUrl.value.trim() || source.homeUrl;
    const data = await api(`/api/source/scan?source=${encodeURIComponent(source.id)}&url=${encodeURIComponent(target)}`);
    state.posts = data.posts || [];
    state.filteredPosts = state.posts;
    els.postCount.textContent = String(state.posts.length);
    renderPosts();
    toast(`Loaded ${state.posts.length} posts from ${data.source?.name || source.name}.`);
  } catch (error) {
    toast(error.message, true);
  } finally {
    setBusy(els.scanBtn, false, 'Scan Selected Source');
  }
}

async function scanAllSources() {
  setBusy(els.scanAllBtn, true, 'Scanning all…');
  try {
    const data = await api('/api/source/scan-all');
    state.posts = data.posts || [];
    state.filteredPosts = state.posts;
    els.postCount.textContent = String(state.posts.length);
    renderPosts();
    const failed = (data.results || []).filter((item) => !item.ok).length;
    toast(`Loaded ${state.posts.length} posts across ${state.sources.length} sources${failed ? `; ${failed} source(s) failed.` : '.'}`);
  } catch (error) {
    toast(error.message, true);
  } finally {
    setBusy(els.scanAllBtn, false, 'Scan All Sources');
  }
}

function handleManualLoad() {
  const value = els.manualUrl.value.trim();
  if (!value) return toast('Paste a source or article URL first.', true);
  const knownSource = sourceForUrl(value);
  if (knownSource) els.sourceSelect.value = knownSource.id;
  if (isKnownHomeUrl(value)) return scanSelectedSource();
  const post = {
    title: titleFromUrl(value),
    url: value,
    source: knownSource?.name || 'Manual approved URL',
    sourceId: knownSource?.id || els.sourceSelect.value,
    excerpt: ''
  };
  selectPost(post);
  extractSelectedArticle();
}

function sourceForUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    return state.sources.find((source) => source.allowedHosts.some((allowed) => allowed.replace(/^www\./, '') === host));
  } catch {
    return null;
  }
}

function filterPosts() {
  const q = els.postSearch.value.trim().toLowerCase();
  state.filteredPosts = q
    ? state.posts.filter((post) => `${post.title} ${post.excerpt} ${post.date} ${post.readTime} ${post.source} ${post.topic}`.toLowerCase().includes(q))
    : state.posts;
  renderPosts();
}

function renderPosts() {
  if (!state.filteredPosts.length) {
    els.posts.className = 'post-list empty-state';
    els.posts.textContent = state.posts.length ? 'No posts match that filter.' : 'No source posts loaded yet.';
    return;
  }

  els.posts.className = 'post-list';
  els.posts.innerHTML = '';
  for (const post of state.filteredPosts) {
    const card = document.createElement('article');
    card.className = `post-card ${state.selectedPost?.url === post.url ? 'active' : ''}`;
    card.innerHTML = `
      <div class="post-source"></div>
      <div class="post-title"></div>
      <div class="post-meta"></div>
    `;
    card.querySelector('.post-source').textContent = post.source || 'Approved source';
    card.querySelector('.post-title').textContent = post.title;
    card.querySelector('.post-meta').textContent = [post.date, post.readTime, post.excerpt].filter(Boolean).join(' • ');
    card.addEventListener('click', () => selectPost(post));
    els.posts.appendChild(card);
  }
}

function selectPost(post) {
  state.selectedPost = post;
  state.article = null;
  els.selectedTitle.textContent = post.title;
  els.sourceLink.href = post.url;
  els.sourceLink.style.display = 'inline-flex';
  els.articleMeta.textContent = [post.source || 'Approved source', post.date, post.readTime, post.url].filter(Boolean).join(' • ');
  els.articleText.value = '';
  els.manualUrl.value = post.url;
  renderPosts();
}

async function extractSelectedArticle() {
  const url = state.selectedPost?.url || els.manualUrl.value.trim();
  if (!url) return toast('Select or paste an approved article URL first.', true);

  setBusy(els.extractBtn, true, 'Extracting…');
  try {
    const data = await api('/api/source/article', {
      method: 'POST',
      body: { url }
    });
    state.article = data.article;
    state.selectedPost = state.selectedPost || { title: data.article.title, url: data.article.url, source: data.source?.name || data.article.sourceName };
    els.selectedTitle.textContent = data.article.title || 'Extracted article';
    els.sourceLink.href = data.article.url || url;
    els.sourceLink.style.display = 'inline-flex';
    els.articleMeta.textContent = [
      data.article.sourceName,
      data.article.date,
      `${data.article.wordCountEstimate || 0} estimated words`,
      `${data.article.headings?.length || 0} headings extracted`
    ].filter(Boolean).join(' • ');
    els.articleText.value = data.article.text || '';
    toast('Article extracted. Ready to repurpose. ⚡');
  } catch (error) {
    toast(error.message, true);
  } finally {
    setBusy(els.extractBtn, false, 'Extract Article');
  }
}

function clearArticle() {
  state.article = null;
  state.selectedPost = null;
  els.selectedTitle.textContent = 'No article loaded';
  els.sourceLink.style.display = 'none';
  els.articleMeta.textContent = 'Choose an article to extract source ideas.';
  els.articleText.value = '';
  renderPosts();
}

async function generateAsset() {
  const sourceUrl = state.article?.url || state.selectedPost?.url || els.manualUrl.value.trim();
  const sourceText = els.articleText.value.trim();
  if (!sourceUrl) return toast('A source URL is required.', true);
  if (sourceText.length < 400) return toast('Fetch the article first or paste at least 400 characters of source notes.', true);

  persistLocalSettings();
  setBusy(els.generateBtn, true, 'Generating…');
  els.output.classList.remove('empty-state');
  els.output.textContent = 'SkyeDexia is transforming the source into original company content…';

  try {
    const data = await api('/api/repurpose', {
      method: 'POST',
      body: {
        format: els.format.value,
        target: els.audience.value,
        keywords: els.keywords.value,
        cta: els.cta.value,
        brandProfile: {
          companyName: 'Skyes Over London',
          offer: els.brandProfile.value,
          targetAudience: els.audience.value,
          defaultKeywords: els.keywords.value,
          defaultCta: els.cta.value
        },
        source: {
          title: state.article?.title || state.selectedPost?.title || titleFromUrl(sourceUrl),
          url: sourceUrl,
          sourceName: state.article?.sourceName || state.selectedPost?.source || '',
          text: sourceText
        }
      }
    });

    state.output = data.output.markdown;
    state.lastDraft = data.draft;
    els.outputTitle.textContent = data.output.title || 'Generated Skye asset';
    els.output.textContent = state.output;
    await loadDrafts();
    toast('Generated and auto-saved locally. 🔥');
  } catch (error) {
    els.output.textContent = '';
    els.output.classList.add('empty-state');
    toast(error.message, true);
  } finally {
    setBusy(els.generateBtn, false, 'Generate Original Skye Asset');
  }
}

async function saveCurrentDraft() {
  if (!state.output.trim()) return toast('There is no output to save.', true);
  try {
    const title = currentOutputTitle();
    const data = await api('/api/drafts', {
      method: 'POST',
      body: {
        title,
        sourceUrl: state.article?.url || state.selectedPost?.url || els.manualUrl.value,
        sourceTitle: state.article?.title || state.selectedPost?.title || '',
        sourceName: state.article?.sourceName || state.selectedPost?.source || '',
        format: els.format.value,
        output: state.output,
        metadata: { savedManuallyAt: new Date().toISOString() }
      }
    });
    state.lastDraft = data.draft;
    await loadDrafts();
    toast('Draft saved.');
  } catch (error) {
    toast(error.message, true);
  }
}

async function loadDrafts() {
  try {
    const data = await api('/api/drafts');
    state.drafts = data.drafts || [];
    els.draftCount.textContent = String(state.drafts.length);
    renderDrafts();
  } catch {
    els.drafts.className = 'draft-list empty-state';
    els.drafts.textContent = 'Could not load drafts.';
  }
}

function renderDrafts() {
  if (!state.drafts.length) {
    els.drafts.className = 'draft-list empty-state';
    els.drafts.textContent = 'No saved drafts yet.';
    return;
  }
  els.drafts.className = 'draft-list';
  els.drafts.innerHTML = '';
  for (const draft of state.drafts) {
    const card = document.createElement('article');
    card.className = 'draft-card';
    card.innerHTML = `
      <div class="draft-title"></div>
      <div class="draft-meta"></div>
      <button class="tiny small-delete" type="button">Delete</button>
    `;
    card.querySelector('.draft-title').textContent = draft.title;
    card.querySelector('.draft-meta').textContent = [draft.sourceName, draft.format, new Date(draft.updatedAt).toLocaleString()].filter(Boolean).join(' • ');
    card.addEventListener('click', (event) => {
      if (event.target.matches('button')) return;
      loadDraftIntoOutput(draft);
    });
    card.querySelector('button').addEventListener('click', async () => {
      await deleteDraft(draft.id);
    });
    els.drafts.appendChild(card);
  }
}

function loadDraftIntoOutput(draft) {
  state.output = draft.output || '';
  state.lastDraft = draft;
  els.outputTitle.textContent = draft.title || 'Saved draft';
  els.output.classList.remove('empty-state');
  els.output.textContent = state.output;
  if (draft.sourceUrl) els.manualUrl.value = draft.sourceUrl;
  toast('Draft loaded.');
}

async function deleteDraft(id) {
  try {
    await api(`/api/drafts/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await loadDrafts();
    toast('Draft deleted.');
  } catch (error) {
    toast(error.message, true);
  }
}

async function copyOutput() {
  if (!state.output.trim()) return toast('There is no output to copy.', true);
  await navigator.clipboard.writeText(state.output);
  toast('Copied to clipboard.');
}

function downloadMarkdown() {
  if (!state.output.trim()) return toast('There is no output to download.', true);
  const blob = new Blob([state.output], { type: 'text/markdown;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${slugify(currentOutputTitle())}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
  toast('Markdown download started.');
}

async function saveMarkdownWithPicker() {
  if (!state.output.trim()) return toast('There is no output to save.', true);
  const suggestedName = `${slugify(currentOutputTitle())}.md`;
  if (!window.showSaveFilePicker) {
    downloadMarkdown();
    toast('Your browser does not expose the folder picker here, so the app used normal download instead.', true);
    return;
  }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'], 'text/plain': ['.txt'] } }]
    });
    const writable = await handle.createWritable();
    await writable.write(state.output);
    await writable.close();
    toast('Saved to the location you selected. ✅');
  } catch (error) {
    if (error?.name === 'AbortError') return toast('Save canceled.');
    toast(error.message || 'Could not save file.', true);
  }
}

async function exportLocal() {
  if (!state.output.trim()) return toast('There is no output to export.', true);
  setBusy(els.localExportBtn, true, 'Exporting…');
  try {
    const data = await api('/api/export/local', {
      method: 'POST',
      body: { title: currentOutputTitle(), output: state.output }
    });
    await loadExports();
    toast(`Saved to ${data.export.relativePath}`);
  } catch (error) {
    toast(error.message, true);
  } finally {
    setBusy(els.localExportBtn, false, 'Save to App Exports');
  }
}

async function uploadToDrive() {
  if (!state.output.trim()) return toast('There is no output to upload.', true);
  setBusy(els.driveUploadBtn, true, 'Uploading…');
  try {
    const data = await api('/api/export/google-drive', {
      method: 'POST',
      body: { title: currentOutputTitle(), output: state.output }
    });
    const link = data.driveFile.webViewLink ? ` Open link: ${data.driveFile.webViewLink}` : '';
    toast(`Uploaded to Google Drive as ${data.driveFile.name}.${link}`);
    await checkHealth();
  } catch (error) {
    toast(error.message, true);
  } finally {
    setBusy(els.driveUploadBtn, false, 'Upload to Google Drive');
  }
}

async function loadExports() {
  try {
    const data = await api('/api/exports');
    state.exports = data.files || [];
    renderExports();
  } catch {
    els.exportList.className = 'export-list empty-state';
    els.exportList.textContent = 'Could not load exports.';
  }
}

function renderExports() {
  if (!state.exports.length) {
    els.exportList.className = 'export-list empty-state';
    els.exportList.textContent = 'No exports listed yet.';
    return;
  }
  els.exportList.className = 'export-list';
  els.exportList.innerHTML = '';
  for (const file of state.exports) {
    const card = document.createElement('article');
    card.className = 'export-card';
    card.innerHTML = `
      <div class="draft-title"></div>
      <div class="draft-meta"></div>
      <a class="tiny" href="${file.downloadUrl}">Download</a>
    `;
    card.querySelector('.draft-title').textContent = file.fileName;
    card.querySelector('.draft-meta').textContent = [file.relativePath, `${Math.round(file.bytes / 1024)} KB`, new Date(file.updatedAt).toLocaleString()].join(' • ');
    els.exportList.appendChild(card);
  }
}

function currentOutputTitle() {
  return els.outputTitle.textContent === 'No draft yet' ? 'Skye repurposed content' : els.outputTitle.textContent;
}

async function api(path, options = {}) {
  const headers = options.body ? { 'Content-Type': 'application/json' } : {};
  Object.assign(headers, window.SkyeContentGate?.headers?.() || {});
  if (state.accessToken) {
    headers['X-App-Token'] = state.accessToken;
    headers.authorization = headers.authorization || `Bearer ${state.accessToken}`;
  }
  const response = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.error || `Request failed: ${response.status}`);
  return data;
}

function setBusy(button, busy, label) {
  button.disabled = busy;
  button.textContent = label;
}

function toast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.style.borderColor = isError ? 'rgba(255, 101, 125, 0.5)' : 'rgba(248, 214, 78, 0.32)';
  els.toast.classList.add('show');
  window.clearTimeout(toast._timeout);
  toast._timeout = window.setTimeout(() => els.toast.classList.remove('show'), 5400);
}

function safeJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function titleFromUrl(value) {
  try {
    const slug = new URL(value).pathname.split('/').filter(Boolean).pop() || 'article';
    return slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  } catch {
    return 'Approved Source Article';
  }
}

function slugify(value) {
  return String(value || 'skye-content-draft')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'skye-content-draft';
}
