// modules/oportunidades/domain/analitica.js — EMBUDO Y MÉTRICAS (lógica pura).
//
// Lo que el canal tiene que responder al día 90: ¿ofertamos poco o mal?
// ¿el filtro está bien calibrado? ¿el precio está fuera de mercado?
//
// Sin promesas: si no hay datos suficientes, la métrica devuelve null y la
// vista muestra "—", nunca un 0% que parezca un resultado.

import { ETAPAS_EMBUDO } from './estados.js';

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const prom = (arr) => (arr.length ? Math.round(arr.reduce((s, x) => s + x, 0) / arr.length) : null);

// Estados que implican haber pasado por cada etapa del embudo (acumulativo).
const ANALIZADAS = new Set(['en_analisis', 'requiere_aclaracion', 'recomendada', 'no_recomendada',
  'pendiente_aprobacion', 'aprobada', 'oferta_preparacion', 'lista_presentar', 'presentada',
  'adjudicada', 'no_adjudicada', 'orden_recibida', 'en_ejecucion', 'recepcion_conforme',
  'facturada', 'pagada', 'certificado_solicitado', 'certificado_obtenido', 'cerrada']);
const PRESENTADAS = new Set(['presentada', 'adjudicada', 'no_adjudicada', 'orden_recibida',
  'en_ejecucion', 'recepcion_conforme', 'facturada', 'pagada', 'certificado_solicitado',
  'certificado_obtenido']);
const ADJUDICADAS = new Set(['adjudicada', 'orden_recibida', 'en_ejecucion', 'recepcion_conforme',
  'facturada', 'pagada', 'certificado_solicitado', 'certificado_obtenido']);
const PAGADAS = new Set(['pagada', 'certificado_solicitado', 'certificado_obtenido']);

/**
 * Hitos que una oportunidad efectivamente alcanzó.
 *
 * No basta con mirar el estado actual: "cerrada" es terminal y borra el rastro
 * del camino recorrido. Una oportunidad ganada, cobrada y certificada termina
 * en "cerrada", y si el embudo solo mirara el estado, desaparecería de TODAS
 * las etapas anteriores. Por eso el camino se reconstruye desde el resultado
 * registrado, que es el que guarda la evidencia.
 */
function hitos(op, resultado) {
  const e = op.estado;
  const r = resultado || null;
  const h = {
    analizada:   ANALIZADAS.has(e),
    presentada:  PRESENTADAS.has(e),
    adjudicada:  ADJUDICADAS.has(e),
    pagada:      PAGADAS.has(e),
    certificada: e === 'certificado_obtenido',
  };
  if (r) {
    if (r.adjudicada != null)                 { h.presentada = true; h.analizada = true; }
    if (r.adjudicada === true)                 h.adjudicada = true;
    if (r.pagoReal)                            h.pagada = true;
    if (r.certificadoEstado === 'obtenido')    h.certificada = true;
  }
  return h;
}

/** Embudo: Detectadas → Aptas → Analizadas → Presentadas → Adjudicadas → Pagadas → Certificadas. */
export function calcularEmbudo(oportunidades = [], resultados = []) {
  const resById = Object.fromEntries((resultados || []).map((r) => [r.oportunidadId, r]));
  const marcas = oportunidades.map((o) => hitos(o, resById[o.id]));
  const c = {
    detectadas: oportunidades.length,
    aptas: oportunidades.filter((o) => o.recomendacion === 'participar' || o.recomendacion === 'revisar').length,
    analizadas: marcas.filter((m) => m.analizada).length,
    presentadas: marcas.filter((m) => m.presentada).length,
    adjudicadas: marcas.filter((m) => m.adjudicada).length,
    pagadas: marcas.filter((m) => m.pagada).length,
    certificadas: marcas.filter((m) => m.certificada).length,
  };
  return ETAPAS_EMBUDO.map((e) => ({
    ...e,
    valor: c[e.id],
    pct: c.detectadas ? Math.round((c[e.id] / c.detectadas) * 100) : 0,
  }));
}

/**
 * Métricas del canal.
 * @param {object} datos { oportunidades, resultados, cotizaciones }
 *   - cotizaciones: { [opId]: {precioNeto, costoBase, utilidad, margenReal, totalHoras} }
 */
