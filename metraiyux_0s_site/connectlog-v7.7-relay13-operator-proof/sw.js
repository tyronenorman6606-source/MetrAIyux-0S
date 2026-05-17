const CACHE_NAME = 'connectlog-shell-v7.7.0';
const APP_SHELL = [
  './',
  './index.html',
  './app.html',
  './landing.js',
  './styles.css',
  './app.js',
  './qr-lite.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './assets/connectlog-logo-master.png',
  './assets/connectlog-logo-192.png',
  './assets/connectlog-logo-512.png',
  './assets/apple-touch-icon.png',
  './assets/favicon.png',
  './assets/connectlog-og.png',
  './seed-data/manifest.json',
  './seed-data/sample-connections.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          const fallbackKey = url.pathname.endsWith('/app.html') ? './app.html' : './index.html';
          caches.open(CACHE_NAME).then((cache) => cache.put(fallbackKey, copy));
          return response;
        })
        .catch(() => caches.match(url.pathname.endsWith('/app.html') ? './app.html' : './index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
