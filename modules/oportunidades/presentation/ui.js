// modules/oportunidades/presentation/ui.js — Piezas de UI compartidas del módulo.
//
// Solo render: nada de reglas de negocio (esas viven en domain/, testeadas).
// Todo lo que viene de la base pasa por escHtml antes de tocar innerHTML.

import { escHtml, formatCLP } from '../../../js/utils.js';
import { estadoMeta, estadoLabel } from '../domain/estados.js';
import { horasHastaCierre } from '../domain/alertas.js';

export const esc = escHtml;
export const i = (n, s = 16) => (typeof window !== 'undefined' && window.icon ? window.icon(n, '', s) : '');

export const clp = (n) => (n == null || n === '' ? '—' : formatCLP(Math.round(Number(n) || 0)));
export const pctTxt = (f) => (f == null ? '—' : `${Math.round(f * 1000) / 10}%`);

/** Fecha corta en zona Chile. El CRM trabaja en America/Santiago. */
export function fecha(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Santiago' });
}

export function fechaHora(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });
}

/** Cuenta regresiva al cierre, con el nivel de urgencia para pintarla. */
export function cuentaRegresiva(fechaCierre, ahora = Date.now()) {
  const h = horasHastaCierre(fechaCierre, ahora);
  if (h == null) return { texto: 'Sin fecha de cierre', nivel: 'nulo', color: 'var(--text3)' };
  if (h < 0)   return { texto: 'Cerrado', nivel: 'vencido', color: 'var(--text3)' };
  if (h < 1)   return { texto: `${Math.max(1, Math.round(h * 60))} min`, nivel: 'critico', color: 'var(--danger)' };
  if (h < 24)  return { texto: `${Math.round(h)} h`, nivel: 'critico', color: 'var(--danger)' };
  if (h < 72)  return { texto: `${Math.floor(h / 24)} d ${Math.round(h % 24)} h`, nivel: 'alto', color: 'var(--amber)' };
  return { texto: `${Math.floor(h / 24)} días`, nivel: 'ok', color: 'var(--text2)' };
}

export function badgeEstado(estado) {
  const m = estadoMeta(estado);
  const color = m?.color || 'var(--text3)';
  return `<span class="op-badge" style="color:${color};border-color:${color}">${esc(estadoLabel(estado))}</span>`;
}

const REC = {
  participar:    { label: 'Participar',    color: 'var(--green)' },
  revisar:       { label: 'Revisar',       color: 'var(--amber)' },
  no_participar: { label: 'No participar', color: 'var(--danger)' },
};
export function chipRecomendacion(rec) {
  const r = REC[rec];
  if (!r) return '<span class="op-chip op-chip--mute">Sin evaluar</span>';
  return `<span class="op-chip" style="color:${r.color};background:color-mix(in srgb,${r.color} 12%,transparent)">${r.label}</span>`;
}

/** Barra de puntaje 0-100. `null` = todavía no se puntúa (no es 0). */
export function barraPuntaje(puntaje, { participar = 70, revisar = 55 } = {}) {
  if (puntaje == null) return '<span class="op-punt op-punt--vacio">Sin puntuar</span>';
  const p = Math.max(0, Math.min(100, Number(puntaje)));
  const color = p >= participar ? 'var(--green)' : p >= revisar ? 'var(--amber)' : 'var(--danger)';
  return `<span class="op-punt"><span class="op-punt__num" style="color:${color}">${p}</span>
    <span class="op-punt__bar"><span style="width:${p}%;background:${color}"></span></span></span>`;
}

export function kpi(label, valor, sub, icono, color = 'var(--primary)', bg = 'var(--primary-l)') {
  return `<div class="kpi-card">
    <div class="kpi-top"><span class="kpi-label">${esc(label)}</span><span class="kpi-ic" style="background:${bg};color:${color}">${i(icono)}</span></div>
    <div class="kpi-value kpi-value-sm">${valor}</div>
    ${sub ? `<div class="kpi-sub">${esc(sub)}</div>` : ''}
  </div>`;
}

export function vacio(titulo, detalle = '', accion = '') {
  return `<div class="op-empty">
    <div class="op-empty__ic">${i('search', 26)}</div>
    <div class="op-empty__t">${esc(titulo)}</div>
    ${detalle ? `<div class="op-empty__d">${esc(detalle)}</div>` : ''}
    ${accion || ''}
  </div>`;
}

export const cargando = (txt = 'Cargando…') => `<div class="op-loading">${esc(txt)}</div>`;

export function bannerSql(mensaje) {
  return `<div class="op-banner op-banner--warn">
    ${i('alert', 18)}
    <div><strong>El módulo todavía no tiene su base de datos.</strong>
    Aplica la migración <code>supabase/oportunidades_f1.sql</code> en Supabase (SQL Editor → New query → Run)
    y vuelve a entrar. <span class="op-banner__err">${esc(mensaje || '')}</span></div>
  </div>`;
}

export function aviso(tipo, texto) {
  const color = tipo === 'critico' ? 'var(--danger)' : tipo === 'alto' ? 'var(--amber)' : 'var(--primary)';
  return `<div class="op-aviso" style="border-left-color:${color}">${esc(texto)}</div>`;
}

/** <select> con opciones {v,label} o strings. */
export function select(id, opciones, valor, { vacio: txtVacio = '— Selecciona —', attrs = '' } = {}) {
  const ops = opciones.map((o) => {
    const v = typeof o === 'string' ? o : o.v;
    const l = typeof o === 'string' ? o : o.label;
    return `<option value="${esc(v)}"${String(valor ?? '') === String(v) ? ' selected' : ''}>${esc(l)}</option>`;
  }).join('');
  return `<select id="${esc(id)}" ${attrs}>${txtVacio ? `<option value="">${esc(txtVacio)}</option>` : ''}${ops}</select>`;
}

export function campo(label, control, hint = '') {
  return `<div class="form-group"><label>${esc(label)}</label>${control}${hint ? `<div class="form-hint">${esc(hint)}</div>` : ''}</div>`;
}
