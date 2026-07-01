// modules/ai-commander/ai-commander.js
// ════════════════════════════════════════════════════════════════════════════
// AI COMMANDER — módulo del TRIADA CRM para gestionar proyectos internos de
// desarrollo asistido por IA. Punto de entrada + COMPOSITION ROOT.
//
// Clean Architecture:  domain ← application ← infrastructure / presentation.
// Aquí se "cablea" todo (inyección de dependencias) y se expone el contrato
// render() que el orquestador (app.js) invoca, más la API global window._aic
// para los manejadores inline (mismo patrón que window._app del resto del CRM).
// ════════════════════════════════════════════════════════════════════════════
import { S } from '../../js/state.js';
import { toast } from '../../js/utils.js';

import { PROJECT_STATES, PRIORITIES, TASK_COLUMNS, findTemplate } from './domain/entities.js';

import {
  SupabaseProjectRepository, SupabaseTaskRepository,
  SupabasePromptRepository, SupabaseAIResponseRepository, isSetupError,
} from './infrastructure/supabase.repositories.js';
import { SupabaseAudit } from './infrastructure/supabase.audit.js';
import { ProviderRegistry } from './infrastructure/ai-providers.js';

import { ProjectService } from './application/project.service.js';
import { TaskService } from './application/task.service.js';
import { PromptService } from './application/prompt.service.js';
import { AIService } from './application/ai.service.js';
import { DashboardService } from './application/dashboard.service.js';

import { DashboardView } from './presentation/dashboard.view.js';
import { ProjectsView } from './presentation/projects.view.js';
import { BoardView } from './presentation/board.view.js';
import { PromptBuilderView } from './presentation/prompt-builder.view.js';
import { HistoryView } from './presentation/history.view.js';
import { OrquestaView } from './presentation/orquesta.view.js';
import { ICONS, escHtml, setupNotice } from './presentation/ui.js';

// ── COMPOSITION ROOT — inyección de dependencias (DIP) ───────────────────────
const audit        = new SupabaseAudit();
const projectRepo  = new SupabaseProjectRepository();
const taskRepo     = new SupabaseTaskRepository();
const promptRepo   = new SupabasePromptRepository();
const responseRepo = new SupabaseAIResponseRepository();
const registry     = new ProviderRegistry();

const projectService   = new ProjectService(projectRepo, taskRepo, audit);
const taskService      = new TaskService(taskRepo, audit);
const promptService    = new PromptService(promptRepo, audit);
const aiService        = new AIService(promptRepo, responseRepo, registry, audit);
const dashboardService = new DashboardService(projectRepo, taskRepo, promptRepo, responseRepo, audit);

const views = {
  orquesta:  new OrquestaView(S),
  dashboard: new DashboardView(dashboardService),
  proyectos: new ProjectsView(projectService, taskService),
  tablero:   new BoardView(projectService, taskService, S),
  prompt:    new PromptBuilderView(promptService, aiService, projectService, S),
  historial: new HistoryView(aiService, projectService),
};

const TABS = [
  { id: 'orquesta',  label: 'Mesa de Orquesta', icon: ICONS.orquesta },
  { id: 'dashboard', label: 'Dashboard',      icon: ICONS.dashboard },
  { id: 'proyectos', label: 'Proyectos',      icon: ICONS.project },
  { id: 'tablero',   label: 'Tablero',        icon: ICONS.board },
  { id: 'prompt',    label: 'Prompt Builder', icon: ICONS.prompt },
  { id: 'historial', label: 'Historial IA',   icon: ICONS.history },
];

const AREAS = ['desarrollo', 'tecnologia', 'operaciones', 'comercial', 'finanzas', 'ventas', 'rrhh'];

