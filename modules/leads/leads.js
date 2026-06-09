// modules/leads/leads.js
import { leads as leadsDB } from '../../services/lead.service.js';
import { LEAD_ESTADOS } from '../../js/estados.js';
import { S } from '../../js/state.js';
import { escHtml, formatDate, toast, statusBadgeClass, avatarHtml } from '../../js/utils.js';

// Iconos usados en esta vista (se centralizarán en ui.js en Etapa 4)
const _ico = {
  search:  `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>`,
  people:  `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>`,
  phone:   `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>`,
  whatsapp:`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
  calendar:`<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"/></svg>`,
  edit:    `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>`,
  trash:   `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
  grid:    `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>`,
  kanban:  `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 4a1 1 0 011-1h5a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm7 0a1 1 0 011-1h5a1 1 0 011 1v7a1 1 0 01-1 1h-5a1 1 0 01-1-1V4z"/></svg>`,
  chart:   `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>`,
  list:    `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/></svg>`
};

export async function render() {
  const center = document.getElementById('center');
  const all    = await leadsDB.getAll();
  const visible = S.showAgendados ? all : all.filter(l => !l.agendado);
  const filtered = S.searchEstado ? visible.filter(l => l.estado === S.searchEstado) : visible;
  const shown  = S.searchQ
    ? filtered.filter(l => [l.nombre,l.apellido,l.telefono,l.email,l.empresa].some(v => (v||'').toLowerCase().includes(S.searchQ.toLowerCase())))
    : filtered;
  const agendadosCount = all.filter(l => l.agendado).length;

  center.innerHTML = `<div class="view-animate">
    <div class="leads-toolbar">
      <div class="search-input-wrap" style="flex:1;max-width:360px">${_ico.search}<input class="search-input" id="leadSearch" placeholder="Buscar lead..." value="${escHtml(S.searchQ)}"></div>
      <select class="filter-select" id="leadEstado">
        <option value="">Todos los estados</option>
        ${LEAD_ESTADOS.map(e=>`<option value="${e}"${S.searchEstado===e?' selected':''}>${e}</option>`).join('')}
      </select>
      <button class="btn-secondary${S.showAgendados?' active':''}" id="btnToggleAgendados" style="white-space:nowrap;font-size:.72rem">
        ${_ico.calendar}${S.showAgendados?'Ocultar agendados':`En agenda (${agendadosCount})`}
      </button>
      <div class="leads-view-toggle">
        <button class="leads-view-btn${S.leadsView==='grid'  ?' active':''}" id="btnGrid">${_ico.grid}</button>
        <button class="leads-view-btn${S.leadsView==='kanban'?' active':''}" id="btnKanban">${_ico.kanban}</button>
      </div>
    </div>
    ${shown.length===0
      ? `<div class="empty-day">${_ico.people}<h3>${all.length===0?'Sin leads aún':'Sin resultados'}</h3><p>${all.length===0?'Agrega tu primer lead o importa desde Excel.':'Prueba con otros filtros o activa "En agenda".'}</p></div>`
      : S.leadsView==='grid' ? _buildGrid(shown) : _buildKanban(shown)}
  </div>`;

  document.getElementById('leadSearch').addEventListener('input',   e => { S.searchQ = e.target.value; render(); });
  document.getElementById('leadEstado').addEventListener('change',  e => { S.searchEstado = e.target.value; render(); });
  document.getElementById('btnToggleAgendados').addEventListener('click', () => { S.showAgendados = !S.showAgendados; render(); });
  document.getElementById('btnGrid').addEventListener('click',   () => { S.leadsView = 'grid';   render(); });
  document.getElementById('btnKanban').addEventListener('click', () => { S.leadsView = 'kanban'; render(); });
  // attachCardEvents lo llama app.js después de render()
  window._app?.attachCardEvents?.();
}

function _buildGrid(list) {
  return `<div class="leads-grid">${list.map(l=>`
    <div class="lead-card${l.agendado?' lead-agendado':''}">
      <div class="lead-card-header">
        ${avatarHtml(l.nombre,l.apellido,l.avatar,36)}
        <div class="lead-info lead-name-link" data-action="view-lead" data-id="${l.id}" title="Ver ficha"><div class="lead-name">${escHtml((l.nombre||'')+' '+(l.apellido||''))}</div><div class="lead-sub">${escHtml(l.areaLaboral||l.empresa||l.cargo||'-')}${l.nivelIngles?` · ${escHtml(l.nivelIngles)}`:''}</div></div>
        <span class="${statusBadgeClass(l.estado)}">${escHtml(l.estado)}</span>
      </div>
      <div class="lead-card-body">
        ${l.telefono?`<div class="lead-detail">${_ico.phone}${escHtml(l.telefono)}</div>`:''}
        ${l.email   ?`<div class="lead-detail">${_ico.list}${escHtml(l.email)}</div>`:''}
        ${l.interes ?`<div class="lead-detail">${_ico.chart}${escHtml(l.interes)}</div>`:''}
      </div>
      <div class="lead-card-footer">
        <div class="lead-actions">
          ${l.telefono?`<button class="btn-action green" data-action="call" data-id="${l.id}" data-type="lead" data-tel="${escHtml(l.telefono)}" data-nombre="${escHtml(l.nombre||'')}">${_ico.phone}</button>`:''}
          ${l.telefono?`<button class="btn-action green" data-action="wa"   data-id="${l.id}" data-type="lead">${_ico.whatsapp}</button>`:''}
          <button class="btn-action blue"    data-action="agendar-lead" data-id="${l.id}">${_ico.calendar} Agendar</button>
          <button class="btn-action primary" data-action="edit-lead"    data-id="${l.id}">${_ico.edit}</button>
          <button class="btn-action danger"  data-action="delete-lead"  data-id="${l.id}">${_ico.trash}</button>
        </div>
        <span style="font-size:.67rem;color:var(--text3)">${formatDate((l.fechaCreacion||'').slice(0,10))}</span>
      </div>
    </div>`).join('')}</div>`;
}

function _buildKanban(list) {
  const cols = ['Nuevo','Contactado','Cita agendada','Seguimiento','Propuesta enviada','Venta cerrada','Perdido'];
  return `<div class="kanban-board">${cols.map(col=>{
    const items = list.filter(l=>l.estado===col);
    return `<div class="kanban-col">
      <div class="kanban-col-header"><span class="kanban-col-title">${col}</span><span class="kanban-count">${items.length}</span></div>
      <div class="kanban-cards">${items.map(l=>`<div class="kanban-card">
        <div class="kanban-card-name lead-name-link" data-action="view-lead" data-id="${l.id}" title="Ver ficha">${escHtml((l.nombre||'')+' '+(l.apellido||''))}</div>
        <div class="kanban-card-sub">${escHtml(l.interes||l.areaLaboral||l.empresa||'-')}</div>
        <div class="kanban-card-actions">
          ${l.telefono?`<button class="btn-action green" data-action="call" data-id="${l.id}" data-type="lead" data-tel="${escHtml(l.telefono)}" data-nombre="${escHtml(l.nombre||'')}">${_ico.phone}</button>`:''}
          <button class="btn-action blue"    data-action="agendar-lead" data-id="${l.id}">${_ico.calendar}</button>
          <button class="btn-action primary" data-action="edit-lead"    data-id="${l.id}">${_ico.edit}</button>
        </div>
      </div>`).join('')}</div>
    </div>`;
  }).join('')}</div>`;
}
// NOTA: deleteLead vive ahora sólo en modules/modals/modal-lead.js (vía window._app.deleteLead).
