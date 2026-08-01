// modules/diagnostico-contable/presentation/informe.view.js
// INFORME PRELIMINAR — vista limpia para imprimir o guardar como PDF.
//
// Reutiliza openCorporateDoc() de js/pdf.js: el mismo encabezado de marca, el
// mismo logo oficial y el mismo pie que ya usan propuestas y presupuestos. No se
// redibuja la marca ni se inventa una plantilla nueva.
//
// Lo que NO sale en este documento, a propósito:
//   · las observaciones internas del ejecutivo (son notas de Tríada),
//   · cualquier frase que suene a certificación o a dictamen.

import { openCorporateDoc } from '../../../js/pdf.js';
import { escHtml, formatDate } from '../../../js/utils.js';
import { nivelMeta } from '../domain/puntaje.js';
import { estadoLabel } from '../domain/estados.js';
import { preguntaPorId } from '../domain/cuestionario.js';

const COLOR = { favorable: '#2E9B73', observaciones: '#7FA85A', relevante: '#C2871A', alto: '#C04F3F' };

/**
 * Abre el informe en una ventana nueva y dispara el diálogo de impresión.
 * Devuelve false si el navegador bloqueó la ventana emergente.
 */
export function abrirInforme(ctx) {
  const {
    datos = {}, puntaje = {}, alertas = [], recomendacion = {},
    fortalezas = [], brechas = [], antecedentes = [], desconocidas = [],
    ejecutivoNombre = '', empresaTriada = 'Tríada Consultoría',
  } = ctx;

  const nivel = puntaje.nivel ? nivelMeta(puntaje.nivel) : null;
  const color = COLOR[puntaje.nivel] || '#5E6A85';
  const p = recomendacion.precio || {};

  const body = `
    <style>
      .dct-doc-alerta { margin: 8px 0; padding: 10px 13px; border-left: 4px solid #C2871A; background: #F8F0DD; border-radius: 6px; }
      .dct-doc-alerta.crit { border-left-color: #C04F3F; background: #F9E9E6; }
      .dct-doc-alerta .t { font-weight: 700; font-size: 12.5px; color: #16234A; }
      .dct-doc-alerta .d { font-size: 12px; color: #2A3553; margin-top: 3px; }
      .dct-doc-score { display: flex; gap: 14px; margin: 6px 0 18px; }
      .dct-doc-score .c { flex: 1; border: 1px solid #E5E9F0; border-radius: 10px; padding: 14px 16px; }
      .dct-doc-score .c .k { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #94A0B6; font-weight: 700; }
      .dct-doc-score .c .v { font-size: 30px; font-weight: 800; line-height: 1.1; margin-top: 4px; }
      .dct-doc-score .c .n { font-size: 11.5px; color: #5E6A85; margin-top: 2px; }
      .dct-doc-h { font-size: 13px; font-weight: 800; color: #16234A; text-transform: uppercase; letter-spacing: .06em;
                   margin: 24px 0 8px; padding-bottom: 5px; border-bottom: 2px solid #E5E9F0; }
      .dct-doc-ul { margin: 0; padding-left: 18px; }
      .dct-doc-ul li { font-size: 12.5px; color: #2A3553; margin-bottom: 4px; }
      .dct-doc-precio { display: flex; justify-content: space-between; align-items: center; gap: 16px;
                        margin: 10px 0; padding: 16px 18px; background: #E2F0F1; border-radius: 10px; }
      .dct-doc-precio .l { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #0A626C; font-weight: 700; }
      .dct-doc-precio .v { font-size: 22px; font-weight: 800; color: #16234A; }
      .dct-doc-legal { margin-top: 26px; padding: 12px 14px; border: 1px solid #E5E9F0; border-radius: 8px;
                       font-size: 11px; color: #5E6A85; line-height: 1.55; }
      @media print { .dct-doc-score { break-inside: avoid; } .dct-doc-alerta { break-inside: avoid; } }
    </style>

    <div class="dct-doc-score">
      <div class="c"><div class="k">Puntaje general</div>
        <div class="v" style="color:${color}">${puntaje.general ?? '—'}${puntaje.general != null ? '<span style="font-size:15px;color:#94A0B6">/100</span>' : ''}</div>
        <div class="n">${escHtml(nivel ? nivel.label : 'Sin evaluar')}</div></div>
      <div class="c"><div class="k">Evaluación financiera</div>
        <div class="v" style="color:#16234A">${puntaje.financiero ?? '—'}</div>
        <div class="n">Contabilidad, base de preparación y auditoría</div></div>
      <div class="c"><div class="k">Evaluación tributaria</div>
        <div class="v" style="color:#16234A">${puntaje.tributario ?? '—'}</div>
        <div class="n">Régimen, ingresos, activos y estructura</div></div>
    </div>

    <div class="block">
      <h4>Lectura preliminar</h4>
      <p>${escHtml(nivel ? nivel.resumen : 'Faltan respuestas para emitir una lectura preliminar.')}</p>
    </div>

    <div class="dct-doc-h">Alertas prioritarias</div>
    ${alertas.length
      ? alertas.map((a) => `<div class="dct-doc-alerta${a.nivel === 'critico' ? ' crit' : ''}">
          <div class="t">${escHtml(a.titulo)}</div><div class="d">${escHtml(a.detalle)}</div></div>`).join('')
      : '<p class="notes">No se identificaron alertas prioritarias con la información declarada. Esto no equivale a una certificación ni descarta contingencias.</p>'}

    <div class="dct-doc-h">Fortalezas identificadas</div>
    ${fortalezas.length
      ? `<ul class="dct-doc-ul">${fortalezas.map((x) => `<li>${escHtml(x)}</li>`).join('')}</ul>`
      : '<p class="notes">No se registran respuestas en condición saludable.</p>'}

    <div class="dct-doc-h">Brechas detectadas</div>
    ${brechas.length
      ? `<ul class="dct-doc-ul">${brechas.map((x) => `<li>${escHtml(x)}</li>`).join('')}</ul>`
      : '<p class="notes">No se detectaron brechas en las respuestas declaradas.</p>'}

    ${desconocidas.length ? `
      <div class="dct-doc-h">Antecedentes no confirmados en la entrevista</div>
      <ul class="dct-doc-ul">${desconocidas
        .map((id) => preguntaPorId(id)?.bloque || preguntaPorId(id)?.texto || id)
        .map((x) => `<li>${escHtml(x)}</li>`).join('')}</ul>` : ''}

    ${antecedentes.length ? `
      <div class="dct-doc-h">Antecedentes que deben solicitarse</div>
      <ul class="dct-doc-ul">${antecedentes.map((x) => `<li>${escHtml(x)}</li>`).join('')}</ul>` : ''}

    <div class="dct-doc-h">Recomendación</div>
    <p style="font-size:13px;color:#2A3553;margin:0 0 4px"><strong>${escHtml(recomendacion.servicio || '—')}</strong></p>
    <p style="font-size:12.5px;color:#5E6A85;margin:0">Próxima acción: ${escHtml(recomendacion.proximaAccion || '—')}</p>

    <div class="dct-doc-precio">
      <div><div class="l">Precio inicial sugerido</div>
        <div style="font-size:11.5px;color:#5E6A85;margin-top:3px">${escHtml(p.motivo || '')}</div></div>
      <div class="v">${p.uf != null ? `desde ${escHtml(String(p.uf))} UF` : escHtml(p.etiqueta || 'Sujeto a revisión')}</div>
    </div>
    <p class="notes">${escHtml(p.aclaracion || '')}</p>

    <div class="dct-doc-legal">
      <strong>Alcance de este documento.</strong> ${escHtml(recomendacion.descargo || '')}
      Las conclusiones se basan exclusivamente en la información declarada por la empresa
      durante la entrevista y no han sido verificadas contra documentación de respaldo.
      La revisión especializada, la auditoría externa y cualquier regularización posterior
      se cotizan por separado según su alcance.
    </div>`;

  return openCorporateDoc({
    tipo: 'Diagnóstico Contable y Tributario',
    titulo: `Evaluación preliminar — ${datos.razonSocial || 'Empresa'}${datos.industria ? ` · ${datos.industria}` : ''}`,
    empresa: empresaTriada,
    autor: ejecutivoNombre,
    clienteNombre: datos.razonSocial || '',
    clienteRut: datos.rut || '',
    correlativo: datos.codigo || '',
    fecha: datos.fecha || new Date().toISOString(),
    bodyHtml: body,
  });
}

