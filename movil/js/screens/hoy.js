// ============================================================================
// screens/hoy.js — pantalla de aterrizaje (Hoy).
// Saludo + línea trIA + KPIs + "Tu día" (citas de hoy) + leads recientes.
// ============================================================================
import { db, store, PIPELINE_STAGES, meetingType, todayStr, escHtml, heat, initials, timeAgo, direccionCorta, tieneDireccion } from '../core.js';
import { logo, ic, toast, openWhatsApp, openTel, openComoLlegar } from '../ui.js';

const e = escHtml;
const stageOf = (estado) => PIPELINE_STAGES.find((s) => s.id === estado) || { color: '#94A0B6', bg: '#F0F2F6' };
const longDate = () => { const s = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1); };
// Cómo es la reunión, según el lugar: enlace → videollamada · teléfono → llamada ·
// cualquier otra cosa → presencial. Solo en las presenciales tiene sentido la ruta.
const modoDe = (lugar) => {
  const s = String(lugar || '');
  if (/https?:|meet\.|zoom|teams|videollamada/i.test(s)) return 'Zoom';
  if (/tel[eé]|fono|llamada|whatsapp/i.test(s)) return 'Telefónica';
  return 'Presencial';
};

let _leads = [];   // leads del día en memoria: los usa "Cómo llegar" de cada cita

function citaCard(c) {
  const t = meetingType(c.tipo);
  // Reunión presencial con lead direccionado → la ruta, a un toque, antes de salir.
  const lead = c.prospectoId ? _leads.find((l) => l.id === c.prospectoId) : null;
  const conRuta = modoDe(c.lugar) === 'Presencial' && lead && tieneDireccion(lead);
  return `
    <div class="card card--tap" data-cita="${e(c.id)}">
      <div style="display:flex;align-items:center;gap:13px">
        <div style="display:flex;flex-direction:column;align-items:center;min-width:46px">
          <span class="serif tabular" style="font-size:17px;font-weight:600;color:var(--ink)">${e(c.hora || '—')}</span>
          <span class="tabular" style="font-size:11px;color:var(--text3)">${c.durMin || 60} min</span>
        </div>
        <div style="width:3px;align-self:stretch;border-radius:2px;background:${t.color}"></div>
        <div style="flex:1;min-width:0">
          <div class="ell" style="font-weight:700;font-size:15px;color:var(--ink)">${e(c.titulo || t.label)}</div>
          <div style="display:flex;align-items:center;gap:7px;margin-top:3px">
            <span style="font-size:11px;font-weight:600;color:${t.color}">${e(t.label)}</span>
            <span style="font-size:11px;color:var(--text3)">·</span>
            <span style="font-size:12px;color:var(--text2)">${modoDe(c.lugar)}</span>
          </div>
        </div>
      </div>
      ${conRuta ? `
      <button class="lead-dir" data-map="${e(lead.id)}" aria-label="Cómo llegar a ${e(lead.empresa || lead.nombre)}">
        <span style="color:var(--teal);flex:none;display:flex">${ic('pin', { size: 15 })}</span>
        <span class="ell">${e(direccionCorta(lead))}</span>
        <span class="lead-dir__go">${ic('navigate', { size: 14, sw: 2 })} Cómo llegar</span>
      </button>` : ''}
    </div>`;
}

function leadCard(l) {
  const st = stageOf(l.estado), ht = heat(l.scoring);
  return `
    <div class="card card--tap" data-lead="${e(l.id)}">
      <div style="display:flex;align-items:center;gap:11px">
        <div style="width:40px;height:40px;border-radius:11px;background:${st.bg};color:${st.color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex:none">${e(initials(l.nombre))}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px"><span class="ell" style="font-weight:700;font-size:15px;color:var(--ink)">${e(l.nombre)}</span><span class="heat" style="background:${ht.color}"></span></div>
          <div class="ell" style="font-size:13px;color:var(--text2)">${e(l.empresa || '—')}</div>
        </div>
        <span style="font-size:11px;color:var(--text3);flex:none">${e(timeAgo(l.fechaCreacion))}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:11px">
        <span class="badge" style="color:${st.color};background:${st.bg}"><span class="dot"></span>${e(l.estado)}</span>
        <span style="flex:1"></span>
        <button class="qa qa--wa" data-wa="${e(l.telefono || '')}" aria-label="WhatsApp">${ic('whatsapp', { size: 17 })}</button>
        <button class="qa qa--tel" data-tel="${e(l.telefono || '')}" aria-label="Llamar">${ic('phone', { size: 16 })}</button>
      </div>
    </div>`;
}

