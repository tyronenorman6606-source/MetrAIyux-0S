/* service-worker.js
 * kAIxu CodeStudio Pro — Offline PWA Service Worker
 * Build: platform591-website-20260510 • 2026-05-10T23:58:00Z
 */
'use strict';

const VERSION = '5.9.1';
const BUILD_ID = 'platform591-website-20260510';
const CACHE = `kaixu-codestudio-${BUILD_ID}`;
const CORE = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './manifest.webmanifest',
  './offline.html',
  './health.json',
  './sandbox/host.html',
  './sandbox/host.css',
  './sandbox/host.js',
  './sandbox/stage-bridge.js',
  './assets/logo.png',
  './privacy.md',
  './security.md',
  './threat_model.md',
  './assets/bg.jpeg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const accept = req.headers.get('accept') || '';
    const isNav = req.mode === 'navigate' || accept.includes('text/html');

    if (isNav){
      const cached = await cache.match('./index.html');
      try {
        const net = await fetch(req);
        if (net && net.ok) await cache.put('./index.html', net.clone());
        return net;
      } catch (e) {
        return cached || (await cache.match('./offline.html'));
      }
    }

    const cached = await cache.match(req, {ignoreVary:true}) || await cache.match(req.url, {ignoreVary:true});
    if (cached){
      event.waitUntil((async () => {
        try {
          const net = await fetch(req);
          if (net && net.ok) await cache.put(req, net.clone());
        } catch(e) {}
      })());
      return cached;
    }

    const net = await fetch(req);
    if (net && net.ok) await cache.put(req, net.clone());
    return net;
  })());
});
