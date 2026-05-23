const CACHE = 'keygate13-v2';
const CORE = [
  './',
  './index.html',
  './forge.html',
  './vault.html',
  './sovereign-key.html',
  './passgen.html',
  './manifest.json',
  './assets/mcp-implementation/mcp-effects.css',
  './icon-192.png',
  './icon-512.png',
  './skyesoverlondondietylogo.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        event.waitUntil(
          fetch(event.request)
            .then(response => {
              if (response && response.ok) {
                caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
              }
            })
            .catch(() => {})
        );
        return cached;
      }

      return fetch(event.request)
        .then(response => {
          if (response && response.ok) {
            caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
