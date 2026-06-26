/* ============================================================================
   domain.js · Contrato de dominio + store único de la app
   Flujo (contrato): Mesero envía → Cocina (nueva → preparación → lista →
   entregada) → Caja cobra → mesa libre.  Conserva este encadenamiento.
   ========================================================================== */

import { createStore } from './store.js';
import { seedState, MENU, WAITER_ME } from './data.js';
import { clp } from './util.js';

export const store = createStore(seedState());
const min = 60000;

/* ---- Toast efímero ---- */
let _toastTimer = null;
export function flash(msg) {
  store.set({ toast: msg });
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => store.set({ toast: null }), 2800);
}

/* ---- Reloj en vivo: envejece timers y urgencia (re-render cada minuto) ---- */
export function startClock() {
  setInterval(() => store.set(s => ({ tick: (s.tick || 0) + 1 })), min);
}

/* ============================ COMANDAS (cocina) =========================== */

/** Minutos transcurridos en la etapa actual de una comanda. */
export function ticketMins(t) {
  return Math.max(0, Math.floor((Date.now() - (t.stageAt || t.createdAt)) / min));
}

/** Avanza una comanda: nueva → preparación → lista → entregada (a historial). */
export function advanceTicket(id) {
  const s = store.state;
  const order = ['nueva', 'preparacion', 'lista'];
  const cur = s.tickets.find(t => t.id === id);
  if (!cur) return;

  if (cur.status === 'lista') {
    // Entregar: sale del board, entra al historial con su tiempo de preparación.
    const prepMins = Math.max(1, Math.floor((Date.now() - cur.createdAt) / min));
    const entry = { id: 'h' + Date.now(), num: cur.num, waiter: cur.waiter, items: cur.items, prepMins, deliveredAt: Date.now() };
    store.set({
      tickets: s.tickets.filter(t => t.id !== id),
      kitchenHistory: [entry, ...s.kitchenHistory],
    });
    flash('Mesa ' + cur.num + ' · pedido entregado');
    return;
  }
  const next = order[order.indexOf(cur.status) + 1];
  store.set({ tickets: s.tickets.map(t => t.id === id ? { ...t, status: next, stageAt: Date.now() } : t) });
  flash(next === 'preparacion' ? 'Mesa ' + cur.num + ' · en preparación' : 'Mesa ' + cur.num + ' · lista para retirar');
}

/** Retrocede una comanda una etapa (corrección de error). */
export function recallTicket(id) {
  const s = store.state;
  const order = ['nueva', 'preparacion', 'lista'];
  const cur = s.tickets.find(t => t.id === id);
  if (!cur) return;
  const i = order.indexOf(cur.status);
  if (i <= 0) return;
  store.set({ tickets: s.tickets.map(t => t.id === id ? { ...t, status: order[i - 1], stageAt: Date.now() } : t) });
  flash('Mesa ' + cur.num + ' · devuelta a ' + order[i - 1]);
}

/* ============================ MESERO (terminal de piso) ================= */

/** Cambia de módulo del mesero y sale del modo pedido. */
export function setWaiterScreen(screen) { store.set({ waiterScreen: screen, selTable: null, cart: [], cartNote: '', waiterSheet: false }); }
/** Entra al modo pedido de una mesa. */
export function pickWaiterTable(id) { store.set({ selTable: id, cart: [], cartNote: '', waiterSheet: false }); }
export function backToTables() { store.set({ selTable: null, cart: [], cartNote: '', waiterSheet: false }); }
export function setMenuCat(c) { store.set({ menuCat: c }); }
export function toggleWaiterSheet(v) { store.set({ waiterSheet: !!v }); }
export function setCartNote(v) { store.set({ cartNote: v }); }

export function addToCart(id) {
  const m = MENU.find(x => x.id === id);
  if (!m) return;
  if (is86(id)) { flash(m.name + ' está 86 (agotado)'); return; }
  const cart = store.state.cart ? store.state.cart.map(c => ({ ...c })) : [];
  const ex = cart.find(c => c.id === id);
  if (ex) ex.qty += 1; else cart.push({ id: m.id, name: m.name, price: m.price, qty: 1 });
  store.set({ cart });
}
export function cartQty(id, d) {
  const cart = (store.state.cart || []).map(c => c.id === id ? { ...c, qty: c.qty + d } : c).filter(c => c.qty > 0);
  store.set({ cart });
}

