// modules/diagnostico-contable/domain/puntaje.js
// MOTOR DE PUNTAJE — lógica pura, sin DOM y sin Supabase (testeada en node).
//
// Fórmula:  Puntaje = puntos obtenidos / máximo aplicable × 100
//
// El "máximo aplicable" excluye las preguntas que no corresponden al recorrido
// de la empresa (una empresa con balance tributario no arrastra el peso de la
// rama IFRS) y las que todavía no se responden. Un diagnóstico a medias muestra
// el puntaje de lo respondido, no un porcentaje diluido por lo que falta.
//
// Regla que sostiene todo el instrumento: un "No lo sé" vale 0 puntos, pero se
// CUENTA APARTE. No es lo mismo una empresa que responde "no está regularizada"
// que una donde nadie sabe: la primera tiene un problema, la segunda tiene un
// problema y además no lo ve. Ambas puntúan 0; solo la segunda suma desconocidas.

import { PREGUNTAS, PUNTOS_MAX, aplica, preguntaPorId } from './cuestionario.js';

/** Umbrales de interpretación. Editar acá cambia toda la lectura del módulo. */
export const NIVELES = [
  { id: 'favorable',     min: 85, max: 100, label: 'Salud favorable',
    resumen: 'De acuerdo con la información declarada, la empresa presenta una condición preliminar favorable.',
    color: 'var(--green)' },
  { id: 'observaciones', min: 70, max: 84,  label: 'Condición estable con observaciones',
    resumen: 'De acuerdo con la información declarada, la empresa presenta una condición estable con observaciones que conviene revisar.',
    color: '#7FA85A' },
  { id: 'relevante',     min: 50, max: 69,  label: 'Riesgo relevante',
    resumen: 'De acuerdo con la información declarada, se identifican brechas relevantes que ameritan una revisión especializada.',
    color: 'var(--amber)' },
  { id: 'alto',          min: 0,  max: 49,  label: 'Riesgo alto',
    resumen: 'De acuerdo con la información declarada, se identifican brechas significativas que requieren una revisión especializada prioritaria.',
    color: 'var(--danger)' },
];

export const nivelPorPuntaje = (p) =>
  NIVELES.find((n) => p >= n.min && p <= n.max) || NIVELES[NIVELES.length - 1];
export const nivelMeta = (id) => NIVELES.find((n) => n.id === id) || null;

/** Control declarado sobre un elemento del inventario (T3). */
export const CONTROL = [
  { v: 'si',      label: 'Sí',              puntos: 3 },
  { v: 'parcial', label: 'Parcialmente',    puntos: 1 },
  { v: 'no',      label: 'No',              puntos: 0 },
  { v: 'no_se',   label: 'No lo sé',        puntos: 0, desconocido: true },
];
const _control = (v) => CONTROL.find((c) => c.v === v) || null;

const _round = (n) => Math.round(n * 100) / 100;

/**
 * Puntos (0..3) de una pregunta, o null si todavía no se puede calificar.
 * `null` NO es cero: la pregunta queda fuera del numerador Y del denominador.
 */
export function puntosDe(pregunta, respuestas = {}) {
  if (!pregunta || !pregunta.peso) return null;
  const v = respuestas?.[pregunta.id];

  if (pregunta.tipo === 'inventario') return _puntosInventario(pregunta, v);

  if (v === null || v === undefined || v === '') return null;
  const op = (pregunta.opciones || []).find((o) => o.v === v);
  if (!op) return null;
  return typeof op.puntos === 'number' ? op.puntos : null;
}

/**
 * T3 · Otros ingresos e inversiones.
 *   "Sin inversiones"  → 3 (no hay nada que controlar mal).
 *   "No lo sé"         → 0 (desconocimiento sobre el patrimonio de la empresa).
 *   Con elementos      → promedio del CONTROL declarado (contabilizado, declarado,
 *                        respaldado) de todos los elementos marcados.
 * Tener inversiones nunca resta por sí solo: lo que se mide es el control.
 * Si hay elementos marcados pero ningún antecedente de control respondido,
 * devuelve null (todavía no hay con qué calificar).
 */
function _puntosInventario(pregunta, v) {
  const seleccion = Array.isArray(v?.seleccion) ? v.seleccion : [];
  if (!seleccion.length) return null;
  if (seleccion.includes('ninguna')) return 3;
  if (seleccion.includes('no_se')) return 0;

  const claves = (pregunta.subcampos || []).filter((s) => s.puntua).map((s) => s.id);
  const detalle = v?.detalle || {};
  let suma = 0, n = 0;
  seleccion.forEach((sel) => {
    const d = detalle[sel] || {};
    claves.forEach((k) => {
      const c = _control(d[k]);
      if (c) { suma += c.puntos; n++; }
    });
  });
  return n ? _round(suma / n) : null;
}

/** ¿Esta respuesta es un "No lo sé" declarado? (incluye los subcampos de T3) */
export function esDesconocida(pregunta, respuestas = {}) {
  const v = respuestas?.[pregunta.id];
  if (pregunta.tipo === 'inventario') {
    const seleccion = Array.isArray(v?.seleccion) ? v.seleccion : [];
    if (seleccion.includes('no_se')) return true;
    const detalle = v?.detalle || {};
    return seleccion.some((sel) => Object.values(detalle[sel] || {}).some((x) => x === 'no_se'));
  }
  if (Array.isArray(v)) return v.includes('no_se');
  const op = (pregunta.opciones || []).find((o) => o.v === v);
  return !!op?.desconocido;
}

/**
 * Calcula el puntaje general y los subpuntajes.
 *
 * Devuelve, además del número, el DETALLE por pregunta: sin él, un 62% es un
 * número que nadie puede defender frente a un gerente de finanzas.
 */
