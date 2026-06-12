// modules/agenda/reminders.js — Dock flotante de recordatorios + motor de
// alertas (push in-app + campana del topbar). Vive en todos los módulos.
import { citas, prospectos } from '../../js/db.js';
import { escHtml, meetingType, REMINDER_OPTS } from '../../js/utils.js';
import { expandMeetings, openMeetingDetail, openMeetingModal } from './agenda.js';

const _i = (n, s) => (window.icon ? window.icon(n, '', s) : '');
const $  = (s, r = document) => r.querySelector(s);
const LS_OPEN = 'triada.rdockopen', LS_READ = 'triada.readAlerts';

const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const addDays    = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const cap        = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const sameDay    = (a,b) => startOfDay(a).getTime() === startOfDay(b).getTime();

function whenLabel(d) {
  const now = new Date();
  const diff = Math.round((startOfDay(d) - startOfDay(now)) / 86400000);
  const hm = d.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit',hour12:false});
  if (diff === 0) return 'Hoy · ' + hm;
  if (diff === 1) return 'Mañana · ' + hm;
  return cap(d.toLocaleDateString('es-CL',{weekday:'short',day:'numeric'})) + ' · ' + hm;
}
function whenChip(date) {
  const min = Math.round((date - Date.now()) / 60000);
  if (min <= 0) return { txt:'ahora', cls:'now' };
  if (min < 60) return { txt:'en ' + min + 'm', cls:'soon' };
  const h = min / 60;
  if (h < 12) return { txt:'en ' + Math.round(h) + 'h', cls: min < 120 ? 'soon' : '' };
  return { txt: whenLabel(date), cls:'' };
}

let _citas = [], _pMap = {};
const empresaDe = (m) => {
  const p = m.prospectoId ? _pMap[m.prospectoId] : null;
  return p ? (p.empresa || p.nombre) : 'Tríada · Equipo';
};

/* ocurrencias próximas (14 días) con estado de recordatorio */
function occs() {
  const now = new Date();
  return expandMeetings(_citas, startOfDay(now), addDays(startOfDay(now), 14))
    .filter(o => o.date >= now && o.m.estado !== 'Realizada')
    .sort((a,b) => a.date - b.date)
    .map(o => {
      const rems = (o.m.recordatorios || []).map(min => ({ min, trigger: new Date(o.date.getTime() - min*60000) }));
      const fired = rems.some(r => r.trigger <= now);
      return { m: o.m, date: o.date, rems, fired, key: o.m.id + '|' + o.date.getTime() };
    });
}

