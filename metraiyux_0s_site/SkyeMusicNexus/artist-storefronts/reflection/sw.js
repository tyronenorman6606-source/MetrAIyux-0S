const CACHE='gray-gang-drop-1779755948045';
const ASSETS=["./","./index.html","./manifest.webmanifest","./sw.js","./project.json","./audio/command-mirror.mp3","./audio/gate-memory.mp3","./audio/red-room-reflection.mp3","./audio/founder-static.mp3","./audio/reflection.mp3","./audio/twin-signal.mp3","./audio/proof-engine.mp3",""];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request))));
