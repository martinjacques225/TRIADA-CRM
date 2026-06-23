// js/utils.js — Shared helpers

export function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Tagged template que escapa TODA interpolación por defecto (anti-XSS, defensa
// sistémica contra C-4). Uso: html`<div>${userInput}</div>` → userInput siempre
// escapado, imposible olvidarlo. Para inyectar HTML ya-confiable a propósito
// (íconos SVG, fragmentos generados internamente), envolver con raw():
//   html`<span>${raw(window.icon('phone'))}</span>`
export function html(strings, ...vals) {
  return strings.reduce((out, s, i) =>
    out + s + (i < vals.length ? (vals[i] && vals[i].__raw !== undefined ? vals[i].__raw : escHtml(vals[i])) : ''), '');
}
export function raw(s) { return { __raw: String(s ?? '') }; }

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' });
}

export function formatDateShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day:'2-digit', month:'short' });
}

export function formatCLP(n) {
  if (!n && n !== 0) return '—';
  return '$' + Number(n).toLocaleString('es-CL');
}

export function toast(msg, type = 'info', duration = 3000) {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 320); }, duration);
}

export const PIPELINE_STAGES = [
  { id: 'Nuevo',                 color: '#94A0B6', bg: '#F0F2F6',   icon: '🆕', iconName: 'sparkle' },
  { id: 'Contactado',            color: '#5160C0', bg: '#ECEEFA',   icon: '📞', iconName: 'phone' },
  { id: 'Diagnóstico Agendado',  color: '#C2871A', bg: '#F8F0DD',   icon: '📅', iconName: 'calClock' },
  { id: 'Diagnóstico Realizado', color: '#0C7C88', bg: '#E2F0F1',   icon: '🔍', iconName: 'search' },
  { id: 'Propuesta Enviada',     color: '#16234A', bg: '#E9ECF4',   icon: '📋', iconName: 'fileText' },
  { id: 'Negociando',            color: '#C04F3F', bg: '#F9E9E6',   icon: '🤝', iconName: 'handshake' },
  { id: 'Cliente',               color: '#2E9B73', bg: '#E4F2EB',   icon: '✅', iconName: 'checkCirc' },
  { id: 'Descartado',            color: '#94A0B6', bg: '#F0F2F6',   icon: '❌', iconName: 'xCirc' },
];

// Renderiza el ícono de línea de una etapa (cae al emoji si la lib no cargó)
export function stageIcon(estado, size = 14) {
  const st = PIPELINE_STAGES.find(s => s.id === estado);
  if (!st) return '';
  return (typeof window !== 'undefined' && window.icon) ? window.icon(st.iconName, '', size) : st.icon;
}

// Estados de propuesta: el enum prop_estado de la DB usa slugs en minúscula.
// Guardar SIEMPRE el slug; mostrar el label. ('Borrador' capitalizado → 22P02)
export const PROP_ESTADOS = [
  { v: 'borrador',   label: 'Borrador'   },
  { v: 'enviada',    label: 'Enviada'    },
  { v: 'negociando', label: 'Negociando' },
  { v: 'aceptada',   label: 'Aceptada'   },
  { v: 'rechazada',  label: 'Rechazada'  },
];
export const propEstadoLabel = (v) => (PROP_ESTADOS.find(e => e.v === v)?.label) || v || '—';

export const RUBROS = ['Comercio / retail','Servicios','Gastronomía','Salud','Construcción','Manufactura','Otro'];
export const TAMANOS = ['1 a 5','6 a 20','21 a 50','Más de 50'];
export const DOLORES = ['Vender más','Ordenar procesos','Controlar finanzas','Automatizar / tecnología','No sé por dónde partir'];
export const ORIGENES = ['Manual','Landing Web','Meta Ads','Google Ads','WhatsApp','Referido'];

export const DIAG_AREAS = [
  { id: 'tec',      label: 'Tecnología',   icon: '🖥️', iconName: 'cpu',      color: '#5160C0' },
  { id: 'ventas',   label: 'Ventas',       icon: '📈', iconName: 'trending', color: '#0C7C88' },
  { id: 'finanzas', label: 'Finanzas',     icon: '💰', iconName: 'coins',    color: '#2E9B73' },
];

