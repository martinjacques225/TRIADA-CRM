import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCLP, formatDate, propEstadoLabel,
  toMeetingTipo, meetingType, memberColor, areaIcon,
} from '../js/utils.js';

// ─── formatCLP ───────────────────────────────────────────────
test('formatCLP: vacío/no-numérico cae a guion', () => {
  assert.equal(formatCLP(null), '—');
  assert.equal(formatCLP(undefined), '—');
  assert.equal(formatCLP(''), '—');
});

test('formatCLP: 0 es un monto válido (no cae a guion)', () => {
  assert.equal(formatCLP(0), '$0');
});

test('formatCLP: formatea con prefijo $ y los dígitos del monto', () => {
  const out = formatCLP(1500000);
  assert.ok(out.startsWith('$'));
  // tolerante al separador de miles según ICU/locale
  assert.equal(out.replace(/[^0-9]/g, ''), '1500000');
});

// ─── formatDate ──────────────────────────────────────────────
test('formatDate: sin fecha → guion', () => {
  assert.equal(formatDate(null), '—');
  assert.equal(formatDate(''), '—');
});

test('formatDate: ISO válido → string no vacío', () => {
  const out = formatDate('2026-06-17');
  assert.equal(typeof out, 'string');
  assert.ok(out.length > 0 && out !== '—');
});

// ─── propEstadoLabel (enum prop_estado → label) ──────────────
test('propEstadoLabel: mapea cada slug del enum a su label', () => {
  assert.equal(propEstadoLabel('borrador'), 'Borrador');
  assert.equal(propEstadoLabel('enviada'), 'Enviada');
  assert.equal(propEstadoLabel('negociando'), 'Negociando');
  assert.equal(propEstadoLabel('aceptada'), 'Aceptada');
  assert.equal(propEstadoLabel('rechazada'), 'Rechazada');
});

test('propEstadoLabel: desconocido cae al valor o a guion', () => {
  assert.equal(propEstadoLabel('xyz'), 'xyz');
  assert.equal(propEstadoLabel(null), '—');
});

// ─── toMeetingTipo (slug + labels legacy) ────────────────────
test('toMeetingTipo: un slug válido se mantiene', () => {
  assert.equal(toMeetingTipo('diagnostico'), 'diagnostico');
  assert.equal(toMeetingTipo('seguimiento'), 'seguimiento');
});

test('toMeetingTipo: mapea labels legacy a slug', () => {
  assert.equal(toMeetingTipo('Diagnóstico 360'), 'diagnostico');
  assert.equal(toMeetingTipo('Presentación de propuesta'), 'propuesta');
  assert.equal(toMeetingTipo('Primer contacto'), 'seguimiento');
});

test('toMeetingTipo: desconocido pasa tal cual', () => {
  assert.equal(toMeetingTipo('zzz'), 'zzz');
});

// ─── meetingType (objeto del tipo) ───────────────────────────
test('meetingType: slug conocido devuelve su definición', () => {
  assert.equal(meetingType('emergencia').label, 'Emergencia');
  assert.equal(meetingType('Diagnóstico 360').label, 'Diagnóstico 360'); // vía legacy
});

test('meetingType: desconocido devuelve fallback con label legible', () => {
  const t = meetingType('zzz');
  assert.equal(t.id, 'zzz');
  assert.equal(typeof t.label, 'string');
  assert.ok(t.label.length > 0);
});

// ─── memberColor (color estable por índice, cicla) ───────────
test('memberColor: es estable y cicla sobre la paleta', () => {
  assert.equal(memberColor(0), memberColor(0));
  assert.equal(memberColor(0), memberColor(8)); // 8 colores → vuelve a empezar
  assert.ok(/^#[0-9A-Fa-f]{6}$/.test(memberColor(3)));
});

// ─── areaIcon (sin window → cae al emoji) ────────────────────
test('areaIcon: en node (sin window.icon) cae al emoji del área', () => {
  assert.equal(areaIcon('tec'), '🖥️');
  assert.equal(areaIcon('Ventas'), '📈'); // también acepta el label
  assert.equal(areaIcon('inexistente'), '');
});
