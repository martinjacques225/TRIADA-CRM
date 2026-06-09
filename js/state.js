// js/state.js — Estado global de la aplicación (singleton)
// Importar siempre la misma referencia para garantizar consistencia entre módulos

export const S = {
  view:           'home',
  date:           new Date().toISOString().slice(0, 10),
  searchQ:        '',
  searchEstado:   '',
  editingId:      null,
  waTarget:       null,
  reagendarId:    null,
  notified:       new Set(),
  deferredInstall:null,
  pendingCallId:  null,
  leadsView:      'grid',
  showAgendados:  false,
  calcPlan:       'contado',
  calcQty:        1,
  calcBeca:       false,
  calcTab:        'rapida',   // 'rapida' | 'simulador'
  simDebut:       false,      // bono debut activo en la simulación
  simGrid:        null,       // grilla de ventas por semana (lazy init en el módulo)
  // Fase 2
  agendaView:     'agenda',   // 'agenda' | 'calendario'
  calMonth:       null,       // 'YYYY-MM' para la vista calendario (lazy init)
  leadDetailId:   null,       // lead abierto en la ficha lateral
  agendaSearch:   '',         // búsqueda de citas (todas las fechas)
  ventasSearch:   ''          // búsqueda de ventas
};
