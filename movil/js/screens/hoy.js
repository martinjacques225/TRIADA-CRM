// ============================================================================
// screens/hoy.js — pantalla de aterrizaje (Hoy).
// Saludo + línea trIA + KPIs + "Tu día" (citas de hoy) + leads recientes.
// ============================================================================
import { db, store, PIPELINE_STAGES, meetingType, todayStr, escHtml, heat, initials, timeAgo } from '../core.js';
import { logo, ic, toast, openWhatsApp, openTel } from '../ui.js';

const e = escHtml;
const stageOf = (estado) => PIPELINE_STAGES.find((s) => s.id === estado) || { color: '#94A0B6', bg: '#F0F2F6' };
const longDate = () => { const s = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1); };
const modoDe = (lugar) => /https?:|meet\.|zoom|teams/i.test(lugar || '') ? 'Zoom' : 'Presencial';

function citaCard(c) {
  const t = meetingType(c.tipo);
  return `
    <div class="card card--tap" data-cita="${e(c.id)}" style="display:flex;align-items:center;gap:13px">
      <div style="display:flex;flex-direction:column;align-items:center;min-width:46px">
        <span class="serif tabular" style="font-size:17px;font-weight:600;color:var(--ink)">${e(c.hora || '—')}</span>
        <span class="tabular" style="font-size:10.5px;color:var(--text3)">${c.durMin || 60} min</span>
      </div>
      <div style="width:3px;align-self:stretch;border-radius:2px;background:${t.color}"></div>
      <div style="flex:1;min-width:0">
        <div class="ell" style="font-weight:700;font-size:14px;color:var(--ink)">${e(c.titulo || t.label)}</div>
        <div style="display:flex;align-items:center;gap:7px;margin-top:3px">
          <span style="font-size:11px;font-weight:600;color:${t.color}">${e(t.label)}</span>
          <span style="font-size:11px;color:var(--text3)">·</span>
          <span style="font-size:11.5px;color:var(--text2)">${modoDe(c.lugar)}</span>
        </div>
      </div>
    </div>`;
}

function leadCard(l) {
  const st = stageOf(l.estado), ht = heat(l.scoring);
  return `
    <div class="card card--tap" data-lead="${e(l.id)}">
      <div style="display:flex;align-items:center;gap:11px">
        <div style="width:40px;height:40px;border-radius:11px;background:${st.bg};color:${st.color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex:none">${e(initials(l.nombre))}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px"><span class="ell" style="font-weight:700;font-size:14.5px;color:var(--ink)">${e(l.nombre)}</span><span class="heat" style="background:${ht.color}"></span></div>
          <div class="ell" style="font-size:12.5px;color:var(--text2)">${e(l.empresa || '—')}</div>
        </div>
        <span style="font-size:11px;color:var(--text3);flex:none">${e(timeAgo(l.fechaCreacion))}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:11px">
        <span class="badge" style="color:${st.color};background:${st.bg}"><span class="dot"></span>${e(l.estado)}</span>
        <span style="flex:1"></span>
        <button class="qa" data-wa="${e(l.telefono || '')}" aria-label="WhatsApp" style="width:34px;height:34px;border-radius:10px;background:var(--green-l);color:var(--green);border:0;display:flex;align-items:center;justify-content:center;cursor:pointer">${ic('whatsapp', { size: 17 })}</button>
        <button class="qa" data-tel="${e(l.telefono || '')}" aria-label="Llamar" style="width:34px;height:34px;border-radius:10px;background:var(--teal-l);color:var(--teal);border:0;display:flex;align-items:center;justify-content:center;cursor:pointer">${ic('phone', { size: 16 })}</button>
      </div>
    </div>`;
}

