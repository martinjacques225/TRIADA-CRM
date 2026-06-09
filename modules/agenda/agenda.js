// modules/agenda/agenda.js
import { appointments } from '../../services/appointment.service.js';
import { leads } from '../../services/lead.service.js';
import { S } from '../../js/state.js';
import { todayStr, nowTimeStr, formatDate, escHtml, statusBadgeClass } from '../../js/utils.js';

// Iconos locales (hasta Etapa 4)
const _ico = {
  calendar: `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"/></svg>`,
  chart:    `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg>`,
  phone:    `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>`,
  list:     `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
  zoom:     `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/></svg>`,
  edit:     `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>`,
  reschedule:`<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>`,
  money:    `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd"/></svg>`,
  plus:     `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>`,
  trash:    `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
  undo:     `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a5 5 0 010 10h-1a1 1 0 110-2h1a3 3 0 100-6H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`,
  dots:     `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a1.6 1.6 0 100-3.2A1.6 1.6 0 0010 6zm0 5.6a1.6 1.6 0 100-3.2 1.6 1.6 0 000 3.2zm0 5.6a1.6 1.6 0 100-3.2 1.6 1.6 0 000 3.2z"/></svg>`,
  search:   `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>`
};

export async function render() {
  const center  = document.getElementById('center');
  const toggle  = _viewToggle();

  // ── Vista Calendario (tipo Google Calendar) ──
  if (S.agendaView === 'calendario') {
    center.innerHTML = `<div class="view-animate">${toggle}${await _buildCalendar()}</div>`;
    center.style.position = 'relative';
    _wireToggle();
    _wireCalendar();
    return;
  }

  // ── Vista Agenda (lista del día) ──
  const q = S.agendaSearch.trim();
  const searchBar = _searchBar();

  // Modo búsqueda: citas de todas las fechas que coincidan
  if (q) {
    const res = await appointments.search(q);
    res.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    const listHtml = res.length === 0
      ? `<div class="empty-day">${_ico.search}<h3>Sin resultados</h3><p>No hay citas que coincidan con "${escHtml(q)}".</p></div>`
      : `<div class="apt-search-count">${res.length} cita${res.length !== 1 ? 's' : ''} encontrada${res.length !== 1 ? 's' : ''}</div>
         <div class="apt-list">${res.map(a => `<div class="apt-search-date">${formatDate(a.fecha)}</div>${_buildCard(a)}`).join('')}</div>`;
    center.innerHTML = `<div class="view-animate">${toggle}${searchBar}${listHtml}</div>`;
    center.style.position = 'relative';
    window._app?.attachCardEvents?.();
    _wireToggle(); _wireSearch(); _wireMenus();
    return;
  }

  const appts   = await appointments.getByDate(S.date);
  appts.sort((a, b) => a.hora.localeCompare(b.hora));
  const isToday = S.date === todayStr();
  const nowStr  = nowTimeStr();

  const top = await _buildTop(appts, isToday, nowStr);

  let listHtml;
  if (appts.length === 0) {
    listHtml = `<div class="empty-day">${_ico.calendar}<h3>Sin citas este día</h3><p>Usa "Nueva cita", o revisa tus pendientes arriba.</p></div>`;
  } else {
    let nowDone = !isToday;
    listHtml = `<div class="apt-list">${appts.map(a => {
      let marker = '';
      if (!nowDone && a.hora >= nowStr) { marker = `<div class="apt-now"><span>Ahora · ${nowStr}</span></div>`; nowDone = true; }
      return marker + _buildCard(a);
    }).join('')}${!nowDone ? `<div class="apt-now"><span>Ahora · ${nowStr}</span></div>` : ''}</div>`;
  }

  center.innerHTML = `<div class="view-animate">${toggle}${searchBar}${top}${listHtml}</div>`;
  center.style.position = 'relative';
  window._app?.attachCardEvents?.();
  document.querySelectorAll('[data-goleads]').forEach(el =>
    el.addEventListener('click', () => window._app?.navigate?.('leads')));
  _wireToggle();
  _wireSearch();
  _wireMenus();
}

// Buscador de citas (todas las fechas)
function _searchBar() {
  return `<div class="search-input-wrap agenda-search">${_ico.search}<input class="search-input" id="agendaSearch" placeholder="Buscar cita por nombre, teléfono, interés..." value="${escHtml(S.agendaSearch)}"></div>`;
}
function _wireSearch() {
  const inp = document.getElementById('agendaSearch');
  if (!inp) return;
  inp.addEventListener('input', e => {
    const pos = e.target.selectionStart;
    S.agendaSearch = e.target.value;
    render().then(() => {
      const n = document.getElementById('agendaSearch');
      if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch {} }
    });
  });
}

