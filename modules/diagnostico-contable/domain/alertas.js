// modules/diagnostico-contable/domain/alertas.js
// ALERTAS PRIORITARIAS — lógica pura.
//
// Se muestran AUNQUE el puntaje total sea favorable. Es el contrapeso al
// promedio: una empresa puede sacar 88 y aun así tener la contabilidad sin
// regularizar, y ese dato no puede quedar sepultado bajo un número verde.
//
// Cada alerta dice qué se declaró y qué corresponde hacer con eso. Ninguna
// afirma un incumplimiento: son antecedentes declarados que Sebastián valida.

const _sel = (r) => (Array.isArray(r?.T3?.seleccion) ? r.T3.seleccion : []);
const _det = (r) => r?.T3?.detalle || {};

/** ¿Algún elemento del inventario declara falta de control en `campo`? */
function _inventarioSin(r, campo) {
  const detalle = _det(r);
  return _sel(r).filter((s) => s !== 'ninguna' && s !== 'no_se')
    .some((s) => ['no', 'parcial', 'no_se'].includes((detalle[s] || {})[campo]));
}

/**
 * Catálogo de alertas. `cuando(respuestas)` decide si se dispara.
 * nivel: 'critico' (bloquea la lectura favorable) | 'alto' (queda advertido).
 */
