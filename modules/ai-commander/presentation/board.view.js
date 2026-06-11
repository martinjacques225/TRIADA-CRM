// modules/ai-commander/presentation/board.view.js
// ── Capa de PRESENTACIÓN · Kanban de tareas ──────────────────────────────────
import { escHtml, ICONS, priorityBadge, emptyState } from './ui.js';
import { TASK_COLUMNS } from '../domain/entities.js';

export class BoardView {
  constructor(projectService, taskService, state) {
    this._projects = projectService;
    this._tasks = taskService;
    this._state = state; // js/state.js (S), para recordar el proyecto activo
  }

  async render(container) {
    const projects = await this._projects.list({});
    const active = projects.filter(p => p.estado !== 'archivado');

    if (active.length === 0) {
      container.innerHTML = `<div class="view-animate">${emptyState('🗂️', 'Sin proyectos activos',
        'Crea un proyecto para empezar a gestionar sus tareas en el tablero.',
        `<button class="btn btn-primary" onclick="window._aic.go('proyectos')">Ir a Proyectos</button>`)}</div>`;
      return;
    }

    // Proyecto seleccionado (o el primero).
    let pid = this._state.aicProjectId;
    if (!pid || !active.some(p => p.id === pid)) pid = active[0].id;
    this._state.aicProjectId = pid;

    const tasks = await this._tasks.listByProject(pid);

    container.innerHTML = `
      <div class="section-head">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <h2 style="font-size:18px">Tablero</h2>
          <select class="filter-sel" id="aicBoardProject">
            ${active.map(p => `<option value="${p.id}"${p.id === pid ? ' selected' : ''}>${escHtml(p.nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="actions">
          <button class="btn btn-primary btn-sm" onclick="window._aic.openTaskModal('${pid}')">${ICONS.add} Nueva tarea</button>
        </div>
      </div>
      <div class="kanban-board" id="aicBoard">
        ${TASK_COLUMNS.map(col => this._column(col, tasks.filter(t => t.estado === col.id))).join('')}
      </div>`;

    document.getElementById('aicBoardProject').addEventListener('change', e => {
      this._state.aicProjectId = e.target.value;
      window._aic.go('tablero');
    });

    this._attachDnD();
  }

  _column(col, cards) {
    return `<div class="kanban-col" data-estado="${col.id}">
      <div class="kanban-col-head" style="border-top:3px solid ${col.color}">
        <span class="col-icon">${col.icon}</span>
        <span class="col-title">${escHtml(col.label)}</span>
        <span class="col-count" style="color:${col.color}">${cards.length}</span>
      </div>
      <div class="kanban-col-body">
        ${cards.length === 0
          ? `<div style="text-align:center;padding:18px 8px;font-size:12px;color:var(--text3)">—</div>`
          : cards.map(t => this._card(t)).join('')}
      </div>
    </div>`;
  }

  _card(t) {
    return `<div class="prospect-card" draggable="true" data-id="${t.id}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
        <div class="prospect-name" style="white-space:normal">${escHtml(t.titulo)}</div>
        ${t.aiAsistida ? `<span title="Asistida por IA" style="flex-shrink:0">🤖</span>` : ''}
      </div>
      ${t.codigo ? `<div class="aic-code" style="margin-top:2px">${escHtml(t.codigo)}</div>` : ''}
      <div class="prospect-meta" style="margin-top:8px">
        ${priorityBadge(t.prioridad)}
        ${(t.etiquetas || []).map(e => `<span class="prospect-meta-chip">${escHtml(e)}</span>`).join('')}
      </div>
      <div class="prospect-actions">
        <button class="btn-action" onclick="window._aic.openTaskModal('${t.proyectoId}','${t.id}')" title="Editar">${ICONS.edit}</button>
        <button class="btn-action" onclick="window._aic.deleteTask('${t.id}')" title="Eliminar">${ICONS.trash}</button>
      </div>
    </div>`;
  }

  // Drag & drop entre columnas → TaskService.move (mismo patrón que el pipeline).
  _attachDnD() {
    document.querySelectorAll('#aicBoard .prospect-card[draggable="true"]').forEach(card => {
      card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', card.dataset.id); card.style.opacity = '0.45'; });
      card.addEventListener('dragend', () => { card.style.opacity = ''; });
    });
    document.querySelectorAll('#aicBoard .kanban-col').forEach(col => {
      const hi = () => { col.style.outline = '2px dashed var(--primary)'; col.style.outlineOffset = '-4px'; };
      const lo = () => { col.style.outline = ''; };
      col.addEventListener('dragover', e => { e.preventDefault(); hi(); });
      col.addEventListener('dragleave', lo);
      col.addEventListener('drop', async e => {
        e.preventDefault(); lo();
        const id = e.dataTransfer.getData('text/plain');
        const estado = col.dataset.estado;
        if (id && estado) await window._aic.moveTask(id, estado);
      });
    });
  }
}
