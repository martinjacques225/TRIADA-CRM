/* ============================================================================
   roles/admin.js · Rol OPERACIÓN / ADMINISTRADOR — centro de mando
   Shell con SIDEBAR (drawer en móvil) + topbar. Ve y gestiona todo:
     Dashboard · Mesas · Caja · Reservas · Clientes (CRM) · Inventario
   + Reportes / Personal / Configuración (pendientes de diseñar → placeholder).
   Desktop-first y denso; en móvil el sidebar colapsa a hamburguesa.
   ========================================================================== */

import { icon, esc, clp, plural, initials, brandMark } from '../util.js';
import { badge, emptyState, countPill, modal } from '../components.js';
import { billItems, billSubtotal } from '../domain.js';
import { payPanel, receiptModal } from './cajero.js';

/* Config de estado de mesa (colores de marca). */
function statusCfg(st) {
  return ({
    libre:     { label: 'Libre',         dot: 'var(--color-text-3)', tint: 'var(--color-surface)',       bd: 'var(--color-border)',      fg: 'var(--color-text-3)' },
    ocupada:   { label: 'Ocupada',       dot: 'var(--color-primary)', tint: 'var(--color-primary-50)',   bd: 'var(--color-primary-200)', fg: 'var(--color-primary-700)' },
    reservada: { label: 'Reservada',     dot: 'var(--color-info)',    tint: 'var(--color-info-soft)',    bd: 'var(--color-info)',        fg: 'var(--color-info-fg)' },
    atencion:  { label: 'Atención',      dot: 'var(--color-warning)', tint: 'var(--color-warning-soft)', bd: 'var(--color-warning)',     fg: 'var(--color-warning-fg)' },
    cuenta:    { label: 'Espera cuenta', dot: 'var(--color-success)', tint: 'var(--color-success-soft)', bd: 'var(--color-success)',     fg: 'var(--color-success-fg)' },
  })[st];
}
const ZONES = ['Salón principal', 'Terraza', 'Barra', 'Privado'];

const occOf = (s) => s.tables.filter(t => ['ocupada', 'atencion', 'cuenta'].includes(t.status)).length;

