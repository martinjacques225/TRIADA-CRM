// tests/op.puntaje.test.js — Marcador de 100 puntos y veredicto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CRITERIOS, PUNTAJE_MAX, calcularTotal, recomendacion, sugerirPuntajes, preguntasPendientes,
} from '../modules/oportunidades/domain/puntaje.js';
import { servicioPorSlug } from '../modules/oportunidades/domain/catalogo.js';

test('los seis criterios suman exactamente 100 y respetan el reparto acordado', () => {
  assert.equal(PUNTAJE_MAX, 100);
  assert.deepEqual(CRITERIOS.map((c) => [c.id, c.max]), [
    ['coincidencia', 25], ['acreditacion', 20], ['margen', 20],
    ['capacidad', 15], ['riesgo', 10], ['estrategico', 10],
  ]);
});

test('total: suma los criterios evaluados y marca los que faltan', () => {
  const r = calcularTotal([
    { criterio: 'coincidencia', puntos: 25 },
    { criterio: 'acreditacion', puntos: 18 },
  ]);
  assert.equal(r.total, 43);
  assert.equal(r.evaluados, 2);
  assert.deepEqual(r.faltantes, ['margen', 'capacidad', 'riesgo', 'estrategico']);
  assert.equal(r.completo, false);
});

test('total: un criterio no puede pasar su máximo (ni bajar de cero)', () => {
  const r = calcularTotal([
    { criterio: 'riesgo', puntos: 99 },
    { criterio: 'margen', puntos: -5 },
  ]);
  assert.equal(r.porCriterio.riesgo.puntos, 10);
  assert.equal(r.porCriterio.margen.puntos, 0);
  assert.equal(r.total, 10);
});

test('total: confirmadoCompleto exige una persona detrás de cada criterio', () => {
  const filas = CRITERIOS.map((c) => ({ criterio: c.id, puntos: 1, confirmadoPor: 'u1' }));
  assert.equal(calcularTotal(filas).confirmadoCompleto, true);
  filas[0].confirmadoPor = null;
  assert.equal(calcularTotal(filas).confirmadoCompleto, false);
});

// OJO: el documento de decisión "Proyecto Mercado Público" (pág. 12) muestra este
// mismo ejemplo con el titular "83 / 100", pero sus seis parciales suman 93. El
// sistema hace la suma real; el titular del PDF es el que está equivocado.
test('el ejemplo del documento de decisión suma 93 y se participa', () => {
  const r = calcularTotal([
    { criterio: 'coincidencia', puntos: 25 }, { criterio: 'acreditacion', puntos: 18 },
    { criterio: 'margen', puntos: 20 }, { criterio: 'capacidad', puntos: 10 },
    { criterio: 'riesgo', puntos: 10 }, { criterio: 'estrategico', puntos: 10 },
  ]);
  assert.equal(r.total, 93);
  assert.equal(recomendacion(r.total).valor, 'participar');
});

test('umbrales: 70 participa · 55-69 revisa · bajo 55 no', () => {
  assert.equal(recomendacion(70).valor, 'participar');
  assert.equal(recomendacion(69).valor, 'revisar');
  assert.equal(recomendacion(55).valor, 'revisar');
  assert.equal(recomendacion(54).valor, 'no_participar');
});

test('una causal crítica manda sobre el puntaje, aunque saque 95', () => {
  const r = recomendacion(95, { hayCausalCritica: true });
  assert.equal(r.valor, 'no_participar');
  assert.match(r.motivo, /causal crítica/i);
});

test('umbrales configurables por organización', () => {
  assert.equal(recomendacion(65, { umbralParticipar: 60, umbralRevisar: 40 }).valor, 'participar');
});

// ── Sugerencias ──────────────────────────────────────────────────────────────
test('sugerencia: sin datos devuelve null, nunca un cero disfrazado', () => {
  const s = sugerirPuntajes({});
  assert.equal(s.length, 6);
  assert.ok(s.every((x) => x.sugerido === null));
  assert.equal(preguntasPendientes(s).length, 6);
});

