// tests/op.alertas.test.js — Alertas, duplicados/idempotencia y analítica.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generarAlertas, resumenAlertas, horasHastaCierre, diasHastaCierre } from '../modules/oportunidades/domain/alertas.js';
import { claveExterna, indexar, fusionar, clasificar, resumenSync, codigoDesdeEnlace } from '../modules/oportunidades/domain/sincronizacion.js';
import { calcularEmbudo, calcularMetricas, agrupar, motivosDescarte, motivosPerdida, comparativoPrecios } from '../modules/oportunidades/domain/analitica.js';

// Reloj fijo: los tests no pueden depender de la hora de la máquina.
const AHORA = new Date('2026-08-03T12:00:00-04:00').getTime();
const enHoras = (h) => new Date(AHORA + h * 3600 * 1000).toISOString();
const enDias  = (d) => new Date(AHORA + d * 86400 * 1000).toISOString().slice(0, 10);

// ═══ ALERTAS ═════════════════════════════════════════════════════════════════
test('cuenta regresiva: horas y días hasta el cierre', () => {
  assert.equal(Math.round(horasHastaCierre(enHoras(5), AHORA)), 5);
  assert.equal(diasHastaCierre(enHoras(50), AHORA), 2);
  assert.equal(horasHastaCierre(null, AHORA), null);
  assert.ok(horasHastaCierre(enHoras(-3), AHORA) < 0);
});

test('los tres avisos de cierre salen en el tramo correcto', () => {
  const ops = [
    { id: '4h', titulo: 'A', estado: 'en_analisis', fechaCierre: enHoras(3) },
    { id: '24h', titulo: 'B', estado: 'en_analisis', fechaCierre: enHoras(20) },
    { id: '72h', titulo: 'C', estado: 'en_analisis', fechaCierre: enHoras(60) },
    { id: 'lejos', titulo: 'D', estado: 'en_analisis', fechaCierre: enHoras(200) },
  ];
  const a = generarAlertas({ oportunidades: ops, ahora: AHORA });
  const tipos = Object.fromEntries(a.map((x) => [x.opId, x.tipo]));
  assert.equal(tipos['4h'], 'cierre_4h');
  assert.equal(tipos['24h'], 'cierre_24h');
  assert.equal(tipos['72h'], 'cierre_72h');
  assert.equal(tipos.lejos, undefined);
});

test('una oportunidad descartada o ya presentada no genera alertas de cierre', () => {
  const a = generarAlertas({ oportunidades: [
    { id: '1', titulo: 'X', estado: 'descartada', fechaCierre: enHoras(2) },
    { id: '2', titulo: 'Y', estado: 'presentada', fechaCierre: enHoras(2) },
  ], ahora: AHORA });
  assert.equal(a.filter((x) => x.tipo.startsWith('cierre')).length, 0);
});

test('cierre vencido sin presentar es crítico', () => {
  const a = generarAlertas({ oportunidades: [{ id: '1', titulo: 'X', estado: 'lista_presentar', fechaCierre: enHoras(-5) }], ahora: AHORA });
  assert.equal(a[0].tipo, 'cierre_vencido');
  assert.equal(a[0].nivel, 'critico');
});

test('aprobación pendiente avisa cuántas firmas faltan', () => {
  const a = generarAlertas({
    oportunidades: [{ id: '1', titulo: 'X', estado: 'pendiente_aprobacion' }],
    aprobacionesPorOp: { 1: [{ area: 'comercial' }] }, ahora: AHORA,
  });
  const al = a.find((x) => x.tipo === 'aprobacion_pendiente');
  assert.match(al.detalle, /Faltan 2/);
});