/* ============================ DASHBOARD ================================ */
function dashboard(s) {
  const occ = occOf(s), free = s.tables.filter(t => t.status === 'libre').length, res = s.tables.filter(t => t.status === 'reservada').length;
  const prep = s.tickets.filter(t => t.status === 'preparacion').length;
  const isDay = s.salesMode === 'dia';

  const kpi = (lab, ic, val, deltaHtml) => `<div class="kpi">
    <div class="kpi-top"><span class="eyebrow">${lab}</span>${icon(ic, { size: 18, color: 'var(--color-primary)' })}</div>
    <div class="kpi-val tnum">${val}</div><div style="margin-top:8px;">${deltaHtml}</div></div>`;
  const up = (pct, note) => `<span class="kpi-delta" style="color:var(--color-success);">${icon('arrowUp', { size: 14, sw: 2.2 })}${pct}</span> <span style="font-size:12px;color:var(--color-text-3);">${note}</span>`;

  // Barras de ventas
  const weekRaw = [['Lun', 1210000, 0], ['Mar', 1050000, 0], ['Mié', 1340000, 0], ['Jue', 1580000, 0], ['Vie', 2410000, 0], ['Sáb', 1842500, 1], ['Dom', 0, 2]];
  const dayRaw = [['12h', 64000, 0], ['13h', 198000, 0], ['14h', 286000, 0], ['15h', 172000, 0], ['16h', 88000, 0], ['17h', 76000, 0], ['18h', 134000, 0], ['19h', 228000, 0], ['20h', 312000, 1], ['21h', 196000, 0], ['22h', 88500, 0]];
  const raw = isDay ? dayRaw : weekRaw, maxB = isDay ? 312000 : 2410000;
  const bars = raw.map(([label, v, kind]) => {
    const fill = kind === 2 ? 'var(--color-surface-2)' : kind === 1 ? 'linear-gradient(180deg, var(--color-primary-400), var(--color-primary))' : 'var(--color-primary-100)';
    const h = (v ? Math.max(6, v / maxB * 100) : 4) + '%';
    return `<div class="bar"><span class="tnum" style="font-size:11.5px;font-weight:700;color:var(--color-text-2);">${v ? '$' + (v / 1000).toFixed(0) + 'k' : '—'}</span>
      <div class="bar-fill" style="height:${h};background:${fill};"></div>
      <span style="font-size:12px;font-weight:600;color:${kind === 1 ? 'var(--color-primary-700)' : 'var(--color-text-3)'};">${label}</span></div>`;
  }).join('');
  const tog = (id, label) => `<button class="opt" style="border:none;background:${(isDay ? id === 'dia' : id === 'semana') ? 'var(--color-surface)' : 'transparent'};color:${(isDay ? id === 'dia' : id === 'semana') ? 'var(--color-primary-700)' : 'var(--color-text-3)'};box-shadow:${(isDay ? id === 'dia' : id === 'semana') ? 'var(--shadow-sm)' : 'none'};padding:5px 12px;border-radius:9999px;font-size:12.5px;" data-action="admin:salesMode" data-val="${id}">${label}</button>`;

  // Donut ocupación
  const DC = 389.56;
  const seg = (count, from) => `${Math.max(0, count / 25 * DC - 3).toFixed(1)} ${DC.toFixed(1)}`;
  const rot = (from) => (-90 + from / 25 * 360).toFixed(2);
  const occPct = Math.round(occ / 25 * 100);

  const tp = [['Lomo saltado', 42, 583800], ['Risotto de hongos', 38, 490200], ['Ceviche de reineta', 31, 306900], ['Salmón grillado', 27, 429300], ['Tiramisú', 24, 153600]];
  const products = tp.map(([name, qty, amount]) => `<div class="prod">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;">
      <span style="font-size:14px;font-weight:600;color:var(--color-ink);">${esc(name)}</span>
      <span class="tnum" style="font-size:13px;color:var(--color-text-2);"><b style="color:var(--color-ink);">${qty}</b> · ${clp(amount)}</span></div>
    <div class="prodbar"><span style="width:${qty / 42 * 100}%;background:linear-gradient(90deg,var(--color-primary-600),var(--color-primary));"></span></div></div>`).join('');

  const waiters = [['Camila Soto', 612400, 9, '4.9', 'var(--color-primary-50)', 'var(--color-primary-700)'], ['Valentina Lagos', 548900, 8, '4.8', 'var(--color-info-soft)', 'var(--color-info-fg)'], ['Fernanda Díaz', 491200, 7, '4.7', 'var(--color-success-soft)', 'var(--color-success-fg)'], ['Matías Rojas', 422600, 6, '4.6', 'var(--color-warning-soft)', 'var(--color-warning-fg)'], ['Joaquín Muñoz', 388100, 6, '4.6', 'var(--color-surface-2)', 'var(--color-text-2)']];
  const wRows = waiters.map(([name, sales, tbl, rating, bg, fg]) => `<tr>
    <td><div style="display:flex;align-items:center;gap:10px;"><span class="client-av" style="width:30px;height:30px;font-size:11.5px;background:${bg};color:${fg};">${initials(name)}</span><span style="font-weight:600;color:var(--color-ink);">${esc(name)}</span></div></td>
    <td class="num" style="text-align:right;font-weight:700;color:var(--color-ink);">${clp(sales)}</td>
    <td class="num" style="text-align:right;color:var(--color-text-2);">${tbl}</td>
    <td class="num" style="text-align:right;font-weight:700;color:var(--color-warning-fg);">★ ${rating}</td></tr>`).join('');

  return `<div class="admin-wrap fade-up">
    <div class="kpi-grid">
      ${kpi('Ventas del día', 'dollar', '$1.842.500', up('12,4%', 'vs. ayer'))}
      ${kpi('Ticket promedio', 'card', '$24.900', up('3,1%', '74 cuentas hoy'))}
      ${kpi('Mesas ocupadas', 'table', `${occ}<span style="font-size:20px;color:var(--color-text-3);">/25</span>`, `<span style="font-size:12px;color:var(--color-text-2);">${free} libres · ${res} reserva</span>`)}
      ${kpi('En preparación', 'clock', prep, `<span style="font-size:12px;color:var(--color-text-2);">86 entregados ·</span> <b style="font-size:12px;color:var(--color-success-fg);">9 min prom.</b>`)}
    </div>
    <div class="dash-2">
      <div class="card card-pad">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;">
          <div><h3 style="font-size:19px;">${isDay ? 'Ventas de hoy' : 'Ventas de la semana'}</h3>
            <div style="font-size:13px;color:var(--color-text-3);margin-top:2px;">${isDay ? 'Hoy · Sábado 13 jun' : 'Lun 8 — Dom 14 jun'} · <b style="color:var(--color-text-2);">${isDay ? '$1.842.500' : '$9.430.000'}</b></div></div>
          <div style="display:flex;gap:3px;padding:4px;background:var(--color-surface-2);border-radius:9999px;">${tog('dia', 'Día')}${tog('semana', 'Semana')}</div>
        </div>
        <div class="bars">${bars}</div>
      </div>
      <div class="card card-pad">
        <h3 style="font-size:19px;">Ocupación</h3><div style="font-size:13px;color:var(--color-text-3);">25 mesas · salón completo</div>
        <div class="donut-wrap">
          <svg width="172" height="172" viewBox="0 0 172 172">
            <circle cx="86" cy="86" r="62" fill="none" stroke="var(--color-surface-2)" stroke-width="18"/>
            <circle cx="86" cy="86" r="62" fill="none" stroke="var(--color-primary)" stroke-width="18" stroke-dasharray="${seg(occ)}" transform="rotate(${rot(0)} 86 86)"/>
            <circle cx="86" cy="86" r="62" fill="none" stroke="var(--color-text-3)" stroke-width="18" stroke-dasharray="${seg(free)}" transform="rotate(${rot(occ)} 86 86)"/>
            <circle cx="86" cy="86" r="62" fill="none" stroke="var(--color-info)" stroke-width="18" stroke-dasharray="${seg(res)}" transform="rotate(${rot(occ + free)} 86 86)"/>
          </svg>
          <div class="donut-center"><span class="serif tnum" style="font-size:32px;font-weight:600;color:var(--color-ink);">${occPct}%</span><span style="font-size:12px;font-weight:600;color:var(--color-text-3);">ocupación</span></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:9px;">
          <div class="legend-row"><span class="sq" style="background:var(--color-primary);"></span><span style="color:var(--color-text-2);">Ocupadas</span><span class="tnum" style="margin-left:auto;font-weight:700;color:var(--color-ink);">${occ}</span></div>
          <div class="legend-row"><span class="sq" style="background:var(--color-text-3);"></span><span style="color:var(--color-text-2);">Libres</span><span class="tnum" style="margin-left:auto;font-weight:700;color:var(--color-ink);">${free}</span></div>
          <div class="legend-row"><span class="sq" style="background:var(--color-info);"></span><span style="color:var(--color-text-2);">Reservadas</span><span class="tnum" style="margin-left:auto;font-weight:700;color:var(--color-ink);">${res}</span></div>
        </div>
      </div>
    </div>
    <div class="dash-3">
      <div class="card card-pad"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;"><h3 style="font-size:19px;">Productos más vendidos</h3><span style="font-size:11.5px;color:var(--color-text-3);font-weight:600;">Hoy</span></div>${products}</div>
      <div class="card card-pad"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;"><h3 style="font-size:19px;">Rendimiento de meseros</h3><span style="font-size:11.5px;color:var(--color-text-3);font-weight:600;">8 activos</span></div>
        <table class="tx-table"><thead><tr><th>Mesero</th><th style="text-align:right;">Ventas</th><th style="text-align:right;">Mesas</th><th style="text-align:right;">★</th></tr></thead><tbody>${wRows}</tbody></table></div>
    </div>
  </div>`;
}

