const CACHE_NAME = 'bobs-smoke-shop-pwa-v22';
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
  '/assets/live-site/bobs-live-logo.png',
  '/assets/live-site/bobs-live-storefront.png',
  '/assets/live-site/live-product-g-device.png',
  '/assets/live-site/live-glass-green.png',
  '/assets/live-site/live-glass-color.png',
  '/assets/live-site/live-wraps-display.jpeg',
  '/assets/live-site/live-zemis-wraps.jpeg',
  '/assets/live-site/live-cigars.jpeg',
  '/assets/live-site/live-stiiizy-wraps.jpg',
  '/assets/banners/interior-showcase-banner.png',
  '/assets/videos/bobs-live-homepage-poster.jpg',
  '/assets/videos/bobs-live-homepage-loop.mp4',
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