test('documentos obligatorios pendientes: crítico si la oferta ya está "lista"', () => {
  const docs = [{ obligatorio: true, estado: 'pendiente', nombre: 'CV del equipo' }];
  const enPrep = generarAlertas({
    oportunidades: [{ id: '1', titulo: 'X', estado: 'oferta_preparacion' }],
    ofertasPorOp: { 1: [{ estado: 'preparacion', docs }] }, ahora: AHORA,
  });
  assert.equal(enPrep.find((x) => x.tipo === 'doc_faltante').nivel, 'medio');

  const lista = generarAlertas({
    oportunidades: [{ id: '1', titulo: 'X', estado: 'lista_presentar' }],
    ofertasPorOp: { 1: [{ estado: 'lista', docs }] }, ahora: AHORA,
  });
  assert.equal(lista.find((x) => x.tipo === 'doc_faltante').nivel, 'critico');
});

test('cotización que pasa de las 2 horas de preparación avisa', () => {
  const a = generarAlertas({ oportunidades: [{ id: '1', titulo: 'X', estado: 'en_analisis', tiempoInvertidoMin: 150 }], ahora: AHORA });
  const al = a.find((x) => x.tipo === 'tiempo_excedido');
  assert.ok(al);
  assert.match(al.detalle, /2\.5 h/);
});

test('cadena post-adjudicación: OC, recepción, factura, pago y certificado', () => {
  const casos = [
    [{ id: '1', titulo: 'A', estado: 'orden_recibida' }, { 1: { ocAceptada: false } }, 'oc_pendiente'],
    [{ id: '2', titulo: 'B', estado: 'en_ejecucion' }, { 2: { recepcionConformeAt: null } }, 'recepcion_pendiente'],
    [{ id: '3', titulo: 'C', estado: 'recepcion_conforme' }, { 3: { facturaNumero: '' } }, 'factura_pendiente'],
    [{ id: '4', titulo: 'D', estado: 'facturada' }, { 4: { pagoEsperado: enDias(-10), pagoReal: null } }, 'pago_atrasado'],
    [{ id: '5', titulo: 'E', estado: 'pagada' }, { 5: { certificadoEstado: 'no_solicitado' } }, 'certificado_pendiente'],
  ];
  casos.forEach(([op, res, tipo]) => {
    const a = generarAlertas({ oportunidades: [op], resultadosPorOp: res, ahora: AHORA });
    assert.ok(a.some((x) => x.tipo === tipo), `falta la alerta ${tipo}`);
  });
});

test('una OC que no coincide se explica en la alerta', () => {
  const a = generarAlertas({
    oportunidades: [{ id: '1', titulo: 'A', estado: 'orden_recibida' }],
    resultadosPorOp: { 1: { ocAceptada: false, ocCoincide: false } }, ahora: AHORA,
  });
  assert.match(a.find((x) => x.tipo === 'oc_pendiente').detalle, /NO coincide/);
});

test('pago al día no genera alerta de atraso', () => {
  const a = generarAlertas({
    oportunidades: [{ id: '1', titulo: 'A', estado: 'facturada' }],
    resultadosPorOp: { 1: { pagoEsperado: enDias(10), pagoReal: null } }, ahora: AHORA,
  });
  assert.equal(a.some((x) => x.tipo === 'pago_atrasado'), false);
});

test('documentos del proveedor: vencidos y por vencer', () => {
  const a = generarAlertas({ docsProveedor: [
    { id: 'd1', nombre: 'Vigencia', fechaVencimiento: enDias(-3) },
    { id: 'd2', nombre: 'Situación tributaria', fechaVencimiento: enDias(5) },
    { id: 'd3', nombre: 'Póliza', fechaVencimiento: enDias(25) },
    { id: 'd4', nombre: 'Estatuto', fechaVencimiento: enDias(200) },
  ], ahora: AHORA });
  assert.equal(a.find((x) => x.refId === 'd1').nivel, 'critico');
  assert.equal(a.find((x) => x.refId === 'd2').nivel, 'alto');
  assert.equal(a.find((x) => x.refId === 'd3').nivel, 'medio');
  assert.equal(a.some((x) => x.refId === 'd4'), false);
});

