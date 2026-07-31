// modules/oportunidades/domain/finanzas.js — CALCULADORA DE LA OFERTA (lógica pura).
//
// La regla del documento de decisión: se parte por las HORAS, no por el precio.
//   costo de horas → + costos directos → + contingencia → margen objetivo → IVA.
//
// Y la distinción que más plata cuesta cuando se olvida:
//   · Monto bruto facturado ≠ ingreso. El IVA nunca fue de Tríada.
//   · El trabajo de los socios NO es utilidad. Si no se valoriza, todo proyecto
//     "da ganancia" y los que no pagan el tiempo que consumen pasan colados.
//
// Todo redondeado a pesos enteros (CLP no tiene decimales).

export const IVA_TASA = 0.19;
export const MARGEN_OBJETIVO = 0.30;   // mínimo aceptable
export const MARGEN_DESCARTE = 0.25;   // bajo esto es causal crítica (§9)
export const TOPE_TRES_SOCIOS = 2500000; // neto sobre el cual firman los tres

// Coerción tolerante al formato chileno. El punto es AMBIGUO: en "16.000" es
// separador de miles (CLP no tiene decimales) y en "12.5" es decimal de horas.
// Se resuelve por forma: grupos de tres dígitos ⇒ miles; cualquier otra cosa ⇒
// decimal. Sin esto, un valor por hora tipeado como "16.000" entra como 16 y la
// cotización queda mil veces más barata, en silencio.
const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').replace(/[^\d.,-]/g, '').trim();
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');   // "16.000,50" → "16000.50"
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); // "16.000" → "16000"
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const round = (n) => Math.round(n);

/** Costo de un ítem: las horas se valorizan; el resto es su monto. */
export function costoItem(item) {
  if (!item) return 0;
  if (item.tipo === 'hora') return round(num(item.horas) * num(item.valorHora));
  return round(num(item.monto));
}

/**
 * Cotización completa a partir de los ítems y los parámetros.
 *
 * @param {object} input
 *  - items: [{tipo, horas, valorHora, monto, diasAntesPago, rol}]
 *  - margenObjetivo, contingenciaPct, costosAdminPct, ivaTasa: fracciones (0.30 = 30%)
 *  - precioOfertado: si se fija a mano, manda sobre el sugerido
 *  - presupuestoComprador: tope publicado por la institución (neto)
 *  - presupuestoIncluyeIva: 'neto' | 'con_iva' | 'desconocido'
 *  - diasPagoEstimados: para dimensionar el capital de trabajo
 */
