const CACHE = 'skyevault-pro-v5';
const APP_ASSETS = [
  '/',
  '/index.html',
  '/drive/index.html',
  '/manifest.webmanifest',
  '/assets/css/styles.css',
  '/assets/js/common.js',
  '/assets/js/local-vault.js',
  '/assets/js/hosted-bridge.js',
  '/assets/js/skye-docxmax-vault-bridge.js',
  '/assets/js/drive.js',
  '/assets/img/skyes-logo.png',
  '/assets/img/icon-192.png',
  '/assets/img/icon-512.png',
  '/SKYESOVERLONDONDIETYLOGO.png'
];
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js',
  'https://unpkg.com/lucide@latest',
  'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Inter:wght@400;500;600&family=Merriweather:wght@400;700&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(APP_ASSETS);
    await Promise.allSettled(CDN_ASSETS.map(async (url) => {
      const response = await fetch(url, { mode: 'no-cors' });
      await cache.put(url, response);
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request, { ignoreSearch: false });
    if (cached) {
      event.waitUntil((async () => {
        try {
          const fresh = await fetch(event.request);
          const cache = await caches.open(CACHE);
          await cache.put(event.request, fresh.clone());
        } catch {}
      })());
      return cached;
    }
    try {
      const fresh = await fetch(event.request);
      const cache = await caches.open(CACHE);
      await cache.put(event.request, fresh.clone());
      return fresh;
    } catch {
      return caches.match('/index.html');
    }
  })());
});
