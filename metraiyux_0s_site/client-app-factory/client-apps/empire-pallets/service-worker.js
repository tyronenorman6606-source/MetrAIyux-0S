const CACHE_NAME = "empire-pallets-app-v3-line-shadow-type";
const APP_SHELL = [
  "/",
  "index.html",
  "scan.html",
  "preview.html",
  "quote.html",
  "offline.html",
  "manifest.webmanifest",
  "assets/styles.css",
  "assets/app.js",
  "assets/mcp-motion-stack.js",
  "assets/empire-pallets-logo-transparent.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/media/empire-hero-poster.jpg",
  "assets/media/empire-hero.mp4",
  "assets/media/yard-sign-hero.png",
  "assets/media/new-pallets-service.png",
  "assets/media/recycled-pallets-service.png",
  "assets/media/recycling-service.png",
  "assets/media/drop-trailer-service.png",
  "assets/empire-pallets-scan-qr.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((match) => match || caches.match("offline.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((match) => {
      if (match) return match;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
