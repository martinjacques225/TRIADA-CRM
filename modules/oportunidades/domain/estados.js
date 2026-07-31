// modules/oportunidades/domain/estados.js — MÁQUINA DE ESTADOS (lógica pura).
//
// El flujo completo de una oportunidad pública, de detectada a cerrada. Las
// transiciones son EXPLÍCITAS: si no está en el mapa, no se puede hacer. Eso
// evita que un clic mal puesto mande una oportunidad de "detectada" a "pagada".
//
// ⚠️ Este listado debe coincidir con el `check (estado in (...))` de
// supabase/oportunidades_f1.sql. Si se agrega un estado, se agrega en los dos.

export const ESTADOS = [
  // Detección
  { v: 'detectada',            label: 'Detectada',              grupo: 'deteccion', color: 'var(--text3)' },
  { v: 'pendiente_revision',   label: 'Pendiente de revisión',  grupo: 'deteccion', color: 'var(--text2)' },
  { v: 'descartada_auto',      label: 'Descartada automáticamente', grupo: 'descarte', color: 'var(--danger)' },
  { v: 'descartada',           label: 'Descartada',             grupo: 'descarte',  color: 'var(--danger)' },
  // Análisis
  { v: 'en_analisis',          label: 'En análisis',            grupo: 'analisis',  color: 'var(--violet)' },
  { v: 'requiere_aclaracion',  label: 'Requiere aclaración',    grupo: 'analisis',  color: 'var(--amber)' },
  { v: 'recomendada',          label: 'Recomendada',            grupo: 'analisis',  color: 'var(--green)' },
  { v: 'no_recomendada',       label: 'No recomendada',         grupo: 'analisis',  color: 'var(--danger)' },
  // Decisión
  { v: 'pendiente_aprobacion', label: 'Pendiente de aprobación', grupo: 'decision', color: 'var(--amber)' },
  { v: 'aprobada',             label: 'Aprobada para participar', grupo: 'decision', color: 'var(--green)' },
  // Oferta
  { v: 'oferta_preparacion',   label: 'Oferta en preparación',  grupo: 'oferta',    color: 'var(--primary)' },
  { v: 'lista_presentar',      label: 'Lista para presentar',   grupo: 'oferta',    color: 'var(--primary)' },
  { v: 'presentada',           label: 'Presentada',             grupo: 'oferta',    color: 'var(--navy)' },
  // Resultado
  { v: 'no_adjudicada',        label: 'No adjudicada',          grupo: 'resultado', color: 'var(--text3)' },
  { v: 'adjudicada',           label: 'Adjudicada',             grupo: 'resultado', color: 'var(--green)' },
  // Ejecución
  { v: 'orden_recibida',       label: 'Orden recibida',         grupo: 'ejecucion', color: 'var(--primary)' },
  { v: 'en_ejecucion',         label: 'En ejecución',           grupo: 'ejecucion', color: 'var(--primary)' },
  { v: 'recepcion_conforme',   label: 'Recepción conforme',     grupo: 'ejecucion', color: 'var(--green)' },
  { v: 'facturada',            label: 'Facturada',              grupo: 'cobro',     color: 'var(--amber)' },
  { v: 'pagada',               label: 'Pagada',                 grupo: 'cobro',     color: 'var(--green)' },
  { v: 'certificado_solicitado', label: 'Certificado solicitado', grupo: 'cierre',  color: 'var(--amber)' },
  { v: 'certificado_obtenido', label: 'Certificado obtenido',   grupo: 'cierre',    color: 'var(--green)' },
  { v: 'cerrada',              label: 'Cerrada',                grupo: 'cierre',    color: 'var(--text3)' },
];

export const estadoMeta  = (v) => ESTADOS.find((e) => e.v === v) || null;
export const estadoLabel = (v) => estadoMeta(v)?.label || v || '—';

