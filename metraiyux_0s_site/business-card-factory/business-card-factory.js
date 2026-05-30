(() => {
  'use strict';

  const zeroOsOrigin = 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev';
  const connectLogAppUrl = `${zeroOsOrigin}/connectlog-v7.7-relay13-operator-proof/app.html`;
  const regularCardsUrl = 'https://metraiyux-0s-marketing.pages.dev/business-cards.html';
  const directoryUrl = '/valley-verified/data/businesses-lite.json';
  const contactEmail = 'grayskyes@solenterprises.org';
  const contactPhone = '1-(800)-484-4788';
  const els = {};
  let directory = [];
  let selected = null;
  let handoffUrl = '';
  let clientUrl = '';
  let regularCardsHandoffUrl = regularCardsUrl;
  let gatewayCopy = null;

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    bind();
    bindEvents();
    await loadDirectory();
    selectBusiness(resolveInitialBusiness());
    gatewayCopy = fallbackGatewayCopy(currentPayload());
    renderGatewayCopy(gatewayCopy);
    await loadGatewayStatus();
  }

  function bind() {
    [
      'directoryCount',
      'clientSearch',
      'clientResultsMeta',
      'clientResults',
      'businessName',
      'businessCity',
      'businessCategory',
      'businessContact',
      'priorityCode',
      'skyemerit',
      'openConnectLog',
      'openClientPage',
      'openRegularCards',
      'generateGatewayCopy',
      'copyHandoff',
      'printCard',
      'downloadReceipt',
      'handoffUrl',
      'gatewayStatus',
      'aiCardScript',
      'aiWelcome',
      'aiFollowup',
      'aiProof',
      'factoryQr',
      'cardBusiness',
      'cardMeta',
      'cardContact',
      'cardCode',
      'proofStrip'
    ].forEach((id) => { els[id] = document.getElementById(id); });
  }

  function bindEvents() {
    els.clientSearch.addEventListener('input', () => renderResults(els.clientSearch.value));
    ['businessName', 'businessCity', 'businessCategory', 'businessContact', 'priorityCode', 'skyemerit'].forEach((id) => {
      els[id].addEventListener('input', renderCard);
    });
    els.openConnectLog.addEventListener('click', () => window.open(handoffUrl, '_blank', 'noopener'));
    els.openClientPage.addEventListener('click', () => window.open(clientUrl, '_blank', 'noopener'));
    els.openRegularCards.addEventListener('click', () => window.open(regularCardsHandoffUrl, '_blank', 'noopener'));
    els.generateGatewayCopy.addEventListener('click', generateGatewayCopy);
    els.copyHandoff.addEventListener('click', () => copyText(handoffUrl));
    els.printCard.addEventListener('click', () => window.print());
    els.downloadReceipt.addEventListener('click', downloadReceipt);
  }

  async function loadDirectory() {
    try {
      const response = await fetch(directoryUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Directory HTTP ${response.status}`);
      const payload = await response.json();
      directory = Array.isArray(payload) ? payload : Array.isArray(payload.businesses) ? payload.businesses : [];
    } catch (error) {
      console.warn('Directory fallback loaded:', error);
      directory = [fallbackBusiness()];
    }
    els.directoryCount.textContent = directory.length.toString();
    renderResults('');
  }

  function fallbackBusiness() {
    return {
      id: 'bobs-smoke-shop-litchfield-park',
      name: "Bob's Smoke Shop",
      city: 'Litchfield Park',
      category: 'Retail & Specialty',
      niche: 'Smoke Shop',
      url: '/valley-verified/business/bobs-smoke-shop-litchfield-park/'
    };
  }

  function renderResults(query) {
    const q = String(query || '').trim().toLowerCase();
    const matches = q ? directory.filter((item) => searchable(item).includes(q)) : directory;
    if (els.clientResultsMeta) {
      els.clientResultsMeta.textContent = `Showing ${matches.length} of ${directory.length} unique Valley businesses`;
    }
    els.clientResults.replaceChildren();
    matches.forEach((business) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `bcf-result${selected?.id === business.id ? ' is-active' : ''}`;
      const name = document.createElement('strong');
      name.textContent = business.name || 'Unnamed business';
      const meta = document.createElement('span');
      meta.textContent = [business.city, titleText(business.category), business.niche].filter(Boolean).join(' / ');
      button.append(name, meta);
      button.addEventListener('click', () => selectBusiness(business));
      els.clientResults.append(button);
    });
    if (!matches.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No Valley client matched that search.';
      els.clientResults.append(empty);
    }
  }

  function selectBusiness(business) {
    selected = business || fallbackBusiness();
    els.businessName.value = selected.name || '';
    els.businessCity.value = selected.city || '';
    els.businessCategory.value = titleText(selected.category || selected.niche || '');
    els.businessContact.value = selected.contact || 'Owner';
    els.priorityCode.value = buildPriorityCode(selected.name, selected.city);
    els.skyemerit.value = `31% through ${addDaysIso(7)}`;
    renderResults(els.clientSearch.value);
    renderCard();
  }

  function renderCard() {
    const name = els.businessName.value || selected?.name || 'Valley Verified Client';
    const city = els.businessCity.value || selected?.city || 'Phoenix Metro';
    const category = els.businessCategory.value || selected?.category || 'Valley Verified';
    const contact = els.businessContact.value || 'Owner';
    const code = els.priorityCode.value || buildPriorityCode(name, city);
    const expires = extractIso(els.skyemerit.value) || addDaysIso(7);
    clientUrl = businessUrl(selected, name);
    handoffUrl = buildHandoffUrl({ name, city, category, contact, code, expires, clientUrl });
    regularCardsHandoffUrl = buildRegularCardsUrl({ name, city, category, contact });

    els.handoffUrl.value = handoffUrl;
    els.cardBusiness.textContent = name.toUpperCase();
    els.cardBusiness.style.fontSize = name.length > 26 ? 'clamp(1.1rem, 3vw, 2.2rem)' : '';
    els.cardMeta.textContent = `${city} / ${category}`;
    els.cardContact.textContent = `Contact: ${contact}`;
    els.cardCode.textContent = code;
    els.proofStrip.innerHTML = `<span class="bcf-merit-proof"><img src="/assets/skyes-over-london-deity-logo.png" alt="">${escapeHtml(els.skyemerit.value || '31% SkyeMerit')} / Selected ID: ${escapeHtml(selected?.id || 'manual-client')}</span><code>${escapeHtml(handoffUrl)}</code>`;
    drawQr(els.factoryQr, handoffUrl);
    gatewayCopy = fallbackGatewayCopy(currentPayload());
    renderGatewayCopy(gatewayCopy);
  }

  function buildHandoffUrl({ name, city, category, contact, code, expires, clientUrl }) {
    const url = new URL(connectLogAppUrl);
    url.searchParams.set('source', 'business-card-factory');
    url.searchParams.set('sourceLabel', '0S Business Card Factory');
    url.searchParams.set('cardKind', 'valley-verified');
    url.searchParams.set('cardTitle', 'Valley Verified Priority Access');
    url.searchParams.set('clientId', selected?.id || code.toLowerCase());
    url.searchParams.set('business', name);
    url.searchParams.set('city', city);
    url.searchParams.set('category', category);
    url.searchParams.set('contact', contact);
    url.searchParams.set('priorityCode', code);
    url.searchParams.set('valleyUrl', clientUrl);
    url.searchParams.set('cardUrl', clientUrl);
    url.searchParams.set('skyemerit', '31');
    url.searchParams.set('expires', expires);
    url.searchParams.set('install', '1');
    url.searchParams.set('operator', 'Gray London Skyes');
    url.searchParams.set('operatorEmail', contactEmail);
    url.searchParams.set('operatorPhone', contactPhone);
    return url.toString();
  }

  function businessUrl(business, name) {
    const raw = business?.landing_page_url || business?.url || '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw) return `${zeroOsOrigin}${raw.startsWith('/') ? raw : `/${raw}`}`;
    return `${zeroOsOrigin}/valley-verified/?q=${encodeURIComponent(name)}`;
  }

  function resolveInitialBusiness() {
    const params = new URLSearchParams(window.location.search);
    const clientId = params.get('clientId') || params.get('client') || params.get('id');
    const businessName = params.get('business') || params.get('q');
    const match = directory.find((item) => {
      const id = String(item.id || '').toLowerCase();
      const name = String(item.name || '').toLowerCase();
      return (clientId && id === clientId.toLowerCase()) || (businessName && name === businessName.toLowerCase());
    });
    if (match) return match;
    if (businessName) {
      return {
        id: clientId || slugPart(businessName, 'client').toLowerCase(),
        name: businessName,
        city: params.get('city') || 'Phoenix Metro',
        category: params.get('category') || 'Valley Verified',
        contact: params.get('contact') || 'Owner',
        url: ''
      };
    }
    return directory.find((item) => item.id === 'bobs-smoke-shop-litchfield-park') || directory[0] || fallbackBusiness();
  }

  function buildRegularCardsUrl({ name, city, category, contact }) {
    const url = new URL(regularCardsUrl);
    url.searchParams.set('clientId', selected?.id || slugPart(name, 'client').toLowerCase());
    url.searchParams.set('business', name);
    url.searchParams.set('city', city);
    url.searchParams.set('category', category);
    url.searchParams.set('contact', contact);
    return url.toString();
  }

  function drawQr(canvas, value) {
    if (!canvas || !window.qrcode) return;
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const size = 304;
    const margin = 2;
    const count = qr.getModuleCount();
    const cell = size / (count + margin * 2);
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = '#09070c';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#f4c75b';
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (!qr.isDark(row, col)) continue;
        const x = Math.floor((col + margin) * cell);
        const y = Math.floor((row + margin) * cell);
        const nextX = Math.ceil((col + margin + 1) * cell);
        const nextY = Math.ceil((row + margin + 1) * cell);
        ctx.fillRect(x, y, Math.max(1, nextX - x), Math.max(1, nextY - y));
      }
    }
  }

  function buildPriorityCode(name, city) {
    const first = slugPart(name, 'CLIENT');
    const cityCode = String(city || 'AZ').split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 3).toUpperCase() || 'AZ';
    return `VV-${first}-${cityCode}`;
  }

  function slugPart(value, fallback) {
    return String(value || fallback)
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.slice(0, 4))
      .join('');
  }

  function searchable(item) {
    return [item.name, item.city, item.category, item.niche, item.zip, item.id].join(' ').toLowerCase();
  }

  function titleText(value) {
    return String(value || '').replace(/\bAnd\b/g, '&');
  }

  function addDaysIso(days) {
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
  }

  function extractIso(value) {
    return String(value || '').match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';
  }

  function downloadReceipt() {
    const receipt = {
      ok: true,
      generated_at: new Date().toISOString(),
      app: '0s-business-card-factory',
      selected_business_id: selected?.id || null,
      selected_business_name: els.businessName.value,
      client_url: clientUrl,
      connectlog_handoff_url: handoffUrl,
      priority_code: els.priorityCode.value,
      skyemerit: els.skyemerit.value,
      contact: {
        operator: 'Gray London Skyes',
        email: contactEmail,
        phone: contactPhone,
        company: 'Skyes Over London',
        holding_company: 'SOLEnterprises International Nexus & Holdings'
      },
      gateway_copy: gatewayCopy || fallbackGatewayCopy(currentPayload())
    };
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `business-card-factory-${receipt.priority_code || 'receipt'}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function loadGatewayStatus() {
    try {
      const response = await fetch('/api/business-card-factory/status', { credentials: 'same-origin', cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      els.gatewayStatus.textContent = data.gateway_configured
        ? 'FS27 gateway online'
        : data.openai_direct_configured
          ? '0S provider lane online'
          : 'Local fallback ready';
      els.aiProof.textContent = data.gateway_configured
        ? 'Server-side 0S route is configured to call the FS27/Kaixu gateway. Provider keys stay off the page.'
        : data.openai_direct_configured
          ? 'The 0S Worker is holding the provider key server-side for this copy pass. Nothing sensitive is exposed to the browser.'
          : 'The 0S route is live. If the gateway token is unavailable, it returns deterministic operator copy instead of exposing provider keys.';
    } catch (error) {
      els.gatewayStatus.textContent = 'Route pending auth';
      els.aiProof.textContent = `Gateway status check did not complete: ${error.message}`;
    }
  }

  async function generateGatewayCopy() {
    const payload = currentPayload();
    els.generateGatewayCopy.disabled = true;
    els.generateGatewayCopy.textContent = 'Generating...';
    els.gatewayStatus.textContent = 'Running copy pass';
    try {
      const response = await fetch('/api/business-card-factory/copy-pass', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      gatewayCopy = normalizeGatewayCopy(data.copy || data.result || {}, payload);
      renderGatewayCopy(gatewayCopy);
      els.gatewayStatus.textContent = data.provider_path || (data.gateway_configured === false ? 'Local fallback returned' : 'Gateway copy ready');
      els.aiProof.textContent = `Receipt: ${data.receipt_id || 'not recorded'} / ${data.provider_path || 'copy-pass'}`;
    } catch (error) {
      gatewayCopy = fallbackGatewayCopy(payload);
      renderGatewayCopy(gatewayCopy);
      els.gatewayStatus.textContent = 'Fallback copy ready';
      els.aiProof.textContent = `Gateway copy failed safely and used local operator copy: ${error.message}`;
    } finally {
      els.generateGatewayCopy.disabled = false;
      els.generateGatewayCopy.textContent = 'Generate Gateway Copy';
    }
  }

  function currentPayload() {
    return {
      business: els.businessName?.value || selected?.name || '',
      city: els.businessCity?.value || selected?.city || '',
      category: els.businessCategory?.value || selected?.category || selected?.niche || '',
      contact: els.businessContact?.value || 'Owner',
      priority_code: els.priorityCode?.value || '',
      skyemerit: els.skyemerit?.value || '',
      client_id: selected?.id || '',
      client_url: clientUrl,
      connectlog_handoff_url: handoffUrl,
      source: '0s-business-card-factory'
    };
  }

  function fallbackGatewayCopy(payload = {}) {
    const name = payload.business || 'your business';
    const city = payload.city || 'the Valley';
    const code = payload.priority_code || 'your priority code';
    const merit = payload.skyemerit || '31% for seven days';
    return {
      card_script: `I already built the Valley Verified surface for ${name}. Scan this card and it opens your ConnectLog packet with my direct contact, your live page for ${city}, and the ${merit} activation credit.`,
      connectlog_welcome: `Thank you for working with Skyes Over London. Your ${name} record, client page, ${code}, company contacts, legal links, Media Over London lane, and SkyeMerit activation credit are saved in this ConnectLog workspace.`,
      follow_up_message: `Appreciate you taking a look today. Your Valley Verified page and ConnectLog packet are live. Use ${code} within the seven-day window to activate the 31% SkyeMerit lane for your 0S/content-engine setup.`,
      qr_pitch: 'Scan to open your live page and saved Skyes Over London contact packet.',
      offer_positioning: '31% SkyeMerit activation credit tied to this in-store card handoff.'
    };
  }

  function normalizeGatewayCopy(raw = {}, payload = {}) {
    const fallback = fallbackGatewayCopy(payload);
    return {
      card_script: cleanText(raw.card_script || raw.cardScript, fallback.card_script),
      connectlog_welcome: cleanText(raw.connectlog_welcome || raw.connectLogWelcome || raw.welcome, fallback.connectlog_welcome),
      follow_up_message: cleanText(raw.follow_up_message || raw.followUpMessage || raw.follow_up, fallback.follow_up_message),
      qr_pitch: cleanText(raw.qr_pitch || raw.qrPitch, fallback.qr_pitch),
      offer_positioning: cleanText(raw.offer_positioning || raw.offerPositioning, fallback.offer_positioning)
    };
  }

  function renderGatewayCopy(copy) {
    if (!copy || !els.aiCardScript) return;
    els.aiCardScript.value = copy.card_script || '';
    els.aiWelcome.value = copy.connectlog_welcome || '';
    els.aiFollowup.value = copy.follow_up_message || '';
  }

  function cleanText(value, fallback) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text || fallback;
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      els.copyHandoff.textContent = 'Copied';
      setTimeout(() => { els.copyHandoff.textContent = 'Copy Handoff'; }, 1400);
    } catch (_) {
      els.handoffUrl.focus();
      els.handoffUrl.select();
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }
})();

// BEGIN quantumskyes:adaptive-neon-scrollbar-js
(function(){
  if(window.__mcpVisibleNeonScrollbars) return;
  window.__mcpVisibleNeonScrollbars = true;

  function onReady(fn){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    }else{
      fn();
    }
  }

  function clamp(value, min, max){
    return Math.min(max, Math.max(min, value));
  }

  function verticalSource(){
    return document.scrollingElement || document.documentElement;
  }

  function horizontalSource(){
    const doc = document.scrollingElement || document.documentElement;
    if(doc.scrollWidth > doc.clientWidth + 4) return { node: doc, mode: 'horizontal' };
    const selectors = [
      '.site-header nav',
      '.table-wrap',
      '.topnav',
      '.route-grid',
      '.command-table',
      '.saas-table'
    ];
    const node = selectors
      .flatMap((selector) => [...document.querySelectorAll(selector)])
      .find((element) => element.scrollWidth > element.clientWidth + 4);
    return node ? { node, mode: 'horizontal' } : { node: doc, mode: 'page' };
  }

  onReady(() => {
    document.documentElement.setAttribute('data-mcp-neon-scrollbar', '');
    document.querySelectorAll('.mcp-neon-scroll-rail,.mcp-neon-scroll-corner').forEach((node) => node.remove());

    const yRail = document.createElement('div');
    yRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-y';
    yRail.setAttribute('aria-hidden', 'true');
    yRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const xRail = document.createElement('div');
    xRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-x';
    xRail.setAttribute('aria-hidden', 'true');
    xRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const corner = document.createElement('div');
    corner.className = 'mcp-neon-scroll-corner';
    corner.setAttribute('aria-hidden', 'true');

    document.body.append(yRail, xRail, corner);

    const yThumb = yRail.querySelector('.mcp-neon-scroll-thumb');
    const xThumb = xRail.querySelector('.mcp-neon-scroll-thumb');
    let activeHorizontal = horizontalSource();
    let raf = 0;
    let dragRaf = 0;
    let pendingDrag = null;
    let metrics = null;

    function measure(){
      const ySource = verticalSource();
      const yTrack = Math.max(1, yRail.clientHeight);
      const yMax = Math.max(1, ySource.scrollHeight - window.innerHeight);
      const yRatio = clamp(window.scrollY / yMax, 0, 1);
      const ySize = clamp((window.innerHeight / Math.max(ySource.scrollHeight, window.innerHeight)) * yTrack, 78, yTrack);

      if(!activeHorizontal?.node || !document.documentElement.contains(activeHorizontal.node)){
        activeHorizontal = horizontalSource();
      }
      const xTrack = Math.max(1, xRail.clientWidth);
      const xSource = activeHorizontal.node;
      const xMax = Math.max(0, xSource.scrollWidth - xSource.clientWidth);
      const pageMode = activeHorizontal.mode === 'page' || xMax <= 1;
      const xRatio = pageMode ? yRatio : clamp(xSource.scrollLeft / xMax, 0, 1);
      const xSize = pageMode
        ? clamp(xTrack * .24, 84, Math.max(84, xTrack * .38))
        : clamp((xSource.clientWidth / Math.max(xSource.scrollWidth, xSource.clientWidth)) * xTrack, 84, xTrack);

      return { ySource, yTrack, yMax, yRatio, ySize, xSource, xTrack, xMax, xRatio, xSize, pageMode };
    }

    function paintRails(view){
      yThumb.style.height = `${Math.floor(view.ySize)}px`;
      yRail.style.setProperty('--mcp-scroll-y', `${Math.round(view.yRatio * Math.max(0, view.yTrack - view.ySize))}px`);
      xThumb.style.width = `${Math.floor(view.xSize)}px`;
      xRail.style.setProperty('--mcp-scroll-x', `${Math.round(view.xRatio * Math.max(0, view.xTrack - view.xSize))}px`);
      xRail.dataset.scrollMode = view.pageMode ? 'page' : 'horizontal';
    }

    function scheduleUpdate(){
      if(raf) return;
      raf = window.requestAnimationFrame(updateRails);
    }

    function updateRails(){
      raf = 0;
      metrics = measure();
      paintRails(metrics);
    }

    function flushDrag(){
      dragRaf = 0;
      if(!pendingDrag) return;
      const { axis, ratio, snapshot } = pendingDrag;
      pendingDrag = null;
      const next = snapshot || measure();
      const bounded = clamp(ratio, 0, 1);

      if(axis === 'y'){
        next.ySource.scrollTop = bounded * next.yMax;
        const yRatio = clamp(next.ySource.scrollTop / Math.max(1, next.yMax), 0, 1);
        paintRails({
          ...next,
          yRatio,
          xRatio: next.pageMode ? yRatio : next.xRatio
        });
      }else if(next.pageMode){
        next.ySource.scrollTop = bounded * next.yMax;
        const yRatio = clamp(next.ySource.scrollTop / Math.max(1, next.yMax), 0, 1);
        paintRails({
          ...next,
          yRatio,
          xRatio: yRatio
        });
      }else{
        next.xSource.scrollLeft = bounded * next.xMax;
        paintRails({
          ...next,
          xRatio: clamp(next.xSource.scrollLeft / Math.max(1, next.xMax), 0, 1)
        });
      }
      scheduleUpdate();
    }

    function queueDrag(axis, ratio, snapshot){
      pendingDrag = { axis, ratio, snapshot };
      if(!dragRaf) dragRaf = window.requestAnimationFrame(flushDrag);
    }

    function bindRail(rail, thumb, axis, setter){
      let dragging = false;
      let pointerOffset = 0;
      let dragSnapshot = null;
      let railStart = 0;
      let track = 1;
      let size = 1;

      function ratioFromEvent(event, keepOffset){
        const coordinate = axis === 'y' ? event.clientY : event.clientX;
        const localOffset = keepOffset ? pointerOffset : size / 2;
        return clamp((coordinate - railStart - localOffset) / Math.max(1, track - size), 0, 1);
      }

      rail.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        dragging = true;
        dragSnapshot = measure();
        const railRect = rail.getBoundingClientRect();
        const thumbRect = thumb.getBoundingClientRect();
        railStart = axis === 'y' ? railRect.top : railRect.left;
        track = axis === 'y' ? dragSnapshot.yTrack : dragSnapshot.xTrack;
        size = axis === 'y' ? dragSnapshot.ySize : dragSnapshot.xSize;
        document.documentElement.classList.add('mcp-neon-scroll-dragging');
        rail.classList.add('is-dragging');
        rail.setPointerCapture?.(event.pointerId);
        pointerOffset = event.target === thumb || thumb.contains(event.target)
          ? (axis === 'y' ? event.clientY - thumbRect.top : event.clientX - thumbRect.left)
          : (axis === 'y' ? thumbRect.height / 2 : thumbRect.width / 2);
        setter(ratioFromEvent(event, event.target === thumb || thumb.contains(event.target)), dragSnapshot);
      });

      rail.addEventListener('pointermove', (event) => {
        if(!dragging) return;
        event.preventDefault();
        setter(ratioFromEvent(event, true), dragSnapshot);
      });

      function endDrag(event){
        if(!dragging) return;
        dragging = false;
        dragSnapshot = null;
        document.documentElement.classList.remove('mcp-neon-scroll-dragging');
        rail.classList.remove('is-dragging');
        rail.releasePointerCapture?.(event.pointerId);
        scheduleUpdate();
      }

      rail.addEventListener('pointerup', endDrag);
      rail.addEventListener('pointercancel', endDrag);
    }

    bindRail(yRail, yThumb, 'y', (ratio, snapshot) => queueDrag('y', ratio, snapshot));
    bindRail(xRail, xThumb, 'x', (ratio, snapshot) => queueDrag('x', ratio, snapshot));

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', () => {
      activeHorizontal = horizontalSource();
      scheduleUpdate();
    }, { passive: true });
    document.addEventListener('scroll', (event) => {
      if(event.target && event.target === activeHorizontal.node) scheduleUpdate();
    }, true);
    document.addEventListener('pointerover', (event) => {
      const candidate = event.target && event.target.closest && event.target.closest('.site-header nav,.table-wrap,.topnav,.route-grid');
      if(candidate && candidate.scrollWidth > candidate.clientWidth + 4){
        activeHorizontal = { node: candidate, mode: 'horizontal' };
        scheduleUpdate();
      }
    }, { passive: true });

    scheduleUpdate();
    window.setTimeout(scheduleUpdate, 350);
    window.setTimeout(scheduleUpdate, 1200);
  });
})();
// END quantumskyes:adaptive-neon-scrollbar-js

