// modules/oportunidades/domain/aprobaciones.js — APROBACIONES INTERNAS (lógica pura).
//
// Tríada son tres socios y cada uno mira algo distinto. Ninguna oferta sale sin
// las tres firmas: comercial (¿nos sirve?), técnica (¿se puede hacer?) y
// financiera (¿deja plata y están los papeles?).
//
// El §11 del encargo agrega condiciones que hacen la revisión INELUDIBLE
// (margen bajo, monto alto, subcontrato, riesgo alto). No cambian a quién hay
// que pedirle la firma —siempre son los tres— pero sí se muestran, para que
// nadie firme sin ver por qué esta oportunidad está marcada.

export const AREAS = [
  {
    id: 'comercial', label: 'Comercial', responsable: 'Martín',
    checklist: [
      'La oportunidad es estratégica para Tríada.',
      'El comprador y el servicio son adecuados.',
      'La oferta se presentará dentro del plazo.',
      'Los antecedentes comerciales están completos.',
    ],
  },
  {
    id: 'tecnica', label: 'Técnica', responsable: 'Socio TI',
    checklist: [
      'El alcance se entiende.',
      'Las horas estimadas son suficientes.',
      'El plazo es viable.',
      'La solución puede ejecutarse con el equipo actual.',
      'Los riesgos técnicos están identificados.',
    ],
  },
  {
    id: 'financiera', label: 'Financiera y documental', responsable: 'Socia contable',
    checklist: [
      'Los costos son correctos.',
      'El margen cumple el mínimo.',
      'El IVA está bien calculado.',
      'Existe capital de trabajo para financiar la ejecución.',
      'Los documentos del proveedor están vigentes.',
      'La facturación es posible con los giros actuales.',
    ],
  },
];

export const areaMeta  = (id) => AREAS.find((a) => a.id === id) || null;
export const areaLabel = (id) => areaMeta(id)?.label || id || '—';

/**
 * Qué firmas se necesitan y por qué esta oportunidad no admite atajos.
 *
 * @param {object} ctx { margenReal, precioNeto, tieneSubcontrato, riesgoAlto, topeTresSocios, margenObjetivo }
 */
export function aprobacionesRequeridas(ctx = {}) {
  const {
    margenReal = null, precioNeto = 0, tieneSubcontrato = false, riesgoAlto = false,
    topeTresSocios = 2500000, margenObjetivo = 0.30,
  } = ctx;

  const motivos = [];
  if (margenReal != null && margenReal < margenObjetivo) motivos.push(`El margen estimado (${Math.round(margenReal * 1000) / 10}%) está bajo el ${Math.round(margenObjetivo * 100)}% objetivo.`);
  if (Number(precioNeto) > topeTresSocios) motivos.push(`El proyecto supera los $${Number(topeTresSocios).toLocaleString('es-CL')} netos.`);
  if (tieneSubcontrato) motivos.push('Hay subcontratación involucrada.');
  if (riesgoAlto) motivos.push('Está clasificado como de alto riesgo.');

  return { areas: AREAS.map((a) => a.id), motivos, reforzada: motivos.length > 0 };
}

/**
 * Estado del trámite de aprobación.
 * `completa` = las tres áreas firmaron y ninguna rechazó.
 */
export function estadoAprobacion(aprobaciones = [], requeridas = AREAS.map((a) => a.id)) {
  const porArea = {};
  requeridas.forEach((id) => { porArea[id] = aprobaciones.find((a) => a.area === id) || null; });

  const firmadas  = requeridas.filter((id) => !!porArea[id]);
  const rechazos  = requeridas.filter((id) => porArea[id]?.decision === 'rechaza');
  const reparos   = requeridas.filter((id) => porArea[id]?.decision === 'aprueba_con_reparos');
  const faltantes = requeridas.filter((id) => !porArea[id]);

  return {
    porArea,
    firmadas: firmadas.length,
    total: requeridas.length,
    faltantes,
    rechazos,
    reparos,
    completa: faltantes.length === 0 && rechazos.length === 0,
    bloqueada: rechazos.length > 0,
    resumen: rechazos.length
      ? `Rechazada por ${rechazos.map(areaLabel).join(', ')}.`
      : faltantes.length
        ? `Faltan ${faltantes.length} de ${requeridas.length} firmas: ${faltantes.map(areaLabel).join(', ')}.`
        : reparos.length
          ? `Aprobada con reparos de ${reparos.map(areaLabel).join(', ')}.`
          : 'Aprobada por las tres áreas.',
  };
}

/**
 * ¿Se puede pasar a "Aprobada para participar"? Sin las tres firmas, no.
 * Devuelve { ok, error } (mismo contrato que estados.validarTransicion).
 */
export function puedeAprobar(aprobaciones = [], requeridas = AREAS.map((a) => a.id)) {
  const st = estadoAprobacion(aprobaciones, requeridas);
  if (st.bloqueada) return { ok: false, error: st.resumen };
  if (!st.completa) return { ok: false, error: st.resumen };
  return { ok: true, error: null };
}
