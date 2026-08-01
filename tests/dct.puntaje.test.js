// tests/dct.puntaje.test.js — Motor de puntaje del Diagnóstico Contable y Tributario.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularPuntaje, puntosDe, esDesconocida, progreso, nivelPorPuntaje,
  antecedentesASolicitar, textoFortalezas, textoBrechas, NIVELES,
} from '../modules/diagnostico-contable/domain/puntaje.js';
import {
  PREGUNTAS, preguntaPorId, preguntasDeEtapa, faltantesDeEtapa, aplica, respondida,
} from '../modules/diagnostico-contable/domain/cuestionario.js';

// Empresa "limpia" con balance tributario: no entra a la rama IFRS.
const TRIBUTARIA_OK = {
  N1: ['preventiva'], N2: 'preventiva',
  F1: 'actualizada', F2: 'tributario', F3: 'clp', F3B: 'definida_doc',
  T1: 'general_14a', T2_evolucion: 'estable',
  T3: { seleccion: ['ninguna'], detalle: {} },
  T4: 'no', T6: 'spa', T7: 'naturales', T7A: 'si_doc', T7B: 'si_doc', T7C: 'no', T7D: 'si',
  T8: 'no_existen',
};

test('los umbrales de interpretación cubren 0-100 sin huecos ni solapes', () => {
  const ordenados = [...NIVELES].sort((a, b) => a.min - b.min);
  assert.equal(ordenados[0].min, 0);
  assert.equal(ordenados[ordenados.length - 1].max, 100);
  for (let i = 1; i < ordenados.length; i++) {
    assert.equal(ordenados[i].min, ordenados[i - 1].max + 1,
      `hueco o solape entre ${ordenados[i - 1].id} y ${ordenados[i].id}`);
  }
});

test('la interpretación respeta los cortes 85 / 70 / 50', () => {
  assert.equal(nivelPorPuntaje(100).id, 'favorable');
  assert.equal(nivelPorPuntaje(85).id,  'favorable');
  assert.equal(nivelPorPuntaje(84).id,  'observaciones');
  assert.equal(nivelPorPuntaje(70).id,  'observaciones');
  assert.equal(nivelPorPuntaje(69).id,  'relevante');
  assert.equal(nivelPorPuntaje(50).id,  'relevante');
  assert.equal(nivelPorPuntaje(49).id,  'alto');
  assert.equal(nivelPorPuntaje(0).id,   'alto');
});

test('todas las respuestas saludables dan 100 y nivel favorable', () => {
  const r = calcularPuntaje(TRIBUTARIA_OK);
  assert.equal(r.general, 100);
  assert.equal(r.nivel, 'favorable');
  assert.equal(r.desconocidas.length, 0);
  assert.equal(r.debilidades.length, 0);
});

test('la rama IFRS NO entra al denominador de una empresa con balance tributario', () => {
  const r = calcularPuntaje(TRIBUTARIA_OK);
  const ids = r.detalle.map((d) => d.id);
  ['F4', 'F6', 'F7', 'F8'].forEach((id) => assert.ok(!ids.includes(id), `${id} no debería aplicar`));
});

test('al declararse IFRS, la rama de auditoría entra al cálculo', () => {
  const r = calcularPuntaje({ ...TRIBUTARIA_OK, F2: 'ifrs', F4: 'si', F6: 'si', F7: 'sin_salvedades', F8: 'no_existen' });
  const ids = r.detalle.map((d) => d.id);
  ['F4', 'F6', 'F7', 'F8'].forEach((id) => assert.ok(ids.includes(id), `${id} debería aplicar bajo IFRS`));
  assert.equal(r.general, 100);
});

test('una pregunta sin responder queda fuera del numerador Y del denominador', () => {
  const { F1, ...sinF1 } = TRIBUTARIA_OK;
  const r = calcularPuntaje(sinF1);
  // Sigue en 100 porque lo respondido está perfecto: no se diluye con lo que falta.
  assert.equal(r.general, 100);
  const fila = r.detalle.find((d) => d.id === 'F1');
  assert.equal(fila.respondida, false);
  assert.equal(fila.ponderado, null);
});

test('"No lo sé" vale 0 puntos y además se cuenta aparte', () => {
  const r = calcularPuntaje({ ...TRIBUTARIA_OK, F1: 'no_se' });
  assert.equal(puntosDe(preguntaPorId('F1'), { F1: 'no_se' }), 0);
  assert.ok(r.desconocidas.includes('F1'));
  assert.ok(r.general < 100);
});

