/* ============================================================================
   roles/cajero.js · Rol CAJERO — estación de cobro (escritorio / tablet)
   Shell propio + tab bar con badges + módulos ad-hoc:
     · Cobro (cuentas abiertas + descuento/propina/método/dividir/comprobante)
     · Arqueo (apertura con fondo / cierre con totales por método y diferencia)
     · Historial de transacciones del turno (reimpresión, anulación)
     · Mesas (modo cobro): localizar la cuenta a cobrar, sin gestión de salón
   No es "admin recortado": es una estación de caja. Sigue el molde del Mesero.
   ========================================================================== */

import { icon, esc, clp, hhmm, plural } from '../util.js';
import { badge, emptyState } from '../components.js';
import { billItems, billSubtotal, arqueoTotals } from '../domain.js';

const CASHIER = 'Paula Ortega';
const METHODS = [['efectivo', 'Efectivo', 'cash'], ['tarjeta', 'Tarjeta', 'card'], ['transferencia', 'Transferencia', 'transfer']];
const METHOD_LABEL = { efectivo: 'Efectivo', tarjeta: 'Tarjeta de crédito/débito', transferencia: 'Transferencia' };

const statusBadge = (st) => ({
  ocupada: badge('Ocupada', 'teal'), atencion: badge('Atención', 'warning'),
  cuenta: badge('Espera cuenta', 'success'), reservada: badge('Reservada', 'info'), libre: badge('Libre', 'neutral'),
}[st] || badge(st, 'neutral'));

/* ---- Panel de cobro (reutilizado por Admin) ---- */
export function payPanel(state) {
  const open = !!state.payTable;
  const t = open ? state.tables.find(x => x.id === state.payTable) : null;
  let inner;
  if (!t || t.total <= 0) {
    inner = `<div class="pay-card pay-empty">${emptyState('receipt', 'Selecciona una cuenta', 'Elige una mesa con cuenta abierta para procesar el cobro.')}</div>`;
    return `<div class="pay-col">${inner}</div>`;
  }
  const items = billItems(t.num, state);
  const raw = items.length ? items : [{ qty: 1, name: 'Consumo Mesa ' + t.num, price: t.total }];
  const sub = billSubtotal(t, state);
  const disc = state.discount || 0, tipPct = state.tip || 0, splitN = state.splitN || 1;
  const net = Math.round(sub * (1 - disc / 100));
  const tip = Math.round(sub * tipPct / 100);
  const total = net + tip;

  const optBtns = (vals, cur, action, fmt) => vals.map(v =>
    `<button class="opt${v === cur ? ' is-active' : ''}" data-action="${action}" data-val="${v}">${fmt(v)}</button>`).join('');

  inner = `<div class="pay-card">
    <div class="pay-head">
      <div><div class="eyebrow" style="color:var(--color-primary);">${esc(t.zone)} · ${esc(t.waiter || '—')}</div>
        <div class="pay-head-title">Cobrar Mesa ${t.num}</div></div>
      <button class="icon-btn pay-close" data-action="caja:clear" aria-label="Cerrar cobro">${icon('x', { size: 18 })}</button>
    </div>
    <div class="pay-items">${raw.map(i => `<div class="pay-item"><span class="q tnum">${i.qty}×</span><span class="n">${esc(i.name)}</span><span class="v tnum">${clp(i.price * i.qty)}</span></div>`).join('')}</div>
    <div class="pay-controls">
      <div class="lab">Descuento</div>
      <div class="opt-grid c4">${optBtns([0, 10, 15, 20], disc, 'caja:discount', v => v === 0 ? 'Sin desc.' : v + '%')}</div>
      <div class="lab">Propina <span style="font-weight:600;color:var(--color-text-3);">(sugerida 10%)</span></div>
      <div class="opt-grid c4">${optBtns([0, 10, 12, 15], tipPct, 'caja:tip', v => v === 0 ? 'Sin prop.' : v + '%')}</div>
      <div class="lab">Método de pago</div>
      <div class="opt-grid c3">${METHODS.map(([id, label, ic]) => `<button class="opt opt-method${state.payMethod === id ? ' is-active' : ''}" data-action="caja:method" data-val="${id}">${icon(ic, { size: 20 })}${label}</button>`).join('')}</div>
      <div class="split-row">
        <span style="font-size:13px;font-weight:600;color:var(--color-text-2);">Dividir cuenta</span>
        <div class="split-ctl">
          <button class="icon-btn" data-action="caja:split" data-val="-1" aria-label="Menos partes">${icon('minus', { size: 16, sw: 2.4 })}</button>
          <span class="split-n tnum">${splitN} ${plural(splitN, 'parte')}</span>
          <button class="icon-btn" data-action="caja:split" data-val="1" aria-label="Más partes">${icon('plus', { size: 16, sw: 2.4 })}</button>
        </div>
      </div>
    </div>
    <div class="pay-summary">
      <div class="sum-row"><span>Subtotal</span><span class="tnum">${clp(sub)}</span></div>
      ${disc > 0 ? `<div class="sum-row" style="color:var(--color-success-fg);font-weight:600;"><span>Descuento ${disc}%</span><span class="tnum">– ${clp(sub - net)}</span></div>` : ''}
      ${tipPct > 0 ? `<div class="sum-row" style="font-weight:600;"><span>Propina ${tipPct}%</span><span class="tnum">+ ${clp(tip)}</span></div>` : ''}
      <div class="sum-total"><span class="k">Total</span><span class="v tnum">${clp(total)}</span></div>
      ${splitN > 1 ? `<div class="sum-row" style="margin-bottom:10px;"><span>Por persona (${splitN})</span><span class="tnum" style="font-weight:700;color:var(--color-primary-600);">${clp(Math.round(total / splitN))}</span></div>` : ''}
      <button class="btn btn-primary btn-lg btn-block" data-action="caja:charge" style="margin-top:10px;">${icon('check', { size: 20 })}Cobrar ${clp(total)}</button>
    </div>
  </div>`;
  return `<div class="pay-col" data-open="1">${inner}</div>`;
}

