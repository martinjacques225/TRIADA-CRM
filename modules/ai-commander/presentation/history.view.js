// modules/ai-commander/presentation/history.view.js
// ── Capa de PRESENTACIÓN · Historial de respuestas IA ────────────────────────
import { escHtml, formatDate, aiStateBadge, emptyState, aiArchitectureBanner } from './ui.js';

export class HistoryView {
  constructor(aiService, projectService) {
    this._ai = aiService;
    this._projects = projectService;
    this._filter = '';
  }

  async render(container) {
    const [responses, projects] = await Promise.all([
      this._ai.recent(100),
      this._projects.list({}),
    ]);
    const connected = this._ai.anyConfigured();
    this._all = responses;
    this._projName = new Map(projects.map(p => [p.id, p.nombre]));

    container.innerHTML = `
      ${connected ? '' : aiArchitectureBanner(
        'El historial registra cada ejecución. Las respuestas quedan como "IA no conectada" hasta integrar un proveedor.')}
      <div class="section-head" style="margin-top:14px">
        <h2 style="font-size:18px">Historial de IA</h2>
        <div class="actions">
          <select class="filter-sel" id="aicHistProject">
            <option value="">Todos los proyectos</option>
            ${projects.map(p => `<option value="${p.id}">${escHtml(p.nombre)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div id="aicHistBody">${this._table()}</div>`;

    document.getElementById('aicHistProject').addEventListener('change', e => {
      this._filter = e.target.value;
      document.getElementById('aicHistBody').innerHTML = this._table();
    });
  }

  _table() {
    const rows = this._filter ? this._all.filter(r => r.proyectoId === this._filter) : this._all;
    if (rows.length === 0) {
      return emptyState('🕓', 'Sin ejecuciones', 'Ejecuta un prompt desde el Prompt Builder para ver su registro aquí.', '');
    }
    return `<div class="card" style="overflow:hidden">
      <table class="data-table">
        <thead><tr><th>Fecha</th><th>Proyecto</th><th>Proveedor</th><th>Modelo</th><th>Estado</th><th>Detalle</th></tr></thead>
        <tbody>
          ${rows.map(r => `<tr>
            <td style="color:var(--text3);font-size:12.5px;white-space:nowrap">${formatDate(r.createdAt)}</td>
            <td>${escHtml(r.proyectoId ? (this._projName.get(r.proyectoId) || '—') : '—')}</td>
            <td>${escHtml(r.provider || '—')}</td>
            <td style="font-size:12.5px">${escHtml(r.modelo || '—')}</td>
            <td>${aiStateBadge(r.estado)}</td>
            <td style="font-size:12.5px;color:var(--text2);max-width:320px">${escHtml(r.contenido || r.error || r.metadata?.message || '—')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  }
}
