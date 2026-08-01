// tests/dct.flujo.test.js — Alertas, recomendación comercial y estados
// del Diagnóstico Contable y Tributario.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generarAlertas, resumenAlertas, requiereRevisionEspecializada, CATALOGO_ALERTAS,
} from '../modules/diagnostico-contable/domain/alertas.js';
import {
  precioInicial, baseDePreparacion, recomendacionComercial, REGLAS_PRECIO, ACLARACION_PRECIO, DESCARGO,
} from '../modules/diagnostico-contable/domain/recomendacion.js';
import {
  ESTADOS, validarTransicion, requiereMotivo, estadoLabel, estaViva, estaCompletada,
  accionesDisponibles, transicionesDe,
} from '../modules/diagnostico-contable/domain/estados.js';
import { calcularPuntaje } from '../modules/diagnostico-contable/domain/puntaje.js';

const LIMPIA = {
  F1: 'actualizada', F2: 'tributario', F3: 'clp', F3B: 'definida_doc',
  T1: 'general_14a', T2_evolucion: 'estable',
  T3: { seleccion: ['ninguna'], detalle: {} },
  T4: 'no', T6: 'spa', T7: 'naturales', T7A: 'si_doc', T7B: 'si_doc', T7C: 'no', T7D: 'si',
  T8: 'no_existen',
};

// ── ALERTAS ─────────────────────────────────────────────────────────────────
test('una empresa sin brechas declaradas no dispara alertas', () => {
  assert.deepEqual(generarAlertas(LIMPIA), []);
});

test('IFRS sin auditoría externa es alerta prioritaria (regla de Sebastián)', () => {
  const a = generarAlertas({ ...LIMPIA, F2: 'ifrs', F4: 'no' });
  const alerta = a.find((x) => x.id === 'ifrs_sin_auditoria');
  assert.ok(alerta, 'debe dispararse');
  assert.equal(alerta.nivel, 'critico');
});

test('la alerta de IFRS sin auditoría también aplica a quien usa "ambos"', () => {
  assert.ok(generarAlertas({ ...LIMPIA, F2: 'ambos', F4: 'no' }).some((x) => x.id === 'ifrs_sin_auditoria'));
});

test('la CMF no confirmada avisa, pero NO afirma que el trabajo carezca de validez', () => {
  const a = generarAlertas({ ...LIMPIA, F2: 'ifrs', F4: 'si', F6: 'no' }).find((x) => x.id === 'cmf_no_confirmada');
  assert.ok(a);
  assert.match(a.detalle, /validar/i);
  assert.doesNotMatch(a.detalle, /sin validez|inválid|ilegal/i);
});

test('opinión adversa y abstención son alertas prioritarias distintas', () => {
  assert.equal(generarAlertas({ ...LIMPIA, F2: 'ifrs', F4: 'si', F7: 'adversa' })
    .find((x) => x.id === 'opinion_adversa')?.nivel, 'critico');
  assert.equal(generarAlertas({ ...LIMPIA, F2: 'ifrs', F4: 'si', F7: 'abstencion' })
    .find((x) => x.id === 'abstencion_opinion')?.nivel, 'critico');
});

test('los hallazgos CON plan de corrección no disparan alerta; sin plan, sí', () => {
  assert.equal(generarAlertas({ ...LIMPIA, F2: 'ifrs', F8: 'con_plan' })
    .some((x) => x.id === 'hallazgos_sin_plan'), false);
  assert.equal(generarAlertas({ ...LIMPIA, F2: 'ifrs', F8: 'sin_plan' })
    .some((x) => x.id === 'hallazgos_sin_plan'), true);
});

test('tener inversiones bien controladas no dispara ninguna alerta', () => {
  const a = generarAlertas({ ...LIMPIA, T3: { seleccion: ['acciones'], detalle: {
    acciones: { contabilizado: 'si', declarado: 'si', respaldo: 'si' } } } });
  assert.deepEqual(a, []);
});

test('inversiones sin contabilizar o sin declarar son alerta prioritaria', () => {
  const a = generarAlertas({ ...LIMPIA, T3: { seleccion: ['cripto'], detalle: {
    cripto: { contabilizado: 'no', declarado: 'si', respaldo: 'si' } } } });
  assert.equal(a.find((x) => x.id === 'ingresos_no_contabilizados')?.nivel, 'critico');
});

