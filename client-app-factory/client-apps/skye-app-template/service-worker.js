const CACHE_NAME = 'client-brand-pwa-v22';
const CORE_ASSETS = [
  '/',
  'index.html',
  '/inventory.html',
  '/specials.html',
  '/gallery.html',
  '/contact.html',
  '/workspace-preview/',
  '/workspace-preview/index.html',
  '/styles.css',
  '/script.js',
  'manifest.webmanifest',
  '/favicon.png',
  'assets/brand/skye-app-template-brand-logo.png',
  'assets/brand/skye-app-template-brand-mark.svg',
  'assets/white-label/banners/client-storefront.png',
  'assets/white-label/banners/client-product-detail.png',
  'assets/white-label/inventory/featured-products.png',
  'assets/white-label/inventory/service-packages.png',
  'assets/white-label/inventory/add-on-products.png',
  'assets/white-label/inventory/add-on-products.png',
  'assets/white-label/inventory/premium-collection.png',
  'assets/white-label/inventory/specialty-products.png',
  'assets/white-label/banners/interior-showcase-banner.png',
  'assets/client-media/videos/skye-app-template-hero-poster.jpg',
  'assets/client-media/videos/skye-app-template-hero.mp4',
  'assets/qr/skye-app-template-app-qr.svg',
  'assets/qr/skye-app-template-app-qr.png'
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

  if (url.pathname.includes('assets/videos/')) {
    event.respondWith(fetch(request).catch(() => caches.match('index.html')));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return response;
    }).catch(() => caches.match('index.html')))
  );
});
