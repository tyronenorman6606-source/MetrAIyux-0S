const SMV_RUNTIME_CONFIG = window.SMV_RUNTIME_CONFIG || {};
const API_BASES = [...new Set([
  SMV_RUNTIME_CONFIG.apiBase,
  ...(Array.isArray(SMV_RUNTIME_CONFIG.apiBases) ? SMV_RUNTIME_CONFIG.apiBases : []),
  "/.netlify/functions",
  "/api"
].filter(Boolean).map(base => String(base).replace(/\/+$/, "")))];
const API_BASE = API_BASES[0] || "/.netlify/functions";
const API_FUNCTION_PREFIX = "skymail-standalone-";
const APP_ROOT_URL = new URL(SMV_RUNTIME_CONFIG.appRoot || "/", window.location.origin);
const ACTIVE_MAILBOX_KEY = "SMV_ACTIVE_MAILBOX";
const HOSTED_API_BASE = (() => {
  const pathname = window.location.pathname || "";
  return ["/dashboard/skyemail", "/platform-host/skyemail"]
    .find((base) => pathname === base || pathname.startsWith(`${base}/`)) || "";
})();
try{
  localStorage.removeItem("SMV_LOCAL_RUNTIME_MODE");
  localStorage.removeItem("SMV_LOCAL_RUNTIME_V2");
}catch(_err){}

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }

function smvHref(path = "", searchParams){
  const normalized = String(path || "")
    .replace(/^\/+/, "")
    .replace(/^([a-z0-9-]+)\.html$/i, "$1/");
  const next = new URL(normalized || "./", APP_ROOT_URL);
  if(searchParams && typeof searchParams === "object"){
    Object.entries(searchParams).forEach(([key, value]) => {
      if(value === undefined || value === null || value === "") return;
      next.searchParams.set(key, String(value));
    });
  }
  return `${next.pathname}${next.search}${next.hash}`;
}

function smvRedirect(path = "", searchParams){
  location.href = smvHref(path, searchParams);
}

function setStatus(el, msg, kind=""){
  if(!el) return;
  el.textContent = msg || "";
  el.style.color = kind === "danger" ? "var(--danger)"
    : kind === "ok" ? "var(--ok)"
    : "var(--muted)";
}

function readGateSession(){
  const bridge = window.MetrAIyuxGateBridge || (window.parent && window.parent !== window ? window.parent.MetrAIyuxGateBridge : null);
  try{
    const current = bridge?.current?.();
    if(current?.token) return current;
  }catch(_err){}
  return null;
}
function getToken(){ return readGateSession()?.token || ""; }
function setToken(t){
  const token = String(t || "").trim();
  if(!token) return "";
  const session = { token, source:"skymail-fs27-session", platform_id:"skymail", usage_lane:"mail", issued_at:new Date().toISOString() };
  const bridge = window.MetrAIyuxGateBridge || (window.parent && window.parent !== window ? window.parent.MetrAIyuxGateBridge : null);
  bridge?.persist?.(session, { silent:true });
  return token;
}
function clearToken(){
  try{
    ["SMV_SKYEMAIL_SESSION","SMV_AUTH_TOKEN","free99_gate_session","skye_gate_session","skygate_session","FREE99_PLATFORM_GATE_SESSION","SKYGATE_USER_TOKEN","SKYGATE_SESSION_TOKEN","adminBrainToken","saas_client_session"].forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
  }catch(_err){}
  return "";
}

function getHandle(){ return localStorage.getItem("SMV_HANDLE") || ""; }
function setHandle(h){ localStorage.setItem("SMV_HANDLE", h); }

function normalizeMailboxEmail(value){
  return String(value || "").trim().toLowerCase();
}

function getActiveMailbox(){
  try{ return normalizeMailboxEmail(localStorage.getItem(ACTIVE_MAILBOX_KEY) || sessionStorage.getItem(ACTIVE_MAILBOX_KEY) || ""); }
  catch(_err){ return ""; }
}

function setActiveMailbox(email){
  const value = normalizeMailboxEmail(email);
  try{
    if(value){
      localStorage.setItem(ACTIVE_MAILBOX_KEY, value);
      sessionStorage.setItem(ACTIVE_MAILBOX_KEY, value);
    }else{
      localStorage.removeItem(ACTIVE_MAILBOX_KEY);
      sessionStorage.removeItem(ACTIVE_MAILBOX_KEY);
    }
  }catch(_err){}
  return value;
}

function clearActiveMailbox(){
  return setActiveMailbox("");
}

