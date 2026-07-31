// tests/op.flujo.test.js — Estados, causales de descarte, aprobaciones y permisos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ESTADOS, TRANSICIONES, siguientesEstados, puedeTransicionar, validarTransicion,
  requiereMotivo, esTerminal, estaViva, estadoLabel,
} from '../modules/oportunidades/domain/estados.js';
import {
  CAUSALES, detectarCausales, hayCausalCritica, resumenDescarte, validarReapertura, causalLabel,
} from '../modules/oportunidades/domain/descarte.js';
import {
  AREAS, aprobacionesRequeridas, estadoAprobacion, puedeAprobar,
} from '../modules/oportunidades/domain/aprobaciones.js';
import { capacidades, puedeAprobarArea } from '../modules/oportunidades/domain/permisos.js';

// ═══ ESTADOS ═════════════════════════════════════════════════════════════════
test('están los 23 estados del flujo y todos tienen entrada en el mapa de transiciones', () => {
  assert.equal(ESTADOS.length, 23);
  ESTADOS.forEach((e) => assert.ok(TRANSICIONES[e.v], `falta transición para ${e.v}`));
});

test('todo destino declarado existe como estado (no hay estados fantasma)', () => {
  const validos = new Set(ESTADOS.map((e) => e.v));
  Object.entries(TRANSICIONES).forEach(([desde, destinos]) => {
    destinos.forEach((d) => assert.ok(validos.has(d), `${desde} → ${d} no existe`));
  });
});

test('el camino feliz completo es transitable de punta a punta', () => {
  const camino = ['detectada', 'pendiente_revision', 'en_analisis', 'recomendada', 'pendiente_aprobacion',
    'aprobada', 'oferta_preparacion', 'lista_presentar', 'presentada', 'adjudicada', 'orden_recibida',
    'en_ejecucion', 'recepcion_conforme', 'facturada', 'pagada', 'certificado_solicitado',
    'certificado_obtenido', 'cerrada'];
  for (let k = 0; k < camino.length - 1; k++) {
    assert.ok(puedeTransicionar(camino[k], camino[k + 1]), `no se puede ${camino[k]} → ${camino[k + 1]}`);
  }
});

test('no se puede saltar del principio al final', () => {
  assert.equal(puedeTransicionar('detectada', 'pagada'), false);
  const v = validarTransicion('detectada', 'adjudicada');
  assert.equal(v.ok, false);
  assert.match(v.error, /No se puede pasar/);
});

test('descartar exige motivo; reabrir también', () => {
  assert.equal(requiereMotivo('en_analisis', 'descartada'), true);
  assert.equal(requiereMotivo('descartada', 'pendiente_revision'), true);
  assert.equal(requiereMotivo('presentada', 'no_adjudicada'), true);
  assert.equal(requiereMotivo('aprobada', 'oferta_preparacion'), false);

  assert.equal(validarTransicion('en_analisis', 'descartada', { motivo: '' }).ok, false);
  assert.equal(validarTransicion('en_analisis', 'descartada', { motivo: 'Margen bajo' }).ok, true);
});

test('mover al mismo estado no es una transición válida', () => {
  const v = validarTransicion('en_analisis', 'en_analisis');
  assert.equal(v.ok, false);
  assert.match(v.error, /ya está/);
});

test('un estado desconocido se rechaza con mensaje claro', () => {
  const v = validarTransicion('en_analisis', 'inventado');
  assert.equal(v.ok, false);
  assert.match(v.error, /desconocido/);
});

test('cerrada es terminal; descartada y no adjudicada dejan de estar vivas', () => {
  assert.equal(esTerminal('cerrada'), true);
  assert.equal(esTerminal('en_analisis'), false);
  assert.equal(estaViva('descartada'), false);
  assert.equal(estaViva('no_adjudicada'), false);
  assert.equal(estaViva('en_ejecucion'), true);
  assert.equal(estadoLabel('lista_presentar'), 'Lista para presentar');
});

test('siguientesEstados devuelve una copia (no se puede mutar el mapa desde afuera)', () => {
  const s = siguientesEstados('detectada');
  s.push('pagada');
  assert.equal(siguientesEstados('detectada').includes('pagada'), false);
});

// ═══ CAUSALES DE DESCARTE ════════════════════════════════════════════════════
test('las once causales del encargo están declaradas', () => {
  assert.equal(CAUSALES.length, 11);
  ['requisito_faltante', 'experiencia_institucional', 'plazo_imposible', 'margen_insuficiente',
   'multas_desproporcionadas', 'soporte_no_garantizable', 'alcance_ambiguo', 'dependencia_tercero',
   'requiere_abogado', 'auditoria_habilitacion', 'choque_proyectos']
    .forEach((slug) => assert.ok(CAUSALES.some((c) => c.slug === slug), `falta ${slug}`));
});

