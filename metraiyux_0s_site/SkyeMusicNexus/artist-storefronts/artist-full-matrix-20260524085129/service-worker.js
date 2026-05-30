const CACHE='artist-full-matrix-20260524085129-storefront-1779730109767';
const ASSETS=["./","./index.html","./app.html","./manifest.webmanifest","./products/","./products/index.html","./assets/artist-portrait.png","../artist-storefronts.css"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request))));
