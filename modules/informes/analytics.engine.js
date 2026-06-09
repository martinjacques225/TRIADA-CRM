// modules/informes/analytics.engine.js
// MOTOR ANALÍTICO. Reglas heurísticas sobre el dataset → "hallazgos" (insights) neutros.
// El texto es objetivo y con datos; la VOZ/personalidad la pone mascot.engine.js.
// Insight: { key, severity:'good'|'warn'|'bad'|'info', text, data? }
import { fmtMoney } from '../../js/utils.js';

const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;
const ins = (key, severity, text, data) => ({ key, severity, text, data });
const diaNombre = iso => {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' });
};

export function analyzeLeads(d) {
  const L = d.leads, out = [];
  if (L.total === 0) { out.push(ins('leads_vacio', 'info', 'Aún no hay leads registrados para analizar.')); return out; }
  const convRate = pct(L.convertidos, L.total);
  const sinSegPct = pct(L.sinSeguimiento, L.total);

  if (L.sinSeguimiento > 0)
    out.push(ins('leads_sin_seg', sinSegPct >= 30 ? 'bad' : 'warn',
      `${L.sinSeguimiento} lead${L.sinSeguimiento === 1 ? '' : 's'} (${sinSegPct}%) llevan más de 5 días sin contacto. Priorizar seguimiento para no perder oportunidades.`,
      { n: L.sinSeguimiento, pct: sinSegPct }));
  else
    out.push(ins('leads_al_dia', 'good', 'Todos los leads activos tienen seguimiento reciente. Buen control del pipeline.'));

  if (convRate >= 15) out.push(ins('leads_conv_ok', 'good', `Tasa de conversión de leads del ${convRate}%, dentro de un rango saludable.`, { pct: convRate }));
  else if (L.total >= 10) out.push(ins('leads_conv_baja', 'warn', `Conversión de leads en ${convRate}%. Hay margen para mejorar el cierre con seguimientos más constantes.`, { pct: convRate }));

  // Mejor origen
  const origen = Object.entries(L.byOrigen).sort((a, b) => b[1] - a[1])[0];
  if (origen && origen[0] !== 'Sin origen')
    out.push(ins('leads_origen', 'info', `El origen que más leads aporta es "${origen[0]}" (${origen[1]}). Conviene reforzar ese canal.`, { origen: origen[0], n: origen[1] }));

  if (L.nuevos > 0) out.push(ins('leads_nuevos', 'info', `Entraron ${L.nuevos} lead${L.nuevos === 1 ? '' : 's'} nuevo${L.nuevos === 1 ? '' : 's'} en el periodo.`, { n: L.nuevos }));
  return out;
}

export function analyzeVentas(d) {
  const V = d.ventas, out = [];
  if (V.cantidad === 0) { out.push(ins('ventas_vacio', 'warn', 'No se registran ventas en el periodo. Es momento de intensificar el cierre.')); return out; }

  out.push(ins('ventas_total', 'good', `${V.cantidad} venta${V.cantidad === 1 ? '' : 's'} en el periodo, con ${fmtMoney(V.comisionTotal)} en comisión asociada.`, { n: V.cantidad, monto: V.comisionTotal }));

  if (V.porPlanList.length) {
    const top = V.porPlanList[0];
    out.push(ins('ventas_top_plan', 'good', `El producto más vendido es "${top.nombre}" con ${top.n} venta${top.n === 1 ? '' : 's'}.`, { plan: top.nombre, n: top.n }));
    if (V.porPlanList.length > 1) {
      const low = V.porPlanList[V.porPlanList.length - 1];
      out.push(ins('ventas_low_plan', 'info', `El producto con menor movimiento es "${low.nombre}" (${low.n}). Vale la pena revisar su pitch.`, { plan: low.nombre, n: low.n }));
    }
  }

  // Mejor día por comisión
  const best = [...V.evolucion].sort((a, b) => b.valor - a.valor)[0];
  if (best && best.valor > 0)
    out.push(ins('ventas_mejor_dia', 'info', `Tu mejor día fue ${diaNombre(best.dia)} con ${fmtMoney(best.valor)} en comisión.`, { dia: best.dia, valor: best.valor }));
  return out;
}

