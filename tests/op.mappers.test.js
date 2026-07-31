// tests/op.mappers.test.js — Mappers de Oportunidades Públicas (ida y vuelta).
//
// Lo que se prueba acá es la costura entre Postgres y el dominio: un campo mal
// mapeado no rompe nada visible, solo guarda mal la plata. Por eso el round-trip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  opFromSupa, opToSupa, opCostoFromSupa, opCostoToSupa, opItemFromSupa, opItemToSupa,
  opPuntajeFromSupa, opPuntajeToSupa, opResultadoFromSupa, opResultadoToSupa,
  opConfigFromSupa, opConfigToSupa, opPlantillaFromSupa, opPlantillaToSupa,
  opReqFromSupa, opReqToSupa, opRiesgoFromSupa, opRiesgoToSupa,
} from '../js/mappers.js';

test('oportunidad: round-trip de los campos que importan', () => {
  const row = {
    id: 'op1', fuente: 'compra_agil', codigo_externo: '1234-56-LE26',
    titulo: 'Levantamiento de procesos', institucion: 'Municipalidad de Talca',
    tipo_procedimiento: 'compra_agil', descripcion: 'Levantar procesos',
    fecha_publicacion: '2026-08-01', fecha_cierre: '2026-08-10T15:00:00Z',
    region: 'Maule', modalidad: 'mixta', presupuesto_monto: 1400000,
    presupuesto_iva: 'neto', unspsc: ['80101504'], enlace: 'https://x',
    estado: 'en_analisis', puntaje: 83, recomendacion: 'participar',
    servicio_slug: 'levantamiento-procesos', responsable: 'u1',
    tiempo_invertido_min: 45, notas: 'ojo con la multa',
  };
  const dom = opFromSupa(row);
  assert.equal(dom.codigoExterno, '1234-56-LE26');
  assert.equal(dom.presupuestoMonto, 1400000);
  assert.equal(dom.tiempoInvertidoMin, 45);

  const back = opToSupa(dom);
  assert.equal(back.codigo_externo, row.codigo_externo);
  assert.equal(back.presupuesto_monto, row.presupuesto_monto);
  assert.equal(back.estado, row.estado);
  assert.deepEqual(back.unspsc, row.unspsc);
});

test('oportunidad: fila nula devuelve null y no explota', () => {
  assert.equal(opFromSupa(null), null);
  assert.equal(opCostoFromSupa(null), null);
  assert.equal(opResultadoFromSupa(undefined), null);
});

test('oportunidad: los vacíos van como null explícito, no como cadena vacía', () => {
  const p = opToSupa({ codigoExterno: '', presupuestoMonto: '', responsable: '', fechaCierre: '', modalidad: '' });
  assert.equal(p.codigo_externo, null);
  assert.equal(p.presupuesto_monto, null);
  assert.equal(p.responsable, null);
  assert.equal(p.fecha_cierre, null);
  assert.equal(p.modalidad, null);
});

test('oportunidad: un update parcial NO manda las columnas que no se tocaron', () => {
  const p = opToSupa({ estado: 'descartada', motivoDescarte: 'Margen bajo' });
  assert.deepEqual(Object.keys(p).sort(), ['estado', 'motivo_descarte']);
});

test('oportunidad: el título se limpia de espacios', () => {
  assert.equal(opToSupa({ titulo: '  Diagnóstico 360  ' }).titulo, 'Diagnóstico 360');
});

test('oportunidad: presupuesto no publicado queda null, no cero', () => {
  const dom = opFromSupa({ id: 'x', presupuesto_monto: null, puntaje: null });
  assert.equal(dom.presupuestoMonto, null);
  assert.equal(dom.puntaje, null);
});

test('costos: porcentajes y montos sobreviven la ida y vuelta', () => {
  const row = {
    id: 'c1', oportunidad_id: 'op1', margen_objetivo: 0.35, contingencia_pct: 0.12,
    costos_admin_pct: 0.05, presupuesto_comprador: 1400000, iva_tasa: 0.19,
    dias_pago_estimados: 45, precio_ofertado: 1200000,
  };
  const dom = opCostoFromSupa(row);
  assert.equal(dom.margenObjetivo, 0.35);
  assert.equal(dom.diasPagoEstimados, 45);
  const back = opCostoToSupa(dom);
  assert.equal(back.margen_objetivo, 0.35);
  assert.equal(back.precio_ofertado, 1200000);
});

test('ítem de costo: horas y valor por hora vuelven como números', () => {
  const dom = opItemFromSupa({ id: 'i1', costo_id: 'c1', tipo: 'hora', horas: '12.5', valor_hora: '16000', dias_antes_pago: '10' });
  assert.equal(dom.horas, 12.5);
  assert.equal(dom.valorHora, 16000);
  assert.equal(dom.diasAntesPago, 10);
  assert.equal(opItemToSupa(dom).valor_hora, 16000);
});

