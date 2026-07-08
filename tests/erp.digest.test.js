import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcDigest, DIAS_SIN_AVANCE } from '../modules/erp/domain/digest.js';

const HOY = '2026-07-07';

test('digest: todo en orden → sin alertas', () => {
  const r = calcDigest({
    proyectos: [{ id: 'p1', estado: 'activo', tarifa: 20000, presupuestoMonto: 1000000 }],
    horas: [{ proyectoId: 'p1', fecha: '2026-07-06' }],
  }, HOY);
  assert.deepEqual(r.alerts, []);
  assert.equal(r.criticos, 0);
  assert.match(r.titular, /Todo en orden/);
});

test('digest: factura vencida → crítico con monto (saldo, no total)', () => {
  const r = calcDigest({ facturas: [{ estado: 'parcial', monto: 500000, pagado: 200000, vencimiento: '2026-06-01' }] }, HOY);
  const a = r.alerts.find(x => x.tipo === 'facturas_vencidas');
  assert.equal(a.nivel, 'critico');
  assert.equal(a.monto, 300000);
  assert.equal(a.titulo, '1 factura vencida');
  assert.equal(r.criticos, 1);
});

test('digest: gasto vencido → crítico', () => {
  const r = calcDigest({ gastos: [{ estado: 'pendiente', total: 119000, vencimiento: '2026-06-30' }] }, HOY);
  const a = r.alerts.find(x => x.tipo === 'gastos_vencidos');
  assert.equal(a.nivel, 'critico');
  assert.equal(a.monto, 119000);
});

test('digest: gasto pagado o sin vencer no alerta', () => {
  const r = calcDigest({ gastos: [{ estado: 'pagado', total: 1, vencimiento: '2026-06-01' }, { estado: 'pendiente', total: 1, vencimiento: '2026-08-01' }] }, HOY);
  assert.equal(r.alerts.filter(a => a.tipo === 'gastos_vencidos').length, 0);
});

test('digest: proyecto activo sin horas nunca → sin avance', () => {
  const r = calcDigest({ proyectos: [{ id: 'p1', estado: 'activo', tarifa: 1, presupuestoMonto: 1 }], horas: [] }, HOY);
  const a = r.alerts.find(x => x.tipo === 'proyectos_sin_avance');
  assert.ok(a);
  assert.equal(a.nivel, 'aviso');
});

test(`digest: proyecto con horas hace ${DIAS_SIN_AVANCE}+ días → sin avance; recientes no`, () => {
  const viejo = calcDigest({ proyectos: [{ id: 'p1', estado: 'activo', tarifa: 1, presupuestoMonto: 1 }], horas: [{ proyectoId: 'p1', fecha: '2026-06-20' }] }, HOY);
  assert.ok(viejo.alerts.some(a => a.tipo === 'proyectos_sin_avance'));
  const fresco = calcDigest({ proyectos: [{ id: 'p1', estado: 'activo', tarifa: 1, presupuestoMonto: 1 }], horas: [{ proyectoId: 'p1', fecha: '2026-07-05' }] }, HOY);
  assert.equal(fresco.alerts.filter(a => a.tipo === 'proyectos_sin_avance').length, 0);
});

test('digest: proyecto sin tarifa o sin valor → info (margen referencial)', () => {
  const r = calcDigest({ proyectos: [{ id: 'p1', estado: 'activo', tarifa: null, presupuestoMonto: 1 }], horas: [{ proyectoId: 'p1', fecha: HOY }] }, HOY);
  const a = r.alerts.find(x => x.tipo === 'proyectos_sin_datos');
  assert.equal(a.nivel, 'info');
});

test('digest: licencia por renovar dentro de 15 días → aviso', () => {
  const r = calcDigest({ activos: [{ estado: 'activo', fechaRenovacion: '2026-07-15' }] }, HOY);
  assert.ok(r.alerts.some(a => a.tipo === 'renovaciones'));
  const lejos = calcDigest({ activos: [{ estado: 'activo', fechaRenovacion: '2026-09-01' }] }, HOY);
  assert.equal(lejos.alerts.filter(a => a.tipo === 'renovaciones').length, 0);
});

test('digest: titular cuenta alertas y urgentes', () => {
  const r = calcDigest({
    facturas: [{ estado: 'pendiente', monto: 100, pagado: 0, vencimiento: '2026-01-01' }],
    proyectos: [{ id: 'p1', estado: 'activo', tarifa: 1, presupuestoMonto: 1 }],
    horas: [],
  }, HOY);
  assert.equal(r.criticos, 1);
  assert.match(r.titular, /2 cosas requieren tu atención · 1 urgente/);
});