// Conmutador Agenda / Calendario
function _viewToggle() {
  return `<div class="agenda-view-toggle">
    <button class="av-btn${S.agendaView !== 'calendario' ? ' active' : ''}" data-av="agenda">${_ico.list} Agenda</button>
    <button class="av-btn${S.agendaView === 'calendario' ? ' active' : ''}" data-av="calendario">${_ico.calendar} Calendario</button>
  </div>`;
}
function _wireToggle() {
  document.querySelectorAll('.av-btn').forEach(b =>
    b.addEventListener('click', () => { S.agendaView = b.dataset.av; render(); window._app?.refreshView?.(); }));
}

// Grilla mensual con citas por día
async function _buildCalendar() {
  const month = S.calMonth || S.date.slice(0, 7);
  S.calMonth = month;
  const [y, m] = month.split('-').map(Number);
  const all = await appointments.getAll();
  const counts = {};
  all.forEach(a => { if (a.estado !== 'Reagendada') counts[a.fecha] = (counts[a.fecha] || 0) + 1; });

  const first = new Date(y, m - 1, 1);
  const startCol = (first.getDay() + 6) % 7;            // lunes = 0
  const daysInMonth = new Date(y, m, 0).getDate();
  const monthName = first.toLocaleDateString('es', { month: 'long', year: 'numeric' });
  const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const today = todayStr();

  let cells = '';
  for (let i = 0; i < startCol; i++) cells += `<div class="cal-cell cal-empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const fecha = `${month}-${String(d).padStart(2, '0')}`;
    const n = counts[fecha] || 0;
    const cls = [fecha === today ? 'cal-today' : '', fecha === S.date ? 'cal-sel' : '', n ? 'cal-has' : ''].join(' ').trim();
    cells += `<button class="cal-cell ${cls}" data-fecha="${fecha}">
      <span class="cal-num">${d}</span>
      ${n ? `<span class="cal-dot">${n}</span>` : ''}
    </button>`;
  }

  return `<div class="cal-wrap">
    <div class="cal-header">
      <button class="cal-nav" data-cal="prev">‹</button>
      <span class="cal-month">${monthName}</span>
      <button class="cal-nav" data-cal="next">›</button>
    </div>
    <div class="cal-grid cal-dow">${dias.map(d => `<div class="cal-dow-cell">${d}</div>`).join('')}</div>
    <div class="cal-grid">${cells}</div>
  </div>`;
}
function _wireCalendar() {
  document.querySelectorAll('.cal-nav').forEach(b => b.addEventListener('click', () => {
    const [y, m] = (S.calMonth || S.date.slice(0, 7)).split('-').map(Number);
    const d = new Date(y, m - 1 + (b.dataset.cal === 'next' ? 1 : -1), 1);
    S.calMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    render();
  }));
  document.querySelectorAll('.cal-cell[data-fecha]').forEach(c => c.addEventListener('click', () => {
    S.date = c.dataset.fecha; S.agendaView = 'agenda'; render(); window._app?.refreshView?.();
  }));
}

// Menú "⋯" de acciones secundarias por tarjeta.
let _menuCloseBound = false;
function _wireMenus() {
  document.querySelectorAll('.apt-menu-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const menu = btn.closest('.apt-menu');
      const isOpen = menu.classList.contains('open');
      document.querySelectorAll('.apt-menu.open').forEach(m => m.classList.remove('open'));
      if (!isOpen) menu.classList.add('open');
    });
  });
  // Cerrar el menú al elegir una acción (el data-action lo maneja attachCardEvents aparte).
  document.querySelectorAll('.apt-menu-item').forEach(it =>
    it.addEventListener('click', () => it.closest('.apt-menu')?.classList.remove('open')));
  // Cerrar al hacer clic fuera (listener global, una sola vez).
  if (!_menuCloseBound) {
    _menuCloseBound = true;
    document.addEventListener('click', () =>
      document.querySelectorAll('.apt-menu.open').forEach(m => m.classList.remove('open')));
  }
}

// Bloque superior: próxima cita destacada + pendientes (lo que llena el espacio liberado).
async function _buildTop(appts, isToday, nowStr) {
  const next = appts.find(a => a.hora >= nowStr && a.estado === 'Pendiente')
            || (!isToday ? appts.find(a => a.estado === 'Pendiente') : null);

  let hero = '';
  if (next) {
    const cd = isToday ? _countdown(nowStr, next.hora) : '';
    hero = `<div class="next-hero">
      <div class="next-hero-time">${next.hora}</div>
      <div class="next-hero-body">
        <div class="next-hero-title">Próxima · ${escHtml(next.nombre)}</div>
        <div class="next-hero-sub">${escHtml(next.interes || 'Sin interés definido')}${cd ? ` · ${cd}` : ''}</div>
      </div>
      ${next.telefono ? `<button class="btn-action hero-wa" data-action="wa" data-id="${next.id}" data-type="appt" aria-label="WhatsApp">${_ico.whatsapp}</button>` : ''}
    </div>`;
  }

  let pend = '';
  try {
    const all = await leads.getAll();
    const sinContacto = all.filter(l => l.estado === 'Nuevo' || l.estado === 'Intento de contacto').length;
    const seguimiento = all.filter(l => l.estado === 'Seguimiento').length;
    const propuestas  = all.filter(l => l.estado === 'Propuesta enviada').length;
    const chips = [];
    if (sinContacto) chips.push(`<button class="pend-chip" data-goleads><span class="pend-n">${sinContacto}</span> sin contactar</button>`);
    if (seguimiento) chips.push(`<button class="pend-chip" data-goleads><span class="pend-n">${seguimiento}</span> seguimiento${seguimiento !== 1 ? 's' : ''}</button>`);
    if (propuestas)  chips.push(`<button class="pend-chip" data-goleads><span class="pend-n">${propuestas}</span> propuesta${propuestas !== 1 ? 's' : ''}</button>`);
    if (chips.length) pend = `<div class="pend-strip"><span class="pend-label">Pendientes</span>${chips.join('')}</div>`;
  } catch {}

  return (hero || pend) ? `<div class="agenda-top">${hero}${pend}</div>` : '';
}

function _countdown(nowStr, horaStr) {
  const [nh, nm] = nowStr.split(':').map(Number);
  const [hh, hm] = horaStr.split(':').map(Number);
  const diff = (hh * 60 + hm) - (nh * 60 + nm);
  if (diff <= 0) return 'ahora';
  if (diff < 60) return `en ${diff} min`;
  const h = Math.floor(diff / 60), m = diff % 60;
  return `en ${h}h${m ? ` ${m}m` : ''}`;
}

// Ficha resumen de la cita — visible directamente sin abrir la ficha.
function _buildFicha(a) {
  const rows = [];
  if (a.areaLaboral) rows.push(`<span class="ficha-tag">${escHtml(a.areaLaboral)}</span>`);
  if (a.nivelIngles) rows.push(`<span class="ficha-tag ficha-nivel">${escHtml(a.nivelIngles)}</span>`);
  const tags = rows.length ? `<div class="apt-ficha-tags">${rows.join('')}</div>` : '';
  const lineas = [];
  if (a.interes)      lineas.push(`<div class="apt-ficha-line"><b>Interés:</b> ${escHtml(a.interes)}</div>`);
  if (a.necesidades)  lineas.push(`<div class="apt-ficha-line"><b>Necesidades:</b> ${escHtml(a.necesidades)}</div>`);
  if (a.observaciones)lineas.push(`<div class="apt-ficha-line"><b>Obs:</b> ${escHtml(a.observaciones)}</div>`);
  if (!tags && !lineas.length) return '';
  return `<div class="apt-ficha">${tags}${lineas.join('')}</div>`;
}

function _buildCard(a) {
  return `<div class="apt-card" data-estado="${escHtml(a.estado)}" data-id="${a.id}">
    <div class="apt-time-chip">${a.hora}</div>
    <div class="apt-body">
      <div class="apt-card-header">
        <span class="apt-card-name">${escHtml(a.nombre)}</span>
        <span class="apt-card-status"><span class="${statusBadgeClass(a.estado)}">${escHtml(a.estado)}</span></span>
      </div>
      <div class="apt-card-meta">
        ${a.telefono   ? `<span class="apt-meta-item">${_ico.phone}${escHtml(a.telefono)}</span>`   : ''}
        ${a.origenLead ? `<span class="apt-meta-item">${_ico.list}${escHtml(a.origenLead)}</span>`  : ''}
      </div>
      ${_buildFicha(a)}
      <div class="apt-card-actions">
        ${a.telefono ? `<button class="btn-action green" data-action="call"     data-id="${a.id}" data-tel="${escHtml(a.telefono)}" data-nombre="${escHtml(a.nombre)}">${_ico.phone}Llamar</button>` : ''}
        ${a.telefono ? `<button class="btn-action green" data-action="wa"       data-id="${a.id}" data-type="appt">${_ico.whatsapp}WhatsApp</button>` : ''}
        ${a.zoomLink ? `<button class="btn-action blue"  data-action="zoom"     data-id="${a.id}" data-zoom="${escHtml(a.zoomLink)}">${_ico.zoom}Zoom</button>` : ''}
        <button class="btn-action primary" data-action="edit"     data-id="${a.id}">${_ico.edit}Editar</button>
        <div class="apt-menu">
          <button class="btn-action apt-menu-btn" aria-label="Más acciones">${_ico.dots}</button>
          <div class="apt-menu-list">
            <button class="apt-menu-item"        data-action="reagendar"    data-id="${a.id}">${_ico.reschedule}Reagendar</button>
            <button class="apt-menu-item"        data-action="appt-to-lead" data-id="${a.id}">${_ico.undo}A Leads</button>
            <button class="apt-menu-item danger" data-action="delete-appt"  data-id="${a.id}">${_ico.trash}Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

export async function renderPanel() {
  const panel  = document.getElementById('panel');
  if (S.view !== 'agenda') { panel.innerHTML = ''; return; }
  const appts  = await appointments.getByDate(S.date);
  appts.sort((a, b) => a.hora.localeCompare(b.hora));
  const total  = appts.length;
  const asistio  = appts.filter(a => a.estado === 'Asistió').length;
  const noAsis   = appts.filter(a => a.estado === 'No asistió').length;
  const contrato = appts.filter(a => a.estado === 'Contrató').length;
  const allA     = await appointments.getAll();
  const origenMap= {}; allA.forEach(a => { if (a.origenLead) origenMap[a.origenLead] = (origenMap[a.origenLead]||0)+1; });
  const maxO     = Math.max(...Object.values(origenMap), 1);

  panel.innerHTML = `
    <div class="panel-card">
      <div class="panel-card-title">Resumen del día</div>
      <div class="panel-stat"><span class="panel-stat-label">Total citas</span><span class="panel-stat-val">${total}</span></div>
      <div class="panel-stat"><span class="panel-stat-label">Asistieron</span><span class="panel-stat-val">${asistio}</span></div>
      <div class="panel-stat"><span class="panel-stat-label">No asistieron</span><span class="panel-stat-val">${noAsis}</span></div>
      <div class="panel-stat"><span class="panel-stat-label">Contrataron</span><span class="panel-stat-val">${contrato}</span></div>
      ${total>0?`<div class="panel-stat"><span class="panel-stat-label">Conversión</span><span class="panel-stat-val">${Math.round(contrato/total*100)}%</span></div>`:''}
    </div>
    ${Object.keys(origenMap).length?`<div class="panel-card">
      <div class="panel-card-title">Leads por origen</div>
      ${Object.entries(origenMap).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`
        <div class="origen-bar">
          <div class="origen-bar-label"><span>${escHtml(k)}</span><strong>${v}</strong></div>
          <div class="origen-bar-track"><div class="origen-bar-fill" style="width:${Math.round(v/maxO*100)}%"></div></div>
        </div>`).join('')}
    </div>`:''}
    <div class="panel-card">
      <div class="panel-card-title">Horarios disponibles</div>
      <div class="slots-grid">${_buildSlots(appts)}</div>
    </div>
    <div class="panel-card">
      <div class="panel-card-title">Accesos rápidos</div>
      <button class="btn-secondary" style="width:100%;margin-bottom:6px" id="panelNewAppt">${_ico.plus} Nueva cita</button>
      <button class="btn-secondary" style="width:100%" id="panelCalc">${_ico.money} Calculadora</button>
    </div>`;

  document.getElementById('panelNewAppt')?.addEventListener('click', () => window._app?.openFormModal?.());
  document.getElementById('panelCalc')?.addEventListener('click',   () => window._app?.navigate?.('calculadora'));
  panel.querySelectorAll('.slot-free').forEach(b =>
    b.addEventListener('click', () => window._app?.openFormModal?.(null, { fecha: S.date, hora: b.dataset.hora })));
}

// Horarios laborales del día (08:00–20:00 cada 30 min): libre u ocupado.
function _buildSlots(appts) {
  const taken = {};
  appts.forEach(a => { if (a.estado !== 'Reagendada') taken[a.hora] = a.nombre; });
  const slots = [];
  for (let h = 8; h <= 20; h++) for (let m = 0; m < 60; m += 30) {
    if (h === 20 && m > 0) break;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  return slots.map(s => taken[s]
    ? `<div class="slot slot-taken" title="${escHtml(taken[s])}">${s}</div>`
    : `<button class="slot slot-free" data-hora="${s}" title="Agendar a las ${s}">${s}</button>`
  ).join('');
}
