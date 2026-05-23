const CACHE_NAME = 'arclight-pictures-pwa-v25';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/about-us.html',
  '/promotional-videos.html',
  '/we-make-movies-too.html',
  '/arclight-gives-back.html',
  '/contact.html',
  '/styles.css',
  '/script.js',
  '/manifest.webmanifest',
  '/favicon.png',
  '/assets/live-site/arclight-logo-lockup.png',
  '/assets/live-site/arclight-logo-lockup.png',
  '/assets/live-site/arclight-hero-banner.png',
  '/assets/live-site/arclight-contact-page-shot.png',
  '/assets/live-site/arclight-hero-banner.png',
  '/assets/live-site/arclight-video-frame.png',
  '/assets/live-site/arclight-contact-banner.png',
  '/assets/live-site/arclight-contact-banner.png',
  '/assets/live-site/arclight-team-1.png',
  '/assets/live-site/arclight-team-2.png',
  '/assets/live-site/arclight-hero-banner.png',
  '/assets/live-site/arclight-video-frame.png',
  '/assets/live-site/arclight-video-frame.png',
  '/assets/live-site/arclight-workspace-qr.png',
  '/assets/live-site/arclight-workspace-qr.png'
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