export function calcularMetricas(datos = {}) {
  const { oportunidades = [], resultados = [], cotizaciones = {} } = datos;
  const resById = Object.fromEntries(resultados.map((r) => [r.oportunidadId, r]));

  // Mismo criterio que el embudo: cuenta el camino recorrido, no el estado actual.
  const presentadas = oportunidades.filter((o) => hitos(o, resById[o.id]).presentada);
  const adjudicadas = oportunidades.filter((o) => hitos(o, resById[o.id]).adjudicada);
  const descartadas = oportunidades.filter((o) => ['descartada', 'descartada_auto'].includes(o.estado));

  const montosAdj = adjudicadas
    .map((o) => num(resById[o.id]?.montoAdjudicado) || num(cotizaciones[o.id]?.precioNeto))
    .filter((x) => x > 0);

  const margenes = Object.values(cotizaciones).map((c) => c?.margenReal).filter((m) => m != null);

  const facturado = resultados.reduce((s, r) => s + num(r.facturaMonto), 0);
  const cobrado   = resultados.filter((r) => r.pagoReal).reduce((s, r) => s + num(r.facturaMonto), 0);
  const utilEstim = adjudicadas.reduce((s, o) => s + num(cotizaciones[o.id]?.utilidad), 0);
  const utilReal  = resultados.reduce((s, r) => s + num(r.utilidadReal), 0);

  // Días reales de pago (solo donde hay factura y pago con fecha).
  const diasPago = resultados
    .filter((r) => r.facturaFecha && r.pagoReal)
    .map((r) => Math.round((new Date(r.pagoReal) - new Date(r.facturaFecha)) / 86400000))
    .filter((d) => Number.isFinite(d) && d >= 0);

  // Horas por cotización: el tiempo invertido en las que llegaron a presentarse.
  const horasCot = presentadas.map((o) => num(o.tiempoInvertidoMin) / 60).filter((h) => h > 0);

  const capitalComprometido = oportunidades
    .filter((o) => ['orden_recibida', 'en_ejecucion', 'recepcion_conforme', 'facturada'].includes(o.estado))
    .reduce((s, o) => s + num(cotizaciones[o.id]?.capitalTrabajo), 0);

  return {
    detectadas: oportunidades.length,
    aptas: oportunidades.filter((o) => o.recomendacion === 'participar').length,
    descartadas: descartadas.length,
    presentadas: presentadas.length,
    adjudicadas: adjudicadas.length,
    tasaExito: presentadas.length ? Math.round((adjudicadas.length / presentadas.length) * 100) : null,
    ticketPromedio: prom(montosAdj),
    margenPromedio: margenes.length ? Math.round((margenes.reduce((s, m) => s + m, 0) / margenes.length) * 1000) / 10 : null,
    facturadoNeto: facturado,
    cobrado,
    porCobrar: facturado - cobrado,
    utilidadEstimada: utilEstim,
    utilidadReal: utilReal,
    horasPorCotizacion: horasCot.length ? Math.round((horasCot.reduce((s, h) => s + h, 0) / horasCot.length) * 10) / 10 : null,
    diasPagoPromedio: prom(diasPago),
    facturasPendientes: resultados.filter((r) => r.facturaNumero && !r.pagoReal).length,
    certificados: oportunidades.filter((o) => hitos(o, resById[o.id]).certificada).length,
    capitalComprometido,
  };
}

/** Ranking genérico: agrupa por una clave y ordena por adjudicaciones. */
export function agrupar(oportunidades = [], clave, { cotizaciones = {} } = {}) {
  const map = new Map();
  oportunidades.forEach((o) => {
    const vals = Array.isArray(o[clave]) ? o[clave] : [o[clave]];
    vals.filter((v) => v != null && v !== '').forEach((v) => {
      const k = String(v);
      const row = map.get(k) || { clave: k, presentadas: 0, adjudicadas: 0, total: 0, monto: 0 };
      row.total++;
      if (PRESENTADAS.has(o.estado)) row.presentadas++;
      if (ADJUDICADAS.has(o.estado)) { row.adjudicadas++; row.monto += num(cotizaciones[o.id]?.precioNeto); }
      map.set(k, row);
    });
  });
  return [...map.values()]
    .map((r) => ({ ...r, tasa: r.presentadas ? Math.round((r.adjudicadas / r.presentadas) * 100) : null }))
    .sort((a, b) => b.adjudicadas - a.adjudicadas || b.total - a.total);
}

/** Conteo de motivos de descarte, para saber si el filtro está bien calibrado. */
export function motivosDescarte(oportunidades = [], riesgos = []) {
  const map = new Map();
  riesgos.filter((r) => r.esCausal && r.causal).forEach((r) => {
    map.set(r.causal, (map.get(r.causal) || 0) + 1);
  });
  const sinCausal = oportunidades.filter((o) =>
    ['descartada', 'descartada_auto'].includes(o.estado) &&
    !riesgos.some((r) => r.oportunidadId === o.id && r.esCausal)).length;
  const out = [...map.entries()].map(([causal, n]) => ({ causal, n })).sort((a, b) => b.n - a.n);
  if (sinCausal) out.push({ causal: 'sin_causal_registrada', n: sinCausal });
  return out;
}

/** Motivos de pérdida declarados al registrar el resultado. */
export function motivosPerdida(resultados = []) {
  const map = new Map();
  resultados.filter((r) => r.adjudicada === false && r.motivoPerdida).forEach((r) => {
    const k = String(r.motivoPerdida).trim();
    map.set(k, (map.get(k) || 0) + 1);
  });
  return [...map.entries()].map(([motivo, n]) => ({ motivo, n })).sort((a, b) => b.n - a.n);
}

/**
 * Precio ofertado vs precio ganador, donde el dato exista.
 * `brecha` positiva = ofertamos MÁS caro que quien ganó.
 */
export function comparativoPrecios(resultados = [], cotizaciones = {}) {
  return resultados
    .filter((r) => r.adjudicada === false && num(r.precioGanador) > 0 && num(cotizaciones[r.oportunidadId]?.precioNeto) > 0)
    .map((r) => {
      const nuestro = num(cotizaciones[r.oportunidadId].precioNeto);
      const ganador = num(r.precioGanador);
      return {
        oportunidadId: r.oportunidadId,
        nuestro, ganador,
        brecha: nuestro - ganador,
        brechaPct: Math.round(((nuestro - ganador) / ganador) * 1000) / 10,
      };
    })
    .sort((a, b) => b.brechaPct - a.brechaPct);
}
