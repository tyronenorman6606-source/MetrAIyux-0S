(function () {
  'use strict';

  const generatedVisuals = [
    { title: '0S Command Room', file: 'assets/social/generated/0s-command-room.svg', platform: 'Square/story crop', copy: 'AI agents, receipts, shared auth, and founder control in one command-room visual.' },
    { title: 'SkyeVault Recovery', file: 'assets/social/generated/skyevault-recovery.svg', platform: 'Square/story crop', copy: 'Recovery posture, source custody, and the public-safe vault story.' },
    { title: 'Merser Source World', file: 'assets/social/generated/merser-source-world.svg', platform: 'Square/story crop', copy: 'MCP source packs, world-building, and operator tooling as a visual hook.' },
    { title: 'Default-Deny Gate', file: 'assets/social/generated/default-deny-gate.svg', platform: 'Square/story crop', copy: 'Shared SkyGate/FS27 auth lane without exposing private credentials.' },
    { title: 'Agent Marketing Room', file: 'assets/social/generated/agent-marketing-room.svg', platform: 'Square/story crop', copy: 'The marketing team lane: strategy, copy, visuals, proof, and shipping.' },
    { title: 'Small Business Constellation', file: 'assets/social/generated/small-business-constellation.svg', platform: 'LinkedIn or carousel', copy: 'Small business apps orbiting the same operating layer.' },
    { title: 'Music Nexus Artist Engine', file: 'assets/social/generated/music-nexus-artist-engine.svg', platform: 'Square/story crop', copy: 'Artist releases, store paths, proof, and recovery in one creative engine.' },
    { title: 'Free99 Operator Lane', file: 'assets/social/generated/free99-operator-lane.svg', platform: 'Square/story crop', copy: 'Free entry lane with serious infrastructure behind it.' },
    { title: 'Proof Ledger Wall', file: 'assets/social/generated/proof-ledger-wall.svg', platform: 'LinkedIn or carousel', copy: 'Receipts before victory laps, with public-safe proof language.' },
    { title: 'Social Vault Refresh', file: 'assets/social/generated/social-vault-refresh.svg', platform: 'Launch announcement', copy: 'Copy the post, ship the story, and keep the receipts.' },
    { title: 'Relay13 Live Inbox', file: 'assets/social/generated/relay13-live-inbox.svg', platform: 'Square/story crop', copy: 'Conversation infrastructure as a clean founder/operator visual.' },
    { title: 'Valley Verified Radar', file: 'assets/social/generated/valley-verified-radar.svg', platform: 'Local market content', copy: 'Local business data becoming a market engine.' }
  ];

  const packs = [
    { id: 'real-surface-pack', title: 'Actual App Surface Founder Campaign Pack', path: 'content/social-vault/actual-app-surface-founder-campaign-pack.md', target: 'realSurfaceCopyGrid', headingPattern: /^##\s+\d+\.\s+/, limit: 32 },
    { id: 'platform-app-pack', title: 'Platform/App Campaign Pack', path: 'content/social-vault/platform-app-campaign-pack.md', target: 'platformCampaignGrid', headingPattern: /^##\s+\d+\.\s+/, limit: 54 },
    { id: 'founder-surface-pack', title: 'Founder Surface Campaign Pack', path: 'content/social-vault/founder-surface-campaign-pack.md', target: 'founderSurfaceCopyGrid', headingPattern: /^##\s+\d+\.\s+/, limit: 45 },
    { id: 'ad-variant-pack', title: 'Platform/App Ad Variant Bank', path: 'content/social-vault/platform-app-ad-variant-bank.md', target: 'adVariantGrid', headingPattern: /^##\s+\d+\.\s+/, limit: 54 },
    { id: 'short-video-pack', title: 'Platform/App Short Video Scripts', path: 'content/social-vault/platform-app-short-video-script-pack.md', target: 'shortVideoGrid', headingPattern: /^##\s+\d+\.\s+/, limit: 54 },
    { id: 'reply-bank-pack', title: 'Platform/App Reply Bank', path: 'content/social-vault/platform-app-reply-bank.md', target: 'replyBankGrid', headingPattern: /^###\s+/, limit: 20 },
    { id: 'priority-reply-dm-pack', title: 'Priority Reply + DM Sequences', path: 'content/social-vault/platform-app-priority-reply-dm-sequences.md', target: 'priorityFollowupGrid', headingPattern: /^##\s+\d+\.\s+/, limit: 15 },
    { id: 'dm-outreach-pack', title: 'DM and Outreach Pack', path: 'content/social-vault/platform-app-dm-outreach-pack.md', target: 'dmOutreachGrid', headingPattern: /^##\s+/, limit: 10 },
    { id: 'linkedin-pack', title: 'LinkedIn Longform Pack', path: 'content/social-vault/linkedin-longform-pack.md', target: 'linkedinCopyGrid', headingPattern: /^##\s+\d+\.\s+/, limit: 10 },
    { id: 'instagram-facebook-pack', title: 'Instagram/Facebook Pack', path: 'content/social-vault/instagram-facebook-pack.md', target: 'shortCopyGrid', headingPattern: /^##\s+\d+\.\s+/, limit: 16 },
    { id: 'reddit-x-pack', title: 'Reddit and X Thread Pack', path: 'content/social-vault/reddit-x-thread-pack.md', target: 'redditThreadGrid', headingPattern: /^###\s+(?:\d+\.|Thread\s+\d+)/i, limit: 16 },
    { id: 'image-brief-pack', title: 'Image Brief Pack', path: 'content/social-vault/image-briefs-pack.md', target: 'imageBriefGrid', headingPattern: /^##\s+\d+\.\s+/, limit: 12 }
  ];

  const sourcePreviewPacks = [
    { packId: 'real-surface-pack', targetSelector: '#surface-start', actionLabel: 'Open App Cards' },
    { packId: 'platform-app-pack', targetSelector: '#platform-campaign', actionLabel: 'Open All Blocks' },
    { packId: 'founder-surface-pack', targetSelector: '#founder-surfaces', actionLabel: 'Open Surfaces' },
    { packId: 'linkedin-pack', targetSelector: '#linkedin', actionLabel: 'Open Longform' },
    { packId: 'instagram-facebook-pack', targetSelector: '#instagram-facebook', actionLabel: 'Open Captions' },
    { packId: 'reddit-x-pack', targetSelector: '#reddit-x', actionLabel: 'Open Threads' },
    { packId: 'ad-variant-pack', targetSelector: '#ad-variants', actionLabel: 'Open Ads' },
    { packId: 'short-video-pack', targetSelector: '#short-video', actionLabel: 'Open Scripts' },
    { packId: 'reply-bank-pack', targetSelector: '#reply-bank', actionLabel: 'Open Replies' },
    { packId: 'priority-reply-dm-pack', targetSelector: '#priority-followup', actionLabel: 'Open Follow-Up' },
    { packId: 'image-brief-pack', targetSelector: '#image-briefs', actionLabel: 'Open Briefs' }
  ];

  const copyBlocks = new Map();
  const channelSnippetMap = new Map();
  const selectedDayStorageKey = 'devooderator-social-vault-selected-day';
  let latestCalendarRows = [];
  let latestPlatformCards = new Map();

  const channelSnippetLabels = [
    ['Hook', 'Hook'],
    ['LinkedIn post', 'LinkedIn'],
    ['Instagram/Facebook caption', 'IG/FB'],
    ['Carousel slides', 'Carousel'],
    ['X thread', 'X'],
    ['Reddit/community starter', 'Reddit'],
    ['CTA', 'CTA'],
    ['Hashtags', 'Hashtags']
  ];

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function normalize(value) {
    return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function pngFromSvg(file) {
    return String(file || '').replace(/\.svg$/, '.png');
  }

  function slugify(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function labelFromHeading(line) {
    return line.replace(/^#{2,3}\s+/, '').replace(/^\d+\.\s+/, '').trim();
  }

  async function loadChannelSnippets() {
    try {
      const response = await fetch('content/social-vault/platform-app-channel-snippets.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const rows = Array.isArray(data.rows) ? data.rows : [];
      channelSnippetMap.clear();
      rows.forEach((row) => {
        if (row && row.title && row.channels) channelSnippetMap.set(row.title, row);
      });
    } catch (_error) {
      channelSnippetMap.clear();
    }
  }

  function renderChannelButtons(title, prefix) {
    const row = channelSnippetMap.get(title);
    if (!row || !row.channels) return '';
    const buttons = channelSnippetLabels.map(([sourceLabel, buttonLabel]) => {
      const value = row.channels[sourceLabel];
      if (!value) return '';
      const copyId = `${prefix}-channel-${slugify(sourceLabel)}`;
      const copyText = [
        row.title,
        sourceLabel,
        value,
        row.cta_text ? `CTA: ${row.cta_text}` : '',
        row.visual_png ? `PNG: ${row.visual_png}` : ''
      ].filter(Boolean).join('\n\n');
      copyBlocks.set(copyId, copyText);
      return `<button class="copy-action" type="button" data-copy-id="${escapeHtml(copyId)}">Copy ${escapeHtml(buttonLabel)}</button>`;
    }).filter(Boolean).join('');

    if (!buttons) return '';
    return `<div class="channel-copy-actions" aria-label="${escapeHtml(title)} channel snippets">${buttons}</div>`;
  }

  function splitMarkdownSections(markdown, pattern, limit) {
    const lines = String(markdown || '').split(/\r?\n/);
    const sections = [];
    let current = null;

    for (const line of lines) {
      if (pattern.test(line)) {
        if (current) sections.push(current);
        current = { title: labelFromHeading(line), body: '' };
        continue;
      }
      if (current) current.body += `${line}\n`;
    }

    if (current) sections.push(current);
    return sections
      .map((section) => ({ title: section.title, body: section.body.trim() }))
      .filter((section) => section.title && section.body)
      .slice(0, limit);
  }

  function scrollToSelector(selector) {
    const target = document.querySelector(selector);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function mountSectionButtons() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-scroll-target]');
      if (!button) return;
      event.preventDefault();
      scrollToSelector(button.getAttribute('data-scroll-target') || '');
    });
  }

  function renderTextLines(text) {
    return String(text || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<p>${escapeHtml(line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''))}</p>`)
      .join('');
  }

  function previewExcerpt(text, maxLength = 1500) {
    const value = String(text || '').trim();
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength).replace(/\s+\S*$/, '')}\n\n[Full block continues in the rendered section.]`;
  }

  function setFilterStatus() {
    const status = document.getElementById('vaultFilterStatus');
    if (!status) return;
    const cards = Array.from(document.querySelectorAll('.filterable-card'));
    const visible = cards.filter((card) => !card.classList.contains('filter-hidden')).length;
    status.textContent = `${visible} visible items`;
  }

  function applyVaultFilters() {
    const query = normalize(document.getElementById('vaultSearch')?.value || '');
    const channel = document.getElementById('channelFilter')?.value || 'all';
    const cards = document.querySelectorAll('.filterable-card');

    cards.forEach((card) => {
      const haystack = normalize(card.getAttribute('data-search') || card.textContent || '');
      const cardChannel = card.getAttribute('data-channel') || '';
      const matchesQuery = !query || haystack.includes(query);
      const matchesChannel = channel === 'all' || !card.classList.contains('calendar-card') || cardChannel === channel;
      card.classList.toggle('filter-hidden', !(matchesQuery && matchesChannel));
    });

    setFilterStatus();
  }

  function mountVaultFilters() {
    const search = document.getElementById('vaultSearch');
    const channel = document.getElementById('channelFilter');
    const clear = document.getElementById('clearVaultFilters');

    search?.addEventListener('input', applyVaultFilters);
    channel?.addEventListener('change', applyVaultFilters);
    clear?.addEventListener('click', () => {
      if (search) search.value = '';
      if (channel) channel.value = 'all';
      applyVaultFilters();
      search?.focus();
    });
  }

  function populateChannelFilter(rows) {
    const select = document.getElementById('channelFilter');
    if (!select) return;
    const channels = Array.from(new Set(rows.map((row) => row.channel_focus).filter(Boolean))).sort();
    select.innerHTML = '<option value="all">All channels</option>' + channels.map((channel) => `<option value="${escapeHtml(channel)}">${escapeHtml(channel)}</option>`).join('');
  }

  function storedSelectedDay() {
    try {
      return Number(window.localStorage.getItem(selectedDayStorageKey) || 0);
    } catch (_error) {
      return 0;
    }
  }

  function saveSelectedDay(day) {
    try {
      window.localStorage.setItem(selectedDayStorageKey, String(day));
    } catch (_error) {
      // Local storage can be unavailable in some embedded preview contexts.
    }
  }

  function selectedCalendarRow(rows) {
    if (!rows.length) return null;
    const stored = storedSelectedDay();
    return rows.find((row) => Number(row.day) === stored) || rows[0];
  }

  function populateDaySelect(rows) {
    const select = document.getElementById('daySelect');
    if (!select) return;
    if (!rows.length) {
      select.innerHTML = '<option value="">No days loaded</option>';
      return;
    }
    select.innerHTML = rows.map((row) => `<option value="${escapeHtml(row.day)}">Day ${escapeHtml(row.day)} - ${escapeHtml(row.featured_app)}</option>`).join('');
    const selected = selectedCalendarRow(rows);
    if (selected) select.value = String(selected.day);
  }

  function mountDaySelect() {
    const select = document.getElementById('daySelect');
    if (!select) return;
    select.addEventListener('change', () => {
      const day = Number(select.value || 0);
      const row = latestCalendarRows.find((candidate) => Number(candidate.day) === day) || latestCalendarRows[0];
      if (!row) return;
      saveSelectedDay(row.day);
      renderSelectedDay(row, latestPlatformCards);
    });
  }

  function renderSelectedDay(row, cards) {
    const target = document.getElementById('todayCockpit');
    if (!target || !row) return;
    const visual = cards.get(row.featured_app) || {};
    const png = row.asset_used || visual.png || pngFromSvg(row.visual_asset);
    const svg = row.visual_asset || visual.file || String(png || '').replace(/\.png$/, '.svg');
    const cta = row.cta_text || row.safe_route || '';
    const copyId = `selected-day-${row.day}-plan`;
    const copyText = [
      `Day ${row.day}: ${row.featured_app}`,
      `Week: ${row.week}`,
      `Primary channel: ${row.channel_focus}`,
      `Secondary channels: ${row.secondary_channels}`,
      `Goal: ${row.post_goal}`,
      `Caption angle: ${row.suggested_caption_angle}`,
      `CTA: ${cta}`,
      row.public_url ? `Public URL: ${row.public_url}` : '',
      row.dm_keyword ? `DM keyword: ${row.dm_keyword}` : '',
      row.safe_alternate_copy ? `Safe alternate: ${row.safe_alternate_copy}` : '',
      `PNG: ${png}`,
      `SVG: ${svg}`,
      `Approval: ${row.approval_label || 'Public-safe review required'}`,
      row.proof_boundary
    ].filter(Boolean).join('\n');
    copyBlocks.set(copyId, copyText);
    const search = `${row.featured_app} ${row.channel_focus} ${row.secondary_channels} ${row.post_goal} ${row.suggested_caption_angle} ${cta} ${row.approval_label} ${visual.platform || ''} ${visual.copy || ''}`;

    target.innerHTML = `
      <article class="calendar-card today-card filterable-card" data-channel="${escapeHtml(row.channel_focus)}" data-search="${escapeHtml(search)}">
        <div class="today-card-layout">
          <img src="${escapeHtml(png)}" alt="${escapeHtml(row.featured_app)} selected day PNG card" loading="eager" decoding="async">
          <div class="calendar-card-body">
            <div class="calendar-meta"><span>Selected day ${escapeHtml(row.day)}</span><span>Week ${escapeHtml(row.week)}</span><span>${escapeHtml(row.channel_focus)}</span></div>
            <h3>${escapeHtml(row.featured_app)}</h3>
            <p>${escapeHtml(row.suggested_caption_angle)}</p>
            <p class="calendar-cta">${escapeHtml(cta)}</p>
            <div class="calendar-meta"><span>${escapeHtml(row.approval_label || 'Public-safe review')}</span></div>
            <div class="visual-card-actions">
              <button class="copy-action" type="button" data-copy-id="${escapeHtml(copyId)}">Copy Plan</button>
              <a class="download-link" href="${escapeHtml(png)}" download>Download PNG</a>
              <a class="download-link" href="${escapeHtml(svg)}" download>SVG</a>
            </div>
            ${renderChannelButtons(row.featured_app, `selected-day-${row.day}`)}
          </div>
        </div>
      </article>
    `;
    applyVaultFilters();
  }

  function renderVisuals() {
    const target = document.getElementById('generatedVisualGrid');
    if (!target) return;
    target.innerHTML = generatedVisuals.map((visual) => {
      const search = `${visual.title} ${visual.platform} ${visual.copy}`;
      return `
        <article class="visual-card filterable-card" data-search="${escapeHtml(search)}">
          <img src="${escapeHtml(visual.file)}" alt="${escapeHtml(visual.title)} generated social card" loading="lazy" decoding="async">
          <div class="visual-card-body">
            <h3>${escapeHtml(visual.title)}</h3>
            <p>${escapeHtml(visual.platform)}. ${escapeHtml(visual.copy)}</p>
            <div class="visual-card-actions">
              <a class="download-link" href="${escapeHtml(pngFromSvg(visual.file))}" download>Download PNG</a>
              <a class="download-link" href="${escapeHtml(visual.file)}" download>Download SVG</a>
            </div>
          </div>
        </article>
      `;
    }).join('');
    applyVaultFilters();
  }

  async function renderSourcePreviews() {
    const target = document.getElementById('sourcePreviewGrid');
    if (!target) return;
    const cards = await Promise.all(sourcePreviewPacks.map(async (preview) => {
      const pack = packs.find((candidate) => candidate.id === preview.packId);
      if (!pack) return '';
      const copyAllId = `${pack.id}-full`;
      try {
        const response = await fetch(pack.path, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const markdown = (await response.text()).trim();
        copyBlocks.set(copyAllId, markdown);
        const sections = splitMarkdownSections(markdown, pack.headingPattern, pack.limit);
        const first = sections[0] || { title: pack.title, body: markdown };
        const previewText = `${first.title}\n\n${previewExcerpt(first.body)}`.trim();
        const previewCopyId = `${pack.id}-preview`;
        copyBlocks.set(previewCopyId, previewText);
        return `
          <article class="copy-card source-preview-card filterable-card" data-search="${escapeHtml(`${pack.title} ${previewText}`)}">
            <h3>${escapeHtml(pack.title)}</h3>
            <p>${escapeHtml(sections.length || pack.limit)} rendered posting blocks available.</p>
            <textarea readonly spellcheck="false">${escapeHtml(previewText)}</textarea>
            <div class="copy-card-actions">
              <button class="copy-action" type="button" data-copy-id="${escapeHtml(previewCopyId)}">Copy Featured</button>
              <button class="copy-action" type="button" data-copy-id="${escapeHtml(copyAllId)}" data-copy-src="${escapeHtml(pack.path)}">Copy Pack</button>
              <button class="copy-action" type="button" data-scroll-target="${escapeHtml(preview.targetSelector)}">${escapeHtml(preview.actionLabel)}</button>
            </div>
          </article>
        `;
      } catch (_error) {
        return `
          <article class="copy-card source-preview-card">
            <h3>${escapeHtml(pack.title)}</h3>
            <p>The rendered preview is still loading. Use the section button to jump to the live copy grid.</p>
            <div class="copy-card-actions">
              <button class="copy-action" type="button" data-scroll-target="${escapeHtml(preview.targetSelector)}">${escapeHtml(preview.actionLabel)}</button>
            </div>
          </article>
        `;
      }
    }));
    target.innerHTML = cards.filter(Boolean).join('');
    applyVaultFilters();
  }

  async function renderOpsSources() {
    const target = document.getElementById('opsSourceGrid');
    const status = document.getElementById('opsSourceStatus');
    if (!target) return;
    try {
      const [runbookResponse, quickResponse, logResponse] = await Promise.all([
        fetch('content/social-vault/social-vault-end-to-end-runbook.md', { cache: 'no-store' }),
        fetch('content/social-vault/platform-app-quick-launch-index.json', { cache: 'no-store' }),
        fetch('content/social-vault/platform-app-posting-log-template.csv', { cache: 'no-store' })
      ]);
      if (!runbookResponse.ok) throw new Error(`runbook HTTP ${runbookResponse.status}`);
      if (!quickResponse.ok) throw new Error(`quick HTTP ${quickResponse.status}`);
      if (!logResponse.ok) throw new Error(`log HTTP ${logResponse.status}`);

      const runbook = (await runbookResponse.text()).trim();
      const quick = await quickResponse.json();
      const logTemplate = (await logResponse.text()).trim();
      copyBlocks.set('runbook-full', runbook);
      copyBlocks.set('posting-log-csv-full', logTemplate);

      const runbookSections = splitMarkdownSections(runbook, /^##\s+/, 6);
      const runbookCards = runbookSections.map((section, index) => {
        const copyId = `runbook-section-${index}`;
        const text = `${section.title}\n\n${section.body}`.trim();
        copyBlocks.set(copyId, text);
        return `
          <article class="ops-card copy-card filterable-card" data-search="${escapeHtml(text)}">
            <h3>${escapeHtml(section.title)}</h3>
            <div class="ops-readable">${renderTextLines(section.body)}</div>
            <div class="copy-card-actions">
              <button class="copy-action" type="button" data-copy-id="${escapeHtml(copyId)}">Copy</button>
            </div>
          </article>
        `;
      });

      const quickRows = Array.isArray(quick.rows) ? quick.rows.slice(0, 8) : [];
      const quickCards = quickRows.map((row) => {
        const copyId = `quick-launch-${row.day}`;
        const text = [
          `Day ${row.day}: ${row.title}`,
          `Primary channel: ${row.channel_focus}`,
          `Secondary channels: ${row.secondary_channels}`,
          `CTA: ${row.cta}`,
          row.public_url ? `Public URL: ${row.public_url}` : '',
          row.dm_keyword ? `DM keyword: ${row.dm_keyword}` : '',
          `PNG: ${row.visual_png}`,
          `Approval: ${row.approval_label}`
        ].filter(Boolean).join('\n');
        copyBlocks.set(copyId, text);
        return `
          <article class="ops-card quick-launch-card filterable-card" data-search="${escapeHtml(text)}">
            <img src="${escapeHtml(row.visual_png)}" alt="${escapeHtml(row.title)} quick launch PNG" loading="lazy" decoding="async">
            <div>
              <div class="calendar-meta"><span>Day ${escapeHtml(row.day)}</span><span>${escapeHtml(row.channel_focus)}</span></div>
              <h3>${escapeHtml(row.title)}</h3>
              <p>${escapeHtml(row.cta)}</p>
              <div class="copy-card-actions">
                <button class="copy-action" type="button" data-copy-id="${escapeHtml(copyId)}">Copy Row</button>
                <button class="copy-action" type="button" data-scroll-target="#daily-calendar">Open Calendar</button>
              </div>
            </div>
          </article>
        `;
      });

      target.innerHTML = [...runbookCards, ...quickCards].join('');
      if (status) status.textContent = `${runbookSections.length} runbook sections and ${quickRows.length} quick launch rows rendered`;
    } catch (_error) {
      target.innerHTML = `
        <article class="ops-card copy-card">
          <h3>Operator runbook</h3>
          <p>The operator source did not load in this context. Refresh the page or use the rendered daily calendar and copy grids below.</p>
          <div class="copy-card-actions">
            <button class="copy-action" type="button" data-scroll-target="#daily-calendar">Open Calendar</button>
          </div>
        </article>
      `;
      if (status) status.textContent = 'Operator source is waiting on local static assets';
    }
    applyVaultFilters();
  }

  async function renderPlatformVisuals() {
    const target = document.getElementById('platformVisualGrid');
    if (!target) return;
    try {
      const response = await fetch('assets/social/generated/platforms/platform-cards.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json();
      const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
      target.innerHTML = cards.map((visual) => {
        const png = visual.png || pngFromSvg(visual.file);
        const search = `${visual.title} ${visual.platform} ${visual.copy}`;
        return `
          <article class="visual-card filterable-card" data-search="${escapeHtml(search)}">
            <img src="${escapeHtml(visual.file)}" alt="${escapeHtml(visual.title)} platform campaign card" loading="lazy" decoding="async">
            <div class="visual-card-body">
              <h3>${escapeHtml(visual.title)}</h3>
              <p>${escapeHtml(visual.platform)}. ${escapeHtml(visual.copy)}</p>
              <div class="visual-card-actions">
                <a class="download-link" href="${escapeHtml(png)}" download>Download PNG</a>
                <a class="download-link" href="${escapeHtml(visual.file)}" download>Download SVG</a>
              </div>
            </div>
          </article>
        `;
      }).join('');
    } catch (_error) {
      target.innerHTML = `
        <article class="visual-card">
          <div class="visual-card-body">
            <h3>Platform cards</h3>
            <p>The platform card manifest is still loading in this context. The generated image wall below remains available.</p>
            <div class="visual-card-actions">
              <button class="copy-action" type="button" data-scroll-target="#generated-images">Open Images</button>
            </div>
          </div>
        </article>
      `;
    }
    applyVaultFilters();
  }

  async function renderRealSurfaceVisuals() {
    const target = document.getElementById('realSurfaceGrid');
    if (!target) return;
    try {
      const response = await fetch('assets/social/actual-app-surfaces/actual-app-surface-cards.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json();
      const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
      target.innerHTML = cards.map((visual, index) => {
        const copyId = `real-surface-card-${index}`;
        const thread = Array.isArray(visual.thread) ? visual.thread.map((line, threadIndex) => `${threadIndex + 1}/${visual.thread.length} ${line}`).join('\n') : '';
        const copyText = [
          visual.title,
          `Lane: ${visual.lane}`,
          `Captured app surface: ${visual.capturePath || visual.sourceUrl}`,
          `Card PNG: ${visual.file}`,
          `Screenshot: ${visual.screenshot}`,
          '',
          'LinkedIn / Facebook:',
          visual.caption,
          '',
          'Instagram caption:',
          `${visual.headline} ${visual.subhead} ${visual.caption}`,
          '',
          'X thread:',
          thread,
          '',
          `CTA: ${visual.cta} - ${visual.ctaUrl || visual.sourceUrl}`
        ].filter(Boolean).join('\n');
        copyBlocks.set(copyId, copyText);
        const source = visual.capturePath || visual.sourceUrl || '';
        const ctaUrl = visual.ctaUrl || visual.sourceUrl || '#';
        const search = `${visual.title} ${visual.lane} ${visual.headline} ${visual.subhead} ${visual.caption} ${source} ${ctaUrl}`;
        return `
          <article class="visual-card real-surface-card filterable-card" data-search="${escapeHtml(search)}">
            <img src="${escapeHtml(visual.file)}" alt="${escapeHtml(visual.title)} actual app surface social card" loading="lazy" decoding="async">
            <div class="visual-card-body">
              <h3>${escapeHtml(visual.title)}</h3>
              <p>${escapeHtml(visual.lane)}. ${escapeHtml(visual.subhead)}</p>
              <p class="surface-source">Capture: ${escapeHtml(source)}</p>
              <div class="visual-card-actions">
                <button class="copy-action" type="button" data-copy-id="${escapeHtml(copyId)}">Copy Post Set</button>
                <a class="download-link" href="${escapeHtml(visual.file)}" download>Download PNG</a>
                <a class="download-link" href="${escapeHtml(visual.screenshot)}" download>Screenshot</a>
                <a class="download-link" href="${escapeHtml(ctaUrl)}" target="_blank" rel="noopener">Open CTA</a>
              </div>
            </div>
          </article>
        `;
      }).join('');
    } catch (_error) {
      target.innerHTML = `
        <article class="visual-card">
          <div class="visual-card-body">
            <h3>Actual app surface cards</h3>
            <p>The actual-app-surface manifest did not load in this context. The copy pack and direct image links above remain available.</p>
            <div class="visual-card-actions">
              <button class="copy-action" type="button" data-copy-id="real-surface-pack-full" data-copy-src="content/social-vault/actual-app-surface-founder-campaign-pack.md">Copy Pack</button>
            </div>
          </div>
        </article>
      `;
    }
    applyVaultFilters();
  }

  async function renderFounderSurfaceVisuals() {
    const target = document.getElementById('founderSurfaceGrid');
    if (!target) return;
    try {
      const response = await fetch('assets/social/generated/founder-surfaces/founder-surface-cards.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json();
      const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
      target.innerHTML = cards.map((visual, index) => {
        const png = visual.png || pngFromSvg(visual.file);
        const copyId = `founder-surface-card-${index}`;
        const copyText = [
          visual.title,
          `Lane: ${visual.lane}`,
          `Audience: ${visual.audience}`,
          `Offer: ${visual.offer}`,
          `Proof: ${visual.proof}`,
          `Founder angle: ${visual.angle}`,
          `Source surface: ${visual.source_surface}`,
          `CTA: ${visual.cta_text}`,
          `PNG: ${png}`,
          `SVG: ${visual.file}`
        ].filter(Boolean).join('\n');
        copyBlocks.set(copyId, copyText);
        const search = `${visual.title} ${visual.lane} ${visual.audience} ${visual.offer} ${visual.proof} ${visual.angle} ${visual.source_surface} ${visual.cta_text}`;
        return `
          <article class="visual-card founder-surface-card filterable-card" data-search="${escapeHtml(search)}">
            <img src="${escapeHtml(visual.file)}" alt="${escapeHtml(visual.title)} founder and app surface campaign card" loading="lazy" decoding="async">
            <div class="visual-card-body">
              <h3>${escapeHtml(visual.title)}</h3>
              <p>${escapeHtml(visual.lane)}. ${escapeHtml(visual.offer)}</p>
              <p class="surface-source">Source: ${escapeHtml(visual.source_surface || 'public-safe surface')}</p>
              <div class="visual-card-actions">
                <button class="copy-action" type="button" data-copy-id="${escapeHtml(copyId)}">Copy Surface Plan</button>
                <a class="download-link" href="${escapeHtml(png)}" download>Download PNG</a>
                <a class="download-link" href="${escapeHtml(visual.file)}" download>SVG</a>
              </div>
            </div>
          </article>
        `;
      }).join('');
    } catch (_error) {
      target.innerHTML = `
        <article class="visual-card">
          <div class="visual-card-body">
            <h3>Founder surface cards</h3>
            <p>The founder surface manifest is still loading in this context. The source copy pack remains available below.</p>
            <div class="visual-card-actions">
              <button class="copy-action" type="button" data-copy-id="founder-surface-pack-full" data-copy-src="content/social-vault/founder-surface-campaign-pack.md">Copy Pack</button>
            </div>
          </div>
        </article>
      `;
    }
    applyVaultFilters();
  }

  async function renderCalendar() {
    const target = document.getElementById('calendarGrid');
    if (!target) return;
    try {
      const [calendarResponse, manifestResponse] = await Promise.all([
        fetch('content/social-vault/platform-app-posting-calendar.json', { cache: 'no-store' }),
        fetch('assets/social/generated/platforms/platform-cards.json', { cache: 'no-store' })
      ]);
      if (!calendarResponse.ok) throw new Error(`calendar HTTP ${calendarResponse.status}`);
      if (!manifestResponse.ok) throw new Error(`manifest HTTP ${manifestResponse.status}`);

      const calendar = await calendarResponse.json();
      const manifest = await manifestResponse.json();
      const rows = Array.isArray(calendar.rows) ? calendar.rows : [];
      const cards = new Map((manifest.cards || []).map((card) => [card.title, card]));
      latestCalendarRows = rows;
      latestPlatformCards = cards;
      populateChannelFilter(rows);
      populateDaySelect(rows);
      renderSelectedDay(selectedCalendarRow(rows), cards);

      target.innerHTML = rows.map((row) => {
        const visual = cards.get(row.featured_app) || {};
        const png = row.asset_used || visual.png || pngFromSvg(row.visual_asset);
        const svg = row.visual_asset || visual.file || png.replace(/\.png$/, '.svg');
        const cta = row.cta_text || row.safe_route || '';
        const copyId = `calendar-day-${row.day}`;
        const copyText = [
          `Day ${row.day}: ${row.featured_app}`,
          `Primary channel: ${row.channel_focus}`,
          `Secondary channels: ${row.secondary_channels}`,
          `Goal: ${row.post_goal}`,
          `Caption angle: ${row.suggested_caption_angle}`,
          `CTA: ${cta}`,
          `PNG: ${png}`,
          `Approval: ${row.approval_label || 'Public-safe review required'}`,
          row.proof_boundary
        ].filter(Boolean).join('\n');
        copyBlocks.set(copyId, copyText);
        const search = `${row.featured_app} ${row.channel_focus} ${row.secondary_channels} ${row.post_goal} ${row.suggested_caption_angle} ${cta} ${row.approval_label} ${visual.platform || ''} ${visual.copy || ''}`;

        return `
          <article class="calendar-card filterable-card" data-channel="${escapeHtml(row.channel_focus)}" data-search="${escapeHtml(search)}">
            <img src="${escapeHtml(png)}" alt="${escapeHtml(row.featured_app)} upload-ready PNG card" loading="lazy" decoding="async">
            <div class="calendar-card-body">
              <div class="calendar-meta"><span>Day ${escapeHtml(row.day)}</span><span>Week ${escapeHtml(row.week)}</span><span>${escapeHtml(row.channel_focus)}</span></div>
              <h3>${escapeHtml(row.featured_app)}</h3>
              <p>${escapeHtml(row.suggested_caption_angle)}</p>
              <p class="calendar-cta">${escapeHtml(cta)}</p>
              <div class="calendar-meta"><span>${escapeHtml(row.approval_label || 'Public-safe review')}</span></div>
              <div class="visual-card-actions">
                <button class="copy-action" type="button" data-copy-id="${escapeHtml(copyId)}">Copy Plan</button>
                <a class="download-link" href="${escapeHtml(png)}" download>Download PNG</a>
                <a class="download-link" href="${escapeHtml(svg)}" download>SVG</a>
              </div>
            </div>
          </article>
        `;
      }).join('');
    } catch (_error) {
      target.innerHTML = `
        <article class="calendar-card">
          <div class="calendar-card-body">
            <h3>Calendar source</h3>
            <p>The calendar data did not load in this context. The rendered copy banks below still contain the posting material.</p>
            <div class="visual-card-actions">
              <button class="copy-action" type="button" data-scroll-target="#platform-campaign">Open Copy Bank</button>
            </div>
          </div>
        </article>
      `;
    }
    applyVaultFilters();
  }

  function renderSections(targetId, packTitle, sections) {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.innerHTML = sections.map((section, index) => {
      const text = `${section.title}\n\n${section.body}`.trim();
      const copyId = `${targetId}-${index}`;
      copyBlocks.set(copyId, text);
      const channelButtons = targetId === 'platformCampaignGrid' ? renderChannelButtons(section.title, copyId) : '';
      return `
        <article class="copy-card filterable-card" data-search="${escapeHtml(text)}">
          <h3>${escapeHtml(section.title)}</h3>
          <p>${escapeHtml(packTitle)} ${String(index + 1).padStart(2, '0')}</p>
          <textarea readonly spellcheck="false">${escapeHtml(text)}</textarea>
          <div class="copy-card-actions">
            ${channelButtons}
            <button class="copy-action" type="button" data-copy-id="${escapeHtml(copyId)}">Copy</button>
          </div>
        </article>
      `;
    }).join('');
    applyVaultFilters();
  }

  async function loadPack(pack) {
    const status = document.querySelector(`[data-pack-status="${pack.id}"]`);
    try {
      const response = await fetch(pack.path, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const markdown = await response.text();
      copyBlocks.set(`${pack.id}-full`, markdown.trim());
      const sections = splitMarkdownSections(markdown, pack.headingPattern, pack.limit);
      renderSections(pack.target, pack.title, sections);
      if (status) status.textContent = `${sections.length} copy blocks loaded`;
    } catch (_error) {
      const target = document.getElementById(pack.target);
      if (target) {
        target.innerHTML = `
          <article class="copy-card">
            <h3>${escapeHtml(pack.title)}</h3>
            <p>The rendered pack did not load in this context. Refresh the page or use the launch card copy controls above.</p>
            <div class="copy-card-actions">
              <button class="copy-action" type="button" data-copy-id="${escapeHtml(`${pack.id}-full`)}" data-copy-src="${escapeHtml(pack.path)}">Copy Pack</button>
            </div>
          </article>
        `;
      }
      if (status) status.textContent = 'Pack link ready';
    }
  }

  function mountCopyButtons() {
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-copy-id]');
      if (!button) return;
      const copyId = button.getAttribute('data-copy-id') || '';
      let value = copyBlocks.get(copyId) || '';
      const copySrc = button.getAttribute('data-copy-src');
      if (!value && copySrc) {
        try {
          const response = await fetch(copySrc, { cache: 'no-store' });
          if (response.ok) {
            value = await response.text();
            copyBlocks.set(copyId, value);
          }
        } catch (_error) {
          value = '';
        }
      }
      if (!value) {
        const original = button.textContent;
        button.textContent = 'Retry';
        window.setTimeout(() => { button.textContent = original || 'Copy'; }, 1200);
        return;
      }
      try {
        await navigator.clipboard.writeText(value);
        const original = button.textContent;
        button.textContent = 'Copied';
        window.setTimeout(() => { button.textContent = original || 'Copy'; }, 1200);
      } catch (_error) {
        const card = button.closest('.copy-card, .calendar-card');
        const textarea = card && card.querySelector('textarea');
        if (textarea) {
          textarea.focus();
          textarea.select();
        }
      }
    });
  }

  async function boot() {
    mountVaultFilters();
    mountDaySelect();
    mountSectionButtons();
    mountCopyButtons();
    await loadChannelSnippets();
    renderCalendar();
    renderVisuals();
    renderRealSurfaceVisuals();
    renderPlatformVisuals();
    renderFounderSurfaceVisuals();
    renderSourcePreviews();
    renderOpsSources();
    packs.forEach(loadPack);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
