// modules/informe-ejecutivo/informe.view.js
// Render del Informe Ejecutivo Tríada 360 + visor a pantalla completa + impresión.
import { computeInforme } from './informe.engine.js';
import { ringGauge, radarChart, areaBar, impactEffortMatrix, maturityMap } from './informe.charts.js';

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function fmtFechaLarga(iso) {
  const d = new Date(iso || Date.now());
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
}

// Monto compacto en CLP: ≥1M se muestra en millones ("$50M", "$1.200M").
function fmtMonto(n) {
  if (!n) return '—';
  if (n >= 1e6) return '$' + Math.round(n / 1e6).toLocaleString('es-CL') + 'M';
  return '$' + Math.round(n).toLocaleString('es-CL');
}

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

function footer(rep, n) {
  return `<div class="report-footer">
    <span class="rf-brand">TRÍADA · Diagnóstico Empresarial 360</span>
    <span class="rf-code">${esc(rep.codigo)}</span>
    <span class="rf-page">${n} / 8</span>
  </div>`;
}

// ════════ PÁGINAS ════════

function pageCover(rep) {
  return `<section class="report-page cover-page">
    <div class="cover-aura"></div>
    <div class="cover-top">
      <div class="cover-brand">${LOGO}<span>TRÍADA</span></div>
      <div class="cover-areas">
        <span><i style="background:#3D6E92"></i>Tecnología</span>
        <span><i style="background:#2F8C93"></i>Ventas</span>
        <span><i style="background:#5E9E7E"></i>Finanzas</span>
      </div>
    </div>

    <div class="cover-center">
      <div class="cover-kicker">Informe Ejecutivo</div>
      <h1 class="cover-title">TRÍADA 360</h1>
      <div class="cover-sub">Diagnóstico Integral de Madurez Empresarial</div>
      <div class="cover-quote">“Las empresas más exitosas no son las que trabajan más,<br>sino las que entienden mejor dónde enfocar sus esfuerzos.”</div>
      <div class="cover-result">
        <span class="cr-item"><span class="cr-k">Índice general</span><span class="cr-v"><b>${rep.overall}</b>/100 · ${esc(rep.nivel.id)}</span></span>
        ${rep.economia ? `<span class="cr-div"></span><span class="cr-item"><span class="cr-k">Valor en juego</span><span class="cr-v"><b>${fmtMonto(rep.economia.totalBajo)}–${fmtMonto(rep.economia.totalAlto)}</b> / año</span></span>` : ''}
      </div>
    </div>

    <div class="cover-meta">
      <div class="cmeta"><span class="cmeta-l">Empresa</span><span class="cmeta-v">${esc(rep.empresa)}</span></div>
      <div class="cmeta"><span class="cmeta-l">Fecha</span><span class="cmeta-v">${fmtFechaLarga(rep.fecha)}</span></div>
      <div class="cmeta"><span class="cmeta-l">Evaluador</span><span class="cmeta-v">${esc(rep.evaluador?.nombre || 'Equipo Tríada')}${rep.evaluador?.cargo ? ' · ' + esc(rep.evaluador.cargo) : ''}</span></div>
      <div class="cmeta"><span class="cmeta-l">Código de informe</span><span class="cmeta-v mono">${esc(rep.codigo)}</span></div>
    </div>
  </section>`;
}