// Ícono de línea de un área (por id o por label); cae al emoji si la lib no cargó
export function areaIcon(area, size = 16) {
  const a = DIAG_AREAS.find(x => x.id === area || x.label === area);
  if (!a) return '';
  return (typeof window !== 'undefined' && window.icon) ? window.icon(a.iconName, '', size) : a.icon;
}

// Valor 0..1 de una respuesta del diagnóstico. Escala graduada:
//   Sí = 1 · Parcial = 0.5 · No = 0 · sin responder (null) = 0.
// Retrocompatible con diagnósticos viejos en Sí/No (booleanos): true→1, false→0.
export const answerValue = (x) =>
  x === true ? 1 : (typeof x === 'number' ? Math.max(0, Math.min(1, x)) : 0);

// Puntaje 0-100 de un área a partir de su arreglo de respuestas.
// Dinámico por largo real (5, 9 o N preguntas) y por valor (crédito parcial).
// Devuelve 0 si aún no hay respuestas.
export const scorePct = (arr) => {
  const a = arr || [];
  if (!a.length) return 0;
  const sum = a.reduce((s, x) => s + answerValue(x), 0);
  return Math.round((sum / a.length) * 100);
};

// Diagnóstico 360 — cuestionario oficial del CRM (9 preguntas por área, 27 en total).
// El orden importa: el motor del Informe Ejecutivo (informe.engine.js) tiene catálogos
// de fortalezas/hallazgos/oportunidades en paralelo, indexados 1:1 contra estas preguntas.
// Si agregas/quitas/reordenas una pregunta, ajusta también ese catálogo y DIAG_GRUPOS.
export const DIAG_PREGUNTAS = {
  tec: [
    // Sistemas y datos
    '¿Los sistemas internos (ventas, finanzas, operación) están integrados y comparten información?',
    '¿La información del negocio está centralizada y accesible para quien la necesita?',
    '¿Se toman decisiones con datos e indicadores, y no solo por intuición?',
    // Automatización y herramientas
    '¿El equipo trabaja con herramientas digitales en vez de planillas sueltas o papel?',
    '¿Se automatizan tareas repetitivas (facturación, reportes, recordatorios)?',
    // Presencia y seguridad digital
    '¿La empresa tiene presencia digital activa (web, redes, Google) acorde a su rubro?',
    '¿Existen respaldos automáticos de la información crítica del negocio?',
    '¿Los accesos, contraseñas y permisos se gestionan de forma segura?',
    '¿Hay alguien (interno o externo) a cargo del soporte y la mejora tecnológica?',
  ],
  ventas: [
    // Generación de demanda
    '¿La empresa genera prospectos de forma constante (no solo por recomendación o boca a boca)?',
    '¿Se invierte en marketing o difusión de forma planificada y medida?',
    // Proceso y cierre
    '¿Existe un proceso de ventas documentado que el equipo sigue?',
    '¿Se hace seguimiento estructurado a cada prospecto y cotización?',
    '¿Se usa un CRM o herramienta para gestionar clientes y oportunidades?',
    '¿Se mide la tasa de conversión (cuántas cotizaciones se cierran)?',
    '¿El equipo comercial tiene metas claras y seguimiento regular?',
    // Clientes y crecimiento
    '¿Existe un proceso de postventa para retener y hacer crecer a los clientes actuales?',
    '¿Se conoce cuánto cuesta conseguir un cliente y cuánto deja en el tiempo?',
  ],
  finanzas: [
    // Control y caja
    '¿Las finanzas del negocio están separadas de las personales del dueño?',
    '¿El flujo de caja se proyecta con al menos 3 meses de anticipación?',
    '¿Se revisan los resultados (estado de resultados) mensualmente?',
    // Rentabilidad y costos
    '¿Se conoce el margen real de cada producto o servicio?',
    '¿Los costos fijos y variables están claramente identificados?',
    '¿Existen indicadores de rentabilidad por línea de negocio o cliente?',
    // Formalidad y planificación
    '¿La empresa está al día con sus obligaciones tributarias y contables (SII)?',
    '¿Existe un presupuesto anual contra el cual se compara el desempeño?',
    '¿La empresa accede a financiamiento o capital de trabajo cuando lo necesita?',
  ],
};

