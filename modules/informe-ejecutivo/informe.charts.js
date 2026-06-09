// modules/informe-ejecutivo/informe.charts.js
// Componentes de visualización SVG, sin dependencias. Imprimibles (vectoriales).

// ── Anillo de madurez (donut) ──
export function ringGauge(score, opts = {}) {
  const size   = opts.size   || 220;
  const stroke = opts.stroke || 18;
  const color  = opts.color  || '#028090';
  const label  = opts.label  || '';
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, score));
  const off = circ * (1 - v / 100);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="chart-ring" role="img" aria-label="Índice ${score} de 100">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ECEEF5" stroke-width="${stroke}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}"
            stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
            transform="rotate(-90 ${cx} ${cy})"/>
    <text x="${cx}" y="${cy - size*0.02}" text-anchor="middle" style="font-size:${(size*0.30).toFixed(0)}px;font-weight:800;fill:#1E2761;letter-spacing:-.03em">${score}</text>
    <text x="${cx}" y="${cy + size*0.14}" text-anchor="middle" style="font-size:${(size*0.075).toFixed(0)}px;font-weight:600;fill:#9aa0b3;letter-spacing:.18em">/ 100</text>
    ${label ? `<text x="${cx}" y="${cy + size*0.27}" text-anchor="middle" style="font-size:${(size*0.072).toFixed(0)}px;font-weight:700;fill:${color};text-transform:uppercase;letter-spacing:.1em">${label}</text>` : ''}
  </svg>`;
}

// ── Radar (triángulo de 3 áreas) ──
export function radarChart(areas, opts = {}) {
  const size = opts.size || 320;
  const cx = size / 2, cy = size / 2;
  const R = size * 0.34;
  const n = areas.length;
  const ang = i => (-90 + i * (360 / n)) * Math.PI / 180;
  const pt = (i, frac) => ({ x: cx + Math.cos(ang(i)) * R * frac, y: cy + Math.sin(ang(i)) * R * frac });

  let grid = '';
  [0.25, 0.5, 0.75, 1].forEach(f => {
    const pts = areas.map((_, i) => { const p = pt(i, f); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');
    grid += `<polygon points="${pts}" fill="${f === 1 ? '#FBFBFD' : 'none'}" stroke="#ECEEF5" stroke-width="1"/>`;
  });
  const axes = areas.map((_, i) => { const p = pt(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#ECEEF5" stroke-width="1"/>`; }).join('');
  const dataPts = areas.map((a, i) => { const p = pt(i, a.score / 100); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');
  const dots = areas.map((a, i) => { const p = pt(i, a.score / 100); return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="${a.color}" stroke="#fff" stroke-width="2"/>`; }).join('');
  const labels = areas.map((a, i) => {
    const p = pt(i, 1.24);
    return `<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" style="font-size:12.5px;font-weight:700;fill:#1E2761">${a.short}</text>
            <text x="${p.x.toFixed(1)}" y="${(p.y + 16).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" style="font-size:12px;font-weight:700;fill:${a.color}">${a.score}</text>`;
  }).join('');

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="chart-radar" role="img" aria-label="Radar de madurez por área">
    ${grid}${axes}
    <polygon points="${dataPts}" fill="rgba(2,128,144,.14)" stroke="#028090" stroke-width="2.5" stroke-linejoin="round"/>
    ${dots}${labels}
  </svg>`;
}

// ── Barra horizontal de área (premium) ──
export function areaBar(area) {
  const w = 100;
  return `<div class="chart-areabar">
    <div class="areabar-head">
      <span class="areabar-name">${area.icon} ${area.label}</span>
      <span class="areabar-score" style="color:${area.color}">${area.score}<small>/100</small></span>
    </div>
    <div class="areabar-track">
      <div class="areabar-fill" style="width:${area.score}%;background:${area.color}"></div>
      <div class="areabar-target" style="left:${area.targetScore}%" title="Objetivo: ${area.targetScore}"></div>
    </div>
    <div class="areabar-meta">
      <span class="areabar-nivel" style="color:${area.nivel.color}">● ${area.nivel.id}</span>
      <span class="areabar-target-lbl">Objetivo ${area.targetScore}</span>
    </div>
  </div>`;
}

// ── Matriz Impacto vs Esfuerzo ──
export function impactEffortMatrix(opps, opts = {}) {
  const size = opts.size || 440;
  const pad = 48;
  const plot = size - pad * 2;
  const x0 = pad, y0 = pad;

  const ex = { Bajo: 0.22, Medio: 0.5, Alto: 0.78 };
  const iy = { Alto: 0.22, Medio: 0.5, Bajo: 0.78 };

  // Fondo de cuadrantes (top-left = quick wins)
  const half = plot / 2;
  const quad = (qx, qy, fill) => `<rect x="${qx}" y="${qy}" width="${half}" height="${half}" fill="${fill}"/>`;
  const quadrants =
    quad(x0, y0, 'rgba(79,178,134,.10)') +          // top-left: alto impacto, bajo esfuerzo → prioridad
    quad(x0 + half, y0, 'rgba(240,180,41,.07)') +   // top-right
    quad(x0, y0 + half, 'rgba(91,107,214,.05)') +   // bottom-left
    quad(x0 + half, y0 + half, 'rgba(224,96,79,.05)'); // bottom-right

  // Etiqueta "Prioridad" en quick wins
  const quickLbl = `<text x="${x0 + half/2}" y="${y0 + 18}" text-anchor="middle" style="font-size:10.5px;font-weight:700;fill:#4FB286;letter-spacing:.1em;text-transform:uppercase">Prioridad</text>`;

  // Ejes
  const axes = `
    <line x1="${x0}" y1="${y0 + plot}" x2="${x0 + plot}" y2="${y0 + plot}" stroke="#D8DCE8" stroke-width="1.5"/>
    <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y0 + plot}" stroke="#D8DCE8" stroke-width="1.5"/>
    <line x1="${x0 + half}" y1="${y0}" x2="${x0 + half}" y2="${y0 + plot}" stroke="#ECEEF5" stroke-width="1" stroke-dasharray="4 4"/>
    <line x1="${x0}" y1="${y0 + half}" x2="${x0 + plot}" y2="${y0 + half}" stroke="#ECEEF5" stroke-width="1" stroke-dasharray="4 4"/>`;

  // Rótulos de ejes
  const axisLabels = `
    <text x="${x0 + plot/2}" y="${size - 12}" text-anchor="middle" style="font-size:12px;font-weight:700;fill:#666d84">Esfuerzo de implementación →</text>
    <text x="16" y="${y0 + plot/2}" text-anchor="middle" transform="rotate(-90 16 ${y0 + plot/2})" style="font-size:12px;font-weight:700;fill:#666d84">Impacto potencial →</text>`;

  // Puntos (numerados por prioridad)
  const dots = opps.map((o, idx) => {
    const jx = ((idx % 2) - 0.5) * 0.06;
    const jy = (Math.floor(idx / 2) - 0.5) * 0.05;
    const cx = x0 + plot * Math.max(0.08, Math.min(0.92, (ex[o.esfuerzo] ?? 0.5) + jx));
    const cy = y0 + plot * Math.max(0.08, Math.min(0.92, (iy[o.impacto] ?? 0.5) + jy));
    return `<g>
      <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="15" fill="${o.areaColor}" opacity=".92"/>
      <text x="${cx.toFixed(1)}" y="${(cy + 4.5).toFixed(1)}" text-anchor="middle" style="font-size:13px;font-weight:800;fill:#fff">${idx + 1}</text>
    </g>`;
  }).join('');

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="chart-matrix" role="img" aria-label="Matriz impacto vs esfuerzo">
    ${quadrants}${quickLbl}${axes}${axisLabels}${dots}
  </svg>`;
}

// ── Mapa de madurez (escala horizontal 0-100 con posición actual y objetivo) ──
export function maturityMap(overall, target, opts = {}) {
  const w = opts.width || 760;
  const h = 150;
  const barY = 64, barH = 22;
  const bands = [
    { from: 0,  to: 40,  color: '#E0604F', label: 'Crítico' },
    { from: 40, to: 60,  color: '#F0B429', label: 'En Riesgo' },
    { from: 60, to: 80,  color: '#028090', label: 'Funcional' },
    { from: 80, to: 100, color: '#4FB286', label: 'Optimizado' },
  ];
  const px = v => (v / 100) * w;

  const segs = bands.map(b => `
    <rect x="${px(b.from)}" y="${barY}" width="${px(b.to - b.from)}" height="${barH}" fill="${b.color}" opacity=".85"/>
    <text x="${px((b.from + b.to) / 2)}" y="${barY + barH + 18}" text-anchor="middle" style="font-size:11px;font-weight:600;fill:#666d84">${b.label}</text>
    <text x="${px(b.to)}" y="${barY - 8}" text-anchor="middle" style="font-size:10px;fill:#9aa0b3">${b.to}</text>`).join('');

  const marker = (v, color, label, above) => {
    const x = px(v);
    const yTop = above ? barY - 16 : barY + barH + 30;
    const tri = above
      ? `<path d="M ${x-7} ${barY-2} L ${x+7} ${barY-2} L ${x} ${barY+8} Z" fill="${color}"/>`
      : `<path d="M ${x-7} ${barY+barH+2} L ${x+7} ${barY+barH+2} L ${x} ${barY+barH-8} Z" fill="${color}"/>`;
    return `
      ${tri}
      <circle cx="${x}" cy="${above ? barY - 22 : barY + barH + 36}" r="16" fill="${color}"/>
      <text x="${x}" y="${(above ? barY - 22 : barY + barH + 36) + 5}" text-anchor="middle" style="font-size:13px;font-weight:800;fill:#fff">${v}</text>
      <text x="${x}" y="${above ? barY - 44 : barY + barH + 60}" text-anchor="middle" style="font-size:11px;font-weight:700;fill:${color};text-transform:uppercase;letter-spacing:.08em">${label}</text>`;
  };

  // Flecha de evolución
  const arrow = target > overall ? `
    <line x1="${px(overall)}" y1="${barY + barH/2}" x2="${px(target)}" y2="${barY + barH/2}" stroke="#1E2761" stroke-width="2" stroke-dasharray="5 4"/>
    ` : '';

  return `<svg width="100%" viewBox="0 0 ${w} ${h}" class="chart-maturity" role="img" aria-label="Mapa de madurez empresarial">
    ${segs}
    ${arrow}
    ${marker(overall, '#1E2761', 'Hoy', true)}
    ${marker(target, '#4FB286', 'Objetivo', false)}
  </svg>`;
}
