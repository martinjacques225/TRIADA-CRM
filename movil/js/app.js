// ============================================================================
// app.js — controlador de la PWA: arranque, sesión/auth, router, chrome
// (bottom nav + FABs) y hojas (crear / más / trIA). Una sola instancia: `app`.
// ============================================================================
import { store, db, supabase, startRealtime, stopRealtime, PIPELINE_STAGES, escHtml } from './core.js';
import { logo, ic, toast, openSheet, closeSheet, haptic } from './ui.js';
import { openTria as openTriaSheet } from './tria.js';
import { openCampana as openCampanaSheet } from './campana.js';
import { syncPushIfGranted } from './push.js';
import * as auth from './screens/auth.js';
import hoy from './screens/hoy.js';
import leads from './screens/leads.js';
import captura from './screens/captura.js';
import ficha from './screens/ficha.js';
import pipeline from './screens/pipeline.js';
import diagnostico from './screens/diagnostico.js';
import agenda from './screens/agenda.js';
import cita from './screens/cita.js';
import propuesta from './screens/propuesta.js';
import perfil from './screens/perfil.js';
import demos from './screens/demos.js';
import biblioteca from './screens/biblioteca.js';
import financiero from './screens/financiero.js';

// ── Registro de pantallas ───────────────────────────────────────────────────
// Las aún no construidas usan un placeholder para que el nav nunca quede sin salida.
function stub(title, sub, chrome = false) {
  return {
    chrome,
    render() {
      return `
      <section class="screen">
        <header class="hdr ${chrome ? 'hdr--bar' : 'hdr--back'}">
          ${chrome ? '' : `<button class="btn-icon icon-btn--bare" id="stubBack" style="width:38px;height:38px" aria-label="Volver">${ic('back', { size: 22, sw: 1.9 })}</button>`}
          <div><h1 class="hdr__title ${chrome ? '' : 'hdr__title--sm'}">${title}</h1>${sub ? `<div class="hdr__sub">${sub}</div>` : ''}</div>
        </header>
        <div class="pad">
          <div class="card" style="text-align:center;padding:34px 20px;margin-top:10px">
            <div class="empty__icon" style="margin:0 auto 14px">${ic('clock', { size: 28 })}</div>
            <div class="empty__t">En construcción</div>
            <div class="empty__d">Esta pantalla llega en la siguiente fase del plan.</div>
          </div>
        </div>
      </section>`;
    },
    mount() {
      const b = document.getElementById('stubBack');
      if (b) b.addEventListener('click', () => history.length > 1 ? app.back() : app.navigate('hoy'));
    },
  };
}

const SCREENS = {
  splash: auth.splash, login: auth.login, crearpass: auth.crearpass,
  hoy, leads, captura, ficha, pipeline, diagnostico,
  agenda, cita, propuesta, perfil, demos, biblioteca, financiero,
  overview:    stub('Mapa de pantallas', '', true),
};

