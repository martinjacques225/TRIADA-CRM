/* ============================================================
   BARBERÍA TRIADA · app.render.js
   Render (HTML) + bind (eventos) + mount. Depende de app.js (logic)
   y data.js. Reproduce las 5 superficies del prototipo.
   ============================================================ */
(function () {
  'use strict';
  var App = window.BT_APP, D = window.BT_DATA, H = window.BT_HELPERS;
  var esc = H.esc, clp = H.clp, ini = H.ini, aAttr = H.aAttr, ic = H.ic, tria = H.tria, logoFull = H.logoFull;
  var A = H.A, ASOFT = H.ASOFT, AFG = H.AFG, chip = H.chip, bigBtn = H.bigBtn, planStyle = H.planStyle;
  var telDigits = function (t) { return String(t || '').replace(/[^0-9]/g, ''); };

  // ── RIEL DE CONTROL (izquierda) ──────────────────────────────
  function railSection(label, inner) {
    return '<div><div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#6E7CA3;font-weight:700;margin-bottom:8px;padding-left:2px">' + label + '</div>' + inner + '</div>';
  }
  function renderRail(v) {
    var st = App.state;
    var nav = [
      ['launcher', 'Inicio · Hub', ic('home', 18)],
      ['web', 'Sitio web', ic('web', 18)],
      ['booking', 'Reservas', ic('cal', 18)],
      ['courses', 'Cursos', ic('cap', 18)],
      ['crm', 'CRM', ic('grid', 18)]
    ].map(function (n) {
      return '<button style="' + v.rs(n[0]) + '" ' + aAttr('nav', n[0]) + '>' + n[2] + n[1] + '</button>';
    }).join('');

    var pals = D.PORDER.map(function (k) {
      return '<button title="' + esc(D.PAL[k].name) + '" style="' + v.sw(k) + '" ' + aAttr('setPalette', k) + '></button>';
    }).join('');
    var ths = D.THORDER.map(function (k) {
      return '<button title="' + esc(D.THEMES[k].name) + '" style="' + v.thsw(k) + '" ' + aAttr('setTheme', k) + '></button>';
    }).join('');
    var icos = D.IORDER.map(function (k) {
      return '<button ' + aAttr('setIcons', k) + ' style="' + v.icoBtn(k) + '"><span style="' + v.icoChip(k) + '"></span>' + esc(D.ICONS[k].name) + '</button>';
    }).join('');
    // Cerrar sesión (solo cuando hay login real activo)
    var logout = (window.BT_DB && window.BT_DB.ready) ? '<button ' + aAttr('logout') + ' style="margin-top:10px;display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:transparent;color:#9FB0CC;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer" data-hover="background:rgba(255,255,255,.05);color:#fff"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>Cerrar sesión</button>' : '';

    return '' +
      '<aside class="scr" style="width:336px;flex:none;padding:26px 22px 30px;display:flex;flex-direction:column;gap:20px;border-right:1px solid rgba(255,255,255,.07);height:100vh;overflow-y:auto;position:sticky;top:0">' +
      '  <div style="display:flex;align-items:center;gap:12px">' +
      '    <div style="width:46px;height:46px;border-radius:13px;background:linear-gradient(150deg, rgba(43,160,171,.22), rgba(255,255,255,.03));display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.1)">' + logoFull(26) + '</div>' +
      '    <div><div style="font-family:\'Newsreader\',serif;font-size:20px;font-weight:600;letter-spacing:.005em">Tríada<span style="color:var(--accent)">·</span></div>' +
      '      <div style="font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:#8C99B5;margin-top:1px">Plataforma · Demo</div></div>' +
      '  </div>' +
      railSection('Vista',
        '<div style="display:flex;gap:4px;background:rgba(255,255,255,.05);border-radius:11px;padding:4px">' +
        '<button ' + aAttr('dev', 'mobile') + ' style="' + v.seg(!v.desk) + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 19h2"/></svg>Móvil</button>' +
        '<button ' + aAttr('dev', 'notebook') + ' style="' + v.seg(v.desk) + '"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/></svg>Notebook</button></div>') +
      railSection('Explora la plataforma', '<nav style="display:flex;flex-direction:column;gap:3px">' + nav + '</nav>') +
      '<div><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;padding:0 2px"><span style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#6E7CA3;font-weight:700;white-space:nowrap">Color de acento</span><span style="font-size:12px;color:#C5D0E4;font-weight:600;white-space:nowrap">' + esc(D.PAL[st.palette].name) + '</span></div>' +
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">' + pals + '</div></div>' +
      '<div><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;padding:0 2px"><span style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#6E7CA3;font-weight:700;white-space:nowrap">Fondo / tema</span><span style="font-size:12px;color:#C5D0E4;font-weight:600;white-space:nowrap">' + esc(D.THEMES[st.theme].name) + '</span></div>' +
      '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">' + ths + '</div></div>' +
      railSection('Estilo de íconos', '<div style="display:flex;gap:6px">' + icos + '</div>') +
      '  <div style="margin-top:auto;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:13px 14px;display:flex;gap:11px;align-items:flex-start">' +
      '    <div style="width:30px;height:30px;flex:none;color:var(--accent)">' + tria(30) + '</div>' +
      '    <div><div style="font-size:12.5px;font-weight:700;color:#ECF1FA">trIA incluido</div><div style="font-size:11px;line-height:1.5;color:#8C99B5;margin-top:2px">Reservas, agenda y análisis del negocio. La firma de Tríada.</div></div>' +
      '  </div>' + logout +
      '</aside>';
  }

  // ── SUPERFICIE: HUB / LAUNCHER ───────────────────────────────
  function tile(iconHtml, title, sub, act, dark) {
    if (dark) {
      return '<button ' + aAttr('nav', act) + ' style="display:flex;align-items:center;gap:14px;text-align:left;width:100%;cursor:pointer;background:linear-gradient(150deg,#16234A,#0F1933);border:1px solid #0F1933;border-radius:16px;padding:16px;box-shadow:0 10px 26px rgba(20,32,55,.22);font-family:inherit;transition:transform .15s" data-hover="transform:translateY(-2px)">' +
        '<div style="width:46px;height:46px;flex:none;border-radius:13px;background:rgba(255,255,255,.08);color:var(--accent);display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.1)">' + iconHtml + '</div>' +
        '<div style="flex:1"><div style="font-size:16px;font-weight:700;color:#fff">' + title + '</div><div style="font-size:13px;color:#9FB0CC;margin-top:1px">' + sub + '</div></div>' +
        ic('chev', 20).replace('SC', '#6E7CA3') + '</button>';
    }
    return '<button ' + aAttr('nav', act) + ' style="display:flex;align-items:center;gap:14px;text-align:left;width:100%;cursor:pointer;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(20,32,55,.05);font-family:inherit;transition:transform .15s,box-shadow .15s" data-hover="transform:translateY(-2px);box-shadow:0 14px 30px rgba(20,32,55,.1)">' +
      '<div style="width:46px;height:46px;flex:none;border-radius:13px;background:var(--tile-bg);color:var(--tile-fg);display:flex;align-items:center;justify-content:center">' + iconHtml + '</div>' +
      '<div style="flex:1"><div style="font-size:16px;font-weight:700;color:var(--ink)">' + title + '</div><div style="font-size:13px;color:var(--txt2);margin-top:1px">' + sub + '</div></div>' +
      ic('chev', 20).replace('SC', 'var(--txt3)') + '</button>';
  }
  function secLauncher(v) {
    return '<div style="padding:24px 20px 30px"><div style="' + v.colNarrow + '">' +
      '<div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);font-weight:700">' + esc(v.shopName) + '</div>' +
      '<h1 style="font-family:\'Newsreader\',serif;font-size:33px;line-height:1.08;font-weight:600;color:var(--ink);margin:8px 0 0;letter-spacing:-.01em">Tu negocio, en una sola plataforma.</h1>' +
      '<p style="font-size:14.5px;line-height:1.55;color:var(--txt2);margin:12px 0 0">Sitio web, reservas, escuela y gestión — diseñados y conectados por Tríada para Matías.</p>' +
      '<div style="display:flex;flex-direction:column;gap:11px;margin-top:22px">' +
        tile(ic('web', 22), 'Sitio web', 'Servicios, trayectoria y ubicación', 'web', false) +
        tile(ic('cal', 22), 'Reservar hora', 'Con trIA · confirmas por WhatsApp', 'booking', false) +
        tile(ic('cap', 22), 'Cursos de barbería', 'Escuela presencial de Matías', 'courses', false) +
        tile(ic('grid', 22), 'CRM · Panel de Matías', 'Agenda, finanzas, métricas y clientes', 'crm', true) +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:7px;justify-content:center;margin-top:22px;color:var(--txt3);font-size:11.5px"><svg width="14" height="14" viewBox="0 0 120 120" fill="none"><path d="M26 73 L60 45 L94 73" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 56 L60 28 L94 56" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg>Hecho por Tríada · una marca, muchos productos</div>' +
      '</div></div>';
  }

  // ── SUPERFICIE: SITIO WEB ────────────────────────────────────
  function secWeb(v) {
    var servs = D.SERV.map(function (s) {
      return '<button ' + aAttr('webBook', s.id) + ' style="' + v.webSvcStyle + '" data-hover="background:var(--accent-soft)">' +
        '<div style="flex:1;min-width:0"><div style="font-size:15px;font-weight:700;color:var(--ink)">' + esc(s.n) + '</div><div style="font-size:12.5px;color:var(--txt2);margin-top:2px">' + esc(s.desc) + '</div></div>' +
        '<div style="text-align:right;flex:none"><div style="font-size:15px;font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums">' + clp(s.p) + '</div><div style="font-size:11.5px;color:var(--txt3);margin-top:2px">' + esc(s.d) + '</div></div></button>';
    }).join('');
    return '<div style="padding-bottom:96px">' +
      '<div style="position:relative">' +
      '<image-slot id="bt-hero" placeholder="Arrastra una foto de la barbería" shape="rect" style="' + v.heroSlot + '"></image-slot>' +
      '<div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(11,19,38,.86) 8%, rgba(11,19,38,.25) 55%, transparent);pointer-events:none"></div>' +
      '<div style="position:absolute;left:0;right:0;bottom:18px;pointer-events:none"><div style="' + v.colWide + ';padding:0 20px">' +
      '<div style="font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);font-weight:700;text-shadow:0 1px 8px rgba(0,0,0,.4)">Barbería · Santiago</div>' +
      '<h1 style="font-family:\'Newsreader\',serif;font-size:34px;line-height:1.05;font-weight:600;color:#fff;margin:5px 0 0;letter-spacing:-.01em">' + esc(v.shopName) + '</h1>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-top:8px"><div style="display:flex;align-items:center;gap:3px;color:#F0C75A"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4 7.3 13.6 2.2 9l6.9-.7z"/></svg><span style="color:#fff;font-size:13px;font-weight:700">4.9</span></div><span style="color:#C5D0E4;font-size:12.5px">· 320 reseñas · Providencia</span></div>' +
      '</div></div></div>' +
      '<div style="padding:20px"><div style="' + v.colWide + '">' +
      '<button ' + aAttr('reservar') + ' style="width:100%;padding:15px;border-radius:13px;border:0;background:var(--accent);color:var(--accent-fg);font-family:inherit;font-size:15.5px;font-weight:700;cursor:pointer;box-shadow:0 8px 20px rgba(20,32,55,.12);display:flex;align-items:center;justify-content:center;gap:9px" data-hover="transform:translateY(-1px)">' + ic('cal', 19) + 'Reservar hora</button>' +
      '<div style="margin-top:26px"><div style="display:flex;align-items:center;justify-content:space-between"><h2 style="font-family:\'Newsreader\',serif;font-size:22px;font-weight:600;color:var(--ink);margin:0">Servicios</h2><span style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--txt3);font-weight:700">Precios CLP</span></div>' +
      '<div style="' + v.svcGrid + '">' + servs + '</div></div>' +
      '<div style="' + v.infoGrid + ';margin-top:28px">' + webMatias() + webLocal() + '</div>' +
      '<div style="display:flex;gap:10px;margin-top:18px">' +
      '<button ' + aAttr('whats', v.shop.whatsapp) + ' style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;border-radius:12px;border:1px solid var(--border2);background:var(--surface);color:var(--ink);font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;transition:background .15s" data-hover="background:var(--surface2)">' + ic('wa', 18) + 'WhatsApp</button>' +
      '<button style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;border-radius:12px;border:1px solid var(--border2);background:var(--surface);color:var(--ink);font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;transition:background .15s" data-hover="background:var(--surface2)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>Instagram</button>' +
      '</div></div></div></div>';
  }
  function webMatias() {
    return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px;box-shadow:0 1px 2px rgba(20,32,55,.05)">' +
      '<div style="display:flex;gap:14px;align-items:center">' +
      '<image-slot id="bt-matias" placeholder="Foto" shape="circle" style="display:block;width:66px;height:66px;flex:none"></image-slot>' +
      '<div><div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);font-weight:700">Trayectoria</div><h3 style="font-family:\'Newsreader\',serif;font-size:20px;font-weight:600;color:var(--ink);margin:3px 0 0">Matías Fuentes</h3><div style="font-size:12.5px;color:var(--txt2)">Maestro barbero · fundador</div></div></div>' +
      '<p style="font-size:13.5px;line-height:1.6;color:var(--txt);margin:14px 0 0">Ocho años detrás del sillón. Formé mi oficio entre Santiago y Buenos Aires, y hoy enseño lo que sé. Cada corte es una conversación.</p>' +
      '<div style="display:flex;margin-top:16px;border-top:1px solid var(--hair);padding-top:14px">' +
      '<div style="flex:1;text-align:center"><div style="font-family:\'Newsreader\',serif;font-size:24px;font-weight:600;color:var(--ink)">8</div><div style="font-size:11px;color:var(--txt3);margin-top:1px">años</div></div>' +
      '<div style="flex:1;text-align:center;border-left:1px solid var(--hair);border-right:1px solid var(--hair)"><div style="font-family:\'Newsreader\',serif;font-size:24px;font-weight:600;color:var(--ink)">+5K</div><div style="font-size:11px;color:var(--txt3);margin-top:1px">cortes</div></div>' +
      '<div style="flex:1;text-align:center"><div style="font-family:\'Newsreader\',serif;font-size:24px;font-weight:600;color:var(--ink)">4.9★</div><div style="font-size:11px;color:var(--txt3);margin-top:1px">rating</div></div></div></div>';
  }
  function webLocal() {
    return '<div style="border:1px solid var(--border);border-radius:16px;overflow:hidden;background:var(--surface);box-shadow:0 1px 2px rgba(20,32,55,.05)">' +
      '<div style="height:138px;position:relative;background:var(--surface2);background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:26px 26px">' +
      '<div style="position:absolute;left:38%;top:18%;width:60%;height:6px;background:var(--border2);border-radius:3px;transform:rotate(-12deg)"></div>' +
      '<div style="position:absolute;left:10%;top:60%;width:70%;height:6px;background:var(--border2);border-radius:3px;transform:rotate(6deg)"></div>' +
      '<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-100%)"><svg width="32" height="32" viewBox="0 0 24 24" fill="var(--accent)" stroke="#fff" stroke-width="1.5"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.4" fill="#fff" stroke="none"/></svg></div></div>' +
      '<div style="padding:15px 16px">' +
      '<div style="display:flex;align-items:flex-start;gap:10px"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex:none;margin-top:1px"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg><div><div style="font-size:14px;font-weight:700;color:var(--ink)">' + esc(D.SHOP.address) + '</div><div style="font-size:12.5px;color:var(--txt2)">' + esc(D.SHOP.comuna) + '</div></div></div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-top:11px;padding-top:11px;border-top:1px solid var(--hair)"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><div style="font-size:12.5px;color:var(--txt)"><b style="color:var(--ink)">Mar–Sáb</b> 10–20h · <b style="color:var(--ink)">Dom</b> 11–15h</div></div></div></div>';
  }

  // ── SUPERFICIE: RESERVAS ─────────────────────────────────────
  function secBooking(v) {
    var st = App.state;
    if (st.confirmed) {
      return '<div style="min-height:100%;padding-bottom:24px"><div style="' + v.colNarrow + '">' +
        '<div style="padding:30px 22px;text-align:center">' +
        '<div style="position:relative;width:84px;height:84px;margin:14px auto 0"><div style="position:absolute;inset:0;border-radius:50%;background:var(--accent);opacity:.18;animation:pulseRing 1.8s var(--ease) infinite"></div>' +
        '<div style="position:absolute;inset:0;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;color:var(--accent-fg)"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg></div></div>' +
        '<h2 style="font-family:\'Newsreader\',serif;font-size:26px;font-weight:600;color:var(--ink);margin:20px 0 0">¡Hora reservada!</h2>' +
        '<p style="font-size:14px;color:var(--txt2);margin:8px 0 0;line-height:1.55">Tu cita quedó en la agenda de Matías. trIA te enviará un recordatorio el día anterior.</p>' +
        '<div style="margin:22px 0 0;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px;text-align:left;box-shadow:0 1px 2px rgba(20,32,55,.05)">' +
        '<div style="display:flex;justify-content:space-between"><span style="font-size:13px;color:var(--txt2)">Servicio</span><span style="font-size:14px;font-weight:700;color:var(--ink)">' + esc(v.svcSel ? v.svcSel.n : '—') + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid var(--hair)"><span style="font-size:13px;color:var(--txt2)">Día y hora</span><span style="font-size:14px;font-weight:700;color:var(--ink)">' + esc(v.summaryDay) + ' · ' + esc(st.slot || '—') + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid var(--hair)"><span style="font-size:13px;color:var(--txt2)">Total</span><span style="font-size:16px;font-weight:700;color:var(--accent-700)">' + (v.svcSel ? clp(v.svcSel.p) : '—') + '</span></div></div>' +
        '<div style="margin:18px 0 0;text-align:left"><div style="display:flex;align-items:center;gap:7px;margin-bottom:8px;color:var(--txt2);font-size:11.5px;font-weight:600"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2E9B73" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5z"/></svg>Enviado por WhatsApp</div>' +
        '<div style="background:#E4F2EB;border:1px solid #C9E6D6;border-radius:14px 14px 14px 4px;padding:12px 14px;font-size:13px;line-height:1.5;color:#1F4A35">' + esc(v.waMsg) + '</div></div>' +
        '<button ' + aAttr('reset') + ' style="margin-top:24px;width:100%;padding:14px;border-radius:12px;border:1px solid var(--border2);background:var(--surface);color:var(--ink);font-family:inherit;font-size:14.5px;font-weight:700;cursor:pointer">Reservar otra hora</button>' +
        '</div></div></div>';
    }
    var stepTitles = { 1: '¿Qué te haces?', 2: '¿Para cuándo?', 3: 'Elige tu hora', 4: 'Confirma tu reserva' };
    var triaTips = { 1: 'Hola, soy trIA. ¿Qué buscas hoy? El corte + barba es lo más pedido los jueves.', 2: 'Matías tiene mejor disponibilidad mañana en la tarde.', 3: 'Los horarios tachados ya están tomados. Te sugiero 18:00.', 4: 'Revisa los datos y confirmo tu hora directo en la agenda de Matías.' };
    var btn = function (ok) { return 'width:100%;padding:14px;border-radius:12px;border:0;font-family:inherit;font-weight:700;font-size:15px;cursor:' + (ok ? 'pointer' : 'not-allowed') + ';background:' + (ok ? A : 'var(--border2)') + ';color:#fff;transition:.18s;'; };
    var body = '';
    if (st.bStep === 1) {
      var svcList = D.SERV.map(function (s) {
        var sel = st.svc === s.id;
        var style = 'display:flex;align-items:center;gap:12px;width:100%;cursor:pointer;font-family:inherit;padding:14px;border-radius:13px;background:var(--surface);border:1.5px solid ' + (sel ? A : 'var(--border)') + ';box-shadow:' + (sel ? '0 0 0 3px ' + ASOFT : '0 1px 2px rgba(20,32,55,.04)') + ';transition:.15s;';
        var dot = 'width:20px;height:20px;border-radius:50%;flex:none;border:2px solid ' + (sel ? A : 'var(--border2)') + ';background:' + (sel ? A : 'var(--surface)') + ';box-shadow:' + (sel ? 'inset 0 0 0 3px var(--surface)' : 'none') + ';';
        return '<button ' + aAttr('pickSvc', s.id) + ' style="' + style + '"><div style="' + dot + '"></div><div style="flex:1;text-align:left"><div style="font-size:14.5px;font-weight:700;color:var(--ink)">' + esc(s.n) + '</div><div style="font-size:12px;color:var(--txt3);margin-top:1px">' + esc(s.d) + '</div></div><div style="font-size:14.5px;font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums">' + clp(s.p) + '</div></button>';
      }).join('');
      body = '<div style="padding:18px 20px 0"><div style="display:flex;flex-direction:column;gap:9px">' + svcList + '</div>' +
        '<button ' + aAttr('next', 2) + ' style="' + btn(!!st.svc) + ';margin-top:18px">Continuar</button></div>';
    } else if (st.bStep === 2) {
      var days = v.days.map(function (d) {
        return '<button ' + aAttr('pickDay', d.i) + ' style="' + d.style + '"><div style="font-size:11px;font-weight:700;text-transform:uppercase;opacity:.8">' + esc(d.dow) + '</div><div style="font-family:\'Newsreader\',serif;font-size:22px;font-weight:600;margin-top:2px">' + esc(d.dnum) + '</div></button>';
      }).join('');
      body = '<div style="padding:18px 20px 0"><div style="font-size:13px;font-weight:700;color:var(--ink);margin-bottom:11px">Elige el día</div>' +
        '<div class="scr" style="display:flex;gap:9px;overflow-x:auto;padding-bottom:4px">' + days + '</div>' +
        '<div style="margin-top:20px;background:var(--accent-soft);border-radius:12px;padding:13px 15px;display:flex;align-items:center;gap:10px"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent-700)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg><span style="font-size:12.5px;color:var(--accent-700)">Atención con Matías · cupos cada 45 min</span></div>' +
        '<button ' + aAttr('next', 3) + ' style="' + btn(true) + ';margin-top:18px">Continuar</button></div>';
    } else if (st.bStep === 3) {
      var slots = D.SLOTS.map(function (tt) {
        var tk = !!D.SLOTS_TAKEN[tt], sel = st.slot === tt;
        var bg = 'var(--surface)', col = 'var(--txt)', bd = 'var(--border)', cur = 'pointer', op = '1', td = 'none';
        if (tk) { bg = 'var(--surface2)'; col = 'var(--txt3)'; bd = 'var(--hair)'; cur = 'not-allowed'; op = '.75'; td = 'line-through'; }
        else if (sel) { bg = A; col = AFG; bd = A; }
        var style = 'padding:12px 0;border-radius:11px;text-align:center;font-size:14px;font-weight:600;cursor:' + cur + ';opacity:' + op + ';background:' + bg + ';color:' + col + ';border:1.5px solid ' + bd + ';text-decoration:' + td + ';font-family:inherit;transition:.15s;';
        return '<button ' + (tk ? '' : aAttr('pickSlot', tt)) + ' style="' + style + '">' + tt + '</button>';
      }).join('');
      body = '<div style="padding:18px 20px 0"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:11px"><span style="font-size:13px;font-weight:700;color:var(--ink)">Horarios · ' + esc(v.summaryDay) + '</span><span style="font-size:11.5px;color:var(--txt3)">3 ocupados</span></div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px">' + slots + '</div>' +
        '<button ' + aAttr('next', 4) + ' style="' + btn(!!st.slot) + ';margin-top:18px">Continuar</button></div>';
    } else {
      var cs = 'width:100%;padding:15px;border-radius:12px;border:0;font-family:inherit;font-size:15px;font-weight:700;cursor:' + (v.canConfirm ? 'pointer' : 'not-allowed') + ';background:' + (v.canConfirm ? A : 'var(--border2)') + ';color:#fff;transition:.18s;';
      body = '<div style="padding:18px 20px 0"><div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(20,32,55,.05)">' +
        sumRow('Servicio', v.svcSel ? v.svcSel.n : '—', true) +
        sumRow('Duración', v.svcSel ? v.svcSel.d : '—', false) +
        sumRow('Día y hora', v.summaryDay + ' · ' + (st.slot || '—'), true) +
        sumRow('Barbero', 'Matías Fuentes', false) +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:11px;padding-top:11px;border-top:1.5px solid var(--border)"><span style="font-size:14px;font-weight:700;color:var(--ink)">Total</span><span style="font-family:\'Newsreader\',serif;font-size:22px;font-weight:600;color:var(--accent-700)">' + (v.svcSel ? clp(v.svcSel.p) : '—') + '</span></div></div>' +
        '<div style="margin-top:16px;display:flex;flex-direction:column;gap:11px">' +
        field('Tu nombre', 'bName', st.bName, 'Ej. Diego Soto') +
        field('WhatsApp', 'bPhone', st.bPhone, '+56 9 ...') + '</div>' +
        '<button ' + aAttr('confirm') + ' style="' + cs + ';margin-top:18px;display:flex;align-items:center;justify-content:center;gap:9px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5z"/></svg>Confirmar por WhatsApp</button>' +
        '<p style="font-size:11.5px;color:var(--txt3);text-align:center;margin:10px 0 0">Tus datos están seguros. Solo Matías los verá.</p></div>';
    }
    var progStyle = 'height:100%;width:' + (st.bStep / 4 * 100) + '%;background:var(--accent);border-radius:3px;transition:width .3s var(--ease);';
    var triaCard = '<div style="margin:16px 20px 0;background:linear-gradient(150deg,#16234A,#0F1933);border-radius:16px;padding:15px;display:flex;gap:12px;align-items:flex-start"><div style="width:34px;height:34px;flex:none;color:var(--accent)">' + tria(34) + '</div>' +
      '<div><div style="font-size:12px;font-weight:700;color:#fff;display:flex;align-items:center;gap:7px">trIA <span style="font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);background:rgba(43,160,171,.16);padding:2px 6px;border-radius:5px">IA</span></div><div style="font-size:12.5px;line-height:1.5;color:#C5D0E4;margin-top:3px">' + esc(triaTips[st.bStep]) + '</div></div></div>';
    return '<div style="min-height:100%;padding-bottom:24px"><div style="' + v.colNarrow + '"><div>' +
      '<div style="padding:16px 20px 12px;background:var(--surface);border-bottom:1px solid var(--hair);position:sticky;top:0;z-index:4">' +
      '<div style="display:flex;align-items:center;gap:12px"><button ' + aAttr('bBack') + ' style="width:34px;height:34px;flex:none;border-radius:10px;border:1px solid var(--border);background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ink)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg></button>' +
      '<div style="flex:1"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--txt3);font-weight:700">Paso ' + st.bStep + ' de 4</div><div style="font-family:\'Newsreader\',serif;font-size:19px;font-weight:600;color:var(--ink)">' + esc(stepTitles[st.bStep]) + '</div></div></div>' +
      '<div style="height:5px;background:var(--hair);border-radius:3px;margin-top:12px;overflow:hidden"><div style="' + progStyle + '"></div></div></div>' +
      triaCard + body + '</div></div></div>';
  }
  function sumRow(label, val, topBorder) {
    return '<div style="display:flex;justify-content:space-between' + (topBorder ? ';margin-top:9px;padding-top:9px;border-top:1px solid var(--hair)' : '') + '"><span style="font-size:13px;color:var(--txt2)">' + esc(label) + '</span><span style="font-size:14px;font-weight:' + (topBorder ? '700' : '600') + ';color:var(--ink)">' + esc(val) + '</span></div>';
  }
  function field(label, fieldName, val, ph) {
    return '<div><label style="font-size:12.5px;font-weight:700;color:var(--ink);display:block;margin-bottom:6px">' + esc(label) + '</label>' +
      '<input value="' + esc(val) + '" data-field="' + fieldName + '" placeholder="' + esc(ph) + '" style="width:100%;padding:12px 13px;border-radius:11px;border:1.5px solid var(--border2);font-size:14.5px;color:var(--ink);outline:none;background:var(--surface)" data-focus="border-color:var(--accent)"/></div>';
  }

  window.BT_RENDER1 = { renderRail: renderRail, secLauncher: secLauncher, secWeb: secWeb, secBooking: secBooking };
})();