// ── Contrato del módulo: render() (lo llama app.js) ──────────────────────────
export async function render() {
  _setupApi();
  const view = views[S.aicView] ? S.aicView : (S.aicView = 'orquesta');

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">
    <div class="section-head">
      <h2 class="aic-title">${ICONS.robot} Director de Orquesta</h2>
    </div>
    <div class="aic-tabs">
      ${TABS.map(t => `<button class="aic-tab${t.id === view ? ' active' : ''}" data-tab="${t.id}">
        <span class="aic-tab-ico">${t.icon}</span>${escHtml(t.label)}</button>`).join('')}
    </div>
    <div id="aicBody"></div>
  </div>`;

  center.querySelectorAll('.aic-tab').forEach(btn =>
    btn.addEventListener('click', () => window._aic.go(btn.dataset.tab)));

  await _renderBody(view);
}

async function _renderBody(view) {
  const body = document.getElementById('aicBody');
  try {
    await views[view].render(body);
  } catch (e) {
    if (isSetupError(e)) { body.innerHTML = setupNotice(); return; }
    console.error('[AI Commander]', e);
    body.innerHTML = `<div class="view-animate"><div class="empty-state"><div class="empty-icon">⚠️</div><h3>No se pudo cargar</h3><p>${escHtml(e?.message || String(e))}</p></div></div>`;
  }
}

// ── Modal global (reutiliza el #modalOverlay del CRM) ────────────────────────
function _openModal(title, bodyHtml, onSave, size = '') {
  document.getElementById('modalTitle').textContent = title;
  document.querySelector('.modal-box').className = 'modal-box' + (size ? ' modal-' + size : '');
  document.getElementById('modalBody').innerHTML = bodyHtml;
  const save = document.getElementById('modalSave');
  save.style.display = ''; save.textContent = 'Guardar'; save.onclick = onSave;
  document.getElementById('modalCancel').textContent = 'Cancelar';
  document.getElementById('modalOverlay').classList.add('open');
}
function _closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

// ── Formularios ──────────────────────────────────────────────────────────────
function _projectForm(p = {}) {
  return `
    <div class="form-group"><label>Nombre <span class="req">*</span></label>
      <input id="fpNombre" value="${escHtml(p.nombre || '')}" placeholder="Ej: Módulo de facturación"></div>
    <div class="form-group"><label>Objetivo</label>
      <textarea id="fpObjetivo" rows="2" placeholder="¿Qué se quiere lograr?">${escHtml(p.objetivo || '')}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Estado</label>
        <select id="fpEstado">${PROJECT_STATES.map(s => `<option value="${s.id}"${(p.estado || 'activo') === s.id ? ' selected' : ''}>${s.icon} ${s.label}</option>`).join('')}</select></div>
      <div class="form-group"><label>Prioridad</label>
        <select id="fpPrioridad">${PRIORITIES.map(x => `<option value="${x.id}"${(p.prioridad || 'media') === x.id ? ' selected' : ''}>${x.label}</option>`).join('')}</select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Área</label>
        <select id="fpArea"><option value="">—</option>${AREAS.map(a => `<option${p.area === a ? ' selected' : ''}>${a}</option>`).join('')}</select></div>
      <div class="form-group"><label>Stack (separado por comas)</label>
        <input id="fpStack" value="${escHtml((p.stack || []).join(', '))}" placeholder="JS, Supabase, PWA"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Fecha inicio</label><input id="fpInicio" type="date" value="${escHtml(p.fechaInicio || '')}"></div>
      <div class="form-group"><label>Fecha objetivo</label><input id="fpObjetivoFecha" type="date" value="${escHtml(p.fechaObjetivo || '')}"></div>
    </div>
    <div class="form-group"><label>Repositorio (URL)</label>
      <input id="fpRepo" value="${escHtml(p.repoUrl || '')}" placeholder="https://github.com/…"></div>`;
}

function _readProjectForm() {
  return {
    nombre:        document.getElementById('fpNombre').value,
    objetivo:      document.getElementById('fpObjetivo').value,
    estado:        document.getElementById('fpEstado').value,
    prioridad:     document.getElementById('fpPrioridad').value,
    area:          document.getElementById('fpArea').value || null,
    stack:         document.getElementById('fpStack').value,
    fechaInicio:   document.getElementById('fpInicio').value || null,
    fechaObjetivo: document.getElementById('fpObjetivoFecha').value || null,
    repoUrl:       document.getElementById('fpRepo').value,
  };
}

function _taskForm(t = {}) {
  return `
    <div class="form-group"><label>Título <span class="req">*</span></label>
      <input id="ftTitulo" value="${escHtml(t.titulo || '')}" placeholder="Ej: Implementar login"></div>
    <div class="form-group"><label>Descripción</label>
      <textarea id="ftDesc" rows="3">${escHtml(t.descripcion || '')}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Estado (columna)</label>
        <select id="ftEstado">${TASK_COLUMNS.map(c => `<option value="${c.id}"${(t.estado || 'backlog') === c.id ? ' selected' : ''}>${c.icon} ${c.label}</option>`).join('')}</select></div>
      <div class="form-group"><label>Prioridad</label>
        <select id="ftPrioridad">${PRIORITIES.map(x => `<option value="${x.id}"${(t.prioridad || 'media') === x.id ? ' selected' : ''}>${x.label}</option>`).join('')}</select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Etiquetas (comas)</label>
        <input id="ftTags" value="${escHtml((t.etiquetas || []).join(', '))}" placeholder="backend, urgente"></div>
      <div class="form-group"><label>Estimación (horas)</label>
        <input id="ftEst" type="number" min="0" step="0.5" value="${t.estimacionHoras ?? ''}"></div>
    </div>
    <label class="serv-check" style="max-width:260px">
      <input type="checkbox" id="ftAi"${t.aiAsistida ? ' checked' : ''}> Asistida por IA 🤖
    </label>`;
}

function _readTaskForm(proyectoId) {
  return {
    proyectoId,
    titulo:          document.getElementById('ftTitulo').value,
    descripcion:     document.getElementById('ftDesc').value,
    estado:          document.getElementById('ftEstado').value,
    prioridad:       document.getElementById('ftPrioridad').value,
    etiquetas:       document.getElementById('ftTags').value,
    estimacionHoras: document.getElementById('ftEst').value,
    aiAsistida:      document.getElementById('ftAi').checked,
  };
}

// ── API global del módulo (window._aic) ──────────────────────────────────────
function _setupApi() {
  if (window._aic) return;
  window._aic = {
    go(view) { S.aicView = view; render(); },
    openBoard(projectId) { S.aicProjectId = projectId; S.aicView = 'tablero'; render(); },

    // ── Proyectos ──
    async openProjectModal(id = null) {
      const existing = id ? await projectService.get(id) : null;
      _openModal(existing ? 'Editar proyecto' : 'Nuevo proyecto', _projectForm(existing || {}), async () => {
        try {
          const data = _readProjectForm();
          if (existing) { await projectService.update(id, data); toast('Proyecto actualizado', 'success'); }
          else          { await projectService.create(data); toast('Proyecto creado', 'success'); }
          _closeModal(); render();
        } catch (e) { toast(e?.message || 'Error al guardar', 'error'); }
      }, 'lg');
    },
    async archiveProject(id) {
      if (!confirm('¿Archivar este proyecto?')) return;
      await projectService.archive(id); toast('Proyecto archivado', 'info'); render();
    },
    async deleteProject(id) {
      if (!confirm('¿Eliminar el proyecto y todas sus tareas? Esta acción no se puede deshacer.')) return;
      await projectService.remove(id); toast('Proyecto eliminado', 'info'); render();
    },

    // ── Tareas ──
    async openTaskModal(proyectoId, id = null) {
      const existing = id ? await taskService.get(id) : null;
      _openModal(existing ? 'Editar tarea' : 'Nueva tarea', _taskForm(existing || {}), async () => {
        try {
          const data = _readTaskForm(proyectoId);
          if (existing) { await taskService.update(id, data); toast('Tarea actualizada', 'success'); }
          else          { await taskService.create(data); toast('Tarea creada', 'success'); }
          await projectService.syncProgress(proyectoId);
          _closeModal(); render();
        } catch (e) { toast(e?.message || 'Error al guardar', 'error'); }
      });
    },
    async moveTask(id, estado) {
      try {
        const task = await taskService.get(id);
        await taskService.move(id, estado);
        if (task) await projectService.syncProgress(task.proyectoId);
        render();
      } catch (e) { toast(e?.message || 'Error al mover', 'error'); }
    },
    async deleteTask(id) {
      if (!confirm('¿Eliminar esta tarea?')) return;
      const task = await taskService.get(id);
      await taskService.remove(id);
      if (task) await projectService.syncProgress(task.proyectoId);
      toast('Tarea eliminada', 'info'); render();
    },

    // ── Prompt Builder ──
    async savePrompt(thenRun) {
      try {
        const tplId = document.querySelector('#aicTplGrid .aic-tpl.active')?.dataset.tpl || null;
        const tpl = tplId ? findTemplate(tplId) : null;
        const vars = {};
        document.querySelectorAll('#aicVars .aic-var').forEach(el => { vars[el.dataset.var] = el.value; });
        const id = await promptService.save({
          contenido:  document.getElementById('aicPromptText').value,
          titulo:     document.getElementById('aicPromptTitle').value,
          proyectoId: document.getElementById('aicPromptProject').value || null,
          provider:   document.getElementById('aicPromptProvider').value,
          modelo:     document.getElementById('aicPromptModel').value,
          rol:        tpl?.rol || null,
          plantilla:  tplId,
          variables:  vars,
        });
        toast('Prompt guardado', 'success');
        if (thenRun) await this.runPrompt(id);
        else render();
      } catch (e) { toast(e?.message || 'Error al guardar', 'error'); }
    },
    async runPrompt(id) {
      try {
        const res = await aiService.run(id);
        toast(res.message || 'Ejecución registrada', res.estado === 'no_conectado' ? 'info' : 'success');
        render();
      } catch (e) { toast(e?.message || 'Error al ejecutar', 'error'); }
    },
    async deletePrompt(id) {
      if (!confirm('¿Eliminar este prompt?')) return;
      await promptService.remove(id); toast('Prompt eliminado', 'info'); render();
    },
  };
}
