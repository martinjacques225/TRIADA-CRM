// modules/diagnostico-contable/domain/estados.js
// ESTADOS COMERCIALES del Diagnóstico Contable y Tributario — lógica pura.
//
// Propios del módulo: no comparten enum, tabla ni transiciones con el pipeline
// de leads ni con el Diagnóstico 360. Los valores calzan 1:1 con el CHECK de
// public.dct_evaluaciones.estado (supabase/diagnostico_contable_f1.sql).

export const ESTADOS = [
  { v: 'borrador',           label: 'Borrador',           color: 'var(--text2)',
    sub: 'Levantamiento en curso. Solo lo ve el equipo.' },
  { v: 'completado',         label: 'Completado',         color: 'var(--primary)',
    sub: 'Cuestionario cerrado y puntaje calculado.' },
  { v: 'presentado',         label: 'Presentado',         color: 'var(--violet)',
    sub: 'El resultado ya se mostró al cliente.' },
  { v: 'reunion_solicitada', label: 'Reunión solicitada', color: 'var(--amber)',
    sub: 'Se pidió la evaluación especializada con Sebastián.' },
  { v: 'propuesta_enviada',  label: 'Propuesta enviada',  color: '#7FA85A',
    sub: 'La propuesta formal está en manos del cliente.' },
  { v: 'cerrado',            label: 'Cerrado',            color: 'var(--green)',
    sub: 'El caso terminó, con o sin venta.' },
];

export const estadoMeta  = (v) => ESTADOS.find((e) => e.v === v) || null;
export const estadoLabel = (v) => estadoMeta(v)?.label || v || '—';

/**
 * Transiciones permitidas. Se puede avanzar, y se puede volver atrás un paso
 * (una reunión se cae y el caso vuelve a "presentado"); lo que no se permite es
 * saltar desde borrador al final sin haber cerrado el cuestionario.
 */
const TRANSICIONES = {
  borrador:           ['completado'],
  completado:         ['presentado', 'reunion_solicitada', 'cerrado'],
  presentado:         ['reunion_solicitada', 'propuesta_enviada', 'cerrado', 'completado'],
  reunion_solicitada: ['propuesta_enviada', 'cerrado', 'presentado'],
  propuesta_enviada:  ['cerrado', 'reunion_solicitada'],
  cerrado:            ['propuesta_enviada'],
};

export function transicionesDe(estado) {
  return TRANSICIONES[estado] || [];
}

/** ¿Se puede pasar de `desde` a `hacia`? Devuelve { ok, motivo }. */
export function validarTransicion(desde, hacia) {
  if (desde === hacia) return { ok: false, motivo: 'La evaluación ya está en ese estado.' };
  if (!estadoMeta(hacia)) return { ok: false, motivo: 'Estado desconocido.' };
  if (!transicionesDe(desde).includes(hacia)) {
    return { ok: false, motivo: `No se puede pasar de "${estadoLabel(desde)}" a "${estadoLabel(hacia)}".` };
  }
  return { ok: true, motivo: '' };
}

/** Cerrar un caso exige decir por qué: sin motivo, el historial no sirve de nada. */
export const requiereMotivo = (hacia) => hacia === 'cerrado';

/** ¿Sigue viva comercialmente? (para los indicadores de la portada) */
export const estaViva = (estado) => estado !== 'cerrado';

/** ¿El cuestionario está cerrado? Un borrador no tiene puntaje definitivo. */
export const estaCompletada = (estado) => estado !== 'borrador';

/** Acciones disponibles en el historial, según el estado y si está archivada. */
export function accionesDisponibles(evaluacion = {}) {
  const esBorrador = evaluacion.estado === 'borrador';
  return {
    abrir:     !esBorrador,
    continuar: esBorrador,
    editar:    true,
    duplicar:  true,
    informe:   !esBorrador,
    archivar:  !evaluacion.archivada,
    restaurar: !!evaluacion.archivada,
    eliminar:  true,
  };
}
