import test from 'node:test';
import assert from 'node:assert/strict';
import { escHtml, html, raw } from '../js/utils.js';

test('escHtml escapa caracteres XSS comunes', () => {
  assert.equal(escHtml('<script>'), '&lt;script&gt;');
  assert.equal(escHtml('"x"'), '&quot;x&quot;');
  assert.equal(escHtml("'x'"), '&#39;x&#39;');
  assert.equal(escHtml('a & b'), 'a &amp; b');
  assert.equal(escHtml(null), '');
});

test('html escapa interpolaciones por defecto', () => {
  const evil = '<img onerror=alert(1)>';
  const out = html`<div>${evil}</div>`;
  assert.ok(out.includes('&lt;img'));
  assert.ok(!out.includes('<img onerror'));
});

test('raw permite HTML confiable dentro de html', () => {
  const svg = '<svg></svg>';
  const out = html`<span>${raw(svg)}</span>`;
  assert.equal(out, '<span><svg></svg></span>');
});

test('html escapa comilla simple (onclick / atributos JS)', () => {
  const payload = "';alert(1);//";
  const out = html`<button data-x="${payload}"></button>`;
  assert.ok(out.includes('&#39;'));
  assert.ok(!out.includes("';alert"));
});