/* ---- Módulo: Cobro ---- */
function moduleCobro(state) {
  const accounts = state.tables.filter(t => t.total > 0)
    .sort((a, b) => (a.status === 'cuenta' ? -1 : 0) - (b.status === 'cuenta' ? -1 : 0));
  const closed = !state.caja || !state.caja.open;

  const banner = closed
    ? `<div class="card card-pad" style="display:flex;align-items:center;gap:14px;border-color:var(--color-warning);background:var(--color-warning-soft);margin-bottom:18px;">
        ${icon('lock', { size: 22, color: 'var(--color-warning-fg)' })}
        <div style="flex:1;min-width:0;"><div style="font-weight:700;color:var(--color-ink);">La caja está cerrada</div>
          <div style="font-size:13px;color:var(--color-text-2);">Abre la caja con su fondo inicial para poder cobrar.</div></div>
        <button class="btn btn-navy btn-sm" data-action="ui" data-key="cajaTab" data-val="arqueo">Ir a arqueo</button>
      </div>` : '';

  const list = accounts.length ? `<div class="acct-grid">${accounts.map(t => `
    <button class="acct-card${state.payTable === t.id ? ' is-active' : ''}" data-action="caja:select" data-id="${t.id}"${closed ? ' disabled' : ''}>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span class="acct-mesa">Mesa ${t.num}</span>${statusBadge(t.status)}
      </div>
      <span style="font-size:12.5px;color:var(--color-text-3);font-weight:600;">${esc((t.waiter || '—').split(' ')[0])} · ${esc(t.zone)}</span>
      <span class="acct-total tnum">${clp(billSubtotal(t, state))}</span>
    </button>`).join('')}</div>`
    : emptyState('checkCircle', 'No hay cuentas por cobrar', 'Cuando una mesa pida la cuenta aparecerá aquí lista para el cobro.');

  const backdrop = state.payTable ? `<div class="sheet-backdrop" data-action="caja:clear"></div>` : '';

  return `<div class="wrap fade-up">
    ${banner}
    <div class="caja-grid">
      <div>
        <div class="sec-label">Cuentas abiertas · ${accounts.length}</div>
        ${list}
      </div>
      ${payPanel(state)}
    </div>
    ${backdrop}
  </div>`;
}

