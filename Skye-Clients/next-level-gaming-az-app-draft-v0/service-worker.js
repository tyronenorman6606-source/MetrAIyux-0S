const CACHE_NAME = "next-level-gaming-az-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/events.html",
  "/shop.html",
  "/quote.html",
  "/scan.html",
  "/preview.html",
  "/offline.html",
  "/assets/styles.css",
  "/assets/app.js",
  "/assets/icons/icon.svg",
  "/assets/media/next-level-logo.png",
  "/assets/media/cyber-city-hero.jpg",
  "/assets/media/shop-photo-1.jpg",
  "/assets/media/shop-photo-2.jpg",
  "/assets/media/shop-photo-3.jpg",
  "/assets/media/tcg-banner.png",
  "/assets/next-level-scan-qr.svg",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match("/offline.html")))
  );
});
