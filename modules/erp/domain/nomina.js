// modules/erp/domain/nomina.js — LÓGICA PURA de nómina (testeable en node).
//
// El ERP NO liquida sueldos: la liquidación se calcula fuera y se sube como PDF.
// Acá solo se COSTEA. El costo-hora de una persona ≈ su costo-empresa mensual
// prorrateado por una jornada mensual aproximada. El margen REAL de un proyecto
// cuesta las horas de cada persona por SU costo-empresa (no por un proxy manual),
// que es lo que el `calcRentabilidad` de F1 no podía hacer.
//
// Nada de PII ni de red aquí: solo aritmética determinista.

export const HORAS_MES = 180;   // jornada mensual aproximada para prorratear el costo-empresa

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

// Costo por hora de una persona = costo-empresa mensual / jornada mensual.
export function costoHora(empleado, horasMes = HORAS_MES) {
  const base = num(empleado?.costoEmpresaBase);
  const hm = horasMes > 0 ? horasMes : HORAS_MES;
  return base > 0 ? base / hm : 0;
}

// Margen REAL de un proyecto:
//   ingreso − ( Σ horas_persona × costoHora_persona + gastos )
// `horas`: [{ profileId, horas }]. `costoPorProfile`: { profileId: costoHora }.
// Marca `horas_sin_costo` cuando hay horas de alguien sin costo-empresa cargado
// (para no subestimar el costo en silencio).
export function calcMargenReal(proyecto, horas = [], gastos = [], costoPorProfile = {}) {
  const ingreso = num(proyecto?.presupuestoMonto);
  let costoHoras = 0, horasSinCosto = 0, totalHoras = 0;
  for (const h of horas) {
    const hh = num(h.horas);
    totalHoras += hh;
    const ch = num(costoPorProfile[h.profileId]);
    if (ch > 0) costoHoras += hh * ch;
    else if (hh > 0) horasSinCosto += hh;
  }
  const costoGastos = gastos.reduce((s, g) => s + num(g.total), 0);
  const costoTotal = costoHoras + costoGastos;
  const margen = ingreso - costoTotal;
  const margenPct = ingreso > 0 ? Math.round((margen / ingreso) * 100) : null;

  const flags = [];
  if (ingreso === 0) flags.push('sin_presupuesto');
  if (horasSinCosto > 0) flags.push('horas_sin_costo');

  return {
    ingreso,
    totalHoras,
    horasSinCosto,
    costoHoras: Math.round(costoHoras),
    costoGastos,
    costoTotal: Math.round(costoTotal),
    margen: Math.round(margen),
    margenPct,
    flags,
    confiable: flags.length === 0,   // true = hay presupuesto y todas las horas tienen costo
  };
}

// Totales de un libro de remuneraciones (típicamente de un período).
export function resumenNomina(remuneraciones = []) {
  return remuneraciones.reduce((a, r) => ({
    imponible:    a.imponible    + num(r.imponible),
    liquido:      a.liquido      + num(r.liquido),
    costoEmpresa: a.costoEmpresa + num(r.costoEmpresa),
    n:            a.n + 1,
  }), { imponible: 0, liquido: 0, costoEmpresa: 0, n: 0 });
}
