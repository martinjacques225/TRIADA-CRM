// modules/oportunidades/domain/puntaje.js — MARCADOR DE 100 PUNTOS (lógica pura).
//
// "La decisión deja de ser una corazonada y pasa a ser una cuenta."
// Seis criterios, 100 puntos. El sistema SUGIERE; la persona confirma o cambia
// (y si cambia, el motivo es obligatorio — lo exige la tabla, no solo la UI).
//
// Regla clave contra el "puntaje inventado": si falta el dato para sugerir un
// criterio, se devuelve `sugerido: null` y una justificación que dice QUÉ falta.
// Un null nunca se cuenta como cero disfrazado.

import { MARGEN_OBJETIVO, MARGEN_DESCARTE } from './finanzas.js';

export const CRITERIOS = [
  { id: 'coincidencia', label: 'Coincidencia con los servicios de Tríada', max: 25, pregunta: '¿Es exactamente lo que ya sabemos hacer, o hay que improvisar?' },
  { id: 'acreditacion', label: 'Capacidad de acreditar al equipo',         max: 20, pregunta: '¿Tenemos CV, títulos y certificados para probar quién lo hará?' },
  { id: 'margen',       label: 'Margen económico',                          max: 20, pregunta: '¿El precio del mercado deja 30% después de pagar las horas?' },
  { id: 'capacidad',    label: 'Capacidad y plazo',                         max: 15, pregunta: '¿Cabe en la agenda sin dañar los proyectos que ya tenemos?' },
  { id: 'riesgo',       label: 'Riesgo contractual',                        max: 10, pregunta: 'Multas, garantías y obligaciones que no controlamos.' },
  { id: 'estrategico',  label: 'Valor estratégico del certificado',         max: 10, pregunta: '¿Este certificado nos abre puertas después?' },
];

export const PUNTAJE_MAX = CRITERIOS.reduce((s, c) => s + c.max, 0); // 100
export const UMBRAL_PARTICIPAR = 70;
export const UMBRAL_REVISAR    = 55;

export const criterioMeta = (id) => CRITERIOS.find((c) => c.id === id) || null;

const clamp = (n, max) => Math.max(0, Math.min(max, Number(n) || 0));

/**
 * Suma el marcador. `puntajes` = [{criterio, puntos, ...}].
 * `completo` es false mientras algún criterio no tenga una persona detrás
 * (confirmadoPor) — un total con criterios sin confirmar no decide nada.
 */
export function calcularTotal(puntajes = []) {
  const porCriterio = {};
  let total = 0;
  CRITERIOS.forEach((c) => {
    const fila = puntajes.find((p) => p.criterio === c.id);
    const pts = fila ? clamp(fila.puntos, c.max) : 0;
    porCriterio[c.id] = { puntos: pts, max: c.max, evaluado: !!fila, confirmado: !!(fila && fila.confirmadoPor), manual: !!(fila && fila.manual) };
    total += pts;
  });
  const evaluados = Object.values(porCriterio).filter((x) => x.evaluado).length;
  return {
    total: Math.round(total),
    porCriterio,
    evaluados,
    faltantes: CRITERIOS.filter((c) => !porCriterio[c.id].evaluado).map((c) => c.id),
    completo: evaluados === CRITERIOS.length,
    confirmadoCompleto: Object.values(porCriterio).every((x) => x.confirmado),
  };
}

/**
 * Veredicto. Una causal crítica manda sobre el puntaje: aunque saque 90, si
 * falta un requisito obligatorio no se participa (§10 del encargo).
 */
