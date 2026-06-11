// modules/ai-commander/infrastructure/ai-providers.js
// ── Capa de INFRAESTRUCTURA · proveedores de IA (EL SEAM) ────────────────────
//
// Aquí vive la arquitectura lista para integrar OpenAI, Anthropic y otros —
// SIN implementar ninguna API de IA todavía.
//
// Principio de seguridad (alineado con el roadmap, Fase 11): la clave del LLM
// NUNCA vive en el cliente. Toda compleción se enrutará por una *Supabase Edge
// Function* (`ai-complete`) que guarda la clave server-side. El front solo manda
// el prompt y el proveedor/modelo elegidos.
//
// Estado actual: AI_CONFIG.edgeFunctionUrl = null → isConfigured()=false →
// complete() responde 'no_conectado' y NO realiza ninguna petición de red.
// Para activarlo en el futuro: desplegar la Edge Function y poner su URL aquí
// (o en js/config.local.js). El resto del sistema no cambia (Open/Closed).
import { AIProviderPort } from '../domain/ports.js';

// ── Configuración del backend de IA (vacía hoy a propósito) ──────────────────
export const AI_CONFIG = {
  // Cuando exista: 'https://<proyecto>.supabase.co/functions/v1/ai-complete'
  edgeFunctionUrl: null,
};

// ── Catálogo de proveedores y modelos (metadatos puros) ──────────────────────
// Por defecto Anthropic/Claude. IDs de modelo Anthropic verificados contra la
// referencia oficial de la API (no añadir sufijos de fecha a los alias).
export const PROVIDER_CATALOG = [
  {
    id: 'anthropic', label: 'Anthropic (Claude)', icon: '🟣',
    defaultModel: 'claude-opus-4-8',
    models: [
      { id: 'claude-opus-4-8',   label: 'Claude Opus 4.8',   contexto: '1M' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', contexto: '1M' },
      { id: 'claude-haiku-4-5',  label: 'Claude Haiku 4.5',  contexto: '200K' },
      { id: 'claude-fable-5',    label: 'Claude Fable 5',    contexto: '1M' },
    ],
  },
  {
    id: 'openai', label: 'OpenAI', icon: '🟢',
    defaultModel: 'gpt-4o',
    models: [
      { id: 'gpt-4o',      label: 'GPT-4o',       contexto: '128K' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini',  contexto: '128K' },
      { id: 'o3',          label: 'o3',           contexto: '200K' },
    ],
  },
  {
    id: 'google', label: 'Google (Gemini)', icon: '🔵',
    defaultModel: 'gemini-2.0-pro',
    models: [
      { id: 'gemini-2.0-pro',   label: 'Gemini 2.0 Pro',   contexto: '2M' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', contexto: '1M' },
    ],
  },
];

const NOT_CONNECTED_MSG =
  'IA en modo arquitectura: las respuestas no se generan todavía. ' +
  'Listo para conectar vía Supabase Edge Function (clave del LLM server-side).';

// ── Adaptador único: enruta por Edge Function (hoy inactivo) ─────────────────
// Demuestra Liskov/Open-Closed: un solo adaptador sirve a cualquier proveedor;
// el proveedor/modelo viajan en el payload. Agregar un proveedor = agregar una
// entrada al catálogo, no una clase nueva.
class EdgeFunctionProvider extends AIProviderPort {
  constructor(meta) { super(); this._meta = meta; }

  get id() { return this._meta.id; }
  get label() { return this._meta.label; }
  get models() { return this._meta.models; }

  isConfigured() { return !!AI_CONFIG.edgeFunctionUrl; }

  async complete(request) {
    // Sin backend configurado → no se llama a ninguna API. Seam preparado.
    if (!this.isConfigured()) {
      return { status: 'no_conectado', content: null, usage: null, error: null, message: NOT_CONNECTED_MSG };
    }
    // ── Camino futuro (inerte hoy): POST a la Edge Function de Supabase. ──
    // La función reenvía a Anthropic/OpenAI/etc. con la clave guardada server-side
    // y devuelve { content, usage } normalizado. Contrato del request:
    //   { provider, model, system, messages:[{role,content}], params:{effort,...} }
    return this._callEdgeFunction(request);
  }

  async _callEdgeFunction(request) {
    try {
      const resp = await fetch(AI_CONFIG.edgeFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: this.id, ...request }),
      });
      if (!resp.ok) {
        return { status: 'error', content: null, usage: null, error: `HTTP ${resp.status}`, message: 'Error del backend de IA' };
      }
      const data = await resp.json();
      return {
        status: 'completado',
        content: data.content ?? null,
        usage: data.usage ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens } : null,
        error: null,
        message: 'OK',
      };
    } catch (e) {
      return { status: 'error', content: null, usage: null, error: String(e?.message || e), message: 'No se pudo contactar el backend de IA' };
    }
  }
}

// ── Registro de proveedores ───────────────────────────────────────────────────
export class ProviderRegistry {
  constructor(catalog = PROVIDER_CATALOG) {
    this._meta = catalog;
    this._instances = new Map(catalog.map(m => [m.id, new EdgeFunctionProvider(m)]));
  }
  /** Metadatos para los selectores de la UI. */
  list() { return this._meta; }
  /** @returns {AIProviderPort|null} */
  get(id) { return this._instances.get(id) || null; }
}
