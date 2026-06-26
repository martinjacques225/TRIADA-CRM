/* ============================================================================
   roles/cocina.js · Rol COCINA — Kitchen Display System (tema oscuro)
   Shell propio + tab bar con badges + módulos ad-hoc:
     · KDS por estado (timers + urgencia por color)
     · Detalle de comanda (items, cantidades, observaciones/alergias)
     · Marcar 86 / agotado (se refleja en menú QR e inventario)
     · Historial del turno (tiempos de preparación)
   Sigue el molde del rol Mesero. Dispositivo: pantalla táctil fija / tablet.
   ========================================================================== */

import { icon, esc, brandMark, plural, hhmm } from '../util.js';
import { badge, countPill, emptyState } from '../components.js';
import { ticketMins, is86 } from '../domain.js';
import { CATEGORIES } from '../data.js';

const COLS = [
  { status: 'nueva',       title: 'Nuevas comandas',     tone: 'info',    dot: 'var(--color-info)',    label: 'Comenzar preparación', cls: 'btn-primary' },
  { status: 'preparacion', title: 'En preparación',       tone: 'warning', dot: 'var(--color-warning)', label: 'Marcar lista',         cls: 'btn-success' },
  { status: 'lista',       title: 'Listas para entregar', tone: 'success', dot: 'var(--color-success)', label: 'Entregar a mesa',      cls: 'btn-navy' },
];

/* Urgencia por tiempo en etapa (§: timers + color). */
function timerTone(mins) { return mins >= 10 ? 'error' : mins >= 6 ? 'warning' : 'neutral'; }

function itemRow(it) {
  return `<div class="kds-item">
    <span class="kds-qty tnum">${it.qty}</span>
    <span class="kds-item-name">${esc(it.name)}</span>
  </div>${it.note ? `<div class="kds-note">${icon('alert', { size: 12, sw: 2 })}${esc(it.note)}</div>` : ''}`;
}

/* El timer se arma aparte porque badge() escapa su contenido (no admite SVG). */
function timerBadge(mins) {
  const tone = timerTone(mins);
  const t = { neutral: 'var(--color-text-2)', warning: 'var(--color-warning-fg)', error: 'var(--color-error-fg)' }[tone];
  const bg = { neutral: 'var(--color-surface-2)', warning: 'var(--color-warning-soft)', error: 'var(--color-error-soft)' }[tone];
  return `<span class="badge tnum" style="background:${bg};color:${t};">${icon('clock', { size: 13, sw: 2.2 })}${mins === 0 ? 'recién' : mins + ' min'}</span>`;
}

function board(state) {
  const col = state.cocinaCol || 'nueva';
  const cols = COLS.map(c => {
    const tickets = state.tickets.filter(t => t.status === c.status)
      .sort((a, b) => ticketMins(b) - ticketMins(a)); // más antiguas arriba
    const body = tickets.length
      ? tickets.map(t => ticketCardFixed(t)).join('')
      : `<div class="state" style="padding:32px 12px;"><div class="state-sub">Sin comandas en esta columna.</div></div>`;
    return `<div class="kds-col${c.status === col ? ' is-shown' : ''}" data-col="${c.status}">
      <div class="kds-col-head">
        <span class="dot" style="background:${c.dot};"></span>
        <span class="kds-col-title">${c.title}</span>
        ${countPill(tickets.length, c.tone)}
      </div>
      <div class="kds-col-body">${body}</div>
    </div>`;
  }).join('');

  // Segmented control (solo móvil) para elegir columna por estado
  const seg = COLS.map(c => {
    const n = state.tickets.filter(t => t.status === c.status).length;
    return `<button class="kds-seg${c.status === col ? ' is-active' : ''}" data-action="ui" data-key="cocinaCol" data-val="${c.status}">
      <span class="dot" style="width:9px;height:9px;border-radius:9999px;background:${c.dot};"></span>${c.title.split(' ')[0]} (${n})</button>`;
  }).join('');

  return `<div class="kds-segbar">${seg}</div><div class="kds-board">${cols}</div>`;
}

