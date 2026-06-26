/* Tríada CRM Móvil · service worker
   NETWORK-FIRST (online siempre trae lo último; offline cae al shell cacheado).
   Actualización LIMPIA: la versión nueva NO se activa sola — espera, la app avisa
   "nueva versión disponible", y solo al tocar "Actualizar" toma el control (SKIP_WAITING).
   Solo se registra en producción (https, no localhost) — ver js/app.js. */
const CACHE = 'triada-movil-v3';
const SHELL = [
  './', './index.html',
  './css/tokens.css', './css/app.css',
  './icon.svg', './icon-192.png', './icon-512.png', './manifest.json',
];

self.addEventListener('install', (e) => {
  // Sin skipWaiting: la versión nueva espera a que el usuario confirme.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// La app pide activar la versión nueva al tocar "Actualizar".
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
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
