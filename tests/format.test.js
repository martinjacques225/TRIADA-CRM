// tests/format.test.js — Estandarización de datos de entrada (js/format.js).
// Regla del CRM: el dato se guarda canónico venga como venga.
//   texto → MAYÚSCULAS · RUT → 12.345.678-9 · teléfono → +56912345678
// El dígito verificador AVISA pero no bloquea (eso vive en la UI; acá se prueba
// que formatRut nunca pierde lo escrito, aunque el DV esté malo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanRut, formatRut, validateRut,
  formatPhoneCL, validatePhoneCL,
  normalizeText, normalizeEmail, validateEmail, parseCLP,
} from '../js/format.js';
import { leadToSupa, clienteToSupa } from '../js/mappers.js';

// ─── RUT: formato ──────────────────────────────────────────────
test('formatRut deja 12.345.678-9 venga como venga', () => {
  const esperado = '12.345.678-5';
  for (const entrada of [
    '123456785', '12345678-5', '12.345.678-5', '12345678 5',
    '12,345,678-5', ' 12.345.6785 ', '12-345-678-5',
  ]) assert.equal(formatRut(entrada), esperado, `entrada: ${entrada}`);
});

test('formatRut normaliza la K minúscula y RUT cortos', () => {
  assert.equal(formatRut('76543210k'), '76.543.210-K');
  assert.equal(formatRut('1234567-4'), '1.234.567-4');
  assert.equal(formatRut('12345-6'),   '12.345-6');
});

test('formatRut es idempotente (lo exige el formateo en vivo del input)', () => {
  const uno = formatRut('123456785');
  assert.equal(formatRut(uno), uno);
  assert.equal(formatRut(formatRut(formatRut('76543210k'))), '76.543.210-K');
});

test('formatRut no pierde el dato aunque el DV esté malo', () => {
  // Clave: el vendedor escribe un RUT con typo → igual se guarda, ordenado.
  assert.equal(formatRut('12.345.678-9'), '12.345.678-9');
  assert.equal(validateRut('12.345.678-9'), false);
});

test('formatRut con vacío o basura no inventa nada', () => {
  assert.equal(formatRut(''), '');
  assert.equal(formatRut(null), '');
  assert.equal(formatRut(undefined), '');
  assert.equal(formatRut('---'), '');
});

// ─── RUT: dígito verificador (módulo 11) ───────────────────────
test('validateRut acepta RUT reales', () => {
  for (const r of ['12.345.678-5', '11.111.111-1', '9.876.543-3', '5.126.663-3', '76.123.456-0'])
    assert.equal(validateRut(r), true, `debería ser válido: ${r}`);
});

test('validateRut rechaza DV que no calza', () => {
  for (const r of ['12.345.678-9', '76.123.456-7', '18.765.432-1', '76.543.210-K'])
    assert.equal(validateRut(r), false, `debería ser inválido: ${r}`);
});

test('validateRut no depende del formato de entrada', () => {
  assert.equal(validateRut('123456785'), true);
  assert.equal(validateRut('12345678-5'), true);
  assert.equal(validateRut('12.345.678-5'), true);
});

test('validateRut con K: mayúscula y minúscula valen igual', () => {
  // 20.347.878-K es un RUT con DV = K (módulo 11 → resto 1).
  const conK = '20347878K';
  assert.equal(validateRut(conK), validateRut(conK.toLowerCase()));
  assert.equal(cleanRut('20.347.878-k'), '20347878K');
});

// ─── Teléfono ──────────────────────────────────────────────────
test('formatPhoneCL deja +56912345678 venga como venga', () => {
  const esperado = '+56912345678';
  for (const entrada of [
    '912345678', '9 1234 5678', '+56 9 1234 5678', '56912345678',
    '+56912345678', '09 1234 5678', '(56) 9-1234-5678', '9.1234.5678',
  ]) assert.equal(formatPhoneCL(entrada), esperado, `entrada: ${entrada}`);
});

test('formatPhoneCL es idempotente (el input reingiere su propio +56 al tipear)', () => {
  let v = '';
  for (const tecla of '912345678') v = formatPhoneCL(v + tecla);   // simula tipeo
  assert.equal(v, '+56912345678');
  assert.equal(formatPhoneCL(formatPhoneCL(v)), '+56912345678');
});

// Regresión (2026-07-30): con el guardia `d.length > 2`, unos dígitos que eran
// EXACTAMENTE '56' no se limpiaban → se tomaban por número y se les anteponía el
// prefijo otra vez ('+56' → '+5656'). Borrando de a un carácter el campo quedaba
// atascado oscilando entre '+565' y '+5656', sin poder vaciarse nunca.
test('formatPhoneCL: el prefijo solo NO es un número (+56 → vacío)', () => {
  assert.equal(formatPhoneCL('+56'), '');
  assert.equal(formatPhoneCL('56'), '');
  assert.equal(formatPhoneCL('+5656'), '');   // el prefijo repetido tampoco
  assert.equal(formatPhoneCL('0056'), '');
});

