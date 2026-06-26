/* ============================================================
   BARBERÍA TRIADA · app.js
   Reimplementación vanilla del prototipo de Claude Design.
   Showcase try-before-buy: riel de control (dispositivo + paleta +
   tema + íconos) envolviendo un marco teléfono/notebook que navega
   5 superficies — Hub, Sitio web, Reservas, Cursos y CRM.

   Patrón: estado → render (string HTML) → bind (delegación de eventos).
   - Anti-XSS: todo texto de usuario pasa por esc()  [patrón del
     Foundation Kit · seguridad/security.js].
   - Sin frameworks ni módulos: script clásico, abre por doble-clic.
   ============================================================ */
(function () {
  'use strict';
  var D = window.BT_DATA;

  // ── Anti-XSS (Foundation Kit · security.js) ──────────────────
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function clp(n) { return '$' + Math.round(n).toLocaleString('es-CL'); }
  function ini(n) { return n.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }
  function aAttr(act, arg) { return 'data-act="' + act + '"' + (arg != null ? ' data-arg="' + esc(arg) + '"' : ''); }

  // ── SVG de marca (3 chevrons) ────────────────────────────────
  function logoFull(sz) {
    return '<svg viewBox="0 0 120 120" width="' + sz + '" height="' + sz + '" fill="none">' +
      '<path d="M26 90 L60 62 L94 90" stroke="#9FB0CC" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M26 73 L60 45 L94 73" stroke="#2BA0AB" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M26 56 L60 28 L94 56" stroke="#3FB587" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  // trIA: símbolo monocromo con respiración (currentColor)
  function tria(sz) {
    return '<svg viewBox="0 0 120 120" width="' + sz + '" height="' + sz + '" fill="none">' +
      '<path d="M26 90 L60 62 L94 90" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" opacity=".4"/>' +
      '<path d="M26 73 L60 45 L94 73" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" opacity=".7" style="animation:triaBreath 3.6s var(--ease) infinite;transform-origin:60px 59px"/>' +
      '<path d="M26 56 L60 28 L94 56" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  var I = {
    home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
    web: '<svg width="WW" height="WW" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/></svg>',
    cal: '<svg width="WW" height="WW" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>',
    cap: '<svg width="WW" height="WW" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"/></svg>',
    grid: '<svg width="WW" height="WW" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>',
    chev: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="SC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
    wa: '<svg width="WW" height="WW" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5z"/><path d="M8.5 9c0 4 2.5 6.5 6.5 6.5"/></svg>'
  };
  function ic(name, w) { return I[name].replace(/WW/g, w || 18); }

  // ── App ──────────────────────────────────────────────────────
  var App = {
    state: {
      route: 'launcher', palette: 'teal', theme: 'mineral', iconStyle: 'acento', device: 'mobile',
      bStep: 1, svc: null, day: 0, slot: null, bName: '', bPhone: '', confirmed: false,
      crmTab: 'resumen', client: null, q: '', aday: 3,
      enrollOpen: false, enrollDone: false, enName: '', enEmail: '', enPlan: 'contado',
      addOpen: false, acName: '', acTel: '', acFav: 'corte',
      citaTime: null, ciClient: 0, ciSvc: 'corte', extraClients: [], agendaExtra: {},
      // auth del CRM (login real de Matías)
      authed: false, authEmail: '', authPass: '', authErr: '', authLoading: false
    },
    _resetScroll: false,

    setState: function (patch, opts) {
      if (typeof patch === 'function') patch = patch(this.state);
      for (var k in patch) this.state[k] = patch[k];
      if (opts && opts.resetScroll) this._resetScroll = true;
      this.render();
    },
    go: function (r) {
      this.setState({ route: r, client: null, addOpen: false, citaTime: null, enrollOpen: false, enrollDone: false }, { resetScroll: true });
    },

    // CSS variables (paleta / tema / íconos) — igual que el prototipo
    applyPalette: function (k) {
      var p = D.PAL[k]; if (!p) return; var s = document.documentElement.style;
      s.setProperty('--accent', p.a); s.setProperty('--accent-h', p.h); s.setProperty('--accent-soft', p.soft);
      s.setProperty('--accent-100', p.c100); s.setProperty('--accent-700', p.d700); s.setProperty('--accent-fg', p.fg);
    },
    applyTheme: function (k) {
      var t = D.THEMES[k]; if (!t) return; var s = document.documentElement.style;
      s.setProperty('--app-bg', t.bg); s.setProperty('--surface', t.sf); s.setProperty('--surface2', t.sf2);
      s.setProperty('--ink', t.ink); s.setProperty('--txt', t.tx); s.setProperty('--txt2', t.tx2); s.setProperty('--txt3', t.tx3);
      s.setProperty('--border', t.bd); s.setProperty('--border2', t.bd2); s.setProperty('--hair', t.hair);
    },
    applyIcons: function (k) {
      var i = D.ICONS[k]; if (!i) return; var s = document.documentElement.style;
      s.setProperty('--tile-bg', i.bg); s.setProperty('--tile-fg', i.fg);
    }
  };

  // ── compute(): equivalente a renderVals() del prototipo ──────
  function compute() {
    var st = App.state, shop = D.SHOP, shopName = shop.name, showTria = true;
    var desk = st.device === 'notebook';
    var A = 'var(--accent)', ASOFT = 'var(--accent-soft)', AFG = 'var(--accent-fg)';
    var v = { st: st, shop: shop, shopName: shopName, showTria: showTria, desk: desk };

    // rail nav
    var railBase = 'display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;border:0;background:transparent;width:100%;text-align:left;font-family:inherit;transition:background .18s;';
    v.rs = function (r) { return railBase + (st.route === r ? 'background:rgba(255,255,255,.08);color:#fff;box-shadow:inset 3px 0 0 var(--accent);' : 'color:#AEB8CE;'); };
    var segBase = 'flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 0;border-radius:8px;border:0;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;transition:.15s;';
    v.seg = function (on) { return segBase + (on ? 'background:var(--accent);color:#fff;' : 'background:transparent;color:#AEB8CE;'); };

    v.sw = function (k) { return 'width:100%;aspect-ratio:1;border-radius:9px;cursor:pointer;border:0;padding:0;background:' + D.PAL[k].a + ';outline:2px solid ' + (st.palette === k ? '#fff' : 'rgba(255,255,255,.14)') + ';outline-offset:' + (st.palette === k ? '2px' : '0') + ';transform:' + (st.palette === k ? 'scale(1.06)' : 'none') + ';transition:.15s;'; };
    v.thsw = function (k) { var t = D.THEMES[k]; return 'width:100%;aspect-ratio:1;border-radius:9px;cursor:pointer;padding:0;background:' + t.bg + ';border:1px solid ' + (k === 'oscuro' ? '#2E4063' : 'rgba(0,0,0,.08)') + ';outline:2px solid ' + (st.theme === k ? '#fff' : 'rgba(255,255,255,.12)') + ';outline-offset:' + (st.theme === k ? '2px' : '0') + ';transform:' + (st.theme === k ? 'scale(1.06)' : 'none') + ';transition:.15s;'; };
    v.icoBtn = function (k) { var on = st.iconStyle === k; return 'flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 0;border-radius:9px;border:1px solid ' + (on ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.08)') + ';background:' + (on ? 'rgba(255,255,255,.08)' : 'transparent') + ';color:' + (on ? '#fff' : '#AEB8CE') + ';font-family:inherit;font-size:11.5px;font-weight:700;cursor:pointer;transition:.15s;'; };
    v.icoChip = function (k) { var i = D.ICONS[k]; return 'width:11px;height:11px;border-radius:3px;display:inline-block;background:' + i.bg + ';box-shadow:inset 0 0 0 1.5px ' + i.chip + ';'; };

    var titles = { launcher: ['La plataforma', 'Hub · 4 productos conectados'], web: ['Sitio web público', 'Lo que ve tu cliente'], booking: ['Reserva de hora', 'Flujo con trIA + WhatsApp'], courses: ['Landing de cursos', 'Escuela de barbería'], crm: ['CRM', 'Panel de Matías'] };
    v.pt = titles[st.route] || titles.launcher;
    var urlPaths = { launcher: '', web: '', booking: '/reservar', courses: '/cursos', crm: '/crm' };
    v.urlPath = urlPaths[st.route] || '';

    // device frame
    v.frameStyle = desk
      ? 'width:min(880px, calc(100vw - 396px));height:540px;flex:none;background:#0B1326;border-radius:18px 18px 5px 5px;padding:12px;border:1px solid rgba(255,255,255,.14);box-shadow:0 40px 90px rgba(0,0,0,.5)'
      : 'width:392px;height:812px;flex:none;background:#0B1326;border-radius:52px;padding:11px;border:1px solid rgba(255,255,255,.14);box-shadow:0 40px 90px rgba(0,0,0,.5)';
    v.screenStyle = 'width:100%;height:100%;border-radius:' + (desk ? '9px' : '42px') + ';overflow:hidden;background:var(--app-bg);display:flex;flex-direction:column;position:relative';
    v.colNarrow = desk ? 'max-width:600px;margin:0 auto' : '';
    v.colWide = desk ? 'max-width:820px;margin:0 auto' : '';
    v.ctaWrap = desk ? 'max-width:420px;margin:0 auto' : '';
    v.heroSlot = 'display:block;width:100%;height:' + (desk ? '300px' : '248px');
    v.courseSlot = 'display:block;width:100%;height:' + (desk ? '280px' : '220px');
    v.kpiGrid = 'display:grid;grid-template-columns:' + (desk ? 'repeat(4,1fr)' : '1fr 1fr') + ';gap:11px';
    v.svcGrid = desk ? 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px' : 'display:flex;flex-direction:column;gap:1px;margin-top:14px;background:var(--border);border:1px solid var(--border);border-radius:14px;overflow:hidden';
    v.webSvcStyle = desk
      ? 'display:flex;align-items:center;gap:13px;background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:15px 16px;cursor:pointer;text-align:left;font-family:inherit;width:100%;box-shadow:0 1px 2px rgba(20,32,55,.04);transition:background .15s'
      : 'display:flex;align-items:center;gap:13px;background:var(--surface);border:0;padding:15px 16px;cursor:pointer;text-align:left;font-family:inherit;width:100%;transition:background .15s';
    v.infoGrid = desk ? 'display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start' : 'display:flex;flex-direction:column;gap:14px';
    v.finGrid = desk ? 'display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start' : 'display:flex;flex-direction:column;gap:14px';
    v.cliGrid = desk ? 'display:grid;grid-template-columns:1fr 1fr;gap:9px' : 'display:flex;flex-direction:column;gap:9px';
    v.deskTabs = desk ? 'display:flex;gap:4px' : 'display:none';

    // booking helpers
    v.svcSel = D.SERV.find(function (s) { return s.id === st.svc; });
    var dows = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    var t = new Date(); t.setHours(0, 0, 0, 0);
    v.days = Array.from({ length: 9 }, function (_, i) {
      var d = new Date(t); d.setDate(t.getDate() + i); var sel = st.day === i;
      return { i: i, dow: i === 0 ? 'Hoy' : dows[d.getDay()], dnum: String(d.getDate()),
        style: 'flex:none;width:56px;padding:11px 0;border-radius:13px;cursor:pointer;font-family:inherit;border:1.5px solid ' + (sel ? A : 'var(--border)') + ';background:' + (sel ? A : 'var(--surface)') + ';color:' + (sel ? AFG : 'var(--txt)') + ';transition:.15s;' };
    });
    var dSel = v.days[st.day];
    v.summaryDay = dSel ? (dSel.dow + ' ' + dSel.dnum) : '—';
    v.canConfirm = !!(v.svcSel && st.slot && st.bName.trim() && st.bPhone.trim());
    v.waMsg = v.svcSel ? ('Hola Matías, confirmo mi hora: ' + v.svcSel.n + ' el ' + v.summaryDay + ' a las ' + (st.slot || '') + '. Soy ' + (st.bName || '') + '.') : '';

    // clientes
    v.allCli = D.CLI.concat(st.extraClients);
    v.co = st.client != null ? v.allCli[st.client] : null;

    // TODA la demo bajo login real: si hay Supabase y no hay sesión → bloqueada.
    // Sin conexión (offline / file://) NO se bloquea, así sigue explorable en local.
    v.locked = !!(window.BT_DB && window.BT_DB.ready && !st.authed);
    return v;
  }

  // ── helpers de estilo reutilizables ──────────────────────────
  var A = 'var(--accent)', ASOFT = 'var(--accent-soft)', AFG = 'var(--accent-fg)';
  function chip(sel) { return 'flex:none;padding:9px 13px;border-radius:10px;border:1.5px solid ' + (sel ? 'var(--accent)' : 'var(--border2)') + ';background:' + (sel ? 'var(--accent-soft)' : 'var(--surface)') + ';color:' + (sel ? 'var(--accent-700)' : 'var(--txt)') + ';font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;'; }
  function bigBtn(ok) { return 'width:100%;padding:14px;border-radius:12px;border:0;font-family:inherit;font-weight:700;font-size:15px;cursor:' + (ok ? 'pointer' : 'not-allowed') + ';background:' + (ok ? 'var(--accent)' : 'var(--border2)') + ';color:#fff;'; }
  function planStyle(sel) { return 'flex:1;padding:12px;border-radius:12px;border:1.5px solid ' + (sel ? 'var(--accent)' : 'var(--border2)') + ';background:' + (sel ? 'var(--accent-soft)' : 'var(--surface)') + ';color:' + (sel ? 'var(--accent-700)' : 'var(--txt)') + ';font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;line-height:1.4;text-align:center;'; }

  // The render functions live in app.render.js (loaded next) via window.BT_RENDER.
  window.BT_APP = App;
  window.BT_HELPERS = { esc: esc, clp: clp, ini: ini, aAttr: aAttr, logoFull: logoFull, tria: tria, ic: ic, compute: compute, chip: chip, bigBtn: bigBtn, planStyle: planStyle, A: A, ASOFT: ASOFT, AFG: AFG };
})();
