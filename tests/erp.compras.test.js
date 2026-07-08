import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcOC, ocToGasto, gastoToMovimiento } from '../modules/erp/domain/compras.js';

test('calcOC: neto = Σ(cantidad × precioUnit), IVA 19%, total', () => {
  const r = calcOC([
    { descripcion: 'Notebook', cantidad: 2, precioUnit: 500000 },
    { descripcion: 'Mouse',    cantidad: 3, precioUnit: 10000 },
  ]);
  assert.equal(r.neto, 1030000);          // 1.000.000 + 30.000
  assert.equal(r.iva, 195700);            // 19%
  assert.equal(r.total, 1225700);
  assert.equal(r.items[0].subtotal, 1000000);
  assert.equal(r.items[1].subtotal, 30000);
});

test('calcOC: sin líneas → todo en cero, no rompe', () => {
  const r = calcOC([]);
  assert.equal(r.neto, 0);
  assert.equal(r.iva, 0);
  assert.equal(r.total, 0);
  assert.deepEqual(r.items, []);
});

test('calcOC: valores string se coercen y el IVA es configurable', () => {
  const r = calcOC([{ cantidad: '2', precioUnit: '1000' }], 0);
  assert.equal(r.neto, 2000);
  assert.equal(r.iva, 0);
  assert.equal(r.total, 2000);
});

test('ocToGasto: la OC recepcionada produce un gasto pendiente imputado', () => {
  const oc = { correlativo: 'OC-000001', proveedorId: 'p1', proyectoId: 'x1', neto: 100000, iva: 19000, total: 119000 };
  const g = ocToGasto(oc, 'Proveedor SPA', '2026-07-07T10:00:00Z');
  assert.equal(g.proveedorId, 'p1');
  assert.equal(g.proyectoId, 'x1');
  assert.equal(g.categoria, 'Compra');
  assert.equal(g.descripcion, 'OC-000001 · Proveedor SPA');
  assert.equal(g.total, 119000);
  assert.equal(g.estado, 'pendiente');
  assert.equal(g.fecha, '2026-07-07');
});

test('ocToGasto: sin proveedor ni proyecto → nulls, descripción simple', () => {
  const g = ocToGasto({ correlativo: 'OC-000002', neto: 0, iva: 0, total: 0 }, null, '2026-07-07');
  assert.equal(g.proveedorId, null);
  assert.equal(g.proyectoId, null);
  assert.equal(g.descripcion, 'OC-000002');
});

test('gastoToMovimiento: pagar un gasto genera un egreso ligado por gastoId', () => {
  const m = gastoToMovimiento({ id: 'g1', correlativo: 'GAS-000003', descripcion: 'OC-000001', total: 119000, proyectoId: 'x1' }, '2026-07-07');
  assert.equal(m.tipo, 'egreso');
  assert.equal(m.monto, 119000);
  assert.equal(m.gastoId, 'g1');
  assert.equal(m.proyectoId, 'x1');
  assert.equal(m.fechaReal, '2026-07-07');
  assert.ok(m.descripcion.includes('GAS-000003'));
});