test('inversiones sin respaldo documental avisan aparte', () => {
  const a = generarAlertas({ ...LIMPIA, T3: { seleccion: ['inmuebles'], detalle: {
    inmuebles: { contabilizado: 'si', declarado: 'si', respaldo: 'no' } } } });
  assert.ok(a.some((x) => x.id === 'inversiones_sin_respaldo'));
  assert.equal(a.some((x) => x.id === 'ingresos_no_contabilizados'), false);
});

test('operaciones con relacionados sin respaldo son alerta prioritaria', () => {
  assert.equal(generarAlertas({ ...LIMPIA, T8: 'sin_respaldo' })
    .find((x) => x.id === 'relacionadas_sin_respaldo')?.nivel, 'critico');
});

test('beneficiarios finales desconocidos disparan la alerta de estructura', () => {
  assert.ok(generarAlertas({ ...LIMPIA, T7B: 'no_se' }).some((x) => x.id === 'estructura_desconocida'));
  assert.ok(generarAlertas({ ...LIMPIA, T7A: 'no' }).some((x) => x.id === 'estructura_desconocida'));
});

test('las alertas prioritarias se listan antes que las advertencias', () => {
  const a = generarAlertas({ ...LIMPIA, F1: 'no_regular', T8: 'parcial' });
  assert.equal(a[0].nivel, 'critico');
  assert.deepEqual(resumenAlertas(a), { total: 2, criticas: 1, altas: 1 });
});

test('una alerta prioritaria manda aunque el puntaje sea favorable', () => {
  // Solo falla F1 (contabilidad no regularizada): el resto está impecable.
  const r = { ...LIMPIA, F1: 'no_regular' };
  const alertas = generarAlertas(r);
  const p = calcularPuntaje(r).general;
  assert.ok(alertas.some((x) => x.id === 'contabilidad_no_regularizada'));
  assert.equal(requiereRevisionEspecializada(p, alertas), true,
    'con alerta prioritaria siempre se deriva, sin importar el número');
});

test('ninguna condición del catálogo revienta con respuestas vacías', () => {
  assert.doesNotThrow(() => generarAlertas({}));
  CATALOGO_ALERTAS.forEach((a) => assert.doesNotThrow(() => a.cuando({}), `${a.id} revienta con {}`));
});

// ── PRECIO Y RECOMENDACIÓN ──────────────────────────────────────────────────
test('balance tributario: diagnóstico desde 10 UF', () => {
  const p = precioInicial({ F2: 'tributario' });
  assert.equal(p.uf, 10);
  assert.match(p.etiqueta, /10 UF/);
});

test('IFRS y "ambos": diagnóstico desde 20 UF', () => {
  assert.equal(precioInicial({ F2: 'ifrs' }).uf, 20);
  assert.equal(precioInicial({ F2: 'ambos' }).uf, 20);
});

test('base desconocida: sin precio, sujeto a revisión de antecedentes', () => {
  assert.equal(precioInicial({ F2: 'no_se' }).uf, null);
  assert.match(precioInicial({ F2: 'no_se' }).etiqueta, /revisión de antecedentes/i);
  assert.equal(precioInicial({}).uf, null, 'sin responder F2 tampoco hay precio inventado');
});

test('baseDePreparacion normaliza todo lo que no sea una de las tres bases', () => {
  assert.equal(baseDePreparacion({ F2: 'ifrs' }), 'ifrs');
  assert.equal(baseDePreparacion({ F2: 'no_se' }), 'desconocida');
  assert.equal(baseDePreparacion({}), 'desconocida');
});

test('las reglas de precio cubren cualquier base sin dejar hueco', () => {
  ['ifrs', 'tributario', 'ambos', 'desconocida', '', null].forEach((b) => {
    assert.ok(REGLAS_PRECIO.some((r) => r.cuando(b)), `sin regla para "${b}"`);
  });
});

test('el precio siempre viaja con la aclaración de qué puede moverlo', () => {
  assert.equal(precioInicial({ F2: 'ifrs' }).aclaracion, ACLARACION_PRECIO);
  assert.match(ACLARACION_PRECIO, /número de sociedades/i);
  assert.match(ACLARACION_PRECIO, /cotizarse según su alcance/i);
});

