const CACHE_NAME='techbros-ops-app-v9-real-intake-workspace';
const CORE_ASSETS=[
  "/",
  "/index.html",
  "/services.html",
  "/quote.html",
  "/scan.html",
  "/preview.html",
  "/gallery.html",
  "/contact.html",
  "/faq.html",
  "/offline.html",
  "/assets/styles.css",
  "/assets/app.js",
  "/assets/workspace-chat-widget.js",
  "/manifest.webmanifest",
  "/assets/brand/techbros-electronic-recycling-itad-logo.png",
  "/assets/techbros-scan-code.svg",
  "/assets/live-site/techbros-truck-section.png",
  "/assets/live-site/techbros-hero-home.png",
  "/assets/live-site/techbros-contact-form.png",
  "/assets/live-site/techbros-clients.png"
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.pathname.endsWith('.mp4')||request.headers.has('range')){event.respondWith(fetch(request));return;}event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));return response;}).catch(()=>caches.match('/offline.html'))));});
