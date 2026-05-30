const CACHE='gray-gang-drop-1779750429605';
const ASSETS=["./","./index.html","./manifest.webmanifest","./sw.js","./audio/receipts-in-the-sun.mp3","./cover.svg","./pics2vid/","./pics2vid/index.html","./pics2vid/package.json","./pics2vid/images/music-4u-artist-portrait.png"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request))));