/* ============================ MESAS ==================================== */
function mesas(s) {
  const cnt = (st) => s.tables.filter(t => t.status === st).length;
  const legend = [['libre', 'Libres'], ['ocupada', 'Ocupadas'], ['reservada', 'Reservadas'], ['atencion', 'Solicita atención'], ['cuenta', 'Espera cuenta']]
    .map(([st, lab]) => { const c = statusCfg(st); return `<span class="badge" style="background:var(--color-surface);border:1px solid var(--color-border);"><span class="dot" style="background:${c.dot};"></span>${lab} <b class="tnum" style="color:var(--color-ink);">${cnt(st)}</b></span>`; }).join('');

  const zonesHtml = ZONES.map(zn => {
    const tbls = s.tables.filter(t => t.zone === zn);
    const cards = tbls.map(t => {
      const c = statusCfg(t.status);
      const sel = s.selTable === t.id;
      return `<button class="table-btn" style="background:${c.tint};border-color:${sel ? 'var(--color-primary)' : c.bd};box-shadow:${sel ? '0 0 0 3px rgba(12,124,136,.18)' : 'var(--shadow-sm)'};" data-action="admin:selTable" data-id="${t.id}">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span class="table-num">${t.num}</span>
          <span style="display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;color:var(--color-text-3);">${icon('users', { size: 13 })}${t.seats}</span></div>
        <span class="badge" style="align-self:flex-start;background:rgba(255,255,255,0.7);color:${c.fg};font-size:10.5px;"><span class="dot" style="background:${c.dot};"></span>${c.label}</span>
        ${t.total ? `<div style="margin-top:auto;display:flex;align-items:center;justify-content:space-between;"><span style="font-size:12px;font-weight:600;color:var(--color-text-2);">${esc((t.waiter || '—').split(' ')[0])}</span><span class="tnum" style="font-size:12.5px;font-weight:700;color:var(--color-ink);">${clp(t.total)}</span></div>` : ''}
      </button>`;
    }).join('');
    return `<div><div class="zone-head"><span style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--color-ink);">${zn}</span><span class="zone-line"></span><span style="font-size:11.5px;font-weight:600;color:var(--color-text-3);">${tbls.length} mesas</span></div><div class="tables-grid">${cards}</div></div>`;
  }).join('');

  return `<div class="admin-wrap fade-up">
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:22px;">${legend}</div>
    <div class="mesas-grid">
      <div style="display:flex;flex-direction:column;gap:24px;">${zonesHtml}</div>
      <div class="tdetail">${tableDetail(s)}</div>
    </div>
  </div>`;
}