test('la recomendación nunca afirma certificación ni ausencia de contingencias', () => {
  const rec = recomendacionComercial({ respuestas: LIMPIA, puntaje: 100, alertas: [] });
  assert.match(rec.lectura, /de acuerdo con la información declarada/i);
  assert.doesNotMatch(rec.lectura, /certificad|libre de contingencias|garantiza/i);
  assert.match(DESCARGO, /no constituye una auditoría/i);
});

test('con alertas prioritarias la derivación es prioritaria y con plazo', () => {
  const alertas = generarAlertas({ ...LIMPIA, F1: 'no_regular' });
  const rec = recomendacionComercial({ respuestas: LIMPIA, puntaje: 90, alertas });
  assert.equal(rec.urgencia, 'prioritaria');
  assert.match(rec.servicio, /Sebastián/);
  assert.match(rec.proximaAccion, /5 días/);
});

test('empresa limpia y con 100 puntos: revisión preventiva, no derivación', () => {
  const rec = recomendacionComercial({ respuestas: LIMPIA, puntaje: 100, alertas: [] });
  assert.equal(rec.derivar, false);
  assert.equal(rec.urgencia, 'preventiva');
  assert.match(rec.servicio, /preventiva/i);
});

test('bajo 85 puntos se recomienda la evaluación especializada aunque no haya alertas', () => {
  const rec = recomendacionComercial({ respuestas: LIMPIA, puntaje: 80, alertas: [] });
  assert.equal(rec.derivar, true);
  assert.match(rec.servicio, /Sebastián/);
});

test('los CTA son los que pide la metodología', () => {
  const rec = recomendacionComercial({ respuestas: LIMPIA, puntaje: 60, alertas: [] });
  assert.equal(rec.ctaPrincipal, 'Solicitar evaluación con Sebastián');
  assert.equal(rec.ctaSecundario, 'Generar informe preliminar');
});

// ── ESTADOS ─────────────────────────────────────────────────────────────────
test('los seis estados comerciales son los declarados', () => {
  assert.deepEqual(ESTADOS.map((e) => e.v),
    ['borrador', 'completado', 'presentado', 'reunion_solicitada', 'propuesta_enviada', 'cerrado']);
});

test('desde borrador solo se puede pasar a completado', () => {
  assert.deepEqual(transicionesDe('borrador'), ['completado']);
  assert.equal(validarTransicion('borrador', 'propuesta_enviada').ok, false);
  assert.equal(validarTransicion('borrador', 'completado').ok, true);
});

test('no se puede transicionar al mismo estado ni a uno inexistente', () => {
  assert.equal(validarTransicion('completado', 'completado').ok, false);
  assert.equal(validarTransicion('completado', 'inventado').ok, false);
});

test('cerrar un caso exige motivo; el resto de las transiciones no', () => {
  assert.equal(requiereMotivo('cerrado'), true);
  assert.equal(requiereMotivo('presentado'), false);
});

test('toda transición declarada apunta a un estado que existe', () => {
  ESTADOS.forEach((e) => transicionesDe(e.v).forEach((destino) => {
    assert.ok(ESTADOS.some((x) => x.v === destino), `${e.v} → ${destino} no existe`);
  }));
});

test('estaViva y estaCompletada distinguen borrador y cierre', () => {
  assert.equal(estaViva('cerrado'), false);
  assert.equal(estaViva('presentado'), true);
  assert.equal(estaCompletada('borrador'), false);
  assert.equal(estaCompletada('completado'), true);
});

test('un borrador se continúa; una completada se abre y genera informe', () => {
  const b = accionesDisponibles({ estado: 'borrador' });
  assert.equal(b.continuar, true);
  assert.equal(b.abrir, false);
  assert.equal(b.informe, false);

  const c = accionesDisponibles({ estado: 'completado' });
  assert.equal(c.abrir, true);
  assert.equal(c.informe, true);
  assert.equal(c.duplicar, true);
});

test('una evaluación archivada ofrece restaurar en vez de archivar', () => {
  const a = accionesDisponibles({ estado: 'cerrado', archivada: true });
  assert.equal(a.archivar, false);
  assert.equal(a.restaurar, true);
});

test('estadoLabel devuelve algo legible incluso ante un valor desconocido', () => {
  assert.equal(estadoLabel('reunion_solicitada'), 'Reunión solicitada');
  assert.equal(estadoLabel(null), '—');
});