const Rem = {
  host: null,
  read: new Set(JSON.parse(localStorage.getItem(LS_READ) || '[]')),
  pushed: new Set(),
  timers: [],

  async init() {
    this.host = document.createElement('div');
    this.host.className = 'rdock';
    if (localStorage.getItem(LS_OPEN) === '1') this.host.classList.add('open');
    document.body.appendChild(this.host);

    // campana en el topbar
    const actions = document.getElementById('topbarActions');
    if (actions && !$('#tbBell')) {
      actions.insertAdjacentHTML('afterbegin', `
        <button class="btn-icon tb-bellwrap" id="tbBell" title="Recordatorios y alertas" aria-label="Recordatorios">
          ${_i('bell',18)}<span class="bell-badge" id="tbBellBadge"></span>
        </button>`);
      $('#tbBell').onclick = () => { this.toggle(true); this.markAllRead(); };
    }

    await this.refresh();
    setInterval(() => this.refresh(), 60000);
  },

  saveRead() { localStorage.setItem(LS_READ, JSON.stringify([...this.read])); },
  markAllRead() { occs().forEach(x => { if (x.fired) this.read.add(x.key); }); this.saveRead(); this.render(); },

  toggle(force) {
    const open = force != null ? force : !this.host.classList.contains('open');
    this.host.classList.toggle('open', open);
    localStorage.setItem(LS_OPEN, open ? '1' : '0');
  },

  async refresh() {
    try {
      const [todas, todosP] = await Promise.all([citas.getAll(), prospectos.getAll()]);
      _citas = todas;
      _pMap = Object.fromEntries(todosP.map(p => [p.id, p]));
    } catch (err) {
      console.error('Recordatorios: no se pudieron cargar las reuniones', err);
    }
    this.render();
    this.schedule();
  },

  render() {
    if (!this.host) return;
    const list = occs();
    const unread = list.filter(x => x.fired && !this.read.has(x.key));
    const fired = list.filter(x => x.fired);
    const upcoming = list.filter(x => !x.fired).slice(0, 10);
    const badge = unread.length;

    // campana topbar
    const wrap = $('#tbBell'), bb = $('#tbBellBadge');
    if (wrap) wrap.classList.toggle('has', badge > 0);
    if (bb) bb.textContent = badge;

    const row = (x, hot) => {
      const t = meetingType(x.m.tipo);
      const n = x.rems.length;
      const lead = n === 0 ? 'sin aviso' : n === 1 ? 'avisar ' + ((REMINDER_OPTS.find(r=>r.min===x.rems[0].min)||{label:x.rems[0].min+' min antes'}).label).toLowerCase() : n + ' recordatorios';
      const w = whenChip(x.date);
      return `<div class="rd-item${hot?' fired':''}" data-mid="${x.m.id}" data-key="${x.key}">
        <div class="rd-dot" style="background:${t.color}">${_i(t.icon,18)}</div>
        <div class="rd-main"><div class="rd-name">${escHtml(x.m.titulo || t.label)}</div>
          <div class="rd-sub">${_i('building',11)} ${escHtml(empresaDe(x.m))} · ${lead}</div></div>
        <div class="rd-when ${w.cls}">${w.txt}</div>
      </div>`;
    };

    let body = '';
    if (!list.length) {
      body = `<div class="rdock-empty">${_i('bell',32)}<div>No tienes recordatorios próximos.</div></div>`;
    } else {
      if (fired.length) body += `<div class="rd-group">${_i('bellRing',11)} Avisos activos</div>` + fired.map(x => row(x, !this.read.has(x.key))).join('');
      if (upcoming.length) body += `<div class="rd-group">Próximas reuniones</div>` + upcoming.map(x => row(x, false)).join('');
    }

    this.host.innerHTML = `
      <div class="rdock-panel">
        <div class="rdock-head"><span class="rh-ic">${_i('bellRing',18)}</span><span class="rdock-title">Recordatorios</span>
          <button class="rdock-x" id="rdClose" aria-label="Cerrar">${_i('x',16)}</button></div>
        <div class="rdock-body">${body}</div>
        <div class="rdock-foot">
          <button class="btn btn-ghost btn-sm" id="rdAgenda" style="flex:1">${_i('agenda',14)} Ver agenda</button>
          <button class="btn btn-primary btn-sm" id="rdNew" style="flex:1">${_i('plus',14)} Nueva</button>
        </div>
      </div>
      <button class="rdock-fab" id="rdFab">${_i('bell',18)} Recordatorios${badge?`<span class="rcount">${badge}</span>`:''}</button>`;

    $('#rdFab', this.host).onclick = () => { this.toggle(); if (this.host.classList.contains('open')) this.markAllRead(); };
    $('#rdClose', this.host).onclick = () => this.toggle(false);
    $('#rdAgenda', this.host).onclick = () => { this.toggle(false); window._app?.navigate?.('agenda'); };
    $('#rdNew', this.host).onclick = () => openMeetingModal();
    this.host.querySelectorAll('.rd-item').forEach(el => el.onclick = () => {
      this.read.add(el.dataset.key); this.saveRead();
      openMeetingDetail(el.dataset.mid); this.render();
    });
  },

  schedule() {
    this.timers.forEach(clearTimeout); this.timers = [];
    const now = Date.now(), horizon = now + 30*60000;
    let count = 0;
    occs().forEach(x => x.rems.forEach(r => {
      const tt = r.trigger.getTime();
      if (tt > now && tt <= horizon && count < 25) {
        count++;
        this.timers.push(setTimeout(() => this.fire(x, r.min), tt - now));
      }
    }));
  },

  fire(x, min) {
    const fkey = x.key + '|' + min;
    if (this.pushed.has(fkey)) return;
    this.pushed.add(fkey);
    this.push(x.m, x.date, min);
    this.read.delete(x.key); this.saveRead();
    this.render(); this.schedule();
  },

  push(m, date, min) {
    let wrap = $('.push-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'push-wrap'; document.body.appendChild(wrap); }
    const t = meetingType(m.tipo);
    const lead = (REMINDER_OPTS.find(r => r.min === min) || { label: min + ' min antes' }).label;
    const card = document.createElement('div');
    card.className = 'push-card';
    card.style.setProperty('--pc', t.color);
    card.innerHTML = `<div class="push-ic">${_i(t.icon,19)}</div>
      <div style="flex:1;min-width:0">
        <div class="push-eyebrow">${_i('bellRing',10)} Recordatorio · ${lead}</div>
        <div class="push-title">${escHtml(m.titulo || t.label)}</div>
        <div class="push-sub">${whenLabel(date)} · ${escHtml(empresaDe(m))}</div>
      </div>
      <button class="push-x" aria-label="Cerrar">${_i('x',16)}</button>`;
    wrap.appendChild(card);
    requestAnimationFrame(() => card.classList.add('show'));
    const close = () => { card.classList.remove('show'); setTimeout(() => card.remove(), 340); };
    card.querySelector('.push-x').onclick = (e) => { e.stopPropagation(); close(); };
    card.onclick = () => { close(); openMeetingDetail(m.id); };
    setTimeout(close, 8000);
  },
};

export async function initReminders() {
  await Rem.init();
  window._reminders = { refresh: () => Rem.refresh() };
}