function pageResumen(rep) {
  return `<section class="report-page">
    ${pageHead('01', 'Resumen Ejecutivo')}
    <div class="resumen-grid">
      <div class="resumen-gauge">
        <div class="rg-label">Índice General de Madurez</div>
        ${ringGauge(rep.overall, { size: 240, color: rep.nivel.color, label: rep.nivel.id })}
        <div class="rg-tag" style="color:${rep.nivel.color};background:${rep.nivel.bg}">${rep.nivel.tag}</div>
      </div>
      <div class="resumen-text">
        <div class="resumen-clasif">
          ${['Crítico','En Riesgo','Funcional','Optimizado'].map(c => {
            const on = rep.nivel.id === c;
            return `<div class="clasif-pill ${on ? 'on' : ''}" ${on ? `style="background:${rep.nivel.color};color:#fff;border-color:${rep.nivel.color}"` : ''}>${c}</div>`;
          }).join('')}
        </div>
        <h3 class="rt-title">Lectura del diagnóstico</h3>
        <p class="rt-body">${esc(rep.resumenEjecutivo)}</p>
        <div class="rt-areas">
          ${rep.areas.map(a => `<div class="rt-area-mini">
            <span class="rt-area-dot" style="background:${a.color}"></span>
            <span class="rt-area-name">${a.short}</span>
            <span class="rt-area-score" style="color:${a.color}">${a.score}</span>
            ${rep.benchmarkContext ? `<span class="rt-area-bench ${a.vsBenchmark >= 0 ? 'pos' : 'neg'}">${a.vsBenchmark >= 0 ? '+' : ''}${a.vsBenchmark} vs ref.</span>` : ''}
          </div>`).join('')}
        </div>
        ${rep.benchmarkContext ? `<div class="rt-bench-note">Referencia Tríada estimada por rubro y tamaño de empresa.</div>` : ''}
      </div>
    </div>
    ${rep.economia ? `<div class="resumen-valor">
      <div class="rv-head">
        <span class="rv-label">Valor estimado en juego</span>
        <span class="rv-amount">${fmtMonto(rep.economia.totalBajo)}–${fmtMonto(rep.economia.totalAlto)} <small>/ año</small></span>
      </div>
      <div class="rv-areas">
        ${rep.economia.porArea.map(p => `<span class="rv-chip"><i style="background:${p.color}"></i>${esc(p.area)}: ${p.alto ? `${fmtMonto(p.bajo)}–${fmtMonto(p.alto)}` : 'sin brecha'}</span>`).join('')}
      </div>
      <div class="rv-note">Estimación de referencia sobre la facturación anual informada y el potencial de mejora de cada área. Dimensiona la oportunidad; no es una promesa de resultado y debe validarse con el cliente.</div>
    </div>` : ''}
    ${footer(rep, 2)}
  </section>`;
}

function pageHead(num, title) {
  return `<div class="report-head">
    <span class="rh-num">${num}</span>
    <h2 class="rh-title">${title}</h2>
    <span class="rh-rule"></span>
  </div>`;
}

function pageResultados(rep) {
  return `<section class="report-page">
    ${pageHead('02', 'Resultados por Área')}
    <div class="resultados-grid">
      <div class="resultados-bars">
        ${rep.areas.map(areaBar).join('')}
      </div>
      <div class="resultados-radar">
        ${radarChart(rep.areas, { size: 300, showBenchmark: rep.benchmarkContext })}
        ${rep.benchmarkContext ? `<div class="radar-legend"><span class="rl-you">Tu empresa</span><span class="rl-ref">Referencia rubro</span></div>` : ''}
        <div class="radar-caption">Perfil de madurez vs. la referencia estimada de tu rubro</div>
      </div>
    </div>
    <div class="area-detail-list">
      ${rep.areas.map(a => `<div class="area-detail">
        <div class="ad-head">
          <span class="ad-dot" style="background:${a.color}"></span>
          <span class="ad-name">${esc(a.label)}</span>
          <span class="ad-score" style="color:${a.color}">${a.score}<small>/100</small></span>
          <span class="ad-nivel" style="color:${a.nivel.color};background:${a.nivel.bg}">${a.nivel.id}</span>
        </div>
        <div class="ad-subdims">
          ${(a.subdimensiones || []).map(s => `<div class="ad-subdim">
            <div class="ad-subdim-top"><span class="ad-subdim-name">${esc(s.label)}</span><span class="ad-subdim-score">${s.score}</span></div>
            <div class="ad-subdim-track"><div class="ad-subdim-fill" style="width:${s.score}%;background:${a.color}"></div></div>
          </div>`).join('')}
        </div>
        <div class="ad-cols">
          <div class="ad-col">
            <div class="ad-col-h ad-pos">Fortalezas</div>
            ${a.fortalezas.length ? a.fortalezas.map(f => `<div class="ad-item ad-item-pos">✓ ${esc(f)}</div>`).join('') : `<div class="ad-empty">Sin fortalezas destacadas en esta área.</div>`}
          </div>
          <div class="ad-col">
            <div class="ad-col-h ad-neg">Debilidades</div>
            ${a.debilidades.length ? a.debilidades.map(d => `<div class="ad-item ad-item-neg">• ${esc(d)}</div>`).join('') : `<div class="ad-empty">Sin debilidades relevantes detectadas.</div>`}
          </div>
        </div>
      </div>`).join('')}
    </div>
    ${footer(rep, 3)}
  </section>`;
}

