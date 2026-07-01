// tests/financiero.test.js — Módulo Financiero trIA (M2 "Lector IA")
// Cubre lo que rompe producción si falla: el prompt-director, el parser tolerante
// de la respuesta de la IA, el armado del informe y los guards de enum del mapper.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIN_TIPOS, findTipo, buildFinancePrompt,
  extractJson, normalizeReport, parseFinanceReport,
} from '../modules/financiero/domain/analisis.js';
import { buildFinReportDoc } from '../modules/financiero/presentation/informe-fin.view.js';
import { finFromSupa, finToSupa, toFinTipo, toFinModo, toFinEstado } from '../js/mappers.js';

// ─── Tipos ────────────────────────────────────────────────────
test('FIN_TIPOS: son los 3 (cierre, iva, remuneraciones) con cifras y foco', () => {
  assert.deepEqual(FIN_TIPOS.map((t) => t.id), ['cierre', 'iva', 'remuneraciones']);
  for (const t of FIN_TIPOS) {
    assert.ok(t.label && t.docs && t.foco, `${t.id} completo`);
    assert.ok(Array.isArray(t.cifras) && t.cifras.length, `${t.id} tiene cifras`);
  }
});
test('findTipo: id válido devuelve el tipo; inválido cae al primero (cierre)', () => {
  assert.equal(findTipo('iva').id, 'iva');
  assert.equal(findTipo('no-existe').id, 'cierre');
});

