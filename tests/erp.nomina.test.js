import { test } from 'node:test';
import assert from 'node:assert/strict';
import { costoHora, calcMargenReal, resumenNomina, HORAS_MES } from '../modules/erp/domain/nomina.js';

test('costoHora: costo-empresa mensual / jornada mensual', () => {
  assert.equal(costoHora({ costoEmpresaBase: 1800000 }), 10000);   // 1.800.000 / 180
  assert.equal(costoHora({ costoEmpresaBase: 1800000 }, 200), 9000);
  assert.equal(HORAS_MES, 180);
});

test('costoHora: sin costo o inválido → 0 (no rompe)', () => {
  assert.equal(costoHora({}), 0);
  assert.equal(costoHora(null), 0);
  assert.equal(costoHora({ costoEmpresaBase: 'x' }), 0);
  assert.equal(costoHora({ costoEmpresaBase: 900000 }, 0), 5000);  // horasMes 0 → cae al default 180
});

test('margen real: costea cada hora por el costo-empresa de quien la hizo', () => {
  const proyecto = { presupuestoMonto: 1000000 };
  const horas = [
    { profileId: 'a', horas: 10 },   // 10 × 10.000 = 100.000
    { profileId: 'b', horas: 5 },    //  5 ×  6.000 =  30.000
  ];
  const gastos = [{ total: 20000 }];
  const costoPorProfile = { a: 10000, b: 6000 };
  const r = calcMargenReal(proyecto, horas, gastos, costoPorProfile);
  assert.equal(r.totalHoras, 15);
  assert.equal(r.costoHoras, 130000);
  assert.equal(r.costoGastos, 20000);
  assert.equal(r.costoTotal, 150000);
  assert.equal(r.margen, 850000);
  assert.equal(r.margenPct, 85);
  assert.equal(r.horasSinCosto, 0);
  assert.deepEqual(r.flags, []);
  assert.equal(r.confiable, true);
});

test('margen real: horas de alguien sin costo → bandera horas_sin_costo', () => {
  const r = calcMargenReal(
    { presupuestoMonto: 500000 },
    [{ profileId: 'a', horas: 8 }, { profileId: 'z', horas: 4 }],
    [],
    { a: 10000 },   // 'z' no tiene costo cargado
  );
  assert.equal(r.costoHoras, 80000);       // solo las 8 h de 'a'
  assert.equal(r.horasSinCosto, 4);
  assert.ok(r.flags.includes('horas_sin_costo'));
  assert.equal(r.confiable, false);
});

test('margen real: sin presupuesto → margen negativo por el costo, sin %', () => {
  const r = calcMargenReal({}, [{ profileId: 'a', horas: 2 }], [{ total: 5000 }], { a: 10000 });
  assert.equal(r.ingreso, 0);
  assert.equal(r.costoTotal, 25000);
  assert.equal(r.margen, -25000);
  assert.equal(r.margenPct, null);
  assert.ok(r.flags.includes('sin_presupuesto'));
});

test('margen real: proyecto sin horas ni gastos no rompe', () => {
  const r = calcMargenReal({ presupuestoMonto: 100000 }, [], [], {});
  assert.equal(r.costoTotal, 0);
  assert.equal(r.margen, 100000);
  assert.equal(r.margenPct, 100);
  assert.deepEqual(r.flags, []);
});

test('resumenNomina: suma imponible, líquido y costo-empresa', () => {
  const t = resumenNomina([
    { imponible: 1000000, liquido: 800000, costoEmpresa: 1300000 },
    { imponible: 900000,  liquido: 720000, costoEmpresa: 1170000 },
  ]);
  assert.equal(t.imponible, 1900000);
  assert.equal(t.liquido, 1520000);
  assert.equal(t.costoEmpresa, 2470000);
  assert.equal(t.n, 2);
});

test('resumenNomina: lista vacía → ceros', () => {
  assert.deepEqual(resumenNomina([]), { imponible: 0, liquido: 0, costoEmpresa: 0, n: 0 });
});
