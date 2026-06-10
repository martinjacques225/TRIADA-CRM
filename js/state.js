// js/state.js — Global UI state (non-persisted)
export const S = {
  view:         'home',
  searchQ:      '',
  searchEstado: '',
  pipelineView: 'kanban',  // 'kanban' | 'list'
  deferredInstall: null,
  profile:      null,      // { nombre, role, area } — set by app.js at init
};
