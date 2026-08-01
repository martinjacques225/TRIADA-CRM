// tests/dct.mappers.test.js — Mappers DB↔UI del Diagnóstico Contable y Tributario.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dctFromSupa, dctToSupa, dctActFromSupa, dctActToSupa,
  diagFromSupa, diagToSupa,
} from '../js/mappers.js';

const ROW = {
  id: 'e1', codigo: 'DCT-000007', lead_id: 'l1', cliente_id: null,
  razon_social: 'INDUSTRIAS DEL SUR SPA', nombre_fantasia: 'INDUSUR', rut: '76.543.210-K',
  actividad_economica: 'Fabricación de envases', industria: 'Manufactura industrial',
  entrevistado_nombre: 'ANA SOTO', entrevistado_cargo: 'GERENTA DE FINANZAS',
  entrevistado_email: 'ana@indusur.cl', entrevistado_fono: '+56912345678',
  ejecutivo: 'u1', fecha: '2026-07-31', trabajadores: 120, sociedades_grupo: 3,
  observaciones_ini: 'Vienen de una fiscalización.',
  respuestas: { F1: 'actualizada', F2: 'ifrs', T3: { seleccion: ['acciones'], detalle: {} } },
  observaciones_ejec: 'Decide el directorio.', etapa_actual: 4,
  puntaje_general: 72, puntaje_financiero: 68, puntaje_tributario: 80,
  nivel_riesgo: 'observaciones', base_preparacion: 'ifrs',
  enfoque: ['tributaria', 'auditoria'],
  alertas: [{ id: 'cmf_no_confirmada', nivel: 'alto', titulo: 'x', detalle: 'y' }],
  desconocidas: 2, precio_inicial_uf: '20.00', precio_regla: 'ifrs',
  estado: 'presentado', archivada: false, oportunidad_lead_id: 'l9', cita_id: 'c3',
  cerrado_motivo: '', creado_por: 'u1',
  created_at: '2026-07-31T12:00:00Z', updated_at: '2026-07-31T13:00:00Z',
};

test('fromSupa mapea la fila completa a la forma de la UI', () => {
  const e = dctFromSupa(ROW);
  assert.equal(e.codigo, 'DCT-000007');
  assert.equal(e.razonSocial, 'INDUSTRIAS DEL SUR SPA');
  assert.equal(e.entrevistadoFono, '+56912345678');
  assert.equal(e.trabajadores, 120);
  assert.equal(e.sociedadesGrupo, 3);
  assert.equal(e.puntajeGeneral, 72);
  assert.equal(e.nivelRiesgo, 'observaciones');
  assert.equal(e.precioInicialUf, 20, 'el numeric de Postgres llega como texto y debe salir numérico');
  assert.deepEqual(e.enfoque, ['tributaria', 'auditoria']);
  assert.equal(e.alertas.length, 1);
  assert.equal(e.archivada, false);
  assert.equal(e.oportunidadLeadId, 'l9');
});

test('fromSupa devuelve null ante una fila vacía (no revienta)', () => {
  assert.equal(dctFromSupa(null), null);
  assert.equal(dctFromSupa(undefined), null);
  assert.equal(dctActFromSupa(null), null);
});

test('fromSupa da valores seguros cuando las columnas vienen nulas', () => {
  const e = dctFromSupa({ id: 'x', razon_social: 'ACME' });
  assert.equal(e.respuestas && typeof e.respuestas, 'object');
  assert.deepEqual(e.enfoque, []);
  assert.deepEqual(e.alertas, []);
  assert.equal(e.estado, 'borrador');
  assert.equal(e.etapaActual, 1);
  assert.equal(e.puntajeGeneral, null, 'sin puntaje es null, nunca 0');
  assert.equal(e.desconocidas, 0);
});

test('round-trip: lo que sale de la base y vuelve a ella conserva el dato', () => {
  const e = dctFromSupa(ROW);
  const row = dctToSupa(e);
  assert.equal(row.razon_social, ROW.razon_social);
  assert.equal(row.rut, ROW.rut);
  assert.equal(row.entrevistado_email, ROW.entrevistado_email);
  assert.equal(row.industria, ROW.industria);
  assert.deepEqual(row.respuestas, ROW.respuestas);
  assert.equal(row.puntaje_general, 72);
  assert.equal(row.nivel_riesgo, 'observaciones');
  assert.equal(row.estado, 'presentado');
  assert.equal(row.lead_id, 'l1');
  assert.equal(row.oportunidad_lead_id, 'l9');
});