export function analyzeAgenda(d) {
  const A = d.agenda, out = [];
  if (A.programadas === 0) { out.push(ins('agenda_vacia', 'info', 'No hay citas registradas en el periodo.')); return out; }
  out.push(ins('agenda_total', 'info', `${A.programadas} cita${A.programadas === 1 ? '' : 's'} en el periodo. Asistencia del ${A.asistencia}%.`, { n: A.programadas, asis: A.asistencia }));
  if (A.noAsis > 0) out.push(ins('agenda_noshow', A.noAsis >= A.asistio ? 'bad' : 'warn', `${A.noAsis} inasistencia${A.noAsis === 1 ? '' : 's'}. Confirmar la cita 2h antes reduce los no-show.`, { n: A.noAsis }));
  const bestH = [...A.porHora].sort((a, b) => b.exito - a.exito)[0];
  if (bestH && bestH.exito > 0) out.push(ins('agenda_hora', 'good', `El horario más efectivo es alrededor de las ${bestH.hora}.`, { hora: bestH.hora }));
  return out;
}

export function analyzeComisiones(d) {
  const C = d.comisiones, out = [];
  const falta = Math.max(0, C.metaSueldo - C.calc.total);
  out.push(ins('com_actual', 'info', `Comisión acumulada del mes: ${fmtMoney(C.calc.total)} (BPI ${fmtMoney(C.calc.bpi)}).`, { total: C.calc.total }));
  if (falta > 0) out.push(ins('com_falta', falta > C.metaSueldo * 0.5 ? 'warn' : 'good', `Faltan ${fmtMoney(falta)} para la meta mensual de ${fmtMoney(C.metaSueldo)}.`, { falta }));
  else out.push(ins('com_meta', 'good', `¡Meta mensual de ${fmtMoney(C.metaSueldo)} alcanzada!`));
  out.push(ins('com_proy', 'info', `Proyección al cierre de mes: ${fmtMoney(C.proyeccion)} si mantienes el ritmo.`, { proy: C.proyeccion }));
  return out;
}

export function analyzeMedallas(d) {
  const M = d.medallas, out = [];
  out.push(ins('med_total', 'info', `${M.total} medalla${M.total === 1 ? '' : 's'} acumuladas. Nivel actual: ${M.nivelInfo.nombre}.`, { total: M.total }));
  if (M.faltanMedalla < 4) out.push(ins('med_prox', 'good', `Te ${M.faltanMedalla === 1 ? 'falta' : 'faltan'} ${M.faltanMedalla} venta${M.faltanMedalla === 1 ? '' : 's'} esta semana para tu próxima medalla.`, { faltan: M.faltanMedalla }));
  else out.push(ins('med_arranca', 'info', 'Registra ventas esta semana para avanzar a tu próxima medalla.'));
  return out;
}

export function analyzeDashboard(d) {
  const out = [];
  const K = d.dashboard.kpis;
  out.push(ins('dash_resumen', 'info', `Resumen del periodo: ${K.ventas} venta${K.ventas === 1 ? '' : 's'}, ${K.leads} lead${K.leads === 1 ? '' : 's'} nuevos, ${K.agenda} cita${K.agenda === 1 ? '' : 's'} y ${K.conversion}% de conversión.`));
  if (d.dashboard.sueldoPct >= 70) out.push(ins('dash_fuerte', 'good', `Vas al ${d.dashboard.sueldoPct}% de tu meta de sueldo. Excelente avance.`));
  else out.push(ins('dash_avance', 'warn', `Avance del ${d.dashboard.sueldoPct}% sobre la meta de sueldo. Hay terreno por recuperar.`));
  return out;
}

// Resumen ejecutivo: fortalezas / debilidades / oportunidades a partir de todos los insights
export function buildExecutive(d, sections) {
  const all = [];
  if (sections.includes('leads')) all.push(...analyzeLeads(d));
  if (sections.includes('ventas')) all.push(...analyzeVentas(d));
  if (sections.includes('agenda')) all.push(...analyzeAgenda(d));
  if (sections.includes('comisiones')) all.push(...analyzeComisiones(d));
  if (sections.includes('medallas')) all.push(...analyzeMedallas(d));
  if (sections.includes('dashboard')) all.push(...analyzeDashboard(d));
  return {
    fortalezas: all.filter(i => i.severity === 'good').map(i => i.text),
    debilidades: all.filter(i => i.severity === 'bad' || i.severity === 'warn').map(i => i.text),
    oportunidades: all.filter(i => i.severity === 'warn' || i.key.includes('origen') || i.key.includes('low_plan')).map(i => i.text)
  };
}
