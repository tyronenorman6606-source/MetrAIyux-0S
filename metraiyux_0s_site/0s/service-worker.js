const CACHE_NAME = "metraiyux-0s-browser-v3";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./os.css",
  "./os.js",
  "./manifest.webmanifest",
  "./0s-cohesion-manifest.json",
  "./command-registry.json",
  "../assets/metraiyux-0s-emblem-transparent.png",
  "../assets/metraiyux-0s-icon-512.png",
  "../assets/apple-touch-icon.png",
  "../assets/js/0s-gate-card-bridge.js",
  "../assets/js/0s-command-bridge.js",
  "../assets/js/skyehawk-os.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const fresh = fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
