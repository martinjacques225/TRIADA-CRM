// ============================================================================
// screens/agenda.js — calendario de terreno: Lista (agrupada por día) + Día.
// Filtro por tipo de reunión (leyenda interactiva). Tarjetas → editar cita.
// ============================================================================
import { db, MEETING_TYPES, meetingType, todayStr, formatDateShort, escHtml, memberColor, initials } from '../core.js';
import { ic, toast } from '../ui.js';

const e = escHtml;
let _view = 'lista';
const _hidden = new Set();
let _citas = [], _leadMap = {}, _memberMap = {};

// Creador (responsable) de la cita → para ver "de quién es" en la agenda compartida.
const ownerOf = (c) => (c && c.responsable && _memberMap[c.responsable]) || null;
function ownerChip(c) {
  const o = ownerOf(c);
  if (!o) return '';
  return `<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--text2)" title="Creada por ${e(o.nombre)}"><span style="width:18px;height:18px;border-radius:50%;background:${o.color};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:8.5px;flex:none">${e(initials(o.nombre))}</span>${e(o.nombre.split(' ')[0])}</span>`;
}

function dayLabel(fecha) {
  if (!fecha) return '—';
  const today = todayStr();
  const t = new Date();
  const tom = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1).toISOString().slice(0, 10);
  if (fecha === today) return 'Hoy';
  if (fecha === tom) return 'Mañana';
  const d = new Date(fecha + 'T00:00:00');
  const s = d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const modoDe = (lugar) => /https?:|meet\.|zoom|teams/i.test(lugar || '') ? 'Zoom' : 'Presencial';
const visible = () => _citas.filter((c) => !_hidden.has(meetingType(c.tipo).id));

function listaHtml() {
  const cs = visible().slice().sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')));
  if (!cs.length) return emptyHtml();
  const groups = {};
  for (const c of cs) { const k = c.fecha || '—'; (groups[k] = groups[k] || []).push(c); }
  return Object.keys(groups).sort().map((k) => `
    <div style="margin-bottom:18px">
      <div style="font-size:12px;font-weight:700;letter-spacing:.05em;color:var(--text3);text-transform:uppercase;margin-bottom:9px">${e(dayLabel(k))}</div>
      <div class="list">${groups[k].map(citaCard).join('')}</div>
    </div>`).join('');
}

function citaCard(c) {
  const t = meetingType(c.tipo);
  const emp = (c.prospectoId && _leadMap[c.prospectoId]) || '';
  return `<div class="card card--tap" data-cita="${e(c.id)}" style="display:flex;gap:13px">
    <div style="display:flex;flex-direction:column;align-items:center;min-width:44px"><span class="serif tabular" style="font-size:16px;font-weight:600;color:var(--ink)">${e(c.hora || '—')}</span><span class="tabular" style="font-size:10px;color:var(--text3)">${c.durMin || 60}m</span></div>
    <div style="width:3px;align-self:stretch;border-radius:2px;background:${t.color}"></div>
    <div style="flex:1;min-width:0">
      <div class="ell" style="font-weight:700;font-size:14px;color:var(--ink)">${e(c.titulo || t.label)}</div>
      ${emp ? `<div class="ell" style="font-size:12px;color:var(--text2);margin-top:2px">${e(emp)}</div>` : ''}
      <div style="display:flex;align-items:center;gap:8px;margin-top:7px;flex-wrap:wrap">
        <span style="font-size:10.5px;font-weight:600;color:${t.color};background:${t.color}1A;padding:3px 8px;border-radius:20px">${e(t.label)}</span>
        <span style="font-size:11px;color:var(--text2)">${modoDe(c.lugar)}</span>
        ${c.estado ? `<span style="font-size:11px;color:var(--text3)">· ${e(c.estado)}</span>` : ''}
        ${ownerChip(c)}
      </div>
    </div>
  </div>`;
}

