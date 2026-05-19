/* DocuMorph PWA Service Worker (offline-first shell) */
const CACHE_NAME = "documorph-pwa-v2";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/launcher.png",
  "./assets/cover.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",

  // CDN deps (cached after first online load)
  "https://cdn.tailwindcss.com",
  "https://unpkg.com/react@18/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
  "https://unpkg.com/@babel/standalone/babel.min.js",
  "https://unpkg.com/lucide@latest",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Cache each URL individually so one failure doesn't nuke the install.
    await Promise.allSettled(PRECACHE_URLS.map(async (url) => {
      try {
        const u = new URL(url, self.location.href);
        const isCrossOrigin = u.origin !== self.location.origin;
        const req = isCrossOrigin ? new Request(u.href, { mode: "no-cors" }) : new Request(u.href);
        const resp = await fetch(req);
        // Even opaque responses are cacheable.
        await cache.put(req, resp.clone());
      } catch (e) {
        // swallow — app still works, but that asset won't be offline until it caches later
      }
    }));

    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Clean old caches
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    self.clients.claim();
  })());
});

// Cache-first for GET. Network-only for non-GET.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // App shell for navigations
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match("./index.html");
      if (cached) return cached;
      try {
        const fresh = await fetch("./index.html");
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch {
        return cached || new Response("Offline", { status: 200, headers: { "Content-Type": "text/plain" } });
      }
    })());
    return;
  }

  // Don't cache Gemini API calls (privacy + dynamic)
  if (url.hostname.includes("generativelanguage.googleapis.com")) {
    event.respondWith(fetch(req));
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const resp = await fetch(req);
      // Only cache successful-ish responses and opaque responses
      if (resp && (resp.ok || resp.type === "opaque")) {
        cache.put(req, resp.clone());
      }
      return resp;
    } catch (e) {
      return cached || new Response("", { status: 504 });
    }
  })());
});
