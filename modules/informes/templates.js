// modules/informes/templates.js
// PLANTILLAS del informe. Devuelven HTML autocontenido con estilos fijos (no depende del tema).
// Una "página" = <section class="rp-page"> (salto de página controlado por report.engine).
import { fmtMoney, escHtml, formatDateLong, formatDate } from '../../js/utils.js';
import * as CH from './charts.engine.js';
import * as AN from './analytics.engine.js';
import { voice } from './mascot.engine.js';

const P = CH.PALETA;
const fechaLarga = iso => { try { return formatDateLong(iso); } catch { return iso; } };

// ── Estilos del documento (corporativos, fijos) ──
export function styleBlock() {
  return `<style>
  .rp-doc{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:${P.ink};background:#fff;width:794px;margin:0 auto}
  .rp-doc *{box-sizing:border-box}
  .rp-page{padding:34px 40px;page-break-after:always;position:relative}
  .rp-page:last-child{page-break-after:auto}
  .rp-h{font-size:17px;font-weight:800;color:${P.primaryDark};margin:0 0 4px;display:flex;align-items:center;gap:9px}
  .rp-h .rp-bar{width:5px;height:20px;background:${P.primary};border-radius:3px;display:inline-block}
  .rp-sub{font-size:11px;color:${P.slate};margin:0 0 16px}
  .rp-kpis{display:flex;flex-wrap:wrap;gap:12px;margin:14px 0}
  .rp-kpi{flex:1 1 150px;min-width:150px;border:1px solid ${P.line};border-radius:12px;padding:14px 16px;background:${P.bg}}
  .rp-kpi .k-lbl{font-size:9.5px;letter-spacing:.5px;text-transform:uppercase;color:${P.slate};font-weight:700}
  .rp-kpi .k-val{font-size:22px;font-weight:800;color:${P.ink};margin:4px 0 2px}
  .rp-kpi .k-sub{font-size:10px;color:${P.slate}}
  .rp-card{border:1px solid ${P.line};border-radius:12px;padding:16px;margin:12px 0;background:#fff}
  .rp-card-t{font-size:12px;font-weight:700;color:${P.ink};margin:0 0 10px}
  .rp-2col{display:flex;gap:14px}.rp-2col>.rp-card{flex:1}
  table.rp-tbl{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px}
  table.rp-tbl th{background:${P.primary};color:#fff;text-align:left;padding:7px 10px;font-weight:600;font-size:10px}
  table.rp-tbl td{padding:6px 10px;border-bottom:1px solid ${P.line};color:${P.ink}}
  table.rp-tbl tr:nth-child(even) td{background:${P.bg}}
  .rp-rec{border-radius:12px;padding:14px 16px;margin:12px 0;background:linear-gradient(135deg,#F1F5FF,#FAF5FF);border:1px solid #E0E7FF}
  .rp-rec-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .rp-rec-head img{width:38px;height:38px;border-radius:50%;object-fit:cover;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.15)}
  .rp-rec-head .rn{font-weight:800;font-size:12px;color:${P.ink}}
  .rp-rec-head .rt{font-size:9.5px;color:${P.slate};text-transform:uppercase;letter-spacing:.5px;font-weight:700}
  .rp-rec-intro{font-size:11px;color:${P.slate};margin:0 0 8px;font-style:italic}
  .rp-rec li{font-size:11px;color:${P.ink};margin-bottom:5px;list-style:none;display:flex;gap:6px}
  .rp-rec ul{margin:0;padding:0}
  .rp-rec .fl{font-weight:700;white-space:nowrap}
  .rp-rec-close{font-size:11px;color:${P.primaryDark};font-weight:600;margin-top:8px;padding-top:8px;border-top:1px dashed #C7D2FE}
  .rp-chips{display:flex;gap:8px;flex-wrap:wrap}.rp-chip{font-size:10px;background:${P.bg};border:1px solid ${P.line};border-radius:20px;padding:3px 10px;color:${P.slate}}
  /* Portada */
  .rp-cover{padding:0;page-break-after:always}
  .rp-cover-hd{background:linear-gradient(135deg,${P.primaryDark},${P.primary});color:#fff;padding:46px 40px 40px}
  .rp-cover-brand{display:flex;align-items:center;gap:12px;margin-bottom:34px}
  .rp-cover-brand img{width:42px;height:42px;border-radius:9px;object-fit:cover;background:#fff}
  .rp-cover-brand span{font-size:15px;font-weight:700;letter-spacing:.3px}
  .rp-cover-title{font-size:32px;font-weight:800;line-height:1.15;margin:0 0 8px}
  .rp-cover-tag{font-size:13px;opacity:.92}
  .rp-cover-body{padding:34px 40px}
  .rp-cover-user{display:flex;align-items:center;gap:16px;margin-bottom:24px}
  .rp-cover-av{width:74px;height:74px;border-radius:50%;object-fit:cover;border:3px solid ${P.primary};background:${P.primary};color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800}
  .rp-cover-user .n{font-size:22px;font-weight:800;color:${P.ink}}
  .rp-cover-user .r{font-size:13px;color:${P.slate}}
  .rp-meta{display:flex;flex-wrap:wrap;gap:0;border:1px solid ${P.line};border-radius:12px;overflow:hidden;margin-bottom:24px}
  .rp-meta-i{flex:1 1 50%;padding:14px 18px;border-bottom:1px solid ${P.line}}
  .rp-meta-i:nth-child(odd){border-right:1px solid ${P.line}}
  .rp-meta-i .ml{font-size:9.5px;text-transform:uppercase;letter-spacing:.5px;color:${P.slate};font-weight:700}
  .rp-meta-i .mv{font-size:14px;font-weight:700;color:${P.ink};margin-top:2px}
  .rp-cover-mascot{display:flex;align-items:center;gap:14px;background:${P.bg};border-radius:12px;padding:14px 18px}
  .rp-cover-mascot img{width:54px;height:54px;border-radius:50%;object-fit:cover}
  .rp-cover-mascot .mm{font-size:12px;color:${P.slate}}.rp-cover-mascot .mn{font-weight:800;color:${P.ink};font-size:14px}
  </style>`;
}

