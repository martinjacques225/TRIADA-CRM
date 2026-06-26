/* ============================================================================
   util.js · Formato, íconos de línea y helpers de DOM
   Íconos: SIEMPRE de línea (stroke=currentColor), estilo Lucide. Nunca emoji. (§12)
   ========================================================================== */

/** Formato de pesos chilenos: $1.842.500 */
export function clp(n) { return '$' + Math.round(n || 0).toLocaleString('es-CL'); }

/** Escapa texto para interpolar seguro dentro de HTML. */
export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Pluralización simple es-CL. */
export function plural(n, sing, plur) { return n === 1 ? sing : (plur || sing + 's'); }

/** Iniciales de un nombre (máx 2). */
export function initials(name) {
  return (name || '').split(' ').filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

/** Hora local HH:MM en es-CL a partir de epoch ms. */
export function hhmm(ts) {
  return new Date(ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/* ---- Biblioteca de íconos de línea (path data, viewBox 24) ---- */
const PATHS = {
  // marca / shell
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-2.87 1.2V21a2 2 0 1 1-4 0v-.08A1.7 1.7 0 0 0 6.6 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 2.6 15a1.7 1.7 0 0 0-1.52-1H1a2 2 0 1 1 0-4h.08A1.7 1.7 0 0 0 2.6 8.6a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 2.6V1a2 2 0 1 1 4 0v.08a1.7 1.7 0 0 0 2.4 1.45 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 21.4 9H22a2 2 0 1 1 0 4h-.08a1.7 1.7 0 0 0-1.52 1Z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  // estados / feedback
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevronLeft: '<path d="M15 18l-6-6 6-6"/>',
  chevronRight: '<path d="M9 18l6-6-6-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4l2.5 2"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 6h13l3.5 6v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3.5 19a5 5 0 0 1 9 0M16 6a3 3 0 0 1 0 6M18 19a5 5 0 0 0-2.5-4.3"/>',
  // cocina
  chefHat: '<path d="M6 13.5A4.5 4.5 0 0 1 5 4.6a4.5 4.5 0 0 1 8.5-1 4.5 4.5 0 0 1 4 8.9V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z"/><path d="M6 17h12"/>',
  flame: '<path d="M12 3c.5 3-2.5 4.5-2.5 7.5A2.5 2.5 0 0 0 12 13a2.5 2.5 0 0 0 2.5-2.5C14.5 9 13 8.5 13 7c2 1 4 3 4 6a5 5 0 0 1-10 0c0-3.5 3-5 5-10Z"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 8v4l3 2"/>',
  utensils: '<path d="M3 2v7a3 3 0 0 0 3 3v10M6 2v6M9 2v6M9 2v20M17 2c-1.5 0-3 1.5-3 5v6h3"/><path d="M17 13v9"/>',
  // cajero
  card: '<rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
  transfer: '<path d="M16 3l4 4-4 4M20 7H8M8 21l-4-4 4-4M4 17h12"/>',
  receipt: '<path d="M4 2v20l3-2 2 2 2-2 2 2 2-2 3 2V2l-3 2-2-2-2 2-2-2-2 2-3-2Z"/><path d="M8 7h8M8 11h6"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
  split: '<path d="M12 3v18M5 8l-2 4 2 4M19 8l2 4-2 4"/>',
  calculator: '<rect x="4" y="2" width="16" height="20" rx="2.5"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h4"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
  printer: '<path d="M6 9V2h12v7"/><rect x="6" y="13" width="12" height="8" rx="1.5"/><path d="M6 17H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2"/>',
  table: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  trending: '<path d="M3 17l6-6 4 4 7-7"/><path d="M17 8h4v4"/>',
  coins: '<circle cx="8" cy="8" r="5"/><path d="M18.1 6.5a5 5 0 0 1 0 11M9 18.5a5 5 0 0 0 9-4.5"/>',
  // mesero
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"/>',
  clipboard: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="M9 13l1.8 1.8L15 11"/>',
  cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
  // admin
  layout: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  box: '<path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  dollar: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  arrowUp: '<path d="M7 14l5-5 5 5"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
};

/**
 * Devuelve un <svg> de línea como string.
 * @param {string} name  clave de PATHS
 * @param {{size?:number, sw?:number, cls?:string, color?:string}} o
 */
export function icon(name, o = {}) {
  const { size = 20, sw = 1.8, cls = '', color = 'currentColor' } = o;
  const p = PATHS[name] || '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${p}</svg>`;
}

/** Símbolo de marca (3 chevrons). variant: 'color' | 'mono'. */
export function brandMark(size = 26, variant = 'color') {
  if (variant === 'mono') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <path d="M26 90 L60 62 L94 90" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M26 73 L60 45 L94 73" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" opacity=".72"/>
      <path d="M26 56 L60 28 L94 56" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" opacity=".45"/>
    </svg>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 120 120" fill="none" aria-hidden="true">
    <path d="M26 90 L60 62 L94 90" stroke="#16234A" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M26 73 L60 45 L94 73" stroke="#0C7C88" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M26 56 L60 28 L94 56" stroke="#2E9B73" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/** Wordmark "Tríada" con punto teal + sub-nombre. */
export function wordmark(sub = 'Restaurant') {
  return `<span class="wm"><span class="wm-name">Tríada<span class="wm-dot">.</span></span>${sub ? `<span class="wm-sub">${esc(sub)}</span>` : ''}</span>`;
}
