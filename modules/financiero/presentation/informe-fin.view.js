// modules/financiero/presentation/informe-fin.view.js
// ── PRESENTACIÓN · Visor del Informe Financiero Tríada (A4 imprimible) ────────
// Usa la MISMA piel que el Informe Ejecutivo 360 (`.informe-viewer` + tokens
// --rep-* + clases .report-*/.cover-*/.hallazgo-card/.oport-card de informe.css)
// para que TODOS los informes Tríada se vean idénticos. `buildFinReportDoc` es
// puro (HTML string). Reusa `ringGauge` del módulo de informe (SVG puro) y el
// print del 360 (body.has-report-open → informe.css).
import { escHtml } from '../../../js/utils.js';
import { ringGauge } from '../../informe-ejecutivo/informe.charts.js';

const esc = (v) => escHtml(v == null ? '' : String(v));

// Logo de 3 barras (idéntico al del Informe 360) — currentColor para portada.
const LOGO = `<svg viewBox="0 0 120 120" fill="none" class="report-logo">
  <path d="M26 90 L60 62 L94 90" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M26 73 L60 45 L94 73" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" opacity=".72"/>
  <path d="M26 56 L60 28 L94 56" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" opacity=".45"/>
</svg>`;
const LOGO_TRI = `<svg viewBox="0 0 120 120" fill="none" style="width:38px;height:38px">
  <path d="M26 90 L60 62 L94 90" stroke="#3D6E92" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M26 73 L60 45 L94 73" stroke="#2F8C93" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M26 56 L60 28 L94 56" stroke="#6BA083" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Paletas alineadas al sistema de marca del 360 (verde --rep-fin, teal, rojo, ámbar).
const NIVEL = {
  critico: { c: '#B4524A', bg: '#F6EAE6', l: 'Crítico' },
  alerta:  { c: '#C2871A', bg: '#F4ECDA', l: 'En alerta' },
  estable: { c: '#1C7A82', bg: '#E6F1F0', l: 'Estable' },
  optimo:  { c: '#5E9E7E', bg: '#E9F0EA', l: 'Óptimo' },
};
const SEÑAL = {
  positivo: { c: '#5E9E7E', g: '▲' },
  neutro:   { c: '#3D6E92', g: '■' },
  negativo: { c: '#B4524A', g: '▼' },
};
const RANGO = {
  alta:  { c: '#B4524A', bg: '#F6EAE6', l: 'Alta' },
  media: { c: '#C2871A', bg: '#F4ECDA', l: 'Media' },
  baja:  { c: '#1C7A82', bg: '#E6F1F0', l: 'Baja' },
};
const nivelOf = (n) => NIVEL[n] || NIVEL.estable;
const señalOf = (s) => SEÑAL[s] || SEÑAL.neutro;
const rangoOf = (r) => RANGO[r] || RANGO.media;

function fmtFechaLarga() {
  return new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
}

function footer(codigo, n, total) {
  return `<div class="report-footer">
    <span class="rf-brand">TRÍADA · Informe Financiero</span>
    <span class="rf-code">${esc(codigo || '')}</span>
    <span class="rf-page">${n} / ${total}</span>
  </div>`;
}
function pageHead(num, title) {
  return `<div class="report-head"><span class="rh-num">${esc(num)}</span><h2 class="rh-title">${esc(title)}</h2><span class="rh-rule"></span></div>`;
}

// ── Páginas ───────────────────────────────────────────────────────────────────
function pageCover(r, meta) {
  const nv = nivelOf(r.salud?.nivel);
  const pnt = Number.isFinite(r.salud?.puntaje) ? r.salud.puntaje : null;
  const titulo = r.titulo || meta.tipoLabel || 'Informe Financiero';
  const periodo = r.periodo || meta.periodo || '';
  return `<section class="report-page cover-page">
    <div class="cover-aura"></div>
    <div class="cover-top">
      <div class="cover-brand">${LOGO}<span>TRÍADA</span></div>
      <div class="cover-areas"><span><i style="background:${nv.c}"></i>${esc(nv.l)}</span></div>
    </div>
    <div class="cover-center">
      <div class="cover-kicker">Informe Financiero</div>
      <h1 class="cover-title">${esc(titulo)}</h1>
      ${periodo ? `<div class="cover-sub">${esc(periodo)}</div>` : ''}
      ${r.salud?.titular ? `<div class="cover-quote">“${esc(r.salud.titular)}”</div>` : ''}
      <div class="cover-result">
        <span class="cr-item"><span class="cr-k">Salud financiera</span><span class="cr-v"><b>${pnt == null ? '—' : pnt}</b>/100 · ${esc(nv.l)}</span></span>
      </div>
    </div>
    <div class="cover-meta">
      <div class="cmeta"><span class="cmeta-l">Empresa</span><span class="cmeta-v">${esc(meta.empresa || 'Interno')}</span></div>
      <div class="cmeta"><span class="cmeta-l">Período</span><span class="cmeta-v">${esc(periodo || '—')}</span></div>
      <div class="cmeta"><span class="cmeta-l">Generado</span><span class="cmeta-v">${esc(fmtFechaLarga())}</span></div>
      <div class="cmeta"><span class="cmeta-l">Código de informe</span><span class="cmeta-v mono">${esc(meta.codigo || '—')}</span></div>
    </div>
  </section>`;
}

function pageResumen(r, n, total) {
  const nv = nivelOf(r.salud?.nivel);
  const pnt = Number.isFinite(r.salud?.puntaje) ? r.salud.puntaje : 0;
  const inds = r.indicadores || [];
  return `<section class="report-page">
    ${pageHead('01', 'Resumen ejecutivo')}
    <div class="resumen-grid">
      <div class="resumen-gauge">
        <div class="rg-label">Salud financiera</div>
        ${ringGauge(pnt, { size: 220, color: nv.c, label: nv.l })}
        ${r.salud?.titular ? `<div class="rg-tag" style="color:${nv.c};background:${nv.bg}">${esc(r.salud.titular)}</div>` : ''}
      </div>
      <div class="resumen-text">
        <h3 class="rt-title">Lectura del período</h3>
        <p class="rt-body">${esc(r.resumen_ejecutivo || 'Sin resumen.')}</p>
      </div>
    </div>
    ${inds.length ? `<h3 class="rt-title" style="margin-top:26px">Indicadores clave</h3>
      <div class="fin-kpis">
        ${inds.map((k) => {
          const m = señalOf(k.señal);
          return `<div class="fin-kpi" style="border-left-color:${m.c}">
            <div class="fin-kpi-top"><span class="fin-kpi-name">${esc(k.nombre)}</span><span style="color:${m.c}">${m.g}</span></div>
            <div class="fin-kpi-val">${esc(k.valor || '—')}</div>
            ${k.comentario ? `<div class="fin-kpi-cmt">${esc(k.comentario)}</div>` : ''}
          </div>`;
        }).join('')}
      </div>` : ''}
    ${footer(r.codigo, n, total)}
  </section>`;
}

function pageHallazgos(r, n, total) {
  const hall = r.hallazgos || [];
  const ries = r.riesgos || [];
  return `<section class="report-page">
    ${pageHead('02', 'Hallazgos y riesgos')}
    ${hall.length ? `<div class="hallazgos-list">
      ${hall.map((h, i) => {
        const m = rangoOf(h.severidad);
        return `<div class="hallazgo-card">
          <div class="hz-rank" style="background:${m.bg};color:${m.c}">${i + 1}</div>
          <div style="flex:1">
            <div class="hz-top"><span class="hz-title">${esc(h.titulo)}</span><span class="hz-risk" style="color:${m.c};border-color:${m.c};background:${m.bg}">${esc(m.l)}</span></div>
            ${h.detalle ? `<div class="hz-impacto">${esc(h.detalle)}</div>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}
    ${ries.length ? `<h3 class="rt-title" style="margin-top:22px">Riesgos a vigilar</h3>
      <div class="oport-list">
        ${ries.map((x) => `<div class="oport-card">
          <div class="op-num" style="background:#B4524A">!</div>
          <div style="flex:1">
            <div class="op-title">${esc(x.titulo)}</div>
            ${x.detalle ? `<div class="op-benef">${esc(x.detalle)}</div>` : ''}
            ${x.mitigacion ? `<div class="op-benef"><strong>Mitigación:</strong> ${esc(x.mitigacion)}</div>` : ''}
          </div>
        </div>`).join('')}
      </div>` : ''}
    ${footer(r.codigo, n, total)}
  </section>`;
}

function pageRecos(r, n, total) {
  const recos = r.recomendaciones || [];
  return `<section class="report-page">
    ${pageHead('03', 'Recomendaciones')}
    ${recos.length ? `<div class="oport-list">
      ${recos.map((x, i) => {
        const m = rangoOf(x.prioridad);
        return `<div class="oport-card">
          <div class="op-num" style="background:${m.c}">${i + 1}</div>
          <div style="flex:1">
            <div class="op-title-row"><span class="op-title">${esc(x.accion)}</span><span class="op-prio" style="color:${m.c};background:${m.bg}">Prioridad ${esc(m.l)}</span></div>
            ${x.impacto ? `<div class="op-benef"><strong>Impacto:</strong> ${esc(x.impacto)}</div>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}
    ${r.proyeccion ? `<h3 class="rt-title" style="margin-top:22px">Qué viene el próximo período</h3>
      <div class="conclusion-cta">${esc(r.proyeccion)}</div>` : ''}
    ${footer(r.codigo, n, total)}
  </section>`;
}

const _hasHallazgos = (r) => (r.hallazgos && r.hallazgos.length) || (r.riesgos && r.riesgos.length);
const _hasRecos = (r) => (r.recomendaciones && r.recomendaciones.length) || r.proyeccion;

/**
 * Documento completo del informe financiero (HTML string, piel del 360). Puro.
 * @param {object} report  informe normalizado (dominio)
 * @param {object} meta    { tipoLabel, periodo, empresa, codigo }
 */
export function buildFinReportDoc(report, meta = {}) {
  const r = report || {};
  const kinds = ['cover', 'resumen'];
  if (_hasHallazgos(r)) kinds.push('hallazgos');
  if (_hasRecos(r)) kinds.push('recos');
  const total = kinds.length;
  return kinds.map((k, i) => {
    const n = i + 1;
    if (k === 'cover') return pageCover(r, meta);
    if (k === 'resumen') return pageResumen(r, n, total);
    if (k === 'hallazgos') return pageHallazgos(r, n, total);
    return pageRecos(r, n, total);
  }).join('');
}

// ── Visor (overlay + imprimir) — mismo shell que el Informe 360 ───────────────
export function openFinReport(report, meta = {}) {
  let viewer = document.getElementById('finReportViewer');
  if (viewer) viewer.remove();

  viewer = document.createElement('div');
  viewer.id = 'finReportViewer';
  viewer.className = 'informe-viewer';
  viewer.innerHTML = `
    <div class="report-toolbar">
      <div class="rt-left">${LOGO_TRI}
        <div><div class="rt-name">Informe Financiero Tríada</div>
          <div class="rt-meta">${esc(meta.tipoLabel || '')}${meta.periodo ? ' · ' + esc(meta.periodo) : ''}${meta.codigo ? ' · ' + esc(meta.codigo) : ''}</div></div>
      </div>
      <div class="rt-actions">
        <button type="button" class="btn btn-ghost btn-sm" id="finrClose">✕ Cerrar</button>
        <button type="button" class="btn btn-primary btn-sm" id="finrPrint">🖨 Descargar PDF</button>
      </div>
    </div>
    <div class="report-scroll"><div class="report-doc">${buildFinReportDoc(report, meta)}</div></div>`;
  document.body.appendChild(viewer);
  document.body.classList.add('has-report-open');

  viewer.querySelector('#finrClose').addEventListener('click', () => {
    viewer.remove();
    document.body.classList.remove('has-report-open');
  });
  viewer.querySelector('#finrPrint').addEventListener('click', () => window.print());
}