// ── PORTADA ──
export function cover(d, reportTitle) {
  const pr = d.profile;
  const initials = (pr.userName || 'A').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const av = pr.userAvatar
    ? `<img class="rp-cover-av" src="${pr.userAvatar}" alt="">`
    : `<div class="rp-cover-av">${escHtml(initials)}</div>`;
  const mascotImg = pr.mascotaObj?.img || `mascot-${pr.mascota}.png`;
  const mascotNom = pr.mascotaObj?.nombre || pr.mascota.toUpperCase();
  const hoy = new Date().toISOString().slice(0, 10);
  return `<section class="rp-cover">
    <div class="rp-cover-hd">
      <div class="rp-cover-brand"><img src="icon-lgs.png" alt="Tríada"><span>Tríada CRM</span></div>
      <h1 class="rp-cover-title">${escHtml(reportTitle)}</h1>
      <div class="rp-cover-tag">Documento generado automáticamente · Confidencial</div>
    </div>
    <div class="rp-cover-body">
      <div class="rp-cover-user">${av}<div><div class="n">${escHtml(pr.userName)}</div><div class="r">${escHtml([pr.cargo, pr.equipo, pr.filial].filter(Boolean).join(' · ') || 'Asesor comercial')}</div></div></div>
      <div class="rp-meta">
        <div class="rp-meta-i"><div class="ml">Periodo analizado</div><div class="mv">${escHtml(d.period.label)}</div></div>
        <div class="rp-meta-i"><div class="ml">Rango</div><div class="mv">${formatDate(d.period.start)} – ${formatDate(d.period.end)}</div></div>
        <div class="rp-meta-i"><div class="ml">Filial</div><div class="mv">${escHtml(pr.filial || '—')}</div></div>
        <div class="rp-meta-i"><div class="ml">Generado</div><div class="mv">${fechaLarga(hoy)}</div></div>
      </div>
      <div class="rp-cover-mascot">
        <img src="${mascotImg}" alt="${escHtml(mascotNom)}">
        <div><div class="mm">Asistente del informe</div><div class="mn">${escHtml(mascotNom)}</div></div>
      </div>
    </div>
  </section>`;
}

// ── Componentes ──
function kpiCard(lbl, val, sub) {
  return `<div class="rp-kpi"><div class="k-lbl">${escHtml(lbl)}</div><div class="k-val">${val}</div><div class="k-sub">${escHtml(sub || '')}</div></div>`;
}
function sectionHead(title, sub) {
  return `<div class="rp-h"><span class="rp-bar"></span>${escHtml(title)}</div>${sub ? `<p class="rp-sub">${escHtml(sub)}</p>` : ''}`;
}
function recBlock(v) {
  if (!v) return '';
  return `<div class="rp-rec">
    <div class="rp-rec-head"><img src="${v.mascota.img}" alt=""><div><div class="rn">${escHtml(v.mascota.nombre)}</div><div class="rt">Recomendación IA</div></div></div>
    ${v.intro ? `<p class="rp-rec-intro">${escHtml(v.intro)}</p>` : ''}
    <ul>${v.lines.map(l => `<li><span class="fl">${l.flair}</span><span>${escHtml(l.text)}</span></li>`).join('')}</ul>
    ${v.close ? `<div class="rp-rec-close">${escHtml(v.close)}</div>` : ''}
  </div>`;
}

