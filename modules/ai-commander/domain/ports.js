// modules/ai-commander/domain/ports.js
// ── Capa de DOMINIO · PUERTOS (interfaces / contratos) ───────────────────────
// Define las dependencias que la capa de aplicación necesita, SIN saber quién
// las implementa (Dependency Inversion). La infraestructura (Supabase, IA…)
// provee adaptadores que extienden estas clases.
//
// Son clases base cuyos métodos lanzan NotImplementedError: documentan el
// contrato y fallan ruidosamente si un adaptador olvida implementar algo.

export class NotImplementedError extends Error {
  constructor(method) { super(`Puerto no implementado: ${method}`); this.name = 'NotImplementedError'; }
}

// ── Repositorios ─────────────────────────────────────────────────────────────
export class ProjectRepository {
  /** @returns {Promise<Object[]>} */
  async list(_filter) { throw new NotImplementedError('ProjectRepository.list'); }
  /** @returns {Promise<Object|null>} */
  async getById(_id) { throw new NotImplementedError('ProjectRepository.getById'); }
  /** @returns {Promise<string>} id creado */
  async create(_entity) { throw new NotImplementedError('ProjectRepository.create'); }
  async update(_id, _patch) { throw new NotImplementedError('ProjectRepository.update'); }
  async remove(_id) { throw new NotImplementedError('ProjectRepository.remove'); }
}

export class TaskRepository {
  async listByProject(_projectId) { throw new NotImplementedError('TaskRepository.listByProject'); }
  async listAll() { throw new NotImplementedError('TaskRepository.listAll'); }
  async getById(_id) { throw new NotImplementedError('TaskRepository.getById'); }
  async create(_entity) { throw new NotImplementedError('TaskRepository.create'); }
  async update(_id, _patch) { throw new NotImplementedError('TaskRepository.update'); }
  async remove(_id) { throw new NotImplementedError('TaskRepository.remove'); }
}

export class PromptRepository {
  async list(_filter) { throw new NotImplementedError('PromptRepository.list'); }
  async getById(_id) { throw new NotImplementedError('PromptRepository.getById'); }
  async create(_entity) { throw new NotImplementedError('PromptRepository.create'); }
  async remove(_id) { throw new NotImplementedError('PromptRepository.remove'); }
}

export class AIResponseRepository {
  async listByPrompt(_promptId) { throw new NotImplementedError('AIResponseRepository.listByPrompt'); }
  async listRecent(_limit) { throw new NotImplementedError('AIResponseRepository.listRecent'); }
  async create(_entity) { throw new NotImplementedError('AIResponseRepository.create'); }
}

// ── Auditoría ─────────────────────────────────────────────────────────────────
export class AuditPort {
  /** Registra un evento semántico. @param {{entidad,accion,entidadId?,payload?}} _e */
  async record(_e) { throw new NotImplementedError('AuditPort.record'); }
  /** @returns {Promise<Object[]>} actividad reciente */
  async listRecent(_limit) { throw new NotImplementedError('AuditPort.listRecent'); }
}

// ── Proveedor de IA ───────────────────────────────────────────────────────────
// El SEAM clave: la app llama complete() sin saber si detrás hay OpenAI,
// Anthropic u otro. Hoy ningún adaptador está conectado (isConfigured()=false).
//
// Contrato de complete(request):
//   request:  { system, messages:[{role, content}], model, params }
//   resultado: {
//     status: 'completado'|'no_conectado'|'error',
//     content: string|null,
//     usage:  { inputTokens, outputTokens } | null,
//     error:  string|null,
//     message: string,           // mensaje legible para la UI
//   }
export class AIProviderPort {
  get id()     { throw new NotImplementedError('AIProviderPort.id'); }
  get label()  { throw new NotImplementedError('AIProviderPort.label'); }
  get models() { throw new NotImplementedError('AIProviderPort.models'); }
  /** ¿Hay backend de IA configurado (Edge Function + clave)? */
  isConfigured() { throw new NotImplementedError('AIProviderPort.isConfigured'); }
  /** Ejecuta una compleción. @returns {Promise<Object>} ver contrato arriba */
  async complete(_request) { throw new NotImplementedError('AIProviderPort.complete'); }
}
