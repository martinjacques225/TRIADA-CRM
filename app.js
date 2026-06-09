// CRM Comercial v3.1 — app.js
// Orquestador puro: inicialización, navegación, registro de módulos.
// Toda la lógica de negocio y UI está en js/ y modules/.

// ── Capas base (vía capa de servicios, nunca IndexedDB directo) ──
import { initDB, appointments, calls, config } from './services/index.js';
import { S } from './js/state.js';
import { addDays, todayStr, showFileError, toast, vibrate, initAutoUpper } from './js/utils.js';

// ── UI Shell ──
import { ico, renderNav, renderBottomNav, renderTopbar, attachCardEvents,
         showMascotMessage, checkMascotRegreso, showMascotForView, startMascotTips,
         autoLogCall, showCallResultModal,
         requestNotifications, startNotificationWatcher, installPWA } from './js/ui.js';

// ── Módulos de vista ──
import * as ModHome      from './modules/home/home.js';
import * as ModAgenda    from './modules/agenda/agenda.js';
import * as ModLeads     from './modules/leads/leads.js';
import * as ModVentas    from './modules/ventas/ventas.js';
import * as ModCalc      from './modules/calculadora/calculadora.js';
import * as ModMedallas  from './modules/medallas/medallas.js';
import * as ModDashboard from './modules/dashboard/dashboard.js';
import * as ModWhatsapp  from './modules/plantillas-wa/whatsapp.js';
import * as ModInformes  from './modules/informes/informes.js';
import * as ModConfig    from './modules/configuracion/configuracion.js';

// ── Módulo de modales ──
import { openModal, closeModal,
         openFormModal, openFormModalFromLead, openLeadModal, openLeadDetail,
         openReagendarModal, openWAModal, openSaleModal,
         deleteSale, deleteLead, deleteAppointment, appointmentToLead } from './modules/modals/modals.js';

// ═══ NAVEGACIÓN ═══
export function navigate(view) {
  S.view = view; S.searchQ = ''; S.searchEstado = '';
  renderNav();
  renderTopbar(addDays, refreshView, openFormModal, openLeadModal, openSaleModal);
  renderBottomNav();
  refreshCenter();
}

async function refreshCenter() {
  const map = {
    home:        ModHome.render,
    agenda:      ModAgenda.render,
    leads:       ModLeads.render,
    whatsapp:    ModWhatsapp.render,
    calculadora: ModCalc.render,
    mis_ventas:  ModVentas.render,
    medallas:    ModMedallas.render,
    dashboard:   ModDashboard.render,
    respaldos:   ModInformes.render,
    config:      ModConfig.render
  };
  if (map[S.view]) await map[S.view]();
  if (S.view === 'home') await ModHome.renderPanel();
  else if (S.view === 'dashboard') await ModDashboard.renderPanel();
  else await ModAgenda.renderPanel();
}

export async function refreshView() {
  renderTopbar(addDays, refreshView, openFormModal, openLeadModal, openSaleModal);
  await refreshCenter();
}

// ═══ INIT ═══
async function init() {
  await initDB();

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.deferredInstall = e; renderNav(); });

  const savedTheme = await config.get('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Mayúsculas automáticas (por defecto activado; configurable en Configuración)
  initAutoUpper(await config.get('autoMayusculas') !== false);

  // Registrar funciones en window._app para que los módulos las usen
  window._app = {
    // Navegación
    navigate, refreshView,
    // UI Shell
    renderNav, renderBottomNav, attachCardEvents,
    showMascotMessage,
    // Modales
    openFormModal, openFormModalFromLead, openLeadModal, openLeadDetail,
    openReagendarModal, openWAModal, openSaleModal,
    closeModal,
    // Acciones de datos
    deleteSale, deleteLead, deleteAppointment, appointmentToLead,
    autoLogCall: (data) => autoLogCall(data, calls),
    // Helpers para módulos
    _getDebutActivo: () => config.get('debutActivo'),
    setAutoUpper: initAutoUpper,
    requestNotifications
  };

  // Render inicial
  await renderNav();
  renderTopbar(addDays, refreshView, openFormModal, openLeadModal, openSaleModal);
  renderBottomNav();
  await ModHome.render();
  await ModHome.renderPanel();

  // Eventos de modales globales
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('callResultOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('callResultOverlay'))
      document.getElementById('callResultOverlay').classList.remove('open');
  });
  document.getElementById('callResultClose')?.addEventListener('click', () =>
    document.getElementById('callResultOverlay').classList.remove('open')
  );
  document.getElementById('mascotClose').addEventListener('click', () =>
    document.getElementById('mascot-bubble').classList.add('hidden')
  );

  // Notificaciones y mascota
  await requestNotifications();
  startNotificationWatcher(appointments);
  await checkMascotRegreso();
  if (!await config.get('lastVisit')) setTimeout(() => showMascotMessage(null, 'bienvenida', true), 1500);
}

document.addEventListener('DOMContentLoaded', () => {
  init().catch(err => {
    document.body.innerHTML =
      '<div style="padding:20px;font-family:monospace;color:red;background:#fff;font-size:14px">' +
      '<b>ERROR al iniciar:</b><br><br>' + err.message +
      '<br><br><pre>' + (err.stack || '') + '</pre></div>';
  });
});
