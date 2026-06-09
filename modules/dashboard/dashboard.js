// modules/dashboard/dashboard.js — Dashboard ejecutivo (rediseño v3.3)
// SOLO presentación: usa la capa de servicios y los motores existentes. No cambia lógica/cálculos.
import { appointments } from '../../services/appointment.service.js';
import { leads } from '../../services/lead.service.js';
import { sales } from '../../services/sales.service.js';
import { calls } from '../../services/call.service.js';
import { config } from '../../services/config.service.js';
import { PLANES } from '../../js/planes.js';
import { fmtMoney, formatDate, todayStr, addDays, escHtml, getInitials, avatarColor, statusBadgeClass } from '../../js/utils.js';
import { getWeekStart, calcMonthComision } from '../../services/commission.service.js';
import { calcTotalMedallas, calcNivel } from '../../services/medal.service.js';
import { MASCOTAS } from '../../js/mascotas.js';
import { ico } from '../../js/ui.js';

// Metas de visualización (configurables; defaults razonables para 1 asesor)
const DEFAULT_META_SUELDO = 1500000;
const DEFAULT_META_BPI    = 300000;

const planCom = id => (PLANES.find(p => p.id === id)?.comision) || 0;
const pctClamp = (a, b) => b > 0 ? Math.min(100, Math.round(a / b * 100)) : 0;

function fmtShort(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1) + 'M';
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'K';
  return '$' + Math.round(n);
}

