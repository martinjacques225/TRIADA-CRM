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

// Parsea fechas 'YYYY-MM-DD' como LOCALES: si se dejan a `new Date(str)` se
// interpretan como UTC-medianoche y, en zonas detrás de UTC (p. ej. Chile),
// se muestran corridas un día hacia atrás. Las fechas-hora completas (ISO con
// T/Z) se dejan pasar tal cual.
function parseLocalDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(iso);
}

export function formatDate(iso) {
  if (!iso) return '—';
  return parseLocalDate(iso).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' });
}

export function formatDateShort(iso) {
  if (!iso) return '—';
  return parseLocalDate(iso).toLocaleDateString('es-CL', { day:'2-digit', month:'short' });
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

// Diagnóstico Empresarial 360 — 8 pilares de evaluación estratégica.
// El orden y los ids son la columna vertebral del sistema: el motor del Informe
// Ejecutivo (informe.engine.js) y los benchmarks indexan sus catálogos por estos ids,
// y las respuestas se guardan en scores[<id>] (jsonb). NO renombrar ids sin migrar.
export const DIAG_AREAS = [
  { id: 'direccion',     label: 'Dirección Estratégica',       icon: '🧭', iconName: 'compass',   color: '#16466B' },
  { id: 'operacion',     label: 'Operación y Procesos',        icon: '⚙️', iconName: 'workflow',  color: '#3D6E92' },
  { id: 'tecnologia',    label: 'Tecnología y Automatización', icon: '🖥️', iconName: 'cpu',       color: '#5160C0' },
  { id: 'ventas',        label: 'Ventas y Desarrollo Comercial', icon: '📈', iconName: 'trending', color: '#0C7C88' },
  { id: 'marketing',     label: 'Marketing y Posicionamiento', icon: '📣', iconName: 'megaphone', color: '#2F8C93' },
  { id: 'finanzas',      label: 'Finanzas',                    icon: '💰', iconName: 'coins',     color: '#2E9B73' },
  { id: 'seguridad',     label: 'Seguridad Digital',           icon: '🛡️', iconName: 'shield',    color: '#6E59C0' },
  { id: 'oportunidades', label: 'Oportunidades Perdidas',      icon: '🎯', iconName: 'crosshair', color: '#C0892F' },
];

// Ícono de línea de un área (por id o por label); cae al emoji si la lib no cargó
export function areaIcon(area, size = 16) {
  const a = DIAG_AREAS.find(x => x.id === area || x.label === area);
  if (!a) return '';
  return (typeof window !== 'undefined' && window.icon) ? window.icon(a.iconName, '', size) : a.icon;
}

// ── Escala de Madurez Empresarial (1 a 5) ──
// Reemplaza el viejo No/Parcial/Sí. Cada nivel se almacena como una FRACCIÓN 0..1
// (frac) en los arreglos de respuestas → el cálculo de puntaje queda intacto y
// retrocompatible con diagnósticos antiguos en {0, 0.5, 1, true, false}.
export const MADUREZ = [
  { v: 1, frac: 0,    label: 'Muy deficiente', short: 'Muy def.', color: '#C04F3F' },
  { v: 2, frac: 0.25, label: 'Deficiente',     short: 'Defic.',   color: '#D2802B' },
  { v: 3, frac: 0.5,  label: 'Aceptable',      short: 'Acept.',   color: '#C2A11A' },
  { v: 4, frac: 0.75, label: 'Bueno',          short: 'Bueno',    color: '#5FA86A' },
  { v: 5, frac: 1,    label: 'Excelente',      short: 'Excel.',   color: '#2E9B73' },
];
// Nivel (1-5) → fracción 0..1 que se guarda. Fracción 0..1 → nivel (1-5) para mostrar.
export const ratingToFrac = (v) => (Math.max(1, Math.min(5, v)) - 1) / 4;
export const fracToRating = (f) => Math.round(Math.max(0, Math.min(1, f ?? 0)) * 4) + 1;

// Valor 0..1 de una respuesta del diagnóstico (crédito graduado).
//   Escala 1-5 → fracción ya guardada (0, .25, .5, .75, 1) · sin responder (null) = 0.
// Retrocompatible: Sí/Parcial/No viejos (1 / 0.5 / 0) y booleanos (true→1, false→0).
export const answerValue = (x) =>
  x === true ? 1 : (typeof x === 'number' ? Math.max(0, Math.min(1, x)) : 0);

// Puntaje 0-100 de un área a partir de su arreglo de respuestas.
// Dinámico por largo real y por valor (crédito parcial). 0 si aún no hay respuestas.
export const scorePct = (arr) => {
  const a = arr || [];
  if (!a.length) return 0;
  const sum = a.reduce((s, x) => s + answerValue(x), 0);
  return Math.round((sum / a.length) * 100);
};

// Diagnóstico 360 — cuestionario oficial del CRM. Preguntas redactadas como
// AFIRMACIONES de madurez que el dueño califica de 1 (Muy deficiente) a 5 (Excelente).
// Buscan provocar reflexión y revelar dolores, no auditar. El orden importa: el motor
// del Informe (informe.engine.js) tiene catálogos de fortalezas/hallazgos/oportunidades
// indexados 1:1 contra estas preguntas. Si cambias una, ajusta ese catálogo y DIAG_GRUPOS.
export const DIAG_PREGUNTAS = {
  direccion: [
    'La empresa tiene objetivos claros y escritos para este año, conocidos por el equipo.',
    'Existe una forma definida de medir si el negocio está creciendo (no solo la sensación de que va bien).',
    'Las decisiones importantes se toman con datos e información, más que por intuición o experiencia.',
    'Se revisan los indicadores clave del negocio de forma periódica (semanal o mensual).',
    'El dueño tiene identificados los tres mayores desafíos del negocio y un plan para enfrentarlos.',
  ],
  operacion: [
    'La información se ingresa una sola vez; el equipo no reescribe los mismos datos en varios lugares.',
    'El equipo encuentra la información que necesita rápido, sin perder tiempo buscándola.',
    'Las tareas repetitivas de la semana (facturar, reportar, agendar) están ordenadas y bajo control de tiempo.',
    'Los procesos clave están documentados y no dependen de que una sola persona los recuerde.',
    'Si un colaborador clave falta una semana, el negocio sigue funcionando con normalidad.',
    'El dueño dedica pocas horas a tareas administrativas y puede enfocarse en hacer crecer el negocio.',
  ],
  tecnologia: [
    'El negocio trabaja con herramientas digitales adecuadas, no con planillas sueltas, papel o WhatsApp como sistema.',
    'Los distintos sistemas (ventas, finanzas, operación) comparten información entre sí.',
    'La información de los clientes está ordenada en un solo lugar y no dispersa en libretas, correos o cabezas.',
    'Hay procesos automatizados que funcionan solos (recordatorios, facturación, reportes) sin intervención manual.',
    'El dueño tiene claro qué tareas le gustaría dejar de hacer a mano y automatizar.',
  ],
  ventas: [
    'Llegan prospectos nuevos de forma constante y predecible, no solo por recomendación o suerte.',
    'Cuando un cliente deja de responder, alguien retoma el contacto de forma sistemática y no se pierde la oportunidad.',
    'Se hace seguimiento ordenado a cada cotización enviada, hasta que se gana o se pierde.',
    'La empresa rara vez pierde una venta importante por no responder a tiempo.',
    'El dueño sabe en cualquier momento cuántos prospectos activos tiene y en qué etapa está cada uno.',
    'Se sabe qué porcentaje de las cotizaciones se transforma en venta, y se trabaja para mejorarlo.',
    'Están identificados los mejores clientes y se sabe cuánto vale cada uno durante toda su relación con la empresa.',
  ],
  marketing: [
    'La empresa genera demanda por canales propios; no quedaría sin clientes si mañana se cortaran las recomendaciones.',
    'El dueño está satisfecho con la cantidad de oportunidades comerciales que genera hoy.',
    'Se sabe qué canales o campañas traen los mejores clientes, y se invierte en consecuencia.',
    'Si alguien busca la empresa en Google, encuentra una presencia profesional y actualizada.',
    'La empresa está presente y activa donde están sus clientes (redes, Google, web).',
    'Existe una estrategia para que los clientes vuelvan a comprar, no solo para captar nuevos.',
  ],
  finanzas: [
    'Las finanzas del negocio están separadas de las personales del dueño.',
    'Se conoce con claridad qué productos o servicios generan utilidad y cuáles no.',
    'Se conoce el margen real de cada producto o servicio, no solo su precio de venta.',
    'Es posible proyectar el flujo de caja de los próximos tres meses con confianza.',
    'El negocio sabría cómo reaccionar si las ventas bajaran un 20% el próximo mes.',
    'Se revisan los resultados financieros mensualmente contra un presupuesto o plan.',
  ],
  seguridad: [
    'Si hoy se perdiera toda la información del negocio (robo, falla o error), existe forma de recuperarla.',
    'Existen respaldos automáticos y periódicos de la información crítica.',
    'Hay alguien claramente a cargo de la seguridad informática del negocio.',
    'Los accesos y permisos de cada colaborador están controlados: cada quien ve solo lo que le corresponde.',
    'Cuando un colaborador deja la empresa, sus accesos se revocan de inmediato.',
  ],
  oportunidades: [
    'El dueño sabe con precisión cuántos clientes o ventas pierde cada mes; no es un número desconocido.',
    'Son muy pocas las ventas que se dejan de cerrar por falta de seguimiento.',
    'El negocio aprovecha la mayoría de las oportunidades que llegan; casi ninguna queda sin atender.',
    'El tiempo que el equipo pierde en tareas repetitivas es mínimo.',
    'Están identificados los principales cuellos de botella del negocio y se está trabajando en ellos.',
  ],
};

// Sub-dimensiones de cada área, para agrupar las preguntas en el cuestionario.
// La suma de `n` debe igualar la cantidad de preguntas del área en DIAG_PREGUNTAS y el
// orden debe coincidir (se recorren en secuencia sobre el arreglo plano de preguntas).
export const DIAG_GRUPOS = {
  direccion: [
    { label: 'Rumbo y metas',          n: 2 },
    { label: 'Decisiones e indicadores', n: 3 },
  ],
  operacion: [
    { label: 'Eficiencia y duplicación',   n: 3 },
    { label: 'Dependencia y continuidad',  n: 3 },
  ],
  tecnologia: [
    { label: 'Sistemas e integración', n: 3 },
    { label: 'Automatización',         n: 2 },
  ],
  ventas: [
    { label: 'Flujo y seguimiento',       n: 4 },
    { label: 'Conocimiento del cliente',  n: 3 },
  ],
  marketing: [
    { label: 'Generación de demanda',     n: 3 },
    { label: 'Presencia y fidelización',  n: 3 },
  ],
  finanzas: [
    { label: 'Control y rentabilidad', n: 3 },
    { label: 'Caja y proyección',      n: 3 },
  ],
  seguridad: [
    { label: 'Respaldo y continuidad', n: 2 },
    { label: 'Accesos y control',      n: 3 },
  ],
  oportunidades: [
    { label: 'Fugas comerciales', n: 3 },
    { label: 'Costo operativo',   n: 2 },
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

// Áreas de trabajo (enum area_t). Etiqueta para mostrar el slug guardado en profiles.area.
export const AREA_LABELS = {
  desarrollo: 'Desarrollo', comercial: 'Comercial', finanzas: 'Finanzas', diseno: 'Diseño',
  rrhh: 'RRHH', operaciones: 'Operaciones', tecnologia: 'Tecnología', ventas: 'Ventas',
};
export function areaLabel(a) { return AREA_LABELS[a] || a || ''; }
// Áreas que usa el equipo de Tríada (para el selector del editor de Equipo).
export const TEAM_AREAS = ['desarrollo', 'comercial', 'finanzas', 'diseno'];

// Reparte en columnas los eventos que se solapan en el tiempo (vista Semana):
// dos reuniones a la misma hora se muestran lado a lado en vez de taparse, para
// que se vea de quién es cada una. Cada item necesita { start, end } numéricos
// (en horas). Devuelve los mismos items ordenados por inicio, anotados con:
//   .col  = índice de columna (0-based) dentro de su grupo de solape
//   .cols = total de columnas de ese grupo (ancho = 100% / cols)
// Pura (sin DOM ni fechas reales) → testeable en node.
export function packOverlaps(items) {
  const sorted = items.slice().sort((a, b) => a.start - b.start || a.end - b.end);
  let cluster = [], clusterEnd = -Infinity;
  const flush = () => {
    const colEnds = [];                 // fin del último evento colocado en cada columna
    cluster.forEach((it) => {
      let placed = false;
      for (let c = 0; c < colEnds.length; c++) {
        if (it.start >= colEnds[c]) { it.col = c; colEnds[c] = it.end; placed = true; break; }
      }
      if (!placed) { it.col = colEnds.length; colEnds.push(it.end); }
    });
    cluster.forEach((it) => { it.cols = colEnds.length; });
    cluster = [];
  };
  sorted.forEach((it) => {
    if (cluster.length && it.start >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  });
  flush();
  return sorted;
}

export function stageBadge(estado) {
  const st = PIPELINE_STAGES.find(s => s.id === estado);
  if (!st) return `<span class="badge">${escHtml(estado)}</span>`;
  const ic = (typeof window !== 'undefined' && window.icon) ? window.icon(st.iconName, '', 12) : st.icon;
  return `<span class="badge" style="color:${st.color};background:${st.bg};border-color:${st.color}22">${ic} ${escHtml(estado)}</span>`;
}