// BEGIN quantumskyes:skyesol-living-background-js
function mountSkyeSolLivingBackground({
  canvasSelector = '.skyesol-living-field',
  particleDensity = 16000,
  maxParticles = 120,
  minParticles = 58
} = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.querySelector(canvasSelector);
  if (!canvas || !canvas.getContext || reduceMotion) return () => {};

  const ctx = canvas.getContext('2d');
  const palette = [
    'rgba(201,168,76,',
    'rgba(138,99,255,',
    'rgba(39,242,255,'
  ];
  let width = 0;
  let height = 0;
  let particles = [];
  let raf = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(maxParticles, Math.max(minParticles, Math.floor(width * height / particleDensity)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + .4,
      a: Math.random() * .34 + .12,
      s: Math.random() * .34 + .08,
      phase: Math.random() * Math.PI * 2,
      color: palette[index % palette.length]
    }));
  }

  function drawWave(time, yOffset, colorA, colorB, amp, speed) {
    const gradient = ctx.createLinearGradient(0, yOffset - amp * 2, width, yOffset + amp * 2);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(.5, colorB);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 18) {
      const n = Math.sin((x * .006) + time * speed) * amp;
      const n2 = Math.cos((x * .011) - time * speed * .7) * amp * .46;
      ctx.lineTo(x, yOffset + n + n2);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function animate(now) {
    if (document.body.classList.contains('motion-paused')) {
      raf = requestAnimationFrame(animate);
      return;
    }
    const t = now * .001;
    pointer.x += (pointer.tx - pointer.x) * .035;
    pointer.y += (pointer.ty - pointer.y) * .035;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';
    drawWave(t, height * .28 + pointer.y * 12, 'rgba(138,99,255,0)', 'rgba(138,99,255,.10)', 36, .34);
    drawWave(t, height * .54 - pointer.y * 10, 'rgba(39,242,255,0)', 'rgba(39,242,255,.08)', 42, .24);
    drawWave(t, height * .82, 'rgba(201,168,76,0)', 'rgba(201,168,76,.07)', 28, .28);
    particles.forEach((particle) => {
      const px = particle.x + Math.sin(t * particle.s + particle.phase) * 28 + pointer.x * 10;
      const py = particle.y + Math.cos(t * particle.s * .8 + particle.phase) * 18 + pointer.y * 8;
      ctx.beginPath();
      ctx.arc(px, py, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = `${particle.color}${particle.a})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(animate);
  }

  function onPointerMove(event) {
    pointer.tx = (event.clientX / Math.max(width, 1) - .5) * 2;
    pointer.ty = (event.clientY / Math.max(height, 1) - .5) * 2;
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onPointerMove, { passive: true });
  raf = requestAnimationFrame(animate);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onPointerMove);
  };
}


(function(){
  if(window.__mcpSkyeSolLivingBackgroundMounted) return;
  window.__mcpSkyeSolLivingBackgroundMounted = true;
  function boot(){
    if(typeof mountSkyeSolLivingBackground === 'function') mountSkyeSolLivingBackground();
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
// END quantumskyes:skyesol-living-background-js

// BEGIN quantumskyes:neon-motion-chrome-vanilla-js
(function(){
  if(window.__mcpNeonMotionChrome) return;
  window.__mcpNeonMotionChrome = true;
  function ready(fn){ document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn(); }
  ready(function(){
    if(!document.querySelector('.neon-scroll-progress')){
      const progress = document.createElement('i');
      progress.className = 'neon-scroll-progress';
      progress.setAttribute('aria-hidden', 'true');
      document.body.append(progress);
      const update = function(){
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        progress.style.transform = 'scaleX(' + Math.min(1, Math.max(0, window.scrollY / max)) + ')';
      };
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      update();
    }
    if(!document.querySelector('.neon-cursor-trail') && matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches){
      const glow = document.createElement('div');
      glow.className = 'neon-cursor-trail';
      glow.setAttribute('aria-hidden', 'true');
      document.body.append(glow);
      window.addEventListener('pointermove', function(event){
        glow.style.transform = 'translate3d(' + (event.clientX - 150) + 'px,' + (event.clientY - 150) + 'px,0)';
      }, { passive: true });
    }
  });
})();
// END quantumskyes:neon-motion-chrome-vanilla-js
