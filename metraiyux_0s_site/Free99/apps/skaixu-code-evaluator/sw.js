/* skAIxu Code Evaluator - Service Worker virtual file server
   Serves in-memory project files for live preview at /__skaipreview__/

   SECURITY NOTE:
   - This SW serves ONLY what the user loads into the tool in their own browser.
   - It does not exfiltrate data; it never calls providers; it never touches kAIxu key.
*/

const PREFIX = "/__skaipreview__/";

// path -> { bytes: ArrayBuffer, mime: string }
const FS = new Map();
let entryPath = null;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "PING") return;
  if (data.type === "SET_FILES") {
    FS.clear();
    entryPath = data.entryPath || entryPath;

    const files = data.files || [];
    for (const f of files) {
      if (!f || !f.path || !f.bytes) continue;
      const path = normalize(f.path);
      FS.set(path, { bytes: f.bytes, mime: f.mime || guessMime(path) });
    }
    // ensure entry exists, else fallback to shortest index.html
    if (entryPath && !FS.has(normalize(entryPath))) {
      entryPath = guessEntrypoint();
    }
    return;
  }
  if (data.type === "CLEAR") {
    FS.clear();
    entryPath = null;
    return;
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith(PREFIX)) return;

  const rel = decodeURIComponent(url.pathname.slice(PREFIX.length));
  const path = normalize(rel || entryPath || "index.html");

  event.respondWith((async () => {
    if (!FS.size) return new Response("Preview FS is empty (load a project first).", { status: 404 });

    // directory request: redirect to entry
    if (!path || path.endsWith("/")) {
      const ep = normalize(entryPath || guessEntrypoint() || "index.html");
      return Response.redirect(PREFIX + encodeURI(ep), 302);
    }

    const file = FS.get(path);
    if (!file) {
      // try index.html fallback for folders
      const alt = normalize(path.replace(/\/+$/,"") + "/index.html");
      const file2 = FS.get(alt);
      if (!file2) return new Response("Not found: " + path, { status: 404 });
      return bytesResponse(file2.bytes, file2.mime);
    }
    return bytesResponse(file.bytes, file.mime);
  })());
});

function bytesResponse(bytes, mime){
  const headers = new Headers();
  headers.set("Content-Type", mime || "application/octet-stream");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Preview-Served-By", "skAIxu-SW");
  return new Response(bytes, { status: 200, headers });
}

function normalize(p){
  return (p||"").replaceAll("\\","/").replace(/^\/+/, "").split("/").filter(Boolean).join("/");
}

function guessMime(path){
  const p = (path||"").toLowerCase();
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".js") || p.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (p.endsWith(".json")) return "application/json; charset=utf-8";
  if (p.endsWith(".svg")) return "image/svg+xml";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".webp")) return "image/webp";
  if (p.endsWith(".gif")) return "image/gif";
  if (p.endsWith(".woff")) return "font/woff";
  if (p.endsWith(".woff2")) return "font/woff2";
  if (p.endsWith(".ttf")) return "font/ttf";
  if (p.endsWith(".mp3")) return "audio/mpeg";
  if (p.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}

function guessEntrypoint(){
  let best = null;
  for (const k of FS.keys()){
    if (k.toLowerCase().endsWith("index.html")){
      if (!best || k.length < best.length) best = k;
    }
  }
  return best;
}
