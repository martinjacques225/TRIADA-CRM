// ============================================================================
// core.js — costura única con el CRM de escritorio.
// La PWA móvil vive en movil/ DENTRO del repo del CRM y reutiliza LITERALMENTE
// su capa de datos (mismo Supabase) y sus constantes/cuestionario 360. Todos los
// imports que cruzan a ../../js/ y ../../modules/ pasan SOLO por aquí: un único
// punto que el import-map de preview.html remapea a los mocks en memoria.
// ============================================================================

// Cliente Supabase (mismo proyecto pqrjndirqtucoumijben que el escritorio)
export { supabase } from '../../js/supabase.js';

// Capa de datos completa: db.prospectos / diagnosticos / citas / propuestas /
// profiles / clientes / autodiags … + setCurrentUser / getCurrentUserId / config /
// clearReadCache.
export * as db from '../../js/db.js';

// Atribución del Experience Center (leads.origen_detalle): etiqueta comercial
// compartida con el escritorio ('demo-conserje' → 'Demo · Conserje IA').
export { origenDetalleLabel, esLeadDeDemo } from '../../js/mappers.js';

// Sincronización en vivo (Supabase Realtime), compartida con el CRM de escritorio.
export { startRealtime, stopRealtime } from '../../js/realtime.js';

// Helpers + constantes oficiales del CRM (cuestionario 360 EXACTO incluido).
export {
  escHtml, html, raw,
  todayStr, formatDate, formatDateShort, formatCLP,
  PIPELINE_STAGES, stageIcon, stageBadge,
  PROP_ESTADOS, propEstadoLabel,
  RUBROS, TAMANOS, DOLORES, ORIGENES,
  DIAG_AREAS, areaIcon, answerValue, scorePct, DIAG_PREGUNTAS, DIAG_GRUPOS,
  MADUREZ, ratingToFrac, fracToRating,
  MEETING_TYPES, toMeetingTipo, meetingType,
  REMINDER_OPTS, RECUR_OPTS, DUR_OPTS, ESTADOS_CITA, memberColor,
  areaLabel,
} from '../../js/utils.js';

// Motor del Módulo Financiero (dominio puro + visor del informe A4) — reutiliza
// LITERALMENTE el del escritorio, así el análisis y el informe son idénticos.
export {
  FIN_TIPOS, findTipo, LECTOR, buildFinancePrompt, parseFinanceReport,
} from '../../modules/financiero/domain/analisis.js';
export { openFinReport } from '../../modules/financiero/presentation/informe-fin.view.js';

// ── Estado de la app (en memoria, una sola instancia) ──────────────────────
export const store = {
  user: null,         // { id, email }
  profile: null,      // { nombre, rol, area } desde profiles
  theme: 'light',     // light | dark | matrix
  screen: 'splash',   // pantalla activa
  params: {},         // parámetros de la pantalla activa (p. ej. { leadId })
  leadCtx: null,      // lead "en foco" (ficha / cambiar etapa / 360 / propuesta)
};

// Color de calor del lead (caliente/tibio/frío). Acepta el enum de texto o un
// número 0-100 (scoring) por compatibilidad con datos del escritorio.
export function heat(scoring) {
  if (typeof scoring === 'number') {
    if (scoring >= 70) return { color: '#C04F3F', label: 'Caliente' };
    if (scoring >= 45) return { color: '#C2871A', label: 'Tibio' };
    return { color: '#5E6A85', label: 'Frío' };
  }
  const s = (scoring || '').toString().toLowerCase();
  if (s.startsWith('cal')) return { color: '#C04F3F', label: 'Caliente' };
  if (s.startsWith('frio') || s.startsWith('frío')) return { color: '#5E6A85', label: 'Frío' };
  return { color: '#C2871A', label: 'Tibio' };
}

// Iniciales para avatares (máx 2).
export function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
}

// "hace 2h" / "ayer" / "hace 3 días" a partir de una fecha ISO.
export function timeAgo(iso) {
  if (!iso) return '';
  const d = new Date(iso), now = new Date();
  const min = Math.round((now - d) / 60000);
  if (min < 60) return min <= 1 ? 'recién' : `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h}h`;
  const days = Math.round(h / 24);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  const w = Math.round(days / 7);
  return w === 1 ? 'hace 1 sem' : `hace ${w} sem`;
}
