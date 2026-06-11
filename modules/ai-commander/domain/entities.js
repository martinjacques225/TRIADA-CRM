// modules/ai-commander/domain/entities.js
// ── Capa de DOMINIO (Clean Architecture) ─────────────────────────────────────
// Reglas de negocio puras del AI Commander. SIN I/O, SIN DOM, SIN Supabase.
// Es el núcleo estable: las capas externas dependen de esto, no al revés (DIP).

export class ValidationError extends Error {
  constructor(message) { super(message); this.name = 'ValidationError'; }
}

// ── Vocabulario de dominio (value objects) ───────────────────────────────────
export const PROJECT_STATES = [
  { id: 'activo',      label: 'Activo',      icon: '🟢', color: '#4FB286' },
  { id: 'pausado',     label: 'Pausado',     icon: '⏸️', color: '#F0B429' },
  { id: 'completado',  label: 'Completado',  icon: '✅', color: '#028090' },
  { id: 'archivado',   label: 'Archivado',   icon: '📦', color: '#94A3B8' },
];

// Columnas del Kanban, en orden de flujo.
export const TASK_COLUMNS = [
  { id: 'backlog',     label: 'Backlog',      icon: '📋', color: '#9DA7B3' },
  { id: 'por_hacer',   label: 'Por hacer',    icon: '🗒️', color: '#5B6BD6' },
  { id: 'en_progreso', label: 'En progreso',  icon: '⚙️', color: '#028090' },
  { id: 'en_revision', label: 'En revisión',  icon: '🔍', color: '#F0B429' },
  { id: 'hecho',       label: 'Hecho',        icon: '✅', color: '#4FB286' },
];

export const PRIORITIES = [
  { id: 'baja',    label: 'Baja',    color: '#94A3B8' },
  { id: 'media',   label: 'Media',   color: '#5B6BD6' },
  { id: 'alta',    label: 'Alta',    color: '#F0B429' },
  { id: 'urgente', label: 'Urgente', color: '#E0604F' },
];

export const AI_RESPONSE_STATES = [
  { id: 'pendiente',    label: 'Pendiente',     color: '#F0B429' },
  { id: 'no_conectado', label: 'IA no conectada', color: '#94A3B8' },
  { id: 'completado',   label: 'Completado',    color: '#4FB286' },
  { id: 'error',        label: 'Error',         color: '#E0604F' },
];

const _PROJECT_STATE_IDS = PROJECT_STATES.map(s => s.id);
const _TASK_COLUMN_IDS    = TASK_COLUMNS.map(c => c.id);
const _PRIORITY_IDS       = PRIORITIES.map(p => p.id);

export const findProjectState = (id) => PROJECT_STATES.find(s => s.id === id) || PROJECT_STATES[0];
export const findTaskColumn   = (id) => TASK_COLUMNS.find(c => c.id === id) || TASK_COLUMNS[0];
export const findPriority     = (id) => PRIORITIES.find(p => p.id === id) || PRIORITIES[1];

// ── Factories + invariantes ──────────────────────────────────────────────────
// Devuelven objetos de dominio normalizados (camelCase). Lanzan ValidationError.

export function makeProject(input = {}) {
  const nombre = (input.nombre || '').trim();
  if (!nombre) throw new ValidationError('El nombre del proyecto es obligatorio');
  const estado    = _PROJECT_STATE_IDS.includes(input.estado) ? input.estado : 'activo';
  const prioridad = _PRIORITY_IDS.includes(input.prioridad) ? input.prioridad : 'media';
  return {
    nombre,
    descripcion:   (input.descripcion || '').trim() || null,
    objetivo:      (input.objetivo || '').trim() || null,
    estado,
    prioridad,
    area:          input.area || null,
    clienteId:     input.clienteId || null,
    responsable:   input.responsable || null,
    repoUrl:       (input.repoUrl || '').trim() || null,
    stack:         Array.isArray(input.stack) ? input.stack : _splitTags(input.stack),
    fechaInicio:   input.fechaInicio || null,
    fechaObjetivo: input.fechaObjetivo || null,
    progreso:      _clampPct(input.progreso),
  };
}

export function makeTask(input = {}) {
  const titulo = (input.titulo || '').trim();
  if (!titulo) throw new ValidationError('El título de la tarea es obligatorio');
  if (!input.proyectoId) throw new ValidationError('La tarea debe pertenecer a un proyecto');
  const estado    = _TASK_COLUMN_IDS.includes(input.estado) ? input.estado : 'backlog';
  const prioridad = _PRIORITY_IDS.includes(input.prioridad) ? input.prioridad : 'media';
  return {
    proyectoId:      input.proyectoId,
    titulo,
    descripcion:     (input.descripcion || '').trim() || null,
    estado,
    prioridad,
    asignado:        input.asignado || null,
    etiquetas:       Array.isArray(input.etiquetas) ? input.etiquetas : _splitTags(input.etiquetas),
    estimacionHoras: _toNum(input.estimacionHoras),
    orden:           Number.isFinite(input.orden) ? input.orden : 0,
    aiAsistida:      !!input.aiAsistida,
  };
}

export function makePrompt(input = {}) {
  const contenido = (input.contenido || '').trim();
  if (!contenido) throw new ValidationError('El contenido del prompt no puede estar vacío');
  return {
    proyectoId: input.proyectoId || null,
    tareaId:    input.tareaId || null,
    titulo:     (input.titulo || '').trim() || null,
    rol:        input.rol || null,
    plantilla:  input.plantilla || null,
    contenido,
    variables:  input.variables && typeof input.variables === 'object' ? input.variables : {},
    provider:   input.provider || 'anthropic',
    modelo:     input.modelo || null,
    parametros: input.parametros && typeof input.parametros === 'object' ? input.parametros : {},
  };
}

