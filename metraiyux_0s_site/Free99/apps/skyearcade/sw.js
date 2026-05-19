const CACHE_NAME = 'skyearcade-sovereign-vault-v1-8-0';
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/app.html",
  "/landing.css",
  "/styles.css",
  "/app.js",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/llms-full.txt",
  "/ai.md",
  "/proof.html",
  "/assets/skyearcade-icon.svg",
  "/assets/skyearcade-icon-192.png",
  "/assets/skyearcade-icon-512.png",
  "/assets/sovereign-vault-main-logo.png",
  "/assets/game-logos/skyeace.svg",
  "/assets/game-logos/uptime.svg",
  "/assets/game-logos/dns.svg",
  "/assets/game-logos/scepter.svg",
  "/assets/game-logos/reliquary.svg",
  "/assets/game-logos/koatsu.svg",
  "/assets/game-logos/leads.svg",
  "/assets/game-logos/caseDesk.svg",
  "/assets/game-logos/desktopQuest.svg",
  "/assets/game-logos/vanta.svg",
  "/games/skyeace.html",
  "/games/uptime.html",
  "/games/dns.html",
  "/games/scepter.html",
  "/games/reliquary.html",
  "/games/koatsu.html",
  "/games/leads.html",
  "/games/caseDesk.html",
  "/games/desktopQuest.html",
  "/games/vanta.html"
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
      return response;
    }).catch(() => caches.match('/index.html')))
  );
});
