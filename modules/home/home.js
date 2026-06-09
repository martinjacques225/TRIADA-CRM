// modules/home/home.js — Home / landing (rediseño v3.4)
// SOLO presentación: reutiliza la capa de servicios y los motores existentes.
// Reaprovecha clases de dashboard.css (cargado globalmente) para no duplicar estilos.
import { appointments } from '../../services/appointment.service.js';
import { leads } from '../../services/lead.service.js';
import { sales } from '../../services/sales.service.js';
import { config } from '../../services/config.service.js';
import { events } from '../../services/event.service.js';
import { PLANES } from '../../js/planes.js';
import { S } from '../../js/state.js';
import { ico } from '../../js/ui.js';
import { MASCOTAS } from '../../js/mascotas.js';
import {
  fmtMoney, formatDate, todayStr, addDays, escHtml, statusBadgeClass,
  getWeekStart, calcMonthComision, calcTotalMedallas, calcNivel,
  nivelInfo, mejorDiaSemana, leadsCalientes
} from '../../js/utils.js';

const DEFAULT_META_SUELDO = 1500000;
const DEFAULT_META_BPI    = 300000;
const HOT_DIAS            = 5;   // ventana "lead caliente" (Seguimiento/Propuesta ≤ N días)

let _range = 'mes';             // 'semana' | 'mes' | 'año'  (selector Evolución)

const planCom  = id => (PLANES.find(p => p.id === id)?.comision) || 0;
const planName = id => (PLANES.find(p => p.id === id)?.nombre) || id || '';
const pctClamp = (a, b) => b > 0 ? Math.min(100, Math.round(a / b * 100)) : 0;

function fmtShort(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M';
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'K';
  return '$' + Math.round(n);
}
function nombrePila() { return (S.userName || 'Asesor').split(' ')[0]; }

// ── Carga de datos comunes ──
async function _load() {
  const [allA, allL, allS, recent] = await Promise.all([
    appointments.getAll(), leads.getAll(), sales.getAll(), events.getRecent(6)
  ]);
  const now = new Date(), today = todayStr();
  const year = now.getFullYear(), month = now.getMonth() + 1;
  const debutActivo = await config.get('debutActivo') || false;
  const metaSueldo  = await config.get('metaSueldo') || DEFAULT_META_SUELDO;
  const metaBPI     = await config.get('metaBPI')    || DEFAULT_META_BPI;
  const calc = calcMonthComision(allS, year, month, debutActivo, PLANES);

  const asistio  = allA.filter(a => a.estado === 'Asistió').length;
  const noAsis   = allA.filter(a => a.estado === 'No asistió').length;
  const contrato = allA.filter(a => a.estado === 'Contrató').length;
  const conv     = (asistio + noAsis) > 0 ? Math.round(contrato / (asistio + noAsis) * 100) : 0;

  const totalMed = calcTotalMedallas(allS);
  const nivel    = calcNivel(totalMed);
  const medEnNivel = totalMed % 5;
  const wkMon    = getWeekStart(today);
  const ventasSem = allS.filter(s => getWeekStart(s.fecha) === wkMon).length;
  const medalProg = ventasSem % 4;
  const faltanMed = 4 - medalProg;

  // Proyección lineal de cierre de mes
  const dim = new Date(year, month, 0).getDate(), dHoy = now.getDate();
  const proj = dHoy > 0 ? Math.round(calc.total * dim / dHoy) : calc.total;

  const citasHoy   = allA.filter(a => a.fecha === today).length;
  const seguimiento = allL.filter(l => l.estado === 'Seguimiento').length;
  const calientes  = leadsCalientes(allL, HOT_DIAS).length;
  const mejorDia   = mejorDiaSemana(allS, wkMon);

  return { allA, allL, allS, recent, now, today, year, month, calc, metaSueldo, metaBPI,
           asistio, noAsis, contrato, conv, totalMed, nivel, medEnNivel, wkMon, ventasSem,
           medalProg, faltanMed, proj, citasHoy, seguimiento, calientes, mejorDia };
}

