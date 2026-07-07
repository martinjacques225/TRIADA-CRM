// modules/erp/domain/rentabilidad.js — LÓGICA PURA (testeable en node).
//
// Rentabilidad de un proyecto = ingreso − (horas×tarifa + gastos).
// En F1 el ingreso es el `presupuestoMonto` comprometido; el enlace a facturas reales
// llega en F2. Devuelve BANDERAS cuando falta un dato clave (tarifa o presupuesto),
// para mostrar "dato faltante" en vez de un número falso.

function numOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function calcRentabilidad(proyecto, horas = [], gastos = []) {
  const tarifa  = numOrNull(proyecto?.tarifa);
  const ingreso = numOrNull(proyecto?.presupuestoMonto);

  const totalHoras  = horas.reduce((s, h) => s + (Number(h.horas) || 0), 0);
  const costoGastos = gastos.reduce((s, g) => s + (Number(g.total) || 0), 0);
  const costoHoras  = (tarifa || 0) * totalHoras;
  const costoTotal  = costoHoras + costoGastos;

  const flags = [];
  if (tarifa == null)  flags.push('sin_tarifa');       // no se pueden costear las horas
  if (ingreso == null) flags.push('sin_presupuesto');  // no hay ingreso comprometido

  const ing = ingreso || 0;
  const margen = ing - costoTotal;
  const margenPct = ing > 0 ? Math.round((margen / ing) * 100) : null;

  return {
    ingreso: ing, totalHoras, costoHoras, costoGastos, costoTotal,
    margen, margenPct, flags,
    confiable: flags.length === 0,   // true = todos los datos presentes
  };
}