const RIESGO_STYLE = {
  Alto:  { color:'#B4524A', bg:'#F6EAE6', label:'Riesgo Alto' },
  Medio: { color:'#C0892F', bg:'#F4ECDA', label:'Riesgo Medio' },
  Bajo:  { color:'#3D6E92', bg:'#E7EEF3', label:'Riesgo Bajo' },
};

function pageHallazgos(rep) {
  return `<section class="report-page">
    ${pageHead('03', 'Hallazgos Principales')}
    <p class="page-intro">Los siguientes hallazgos representan los puntos de mayor atención detectados en el diagnóstico, ordenados por nivel de riesgo para el negocio.</p>
    <div class="hallazgos-list">
      ${rep.hallazgos.length ? rep.hallazgos.map((h, i) => {
        const rs = RIESGO_STYLE[h.riesgo] || RIESGO_STYLE.Medio;
        return `<div class="hallazgo-card">
          <div class="hz-rank" style="background:${rs.bg};color:${rs.color}">${i + 1}</div>
          <div class="hz-body">
            <div class="hz-top">
              <span class="hz-title">${esc(h.titulo)}</span>
              <span class="hz-area" style="color:${h.areaColor}"><i style="background:${h.areaColor}"></i>${esc(h.area)}</span>
            </div>
            <p class="hz-impacto">${esc(h.impacto)}</p>
            <div class="hz-tags">
              <span class="hz-risk" style="color:${rs.color};background:${rs.bg};border-color:${rs.color}">${rs.label}</span>
            </div>
          </div>
        </div>`;
      }).join('') : `<div class="report-empty">La empresa no presenta hallazgos críticos. Su base operativa es sólida en las tres áreas evaluadas.</div>`}
    </div>
    ${footer(rep, 4)}
  </section>`;
}

const DIF_STYLE = {
  Bajo:  { color:'#5E9E7E', label:'Esfuerzo bajo' },
  Medio: { color:'#C0892F', label:'Esfuerzo medio' },
  Alto:  { color:'#B4524A', label:'Esfuerzo alto' },
};
const IMP_STYLE = {
  Alto:  { color:'#1C7A82', label:'Impacto alto' },
  Medio: { color:'#3D6E92', label:'Impacto medio' },
  Bajo:  { color:'#8A90A3', label:'Impacto bajo' },
};

