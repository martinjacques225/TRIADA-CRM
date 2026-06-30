// modules/agenda/agenda.js — Agenda evolucionada: calendario Mes / Semana / Lista
// + reuniones con tipo, participantes, recordatorios y recurrencia.
// Diseño: handoff Claude Design "Calendario con Recordatorios y Reuniones".
import { citas, prospectos, profiles, getCurrentUserId } from '../../js/db.js';
import {
  escHtml, todayStr, toast, formatDateShort,
  MEETING_TYPES, meetingType, toMeetingTipo,
  REMINDER_OPTS, RECUR_OPTS, DUR_OPTS, ESTADOS_CITA, memberColor, packOverlaps, areaLabel,
} from '../../js/utils.js';

const _i = (n, s) => (window.icon ? window.icon(n, '', s) : '');
const $  = (s, r = document) => r.querySelector(s);
const center = () => document.getElementById('center');
const LSV = 'triada.calview';

/* ── fechas ── */
const startOfDay   = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfWeek  = (d) => { const x = startOfDay(d); const w = (x.getDay() + 6) % 7; x.setDate(x.getDate() - w); return x; };
const addDays      = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addMonths    = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const ymd          = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const sameDay      = (a, b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
const cap          = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const horaOf       = (m) => (m.hora || '').slice(0, 5);
const dateOf       = (m) => new Date(`${(m.fecha||todayStr()).slice(0,10)}T${horaOf(m) || '09:00'}`);
const parseHora    = (h) => { const [H,M] = (h||'0:0').split(':').map(Number); return (H||0) + (M||0)/60; };

const WD = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const START_H = 8, END_H = 20, HOUR_PX = 52;

const cal = {
  view:   localStorage.getItem(LSV) || 'mes',
  cursor: new Date(),
  filter: new Set(MEETING_TYPES.map(t => t.id)),
};

/* ── datos (cache del módulo) ── */
let _citas = [], _pros = [], _equipo = [], _pMap = {};

async function _load() {
  const uid = getCurrentUserId();
  let equipo = [];
  try { equipo = await profiles.getAll(); }
  catch (err) { console.warn('No se pudo cargar el equipo (profiles); se usa el fallback:', err); }
  if (!equipo.length) equipo = [{ id: uid || 'u0', nombre: 'Consultor', rol: 'Consultor', area: '' }];
  const [todas, todosP] = await Promise.all([citas.getAll(), prospectos.getAll()]);
  _citas  = todas;
  _pros   = todosP;
  _pMap   = Object.fromEntries(todosP.map(p => [p.id, p]));
  _equipo = equipo.map((u, i) => ({ ...u, area: areaLabel(u.area), color: memberColor(i) }));
}

const member = (id) => _equipo.find(m => m.id === id) || null;
const empresaDe = (m) => {
  const p = m.prospectoId ? _pMap[m.prospectoId] : null;
  return p ? (p.empresa || p.nombre) : 'Tríada · Equipo';
};

/* ── avatares ── */
const _initials = (n) => String(n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('');
function avatarOf(nombre, color, size = 38) {
  return `<div class="avatar" style="width:${size}px;height:${size}px;background:${color||'#0C7C88'};font-size:${Math.round(size*0.38)}px">${_initials(nombre)}</div>`;
}
function memberStack(ids, size = 26, max = 4) {
  const list = (ids||[]).map(member).filter(Boolean);
  const shown = list.slice(0, max);
  const rest = list.length - shown.length;
  const ov = Math.round(size*0.32);
  if (!shown.length) return '';
  return `<div class="av-stack" style="display:flex">${shown.map((m,i)=>`<div title="${escHtml(m.nombre)}" style="margin-left:${i?-ov:0}px;border:2px solid var(--surface);border-radius:50%">${avatarOf(m.nombre,m.color,size)}</div>`).join('')}${rest>0?`<div style="margin-left:${-ov}px;width:${size}px;height:${size}px;border-radius:50%;border:2px solid var(--surface);background:var(--surface3);color:var(--text2);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.36)}px;font-weight:700">+${rest}</div>`:''}</div>`;
}

/* ── creador / dueño de la reunión (citas.responsable) ──
   Resuelve "¿de quién es esta cita?" cuando hay varias el mismo día/hora.
   El creador se guarda al crear (js/db.js: citas.add → responsable = usuario actual)
   y se preserva al editar. Si la cita es vieja (sin responsable) no muestra avatar. */
const ownerOf = (m) => (m && m.responsable) ? member(m.responsable) : null;
function ownerMini(m, size = 15) {
  const o = ownerOf(m);
  if (!o) return '';
  return `<span class="ev-owner" title="Creada por ${escHtml(o.nombre)}">${avatarOf(o.nombre, o.color, size)}</span>`;
}

/* ── expandir recurrencias en un rango [start, end) ── */
export function expandMeetings(list, start, end, typeFilter = null) {
  const out = [];
  list.forEach(m => {
    if (m.estado === 'Cancelada' || !m.fecha) return;
    const tipo = toMeetingTipo(m.tipo);
    if (typeFilter && MEETING_TYPES.some(t => t.id === tipo) && !typeFilter.has(tipo)) return;
    const base = dateOf(m);
    const rec = m.recurrencia || 'none';
    if (rec === 'none') { if (base >= start && base < end) out.push({ m, date: base }); return; }
    let cur = new Date(base), guard = 0;
    while (cur < end && guard < 500) {
      if (cur >= start) out.push({ m, date: new Date(cur), recurs: true });
      if (rec === 'daily') cur.setDate(cur.getDate()+1);
      else if (rec === 'weekly') cur.setDate(cur.getDate()+7);
      else if (rec === 'monthly') cur.setMonth(cur.getMonth()+1);
      else break;
      guard++;
    }
  });
  return out;
}
const expand = (start, end) => expandMeetings(_citas, start, end, cal.filter);

/* ════════════ RENDER PRINCIPAL ════════════ */
export async function render() {
  await _load();
  _paint();
}

function _paint() {
  const showNav = cal.view !== 'lista';
  center().innerHTML = `<div class="view-animate">
    <div class="view-head">
      <div><div class="view-eyebrow">Operación</div><h1 class="view-title">Agenda</h1>
      <div class="view-sub">Calendario de reuniones, recordatorios y alertas del equipo.</div></div>
      <div class="view-actions" style="display:flex;gap:8px">
        <button class="btn btn-ghost" id="calToday">${_i('agenda',16)} Hoy</button>
        <button class="btn btn-primary" id="calNew">${_i('plus',16)} Nueva reunión</button>
      </div>
    </div>

    <div class="cal-bar">
      ${showNav ? `<div class="cal-nav">
        <button class="cal-navbtn" id="calPrev" title="Anterior">${_i('chevL',18)}</button>
        <button class="cal-navbtn" id="calNext" title="Siguiente">${_i('chevR',18)}</button>
      </div>` : ''}
      <div class="cal-period">${_periodLabel()}</div>
      <div style="margin-left:auto">
        <div class="seg">
          <button data-v="mes"    class="${cal.view==='mes'?'on':''}">${_i('grid',15)} Mes</button>
          <button data-v="semana" class="${cal.view==='semana'?'on':''}">${_i('columns',15)} Semana</button>
          <button data-v="lista"  class="${cal.view==='lista'?'on':''}">${_i('list',15)} Lista</button>
        </div>
      </div>
    </div>

    <div class="legend">${_legend()}</div>

    <div id="calView">${_viewHTML()}</div>
  </div>`;
  _bind();
}

function _periodLabel() {
  if (cal.view === 'lista') return 'Próximas reuniones';
  if (cal.view === 'semana') {
    const s = startOfWeek(cal.cursor), e = addDays(s, 6);
    const sm = s.toLocaleDateString('es-CL',{month:'short'}), em = e.toLocaleDateString('es-CL',{month:'short'});
    return sm===em ? `${s.getDate()} – ${e.getDate()} ${em}` : `${s.getDate()} ${sm} – ${e.getDate()} ${em}`;
  }
  return cap(cal.cursor.toLocaleDateString('es-CL',{month:'long',year:'numeric'}));
}

function _legend() {
  return MEETING_TYPES.map(t => {
    const on = cal.filter.has(t.id);
    return `<span class="leg-chip ${on?'':'off'}" data-t="${t.id}"><span class="dot" style="background:${t.color}"></span>${t.label}</span>`;
  }).join('');
}

function _viewHTML() {
  if (cal.view === 'semana') return _week();
  if (cal.view === 'lista')  return _list();
  return _month();
}

/* ── MES ── */
function _month() {
  const mStart = startOfMonth(cal.cursor);
  const gStart = startOfWeek(mStart);
  const occ = expand(gStart, addDays(gStart, 42));
  const byDay = {};
  occ.forEach(o => { (byDay[ymd(o.date)] = byDay[ymd(o.date)] || []).push(o); });
  const now = new Date();

  let cells = '';
  for (let i = 0; i < 42; i++) {
    const dte = addDays(gStart, i);
    const key = ymd(dte);
    const evs = (byDay[key] || []).sort((a,b) => a.date - b.date);
    const other = dte.getMonth() !== mStart.getMonth();
    const isToday = sameDay(dte, now);
    const shown = evs.slice(0, 3);
    const rest = evs.length - shown.length;
    cells += `<div class="cal-cell${other?' other':''}${isToday?' today':''}" data-day="${key}">
      <div style="display:flex;align-items:center"><span class="cal-daynum">${dte.getDate()}</span></div>
      <button class="cal-add" data-add="${key}" title="Nueva reunión">${_i('plus',13)}</button>
      ${shown.map(o => { const t = meetingType(o.m.tipo); return `<div class="cal-ev" data-mid="${o.m.id}" style="--evc:${t.color}">${ownerMini(o.m,15)}<span class="evt tnum">${horaOf(o.m)}</span><span class="evname">${escHtml(o.m.titulo || t.label)}</span></div>`; }).join('')}
      ${rest > 0 ? `<span class="cal-more" data-more="${key}">+${rest} más</span>` : ''}
    </div>`;
  }
  return `<div class="cal-month">
    <div class="cal-wdrow">${WD.map(w => `<div class="cal-wd">${w}</div>`).join('')}</div>
    <div class="cal-grid">${cells}</div>
  </div>`;
}

/* ── SEMANA ── */
function _week() {
  const wStart = startOfWeek(cal.cursor);
  const occ = expand(wStart, addDays(wStart, 7));
  const now = new Date();
  const days = Array.from({length:7}, (_,i) => addDays(wStart, i));

  const head = `<div class="wk-head">
    <div class="wk-head-cell"></div>
    ${days.map((dte,i) => `<div class="wk-head-cell${sameDay(dte,now)?' today':''}">
      <div class="wk-wd">${WD[i]}</div><div class="wk-dn">${dte.getDate()}</div>
    </div>`).join('')}
  </div>`;

  const gutter = `<div class="wk-gutter">${Array.from({length:END_H-START_H},(_,i)=>`<div class="wk-hourlabel" style="height:${HOUR_PX}px">${String(START_H+i).padStart(2,'0')}:00</div>`).join('')}</div>`;

  const cols = days.map(dte => {
    const evs = occ.filter(o => sameDay(o.date, dte));
    // Reparte en columnas las que se solapan (citas a la misma hora → lado a lado).
    const items = evs.map(o => {
      const start = parseHora(horaOf(o.m));
      const dur = Math.max((o.m.durMin || 60) / 60, 0.34); // mínimo ~20 min para que el solape sea visible
      return { o, start, end: start + dur };
    });
    const blocks = packOverlaps(items).map(it => {
      const o = it.o, t = meetingType(o.m.tipo);
      const top = Math.max(0, (it.start - START_H) * HOUR_PX);
      const h = Math.max(22, ((o.m.durMin||60)/60) * HOUR_PX - 2);
      const wPct = 100 / it.cols;
      const left = `calc(${it.col * wPct}% + 3px)`;
      const width = `calc(${wPct}% - ${it.cols > 1 ? 5 : 6}px)`;
      return `<div class="wk-ev${it.cols>1?' split':''}" data-mid="${o.m.id}" style="top:${top}px;height:${h}px;left:${left};width:${width};right:auto;background:${t.color}">
        <div class="wk-ev-head"><span class="wk-ev-t tnum">${horaOf(o.m)}</span>${ownerMini(o.m,15)}</div><div class="wk-ev-n">${escHtml(o.m.titulo || t.label)}</div>
      </div>`;
    }).join('');
    return `<div class="wk-col${sameDay(dte,now)?' today':''}" data-day="${ymd(dte)}" style="height:${(END_H-START_H)*HOUR_PX}px">${blocks}</div>`;
  }).join('');

  return `<div class="cal-week">${head}<div class="wk-body">${gutter}${cols}</div></div>`;
}

/* ── LISTA ── */
function _list() {
  const start = startOfDay(new Date());
  const occ = expand(start, addDays(start, 31)).sort((a,b) => a.date - b.date);
  if (!occ.length) return `<div class="empty-state card card-pad">
    <div class="empty-icon">${_i('agenda',30)}</div>
    <h3>Sin reuniones próximas</h3>
    <p>Crea una reunión para verla aquí con sus recordatorios y participantes.</p>
    <button class="btn btn-primary" id="calEmptyNew">${_i('plus',16)} Nueva reunión</button>
  </div>`;

  const byDay = {};
  occ.forEach(o => { (byDay[ymd(o.date)] = byDay[ymd(o.date)] || []).push(o); });
  const tomorrow = addDays(start, 1);
  const label = (k) => { const d = new Date(k+'T00:00'); if (sameDay(d, start)) return 'Hoy'; if (sameDay(d, tomorrow)) return 'Mañana'; return cap(d.toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})); };

  return Object.keys(byDay).map(k => `
    <div class="section-head" style="margin:22px 0 12px"><h2 style="text-transform:capitalize">${label(k)}</h2><span style="color:var(--text3);font-size:12.5px">${formatDateShort(k+'T00:00')}</span></div>
    <div class="card" style="overflow:hidden">
      ${byDay[k].map(o => {
        const m = o.m, t = meetingType(m.tipo);
        const rem = (m.recordatorios||[]).length;
        const own = ownerOf(m);
        return `<div class="cal-row" data-mid="${m.id}">
          <div class="tnum" style="font-size:14px;font-weight:700;color:var(--ink);width:52px;text-align:center;flex-shrink:0">${horaOf(m) || '—'}</div>
          <div style="width:3px;align-self:stretch;border-radius:3px;background:${t.color}"></div>
          <div style="width:40px;height:40px;border-radius:11px;background:color-mix(in srgb, ${t.color} 14%, var(--surface));color:${t.color};display:flex;align-items:center;justify-content:center;flex-shrink:0">${_i(t.icon,19)}</div>
          <div style="flex:1;min-width:0">
            <div class="cal-row-title">${escHtml(m.titulo || t.label)}${o.recurs?` <span style="color:var(--text3)">${_i('repeat',12)}</span>`:''}</div>
            <div class="cal-row-sub">${_i('building',12)} ${escHtml(empresaDe(m))}${own ? ` · ${_i('user',12)} Creada por ${escHtml(own.nombre)}` : ''}</div>
          </div>
          ${memberStack(m.participantes, 26)}
          ${rem ? `<span class="chip">${_i('bell',12)} ${rem}</span>` : ''}
          <span class="chip" style="background:color-mix(in srgb, ${t.color} 13%, var(--surface));color:${t.color}">${t.label}</span>
        </div>`;
      }).join('')}
    </div>`).join('');
}

