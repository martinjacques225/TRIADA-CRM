/* ============================================================
   BARBERÍA TRIADA · app.render2.js
   Cursos + CRM + overlays + barras + orquestación (render/bind/mount).
   ============================================================ */
(function () {
  'use strict';
  var App = window.BT_APP, D = window.BT_DATA, H = window.BT_HELPERS, R1 = window.BT_RENDER1;
  var esc = H.esc, clp = H.clp, ini = H.ini, aAttr = H.aAttr, ic = H.ic, tria = H.tria, logoFull = H.logoFull;
  var A = H.A, ASOFT = H.ASOFT, AFG = H.AFG, chip = H.chip, bigBtn = H.bigBtn, planStyle = H.planStyle;
  var telDigits = function (t) { return String(t || '').replace(/[^0-9]/g, ''); };

  // ── SUPERFICIE: CURSOS ───────────────────────────────────────
  function courseChip(svg, label) {
    return '<div style="display:flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:7px 11px;font-size:12px;font-weight:600;color:var(--txt)">' + svg + label + '</div>';
  }
  function featRow(svg, title, sub) {
    return '<div style="display:flex;gap:13px;align-items:flex-start"><div style="width:40px;height:40px;flex:none;border-radius:11px;background:var(--tile-bg);color:var(--tile-fg);display:flex;align-items:center;justify-content:center">' + svg + '</div><div><div style="font-size:14.5px;font-weight:700;color:var(--ink)">' + title + '</div><div style="font-size:13px;color:var(--txt2);line-height:1.5">' + sub + '</div></div></div>';
  }
  function secCourses(v) {
    var mods = D.COURSE_MODS.map(function (m) {
      return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:14px 16px;box-shadow:0 1px 2px rgba(20,32,55,.04)"><div style="font-size:14px;font-weight:700;color:var(--ink)">' + esc(m.n) + '</div><div style="font-size:12.5px;color:var(--txt2);margin-top:3px;line-height:1.5">' + esc(m.desc) + '</div></div>';
    }).join('');
    return '<div style="padding-bottom:96px">' +
      '<div style="position:relative">' +
      '<image-slot id="bt-course" placeholder="Foto del taller / curso" shape="rect" style="' + v.courseSlot + '"></image-slot>' +
      '<div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(11,19,38,.9) 5%, rgba(11,19,38,.3) 50%, rgba(11,19,38,.4));pointer-events:none"></div>' +
      '<div style="position:absolute;left:0;right:0;bottom:18px;pointer-events:none"><div style="' + v.colNarrow + ';padding:0 20px"><div style="font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);font-weight:700">Escuela Barbería Triada</div><h1 style="font-family:\'Newsreader\',serif;font-size:30px;line-height:1.08;font-weight:600;color:#fff;margin:6px 0 0;letter-spacing:-.01em">Curso de Barbería Profesional</h1></div></div></div>' +
      '<div style="padding:20px"><div style="' + v.colNarrow + '">' +
      '<div style="display:flex;gap:9px;flex-wrap:wrap">' +
        courseChip('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>', '8 semanas') +
        courseChip('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>', 'Presencial') +
        courseChip('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>', 'Certificado') +
      '</div>' +
      '<p style="font-size:14.5px;line-height:1.6;color:var(--txt);margin:18px 0 0">Aprende el oficio de cero con Matías: técnica real sobre modelos, herramientas profesionales y el lado del negocio que nadie te enseña.</p>' +
      '<div style="margin-top:22px;display:flex;flex-direction:column;gap:11px">' +
        featRow('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 16M14.5 14.5 20 20"/></svg>', 'Práctica desde el día 1', 'Tijera, máquina y navaja sobre modelos reales.') +
        featRow('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/></svg>', 'Grupos reducidos', 'Máximo 6 alumnos. Atención uno a uno.') +
        featRow('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 14 3-3 3 2 5-6"/></svg>', 'Tu propio negocio', 'Precios, agenda y marca con las herramientas de Tríada.') +
      '</div>' +
      '<div style="margin-top:26px"><h2 style="font-family:\'Newsreader\',serif;font-size:22px;font-weight:600;color:var(--ink);margin:0 0 14px">Programa</h2><div style="display:flex;flex-direction:column;gap:10px">' + mods + '</div></div>' +
      '<div style="margin-top:24px;background:linear-gradient(150deg,#16234A,#0F1933);border-radius:18px;padding:22px;color:#fff;position:relative;overflow:hidden">' +
      '<div style="position:absolute;right:-30px;top:-30px;width:120px;height:120px;color:var(--accent);opacity:.16"><svg viewBox="0 0 120 120" width="120" height="120" fill="none"><path d="M26 90 L60 62 L94 90" stroke="currentColor" stroke-width="11"/><path d="M26 73 L60 45 L94 73" stroke="currentColor" stroke-width="11"/><path d="M26 56 L60 28 L94 56" stroke="currentColor" stroke-width="11"/></svg></div>' +
      '<div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);font-weight:700;position:relative">Inversión</div>' +
      '<div style="display:flex;align-items:baseline;gap:10px;margin-top:5px;position:relative"><span style="font-family:\'Newsreader\',serif;font-size:38px;font-weight:600">' + esc(D.SHOP.coursePrice) + '</span><span style="font-size:13px;color:#9FB0CC">o ' + esc(D.SHOP.courseCuota) + '</span></div>' +
      '<div style="font-size:12.5px;color:#C5D0E4;margin-top:6px;position:relative">Incluye kit profesional · Próximo inicio: <b style="color:#fff">lun 7 jul</b></div>' +
      '<div style="display:flex;align-items:center;gap:7px;margin-top:12px;position:relative;color:#DDA73A;font-size:12px;font-weight:600"><span style="width:7px;height:7px;border-radius:50%;background:#DDA73A;display:inline-block"></span>Quedan 2 de 6 cupos</div>' +
      '</div></div></div></div>';
  }

  // ── SUPERFICIE: CRM ──────────────────────────────────────────
  function barChart7(v) {
    var rev = D.REV.vals, max = Math.max.apply(null, rev);
    return rev.map(function (val, i) {
      var st = 'width:100%;height:' + (Math.round(val / max * 92) + 8) + 'px;background:var(--accent);border-radius:5px 5px 0 0;transition:.3s;';
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end"><div style="' + st + '"></div><span style="font-size:10.5px;color:var(--txt3);font-weight:600">' + D.REV.lbls[i] + '</span></div>';
    }).join('');
  }
  function crmResumen(v) {
    var kpis = [
      ['Ingresos mes', clp(1840000), '<div style="font-size:11.5px;color:#2E9B73;font-weight:600;margin-top:2px">↑ 12% vs anterior</div>'],
      ['Ticket prom.', clp(14500), '<div style="font-size:11.5px;color:var(--txt2);margin-top:2px">por cliente</div>'],
      ['Citas semana', '38', '<div style="font-size:11.5px;color:var(--txt2);margin-top:2px">6 hoy</div>'],
      ['Ocupación', '82%', '<div style="font-size:11.5px;color:#C2871A;font-weight:600;margin-top:2px">viernes al tope</div>']
    ].map(function (k) {
      return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:15px;box-shadow:0 1px 2px rgba(20,32,55,.05)"><div style="font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--txt3);font-weight:700">' + k[0] + '</div><div style="font-family:\'Newsreader\',serif;font-size:23px;font-weight:600;color:var(--ink);margin-top:5px;font-variant-numeric:tabular-nums">' + k[1] + '</div>' + k[2] + '</div>';
    }).join('');
    var prox = D.PROX.map(function (c) {
      return '<div style="display:flex;align-items:center;gap:13px;padding:13px 16px;border-bottom:1px solid var(--hair)"><div style="font-family:\'Newsreader\',serif;font-size:15px;font-weight:600;color:var(--accent-700);width:44px;flex:none;font-variant-numeric:tabular-nums">' + c.h + '</div><div style="flex:1"><div style="font-size:14px;font-weight:600;color:var(--ink)">' + esc(c.name) + '</div><div style="font-size:12px;color:var(--txt3)">' + esc(c.svc) + '</div></div><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--border2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></div>';
    }).join('');
    var triaCard = '<div style="margin-top:14px;background:linear-gradient(150deg,#16234A,#0F1933);border-radius:16px;padding:16px;display:flex;gap:12px;align-items:flex-start"><div style="width:32px;height:32px;flex:none;color:var(--accent)">' + tria(32) + '</div><div style="flex:1"><div style="font-size:12px;font-weight:700;color:#fff;display:flex;align-items:center;gap:7px">Análisis de trIA <span style="font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);background:rgba(43,160,171,.16);padding:2px 6px;border-radius:5px">IA</span></div><div style="font-size:12.5px;line-height:1.55;color:#C5D0E4;margin-top:4px">Vas <b style="color:#fff">+12%</b> esta semana. Viernes 18–20h lleno: abre 2 cupos. <b style="color:#fff">3 clientes</b> sin agendar hace +30 días.</div><button ' + aAttr('crmTab', 'tria') + ' style="margin-top:9px;background:rgba(255,255,255,.1);border:0;color:#fff;font-family:inherit;font-size:11.5px;font-weight:700;padding:7px 12px;border-radius:8px;cursor:pointer">Ver análisis completo →</button></div></div>';
    return '<div style="padding:16px 18px"><div style="' + v.kpiGrid + '">' + kpis + '</div>' + triaCard +
      '<div style="margin-top:14px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(20,32,55,.05)"><div style="font-size:13px;font-weight:700;color:var(--ink)">Ingresos · últimos 7 días</div><div style="display:flex;align-items:flex-end;gap:8px;height:110px;margin-top:14px">' + barChart7(v) + '</div></div>' +
      '<div style="margin-top:14px"><div style="display:flex;align-items:center;justify-content:space-between;padding:0 2px 9px"><span style="font-size:13px;font-weight:700;color:var(--ink)">Hoy en la agenda</span><button ' + aAttr('crmTab', 'agenda') + ' style="font-size:11.5px;color:var(--accent-700);font-weight:600;background:none;border:0;cursor:pointer;font-family:inherit">Ver agenda</button></div><div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(20,32,55,.05)">' + prox + '</div></div></div>';
  }
  function crmAgenda(v) {
    var st = App.state;
    var week = D.WEEK.lbl.map(function (w, i) {
      var sel = st.aday === i;
      var style = 'flex:none;width:50px;padding:9px 0;border-radius:11px;cursor:pointer;font-family:inherit;border:1.5px solid ' + (sel ? A : 'var(--border)') + ';background:' + (sel ? A : 'var(--surface)') + ';color:' + (sel ? AFG : 'var(--txt)') + ';transition:.15s;';
      return '<button ' + aAttr('aday', i) + ' style="' + style + '"><div style="font-size:10.5px;font-weight:700;text-transform:uppercase;opacity:.75">' + w + '</div><div style="font-family:\'Newsreader\',serif;font-size:18px;font-weight:600;margin-top:1px">' + D.WEEK.num[i] + '</div></button>';
    }).join('');
    var ag2 = D.AGENDA_BASE.map(function (x) {
      var ex = st.agendaExtra[x.time];
      if (!x.busy && ex) return { time: x.time, busy: true, who: ex.who, svc: ex.svc, dur: ex.dur };
      return x;
    });
    var rows = ag2.map(function (x) {
      var inner;
      if (x.busy) inner = '<div style="background:var(--accent-soft);border-left:3px solid var(--accent);border-radius:8px;padding:8px 11px;height:100%;display:flex;flex-direction:column;justify-content:center"><div style="font-size:13px;font-weight:700;color:var(--ink)">' + esc(x.who) + '</div><div style="font-size:11.5px;color:var(--accent-700);font-weight:600;margin-top:1px">' + esc(x.svc) + ' · ' + esc(x.dur) + '</div></div>';
      else inner = '<button ' + aAttr('openCita', x.time) + ' style="width:100%;border:1.5px dashed var(--border2);border-radius:8px;padding:8px 11px;height:100%;display:flex;align-items:center;justify-content:space-between;color:var(--txt3);font-size:12px;font-weight:600;background:transparent;cursor:pointer;font-family:inherit;transition:.15s" data-hover="border-color:var(--accent);color:var(--accent-700)">Libre · agendar<span style="font-size:17px;line-height:1">+</span></button>';
      return '<div style="display:flex;gap:0;border-bottom:1px solid var(--hair);min-height:54px"><div style="width:58px;flex:none;padding:12px 0 0 14px;font-size:12px;font-weight:700;color:var(--txt3);font-variant-numeric:tabular-nums">' + x.time + '</div><div style="flex:1;padding:8px 14px 8px 0">' + inner + '</div></div>';
    }).join('');
    var count = ag2.filter(function (x) { return x.busy; }).length;
    return '<div style="padding:16px 18px"><div class="scr" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:14px">' + week + '</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><div><div style="font-family:\'Newsreader\',serif;font-size:18px;font-weight:600;color:var(--ink)">' + esc(D.WEEK.full[st.aday] || '') + '</div><div style="font-size:12px;color:var(--txt2)">' + count + ' citas · ' + clp(84000) + ' estimado</div></div><div style="display:flex;align-items:center;gap:6px;background:var(--accent-soft);color:var(--accent-700);font-size:11px;font-weight:700;padding:6px 10px;border-radius:8px">82% ocupado</div></div>' +
      '<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(20,32,55,.05)">' + rows + '</div></div>';
  }
  function crmClientes(v) {
    var st = App.state, q = st.q.trim().toLowerCase();
    var list = v.allCli.map(function (c, i) {
      return { i: i, c: c };
    }).filter(function (o) { return q ? o.c.n.toLowerCase().indexOf(q) >= 0 : true; }).map(function (o) {
      var c = o.c;
      return '<button ' + aAttr('openClient', o.i) + ' style="display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:13px 15px;cursor:pointer;text-align:left;font-family:inherit;width:100%;box-shadow:0 1px 2px rgba(20,32,55,.04);transition:transform .15s,box-shadow .15s" data-hover="transform:translateY(-1px);box-shadow:0 8px 18px rgba(20,32,55,.08)"><div style="width:42px;height:42px;flex:none;border-radius:50%;background:var(--tile-bg);color:var(--tile-fg);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;font-family:\'Newsreader\',serif">' + esc(ini(c.n)) + '</div><div style="flex:1;min-width:0"><div style="font-size:14.5px;font-weight:700;color:var(--ink)">' + esc(c.n) + '</div><div style="font-size:12px;color:var(--txt3)">' + c.visits + ' visitas · ' + esc(c.last) + '</div></div><div style="text-align:right;flex:none"><div style="font-size:13.5px;font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums">' + clp(c.spent) + '</div><div style="font-size:11px;color:var(--txt3)">' + esc(c.fav) + '</div></div></button>';
    }).join('');
    return '<div style="padding:16px 18px"><div style="display:flex;gap:9px;margin-bottom:14px"><div style="position:relative;flex:1"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--txt3)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:13px;top:50%;transform:translateY(-50%)"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><input value="' + esc(st.q) + '" data-field="q" placeholder="Buscar cliente..." style="width:100%;padding:12px 13px 12px 38px;border-radius:12px;border:1.5px solid var(--border2);font-size:14px;color:var(--ink);outline:none;background:var(--surface)" data-focus="border-color:var(--accent)"/></div>' +
      '<button ' + aAttr('openAdd') + ' style="flex:none;display:flex;align-items:center;gap:6px;padding:0 15px;border-radius:12px;border:0;background:var(--accent);color:var(--accent-fg);font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>Nuevo</button></div>' +
      '<div style="' + v.cliGrid + '">' + list + '</div></div>';
  }
  function crmFinanzas(v) {
    var gMax = Math.max.apply(null, D.GASTOS.map(function (g) { return g.v; }));
    var gTot = D.GASTOS.reduce(function (a, b) { return a + b.v; }, 0);
    var ingresos = 1840000;
    var gastos = D.GASTOS.map(function (g) {
      return '<div><div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:12.5px;color:var(--txt);font-weight:600">' + esc(g.n) + '</span><span style="font-size:12.5px;color:var(--ink);font-weight:700;font-variant-numeric:tabular-nums">' + clp(g.v) + '</span></div><div style="height:6px;background:var(--surface2);border-radius:3px;overflow:hidden"><div style="height:6px;border-radius:3px;width:' + Math.round(g.v / gMax * 100) + '%;background:var(--accent);"></div></div></div>';
    }).join('');
    var share = D.SHARE.map(function (s) {
      return '<div><div style="display:flex;justify-content:space-between;margin-bottom:5px"><span style="font-size:12.5px;color:var(--txt);font-weight:600">' + esc(s.n) + '</span><span style="font-size:12.5px;color:var(--txt3);font-weight:600">' + s.v + '%</span></div><div style="height:8px;background:var(--surface2);border-radius:5px;overflow:hidden"><div style="height:100%;width:' + s.v + '%;background:var(--accent);border-radius:5px;"></div></div></div>';
    }).join('');
    return '<div style="padding:16px 18px"><div style="background:linear-gradient(150deg,#16234A,#0F1933);border-radius:18px;padding:20px;color:#fff"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9FB0CC;font-weight:700">Utilidad del mes</div><div style="font-family:\'Newsreader\',serif;font-size:34px;font-weight:600;margin-top:4px;font-variant-numeric:tabular-nums">' + clp(ingresos - gTot) + '</div><div style="display:flex;gap:16px;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.1)"><div><div style="font-size:11px;color:#9FB0CC">Ingresos</div><div style="font-size:15px;font-weight:700;color:#3FB587;margin-top:2px;font-variant-numeric:tabular-nums">' + clp(ingresos) + '</div></div><div><div style="font-size:11px;color:#9FB0CC">Gastos</div><div style="font-size:15px;font-weight:700;color:#E0705F;margin-top:2px;font-variant-numeric:tabular-nums">' + clp(gTot) + '</div></div></div></div>' +
      '<div style="' + v.finGrid + ';margin-top:14px"><div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(20,32,55,.05)"><div style="font-size:13px;font-weight:700;color:var(--ink);margin-bottom:14px">Ingresos por servicio</div><div style="display:flex;flex-direction:column;gap:12px">' + share + '</div></div>' +
      '<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(20,32,55,.05)"><div style="font-size:13px;font-weight:700;color:var(--ink);margin-bottom:14px">Gastos del mes</div><div style="display:flex;flex-direction:column;gap:13px">' + gastos + '</div></div></div></div>';
  }
  function crmTria(v) {
    var occMax = 95;
    var hours = D.OCC.vals.map(function (val, i) {
      var st = 'width:100%;height:' + (val === 0 ? 3 : Math.round(val / occMax * 72) + 6) + 'px;border-radius:4px 4px 0 0;background:' + (val >= 90 ? 'var(--accent)' : 'var(--accent-100)') + ';';
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end"><div style="' + st + '"></div><span style="font-size:9px;color:var(--txt3)">' + D.OCC.h[i] + '</span></div>';
    }).join('');
    var risk = D.CLI.filter(function (c) { return c.risk; }).map(function (c) {
      return '<div style="display:flex;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:11px 14px;box-shadow:0 1px 2px rgba(20,32,55,.04)"><div style="width:36px;height:36px;flex:none;border-radius:50%;background:#F9E9E6;color:#C04F3F;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;font-family:\'Newsreader\',serif">' + esc(ini(c.n)) + '</div><div style="flex:1"><div style="font-size:13.5px;font-weight:700;color:var(--ink)">' + esc(c.n) + '</div><div style="font-size:11.5px;color:#C04F3F;font-weight:600">' + esc(c.last) + ' · ' + clp(c.spent) + ' histórico</div></div><button ' + aAttr('whats', telDigits(c.tel)) + ' style="background:var(--accent);color:var(--accent-fg);border:0;font-family:inherit;font-size:11.5px;font-weight:700;padding:8px 11px;border-radius:9px;cursor:pointer">Reactivar</button></div>';
    }).join('');
    var recs = D.RECS.map(function (rc) {
      return '<div style="display:flex;gap:11px;align-items:flex-start;background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:13px 14px;box-shadow:0 1px 2px rgba(20,32,55,.04)"><div style="width:24px;height:24px;flex:none;border-radius:7px;background:var(--accent-soft);color:var(--accent-700);display:flex;align-items:center;justify-content:center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div><div style="font-size:13px;color:var(--txt);line-height:1.5">' + esc(rc) + '</div></div>';
    }).join('');
    return '<div style="padding:18px"><div style="text-align:center"><div style="width:56px;height:56px;margin:0 auto;color:var(--accent)">' + tria(56) + '</div><h2 style="font-family:\'Newsreader\',serif;font-size:22px;font-weight:600;color:var(--ink);margin:10px 0 0">Análisis de trIA</h2><p style="font-size:13px;color:var(--txt2);margin:5px 0 0;line-height:1.5">Tu copiloto del negocio. Esto es lo que veo esta semana.</p></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px"><div style="background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:13px;box-shadow:0 1px 2px rgba(20,32,55,.04)"><div style="font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--txt3);font-weight:700">Recurrencia</div><div style="font-family:\'Newsreader\',serif;font-size:22px;font-weight:600;color:var(--ink);margin-top:3px">78%</div><div style="font-size:11px;color:#2E9B73;font-weight:600">↑ vuelven en 30 días</div></div>' +
      '<div style="background:var(--surface);border:1px solid var(--border);border-radius:13px;padding:13px;box-shadow:0 1px 2px rgba(20,32,55,.04)"><div style="font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--txt3);font-weight:700">Nuevos</div><div style="font-family:\'Newsreader\',serif;font-size:22px;font-weight:600;color:var(--ink);margin-top:3px">4</div><div style="font-size:11px;color:var(--txt2)">esta semana · IG</div></div></div>' +
      '<div style="margin-top:12px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(20,32,55,.04)"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:13px"><span style="font-size:13px;font-weight:700;color:var(--ink)">Ocupación por hora</span><span style="font-size:11px;color:var(--txt3)">peak 19h</span></div><div style="display:flex;align-items:flex-end;gap:5px;height:88px">' + hours + '</div></div>' +
      '<div style="margin-top:12px"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--txt3);font-weight:700;padding:0 2px 9px">Clientes en riesgo de fuga</div><div style="display:flex;flex-direction:column;gap:9px">' + risk + '</div></div>' +
      '<div style="margin-top:12px;background:linear-gradient(150deg,#16234A,#0F1933);border-radius:16px;padding:16px;color:#fff"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:700">Proyección de cierre</div><div style="font-family:\'Newsreader\',serif;font-size:26px;font-weight:600;margin-top:4px;font-variant-numeric:tabular-nums">~$2.180.000</div><div style="font-size:12px;color:#C5D0E4;margin-top:3px;line-height:1.5">A este ritmo cierras junio <b style="color:#3FB587">+9%</b> vs mayo. Si abres los 2 cupos del viernes, sube a ~$2.260.000.</div></div>' +
      '<div style="margin-top:12px"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--txt3);font-weight:700;padding:0 2px 9px">Recomendaciones</div><div style="display:flex;flex-direction:column;gap:9px">' + recs + '</div></div>' +
      '<div style="margin-top:14px;background:var(--accent-soft);border:1px solid var(--accent-100);border-radius:12px;padding:11px 13px;display:flex;align-items:center;gap:9px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-700)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg><span style="font-size:11.5px;color:var(--accent-700);line-height:1.4">Contenido generado por IA. Tú decides y apruebas cada acción.</span></div></div>';
  }
  function crmClientDetail(v) {
    var st = App.state, co = v.co;
    var nSess = co ? (co.visits === 0 ? 0 : Math.min(4, Math.max(3, (co.visits % 3) + 3))) : 0;
    var sessions = '';
    if (nSess > 0) {
      var cards = Array.from({ length: nSess }, function (_, j) {
        var sv = j === 0 ? co.fav : D.SERV[(st.client + j) % D.SERV.length].n;
        var p = D.SERV[(st.client + j) % D.SERV.length].p;
        var date = D.SESS_DATES[j] || ('hace ' + (j + 1) + ' m');
        return '<div style="flex:none;width:138px;background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;box-shadow:0 1px 2px rgba(20,32,55,.04)"><image-slot id="cut-' + st.client + '-' + j + '" placeholder="Foto del corte" shape="rect" style="display:block;width:100%;height:150px"></image-slot><div style="padding:9px 11px"><div style="font-size:12.5px;font-weight:700;color:var(--ink)">' + esc(sv) + '</div><div style="display:flex;align-items:center;justify-content:space-between;margin-top:2px"><span style="font-size:11px;color:var(--txt3)">' + esc(date) + '</span><span style="font-size:11.5px;font-weight:700;color:var(--accent-700);font-variant-numeric:tabular-nums">' + clp(p) + '</span></div></div></div>';
      }).join('');
      sessions = '<div class="scr" style="display:flex;gap:11px;overflow-x:auto;padding:0 2px 4px">' + cards + '</div><p style="font-size:11px;color:var(--txt3);margin:8px 2px 0;line-height:1.45">Matías arrastra una foto tras cada corte para llevar el historial visual del cliente.</p>';
    } else {
      sessions = '<div style="background:var(--surface);border:1px dashed var(--border2);border-radius:14px;padding:20px;text-align:center;color:var(--txt3);font-size:12.5px;line-height:1.5">Aún sin cortes registrados.<br>La primera foto aparecerá aquí tras su próxima visita.</div>';
    }
    return '<div style="padding:16px 18px 24px"><div style="' + v.colWide + '">' +
      '<button ' + aAttr('closeClient') + ' style="display:flex;align-items:center;gap:7px;background:none;border:0;color:var(--txt2);font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;padding:6px 0"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>Cartera de clientes</button>' +
      '<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px;box-shadow:0 1px 2px rgba(20,32,55,.05);margin-top:6px"><div style="display:flex;gap:13px;align-items:center"><div style="width:54px;height:54px;flex:none;border-radius:50%;background:var(--accent);color:var(--accent-fg);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;font-family:\'Newsreader\',serif">' + esc(ini(co.n)) + '</div><div style="flex:1"><div style="font-size:17px;font-weight:700;color:var(--ink)">' + esc(co.n) + '</div><div style="font-size:12.5px;color:var(--txt2)">Última visita ' + esc(co.last) + '</div></div></div>' +
      '<div style="display:flex;margin-top:16px;border-top:1px solid var(--hair);padding-top:14px"><div style="flex:1;text-align:center"><div style="font-family:\'Newsreader\',serif;font-size:22px;font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums">' + co.visits + '</div><div style="font-size:11px;color:var(--txt3)">visitas</div></div><div style="flex:1;text-align:center;border-left:1px solid var(--hair);border-right:1px solid var(--hair)"><div style="font-family:\'Newsreader\',serif;font-size:22px;font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums">' + clp(co.spent) + '</div><div style="font-size:11px;color:var(--txt3)">histórico</div></div><div style="flex:1;text-align:center"><div style="font-family:\'Newsreader\',serif;font-size:15px;font-weight:600;color:var(--ink);margin-top:5px">' + esc(co.fav) + '</div><div style="font-size:11px;color:var(--txt3)">favorito</div></div></div></div>' +
      '<div style="margin-top:14px"><div style="display:flex;align-items:center;justify-content:space-between;padding:0 2px 9px"><span style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--txt3);font-weight:700">Sesiones anteriores</span><span style="font-size:11.5px;color:var(--txt3)">' + co.visits + ' en total</span></div>' + sessions + '</div>' +
      '<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px 18px;box-shadow:0 1px 2px rgba(20,32,55,.05);margin-top:14px"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--txt3);font-weight:700">Nota de Matías</div><p style="font-size:13.5px;color:var(--txt);margin:7px 0 0;line-height:1.55">' + esc(co.notas) + '</p></div>' +
      '<button ' + aAttr('whats', telDigits(co.tel)) + ' style="margin-top:16px;width:100%;padding:14px;border-radius:12px;border:0;background:var(--accent);color:var(--accent-fg);font-family:inherit;font-size:14.5px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 20.5l1.7-5.4A8.4 8.4 0 1 1 21 11.5z"/></svg>Escribir por WhatsApp</button>' +
      '</div></div>';
  }
  function authMsg(m) {
    m = String(m || '');
    if (/invalid login credentials/i.test(m)) return 'Email o contraseña incorrectos.';
    if (/email not confirmed/i.test(m)) return 'Email sin confirmar. Revisa tu correo.';
    if (/sin-conexion/i.test(m)) return 'Sin conexión a Supabase.';
    return 'No se pudo iniciar sesión: ' + m;
  }
  function authInput(label, fieldName, type, ph, val) {
    // type="email"/"number" NO soportan selectionStart → rompe la restauración
    // del cursor al re-render (texto invertido). Usamos text + inputmode.
    var typeAttr = type === 'password'
      ? 'type="password" autocomplete="current-password"'
      : 'type="text" inputmode="email" autocomplete="username" autocapitalize="none" spellcheck="false"';
    return '<div style="text-align:left;margin-top:12px"><label style="font-size:12px;font-weight:700;color:#C5D0E4;display:block;margin-bottom:6px">' + label + '</label>' +
      '<input ' + typeAttr + ' value="' + esc(val) + '" data-field="' + fieldName + '" placeholder="' + esc(ph) + '" style="width:100%;padding:12px 13px;border-radius:11px;border:1.5px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;font-size:14.5px;outline:none" data-focus="border-color:var(--accent)"/></div>';
  }
  // Login a PÁGINA COMPLETA: protege el acceso a TODA la demo.
  function appLogin(v) {
    var st = App.state;
    var err = st.authErr ? '<div style="margin-top:12px;background:rgba(224,112,95,.14);border:1px solid rgba(224,112,95,.4);color:#F2B5AB;font-size:12.5px;border-radius:10px;padding:10px 12px;text-align:left">' + esc(st.authErr) + '</div>' : '';
    var btnStyle = 'width:100%;margin-top:16px;padding:14px;border-radius:12px;border:0;background:var(--accent);color:var(--accent-fg);font-family:inherit;font-size:15px;font-weight:700;cursor:' + (st.authLoading ? 'wait' : 'pointer') + ';';
    return '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(1100px 560px at 82% -8%, rgba(43,160,171,.12), transparent 58%), radial-gradient(900px 500px at 12% 110%, rgba(20,32,55,.5), transparent 60%), linear-gradient(150deg,#16234A,#0F1933);color:#fff">' +
      '<div style="width:100%;max-width:380px;text-align:center">' +
      '<div style="width:64px;height:64px;margin:0 auto;border-radius:16px;background:linear-gradient(150deg, rgba(43,160,171,.22), rgba(255,255,255,.03));display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.1)">' + logoFull(34) + '</div>' +
      '<div style="font-family:\'Newsreader\',serif;font-size:26px;font-weight:600;margin-top:16px">Tríada<span style="color:var(--accent)">·</span></div>' +
      '<div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:700;margin-top:4px">Demo privada · ' + esc(v.shopName) + '</div>' +
      '<p style="font-size:13.5px;color:#9FB0CC;margin:12px 0 0;line-height:1.55">Acceso con invitación. Ingresa para explorar la plataforma: sitio web, reservas, cursos y CRM.</p>' +
      '<div style="text-align:left">' +
      authInput('Email', 'authEmail', 'email', 'tu@email.cl', st.authEmail) +
      authInput('Contraseña', 'authPass', 'password', '••••••••', st.authPass) +
      '</div>' + err +
      '<button ' + aAttr('login') + ' style="' + btnStyle + '">' + (st.authLoading ? 'Entrando…' : 'Entrar') + '</button>' +
      '<div style="display:flex;align-items:center;gap:7px;justify-content:center;margin-top:18px;color:#6E7CA3;font-size:11px"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>Conexión segura · Supabase Auth</div>' +
      '</div></div>';
  }
  function secCrm(v) {
    var st = App.state;
    if (st.client != null && v.co) {
      return '<div style="padding-bottom:74px;background:var(--app-bg);min-height:100%">' + crmClientDetail(v) + '</div>';
    }
    var crmTitles = { resumen: 'Resumen', agenda: 'Agenda', clientes: 'Clientes', finanzas: 'Finanzas', tria: 'Análisis trIA' };
    var dts = function (tb) { var on = st.crmTab === tb; return 'padding:7px 13px;border-radius:9px;border:0;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;transition:.15s;background:' + (on ? A : 'transparent') + ';color:' + (on ? AFG : 'var(--txt2)') + ';'; };
    var tabs = [['resumen', 'Resumen'], ['agenda', 'Agenda'], ['clientes', 'Clientes'], ['finanzas', 'Finanzas'], ['tria', 'trIA']].map(function (t) {
      return '<button ' + aAttr('crmTab', t[0]) + ' style="' + dts(t[0]) + '">' + t[1] + '</button>';
    }).join('');
    var content = st.crmTab === 'agenda' ? crmAgenda(v) : st.crmTab === 'clientes' ? crmClientes(v) : st.crmTab === 'finanzas' ? crmFinanzas(v) : st.crmTab === 'tria' ? crmTria(v) : crmResumen(v);
    return '<div style="padding-bottom:74px;background:var(--app-bg);min-height:100%"><div>' +
      '<div style="padding:16px 18px 14px;background:var(--surface);border-bottom:1px solid var(--hair);position:sticky;top:0;z-index:3"><div style="' + v.colWide + ';display:flex;align-items:center;justify-content:space-between">' +
      '<div><div style="font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--txt3);font-weight:700;white-space:nowrap">' + esc(v.shopName) + '</div><div style="font-family:\'Newsreader\',serif;font-size:20px;font-weight:600;color:var(--ink);line-height:1.15">' + esc(crmTitles[st.crmTab] || 'Resumen') + '</div></div>' +
      '<div style="display:flex;align-items:center;gap:12px"><div style="' + v.deskTabs + '">' + tabs + '</div><button ' + aAttr('logout') + ' title="Cerrar sesión" style="width:38px;height:38px;flex:none;border-radius:50%;background:#16234A;color:#fff;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;font-family:inherit">MF</button></div>' +
      '</div></div><div style="' + v.colWide + '">' + content + '</div></div></div>';
  }

  // ── BARRAS + OVERLAYS ────────────────────────────────────────
  function crmBottomBar(v) {
    var st = App.state;
    var ts = function (tb) { var on = st.crmTab === tb; return 'flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 0 5px;cursor:pointer;border:0;background:transparent;font-family:inherit;font-size:10px;font-weight:600;transition:.15s;color:' + (on ? A : 'var(--txt3)') + ';'; };
    var tab = function (tbid, svg, label) { return '<button ' + aAttr('crmTab', tbid) + ' style="' + ts(tbid) + '">' + svg + label + '</button>'; };
    return '<div style="flex:none;display:flex;background:var(--surface);border-top:1px solid var(--border);padding-bottom:6px;z-index:5">' +
      tab('resumen', '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>', 'Resumen') +
      tab('agenda', '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>', 'Agenda') +
      tab('clientes', '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/></svg>', 'Clientes') +
      tab('finanzas', '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20M6 15h4"/></svg>', 'Finanzas') +
      tab('tria', '<svg width="20" height="20" viewBox="0 0 120 120" fill="none" stroke="currentColor"><path d="M26 80 L60 55 L94 80" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path d="M26 56 L60 31 L94 56" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></svg>', 'trIA') +
      '</div>';
  }
  function stickyCTA(v) {
    var st = App.state;
    if (st.route === 'web') return '<div style="position:absolute;left:0;right:0;bottom:0;padding:12px 18px 16px;background:linear-gradient(to top,var(--app-bg) 65%,transparent);z-index:5"><div style="' + v.ctaWrap + '"><button ' + aAttr('reservar') + ' style="width:100%;padding:15px;border-radius:13px;border:0;background:var(--accent);color:var(--accent-fg);font-family:inherit;font-size:15.5px;font-weight:700;cursor:pointer;box-shadow:0 10px 24px rgba(20,32,55,.18)">Reservar hora</button></div></div>';
    if (st.route === 'courses') return '<div style="position:absolute;left:0;right:0;bottom:0;padding:12px 18px 16px;background:linear-gradient(to top,var(--app-bg) 65%,transparent);z-index:5"><div style="' + v.ctaWrap + '"><button ' + aAttr('enroll') + ' style="width:100%;padding:15px;border-radius:13px;border:0;background:var(--accent);color:var(--accent-fg);font-family:inherit;font-size:15.5px;font-weight:700;cursor:pointer;box-shadow:0 10px 24px rgba(20,32,55,.18)">Inscribirme · ' + esc(D.SHOP.coursePrice) + '</button></div></div>';
    return '';
  }
  function sheet(inner) {
    return '<div onclick="" data-stop class="scr" style="background:var(--surface);border-radius:22px 22px 0 0;width:100%;max-width:460px;padding:8px 22px 24px;box-shadow:0 -10px 50px rgba(0,0,0,.4);max-height:94%;overflow-y:auto"><div style="width:40px;height:4px;border-radius:2px;background:var(--border2);margin:8px auto 16px"></div>' + inner + '</div>';
  }
  function backdrop(closeAct, inner) {
    return '<div ' + aAttr(closeAct) + ' style="position:absolute;inset:0;background:rgba(11,19,38,.55);backdrop-filter:blur(3px);display:flex;align-items:flex-end;justify-content:center;z-index:12">' + sheet(inner) + '</div>';
  }
  function overlays(v) {
    var st = App.state, out = '';
    if (st.enrollOpen) {
      var body;
      if (!st.enrollDone) {
        body = '<div><div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);font-weight:700">Inscripción · Curso de Barbería</div><h3 style="font-family:\'Newsreader\',serif;font-size:24px;font-weight:600;color:var(--ink);margin:5px 0 0">Reserva tu cupo</h3>' +
          '<div style="margin-top:16px;display:flex;flex-direction:column;gap:11px">' + ovField('Nombre completo', 'enName', st.enName, 'Tu nombre') + ovField('Email', 'enEmail', st.enEmail, 'tu@email.cl') + '</div>' +
          '<div style="margin-top:14px"><div style="font-size:12.5px;font-weight:700;color:var(--ink);margin-bottom:8px">Plan de pago</div><div style="display:flex;gap:9px">' +
          '<button ' + aAttr('setPlan', 'contado') + ' style="' + planStyle(st.enPlan === 'contado') + '">Contado<br>' + esc(D.SHOP.coursePrice) + '</button>' +
          '<button ' + aAttr('setPlan', 'cuotas') + ' style="' + planStyle(st.enPlan === 'cuotas') + '">3 cuotas<br>$98.000 c/u</button></div></div>' +
          '<button ' + aAttr('enConfirm') + ' style="' + bigBtn(!!(st.enName.trim() && st.enEmail.trim())) + ';margin-top:18px">Confirmar inscripción</button>' +
          '<p style="font-size:11.5px;color:var(--txt3);text-align:center;margin:10px 0 0">Cupos limitados · Matías confirma el pago por WhatsApp.</p></div>';
      } else {
        var planLabel = st.enPlan === 'contado' ? ('pago contado · ' + D.SHOP.coursePrice) : '3 cuotas de $98.000';
        body = '<div style="text-align:center;padding:6px 0 4px"><div style="width:60px;height:60px;margin:0 auto;border-radius:50%;background:var(--accent);color:var(--accent-fg);display:flex;align-items:center;justify-content:center"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg></div><h3 style="font-family:\'Newsreader\',serif;font-size:22px;font-weight:600;color:var(--ink);margin:16px 0 0">¡Cupo reservado!</h3><p style="font-size:13px;color:var(--txt2);margin:8px 0 0;line-height:1.55">Te enviamos la confirmación a <b style="color:var(--ink)">' + esc(st.enEmail) + '</b>. Matías te escribirá por WhatsApp para coordinar el ' + esc(planLabel) + '.</p><button ' + aAttr('closeEnroll') + ' style="margin-top:18px;width:100%;padding:14px;border-radius:12px;border:0;background:var(--accent);color:var(--accent-fg);font-family:inherit;font-size:14.5px;font-weight:700;cursor:pointer">Listo</button></div>';
      }
      out += backdrop('closeEnroll', body);
    }
    if (st.addOpen) {
      var favs = D.SERV.map(function (s) { return '<button ' + aAttr('acFav', s.id) + ' style="' + chip(st.acFav === s.id) + '">' + esc(s.n) + '</button>'; }).join('');
      var addBody = '<div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);font-weight:700">CRM · Cartera</div><h3 style="font-family:\'Newsreader\',serif;font-size:24px;font-weight:600;color:var(--ink);margin:5px 0 0">Nuevo cliente</h3>' +
        '<div style="margin-top:16px;display:flex;flex-direction:column;gap:11px">' + ovField('Nombre', 'acName', st.acName, 'Ej. Joaquín Reyes') + ovField('WhatsApp', 'acTel', st.acTel, '+56 9 ...') + '</div>' +
        '<div style="margin-top:14px"><div style="font-size:12.5px;font-weight:700;color:var(--ink);margin-bottom:8px">Servicio favorito</div><div class="scr" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px">' + favs + '</div></div>' +
        '<button ' + aAttr('saveClient') + ' style="' + bigBtn(!!st.acName.trim()) + ';margin-top:18px">Guardar cliente</button>';
      out += backdrop('closeAdd', addBody);
    }
    if (st.citaTime != null) {
      var cli = v.allCli.map(function (c, i) { return '<button ' + aAttr('ciClient', i) + ' style="' + chip(st.ciClient === i) + '">' + esc(c.n) + '</button>'; }).join('');
      var svc = D.SERV.map(function (s) { return '<button ' + aAttr('ciSvc', s.id) + ' style="' + chip(st.ciSvc === s.id) + '">' + esc(s.n) + '</button>'; }).join('');
      var citaBody = '<div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);font-weight:700">Agenda · ' + esc(st.citaTime) + '</div><h3 style="font-family:\'Newsreader\',serif;font-size:24px;font-weight:600;color:var(--ink);margin:5px 0 0">Nueva cita</h3>' +
        '<div style="margin-top:16px;font-size:12.5px;font-weight:700;color:var(--ink);margin-bottom:8px">Cliente</div><div class="scr" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px">' + cli + '</div>' +
        '<div style="margin-top:14px;font-size:12.5px;font-weight:700;color:var(--ink);margin-bottom:8px">Servicio</div><div class="scr" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px">' + svc + '</div>' +
        '<button ' + aAttr('saveCita') + ' style="width:100%;padding:14px;border-radius:12px;border:0;background:var(--accent);color:var(--accent-fg);font-family:inherit;font-size:15px;font-weight:700;cursor:pointer;margin-top:18px">Agendar cita</button>';
      out += backdrop('closeCita', citaBody);
    }
    return out;
  }
  function ovField(label, fieldName, val, ph) {
    return '<div><label style="font-size:12.5px;font-weight:700;color:var(--ink);display:block;margin-bottom:6px">' + esc(label) + '</label><input value="' + esc(val) + '" data-field="' + fieldName + '" placeholder="' + esc(ph) + '" style="width:100%;padding:12px 13px;border-radius:11px;border:1.5px solid var(--border2);font-size:14.5px;color:var(--ink);outline:none;background:var(--surface)" data-focus="border-color:var(--accent)"/></div>';
  }

  // ── ESTRUCTURA: marco + escenario ────────────────────────────
  function statusBar(v) {
    if (!v.desk) {
      return '<div style="height:44px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 26px 0 30px;background:var(--surface);color:var(--ink);font-size:13px;font-weight:700;z-index:6;border-bottom:1px solid var(--hair)"><span>9:41</span><div style="display:flex;align-items:center;gap:6px"><svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1"/><rect x="4.5" y="5" width="3" height="6" rx="1"/><rect x="9" y="2.5" width="3" height="8.5" rx="1"/><rect x="13.5" y="0" width="3" height="11" rx="1"/></svg><svg width="22" height="11" viewBox="0 0 22 11" fill="none"><rect x="1" y="1" width="17" height="9" rx="2.2" stroke="currentColor" stroke-opacity=".5"/><rect x="2.5" y="2.5" width="12" height="6" rx="1.2" fill="currentColor"/><rect x="19" y="3.6" width="1.8" height="3.8" rx="1" fill="currentColor" fill-opacity=".5"/></svg></div></div>';
    }
    return '<div style="height:42px;flex:none;display:flex;align-items:center;gap:14px;padding:0 16px;background:var(--surface);color:var(--txt2);z-index:6;border-bottom:1px solid var(--hair)"><div style="display:flex;gap:7px"><span style="width:11px;height:11px;border-radius:50%;background:#E0705F"></span><span style="width:11px;height:11px;border-radius:50%;background:#DDA73A"></span><span style="width:11px;height:11px;border-radius:50%;background:#3FB587"></span></div><div style="flex:1;max-width:420px;margin:0 auto;background:var(--surface2);border-radius:8px;padding:6px 14px;font-size:12px;color:var(--txt2);display:flex;align-items:center;gap:7px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>' + esc(D.SHOP.domain) + esc(v.urlPath) + '</div><div style="width:54px"></div></div>';
  }
  function activeSection(v) {
    var r = App.state.route;
    if (r === 'web') return R1.secWeb(v);
    if (r === 'booking') return R1.secBooking(v);
    if (r === 'courses') return secCourses(v);
    if (r === 'crm') return secCrm(v);
    return R1.secLauncher(v);
  }
  function buildStage(v) {
    var st = App.state;
    var bottomBar = (st.route === 'crm' && !v.desk && st.client == null && !v.locked) ? crmBottomBar(v) : '';
    var screen = '<div style="' + v.screenStyle + '">' + statusBar(v) +
      '<div class="scr" id="bt-scroll" style="flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;background:var(--app-bg)">' + activeSection(v) + '</div>' +
      bottomBar + stickyCTA(v) + overlays(v) + '</div>';
    var laptopBase = v.desk ? '<div style="width:940px;max-width:108%;height:15px;background:linear-gradient(#C2C8D4,#949DAD);border-radius:0 0 13px 13px;box-shadow:0 22px 40px rgba(0,0,0,.45);position:relative"><div style="position:absolute;left:50%;top:0;transform:translateX(-50%);width:90px;height:6px;background:rgba(0,0,0,.18);border-radius:0 0 7px 7px"></div></div>' : '';
    return '<main style="flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:34px 24px;gap:16px">' +
      '<div style="max-width:392px;width:100%;padding:0 6px"><div style="font-family:\'Newsreader\',serif;font-size:21px;font-weight:600;color:#fff">' + esc(v.pt[0]) + '</div><div style="font-size:12px;color:#8C99B5;margin-top:1px">' + esc(v.pt[1]) + '</div></div>' +
      '<div style="display:flex;flex-direction:column;align-items:center"><div style="' + v.frameStyle + '">' + screen + '</div>' + laptopBase + '</div></main>';
  }
  function buildAll(v) {
    if (v.locked) return appLogin(v); // portón de acceso a toda la demo
    return '<div style="min-height:100vh;background:radial-gradient(1100px 560px at 82% -8%, rgba(43,160,171,.12), transparent 58%), radial-gradient(900px 500px at 12% 110%, rgba(20,32,55,.5), transparent 60%), linear-gradient(150deg,#16234A,#0F1933);display:flex;align-items:stretch;color:#fff">' +
      R1.renderRail(v) + buildStage(v) + '</div>';
  }

  // ── HOVER / FOCUS runtime (reemplaza style-hover / style-focus) ─
  function attachHoverFocus(root) {
    root.querySelectorAll('[data-hover]').forEach(function (el) {
      var hov = el.getAttribute('data-hover');
      el.addEventListener('mouseenter', function () { el._base = el.getAttribute('style') || ''; el.setAttribute('style', el._base + ';' + hov); });
      el.addEventListener('mouseleave', function () { if (el._base != null) el.setAttribute('style', el._base); });
    });
    root.querySelectorAll('[data-focus]').forEach(function (el) {
      var fo = el.getAttribute('data-focus');
      el.addEventListener('focus', function () { el._base = el.getAttribute('style') || ''; el.setAttribute('style', el._base + ';' + fo); });
      el.addEventListener('blur', function () { if (el._base != null) el.setAttribute('style', el._base); });
    });
  }

  // ── ACCIONES (delegación) ────────────────────────────────────
  var ACT = {
    nav: function (a) {
      if (a === 'booking') App.setState({ route: 'booking', bStep: 1, confirmed: false, client: null, addOpen: false, citaTime: null, enrollOpen: false, enrollDone: false }, { resetScroll: true });
      else App.go(a);
    },
    dev: function (a) { App.setState({ device: a }); },
    setPalette: function (a) { App.applyPalette(a); App.setState({ palette: a }); },
    setTheme: function (a) { App.applyTheme(a); App.setState({ theme: a }); },
    setIcons: function (a) { App.applyIcons(a); App.setState({ iconStyle: a }); },
    reservar: function () { App.setState({ route: 'booking', bStep: 1, confirmed: false }, { resetScroll: true }); },
    webBook: function (a) { App.setState({ svc: a, bStep: 2, route: 'booking', confirmed: false }, { resetScroll: true }); },
    whats: function (a) { window.open('https://wa.me/' + a, '_blank'); },
    bBack: function () { var s = App.state; if (s.bStep > 1) App.setState({ bStep: s.bStep - 1 }); else App.go('web'); },
    pickSvc: function (a) { App.setState({ svc: a }); },
    next: function (a) { var s = App.state, t = +a; if (t === 2 && !s.svc) return; if (t === 4 && !s.slot) return; App.setState({ bStep: t }); },
    pickDay: function (a) { App.setState({ day: +a }); },
    pickSlot: function (a) { App.setState({ slot: a }); },
    confirm: function () {
      var s = App.state; var svc = D.SERV.find(function (x) { return x.id === s.svc; });
      if (!(svc && s.slot && s.bName.trim() && s.bPhone.trim())) return;
      // fecha ISO (yyyy-mm-dd) desde el offset de día elegido
      var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + s.day);
      var pad = function (n) { return String(n).padStart(2, '0'); };
      var fecha = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      if (window.BT_DB && BT_DB.ready) {
        BT_DB.crearCita({ cliente_nombre: s.bName.trim(), telefono: s.bPhone.trim(), servicio_nombre: svc.n, fecha: fecha, hora: s.slot, estado: 'pendiente' })
          .then(function (r) { if (r && r.error) console.warn('[BT] No se pudo guardar la cita:', r.error.message); })
          .catch(function (e) { console.warn('[BT] Error guardando cita:', e); });
      }
      App.setState({ confirmed: true }, { resetScroll: true });
    },
    reset: function () { App.setState({ bStep: 1, svc: null, slot: null, bName: '', bPhone: '', confirmed: false }, { resetScroll: true }); },
    enroll: function () { App.setState({ enrollOpen: true }); },
    closeEnroll: function () { App.setState({ enrollOpen: false, enrollDone: false, enName: '', enEmail: '', enPlan: 'contado' }); },
    setPlan: function (a) { App.setState({ enPlan: a }); },
    enConfirm: function () {
      var s = App.state; if (!(s.enName.trim() && s.enEmail.trim())) return;
      if (window.BT_DB && BT_DB.ready) {
        BT_DB.crearInscripcion({ nombre: s.enName.trim(), email: s.enEmail.trim(), plan: s.enPlan })
          .then(function (r) { if (r && r.error) console.warn('[BT] No se pudo guardar la inscripción:', r.error.message); })
          .catch(function (e) { console.warn('[BT] Error guardando inscripción:', e); });
      }
      App.setState({ enrollDone: true });
    },
    crmTab: function (a) { App.setState({ crmTab: a, client: null }); },
    login: function () {
      var s = App.state;
      if (!(s.authEmail.trim() && s.authPass)) { App.setState({ authErr: 'Ingresa tu email y contraseña.' }); return; }
      App.setState({ authLoading: true, authErr: '' });
      BT_DB.signIn(s.authEmail.trim(), s.authPass).then(function (r) {
        if (r && r.error) App.setState({ authLoading: false, authErr: authMsg(r.error.message) });
        else App.setState({ authed: true, authLoading: false, authPass: '', authErr: '' });
      }).catch(function () { App.setState({ authLoading: false, authErr: 'Error de conexión. Intenta de nuevo.' }); });
    },
    logout: function () { if (window.BT_DB) BT_DB.signOut(); App.setState({ authed: false, crmTab: 'resumen', client: null, authPass: '', authErr: '' }); },
    openClient: function (a) { App.setState({ client: +a }, { resetScroll: true }); },
    closeClient: function () { App.setState({ client: null }); },
    openAdd: function () { App.setState({ addOpen: true }); },
    closeAdd: function () { App.setState({ addOpen: false, acName: '', acTel: '' }); },
    acFav: function (a) { App.setState({ acFav: a }); },
    saveClient: function () {
      var s = App.state; if (!s.acName.trim()) return;
      var fav = (D.SERV.find(function (x) { return x.id === s.acFav; }) || D.SERV[0]).n;
      var nc = { n: s.acName.trim(), tel: s.acTel || '+56 9 0000 0000', last: 'nuevo', visits: 0, spent: 0, fav: fav, notas: 'Cliente agregado por Matías.', risk: false };
      var idx = D.CLI.length + s.extraClients.length;
      App.setState(function (p) { return { extraClients: p.extraClients.concat([nc]), addOpen: false, acName: '', acTel: '', client: idx }; }, { resetScroll: true });
    },
    aday: function (a) { App.setState({ aday: +a }); },
    openCita: function (a) { App.setState({ citaTime: a }); },
    closeCita: function () { App.setState({ citaTime: null }); },
    ciClient: function (a) { App.setState({ ciClient: +a }); },
    ciSvc: function (a) { App.setState({ ciSvc: a }); },
    saveCita: function () {
      var s = App.state, allCli = D.CLI.concat(s.extraClients);
      var c = allCli[s.ciClient] || allCli[0];
      var sv = D.SERV.find(function (x) { return x.id === s.ciSvc; }) || D.SERV[0];
      App.setState(function (p) {
        var ex = Object.assign({}, p.agendaExtra); ex[s.citaTime] = { who: c.n, svc: sv.n, dur: sv.d.replace(' min', 'm') };
        return { agendaExtra: ex, citaTime: null };
      });
    }
  };

  // ── render / bind / mount ────────────────────────────────────
  App.render = function () {
    var v = H.compute();
    var root = document.getElementById('app');
    var act = document.activeElement, fKey = null, selS = null, selE = null;
    if (act && act.dataset && act.dataset.field) { fKey = act.dataset.field; try { selS = act.selectionStart; selE = act.selectionEnd; } catch (e) {} }
    var sc = document.getElementById('bt-scroll'); var prev = sc ? sc.scrollTop : 0;
    root.innerHTML = buildAll(v);
    var sc2 = document.getElementById('bt-scroll'); if (sc2) sc2.scrollTop = App._resetScroll ? 0 : prev;
    App._resetScroll = false;
    if (fKey) { var el = root.querySelector('[data-field="' + fKey + '"]'); if (el) { el.focus(); try { if (selS == null) { selS = selE = el.value.length; } el.setSelectionRange(selS, selE); } catch (e) {} } }
    attachHoverFocus(root);
  };

  App.mount = function () {
    var root = document.getElementById('app');
    App.applyPalette(App.state.palette);
    App.applyTheme(App.state.theme);
    App.applyIcons(App.state.iconStyle);
    root.addEventListener('click', function (e) {
      var actEl = e.target.closest('[data-act]'); if (!actEl) return;
      var stopEl = e.target.closest('[data-stop]');
      if (stopEl && actEl !== stopEl && actEl.contains(stopEl)) return; // clic dentro del panel protegido
      var fn = ACT[actEl.dataset.act]; if (fn) fn(actEl.dataset.arg, actEl, e);
    });
    root.addEventListener('input', function (e) {
      var f = e.target.dataset && e.target.dataset.field; if (!f) return;
      App.state[f] = e.target.value;
      App.render();
    });
    // Enter en el login = Entrar
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var f = e.target.dataset && e.target.dataset.field;
      if (f === 'authEmail' || f === 'authPass') { e.preventDefault(); ACT.login(); }
    });
    App.render();
    // Bootstrap de sesión (login real del CRM)
    if (window.BT_DB && BT_DB.ready) {
      BT_DB.getSession().then(function (r) {
        var sess = r && r.data && r.data.session;
        App.state.authed = !!sess;
        if (sess && sess.user) App.state.authEmail = sess.user.email || App.state.authEmail;
        App.render();
      });
      BT_DB.onAuth(function (_e, session) { App.state.authed = !!session; App.render(); });
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.mount);
  else App.mount();
})();
