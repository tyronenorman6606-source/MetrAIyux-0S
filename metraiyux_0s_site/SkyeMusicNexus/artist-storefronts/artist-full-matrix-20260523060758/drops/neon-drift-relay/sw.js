const CACHE='gray-gang-drop-1779735859678';
const ASSETS=["./","./index.html","./manifest.webmanifest","./sw.js","./pics2vid/","./pics2vid/index.html","./pics2vid/package.json","./pics2vid/images/artist-full-matrix-20260523060758-artist-portrait.png","./pics2vid/images/smoke-artist-mpku84sm-artist-portrait.png","./pics2vid/images/artist-live-browser-20260523061012-artist-portrait.png","./pics2vid/images/music-4u-artist-portrait.png"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request))));
