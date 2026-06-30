import test from 'node:test';
import assert from 'node:assert/strict';
import { packOverlaps } from '../js/utils.js';

// Helper: construye items {start, end} a partir de pares de horas.
const it = (start, end) => ({ start, end });

test('sin solapes: cada evento queda en una sola columna', () => {
  const out = packOverlaps([it(9, 10), it(11, 12), it(13, 14)]);
  assert.deepEqual(out.map(x => x.cols), [1, 1, 1]);
  assert.deepEqual(out.map(x => x.col), [0, 0, 0]);
});

test('dos citas a la misma hora: lado a lado (2 columnas)', () => {
  const out = packOverlaps([it(10, 11), it(10, 11)]);
  assert.deepEqual(out.map(x => x.cols), [2, 2]);
  assert.deepEqual(out.map(x => x.col).sort(), [0, 1]);
});

test('tres reuniones solapadas: 3 columnas', () => {
  const out = packOverlaps([it(10, 11), it(10.25, 11), it(10.5, 11)]);
  assert.deepEqual(out.map(x => x.cols), [3, 3, 3]);
  assert.deepEqual(out.map(x => x.col), [0, 1, 2]);
});

test('una columna se reutiliza cuando el evento ya terminó', () => {
  // A 10–11 y B 10.5–11.5 se solapan (2 cols); C 11.15–12 NO solapa A → reutiliza col 0.
  const out = packOverlaps([it(10, 11), it(10.5, 11.5), it(11.15, 12)]);
  const c = out.find(x => x.start === 11.15);
  assert.equal(c.col, 0);
  assert.deepEqual(out.map(x => x.cols), [2, 2, 2]); // mismo grupo de solape
});

test('grupos de solape independientes no se mezclan', () => {
  // Grupo 1: 9–10 + 9.5–10.5 (2 cols). Grupo 2 (aparte): 12–13 (1 col).
  const out = packOverlaps([it(9, 10), it(9.5, 10.5), it(12, 13)]);
  const g2 = out.find(x => x.start === 12);
  assert.equal(g2.cols, 1);
  assert.equal(g2.col, 0);
});

test('ordena por hora de inicio (entrada desordenada)', () => {
  const out = packOverlaps([it(14, 15), it(9, 10), it(11, 12)]);
  assert.deepEqual(out.map(x => x.start), [9, 11, 14]);
});

test('no muta los objetos originales fuera de anotar col/cols', () => {
  const a = it(10, 11);
  packOverlaps([a]);
  assert.equal(a.start, 10);
  assert.equal(a.end, 11);
});
