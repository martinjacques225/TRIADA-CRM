// tests/aic.orchestration.test.js — Mesa de Orquesta (dominio puro).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFanout, buildSynthesis, buildPrompt, findType,
  PROJECT_TYPES, ORQ_PROVIDERS, DIRECTOR,
} from '../modules/ai-commander/domain/orchestration.js';

test('buildFanout genera un prompt por proveedor y contiene el objetivo', () => {
  const brief = { objetivo: 'Hacer una landing para un restaurante', tipo: 'landing', contexto: '' };
  const out = buildFanout(brief);
  assert.equal(out.length, ORQ_PROVIDERS.length);
  for (const f of out) {
    assert.ok(f.providerId && f.label && f.url && f.prompt, 'campos completos');
    assert.ok(f.prompt.includes('Hacer una landing para un restaurante'), 'incluye el objetivo');
  }
  // cada proveedor recibe SU tarea específica (no la misma para todos)
  const anthropic = out.find(f => f.providerId === 'anthropic').prompt;
  const openai = out.find(f => f.providerId === 'openai').prompt;
  assert.notEqual(anthropic, openai);
  assert.ok(anthropic.includes('Arquitectura'), 'Claude arma arquitectura');
});

test('buildSynthesis incluye las 3 respuestas, el objetivo y el contexto', () => {
  const brief = { objetivo: 'Objetivo X', tipo: 'app', contexto: 'marca sobria' };
  const responses = { openai: 'RESP-CHATGPT', anthropic: 'RESP-CLAUDE', google: 'RESP-GEMINI' };
  const s = buildSynthesis(brief, responses);
  assert.ok(s.includes('RESP-CHATGPT') && s.includes('RESP-CLAUDE') && s.includes('RESP-GEMINI'));
  assert.ok(s.includes('Objetivo X'));
  assert.ok(s.includes('marca sobria'));
  assert.ok(s.includes('PRÓXIMOS PASOS'), 'pide próximos pasos');
});

test('el director es Claude (anthropic)', () => {
  assert.equal(DIRECTOR.id, 'anthropic');
});

test('tipo desconocido cae a genérico y no rompe', () => {
  assert.equal(findType('no-existe').id, 'generico');
  const out = buildFanout({ objetivo: 'algo', tipo: 'no-existe' });
  assert.equal(out.length, 3);
});

test('sin objetivo no explota (usa placeholder)', () => {
  const p = buildPrompt(ORQ_PROVIDERS[0], { tipo: 'landing' });
  assert.ok(typeof p === 'string' && p.length > 0);
});

test('todos los tipos tienen tarea para los 3 proveedores', () => {
  for (const t of PROJECT_TYPES) {
    for (const p of ORQ_PROVIDERS) {
      assert.ok(t.asks[p.id] && t.asks[p.id].length > 10, `${t.id} tiene tarea para ${p.id}`);
    }
  }
});