/* ---- Módulo: Arqueo ---- */
function moduleArqueo(state) {
  const tot = arqueoTotals(state);
  const open = state.caja && state.caja.open;
  const last = state.lastArqueo;

  const totalsCard = `<div class="card card-pad">
    <div class="sec-label">Totales del turno</div>
    <div class="kv"><span class="k">${icon('cash', { size: 18, color: 'var(--color-text-3)' })}Efectivo</span><span class="v tnum">${clp(tot.by.efectivo)}</span></div>
    <div class="kv"><span class="k">${icon('card', { size: 18, color: 'var(--color-text-3)' })}Tarjeta</span><span class="v tnum">${clp(tot.by.tarjeta)}</span></div>
    <div class="kv"><span class="k">${icon('transfer', { size: 18, color: 'var(--color-text-3)' })}Transferencia</span><span class="v tnum">${clp(tot.by.transferencia)}</span></div>
    <div class="kv"><span class="k">${icon('trending', { size: 18, color: 'var(--color-text-3)' })}Ventas totales</span><span class="v tnum">${clp(tot.ventas)}</span></div>
    <div class="kv"><span class="k">${icon('coins', { size: 18, color: 'var(--color-text-3)' })}Propinas</span><span class="v tnum">${clp(tot.tips)}</span></div>
    <div class="kv"><span class="k">Boletas emitidas</span><span class="v tnum">${tot.count}</span></div>
  </div>`;

  let actionCard;
  if (open) {
    actionCard = `<div class="card card-pad">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">${badge('Caja abierta', 'success')}<span style="font-size:12.5px;color:var(--color-text-3);">desde ${hhmm(state.caja.openedAt)}</span></div>
      <div class="sec-label" style="margin-top:14px;">Fondo inicial</div>
      <div class="big-stat tnum">${clp(tot.fondo)}</div>
      <div class="kv" style="margin-top:10px;"><span class="k">Efectivo esperado en caja</span><span class="v tnum">${clp(tot.esperadoEfectivo)}</span></div>
      <div style="font-size:12px;color:var(--color-text-3);margin:4px 0 16px;">Fondo + ventas en efectivo del turno.</div>
      <label class="field-label" for="arqueo-conteo">Efectivo contado al cierre</label>
      <input class="input tnum" id="arqueo-conteo" type="number" inputmode="numeric" min="0" step="1000" placeholder="Ej: ${tot.esperadoEfectivo}">
      <button class="btn btn-navy btn-block" data-action="arqueo:close" style="margin-top:14px;">${icon('lock', { size: 18 })}Cerrar caja y cuadrar</button>
    </div>`;
  } else {
    const lastCard = last ? `<div class="card card-pad" style="margin-bottom:18px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">${badge('Último cierre', 'neutral')}<span style="font-size:12.5px;color:var(--color-text-3);">${hhmm(last.closedAt)}</span></div>
      <div class="kv"><span class="k">Esperado</span><span class="v tnum">${clp(last.esperado)}</span></div>
      <div class="kv"><span class="k">Contado</span><span class="v tnum">${clp(last.contado)}</span></div>
      <div class="kv"><span class="k">Diferencia</span><span class="v tnum ${last.diff === 0 ? 'diff-zero' : last.diff > 0 ? 'diff-pos' : 'diff-neg'}">${last.diff === 0 ? 'Cuadra exacto' : (last.diff > 0 ? '+ ' : '– ') + clp(Math.abs(last.diff))}</span></div>
    </div>` : '';
    actionCard = `${lastCard}<div class="card card-pad">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">${badge('Caja cerrada', 'neutral')}</div>
      <label class="field-label" for="arqueo-fondo">Fondo inicial de apertura</label>
      <input class="input tnum" id="arqueo-fondo" type="number" inputmode="numeric" min="0" step="1000" placeholder="Ej: 80000" value="80000">
      <button class="btn btn-primary btn-block" data-action="arqueo:open" style="margin-top:14px;">${icon('unlock', { size: 18 })}Abrir caja</button>
    </div>`;
  }

  return `<div class="wrap fade-up">
    <div class="arqueo-grid">
      <div>${actionCard}</div>
      <div>${totalsCard}</div>
    </div>
  </div>`;
}