/* ── eventos ── */
function _bind() {
  const t = $('#calToday'); if (t) t.onclick = () => { cal.cursor = new Date(); _paint(); };
  const nw = $('#calNew'); if (nw) nw.onclick = () => openMeetingModal();
  const en = $('#calEmptyNew'); if (en) en.onclick = () => openMeetingModal();
  const p = $('#calPrev'), n = $('#calNext');
  const stepW = cal.view === 'semana';
  if (p) p.onclick = () => { cal.cursor = stepW ? addDays(startOfWeek(cal.cursor),-7) : addMonths(cal.cursor,-1); _paint(); };
  if (n) n.onclick = () => { cal.cursor = stepW ? addDays(startOfWeek(cal.cursor), 7) : addMonths(cal.cursor, 1); _paint(); };
  document.querySelectorAll('.seg [data-v]').forEach(b => b.onclick = () => { cal.view = b.dataset.v; localStorage.setItem(LSV, cal.view); _paint(); });
  document.querySelectorAll('.leg-chip').forEach(c => c.onclick = () => {
    const id = c.dataset.t;
    if (cal.filter.has(id) && cal.filter.size > 1) cal.filter.delete(id); else cal.filter.add(id);
    _paint();
  });

  const view = $('#calView');
  if (view) view.addEventListener('click', (e) => {
    const ev = e.target.closest('[data-mid]'); if (ev) return openMeetingDetail(ev.dataset.mid);
    const add = e.target.closest('[data-add]'); if (add) { e.stopPropagation(); return openMeetingModal({ date: add.dataset.add }); }
    const more = e.target.closest('[data-more]'); if (more) return _dayModal(more.dataset.more);
    const col = e.target.closest('.wk-col');
    if (col) { const h = Math.min(END_H-1, START_H + Math.floor(e.offsetY / HOUR_PX)); return openMeetingModal({ date: col.dataset.day, hora: String(h).padStart(2,'0')+':00' }); }
    const cell = e.target.closest('.cal-cell'); if (cell) return openMeetingModal({ date: cell.dataset.day });
  });
}