/** Envía el carrito a cocina: crea comanda (nueva) y la suma a la mesa. */
export function sendToKitchen() {
  const s = store.state;
  if (!s.selTable || !s.cart || !s.cart.length) return;
  const num = +s.selTable.slice(1);
  const sum = s.cart.reduce((a, c) => a + c.price * c.qty, 0);
  const now = Date.now();
  const ticket = {
    id: 't' + now, num, status: 'nueva', waiter: WAITER_ME, mins: 0, createdAt: now, stageAt: now,
    items: s.cart.map(c => ({ name: c.name, qty: c.qty, note: s.cartNote || undefined })),
  };
  const tables = s.tables.map(t => t.id === s.selTable
    ? { ...t, status: t.status === 'libre' ? 'ocupada' : t.status, waiter: t.waiter || WAITER_ME, waiterIdx: t.waiterIdx ?? 0, total: t.total + sum, mins: t.mins || 1 }
    : t);
  store.set({ tickets: [ticket, ...s.tickets], tables, cart: [], cartNote: '', waiterSheet: false });
  flash('Comanda enviada a cocina · Mesa ' + num);
}

/** El mesero solicita la cuenta para su mesa (pasa a estado "cuenta"). */
export function requestBill() {
  const s = store.state;
  if (!s.selTable) return;
  const num = +s.selTable.slice(1);
  store.set({ tables: s.tables.map(t => t.id === s.selTable ? { ...t, status: 'cuenta' } : t) });
  flash('Cuenta solicitada · Mesa ' + num);
}

/* ============================ 86 / AGOTADO =============================== */

export function is86(menuId, s = store.state) { return !!(s.eightySix && s.eightySix[menuId]); }

/** Marca/desmarca un plato como 86 (agotado). Se refleja en menú QR e inventario. */
export function toggle86(menuId, reason) {
  const s = store.state;
  const e = { ...(s.eightySix || {}) };
  const m = MENU.find(x => x.id === menuId);
  if (e[menuId]) {
    delete e[menuId];
    store.set({ eightySix: e });
    flash((m ? m.name : 'Plato') + ' · disponible de nuevo');
  } else {
    e[menuId] = reason || 'Sin stock';
    store.set({ eightySix: e });
    flash((m ? m.name : 'Plato') + ' marcado 86 · fuera del menú');
  }
}

/* ============================ MENÚ QR (cliente final) =================== */
/* Experiencia del comensal sin login: escanea el QR de su mesa, arma el pedido
   y lo envía. Cae en la KDS de Cocina como una comanda más (mesa 7, demo). */

export function setQrCat(c) { store.set({ qrCat: c }); }

export function qrAdd(menuId) {
  const m = MENU.find(x => x.id === menuId);
  if (!m) return;
  if (is86(menuId)) { flash(m.name + ' está agotado'); return; }
  const qrCart = (store.state.qrCart || []).map(c => ({ ...c }));
  const ex = qrCart.find(c => c.id === menuId);
  if (ex) ex.qty += 1; else qrCart.push({ id: m.id, name: m.name, price: m.price, qty: 1 });
  store.set({ qrCart });
}

export function qrQty(id, d) {
  const qrCart = (store.state.qrCart || []).map(c => c.id === id ? { ...c, qty: c.qty + d } : c).filter(c => c.qty > 0);
  store.set({ qrCart, qrSheet: qrCart.length ? store.state.qrSheet : false });
}

export function qrToggleSheet(v) { store.set({ qrSheet: !!v }); }

/** Envía el pedido del comensal a cocina como comanda nueva (mesa 7, demo). */
export function qrSend() {
  const s = store.state;
  if (!s.qrCart || !s.qrCart.length) return;
  const now = Date.now();
  const ticket = {
    id: 't' + now, num: 7, status: 'nueva', waiter: 'Pedido QR', mins: 0, createdAt: now, stageAt: now,
    items: s.qrCart.map(c => ({ name: c.name, qty: c.qty })),
  };
  store.set({ tickets: [ticket, ...s.tickets], qrCart: [], qrSheet: false });
  flash('Pedido enviado · un mesero lo confirmará en la mesa 7');
}

/* ============================ CAJA / COBRO =============================== */

/** Ítems facturables de una mesa, derivados de sus comandas + precios de menú. */
export function billItems(num, s = store.state) {
  const items = [];
  s.tickets.filter(tk => tk.num === num).forEach(tk => tk.items.forEach(it => {
    const m = MENU.find(x => x.name === it.name);
    const ex = items.find(x => x.name === it.name);
    if (ex) ex.qty += it.qty;
    else items.push({ qty: it.qty, name: it.name, price: m ? m.price : 0 });
  }));
  return items;
}

export function billSubtotal(table, s = store.state) {
  const items = billItems(table.num, s);
  const fromItems = items.reduce((a, i) => a + i.price * i.qty, 0);
  return fromItems > 0 ? fromItems : table.total;
}

