// modules/pipeline/pipeline.js
import { prospectos } from '../../js/db.js';
import { S } from '../../js/state.js';
import { escHtml, formatDate, PIPELINE_STAGES, stageBadge, RUBROS } from '../../js/utils.js';

let _all = [];

const _ico = {
  search: `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>`,
  kanban: `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 4a1 1 0 011-1h5a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm7 0a1 1 0 011-1h5a1 1 0 011 1v7a1 1 0 01-1 1h-5a1 1 0 01-1-1V4z"/></svg>`,
  list:   `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/></svg>`,
  phone:  `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>`,
  diag:   `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"/></svg>`,
  edit:   `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>`,
  trash:  `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
};

export async function render() {
  const all = _all = await prospectos.getAll();
  const filtered = _filter(all);

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">
    <div class="section-head">
      <h2>Pipeline de prospectos</h2>
      <div class="actions">
        <div class="topbar-search" style="max-width:240px">
          ${_ico.search}
          <input id="pSearch" placeholder="Buscar prospecto…" value="${escHtml(S.searchQ)}">
        </div>
        <select class="filter-sel" id="pEstado">
          <option value="">Todas las etapas</option>
          ${PIPELINE_STAGES.map(s=>`<option value="${s.id}"${S.searchEstado===s.id?' selected':''}>${s.icon} ${s.id}</option>`).join('')}
        </select>
        <div style="display:flex;gap:4px">
          <button class="btn-icon${S.pipelineView==='kanban'?' active':''}" id="btnKanban" title="Kanban">${_ico.kanban}</button>
          <button class="btn-icon${S.pipelineView==='list'?' active':''}" id="btnList" title="Lista">${_ico.list}</button>
        </div>
        <button class="btn btn-primary" onclick="window._app.openProspectoModal()">+ Prospecto</button>
      </div>
    </div>

    <div class="pipeline-stats">
      ${PIPELINE_STAGES.filter(s=>s.id!=='Descartado').map(st=>{
        const cnt = all.filter(p=>p.estado===st.id).length;
        return `<div class="pipe-stat${S.searchEstado===st.id?' active':''}" data-stage="${st.id}" style="border-top:3px solid ${st.color}">
          <div class="pipe-stat-icon">${st.icon}</div>
          <div class="pipe-stat-cnt" style="color:${st.color}">${cnt}</div>
          <div class="pipe-stat-lbl">${st.id}</div>
        </div>`;
      }).join('')}
    </div>

    <div id="pipeResults">${_buildResults(all, filtered)}</div>
  </div>`;

  // Buscar: actualización PARCIAL para no perder el foco del input
  document.getElementById('pSearch').addEventListener('input', e => { S.searchQ = e.target.value; _renderResults(); });
  document.getElementById('pEstado').addEventListener('change', e => { S.searchEstado = e.target.value; _renderResults(); });
  document.getElementById('btnKanban').addEventListener('click', () => { S.pipelineView = 'kanban'; render(); });
  document.getElementById('btnList').addEventListener('click', () => { S.pipelineView = 'list'; render(); });
  // Click en una estadística → filtra el tablero por esa etapa (toggle)
  document.querySelectorAll('.pipe-stat').forEach(el => el.addEventListener('click', () => {
    S.searchEstado = (S.searchEstado === el.dataset.stage) ? '' : el.dataset.stage;
    render();
  }));

  _attachKanbanDnD();
}

function _buildResults(all, filtered) {
  if (filtered.length === 0 && all.length === 0) {
    return `<div class="empty-state"><div class="empty-icon">🎯</div><h3>Sin prospectos aún</h3><p>Agrega tu primer prospecto o importa leads desde el landing.</p><button class="btn btn-primary" onclick="window._app.openProspectoModal()">+ Agregar prospecto</button></div>`;
  }
  return S.pipelineView === 'kanban' ? _buildKanban(all, filtered) : _buildList(filtered);
}

function _renderResults() {
  const filtered = _filter(_all);
  const el = document.getElementById('pipeResults');
  if (el) el.innerHTML = _buildResults(_all, filtered);
  _attachKanbanDnD();
}

// Drag & drop: arrastra una tarjeta a otra columna para cambiar su etapa
function _attachKanbanDnD() {
  if (S.pipelineView !== 'kanban') return;
  document.querySelectorAll('.prospect-card[draggable="true"]').forEach(card => {
    card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', card.dataset.id); card.style.opacity = '0.45'; });
    card.addEventListener('dragend', () => { card.style.opacity = ''; });
  });
  document.querySelectorAll('.kanban-col').forEach(col => {
    const hi = () => { col.style.outline = '2px dashed var(--primary)'; col.style.outlineOffset = '-4px'; };
    const lo = () => { col.style.outline = ''; };
    col.addEventListener('dragover', e => { e.preventDefault(); hi(); });
    col.addEventListener('dragleave', lo);
    col.addEventListener('drop', async e => {
      e.preventDefault(); lo();
      const id = +e.dataTransfer.getData('text/plain');
      const stage = col.dataset.stage;
      if (!id || !stage) return;
      const p = await prospectos.get(id);
      if (p && p.estado !== stage) { await prospectos.update({ ...p, estado: stage }); render(); }
    });
  });
}