/* ---- Módulo: Historial de transacciones ---- */
function moduleHistorial(state) {
  const txs = state.transactions.slice().sort((a, b) => b.at - a.at);
  const emitidas = txs.filter(t => !t.voided).length;
  const anuladas = txs.filter(t => t.voided).length;
  const cobrado = txs.filter(t => !t.voided).reduce((a, t) => a + t.total, 0);

  const methodBadge = (m) => badge(METHOD_LABEL[m] ? (m === 'transferencia' ? 'Transf.' : METHOD_LABEL[m].split(' ')[0]) : m, m === 'efectivo' ? 'success' : m === 'tarjeta' ? 'info' : 'teal');

  const rows = txs.length ? txs.map(t => `<tr class="${t.voided ? 'tx-voided' : ''}">
    <td class="num">#${t.folio}</td>
    <td class="num tx-hide-sm">${hhmm(t.at)}</td>
    <td class="tx-mesa" style="font-weight:600;color:var(--color-ink);">Mesa ${t.num}</td>
    <td class="tx-hide-sm">${methodBadge(t.method)}</td>
    <td class="num" style="font-weight:700;color:var(--color-ink);">${clp(t.total)}</td>
    <td><div class="tx-actions">
      <button class="icon-btn" data-action="caja:reprint" data-id="${t.folio}" aria-label="Reimprimir boleta ${t.folio}" title="Reimprimir">${icon('printer', { size: 17 })}</button>
      ${t.voided ? `<span class="badge" style="background:var(--color-error-soft);color:var(--color-error-fg);">Anulada</span>` : `<button class="icon-btn" data-action="caja:void" data-id="${t.folio}" aria-label="Anular boleta ${t.folio}" title="Anular">${icon('x', { size: 17 })}</button>`}
    </div></td>
  </tr>`).join('') : `<tr><td colspan="6">${emptyState('receipt', 'Sin transacciones aún', 'Las boletas que emitas en el turno aparecerán aquí.')}</td></tr>`;

  return `<div class="wrap fade-up">
    <div class="stat-grid c3" style="margin-bottom:18px;">
      <div class="stat"><div class="lab">Boletas emitidas</div><div class="val tnum">${emitidas}</div></div>
      <div class="stat"><div class="lab">Total cobrado</div><div class="val tnum" style="color:var(--color-primary-600);">${clp(cobrado)}</div></div>
      <div class="stat"><div class="lab">Anuladas</div><div class="val tnum" style="color:${anuladas ? 'var(--color-error-fg)' : 'var(--color-ink)'};">${anuladas}</div></div>
    </div>
    <div class="card" style="overflow:hidden;">
      <table class="tx-table">
        <thead><tr><th>Folio</th><th class="tx-hide-sm">Hora</th><th>Mesa</th><th class="tx-hide-sm">Método</th><th>Total</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

/* ---- Módulo: Mesas (modo cobro) ---- */
function moduleMesas(state) {
  const zones = ['Salón principal', 'Terraza', 'Barra', 'Privado'];
  const groups = zones.map(zn => {
    const tables = state.tables.filter(t => t.zone === zn && t.total > 0);
    if (!tables.length) return '';
    const cards = tables.map(t => `<div class="acct-card" style="cursor:default;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span class="acct-mesa">Mesa ${t.num}</span>${statusBadge(t.status)}
      </div>
      <span style="font-size:12.5px;color:var(--color-text-3);font-weight:600;">${esc((t.waiter || '—').split(' ')[0])} · ${t.seats} ${plural(t.seats, 'persona')}</span>
      <span class="acct-total tnum">${clp(billSubtotal(t, state))}</span>
      <button class="btn btn-primary btn-sm btn-block" data-action="caja:gotoCobro" data-id="${t.id}" style="margin-top:4px;">${icon('card', { size: 16 })}Cobrar</button>
    </div>`).join('');
    return `<div class="mt-24"><div class="sec-label">${zn}</div><div class="acct-grid">${cards}</div></div>`;
  }).join('');
  const any = state.tables.some(t => t.total > 0);
  return `<div class="wrap fade-up">
    <div style="font-size:13.5px;color:var(--color-text-2);margin-bottom:4px;">Localiza la cuenta a cobrar. Esta vista no gestiona el salón — solo el cobro.</div>
    ${any ? groups : emptyState('table', 'Sin mesas con consumo', 'Cuando haya mesas con cuenta abierta podrás cobrarlas desde aquí.')}
  </div>`;
}

/* ---- Comprobante (modal), reutilizado por cobro y reimpresión ---- */
export function receiptModal(state) {
  const r = state.receipt;
  if (!r) return '';
  return `<div class="modal-overlay" data-action="caja:closeReceipt" data-overlay="1">
    <div class="modal" role="dialog" aria-modal="true" aria-label="Comprobante" data-stop="1" style="max-width:380px;">
      <div style="text-align:center;padding:26px 24px 8px;">
        <div style="width:54px;height:54px;margin:0 auto 12px;border-radius:var(--radius-full);background:var(--color-success-soft);color:var(--color-success-fg);display:flex;align-items:center;justify-content:center;">${icon('check', { size: 26, sw: 2.4 })}</div>
        <div style="font-family:var(--font-serif);font-size:20px;font-weight:600;color:var(--color-ink);">${r.voided ? 'Boleta anulada' : 'Pago recibido'}</div>
        <div style="font-size:13px;color:var(--color-text-3);margin-top:2px;">Mesa ${r.num} · Folio #${r.folio}</div>
      </div>
      <div style="padding:8px 24px 4px;">
        <div class="kv"><span class="k">Subtotal</span><span class="v tnum">${clp(r.subtotal)}</span></div>
        ${r.discountPct > 0 ? `<div class="kv"><span class="k">Descuento ${r.discountPct}%</span><span class="v tnum" style="color:var(--color-success-fg);">– ${clp(Math.round(r.subtotal * r.discountPct / 100))}</span></div>` : ''}
        ${r.tip > 0 ? `<div class="kv"><span class="k">Propina ${r.tipPct}%</span><span class="v tnum">+ ${clp(r.tip)}</span></div>` : ''}
        <div class="kv"><span class="k" style="font-weight:700;color:var(--color-ink);">Total</span><span class="v tnum" style="font-family:var(--font-serif);font-size:22px;">${clp(r.total)}</span></div>
        <div class="kv"><span class="k">Método</span><span class="v">${esc(METHOD_LABEL[r.method] || r.method)}</span></div>
        ${r.splitN > 1 ? `<div class="kv"><span class="k">Dividido en</span><span class="v">${r.splitN} ${plural(r.splitN, 'parte')} · ${clp(Math.round(r.total / r.splitN))} c/u</span></div>` : ''}
      </div>
      <div style="padding:16px 24px;display:flex;gap:10px;">
        <button class="btn btn-secondary" data-action="caja:print">${icon('printer', { size: 18 })}Imprimir</button>
        <button class="btn btn-primary btn-block" data-action="caja:closeReceipt">Listo</button>
      </div>
    </div>
  </div>`;
}

/* ---- Shell de Cajero ---- */
export function renderCajero(state) {
  const tab = state.cajaTab || 'cobro';
  const accountsN = state.tables.filter(t => t.total > 0).length;
  const cuentaN = state.tables.filter(t => t.status === 'cuenta').length;
  const open = state.caja && state.caja.open;

  const TABS = [
    { id: 'cobro', label: 'Cobro', ic: 'card', badge: cuentaN, alert: false },
    { id: 'arqueo', label: 'Arqueo', ic: 'calculator', badge: 0 },
    { id: 'historial', label: 'Historial', ic: 'receipt', badge: 0 },
    { id: 'mesas', label: 'Mesas', ic: 'table', badge: accountsN },
  ];
  const tabsHtml = TABS.map(t => `<button class="tab${tab === t.id ? ' is-active' : ''}" data-action="ui" data-key="cajaTab" data-val="${t.id}" aria-current="${tab === t.id}">
    ${icon(t.ic, { size: 17 })}${t.label}${t.badge ? `<span class="badge-count">${t.badge}</span>` : ''}</button>`).join('');

  let body;
  if (tab === 'arqueo') body = moduleArqueo(state);
  else if (tab === 'historial') body = moduleHistorial(state);
  else if (tab === 'mesas') body = moduleMesas(state);
  else body = moduleCobro(state);

  return `<div class="shell">
    <div class="shell-top">
      <div class="topbar">
        <div class="topbar-avatar">PO</div>
        <div class="topbar-id">
          <div class="eyebrow">Cajero · Turno tarde</div>
          <div class="topbar-name">${CASHIER}</div>
        </div>
        <div class="topbar-status">${open ? '<span class="live-dot"></span>Caja abierta' : icon('lock', { size: 15, color: 'var(--color-text-3)' }) + 'Caja cerrada'}</div>
      </div>
      <div class="tabs" role="tablist">${tabsHtml}</div>
    </div>
    <main id="main" class="shell-body">${body}</main>
    ${receiptModal(state)}
  </div>`;
}