// ── SECCIÓN LEADS ──
export function sectionLeads(d, inc) {
  const L = d.leads;
  const kpis = inc.kpis !== false ? `<div class="rp-kpis">
    ${kpiCard('Total leads', L.total, 'En el sistema')}
    ${kpiCard('Nuevos', L.nuevos, 'En el periodo')}
    ${kpiCard('En seguimiento', L.seguimiento, 'Pipeline activo')}
    ${kpiCard('Agendados', L.agendados, 'Con cita')}
    ${kpiCard('Convertidos', L.convertidos, 'Venta cerrada')}
    ${kpiCard('Perdidos', L.perdidos, 'Descartados')}
  </div>` : '';
  const charts = inc.graficos !== false ? `<div class="rp-2col">
    <div class="rp-card"><div class="rp-card-t">Evolución de leads nuevos</div>${CH.barChart(L.evolucion.map(e => ({ lbl: e.dia.slice(8), val: e.valor })))}</div>
    <div class="rp-card"><div class="rp-card-t">Distribución por estado</div>${CH.distribution(L.byEstado)}</div>
  </div>
  <div class="rp-card"><div class="rp-card-t">Distribución por origen</div>${CH.distribution(L.byOrigen)}</div>` : '';
  const rec = inc.recomendaciones !== false ? recBlock(voice(d.profile.mascota, AN.analyzeLeads(d), 'leads')) : '';
  return `<section class="rp-page">${sectionHead('Informe de Leads', `Análisis del pipeline comercial · ${d.period.label}`)}${kpis}${charts}${rec}</section>`;
}

// ── SECCIÓN VENTAS ──
export function sectionVentas(d, inc) {
  const V = d.ventas;
  const kpis = inc.kpis !== false ? `<div class="rp-kpis">
    ${kpiCard('Ventas', V.cantidad, 'En el periodo')}
    ${kpiCard('Comisión generada', fmtMoney(V.comisionTotal), 'Asociada a ventas')}
    ${kpiCard('Productos vendidos', V.porPlanList.length, 'Planes distintos')}
    ${kpiCard('Ticket promedio', V.cantidad ? fmtMoney(Math.round(V.comisionTotal / V.cantidad)) : '$0', 'Comisión/venta')}
  </div>` : '';
  const charts = inc.graficos !== false ? `<div class="rp-card"><div class="rp-card-t">Comisión por día</div>${CH.lineArea(V.evolucion)}</div>
  <div class="rp-2col">
    <div class="rp-card"><div class="rp-card-t">Ranking de productos</div>${CH.rankBars(V.porPlanList.map(p => ({ nombre: p.nombre, n: p.n })))}</div>
    <div class="rp-card"><div class="rp-card-t">Detalle por plan</div>${planTable(V.porPlanList)}</div>
  </div>` : '';
  const rec = inc.recomendaciones !== false ? recBlock(voice(d.profile.mascota, AN.analyzeVentas(d), 'ventas')) : '';
  return `<section class="rp-page">${sectionHead('Informe de Ventas', `Resultados de cierre · ${d.period.label}`)}${kpis}${charts}${rec}</section>`;
}
function planTable(list) {
  if (!list.length) return `<div style="font-size:11px;color:${P.slate}">Sin ventas en el periodo.</div>`;
  return `<table class="rp-tbl"><thead><tr><th>Producto</th><th style="text-align:right">Ventas</th></tr></thead>
    <tbody>${list.map(p => `<tr><td>${escHtml(p.nombre)}</td><td style="text-align:right;font-weight:700">${p.n}</td></tr>`).join('')}</tbody></table>`;
}

