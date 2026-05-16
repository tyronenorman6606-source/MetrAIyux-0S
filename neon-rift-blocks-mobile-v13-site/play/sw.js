const CACHE_NAME = 'neon-rift-duel-v16.0.1';
const ASSETS = [
  './manifest.webmanifest',
  './assets/icon.svg',
  './assets/icon-192.svg',
  './assets/icon-512.svg',
  './assets/social-card.svg',
  './assets/audio/alpha-calm-8hz.wav',
  './assets/audio/theta-drift-4hz.wav',
  './assets/audio/focus-gate-14hz.wav',
  './assets/audio/delta-night-2hz.wav',
  './assets/audio/rift-spa-6hz.wav'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))).then(() => caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isAppShell = event.request.mode === 'navigate'
    || url.pathname.endsWith('/play/')
    || url.pathname.endsWith('/play/index.html')
    || url.pathname.endsWith('/play/game.js')
    || url.pathname.endsWith('/play/styles.css');

  if (isAppShell) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => response)
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