// ════════ Gráficos (SVG inline, sin librerías) ════════
function _donut(pct, lbl = 'Meta mensual') {
  const r = 52, c = 2 * Math.PI * r, off = c * (1 - Math.min(100, pct) / 100);
  return `<svg viewBox="0 0 130 130" class="donut">
    <circle cx="65" cy="65" r="${r}" class="donut-track"/>
    <circle cx="65" cy="65" r="${r}" class="donut-val" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 65 65)"/>
    <text x="65" y="62" class="donut-pct">${Math.round(pct)}%</text>
    <text x="65" y="82" class="donut-lbl">${escHtml(lbl)}</text>
  </svg>`;
}
// Sparkline mini para la KPI de comisión proyectada
function _spark(vals) {
  if (!vals.length) return '';
  const w = 120, h = 30, max = Math.max(...vals, 1), n = vals.length;
  const pts = vals.map((v, i) => `${(i / Math.max(1, n - 1) * w).toFixed(1)},${(h - (v / max) * (h - 4) - 2).toFixed(1)}`);
  return `<svg viewBox="0 0 ${w} ${h}" class="hm-spark" preserveAspectRatio="none"><polyline points="${pts.join(' ')}"/></svg>`;
}
// Serie según rango seleccionado → {pts:[{lbl,val}], total}
function _serie(D) {
  if (_range === 'semana') {
    const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const pts = dias.map((lbl, i) => {
      const d = addDays(D.wkMon, i);
      return { lbl, val: D.allS.filter(s => s.fecha === d).reduce((a, s) => a + planCom(s.plan), 0) };
    });
    return { pts, total: pts.reduce((a, p) => a + p.val, 0) };
  }
  if (_range === 'año') {
    const mo = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const pts = mo.map((lbl, i) => {
      const pre = `${D.year}-${String(i + 1).padStart(2, '0')}`;
      return { lbl, val: D.allS.filter(s => s.fecha.startsWith(pre)).reduce((a, s) => a + planCom(s.plan), 0) };
    });
    return { pts, total: pts.reduce((a, p) => a + p.val, 0) };
  }
  // mes: acumulado diario hasta hoy
  const pre = `${D.year}-${String(D.month).padStart(2, '0')}`;
  const dHoy = D.now.getDate(); let cum = 0; const pts = [];
  for (let d = 1; d <= dHoy; d++) {
    const ds = `${pre}-${String(d).padStart(2, '0')}`;
    cum += D.allS.filter(s => s.fecha === ds).reduce((a, s) => a + planCom(s.plan), 0);
    if (d === 1 || d % 7 === 0 || d === dHoy) pts.push({ lbl: `${d} ${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][D.month-1]}`, val: cum });
    else pts.push({ lbl: '', val: cum });
  }
  return { pts, total: cum };
}
function _lineChart(D) {
  const { pts, total } = _serie(D);
  const vals = pts.map(p => p.val);
  if (vals.length < 2 || total === 0) return `<div class="empty-mini">El gráfico se llena a medida que registras ventas</div>`;
  const w = 600, h = 200, pad = 12, n = vals.length, max = Math.max(...vals, 1);
  const xy = vals.map((v, i) => [pad + (i / (n - 1)) * (w - 2 * pad), h - pad - (v / max) * (h - 2 * pad)]);
  const line = xy.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${xy[n-1][0].toFixed(1)} ${h-pad} L${xy[0][0].toFixed(1)} ${h-pad} Z`;
  const grid = [0, 25, 50, 75, 100].map(g => {
    const y = h - pad - (g / 100) * (h - 2 * pad);
    return `<line x1="${pad}" y1="${y.toFixed(1)}" x2="${w-pad}" y2="${y.toFixed(1)}" class="lc-grid"/>`;
  }).join('');
  const last = xy[n - 1];
  const xlabels = pts.map((p, i) => p.lbl ? `<span class="hm-xlbl" style="left:${(xy[i][0] / w * 100).toFixed(1)}%">${escHtml(p.lbl)}</span>` : '').join('');
  return `<div class="hm-line">
    <svg viewBox="0 0 ${w} ${h}" class="line-chart" preserveAspectRatio="none">
      ${grid}<path d="${area}" class="lc-area"/><path d="${line}" class="lc-line"/>
      <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4" class="hm-dot"/>
    </svg>
    <div class="hm-line-callout" style="left:${Math.min(82, last[0]/w*100).toFixed(1)}%;top:${(last[1]/h*100).toFixed(1)}%">${fmtMoney(total)}</div>
    <div class="hm-xaxis">${xlabels}</div>
  </div>`;
}

// ════════ Vista principal (#center) ════════
export async function render() {
  const center = document.getElementById('center');
  const D = await _load();
  center.innerHTML = `<div class="view-animate dash">
    ${_kpiRow(D)}
    ${_mision(D)}
    <div class="mid-row">
      <div class="card">
        <div class="card-head"><span class="card-title">Próximas citas</span><button class="card-link" data-go="agenda">Ver agenda completa →</button></div>
        ${_proximasCitas(D)}
      </div>
      <div class="card">
        <div class="card-head"><span class="card-title">Actividad reciente</span><button class="card-link" data-go="leads">Ver todos →</button></div>
        ${_actividad(D)}
      </div>
    </div>
    ${_rendimientoMes(D)}
    ${_banner(D)}
  </div>`;

  window._app?.attachCardEvents?.();
  center.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => window._app?.navigate?.(b.dataset.go)));
  const sel = center.querySelector('#hmRange');
  sel?.addEventListener('change', () => { _range = sel.value; _refreshChart(D); });
}

// Re-render aislado del gráfico (sin recargar toda la vista)
function _refreshChart(D) {
  const box = document.getElementById('hmChart');
  if (box) box.innerHTML = _lineChart(D);
}

function _kpiRow(D) {
  const sueldoPct = pctClamp(D.calc.total, D.metaSueldo);
  const bpiPct    = pctClamp(D.calc.bpi, D.metaBPI);
  const nextName  = nivelInfo(calcNivel(D.totalMed + 1)).nombre;
  // sparkline: acumulado diario del mes
  const pre = `${D.year}-${String(D.month).padStart(2, '0')}`; let cum = 0; const sp = [];
  for (let d = 1; d <= D.now.getDate(); d++) { const ds = `${pre}-${String(d).padStart(2,'0')}`; cum += D.allS.filter(s=>s.fecha===ds).reduce((a,s)=>a+planCom(s.plan),0); sp.push(cum); }
  return `<div class="kpi-row">
    <div class="kpi kpi-blue">
      <div class="kpi-top"><span class="kpi-lbl">Meta mensual</span><span class="kpi-ico">${ico.chart}</span></div>
      <div class="kpi-val">${sueldoPct}%</div>
      <div class="kpi-sub">${fmtMoney(D.calc.total)} / ${fmtMoney(D.metaSueldo)}</div>
      <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${sueldoPct}%"></div><span class="kpi-bar-pct">${sueldoPct}%</span></div>
    </div>
    <div class="kpi kpi-purple">
      <div class="kpi-top"><span class="kpi-lbl">Próxima medalla</span><span class="kpi-ico">${ico.medal}</span></div>
      <div class="kpi-val">${D.faltanMed} ${D.faltanMed === 1 ? 'venta' : 'ventas'}</div>
      <div class="kpi-sub">Te ${D.faltanMed === 1 ? 'falta' : 'faltan'} ${D.faltanMed} para ${escHtml(nextName)}</div>
      <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${D.medalProg/4*100}%"></div></div>
    </div>
    <div class="kpi kpi-green">
      <div class="kpi-top"><span class="kpi-lbl">Comisión proyectada</span><span class="kpi-ico">${ico.money}</span></div>
      <div class="kpi-val">${fmtMoney(D.proj)}</div>
      <div class="kpi-sub">Estimación al cierre del mes</div>
      ${_spark(sp)}
    </div>
    <div class="kpi kpi-green">
      <div class="kpi-top"><span class="kpi-lbl">BPI acumulado</span><span class="kpi-ico">${ico.chart}</span></div>
      <div class="kpi-val">${fmtMoney(D.calc.bpi)}</div>
      <div class="kpi-sub">Meta: ${fmtMoney(D.metaBPI)}</div>
      <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${bpiPct}%"></div><span class="kpi-bar-pct">${bpiPct}%</span></div>
    </div>
  </div>`;
}

async function _misionMascota() {
  const id = await config.get('mascota') || 'aria';
  return MASCOTAS.find(m => m.id === id) || MASCOTAS[0];
}
function _mision(D) {
  const stats = [
    { ic: '📅', val: D.citasHoy,    lbl: 'Citas<br>hoy' },
    { ic: '📞', val: D.seguimiento, lbl: 'Seguimientos<br>pendientes' },
    { ic: '🔥', val: D.calientes,   lbl: 'Leads<br>calientes' },
    { ic: '🏆', val: D.faltanMed,   lbl: 'Venta para<br>medalla' },
    { ic: '💰', val: fmtMoney(D.proj), lbl: 'Comisión<br>proyectada' }
  ];
  return `<div class="hm-mission">
    <div class="hm-mission-head"><span class="hm-mission-ico">${ico.chart}</span><span class="hm-mission-title">Programación del día</span></div>
    <div class="hm-mission-body">
      <div class="hm-mission-stats">
        ${stats.map(s => `<div class="hm-stat"><div class="hm-stat-ic">${s.ic}</div><div class="hm-stat-val">${s.val}</div><div class="hm-stat-lbl">${s.lbl}</div></div>`).join('')}
      </div>
      <div class="hm-mission-mascot" id="hmMascot"></div>
    </div>
  </div>`;
}

function _proximasCitas(D) {
  const hoy = D.allA.filter(a => a.fecha === D.today && a.estado === 'Pendiente').sort((a, b) => a.hora.localeCompare(b.hora)).slice(0, 4);
  if (!hoy.length) return `<div class="dh-empty">${ico.calendar}<span>Sin citas pendientes para hoy</span></div>`;
  return `<div class="dh-appts">${hoy.map(a => `
    <div class="dh-appt" data-estado="${escHtml(a.estado)}">
      <div class="dh-appt-time">${a.hora}</div>
      <div class="dh-appt-main">
        <div class="dh-appt-name">${escHtml(a.nombre)}</div>
        <div class="dh-appt-meta">${escHtml(a.interes || a.origenLead || 'Sin detalle')}${a.telefono ? ` · ${escHtml(a.telefono)}` : ''}</div>
      </div>
      <div class="dh-appt-acts">
        ${a.telefono ? `<button class="dh-ico green" data-action="call" data-id="${a.id}" data-tel="${escHtml(a.telefono)}" data-nombre="${escHtml(a.nombre)}" aria-label="Llamar">${ico.phone}</button>` : ''}
        ${a.telefono ? `<button class="dh-ico green" data-action="wa" data-id="${a.id}" data-type="appt" aria-label="WhatsApp">${ico.whatsapp}</button>` : ''}
        <button class="dh-ico blue" data-action="edit" data-id="${a.id}" aria-label="Editar">${ico.edit}</button>
      </div>
    </div>`).join('')}</div>`;
}

const _EVT = {
  lead:        { ic: ico.people, cls: 'green'  },
  lead_estado: { ic: ico.people, cls: 'purple' },
  venta:       { ic: ico.money,  cls: 'green'  },
  reagenda:    { ic: ico.calendar, cls: 'amber' },
  medalla:     { ic: ico.medal,  cls: 'purple' }
};
function _timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  if (diff < 1) return 'ahora';
  if (diff < 60) return `hace ${Math.round(diff)} min`;
  if (diff < 1440) return `hace ${Math.round(diff / 60)} h`;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}
function _actividad(D) {
  if (!D.recent.length) return `<div class="dh-empty">${ico.list}<span>Aún no hay actividad registrada</span></div>`;
  return `<div class="act-feed">${D.recent.map(e => {
    const m = _EVT[e.tipo] || { ic: ico.list, cls: 'blue' };
    const det = e.tipo === 'venta' ? (planName(e.detalle) || e.detalle) : e.detalle;
    return `<div class="act-item">
      <span class="act-ic ${m.cls}">${m.ic}</span>
      <div class="act-main"><div class="act-title">${escHtml(e.titulo)}</div>${det ? `<div class="act-det">${escHtml(det)}</div>` : ''}</div>
      <span class="act-time">${_timeAgo(e.timestamp)}</span>
    </div>`;
  }).join('')}</div>`;
}

function _rendimientoMes(D) {
  const sueldoPct = pctClamp(D.calc.total, D.metaSueldo);
  const bpiPct    = pctClamp(D.calc.bpi, D.metaBPI);
  const minis = [
    { lbl: 'Ventas del mes', val: fmtMoney(D.calc.total), sub: `/ ${fmtMoney(D.metaSueldo)}`, pct: sueldoPct, cls: 'blue' },
    { lbl: 'BPI acumulado',  val: fmtMoney(D.calc.bpi),   sub: `/ ${fmtMoney(D.metaBPI)}`,   pct: bpiPct, cls: 'green' },
    { lbl: 'Medallas',       val: String(D.totalMed),     sub: `Nivel ${D.nivel}`, pct: D.medEnNivel / 5 * 100, cls: 'purple' },
    { lbl: 'Conversión',     val: `${D.conv}%`,           sub: 'Del mes actual', pct: D.conv, cls: 'amber' }
  ];
  return `<div class="card">
    <div class="card-head"><span class="card-title">Rendimiento del mes</span></div>
    <div class="hm-minis">
      ${minis.map(m => `<div class="hm-mini hm-mini-${m.cls}">
        <div class="hm-mini-lbl">${m.lbl}</div>
        <div class="hm-mini-val">${m.val}</div>
        <div class="hm-mini-sub">${m.sub}</div>
        <div class="hm-mini-bar"><div class="hm-mini-fill" style="width:${m.pct}%"></div></div>
      </div>`).join('')}
      <div class="hm-mini hm-mini-meta">
        <div class="hm-mini-lbl">Meta mensual</div>
        ${_donut(sueldoPct, 'cumplido')}
      </div>
    </div>
    <div class="hm-chart-head">
      <span class="hm-chart-title">Evolución de ventas</span>
      <select class="form-select hm-range" id="hmRange">
        <option value="semana"${_range==='semana'?' selected':''}>Esta semana</option>
        <option value="mes"${_range==='mes'?' selected':''}>Este mes</option>
        <option value="año"${_range==='año'?' selected':''}>Este año</option>
      </select>
    </div>
    <div id="hmChart">${_lineChart(D)}</div>
  </div>`;
}

function _banner(D) {
  const md = D.mejorDia;
  const insight = md.dia
    ? `Tu mejor día esta semana fue el ${md.dia} con ${md.cierres} cierre${md.cierres === 1 ? '' : 's'}.`
    : (D.ventasSem === 0 ? 'Registra tu primera venta de la semana y arranca tu próxima medalla.' : '¡Buen ritmo esta semana, sigue así!');
  return `<div class="dash-banner" id="hmBanner">
    <div class="db-mascot" id="hmBannerMascot">🤖</div>
    <div class="db-msg"><h4>¡Sigue así, ${escHtml(nombrePila())}!</h4><p>Estás a ${D.faltanMed} venta${D.faltanMed === 1 ? '' : 's'} de tu próxima medalla. ${escHtml(insight)}</p></div>
    <div class="db-goal">
      <div class="db-goal-lbl">Próxima medalla: ${escHtml(nivelInfo(calcNivel(D.totalMed + 1)).nombre)}</div>
      <div class="db-goal-bar"><div class="db-goal-fill" style="width:${D.medalProg/4*100}%"></div></div>
      <div class="db-goal-sub">${D.medalProg} de 4 ventas</div>
    </div>
    <div class="db-medal">${ico.medal}</div>
  </div>`;
}

// ════════ Panel derecho (#panel) ════════
export async function renderPanel() {
  const panel = document.getElementById('panel');
  if (S.view !== 'home') return;
  const D = await _load();
  const sueldoPct = pctClamp(D.calc.total, D.metaSueldo);
  const faltante  = Math.max(0, D.metaSueldo - D.calc.total);
  const up = D.calc.total > 0 ? Math.round((D.proj - D.calc.total) / D.calc.total * 100) : 0;

  panel.innerHTML = `
    <div class="panel-card pc-perf">
      <div class="pc-title">Tu rendimiento</div>
      ${_donut(sueldoPct)}
      <div class="pc-rows">
        <div class="pc-row"><span>Ventas actuales</span><strong>${fmtMoney(D.calc.total)}</strong></div>
        <div class="pc-row"><span>Meta mensual</span><strong>${fmtMoney(D.metaSueldo)}</strong></div>
        <div class="pc-row"><span>Faltante</span><strong class="${faltante > 0 ? 'neg' : 'pos'}">${fmtMoney(faltante)}</strong></div>
      </div>
    </div>
    <div class="panel-card">
      <div class="pc-title">Próxima medalla</div>
      <div class="pc-medal">
        <div class="pc-medal-ico">${ico.medal}</div>
        <div><div class="pc-medal-name">${escHtml(nivelInfo(calcNivel(D.totalMed + 1)).nombre)}</div><div class="pc-medal-sub">${D.medalProg} de 4 ventas</div></div>
      </div>
      <div class="pc-bar"><div class="pc-bar-fill" style="width:${D.medalProg/4*100}%"></div></div>
      <div class="pc-hint">${D.faltanMed === 4 ? '¡Medalla lista esta semana!' : `Te ${D.faltanMed === 1 ? 'falta' : 'faltan'} ${D.faltanMed} venta${D.faltanMed === 1 ? '' : 's'}`}</div>
    </div>
    <div class="panel-card">
      <div class="pc-title">Comisión proyectada</div>
      <div class="pc-proj">${fmtMoney(D.proj)}</div>
      <div class="pc-proj-sub">Al cierre del mes ${up > 0 ? `<span class="pc-up">+${up}%</span>` : ''}</div>
      <div class="pc-proj-now">Hoy: ${fmtMoney(D.calc.total)}</div>
    </div>
    <div class="panel-card">
      <div class="pc-title">Accesos rápidos</div>
      <button class="pc-quick" id="hqLead">${ico.plus}<span>Nuevo lead</span></button>
      <button class="pc-quick" id="hqCalc">${ico.money}<span>Calculadora</span></button>
      <button class="pc-quick" id="hqWa">${ico.whatsapp}<span>Plantillas WhatsApp</span></button>
    </div>`;

  panel.querySelector('#hqLead')?.addEventListener('click', () => window._app?.openLeadModal?.());
  panel.querySelector('#hqCalc')?.addEventListener('click', () => window._app?.navigate?.('calculadora'));
  panel.querySelector('#hqWa')?.addEventListener('click',   () => window._app?.navigate?.('whatsapp'));

  // Pinta la mascota (hero + banner) una vez renderizado el center
  _paintMascot();
}

async function _paintMascot() {
  const m = await _misionMascota();
  const html = m.img ? `<img src="${m.img}" alt="${escHtml(m.nombre)}">` : (m.emoji || '🤖');
  const hero = document.getElementById('hmMascot');
  const ban  = document.getElementById('hmBannerMascot');
  if (hero) hero.innerHTML = html;
  if (ban)  ban.innerHTML = html;
}
