(function () {
  const STORAGE_KEY = 'skyedocx-blog-workspace-v1';
  const $ = (id) => document.getElementById(id);
  const ids = ['headline','slug','author','section','releaseHook','ctaLabel','promoTargets','callouts','canonicalCollection'];
  const state = {
    latestHtml: '',
    latestPackage: null
  };

  function slugify(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'skyedocx-blog-release';
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function splitList(value) {
    return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
  }

  function markdownToHtml(markdown) {
    const lines = String(markdown || '').split(/\r?\n/);
    const out = [];
    let listOpen = false;
    const closeList = () => { if (listOpen) { out.push('</ul>'); listOpen = false; } };
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { closeList(); continue; }
      if (line.startsWith('## ')) { closeList(); out.push(`<h2>${escapeHtml(line.slice(3))}</h2>`); continue; }
      if (line.startsWith('# ')) { closeList(); out.push(`<h1>${escapeHtml(line.slice(2))}</h1>`); continue; }
      if (line.startsWith('- ')) {
        if (!listOpen) { out.push('<ul>'); listOpen = true; }
        out.push(`<li>${escapeHtml(line.slice(2))}</li>`);
        continue;
      }
      closeList();
      out.push(`<p>${escapeHtml(line)}</p>`);
    }
    closeList();
    return out.join('\n');
  }

  function readWorkspace() {
    const workspace = {};
    ids.forEach((id) => { workspace[id] = $(id).value.trim(); });
    workspace.postBody = $('postBody').value;
    workspace.slug = workspace.slug || slugify(workspace.headline);
    return workspace;
  }

  function buildPackage() {
    const workspace = readWorkspace();
    const pkg = {
      schema: 'zeroos.skyedocx_blog.package.v1',
      source: 'superide-skyeblog-promoted-to-0s',
      generated_at: new Date().toISOString(),
      auth_owner: 'FS27/SkyGate/Free99 shared gate',
      provider_boundary: 'provider-free local package builder',
      handoffs: {
        skyeDocxMax: '/Marketing-Made-Easy/SkyeDocxMax/editor.html',
        sovereignDocs: '/Free99/apps/sovereigndocs/',
        devisionalRiftx: '/DeVisional%20Riftx/app/',
        skyeNet: '/skyenet/'
      },
      channel: {
        headline: workspace.headline,
        slug: workspace.slug,
        author: workspace.author,
        section: workspace.section,
        canonical_collection: workspace.canonicalCollection,
        cta_label: workspace.ctaLabel
      },
      campaign: {
        release_hook: workspace.releaseHook,
        promo_targets: splitList(workspace.promoTargets),
        callouts: splitList(workspace.callouts)
      },
      article: {
        markdown: workspace.postBody,
        html: markdownToHtml(workspace.postBody)
      }
    };
    state.latestPackage = pkg;
    $('packageJson').value = JSON.stringify(pkg, null, 2);
    $('packageStatus').textContent = `Package ready: ${pkg.channel.slug}`;
    return pkg;
  }

  function buildPreview() {
    const pkg = buildPackage();
    const chips = [...pkg.campaign.promo_targets, ...pkg.campaign.callouts]
      .map((item) => `<span>${escapeHtml(item)}</span>`).join('');
    const cta = `<aside class="cta"><h3>${escapeHtml(pkg.channel.cta_label)}</h3><p>Handoff this editorial package into SkyeDocxMax, SovereignDocs, DeVisional Riftx, or SkyeNet from the 0S.</p></aside>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(pkg.channel.headline)}</title><style>
      body{margin:0;padding:34px;font-family:Inter,system-ui,sans-serif;background:#071018;color:#eef6ff}
      main{max-width:980px;margin:auto}.hero{border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:24px;background:#101821}
      .eyebrow{text-transform:uppercase;letter-spacing:.12em;color:#36d399;font-size:.75rem}.grid{display:grid;grid-template-columns:1.35fr .65fr;gap:14px;margin-top:14px}
      article,.rail,.cta{border:1px solid rgba(255,255,255,.12);border-radius:8px;background:#101821;padding:20px}
      h1{line-height:1;margin:.2em 0}.rail span{display:inline-block;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:6px 9px;margin:4px;color:#d9e8f7}
      @media(max-width:820px){.grid{grid-template-columns:1fr}body{padding:18px}}
    </style></head><body><main><section class="hero"><p class="eyebrow">SkyeDocx Blog package</p><h1>${escapeHtml(pkg.channel.headline)}</h1><p>${escapeHtml(pkg.campaign.release_hook)}</p></section><section class="grid"><article>${pkg.article.html}${cta}</article><aside class="rail"><h2>Campaign Rail</h2><p><strong>Section:</strong> ${escapeHtml(pkg.channel.section)}</p><p><strong>Author:</strong> ${escapeHtml(pkg.channel.author)}</p><div>${chips}</div></aside></section></main></body></html>`;
    state.latestHtml = html;
    $('previewFrame').srcdoc = html;
    $('packageStatus').textContent = `Preview built: ${pkg.channel.slug}`;
    return html;
  }

  function saveDraft() {
    const workspace = readWorkspace();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    $('storageStatus').textContent = `Draft saved: ${workspace.slug}`;
  }

  function loadDraft() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const workspace = JSON.parse(raw);
      ids.forEach((id) => { if (workspace[id]) $(id).value = workspace[id]; });
      if (workspace.postBody) $('postBody').value = workspace.postBody;
      $('storageStatus').textContent = `Draft restored: ${workspace.slug || 'workspace'}`;
    } catch {}
  }

  function loadBridgeDraft() {
    const raw = localStorage.getItem('skye.blog.bridgeDraft');
    if (!raw) return false;
    try {
      const draft = JSON.parse(raw);
      if (draft.title) $('headline').value = draft.title;
      if (draft.excerpt) $('releaseHook').value = draft.excerpt;
      if (draft.source) $('canonicalCollection').value = `${draft.source}-bridge`;
      if (draft.text) $('postBody').value = draft.text;
      else if (draft.html) $('postBody').value = String(draft.html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      $('slug').value = slugify($('headline').value);
      $('storageStatus').textContent = `Bridge draft loaded: ${$('slug').value}`;
      return true;
    } catch {
      return false;
    }
  }

  function loadSuperidePreset() {
    $('headline').value = 'The Author Stack Needs a Sovereign Command Layer';
    $('slug').value = 'author-stack-needs-sovereign-command-layer';
    $('author').value = 'Skyes Over London';
    $('section').value = 'Publishing Infrastructure';
    $('releaseHook').value = 'Launch article tied to canonical author package';
    $('ctaLabel').value = 'Open the sovereign release lane';
    $('promoTargets').value = 'site-homepage, author-storefront, bundle-upsell';
    $('callouts').value = 'direct-sale first, edition lineage intact, blog seeded from same release';
    $('canonicalCollection').value = 'publishing-os';
    buildPreview();
  }

  $('headline').addEventListener('input', () => { $('slug').value = slugify($('headline').value); });
  $('buildPreview').addEventListener('click', buildPreview);
  $('exportPackage').addEventListener('click', buildPackage);
  $('saveDraft').addEventListener('click', saveDraft);
  $('loadSuperidePreset').addEventListener('click', loadSuperidePreset);
  $('insertCta').addEventListener('click', () => {
    $('postBody').value += '\n\n## Launch from the owned lane\nUse the direct-sale surface as the command center, then push outward only after the master package is locked.\n';
    buildPreview();
  });
  $('copyPackage').addEventListener('click', async () => {
    if (!state.latestPackage) buildPackage();
    await navigator.clipboard?.writeText($('packageJson').value).catch(() => {});
    $('packageStatus').textContent = 'Package copied to clipboard.';
  });
  $('openPreview').addEventListener('click', () => {
    const html = state.latestHtml || buildPreview();
    const url = URL.createObjectURL(new Blob([html], {type:'text/html'}));
    window.open(url, '_blank', 'noopener,noreferrer');
  });

  window.addEventListener('load', () => {
    if (!loadBridgeDraft()) loadDraft();
    buildPreview();
    const gate = window.Free99PlatformGate?.current?.() || window.MetrAIyuxGateBridge?.current?.() || null;
    $('gateStatus').textContent = gate?.token ? 'Shared gate session detected' : 'Shared gate required';
  });
})();
