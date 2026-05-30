const CACHE='gray-gang-drop-1779745959634';
const ASSETS=["./","./index.html","./release.json","./manifest.webmanifest","./sw.js","./audio/soft-ghost-protocol.mp3","./audio/mirror-chat.mp3","./audio/redline-heart.mp3","./audio/midnight-r-and-b-mode.mp3","./audio/slow-rain-reply.mp3","./audio/stay-through-static.mp3"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request))));