// ── Controlador ─────────────────────────────────────────────────────────────
const app = {
  store, db, supabase,
  params: {},
  _history: [],

  // — Router —
  async navigate(name, params = {}) {
    if (!SCREENS[name]) name = 'hoy';
    if (store.screen && store.screen !== name) this._history.push({ name: store.screen, params: this.params });
    store.screen = name; this.params = params;
    closeSheet();
    await this.renderScreen();
  },
  back() {
    const prev = this._history.pop();
    if (!prev) return this.navigate('hoy');
    store.screen = prev.name; this.params = prev.params;
    closeSheet();
    this.renderScreen();
  },
  async renderScreen(opts = {}) {
    const scr = SCREENS[store.screen] || SCREENS.hoy;
    const host = document.getElementById('screen');
    const keepScroll = opts.preserveScroll ? host.scrollTop : 0;
    try {
      host.innerHTML = await scr.render(this);
    } catch (err) {
      console.error('render', store.screen, err);
      host.innerHTML = `<div class="pad"><div class="card" style="margin-top:60px;text-align:center;padding:30px"><div class="empty__t">Algo falló</div><div class="empty__d">${(err && err.message) || 'Error al cargar.'}</div><button class="btn btn--ghost btn--sm" onclick="location.reload()">Reintentar</button></div></div>`;
    }
    host.scrollTop = keepScroll;
    if (scr.mount) try { scr.mount(this); } catch (err) { console.error('mount', store.screen, err); }
    this.renderChrome(scr.chrome !== false);
  },

  // Cambio remoto (otro dispositivo/sesión) vía Realtime: refresca la caché y, si
  // estás en una vista de LISTA, la re-pinta en vivo (conservando el scroll). En
  // formularios/detalle NO interrumpe lo que estás haciendo.
  _onRemoteChange() {
    try { db.clearReadCache(); } catch (_) {}
    const LIVE = ['hoy', 'leads', 'pipeline', 'agenda'];
    if (LIVE.includes(store.screen)) this.renderScreen({ preserveScroll: true });
  },

  // Reacción por-evento (Realtime): si OTRA persona crea una reunión que me incluye
  // como participante, muestro una burbuja in-app. El push del sistema (app cerrada)
  // lo dispara la Edge Function notify-meeting; esto es el aviso cuando la app está abierta.
  _onRealtimeEvent(payload) {
    if (!payload || payload.table !== 'citas' || payload.eventType !== 'INSERT') return;
    const row = payload.new; if (!row) return;
    const me = store.user && store.user.id; if (!me) return;
    const parts = Array.isArray(row.participantes) ? row.participantes : [];
    if (!parts.includes(me) || row.responsable === me) return; // no me incluye o la creé yo
    this.showMeetingBubble(row);
  },

  // Burbuja de notificación in-app (se desliza desde arriba; toca → Agenda).
  showMeetingBubble(row) {
    try { haptic(18); } catch (_) {}
    const host = document.getElementById('app'); if (!host) return;
    const prev = document.getElementById('notif-bubble'); if (prev) prev.remove();
    clearTimeout(this._notifTimer);
    const b = document.createElement('button');
    b.id = 'notif-bubble'; b.type = 'button'; b.className = 'notif-bubble';
    b.innerHTML = `
      <span class="nb-ic">${ic('calendar', { size: 20 })}</span>
      <span class="nb-main">
        <span class="nb-eyebrow">${ic('bell', { size: 11 })} Nueva reunión</span>
        <span class="nb-title">${escHtml(row.titulo || 'Reunión')}</span>
        <span class="nb-sub">Se ha generado una reunión con tu participación</span>
      </span>`;
    host.appendChild(b);
    void b.offsetWidth;          // fuerza reflow → la transición corre sin depender de rAF
    b.classList.add('show');
    const dismiss = () => { b.classList.remove('show'); setTimeout(() => b.remove(), 280); };
    b.addEventListener('click', () => { dismiss(); this.navigate('agenda'); });
    this._notifTimer = setTimeout(dismiss, 7000);
  },

  // — Chrome (bottom nav + FABs) —
  renderChrome(show) {
    const root = document.getElementById('chrome');
    if (!show) { root.innerHTML = ''; return; }
    const active = ({ hoy: 'hoy', leads: 'leads', captura: 'leads', ficha: 'leads', agenda: 'agenda', cita: 'agenda', pipeline: 'pipeline' })[store.screen] || '';
    const item = (key, label, icon) => `
      <button class="tabbar__item ${active === key ? 'tabbar__item--on' : ''}" data-nav="${key}">
        ${ic(icon, { size: 23 })}<span>${label}</span>
      </button>`;
    root.innerHTML = `
      <button class="fab fab--tria" data-fab="tria" aria-label="Asistente trIA"><span class="tria-breath">${logo(26, { light: true, sw: 12 })}</span></button>
      <button class="fab fab--create" data-fab="create" aria-label="Crear">${ic('plus', { size: 26, sw: 2.4 })}</button>
      <nav class="tabbar">
        ${item('hoy', 'Hoy', 'home')}
        ${item('leads', 'Leads', 'users')}
        ${item('agenda', 'Agenda', 'calendar')}
        ${item('pipeline', 'Pipeline', 'funnel')}
        <button class="tabbar__item" data-nav="__more"><span style="display:flex">${ic('dots', { size: 23 })}</span><span>Más</span></button>
      </nav>`;
    root.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => {
      haptic();
      const k = b.getAttribute('data-nav');
      if (k === '__more') this.openMore(); else this.navigate(k);
    }));
    root.querySelector('[data-fab="create"]').addEventListener('click', () => { haptic(); this.openCreate(); });
    root.querySelector('[data-fab="tria"]').addEventListener('click', () => { haptic(); this.openTria(); });
  },

  // — Hojas —
  openCreate() {
    const opt = (action, icon, bg, fg, t, d) => `
      <button class="sheet-row" data-go="${action}">
        <span class="sheet-row__icon" style="background:${bg};color:${fg}">${ic(icon, { size: 21, sw: 1.9 })}</span>
        <span style="flex:1"><span class="sheet-row__t">${t}</span><span class="sheet-row__d">${d}</span></span>
        ${ic('next', { size: 19, sw: 2 })}
      </button>`;
    openSheet(`
      <div class="sheet__body">
        <div class="sheet__title">Crear</div>
        ${opt('captura', 'userPlus', 'var(--teal-l)', 'var(--teal)', 'Nuevo lead', 'Captura rápida en terreno')}
        ${opt('cita', 'calendar', 'var(--violet-l)', 'var(--violet)', 'Nueva cita', 'Reunión con recordatorio')}
        ${opt('propuesta', 'fileText', 'var(--green-l)', 'var(--green)', 'Nueva propuesta', 'Cotización en CLP')}
      </div>`, {
      onMount: (el) => el.querySelectorAll('[data-go]').forEach((b) =>
        b.addEventListener('click', () => this.navigate(b.getAttribute('data-go')))),
    });
  },
  openMore() {
    const row = (action, icon, label) => `
      <button class="sheet-link" data-go="${action}">${ic(icon, { size: 20 })}<span>${label}</span>${ic('next', { size: 18, sw: 2 })}</button>`;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const installRow = standalone ? '' : `<button class="sheet-link" data-install style="color:var(--teal)">${ic('share', { size: 20 })}<span style="color:var(--teal)">Instalar app</span>${ic('next', { size: 18, sw: 2 })}</button>`;
    openSheet(`
      <div class="sheet__body">
        <div class="sheet__title">Más</div>
        ${installRow}
        ${row('biblioteca', 'fileText', 'Biblioteca')}
        ${row('financiero', 'trending', 'Análisis Financiero')}
        ${row('demos', 'appWindow', 'Demos')}
        ${row('perfil', 'user', 'Mi perfil')}
        ${row('propuesta', 'fileText', 'Propuestas')}
        ${row('diagnostico', 'diag360', 'Diagnóstico 360')}
        ${row('overview', 'grid', 'Mapa de pantallas')}
      </div>`, {
      onMount: (el) => {
        el.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => this.navigate(b.getAttribute('data-go'))));
        const inst = el.querySelector('[data-install]');
        if (inst) inst.addEventListener('click', () => this.promptInstall());
      },
    });
  },
  openTria() { openTriaSheet(this); },
  openCampana() { openCampanaSheet(this); },

  // Hoja "cambiar etapa" (usada por Ficha y Pipeline). onChange(estadoNuevo).
  openEtapaSheet(lead, onChange) {
    const opt = (s) => `<button data-stage="${escHtml(s.id)}" style="display:flex;align-items:center;gap:11px;width:100%;background:${s.bg};border:1px solid ${s.color}22;border-radius:var(--radius-sm);padding:12px 14px;cursor:pointer;text-align:left"><span style="width:10px;height:10px;border-radius:50%;background:${s.color};flex:none"></span><span style="flex:1;font-weight:600;font-size:14px;color:${s.color}">${escHtml(s.id)}</span>${lead.estado === s.id ? `<span style="color:${s.color};display:flex">${ic('check', { size: 16, sw: 2.6 })}</span>` : ''}</button>`;
    openSheet(`
      <div class="sheet__body">
        <div class="sheet__title" style="margin-bottom:3px">Cambiar etapa</div>
        <div class="muted" style="font-size:12.5px;margin-bottom:14px">${escHtml(lead.nombre || '')}${lead.empresa ? ' · ' + escHtml(lead.empresa) : ''}</div>
        <div style="display:flex;flex-direction:column;gap:7px">${PIPELINE_STAGES.map(opt).join('')}</div>
      </div>`, {
      onMount: (el) => el.querySelectorAll('[data-stage]').forEach((b) => b.addEventListener('click', async () => {
        const estado = b.getAttribute('data-stage');
        closeSheet();
        if (estado === lead.estado) return;
        try { await db.prospectos.update({ id: lead.id, estado }); toast('Etapa actualizada ✓', 'ok'); onChange && onChange(estado); }
        catch (err) { console.error(err); toast('No se pudo actualizar la etapa', 'err'); }
      })),
    });
  },

  // — Tema —
  setTheme(t) {
    store.theme = t;
    document.documentElement.setAttribute('data-theme', t);
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'matrix' ? '#04080A' : t === 'dark' ? '#0B1220' : '#0C7C88');
    try { localStorage.setItem('triada_cfg_theme', t); } catch (_) {}
  },

  // — Auth —
  afterSplash() {
    if (this._splashDone) return; this._splashDone = true;
    clearTimeout(this._splashTimer);
    this._routeFromSession();
  },
  async _routeFromSession() {
    const { user, flow } = await (this._session || Promise.resolve({ user: null, flow: null }));
    if (user && (flow === 'invite' || flow === 'recovery')) { store.user = user; return this.navigate('crearpass'); }
    if (user) return this.onAuthSuccess(user);
    return this.navigate('login');
  },
  async onAuthSuccess(user) {
    store.user = user;
    try { db.setCurrentUser(user.id); } catch (_) {}
    try {
      const team = await db.profiles.getAll();
      store.profile = team.find((p) => p.id === user.id) || team[0] || null;
    } catch (_) { store.profile = null; }
    startRealtime(() => this._onRemoteChange(), (payload) => this._onRealtimeEvent(payload)); // sync + notificaciones
    syncPushIfGranted(); // si ya dio permiso antes, re-suscribe en silencio (no pide nada)
    const dest = this._bootScreen || 'hoy';
    const params = this._bootParams || {};
    this._bootScreen = null; this._bootParams = {};
    return this.navigate(dest, params);
  },
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data && data.user) await this.onAuthSuccess(data.user);
      return { error };
    } catch (error) { return { error }; }
  },
  async resetPassword(email) {
    const fn = supabase.auth.resetPasswordForEmail;
    if (!fn) return { error: null };
    try { return await fn.call(supabase.auth, email, { redirectTo: location.origin + location.pathname }); }
    catch (error) { return { error }; }
  },
  async setPassword(password) {
    const fn = supabase.auth.updateUser;
    let error = null;
    if (fn) { try { ({ error } = await fn.call(supabase.auth, { password })); } catch (e) { error = e; } }
    if (!error) {
      window.__authFlow = null;
      history.replaceState(null, '', location.pathname + location.search);
      let u = store.user;
      if (!u) { try { u = (await supabase.auth.getSession()).data.session.user; } catch (_) {} }
      if (u) await this.onAuthSuccess(u);
    }
    return { error };
  },
  async signOut() {
    stopRealtime();
    try { await supabase.auth.signOut(); } catch (_) {}
    store.user = null; store.profile = null; this._history = [];
    return this.navigate('login');
  },

  // Banner "nueva versión disponible" → activa el SW que espera y recarga.
  _showUpdate(reg) {
    if (document.getElementById('updbar')) return;
    const bar = document.createElement('div');
    bar.id = 'updbar'; bar.className = 'upd-bar';
    bar.innerHTML = `<span style="flex:1">Nueva versión disponible</span><button type="button">Actualizar</button>`;
    document.getElementById('app').appendChild(bar);
    bar.querySelector('button').addEventListener('click', () => {
      bar.remove();
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
      if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      else location.reload();
    });
  },

  // Pull-to-refresh en las vistas de lista (desde arriba). Refresca datos en vivo.
  _initPull() {
    const host = document.getElementById('screen');
    if (!host) return;
    const LIVE = ['hoy', 'leads', 'pipeline', 'agenda'];
    let startY = 0, active = false, dist = 0, ind = null;
    const getInd = () => {
      if (!ind) {
        ind = document.createElement('div'); ind.className = 'ptr';
        ind.innerHTML = `<span class="ptr-spin">${ic('refresh', { size: 18, sw: 2 })}</span>`;
        document.getElementById('app').appendChild(ind);
      }
      return ind;
    };
    host.addEventListener('touchstart', (e) => {
      const sheetOpen = (document.getElementById('sheet-root').children.length > 0);
      active = host.scrollTop <= 0 && LIVE.includes(store.screen) && !sheetOpen;
      if (active) { startY = e.touches[0].clientY; dist = 0; }
    }, { passive: true });
    host.addEventListener('touchmove', (e) => {
      if (!active) return;
      dist = e.touches[0].clientY - startY;
      if (dist <= 0) { if (ind) ind.style.opacity = '0'; return; }
      const pull = Math.min(dist * 0.5, 80);
      const i = getInd(); i.classList.remove('ptr--snap');
      i.style.transform = `translateX(-50%) translateY(${pull}px)`;
      i.style.opacity = String(Math.min(1, pull / 46));
      i.classList.toggle('ptr--ready', pull >= 52);
    }, { passive: true });
    host.addEventListener('touchend', async () => {
      if (!active) return; active = false;
      if (!ind) return;
      const ready = ind.classList.contains('ptr--ready');
      ind.classList.add('ptr--snap');
      if (ready) {
        ind.classList.add('ptr--spinning'); ind.classList.remove('ptr--ready');
        ind.style.transform = 'translateX(-50%) translateY(52px)';
        try { db.clearReadCache(); } catch (_) {}
        try { await this.renderScreen({ preserveScroll: false }); } catch (_) {}
        await new Promise((r) => setTimeout(r, 250));
      }
      ind.style.transform = 'translateX(-50%) translateY(0)';
      ind.style.opacity = '0';
      ind.classList.remove('ptr--spinning', 'ptr--ready');
    });
  },

  // "Instalar app": prompt nativo en Android; instrucciones paso a paso en iOS.
  async promptInstall() {
    closeSheet();
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (standalone) { toast('Ya estás usando la app instalada ✓', 'ok'); return; }
    if (this._installPrompt) {
      this._installPrompt.prompt();
      try { await this._installPrompt.userChoice; } catch (_) {}
      this._installPrompt = null;
      return;
    }
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const step = (n, html) => `<div style="display:flex;gap:11px;align-items:flex-start;margin-bottom:12px"><span style="width:24px;height:24px;border-radius:50%;background:var(--teal);color:#fff;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;flex:none">${n}</span><div style="flex:1;font-size:13.5px;color:var(--text);line-height:1.5">${html}</div></div>`;
    const steps = isIOS
      ? step(1, 'Abre este enlace <b>en Safari</b> (en iPhone solo Safari puede instalar).') + step(2, 'Toca <b>Compartir</b> (el cuadro con la flecha ↑, abajo).') + step(3, 'Baja y toca <b>"Agregar a inicio"</b> → <b>Agregar</b>.')
      : step(1, 'Abre este enlace <b>en Chrome</b>.') + step(2, 'Toca el menú <b>⋮</b> (arriba a la derecha).') + step(3, 'Toca <b>"Instalar aplicación"</b> (o "Agregar a pantalla de inicio").');
    openSheet(`<div class="sheet__body"><div class="sheet__title">Instalar Tríada CRM</div><div style="font-size:13px;color:var(--text2);margin:-6px 0 16px">No se descarga de una tienda: se instala desde el navegador.</div>${steps}<button class="btn btn--primary btn--block" data-close style="margin-top:6px">Entendido</button></div>`, {
      onMount: (el) => el.querySelector('[data-close]').addEventListener('click', closeSheet),
    });
  },
};