// ── "Ahora": lo único que importa al abrir la app ───────────────────────────
// La pantalla no debería obligarte a leer cifras y deducir qué toca. Primero
// responde "¿qué hago AHORA?": la reunión que viene (con su cuenta regresiva y
// la acción que corresponde), o el lead más caliente esperando, o "al día".

const ts = (c) => {                       // fecha 'YYYY-MM-DD' + hora 'HH:MM' → epoch
  const [y, m, d] = String(c.fecha || '').split('-').map(Number);
  const [hh, mm] = String(c.hora || '00:00').split(':').map(Number);
  return (y && m && d) ? new Date(y, m - 1, d, hh || 0, mm || 0).getTime() : 0;
};

/** La cita en curso o la próxima DENTRO DE LAS PRÓXIMAS 4 HORAS. Más allá de eso
    no es "ahora": lo accionable pasa a ser el lead esperando, y la reunión igual
    se ve en "Tu día". */
function citaEnFoco(citasHoy, ventanaHoras = 4) {
  const ahora = Date.now();
  return citasHoy
    .map((c) => ({ c, ini: ts(c), fin: ts(c) + (c.durMin || 60) * 60000 }))
    .filter((x) => x.ini && x.fin > ahora && x.ini - ahora < ventanaHoras * 3600000)
    .sort((a, b) => a.ini - b.ini)[0] || null;
}

/** "en 45 min" · "en 2 h 10" · "en curso, termina 15:30" · "empieza ahora". */
function cuandoTexto(x) {
  const min = Math.round((x.ini - Date.now()) / 60000);
  if (min <= 0) return `En curso · termina ${new Date(x.fin).toTimeString().slice(0, 5)}`;
  if (min < 3) return 'Empieza ahora';
  if (min < 60) return `Empieza en ${min} min`;
  const h = Math.floor(min / 60), r = min % 60;
  return `Empieza en ${h} h${r ? ' ' + r : ''}`;
}

