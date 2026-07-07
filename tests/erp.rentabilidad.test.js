import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcRentabilidad } from '../modules/erp/domain/rentabilidad.js';

test('rentabilidad: caso completo con margen positivo', () => {
  const r = calcRentabilidad(
    { tarifa: 20000, presupuestoMonto: 1000000 },
    [{ horas: 10 }, { horas: 5 }],          // 15 h
    [{ total: 50000 }, { total: 30000 }],   // 80.000
  );
  assert.equal(r.totalHoras, 15);
  assert.equal(r.costoHoras, 300000);       // 15 × 20.000
  assert.equal(r.costoGastos, 80000);
  assert.equal(r.costoTotal, 380000);
  assert.equal(r.ingreso, 1000000);
  assert.equal(r.margen, 620000);
  assert.equal(r.margenPct, 62);
  assert.deepEqual(r.flags, []);
  assert.equal(r.confiable, true);
});

test('rentabilidad: sin tarifa → bandera y horas no costeadas', () => {
  const r = calcRentabilidad({ presupuestoMonto: 500000 }, [{ horas: 8 }], []);
  assert.equal(r.costoHoras, 0);
  assert.ok(r.flags.includes('sin_tarifa'));
  assert.equal(r.confiable, false);
});

test('rentabilidad: sin presupuesto → margen negativo por el costo, sin %', () => {
  const r = calcRentabilidad({ tarifa: 15000 }, [{ horas: 4 }], [{ total: 20000 }]);
  assert.equal(r.costoHoras, 60000);
  assert.equal(r.costoTotal, 80000);
  assert.equal(r.ingreso, 0);
  assert.equal(r.margen, -80000);
  assert.equal(r.margenPct, null);
  assert.ok(r.flags.includes('sin_presupuesto'));
});

test('rentabilidad: proyecto vacío no rompe', () => {
  const r = calcRentabilidad({}, [], []);
  assert.equal(r.totalHoras, 0);
  assert.equal(r.costoTotal, 0);
  assert.equal(r.margen, 0);
  assert.deepEqual(r.flags.sort(), ['sin_presupuesto', 'sin_tarifa']);
});

test('rentabilidad: valores string (vienen de inputs) se coercen', () => {
  const r = calcRentabilidad(
    { tarifa: '10000', presupuestoMonto: '200000' },
    [{ horas: '3' }], [{ total: '5000' }],
  );
  assert.equal(r.costoHoras, 30000);
  assert.equal(r.costoGastos, 5000);
  assert.equal(r.margen, 165000);
  assert.equal(r.confiable, true);
});