/** Selecciona la cuenta a cobrar y resetea parámetros de cobro. */
export function selectPayTable(id) {
  store.set({ payTable: id, discount: 0, tip: 0, payMethod: 'efectivo', splitN: 1, receipt: null });
}
export function clearPayTable() { store.set({ payTable: null }); }
export function setDiscount(d) { store.set({ discount: d }); }
export function setTip(t) { store.set({ tip: t }); }
export function setMethod(m) { store.set({ payMethod: m }); }
export function setSplit(n) { store.set({ splitN: Math.max(1, n) }); }

/** Cobra la cuenta seleccionada: emite boleta, registra transacción, libera mesa. */
export function charge() {
  const s = store.state;
  if (!s.caja || !s.caja.open) { flash('Abre la caja antes de cobrar'); return; }
  const t = s.tables.find(x => x.id === s.payTable);
  if (!t) return;
  const sub = billSubtotal(t, s);
  const disc = s.discount || 0, tipPct = s.tip || 0;
  const net = Math.round(sub * (1 - disc / 100));
  const tip = Math.round(sub * tipPct / 100);
  const total = net + tip;
  const folio = 100500 + (s.transactions.filter(x => x.folio >= 100500).length);
  const tx = {
    folio, num: t.num, waiter: t.waiter || '—',
    subtotal: sub, discountPct: disc, tipPct, tip, total,
    method: s.payMethod || 'efectivo', items: billItems(t.num, s),
    splitN: s.splitN || 1, at: Date.now(), voided: false,
  };
  store.set({
    transactions: [tx, ...s.transactions],
    tables: s.tables.map(x => x.id === t.id ? { ...x, status: 'libre', total: 0, waiter: null, waiterIdx: null, mins: 0 } : x),
    receipt: tx, payTable: null,
  });
  flash('Cobro realizado · Mesa ' + t.num + ' · ' + clp(total));
}

export function closeReceipt() { store.set({ receipt: null }); }
/** Reimprime: reabre el comprobante de una transacción del historial. */
export function reprint(folio) {
  const tx = store.state.transactions.find(x => x.folio === folio);
  if (tx) store.set({ receipt: tx });
}
/** Anula una boleta del turno. */
export function voidTransaction(folio) {
  store.set(s => ({ transactions: s.transactions.map(x => x.folio === folio ? { ...x, voided: true } : x) }));
  flash('Boleta ' + folio + ' anulada');
}

/* ============================ ARQUEO ==================================== */

/** Totales del turno por método (boletas no anuladas desde la apertura). */
export function arqueoTotals(s = store.state) {
  const since = s.caja ? s.caja.openedAt : 0;
  const txs = s.transactions.filter(t => !t.voided && t.at >= since);
  const by = { efectivo: 0, tarjeta: 0, transferencia: 0 };
  let tips = 0, count = txs.length;
  txs.forEach(t => { by[t.method] = (by[t.method] || 0) + t.total; tips += t.tip || 0; });
  const ventas = by.efectivo + by.tarjeta + by.transferencia;
  const fondo = s.caja ? s.caja.fondo : 0;
  return { by, tips, count, ventas, fondo, esperadoEfectivo: fondo + by.efectivo };
}

export function openCaja(fondo) {
  store.set({ caja: { open: true, fondo: Math.max(0, Math.round(fondo) || 0), openedAt: Date.now(), closedAt: null }, lastArqueo: null });
  flash('Caja abierta · fondo ' + clp(fondo));
}

/** Cierra la caja: calcula diferencia entre efectivo contado y esperado. */
export function closeCaja(contado) {
  const s = store.state;
  const tot = arqueoTotals(s);
  const diff = Math.round(contado) - tot.esperadoEfectivo;
  const resumen = {
    closedAt: Date.now(), contado: Math.round(contado), esperado: tot.esperadoEfectivo,
    diff, ventas: tot.ventas, tips: tot.tips, count: tot.count, by: tot.by, fondo: tot.fondo,
  };
  store.set({ caja: { ...s.caja, open: false, closedAt: resumen.closedAt }, lastArqueo: resumen });
  flash('Caja cerrada · ' + (diff === 0 ? 'cuadra exacto' : (diff > 0 ? 'sobra ' : 'falta ') + clp(Math.abs(diff))));
}

/* ============================ ADMIN / OPERACIÓN ======================== */

export function setAdminScreen(screen) { store.set({ adminScreen: screen, selTable: null, tableAction: null, adminNav: false }); }
export function setSalesMode(m) { store.set({ salesMode: m }); }
export function toggleAdminNav(v) { store.set({ adminNav: v === undefined ? !store.state.adminNav : !!v }); }

