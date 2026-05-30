// Shared client script shim.
// Keep the root asset safe for the main site while exposing the helper surface
// expected by the nested SkyMail app when it mounts from root aliases.

const API_BASE = window.API_BASE || "/.netlify/functions";
window.API_BASE = API_BASE;

function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

function setStatus(el, msg, kind = "") {
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = kind === "danger"
    ? "var(--danger)"
    : kind === "ok"
      ? "var(--ok)"
      : "var(--muted)";
}

function getToken() { return localStorage.getItem("SMV_TOKEN") || ""; }
function setToken(token) { localStorage.setItem("SMV_TOKEN", token); }
function clearToken() { localStorage.removeItem("SMV_TOKEN"); }

function getHandle() { return localStorage.getItem("SMV_HANDLE") || ""; }
function setHandle(handle) { localStorage.setItem("SMV_HANDLE", handle); }

async function apiFetch(route, opts = {}) {
  const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
  const token = getToken();
  if (token) headers.Authorization = "Bearer " + token;

  const res = await fetch(API_BASE + route, Object.assign({}, opts, { headers }));
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    const looksHtml = /<\s*!doctype\s+html/i.test(text || "");
    const hint = (res.status === 404 && looksHtml)
      ? "Server functions not found. This app requires Netlify Functions."
      : "Non-JSON response";
    data = { error: hint, raw: text };
  }

  if (!res.ok) {
    const err = new Error((data && data.error) ? data.error : ("HTTP " + res.status));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function requireAuthOrRedirect() {
  const token = getToken();
  if (!token) {
    location.href = "/login.html";
    return false;
  }
  return true;
}

function logout() {
  clearToken();
  location.href = "/";
}

function safe(value) {
  return String(value || "").replace(/[<>&"]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
  })[char]);
}

window.qs = window.qs || qs;
window.qsa = window.qsa || qsa;
window.setStatus = window.setStatus || setStatus;
window.getToken = window.getToken || getToken;
window.setToken = window.setToken || setToken;
window.clearToken = window.clearToken || clearToken;
window.getHandle = window.getHandle || getHandle;
window.setHandle = window.setHandle || setHandle;
window.apiFetch = window.apiFetch || apiFetch;
window.fmtDate = window.fmtDate || fmtDate;
window.requireAuthOrRedirect = window.requireAuthOrRedirect || requireAuthOrRedirect;
window.logout = window.logout || logout;
window.safe = window.safe || safe;

(function () {
  const KEY = "smv_search_index_v1";

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function save(arr) {
    try {
      localStorage.setItem(KEY, JSON.stringify(arr.slice(0, 2000)));
    } catch {
      // no-op
    }
  }

  function upsert(item) {
    const arr = load();
    const index = arr.findIndex((entry) => entry.id === item.id);
    if (index >= 0) arr[index] = { ...arr[index], ...item };
    else arr.unshift(item);

    const seen = new Set();
    const out = [];
    for (const entry of arr) {
      if (!entry || !entry.id || seen.has(entry.id)) continue;
      seen.add(entry.id);
      out.push(entry);
    }
    save(out);
  }

  function search(query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return load();
    return load().filter((entry) => {
      const haystack = `${entry.subject || ""} ${entry.snippet || ""} ${entry.from_email || ""} ${entry.from_name || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }

  function clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // no-op
    }
  }

  window.SMVSearchIndex = window.SMVSearchIndex || { load, upsert, search, clear };
  window.SOL_ASSETS_APP = window.SOL_ASSETS_APP || { loaded: true };
})();

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
