const CACHE='gray-skyes-hosted-album-pwa-v1';
const CORE=["./index.html","./manifest.webmanifest","./tracks.json","../media/images/gray-red-portrait.jpg"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>null));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim());});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{if(res.ok&&new URL(e.request.url).origin===location.origin){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>null);}return res;}).catch(()=>cached)));});
