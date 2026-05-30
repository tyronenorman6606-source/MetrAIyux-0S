const CACHE_NAME = 'founder-command-pwa-v5';
const CORE_ASSETS = [
  '/founder-command/',
  '/founder-command/index.html',
  '/founder-command/app.js',
  '/founder-command/omega-command.css',
  '/founder-command/manifest.webmanifest',
  '/founder-command/repo-memory.js',
  '/founder-command/song-vault/manifest.js',
  '/founder-command/client-credentials/bobs-smoke-shop.json',
  '/founder-command/client-credentials/supaboy.json',
  '/assets/vendor/qrcode-generator.js',
  '/assets/metraiyux-0s-emblem-transparent.png',
  '/assets/metraiyux-0s-logo-transparent.png',
  '/assets/skyes-over-london-deity-logo.png',
  '/assets/gray-london-skyes-founder-actual-source.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  const isFounderAsset = url.pathname.startsWith('/founder-command/');
  const isSharedAsset = CORE_ASSETS.includes(url.pathname);
  if (!isFounderAsset && !isSharedAsset) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/founder-command/index.html')))
  );
});
