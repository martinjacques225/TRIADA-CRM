// modules/diagnostico-contable/presentation/ui.js
// Piezas de UI compartidas del módulo. SOLO render: las reglas viven en domain/.
// Todo lo que viene de la base pasa por escHtml antes de tocar innerHTML.

import { escHtml, formatCLP, formatDate } from '../../../js/utils.js';
import { estadoMeta, estadoLabel } from '../domain/estados.js';
import { nivelMeta } from '../domain/puntaje.js';

export const esc = escHtml;
export const i = (n, s = 16) => (typeof window !== 'undefined' && window.icon ? window.icon(n, '', s) : '');

export const clp = (n) => (n == null || n === '' ? '—' : formatCLP(Math.round(Number(n) || 0)));
export const fecha = (v) => (v ? formatDate(v) : '—');

export function fechaHora(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago',
  });
}

/** Monto en la moneda declarada (CLP o UF). La UF no se convierte: se muestra. */
export function monto(valor, moneda = 'clp') {
  if (valor == null || valor === '') return '—';
  const n = Number(valor) || 0;
  return moneda === 'uf'
    ? `${n.toLocaleString('es-CL', { maximumFractionDigits: 2 })} UF`
    : formatCLP(Math.round(n));
}

export const uf = (n) => (n == null ? null : `${Number(n).toLocaleString('es-CL', { maximumFractionDigits: 2 })} UF`);

export function badgeEstado(estado) {
  const m = estadoMeta(estado);
  const color = m?.color || 'var(--text2)';
  return `<span class="dct-badge" style="color:${color};border-color:${color}">${esc(estadoLabel(estado))}</span>`;
}

export function chipRiesgo(nivelId) {
  const n = nivelMeta(nivelId);
  if (!n) return '<span class="dct-chip dct-chip--mute">Sin evaluar</span>';
  return `<span class="dct-chip" style="color:${n.color};background:color-mix(in srgb,${n.color} 12%,transparent)">${esc(n.label)}</span>`;
}

/** Barra de puntaje 0-100. `null` = todavía no hay puntaje (no es 0). */
export function barraPuntaje(puntaje, { compacta = false } = {}) {
  if (puntaje == null) return '<span class="dct-punt dct-punt--vacio">Sin puntaje</span>';
  const p = Math.max(0, Math.min(100, Number(puntaje)));
  const color = nivelMeta(_nivelDe(p))?.color || 'var(--text2)';
  return `<span class="dct-punt${compacta ? ' dct-punt--sm' : ''}">
    <span class="dct-punt__num" style="color:${color}">${p}</span>
    <span class="dct-punt__bar"><span style="width:${p}%;background:${color}"></span></span>
  </span>`;
}
const _nivelDe = (p) => (p >= 85 ? 'favorable' : p >= 70 ? 'observaciones' : p >= 50 ? 'relevante' : 'alto');

/** Anillo de puntaje para la pantalla de resultado. */
export function anilloPuntaje(puntaje, label = 'Puntaje general') {
  const p = puntaje == null ? 0 : Math.max(0, Math.min(100, Number(puntaje)));
  const color = puntaje == null ? 'var(--text2)' : (nivelMeta(_nivelDe(p))?.color || 'var(--text2)');
  const r = 52, circ = 2 * Math.PI * r;
  const dash = (p / 100) * circ;
  return `<div class="dct-anillo">
    <svg viewBox="0 0 120 120" width="128" height="128" role="img" aria-label="${esc(label)}: ${puntaje == null ? 'sin puntaje' : p + ' de 100'}">
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--border)" stroke-width="9"/>
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round"
        stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 60 60)" class="dct-anillo__arco"/>
    </svg>
    <div class="dct-anillo__centro">
      <div class="dct-anillo__num" style="color:${color}">${puntaje == null ? '—' : p}</div>
      <div class="dct-anillo__lbl">${esc(label)}</div>
    </div>
  </div>`;
}

export function kpi(label, valor, sub, icono, color = 'var(--dct-teal)', bg = 'var(--dct-teal-l)') {
  return `<div class="kpi-card dct-kpi" style="--accent:${color}">
    <div class="kpi-top"><span class="kpi-label">${esc(label)}</span>
      <span class="kpi-ic" style="background:${bg};color:${color}">${i(icono)}</span></div>
    <div class="kpi-value kpi-value-sm">${valor}</div>
    ${sub ? `<div class="kpi-sub">${esc(sub)}</div>` : ''}
  </div>`;
}

export function vacio(titulo, detalle = '', accion = '') {
  return `<div class="dct-empty">
    <div class="dct-empty__ic">${i('clipCheck', 26)}</div>
    <div class="dct-empty__t">${esc(titulo)}</div>
    ${detalle ? `<div class="dct-empty__d">${esc(detalle)}</div>` : ''}
    ${accion || ''}
  </div>`;
}

export const cargando = (txt = 'Cargando…') =>
  `<div class="dct-loading" role="status" aria-live="polite">${esc(txt)}</div>`;

export function bannerSql(mensaje) {
  return `<div class="dct-banner dct-banner--warn">
    ${i('alert', 18)}
    <div><strong>El módulo todavía no tiene su base de datos.</strong>
    Aplica la migración <code>supabase/diagnostico_contable_f1.sql</code> en Supabase
    (SQL Editor → New query → Run) y vuelve a entrar. El Diagnóstico 360 no se ve afectado.
    <span class="dct-banner__err">${esc(mensaje || '')}</span></div>
  </div>`;
}

export function aviso(nivel, texto) {
  const color = nivel === 'critico' ? 'var(--danger)' : nivel === 'alto' ? 'var(--amber)' : 'var(--dct-teal)';
  return `<div class="dct-aviso" style="border-left-color:${color}">${esc(texto)}</div>`;
}

/** Tarjeta de alerta prioritaria (resultado e informe). */
export function tarjetaAlerta(a) {
  const color = a.nivel === 'critico' ? 'var(--danger)' : 'var(--amber)';
  return `<div class="dct-alerta" style="--al:${color}">
    <div class="dct-alerta__head">
      <span class="dct-alerta__ic">${i('alert', 15)}</span>
      <span class="dct-alerta__t">${esc(a.titulo)}</span>
      <span class="dct-alerta__n">${a.nivel === 'critico' ? 'Prioritaria' : 'Advertencia'}</span>
    </div>
    <p class="dct-alerta__d">${esc(a.detalle)}</p>
  </div>`;
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

export function campo(label, control, hint = '', { requerido = false, col = 1 } = {}) {
  return `<div class="form-group dct-campo${col === 2 ? ' dct-campo--ancho' : ''}">
    <label>${esc(label)}${requerido ? ' <span class="dct-req" aria-hidden="true">*</span>' : ''}</label>
    ${control}
    ${hint ? `<div class="form-hint">${esc(hint)}</div>` : ''}
  </div>`;
}

/** Barra de progreso del levantamiento. */
export function barraProgreso(pct, texto) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  return `<div class="dct-progreso">
    <div class="dct-progreso__track" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100" aria-label="Avance del diagnóstico">
      <div class="dct-progreso__fill" style="width:${p}%"></div>
    </div>
    <span class="dct-progreso__lbl">${esc(texto)}</span>
  </div>`;
}
