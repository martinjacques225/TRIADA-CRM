// modules/financiero/presentation/informe-fin.view.js
// ── PRESENTACIÓN · Visor del Informe Financiero Tríada (A4 imprimible) ────────
// Toma un `report` ya normalizado (contrato de dominio) y arma un documento A4
// con la marca Tríada. `buildFinReportDoc` es puro (retorna HTML string, sin DOM)
// → testeable. `openFinReport` monta el overlay + imprime (patrón openInformeViewer
// del Informe 360). El @media print vive en financiero.css con la lección del fix
// de PDF ya aprendida (media screen para el responsive, min-height, box-sizing).
import { escHtml } from '../../../js/utils.js';

const esc = (v) => escHtml(v == null ? '' : String(v));

const LOGO_TRI = `<svg viewBox="0 0 40 40" width="30" height="30" aria-hidden="true">
  <path d="M20 4 L34 30 H6 Z" fill="none" stroke="#16466B" stroke-width="2.4" stroke-linejoin="round"/>
  <circle cx="20" cy="22" r="4.2" fill="#2F8C93"/></svg>`;

const NIVEL_META = {
  critico: { label: 'Crítico',  color: '#B4524A', bg: '#F6EAE6' },
  alerta:  { label: 'En alerta', color: '#C0892F', bg: '#F4ECDA' },
  estable: { label: 'Estable',   color: '#2F8C93', bg: '#E4EFEF' },
  optimo:  { label: 'Óptimo',    color: '#2E9B73', bg: '#E9F0EA' },
};
const SEÑAL_META = {
  positivo: { color: '#2E9B73', glyph: '▲' },
  neutro:   { color: '#3D6E92', glyph: '■' },
  negativo: { color: '#B4524A', glyph: '▼' },
};
const RANGO_META = {
  alta:  { label: 'Alta',  color: '#B4524A' },
  media: { label: 'Media', color: '#C0892F' },
  baja:  { label: 'Baja',  color: '#2F8C93' },
};
const nivelMeta = (n) => NIVEL_META[n] || NIVEL_META.estable;
const señalMeta = (s) => SEÑAL_META[s] || SEÑAL_META.neutro;
const rangoMeta = (r) => RANGO_META[r] || RANGO_META.media;

function _footer(n, total) {
  return `<div class="finr-foot"><span>${LOGO_TRI}<span class="finr-foot-name">Tríada · Consultoría 360</span></span>
    <span class="finr-foot-pg">${n} / ${total}</span></div>`;
}

// ── Páginas ───────────────────────────────────────────────────────────────────
function pageCover(r, meta) {
  const nm = nivelMeta(r.salud?.nivel);
  const puntaje = Number.isFinite(r.salud?.puntaje) ? r.salud.puntaje : null;
  return `<section class="finr-page finr-cover">
    <div class="finr-cover-top">
      <div class="finr-brand">${LOGO_TRI}<span>Tríada</span></div>
      <div class="finr-cover-kind">${esc(meta?.tipoLabel || 'Informe Financiero')}</div>
    </div>
    <div class="finr-cover-mid">
      <h1 class="finr-cover-title">${esc(r.titulo || meta?.tipoLabel || 'Informe Financiero')}</h1>
      <div class="finr-cover-period">${esc(r.periodo || meta?.periodo || '')}</div>
      ${meta?.empresa ? `<div class="finr-cover-emp">${esc(meta.empresa)}</div>` : ''}
      <div class="finr-health" style="--h:${nm.color};background:${nm.bg}">
        <div class="finr-health-badge" style="background:${nm.color}">${puntaje == null ? '—' : puntaje}</div>
        <div class="finr-health-txt">
          <div class="finr-health-nivel" style="color:${nm.color}">${esc(nm.label)}</div>
          <div class="finr-health-titular">${esc(r.salud?.titular || '')}</div>
        </div>
      </div>
    </div>
    <div class="finr-cover-foot">
      ${meta?.codigo ? `<span>${esc(meta.codigo)}</span>` : '<span></span>'}
      <span>Generado con trIA · sin exponer tus datos a terceros</span>
    </div>
  </section>`;
}

function pageResumen(r, total) {
  const inds = r.indicadores || [];
  return `<section class="finr-page">
    <h2 class="finr-h2">Resumen ejecutivo</h2>
    <div class="finr-resumen">${esc(r.resumen_ejecutivo || 'Sin resumen.').split(/\n+/).map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    ${inds.length ? `<h3 class="finr-h3">Indicadores clave</h3>
      <div class="finr-kpis">
        ${inds.map((k) => {
          const m = señalMeta(k.señal);
          return `<div class="finr-kpi" style="--s:${m.color}">
            <div class="finr-kpi-top"><span class="finr-kpi-name">${esc(k.nombre)}</span><span class="finr-kpi-sig" style="color:${m.color}">${m.glyph}</span></div>
            <div class="finr-kpi-val">${esc(k.valor || '—')}</div>
            ${k.comentario ? `<div class="finr-kpi-cmt">${esc(k.comentario)}</div>` : ''}
          </div>`;
        }).join('')}
      </div>` : ''}
    ${_footer(2, total)}
  </section>`;
}