// ─── buildFinancePrompt ───────────────────────────────────────
test('buildFinancePrompt: incluye tipo, período, foco y el contrato JSON', () => {
  const p = buildFinancePrompt({ tipo: 'iva', periodo: 'Junio 2026', modo: 'documentos' });
  assert.match(p, /IVA \/ F29/);
  assert.match(p, /Junio 2026/);
  assert.match(p, /```json/);          // el contrato de salida va en el prompt
  assert.match(p, /débito vs crédito/i);
});
test('buildFinancePrompt (documentos): pide adjuntar los archivos', () => {
  const p = buildFinancePrompt({ tipo: 'cierre', periodo: 'Mayo 2026', modo: 'documentos' });
  assert.match(p, /adjunt/i);
  assert.match(p, /Estado de Resultados/i);
});
test('buildFinancePrompt (cifras): inyecta las cifras tipeadas', () => {
  const p = buildFinancePrompt({ tipo: 'cierre', periodo: 'Mayo 2026', modo: 'cifras',
    cifras: { ingresos: '18000000', costo_ventas: '9000000' } });
  assert.match(p, /18000000/);
  assert.match(p, /Ingresos por ventas/);
  assert.doesNotMatch(p, /adjuntó en este mismo chat/); // no habla de adjuntos en modo cifras
});

// ─── extractJson (tolerancia) ─────────────────────────────────
const SAMPLE = { resumen_ejecutivo: 'Todo ok', indicadores: [{ nombre: 'Margen', valor: '30%' }] };

test('extractJson: JSON pelado', () => {
  const r = extractJson(JSON.stringify(SAMPLE));
  assert.equal(r.ok, true);
  assert.equal(r.data.resumen_ejecutivo, 'Todo ok');
});
test('extractJson: dentro de un fence ```json con texto alrededor', () => {
  const txt = `Claro, aquí está tu análisis:\n\n\`\`\`json\n${JSON.stringify(SAMPLE)}\n\`\`\`\n\nEspero que sirva.`;
  const r = extractJson(txt);
  assert.equal(r.ok, true);
  assert.equal(r.data.indicadores[0].valor, '30%');
});
test('extractJson: del primer { al último } sin fence', () => {
  const r = extractJson(`Respuesta: ${JSON.stringify(SAMPLE)} fin.`);
  assert.equal(r.ok, true);
});
test('extractJson: tolera comas colgantes', () => {
  const r = extractJson('```json\n{ "resumen_ejecutivo": "x", "hallazgos": [1,2,], }\n```');
  assert.equal(r.ok, true);
  assert.equal(r.data.resumen_ejecutivo, 'x');
});
test('extractJson: tolera comillas tipográficas', () => {
  const r = extractJson('{ “resumen_ejecutivo”: “hola” }');
  assert.equal(r.ok, true);
  assert.equal(r.data.resumen_ejecutivo, 'hola');
});
test('extractJson: basura → ok:false (no lanza)', () => {
  assert.equal(extractJson('no hay json aquí').ok, false);
  assert.equal(extractJson('').ok, false);
  assert.equal(extractJson('{roto').ok, false);
});

// ─── normalizeReport (defensa de shape) ───────────────────────
test('normalizeReport: recorta enums inválidos a defaults y asegura arrays', () => {
  const r = normalizeReport({
    salud: { nivel: 'PESIMO', puntaje: 250 },
    indicadores: 'no-es-array',
    hallazgos: [{ titulo: 'H1', severidad: 'catastrofica' }],
    recomendaciones: [{ accion: 'Hacer X', prioridad: 'urgente' }],
  });
  assert.equal(r.salud.nivel, 'estable');       // 'PESIMO' no válido → default
  assert.equal(r.salud.puntaje, 100);           // clamp 0..100
  assert.deepEqual(r.indicadores, []);          // no-array → []
  assert.equal(r.hallazgos[0].severidad, 'media'); // 'catastrofica' → default
  assert.equal(r.recomendaciones[0].prioridad, 'media');
});
test('normalizeReport: acentos en enum de señal se normalizan', () => {
  const r = normalizeReport({ resumen_ejecutivo: 'x', indicadores: [{ nombre: 'M', valor: '1', señal: 'Negativo' }] });
  assert.equal(r.indicadores[0].señal, 'negativo');
});
test('normalizeReport: filtra items totalmente vacíos', () => {
  const r = normalizeReport({ resumen_ejecutivo: 'x', hallazgos: [{ titulo: '', detalle: '' }, { titulo: 'Real' }] });
  assert.equal(r.hallazgos.length, 1);
  assert.equal(r.hallazgos[0].titulo, 'Real');
});

// ─── parseFinanceReport (end to end) ──────────────────────────
test('parseFinanceReport: fence válido → ok + report normalizado', () => {
  const r = parseFinanceReport('```json\n' + JSON.stringify({
    titulo: 'Cierre Junio', resumen_ejecutivo: 'Buen mes',
    salud: { nivel: 'optimo', puntaje: 82, titular: 'Sólido' },
    indicadores: [{ nombre: 'Margen', valor: '31%', señal: 'positivo' }],
  }) + '\n```');
  assert.equal(r.ok, true);
  assert.equal(r.report.salud.nivel, 'optimo');
  assert.equal(r.report.indicadores[0].nombre, 'Margen');
});
test('parseFinanceReport: JSON válido pero vacío de contenido → ok:false', () => {
  const r = parseFinanceReport('{"moneda":"CLP"}');
  assert.equal(r.ok, false);
});

// ─── buildFinReportDoc (armado del informe, puro) ─────────────
test('buildFinReportDoc: contiene título, indicador y hallazgo; escapa HTML', () => {
  const report = normalizeReport({
    titulo: 'Cierre <Junio>', resumen_ejecutivo: 'Resumen',
    salud: { nivel: 'estable', puntaje: 60, titular: 'ok' },
    indicadores: [{ nombre: 'Margen', valor: '30%', señal: 'positivo' }],
    hallazgos: [{ titulo: 'Costo alto', detalle: 'x', severidad: 'alta' }],
  });
  const html = buildFinReportDoc(report, { tipoLabel: 'Cierre de mes', periodo: 'Junio 2026' });
  assert.match(html, /Margen/);
  assert.match(html, /Costo alto/);
  assert.match(html, /Cierre &lt;Junio&gt;/);   // escapado, no inyectado
  assert.doesNotMatch(html, /<Junio>/);
  // piel unificada con el Informe 360 (mismas clases canónicas de informe.css)
  assert.match(html, /report-page cover-page/);
  assert.match(html, /class="rh-title"/);
  assert.match(html, /class="report-footer"/);
  assert.match(html, /chart-ring/);   // gauge reutilizado del 360
});
test('buildFinReportDoc: el total de páginas del footer refleja las páginas presentes', () => {
  // Sin hallazgos/recos: solo portada + resumen → footer "2 / 2".
  const min = normalizeReport({ resumen_ejecutivo: 'Solo resumen', indicadores: [{ nombre: 'A', valor: '1' }] });
  const html = buildFinReportDoc(min, { tipoLabel: 'IVA', periodo: 'X' });
  assert.match(html, /2 \/ 2/);
  assert.doesNotMatch(html, /\/ 4/);
});

// ─── Mapper: guards de enum (footgun 22P02) + round-trip ──────
test('toFin* : valores válidos pasan; inválidos caen al default', () => {
  assert.equal(toFinTipo('remuneraciones'), 'remuneraciones');
  assert.equal(toFinTipo('otro'), 'cierre');
  assert.equal(toFinModo('cifras'), 'cifras');
  assert.equal(toFinModo('x'), 'documentos');
  assert.equal(toFinEstado('analizado'), 'analizado');
  assert.equal(toFinEstado('x'), 'borrador');
});
test('finToSupa: mapea a snake_case, blinda enum y omite undefined', () => {
  const row = finToSupa({ tipo: 'zzz', periodo: 'Junio 2026', modoEntrada: 'cifras',
    clienteId: 'c1', reporte: { a: 1 } });
  assert.equal(row.tipo, 'cierre');            // enum blindado
  assert.equal(row.periodo, 'Junio 2026');
  assert.equal(row.modo_entrada, 'cifras');
  assert.equal(row.cliente_id, 'c1');
  assert.deepEqual(row.respuesta_json, { a: 1 });
  assert.ok(!('titulo' in row));               // undefined omitido (update parcial)
});
test('finFromSupa: mapea a camelCase con defaults sanos', () => {
  const a = finFromSupa({ id: 'x', codigo: 'FIN-000001', tipo: 'iva', periodo: 'Junio 2026',
    modo_entrada: 'documentos', documentos: [{ path: 'p', nombre: 'f29.pdf' }],
    respuesta_json: { resumen_ejecutivo: 'ok' }, estado: 'analizado', created_at: 't' });
  assert.equal(a.correlativo, 'FIN-000001');
  assert.equal(a.tipo, 'iva');
  assert.equal(a.documentos[0].nombre, 'f29.pdf');
  assert.equal(a.reporte.resumen_ejecutivo, 'ok');
  assert.equal(a.estado, 'analizado');
});
test('finFromSupa: fila nula → null', () => {
  assert.equal(finFromSupa(null), null);
});
