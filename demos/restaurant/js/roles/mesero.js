/* ============================================================================
   roles/mesero.js · Rol MESERO — terminal de piso (tablet/móvil-first)
   Shell propio + tab bar con badges + módulos ad-hoc:
     · Mis mesas — asignadas, con estado/tiempo/consumo + "tomar otra mesa"
       (al tocar una mesa entra al MODO PEDIDO: menú → carrito → enviar a cocina)
     · Comandas — seguimiento en vivo (en cola / preparando / listo para retirar)
     · Mi turno — ventas, propinas, mesas, ticket prom., meta y top productos
     · Avisos — mesas que piden atención + platos listos, cada uno con su acción
   Es el MOLDE del que derivan Cocina y Cajero. Encadena con la KDS de Cocina.
   ========================================================================== */

import { icon, esc, clp, plural } from '../util.js';
import { badge, emptyState, countPill } from '../components.js';
import { ticketMins, is86 } from '../domain.js';
import { CATEGORIES, MENU, WAITER_ME } from '../data.js';

const MY = WAITER_ME;

/* Estado de mesa → badge (mismo mapeo que en Caja, coherencia entre roles). */
const tableBadge = (st) => ({
  libre: badge('Libre', 'neutral'), ocupada: badge('Ocupada', 'teal'),
  reservada: badge('Reservada', 'info'), atencion: badge('Atención', 'warning'),
  cuenta: badge('Espera cuenta', 'success'),
}[st] || badge(st, 'neutral'));

/* Tono de comanda según etapa. */
const comandaTone = (st) => st === 'lista'
  ? { tone: 'success', label: 'Listo para retirar' }
  : st === 'preparacion' ? { tone: 'warning', label: 'En preparación' }
  : { tone: 'info', label: 'En cola' };

/* ---- Módulo: Mis mesas ---- */
function moduleMesas(state) {
  const myTables = state.tables.filter(t => t.waiter === MY);
  const free = state.tables.filter(t => t.waiter !== MY && t.status === 'libre');

  const mine = myTables.length ? `<div class="acct-grid">${myTables.map(t => `
    <button class="acct-card" data-action="mesero:pick" data-id="${t.id}">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span class="acct-mesa">Mesa ${t.num}</span>${tableBadge(t.status)}
      </div>
      <div style="display:flex;align-items:center;gap:12px;font-size:12.5px;color:var(--color-text-2);font-weight:600;">
        <span>${t.seats} ${plural(t.seats, 'persona')}</span><span>${t.mins ? t.mins + ' min' : 'recién'}</span>
        <span style="margin-left:auto;color:var(--color-ink);font-weight:700;" class="tnum">${t.total ? clp(t.total) : ''}</span>
      </div>
    </button>`).join('')}</div>`
    : emptyState('table', 'Aún sin mesas asignadas', 'Toma una mesa libre abajo para empezar a atender.');

  const others = free.length ? `<div class="sec-label mt-24">Tomar otra mesa libre</div>
    <div class="free-grid">${free.map(t => `
      <button class="free-card" data-action="mesero:pick" data-id="${t.id}">
        <span class="free-num">${t.num}</span>
        <span style="font-size:10.5px;color:var(--color-text-3);">${t.seats} pers</span>
      </button>`).join('')}</div>` : '';

  return `<div class="wrap-narrow fade-up">
    <div class="sec-label">Mis mesas asignadas</div>
    ${mine}
    ${others}
  </div>`;
}

