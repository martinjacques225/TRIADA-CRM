// tests/op.finanzas.test.js — Calculadora de la oferta (IVA, margen, precio).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularCotizacion, costoItem, utilidadReal, IVA_TASA } from '../modules/oportunidades/domain/finanzas.js';

test('IVA: 19% sobre el neto y total = neto + IVA', () => {
  const r = calcularCotizacion({ items: [{ tipo: 'hora', horas: 10, valorHora: 10000 }], contingenciaPct: 0, precioOfertado: 1000000 });
  assert.equal(r.precioNeto, 1000000);
  assert.equal(r.iva, 190000);
  assert.equal(r.precioTotal, 1190000);
  assert.equal(IVA_TASA, 0.19);
});

test('IVA: tasa configurable (si alguna vez cambia la ley, no hay que tocar código)', () => {
  const r = calcularCotizacion({ items: [], precioOfertado: 1000000, ivaTasa: 0.21 });
  assert.equal(r.iva, 210000);
  assert.equal(r.precioTotal, 1210000);
});

test('precio sugerido: costo base / (1 - margen objetivo)', () => {
  const r = calcularCotizacion({
    items: [{ tipo: 'hora', horas: 25, valorHora: 16000 }, { tipo: 'directo', monto: 100000 }],
    contingenciaPct: 0.10, margenObjetivo: 0.30,
  });
  assert.equal(r.costoHoras, 400000);
  assert.equal(r.costosDirectos, 100000);
  assert.equal(r.subtotal, 500000);
  assert.equal(r.contingencia, 50000);
  assert.equal(r.costoBase, 550000);
  assert.equal(r.precioSugerido, 785714);           // 550.000 / 0,7
  assert.equal(r.precioNeto, 785714);               // sin precio fijado, manda el sugerido
  assert.ok(Math.abs(r.margenReal - 0.30) < 0.0001);
});

test('margen real: se calcula sobre el precio efectivamente ofertado, no sobre el sugerido', () => {
  const r = calcularCotizacion({
    items: [{ tipo: 'hora', horas: 25, valorHora: 16000 }, { tipo: 'directo', monto: 100000 }],
    contingenciaPct: 0.10, margenObjetivo: 0.30, precioOfertado: 700000,
  });
  assert.equal(r.utilidad, 150000);                  // 700.000 − 550.000
  assert.ok(Math.abs(r.margenReal - 0.2142857) < 0.0001);
  assert.equal(r.margenRealPct, 21.4);
  assert.equal(r.causalMargen, true);                // bajo 25% ⇒ causal de descarte
  assert.ok(r.alertas.some((a) => a.codigo === 'margen_descarte' && a.nivel === 'critico'));
});

test('margen entre 25% y 30%: avisa pero no descarta', () => {
  const r = calcularCotizacion({ items: [{ tipo: 'directo', monto: 730000 }], contingenciaPct: 0, precioOfertado: 1000000 });
  assert.equal(r.margenRealPct, 27);
  assert.equal(r.causalMargen, false);
  assert.equal(r.requiereTresSocios, true);
  assert.ok(r.alertas.some((a) => a.codigo === 'margen_bajo'));
});

test('el trabajo de los socios no es utilidad: sale del neto igual que los costos', () => {
  const r = calcularCotizacion({
    items: [{ tipo: 'hora', horas: 45, valorHora: 10000 }, { tipo: 'directo', monto: 100000 }],
    contingenciaPct: 0, precioOfertado: 1000000,
  });
  assert.equal(r.costoHoras, 450000);
  assert.equal(r.utilidad, 450000);                  // 1.000.000 − 550.000
  assert.notEqual(r.utilidad, r.precioNeto);         // el neto NO es la ganancia
});

test('capital de trabajo: solo las salidas reales de caja (las horas de los socios no salen de caja)', () => {
  const r = calcularCotizacion({
    items: [
      { tipo: 'hora', horas: 40, valorHora: 20000 },
      { tipo: 'subcontrato', monto: 300000, diasAntesPago: 45 },
      { tipo: 'licencia', monto: 50000, diasAntesPago: 10 },
    ],
    diasPagoEstimados: 60,
  });
  assert.equal(r.capitalTrabajo, 350000);
  assert.equal(r.diasPagoEstimados, 60);
  assert.equal(r.tieneSubcontrato, true);
  assert.equal(r.requiereTresSocios, true);          // hay subcontrato
});

