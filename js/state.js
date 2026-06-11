// js/state.js — Global UI state (non-persisted)
export const S = {
  view:         'home',
  searchQ:      '',
  searchEstado: '',
  pipelineView: 'kanban',  // 'kanban' | 'list'
  deferredInstall: null,
  profile:      null,      // { nombre, role, area } — set by app.js at init
  aicView:      'dashboard', // AI Commander: pestaña activa
  aicProjectId: null,      // AI Commander: proyecto seleccionado en el tablero
};