function _listBlock(title, items, render) {
  if (!items || !items.length) return '';
  return `<h3 class="finr-h3">${esc(title)}</h3><div class="finr-list">${items.map(render).join('')}</div>`;
}

function pageHallazgos(r, total) {
  const hall = _listBlock('Hallazgos', r.hallazgos, (h) => {
    const m = rangoMeta(h.severidad);
    return `<div class="finr-item"><div class="finr-item-hd">
        <span class="finr-tag" style="color:${m.color};background:${m.color}18">${esc(m.label)}</span>
        <span class="finr-item-tt">${esc(h.titulo)}</span></div>
      ${h.detalle ? `<p class="finr-item-dt">${esc(h.detalle)}</p>` : ''}</div>`;
  });
  const riesgos = _listBlock('Riesgos', r.riesgos, (x) => `<div class="finr-item">
      <div class="finr-item-hd"><span class="finr-dot" style="background:#B4524A"></span><span class="finr-item-tt">${esc(x.titulo)}</span></div>
      ${x.detalle ? `<p class="finr-item-dt">${esc(x.detalle)}</p>` : ''}
      ${x.mitigacion ? `<p class="finr-item-mit"><strong>Mitigación:</strong> ${esc(x.mitigacion)}</p>` : ''}</div>`);
  if (!hall && !riesgos) return '';
  return `<section class="finr-page"><h2 class="finr-h2">Hallazgos y riesgos</h2>${hall}${riesgos}${_footer(3, total)}</section>`;
}

function pageRecos(r, total) {
  const recos = _listBlock('Recomendaciones', r.recomendaciones, (x) => {
    const m = rangoMeta(x.prioridad);
    return `<div class="finr-item finr-reco"><div class="finr-item-hd">
        <span class="finr-tag" style="color:${m.color};background:${m.color}18">Prioridad ${esc(m.label)}</span>
        <span class="finr-item-tt">${esc(x.accion)}</span></div>
      ${x.impacto ? `<p class="finr-item-dt"><strong>Impacto:</strong> ${esc(x.impacto)}</p>` : ''}</div>`;
  });
  if (!recos && !r.proyeccion) return '';
  return `<section class="finr-page"><h2 class="finr-h2">Recomendaciones${r.proyeccion ? ' y proyección' : ''}</h2>
    ${recos}
    ${r.proyeccion ? `<h3 class="finr-h3">Qué viene el próximo período</h3><div class="finr-resumen"><p>${esc(r.proyeccion)}</p></div>` : ''}
    ${_footer(4, total)}
  </section>`;
}

/**
 * Documento completo del informe financiero (HTML string). Puro (sin DOM).
 * @param {object} report  informe normalizado (dominio)
 * @param {object} meta    { tipoLabel, periodo, empresa, codigo }
 */
export function buildFinReportDoc(report, meta = {}) {
  const r = report || {};
  // Total de páginas presentes (portada + resumen siempre; hallazgos/recos si hay contenido).
  const pages = [pageCover(r, meta), pageResumen(r, 0)];
  const hall = pageHallazgos(r, 0);
  const recos = pageRecos(r, 0);
  if (hall) pages.push(hall);
  if (recos) pages.push(recos);
  const total = pages.length;
  // Reconstruir con el total correcto en los footers.
  const built = [pageCover(r, meta), pageResumen(r, total)];
  const h = pageHallazgos(r, total); if (h) built.push(h);
  const c = pageRecos(r, total);     if (c) built.push(c);
  return built.join('');
}

// ── Visor (overlay + imprimir) ────────────────────────────────────────────────
export function openFinReport(report, meta = {}) {
  let viewer = document.getElementById('finReportViewer');
  if (viewer) viewer.remove();

  viewer = document.createElement('div');
  viewer.id = 'finReportViewer';
  viewer.className = 'finr-viewer';
  viewer.innerHTML = `
    <div class="finr-toolbar">
      <div class="finr-tb-left">${LOGO_TRI}
        <div><div class="finr-tb-name">${esc(meta.tipoLabel || 'Informe Financiero')} Tríada</div>
          <div class="finr-tb-meta">${esc(meta.periodo || report?.periodo || '')}${meta.codigo ? ' · ' + esc(meta.codigo) : ''}</div></div>
      </div>
      <div class="finr-tb-actions">
        <button type="button" class="btn btn-ghost btn-sm" id="finrClose">✕ Cerrar</button>
        <button type="button" class="btn btn-primary btn-sm" id="finrPrint">🖨 Descargar PDF</button>
      </div>
    </div>
    <div class="finr-scroll"><div class="finr-doc">${buildFinReportDoc(report, meta)}</div></div>`;
  document.body.appendChild(viewer);
  document.body.classList.add('has-fin-report');

  viewer.querySelector('#finrClose').addEventListener('click', () => {
    viewer.remove();
    document.body.classList.remove('has-fin-report');
  });
  viewer.querySelector('#finrPrint').addEventListener('click', () => window.print());
}