export function makeAIResponse(input = {}) {
  return {
    promptId:      input.promptId || null,
    proyectoId:    input.proyectoId || null,
    provider:      input.provider || null,
    modelo:        input.modelo || null,
    estado:        AI_RESPONSE_STATES.some(s => s.id === input.estado) ? input.estado : 'pendiente',
    contenido:     input.contenido || null,
    tokensEntrada: _toNum(input.tokensEntrada),
    tokensSalida:  _toNum(input.tokensSalida),
    costo:         _toNum(input.costo),
    latenciaMs:    _toNum(input.latenciaMs),
    error:         input.error || null,
    metadata:      input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
  };
}

// ── Lógica de negocio pura ────────────────────────────────────────────────────

/** Avance del proyecto a partir de sus tareas. */
export function projectProgress(tasks = []) {
  const total = tasks.length;
  const done  = tasks.filter(t => t.estado === 'hecho').length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  return { total, done, pct };
}

/** El Kanban permite mover a cualquier columna; solo validamos que existan. */
export function isValidTaskTransition(from, to) {
  return _TASK_COLUMN_IDS.includes(to) && (from == null || _TASK_COLUMN_IDS.includes(from));
}

/** Rellena placeholders {{var}} de una plantilla. Devuelve texto + variables sin resolver. */
export function composePrompt(body = '', variables = {}) {
  const unresolved = [];
  const texto = String(body).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_m, key) => {
    const v = variables[key];
    if (v == null || v === '') { unresolved.push(key); return `{{${key}}}`; }
    return String(v);
  });
  return { texto, unresolved };
}

// ── Catálogo de plantillas de prompt (datos puros) ────────────────────────────
// Roles de un equipo de desarrollo asistido por IA. `variables` referencia los
// placeholders {{...}} usados en `body`.
export const PROMPT_TEMPLATES = [
  {
    id: 'arquitecto', rol: 'Arquitecto de Software', icon: '🏛️',
    descripcion: 'Diseña la arquitectura de un componente o sistema.',
    variables: ['objetivo', 'contexto', 'restricciones'],
    body:
`Actúa como arquitecto de software senior.

Objetivo:
{{objetivo}}

Contexto del sistema:
{{contexto}}

Restricciones (técnicas, de negocio, de tiempo):
{{restricciones}}

Entrega: propuesta de arquitectura con componentes, responsabilidades, flujo de datos, decisiones clave (con trade-offs) y riesgos. Aplica SOLID y separación de capas.`,
  },
  {
    id: 'desarrollador', rol: 'Desarrollador', icon: '💻',
    descripcion: 'Implementa una funcionalidad concreta.',
    variables: ['tarea', 'lenguaje', 'criterios'],
    body:
`Actúa como desarrollador experto en {{lenguaje}}.

Tarea a implementar:
{{tarea}}

Criterios de aceptación:
{{criterios}}

Entrega código limpio, idiomático y comentado solo donde aporte. Indica supuestos y cómo probarlo.`,
  },
  {
    id: 'revisor', rol: 'Revisor de Código', icon: '🔎',
    descripcion: 'Revisa código en busca de bugs y mejoras.',
    variables: ['lenguaje', 'codigo', 'foco'],
    body:
`Actúa como revisor de código senior ({{lenguaje}}).

Foco de la revisión:
{{foco}}

Código:
\`\`\`
{{codigo}}
\`\`\`

Reporta hallazgos por severidad (crítico/alto/medio/bajo), con ubicación, explicación y propuesta de arreglo. Incluye también simplificaciones y reuso.`,
  },
  {
    id: 'tester', rol: 'QA / Tester', icon: '🧪',
    descripcion: 'Genera pruebas para un componente.',
    variables: ['framework', 'codigo', 'casos'],
    body:
`Actúa como ingeniero de QA.

Escribe pruebas con {{framework}} para el siguiente código:
\`\`\`
{{codigo}}
\`\`\`

Cubre estos casos (y los límite que detectes):
{{casos}}

Entrega pruebas legibles, con nombres descriptivos y asserts claros.`,
  },
  {
    id: 'documentador', rol: 'Documentador', icon: '📝',
    descripcion: 'Documenta un artefacto para una audiencia.',
    variables: ['artefacto', 'audiencia'],
    body:
`Actúa como redactor técnico.

Documenta:
{{artefacto}}

Audiencia:
{{audiencia}}

Entrega documentación clara y accionable: propósito, uso, ejemplos y errores comunes.`,
  },
  {
    id: 'refactor', rol: 'Refactor', icon: '♻️',
    descripcion: 'Refactoriza código hacia un objetivo.',
    variables: ['codigo', 'objetivo'],
    body:
`Actúa como ingeniero de refactorización.

Objetivo del refactor:
{{objetivo}}

Código actual:
\`\`\`
{{codigo}}
\`\`\`

Entrega el código refactorizado preservando el comportamiento, explicando cada cambio y su beneficio (legibilidad, rendimiento, testabilidad).`,
  },
];

export const findTemplate = (id) => PROMPT_TEMPLATES.find(t => t.id === id) || null;

// ── helpers internos ──────────────────────────────────────────────────────────
function _splitTags(v) {
  if (!v) return [];
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
}
function _toNum(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function _clampPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
