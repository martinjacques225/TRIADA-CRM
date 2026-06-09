// modules/informes/charts.engine.js
// MOTOR DE GRÁFICOS. SVG puro con colores HEX fijos (corporativos) para que html2pdf/html2canvas
// los rasterice de forma consistente, independiente del tema de la app. Sin librerías, offline.
import { fmtMoney } from '../../js/utils.js';

export const PALETA = {
  primary: '#2563EB', primaryDark: '#1E40AF', ink: '#0F172A', slate: '#64748B',
  line: '#E2E8F0', bg: '#F8FAFC', good: '#16A34A', warn: '#D97706', bad: '#DC2626',
  purple: '#7C3AED', amber: '#F59E0B', teal: '#0D9488', pink: '#DB2777', cyan: '#0891B2'
};
const SERIE = [PALETA.primary, PALETA.purple, PALETA.teal, PALETA.amber, PALETA.pink, PALETA.cyan, PALETA.good, PALETA.bad];

const esc = s => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
const short = n => n >= 1e6 ? '$' + (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M' : n >= 1000 ? '$' + Math.round(n / 1000) + 'K' : '$' + Math.round(n);
const lblDia = iso => { const d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString('es', { day: 'numeric' }); };

// Barras verticales. items: [{lbl, val}]. money: formatear como dinero.
export function barChart(items, { money = false, color = PALETA.primary } = {}) {
  if (!items || !items.length) return _empty();
  const W = 560, H = 200, pad = 28, bw = (W - pad * 2) / items.length;
  const max = Math.max(...items.map(i => i.val), 1);
  const bars = items.map((it, i) => {
    const h = it.val > 0 ? Math.max(3, (it.val / max) * (H - pad * 2)) : 0;
    const x = pad + i * bw + bw * 0.18, w = bw * 0.64, y = H - pad - h;
    const label = it.val > 0 ? (money ? short(it.val) : it.val) : '';
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${color}"/>
      ${label ? `<text x="${(x + w / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" font-size="10" fill="${PALETA.slate}" text-anchor="middle">${label}</text>` : ''}
      <text x="${(x + w / 2).toFixed(1)}" y="${H - pad + 14}" font-size="9" fill="${PALETA.slate}" text-anchor="middle">${esc(it.lbl)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg">
    <line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" stroke="${PALETA.line}"/>${bars}</svg>`;
}

// Línea con área. serie: [{dia, valor}]. money para etiqueta del último punto.
export function lineArea(serie, { money = true, color = PALETA.primary } = {}) {
  const vals = (serie || []).map(p => p.valor);
  if (vals.length < 2 || Math.max(...vals) === 0) return _empty('El gráfico se llena con la actividad del periodo');
  const W = 560, H = 200, pad = 30;
  const max = Math.max(...vals, 1), n = vals.length;
  const X = i => pad + (i / (n - 1)) * (W - pad * 2);
  const Y = v => H - pad - (v / max) * (H - pad * 2);
  const pts = vals.map((v, i) => [X(i), Y(v)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[n - 1][0].toFixed(1)} ${H - pad} L${pts[0][0].toFixed(1)} ${H - pad} Z`;
  const grid = [0, .5, 1].map(g => { const y = H - pad - g * (H - pad * 2); return `<line x1="${pad}" y1="${y}" x2="${W - pad}" y2="${y}" stroke="${PALETA.line}"/>`; }).join('');
  const lastVal = vals[n - 1];
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg">
    ${grid}<path d="${area}" fill="${color}22"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2.5"/>
    <circle cx="${pts[n - 1][0].toFixed(1)}" cy="${pts[n - 1][1].toFixed(1)}" r="4" fill="${color}"/>
    <text x="${(W - pad)}" y="${(Y(lastVal) - 8).toFixed(1)}" font-size="11" fill="${color}" text-anchor="end" font-weight="700">${money ? short(lastVal) : lastVal}</text>
    <text x="${pad}" y="${H - 6}" font-size="9" fill="${PALETA.slate}">${serie.length ? lblDia(serie[0].dia) : ''}</text>
    <text x="${W - pad}" y="${H - 6}" font-size="9" fill="${PALETA.slate}" text-anchor="end">${serie.length ? lblDia(serie[n - 1].dia) : ''}</text></svg>`;
}

// Donut de porcentaje.
export function donut(pctVal, label = '', color = PALETA.primary) {
  const r = 52, c = 2 * Math.PI * r, off = c * (1 - Math.min(100, pctVal) / 100);
  return `<svg viewBox="0 0 140 140" width="140" xmlns="http://www.w3.org/2000/svg">
    <circle cx="70" cy="70" r="${r}" fill="none" stroke="${PALETA.line}" stroke-width="14"/>
    <circle cx="70" cy="70" r="${r}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 70 70)"/>
    <text x="70" y="68" font-size="26" font-weight="800" fill="${PALETA.ink}" text-anchor="middle">${Math.round(pctVal)}%</text>
    <text x="70" y="88" font-size="10" fill="${PALETA.slate}" text-anchor="middle">${esc(label)}</text></svg>`;
}

// Ranking de barras horizontales. items: [{nombre, n}]. money opcional.
export function rankBars(items, { money = false } = {}) {
  if (!items || !items.length) return _empty();
  const max = Math.max(...items.map(i => i.n), 1);
  return `<div style="display:flex;flex-direction:column;gap:8px">` + items.map((it, i) => {
    const w = Math.max(4, (it.n / max) * 100), col = SERIE[i % SERIE.length];
    return `<div style="display:flex;align-items:center;gap:8px;font-size:11px">
      <span style="width:130px;color:${PALETA.ink};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(it.nombre)}</span>
      <span style="flex:1;background:${PALETA.line};border-radius:6px;height:14px;position:relative">
        <span style="position:absolute;left:0;top:0;height:14px;width:${w}%;background:${col};border-radius:6px"></span></span>
      <span style="width:54px;text-align:right;font-weight:700;color:${PALETA.ink}">${money ? short(it.n) : it.n}</span></div>`;
  }).join('') + `</div>`;
}

// Distribución (estados/origen) como barras horizontales con conteo.
export function distribution(obj) {
  const items = Object.entries(obj || {}).map(([k, v]) => ({ nombre: k, n: v })).sort((a, b) => b.n - a.n);
  return rankBars(items);
}

function _empty(msg = 'Sin datos en el periodo') {
  return `<div style="height:120px;display:flex;align-items:center;justify-content:center;color:${PALETA.slate};font-size:12px;background:${PALETA.bg};border-radius:8px">${msg}</div>`;
}
