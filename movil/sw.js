/* Tríada CRM Móvil · service worker
   Estrategia NETWORK-FIRST: online siempre trae lo último (sin caché rancia en
   desarrollo); offline cae al shell cacheado. Solo se registra en producción
   (https, no localhost) — ver js/app.js — para no ensuciar la verificación. */
const CACHE = 'triada-movil-v1';
const SHELL = [
  './', './index.html',
  './css/tokens.css', './css/app.css',
  './icon.svg', './manifest.json',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (new URL(req.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((m) => m || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
