// modules/erp/domain/finanzas.js — LÓGICA PURA (testeable en node).
//
// Flujo de caja y borrador de F29, deterministas y sin API. Estos números los hace
// código auditable; la IA (M2/Gemini) SOLO narra agregados ya calculados, nunca los
// computa ni recibe PII. El F29 es un BORRADOR DE APOYO — no reemplaza al contador.

const n = (v) => Number(v) || 0;
const ym = (d) => (d || '').toString().slice(0, 7);   // 'YYYY-MM'
const ymd = (d) => (d || '').toString().slice(0, 10);

// ── Flujo de caja: saldo real + cuentas por cobrar/pagar + aging + proyección ──
export function calcFlujoCaja(movimientos = [], facturas = [], gastos = [], hoy) {
  const today = ymd(hoy);
  const ingresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + n(m.monto), 0);
  const egresos  = movimientos.filter(m => m.tipo === 'egreso').reduce((s, m) => s + n(m.monto), 0);
  const saldoCaja = ingresos - egresos;

  const saldoFact = (f) => Math.max(0, n(f.monto) - n(f.pagado));
  const abiertas  = facturas.filter(f => f.estado === 'pendiente' || f.estado === 'parcial');
  const porCobrar = abiertas.reduce((s, f) => s + saldoFact(f), 0);
  const vencidoCobrar = abiertas.filter(f => f.vencimiento && ymd(f.vencimiento) < today).reduce((s, f) => s + saldoFact(f), 0);

  const pendientes = gastos.filter(g => g.estado === 'pendiente');
  const porPagar     = pendientes.reduce((s, g) => s + n(g.total), 0);
  const vencidoPagar = pendientes.filter(g => g.vencimiento && ymd(g.vencimiento) < today).reduce((s, g) => s + n(g.total), 0);

  return { saldoCaja, ingresos, egresos, porCobrar, vencidoCobrar, porPagar, vencidoPagar, proyeccion: saldoCaja + porCobrar - porPagar };
}

// ── Borrador de F29 (IVA débito − crédito + PPM) para un período 'YYYY-MM' ──
// Asume que factura.monto es el TOTAL con IVA (chileno) → IVA = monto × 19/119.
export function calcF29(facturas = [], gastos = [], params = {}, periodo) {
  const per = ym(periodo);
  const inPer = (d) => ym(d) === per;

  const ventasBrutas = facturas.filter(f => inPer(f.emision)).reduce((s, f) => s + n(f.monto), 0);
  const ivaDebito    = Math.round(ventasBrutas * 19 / 119);
  const ventasNetas  = ventasBrutas - ivaDebito;
  const ivaCredito   = gastos.filter(g => inPer(g.fecha)).reduce((s, g) => s + n(g.iva), 0);
  const ivaAPagar    = Math.max(0, ivaDebito - ivaCredito);

  const pctPpm = n(params && params.pctPpm);
  const ppm    = Math.round(ventasNetas * pctPpm / 100);
  const totalF29 = ivaAPagar + ppm;

  const flags = [];
  if (!params || params.pctPpm == null) flags.push('sin_ppm');
  if (ventasBrutas === 0) flags.push('sin_ventas');

  return { periodo: per, ventasBrutas, ventasNetas, ivaDebito, ivaCredito, ivaAPagar, ppm, totalF29, flags };
}
