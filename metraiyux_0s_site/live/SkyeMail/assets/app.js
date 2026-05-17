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
  const normalized = String(path || "").replace(/^\/+/, "");
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

function getToken(){ return localStorage.getItem("SMV_TOKEN") || ""; }
function setToken(t){ localStorage.setItem("SMV_TOKEN", t); }
function clearToken(){ localStorage.removeItem("SMV_TOKEN"); }

function getHandle(){ return localStorage.getItem("SMV_HANDLE") || ""; }
function setHandle(h){ localStorage.setItem("SMV_HANDLE", h); }

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
};

import("./skyesol-living-background.js").catch(() => {});
