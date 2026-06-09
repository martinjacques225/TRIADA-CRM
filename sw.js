const CACHE = 'crm-v15';
const ASSETS = [
  // Shell
  './index.html',
  './styles.css',
  './fase1-rediseno.css',
  './manifest.json',
  // Core JS
  './app.js',
  './js/db.js',
  './js/constants.js',
  './js/planes.js',
  './js/estados.js',
  './js/mascotas.js',
  './js/state.js',
  './js/utils.js',
  './js/ui.js',
  // Capa de servicios
  './services/index.js',
  './services/persistence.service.js',
  './services/lead.service.js',
  './services/appointment.service.js',
  './services/sales.service.js',
  './services/call.service.js',
  './services/event.service.js',
  './services/template.service.js',
  './services/config.service.js',
  './services/commission.service.js',
  './services/medal.service.js',
  './services/user.service.js',
  // Módulos de vista
  './modules/home/home.js',
  './modules/home/home.css',
  './modules/agenda/agenda.js',
  './modules/calculadora/calculadora.js',
  './modules/configuracion/configuracion.js',
  './modules/dashboard/dashboard.js',
  './modules/leads/leads.js',
  './modules/medallas/medallas.js',
  './modules/modals/modals.js',
  './modules/modals/modal-core.js',
  './modules/modals/modal-cita.js',
  './modules/modals/modal-lead.js',
  './modules/modals/modal-lead-detail.js',
  './modules/modals/modal-venta.js',
  './modules/modals/modal-wa.js',
  './modules/plantillas-wa/whatsapp.js',
  './modules/respaldos/respaldos.js',
  './modules/informes/informes.js',
  './modules/informes/informes.css',
  './modules/informes/data.engine.js',
  './modules/informes/analytics.engine.js',
  './modules/informes/mascot.engine.js',
  './modules/informes/charts.engine.js',
  './modules/informes/templates.js',
  './modules/informes/report.engine.js',
  './modules/ventas/ventas.js',
  // Assets
  './icon-lgs.png',
  './icon-crm-192.png',
  './icon-crm-512.png',
  './mascot-aria.png',
  './mascot-titan.png',
  './mascot-zen.png',
  './mascot-max.png',
  './mascot-nova.png',
  './mascot-illidan.png'
];

// Install: cache all core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for local assets, network-first for external
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isLocal = url.origin === self.location.origin;

  if (isLocal) {
    // Cache-first for local assets
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') return response;
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return response;
        }).catch(() => caches.match('./index.html'));
      })
    );
  } else {
    // Network-first for external (SheetJS CDN, WhatsApp, etc.)
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
  }
});