test('sin datos problemáticos no hay causales', () => {
  const c = detectarCausales({ requisitos: [{ obligatorio: true, cumple: 'si', texto: 'RUT vigente' }], margenReal: 0.35 });
  assert.deepEqual(c, []);
  assert.equal(hayCausalCritica(c), false);
});

test('requisito obligatorio no cumplido dispara la causal, con el texto como evidencia', () => {
  const c = detectarCausales({ requisitos: [{ obligatorio: true, cumple: 'no', tipo: 'administrativo', texto: 'Boleta de garantía por 5% del contrato' }] });
  assert.equal(c.length, 1);
  assert.equal(c[0].causal, 'requisito_faltante');
  assert.equal(c[0].origen, 'sistema');
  assert.match(c[0].motivo, /Boleta de garantía/);
});

test('experiencia institucional faltante se separa del resto de requisitos', () => {
  const c = detectarCausales({ requisitos: [
    { obligatorio: true, cumple: 'no', tipo: 'experiencia_institucional', texto: '3 contratos previos con el Estado' },
    { obligatorio: true, cumple: 'no', tipo: 'administrativo', texto: 'Certificado X' },
  ] });
  assert.equal(c.length, 2);
  assert.ok(c.some((x) => x.causal === 'experiencia_institucional'));
  assert.ok(c.some((x) => x.causal === 'requisito_faltante'));
});

test('un requisito NO obligatorio sin cumplir no descarta', () => {
  const c = detectarCausales({ requisitos: [{ obligatorio: false, cumple: 'no', tipo: 'tecnico', texto: 'Deseable ISO 27001' }] });
  assert.deepEqual(c, []);
});

test('margen bajo el piso es causal automática con el número a la vista', () => {
  const c = detectarCausales({ margenReal: 0.18, margenDescarte: 0.25 });
  assert.equal(c[0].causal, 'margen_insuficiente');
  assert.match(c[0].motivo, /18%/);
});

test('margen justo en el piso NO descarta (25% es aceptable, bajo 25% no)', () => {
  assert.deepEqual(detectarCausales({ margenReal: 0.25, margenDescarte: 0.25 }), []);
});

test('proceso cerrado y horas que no alcanzan disparan plazo imposible', () => {
  assert.equal(detectarCausales({ diasHastaCierre: -1 })[0].causal, 'plazo_imposible');
  const c = detectarCausales({ horasEstimadas: 40, horasDisponiblesAntesCierre: 8 });
  assert.equal(c[0].causal, 'plazo_imposible');
  assert.match(c[0].motivo, /40 h/);
});

test('las causales declaradas por una persona se incorporan sin duplicar', () => {
  const c = detectarCausales({
    margenReal: 0.10,
    riesgosDeclarados: [
      { causal: 'margen_insuficiente', descripcion: 'duplicada' },
      { causal: 'multas_desproporcionadas', descripcion: '10 UF por día sin tope' },
    ],
  });
  assert.equal(c.filter((x) => x.causal === 'margen_insuficiente').length, 1);
  const multa = c.find((x) => x.causal === 'multas_desproporcionadas');
  assert.equal(multa.origen, 'manual');
  assert.match(multa.motivo, /10 UF/);
});

test('el resumen del descarte junta todas las causales en una línea registrable', () => {
  const c = detectarCausales({ margenReal: 0.1, diasHastaCierre: -1 });
  const r = resumenDescarte(c);
  assert.match(r, /Margen/);
  assert.match(r, /·/);
  assert.equal(resumenDescarte([]), '');
});

test('reabrir sin justificación de verdad se rechaza', () => {
  assert.equal(validarReapertura('').ok, false);
  assert.equal(validarReapertura('ok').ok, false);
  assert.equal(validarReapertura('El comprador aclaró el alcance por foro').ok, true);
});

test('causalLabel devuelve el texto legible', () => {
  assert.equal(causalLabel('plazo_imposible'), 'Plazo imposible de cumplir');
  assert.equal(causalLabel('inexistente'), 'inexistente');
});

// ═══ APROBACIONES ════════════════════════════════════════════════════════════
test('las tres áreas tienen checklist propio', () => {
  assert.deepEqual(AREAS.map((a) => a.id), ['comercial', 'tecnica', 'financiera']);
  AREAS.forEach((a) => assert.ok(a.checklist.length >= 4));
});

test('siempre se piden las tres firmas', () => {
  const r = aprobacionesRequeridas({ margenReal: 0.4, precioNeto: 500000 });
  assert.deepEqual(r.areas, ['comercial', 'tecnica', 'financiera']);
  assert.equal(r.reforzada, false);
  assert.deepEqual(r.motivos, []);
});