function pageOportunidades(rep) {
  return `<section class="report-page">
    ${pageHead('04', 'Oportunidades de Mejora')}
    <div class="oport-grid">
      <div class="oport-list">
        ${rep.oportunidades.length ? rep.oportunidades.map((o, i) => {
          const d = DIF_STYLE[o.esfuerzo] || DIF_STYLE.Medio;
          const m = IMP_STYLE[o.impacto] || IMP_STYLE.Medio;
          return `<div class="oport-card">
            <div class="op-num" style="background:${o.areaColor}">${i + 1}</div>
            <div class="op-body">
              <div class="op-title">${esc(o.titulo)}</div>
              <div class="op-benef"><strong>Beneficio:</strong> ${esc(o.beneficio)}</div>
              <div class="op-tags">
                <span class="op-tag" style="color:${m.color}"><i style="background:${m.color}"></i>${m.label}</span>
                <span class="op-tag" style="color:${d.color}"><i style="background:${d.color}"></i>${d.label}</span>
                <span class="op-tag" style="color:${o.areaColor}"><i style="background:${o.areaColor}"></i>${esc(o.area)}</span>
              </div>
            </div>
          </div>`;
        }).join('') : `<div class="report-empty">Sin oportunidades pendientes relevantes. Recomendamos enfocarse en sostener las buenas prácticas actuales.</div>`}
      </div>
      <div class="oport-matrix">
        <div class="matrix-title">Matriz Impacto vs Esfuerzo</div>
        ${impactEffortMatrix(rep.oportunidades, { size: 360 })}
        <div class="matrix-legend">${rep.oportunidades.map((o, i) => `<div class="ml-item"><span class="ml-num" style="background:${o.areaColor}">${i + 1}</span>${esc(o.titulo)}</div>`).join('')}</div>
      </div>
    </div>
    ${footer(rep, 5)}
  </section>`;
}

function pageMapa(rep) {
  return `<section class="report-page">
    ${pageHead('05', 'Mapa de Madurez Empresarial')}
    <p class="page-intro">Posición actual de la empresa en la escala de madurez y el nivel objetivo alcanzable con la implementación del plan recomendado.</p>
    <div class="mapa-wrap">
      ${maturityMap(rep.overall, rep.target)}
    </div>
    <div class="mapa-delta">
      <div class="md-box">
        <div class="md-label">Hoy</div>
        <div class="md-val" style="color:#14222E">${rep.overall}</div>
        <div class="md-nivel" style="color:${rep.nivel.color}">${rep.nivel.id}</div>
      </div>
      <div class="md-arrow">
        <div class="md-potencial">+${rep.potencial}</div>
        <svg viewBox="0 0 80 24" width="80" height="24"><path d="M2 12 H70 M62 5 L72 12 L62 19" stroke="#5E9E7E" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <div class="md-potencial-lbl">de mejora potencial</div>
      </div>
      <div class="md-box">
        <div class="md-label">Objetivo</div>
        <div class="md-val" style="color:#5E9E7E">${rep.target}</div>
        <div class="md-nivel" style="color:${rep.nivel.color}">proyectado</div>
      </div>
    </div>
    <div class="mapa-areas">
      ${rep.areas.map(a => `<div class="ma-row">
        <span class="ma-name"><i style="background:${a.color}"></i>${a.short}</span>
        <div class="ma-track">
          <div class="ma-fill-now" style="width:${a.score}%;background:${a.color}"></div>
          <div class="ma-fill-target" style="left:${a.score}%;width:${Math.max(0, a.targetScore - a.score)}%;background:${a.color}"></div>
        </div>
        <span class="ma-vals"><b style="color:${a.color}">${a.score}</b> → <b style="color:#2E9B73">${a.targetScore}</b></span>
      </div>`).join('')}
    </div>
    ${footer(rep, 6)}
  </section>`;
}

function pagePlan(rep) {
  const fase = (titulo, plazo, items, color) => `<div class="plan-fase">
    <div class="pf-head" style="border-color:${color}">
      <span class="pf-dot" style="background:${color}"></span>
      <div><div class="pf-title">${titulo}</div><div class="pf-plazo">${plazo}</div></div>
    </div>
    <div class="pf-items">
      ${items.map(it => `<div class="pf-item">
        <div class="pfi-title">${esc(it.titulo)}</div>
        <div class="pfi-benef">${esc(it.beneficio)}</div>
        <span class="pfi-area" style="color:${it.areaColor}">${esc(it.area)}</span>
      </div>`).join('')}
    </div>
  </div>`;

  return `<section class="report-page">
    ${pageHead('06', 'Plan de Acción Recomendado')}
    <p class="page-intro">Hoja de ruta priorizada. Cada acción responde directamente a los hallazgos detectados y avanza de las victorias rápidas hacia los cambios de mayor alcance.</p>
    <div class="plan-grid">
      ${fase('Corto Plazo', '0 – 30 días', rep.plan.corto, '#5E9E7E')}
      ${fase('Mediano Plazo', '30 – 90 días', rep.plan.mediano, '#2F8C93')}
      ${fase('Largo Plazo', '90 – 180 días', rep.plan.largo, '#3D6E92')}
    </div>
    ${footer(rep, 7)}
  </section>`;
}