function tableDetail(s) {
  if (!s.selTable) {
    return `<div class="tdetail-card" style="padding:32px 24px;text-align:center;">
      <div class="state-icon" style="margin:0 auto 14px;background:var(--color-primary-50);color:var(--color-primary);">${icon('table', { size: 24 })}</div>
      <div class="state-title">Selecciona una mesa</div>
      <div class="state-sub">Toca cualquier mesa del mapa para ver su detalle y ejecutar acciones.</div></div>`;
  }
  const t = s.tables.find(x => x.id === s.selTable);
  if (!t) return '';
  const c = statusCfg(t.status);
  const isOcc = ['ocupada', 'atencion', 'cuenta'].includes(t.status);
  const action = s.tableAction;

  let body;
  if (action === 'transfer') {
    const targets = s.tables.filter(x => x.status === 'libre').map(x => `<button class="opt" style="display:flex;flex-direction:column;gap:2px;padding:10px 4px;" data-action="admin:transfer" data-id="${x.id}"><span class="serif" style="font-size:17px;color:var(--color-ink);">${x.num}</span><span style="font-size:10px;color:var(--color-text-3);">${x.seats} pers</span></button>`).join('');
    body = `${backBtn()}<div style="font-size:13px;font-weight:600;color:var(--color-ink);margin-bottom:10px;">Transferir a mesa libre:</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">${targets}</div>`;
  } else if (action === 'join') {
    const targets = s.tables.filter(x => x.id !== t.id && x.status !== 'reservada').map(x => { const cc = statusCfg(x.status); return `<button class="opt" style="display:flex;align-items:center;gap:10px;justify-content:flex-start;" data-action="admin:join" data-id="${x.id}"><span class="serif" style="font-size:16px;color:var(--color-ink);width:26px;">${x.num}</span><span style="font-size:12px;color:var(--color-text-2);"><span class="dot" style="display:inline-block;width:7px;height:7px;border-radius:9999px;background:${cc.dot};margin-right:5px;"></span>${cc.label}</span></button>`; }).join('');
    body = `${backBtn()}<div style="font-size:13px;font-weight:600;color:var(--color-ink);margin-bottom:10px;">Unir Mesa ${t.num} con:</div><div style="display:flex;flex-direction:column;gap:6px;max-height:240px;overflow-y:auto;">${targets}</div>`;
  } else if (action === 'split') {
    body = `${backBtn()}<div style="font-size:13px;font-weight:600;color:var(--color-ink);margin-bottom:4px;">Dividir cuenta en partes iguales:</div><div style="font-size:12px;color:var(--color-text-3);margin-bottom:12px;">Consumo ${clp(t.total)}</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">${[2, 3, 4].map(n => `<button class="opt" style="display:flex;flex-direction:column;gap:2px;padding:14px 4px;" data-action="admin:split" data-val="${n}"><span class="serif" style="font-size:20px;color:var(--color-ink);">${n}</span><span style="font-size:10.5px;color:var(--color-text-3);">partes</span></button>`).join('')}</div>`;
  } else if (t.status === 'libre') {
    body = `<button class="btn btn-primary btn-block" data-action="admin:open" data-id="${t.id}">${icon('plus', { size: 18 })}Abrir mesa</button>`;
  } else if (t.status === 'reservada') {
    body = `<div class="badge" style="background:var(--color-info-soft);color:var(--color-info-fg);width:100%;justify-content:flex-start;padding:11px 13px;margin-bottom:12px;">${icon('calendar', { size: 16 })}Reserva confirmada para hoy</div><button class="btn btn-primary btn-block" data-action="admin:open" data-id="${t.id}">Sentar comensales</button>`;
  } else if (isOcc) {
    body = `<button class="btn btn-primary btn-block" data-action="admin:cobrar" style="margin-bottom:10px;">${icon('card', { size: 18 })}Cobrar mesa</button>
      <div class="act-grid">
        <button class="btn btn-secondary btn-sm" data-action="admin:tableAction" data-val="transfer">${icon('transfer', { size: 16 })}Transferir</button>
        <button class="btn btn-secondary btn-sm" data-action="admin:tableAction" data-val="join">${icon('users', { size: 16 })}Unir</button>
        <button class="btn btn-secondary btn-sm" data-action="admin:tableAction" data-val="split">${icon('split', { size: 16 })}Dividir</button>
        <button class="btn btn-sm" style="border:1px solid var(--color-warning);background:var(--color-warning-soft);color:var(--color-warning-fg);" data-action="admin:atencion">${icon('alert', { size: 16 })}${t.status === 'atencion' ? 'Quitar aviso' : 'Atención'}</button>
      </div>
      <button class="btn btn-ghost btn-sm btn-block" data-action="admin:free" data-id="${t.id}" style="margin-top:8px;color:var(--color-text-3);">Liberar mesa sin cobrar</button>`;
  }

  return `<div class="tdetail-card">
    <div class="tdetail-head" style="background:${c.tint};border-color:${c.bd};">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div><div class="eyebrow" style="color:${c.fg};">${esc(t.zone)}</div><div class="serif" style="font-size:28px;font-weight:600;color:var(--color-ink);line-height:1.1;margin-top:2px;">Mesa ${t.num}</div></div>
        <span class="badge" style="background:rgba(255,255,255,0.7);color:${c.fg};"><span class="dot" style="background:${c.dot};"></span>${c.label}</span></div>
    </div>
    <div style="padding:18px 20px;">
      <div class="tdetail-grid">
        <div><div class="k">Mesero</div><div class="v">${esc(t.waiter || 'Sin asignar')}</div></div>
        <div><div class="k">Comensales</div><div class="v">${t.seats} personas</div></div>
        <div><div class="k">Tiempo</div><div class="v">${t.mins ? 'Hace ' + t.mins + ' min' : 'Recién'}</div></div>
        <div><div class="k">Consumo</div><div class="v tnum">${clp(t.total)}</div></div>
      </div>
      ${body}
    </div>
  </div>`;
}
const backBtn = () => `<button class="btn btn-ghost btn-sm" style="padding:0;margin-bottom:12px;color:var(--color-text-2);" data-action="admin:tableActionCancel">${icon('chevronLeft', { size: 15 })}Volver</button>`;