test('"no está regularizada" también vale 0, pero NO cuenta como desconocida', () => {
  const conocida = calcularPuntaje({ ...TRIBUTARIA_OK, F1: 'no_regular' });
  const ignorada = calcularPuntaje({ ...TRIBUTARIA_OK, F1: 'no_se' });
  assert.equal(conocida.general, ignorada.general);          // mismo puntaje
  assert.equal(conocida.desconocidas.includes('F1'), false); // distinta lectura
  assert.equal(ignorada.desconocidas.includes('F1'), true);
});

test('el peso 3 pesa el triple que el peso 1 en el resultado', () => {
  const bajaPeso3 = calcularPuntaje({ ...TRIBUTARIA_OK, F1: 'no_regular' });      // peso 3, 3→0
  const bajaPeso1 = calcularPuntaje({ ...TRIBUTARIA_OK, F3B: 'no_se' });          // peso 1, 3→0
  const caida3 = 100 - bajaPeso3.general;
  const caida1 = 100 - bajaPeso1.general;
  assert.ok(caida3 > caida1, 'una falla de peso 3 debe doler más que una de peso 1');
  assert.ok(Math.abs(caida3 / caida1 - 3) < 0.35, `proporción esperada ≈3, obtenida ${caida3 / caida1}`);
});

test('T3: no tener inversiones es condición saludable, no un vacío', () => {
  assert.equal(puntosDe(preguntaPorId('T3'), { T3: { seleccion: ['ninguna'], detalle: {} } }), 3);
});

test('T3: tener inversiones no resta; lo que resta es no controlarlas', () => {
  const controladas = {
    T3: { seleccion: ['acciones', 'inmuebles'], detalle: {
      acciones:  { contabilizado: 'si', declarado: 'si', respaldo: 'si' },
      inmuebles: { contabilizado: 'si', declarado: 'si', respaldo: 'si' },
    } },
  };
  const sinControl = {
    T3: { seleccion: ['acciones'], detalle: {
      acciones: { contabilizado: 'no', declarado: 'no', respaldo: 'no' },
    } },
  };
  assert.equal(puntosDe(preguntaPorId('T3'), controladas), 3);
  assert.equal(puntosDe(preguntaPorId('T3'), sinControl), 0);
});

test('T3: el control parcial da un valor intermedio, no un 0 ni un 3', () => {
  const p = puntosDe(preguntaPorId('T3'), {
    T3: { seleccion: ['cripto'], detalle: { cripto: { contabilizado: 'si', declarado: 'parcial', respaldo: 'no' } } },
  });
  assert.ok(p > 0 && p < 3, `esperaba un intermedio, obtuve ${p}`);
});

test('T3: elementos marcados sin ningún antecedente todavía no califican (null, no 0)', () => {
  assert.equal(puntosDe(preguntaPorId('T3'), { T3: { seleccion: ['cripto'], detalle: {} } }), null);
});

test('T3: un "No lo sé" en un subcampo marca la evaluación como desconocida', () => {
  const r = { T3: { seleccion: ['cripto'], detalle: { cripto: { contabilizado: 'no_se' } } } };
  assert.equal(esDesconocida(preguntaPorId('T3'), r), true);
});

test('la facturación no baja el puntaje: solo la falta de información consolidada', () => {
  const sube  = calcularPuntaje({ ...TRIBUTARIA_OK, T2_evolucion: 'aumento' });
  const baja  = calcularPuntaje({ ...TRIBUTARIA_OK, T2_evolucion: 'disminucion' });
  const sinfo = calcularPuntaje({ ...TRIBUTARIA_OK, T2_evolucion: 'sin_info' });
  assert.equal(sube.general, baja.general, 'facturar menos no es una falla de salud contable');
  assert.ok(sinfo.general < sube.general, 'no tener la información consolidada sí resta');
});

test('el régimen tributario no es bueno ni malo: solo desconocerlo resta', () => {
  const general = calcularPuntaje({ ...TRIBUTARIA_OK, T1: 'general_14a' });
  const propyme = calcularPuntaje({ ...TRIBUTARIA_OK, T1: 'propyme_tra' });
  const presunta = calcularPuntaje({ ...TRIBUTARIA_OK, T1: 'presunta' });
  const noSe = calcularPuntaje({ ...TRIBUTARIA_OK, T1: 'no_se' });
  assert.equal(general.general, propyme.general);
  assert.equal(general.general, presunta.general);
  assert.ok(noSe.general < general.general);
});

test('el artículo 33 bis solo se pregunta si hubo inversiones en activos fijos', () => {
  assert.equal(aplica(preguntaPorId('T5'), { T4: 'no' }), false);
  assert.equal(aplica(preguntaPorId('T5'), { T4: 'si' }), true);
  assert.equal(aplica(preguntaPorId('T4_detalle'), { T4: 'si' }), true);
});

test('subpuntajes: financiero y tributario se calculan por separado', () => {
  const r = calcularPuntaje({ ...TRIBUTARIA_OK, F1: 'no_regular' });
  assert.ok(r.financiero < 100, 'la falla es financiera y debe verse ahí');
  assert.equal(r.tributario, 100, 'lo tributario no se contamina con lo financiero');
});

