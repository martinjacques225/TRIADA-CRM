// modules/ai-commander/presentation/dashboard.view.js
// ── Capa de PRESENTACIÓN · Dashboard de avance ───────────────────────────────
import { escHtml, formatDate, progressBar } from './ui.js';
import { findProjectState } from '../domain/entities.js';

const ACCION_LABEL = {
  'proyecto.crear': 'creó el proyecto', 'proyecto.actualizar': 'actualizó el proyecto',
  'proyecto.archivar': 'archivó el proyecto', 'proyecto.eliminar': 'eliminó un proyecto',
  'tarea.crear': 'creó una tarea', 'tarea.actualizar': 'actualizó una tarea',
  'tarea.mover': 'movió una tarea', 'tarea.eliminar': 'eliminó una tarea',
  'prompt.guardar': 'guardó un prompt', 'prompt.eliminar': 'eliminó un prompt',
  'ia.ejecutar': 'ejecutó la IA',
};

export class DashboardView {
  constructor(dashboardService) { this._service = dashboardService; }

  async render(container) {
    const s = await this._service.snapshot();
    const t = s.totals;

    container.innerHTML = `
      <div class="kpi-grid">
        ${_kpi('Proyectos', t.proyectos, `${t.activos} activos`, 'var(--primary)', '📁')}
        ${_kpi('Tareas', t.tareas, `${t.tareasHechas} completadas`, 'var(--violet)', '🗂️')}
        ${_kpi('Tareas con IA', t.tareasAi, 'asistidas por IA', 'var(--green)', '🤖')}
        ${_kpi('Prompts', t.prompts, `${t.respuestas} ejecuciones`, 'var(--amber)', '💬')}
      </div>

      <div class="aic-grid-2" style="margin-top:18px">
        <div class="card card-pad">
          <h3 class="aic-card-title">Tareas por estado</h3>
          <div style="margin-top:12px">
            ${s.tasksByColumn.map(c => _bar(`${c.icon} ${c.label}`, c.count, t.tareas, c.color)).join('')}
          </div>
        </div>

        <div class="card card-pad">
          <h3 class="aic-card-title">Proyectos por estado</h3>
          <div style="margin-top:12px">
            ${s.projectsByState.map(p => _bar(`${p.icon} ${p.label}`, p.count, t.proyectos, p.color)).join('')}
          </div>
          <h3 class="aic-card-title" style="margin-top:18px">Ejecuciones de IA</h3>
          <div style="margin-top:12px">
            ${s.responsesByState.map(r => _bar(r.label, r.count, t.respuestas, r.color)).join('')}
          </div>
        </div>
      </div>

      <div class="aic-grid-2" style="margin-top:18px">
        <div class="card card-pad">
          <h3 class="aic-card-title">Avance por proyecto</h3>
          ${s.projectProgressList.length === 0
            ? `<p class="text-muted" style="font-size:13.5px;margin-top:10px">Aún no hay proyectos. Crea el primero en la pestaña Proyectos.</p>`
            : `<div style="margin-top:14px;display:flex;flex-direction:column;gap:14px">
                ${s.projectProgressList.slice(0, 8).map(({ project, progress }) => {
                  const st = findProjectState(project.estado);
                  return `<div>
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:5px">
                      <a href="#" onclick="window._aic.openBoard('${project.id}');return false" style="font-size:13.5px;font-weight:600;color:var(--navy);text-decoration:none">${escHtml(project.nombre)}</a>
                      <span style="font-size:13px;font-weight:700;color:${st.color}">${progress.pct}% <span style="color:var(--text3);font-weight:500">(${progress.done}/${progress.total})</span></span>
                    </div>
                    ${progressBar(progress.pct, st.color)}
                  </div>`;
                }).join('')}
              </div>`}
        </div>

        <div class="card card-pad">
          <h3 class="aic-card-title">Actividad reciente</h3>
          ${s.actividad.length === 0
            ? `<p class="text-muted" style="font-size:13.5px;margin-top:10px">Sin actividad todavía.</p>`
            : `<div class="activity-list" style="margin-top:8px">
                ${s.actividad.map(a => `
                  <div class="activity-item">
                    <div class="activity-dot"></div>
                    <div class="activity-text"><strong>${escHtml(ACCION_LABEL[a.accion] || a.accion)}</strong>${a.payload?.nombre || a.payload?.titulo ? ` — ${escHtml(a.payload.nombre || a.payload.titulo)}` : ''}</div>
                    <div class="activity-time">${formatDate(a.ts)}</div>
                  </div>`).join('')}
              </div>`}
        </div>
      </div>`;
  }
}

function _kpi(label, value, sub, color, icon) {
  return `<div class="kpi-card kpi-accent" style="border-left-color:${color}">
    <div class="kpi-top"><span class="kpi-label">${escHtml(label)}</span><span class="kpi-ic" style="background:${color}1a;color:${color}">${icon}</span></div>
    <div class="kpi-value">${value}</div>
    <div class="kpi-sub">${escHtml(sub)}</div>
  </div>`;
}

function _bar(label, count, total, color) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return `<div style="margin-bottom:11px">
    <div style="display:flex;justify-content:space-between;margin-bottom:5px">
      <span style="font-size:13px;color:var(--text2)">${label}</span>
      <span style="font-size:13px;font-weight:600;color:var(--navy)">${count}</span>
    </div>
    <div class="score-bar" style="height:8px"><div class="score-fill" style="width:${pct}%;background:${color}"></div></div>
  </div>`;
}
