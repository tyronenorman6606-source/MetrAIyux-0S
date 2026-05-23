const CACHE_NAME = 'fade-masters-booking-v7';
const CORE_ASSETS = [
  'index.html',
  'fade-booking.js',
  'styles.css',
  'manifest.webmanifest',
  'favicon.png',
  'assets/brand/fade-masters-phx-brand-mark.svg',
  'assets/brand/fade-masters-phx-brand-logo.svg',
  'assets/brand/fade-masters-phx-brand-logo.png',
  'assets/media/fade-masters-shop-poster.svg',
  'assets/media/fade-masters-shop-poster.jpg',
  'assets/media/fade-masters-intro.mp4',
  'assets/media/fade-masters-phx-open-source-hd-image-pack/LICENSE_MANIFEST.md',
  'assets/media/fade-masters-phx-open-source-hd-image-pack/CONTACT_SHEET.jpg',
  'assets/media/fade-masters-phx-open-source-hd-image-pack/03_HERO_CROPS_1920x1080/01_barber-chair-haircut-usaf-public-domain_hero_1920x1080.jpg',
  'assets/media/fade-masters-phx-open-source-hd-image-pack/03_HERO_CROPS_1920x1080/03_straight-razor-beard-shave-nenad-stojkovic-ccby2_hero_1920x1080.jpg',
  'assets/media/fade-masters-phx-open-source-hd-image-pack/03_HERO_CROPS_1920x1080/04_comb-clipper-back-view-man-barbershop-nenad-stojkovic-ccby2_hero_1920x1080.jpg',
  'assets/media/fade-masters-phx-open-source-hd-image-pack/03_HERO_CROPS_1920x1080/05_comb-clipper-back-view-young-man-barbershop-nenad-stojkovic-ccby2_hero_1920x1080.jpg',
  'assets/media/fade-masters-phx-open-source-hd-image-pack/03_HERO_CROPS_1920x1080/06_trendy-haircut-barbershop-mirror-nenad-stojkovic-ccby2_hero_1920x1080.jpg',
  'assets/media/fade-masters-phx-open-source-hd-image-pack/03_HERO_CROPS_1920x1080/09_barber-shop-storefront-night-billie-grace-ward-ccby2_hero_1920x1080.jpg'
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
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).catch(() => caches.match('index.html')))
  );
});
