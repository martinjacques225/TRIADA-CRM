// modules/ai-commander/application/dashboard.service.js
// ── Capa de APLICACIÓN · read-model para el Dashboard de avance ──────────────
import { PROJECT_STATES, TASK_COLUMNS, AI_RESPONSE_STATES, projectProgress } from '../domain/entities.js';

export class DashboardService {
  constructor(projectRepo, taskRepo, promptRepo, responseRepo, audit) {
    this._projects = projectRepo;
    this._tasks = taskRepo;
    this._prompts = promptRepo;
    this._responses = responseRepo;
    this._audit = audit;
  }

  /** Agrega todo lo que el dashboard necesita en una sola lectura. */
  async snapshot() {
    const [projects, tasks, prompts, responses, actividad] = await Promise.all([
      this._projects.list({}),
      this._tasks.listAll(),
      this._prompts.list({}),
      this._responses.listRecent(200),
      this._audit.listRecent(12),
    ]);

    const projectsByState = PROJECT_STATES.map(s => ({
      ...s, count: projects.filter(p => p.estado === s.id).length,
    }));

    const tasksByColumn = TASK_COLUMNS.map(c => ({
      ...c, count: tasks.filter(t => t.estado === c.id).length,
    }));

    const responsesByState = AI_RESPONSE_STATES.map(s => ({
      ...s, count: responses.filter(r => r.estado === s.id).length,
    }));

    // Avance por proyecto (solo los no archivados, ordenados por avance asc).
    const tasksByProject = new Map();
    for (const t of tasks) {
      if (!tasksByProject.has(t.proyectoId)) tasksByProject.set(t.proyectoId, []);
      tasksByProject.get(t.proyectoId).push(t);
    }
    const projectProgressList = projects
      .filter(p => p.estado !== 'archivado')
      .map(p => ({ project: p, progress: projectProgress(tasksByProject.get(p.id) || []) }))
      .sort((a, b) => a.progress.pct - b.progress.pct);

    const tareasAi = tasks.filter(t => t.aiAsistida).length;

    return {
      totals: {
        proyectos: projects.length,
        activos:   projects.filter(p => p.estado === 'activo').length,
        tareas:    tasks.length,
        tareasHechas: tasks.filter(t => t.estado === 'hecho').length,
        tareasAi,
        prompts:   prompts.length,
        respuestas: responses.length,
      },
      projectsByState,
      tasksByColumn,
      responsesByState,
      projectProgressList,
      actividad,
    };
  }
}