export function calcularPuntaje(respuestas = {}) {
  const detalle = [];
  const acum = {
    general:    { obtenido: 0, maximo: 0 },
    financiera: { obtenido: 0, maximo: 0 },
    tributaria: { obtenido: 0, maximo: 0 },
  };
  const desconocidas = [];
  const fortalezas = [];
  const debilidades = [];

  PREGUNTAS.forEach((p) => {
    if (!aplica(p, respuestas)) return;
    if (esDesconocida(p, respuestas)) desconocidas.push(p.id);
    if (!p.peso) return;

    const puntos = puntosDe(p, respuestas);
    const fila = {
      id: p.id, texto: p.texto, etapa: p.etapa, bloque: p.bloque || '',
      peso: p.peso, puntos, maximo: PUNTOS_MAX,
      ponderado: puntos === null ? null : _round(puntos * p.peso),
      ponderadoMax: p.peso * PUNTOS_MAX,
      respondida: puntos !== null,
    };
    detalle.push(fila);
    if (puntos === null) return;               // sin responder: fuera del cálculo

    acum.general.obtenido += fila.ponderado;
    acum.general.maximo   += fila.ponderadoMax;
    if (acum[p.etapa]) {
      acum[p.etapa].obtenido += fila.ponderado;
      acum[p.etapa].maximo   += fila.ponderadoMax;
    }
    if (puntos >= 3) fortalezas.push(p.id);
    else if (puntos <= 1) debilidades.push(p.id);
  });

  const pct = (a) => (a.maximo > 0 ? Math.round((a.obtenido / a.maximo) * 100) : null);
  const general = pct(acum.general);

  return {
    general,
    financiero: pct(acum.financiera),
    tributario: pct(acum.tributaria),
    nivel: general === null ? null : nivelPorPuntaje(general).id,
    detalle,
    desconocidas,
    fortalezas,
    debilidades,
    cobertura: {
      evaluadas: detalle.filter((d) => d.respondida).length,
      aplicables: detalle.length,
      puntosObtenidos: _round(acum.general.obtenido),
      puntosMaximos: acum.general.maximo,
    },
  };
}

/** Progreso del levantamiento sobre TODAS las preguntas aplicables (no solo las que puntúan). */
export function progreso(respuestas = {}) {
  const aplicables = PREGUNTAS.filter((p) => aplica(p, respuestas) && !p.oculta);
  const hechas = aplicables.filter((p) => {
    const v = respuestas?.[p.id];
    if (v === null || v === undefined || v === '') return false;
    if (Array.isArray(v)) return v.length > 0;
    if (p.tipo === 'inventario') return Array.isArray(v?.seleccion) && v.seleccion.length > 0;
    return true;
  }).length;
  return { hechas, total: aplicables.length, pct: aplicables.length ? Math.round((hechas / aplicables.length) * 100) : 0 };
}

/** Texto legible de las fortalezas, para el resultado y el informe. */
export function textoFortalezas(respuestas = {}, limite = 6) {
  const { fortalezas } = calcularPuntaje(respuestas);
  return fortalezas.map((id) => _frase(id, respuestas)).filter(Boolean).slice(0, limite);
}

/** Texto legible de las brechas detectadas (débiles o en cero). */
export function textoBrechas(respuestas = {}, limite = 8) {
  const { debilidades } = calcularPuntaje(respuestas);
  return debilidades.map((id) => _frase(id, respuestas)).filter(Boolean).slice(0, limite);
}

function _frase(id, respuestas) {
  const p = preguntaPorId(id);
  if (!p) return '';
  if (p.tipo === 'inventario') return p.bloque || p.texto;
  const v = respuestas?.[id];
  const op = (p.opciones || []).find((o) => o.v === v);
  const titulo = p.bloque || p.texto;
  return op ? `${titulo}: ${op.label.toLowerCase()}` : titulo;
}

/**
 * Antecedentes que corresponde solicitar antes de la revisión especializada.
 * Salen de lo que quedó débil o desconocido: es la lista concreta con la que el
 * ejecutivo cierra la reunión.
 */
export const ANTECEDENTES = {
  F1: 'Balances y libros contables de los últimos tres períodos.',
  F2: 'Estados financieros del último cierre (indicando bajo qué norma se prepararon).',
  F3B: 'Política contable de moneda funcional y de conversión.',
  F4: 'Informe de auditoría externa del último período.',
  F6: 'Antecedentes de la firma auditora y su inscripción en el registro de la CMF.',
  F7: 'Dictamen del auditor externo del último período.',
  F8: 'Carta de recomendaciones del auditor y estado de las observaciones anteriores.',
  T1: 'Certificado de situación tributaria y régimen vigente ante el SII.',
  T2_evolucion: 'Formularios 29 y 22 de los últimos tres años.',
  T3: 'Cartolas, certificados de inversiones y su registro contable y tributario.',
  T5: 'Facturas de activo fijo y cálculo del crédito del artículo 33 bis, si corresponde.',
  T6: 'Escritura de constitución y sus modificaciones.',
  T7A: 'Registro de accionistas o socios vigente.',
  T7B: 'Declaración de beneficiarios finales.',
  T7D: 'Organigrama societario actualizado.',
  T8: 'Contratos, respaldos y registro contable de las operaciones con relacionados.',
};

export function antecedentesASolicitar(respuestas = {}) {
  const { detalle, desconocidas } = calcularPuntaje(respuestas);
  const ids = new Set();
  detalle.forEach((d) => { if (d.respondida && d.puntos <= 2) ids.add(d.id); });
  desconocidas.forEach((id) => ids.add(id));
  return [...ids].map((id) => ANTECEDENTES[id]).filter(Boolean);
}