/* ---- Módulo: Comandas ---- */
function moduleComandas(state) {
  const mine = state.tickets.filter(t => t.waiter === MY)
    .slice().sort((a, b) => (a.status === 'lista' ? -1 : 1) - (b.status === 'lista' ? -1 : 1));
  if (!mine.length) {
    return `<div class="wrap-narrow fade-up">${emptyState('clipboard', 'Sin comandas activas', 'Cuando envíes un pedido a cocina aparecerá aquí su estado en vivo.')}</div>`;
  }
  const cards = mine.map(t => {
    const c = comandaTone(t.status);
    const mins = ticketMins(t);
    const items = t.items.map(it => `<div class="kds-item">
      <span class="kds-qty tnum">${it.qty}</span><span class="kds-item-name" style="font-size:14.5px;">${esc(it.name)}</span>
      ${it.note ? `<span class="badge" style="background:var(--color-warning-soft);color:var(--color-warning-fg);">${esc(it.note)}</span>` : ''}</div>`).join('');
    return `<div class="card" style="overflow:hidden;">
      <div class="wc-head">
        <div style="display:flex;align-items:baseline;gap:10px;"><span class="wc-mesa">Mesa ${t.num}</span>
          <span style="font-size:12.5px;color:var(--color-text-3);font-weight:600;">${mins ? 'hace ' + mins + ' min' : 'recién'}</span></div>
        ${badge(c.label, c.tone)}
      </div>
      <div class="wc-items">${items}</div>
      ${t.status === 'lista' ? `<div style="padding:0 18px 16px;"><button class="btn btn-success btn-block" data-action="mesero:deliver" data-id="${t.id}">${icon('check', { size: 18 })}Marcar entregado a la mesa</button></div>` : ''}
    </div>`;
  }).join('');
  return `<div class="wrap-narrow fade-up" style="display:flex;flex-direction:column;gap:14px;">${cards}</div>`;
}

/* ---- Módulo: Mi turno (valores demo) ---- */
function moduleTurno() {
  const top = [['Lomo vetado 300g', 5], ['Risotto de hongos', 4], ['Carmenère Reserva', 3], ['Tiramisú', 3]];
  const stat = (lab, val, color) => `<div class="stat"><div class="lab">${lab}</div><div class="val tnum"${color ? ` style="color:${color};"` : ''}>${val}</div></div>`;
  return `<div class="wrap-narrow fade-up">
    <div class="stat-grid c2">
      ${stat('Ventas del turno', clp(612400))}
      ${stat('Propinas', clp(58900), 'var(--color-primary-600)')}
      ${stat('Mesas atendidas', '9')}
      ${stat('Ticket promedio', clp(68044))}
    </div>
    <div class="card card-pad mt-24">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <span style="font-size:14px;font-weight:700;color:var(--color-ink);">Meta del día</span>
        <span style="font-size:12.5px;font-weight:600;color:var(--color-text-2);">78% de la meta ($785.000)</span>
      </div>
      <div class="goalbar"><span style="width:78%;"></span></div>
    </div>
    <div class="card card-pad mt-24">
      <div class="sec-label">Mis productos más vendidos hoy</div>
      <div style="display:flex;flex-direction:column;gap:13px;">
        ${top.map(([name, qty]) => `<div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:13.5px;font-weight:600;color:var(--color-ink);">${esc(name)}</span>
            <span class="tnum" style="font-size:13px;font-weight:700;color:var(--color-text-2);">${qty}</span></div>
          <div class="prodbar"><span style="width:${qty / 5 * 100}%;"></span></div>
        </div>`).join('')}
      </div>
    </div>
  </div>`;
}

/* ---- Módulo: Avisos ---- */
function moduleAvisos(state) {
  const myTickets = state.tickets.filter(t => t.waiter === MY);
  const myTables = state.tables.filter(t => t.waiter === MY);
  const ready = myTickets.filter(t => t.status === 'lista');
  const attn = myTables.filter(t => t.status === 'atencion');

  const items = [
    ...ready.map(t => ({
      tone: 'success', ic: 'check', title: 'Pedido listo · Mesa ' + t.num,
      sub: 'Retira en cocina y entrégalo a la mesa', action: 'Marcar entregado',
      act: 'mesero:deliver', id: t.id,
    })),
    ...attn.map(t => ({
      tone: 'warning', ic: 'bell', title: 'Mesa ' + t.num + ' solicita atención',
      sub: t.zone + ' · ' + (t.mins || 0) + ' min esperando', action: 'Atender mesa',
      act: 'mesero:pick', id: t.id,
    })),
  ];
  if (!items.length) {
    return `<div class="wrap-narrow fade-up">${emptyState('checkCircle', 'Todo al día', 'No tienes mesas esperando ni platos por retirar.')}</div>`;
  }
  const rows = items.map(a => {
    const soft = `var(--color-${a.tone}-soft)`, fg = `var(--color-${a.tone}-fg)`;
    return `<div class="aviso" style="background:${soft};border-color:${fg};">
      <div class="aviso-ic">${icon(a.ic, { size: 22, color: fg })}</div>
      <div class="aviso-tx"><div class="aviso-title">${esc(a.title)}</div><div class="aviso-sub">${esc(a.sub)}</div></div>
      <button class="btn btn-navy btn-sm" data-action="${a.act}" data-id="${a.id}">${esc(a.action)}</button>
    </div>`;
  }).join('');
  return `<div class="wrap-narrow fade-up" style="display:flex;flex-direction:column;gap:12px;">${rows}</div>`;
}