test('puntaje: manual y motivo viajan juntos', () => {
  const dom = opPuntajeFromSupa({ id: 'p1', oportunidad_id: 'op1', criterio: 'margen', puntos: 8, puntos_max: 20, sugerido: 16, manual: true, motivo_manual: 'El comprador aceptó ampliar plazo' });
  assert.equal(dom.manual, true);
  assert.equal(dom.sugerido, 16);
  const back = opPuntajeToSupa(dom);
  assert.equal(back.motivo_manual, 'El comprador aceptó ampliar plazo');
});

test('resultado: los tres estados de "adjudicada" (sí / no / sin dato) se distinguen', () => {
  assert.equal(opResultadoFromSupa({ id: 'r', adjudicada: true }).adjudicada, true);
  assert.equal(opResultadoFromSupa({ id: 'r', adjudicada: false }).adjudicada, false);
  assert.equal(opResultadoFromSupa({ id: 'r', adjudicada: null }).adjudicada, null);
  assert.equal(opResultadoToSupa({ adjudicada: false }).adjudicada, false);
});

test('resultado: fechas vacías van como null (Postgres rechaza la cadena vacía en date)', () => {
  const p = opResultadoToSupa({ oportunidadId: 'op1', fechaResultado: '', ocFecha: '', pagoReal: '', facturaMonto: '' });
  assert.equal(p.fecha_resultado, null);
  assert.equal(p.oc_fecha, null);
  assert.equal(p.pago_real, null);
  assert.equal(p.factura_monto, null);
});

test('resultado: certificado por defecto es "no solicitado"', () => {
  assert.equal(opResultadoFromSupa({ id: 'r' }).certificadoEstado, 'no_solicitado');
});

test('config: los defaults protegen contra una fila incompleta', () => {
  const c = opConfigFromSupa({ org_id: 'o1' });
  assert.equal(c.puntajeParticipar, 70);
  assert.equal(c.puntajeRevisar, 55);
  assert.equal(c.margenObjetivo, 0.30);
  assert.equal(c.margenDescarte, 0.25);
  assert.equal(c.ivaTasa, 0.19);
  assert.equal(c.topeAprobacionNeto, 2500000);
  assert.deepEqual(c.unspsc, []);
});

test('config: los arreglos jsonb vuelven como arreglos aunque lleguen nulos', () => {
  const c = opConfigFromSupa({ org_id: 'o1', unspsc: null, regiones: null, servicios: null });
  assert.deepEqual([c.unspsc, c.regiones, c.servicios], [[], [], []]);
  assert.deepEqual(opConfigToSupa({ unspsc: ['80101504'] }).unspsc, ['80101504']);
});

test('plantilla: jsonb de horas por rol viaja completo', () => {
  const row = { id: 't1', slug: 'sitio-web', nombre: 'Sitio web', horas_por_rol: [{ rol: 'TI', horas: 60, valorHora: 20000 }], entregables: ['Sitio publicado'], es_demo: true, activo: true };
  const dom = opPlantillaFromSupa(row);
  assert.equal(dom.horasPorRol[0].horas, 60);
  assert.equal(dom.esDemo, true);
  const back = opPlantillaToSupa(dom);
  assert.deepEqual(back.horas_por_rol, row.horas_por_rol);
  assert.equal(back.es_demo, true);
});

test('plantilla: activo por defecto es true (una fila sin el campo no desaparece)', () => {
  assert.equal(opPlantillaFromSupa({ id: 't', slug: 's', nombre: 'N' }).activo, true);
  assert.equal(opPlantillaFromSupa({ id: 't', slug: 's', nombre: 'N', activo: false }).activo, false);
});

test('requisito: cumple por defecto es "no evaluado", nunca "sí"', () => {
  const dom = opReqFromSupa({ id: 'r1', oportunidad_id: 'op1', texto: 'Boleta de garantía' });
  assert.equal(dom.cumple, 'no_evaluado');
  assert.equal(dom.obligatorio, false);
  assert.equal(dom.origen, 'manual');
});

test('requisito: la confianza de la IA viaja como número entre 0 y 1', () => {
  const dom = opReqFromSupa({ id: 'r1', texto: 'x', origen: 'ia', confianza: '0.82' });
  assert.equal(dom.confianza, 0.82);
  assert.equal(opReqToSupa(dom).origen, 'ia');
});

test('riesgo: esCausal viaja como booleano y la causal vacía va como null', () => {
  const dom = opRiesgoFromSupa({ id: 'g1', oportunidad_id: 'op1', descripcion: 'Multa alta', es_causal: true, causal: 'multas_desproporcionadas', nivel: 'critico' });
  assert.equal(dom.esCausal, true);
  assert.equal(opRiesgoToSupa({ causal: '', descripcion: 'x' }).causal, null);
});