function diaHtml() {
  const today = todayStr();
  const cs = visible().filter((c) => c.fecha === today).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  if (!cs.length) return emptyHtml('Sin reuniones hoy.');
  return `<div style="font-size:12px;font-weight:700;letter-spacing:.05em;color:var(--text3);text-transform:uppercase;margin-bottom:12px">${e(dayLabel(today))} · hoy</div>
    <div style="display:flex;flex-direction:column">${cs.map((c, i, arr) => {
      const t = meetingType(c.tipo), emp = (c.prospectoId && _leadMap[c.prospectoId]) || '';
      return `<div style="display:flex;gap:13px">
        <div style="display:flex;flex-direction:column;align-items:flex-end;min-width:46px;padding-top:2px"><span class="tabular" style="font-size:12.5px;font-weight:600;color:var(--text2)">${e(c.hora || '')}</span></div>
        <div style="display:flex;flex-direction:column;align-items:center;flex:none"><span style="width:12px;height:12px;border-radius:50%;background:${t.color};border:3px solid var(--bg);box-shadow:0 0 0 1px ${t.color}"></span>${i < arr.length - 1 ? '<span style="flex:1;width:2px;background:var(--border)"></span>' : ''}</div>
        <div class="card--tap" data-cita="${e(c.id)}" style="flex:1;margin-bottom:14px;background:var(--surface);border:1px solid var(--border);border-left:3px solid ${t.color};border-radius:var(--radius);padding:12px 14px;box-shadow:var(--shadow-sm)">
          <div class="ell" style="font-weight:700;font-size:13.5px;color:var(--ink)">${e(c.titulo || t.label)}</div>
          <div class="ell" style="font-size:11.5px;color:var(--text2);margin-top:2px">${emp ? e(emp) + ' · ' : ''}${c.durMin || 60} min · ${modoDe(c.lugar)}</div>
          ${ownerChip(c) ? `<div style="margin-top:6px">${ownerChip(c)}</div>` : ''}
        </div>
      </div>`;
    }).join('')}</div>`;
}

function emptyHtml(msg) {
  return `<div class="empty" style="margin-top:20px"><div class="empty__icon">${ic('calendar', { size: 30, sw: 1.6 })}</div><div class="empty__t">${e(msg || 'Sin reuniones')}</div><div class="empty__d">Agenda una reunión para verla aquí.</div><button class="btn btn--primary btn--sm" data-new>Nueva cita</button></div>`;
}

export default {
  chrome: true,
  async render() {
    const [citas, leads, team] = await Promise.all([
      db.citas.getAll(),
      db.prospectos.getAll().catch(() => []),
      db.profiles.getAll().catch(() => []),
    ]);
    _citas = citas;
    _leadMap = Object.fromEntries(leads.map((l) => [l.id, l.empresa || l.nombre]));
    _memberMap = Object.fromEntries(team.map((m, i) => [m.id, { nombre: m.nombre, color: memberColor(i) }]));
    const seg = (id, label) => `<button class="ag-seg seg__item ${_view === id ? 'seg__item--on' : ''}" data-view="${id}" style="flex:1;height:36px">${label}</button>`;
    const chip = (t) => { const off = _hidden.has(t.id); return `<button class="ag-chip" data-type="${t.id}" style="flex:none;display:flex;align-items:center;gap:6px;border:1px solid ${off ? 'var(--border)' : t.color + '55'};background:${off ? 'var(--surface)' : t.color + '14'};color:${off ? 'var(--text3)' : t.color};border-radius:20px;padding:6px 11px;font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap;opacity:${off ? '.55' : '1'};transition:var(--tr)"><span style="width:7px;height:7px;border-radius:50%;background:${off ? 'var(--text3)' : t.color}"></span>${e(t.label)}</button>`; };

    return `
    <section class="screen">
      <header class="hdr">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <h1 class="hdr__title">Agenda</h1>
          <button class="icon-btn" id="agBell" style="width:40px;height:40px" aria-label="Recordatorios">${ic('bell', { size: 20 })}<span class="dot-badge" style="background:var(--amber)"></span></button>
        </div>
        <div class="seg" style="display:flex;width:100%">${seg('lista', 'Lista')}${seg('dia', 'Día')}</div>
      </header>
      <div class="chip-row" id="agChips" style="gap:7px">${MEETING_TYPES.map(chip).join('')}</div>
      <div class="pad" style="padding-top:6px" id="agBody">${_view === 'lista' ? listaHtml() : diaHtml()}</div>
    </section>`;
  },

  mount(app) {
    const host = document.getElementById('screen');
    const body = host.querySelector('#agBody');
    const refresh = () => { body.innerHTML = _view === 'lista' ? listaHtml() : diaHtml(); };

    host.querySelector('#agBell').addEventListener('click', () => app.openCampana());
    host.querySelectorAll('.ag-seg').forEach((b) => b.addEventListener('click', () => {
      _view = b.getAttribute('data-view');
      host.querySelectorAll('.ag-seg').forEach((s) => s.classList.toggle('seg__item--on', s.getAttribute('data-view') === _view));
      refresh();
    }));
    host.querySelector('#agChips').addEventListener('click', (ev) => {
      const b = ev.target.closest('.ag-chip'); if (!b) return;
      const id = b.getAttribute('data-type');
      if (_hidden.has(id)) _hidden.delete(id); else _hidden.add(id);
      app.renderScreen(); // re-pinta chips + cuerpo
    });
    host.addEventListener('click', (ev) => {
      const card = ev.target.closest('[data-cita]');
      if (card) { app.navigate('cita', { citaId: card.getAttribute('data-cita') }); return; }
      if (ev.target.closest('[data-new]')) app.navigate('cita');
    });
  },
};
