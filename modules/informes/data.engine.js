// modules/informes/data.engine.js
// MOTOR DE DATOS del Centro de Informes.
// Recolecta y normaliza datos por periodo desde la capa de servicios. CERO hardcode.
// Regla de arquitectura: solo habla con services/. Migra a Supabase reescribiendo services, no este motor.
import { leads } from '../../services/lead.service.js';
import { appointments } from '../../services/appointment.service.js';
import { sales } from '../../services/sales.service.js';
import { calls } from '../../services/call.service.js';
import { config } from '../../services/config.service.js';
import { PLANES } from '../../js/planes.js';
import { calcMonthComision, getWeekStart } from '../../services/commission.service.js';
import { calcTotalMedallas, calcNivel } from '../../services/medal.service.js';
import { todayStr, addDays, nivelInfo } from '../../js/utils.js';

const planCom = id => (PLANES.find(p => p.id === id)?.comision) || 0;
const planNom = id => (PLANES.find(p => p.id === id)?.nombre) || id || '—';
const dOnly = s => String(s || '').slice(0, 10);
const inRange = (d, a, b) => { const x = dOnly(d); return x && x >= a && x <= b; };

// Resuelve {start,end,label} a partir del tipo de periodo
export function resolvePeriod(kind, customStart, customEnd) {
  const today = todayStr();
  if (kind === 'hoy')    return { start: today, end: today, label: 'Hoy' };
  if (kind === 'semana') { const s = getWeekStart(today); return { start: s, end: addDays(s, 6), label: 'Semana actual' }; }
  if (kind === 'custom' && customStart && customEnd) {
    const a = customStart <= customEnd ? customStart : customEnd;
    const b = customStart <= customEnd ? customEnd : customStart;
    return { start: a, end: b, label: 'Periodo personalizado' };
  }
  // mes actual (default)
  const n = new Date(), y = n.getFullYear(), m = n.getMonth();
  const s = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const e = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`;
  return { start: s, end: e, label: 'Mes actual' };
}

export async function getProfile() {
  const [userName, cargo, equipo, filial, mascota, userAvatar] = await Promise.all([
    config.get('userName'), config.get('cargo'), config.get('equipo'),
    config.get('filial'), config.get('mascota'), config.get('userAvatar')
  ]);
  return {
    userName: userName || 'Asesor',
    cargo: cargo || '',
    equipo: equipo || '',
    filial: filial || '',
    mascota: mascota || 'aria',
    userAvatar: userAvatar || ''
  };
}

// Recolecta el dataset completo del periodo. Todas las vistas/motores parten de aquí.
export async function collectData(period) {
  const [allL, allA, allS, allC, profile] = await Promise.all([
    leads.getAll(), appointments.getAll(), sales.getAll(), calls.getAll(), getProfile()
  ]);
  const { start, end } = period;

  // Subconjuntos por periodo
  const salesP = allS.filter(s => inRange(s.fecha, start, end));
  const apptsP = allA.filter(a => inRange(a.fecha, start, end));
  const leadsNew = allL.filter(l => inRange(l.fechaCreacion, start, end));
  const callsP = (allC || []).filter(c => inRange(c.fecha || c.createdAt, start, end));

  // ── LEADS (distribución por estado = snapshot; nuevos/evolución = dentro del periodo) ──
  const byEstado = {};
  allL.forEach(l => { byEstado[l.estado || 'Nuevo'] = (byEstado[l.estado || 'Nuevo'] || 0) + 1; });
  const byOrigen = {};
  allL.forEach(l => { const o = l.origen || 'Sin origen'; byOrigen[o] = (byOrigen[o] || 0) + 1; });
  const seguimiento = ['Seguimiento', 'Propuesta enviada', 'Contactado', 'Intento de contacto']
    .reduce((a, e) => a + (byEstado[e] || 0), 0);
  const agendados = (byEstado['Cita agendada'] || 0) + (byEstado['Confirmado'] || 0);
  const convertidos = byEstado['Venta cerrada'] || 0;
  const perdidos = byEstado['Perdido'] || 0;
  // leads sin actividad reciente (>5 días sin actualización) en estados "vivos"
  const hoy = new Date();
  const vivos = ['Seguimiento', 'Propuesta enviada', 'Contactado', 'Intento de contacto', 'Nuevo'];
  const sinSeguimiento = allL.filter(l => {
    if (!vivos.includes(l.estado)) return false;
    const ref = l.fechaActualizacion || l.fechaCreacion;
    if (!ref) return true;
    return (hoy - new Date(ref)) / 86400000 > 5;
  }).length;

  const leadsData = {
    total: allL.length,
    nuevos: leadsNew.length,
    seguimiento, agendados, convertidos, perdidos, sinSeguimiento,
    byEstado, byOrigen,
    evolucion: seriesPorDia(leadsNew, start, end, l => dOnly(l.fechaCreacion))
  };

  // ── AGENDA ──
  const asistio = apptsP.filter(a => a.estado === 'Asistió').length;
  const contrato = apptsP.filter(a => a.estado === 'Contrató').length;
  const noAsis = apptsP.filter(a => a.estado === 'No asistió').length;
  const reagendadas = apptsP.filter(a => a.estado === 'Reagendada' || a.reagendada).length;
  const realizadas = asistio + noAsis + contrato;
  const agendaData = {
    programadas: apptsP.length, asistio, noAsis, contrato, reagendadas,
    conversion: realizadas > 0 ? Math.round(contrato / realizadas * 100) : 0,
    asistencia: realizadas > 0 ? Math.round((asistio + contrato) / realizadas * 100) : 0,
    porDia: agendaPorDia(apptsP, start, end),
    porHora: agendaPorHora(apptsP)
  };

  // ── VENTAS ──
  const montoPlan = id => { const p = PLANES.find(x => x.id === id); return p ? (p.comision || 0) : 0; };
  const ventasComision = salesP.reduce((a, s) => a + planCom(s.plan), 0);
  const porPlan = {};
  salesP.forEach(s => { const k = planNom(s.plan); porPlan[k] = (porPlan[k] || 0) + 1; });
  const ventasData = {
    cantidad: salesP.length,
    comisionTotal: ventasComision,
    porPlan,
    porPlanList: Object.entries(porPlan).map(([k, v]) => ({ nombre: k, n: v })).sort((a, b) => b.n - a.n),
    evolucion: seriesComisionPorDia(salesP, start, end),
    items: salesP
  };

  // ── COMISIONES (cálculo mensual del mes en curso, motor existente) ──
  const now = new Date();
  const debutActivo = await config.get('debutActivo') || false;
  const calc = calcMonthComision(allS, now.getFullYear(), now.getMonth() + 1, debutActivo, PLANES);
  const metaSueldo = await config.get('metaSueldo') || 1500000;
  const metaBPI = await config.get('metaBPI') || 300000;
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const proyeccion = now.getDate() > 0 ? Math.round(calc.total * dim / now.getDate()) : calc.total;
  const comisionesData = { calc, metaSueldo, metaBPI, proyeccion };

  // ── MEDALLAS ──
  const totalMed = calcTotalMedallas(allS);
  const nivel = calcNivel(totalMed);
  const wkMon = getWeekStart(todayStr());
  const ventasSem = allS.filter(s => getWeekStart(s.fecha) === wkMon).length;
  const medallasData = {
    total: totalMed, nivel, nivelInfo: nivelInfo(nivel),
    enNivel: totalMed % 5, progresoNivel: Math.round((totalMed % 5) / 5 * 100),
    ventasSemana: ventasSem, faltanMedalla: 4 - (ventasSem % 4)
  };

  // ── DASHBOARD (KPIs ejecutivos consolidados) ──
  const convGlobal = realizadas > 0 ? Math.round(contrato / realizadas * 100) : 0;
  const dashboardData = {
    kpis: {
      ventas: salesP.length,
      comision: calc.total,
      bpi: calc.bpi,
      conversion: convGlobal,
      agenda: apptsP.length,
      leads: leadsNew.length,
      medallas: totalMed
    },
    sueldoPct: metaSueldo > 0 ? Math.min(100, Math.round(calc.total / metaSueldo * 100)) : 0,
    bpiPct: metaBPI > 0 ? Math.min(100, Math.round(calc.bpi / metaBPI * 100)) : 0
  };

  return {
    period, profile,
    leads: leadsData, agenda: agendaData, ventas: ventasData,
    comisiones: comisionesData, medallas: medallasData, dashboard: dashboardData,
    raw: { allL, allA, allS, allC, salesP, apptsP }
  };
}

// ── Helpers de series temporales ──
function rangeDays(start, end) {
  const out = []; let d = start;
  let guard = 0;
  while (d <= end && guard < 400) { out.push(d); d = addDays(d, 1); guard++; }
  return out;
}
function seriesPorDia(arr, start, end, getDate) {
  const days = rangeDays(start, end);
  return days.map(d => ({ dia: d, valor: arr.filter(x => getDate(x) === d).length }));
}
function seriesComisionPorDia(salesArr, start, end) {
  const days = rangeDays(start, end);
  return days.map(d => ({
    dia: d,
    valor: salesArr.filter(s => dOnly(s.fecha) === d).reduce((a, s) => a + planCom(s.plan), 0),
    ventas: salesArr.filter(s => dOnly(s.fecha) === d).length
  }));
}
function agendaPorDia(apptsArr, start, end) {
  const days = rangeDays(start, end);
  return days.map(d => {
    const dd = apptsArr.filter(a => dOnly(a.fecha) === d);
    return {
      dia: d,
      total: dd.length,
      asistio: dd.filter(a => a.estado === 'Asistió' || a.estado === 'Contrató').length
    };
  });
}
function agendaPorHora(apptsArr) {
  const map = {};
  apptsArr.forEach(a => {
    const h = (a.hora || '').slice(0, 2);
    if (!h) return;
    if (!map[h]) map[h] = { total: 0, exito: 0 };
    map[h].total++;
    if (a.estado === 'Asistió' || a.estado === 'Contrató') map[h].exito++;
  });
  return Object.entries(map).map(([h, v]) => ({ hora: h + ':00', ...v })).sort((a, b) => a.hora.localeCompare(b.hora));
}