test('el progreso cuenta todas las preguntas aplicables, no solo las que puntúan', () => {
  const vacio = progreso({});
  assert.equal(vacio.hechas, 0);
  assert.ok(vacio.total > 0);
  const lleno = progreso(TRIBUTARIA_OK);
  assert.ok(lleno.hechas > 0 && lleno.pct > 0);
});

test('sin respuestas no hay puntaje inventado: general es null, no 0', () => {
  const r = calcularPuntaje({});
  assert.equal(r.general, null);
  assert.equal(r.nivel, null);
});

test('las requeridas de cada etapa se detectan y desaparecen al responderlas', () => {
  assert.ok(faltantesDeEtapa('necesidad', {}).includes('N1'));
  assert.equal(faltantesDeEtapa('necesidad', { N1: ['financiera'], N2: 'crecimiento' }).length, 0);
});

test('una selección múltiple vacía no cuenta como respondida', () => {
  assert.equal(respondida(preguntaPorId('N1'), { N1: [] }), false);
  assert.equal(respondida(preguntaPorId('N1'), { N1: ['financiera'] }), true);
});

test('los antecedentes a solicitar salen de lo débil y de lo desconocido', () => {
  const lista = antecedentesASolicitar({ ...TRIBUTARIA_OK, F1: 'no_regular', T8: 'no_se' });
  assert.ok(lista.length >= 2);
  assert.ok(lista.some((x) => /libros contables/i.test(x)));
  assert.ok(lista.some((x) => /relacionados/i.test(x)));
  assert.equal(antecedentesASolicitar(TRIBUTARIA_OK).length, 0, 'una empresa limpia no arrastra pendientes');
});

test('fortalezas y brechas se describen en texto legible', () => {
  assert.ok(textoFortalezas(TRIBUTARIA_OK).length > 0);
  const brechas = textoBrechas({ ...TRIBUTARIA_OK, F1: 'no_regular' });
  assert.ok(brechas.some((x) => /contable/i.test(x)));
});

// ── Integridad del catálogo ─────────────────────────────────────────────────
test('catálogo: los ids de pregunta no se repiten', () => {
  const ids = PREGUNTAS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('catálogo: toda pregunta con peso tiene puntos en todas sus opciones', () => {
  PREGUNTAS.filter((p) => p.peso > 0 && p.tipo === 'unica').forEach((p) => {
    p.opciones.forEach((o) => {
      assert.equal(typeof o.puntos, 'number', `${p.id} · opción "${o.v}" sin puntos`);
      assert.ok(o.puntos >= 0 && o.puntos <= 3, `${p.id} · opción "${o.v}" fuera de la escala 0-3`);
    });
  });
});

// "No lo sé" es obligatorio en toda pregunta que PUNTÚE: sin esa salida, el
// entrevistado inventa una respuesta y el puntaje miente. Las de contexto
// comercial (etapa 2) se cierran con "Otro", y los selectores auxiliares —como
// la moneda en que se declara la facturación— no son preguntas de evaluación.
test('catálogo: toda pregunta que puntúa ofrece la salida "No lo sé"', () => {
  PREGUNTAS
    .filter((p) => p.peso > 0 && !p.oculta && Array.isArray(p.opciones))
    .forEach((p) => {
      assert.ok(p.opciones.some((o) => o.desconocido), `${p.id} no ofrece "No lo sé"`);
    });
});

test('catálogo: las preguntas de rama (F2, F3, T4) también ofrecen "No lo sé"', () => {
  // No puntúan, pero definen el recorrido: desconocerlas cambia el diagnóstico.
  ['F2', 'F3', 'T4', 'T7C'].forEach((id) => {
    assert.ok(preguntaPorId(id).opciones.some((o) => o.desconocido), `${id} no ofrece "No lo sé"`);
  });
});

test('catálogo: las preguntas de necesidad se cierran con "Otro"', () => {
  PREGUNTAS
    .filter((p) => p.etapa === 'necesidad' && !p.oculta && Array.isArray(p.opciones))
    .forEach((p) => {
      assert.ok(p.opciones.some((o) => o.v === 'otro'), `${p.id} no ofrece "Otro"`);
    });
});

test('catálogo: las cinco etapas tienen preguntas donde corresponde', () => {
  assert.ok(preguntasDeEtapa('necesidad', {}).length > 0);
  assert.ok(preguntasDeEtapa('financiera', {}).length > 0);
  assert.ok(preguntasDeEtapa('tributaria', {}).length > 0);
  assert.equal(preguntasDeEtapa('resultado', {}).length, 0, 'la etapa 5 es el resultado, no tiene preguntas');
});