// Transiciones permitidas. La regla: siempre se puede descartar (con motivo) y
// siempre se puede cerrar desde el final; nunca se puede saltar hacia atrás sin
// pasar por una reapertura justificada.
export const TRANSICIONES = {
  detectada:            ['pendiente_revision', 'en_analisis', 'descartada', 'descartada_auto'],
  pendiente_revision:   ['en_analisis', 'descartada', 'descartada_auto'],
  descartada_auto:      ['pendiente_revision'],
  descartada:           ['pendiente_revision'],
  en_analisis:          ['requiere_aclaracion', 'recomendada', 'no_recomendada', 'descartada'],
  requiere_aclaracion:  ['en_analisis', 'no_recomendada', 'descartada'],
  recomendada:          ['pendiente_aprobacion', 'descartada'],
  no_recomendada:       ['en_analisis', 'descartada'],
  pendiente_aprobacion: ['aprobada', 'no_recomendada', 'descartada'],
  aprobada:             ['oferta_preparacion', 'descartada'],
  oferta_preparacion:   ['lista_presentar', 'descartada'],
  lista_presentar:      ['presentada', 'oferta_preparacion', 'descartada'],
  presentada:           ['adjudicada', 'no_adjudicada'],
  no_adjudicada:        ['cerrada'],
  adjudicada:           ['orden_recibida', 'cerrada'],
  orden_recibida:       ['en_ejecucion', 'cerrada'],
  en_ejecucion:         ['recepcion_conforme'],
  recepcion_conforme:   ['facturada'],
  facturada:            ['pagada'],
  pagada:               ['certificado_solicitado', 'cerrada'],
  certificado_solicitado: ['certificado_obtenido', 'cerrada'],
  certificado_obtenido: ['cerrada'],
  cerrada:              [],
};

/** Estados a los que se puede pasar desde `estado`. Array vacío = terminal. */
export function siguientesEstados(estado) {
  return TRANSICIONES[estado] ? [...TRANSICIONES[estado]] : [];
}

export function puedeTransicionar(desde, hacia) {
  return siguientesEstados(desde).includes(hacia);
}

export const esTerminal = (estado) => siguientesEstados(estado).length === 0;

/** Estados "vivos": los que siguen consumiendo atención del equipo. */
const CERRADOS = new Set(['descartada', 'descartada_auto', 'no_adjudicada', 'cerrada']);
export const estaViva = (estado) => !CERRADOS.has(estado);

/** ¿Esta transición exige un comentario escrito? */
export function requiereMotivo(desde, hacia) {
  if (hacia === 'descartada' || hacia === 'descartada_auto') return true;        // por qué se descarta
  if (desde === 'descartada' || desde === 'descartada_auto') return true;        // por qué se reabre
  if (hacia === 'no_adjudicada') return true;                                    // por qué se perdió
  return false;
}

/**
 * Valida un cambio de estado. Devuelve { ok, error } — nunca lanza: la vista
 * muestra el error tal cual y no hay que envolver cada llamada en try/catch.
 */
export function validarTransicion(desde, hacia, { motivo = '' } = {}) {
  if (desde === hacia) return { ok: false, error: 'La oportunidad ya está en ese estado.' };
  if (!estadoMeta(hacia)) return { ok: false, error: `Estado desconocido: ${hacia}` };
  if (!puedeTransicionar(desde, hacia)) {
    return { ok: false, error: `No se puede pasar de "${estadoLabel(desde)}" a "${estadoLabel(hacia)}".` };
  }
  if (requiereMotivo(desde, hacia) && !String(motivo || '').trim()) {
    return { ok: false, error: 'Este cambio necesita un motivo escrito.' };
  }
  return { ok: true, error: null };
}

// Orden del embudo para la analítica (§17): Detectadas → Aptas → Analizadas →
// Presentadas → Adjudicadas → Pagadas → Certificadas.
export const ETAPAS_EMBUDO = [
  { id: 'detectadas',   label: 'Detectadas' },
  { id: 'aptas',        label: 'Aptas' },
  { id: 'analizadas',   label: 'Analizadas' },
  { id: 'presentadas',  label: 'Presentadas' },
  { id: 'adjudicadas',  label: 'Adjudicadas' },
  { id: 'pagadas',      label: 'Pagadas' },
  { id: 'certificadas', label: 'Certificadas' },
];
