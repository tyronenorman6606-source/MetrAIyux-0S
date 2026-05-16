const CACHE_NAME = 'bobs-smoke-shop-pwa-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/inventory.html',
  '/specials.html',
  '/gallery.html',
  '/contact.html',
  '/workspace-preview/',
  '/workspace-preview/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.webmanifest',
  '/favicon.png',
  '/assets/logo/bobs-smoke-shop-3d-logo.png',
  '/assets/banners/storefront-hero-banner.png',
  '/assets/banners/interior-showcase-banner.png',
  '/assets/qr/bobs-smoke-shop-preview-qr.svg',
  '/assets/qr/bobs-smoke-shop-preview-qr.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.pathname.includes('/assets/videos/')) {
    event.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return response;
    }).catch(() => caches.match('/index.html')))
  );
});