/* Versión de tarjeta con el timer correcto (sin doble-escape del ícono). */
function ticketCardFixed(t) {
  const mins = ticketMins(t);
  const canRecall = t.status !== 'nueva';
  const col = COLS.find(c => c.status === t.status);
  return `<div class="kds-card${mins >= 10 ? ' is-urgent' : ''}">
    <div class="kds-card-head" data-action="kds:detail" data-id="${t.id}" role="button" tabindex="0" aria-label="Ver detalle Mesa ${t.num}">
      <div style="display:flex;align-items:baseline;gap:9px;min-width:0;">
        <span class="kds-card-mesa">Mesa ${t.num}</span>
        <span class="kds-card-waiter">${esc(t.waiter || '—')}</span>
      </div>
      ${timerBadge(mins)}
    </div>
    <div class="kds-items">${t.items.map(itemRow).join('')}</div>
    <div class="kds-card-actions">
      ${canRecall ? `<button class="icon-btn" data-action="kds:recall" data-id="${t.id}" aria-label="Devolver una etapa" title="Devolver una etapa">${icon('chevronLeft', { size: 18 })}</button>` : ''}
      <button class="btn ${col.cls}" data-action="kds:advance" data-id="${t.id}">${icon('arrowRight', { size: 18 })}${col.label}</button>
    </div>
  </div>`;
}

/* ---- Módulo: detalle de comanda (modal) ---- */
function detailModal(state) {
  if (!state.detailTicket) return '';
  const t = state.tickets.find(x => x.id === state.detailTicket);
  if (!t) return '';
  const mins = ticketMins(t);
  const col = COLS.find(c => c.status === t.status);
  const items = t.items.map(it => `
    <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--color-surface-2);">
      <span class="kds-qty tnum" style="width:30px;height:30px;">${it.qty}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:16px;font-weight:600;color:var(--color-ink);">${esc(it.name)}</div>
        ${it.note ? `<div class="kds-note" style="margin:6px 0 0;">${icon('alert', { size: 13, sw: 2 })}${esc(it.note)}</div>` : ''}
      </div>
    </div>`).join('');
  const canRecall = t.status !== 'nueva';
  return `<div class="modal-overlay" data-action="kds:detailClose" data-overlay="1">
    <div class="modal" role="dialog" aria-modal="true" aria-label="Detalle de comanda Mesa ${t.num}" data-stop="1">
      <div style="padding:20px 22px;border-bottom:1px solid var(--color-border);display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <div>
          <div class="eyebrow">${esc(t.waiter || '—')} · ${col.title}</div>
          <div style="font-family:var(--font-serif);font-size:26px;font-weight:600;color:var(--color-ink);line-height:1.1;margin-top:2px;">Mesa ${t.num}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          ${timerBadge(mins)}
          <button class="icon-btn" data-action="kds:detailClose" aria-label="Cerrar">${icon('x', { size: 18 })}</button>
        </div>
      </div>
      <div style="padding:8px 22px 4px;">${items}</div>
      <div style="padding:16px 22px;display:flex;gap:10px;">
        ${canRecall ? `<button class="btn btn-secondary" data-action="kds:recall" data-id="${t.id}">${icon('chevronLeft', { size: 18 })}Devolver</button>` : ''}
        <button class="btn ${col.cls} btn-block" data-action="kds:advance" data-id="${t.id}">${icon('arrowRight', { size: 18 })}${col.label}</button>
      </div>
    </div>
  </div>`;
}

/* ---- Módulo: 86 / agotados ---- */
function module86(state) {
  const count86 = Object.keys(state.eightySix || {}).length;
  const groups = CATEGORIES.map(([cat, label]) => {
    const dishes = state.menu.filter(m => m.cat === cat);
    if (!dishes.length) return '';
    const rows = dishes.map(m => {
      const off = is86(m.id, state);
      const reason = off ? state.eightySix[m.id] : '';
      return `<div class="dish-row${off ? ' is-86' : ''}">
        <div class="dish-info">
          <div class="dish-name">${esc(m.name)}</div>
          <div class="dish-meta">${off ? esc(reason) : (m.insumo ? 'Insumo: ' + esc(m.insumo) : 'Disponible')}</div>
        </div>
        ${off ? badge('86 · Agotado', 'error') : ''}
        <button class="switch${off ? ' is-on' : ''}" role="switch" aria-checked="${off}" data-action="86:toggle" data-id="${m.id}" aria-label="${off ? 'Reactivar' : 'Marcar 86'} ${esc(m.name)}"></button>
      </div>`;
    }).join('');
    return `<div class="mt-24"><div class="sec-label">${label}</div><div class="menu86-grid">${rows}</div></div>`;
  }).join('');

  return `<div class="wrap fade-up">
    <div class="card card-pad" style="display:flex;align-items:center;gap:16px;margin-bottom:8px;">
      <div class="role-card-icon" style="margin:0;">${icon('ban', { size: 24 })}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-family:var(--font-serif);font-size:19px;font-weight:600;color:var(--color-ink);">Marcar 86 / agotado</div>
        <div style="font-size:13.5px;color:var(--color-text-2);margin-top:2px;">Un plato sin stock se marca aquí y deja de ofrecerse en el menú QR e impacta inventario. Es el único punto donde cocina toca inventario.</div>
      </div>
      ${count86 ? badge(count86 + ' ' + plural(count86, 'plato', 'platos') + ' 86', 'error') : badge('Todo disponible', 'success')}
    </div>
    ${groups}
  </div>`;
}