// ── Datos comunes ──
async function _load() {
  const [allA, allL, allS, allC] = await Promise.all([
    appointments.getAll(), leads.getAll(), sales.getAll(), calls.getAll()
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

  const totalMed  = calcTotalMedallas(allS);
  const nivel     = calcNivel(totalMed);
  const medEnNivel = totalMed % 5;

  const wkMon     = getWeekStart(today);
  const ventasSem = allS.filter(s => getWeekStart(s.fecha) === wkMon).length;
  const medalProg = ventasSem % 4;            // ventas hacia la próxima medalla (cada 4)

  return { allA, allL, allS, allC, now, today, year, month, calc, metaSueldo, metaBPI,
           asistio, noAsis, contrato, conv, totalMed, nivel, medEnNivel, wkMon, ventasSem, medalProg };
}

// ── Gráficos (SVG/CSS inline, sin librerías, offline) ──
function _barChart(wkMon, allS) {
  const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const today = todayStr();
  const cols = dias.map((lbl, i) => {
    const d = addDays(wkMon, i);
    const val = allS.filter(s => s.fecha === d).reduce((a, s) => a + planCom(s.plan), 0);
    return { lbl, val, isToday: d === today };
  });
  const max = Math.max(...cols.map(c => c.val), 1);
  return `<div class="bars">${cols.map(c => {
    const h = c.val > 0 ? Math.max(6, Math.round(c.val / max * 100)) : 2;
    return `<div class="bar-col">
      <div class="bar-wrap">
        ${c.val > 0 ? `<span class="bar-val${c.isToday ? ' on' : ''}">${fmtShort(c.val)}</span>` : ''}
        <div class="bar${c.isToday ? ' today' : ''}${c.val === 0 ? ' empty' : ''}" style="height:${h}%"></div>
      </div>
      <span class="bar-lbl${c.isToday ? ' on' : ''}">${c.lbl}</span>
    </div>`;
  }).join('')}</div>`;
}

function _lineChart(allS, now, metaSueldo) {
  const year = now.getFullYear(), month = now.getMonth() + 1;
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const dim = new Date(year, month, 0).getDate();
  const dToday = now.getDate();
  let cum = 0;
  const vals = [];
  for (let day = 1; day <= dToday; day++) {
    const ds = `${prefix}-${String(day).padStart(2, '0')}`;
    cum += allS.filter(s => s.fecha === ds).reduce((a, s) => a + planCom(s.plan), 0);
    vals.push(pctClamp(cum, metaSueldo));
  }
  const finalPct = vals.length ? vals[vals.length - 1] : 0;
  if (vals.length < 2) return `<div class="lc-wrap"><div class="empty-mini">El gráfico se llena a medida que registras ventas del mes</div></div>`;
  const w = 580, h = 200, pad = 10, n = vals.length;
  const pts = vals.map((v, i) => [pad + (i / (n - 1)) * (w - 2 * pad), h - pad - (v / 100) * (h - 2 * pad)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[n - 1][0].toFixed(1)} ${h - pad} L${pts[0][0].toFixed(1)} ${h - pad} Z`;
  const grid = [0, 25, 50, 75, 100].map(g => {
    const y = h - pad - (g / 100) * (h - 2 * pad);
    return `<line x1="${pad}" y1="${y.toFixed(1)}" x2="${w - pad}" y2="${y.toFixed(1)}" class="lc-grid"/>`;
  }).join('');
  return `<div class="lc-wrap">
    <svg viewBox="0 0 ${w} ${h}" class="line-chart" preserveAspectRatio="none">
      ${grid}<path d="${area}" class="lc-area"/><path d="${line}" class="lc-line"/>
    </svg>
    <div class="lc-callout" style="bottom:calc(${finalPct}% - 2px)">${finalPct}%</div>
  </div>`;
}

function _donut(pct) {
  const r = 52, c = 2 * Math.PI * r, off = c * (1 - Math.min(100, pct) / 100);
  return `<svg viewBox="0 0 130 130" class="donut">
    <circle cx="65" cy="65" r="${r}" class="donut-track"/>
    <circle cx="65" cy="65" r="${r}" class="donut-val" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 65 65)"/>
    <text x="65" y="62" class="donut-pct">${Math.round(pct)}%</text>
    <text x="65" y="82" class="donut-lbl">Meta mensual</text>
  </svg>`;
}

// ── Vista principal (#center) ──
export async function render() {
  const center = document.getElementById('center');
  const D = await _load();
  const sueldoPct = pctClamp(D.calc.total, D.metaSueldo);
  const bpiPct    = pctClamp(D.calc.bpi, D.metaBPI);

  // KPIs
  const kpis = [
    { lbl: 'SUELDO DEL MES', val: fmtMoney(D.calc.total), sub: `Meta: ${fmtMoney(D.metaSueldo)}`, pct: sueldoPct, cls: 'blue' },
    { lbl: 'BPI ACUMULADO',  val: fmtMoney(D.calc.bpi),   sub: `Meta mensual: ${fmtMoney(D.metaBPI)}`, pct: bpiPct, cls: 'green' },
    { lbl: 'MEDALLAS',       val: String(D.totalMed),     sub: `Próxima: Nivel ${D.nivel + 1}`, pct: Math.round(D.medEnNivel / 5 * 100), txt: `${D.medEnNivel}/5`, cls: 'purple' },
    { lbl: 'CONVERSIÓN',     val: `${D.conv}%`,            sub: `${D.contrato}/${D.asistio + D.noAsis} reuniones`, pct: D.conv, cls: 'amber' }
  ];
  const kpiHtml = kpis.map(k => `
    <div class="kpi kpi-${k.cls}">
      <div class="kpi-top"><span class="kpi-lbl">${k.lbl}</span><span class="kpi-ico">${ico.chart}</span></div>
      <div class="kpi-val">${k.val}</div>
      <div class="kpi-sub">${k.sub}</div>
      <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${k.pct}%"></div><span class="kpi-bar-pct">${k.txt || k.pct + '%'}</span></div>
    </div>`).join('');

  // Agenda de hoy
  const hoy = D.allA.filter(a => a.fecha === D.today).sort((a, b) => a.hora.localeCompare(b.hora));
  const apptHtml = hoy.length ? hoy.slice(0, 5).map(a => `
    <div class="dh-appt" data-estado="${escHtml(a.estado)}">
      <div class="dh-appt-time">${a.hora}</div>
      <div class="dh-appt-main">
        <div class="dh-appt-name">${escHtml(a.nombre)}</div>
        <div class="dh-appt-meta">${escHtml(a.interes || a.origenLead || 'Sin detalle')}${a.telefono ? ` · ${escHtml(a.telefono)}` : ''}</div>
      </div>
      <span class="${statusBadgeClass(a.estado)}">${escHtml(a.estado)}</span>
      <div class="dh-appt-acts">
        ${a.telefono ? `<button class="dh-ico green" data-action="call" data-id="${a.id}" data-tel="${escHtml(a.telefono)}" data-nombre="${escHtml(a.nombre)}" aria-label="Llamar">${ico.phone}</button>` : ''}
        ${a.telefono ? `<button class="dh-ico green" data-action="wa" data-id="${a.id}" data-type="appt" aria-label="WhatsApp">${ico.whatsapp}</button>` : ''}
        <button class="dh-ico blue" data-action="edit" data-id="${a.id}" aria-label="Editar">${ico.edit}</button>
      </div>
    </div>`).join('') : `<div class="dh-empty">${ico.calendar}<span>Sin citas para hoy</span></div>`;

  // Últimos leads
  const recientes = [...D.allL].sort((a, b) => (b.fechaCreacion || '').localeCompare(a.fechaCreacion || '')).slice(0, 5);
  const leadHtml = recientes.length ? recientes.map(l => {
    const init = getInitials(l.nombre, l.apellido), bg = avatarColor((l.nombre || '') + (l.apellido || ''));
    const fch = l.fechaCreacion ? formatDate(l.fechaCreacion.slice(0, 10)) : '';
    return `<div class="dh-lead" data-action="edit-lead" data-id="${l.id}">
      <div class="dh-lead-av" style="background:${bg}">${init}</div>
      <div class="dh-lead-main">
        <div class="dh-lead-name">${escHtml(l.nombre)} ${escHtml(l.apellido || '')}</div>
        <div class="dh-lead-meta">${escHtml(l.empresa || l.interes || '—')}</div>
      </div>
      <span class="${statusBadgeClass(l.estado)}">${escHtml(l.estado)}</span>
      <span class="dh-lead-date">${fch}</span>
    </div>`;
  }).join('') : `<div class="dh-empty">${ico.people}<span>Aún no hay leads</span></div>`;

  // Banner mascota
  const mascotId = await config.get('mascota') || 'aria';
  const mascota  = MASCOTAS.find(m => m.id === mascotId) || MASCOTAS[0];
  const faltan   = 4 - D.medalProg;
  const motiv    = D.ventasSem === 0
    ? 'Registra tu primera venta de la semana y arranca tu próxima medalla.'
    : (faltan === 4 ? '¡Acabas de sumar una medalla esta semana!' : `Te ${faltan === 1 ? 'falta' : 'faltan'} ${faltan} venta${faltan === 1 ? '' : 's'} para tu próxima medalla.`);
  const banner = `<div class="dash-banner">
    <div class="db-mascot">${mascota.img ? `<img src="${mascota.img}" alt="${escHtml(mascota.nombre)}">` : (mascota.emoji || '🤖')}</div>
    <div class="db-msg"><h4>¡Sigue así, ${escHtml((S_name()).split(' ')[0])}!</h4><p>${motiv}</p></div>
    <div class="db-goal">
      <div class="db-goal-lbl">Próxima medalla · Nivel ${D.nivel + 1}</div>
      <div class="db-goal-bar"><div class="db-goal-fill" style="width:${D.medalProg / 4 * 100}%"></div></div>
      <div class="db-goal-sub">${D.medalProg} de 4 ventas</div>
    </div>
    <div class="db-medal">${ico.medal}</div>
  </div>`;

  center.innerHTML = `<div class="view-animate dash">
    <div class="kpi-row">${kpiHtml}</div>
    <div class="chart-row">
      <div class="card chart-card">
        <div class="card-head"><span class="card-title">Ventas semanales</span><span class="card-tag">Esta semana</span></div>
        ${_barChart(D.wkMon, D.allS)}
      </div>
      <div class="card chart-card">
        <div class="card-head"><span class="card-title">Progreso mensual</span><span class="card-tag">Este mes</span></div>
        ${_lineChart(D.allS, D.now, D.metaSueldo)}
      </div>
    </div>
    <div class="mid-row">
      <div class="card">
        <div class="card-head"><span class="card-title">Agenda de hoy</span><button class="card-link" data-go="agenda">Ver agenda completa →</button></div>
        <div class="dh-appts">${apptHtml}</div>
      </div>
      <div class="card">
        <div class="card-head"><span class="card-title">Últimos leads</span><button class="card-link" data-go="leads">Ver todos →</button></div>
        <div class="dh-leads">${leadHtml}</div>
      </div>
    </div>
    ${banner}
  </div>`;

  window._app?.attachCardEvents?.();
  center.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => window._app?.navigate?.(b.dataset.go)));
}

// Nombre del usuario (cacheado por renderNav en S.userName)
import { S } from '../../js/state.js';
function S_name() { return S.userName || 'Asesor'; }

// ── Panel derecho (#panel) ──
export async function renderPanel() {
  const panel = document.getElementById('panel');
  if (S.view !== 'dashboard') return;   // si no es dashboard, lo gestiona agenda
  const D = await _load();
  const sueldoPct = pctClamp(D.calc.total, D.metaSueldo);
  const faltante  = Math.max(0, D.metaSueldo - D.calc.total);

  // Proyección lineal de cierre de mes (solo display)
  const dim = new Date(D.year, D.month, 0).getDate();
  const dHoy = D.now.getDate();
  const proj = dHoy > 0 ? Math.round(D.calc.total * dim / dHoy) : D.calc.total;
  const up = D.calc.total > 0 ? Math.round((proj - D.calc.total) / D.calc.total * 100) : 0;
  const faltanMed = 4 - D.medalProg;

  panel.innerHTML = `
    <div class="panel-card pc-perf">
      <div class="pc-title">Tu rendimiento</div>
      ${_donut(sueldoPct)}
      <div class="pc-rows">
        <div class="pc-row"><span>Sueldo actual</span><strong>${fmtMoney(D.calc.total)}</strong></div>
        <div class="pc-row"><span>Meta mensual</span><strong>${fmtMoney(D.metaSueldo)}</strong></div>
        <div class="pc-row"><span>Faltante</span><strong class="${faltante > 0 ? 'neg' : 'pos'}">${fmtMoney(faltante)}</strong></div>
      </div>
    </div>

    <div class="panel-card">
      <div class="pc-title">Próxima medalla</div>
      <div class="pc-medal">
        <div class="pc-medal-ico">${ico.medal}</div>
        <div>
          <div class="pc-medal-name">Nivel ${D.nivel + 1}</div>
          <div class="pc-medal-sub">${D.medalProg} de 4 ventas</div>
        </div>
      </div>
      <div class="pc-bar"><div class="pc-bar-fill" style="width:${D.medalProg / 4 * 100}%"></div></div>
      <div class="pc-hint">${faltanMed === 4 ? '¡Medalla lista esta semana!' : `Te ${faltanMed === 1 ? 'falta' : 'faltan'} ${faltanMed} venta${faltanMed === 1 ? '' : 's'}`}</div>
    </div>

    <div class="panel-card">
      <div class="pc-title">Comisión proyectada</div>
      <div class="pc-proj">${fmtMoney(proj)}</div>
      <div class="pc-proj-sub">Al cierre del mes ${up > 0 ? `<span class="pc-up">+${up}%</span>` : ''}</div>
      <div class="pc-proj-now">Hoy: ${fmtMoney(D.calc.total)}</div>
    </div>

    <div class="panel-card">
      <div class="pc-title">Accesos rápidos</div>
      <button class="pc-quick" id="qLead">${ico.plus}<span>Nuevo lead</span></button>
      <button class="pc-quick" id="qCalc">${ico.money}<span>Calculadora</span></button>
      <button class="pc-quick" id="qWa">${ico.whatsapp}<span>Plantillas WhatsApp</span></button>
    </div>`;

  panel.querySelector('#qLead')?.addEventListener('click', () => window._app?.openLeadModal?.());
  panel.querySelector('#qCalc')?.addEventListener('click', () => window._app?.navigate?.('calculadora'));
  panel.querySelector('#qWa')?.addEventListener('click', () => window._app?.navigate?.('whatsapp'));
}