/* ---- Mesas (gestión) ---- */
export function selectTable(id) { store.set({ selTable: id, tableAction: null }); }
export function clearTableSel() { store.set({ selTable: null, tableAction: null }); }
export function setTableAction(a) { store.set({ tableAction: a }); }

export function openTable(id) {
  const t = store.state.tables.find(x => x.id === id);
  store.set({ tables: store.state.tables.map(x => x.id === id ? { ...x, status: 'ocupada', waiter: x.waiter || WAITER_ME, waiterIdx: x.waiterIdx ?? 0, mins: 1 } : x) });
  flash('Mesa ' + (t ? t.num : '') + ' abierta');
}
export function freeTable(id) {
  store.set({ tables: store.state.tables.map(x => x.id === id ? { ...x, status: 'libre', waiter: null, waiterIdx: null, total: 0, mins: 0 } : x), selTable: null, tableAction: null });
  flash('Mesa liberada');
}
export function toggleAtencion() {
  const id = store.state.selTable;
  store.set({ tables: store.state.tables.map(t => t.id === id ? { ...t, status: t.status === 'atencion' ? 'ocupada' : 'atencion' } : t) });
}
export function transferTable(toId) {
  const s = store.state, fromId = s.selTable;
  const f = s.tables.find(t => t.id === fromId);
  if (!f) return;
  const tables = s.tables.map(t => {
    if (t.id === fromId) return { ...t, status: 'libre', waiter: null, waiterIdx: null, total: 0, mins: 0 };
    if (t.id === toId) return { ...t, status: f.status === 'libre' ? 'ocupada' : f.status, waiter: f.waiter, waiterIdx: f.waiterIdx, total: f.total, mins: f.mins, seats: t.seats };
    return t;
  });
  store.set({ tables, selTable: toId, tableAction: null });
  flash('Mesa ' + f.num + ' transferida a mesa ' + (+toId.slice(1)));
}
export function joinTables(otherId) {
  const s = store.state, aId = s.selTable;
  const ta = s.tables.find(t => t.id === aId), tb = s.tables.find(t => t.id === otherId);
  if (!ta || !tb) return;
  const tables = s.tables.map(t => {
    if (t.id === aId) return { ...t, total: t.total + tb.total, seats: t.seats + tb.seats, status: 'ocupada', waiter: t.waiter || tb.waiter };
    if (t.id === otherId) return { ...t, status: 'libre', waiter: null, waiterIdx: null, total: 0, mins: 0 };
    return t;
  });
  store.set({ tables, tableAction: null });
  flash('Mesa ' + (+otherId.slice(1)) + ' unida a mesa ' + ta.num);
}
export function splitBill(n) { store.set({ tableAction: null }); flash('Cuenta dividida en ' + n + ' partes iguales'); }
export function goCobrar() {
  const id = store.state.selTable;
  store.set({ adminScreen: 'caja', payTable: id, discount: 0, tip: 0, payMethod: 'efectivo', splitN: 1, receipt: null });
}

/* ---- Reservas ---- */
export function setResDay(n) { store.set({ resDay: n, showResForm: false }); }
export function openResForm() { store.set({ showResForm: true, resForm: { name: '', people: 2, time: '20:00', zone: 'Salón' } }); }
export function closeResForm() { store.set({ showResForm: false }); }
export function setResField(field, value) { store.set({ resForm: { ...store.state.resForm, [field]: value } }); }
export function addReservation() {
  const f = store.state.resForm;
  if (!f.name || !f.name.trim()) { flash('Ingresa el nombre del cliente'); return; }
  const r = { id: 'r' + Date.now(), name: f.name.trim(), people: +f.people || 2, time: f.time, table: null, zone: f.zone, status: 'pendiente', phone: 'Por confirmar', day: store.state.resDay };
  store.set({ reservations: [...store.state.reservations, r], showResForm: false });
  flash('Reserva creada · pendiente de confirmación');
}
export function confirmReservation(id) {
  store.set({ reservations: store.state.reservations.map(r => r.id === id ? { ...r, status: 'confirmada' } : r) });
  flash('Reserva confirmada');
}
export function assignReservation(id) {
  const free = store.state.tables.find(t => t.status === 'libre');
  store.set({ reservations: store.state.reservations.map(r => r.id === id ? { ...r, table: free ? free.num : r.table, status: 'confirmada' } : r) });
  flash('Mesa asignada · reserva confirmada');
}

/* ---- Inventario ---- */
export function restock(id) {
  store.set({ inventory: store.state.inventory.map(i => i.id === id ? { ...i, stock: i.min * 2, status: 'ok' } : i) });
  flash('Reposición solicitada al proveedor');
}