/* ---- Módulo: historial del turno ---- */
function moduleHistory(state) {
  const h = state.kitchenHistory || [];
  const entregadas = (state.deliveredBase || 0) + h.length;
  const avg = h.length ? Math.round(h.reduce((a, x) => a + x.prepMins, 0) / h.length) : 0;
  const fastest = h.length ? Math.min(...h.map(x => x.prepMins)) : 0;

  const list = h.length ? h.map(e => {
    const summary = e.items.map(i => `${i.qty}× ${esc(i.name)}`).join(' · ');
    const tone = e.prepMins >= 15 ? 'warning' : 'success';
    return `<div class="hist-row">
      <span class="hist-mesa">Mesa ${e.num}</span>
      <div class="hist-items"><div style="font-weight:600;color:var(--color-ink);">${summary}</div>
        <div style="font-size:12px;color:var(--color-text-3);margin-top:2px;">${esc(e.waiter || '—')} · entregada ${hhmm(e.deliveredAt)}</div></div>
      ${badge(e.prepMins + ' min prep.', tone)}
    </div>`;
  }).join('') : emptyState('history', 'Aún sin entregas', 'Las comandas que marques como entregadas aparecerán aquí con su tiempo de preparación.');

  return `<div class="wrap-narrow fade-up">
    <div class="stat-grid c3">
      <div class="stat"><div class="lab">Entregadas hoy</div><div class="val tnum">${entregadas}</div></div>
      <div class="stat"><div class="lab">Tiempo promedio</div><div class="val tnum">${avg}<span style="font-size:18px;color:var(--color-text-3);"> min</span></div></div>
      <div class="stat"><div class="lab">Más rápida</div><div class="val tnum">${fastest}<span style="font-size:18px;color:var(--color-text-3);"> min</span></div></div>
    </div>
    <div class="card mt-24"><div class="hist-list">${list}</div></div>
  </div>`;
}

/* ---- Shell de Cocina ---- */
export function renderCocina(state) {
  const tab = state.cocinaTab || 'kds';
  const nNueva = state.tickets.filter(t => t.status === 'nueva').length;
  const nPrep = state.tickets.filter(t => t.status === 'preparacion').length;
  const nLista = state.tickets.filter(t => t.status === 'lista').length;
  const entregadas = (state.deliveredBase || 0) + (state.kitchenHistory || []).length;
  const count86 = Object.keys(state.eightySix || {}).length;

  const TABS = [
    { id: 'kds', label: 'Comandas', ic: 'utensils', badge: nNueva + nPrep + nLista },
    { id: 'ochenta', label: '86 / Agotados', ic: 'ban', badge: count86, alert: true },
    { id: 'historial', label: 'Historial', ic: 'history', badge: 0 },
  ];
  const tabsHtml = TABS.map(t => `<button class="tab${tab === t.id ? ' is-active' : ''}" data-action="ui" data-key="cocinaTab" data-val="${t.id}" aria-current="${tab === t.id}">
    ${icon(t.ic, { size: 17 })}${t.label}${t.badge ? `<span class="badge-count${t.alert ? ' is-alert' : ''}">${t.badge}</span>` : ''}</button>`).join('');

  let body;
  if (tab === 'ochenta') body = module86(state);
  else if (tab === 'historial') body = moduleHistory(state);
  else body = board(state);

  return `<div class="shell" data-theme="dark">
    <div class="shell-top">
      <div class="kds-topbar">
        <div class="kds-brand">
          ${brandMark(26, 'color')}
          <div><div class="eyebrow">Kitchen Display System</div>
            <div class="kds-brand-title">Cocina · Restaurante Triada</div></div>
        </div>
        <div class="kds-stats">
          <span class="kds-stat"><span class="dot" style="background:var(--color-info);"></span>${nNueva} nuevas</span>
          <span class="kds-stat"><span class="dot" style="background:var(--color-warning);"></span>${nPrep} en preparación</span>
          <span class="kds-stat"><span class="dot" style="background:var(--color-success);"></span>${nLista} listas</span>
          <span class="kds-stat">${icon('check', { size: 15, sw: 2, color: '#7FE0CF' })}${entregadas} entregadas</span>
        </div>
      </div>
      <div class="tabs kds-tabs" role="tablist">${tabsHtml}</div>
    </div>
    <main id="main" class="shell-body">${body}</main>
    ${detailModal(state)}
  </div>`;
}