// ── SECCIÓN DASHBOARD EJECUTIVO ──
export function sectionDashboard(d, inc) {
  const K = d.dashboard.kpis;
  const kpis = `<div class="rp-kpis">
    ${kpiCard('Sueldo del mes', fmtMoney(K.comision), `Meta ${fmtMoney(d.comisiones.metaSueldo)}`)}
    ${kpiCard('BPI acumulado', fmtMoney(K.bpi), `Meta ${fmtMoney(d.comisiones.metaBPI)}`)}
    ${kpiCard('Conversión', K.conversion + '%', 'Reuniones → cierre')}
    ${kpiCard('Medallas', K.medallas, d.medallas.nivelInfo.nombre)}
    ${kpiCard('Ventas', K.ventas, 'En el periodo')}
    ${kpiCard('Leads nuevos', K.leads, 'En el periodo')}
  </div>`;
  const charts = inc.graficos !== false ? `<div class="rp-2col">
    <div class="rp-card" style="text-align:center"><div class="rp-card-t">Avance meta de sueldo</div>${CH.donut(d.dashboard.sueldoPct, 'Meta mensual', P.primary)}</div>
    <div class="rp-card" style="text-align:center"><div class="rp-card-t">Avance BPI</div>${CH.donut(d.dashboard.bpiPct, 'Meta BPI', P.purple)}</div>
  </div>` : '';
  const rec = inc.recomendaciones !== false ? recBlock(voice(d.profile.mascota, AN.analyzeDashboard(d), 'dashboard')) : '';
  return `<section class="rp-page">${sectionHead('Dashboard Ejecutivo', `KPIs consolidados · ${d.period.label}`)}${kpis}${charts}${rec}</section>`;
}

// ── SECCIÓN AGENDA ──
export function sectionAgenda(d, inc) {
  const A = d.agenda;
  const kpis = inc.kpis !== false ? `<div class="rp-kpis">
    ${kpiCard('Programadas', A.programadas, 'En el periodo')}
    ${kpiCard('Asistencias', A.asistio + A.contrato, 'Asistió / contrató')}
    ${kpiCard('Inasistencias', A.noAsis, 'No-show')}
    ${kpiCard('Reagendadas', A.reagendadas, 'Movidas de fecha')}
    ${kpiCard('Asistencia', A.asistencia + '%', 'Sobre realizadas')}
    ${kpiCard('Conversión', A.conversion + '%', 'Cierre en cita')}
  </div>` : '';
  const charts = inc.graficos !== false ? `<div class="rp-card"><div class="rp-card-t">Citas por día</div>${CH.barChart(A.porDia.map(x => ({ lbl: x.dia.slice(8), val: x.total })))}</div>
  <div class="rp-2col">
    <div class="rp-card"><div class="rp-card-t">Asistencias por día</div>${CH.barChart(A.porDia.map(x => ({ lbl: x.dia.slice(8), val: x.asistio })), { color: CH.PALETA.good })}</div>
    <div class="rp-card"><div class="rp-card-t">Efectividad por horario</div>${CH.rankBars(A.porHora.map(h => ({ nombre: h.hora, n: h.exito })))}</div>
  </div>` : '';
  const rec = inc.recomendaciones !== false ? recBlock(voice(d.profile.mascota, AN.analyzeAgenda(d), 'agenda')) : '';
  return `<section class="rp-page">${sectionHead('Informe de Agenda', `Gestión de citas · ${d.period.label}`)}${kpis}${charts}${rec}</section>`;
}