test('presupuesto del comprador con IVA: se lleva a neto antes de comparar', () => {
  const r = calcularCotizacion({
    items: [{ tipo: 'directo', monto: 700000 }], contingenciaPct: 0,
    precioOfertado: 1000000, presupuestoComprador: 1190000, presupuestoIncluyeIva: 'con_iva',
  });
  assert.equal(r.presupuestoNeto, 1000000);
  assert.equal(r.excedePresupuesto, false);
});

test('presupuesto neto menor al precio: marca que se excede', () => {
  const r = calcularCotizacion({
    items: [{ tipo: 'directo', monto: 700000 }], contingenciaPct: 0,
    precioOfertado: 1200000, presupuestoComprador: 1000000, presupuestoIncluyeIva: 'neto',
  });
  assert.equal(r.excedePresupuesto, true);
  assert.ok(r.alertas.some((a) => a.codigo === 'excede_presupuesto'));
});

test('monto sobre el tope: exige la firma de los tres socios', () => {
  const r = calcularCotizacion({ items: [{ tipo: 'directo', monto: 1000000 }], precioOfertado: 3000000, topeTresSocios: 2500000 });
  assert.equal(r.requiereTresSocios, true);
  assert.ok(r.alertas.some((a) => a.codigo === 'monto_alto'));
});

test('sin ítems: no explota y avisa que el precio no significa nada', () => {
  const r = calcularCotizacion({});
  assert.equal(r.costoBase, 0);
  assert.equal(r.precioNeto, 0);
  assert.equal(r.margenReal, null);
  assert.ok(r.alertas.some((a) => a.codigo === 'sin_items'));
});

test('horas sin valor por hora: se avisa porque el costo queda subestimado', () => {
  const r = calcularCotizacion({ items: [{ tipo: 'hora', horas: 20 }] });
  assert.equal(r.costoHoras, 0);
  assert.equal(r.totalHoras, 20);
  assert.ok(r.alertas.some((a) => a.codigo === 'sin_valor_hora'));
});

test('margen objetivo absurdo (100%) se acota en vez de dividir por cero', () => {
  const r = calcularCotizacion({ items: [{ tipo: 'directo', monto: 100000 }], contingenciaPct: 0, margenObjetivo: 1 });
  assert.ok(Number.isFinite(r.precioSugerido));
  assert.equal(r.precioSugerido, 2000000);           // acotado a 0,95
});

test('costoItem: las horas se valorizan; el resto usa su monto', () => {
  assert.equal(costoItem({ tipo: 'hora', horas: 3, valorHora: 15000 }), 45000);
  assert.equal(costoItem({ tipo: 'traslado', monto: 25000 }), 25000);
  assert.equal(costoItem(null), 0);
});

test('valores en texto con formato chileno: el punto de miles no divide el precio por mil', () => {
  const r = calcularCotizacion({ items: [{ tipo: 'hora', horas: '10', valorHora: '16.000' }], contingenciaPct: 0, precioOfertado: '300.000' });
  assert.equal(r.costoHoras, 160000);
  assert.equal(r.precioNeto, 300000);
});

test('el punto decimal de las horas se respeta (12.5 h no son 125)', () => {
  const r = calcularCotizacion({ items: [{ tipo: 'hora', horas: '12.5', valorHora: 20000 }], contingenciaPct: 0 });
  assert.equal(r.totalHoras, 12.5);
  assert.equal(r.costoHoras, 250000);
});

test('formato con coma decimal ("1.250.000,50") también se entiende', () => {
  const r = calcularCotizacion({ items: [{ tipo: 'directo', monto: '1.250.000,50' }], contingenciaPct: 0 });
  assert.equal(r.costosDirectos, 1250001);   // se redondea a pesos
});

test('utilidad real: descuenta el IVA del monto facturado antes de comparar', () => {
  const r = utilidadReal({ montoFacturado: 1190000, incluyeIva: true, costoBase: 600000 });
  assert.equal(r.neto, 1000000);
  assert.equal(r.iva, 190000);
  assert.equal(r.utilidad, 400000);
  assert.ok(Math.abs(r.margen - 0.4) < 0.0001);
});
