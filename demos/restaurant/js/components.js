/* ============================================================================
   components.js · Piezas de UI compartidas entre roles (desde tokens del brand)
   ========================================================================== */

import { icon, esc } from './util.js';

/** Tonos semánticos → (fondo suave, texto, punto). Usan variables del brand. */
export const TONES = {
  neutral: { bg: 'var(--color-surface-2)', fg: 'var(--color-text-2)', dot: 'var(--color-text-3)' },
  teal:    { bg: 'var(--color-primary-50)', fg: 'var(--color-primary-700)', dot: 'var(--color-primary)' },
  info:    { bg: 'var(--color-info-soft)', fg: 'var(--color-info-fg)', dot: 'var(--color-info)' },
  warning: { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning-fg)', dot: 'var(--color-warning)' },
  success: { bg: 'var(--color-success-soft)', fg: 'var(--color-success-fg)', dot: 'var(--color-success)' },
  error:   { bg: 'var(--color-error-soft)', fg: 'var(--color-error-fg)', dot: 'var(--color-error)' },
};

/** Badge/pill de estado: punto + texto (nunca solo color, AA §5.7). */
export function badge(label, tone = 'neutral', withDot = true) {
  const t = TONES[tone] || TONES.neutral;
  return `<span class="badge" style="background:${t.bg};color:${t.fg};">${withDot ? `<span class="dot" style="background:${t.dot};"></span>` : ''}${esc(label)}</span>`;
}

/** Contador en pill. */
export function countPill(n, tone = 'neutral') {
  const t = TONES[tone] || TONES.neutral;
  return `<span class="badge-count tnum" style="background:${t.bg};color:${t.fg};">${n}</span>`;
}

/** Estado vacío que guía a la acción (§9 UX-6). */
export function emptyState(iconName, title, sub) {
  return `<div class="state"><div class="state-icon">${icon(iconName, { size: 26 })}</div>
    <div class="state-title">${esc(title)}</div>
    ${sub ? `<div class="state-sub">${esc(sub)}</div>` : ''}</div>`;
}

/** Estado de carga (skeleton). */
export function loadingState(rows = 3) {
  let html = '<div class="state-load" aria-busy="true" aria-label="Cargando">';
  for (let i = 0; i < rows; i++) html += `<div class="skeleton" style="height:84px;border-radius:var(--radius-md);margin-bottom:14px;"></div>`;
  return html + '</div>';
}

/** Estado de error con reintento. */
export function errorState(msg, retryAction) {
  return `<div class="state"><div class="state-icon" style="background:var(--color-error-soft);color:var(--color-error);">${icon('alert', { size: 26 })}</div>
    <div class="state-title">Algo falló</div>
    <div class="state-sub">${esc(msg || 'No pudimos cargar esta sección.')}</div>
    ${retryAction ? `<button class="btn btn-secondary btn-sm" data-action="${esc(retryAction)}" style="margin-top:16px;">Reintentar</button>` : ''}</div>`;
}

/** Toast global (se monta fuera del root de la app). */
export function toastHtml(msg) {
  if (!msg) return '';
  return `<div class="toast" role="status">${icon('checkCircle', { size: 18 })}<span>${esc(msg)}</span></div>`;
}

/** Overlay + modal genérico. `body` es HTML. closeAction es el data-action de cierre. */
export function modal(body, closeAction) {
  return `<div class="modal-overlay" data-action="${esc(closeAction)}" data-overlay="1">
    <div class="modal" role="dialog" aria-modal="true" data-stop="1">${body}</div>
  </div>`;
}