/* ── modal global (infra existente del CRM) ── */
function _modal({ title, body, size = '', saveLabel = 'Guardar', showSave = true, cancelLabel = 'Cancelar', onSave = null }) {
  document.getElementById('modalTitle').textContent = title;
  document.querySelector('.modal-box').className = 'modal-box' + (size ? ' modal-'+size : '');
  document.getElementById('modalBody').innerHTML = body;
  const save = document.getElementById('modalSave');
  save.style.display = showSave ? '' : 'none';
  save.textContent = saveLabel;
  save.onclick = onSave;
  document.getElementById('modalCancel').textContent = cancelLabel;
  document.getElementById('modalOverlay').classList.add('open');
}
function _closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  const save = document.getElementById('modalSave');
  save.textContent = 'Guardar'; save.onclick = null;
  document.getElementById('modalCancel').textContent = 'Cancelar';
}

async function _afterChange() {
  try { await window._reminders?.refresh?.(); } catch (_) {}
  if (window._app?.refreshView) await window._app.refreshView();
  else { await _load(); _paint(); }
}

/* ── modal "+N más" del día ── */
function _dayModal(key) {
  const d = new Date(key+'T00:00');
  const occ = expandMeetings(_citas, startOfDay(d), addDays(startOfDay(d),1)).sort((a,b)=>a.date-b.date);
  _modal({
    title: cap(d.toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})),
    showSave: true, saveLabel: 'Nueva reunión', cancelLabel: 'Cerrar',
    body: `<div style="display:flex;flex-direction:column;gap:8px">
      ${occ.map(o => { const m=o.m, t=meetingType(m.tipo), own=ownerOf(m); return `<div class="cal-row" data-mid="${m.id}" style="border-radius:var(--radius-sm);border-bottom:none;background:var(--surface2)">
        <div class="tnum" style="font-size:13.5px;font-weight:700;color:var(--ink);width:48px;text-align:center">${horaOf(m) || '—'}</div>
        <div style="width:34px;height:34px;border-radius:9px;background:${t.color};color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0">${_i(t.icon,17)}</div>
        <div style="flex:1;min-width:0"><div class="cal-row-title">${escHtml(m.titulo || t.label)}</div><div class="cal-row-sub">${escHtml(empresaDe(m))}${own ? ` · Creada por ${escHtml(own.nombre)}` : ''}</div></div>
        ${own ? `<span class="ev-owner" title="Creada por ${escHtml(own.nombre)}">${avatarOf(own.nombre, own.color, 26)}</span>` : ''}
      </div>`; }).join('') || '<div style="color:var(--text3);text-align:center;padding:16px;font-size:13px">Sin reuniones.</div>'}
    </div>`,
    onSave: () => { _closeModal(); openMeetingModal({ date: key }); },
  });
  document.querySelectorAll('#modalBody [data-mid]').forEach(el => el.onclick = () => openMeetingDetail(el.dataset.mid));
}