/* ---- Modo pedido (menú + ticket) ---- */
function orderMode(state) {
  const t = state.tables.find(x => x.id === state.selTable);
  if (!t) return '';
  const cat = state.menuCat || 'fondos';
  const cart = state.cart || [];
  const cartCount = cart.reduce((a, c) => a + c.qty, 0);
  const cartSum = cart.reduce((a, c) => a + c.price * c.qty, 0);
  const sheetOpen = state.waiterSheet;

  const cats = CATEGORIES.map(([id, name]) =>
    `<button class="cat${cat === id ? ' is-active' : ''}" data-action="mesero:cat" data-val="${id}">${name}</button>`).join('');

  const items = MENU.filter(m => m.cat === cat).map(m => {
    const off = is86(m.id, state);
    const tag = off ? badge('Agotado', 'error') : (m.tag ? badge(m.tag, m.tag === 'Popular' ? 'warning' : m.tag === 'Veg' ? 'success' : 'info', false) : '');
    return `<button class="menu-item" data-action="mesero:add" data-id="${m.id}"${off ? ' disabled aria-disabled="true"' : ''}>
      ${tag ? `<span class="mi-tag">${tag}</span>` : ''}
      <span class="mi-name">${esc(m.name)}</span>
      <span class="mi-desc">${esc(m.desc)}</span>
      <div class="mi-foot"><span class="mi-price tnum">${clp(m.price)}</span>
        <span class="mi-add">${icon(off ? 'ban' : 'plus', { size: 18, sw: 2.2 })}</span></div>
    </button>`;
  }).join('');

  // Carrito
  const cartHtml = cart.length ? cart.map(c => `<div class="cart-item">
    <div style="flex:1;min-width:0;"><div style="font-size:14.5px;font-weight:600;color:var(--color-ink);">${esc(c.name)}</div>
      <div class="tnum" style="font-size:13px;color:var(--color-text-3);margin-top:2px;">${clp(c.price * c.qty)}</div></div>
    <div class="qty-step">
      <button class="icon-btn" data-action="mesero:dec" data-id="${c.id}" aria-label="Quitar uno">${icon('minus', { size: 16, sw: 2.4 })}</button>
      <span class="qty-n tnum">${c.qty}</span>
      <button class="icon-btn icon-btn-accent" data-action="mesero:inc" data-id="${c.id}" aria-label="Agregar uno">${icon('plus', { size: 16, sw: 2.4 })}</button>
    </div></div>`).join('')
    : `<div class="state" style="padding:36px 12px;"><div class="state-icon">${icon('cart', { size: 24 })}</div><div class="state-sub">Sin productos aún. Toca un plato para agregarlo.</div></div>`;

  // "Ya en cocina · Historial" de esta mesa
  const sent = [];
  state.tickets.filter(tk => tk.num === t.num).forEach(tk => {
    const c = comandaTone(tk.status);
    tk.items.forEach(it => sent.push({ qty: it.qty, name: it.name, tone: c.tone, label: c.label }));
  });
  const sentHtml = sent.length ? `<div style="margin-top:18px;">
    <div class="sec-label">Ya en cocina · Historial</div>
    ${sent.map(s => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--color-surface-2);">
      <span class="tnum" style="font-size:13.5px;font-weight:700;color:var(--color-text-2);width:28px;">${s.qty}×</span>
      <span style="flex:1;font-size:13.5px;color:var(--color-text);">${esc(s.name)}</span>${badge(s.label, s.tone)}</div>`).join('')}
  </div>` : '';

  const ticket = `<aside class="order-ticket" ${sheetOpen ? 'data-open="1"' : ''} aria-label="Pedido actual">
    <div class="ot-head"><span style="font-family:var(--font-serif);font-size:19px;font-weight:600;color:var(--color-ink);">Pedido actual</span>
      ${countPill(cartCount, 'teal')}</div>
    <div class="ot-body">
      ${cartHtml}
      ${cart.length ? `<div style="margin-top:16px;"><label class="field-label" for="order-note">Observaciones para cocina</label>
        <textarea id="order-note" class="textarea" placeholder="Ej: sin cebolla, alergia a frutos secos…">${esc(state.cartNote || '')}</textarea></div>` : ''}
      ${sentHtml}
    </div>
    <div class="ot-foot">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <span style="font-size:14px;font-weight:600;color:var(--color-text-2);">Total pedido</span>
        <span class="tnum" style="font-family:var(--font-serif);font-size:24px;font-weight:600;color:var(--color-ink);">${clp(cartSum)}</span></div>
      <button class="btn btn-primary btn-lg btn-block" data-action="mesero:send"${cart.length ? '' : ' disabled'} style="margin-bottom:9px;">${icon('send', { size: 19 })}Enviar a cocina</button>
      <button class="btn btn-secondary btn-block" data-action="mesero:bill">${icon('receipt', { size: 18 })}Solicitar cuenta</button>
    </div>
  </aside>`;

  return `<div class="order">
    <div class="order-menu">
      <div class="order-head">
        <button class="btn btn-secondary btn-sm" data-action="mesero:back">${icon('chevronLeft', { size: 17 })}Mesas</button>
        <div><div class="eyebrow">${esc(t.zone)}</div>
          <div style="font-family:var(--font-serif);font-size:22px;font-weight:600;color:var(--color-ink);line-height:1.1;">Mesa ${t.num}</div></div>
        <span style="margin-left:auto;display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:var(--color-text-2);">${icon('users', { size: 16, color: 'var(--color-text-3)' })}${t.seats} comensales</span>
      </div>
      <div class="order-cats">${cats}</div>
      <div class="order-grid">${items}</div>
    </div>
    ${ticket}
    ${sheetOpen ? `<div class="sheet-backdrop" data-action="mesero:closeSheet"></div>` : ''}
    <button class="order-fab" data-action="mesero:openSheet">
      <span style="display:inline-flex;align-items:center;gap:9px;">${icon('cart', { size: 20 })}Ver pedido${cartCount ? ` · ${cartCount}` : ''}</span>
      <span class="tnum">${clp(cartSum)}</span>
    </button>
  </div>`;
}

/* ---- Shell del Mesero ---- */
export function renderMesero(state) {
  // Modo pedido = pantalla completa (sin tab bar), como el prototipo.
  if (state.selTable) {
    return `<div class="shell"><main id="main" class="shell-body" style="display:flex;flex-direction:column;">${orderMode(state)}</main></div>`;
  }

  const screen = state.waiterScreen || 'mesas';
  const myTables = state.tables.filter(t => t.waiter === MY);
  const myTickets = state.tickets.filter(t => t.waiter === MY);
  const myActive = myTickets.filter(t => t.status !== 'lista').length;
  const avisoCount = myTickets.filter(t => t.status === 'lista').length + myTables.filter(t => t.status === 'atencion').length;

  const TABS = [
    { id: 'mesas', label: 'Mis mesas', ic: 'table', badge: myTables.length },
    { id: 'comandas', label: 'Comandas', ic: 'clipboard', badge: myActive },
    { id: 'turno', label: 'Mi turno', ic: 'trending', badge: 0 },
    { id: 'avisos', label: 'Avisos', ic: 'bell', badge: avisoCount, alert: true },
  ];
  const tabsHtml = TABS.map(t => `<button class="tab${screen === t.id ? ' is-active' : ''}" data-action="mesero:screen" data-val="${t.id}" aria-current="${screen === t.id}">
    ${icon(t.ic, { size: 17 })}${t.label}${t.badge ? `<span class="badge-count${t.alert ? ' is-alert' : ''}">${t.badge}</span>` : ''}</button>`).join('');

  let body;
  if (screen === 'comandas') body = moduleComandas(state);
  else if (screen === 'turno') body = moduleTurno();
  else if (screen === 'avisos') body = moduleAvisos(state);
  else body = moduleMesas(state);

  return `<div class="shell">
    <div class="shell-top">
      <div class="topbar">
        <div class="topbar-avatar">CS</div>
        <div class="topbar-id"><div class="eyebrow">Mesero · Turno tarde</div><div class="topbar-name">${esc(MY)}</div></div>
        <div class="topbar-status"><span class="live-dot"></span>En servicio</div>
      </div>
      <div class="tabs" role="tablist">${tabsHtml}</div>
    </div>
    <main id="main" class="shell-body">${body}</main>
  </div>`;
}