test('coincidencia: servicio ejecutable hoy da los 25 puntos', () => {
  const s = sugerirPuntajes({ servicioSlug: 'sitio-web', servicio: servicioPorSlug('sitio-web') });
  const c = s.find((x) => x.criterio === 'coincidencia');
  assert.equal(c.sugerido, 25);
});

test('coincidencia: servicio que exige aliado externo no puede sacar puntaje alto', () => {
  const s = sugerirPuntajes({ servicioSlug: 'brechas-21719', servicio: servicioPorSlug('brechas-21719') });
  const c = s.find((x) => x.criterio === 'coincidencia');
  assert.equal(c.sugerido, 10);
  assert.match(c.justificacion, /aliado/i);
});

test('coincidencia: sin servicio pero con UNSPSC vigilado, puntaje parcial', () => {
  const s = sugerirPuntajes({ unspscOportunidad: ['81112103'], unspscVigilados: ['81112103', '80101504'] });
  assert.equal(s.find((x) => x.criterio === 'coincidencia').sugerido, 15);
});

test('coincidencia: códigos que no calzan con el catálogo dan cero', () => {
  const s = sugerirPuntajes({ unspscOportunidad: ['99999999'], unspscVigilados: ['81112103'] });
  assert.equal(s.find((x) => x.criterio === 'coincidencia').sugerido, 0);
});

test('acreditación: con requisitos sin evaluar no se sugiere nada', () => {
  const s = sugerirPuntajes({ requisitos: [{ tipo: 'experiencia_individual', cumple: 'no_evaluado' }] });
  const a = s.find((x) => x.criterio === 'acreditacion');
  assert.equal(a.sugerido, null);
  assert.match(a.justificacion, /sin evaluar/i);
});

test('acreditación: cumple/parcial/no dan crédito graduado', () => {
  const s = sugerirPuntajes({ requisitos: [
    { tipo: 'titulo_certificado', cumple: 'si' },
    { tipo: 'experiencia_individual', cumple: 'parcial' },
    { tipo: 'experiencia_institucional', cumple: 'no' },
  ] });
  assert.equal(s.find((x) => x.criterio === 'acreditacion').sugerido, 10);  // (1+0,5+0)/3 × 20
});

test('margen: los tramos siguen la regla de la casa', () => {
  const p = (m) => sugerirPuntajes({ margenReal: m }).find((x) => x.criterio === 'margen').sugerido;
  assert.equal(p(0.45), 20);
  assert.equal(p(0.32), 16);
  assert.equal(p(0.27), 8);
  assert.equal(p(0.20), 0);
});

test('capacidad: descuenta por cierre inminente y por sobrecarga', () => {
  const s = sugerirPuntajes({ diasHastaCierre: 0.5, horasEstimadas: 100, horasDisponibles: 50 });
  const c = s.find((x) => x.criterio === 'capacidad');
  assert.ok(c.sugerido < 15);
  assert.match(c.justificacion, /24 horas/);
});

test('capacidad: proceso ya cerrado deja el criterio en cero', () => {
  const s = sugerirPuntajes({ diasHastaCierre: -2 });
  assert.equal(s.find((x) => x.criterio === 'capacidad').sugerido, 0);
});

test('riesgo: cada riesgo alto o crítico descuenta de los 10 puntos', () => {
  const s = sugerirPuntajes({ riesgos: [{ nivel: 'alto' }, { nivel: 'medio' }] });
  assert.equal(s.find((x) => x.criterio === 'riesgo').sugerido, 3);   // 10 − 5 − 2
  const s2 = sugerirPuntajes({ riesgos: [{ nivel: 'critico' }, { nivel: 'alto' }] });
  assert.equal(s2.find((x) => x.criterio === 'riesgo').sugerido, 0);  // nunca negativo
});

test('estratégico: institución nueva y monto relevante suman', () => {
  const s = sugerirPuntajes({ servicio: servicioPorSlug('dashboard'), institucionNueva: true, montoNeto: 3000000 });
  assert.equal(s.find((x) => x.criterio === 'estrategico').sugerido, 10);
});