export const CATALOGO_ALERTAS = [
  {
    id: 'contabilidad_no_regularizada', nivel: 'critico',
    titulo: 'Contabilidad no regularizada',
    detalle: 'Se declara que la contabilidad no se encuentra regularizada. Es el primer antecedente a revisar: sin base contable confiable, el resto del diagnóstico se apoya en cifras que pueden moverse.',
    cuando: (r) => r?.F1 === 'no_regular',
  },
  {
    id: 'ifrs_sin_auditoria', nivel: 'critico',
    titulo: 'Estados financieros IFRS sin auditoría externa',
    detalle: 'La empresa declara preparar información bajo IFRS sin auditoría externa. Según la metodología definida por Sebastián, esta combinación exige revisión prioritaria.',
    cuando: (r) => (r?.F2 === 'ifrs' || r?.F2 === 'ambos') && r?.F4 === 'no',
  },
  {
    id: 'cmf_no_confirmada', nivel: 'alto',
    titulo: 'Inscripción en la CMF de la auditora no confirmada',
    detalle: 'No se confirma que la firma auditora esté inscrita en el registro de la Comisión para el Mercado Financiero. Es un antecedente a validar con Sebastián antes de sacar cualquier conclusión sobre el trabajo realizado.',
    cuando: (r) => r?.F6 === 'no' || r?.F6 === 'no_se',
  },
  {
    id: 'opinion_adversa', nivel: 'critico',
    titulo: 'Última opinión del auditor: adversa',
    detalle: 'El auditor externo concluyó que los estados financieros no están razonablemente presentados. Requiere revisión especializada.',
    cuando: (r) => r?.F7 === 'adversa',
  },
  {
    id: 'abstencion_opinion', nivel: 'critico',
    titulo: 'Última opinión del auditor: abstención',
    detalle: 'El auditor no pudo obtener evidencia suficiente para pronunciarse sobre los estados financieros. Requiere revisión especializada.',
    cuando: (r) => r?.F7 === 'abstencion',
  },
  {
    id: 'hallazgos_sin_plan', nivel: 'alto',
    titulo: 'Hallazgos de auditoría sin plan de corrección',
    detalle: 'Existen observaciones de auditorías anteriores sin un plan de corrección asociado.',
    cuando: (r) => r?.F8 === 'sin_plan',
  },
  {
    id: 'ingresos_no_contabilizados', nivel: 'critico',
    titulo: 'Ingresos o inversiones sin contabilizar o sin declarar',
    detalle: 'Se declaran inversiones o ingresos adicionales que no están contabilizados, no están incorporados en las declaraciones tributarias, o cuyo tratamiento se desconoce.',
    cuando: (r) => _inventarioSin(r, 'contabilizado') || _inventarioSin(r, 'declarado'),
  },
  {
    id: 'inversiones_sin_respaldo', nivel: 'alto',
    titulo: 'Inversiones sin documentación de respaldo',
    detalle: 'Se declaran inversiones o ingresos adicionales sin documentación de respaldo suficiente.',
    cuando: (r) => _inventarioSin(r, 'respaldo'),
  },
  {
    id: 'inversiones_desconocidas', nivel: 'alto',
    titulo: 'Se desconoce si existen otros ingresos o inversiones',
    detalle: 'La empresa no puede confirmar si mantiene inversiones o ingresos distintos de su actividad principal.',
    cuando: (r) => _sel(r).includes('no_se'),
  },
  {
    id: 'relacionadas_sin_respaldo', nivel: 'critico',
    titulo: 'Operaciones con relacionados sin respaldo suficiente',
    detalle: 'Se declaran operaciones entre la empresa, sus socios o sociedades relacionadas sin documentación de respaldo suficiente.',
    cuando: (r) => r?.T8 === 'sin_respaldo',
  },
  {
    id: 'relacionadas_parciales', nivel: 'alto',
    titulo: 'Operaciones con relacionados con documentación parcial',
    detalle: 'Las operaciones con socios o sociedades relacionadas cuentan con documentación solo parcial.',
    cuando: (r) => r?.T8 === 'parcial',
  },
  {
    id: 'estructura_desconocida', nivel: 'alto',
    titulo: 'Estructura societaria o beneficiarios finales desconocidos',
    detalle: 'No se conoce con precisión la participación de los socios, la identidad de los beneficiarios finales o la estructura no está documentada.',
    cuando: (r) => ['no', 'no_se'].includes(r?.T7A) || ['no', 'no_se'].includes(r?.T7B)
      || ['no', 'no_se'].includes(r?.T7D) || r?.T7 === 'no_se' || r?.T6 === 'no_se',
  },
  {
    id: 'regimen_desconocido', nivel: 'alto',
    titulo: 'Régimen tributario desconocido',
    detalle: 'No se identifica el régimen tributario vigente. No es un incumplimiento en sí, pero impide evaluar la carga impositiva y las obligaciones que aplican.',
    cuando: (r) => r?.T1 === 'no_se',
  },
  {
    id: 'base_desconocida', nivel: 'alto',
    titulo: 'Base de preparación de la información financiera desconocida',
    detalle: 'No se identifica bajo qué norma se prepara la información financiera. El alcance y el valor de la revisión quedan sujetos a la revisión de antecedentes.',
    cuando: (r) => r?.F2 === 'no_se',
  },
];

/** Alertas disparadas por estas respuestas, las críticas primero. */
export function generarAlertas(respuestas = {}) {
  const orden = { critico: 0, alto: 1 };
  return CATALOGO_ALERTAS
    .filter((a) => { try { return !!a.cuando(respuestas); } catch { return false; } })
    .map(({ id, nivel, titulo, detalle }) => ({ id, nivel, titulo, detalle }))
    .sort((a, b) => orden[a.nivel] - orden[b.nivel]);
}

export function resumenAlertas(alertas = []) {
  return {
    total: alertas.length,
    criticas: alertas.filter((a) => a.nivel === 'critico').length,
    altas: alertas.filter((a) => a.nivel === 'alto').length,
  };
}

/**
 * ¿Corresponde derivar a la asesoría especializada de Sebastián?
 * Se recomienda cuando hay cualquier alerta prioritaria o cuando el puntaje
 * baja de 85 — es decir, siempre que no sea una condición limpia.
 */
export function requiereRevisionEspecializada(puntaje, alertas = []) {
  if (alertas.some((a) => a.nivel === 'critico')) return true;
  if (alertas.length > 0) return true;
  return puntaje !== null && puntaje < 85;
}