/* ============================ CAJA (reusa cobro) ====================== */
function caja(s) {
  const accounts = s.tables.filter(t => t.total > 0).sort((a, b) => (a.status === 'cuenta' ? -1 : 0) - (b.status === 'cuenta' ? -1 : 0));
  const list = accounts.length ? `<div class="acct-grid">${accounts.map(t => { const c = statusCfg(t.status); return `<button class="acct-card${s.payTable === t.id ? ' is-active' : ''}" data-action="caja:select" data-id="${t.id}">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;"><span class="acct-mesa">Mesa ${t.num}</span><span class="badge" style="background:var(--color-surface-2);color:${c.fg};"><span class="dot" style="background:${c.dot};"></span>${c.label}</span></div>
    <span style="font-size:12.5px;color:var(--color-text-3);font-weight:600;">${esc((t.waiter || '—').split(' ')[0])} · ${esc(t.zone)}</span>
    <span class="acct-total tnum">${clp(billSubtotal(t, s))}</span></button>`; }).join('')}</div>`
    : emptyState('checkCircle', 'No hay cuentas por cobrar', 'Cuando una mesa pida la cuenta aparecerá aquí lista para el cobro.');
  const backdrop = s.payTable ? `<div class="sheet-backdrop" data-action="caja:clear"></div>` : '';
  return `<div class="admin-wrap fade-up"><div class="caja-grid">
      <div><div class="sec-label">Cuentas abiertas · ${accounts.length}</div>${list}</div>
      ${payPanel(s)}
    </div>${backdrop}${receiptModal(s)}</div>`;
}