export function recomendacion(total, { hayCausalCritica = false, umbralParticipar = UMBRAL_PARTICIPAR, umbralRevisar = UMBRAL_REVISAR } = {}) {
  if (hayCausalCritica) {
    return { valor: 'no_participar', label: 'No participar', motivo: 'Hay una causal crítica de descarte.', color: 'var(--danger)' };
  }
  if (total >= umbralParticipar) {
    return { valor: 'participar', label: 'Recomendada para participar', motivo: `${total} puntos (umbral ${umbralParticipar}).`, color: 'var(--green)' };
  }
  if (total >= umbralRevisar) {
    return { valor: 'revisar', label: 'Requiere revisión de los socios', motivo: `${total} puntos: entre ${umbralRevisar} y ${umbralParticipar - 1}.`, color: 'var(--amber)' };
  }
  return { valor: 'no_participar', label: 'No recomendada', motivo: `${total} puntos: bajo ${umbralRevisar}.`, color: 'var(--danger)' };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUGERENCIAS — heurísticas deterministas (cuentas, no IA)
// Cada una devuelve { sugerido, justificacion, datos }. `sugerido: null` = falta
// el dato; la vista lo muestra como "Sin datos para sugerir", no como 0.
// ─────────────────────────────────────────────────────────────────────────────

function sugCoincidencia(ctx) {
  const { servicioSlug, servicio, unspscOportunidad = [], unspscVigilados = [] } = ctx;
  if (!servicioSlug && !unspscOportunidad.length) {
    return { sugerido: null, justificacion: 'Falta asignar el servicio de Tríada o el código UNSPSC del proceso.', datos: {} };
  }
  const cruce = unspscOportunidad.filter((c) => unspscVigilados.includes(String(c)));
  if (servicioSlug && servicio) {
    if (servicio.puedeHoy && !servicio.requiereAliado) {
      return { sugerido: 25, justificacion: `Calza con "${servicio.nombre}", que se ejecuta con el equipo actual.`, datos: { servicioSlug, cruce } };
    }
    return { sugerido: 10, justificacion: `Calza con "${servicio.nombre}", pero hoy requiere un aliado externo (${servicio.requiereAliado || 'por confirmar'}).`, datos: { servicioSlug } };
  }
  if (cruce.length) {
    return { sugerido: 15, justificacion: `El proceso usa códigos que Tríada vigila (${cruce.join(', ')}), pero falta confirmar el servicio exacto.`, datos: { cruce } };
  }
  return { sugerido: 0, justificacion: 'Ni el servicio ni los códigos UNSPSC calzan con el catálogo de Tríada.', datos: { unspscOportunidad } };
}

function sugAcreditacion(ctx) {
  const reqs = (ctx.requisitos || []).filter((r) => ['experiencia_institucional', 'experiencia_individual', 'titulo_certificado'].includes(r.tipo));
  if (!reqs.length) {
    return { sugerido: null, justificacion: 'Todavía no se han cargado los requisitos de experiencia o títulos del proceso.', datos: {} };
  }
  const sinEvaluar = reqs.filter((r) => r.cumple === 'no_evaluado').length;
  if (sinEvaluar) {
    return { sugerido: null, justificacion: `${sinEvaluar} de ${reqs.length} requisitos de acreditación siguen sin evaluar.`, datos: { total: reqs.length, sinEvaluar } };
  }
  const valor = (r) => (r.cumple === 'si' ? 1 : r.cumple === 'parcial' ? 0.5 : 0);
  const frac = reqs.reduce((s, r) => s + valor(r), 0) / reqs.length;
  const noCumple = reqs.filter((r) => r.cumple === 'no').length;
  return {
    sugerido: Math.round(frac * 20),
    justificacion: `${reqs.length} requisitos de acreditación evaluados; ${noCumple} sin cumplir.`,
    datos: { total: reqs.length, noCumple, frac: Math.round(frac * 100) / 100 },
  };
}

function sugMargen(ctx) {
  const m = ctx.margenReal;
  if (m == null) return { sugerido: null, justificacion: 'Falta la cotización: sin horas cargadas no hay margen que evaluar.', datos: {} };
  const p = Math.round(m * 1000) / 10;
  if (m >= 0.40) return { sugerido: 20, justificacion: `Margen estimado ${p}%: holgado.`, datos: { margen: m } };
  if (m >= MARGEN_OBJETIVO) return { sugerido: 16, justificacion: `Margen estimado ${p}%: cumple el 30% objetivo.`, datos: { margen: m } };
  if (m >= MARGEN_DESCARTE) return { sugerido: 8, justificacion: `Margen estimado ${p}%: bajo el objetivo, lo firman los tres socios.`, datos: { margen: m } };
  return { sugerido: 0, justificacion: `Margen estimado ${p}%: bajo 25%, es causal de descarte.`, datos: { margen: m } };
}

function sugCapacidad(ctx) {
  const { diasHastaCierre, horasEstimadas, horasDisponibles, semanasEjecucion, semanasExigidas } = ctx;
  if (diasHastaCierre == null && horasEstimadas == null) {
    return { sugerido: null, justificacion: 'Falta la fecha de cierre o la estimación de horas.', datos: {} };
  }
  let pts = 15;
  const razones = [];
  if (diasHastaCierre != null) {
    if (diasHastaCierre < 0) { pts = 0; razones.push('el proceso ya cerró'); }
    else if (diasHastaCierre <= 1) { pts -= 8; razones.push('cierra en menos de 24 horas'); }
    else if (diasHastaCierre <= 3) { pts -= 4; razones.push('cierra en menos de 3 días'); }
  }
  if (horasEstimadas != null && horasDisponibles != null && horasDisponibles > 0) {
    const carga = horasEstimadas / horasDisponibles;
    if (carga > 1) { pts -= 8; razones.push(`exige ${Math.round(carga * 100)}% de la capacidad disponible`); }
    else if (carga > 0.7) { pts -= 4; razones.push('ocupa más del 70% de la capacidad disponible'); }
  }
  if (semanasExigidas != null && semanasEjecucion != null && semanasExigidas < semanasEjecucion) {
    pts -= 6; razones.push(`el plazo exigido (${semanasExigidas} sem) es menor al habitual (${semanasEjecucion} sem)`);
  }
  pts = Math.max(0, Math.min(15, pts));
  return {
    sugerido: pts,
    justificacion: razones.length ? `Pierde puntos porque ${razones.join('; ')}.` : 'Cabe en la agenda sin mover otros proyectos.',
    datos: { diasHastaCierre, horasEstimadas, horasDisponibles },
  };
}

function sugRiesgo(ctx) {
  const riesgos = ctx.riesgos || [];
  if (!riesgos.length) {
    return { sugerido: null, justificacion: 'Todavía no se han registrado riesgos: revisar multas, garantías y dependencias antes de puntuar.', datos: {} };
  }
  const peso = { critico: 10, alto: 5, medio: 2, bajo: 1 };
  const descuento = riesgos.reduce((s, r) => s + (peso[r.nivel] || 0), 0);
  const pts = Math.max(0, 10 - descuento);
  return {
    sugerido: pts,
    justificacion: `${riesgos.length} riesgos registrados (${riesgos.filter((r) => r.nivel === 'critico' || r.nivel === 'alto').length} altos o críticos).`,
    datos: { descuento },
  };
}

function sugEstrategico(ctx) {
  const { servicio, institucionNueva, montoNeto } = ctx;
  if (!servicio) return { sugerido: null, justificacion: 'Falta asignar el servicio para estimar el valor del certificado.', datos: {} };
  let pts = servicio.experiencia === 'alta' ? 8 : servicio.experiencia === 'media' ? 5 : 3;
  const razones = [`el servicio deja experiencia ${servicio.experiencia}`];
  if (institucionNueva) { pts += 2; razones.push('es una institución con la que aún no trabajamos'); }
  if (montoNeto != null && montoNeto >= 2000000) { pts = Math.min(10, pts + 1); razones.push('el monto sirve como referencia para licitaciones mayores'); }
  return { sugerido: Math.min(10, pts), justificacion: `Suma porque ${razones.join(' y ')}.`, datos: { experiencia: servicio.experiencia } };
}

const SUGERIDORES = {
  coincidencia: sugCoincidencia,
  acreditacion: sugAcreditacion,
  margen: sugMargen,
  capacidad: sugCapacidad,
  riesgo: sugRiesgo,
  estrategico: sugEstrategico,
};

/**
 * Sugerencia para los seis criterios. Devuelve siempre las seis entradas, con
 * `sugerido: null` donde falte información. NUNCA rellena con ceros.
 */
export function sugerirPuntajes(ctx = {}) {
  return CRITERIOS.map((c) => {
    const r = SUGERIDORES[c.id](ctx) || { sugerido: null, justificacion: '', datos: {} };
    return { criterio: c.id, label: c.label, max: c.max, ...r };
  });
}

/** Preguntas que quedan abiertas antes de poder decidir con este marcador. */
export function preguntasPendientes(sugerencias = []) {
  return sugerencias.filter((s) => s.sugerido == null).map((s) => `${s.label}: ${s.justificacion}`);
}
