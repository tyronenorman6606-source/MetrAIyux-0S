const CACHE_NAME = 'skye-split-engine-v4.1.1-transparent-gated-free99';
const APP_SHELL = ['./', './index.html', './gate-session.js', './manifest.json', './favicon.png', './icon-48.png', './icon-72.png', './icon-96.png', './icon-128.png', './icon-180.png', './icon-192.png', './icon-256.png', './icon-512.png', './assets/skye-split-engine-logo-transparent.png', './assets/skye-split-badge-transparent.png', './assets/skye-split-og.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return response;
    }).catch(() => cached))
  );
});
