// js/utils.js — Utilidades puras, motor de comisiones y helpers de UI
import { PLANES } from './planes.js';

// ── Fechas ──
export function todayStr()     { return new Date().toISOString().slice(0, 10); }
export function nowTimeStr()   { const n = new Date(); return n.getHours().toString().padStart(2, '0') + ':' + n.getMinutes().toString().padStart(2, '0'); }
export function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  const mo = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${d} ${mo[parseInt(m) - 1]} ${y}`;
}
export function formatDateLong(str) {
  if (!str) return '';
  return new Date(str + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
}
export function addDays(str, n) {
  const d = new Date(str + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── Plantillas: reemplazo de variables {{...}} ──
// Centraliza el llenado de plantillas (WhatsApp y futuros canales).
// `target` = lead / cita / venta. `ctx` = { asesor, cargo, filial, ... }.
// Soporta alias en español para que el usuario use el nombre natural de la variable.
export function buildMessage(tmpl, target = {}, ctx = {}) {
  const nombreCompleto = `${target.nombre || ''} ${target.apellido || ''}`.trim();
  const map = {
    // Cliente
    nombre:    nombreCompleto,
    cliente:   nombreCompleto,
    apellido:  target.apellido || '',
    telefono:  target.telefono || '',
    email:     target.email || '',
    correo:    target.email || '',
    empresa:   target.empresa || '',
    ciudad:    target.ciudad || '',
    // Cita
    fecha:     formatDate(target.fecha),
    hora:      target.hora || '',
    zoom:      target.zoomLink || 'sin link',
    // Comercial — plan/producto/interés son sinónimos
    plan:      target.plan || target.interes || '',
    producto:  target.interes || target.plan || '',
    interes:   target.interes || target.plan || '',
    // Asesor (alias: ejecutivo)
    asesor:    ctx.asesor || '',
    ejecutivo: ctx.asesor || '',
    cargo:     ctx.cargo || '',
    filial:    ctx.filial || ''
  };
  return String(tmpl || '')
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (full, key) => {
      const k = key.toLowerCase();
      return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : '';
    });
}

// ── Mayúsculas automáticas ──
// Aplica MAYÚSCULAS a inputs de texto al perder el foco (no a textareas).
// Excluye correos, URLs y campos técnicos. Configurable por el usuario.
const _UPPER_SKIP_TYPES = ['email', 'url', 'password', 'number', 'date', 'time', 'tel', 'search', 'color', 'range', 'file', 'checkbox', 'radio'];
function _isUpperEligible(el) {
  if (!el || el.tagName !== 'INPUT') return false;
  const t = (el.getAttribute('type') || 'text').toLowerCase();
  if (_UPPER_SKIP_TYPES.includes(t)) return false;
  if (el.hasAttribute('data-no-upper')) return false;
  const idn = ((el.id || '') + ' ' + (el.name || '')).toLowerCase();
  if (/mail|correo|url|link|zoom|http|web|password|clave/.test(idn)) return false;
  return true;
}
let _upperBound = false;
export function initAutoUpper(enabled) {
  document.body.classList.toggle('auto-upper', !!enabled);
  if (_upperBound) return;          // el listener se registra una sola vez
  _upperBound = true;
  document.addEventListener('focusout', e => {
    if (!document.body.classList.contains('auto-upper')) return;
    const el = e.target;
    if (!_isUpperEligible(el)) return;
    if (el.value.includes('@')) return;   // seguridad: parece email
    const up = el.value.toLocaleUpperCase('es');
    if (up !== el.value) el.value = up;
  });
}

// ── Moneda y formato ──
export function fmtMoney(n) {
  if (n == null) return '—';
  return '$' + Math.round(n).toLocaleString('es-CL');
}

// ── HTML ──
export function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
export function getInitials(a, b = '') {
  const n = (a || '').trim(), m = (b || '').trim();
  if (n && m) return (n[0] + m[0]).toUpperCase();
  return n ? n.slice(0, 2).toUpperCase() : '??';
}
export function avatarColor(s) {
  const c = ['#3B82F6','#8B5CF6','#EC4899','#F97316','#22C55E','#06B6D4','#EF4444','#F59E0B'];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return c[h % c.length];
}
export function statusBadgeClass(e) {
  const m = {
    'Pendiente': 'pendiente', 'Asistió': 'asistio', 'No asistió': 'noasistio',
    'Contrató': 'contrato', 'No interesado': 'nointeresado', 'Reagendada': 'reagendada',
    'Nuevo': 'nuevo', 'Contactado': 'contactado', 'Seguimiento': 'seguimiento',
    'Venta cerrada': 'cerrado', 'Perdido': 'perdido', 'Cita agendada': 'pendiente',
    'Confirmado': 'contactado', 'Intento de contacto': 'nointeresado', 'Propuesta enviada': 'contactado'
  };
  return 'badge badge-' + (m[e] || 'nuevo');
}
export function statusDotColor(e) {
  const m = { 'Pendiente': '#F59E0B', 'Asistió': '#22C55E', 'No asistió': '#EF4444', 'Contrató': '#3B82F6', 'No interesado': '#94A3B8', 'Reagendada': '#8B5CF6' };
  return m[e] || '#94A3B8';
}
export function avatarHtml(nombre, apellido, foto, size = 36) {
  const bg = avatarColor((nombre || '') + (apellido || '')), init = getInitials(nombre, apellido);
  if (foto) return `<div class="lead-avatar" style="width:${size}px;height:${size}px"><img src="${foto}" alt=""></div>`;
  return `<div class="lead-avatar" style="width:${size}px;height:${size}px;background:${bg}">${init}</div>`;
}

// ── Feedback ──
export function toast(msg, type = '') {
  const c = document.getElementById('toast-container'), t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
export function vibrate(ms = 40) { if (navigator.vibrate) navigator.vibrate(ms); }
export function showFileError(msg, emoji = '😅') {
  document.getElementById('fileErrorEmoji').textContent = emoji;
  document.getElementById('fileErrorMsg').textContent = msg;
  document.getElementById('fileErrorOverlay').classList.remove('hidden');
}

// ── Motor de comisiones (semanas Lun-Dom) ──
export function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();           // 0=Dom, 1=Lun...
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon.toISOString().slice(0, 10);
}
export function isContadoPlan(planId) {
  // Data-driven: usa la bandera esContado del catálogo; fallback compatible con datos antiguos.
  const p = PLANES.find(x => x.id === planId);
  if (p) return !!p.esContado;
  return planId === 'contado' || planId === 'convenio_contado';
}
export function groupByWeek(salesArr) {
  const g = {};
  salesArr.forEach(s => {
    const k = getWeekStart(s.fecha);
    if (!g[k]) g[k] = [];
    g[k].push(s);
  });
  return g;
}
export function calcIncentiveSemanal(weekSales) {
  const contados = weekSales.filter(s => isContadoPlan(s.plan)).length;
  const total    = weekSales.length;
  let bC = 0;
  if (contados >= 5) bC = 325000; else if (contados >= 3) bC = 145000; else if (contados >= 2) bC = 90000;
  let bG = 0;
  if (total >= 5) bG = 125000; else if (total >= 3) bG = 60000; else if (total >= 2) bG = 30000;
  return { bC, bG, bono: Math.max(bC, bG), contados, total };
}
export function calcBPI(totalMat) {
  if (totalMat >= 13) return totalMat * 23000;
  if (totalMat >= 10) return totalMat * 21000;
  if (totalMat >= 6)  return totalMat * 20000;
  return 0;
}
export function calcMedallasSemanales(weekSales) { return Math.floor(weekSales.length / 4); }
export function calcTotalMedallas(allSales) {
  const g = groupByWeek(allSales);
  return Object.values(g).reduce((acc, ws) => acc + calcMedallasSemanales(ws), 0);
}
export function calcNivel(totalMedallas) { return Math.floor(totalMedallas / 5); }

// ── Nombre de nivel (cosmético) — Bronze/Silver/Gold/Platino/Diamante × I-III ──
const _TIERS = [
  { nombre: 'Bronze',   color: '#B45309' },
  { nombre: 'Silver',   color: '#64748B' },
  { nombre: 'Gold',     color: '#D97706' },
  { nombre: 'Platino',  color: '#0EA5E9' },
  { nombre: 'Diamante', color: '#8B5CF6' }
];
const _ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
export function nivelInfo(nivel = 0) {
  const idx = Math.min(Math.floor(nivel / 3), _TIERS.length - 1);
  const tier = _TIERS[idx];
  const sub = idx === _TIERS.length - 1 ? nivel - idx * 3 : nivel % 3; // Diamante sigue subiendo
  return { tier: tier.nombre, color: tier.color, sub: _ROMAN[Math.min(sub, _ROMAN.length - 1)],
           nombre: `${tier.nombre} ${_ROMAN[Math.min(sub, _ROMAN.length - 1)]}` };
}

// ── Mejor día de la semana (por nº de ventas) ──
export function mejorDiaSemana(allSales, weekStart) {
  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  let best = { dia: null, cierres: 0 };
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const n = allSales.filter(s => s.fecha === d).length;
    if (n > best.cierres) best = { dia: dias[i], cierres: n };
  }
  return best;
}

// ── Leads calientes: Seguimiento/Propuesta enviada con actividad ≤ N días ──
export function leadsCalientes(allLeads, dias = 5) {
  const limite = Date.now() - dias * 86400000;
  const calientes = ['Seguimiento', 'Propuesta enviada'];
  return (allLeads || []).filter(l => {
    if (!calientes.includes(l.estado)) return false;
    const ref = l.fechaActualizacion || l.fechaCreacion;
    return ref ? new Date(ref).getTime() >= limite : false;
  });
}
export function calcMonthComision(allSales, year, month, debutActivo = false, PLANES = []) {
  const prefix  = `${year}-${String(month).padStart(2, '0')}`;
  const thisMo  = allSales.filter(s => s.fecha.startsWith(prefix));
  const comisiones = thisMo.reduce((a, s) => {
    const p = PLANES.find(x => x.id === s.plan);
    return a + (p?.comision || 0);
  }, 0);
  const weekGroups = groupByWeek(thisMo);
  let incentivos = 0;
  const weekDetails = [];
  Object.entries(weekGroups).sort().forEach(([wk, ws]) => {
    const inc = calcIncentiveSemanal(ws);
    incentivos += inc.bono;
    weekDetails.push({ wk, sales: ws, contados: inc.contados, total: inc.total, bC: inc.bC, bG: inc.bG, bono: inc.bono });
  });
  const bpi          = calcBPI(thisMo.length);
  const conectividad = 40000;
  const debut        = debutActivo ? 20000 : 0;
  const total        = comisiones + incentivos + bpi + conectividad + debut;
  return { comisiones, incentivos, bpi, conectividad, debut, total, thisMo, weekDetails };
}

// Proyección "what-if": calcula el sueldo mensual a partir de una grilla
// de ventas planificadas por semana (no toca datos reales). Reusa el mismo
// motor de bonos semanales (calcIncentiveSemanal) y BPI mensual (calcBPI)
// que rige las ventas reales, por lo que la simulación es consistente.
// weekGrid: Array<Record<planId, cantidad>>
export function calcProjection(weekGrid, PLANES = [], debutActivo = false) {
  const comByPlan = id => (PLANES.find(p => p.id === id)?.comision || 0);
  let comisiones = 0, incentivos = 0, totalVentas = 0;
  const weeks = (weekGrid || []).map(week => {
    const sales = [];
    let comSemana = 0;
    Object.entries(week || {}).forEach(([planId, qty]) => {
      const n = Math.max(0, parseInt(qty) || 0);
      comSemana += comByPlan(planId) * n;
      for (let i = 0; i < n; i++) sales.push({ plan: planId });
    });
    const inc = calcIncentiveSemanal(sales);
    comisiones  += comSemana;
    incentivos  += inc.bono;
    totalVentas += sales.length;
    return { comSemana, ventas: sales.length, contados: inc.contados,
             noContados: sales.length - inc.contados, bono: inc.bono, bC: inc.bC, bG: inc.bG };
  });
  const bpiRate      = totalVentas >= 13 ? 23000 : totalVentas >= 10 ? 21000 : totalVentas >= 6 ? 20000 : 0;
  const bpi          = calcBPI(totalVentas);
  const conectividad = 40000;
  const debut        = debutActivo ? 20000 : 0;
  const total        = comisiones + incentivos + bpi + conectividad + debut;
  return { weeks, comisiones, incentivos, bpi, bpiRate, conectividad, debut, total, totalVentas };
}

// ── Time Picker (UI helper, sin dependencia de módulo) ──
export function timeSlots() {
  const s = [];
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 22 && m > 0) break;
      s.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return s;
}
export function renderTimePicker(id, val = '09:00') {
  return `<div class="time-picker-wrap" id="twrap_${id}">
    <input class="form-input tp-input" id="${id}" value="${val}" readonly placeholder="HH:MM">
    <div class="tp-dropdown hidden" id="tdd_${id}">
      ${timeSlots().map(s => `<button type="button" class="tp-btn${s === val ? ' selected' : ''}" data-t="${s}">${s}</button>`).join('')}
    </div>
  </div>`;
}
export function initTimePicker(id) {
  const inp = document.getElementById(id);
  const dd  = document.getElementById('tdd_' + id);
  if (!inp || !dd) return;
  inp.addEventListener('click', e => {
    e.stopPropagation();
    dd.classList.toggle('hidden');
    const sel = dd.querySelector('.tp-btn.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  });
  dd.addEventListener('click', e => {
    const btn = e.target.closest('.tp-btn');
    if (!btn) return;
    inp.value = btn.dataset.t;
    dd.querySelectorAll('.tp-btn').forEach(b => b.classList.toggle('selected', b === btn));
    dd.classList.add('hidden');
    inp.dispatchEvent(new Event('change'));
  });
  document.addEventListener('click', e => {
    const wrap = document.getElementById('twrap_' + id);
    if (wrap && !wrap.contains(e.target)) dd.classList.add('hidden');
  });
}
