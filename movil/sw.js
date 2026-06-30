/* Tríada CRM Móvil · service worker
   NETWORK-FIRST (online siempre trae lo último; offline cae al shell cacheado).
   Actualización LIMPIA: la versión nueva NO se activa sola — espera, la app avisa
   "nueva versión disponible", y solo al tocar "Actualizar" toma el control (SKIP_WAITING).
   Solo se registra en producción (https, no localhost) — ver js/app.js. */
const CACHE = 'triada-movil-v4';
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

// ── Web Push: notificación del sistema (app cerrada o en segundo plano) ──
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  const title = d.title || 'Tríada CRM';
  const body = d.titulo ? `${d.body || 'Nueva reunión'} · ${d.titulo}` : (d.body || 'Tienes una novedad');
  e.waitUntil(self.registration.showNotification(title, {
    body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: d.tag || 'triada',
    data: { url: d.url || './' },
    vibrate: [60, 40, 60],
  }));
});

// Tocar la notificación → enfoca la app (o la abre) y navega a la Agenda.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) { try { c.postMessage({ type: 'nav', screen: 'agenda' }); } catch (_) {} return c.focus(); }
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
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
