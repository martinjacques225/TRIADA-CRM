// modules/prospectos/prospectos.js
// Vista de gestión de TODOS los prospectos (cualquier etapa): tabla con búsqueda,
// filtro por etapa y acciones de contacto/ficha/diagnóstico. Complementa a Leads
// (bandeja de entrada) y a Pipeline (kanban de flujo).
import { prospectos } from '../../js/db.js';
import { S } from '../../js/state.js';
import { escHtml, formatDate, PIPELINE_STAGES, stageBadge, toast } from '../../js/utils.js';

const _i = (n, s) => (window.icon ? window.icon(n, '', s) : '');
let _all = [];

export async function render() {
  _all = await prospectos.getAll();

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">
    <div class="section-head">
      <h2>Prospectos</h2>
      <div class="actions" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <div class="topbar-search" style="max-width:240px">
          ${_i('search')}
          <input id="prSearch" placeholder="Buscar…" value="${escHtml(S.searchQ || '')}">
        </div>
        <select class="filter-sel" id="prEstado">
          <option value="">Todas las etapas</option>
          ${PIPELINE_STAGES.map(s => `<option value="${s.id}"${S.searchEstado === s.id ? ' selected' : ''}>${s.icon} ${s.id}</option>`).join('')}
        </select>
        <button class="btn btn-primary" onclick="window._app.openProspectoModal()">+ Prospecto</button>
      </div>
    </div>

    <div class="pipeline-stats" style="margin-bottom:18px">
      ${PIPELINE_STAGES.filter(s => s.id !== 'Descartado').map(st => {
        const cnt = _all.filter(p => p.estado === st.id).length;
        return `<div class="pipe-stat${S.searchEstado === st.id ? ' active' : ''}" data-stage="${st.id}" style="border-top:3px solid ${st.color}">
          <div class="pipe-stat-cnt" style="color:${st.color}">${cnt}</div>
          <div class="pipe-stat-lbl">${st.id}</div>
        </div>`;
      }).join('')}
    </div>

    <div id="prResults"></div>
  </div>`;

  document.getElementById('prSearch').addEventListener('input', e => { S.searchQ = e.target.value; _renderResults(); });
  document.getElementById('prEstado').addEventListener('change', e => { S.searchEstado = e.target.value; _renderResults(); });
  document.querySelectorAll('.pipe-stat').forEach(el => el.addEventListener('click', () => {
    S.searchEstado = (S.searchEstado === el.dataset.stage) ? '' : el.dataset.stage;
    render();
  }));

  _renderResults();
}

function _filter() {
  let list = _all;
  if (S.searchEstado) list = list.filter(p => p.estado === S.searchEstado);
  if (S.searchQ) {
    const q = S.searchQ.toLowerCase();
    list = list.filter(p => [p.nombre, p.empresa, p.email, p.telefono, p.rubro].some(v => (v || '').toLowerCase().includes(q)));
  }
  return [...list].sort((a, b) => (b.fechaCreacion || '').localeCompare(a.fechaCreacion || ''));
}

function _renderResults() {
  const list = _filter();
  const el = document.getElementById('prResults');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">${_i('search')}</div><h3>Sin resultados</h3><p>Ajusta la búsqueda o el filtro de etapa.</p></div>`;
    return;
  }
  el.innerHTML = `<div class="card" style="overflow:hidden">
    <table class="data-table">
      <thead>
        <tr><th>Código</th><th>Prospecto</th><th>Empresa</th><th>Rubro</th><th>Etapa</th><th>Ingreso</th><th>Contacto</th><th>Acciones</th></tr>
      </thead>
      <tbody>
        ${list.map(p => `<tr>
          <td style="font-size:12px;color:var(--text3);font-weight:700;white-space:nowrap">${escHtml(p.correlativo || '—')}</td>
          <td><strong>${escHtml(p.nombre || '—')}</strong><div style="font-size:12px;color:var(--text3)">${escHtml(p.email || p.telefono || '')}</div></td>
          <td>${escHtml(p.empresa || '—')}</td>
          <td>${escHtml(p.rubro || '—')}</td>
          <td>${stageBadge(p.estado)}</td>
          <td style="color:var(--text3);font-size:12.5px">${formatDate(p.fechaCreacion)}</td>
          <td>
            <div style="display:flex;gap:3px">
              <button class="btn-icon btn-sm" style="color:#25D366" onclick="window._app.contactWhatsApp('${p.id}')" title="WhatsApp">${_i('whatsapp', 16)}</button>
              <button class="btn-icon btn-sm" style="color:#2D8CFF" onclick="window._app.contactZoom('${p.id}')" title="Zoom">${_i('video', 15)}</button>
              <button class="btn-icon btn-sm" onclick="window._app.callProspecto('${p.id}')" title="Llamar">${_i('phone', 15)}</button>
            </div>
          </td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="btn-icon btn-sm" onclick="window._app.openProspectoDetail('${p.id}')" title="Ver ficha">${_i('eye', 15)}</button>
              <button class="btn-icon btn-sm" onclick="window._app.openDiagnosticoModal('${p.id}')" title="Diagnóstico">${_i('diag', 15)}</button>
              <button class="btn-icon btn-sm" onclick="window._app.deleteProspecto('${p.id}')" title="Eliminar" style="color:var(--danger)">${_i('trash', 15)}</button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}
