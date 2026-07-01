// modules/ai-commander/presentation/projects.view.js
// ── Capa de PRESENTACIÓN · Gestión de Proyectos ──────────────────────────────
import {
  escHtml, formatDate, ICONS, projectStateBadge, priorityBadge, progressBar,
  stackChips, emptyState,
} from './ui.js';
import { findProjectState, projectProgress } from '../domain/entities.js';

export class ProjectsView {
  constructor(projectService, taskService) {
    this._projects = projectService;
    this._tasks = taskService;
  }

  async render(container) {
    const projects = await this._projects.list({});
    // Avance por proyecto (una sola lectura de todas las tareas).
    const allTasks = await this._tasks.listAll();
    const byProject = new Map();
    for (const t of allTasks) {
      if (!byProject.has(t.proyectoId)) byProject.set(t.proyectoId, []);
      byProject.get(t.proyectoId).push(t);
    }

    container.innerHTML = `
      <div class="section-head">
        <h2 style="font-size:18px">Proyectos</h2>
        <div class="actions">
          <button class="btn btn-primary btn-sm" onclick="window._aic.openProjectModal()">${ICONS.add} Nuevo proyecto</button>
        </div>
      </div>
      ${projects.length === 0
        ? emptyState('🚀', 'Sin proyectos aún', 'Crea tu primer proyecto interno de desarrollo asistido por IA.',
            `<button class="btn btn-primary" onclick="window._aic.openProjectModal()">${ICONS.add} Crear proyecto</button>`)
        : `<div class="aic-projects">
            ${projects.map(p => this._card(p, projectProgress(byProject.get(p.id) || []))).join('')}
          </div>`}`;
  }

  _card(p, progress) {
    const st = findProjectState(p.estado);
    return `<div class="aic-project-card" style="border-top:3px solid ${st.color}">
      <div class="aic-project-head">
        <div style="min-width:0;flex:1">
          ${p.codigo ? `<div class="aic-code">${escHtml(p.codigo)}</div>` : ''}
          <div class="aic-project-name">${escHtml(p.nombre)}</div>
        </div>
        ${projectStateBadge(p.estado)}
      </div>
      ${p.objetivo ? `<p class="aic-project-obj">${escHtml(p.objetivo)}</p>` : ''}
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0">
        ${priorityBadge(p.prioridad)}
        ${p.area ? `<span class="aic-chip">${escHtml(p.area)}</span>` : ''}
        ${p.clienteId ? `<span class="aic-chip">cliente</span>` : `<span class="aic-chip">interno</span>`}
        ${stackChips(p.stack)}
      </div>
      <div style="margin:10px 0 4px;display:flex;justify-content:space-between;font-size:12px;color:var(--text3)">
        <span>Avance</span><span style="font-weight:700;color:${st.color}">${progress.pct}% (${progress.done}/${progress.total})</span>
      </div>
      ${progressBar(progress.pct, st.color)}
      <div class="aic-project-meta">
        ${p.repoUrl ? `<a href="${escHtml(p.repoUrl)}" target="_blank" rel="noopener" title="Repositorio">${ICONS.link}</a>` : ''}
        ${p.fechaObjetivo ? `<span>🎯 ${formatDate(p.fechaObjetivo)}</span>` : ''}
      </div>
      <div class="aic-card-actions">
        <button class="btn-action" onclick="window._aic.openBoard('${p.id}')" title="Tablero">${ICONS.board} Tablero</button>
        <button class="btn-action" onclick="window._aic.openProjectModal('${p.id}')" title="Editar">${ICONS.edit}</button>
        <button class="btn-action" onclick="window._aic.exportProject('${p.id}')" title="Descargar carpeta (.zip)">${ICONS.download}</button>
        <button class="btn-action" onclick="window._aic.archiveProject('${p.id}')" title="Archivar">${ICONS.archive}</button>
        <button class="btn-action" onclick="window._aic.deleteProject('${p.id}')" title="Eliminar">${ICONS.trash}</button>
      </div>
    </div>`;
  }
}
