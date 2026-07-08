import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcFlujoCaja, calcF29 } from '../modules/erp/domain/finanzas.js';

test('flujo de caja: saldo + por cobrar/pagar + aging + proyección', () => {
  const mov = [{ tipo: 'ingreso', monto: 1000000 }, { tipo: 'egreso', monto: 300000 }];
  const fac = [{ estado: 'pendiente', monto: 500000, pagado: 0, vencimiento: '2026-06-01' }, { estado: 'pagado', monto: 200000, pagado: 200000 }];
  const gas = [{ estado: 'pendiente', total: 150000, vencimiento: '2026-06-01' }, { estado: 'pagado', total: 50000 }];
  const r = calcFlujoCaja(mov, fac, gas, '2026-07-07');
  assert.equal(r.saldoCaja, 700000);
  assert.equal(r.porCobrar, 500000);
  assert.equal(r.vencidoCobrar, 500000);
  assert.equal(r.porPagar, 150000);
  assert.equal(r.vencidoPagar, 150000);
  assert.equal(r.proyeccion, 700000 + 500000 - 150000);
});

test('flujo: factura parcial cuenta el saldo, no el total', () => {
  const r = calcFlujoCaja([], [{ estado: 'parcial', monto: 1000000, pagado: 400000 }], [], '2026-07-07');
  assert.equal(r.porCobrar, 600000);
});

test('F29: IVA débito − crédito + PPM', () => {
  const fac = [{ emision: '2026-07-03', monto: 1190000 }]; // gross → IVA 190.000, neto 1.000.000
  const gas = [{ fecha: '2026-07-05', iva: 38000 }];
  const r = calcF29(fac, gas, { pctPpm: 1 }, '2026-07');
  assert.equal(r.ventasBrutas, 1190000);
  assert.equal(r.ivaDebito, 190000);
  assert.equal(r.ventasNetas, 1000000);
  assert.equal(r.ivaCredito, 38000);
  assert.equal(r.ivaAPagar, 152000);
  assert.equal(r.ppm, 10000);
  assert.equal(r.totalF29, 162000);
  assert.deepEqual(r.flags, []);
});

test('F29: sin ventas ni PPM → banderas, no rompe', () => {
  const r = calcF29([], [], {}, '2026-07');
  assert.equal(r.totalF29, 0);
  assert.ok(r.flags.includes('sin_ventas'));
  assert.ok(r.flags.includes('sin_ppm'));
});

test('F29: crédito mayor que débito → IVA a pagar 0 (nunca negativo)', () => {
  const r = calcF29([{ emision: '2026-07-01', monto: 119000 }], [{ fecha: '2026-07-01', iva: 50000 }], { pctPpm: 0 }, '2026-07');
  assert.equal(r.ivaDebito, 19000);
  assert.equal(r.ivaAPagar, 0);
  assert.deepEqual(r.flags, []); // pctPpm:0 es válido, hay ventas
});

test('F29: solo cuenta el período pedido', () => {
  const fac = [{ emision: '2026-07-01', monto: 119000 }, { emision: '2026-06-01', monto: 1000000 }];
  const r = calcF29(fac, [], { pctPpm: 0 }, '2026-07');
  assert.equal(r.ventasBrutas, 119000);
});
