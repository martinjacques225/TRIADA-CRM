// tests/aic.export.test.js — builders de la carpeta .zip del proyecto (puros).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slug, readmeMd, tareasMd, sessionMd } from '../modules/ai-commander/presentation/project-export.js';

test('slug limpia acentos, espacios y símbolos', () => {
  assert.equal(slug('Café Landing #1'), 'cafe-landing-1');
  assert.equal(slug('   '), 'proyecto');
  assert.equal(slug(''), 'proyecto');
});

test('readmeMd incluye nombre, objetivo y avance', () => {
  const md = readmeMd(
    { nombre: 'Mi Proyecto', objetivo: 'Vender más', estado: 'activo', prioridad: 'alta', stack: ['JS', 'Supabase'] },
    { pct: 50, done: 2, total: 4 },
  );
  assert.ok(md.includes('# Mi Proyecto'));
  assert.ok(md.includes('Vender más'));
  assert.ok(md.includes('50% (2/4'));
  assert.ok(md.includes('JS, Supabase'));
});

test('tareasMd agrupa por columna y marca las hechas', () => {
  const md = tareasMd([
    { titulo: 'A', estado: 'hecho' },
    { titulo: 'B', estado: 'backlog', prioridad: 'alta' },
  ]);
  assert.ok(md.includes('- [x] A'));
  assert.ok(md.includes('- [ ] B'));
  assert.ok(md.includes('_(alta)_'));
});

test('tareasMd sin tareas no rompe', () => {
  assert.ok(tareasMd([]).includes('Sin tareas'));
});

test('sessionMd incluye el prompt y las respuestas pegadas', () => {
  const md = sessionMd(
    { titulo: 'Orquesta · Claude', provider: 'anthropic', contenido: 'PROMPT-XYZ' },
    [{ provider: 'anthropic', estado: 'completado', contenido: 'RESP-ABC' }],
  );
  assert.ok(md.includes('PROMPT-XYZ'));
  assert.ok(md.includes('RESP-ABC'));
  assert.ok(md.includes('completado'));
});