test('las alertas salen ordenadas por urgencia y el resumen las cuenta', () => {
  const a = generarAlertas({ oportunidades: [
    { id: '1', titulo: 'A', estado: 'en_analisis', fechaCierre: enHoras(60) },
    { id: '2', titulo: 'B', estado: 'en_analisis', fechaCierre: enHoras(2) },
  ], ahora: AHORA });
  assert.equal(a[0].nivel, 'critico');
  const r = resumenAlertas(a);
  assert.equal(r.total, 2);
  assert.equal(r.critico, 1);
  assert.equal(r.medio, 1);
});

test('sin datos, no hay alertas (y no explota)', () => {
  assert.deepEqual(generarAlertas({}), []);
});

// ═══ DUPLICADOS / IDEMPOTENCIA ═══════════════════════════════════════════════
test('la clave externa normaliza el código y respeta la fuente', () => {
  assert.equal(claveExterna({ fuente: 'compra_agil', codigoExterno: ' 1234-56-le26 ' }), 'compra_agil::1234-56-LE26');
  assert.equal(claveExterna({ fuente: 'manual' }), null);
});

test('sincronizar dos veces el mismo proceso no crea duplicados', () => {
  const existentes = [{ id: 'a', fuente: 'mercado_publico', codigoExterno: '1234-56-LE26', titulo: 'Levantamiento' }];
  const entrantes = [{ fuente: 'mercado_publico', codigoExterno: '1234-56-LE26', titulo: 'Levantamiento' }];
  const r = clasificar(entrantes, existentes);
  assert.equal(r.nuevas.length, 0);
  assert.equal(r.actualizadas.length, 0);
  assert.equal(r.sinCambios.length, 1);
});

test('un cambio oficial (fecha de cierre) genera un patch mínimo', () => {
  const existentes = [{ id: 'a', fuente: 'mercado_publico', codigoExterno: 'X-1-LE26', titulo: 'T', fechaCierre: '2026-08-01T12:00:00Z' }];
  const r = clasificar([{ fuente: 'mercado_publico', codigoExterno: 'X-1-LE26', titulo: 'T', fechaCierre: '2026-08-05T12:00:00Z' }], existentes);
  assert.equal(r.actualizadas.length, 1);
  assert.deepEqual(Object.keys(r.actualizadas[0].patch), ['fechaCierre']);
});

test('la fusión NUNCA pisa el trabajo interno del equipo', () => {
  const existente = { id: 'a', titulo: 'Viejo', estado: 'en_analisis', puntaje: 80, responsable: 'u1', notas: 'ojo con la multa', tiempoInvertidoMin: 45 };
  const { patch } = fusionar(existente, { titulo: 'Nuevo', estado: 'detectada', puntaje: 0, responsable: null, notas: '', tiempoInvertidoMin: 0 });
  assert.deepEqual(patch, { titulo: 'Nuevo' });
});

test('un lote con el mismo proceso repetido lo procesa una sola vez', () => {
  const entrantes = [
    { fuente: 'compra_agil', codigoExterno: 'A-1-CO26', titulo: 'X' },
    { fuente: 'compra_agil', codigoExterno: 'A-1-CO26', titulo: 'X' },
  ];
  const r = clasificar(entrantes, []);
  assert.equal(r.nuevas.length, 1);
  assert.equal(r.sinCambios.length, 1);
});

test('los entrantes sin código oficial se ignoran (no se pueden deduplicar)', () => {
  const r = clasificar([{ fuente: 'manual', titulo: 'Sin código' }], []);
  assert.equal(r.ignoradas.length, 1);
  assert.equal(resumenSync(r).errores, 1);
});

test('indexar se queda con la primera aparición de cada clave', () => {
  const idx = indexar([
    { id: 'a', fuente: 'compra_agil', codigoExterno: 'A-1-CO26' },
    { id: 'b', fuente: 'compra_agil', codigoExterno: 'A-1-CO26' },
    { id: 'c' },
  ]);
  assert.equal(idx.size, 1);
  assert.equal(idx.get('compra_agil::A-1-CO26').id, 'a');
});