function smvApiUrl(path = "", functionPrefix = API_FUNCTION_PREFIX, apiBase = API_BASE){
  const normalized = String(path || "");
  if(/^https?:\/\//i.test(normalized)) return normalized;
  const parsed = new URL(normalized.startsWith("/") ? normalized : `/${normalized}`, "https://skymail.local");
  if(HOSTED_API_BASE){
    return `${HOSTED_API_BASE}/${parsed.pathname.replace(/^\/+/, "")}${parsed.search}${parsed.hash}`;
  }
  const functionName = `${functionPrefix}${parsed.pathname.replace(/^\/+/, "")}`;
  return `${apiBase}/${functionName}${parsed.search}${parsed.hash}`;
}

async function readApiResponse(res){
  const text = await res.text();
  let data = null;
  try{
    data = text ? JSON.parse(text) : null;
  }catch(_err){
    const looksHtml = /<\s*!doctype\s+html/i.test(text || "");
    data = looksHtml ? { error: "Server functions not found. SkyeMail requires deployed backend functions.", raw: text, backend_missing: true } : { error: "Non-JSON response", raw: text };
  }
  return { data, text };
}

async function apiFetch(path, opts = {}){
  const headers = Object.assign({ "Content-Type":"application/json" }, opts.headers || {});
  const token = getToken();
  if(token) headers.Authorization = "Bearer " + token;
  const activeMailbox = getActiveMailbox();
  if(activeMailbox && !headers["x-skymail-mailbox-email"]) headers["x-skymail-mailbox-email"] = activeMailbox;

  const requestOptions = Object.assign({ credentials: "include" }, opts, { headers });
  let lastRes = null;
  let lastData = null;
  let lastError = null;

  for(const apiBase of API_BASES){
    for(const prefix of [API_FUNCTION_PREFIX, ""]){
      if(prefix === "" && !API_FUNCTION_PREFIX) continue;
      try{
        const res = await fetch(smvApiUrl(path, prefix, apiBase), requestOptions);
        const { data } = await readApiResponse(res);
        if(res.ok) return data;
        lastRes = res;
        lastData = data;
        if(![404, 502, 503, 504].includes(res.status)){
          const err = new Error((data && data.error) ? data.error : ("HTTP " + res.status));
          err.status = res.status;
          err.data = data;
          throw err;
        }
      }catch(err){
        lastError = err;
        if(err.status && ![404, 502, 503, 504].includes(err.status)) throw err;
      }
    }
  }

  const err = lastError || new Error((lastData && lastData.error) ? lastData.error : ("HTTP " + (lastRes ? lastRes.status : "backend unavailable")));
  err.status = lastRes ? lastRes.status : 0;
  err.data = lastData;
  throw err;
}

function fmtDate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleString(undefined, { year:"numeric", month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" });
  }catch(_err){ return iso; }
}

function requireAuthOrRedirect(){
  const token = getToken();
  if(!token){
    smvRedirect("login.html");
    return false;
  }
  return true;
}

function logout(){
  clearToken();
  smvRedirect("index.html");
}

function safe(s){ return (s || "").replace(/[<>&"]/g, (c) => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;" }[c])); }

// Stores decrypted subjects/snippets locally so the user can search without server plaintext.
(function(){
  const KEY = "smv_search_index_v1";
  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    }catch(_err){ return []; }
  }
  function save(arr){
    try{
      localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 2000)));
    }catch(_err){}
  }
  function upsert(item){
    const arr = load();
    const i = arr.findIndex((x) => x.id === item.id);
    if(i >= 0) arr[i] = { ...arr[i], ...item };
    else arr.unshift(item);
    const seen = new Set();
    const out = [];
    for(const x of arr){
      if(!x || !x.id || seen.has(x.id)) continue;
      seen.add(x.id);
      out.push(x);
    }
    save(out);
  }
  function search(q){
    q = String(q || "").trim().toLowerCase();
    if(!q) return load();
    const arr = load();
    return arr.filter((x) => {
      const hay = `${x.subject || ""} ${x.snippet || ""} ${x.from_email || ""} ${x.from_name || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }
  function clear(){ try{ localStorage.removeItem(KEY); }catch(_err){} }
  window.SMVSearchIndex = { load, upsert, search, clear };
})();

window.SMVRuntime = {
  apiBase: API_BASE,
  apiBases: API_BASES,
  apiUrl: smvApiUrl,
  appRoot: APP_ROOT_URL.pathname,
  href: smvHref,
  redirect: smvRedirect,
  getActiveMailbox,
  setActiveMailbox,
  clearActiveMailbox,
};

function smvAssetUrl(path = ""){
  return new URL(String(path || "").replace(/^\/+/, ""), APP_ROOT_URL).toString();
}

function mountSkyEmailBackgroundPartial(){
  if(window.__skyemailBackgroundPartialMounted) return;
  window.__skyemailBackgroundPartialMounted = true;
  const partialUrl = smvAssetUrl("partials/skyemail-background.html");

  fetch(partialUrl, { credentials:"same-origin", cache:"no-store" })
    .then((res) => {
      if(!res.ok) throw new Error(`SkyEmail background partial ${res.status}`);
      return res.text();
    })
    .then((html) => {
      if(!html || document.querySelector("[data-skyemail-background-partial]")) return;
      const template = document.createElement("template");
      template.innerHTML = html.trim();
      const nodes = Array.from(template.content.childNodes);
      nodes.forEach((node) => document.body.prepend(node));
      document.querySelectorAll("[data-skyemail-src]").forEach((node) => {
        const src = node.getAttribute("data-skyemail-src");
        if(src) node.setAttribute("src", smvAssetUrl(src));
      });
      document.querySelectorAll("[data-skyemail-poster]").forEach((node) => {
        const poster = node.getAttribute("data-skyemail-poster");
        if(poster) node.setAttribute("poster", smvAssetUrl(poster));
      });
      document.documentElement.setAttribute("data-skyemail-bg", "partial");
      document.body.classList.add("skyemail-partial-bg-active");
      document.querySelectorAll("[data-skyemail-background-partial] video").forEach((video) => {
        try{
          video.load();
          const play = video.play?.();
          if(play && typeof play.catch === "function") play.catch(() => {});
        }catch(_err){}
      });
    })
    .catch((err) => {
      console.warn("SkyeMail background partial unavailable", err);
    });
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", mountSkyEmailBackgroundPartial, { once:true });
}else{
  mountSkyEmailBackgroundPartial();
}

import("./skyesol-living-background.js").catch(() => {});

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