/* ============================ RESERVAS ================================ */
function reservas(s) {
  const cfg = { confirmada: 'success', pendiente: 'warning', 'lista de espera': 'info' };
  const dayNames = { '8': 'Lunes', '9': 'Martes', '10': 'Miércoles', '11': 'Jueves', '12': 'Viernes', '13': 'Sábado', '14': 'Domingo' };
  const week = [['Lun', '8'], ['Mar', '9'], ['Mié', '10'], ['Jue', '11'], ['Vie', '12'], ['Sáb', '13'], ['Dom', '14']];
  const dayRes = s.reservations.filter(r => r.day === s.resDay).sort((a, b) => a.time.localeCompare(b.time));
  const stats = { total: dayRes.length, conf: dayRes.filter(r => r.status === 'confirmada').length, pend: dayRes.filter(r => r.status === 'pendiente').length, people: dayRes.reduce((a, r) => a + r.people, 0) };

  const strip = week.map(([d, n]) => { const sel = n === s.resDay; const c = s.reservations.filter(r => r.day === n).length; return `<button class="day-btn${sel ? ' is-active' : ''}" data-action="admin:resDay" data-val="${n}"><span class="dd">${d}</span><span class="dn">${n}</span><span class="dc">${c}</span></button>`; }).join('');

  const rows = dayRes.length ? dayRes.map(r => `<div class="res-row">
    <div class="res-time tnum">${r.time}</div>
    <div class="res-av">${initials(r.name)}</div>
    <div style="flex:1;min-width:0;"><div style="font-size:15px;font-weight:700;color:var(--color-ink);">${esc(r.name)}</div>
      <div style="display:flex;align-items:center;gap:12px;font-size:12.5px;color:var(--color-text-3);margin-top:2px;flex-wrap:wrap;"><span>${icon('users', { size: 13 })} ${r.people} pers</span><span>${r.table ? 'Mesa ' + r.table : 'Por asignar'} · ${esc(r.zone)}</span><span>${esc(r.phone)}</span></div></div>
    ${badge(({ confirmada: 'Confirmada', pendiente: 'Pendiente', 'lista de espera': 'Lista de espera' })[r.status], cfg[r.status])}
    <div style="width:130px;flex:none;display:flex;justify-content:flex-end;">${!r.table ? `<button class="btn btn-sm" style="border:1px solid var(--color-primary);background:var(--color-primary-50);color:var(--color-primary-700);" data-action="admin:assignRes" data-id="${r.id}">Asignar mesa</button>` : r.status === 'pendiente' ? `<button class="btn btn-primary btn-sm" data-action="admin:confirmRes" data-id="${r.id}">Confirmar</button>` : ''}</div>
  </div>`).join('') : emptyState('calendar', 'Sin reservas este día', 'Crea una reserva con el botón "Nueva reserva".');

  return `<div class="admin-wrap fade-up">
    <div class="res-2">
      <div class="card card-pad"><div class="sec-label">Junio 2026</div><div class="weekstrip">${strip}</div></div>
      <div class="stat-grid c2">
        <div class="stat"><div class="lab">Reservas hoy</div><div class="val tnum">${stats.total}</div><div class="sub">${stats.people} comensales</div></div>
        <div class="stat"><div class="lab">Por confirmar</div><div class="val tnum" style="color:var(--color-warning-fg);">${stats.pend}</div><div class="sub">${stats.conf} confirmadas</div></div>
      </div>
    </div>
    <div class="card" style="overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-bottom:1px solid var(--color-border);">
        <h3 style="font-size:19px;">Agenda · ${dayNames[s.resDay]} ${s.resDay} jun</h3>
        <button class="btn btn-primary btn-sm" data-action="admin:openResForm">${icon('plus', { size: 16 })}Nueva reserva</button></div>
      ${rows}
    </div>
    ${s.showResForm ? resForm(s) : ''}
  </div>`;
}

function resForm(s) {
  const f = s.resForm;
  const zones = ['Salón', 'Terraza', 'Barra', 'Privado'].map(z => `<button class="opt${f.zone === z ? ' is-active' : ''}" data-action="admin:resZone" data-val="${z}">${z}</button>`).join('');
  return modal(`
    <div style="padding:20px 22px;border-bottom:1px solid var(--color-border);display:flex;align-items:center;justify-content:space-between;">
      <h3 style="font-size:20px;">Nueva reserva</h3><button class="icon-btn" data-action="admin:closeResForm" aria-label="Cerrar">${icon('x', { size: 18 })}</button></div>
    <div style="padding:20px 22px;display:flex;flex-direction:column;gap:16px;">
      <div><label class="field-label" for="res-name">Nombre del cliente</label><input class="input" id="res-name" placeholder="Ej: Isabel Fuentes" value="${esc(f.name)}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <div><label class="field-label">Comensales</label><div style="display:flex;align-items:center;gap:10px;"><button class="icon-btn" data-action="admin:resPeople" data-val="-1">${icon('minus', { size: 16, sw: 2.4 })}</button><span class="tnum" style="min-width:40px;text-align:center;font-weight:700;font-size:16px;">${f.people}</span><button class="icon-btn" data-action="admin:resPeople" data-val="1">${icon('plus', { size: 16, sw: 2.4 })}</button></div></div>
        <div><label class="field-label" for="res-time">Hora</label><input class="input tnum" id="res-time" type="time" value="${esc(f.time)}"></div>
      </div>
      <div><label class="field-label">Zona</label><div class="opt-grid c4">${zones}</div></div>
    </div>
    <div style="padding:16px 22px;border-top:1px solid var(--color-border);display:flex;gap:10px;justify-content:flex-end;">
      <button class="btn btn-secondary" data-action="admin:closeResForm">Cancelar</button>
      <button class="btn btn-primary" data-action="admin:addRes">${icon('check', { size: 18 })}Crear reserva</button>
    </div>`, 'admin:closeResForm');
}