test('formatPhoneCL: borrar de a un carácter llega a vacío y no se atasca', () => {
  let v = '+56912345678';
  const vistos = new Set();
  for (let i = 0; i < 20 && v !== ''; i++) {
    assert.ok(!vistos.has(v), `se atascó repitiendo ${v}`);
    vistos.add(v);
    const siguiente = formatPhoneCL(v.slice(0, -1));       // lo que deja el backspace
    assert.ok(siguiente.length < v.length, `borrar alargó el valor: ${v} → ${siguiente}`);
    v = siguiente;
  }
  assert.equal(v, '', 'el campo debe poder quedar vacío');
});

test('formatPhoneCL corta en 9 dígitos y no inventa con vacío', () => {
  assert.equal(formatPhoneCL('9123456789999'), '+56912345678');
  assert.equal(formatPhoneCL(''), '');
  assert.equal(formatPhoneCL(null), '');
  assert.equal(formatPhoneCL('sin teléfono'), '');
});

test('formatPhoneCL sirve para wa.me y tel: (solo dígitos tras el +)', () => {
  const tel = formatPhoneCL('9 1234 5678');
  assert.match(tel, /^\+56\d{9}$/);
  assert.equal(tel.replace(/\D/g, ''), '56912345678');   // lo que consume wa.me
});

test('validatePhoneCL reconoce el móvil bien formado', () => {
  assert.equal(validatePhoneCL('9 1234 5678'), true);
  assert.equal(validatePhoneCL('71 234 567'), false);    // fijo, no móvil
  assert.equal(validatePhoneCL(''), false);
});

// ─── Texto y email ─────────────────────────────────────────────
test('normalizeText pasa a MAYÚSCULAS y limpia espacios', () => {
  assert.equal(normalizeText('juan  pérez '), 'JUAN PÉREZ');
  assert.equal(normalizeText('  panadería   san andrés'), 'PANADERÍA SAN ANDRÉS');
  assert.equal(normalizeText('Av. San Miguel 1234'), 'AV. SAN MIGUEL 1234');
  assert.equal(normalizeText(''), '');
  assert.equal(normalizeText(null), '');
});

test('normalizeEmail va en minúsculas (no en mayúsculas como el resto)', () => {
  assert.equal(normalizeEmail('  Maria@Empresa.CL '), 'maria@empresa.cl');
  assert.equal(validateEmail('maria@empresa.cl'), true);
  assert.equal(validateEmail('maria@'), false);
});

test('parseCLP lee montos con puntos y símbolo', () => {
  assert.equal(parseCLP('$1.200.000'), 1200000);
  assert.equal(parseCLP(''), 0);
});

// ─── Última línea de defensa: el mapper que escribe en Supabase ─
test('leadToSupa normaliza aunque la UI no haya formateado', () => {
  const row = leadToSupa({
    nombre: 'juan  pérez', empresa: 'comercial sur', rut: '123456785',
    email: '  Juan@Sur.CL ', telefono: '9 1234 5678',
    direccion: 'av. san miguel 1234', comuna: 'molina', notas: 'llamar  el lunes',
    rubro: 'Comercio / retail', estado: 'Nuevo', tamano: '1-9',
  });
  assert.equal(row.nombre,    'JUAN PÉREZ');
  assert.equal(row.empresa,   'COMERCIAL SUR');
  assert.equal(row.rut,       '12.345.678-5');
  assert.equal(row.email,     'juan@sur.cl');
  assert.equal(row.telefono,  '+56912345678');
  assert.equal(row.direccion, 'AV. SAN MIGUEL 1234');
  assert.equal(row.comuna,    'MOLINA');
  assert.equal(row.notas,     'LLAMAR EL LUNES');
});

test('leadToSupa NO toca los catálogos (romperían pipeline y filtros)', () => {
  const row = leadToSupa({ nombre: 'x', rubro: 'Comercio / retail', tamano: '10-49', estado: 'Negociando', dolorPrincipal: 'Ventas bajas' });
  assert.equal(row.giro,            'Comercio / retail');
  assert.equal(row.tamano,          '10-49');
  assert.equal(row.estado,          'Negociando');
  assert.equal(row.dolor_principal, 'Ventas bajas');
});

test('leadToSupa respeta undefined (no manda la columna) y null (borra el dato)', () => {
  const row = leadToSupa({ nombre: 'juan', direccion: null });
  assert.equal('comuna' in row, false, 'undefined no debe viajar a Supabase');
  assert.equal(row.direccion, null, 'null debe llegar como null para borrar');
});

test('clienteToSupa normaliza razón social, RUT, giro y dirección', () => {
  const row = clienteToSupa({ razonSocial: 'panadería  san andrés', rut: '76123456-0', giro: 'comercio', direccion: 'calle 123' });
  assert.equal(row.razon_social, 'PANADERÍA SAN ANDRÉS');
  assert.equal(row.rut,          '76.123.456-0');
  assert.equal(row.giro,         'COMERCIO');
  assert.equal(row.direccion,    'CALLE 123');
});