test('margen bajo, monto alto, subcontrato y riesgo alto se listan como motivos', () => {
  const r = aprobacionesRequeridas({ margenReal: 0.22, precioNeto: 3000000, tieneSubcontrato: true, riesgoAlto: true });
  assert.equal(r.reforzada, true);
  assert.equal(r.motivos.length, 4);
});

test('estadoAprobacion: cuenta firmas, faltantes y rechazos', () => {
  const st = estadoAprobacion([{ area: 'comercial', decision: 'aprueba' }]);
  assert.equal(st.firmadas, 1);
  assert.deepEqual(st.faltantes, ['tecnica', 'financiera']);
  assert.equal(st.completa, false);
  assert.match(st.resumen, /Faltan 2/);
});

test('un rechazo bloquea aunque las otras dos hayan firmado', () => {
  const st = estadoAprobacion([
    { area: 'comercial', decision: 'aprueba' },
    { area: 'tecnica', decision: 'rechaza' },
    { area: 'financiera', decision: 'aprueba' },
  ]);
  assert.equal(st.bloqueada, true);
  assert.equal(st.completa, false);
  assert.equal(puedeAprobar([
    { area: 'comercial', decision: 'aprueba' },
    { area: 'tecnica', decision: 'rechaza' },
    { area: 'financiera', decision: 'aprueba' },
  ]).ok, false);
});

test('las tres firmas (con reparos incluidos) habilitan el paso a "aprobada"', () => {
  const firmas = [
    { area: 'comercial', decision: 'aprueba' },
    { area: 'tecnica', decision: 'aprueba_con_reparos' },
    { area: 'financiera', decision: 'aprueba' },
  ];
  const st = estadoAprobacion(firmas);
  assert.equal(st.completa, true);
  assert.deepEqual(st.reparos, ['tecnica']);
  assert.equal(puedeAprobar(firmas).ok, true);
});

// ═══ PERMISOS ════════════════════════════════════════════════════════════════
test('admin puede todo, incluidas las tres firmas', () => {
  const c = capacidades({ role: 'admin' });
  assert.equal(c.perfil, 'Administrador');
  assert.equal(c.configurar, true);
  assert.deepEqual(c.aprobar, { comercial: true, tecnica: true, financiera: true });
});

test('cada área firma solo lo suyo', () => {
  const comercial = capacidades({ role: 'consultor', area: 'Ventas' });
  assert.equal(comercial.perfil, 'Comercial');
  assert.equal(comercial.aprobar.comercial, true);
  assert.equal(comercial.aprobar.tecnica, false);

  const tecnico = capacidades({ role: 'consultor', area: 'Tecnología' });
  assert.equal(tecnico.aprobar.tecnica, true);
  assert.equal(tecnico.aprobar.financiera, false);

  const finanzas = capacidades({ role: 'consultor', area: 'Finanzas' });
  assert.equal(finanzas.aprobar.financiera, true);
  assert.equal(finanzas.aprobar.comercial, false);
});

test('el área también se reconoce en el slug que guarda la base', () => {
  assert.equal(capacidades({ role: 'consultor', area: 'tecnologia' }).aprobar.tecnica, true);
});

test('erp_role sirve de puente: gerencia firma comercial, finanzas firma financiera', () => {
  assert.equal(capacidades({ role: 'consultor', erp_role: 'gerencia' }).aprobar.comercial, true);
  assert.equal(capacidades({ role: 'consultor', erpRole: 'finanzas' }).aprobar.financiera, true);
  assert.equal(capacidades({ role: 'consultor', erp_role: 'operaciones' }).aprobar.tecnica, true);
});

test('solo lectura: no edita, no configura y no firma nada', () => {
  const c = capacidades({ role: 'lector', area: 'Ventas' });
  assert.equal(c.esLector, true);
  assert.equal(c.editar, false);
  assert.equal(c.verFinanzas, false);
  assert.deepEqual(c.aprobar, { comercial: false, tecnica: false, financiera: false });
  assert.equal(c.perfil, 'Solo lectura');
});

test('un perfil sin área ni erp_role queda de solo lectura efectiva', () => {
  const c = capacidades({ role: 'consultor' });
  assert.equal(c.perfil, 'Solo lectura');
  assert.equal(c.editar, true);          // puede cargar oportunidades…
  assert.equal(c.aprobar.comercial, false); // …pero no firma
});

test('perfil nulo no rompe', () => {
  const c = capacidades(null);
  assert.equal(c.editar, true);
  assert.equal(c.configurar, false);
  assert.equal(puedeAprobarArea(null, 'comercial'), false);
});
