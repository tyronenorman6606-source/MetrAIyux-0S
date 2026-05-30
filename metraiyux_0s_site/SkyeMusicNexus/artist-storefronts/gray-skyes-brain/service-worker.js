const CACHE_NAME = 'gray-skyes-brain-v1';
const CORE_ASSETS = [
  './index.html',
  './app.html',
  './manifest.webmanifest',
  "./products/","./products/index.html",'../artist-storefronts.css',
  './assets/gray-brain-avatar-openai.png',
  './products/products.json'
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
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => cached)));
});
