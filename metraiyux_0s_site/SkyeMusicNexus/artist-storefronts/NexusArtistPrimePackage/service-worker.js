const CACHE_NAME = "gray-skyes-prime-package-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./prime.js",
  "./manifest.webmanifest",
  "./originals/gray-skyes/media/images/gray-cutout.png",
  "./originals/gray-skyes/media/images/gray-red-portrait.jpg",
  "./originals/gray-skyes/media/images/gray-wide-stage.jpg",
  "./originals/gray-skyes/media/audio/cupid.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => null));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && new URL(event.request.url).origin === location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => null);
        }
        return response;
      }).catch(() => cached);
    })
  );
});