test('toSupa omite lo indefinido: un update parcial no pisa el resto de la fila', () => {
  const row = dctToSupa({ estado: 'cerrado', cerradoMotivo: 'El cliente pospuso' });
  assert.deepEqual(Object.keys(row).sort(), ['cerrado_motivo', 'estado']);
  assert.equal('respuestas' in row, false);
  assert.equal('razon_social' in row, false);
});

test('toSupa convierte "" en null para las llaves foráneas (evita el 22P02)', () => {
  const row = dctToSupa({ leadId: '', clienteId: '', ejecutivo: '', citaId: '', oportunidadLeadId: '' });
  assert.equal(row.lead_id, null);
  assert.equal(row.cliente_id, null);
  assert.equal(row.ejecutivo, null);
  assert.equal(row.cita_id, null);
  assert.equal(row.oportunidad_lead_id, null);
});

test('toSupa convierte "" en null en fecha y numéricos', () => {
  const row = dctToSupa({ fecha: '', trabajadores: '', sociedadesGrupo: '', puntajeGeneral: '', precioInicialUf: '' });
  assert.equal(row.fecha, null);
  assert.equal(row.trabajadores, null);
  assert.equal(row.sociedades_grupo, null);
  assert.equal(row.puntaje_general, null);
  assert.equal(row.precio_inicial_uf, null);
});

test('toSupa canoniza el dato igual que el resto del CRM (mayúsculas, RUT, teléfono, email)', () => {
  const row = dctToSupa({
    razonSocial: 'industrias  del  sur spa',
    entrevistadoNombre: 'ana soto',
    rut: '765432107',
    entrevistadoFono: '9 1234 5678',
    entrevistadoEmail: '  Ana@INDUSUR.CL ',
  });
  assert.equal(row.razon_social, 'INDUSTRIAS DEL SUR SPA');
  assert.equal(row.entrevistado_nombre, 'ANA SOTO');
  assert.equal(row.rut, '76.543.210-7');
  assert.equal(row.entrevistado_fono, '+56912345678');
  assert.equal(row.entrevistado_email, 'ana@indusur.cl');
});

test('toSupa guarda el jsonb de respuestas tal cual lo arma el cuestionario', () => {
  const respuestas = { T3: { seleccion: ['cripto'], detalle: { cripto: { contabilizado: 'no' } } }, T4_detalle: [{ tipo: 'Maquinaria', anio: 2024 }] };
  assert.deepEqual(dctToSupa({ respuestas }).respuestas, respuestas);
});

test('actividad: mapea en ambos sentidos y no deja escribir el usuario a mano', () => {
  const a = dctActFromSupa({ id: 'a1', evaluacion_id: 'e1', tipo: 'estado', detalle: 'x', usuario: 'u1', created_at: 'z' });
  assert.equal(a.evaluacionId, 'e1');
  assert.equal(a.tipo, 'estado');
  const row = dctActToSupa({ evaluacionId: 'e1', tipo: 'nota', detalle: 'algo', usuario: 'falsificado' });
  assert.deepEqual(Object.keys(row).sort(), ['detalle', 'evaluacion_id', 'tipo']);
  assert.equal('usuario' in row, false, 'el autor lo pone db.js con la sesión, no el llamador');
});

// ── Independencia respecto del Diagnóstico 360 ──────────────────────────────
test('el Diagnóstico 360 sigue mapeando igual: los dos módulos no se cruzan', () => {
  const row360 = { id: 'd1', codigo: 'DIA-000003', lead_id: 'l1', scores: { direccion: [1, 0.5] }, hallazgos: ['x'], oportunidades: ['y'], estado: 'borrador' };
  const d = diagFromSupa(row360);
  assert.deepEqual(d.scores.direccion, [1, 0.5]);
  assert.equal(d.prospectoId, 'l1');
  // El mapper del 360 no conoce ninguna columna del módulo contable.
  const back = diagToSupa(d);
  ['razon_social', 'respuestas', 'nivel_riesgo', 'precio_inicial_uf'].forEach((k) =>
    assert.equal(k in back, false, `diagToSupa no debe escribir ${k}`));
});

test('el mapper contable no escribe ninguna columna del Diagnóstico 360', () => {
  const row = dctToSupa(dctFromSupa(ROW));
  ['scores', 'hallazgos'].forEach((k) => assert.equal(k in row, false, `dctToSupa no debe escribir ${k}`));
});
