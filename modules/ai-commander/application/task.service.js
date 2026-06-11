// modules/ai-commander/application/task.service.js
// ── Capa de APLICACIÓN · casos de uso de Tareas (incluye mover en el Kanban) ──
import { makeTask, isValidTaskTransition, findTaskColumn, ValidationError } from '../domain/entities.js';

export class TaskService {
  /**
   * @param {import('../domain/ports.js').TaskRepository} taskRepo
   * @param {import('../domain/ports.js').AuditPort} audit
   */
  constructor(taskRepo, audit) {
    this._tasks = taskRepo;
    this._audit = audit;
  }

  listByProject(projectId) { return this._tasks.listByProject(projectId); }
  listAll() { return this._tasks.listAll(); }
  get(id) { return this._tasks.getById(id); }

  async create(input) {
    const entity = makeTask(input);
    const id = await this._tasks.create(entity);
    await this._audit.record({ entidad: 'tarea', accion: 'tarea.crear', entidadId: id, payload: { titulo: entity.titulo, proyectoId: entity.proyectoId } });
    return id;
  }

  async update(id, input) {
    const entity = makeTask(input);
    await this._tasks.update(id, entity);
    await this._audit.record({ entidad: 'tarea', accion: 'tarea.actualizar', entidadId: id, payload: { titulo: entity.titulo } });
  }

  /** Mover una tarea de columna en el Kanban. */
  async move(id, toEstado) {
    const task = await this._tasks.getById(id);
    if (!task) throw new ValidationError('Tarea no encontrada');
    if (task.estado === toEstado) return;
    if (!isValidTaskTransition(task.estado, toEstado)) {
      throw new ValidationError(`Columna inválida: ${toEstado}`);
    }
    await this._tasks.update(id, { estado: toEstado });
    await this._audit.record({
      entidad: 'tarea', accion: 'tarea.mover', entidadId: id,
      payload: { de: findTaskColumn(task.estado).label, a: findTaskColumn(toEstado).label },
    });
  }

  async remove(id) {
    await this._tasks.remove(id);
    await this._audit.record({ entidad: 'tarea', accion: 'tarea.eliminar', entidadId: id });
  }
}
