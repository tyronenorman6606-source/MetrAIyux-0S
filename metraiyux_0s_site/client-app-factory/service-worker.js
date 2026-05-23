const CACHE_NAME = "client-app-factory-v15-proof-poster";
const APP_SHELL = [
  "",
  "index.html",
  "offline.html",
  "clients/",
  "client/",
  "surfaces/",
  "brand/",
  "media/",
  "design/",
  "builder/",
  "generated-apps/",
  "proofs/",
  "workspace/",
  "payment/",
  "deployments/",
  "auren/",
  "activity/",
  "settings/",
  "manifest.webmanifest",
  "assets/styles.css",
  "assets/app.js",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "data/empire-pallets-record.json",
  "data/client-app-factory-index.json",
  "data/skye-app-template-record.json",
  "data/factory-scan-report.json",
  "data/empire-pallets-scan-report.json",
  "storage/records/skye-app-template.json",
  "storage/records/empire-pallets.json",
  "storage/records/next-level-gaming-goodyear.json",
  "storage/records/next-level-gaming-az.json",
  "storage/records/fade-masters-phx.json",
  "storage/records/as-you-wish-pottery-westgate.json"
];

function appUrl(relativePath = "") {
  return new URL(relativePath, self.registration.scope).toString();
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL.map((entry) => appUrl(entry))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match(appUrl("offline.html"))))
  );
});