// ── SECCIÓN COMISIONES ──
export function sectionComisiones(d, inc) {
  const C = d.comisiones, calc = C.calc;
  const falta = Math.max(0, C.metaSueldo - calc.total);
  const kpis = inc.kpis !== false ? `<div class="rp-kpis">
    ${kpiCard('Sueldo del mes', fmtMoney(calc.total), `Meta ${fmtMoney(C.metaSueldo)}`)}
    ${kpiCard('BPI acumulado', fmtMoney(calc.bpi), `Meta ${fmtMoney(C.metaBPI)}`)}
    ${kpiCard('Bonos / incentivos', fmtMoney(calc.incentivos), 'Bonos semanales')}
    ${kpiCard('Proyección cierre', fmtMoney(C.proyeccion), 'Al ritmo actual')}
  </div>` : '';
  const desglose = `<table class="rp-tbl"><thead><tr><th>Concepto</th><th style="text-align:right">Monto</th></tr></thead><tbody>
    <tr><td>Comisión por ventas</td><td style="text-align:right">${fmtMoney(calc.comisiones)}</td></tr>
    <tr><td>Incentivos semanales</td><td style="text-align:right">${fmtMoney(calc.incentivos)}</td></tr>
    <tr><td>BPI</td><td style="text-align:right">${fmtMoney(calc.bpi)}</td></tr>
    <tr><td>Conectividad</td><td style="text-align:right">${fmtMoney(calc.conectividad)}</td></tr>
    <tr><td>Debut</td><td style="text-align:right">${fmtMoney(calc.debut)}</td></tr>
    <tr><td style="font-weight:800">Total</td><td style="text-align:right;font-weight:800">${fmtMoney(calc.total)}</td></tr>
    ${falta > 0 ? `<tr><td>Falta para la meta</td><td style="text-align:right;color:${P.bad}">${fmtMoney(falta)}</td></tr>` : ''}
  </tbody></table>`;
  const charts = inc.graficos !== false ? `<div class="rp-2col">
    <div class="rp-card" style="text-align:center"><div class="rp-card-t">Avance meta de sueldo</div>${CH.donut(d.dashboard.sueldoPct, 'Meta mensual', P.primary)}</div>
    <div class="rp-card"><div class="rp-card-t">Desglose de comisión</div>${desglose}</div>
  </div>
  <div class="rp-card"><div class="rp-card-t">Comisión por día del periodo</div>${CH.lineArea(d.ventas.evolucion)}</div>` : `<div class="rp-card">${desglose}</div>`;
  const rec = inc.recomendaciones !== false ? recBlock(voice(d.profile.mascota, AN.analyzeComisiones(d), 'comisiones')) : '';
  return `<section class="rp-page">${sectionHead('Informe de Comisiones', `Liquidación estimada del mes · ${d.period.label}`)}${kpis}${charts}${rec}</section>`;
}

// ── SECCIÓN MEDALLAS ──
export function sectionMedallas(d, inc) {
  const M = d.medallas;
  const kpis = inc.kpis !== false ? `<div class="rp-kpis">
    ${kpiCard('Medallas totales', M.total, 'Acumuladas')}
    ${kpiCard('Nivel actual', M.nivelInfo.nombre, `${M.enNivel}/5 en el nivel`)}
    ${kpiCard('Ventas semana', M.ventasSemana, 'Hacia la próxima')}
    ${kpiCard('Próxima medalla', M.faltanMedalla < 4 ? `Faltan ${M.faltanMedalla}` : 'Arranca ya', 'Ventas restantes')}
  </div>` : '';
  const charts = inc.graficos !== false ? `<div class="rp-2col">
    <div class="rp-card" style="text-align:center"><div class="rp-card-t">Progreso del nivel</div>${CH.donut(M.progresoNivel, M.nivelInfo.nombre, P.purple)}</div>
    <div class="rp-card"><div class="rp-card-t">Estado</div>
      <div style="font-size:11px;color:${P.ink};line-height:1.9">
        <div>🏅 Nivel: <strong>${escHtml(M.nivelInfo.nombre)}</strong></div>
        <div>📊 Medallas en este nivel: <strong>${M.enNivel} de 5</strong></div>
        <div>🎯 Próxima medalla: <strong>${M.faltanMedalla < 4 ? M.faltanMedalla + ' venta(s)' : 'registra ventas esta semana'}</strong></div>
      </div></div>
  </div>` : '';
  const rec = inc.recomendaciones !== false ? recBlock(voice(d.profile.mascota, AN.analyzeMedallas(d), 'medallas')) : '';
  return `<section class="rp-page">${sectionHead('Informe de Medallas', `Reconocimientos y nivel · ${d.period.label}`)}${kpis}${charts}${rec}</section>`;
}

// ── RESUMEN EJECUTIVO GENERAL ──
export function sectionExecutive(d, sections) {
  const ex = AN.buildExecutive(d, sections);
  const block = (titulo, items, color) => `<div class="rp-card">
    <div class="rp-card-t" style="color:${color}">${titulo}</div>
    ${items.length ? `<ul style="margin:0;padding-left:18px;font-size:11px;color:${P.ink}">${[...new Set(items)].slice(0, 6).map(t => `<li style="margin-bottom:5px">${escHtml(t)}</li>`).join('')}</ul>`
      : `<div style="font-size:11px;color:${P.slate}">Sin elementos destacados.</div>`}</div>`;
  return `<section class="rp-page">
    ${sectionHead('Resumen Ejecutivo General', `Conclusiones del periodo · ${d.profile.userName}`)}
    ${block('✅ Fortalezas detectadas', ex.fortalezas, P.good)}
    ${block('⚠️ Debilidades a corregir', ex.debilidades, P.bad)}
    ${block('🎯 Oportunidades', ex.oportunidades, P.amber)}
  </section>`;
