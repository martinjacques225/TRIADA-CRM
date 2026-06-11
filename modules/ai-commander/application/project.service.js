// modules/ai-commander/application/project.service.js
// ── Capa de APLICACIÓN · casos de uso de Proyectos ───────────────────────────
import { makeProject, projectProgress } from '../domain/entities.js';

export class ProjectService {
  /**
   * @param {import('../domain/ports.js').ProjectRepository} projectRepo
   * @param {import('../domain/ports.js').TaskRepository} taskRepo
   * @param {import('../domain/ports.js').AuditPort} audit
   */
  constructor(projectRepo, taskRepo, audit) {
    this._projects = projectRepo;
    this._tasks = taskRepo;
    this._audit = audit;
  }

  list(filter = {}) { return this._projects.list(filter); }
  get(id) { return this._projects.getById(id); }

  /** Proyecto + sus tareas + avance recalculado. */
  async detail(id) {
    const [project, tasks] = await Promise.all([
      this._projects.getById(id),
      this._tasks.listByProject(id),
    ]);
    if (!project) return null;
    return { project, tasks, progress: projectProgress(tasks) };
  }

  async create(input) {
    const entity = makeProject(input);
    const id = await this._projects.create(entity);
    await this._audit.record({ entidad: 'proyecto', accion: 'proyecto.crear', entidadId: id, payload: { nombre: entity.nombre } });
    return id;
  }

  async update(id, input) {
    // `progreso` es derivado de las tareas (syncProgress), no lo pisamos al editar.
    const { progreso, ...entity } = makeProject(input);
    await this._projects.update(id, entity);
    await this._audit.record({ entidad: 'proyecto', accion: 'proyecto.actualizar', entidadId: id, payload: { nombre: entity.nombre } });
  }

  async archive(id) {
    await this._projects.update(id, { estado: 'archivado' });
    await this._audit.record({ entidad: 'proyecto', accion: 'proyecto.archivar', entidadId: id });
  }

  async remove(id) {
    await this._projects.remove(id);
    await this._audit.record({ entidad: 'proyecto', accion: 'proyecto.eliminar', entidadId: id });
  }

  /** Recalcula el progreso cacheado desde las tareas y lo persiste. */
  async syncProgress(id) {
    const tasks = await this._tasks.listByProject(id);
    const { pct } = projectProgress(tasks);
    await this._projects.update(id, { progreso: pct });
    return pct;
  }
}