window._m = app; // acceso para depurar en consola

// Al tocar una notificación push, el SW pide enfocar la app y navegar a la Agenda.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'nav' && e.data.screen) app.navigate(e.data.screen);
  });
}

// Captura el evento de instalación (Android/Chrome) para ofrecer un botón "Instalar app".
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); app._installPrompt = e; });
window.addEventListener('appinstalled', () => { app._installPrompt = null; toast('App instalada ✓', 'ok'); });

// ── Arranque ────────────────────────────────────────────────────────────────
(async function boot() {
  // Parámetros de arranque (útiles para verificación/preview; inertes en prod):
  //   ?screen=leads  ?lead=ID  ?theme=dark|matrix  ?nosplash=1
  const q = new URLSearchParams(location.search);
  // Overrides de verificación: query (?screen=…) o localStorage (sobrevive a los
  // reloads del harness de preview). Solo activos en preview.html; inertes en prod.
  const dev = /preview/.test(location.pathname);
  const ls = (k) => { try { return dev ? localStorage.getItem(k) : null; } catch (_) { return null; } };
  app._bootScreen = q.get('screen') || ls('__movil_dev_screen');
  const lead = q.get('lead') || ls('__movil_dev_lead');
  app._bootParams = lead ? { leadId: lead } : {};
  const skipSplash = q.get('nosplash') === '1' || !!app._bootScreen;
  app.setTheme(q.get('theme') || ls('__movil_dev_theme') || localStorage.getItem('triada_cfg_theme') || 'light');
  registerServiceWorker();
  app._initPull();
  app._session = resolveSession();
  if (skipSplash) { app._splashDone = true; await app._routeFromSession(); }
  else { store.screen = 'splash'; await app.renderScreen(); }
})();

async function resolveSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return { user: (session && session.user) || null, flow: window.__authFlow };
  } catch (_) { return { user: null, flow: null }; }
}

function registerServiceWorker() {
  // Solo en producción (https, no localhost) para no ensuciar la verificación.
  const local = ['localhost', '127.0.0.1', '0.0.0.0'].includes(location.hostname);
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:' || local) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      // ¿Ya hay una versión nueva esperando? (con controller = no es la 1ª instalación)
      if (reg.waiting && navigator.serviceWorker.controller) app._showUpdate(reg);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) app._showUpdate(reg);
        });
      });
    } catch (_) {}
  });
}