test('el ID del proceso se extrae del enlace pegado, o devuelve null sin inventar', () => {
  assert.equal(codigoDesdeEnlace('https://www.mercadopublico.cl/Procurement/Modules/RFB/Details.aspx?idlicitacion=1234-56-LE26'), '1234-56-LE26');
  assert.equal(codigoDesdeEnlace('https://www.mercadopublico.cl/algo'), null);
  assert.equal(codigoDesdeEnlace(''), null);
});

// ═══ ANALÍTICA ═══════════════════════════════════════════════════════════════
const OPS = [
  { id: '1', estado: 'descartada', recomendacion: 'no_participar', servicioSlug: 'sitio-web', institucion: 'Muni A', unspsc: ['81112103'], createdAt: '2026-07-01' },
  { id: '2', estado: 'en_analisis', recomendacion: 'participar', servicioSlug: 'dashboard', institucion: 'Muni B', unspsc: ['81111509'], createdAt: '2026-07-10' },
  { id: '3', estado: 'no_adjudicada', recomendacion: 'participar', servicioSlug: 'sitio-web', institucion: 'Muni A', unspsc: ['81112103'], createdAt: '2026-07-15', tiempoInvertidoMin: 120 },
  { id: '4', estado: 'pagada', recomendacion: 'participar', servicioSlug: 'sitio-web', institucion: 'Muni A', unspsc: ['81112103'], createdAt: '2026-07-20', tiempoInvertidoMin: 90 },
  { id: '5', estado: 'certificado_obtenido', recomendacion: 'participar', servicioSlug: 'dashboard', institucion: 'Muni C', unspsc: ['81111509'], createdAt: '2026-07-25', tiempoInvertidoMin: 60 },
];
const RES = [
  { oportunidadId: '3', adjudicada: false, motivoPerdida: 'Precio', precioGanador: 800000 },
  { oportunidadId: '4', adjudicada: true, montoAdjudicado: 1200000, facturaMonto: 1428000, facturaFecha: '2026-07-25', pagoReal: '2026-08-24', utilidadReal: 380000 },
  { oportunidadId: '5', adjudicada: true, montoAdjudicado: 2000000, facturaMonto: 2380000, facturaFecha: '2026-07-01', pagoReal: '2026-07-31', utilidadReal: 700000 },
];

test('una oportunidad CERRADA no desaparece del embudo: se reconstruye desde su resultado', () => {
  // "cerrada" es terminal y borra el rastro del camino. Si el embudo solo mirara
  // el estado, un proceso ganado, cobrado y certificado saldría de todas las
  // etapas anteriores y la tasa de éxito quedaría en cero.
  const ops = [{ id: 'z', estado: 'cerrada', recomendacion: 'participar' }];
  const res = [{ oportunidadId: 'z', adjudicada: true, pagoReal: '2026-08-01', certificadoEstado: 'obtenido', facturaMonto: 1000000 }];

  const sinResultado = calcularEmbudo(ops);
  assert.equal(sinResultado.find((x) => x.id === 'presentadas').valor, 0);

  const conResultado = calcularEmbudo(ops, res);
  assert.equal(conResultado.find((x) => x.id === 'presentadas').valor, 1);
  assert.equal(conResultado.find((x) => x.id === 'adjudicadas').valor, 1);
  assert.equal(conResultado.find((x) => x.id === 'pagadas').valor, 1);
  assert.equal(conResultado.find((x) => x.id === 'certificadas').valor, 1);

  const m = calcularMetricas({ oportunidades: ops, resultados: res });
  assert.equal(m.tasaExito, 100);
  assert.equal(m.certificados, 1);
});

test('cerrada sin resultado registrado (nunca se presentó) no infla el embudo', () => {
  const e = calcularEmbudo([{ id: 'z', estado: 'cerrada' }], []);
  assert.equal(e.find((x) => x.id === 'presentadas').valor, 0);
  assert.equal(e.find((x) => x.id === 'adjudicadas').valor, 0);
});