function pageConclusion(rep) {
  return `<section class="report-page">
    ${pageHead('07', 'Conclusión Ejecutiva')}
    <div class="conclusion-body">
      ${rep.conclusion.map(p => `<p>${esc(p)}</p>`).join('')}
    </div>
    <div class="conclusion-highlight" style="border-color:${rep.nivel.color}">
      <div class="ch-left">
        <div class="ch-label">Índice actual</div>
        <div class="ch-val" style="color:${rep.nivel.color}">${rep.overall}<small>/100</small></div>
      </div>
      <svg viewBox="0 0 60 24" width="60" height="24"><path d="M2 12 H48 M40 5 L52 12 L40 19" stroke="#5E9E7E" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div class="ch-right">
        <div class="ch-label">Potencial proyectado</div>
        <div class="ch-val" style="color:#5E9E7E">${rep.target}<small>/100</small></div>
      </div>
    </div>
    <div class="conclusion-sign">
      <div class="cs-line"></div>
      <div class="cs-who">
        <div class="cs-name">${esc(rep.evaluador?.nombre || 'Equipo Tríada')}</div>
        <div class="cs-role">${esc(rep.evaluador?.cargo || 'Consultoría Estratégica')}${rep.evaluador?.empresa ? ' · ' + esc(rep.evaluador.empresa) : ' · Tríada'}</div>
      </div>
      <div class="cs-brand">${LOGO_TRI}</div>
    </div>
    <div class="conclusion-cta">
      <strong>Próximo paso sugerido:</strong> revisar en conjunto este diagnóstico y priorizar las acciones de mayor impacto para tu empresa.
    </div>
    ${footer(rep, 8)}
  </section>`;
}

// ════════ CONSTRUCTOR DE DOCUMENTO (reutilizable: visor + PDF headless) ════════
// Devuelve el HTML de las 8 páginas a partir de un modelo `rep` ya computado.
export function buildReportDoc(rep) {
  return `${pageCover(rep)}${pageResumen(rep)}${pageResultados(rep)}${pageHallazgos(rep)}${pageOportunidades(rep)}${pageMapa(rep)}${pagePlan(rep)}${pageConclusion(rep)}`;
}

// ════════ VISOR ════════
export function openInformeViewer(diag, prospecto, evaluador) {
  const rep = computeInforme(diag, prospecto, evaluador);

  let viewer = document.getElementById('informeViewer');
  if (viewer) viewer.remove();

  viewer = document.createElement('div');
  viewer.id = 'informeViewer';
  viewer.className = 'informe-viewer';
  viewer.innerHTML = `
    <div class="report-toolbar">
      <div class="rt-left">
        ${LOGO_TRI}
        <div>
          <div class="rt-name">Informe Ejecutivo Tríada 360</div>
          <div class="rt-meta">${esc(rep.empresa)} · ${esc(rep.codigo)}</div>
        </div>
      </div>
      <div class="rt-actions">
        <button class="btn btn-ghost btn-sm" id="rtClose">✕ Cerrar</button>
        <button class="btn btn-primary btn-sm" id="rtPrint">🖨 Descargar PDF</button>
      </div>
    </div>
    <div class="report-scroll" id="reportScroll">
      <div class="report-doc">${buildReportDoc(rep)}</div>
    </div>`;
  document.body.appendChild(viewer);
  document.body.classList.add('has-report-open');

  document.getElementById('rtClose').onclick = () => {
    viewer.remove();
    document.body.classList.remove('has-report-open');
  };
  document.getElementById('rtPrint').onclick = () => window.print();
}
