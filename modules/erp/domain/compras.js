// modules/erp/domain/compras.js — LÓGICA PURA (testeable en node).
//
// Cadena de compras: OC → gasto → movimiento de caja.
// Los totales y los payloads de cada eslabón se calculan acá, deterministas y testeados;
// la UI solo los pasa a los repos.

const n = (v) => Number(v) || 0;
const ymd = (d) => (d || '').toString().slice(0, 10);

export const IVA_PCT = 19;

/** Totales de una orden de compra desde sus líneas [{descripcion,cantidad,precioUnit}]. */
export function calcOC(lineas = [], ivaPct = IVA_PCT) {
  const items = lineas.map(l => ({ ...l, subtotal: n(l.cantidad) * n(l.precioUnit) }));
  const neto  = items.reduce((s, l) => s + l.subtotal, 0);
  const iva   = Math.round(neto * n(ivaPct) / 100);
  return { items, neto, iva, total: neto + iva };
}

/** Payload del GASTO que genera una OC al recepcionarse (OC → gasto). */
export function ocToGasto(oc, proveedorNombre, hoy) {
  return {
    proveedorId: oc.proveedorId || null,
    proyectoId:  oc.proyectoId  || null,
    categoria:   'Compra',
    descripcion: `${oc.correlativo || 'OC'}${proveedorNombre ? ' · ' + proveedorNombre : ''}`,
    neto:  n(oc.neto),
    iva:   n(oc.iva),
    total: n(oc.total),
    estado: 'pendiente',
    fecha: ymd(hoy),
  };
}

/** Payload del MOVIMIENTO de caja al pagar un gasto (gasto → movimiento). */
export function gastoToMovimiento(gasto, hoy) {
  return {
    tipo:        'egreso',
    monto:       n(gasto.total),
    fechaReal:   ymd(hoy),
    descripcion: `Pago ${gasto.correlativo || 'gasto'}${gasto.descripcion ? ' · ' + gasto.descripcion : ''}`,
    proyectoId:  gasto.proyectoId || null,
    gastoId:     gasto.id,
  };
}
