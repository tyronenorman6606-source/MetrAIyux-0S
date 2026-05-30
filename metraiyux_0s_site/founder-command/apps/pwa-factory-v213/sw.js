const CACHE = 'founder-pwa-drop-factory-v2';
const CORE = [
  './index.html',
  './manifest.json',
  './drop-factory-manifest.json',
  './assets/pwa-factory.css',
  './assets/pwa-factory.js',
  './assets/skyes-over-london-deity-logo.png',
  './assets/metraiyux-0s-logo-transparent.png',
  './assets/skye-music-nexus-logo.png',
  './icon-16.png',
  './icon-32.png',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    } catch (error) {
      return (await caches.match('./index.html')) || new Response('Offline', { status: 503 });
    }
  })());
});