/* ── detalle de reunión ── */
export async function openMeetingDetail(id) {
  if (!_equipo.length) await _load();
  const m = _citas.find(x => x.id === id) || await citas.get(id);
  if (!m) return;
  const t = meetingType(m.tipo);
  const pros = m.prospectoId ? _pMap[m.prospectoId] : null;
  const own = ownerOf(m);
  const recur = (RECUR_OPTS.find(r => r.id === (m.recurrencia||'none'))||{}).label || 'No se repite';
  const rems = (m.recordatorios||[]).map(min => (REMINDER_OPTS.find(r=>r.min===min)||{label:min+' min antes'}).label);
  const meta = (ic, k, v) => `<div class="mt-meta"><span class="mt-meta-ic">${_i(ic,16)}</span><div><div class="mt-meta-k">${k}</div><div class="mt-meta-v">${v}</div></div></div>`;
  const dateStr = cap(dateOf(m).toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'}));
  const esVideo = /meet\.|zoom|teams|http/i.test(m.lugar || '');
  const estadoColor = m.estado==='Confirmada' ? 'var(--green)' : m.estado==='Realizada' ? 'var(--text3)' : m.estado==='Cancelada' ? 'var(--danger)' : 'var(--amber)';

  _modal({
    title: 'Detalle de reunión', size: 'lg', showSave: false, cancelLabel: 'Cerrar',
    body: `
      <div class="mt-hero">
        <div class="mt-ic" style="background:${t.color}">${_i(t.icon,23)}</div>
        <div style="flex:1">
          <div style="font-size:18px;font-weight:700;color:var(--ink);line-height:1.25">${escHtml(m.titulo || t.label)}</div>
          <div style="display:flex;gap:7px;margin-top:7px;flex-wrap:wrap">
            <span class="chip" style="background:color-mix(in srgb, ${t.color} 14%, var(--surface));color:${t.color}">${_i(t.icon,12)} ${t.label}</span>
            <span class="badge" style="color:${estadoColor};border-color:currentColor">${escHtml(m.estado || 'Pendiente')}</span>
          </div>
          ${own ? `<div class="mt-by">${avatarOf(own.nombre, own.color, 22)}<span>Creada por <b>${escHtml(own.nombre)}</b>${(own.cargo || own.rol) ? ` · ${escHtml(own.cargo || own.rol)}` : ''}</span></div>` : ''}
        </div>
      </div>
      <div class="mt-meta-grid">
        ${meta('agenda','Fecha', dateStr)}
        ${meta('clock','Hora', `${horaOf(m) || '—'} · ${m.durMin||60} min`)}
        ${meta('building','Empresa', escHtml(empresaDe(m)))}
        ${meta('repeat','Recurrencia', recur)}
        ${m.lugar ? meta(esVideo?'video':'mapPin', esVideo?'Videollamada':'Lugar', escHtml(m.lugar)) : ''}
      </div>
      <div class="eyebrow" style="margin:4px 0 8px">${_i('bell',13)} Recordatorios programados</div>
      <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:18px">
        ${rems.length ? rems.map(r => `<span class="chip teal">${_i('bellRing',12)} ${r}</span>`).join('') : '<span style="color:var(--text3);font-size:12.5px">Sin recordatorios.</span>'}
        ${rems.length ? '<span class="chip">Push + campana</span>' : ''}
      </div>
      <div class="eyebrow" style="margin-bottom:6px">${_i('users',13)} Participantes · ${(m.participantes||[]).length}</div>
      <div>
        ${(m.participantes||[]).map(uid => { const u = member(uid); if(!u) return ''; return `<div class="mt-part">
          ${avatarOf(u.nombre, u.color, 36)}
          <div><div class="mt-part-name">${escHtml(u.nombre)}</div><div class="mt-part-role">${escHtml(u.cargo || u.rol)}${u.area?' · '+escHtml(u.area):''}</div></div>
          <span class="mt-part-alert">${_i('bellRing',14)} Alerta activa</span>
        </div>`; }).join('') || '<div style="color:var(--text3);font-size:12.5px">Sin participantes registrados.</div>'}
      </div>
      ${m.notas?`<hr class="divider"><div class="mt-meta-k">Notas</div><div style="font-size:13px;color:var(--text2);margin-top:5px;line-height:1.5">${escHtml(m.notas)}</div>`:''}
      <hr class="divider">
      <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
        <button class="btn btn-danger btn-sm" id="mtDelete">${_i('trash',14)} Eliminar</button>
        ${pros ? `<button class="btn btn-ghost btn-sm" id="mtFicha">Ver ficha</button>` : ''}
        <button class="btn btn-primary btn-sm" id="mtEdit">${_i('pencil',14)} Editar</button>
      </div>`,
  });

  $('#mtDelete').onclick = async () => {
    if (!confirm('¿Eliminar esta reunión?')) return;
    try {
      await citas.delete(m.id);
      _closeModal();
      toast(`Reunión eliminada · ${m.titulo || ''}`, 'info');
      await _afterChange();
    } catch (err) {
      console.error('Error al eliminar reunión:', err);
      toast(err?.message || 'No se pudo eliminar la reunión', 'error');
    }
  };
  const f = $('#mtFicha'); if (f) f.onclick = () => { _closeModal(); window._app?.openProspectoDetail?.(pros.id); };
  $('#mtEdit').onclick = () => openMeetingModal({ edit: m });
}

/* ── crear / editar ── */
export async function openMeetingModal(opt = {}) {
  if (!_equipo.length || !_pros.length) await _load();
  const edit = opt.edit ? (typeof opt.edit === 'string' ? (_citas.find(x => x.id === opt.edit) || await citas.get(opt.edit)) : opt.edit) : null;
  const uid = getCurrentUserId();
  const creator = (edit ? member(edit.responsable) : null) || member(uid) || { nombre: 'Tú', color: '#0C7C88', rol: '' };
  const creatorIsMe = !edit || !edit.responsable || edit.responsable === uid;
  const st = {
    tipo:  toMeetingTipo(edit?.tipo) || 'diagnostico',
    parts: new Set(edit?.participantes?.length ? edit.participantes : (uid && member(uid) ? [uid] : [_equipo[0]?.id].filter(Boolean))),
    rems:  new Set(edit?.recordatorios?.length ? edit.recordatorios : [30]),
  };
  if (!MEETING_TYPES.some(t => t.id === st.tipo)) st.tipo = 'diagnostico';
  const defDate = edit?.fecha ? edit.fecha.slice(0,10) : (opt.date || todayStr());
  const defHora = edit ? horaOf(edit) : (opt.hora || '10:00');
  const defPros = edit?.prospectoId || opt.prospectoId || '';

  const body = `
    <div class="mt-creator">
      ${avatarOf(creator.nombre, creator.color, 34)}
      <div>
        <div class="mt-creator-k">${edit ? 'Creada por' : 'Organiza esta reunión'}</div>
        <div class="mt-creator-v">${escHtml(creator.nombre)}${creatorIsMe ? ' · tú' : ''}</div>
      </div>
      <span class="mt-shared">${_i('users',13)} Agenda compartida del equipo</span>
    </div>
    <div class="form-group"><label>Título de la reunión</label><input id="m_tit" placeholder="Ej: Diagnóstico 360 · Empresa" value="${edit?escHtml(edit.titulo||''):''}"></div>

    <label style="display:block;font-size:12px;font-weight:600;color:var(--text2);margin-bottom:7px">Tipo de reunión</label>
    <div class="type-grid" id="m_types" style="margin-bottom:16px">
      ${MEETING_TYPES.map(t => `<div class="type-opt${st.tipo===t.id?' on':''}" data-type="${t.id}" style="--tc:${t.color}">
        <span class="to-ic">${_i(t.icon,17)}</span><span class="to-lbl">${t.label}</span>
      </div>`).join('')}
    </div>

    <div class="form-group"><label>Vincular a prospecto / empresa</label>
      <select id="m_pros"><option value="">Sin vincular (interna del equipo)</option>
        ${_pros.filter(p=>p.estado!=='Descartado').map(p=>`<option value="${p.id}"${defPros===p.id?' selected':''}>${escHtml(p.nombre)}${p.empresa?' · '+escHtml(p.empresa):''}</option>`).join('')}
      </select></div>

    <div class="form-row">
      <div class="form-group"><label>Fecha</label><input type="date" id="m_fecha" value="${defDate}"></div>
      <div class="form-group"><label>Hora</label><input type="time" id="m_hora" value="${defHora}"></div>
      <div class="form-group"><label>Duración</label><select id="m_dur">${DUR_OPTS.map(d=>`<option value="${d}"${(edit?.durMin||60)===d?' selected':''}>${d} min</option>`).join('')}</select></div>
    </div>

    <label style="display:block;font-size:12px;font-weight:600;color:var(--text2);margin-bottom:7px">Participantes · alerta en cada perfil</label>
    <div class="pick-grid" id="m_parts" style="margin-bottom:16px">
      ${_equipo.map(u => `<div class="pick${st.parts.has(u.id)?' on':''}" data-uid="${u.id}">${avatarOf(u.nombre,u.color,24)} ${escHtml(u.nombre.split(' ')[0])}${u.area?` <span style="font-weight:500;opacity:.7">${escHtml(u.area)}</span>`:''}</div>`).join('')}
    </div>

    <label style="display:block;font-size:12px;font-weight:600;color:var(--text2);margin-bottom:7px">Recordatorios (push + campana)</label>
    <div class="pick-grid" id="m_rems" style="margin-bottom:16px">
      ${REMINDER_OPTS.map(r => `<div class="chipick${st.rems.has(r.min)?' on':''}" data-min="${r.min}">${_i('bell',13)} ${r.label}</div>`).join('')}
    </div>

    <div class="form-row">
      <div class="form-group"><label>Recurrencia</label><select id="m_recur">${RECUR_OPTS.map(r=>`<option value="${r.id}"${(edit?.recurrencia||'none')===r.id?' selected':''}>${r.label}</option>`).join('')}</select></div>
      ${edit ? `<div class="form-group"><label>Estado</label><select id="m_estado">${ESTADOS_CITA.map(e=>`<option${edit.estado===e?' selected':''}>${e}</option>`).join('')}</select></div>` : ''}
    </div>
    <div class="form-group"><label>Lugar o link de videollamada</label><input id="m_lugar" placeholder="Sala / dirección / meet.google.com/…" value="${edit?escHtml(edit.lugar||''):''}"></div>
    <div class="form-group"><label>Notas (opcional)</label><textarea id="m_notas" rows="2" placeholder="Agenda, objetivos, materiales…">${edit?escHtml(edit.notas||''):''}</textarea></div>
  `;

  _modal({
    title: edit ? 'Editar reunión' : 'Programar reunión', size: 'lg', body,
    saveLabel: edit ? 'Guardar cambios' : 'Programar y avisar',
    onSave: () => _save(st, edit),
  });

  // interacciones
  document.querySelectorAll('#m_types .type-opt').forEach(o => o.onclick = () => {
    st.tipo = o.dataset.type;
    document.querySelectorAll('#m_types .type-opt').forEach(x => x.classList.toggle('on', x === o));
  });
  document.querySelectorAll('#m_parts .pick').forEach(o => o.onclick = () => {
    const id = o.dataset.uid; if (st.parts.has(id)) st.parts.delete(id); else st.parts.add(id);
    o.classList.toggle('on');
  });
  document.querySelectorAll('#m_rems .chipick').forEach(o => o.onclick = () => {
    const min = +o.dataset.min; if (st.rems.has(min)) st.rems.delete(min); else st.rems.add(min);
    o.classList.toggle('on');
  });
}

async function _save(st, edit) {
  const tit = $('#m_tit').value.trim();
  if (!tit) { toast('Ingresa un título', 'error'); return; }
  if (!st.parts.size) { toast('Selecciona al menos un participante', 'error'); return; }
  const fecha = $('#m_fecha').value;
  if (!fecha) { toast('Selecciona la fecha de la reunión', 'error'); return; }
  const data = {
    titulo:        tit,
    tipo:          st.tipo,
    prospectoId:   $('#m_pros').value || null,
    fecha,
    hora:          $('#m_hora').value || '10:00',
    durMin:        +$('#m_dur').value || 60,
    participantes: [...st.parts],
    recordatorios: [...st.rems].sort((a,b)=>a-b),
    recurrencia:   $('#m_recur').value,
    lugar:         $('#m_lugar').value.trim(),
    notas:         $('#m_notas').value.trim(),
    estado:        edit ? ($('#m_estado')?.value || edit.estado || 'Confirmada') : 'Confirmada',
  };
  try {
    if (edit?.id) await citas.update({ ...edit, ...data });
    else          await citas.add(data);
    _closeModal();
    const n = data.participantes.length;
    toast(edit ? 'Reunión actualizada' : `Reunión programada · alerta enviada a ${n} ${n===1?'perfil':'perfiles'}`, 'success');
    await _afterChange();
  } catch (err) {
    console.error('Error al guardar reunión:', err);
    toast(err?.message || 'No se pudo guardar la reunión', 'error');
  }
}
