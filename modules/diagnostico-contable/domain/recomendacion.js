// modules/diagnostico-contable/domain/recomendacion.js
// RECOMENDACIÓN COMERCIAL Y PRECIO INICIAL — lógica pura.
//
// El precio de esta pantalla es un PUNTO DE PARTIDA, no una cotización. Sale de
// una sola variable (la base de preparación de la información financiera) porque
// es la que determina el alcance mínimo del trabajo. Todo lo demás —tamaño,
// sociedades, períodos, volumen documental— mueve el valor final, y eso se dice
// explícito en pantalla en vez de esconderlo en la letra chica.

import { requiereRevisionEspecializada } from './alertas.js';
import { nivelPorPuntaje } from './puntaje.js';

/** Reglas de precio inicial. Editar acá cambia la propuesta de todo el módulo. */
export const REGLAS_PRECIO = [
  {
    id: 'tributario', uf: 10,
    cuando: (base) => base === 'tributario',
    etiqueta: 'Diagnóstico especializado desde 10 UF',
    motivo: 'La empresa prepara su información mediante balance tributario.',
  },
  {
    id: 'ifrs', uf: 20,
    cuando: (base) => base === 'ifrs' || base === 'ambos',
    etiqueta: 'Diagnóstico especializado desde 20 UF',
    motivo: 'La empresa prepara información bajo normas IFRS/NIIF, lo que amplía el alcance de la revisión.',
  },
  {
    id: 'desconocida', uf: null,
    cuando: (base) => !base || base === 'no_se' || base === 'desconocida',
    etiqueta: 'Valor sujeto a revisión de antecedentes',
    motivo: 'Todavía no se identifica bajo qué norma se prepara la información financiera.',
  },
];

export const ACLARACION_PRECIO =
  'El precio definitivo dependerá del tamaño de la empresa, número de sociedades, ' +
  'períodos revisados, volumen documental, activos, inversiones y complejidad de los ' +
  'hallazgos. Una auditoría externa, regularización o implementación posterior deberá ' +
  'cotizarse según su alcance.';

export const DESCARGO =
  'Este es un prediagnóstico comercial basado en las respuestas declaradas por el ' +
  'cliente. No constituye una auditoría, certificación, informe legal ni dictamen ' +
  'profesional.';

/** Base de preparación normalizada a partir de la respuesta F2. */
export function baseDePreparacion(respuestas = {}) {
  const v = respuestas?.F2;
  if (v === 'ifrs' || v === 'ambos' || v === 'tributario') return v;
  return 'desconocida';
}

/** Precio inicial sugerido según la base de preparación. */
export function precioInicial(respuestas = {}) {
  const base = baseDePreparacion(respuestas);
  const regla = REGLAS_PRECIO.find((r) => r.cuando(base)) || REGLAS_PRECIO[REGLAS_PRECIO.length - 1];
  return {
    base,
    uf: regla.uf,
    reglaId: regla.id,
    etiqueta: regla.etiqueta,
    motivo: regla.motivo,
    aclaracion: ACLARACION_PRECIO,
  };
}

/**
 * Servicio recomendado y próxima acción comercial.
 * Nunca afirma que la empresa está certificada ni libre de contingencias.
 */
export function recomendacionComercial({ respuestas = {}, puntaje = null, alertas = [] } = {}) {
  const precio = precioInicial(respuestas);
  const derivar = requiereRevisionEspecializada(puntaje, alertas);
  const nivel = puntaje === null ? null : nivelPorPuntaje(puntaje);
  const criticas = alertas.filter((a) => a.nivel === 'critico').length;

  let servicio, urgencia, proximaAccion;
  if (criticas > 0) {
    servicio = 'Diagnóstico contable y tributario especializado con Sebastián';
    urgencia = 'prioritaria';
    proximaAccion = 'Agendar la reunión con Sebastián dentro de los próximos 5 días hábiles y solicitar los antecedentes listados.';
  } else if (derivar) {
    servicio = 'Diagnóstico contable y tributario especializado con Sebastián';
    urgencia = 'recomendada';
    proximaAccion = 'Proponer la evaluación especializada y acordar la entrega de antecedentes.';
  } else {
    servicio = 'Revisión preventiva anual';
    urgencia = 'preventiva';
    proximaAccion = 'Ofrecer la revisión preventiva y programar un seguimiento a 6 meses.';
  }

  return {
    derivar,
    servicio,
    urgencia,
    proximaAccion,
    precio,
    nivel: nivel ? nivel.id : null,
    lectura: nivel ? nivel.resumen : 'Faltan respuestas para emitir una lectura preliminar.',
    ctaPrincipal: 'Solicitar evaluación con Sebastián',
    ctaSecundario: 'Generar informe preliminar',
    descargo: DESCARGO,
  };
}
