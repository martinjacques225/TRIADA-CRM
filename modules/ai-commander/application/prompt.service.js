// modules/ai-commander/application/prompt.service.js
// ── Capa de APLICACIÓN · casos de uso del Prompt Builder ─────────────────────
import { makePrompt, composePrompt, PROMPT_TEMPLATES, findTemplate } from '../domain/entities.js';

export class PromptService {
  /**
   * @param {import('../domain/ports.js').PromptRepository} promptRepo
   * @param {import('../domain/ports.js').AuditPort} audit
   */
  constructor(promptRepo, audit) {
    this._prompts = promptRepo;
    this._audit = audit;
  }

  templates() { return PROMPT_TEMPLATES; }
  template(id) { return findTemplate(id); }

  /** Compone el texto del prompt a partir de una plantilla + variables. */
  build(templateId, variables = {}) {
    const tpl = findTemplate(templateId);
    if (!tpl) return { texto: '', unresolved: [], rol: null };
    const { texto, unresolved } = composePrompt(tpl.body, variables);
    return { texto, unresolved, rol: tpl.rol };
  }

  list(filter = {}) { return this._prompts.list(filter); }
  get(id) { return this._prompts.getById(id); }

  async save(input) {
    const entity = makePrompt(input);
    const id = await this._prompts.create(entity);
    await this._audit.record({ entidad: 'prompt', accion: 'prompt.guardar', entidadId: id, payload: { rol: entity.rol, provider: entity.provider } });
    return id;
  }

  async remove(id) {
    await this._prompts.remove(id);
    await this._audit.record({ entidad: 'prompt', accion: 'prompt.eliminar', entidadId: id });
  }
}