export function calcularCotizacion(input = {}) {
  const {
    items = [],
    margenObjetivo = MARGEN_OBJETIVO,
    contingenciaPct = 0.10,
    costosAdminPct = 0,
    ivaTasa = IVA_TASA,
    precioOfertado = null,
    presupuestoComprador = null,
    presupuestoIncluyeIva = 'desconocido',
    diasPagoEstimados = 30,
    topeTresSocios = TOPE_TRES_SOCIOS,
    margenDescarte = MARGEN_DESCARTE,
  } = input;

  const lista = Array.isArray(items) ? items : [];
  const horas    = lista.filter((i) => i.tipo === 'hora');
  const noHoras  = lista.filter((i) => i.tipo !== 'hora');

  const totalHoras   = round(horas.reduce((s, i) => s + num(i.horas), 0) * 100) / 100;
  const costoHoras   = horas.reduce((s, i) => s + costoItem(i), 0);
  const costosDirectos = noHoras.reduce((s, i) => s + costoItem(i), 0);
  const subtotal     = costoHoras + costosDirectos;
  const contingencia = round(subtotal * num(contingenciaPct));
  const costosAdmin  = round(subtotal * num(costosAdminPct));
  const costoBase    = subtotal + contingencia + costosAdmin;

  // Precio neto que deja el margen objetivo. Con margen ≥ 100% la fórmula
  // explota (división por cero o negativo): se acota y se avisa.
  const mo = Math.min(Math.max(num(margenObjetivo), 0), 0.95);
  const precioSugerido = costoBase > 0 ? round(costoBase / (1 - mo)) : 0;

  const precioNeto = precioOfertado != null && precioOfertado !== '' ? round(num(precioOfertado)) : precioSugerido;
  const iva        = round(precioNeto * num(ivaTasa));
  const precioTotal = precioNeto + iva;

  const utilidad  = precioNeto - costoBase;
  const margenReal = precioNeto > 0 ? utilidad / precioNeto : null;

  // Capital de trabajo: lo que SALE de caja antes de que el Estado pague.
  // Las horas de los socios no salen de caja (son valorización del tiempo), así
  // que no entran salvo que el ítem sea un subcontrato o una compra.
  const capitalTrabajo = noHoras.reduce((s, i) => s + costoItem(i), 0);

  // Comparación con el presupuesto del comprador, en la MISMA base.
  let excedePresupuesto = null;
  let presupuestoNeto = null;
  if (presupuestoComprador != null && presupuestoComprador !== '') {
    const p = num(presupuestoComprador);
    presupuestoNeto = presupuestoIncluyeIva === 'con_iva' ? round(p / (1 + num(ivaTasa))) : p;
    excedePresupuesto = precioNeto > presupuestoNeto;
  }

  const tieneSubcontrato = noHoras.some((i) => i.tipo === 'subcontrato');

  const alertas = [];
  if (!lista.length) alertas.push({ nivel: 'info', codigo: 'sin_items', texto: 'Aún no hay horas ni costos cargados: el precio todavía no significa nada.' });
  if (margenReal != null && margenReal < margenDescarte) {
    alertas.push({ nivel: 'critico', codigo: 'margen_descarte', texto: `Margen real ${pct(margenReal)} — bajo ${pct(margenDescarte)} es causal de descarte.` });
  } else if (margenReal != null && margenReal < MARGEN_OBJETIVO) {
    alertas.push({ nivel: 'alto', codigo: 'margen_bajo', texto: `Margen real ${pct(margenReal)} — bajo el 30% objetivo: lo firman los tres socios.` });
  }
  if (excedePresupuesto) alertas.push({ nivel: 'alto', codigo: 'excede_presupuesto', texto: 'El precio neto supera el presupuesto del comprador.' });
  if (presupuestoIncluyeIva === 'desconocido' && presupuestoComprador) {
    alertas.push({ nivel: 'medio', codigo: 'iva_desconocido', texto: 'No está confirmado si el presupuesto publicado incluye IVA: verificar en las bases antes de ofertar.' });
  }
  if (precioNeto > topeTresSocios) alertas.push({ nivel: 'medio', codigo: 'monto_alto', texto: `Sobre ${fmt(topeTresSocios)} neto: requiere la aprobación de los tres socios.` });
  if (tieneSubcontrato) alertas.push({ nivel: 'medio', codigo: 'subcontrato', texto: 'Hay subcontratación: requiere la aprobación de los tres socios.' });
  if (contingencia === 0 && subtotal > 0) alertas.push({ nivel: 'medio', codigo: 'sin_contingencia', texto: 'Sin contingencia: el retrabajo saldrá de la utilidad.' });
  if (horas.some((i) => !num(i.valorHora))) alertas.push({ nivel: 'alto', codigo: 'sin_valor_hora', texto: 'Hay horas sin valor por hora: el costo está subestimado.' });

  return {
    totalHoras, costoHoras, costosDirectos, subtotal, contingencia, costosAdmin, costoBase,
    precioSugerido, precioNeto, iva, precioTotal,
    utilidad, margenReal, margenRealPct: margenReal == null ? null : Math.round(margenReal * 1000) / 10,
    capitalTrabajo, diasPagoEstimados: num(diasPagoEstimados),
    presupuestoNeto, excedePresupuesto, tieneSubcontrato,
    requiereTresSocios: (margenReal != null && margenReal < MARGEN_OBJETIVO) || precioNeto > topeTresSocios || tieneSubcontrato,
    causalMargen: margenReal != null && margenReal < margenDescarte,
    alertas,
  };
}

/**
 * Utilidad REAL contra la estimada, una vez cobrado (§15).
 * `montoFacturado` se entiende BRUTO si trae IVA; se descuenta antes de comparar.
 */
export function utilidadReal({ montoFacturado = 0, incluyeIva = true, costoBase = 0, ivaTasa = IVA_TASA } = {}) {
  const bruto = num(montoFacturado);
  const neto = incluyeIva ? round(bruto / (1 + num(ivaTasa))) : bruto;
  const utilidad = neto - num(costoBase);
  return { neto, iva: bruto - neto, utilidad, margen: neto > 0 ? utilidad / neto : null };
}

function pct(f) { return `${Math.round(f * 1000) / 10}%`; }
function fmt(n) { return '$' + Number(n || 0).toLocaleString('es-CL'); }