// Sub-dimensiones de cada área, para agrupar las preguntas en el modal del diagnóstico.
// La suma de `n` debe igualar la cantidad de preguntas del área en DIAG_PREGUNTAS y el
// orden debe coincidir (se recorren en secuencia sobre el arreglo plano de preguntas).
export const DIAG_GRUPOS = {
  tec: [
    { label: 'Sistemas y datos',              n: 3 },
    { label: 'Automatización y herramientas', n: 2 },
    { label: 'Presencia y seguridad digital', n: 4 },
  ],
  ventas: [
    { label: 'Generación de demanda', n: 2 },
    { label: 'Proceso y cierre',      n: 5 },
    { label: 'Clientes y crecimiento', n: 2 },
  ],
  finanzas: [
    { label: 'Control y caja',             n: 3 },
    { label: 'Rentabilidad y costos',      n: 3 },
    { label: 'Formalidad y planificación', n: 3 },
  ],
};

// ─── Calendario de reuniones (Agenda) ────────────────────────
// El tipo se guarda como slug en citas.tipo (text). Los labels legacy
// ('Diagnóstico 360', 'Seguimiento'…) se mapean al leer (toMeetingType).
export const MEETING_TYPES = [
  { id: 'emergencia',  label: 'Emergencia',         color: '#C04F3F', icon: 'alert',     desc: 'Atención inmediata' },
  { id: 'rutina',      label: 'Rutina',             color: '#2E9B73', icon: 'refresh',   desc: 'Operación periódica' },
  { id: 'negocio',     label: 'Negocio',            color: '#16234A', icon: 'handshake', desc: 'Oportunidad comercial' },
  { id: 'diagnostico', label: 'Diagnóstico 360',    color: '#0C7C88', icon: 'clipCheck', desc: 'Levantamiento 360' },
  { id: 'seguimiento', label: 'Seguimiento',        color: '#C2871A', icon: 'phone',     desc: 'Contacto de avance' },
  { id: 'propuesta',   label: 'Propuesta / cierre', color: '#5160C0', icon: 'propuesta', desc: 'Presentación o cierre' },
  { id: 'interna',     label: 'Interna de equipo',  color: '#B8893B', icon: 'users',     desc: 'Coordinación interna' },
];

const LEGACY_TIPO = {
  'Diagnóstico 360': 'diagnostico',
  'Presentación propuesta': 'propuesta',
  'Presentación de propuesta': 'propuesta',
  'Seguimiento': 'seguimiento',
  'Primer contacto': 'seguimiento',
  'Contacto': 'seguimiento',
  'Otro': 'rutina',
};

export function toMeetingTipo(tipo) {
  if (MEETING_TYPES.some(t => t.id === tipo)) return tipo;
  return LEGACY_TIPO[tipo] || tipo;
}

// Tipo de reunión (con fallback para valores desconocidos)
export function meetingType(tipo) {
  const id = toMeetingTipo(tipo);
  return MEETING_TYPES.find(t => t.id === id)
      || { id, label: tipo || 'Reunión', color: '#5E6A85', icon: 'agenda', desc: '' };
}

export const REMINDER_OPTS = [
  { min: 0,    label: 'Al momento' },
  { min: 10,   label: '10 min antes' },
  { min: 30,   label: '30 min antes' },
  { min: 60,   label: '1 hora antes' },
  { min: 1440, label: '1 día antes' },
];

export const RECUR_OPTS = [
  { id: 'none',    label: 'No se repite' },
  { id: 'daily',   label: 'Cada día' },
  { id: 'weekly',  label: 'Cada semana' },
  { id: 'monthly', label: 'Cada mes' },
];

export const DUR_OPTS = [15, 30, 45, 60, 90, 120];

export const ESTADOS_CITA = ['Pendiente', 'Confirmada', 'Realizada', 'Cancelada'];

// Color estable para un miembro del equipo (por índice)
const MEMBER_COLORS = ['#5160C0', '#0C7C88', '#2E9B73', '#7C6FD0', '#2BA9B2', '#46B488', '#C2871A', '#B8893B'];
export function memberColor(i) { return MEMBER_COLORS[i % MEMBER_COLORS.length]; }

export function stageBadge(estado) {
  const st = PIPELINE_STAGES.find(s => s.id === estado);
  if (!st) return `<span class="badge">${escHtml(estado)}</span>`;
  const ic = (typeof window !== 'undefined' && window.icon) ? window.icon(st.iconName, '', 12) : st.icon;
  return `<span class="badge" style="color:${st.color};background:${st.bg};border-color:${st.color}22">${ic} ${escHtml(estado)}</span>`;
}