test('perder el proceso cuenta como presentada, no como adjudicada', () => {
  const e = calcularEmbudo([{ id: 'z', estado: 'cerrada' }], [{ oportunidadId: 'z', adjudicada: false }]);
  assert.equal(e.find((x) => x.id === 'presentadas').valor, 1);
  assert.equal(e.find((x) => x.id === 'adjudicadas').valor, 0);
});

test('el embudo es acumulativo y respeta el orden de las siete etapas', () => {
  const e = calcularEmbudo(OPS, RES);
  assert.deepEqual(e.map((x) => x.id), ['detectadas', 'aptas', 'analizadas', 'presentadas', 'adjudicadas', 'pagadas', 'certificadas']);
  assert.equal(e[0].valor, 5);
  assert.equal(e.find((x) => x.id === 'presentadas').valor, 3);   // 3, 4 y 5
  assert.equal(e.find((x) => x.id === 'adjudicadas').valor, 2);
  assert.equal(e.find((x) => x.id === 'pagadas').valor, 2);
  assert.equal(e.find((x) => x.id === 'certificadas').valor, 1);
});

test('tasa de éxito = adjudicadas sobre presentadas', () => {
  const m = calcularMetricas({ oportunidades: OPS, resultados: RES, cotizaciones: {} });
  assert.equal(m.presentadas, 3);
  assert.equal(m.adjudicadas, 2);
  assert.equal(m.tasaExito, 67);
});

test('sin ofertas presentadas la tasa es null, no 0%', () => {
  const m = calcularMetricas({ oportunidades: [{ id: 'x', estado: 'en_analisis' }], resultados: [] });
  assert.equal(m.tasaExito, null);
  assert.equal(m.ticketPromedio, null);
  assert.equal(m.margenPromedio, null);
});

test('ticket promedio, días de pago y utilidad real', () => {
  const m = calcularMetricas({ oportunidades: OPS, resultados: RES, cotizaciones: {} });
  assert.equal(m.ticketPromedio, 1600000);         // (1.200.000 + 2.000.000) / 2
  assert.equal(m.diasPagoPromedio, 30);
  assert.equal(m.utilidadReal, 1080000);
  assert.equal(m.certificados, 1);
});

test('horas por cotización promedia solo lo presentado', () => {
  const m = calcularMetricas({ oportunidades: OPS, resultados: RES });
  assert.equal(m.horasPorCotizacion, 1.5);         // (2 + 1,5 + 1) / 3
});

test('agrupar por servicio, institución y UNSPSC (el UNSPSC es un arreglo)', () => {
  const s = agrupar(OPS, 'servicioSlug');
  assert.equal(s.find((x) => x.clave === 'sitio-web').total, 3);
  const i = agrupar(OPS, 'institucion');
  assert.equal(i.find((x) => x.clave === 'Muni A').presentadas, 2);
  const u = agrupar(OPS, 'unspsc');
  assert.equal(u.find((x) => x.clave === '81112103').total, 3);
});

test('motivos de descarte: cuenta causales y las descartadas sin causal registrada', () => {
  const m = motivosDescarte(OPS, [{ oportunidadId: '9', esCausal: true, causal: 'margen_insuficiente' }]);
  assert.equal(m.find((x) => x.causal === 'margen_insuficiente').n, 1);
  assert.equal(m.find((x) => x.causal === 'sin_causal_registrada').n, 1);
});

test('motivos de pérdida solo miran lo efectivamente perdido', () => {
  assert.deepEqual(motivosPerdida(RES), [{ motivo: 'Precio', n: 1 }]);
});

test('precio ofertado vs ganador: la brecha se expresa en porcentaje', () => {
  const c = comparativoPrecios(RES, { 3: { precioNeto: 1000000 } });
  assert.equal(c.length, 1);
  assert.equal(c[0].brecha, 200000);
  assert.equal(c[0].brechaPct, 25);
});
