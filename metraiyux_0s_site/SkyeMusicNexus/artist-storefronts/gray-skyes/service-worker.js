const CACHE_NAME = 'gray-skyes-skye-radio-v1';
const CORE_ASSETS = [
  './index.html',
  './app.html',
  './manifest.webmanifest',
  "./products/","./products/index.html",'../artist-storefronts.css',
  './products/products.json',
  './data/tracks.json',
  './media/images/gray-red-portrait.jpg',
  './media/images/gray-ritual-portrait.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => null));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok && new URL(request.url).origin === self.location.origin) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => null);
    }
    return response;
  }).catch(() => cached)));
});
