/* ============================================================================
   app.js · Entrada, router por hash y dispatch de acciones
   Honra el principio del handoff: cada rol monta SU PROPIO shell tras un
   "login". No hay navegación libre entre roles: si se llega por deep-link a un
   rol no autorizado, se muestra un 403 amable (route guard, RBAC ilustrado).
   El selector de rol es andamiaje de DEMO, no la arquitectura final.
   ========================================================================== */

import { store, startClock, flash,
  advanceTicket, recallTicket, toggle86,
  selectPayTable, clearPayTable, setDiscount, setTip, setMethod, setSplit,
  charge, closeReceipt, reprint, voidTransaction, openCaja, closeCaja,
  setWaiterScreen, pickWaiterTable, backToTables, setMenuCat, toggleWaiterSheet,
  setCartNote, addToCart, cartQty, sendToKitchen, requestBill,
  setAdminScreen, setSalesMode, toggleAdminNav, selectTable, clearTableSel, setTableAction,
  openTable, freeTable, toggleAtencion, transferTable, joinTables, splitBill, goCobrar,
  setResDay, openResForm, closeResForm, setResField, addReservation, confirmReservation, assignReservation, restock,
  setQrCat, qrAdd, qrQty, qrToggleSheet, qrSend } from './domain.js';
import { renderCocina } from './roles/cocina.js';
import { renderCajero } from './roles/cajero.js';
import { renderMesero } from './roles/mesero.js';
import { renderAdmin } from './roles/admin.js';
import { renderMenuQR } from './screens/menuqr.js';
import { renderLanding } from './screens/landing.js';
import { toastHtml } from './components.js';
import { icon, esc, brandMark, wordmark } from './util.js';

const app = document.getElementById('app');

/* ---- Sesión (qué rol "inició sesión") ----
   Se persiste en sessionStorage: así un refresh mantiene al usuario en SU
   estación (no lo expulsa con un 403) — comportamiento realista de login+RBAC. */
const SESSION_KEY = 'triada_role';
const session = { role: sessionStorage.getItem(SESSION_KEY) || null };
const ROLES = {
  operacion: { name: 'Operación', desc: 'Centro de mando del admin: dashboard, mesas, caja, reservas, clientes, inventario.', ic: 'layout' },
  mesero: { name: 'Mesero', desc: 'Mis mesas, toma de pedido, comandas en vivo, mi turno y avisos.', ic: 'users' },
  cocina: { name: 'Cocina', desc: 'Pantalla de comandas (KDS), detalle, marcar 86 e historial.', ic: 'utensils' },
  caja:   { name: 'Caja',   desc: 'Cobro, arqueo (apertura/cierre) e historial de transacciones.', ic: 'card' },
};

/* ---- Cara pública (sin login): lo que ve el comensal ----
   No son roles ni pasan por el guard de RBAC. Son las superficies públicas del
   restaurante, parte de la suite que se le muestra al dueño en la demo. */
const PUBLIC = {
  menuqr:  { name: 'Menú QR', desc: 'La carta digital que el comensal escanea en su mesa: arma el pedido y llega a cocina.', ic: 'table' },
  landing: { name: 'Sitio web', desc: 'La landing pública del restaurante: hero, carta, reservas, opiniones y ubicación.', ic: 'layout' },
};

