// js/pdf.js — Documento corporativo imprimible (cotización / presupuesto)
// Abre una ventana con un layout de marca Tríada y dispara el diálogo de
// impresión (el usuario elige "Guardar como PDF"). Sin dependencias.
import { escHtml, formatDate } from './utils.js';

const TRIADA_MARK = `<svg width="46" height="46" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M26 90 L60 62 L94 90" stroke="#16234A" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M26 73 L60 45 L94 73" stroke="#0C7C88" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M26 56 L60 28 L94 56" stroke="#2E9B73" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// opts: { tipo, titulo, empresa, autor, clienteNombre, clienteRut, correlativo, fecha, vigencia, bodyHtml }
export function openCorporateDoc(opts = {}) {
  const {
    tipo = 'Documento', titulo = '', empresa = 'Tríada Consultoría', autor = '',
    clienteNombre = '', clienteRut = '', correlativo = '', fecha, vigencia, bodyHtml = '',
  } = opts;

  const meta = [
    correlativo   ? ['N°', escHtml(correlativo)] : null,
    ['Fecha', formatDate(fecha || new Date().toISOString())],
    vigencia      ? ['Válido hasta', formatDate(vigencia)] : null,
    clienteNombre ? ['Cliente', escHtml(clienteNombre)] : null,
    clienteRut    ? ['RUT', escHtml(clienteRut)] : null,
  ].filter(Boolean);

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
  <title>${escHtml(tipo)} ${escHtml(correlativo || '')} — ${escHtml(empresa)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #2A3553; margin: 0; font-size: 13px; }
    .page { max-width: 820px; margin: 0 auto; padding: 44px 48px; }
    .doc-head { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #0C7C88; padding-bottom: 18px; }
    .doc-head .brand { display: flex; flex-direction: column; }
    .doc-head .brand-name { font-size: 22px; font-weight: 800; color: #16234A; letter-spacing: .01em; }
    .doc-head .brand-tag { font-size: 10px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; color: #0C7C88; margin-top: 2px; }
    .doc-type { margin-left: auto; text-align: right; }
    .doc-type .t { font-size: 19px; font-weight: 800; color: #0C7C88; text-transform: uppercase; letter-spacing: .04em; }
    .doc-type .e { font-size: 12px; color: #5E6A85; }
    .doc-title { font-size: 16px; font-weight: 700; color: #16234A; margin: 22px 0 4px; }
    .meta { display: flex; flex-wrap: wrap; gap: 8px 26px; margin: 16px 0 24px; padding: 14px 16px; background: #F0F2F6; border-radius: 10px; }
    .meta div { font-size: 12px; }
    .meta .k { color: #94A0B6; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; font-size: 10px; }
    .meta .v { color: #16234A; font-weight: 700; font-size: 13px; }
    table.items { width: 100%; border-collapse: collapse; margin: 8px 0; }
    table.items th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #94A0B6; border-bottom: 2px solid #E5E9F0; padding: 8px 10px; }
    table.items td { padding: 10px; border-bottom: 1px solid #EEF1F6; font-size: 13px; vertical-align: top; }
    table.items td.num { text-align: right; white-space: nowrap; }
    .totals { margin-left: auto; width: 320px; margin-top: 14px; }
    .totals .row { display: flex; justify-content: space-between; padding: 6px 10px; font-size: 13px; }
    .totals .row.grand { border-top: 2px solid #0C7C88; margin-top: 4px; font-weight: 800; font-size: 16px; color: #16234A; }
    .totals .row .lbl { color: #5E6A85; }
    .block { margin: 22px 0; padding: 14px 16px; background: #E2F0F1; border-left: 4px solid #0C7C88; border-radius: 8px; }
    .block h4 { margin: 0 0 6px; font-size: 13px; color: #0A626C; }
    .block p { margin: 0; font-size: 13px; color: #2A3553; white-space: pre-wrap; }
    .notes { font-size: 12.5px; color: #5E6A85; margin-top: 18px; }
    .foot { margin-top: 40px; border-top: 1px solid #E5E9F0; padding-top: 12px; font-size: 11px; color: #94A0B6; display: flex; justify-content: space-between; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { padding: 24px; } }
  </style></head><body>
  <div class="page">
    <div class="doc-head">
      ${TRIADA_MARK}
      <div class="brand"><span class="brand-name">Tríada</span><span class="brand-tag">Consultoría 360</span></div>
      <div class="doc-type"><div class="t">${escHtml(tipo)}</div><div class="e">${escHtml(empresa)}</div></div>
    </div>
    ${titulo ? `<div class="doc-title">${escHtml(titulo)}</div>` : ''}
    <div class="meta">
      ${meta.map(([k, v]) => `<div><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}
    </div>
    ${bodyHtml}
    <div class="foot">
      <span>${escHtml(empresa)}${autor ? ' · ' + escHtml(autor) : ''}</span>
      <span>Documento generado por TRIADA CRM</span>
    </div>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}
