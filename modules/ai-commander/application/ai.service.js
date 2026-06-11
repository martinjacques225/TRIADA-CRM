// modules/ai-commander/application/ai.service.js
// ── Capa de APLICACIÓN · orquestación de IA ──────────────────────────────────
// "Ejecutar un prompt" de punta a punta: carga el prompt, resuelve el proveedor
// vía el registry, llama a provider.complete() y PERSISTE una AIResponse en el
// historial. Hoy ningún proveedor está conectado → la respuesta queda en estado
// 'no_conectado'. Cuando se implemente el backend de IA (Edge Function), NADA
// de esta capa cambia: solo el adaptador del proveedor (Open/Closed).
import { makeAIResponse } from '../domain/entities.js';

export class AIService {
  /**
   * @param {import('../domain/ports.js').PromptRepository} promptRepo
   * @param {import('../domain/ports.js').AIResponseRepository} responseRepo
   * @param {{ get:Function, list:Function }} providerRegistry
   * @param {import('../domain/ports.js').AuditPort} audit
   */
  constructor(promptRepo, responseRepo, providerRegistry, audit) {
    this._prompts = promptRepo;
    this._responses = responseRepo;
    this._registry = providerRegistry;
    this._audit = audit;
  }

  /** Metadatos de proveedores/modelos disponibles (para los selectores de la UI). */
  providers() { return this._registry.list(); }

  /** ¿Hay algún proveedor de IA realmente conectado? (hoy: false) */
  anyConfigured() { return this._registry.list().some(p => this._registry.get(p.id)?.isConfigured()); }

  /**
   * Ejecuta un prompt guardado contra un proveedor.
   * @param {string} promptId
   * @param {{ providerId?:string, model?:string }} opts
   * @returns {Promise<Object>} la AIResponse persistida (con su estado)
   */
  async run(promptId, opts = {}) {
    const prompt = await this._prompts.getById(promptId);
    if (!prompt) throw new Error('Prompt no encontrado');

    const providerId = opts.providerId || prompt.provider || 'anthropic';
    const model = opts.model || prompt.modelo || null;
    const provider = this._registry.get(providerId);

    const request = {
      system: null,
      messages: [{ role: 'user', content: prompt.contenido }],
      model,
      params: prompt.parametros || {},
    };

    let result;
    try {
      result = provider
        ? await provider.complete(request)
        : { status: 'error', content: null, usage: null, error: 'Proveedor desconocido', message: 'Proveedor desconocido' };
    } catch (e) {
      result = { status: 'error', content: null, usage: null, error: String(e?.message || e), message: 'Error al ejecutar la IA' };
    }

    const response = makeAIResponse({
      promptId,
      proyectoId:    prompt.proyectoId,
      provider:      providerId,
      modelo:        model,
      estado:        result.status,
      contenido:     result.content,
      tokensEntrada: result.usage?.inputTokens,
      tokensSalida:  result.usage?.outputTokens,
      error:         result.error,
      metadata:      { message: result.message },
    });
    const id = await this._responses.create(response);

    await this._audit.record({
      entidad: 'ia', accion: 'ia.ejecutar', entidadId: id,
      payload: { promptId, provider: providerId, modelo: model, estado: result.status },
    });

    return { id, ...response, message: result.message };
  }

  history(promptId) { return this._responses.listByPrompt(promptId); }
  recent(limit = 50) { return this._responses.listRecent(limit); }
}