function bloqueAhora(foco, leads) {
  // 1) Hay reunión: nombre del cliente, cuándo, y la acción que toca.
  if (foco) {
    const c = foco.c, t = meetingType(c.tipo);
    const lead = c.prospectoId ? _leads.find((l) => l.id === c.prospectoId) : null;
    const remoto = modoDe(c.lugar) !== 'Presencial';
    const enlace = /https?:\/\/\S+/.exec(c.lugar || '');
    const quien = (lead && (lead.empresa || lead.nombre)) || c.titulo || t.label;
    const conRuta = !remoto && lead && tieneDireccion(lead);
    const inminente = foco.ini - Date.now() < 45 * 60000;
    return `
    <div class="ahora ${inminente ? 'ahora--ya' : ''}">
      <div class="ahora__eyebrow">${ic('clock', { size: 13, sw: 2.2 })} ${e(cuandoTexto(foco))}</div>
      <div class="ahora__t">${e(quien)}</div>
      <div class="ahora__d">${e(c.hora || '')} · ${e(c.titulo || t.label)} · ${c.durMin || 60} min${remoto ? ' · ' + e(modoDe(c.lugar)) : ''}</div>
      <div class="ahora__acciones">
        ${conRuta ? `<button class="btn btn--primary ahora__cta" data-map="${e(lead.id)}">${ic('navigate', { size: 16, sw: 2 })} Cómo llegar</button>` : ''}
        ${enlace ? `<a class="btn btn--primary ahora__cta" href="${e(enlace[0])}" target="_blank" rel="noopener">${ic('video', { size: 16 })} Entrar a la reunión</a>` : ''}
        ${lead && lead.telefono ? `<button class="btn btn--ghost ahora__cta" data-avisar="${e(lead.id)}">${ic('whatsapp', { size: 16 })} Avisar que voy</button>` : ''}
        ${lead ? `<button class="btn btn--ghost ahora__cta" data-ficha="${e(lead.id)}">Ver ficha</button>` : ''}
        ${/* Nunca una tarjeta sin salida: si la reunión no tiene lead, enlace ni
              dirección (p. ej. una interna), al menos lleva a la agenda. */ ''}
        ${(!conRuta && !enlace && !lead) ? `<button class="btn btn--ghost ahora__cta" data-go="agenda">Ver en la agenda</button>` : ''}
      </div>
    </div>`;
  }
  // 2) Sin reunión: el lead más caliente sin contactar manda.
  const pendientes = leads.filter((l) => l.estado === 'Nuevo')
    .sort((a, b) => (b.scoring || 0) - (a.scoring || 0));
  if (pendientes.length) {
    const l = pendientes[0];
    return `
    <div class="ahora">
      <div class="ahora__eyebrow">${ic('users', { size: 13, sw: 2.2 })} ${pendientes.length} ${pendientes.length === 1 ? 'lead espera' : 'leads esperan'} contacto</div>
      <div class="ahora__t">${e(l.empresa || l.nombre)}</div>
      <div class="ahora__d">El más caliente${l.rubro ? ' · ' + e(l.rubro) : ''}${l.dolorPrincipal ? ' · quiere ' + e(l.dolorPrincipal.toLowerCase()) : ''}</div>
      <div class="ahora__acciones">
        ${l.telefono ? `<button class="btn btn--primary ahora__cta" data-wa="${e(l.telefono)}">${ic('whatsapp', { size: 16 })} Escribirle</button>` : ''}
        <button class="btn btn--ghost ahora__cta" data-ficha="${e(l.id)}">Ver ficha</button>
      </div>
    </div>`;
  }
  // 3) Nada pendiente: decirlo y ofrecer lo único que suma.
  return `
    <div class="ahora ahora--calma">
      <div class="ahora__eyebrow">${ic('check', { size: 13, sw: 2.6 })} Al día</div>
      <div class="ahora__t">Sin reuniones ni leads pendientes</div>
      <div class="ahora__d">Buen momento para salir a buscar uno nuevo.</div>
      <div class="ahora__acciones"><button class="btn btn--primary ahora__cta" data-go="captura">${ic('userPlus', { size: 16 })} Capturar lead</button></div>
    </div>`;
}

const saludo = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches'; };

