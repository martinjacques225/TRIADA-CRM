// modules/pipeline/pipeline.js
import { prospectos, diagnosticos, autodiags } from '../../js/db.js';
import { S } from '../../js/state.js';
import { escHtml, formatDate, PIPELINE_STAGES, stageBadge, stageIcon, RUBROS } from '../../js/utils.js';

let _all = [];
let _prosConDiag = new Set();
let _prosConAuto = new Set();
let _searchT = null;   // debounce del buscador (evita rebuild del DOM por tecla)

const _BADGE_STAGES = new Set(['Diagnóstico Agendado','Diagnóstico Realizado','Propuesta Enviada','Negociando','Cliente']);

const _li = (n) => (window.icon ? window.icon(n) : '');
const _ico = {
  search: _li('search'),
  kanban: _li('kanban'),
  list:   _li('list'),
  phone:  _li('phone'),
  diag:   _li('diag'),
  edit:   _li('pencil'),
  trash:  _li('trash'),
};

export async function render() {
  const [allProsp, allDiags] = await Promise.all([prospectos.getAll(), diagnosticos.getAll()]);
  _prosConDiag = new Set(allDiags.map(d => d.prospectoId).filter(Boolean));
  // Autodiagnósticos del cliente (referencia): falla suave si la tabla no existe
  try { _prosConAuto = new Set((await autodiags.getAll()).map(a => a.prospectoId).filter(Boolean)); } catch (_) { _prosConAuto = new Set(); }
  _all = allProsp;
  _paint();
}

// Repinta desde el estado en memoria (_all) SIN ir a la red. Lo usan el filtro por
// etapa y el toggle kanban/lista (interacciones frecuentes y no-mutantes): antes
// cada clic llamaba render() = 2-3 getAll. La caché de db.js ya amortigua, pero
// repintar de memoria evita incluso esa ida y la reconstrucción de los Sets.
function _paint() {
  const all = _all;
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
          <div class="pipe-stat-icon" style="color:${st.color}">${stageIcon(st.id,18)}</div>
          <div class="pipe-stat-cnt" style="color:${st.color}">${cnt}</div>
          <div class="pipe-stat-lbl">${st.id}</div>
        </div>`;
      }).join('')}
    </div>

    <div id="pipeResults">${_buildResults(all, filtered)}</div>
  </div>`;

  // Buscar: actualización PARCIAL para no perder el foco del input
  document.getElementById('pSearch').addEventListener('input', e => { S.searchQ = e.target.value; clearTimeout(_searchT); _searchT = setTimeout(_renderResults, 140); });
  document.getElementById('pEstado').addEventListener('change', e => { S.searchEstado = e.target.value; _renderResults(); });
  document.getElementById('btnKanban').addEventListener('click', () => { S.pipelineView = 'kanban'; _paint(); });
  document.getElementById('btnList').addEventListener('click', () => { S.pipelineView = 'list'; _paint(); });
  // Click en una estadística → filtra el tablero por esa etapa (toggle)
  document.querySelectorAll('.pipe-stat').forEach(el => el.addEventListener('click', () => {
    S.searchEstado = (S.searchEstado === el.dataset.stage) ? '' : el.dataset.stage;
    _paint();
  }));

  _attachKanbanDnD();
}

function _buildResults(all, filtered) {
  if (filtered.length === 0 && all.length === 0) {
    return `<div class="empty-state"><div class="empty-icon">${window.icon?window.icon('target'):''}</div><h3>Sin prospectos aún</h3><p>Agrega tu primer prospecto o importa leads desde el landing.</p><button class="btn btn-primary" onclick="window._app.openProspectoModal()">+ Agregar prospecto</button></div>`;
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
      const id = e.dataTransfer.getData('text/plain');
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
          <span class="col-icon" style="color:${st.color}">${stageIcon(st.id,17)}</span>
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
        ${p.correlativo ? `<div style="font-size:10.5px;color:var(--text3);font-weight:600;letter-spacing:.04em;margin-top:1px">${escHtml(p.correlativo)}</div>` : ''}
      </div>
    </div>
    <div class="prospect-meta">
      ${p.rubro ? `<span class="prospect-meta-chip">${escHtml(p.rubro)}</span>` : ''}
      ${p.tamano ? `<span class="prospect-meta-chip">${escHtml(p.tamano)} trabaj.</span>` : ''}
      ${dolorChip}
      ${_BADGE_STAGES.has(p.estado) && !_prosConDiag.has(p.id) ? `<span class="prospect-meta-chip" style="background:var(--amber-l);color:var(--amber);border:1px solid var(--amber);display:inline-flex;align-items:center;gap:4px">${window.icon?window.icon('clipCheck','',12):''} 360 pendiente</span>` : ''}
      ${_prosConAuto.has(p.id) ? `<span class="prospect-meta-chip" style="background:var(--teal-l);color:var(--teal);border:1px solid var(--teal)" title="El cliente respondió el formulario público (referencia)">📋 Autodiag.</span>` : ''}
    </div>
    <div class="prospect-actions">
      ${p.telefono ? `<button class="btn-action" onclick="window._app.callProspecto('${p.id}')" title="Llamar">${_ico.phone}</button>` : ''}
      <button class="btn-action" onclick="window._app.openDiagnosticoModal('${p.id}')" title="Diagnóstico">${_ico.diag}</button>
      <button class="btn-action" onclick="window._app.openProspectoDetail('${p.id}')" title="Ver ficha">${_ico.edit}</button>
      <button class="btn-action" onclick="window._app.deleteProspecto('${p.id}')" title="Eliminar">${_ico.trash}</button>
    </div>
  </div>`;
}

function _buildList(list) {
  if (list.length === 0) return `<div class="empty-state"><div class="empty-icon">${window.icon?window.icon('search'):''}</div><h3>Sin resultados</h3><p>Prueba con otros filtros.</p></div>`;
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
              <button class="btn-icon btn-sm" onclick="window._app.openProspectoDetail('${p.id}')" title="Ver">${_ico.edit}</button>
              <button class="btn-icon btn-sm" onclick="window._app.openDiagnosticoModal('${p.id}')" title="Diagnóstico">${_ico.diag}</button>
              <button class="btn-icon btn-sm" onclick="window._app.deleteProspecto('${p.id}')" title="Eliminar">${_ico.trash}</button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}
