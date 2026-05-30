(() => {
  "use strict";

  const STORAGE_OWNER = "MetrAIyuxGateBridge";
  const SAAS_SESSION_KEY = "saas_client_session";
  const LEGACY_KEYS = [
    "SKYGATEFS27_USER_TOKEN",
    "SKYGATEFS27_GATE_SESSION",
    "SKYGATEFS27_SESSION_TOKEN",
    "SKYGATE_USER_TOKEN",
    "SKYE_GATE_SESSION",
    "SKYGATE_SESSION_TOKEN",
    "METRAIYUX_GATE_SESSION"
  ];
  const EVENT_READY = "skyemediacenter:gate-ready";

  let resolvedSession = null;
  let waitingResolve = null;

  const clean = (value) => String(value == null ? "" : value).trim();
  const safeToken = (value) => clean(value).replace(/[^a-zA-Z0-9:_.-]/g, "").slice(0, 4096);
  const tokenLooksValid = (value) => /^[a-zA-Z0-9:_.-]{8,4096}$/.test(clean(value));
  const gateBridge = () => globalThis.MetrAIyuxGateBridge || (globalThis.parent && globalThis.parent !== globalThis ? globalThis.parent.MetrAIyuxGateBridge : null);
  const readJson = (store, key) => {
    try {
      return JSON.parse(store.getItem(key) || "null");
    } catch {
      return null;
    }
  };

  function sessionPath() {
    const configured = window.METRAIYUX_API_BASES?.media;
    if (configured) return clean(configured).replace(/\/+$/, "") + "/session";
    if (/^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)) return "/.netlify/functions/skygate-session";
    return "/api/media/session";
  }

  function browserAuth() {
    if (typeof window.createSkyGateAuth !== "function") return null;
    return window.createSkyGateAuth({ sessionPath: sessionPath(), storageKey: STORAGE_OWNER });
  }

  function clientLoginHref() {
    const returnTo = `${location.pathname || "/"}${location.search || ""}${location.hash || ""}`;
    return `/gate/signup/?return=${encodeURIComponent(returnTo)}`;
  }

  function fromStorage() {
    const bridge = gateBridge();
    const bridgeSession = bridge?.requireSession?.({ platformId: "skyemediacenter", usageLane: "media-center" })
      || bridge?.current?.();
    if (bridgeSession && tokenLooksValid(bridgeSession.token)) {
      return {
        ...bridgeSession,
        token: safeToken(bridgeSession.token),
        source: bridgeSession.source || "0s-gate-card-bridge",
        client: bridgeSession.client || "MetrAIyux 0S",
        status: bridgeSession.status || "free99_gate_session"
      };
    }

    const query = new URLSearchParams(location.search);
    const queryToken = safeToken(query.get("gate_session") || query.get("skygate_session") || query.get("media_session") || query.get("session"));
    if (tokenLooksValid(queryToken)) {
      const session = {
        token: queryToken,
        source: "url-gate-session",
        workspace_id: query.get("workspace") || "",
        client: query.get("client") || "MetrAIyux 0S Free99",
        status: "free99_gate_session"
      };
      query.delete("gate_session");
      query.delete("skygate_session");
      query.delete("media_session");
      query.delete("session");
      const next = `${location.pathname}${query.toString() ? `?${query.toString()}` : ""}${location.hash || ""}`;
      history.replaceState({}, document.title, next);
      return session;
    }

    const saasSession = readJson(localStorage, SAAS_SESSION_KEY);
    if (saasSession && tokenLooksValid(saasSession.token)) {
      return {
        token: safeToken(saasSession.token),
        source: "0s-client-session",
        workspace_id: saasSession.workspace_id || "",
        client: saasSession.client || "0S client workspace",
        email: saasSession.email || "",
        status: saasSession.status || "free99_gate_session"
      };
    }

    for (const key of LEGACY_KEYS) {
      const parsed = readJson(sessionStorage, key) || readJson(localStorage, key);
      const token = safeToken(parsed && parsed.token ? parsed.token : sessionStorage.getItem(key) || localStorage.getItem(key));
      if (tokenLooksValid(token)) return { ...(parsed || {}), token, source: parsed?.source || key, client: parsed?.client || "SkyeGate session", status: parsed?.status || "free99_gate_session" };
    }

    const runtime = globalThis.__SKYEGATE_RUNTIME__ || globalThis.__KAIXU_RUNTIME__ || {};
    const runtimeToken = safeToken(runtime.userToken || runtime.sessionToken || runtime.authToken || runtime.bearerToken || runtime.auth?.token || runtime.auth?.bearerToken);
    if (tokenLooksValid(runtimeToken)) return { token: runtimeToken, source: "skygate-runtime", client: "SkyeGate runtime", status: "free99_gate_session" };

    return null;
  }

  function persist(session) {
    const cleanSession = {
      token: safeToken(session.token),
      source: session.source || "0s-gate-session",
      client: session.client || "MetrAIyux 0S Free99",
      workspace_id: session.workspace_id || "",
      email: session.email || "",
      status: session.status || "free99_gate_session",
      issued_at: session.issued_at || new Date().toISOString()
    };
    gateBridge()?.persist?.({
      ...cleanSession,
      platform_id: "skyemediacenter",
      usage_lane: "media-center"
    }, { silent: true });
    gateBridge()?.record?.("skyemedia_gate_ready", cleanSession, cleanSession);
    resolvedSession = cleanSession;
    document.documentElement.classList.remove("skye-media-gate-locked");
    document.body?.classList.remove("skye-media-gate-locked");
    document.body?.classList.add("skye-media-gate-ready");
    document.getElementById("skyeMediaGate")?.remove();
    document.dispatchEvent(new CustomEvent(EVENT_READY, { detail: cleanSession }));
    if (waitingResolve) {
      waitingResolve(cleanSession);
      waitingResolve = null;
    }
    return cleanSession;
  }

  function clear() {
    resolvedSession = null;
  }

  function status(message) {
    const el = document.getElementById("skyeMediaGateStatus");
    if (el) el.textContent = message;
  }

  async function useClientSession() {
    const session = readJson(localStorage, SAAS_SESSION_KEY);
    if (!session || !tokenLooksValid(session.token)) {
      status("No 0S client session found in this browser. Open Client Login first.");
      return;
    }
    persist({
      token: session.token,
      source: "0s-client-session",
      workspace_id: session.workspace_id,
      client: session.client,
      email: session.email,
      status: session.status || "free99_gate_session"
    });
  }

  async function attachExistingGateSession() {
    const existing = fromStorage();
    if (!existing || !tokenLooksValid(existing.token)) {
      status("No active 0S session was found in this browser. Open Client Login first.");
      return;
    }
    persist(existing);
  }

  function installStyle() {
    if (document.getElementById("skyeMediaGateStyle")) return;
    const style = document.createElement("style");
    style.id = "skyeMediaGateStyle";
    style.textContent = `
      html.skye-media-gate-locked,
      body.skye-media-gate-locked { overflow: hidden !important; }
      body.skye-media-gate-locked > :not(#skyeMediaGate):not(script):not(style) {
        filter: blur(10px) saturate(.45);
        pointer-events: none !important;
        user-select: none !important;
      }
      .skye-media-gate-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483000;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at 18% 20%, rgba(68,244,255,.2), transparent 32%),
          radial-gradient(circle at 82% 12%, rgba(255,79,216,.18), transparent 28%),
          rgba(4,2,9,.88);
        color: #fff8ff;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      }
      .skye-media-gate-card {
        width: min(720px, 100%);
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 28px;
        padding: clamp(22px, 4vw, 38px);
        background: linear-gradient(145deg, rgba(18,10,34,.94), rgba(4,2,9,.9));
        box-shadow: 0 30px 120px rgba(0,0,0,.55), 0 0 70px rgba(68,244,255,.12);
      }
      .skye-media-gate-card .microline {
        margin: 0 0 10px;
        color: #44f4ff;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .18em;
        text-transform: uppercase;
      }
      .skye-media-gate-card h1 {
        margin: 0 0 12px;
        color: #fff8ff;
        font-size: clamp(34px, 5vw, 64px);
        line-height: .9;
        letter-spacing: 0;
      }
      .skye-media-gate-card p {
        color: #b9acc7;
        line-height: 1.55;
      }
      .skye-media-gate-field {
        display: grid;
        gap: 8px;
        margin: 18px 0;
        color: #44f4ff;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .12em;
        text-transform: uppercase;
      }
      .skye-media-gate-field input {
        width: 100%;
        min-height: 48px;
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 16px;
        padding: 0 14px;
        background: rgba(0,0,0,.3);
        color: #fff8ff;
        font: inherit;
        letter-spacing: 0;
        text-transform: none;
      }
      .skye-media-gate-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .skye-media-gate-actions button,
      .skye-media-gate-actions a {
        min-height: 44px;
        border: 1px solid rgba(255,255,255,.18);
        border-radius: 999px;
        padding: 0 16px;
        background: rgba(255,255,255,.06);
        color: #fff8ff;
        font-weight: 900;
        text-decoration: none;
        cursor: pointer;
      }
      .skye-media-gate-actions .primary {
        border: 0;
        background: linear-gradient(90deg, #ffd166, #ff4fd8, #44f4ff);
        color: #090613;
      }
      .skye-media-gate-status {
        min-height: 22px;
        color: #ffd166 !important;
      }
      @media (max-width: 640px) {
        .skye-media-gate-actions button,
        .skye-media-gate-actions a { width: 100%; }
      }
    `;
    document.head.appendChild(style);
  }

  function renderGate() {
    installStyle();
    if (document.getElementById("skyeMediaGate")) return;
    document.documentElement.classList.add("skye-media-gate-locked");
    document.body?.classList.add("skye-media-gate-locked");
    const overlay = document.createElement("section");
    overlay.id = "skyeMediaGate";
    overlay.className = "skye-media-gate-overlay";
    overlay.setAttribute("aria-labelledby", "skyeMediaGateTitle");
    overlay.innerHTML = `
      <div class="skye-media-gate-card">
        <p class="microline">FS27 gate session required</p>
        <h1 id="skyeMediaGateTitle">SkyeMediaCenter runs through the 0S Gate.</h1>
        <p>Start or reuse the shared 0S/SkyGate session before the media shell, intake portal, operator theater, asset list, search, publish queue, or file delivery can run.</p>
        <div class="skye-media-gate-actions">
          <button class="primary" id="skyeMediaGateUseClient" type="button">Use Current 0S Session</button>
          <button id="skyeMediaGateUseExisting" type="button">Use 0S Session</button>
          <a href="${clientLoginHref()}">Open 0S Signup</a>
        </div>
        <p class="skye-media-gate-status" id="skyeMediaGateStatus">The Gate owns identity and app access across every mounted surface.</p>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById("skyeMediaGateUseExisting")?.addEventListener("click", attachExistingGateSession);
    document.getElementById("skyeMediaGateUseClient")?.addEventListener("click", useClientSession);
  }

  function requireSession() {
    const existing = resolvedSession || fromStorage();
    if (existing && tokenLooksValid(existing.token)) return Promise.resolve(persist(existing));
    renderGate();
    return new Promise((resolve) => {
      waitingResolve = resolve;
    });
  }

  function session() {
    const existing = resolvedSession || fromStorage();
    return existing && tokenLooksValid(existing.token) ? existing : null;
  }

  function headers() {
    const current = session();
    if (!current) return {};
    const bridgeHeaders = gateBridge()?.headers?.({
      "x-skye-platform": "skyemediacenter",
      "x-skye-usage-lane": "media-center"
    }) || {};
    return {
      ...bridgeHeaders,
      authorization: `Bearer ${current.token}`,
      "x-skye-gate-session": current.token,
      "x-0s-gate-session": current.token,
      "x-skye-gate-source": current.source || "unknown",
      "x-skye-media-center-free99": "true"
    };
  }

  globalThis.SkyeMediaGate = {
    requireSession,
    session,
    headers,
    persist,
    clear,
    storageKey: STORAGE_OWNER,
    eventReady: EVENT_READY
  };

  document.addEventListener("DOMContentLoaded", () => {
    if (!session()) renderGate();
  });
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