/** Resumen en texto plano, para exportar o pegar en un correo/WhatsApp. */
export function resumenTexto(ctx) {
  const { datos = {}, puntaje = {}, alertas = [], recomendacion = {}, antecedentes = [] } = ctx;
  const nivel = puntaje.nivel ? nivelMeta(puntaje.nivel) : null;
  const p = recomendacion.precio || {};

  return [
    `DIAGNÓSTICO CONTABLE Y TRIBUTARIO — ${datos.razonSocial || 'Empresa'}`,
    datos.codigo ? `Folio: ${datos.codigo}` : '',
    `Fecha: ${formatDate(datos.fecha)}`,
    datos.industria ? `Industria: ${datos.industria}` : '',
    `Estado: ${estadoLabel(datos.estado)}`,
    '',
    `Puntaje general: ${puntaje.general ?? '—'}/100 (${nivel ? nivel.label : 'sin evaluar'})`,
    `Evaluación financiera: ${puntaje.financiero ?? '—'}`,
    `Evaluación tributaria: ${puntaje.tributario ?? '—'}`,
    '',
    nivel ? nivel.resumen : '',
    '',
    alertas.length ? `ALERTAS PRIORITARIAS (${alertas.length}):` : 'Sin alertas prioritarias.',
    ...alertas.map((a) => `- [${a.nivel === 'critico' ? 'PRIORITARIA' : 'ADVERTENCIA'}] ${a.titulo}`),
    '',
    antecedentes.length ? 'ANTECEDENTES A SOLICITAR:' : '',
    ...antecedentes.map((x) => `- ${x}`),
    '',
    `RECOMENDACIÓN: ${recomendacion.servicio || '—'}`,
    `Precio inicial sugerido: ${p.uf != null ? `desde ${p.uf} UF` : (p.etiqueta || 'sujeto a revisión')}`,
    `Próxima acción: ${recomendacion.proximaAccion || '—'}`,
    '',
    recomendacion.descargo || '',
    '',
    'Generado con TRIADA CRM',
  ].filter((x) => x !== '').join('\n');
}