function login(role) {
  if (!ROLES[role]) return;
  session.role = role; sessionStorage.setItem(SESSION_KEY, role);
  // Limpia selección transitoria para no arrastrar estado entre roles.
  store.set({ selTable: null, tableAction: null, payTable: null, cart: [], cartNote: '', waiterSheet: false, adminNav: false });
  location.hash = '#/' + role;
}
function logout() { session.role = null; sessionStorage.removeItem(SESSION_KEY); location.hash = '#/login'; }
function routeName() { return (location.hash || '').replace(/^#\/?/, '').split('/')[0] || 'login'; }

/* ============================ VISTAS DE NAVEGACIÓN ====================== */

function launcherView() {
  const card = (key, soon) => {
    const r = ROLES[key] || soon;
    const cls = soon ? 'role-card soon' : 'role-card';
    const attr = soon ? '' : ` data-action="login" data-val="${key}"`;
    return `<button class="${cls}"${attr}${soon ? ' disabled aria-disabled="true"' : ''}>
      <span class="role-card-icon">${icon(r.ic, { size: 24 })}</span>
      <span class="role-card-name">${esc(r.name)}${soon ? ' · pronto' : ''}</span>
      <span class="role-card-desc">${esc(r.desc)}</span>
    </button>`;
  };
  // Tarjeta de superficie pública (no login: navega directo a la ruta).
  const publicCard = (key) => {
    const r = PUBLIC[key];
    return `<button class="role-card role-card-public" data-action="goto" data-val="${key}">
      <span class="role-card-icon">${icon(r.ic, { size: 24 })}</span>
      <span class="role-card-name">${esc(r.name)}</span>
      <span class="role-card-desc">${esc(r.desc)}</span>
    </button>`;
  };
  return `<div class="launcher">
    <div class="launcher-card">
      <div class="launcher-brand">${brandMark(34, 'color')} ${wordmark('Restaurant')}</div>
      <div class="demo-note">${icon('alert', { size: 14, sw: 2 })} Demo · selector de rol (en producción: login + RBAC)</div>
      <h1>Elige tu estación</h1>
      <p class="launcher-sub">Cada rol entra a su propio espacio de trabajo. Los 4 roles operativos del restaurante, con su shell y módulos propios.</p>
      <div class="role-cards">
        ${card('operacion')}
        ${card('mesero')}
        ${card('cocina')}
        ${card('caja')}
      </div>

      <div class="launcher-divider"><span>Cara pública del restaurante</span></div>
      <p class="launcher-sub">Lo que ve tu cliente. Parte de la misma suite: la carta digital que escanea en la mesa y el sitio web del local.</p>
      <div class="role-cards role-cards-public">
        ${publicCard('menuqr')}
        ${publicCard('landing')}
      </div>
    </div>
  </div>`;
}

/* Barra flotante para volver al inicio desde las superficies públicas (demo). */
function publicBack() {
  return `<button class="demo-switch" data-action="goto" data-val="login" title="Volver al inicio (demo)">
    <span class="tag">Demo</span>${icon('chevronLeft', { size: 16 })} Volver al inicio</button>`;
}

function guardView(target) {
  return `<div class="guard"><div class="guard-card">
    <div class="state-icon" style="background:var(--color-warning-soft);color:var(--color-warning-fg);margin:0 auto 16px;">${icon('lock', { size: 26 })}</div>
    <h1 style="font-size:26px;">Acceso restringido</h1>
    <p class="launcher-sub" style="margin-top:8px;">${target ? `No iniciaste sesión como <strong>${esc(ROLES[target]?.name || target)}</strong>.` : 'Esta ruta no existe.'} Cada usuario solo accede a su propia estación.</p>
    <button class="btn btn-primary" data-action="logout" style="margin-top:8px;">Volver al inicio</button>
  </div></div>`;
}

function demoSwitch() {
  return `<button class="demo-switch" data-action="logout" title="Cambiar de rol (demo)">
    <span class="tag">Demo</span>${icon('logout', { size: 16 })} Cambiar rol</button>`;
}

/* ============================ RENDER ==================================== */
function render() {
  const route = routeName();
  const s = store.state;
  let html, inRole = false;

  if (route === 'login') {
    html = launcherView();
  } else if (route === 'menuqr') {
    app.innerHTML = renderMenuQR(s) + publicBack() + toastHtml(s.toast);
    return;
  } else if (route === 'landing') {
    app.innerHTML = renderLanding(s) + publicBack() + toastHtml(s.toast);
    return;
  } else if (ROLES[route]) {
    if (session.role !== route) {
      html = guardView(route);
    } else {
      html = route === 'cocina' ? renderCocina(s) : route === 'caja' ? renderCajero(s)
        : route === 'operacion' ? renderAdmin(s) : renderMesero(s);
      inRole = true;
    }
  } else {
    html = guardView(null);
  }

  app.innerHTML = html + (inRole ? demoSwitch() : '') + toastHtml(s.toast);
}

/* ============================ DISPATCH ================================= */
const handlers = {
  login: (ds) => login(ds.val),
  logout: () => logout(),
  // Navegación directa por hash (superficies públicas: menú QR, landing, inicio).
  goto: (ds) => { location.hash = '#/' + ds.val; },
  // Setter genérico de estado de UI (tabs, columnas) — valores string.
  ui: (ds) => store.set({ [ds.key]: ds.val }),

  // Menú QR (cliente final)
  'qr:cat': (ds) => setQrCat(ds.val),
  'qr:add': (ds) => qrAdd(ds.id),
  'qr:inc': (ds) => qrQty(ds.id, 1),
  'qr:dec': (ds) => qrQty(ds.id, -1),
  'qr:open': () => qrToggleSheet(true),
  'qr:close': () => qrToggleSheet(false),
  'qr:send': () => qrSend(),

  // Landing pública
  'landing:reservar': () => flash('Reserva recibida · te contactaremos para confirmar.'),
  'landing:verCarta': () => { location.hash = '#/menuqr'; },

  // Cocina
  'kds:advance': (ds) => advanceTicket(ds.id),
  'kds:recall': (ds) => recallTicket(ds.id),
  'kds:detail': (ds) => store.set({ detailTicket: ds.id }),
  'kds:detailClose': () => store.set({ detailTicket: null }),
  '86:toggle': (ds) => toggle86(ds.id),

  // Cajero
  'caja:select': (ds) => selectPayTable(ds.id),
  'caja:clear': () => clearPayTable(),
  'caja:discount': (ds) => setDiscount(+ds.val),
  'caja:tip': (ds) => setTip(+ds.val),
  'caja:method': (ds) => setMethod(ds.val),
  'caja:split': (ds) => setSplit((store.state.splitN || 1) + (+ds.val)),
  'caja:charge': () => charge(),
  'caja:closeReceipt': () => closeReceipt(),
  'caja:print': () => flash('Comprobante enviado a impresora'),
  'caja:reprint': (ds) => reprint(+ds.id),
  'caja:void': (ds) => voidTransaction(+ds.id),
  'caja:gotoCobro': (ds) => { selectPayTable(ds.id); store.set({ cajaTab: 'cobro' }); },
  'arqueo:open': () => {
    const el = document.getElementById('arqueo-fondo');
    openCaja(el && el.value !== '' ? +el.value : 0);
  },
  'arqueo:close': () => {
    const el = document.getElementById('arqueo-conteo');
    if (!el || el.value === '') { flash('Ingresa el efectivo contado'); return; }
    closeCaja(+el.value);
  },

  // Mesero
  'mesero:screen': (ds) => setWaiterScreen(ds.val),
  'mesero:pick': (ds) => pickWaiterTable(ds.id),
  'mesero:back': () => backToTables(),
  'mesero:cat': (ds) => setMenuCat(ds.val),
  'mesero:add': (ds) => addToCart(ds.id),
  'mesero:inc': (ds) => cartQty(ds.id, 1),
  'mesero:dec': (ds) => cartQty(ds.id, -1),
  'mesero:send': () => sendToKitchen(),
  'mesero:bill': () => requestBill(),
  'mesero:deliver': (ds) => advanceTicket(ds.id),
  'mesero:openSheet': () => toggleWaiterSheet(true),
  'mesero:closeSheet': () => toggleWaiterSheet(false),

  // Admin / Operación
  'admin:nav': (ds) => setAdminScreen(ds.val),
  'admin:navToggle': (ds) => toggleAdminNav(ds.val === '1'),
  'admin:salesMode': (ds) => setSalesMode(ds.val),
  'admin:selTable': (ds) => selectTable(ds.id),
  'admin:clearSel': () => clearTableSel(),
  'admin:open': (ds) => openTable(ds.id),
  'admin:free': (ds) => freeTable(ds.id),
  'admin:atencion': () => toggleAtencion(),
  'admin:cobrar': () => goCobrar(),
  'admin:tableAction': (ds) => setTableAction(ds.val),
  'admin:tableActionCancel': () => setTableAction(null),
  'admin:transfer': (ds) => transferTable(ds.id),
  'admin:join': (ds) => joinTables(ds.id),
  'admin:split': (ds) => splitBill(+ds.val),
  'admin:resDay': (ds) => setResDay(ds.val),
  'admin:openResForm': () => openResForm(),
  'admin:closeResForm': () => closeResForm(),
  'admin:resZone': (ds) => setResField('zone', ds.val),
  'admin:resPeople': (ds) => setResField('people', Math.max(1, Math.min(20, (+store.state.resForm.people || 2) + (+ds.val)))),
  'admin:addRes': () => {
    const n = document.getElementById('res-name'), tm = document.getElementById('res-time');
    if (n) setResField('name', n.value);
    if (tm) setResField('time', tm.value);
    addReservation();
  },
  'admin:confirmRes': (ds) => confirmReservation(ds.id),
  'admin:assignRes': (ds) => assignReservation(ds.id),
  'admin:restock': (ds) => restock(ds.id),
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  // Click dentro de un modal cuyo overlay tiene la acción de cierre: ignorar.
  if (el.hasAttribute('data-overlay') && e.target.closest('[data-stop]')) return;
  const h = handlers[el.dataset.action];
  if (h) { e.preventDefault(); h(el.dataset, el, e); }
});

// Observaciones del pedido: textarea no controlada, se guarda al perder foco
// (evita re-render por tecla; el click en "Enviar" hace blur → se guarda antes).
document.addEventListener('change', (e) => {
  const t = e.target;
  if (!t) return;
  if (t.id === 'order-note') setCartNote(t.value);
  else if (t.id === 'res-name') setResField('name', t.value);
  else if (t.id === 'res-time') setResField('time', t.value);
});

// Teclado: Enter/Espacio sobre elementos role="button"; Esc cierra capas.
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role="button"][data-action]')) {
    e.preventDefault(); e.target.click();
  }
  if (e.key === 'Escape') {
    const s = store.state;
    if (s.detailTicket) store.set({ detailTicket: null });
    else if (s.receipt) closeReceipt();
    else if (s.showResForm) closeResForm();
    else if (s.adminNav) toggleAdminNav(false);
    else if (s.waiterSheet) toggleWaiterSheet(false);
    else if (s.payTable) clearPayTable();
  }
});

/* ============================ ARRANQUE ================================= */
store.subscribe(render);
window.addEventListener('hashchange', render);
// Reanudar sesión: si no hay ruta (o es login) pero hay rol guardado, ir a su home.
if (routeName() === 'login' && session.role) location.hash = '#/' + session.role;
else if (!location.hash) location.hash = '#/login';
render();
startClock();