/* ============================ CLIENTES (CRM) ========================== */
function clientes(s) {
  const tierCfg = { VIP: ['var(--color-warning-soft)', 'var(--color-warning-fg)', 'var(--color-navy)'], Frecuente: ['var(--color-primary-50)', 'var(--color-primary-700)', 'var(--color-primary)'], Corporativo: ['var(--color-info-soft)', 'var(--color-info-fg)', 'var(--color-info)'], Nuevo: ['var(--color-surface-2)', 'var(--color-text-2)', 'var(--color-text-3)'] };
  const stats = { total: s.clients.length, vip: s.clients.filter(c => c.tier === 'VIP').length, bdays: s.clients.filter(c => /jun/.test(c.bday)).length };
  const cards = s.clients.map(c => { const [bg, fg, av] = tierCfg[c.tier]; return `<div class="client-card">
    <div style="display:flex;align-items:center;gap:13px;margin-bottom:16px;">
      <span class="client-av" style="background:${av};">${initials(c.name)}</span>
      <div style="flex:1;min-width:0;"><div style="font-size:16px;font-weight:700;color:var(--color-ink);">${esc(c.name)}</div><div style="font-size:12.5px;color:var(--color-text-3);margin-top:1px;">${esc(c.freq)}</div></div>
      <span class="badge" style="background:${bg};color:${fg};">${c.tier}</span></div>
    <div class="client-stats">
      <div><div class="eyebrow">Visitas</div><div class="serif tnum" style="font-size:19px;color:var(--color-ink);margin-top:3px;">${c.visits}</div></div>
      <div><div class="eyebrow">Gasto acum.</div><div class="serif tnum" style="font-size:19px;color:var(--color-primary-600);margin-top:3px;">${clp(c.spend)}</div></div>
      <div><div class="eyebrow">Cumpleaños</div><div style="font-size:15px;font-weight:700;color:var(--color-ink);margin-top:5px;">${esc(c.bday)}</div></div>
    </div>
    <div class="eyebrow" style="margin-bottom:9px;">Preferencias</div>
    <div style="display:flex;flex-wrap:wrap;gap:7px;">${c.prefs.map(p => `<span class="chip-soft">${esc(p)}</span>`).join('')}</div>
  </div>`; }).join('');
  return `<div class="admin-wrap fade-up">
    <div class="stat-grid c3" style="margin-bottom:22px;">
      <div class="stat"><div class="lab">Clientes registrados</div><div class="val tnum">${stats.total}</div></div>
      <div class="stat"><div class="lab">Clientes VIP</div><div class="val tnum" style="color:var(--color-warning-fg);">${stats.vip}</div></div>
      <div class="stat"><div class="lab">Cumpleaños en junio</div><div class="val tnum" style="color:var(--color-primary-600);">${stats.bdays}</div></div>
    </div>
    <div class="client-grid">${cards}</div>
  </div>`;
}

/* ============================ INVENTARIO ============================== */
function inventario(s) {
  const cfg = { ok: ['En stock', 'success', 'var(--color-success)'], alerta: ['Alerta', 'warning', 'var(--color-warning)'], critico: ['Crítico', 'error', 'var(--color-error)'] };
  const stats = { crit: s.inventory.filter(i => i.status === 'critico').length, alert: s.inventory.filter(i => i.status === 'alerta').length, ok: s.inventory.filter(i => i.status === 'ok').length };
  const rows = s.inventory.map(i => { const [lab, tone, bar] = cfg[i.status]; const pct = Math.max(6, Math.min(100, Math.round(i.stock / (i.min * 2) * 100))); return `<tr>
    <td><div style="font-weight:600;color:var(--color-ink);">${esc(i.name)}</div><div style="font-size:12px;color:var(--color-text-3);">${esc(i.cat)}</div></td>
    <td><div class="tnum" style="font-weight:700;color:var(--color-ink);">${i.stock} ${i.unit}</div><div style="font-size:11.5px;color:var(--color-text-3);">mín ${i.min} ${i.unit}</div></td>
    <td><div class="bar-track"><span style="width:${pct}%;background:${bar};"></span></div></td>
    <td class="num tx-hide-sm" style="text-align:right;color:var(--color-text-2);">${i.daily} ${i.unit}/día</td>
    <td style="text-align:center;">${badge(lab, tone)}</td>
    <td style="text-align:right;">${i.status !== 'ok' ? `<button class="btn btn-secondary btn-sm" data-action="admin:restock" data-id="${i.id}">Reponer</button>` : ''}</td></tr>`; }).join('');
  return `<div class="admin-wrap fade-up">
    <div class="stat-grid c3" style="margin-bottom:22px;">
      <div class="stat" style="border-color:var(--color-error-soft);"><div class="lab" style="display:flex;align-items:center;gap:7px;"><span class="dot" style="width:9px;height:9px;border-radius:9999px;background:var(--color-error);"></span>Productos críticos</div><div class="val tnum" style="color:var(--color-error-fg);">${stats.crit}</div></div>
      <div class="stat" style="border-color:var(--color-warning-soft);"><div class="lab" style="display:flex;align-items:center;gap:7px;"><span class="dot" style="width:9px;height:9px;border-radius:9999px;background:var(--color-warning);"></span>En alerta</div><div class="val tnum" style="color:var(--color-warning-fg);">${stats.alert}</div></div>
      <div class="stat" style="border-color:var(--color-success-soft);"><div class="lab" style="display:flex;align-items:center;gap:7px;"><span class="dot" style="width:9px;height:9px;border-radius:9999px;background:var(--color-success);"></span>En stock óptimo</div><div class="val tnum" style="color:var(--color-success-fg);">${stats.ok}</div></div>
    </div>
    <div class="card" style="overflow:hidden;"><table class="tx-table"><thead><tr><th>Producto</th><th>Stock actual</th><th style="width:200px;">Nivel</th><th class="tx-hide-sm" style="text-align:right;">Consumo</th><th style="text-align:center;">Estado</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
  </div>`;
}