export default {
  chrome: true,
  async render(app) {
    const [leads, citas, props] = await Promise.all([
      db.prospectos.getAll(), db.citas.getAll(), db.propuestas.getAll(),
    ]);
    const today = todayStr();
    const porContactar = leads.filter((l) => l.estado === 'Nuevo').length;
    const citasHoy = citas.filter((c) => c.fecha === today).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
    const activas = props.filter((p) => !['aceptada', 'rechazada'].includes(String(p.estado || '').toLowerCase())).length;
    const recientes = leads.slice(0, 3);
    const nombre = (store.profile && store.profile.nombre) || (store.user && store.user.email) || 'Martín';
    const first = nombre.split(' ')[0];
    const ini = initials(nombre);

    return `
    <section class="screen">
      <header class="hdr hdr--bar">
        <div style="display:flex;align-items:center;gap:9px">${logo(26)}<span class="wordmark" style="font-size:19px">Tríada<span class="brand-dot">·</span></span></div>
        <div style="display:flex;align-items:center;gap:6px">
          <button class="icon-btn" id="bell" style="width:40px;height:40px" aria-label="Recordatorios">${ic('bell', { size: 20 })}<span class="dot-badge"></span></button>
          <button class="avatar" data-go="perfil" style="width:40px;height:40px;font-size:14px">${e(ini)}</button>
        </div>
      </header>

      <div class="pad">
        <div class="serif" style="font-size:30px;font-weight:600;color:var(--ink);letter-spacing:-.01em;line-height:1.1">Hola, ${e(first)}</div>
        <div style="font-size:13.5px;color:var(--text2);margin-top:3px">${e(longDate())}</div>

        <div class="tria-line">
          <span class="tria-breath" style="flex:none;margin-top:1px">${logo(20)}</span>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px"><span class="tria-tag">trIA</span><span class="tria-ia">IA</span></div>
            <div style="font-size:13.5px;color:var(--text);line-height:1.45">Hoy tienes <b style="color:var(--ink)">${citasHoy.length} ${citasHoy.length === 1 ? 'cita' : 'citas'}</b> y <b style="color:var(--ink)">${porContactar} ${porContactar === 1 ? 'lead' : 'leads'}</b> por contactar. ${porContactar ? 'Parte por los calientes.' : '¡Al día!'}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi" data-go="leads"><div class="kpi__num">${porContactar}</div><div class="kpi__label">Por contactar</div></div>
          <div class="kpi" data-go="agenda"><div class="kpi__num" style="color:var(--teal)">${citasHoy.length}</div><div class="kpi__label">Citas hoy</div></div>
          <div class="kpi" data-go="propuesta"><div class="kpi__num">${activas}</div><div class="kpi__label">Propuestas activas</div></div>
        </div>

        <div class="section-head"><h2 class="section-title">Tu día</h2><span class="link" data-go="agenda">Ver agenda</span></div>
        ${citasHoy.length
          ? `<div class="list">${citasHoy.map(citaCard).join('')}</div>`
          : `<div class="card" style="text-align:center;padding:22px"><div class="muted" style="font-size:13.5px">Sin reuniones hoy.</div><button class="btn btn--ghost btn--sm" data-go="cita" style="margin-top:10px">Agendar</button></div>`}

        <div class="section-head"><h2 class="section-title">Leads recientes</h2><span class="link" data-go="leads">Ver todos</span></div>
        ${recientes.length
          ? `<div class="list">${recientes.map(leadCard).join('')}</div>`
          : `<div class="card" style="text-align:center;padding:22px"><div class="muted" style="font-size:13.5px">Aún no hay leads.</div><button class="btn btn--primary btn--sm" data-go="captura" style="margin-top:10px">Capturar lead</button></div>`}
      </div>
    </section>`;
  },

  mount(app) {
    const host = document.getElementById('screen');
    host.querySelectorAll('[data-go]').forEach((el) => el.addEventListener('click', () => app.navigate(el.getAttribute('data-go'))));
    host.querySelector('#bell')?.addEventListener('click', () => toast('Panel de recordatorios: próxima fase', 'info'));
    host.querySelectorAll('[data-cita]').forEach((el) => el.addEventListener('click', () => app.navigate('agenda')));
    host.querySelectorAll('[data-lead]').forEach((el) => el.addEventListener('click', () => app.navigate('ficha', { leadId: el.getAttribute('data-lead') })));
    host.querySelectorAll('.qa').forEach((b) => b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (b.hasAttribute('data-wa')) openWhatsApp(b.getAttribute('data-wa'));
      else openTel(b.getAttribute('data-tel'));
    }));
  },
};