export default {
  chrome: true,
  async render(app) {
    const [leads, citas, props] = await Promise.all([
      db.prospectos.getAll(), db.citas.getAll(), db.propuestas.getAll(),
    ]);
    _leads = leads;
    const today = todayStr();
    const porContactar = leads.filter((l) => l.estado === 'Nuevo').length;
    const citasHoy = citas.filter((c) => c.fecha === today).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    const activas = props.filter((p) => !['aceptada', 'rechazada'].includes(String(p.estado || '').toLowerCase())).length;
    const foco = citaEnFoco(citasHoy);
    // "Por contactar" en vez de "recientes": lo reciente no es accionable, lo pendiente sí.
    const pendientes = leads.filter((l) => l.estado === 'Nuevo').sort((a, b) => (b.scoring || 0) - (a.scoring || 0));
    const listaLeads = (pendientes.length ? pendientes : leads).slice(0, 3);
    const tituloLeads = pendientes.length ? 'Por contactar' : 'Leads recientes';
    const nombre = (store.profile && store.profile.nombre) || (store.user && store.user.email) || 'Martín';
    const first = nombre.split(' ')[0];
    const ini = initials(nombre);

    return `
    <section class="screen">
      <header class="hdr hdr--bar">
        <div style="display:flex;align-items:center;gap:9px">${logo(26)}<span class="wordmark" style="font-size:20px">Tríada<span class="brand-dot">·</span></span></div>
        <div style="display:flex;align-items:center;gap:6px">
          <button class="icon-btn" id="bell" style="width:40px;height:40px" aria-label="Recordatorios">${ic('bell', { size: 20 })}${(citasHoy.length || porContactar) ? '<span class="dot-badge"></span>' : ''}</button>
          <button class="avatar" data-go="perfil" style="width:40px;height:40px;font-size:15px">${e(ini)}</button>
        </div>
      </header>

      <div class="pad">
        <div class="serif" style="font-size:30px;font-weight:600;color:var(--ink);letter-spacing:-.01em;line-height:1.1">${saludo()}, ${e(first)}</div>
        <div style="font-size:13px;color:var(--text2);margin-top:3px">${e(longDate())}</div>

        ${bloqueAhora(foco, leads)}

        <div class="kpi-grid">
          <div class="kpi" data-go="leads"><div class="kpi__num">${porContactar}</div><div class="kpi__label">Por contactar</div></div>
          <div class="kpi" data-go="agenda"><div class="kpi__num" style="color:var(--teal)">${citasHoy.length}</div><div class="kpi__label">Citas hoy</div></div>
          <div class="kpi" data-go="propuesta"><div class="kpi__num">${activas}</div><div class="kpi__label">Propuestas activas</div></div>
        </div>

        <div class="section-head"><h2 class="section-title">Tu día</h2><span class="link" data-go="agenda">Ver agenda</span></div>
        ${citasHoy.length
          ? `<div class="list">${citasHoy.map(citaCard).join('')}</div>`
          : `<div class="card" style="text-align:center;padding:22px"><div class="muted" style="font-size:13px">Sin reuniones hoy.</div><button class="btn btn--ghost btn--sm" data-go="cita" style="margin-top:10px">Agendar</button></div>`}

        <div class="section-head"><h2 class="section-title">${tituloLeads}</h2><span class="link" data-go="leads">Ver todos</span></div>
        ${listaLeads.length
          ? `<div class="list">${listaLeads.map(leadCard).join('')}</div>`
          : `<div class="card" style="text-align:center;padding:22px"><div class="muted" style="font-size:13px">Aún no hay leads.</div><button class="btn btn--primary btn--sm" data-go="captura" style="margin-top:10px">Capturar lead</button></div>`}
      </div>
    </section>`;
  },

  mount(app) {
    const host = document.getElementById('screen');
    host.querySelectorAll('[data-go]').forEach((el) => el.addEventListener('click', () => app.navigate(el.getAttribute('data-go'))));
    host.querySelector('#bell')?.addEventListener('click', () => app.openCampana());
    host.querySelectorAll('[data-cita]').forEach((el) => el.addEventListener('click', () => app.navigate('agenda')));
    host.querySelectorAll('[data-map]').forEach((b) => b.addEventListener('click', (ev) => {
      ev.stopPropagation();   // sin esto, además de abrir el mapa saltaría a la agenda
      openComoLlegar(_leads.find((l) => l.id === b.getAttribute('data-map')));
    }));
    host.querySelectorAll('[data-lead]').forEach((el) => el.addEventListener('click', () => app.navigate('ficha', { leadId: el.getAttribute('data-lead') })));
    host.querySelectorAll('[data-wa]').forEach((b) => b.addEventListener('click', (ev) => {
      ev.stopPropagation(); openWhatsApp(b.getAttribute('data-wa'));
    }));
    host.querySelectorAll('[data-tel]').forEach((b) => b.addEventListener('click', (ev) => {
      ev.stopPropagation(); openTel(b.getAttribute('data-tel'));
    }));
    // "Avisar que voy": el mensaje ya escrito es la diferencia entre mandarlo y no mandarlo.
    host.querySelectorAll('[data-avisar]').forEach((b) => b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const l = _leads.find((x) => x.id === b.getAttribute('data-avisar'));
      if (!l) return;
      const quien = (l.nombre || '').split(' ')[0];
      openWhatsApp(l.telefono, `Hola ${quien}, te confirmo nuestra reunión. Voy en camino.`);
    }));
    host.querySelectorAll('[data-ficha]').forEach((b) => b.addEventListener('click', (ev) => {
      ev.stopPropagation(); app.navigate('ficha', { leadId: b.getAttribute('data-ficha') });
    }));
  },
};