/* ============================ PLACEHOLDERS ============================ */
function placeholder(title, desc) {
  return `<div class="admin-wrap fade-up"><div class="card" style="padding:8px;">${emptyState('layout', title + ' · en diseño', desc)}</div></div>`;
}

/* ============================ SHELL ADMIN ============================= */
export function renderAdmin(s) {
  const screen = s.adminScreen || 'dashboard';
  const occ = occOf(s), crit = s.inventory.filter(i => i.status === 'critico').length;

  const NAV = [
    ['Operación', [['dashboard', 'Dashboard', 'layout', null], ['mesas', 'Mesas', 'table', occ ? { n: occ, tone: 'teal' } : null], ['caja', 'Caja', 'card', null]]],
    ['Gestión', [['reservas', 'Reservas', 'calendar', null], ['clientes', 'Clientes (CRM)', 'users', null], ['inventario', 'Inventario', 'box', crit ? { n: crit, tone: 'error' } : null]]],
    ['Análisis', [['reportes', 'Reportes', 'trending', null], ['personal', 'Personal', 'users', null], ['config', 'Configuración', 'settings', null]]],
  ];
  const navHtml = NAV.map(([group, items]) => `<div class="nav-label">${group}</div>${items.map(([id, label, ic, cnt]) =>
    `<button class="nav-item${screen === id ? ' is-active' : ''}" data-action="admin:nav" data-val="${id}">${icon(ic, { size: 19 })}${label}${cnt ? `<span class="nav-count">${countPill(cnt.n, cnt.tone)}</span>` : ''}</button>`).join('')}`).join('');

  const titles = { dashboard: 'Dashboard', mesas: 'Gestión de mesas', caja: 'Caja', reservas: 'Reservas', clientes: 'Clientes (CRM)', inventario: 'Inventario', reportes: 'Reportes', personal: 'Personal y turnos', config: 'Configuración' };
  let content;
  if (screen === 'mesas') content = mesas(s);
  else if (screen === 'caja') content = caja(s);
  else if (screen === 'reservas') content = reservas(s);
  else if (screen === 'clientes') content = clientes(s);
  else if (screen === 'inventario') content = inventario(s);
  else if (screen === 'reportes') content = placeholder('Reportes y analítica', 'Ventas por periodo, producto, mesero y método de pago, exportables. Próximo módulo.');
  else if (screen === 'personal') content = placeholder('Personal y turnos', 'Gestión de equipo, turnos y asistencia. Próximo módulo.');
  else if (screen === 'config') content = placeholder('Configuración', 'Menú/productos, mesas/salones, impuestos, usuarios y roles. Próximo módulo.');
  else content = dashboard(s);

  return `<div class="admin"${s.adminNav ? ' data-nav="1"' : ''}>
    <div class="admin-backdrop" data-action="admin:navToggle" data-val="0"></div>
    <aside class="admin-side">
      <div class="admin-brand"><div class="admin-brand-card">
        <div class="admin-brand-mark">${brandMark(20, 'color')}</div>
        <div style="min-width:0;"><div class="admin-brand-name">Restaurante Triada</div><div class="admin-brand-sub">Talca · Cocina internacional</div></div></div></div>
      <nav class="admin-nav">${navHtml}</nav>
      <div class="admin-user"><div class="admin-user-av">RA</div><div style="flex:1;min-width:0;"><div style="font-size:13.5px;font-weight:600;color:var(--color-ink);">Rodrigo Alarcón</div><div style="font-size:11.5px;color:var(--color-text-3);">Administrador</div></div>${icon('settings', { size: 18, color: 'var(--color-text-3)' })}</div>
    </aside>
    <main class="admin-main">
      <div class="admin-topbar">
        <button class="icon-btn admin-hamburger" data-action="admin:navToggle" data-val="1" aria-label="Abrir menú">${icon('menu', { size: 20 })}</button>
        <div><div class="eyebrow" style="color:var(--color-primary);">Operación</div><h1>${titles[screen]}</h1></div>
        <div class="admin-topbar-tools">
          <span class="tb-chip tb-search">${icon('search', { size: 16 })}Buscar…</span>
          <span class="tb-chip">${icon('calendar', { size: 16, color: 'var(--color-primary)' })}Sáb 13 jun</span>
        </div>
      </div>
      <div class="admin-content" id="main">${content}</div>
    </main>
  </div>`;
}
