// modules/ai-commander/presentation/ui.js
// ── Capa de PRESENTACIÓN · helpers de UI compartidos del módulo ──────────────
import { escHtml, formatDate } from '../../../js/utils.js';
import { findProjectState, findTaskColumn, findPriority, AI_RESPONSE_STATES } from '../domain/entities.js';

export { escHtml, formatDate };

// Iconos inline (sin dependencias), mismo estilo que el resto del CRM.
export const ICONS = {
  dashboard: `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 3h6v8H3V3zm0 10h6v4H3v-4zm8 4h6V9h-6v8zm0-14v4h6V3h-6z"/></svg>`,
  project:   `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>`,
  board:     `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 3h4v14H3V3zm5 0h4v9H8V3zm5 0h4v6h-4V3z"/></svg>`,
  prompt:    `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v7a2 2 0 01-2 2h-5l-4 3v-3H4a2 2 0 01-2-2V5z" clip-rule="evenodd"/></svg>`,
  history:   `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.5 2.5a1 1 0 001.414-1.414L11 9.586V6z" clip-rule="evenodd"/></svg>`,
  robot:     `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 112 0v1h2a3 3 0 013 3v1a2 2 0 012 2v3a2 2 0 01-2 2v1a3 3 0 01-3 3H7a3 3 0 01-3-3v-1a2 2 0 01-2-2V9a2 2 0 012-2V6a3 3 0 013-3h2V2zm-1 8a1 1 0 100 2 1 1 0 000-2zm4 0a1 1 0 100 2 1 1 0 000-2z"/></svg>`,
  orquesta:  `<svg viewBox="0 0 20 20" fill="currentColor"><circle cx="10" cy="4" r="2"/><circle cx="4" cy="14.5" r="2"/><circle cx="10" cy="14.5" r="2"/><circle cx="16" cy="14.5" r="2"/><path d="M10 6v3M9 9l-4 4M11 9l4 4M10 9v4" stroke="currentColor" stroke-width="1.1"/></svg>`,
  add:       `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/></svg>`,
  edit:      `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>`,
  trash:     `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
  archive:   `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 00-2 2v1h16V5a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 2a1 1 0 100 2h4a1 1 0 100-2H8z" clip-rule="evenodd"/></svg>`,
  play:      `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/></svg>`,
  link:      `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5z"/><path d="M5.586 9.586a2 2 0 012.828 0 1 1 0 001.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"/></svg>`,
};

// ── Badges ────────────────────────────────────────────────────────────────────
export function projectStateBadge(estado) {
  const s = findProjectState(estado);
  return `<span class="badge" style="color:${s.color};background:${s.color}1a;border-color:${s.color}55">${s.icon} ${escHtml(s.label)}</span>`;
}
export function priorityBadge(prioridad) {
  const p = findPriority(prioridad);
  return `<span class="badge" style="color:${p.color};background:${p.color}1a;border-color:${p.color}55">${escHtml(p.label)}</span>`;
}
export function taskColumnDot(estado) {
  const c = findTaskColumn(estado);
  return `<span style="color:${c.color}">${c.icon}</span>`;
}
export function aiStateBadge(estado) {
  const s = AI_RESPONSE_STATES.find(x => x.id === estado) || AI_RESPONSE_STATES[0];
  return `<span class="badge" style="color:${s.color};background:${s.color}1a;border-color:${s.color}55">${escHtml(s.label)}</span>`;
}

// ── Fragmentos reutilizables ──────────────────────────────────────────────────
export function progressBar(pct, color = 'var(--primary)') {
  const v = Math.max(0, Math.min(100, pct || 0));
  return `<div class="score-bar" style="height:8px"><div class="score-fill" style="width:${v}%;background:${color}"></div></div>`;
}

export function stackChips(stack = []) {
  if (!stack.length) return '';
  return stack.map(s => `<span class="aic-chip">${escHtml(s)}</span>`).join('');
}

export function emptyState(icon, title, msg, actionHtml = '') {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${escHtml(title)}</h3><p>${escHtml(msg)}</p>${actionHtml}</div>`;
}

/** Aviso persistente de que la IA está en modo arquitectura (sin backend). */
export function aiArchitectureBanner(message) {
  return `<div class="aic-banner">${ICONS.robot}<div><strong>IA en modo arquitectura</strong><br><span>${escHtml(message)}</span></div></div>`;
}

/** Aviso cuando falta correr la migración SQL del módulo. */
export function setupNotice() {
  return `<div class="view-animate">${emptyState('🗄️',
    'Falta preparar la base de datos',
    'El módulo Director de Orquesta necesita sus tablas. Corre supabase/ai_commander.sql en el SQL Editor de Supabase y recarga.',
    '')}</div>`;
}