function _filter(all) {
  let list = all;
  if (S.searchEstado) list = list.filter(p => p.estado === S.searchEstado);
  if (S.searchQ) {
    const q = S.searchQ.toLowerCase();
    list = list.filter(p => [p.nombre, p.empresa, p.email, p.telefono, p.rubro].some(v => (v||'').toLowerCase().includes(q)));
  }
  return list;
}

function _buildKanban(all, filtered) {
  return `<div class="kanban-board">
    ${PIPELINE_STAGES.map(st => {
      const cards = filtered.filter(p => p.estado === st.id);
      return `<div class="kanban-col" data-stage="${st.id}">
        <div class="kanban-col-head" style="border-top:3px solid ${st.color}">
          <span class="col-icon">${st.icon}</span>
          <span class="col-title">${st.id}</span>
          <span class="col-count" style="color:${st.color}">${cards.length}</span>
        </div>
        <div class="kanban-col-body">
          ${cards.length === 0
            ? `<div style="text-align:center;padding:20px 8px;font-size:12px;color:var(--text3)">Sin prospectos</div>`
            : cards.map(p => _prospectCard(p, st)).join('')}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function _prospectCard(p, st) {
  const dolorChip = p.dolorPrincipal ? `<span class="prospect-meta-chip" style="color:var(--primary)">${escHtml(p.dolorPrincipal)}</span>` : '';
  return `<div class="prospect-card" draggable="true" data-stage="${escHtml(p.estado)}" data-id="${p.id}">
    <div class="prospect-card-top">
      <div style="width:32px;height:32px;border-radius:50%;background:${st.color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0">${(p.nombre||'?')[0].toUpperCase()}</div>
      <div style="min-width:0;flex:1">
        <div class="prospect-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(p.nombre||'Sin nombre')}</div>
        <div class="prospect-empresa">${escHtml(p.empresa||p.rubro||'—')}</div>
      </div>
    </div>
    <div class="prospect-meta">
      ${p.rubro ? `<span class="prospect-meta-chip">${escHtml(p.rubro)}</span>` : ''}
      ${p.tamano ? `<span class="prospect-meta-chip">${escHtml(p.tamano)} trabaj.</span>` : ''}
      ${dolorChip}
    </div>
    <div class="prospect-actions">
      ${p.telefono ? `<button class="btn-action" onclick="window._app.callProspecto(${p.id})" title="Llamar">${_ico.phone}</button>` : ''}
      <button class="btn-action" onclick="window._app.openDiagnosticoModal(${p.id})" title="Diagnóstico">${_ico.diag}</button>
      <button class="btn-action" onclick="window._app.openProspectoDetail(${p.id})" title="Ver ficha">${_ico.edit}</button>
      <button class="btn-action" onclick="window._app.deleteProspecto(${p.id})" title="Eliminar">${_ico.trash}</button>
    </div>
  </div>`;
}

function _buildList(list) {
  if (list.length === 0) return `<div class="empty-state"><div class="empty-icon">🔍</div><h3>Sin resultados</h3><p>Prueba con otros filtros.</p></div>`;
  return `<div class="card" style="overflow:hidden">
    <table class="data-table">
      <thead>
        <tr>
          <th>Prospecto</th><th>Empresa</th><th>Rubro</th><th>Dolor principal</th><th>Etapa</th><th>Fecha</th><th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(p => `<tr>
          <td><strong>${escHtml(p.nombre||'—')}</strong><div style="font-size:12px;color:var(--text3)">${escHtml(p.email||p.telefono||'')}</div></td>
          <td>${escHtml(p.empresa||'—')}</td>
          <td>${escHtml(p.rubro||'—')}</td>
          <td>${p.dolorPrincipal?`<span class="chip-dolor">${escHtml(p.dolorPrincipal)}</span>`:'—'}</td>
          <td>${stageBadge(p.estado)}</td>
          <td style="color:var(--text3);font-size:12.5px">${formatDate(p.fechaCreacion)}</td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn-icon btn-sm" onclick="window._app.openProspectoDetail(${p.id})" title="Ver">${_ico.edit}</button>
              <button class="btn-icon btn-sm" onclick="window._app.openDiagnosticoModal(${p.id})" title="Diagnóstico">${_ico.diag}</button>
              <button class="btn-icon btn-sm" onclick="window._app.deleteProspecto(${p.id})" title="Eliminar">${_ico.trash}</button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}
