const CACHE='gray-gang-drop-1779733997689';
const ASSETS=["./","./index.html","./manifest.webmanifest","./sw.js","./pics2vid/","./pics2vid/index.html","./pics2vid/package.json","./pics2vid/images/gray-skyes-gray-red-portrait.jpg","./pics2vid/images/gray-skyes-gray-founder-portrait.jpg","./pics2vid/images/gray-skyes-gray-wide-stage.jpg","./pics2vid/images/gray-skyes-gray-london-skyes.jpg","./pics2vid/images/gray-skyes-founder-command-portrait.png","./pics2vid/images/gray-skyes-brain-gray-brain-avatar-openai.png","./pics2vid/images/gray-skyes-brain-founder-reference.png"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener('fetch',event=>event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request))));
