// ============================================================================
// screens/leads.js — bandeja de prospectos.
// KPIs · buscador · filtro por etapa (chips) · tarjetas con contacto rápido.
// ============================================================================
import { db, store, PIPELINE_STAGES, escHtml, heat, initials, timeAgo, origenDetalleLabel } from '../core.js';
import { logo, ic, toast, openWhatsApp, openTel } from '../ui.js';

const e = escHtml;
const stageOf = (estado) => PIPELINE_STAGES.find((s) => s.id === estado) || { color: '#94A0B6', bg: '#F0F2F6' };

let _leads = [];
let _filter = 'Todos';
let _q = '';

function matches(l) {
  if (_filter !== 'Todos' && l.estado !== _filter) return false;
  if (_q) {
    const hay = `${l.nombre || ''} ${l.empresa || ''} ${l.correlativo || ''} ${l.rubro || ''} ${l.origenDetalle || ''} ${origenDetalleLabel(l.origenDetalle)}`.toLowerCase();
    if (!hay.includes(_q.toLowerCase())) return false;
  }
  return true;
}

function leadCard(l) {
  const st = stageOf(l.estado), ht = heat(l.scoring);
  return `
    <div class="card card--tap" data-lead="${e(l.id)}" style="border-left:3px solid ${st.color}">
      <div style="display:flex;align-items:flex-start;gap:11px">
        <div style="width:42px;height:42px;border-radius:11px;background:${st.bg};color:${st.color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex:none">${e(initials(l.nombre))}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;min-width:0"><span class="ell" style="font-weight:700;font-size:14.5px;color:var(--ink)">${e(l.nombre)}</span><span class="heat" style="background:${ht.color}"></span><span style="font-size:10px;color:${ht.color};font-weight:600;flex:none">${ht.label}</span></div>
          <div class="ell" style="font-size:12.5px;color:var(--text2)">${e(l.empresa || '—')}</div>
        </div>
        <div style="text-align:right;flex:none"><div class="tabular" style="font-size:10.5px;color:var(--text3);white-space:nowrap">${e(l.correlativo || '')}</div><div style="font-size:11px;color:var(--text3);margin-top:2px;white-space:nowrap">${e(timeAgo(l.fechaCreacion))}</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:7px;margin-top:11px;flex-wrap:wrap">
        <span class="badge" style="color:${st.color};background:${st.bg}">${e(l.estado)}</span>
        ${l.origenDetalle ? `<span style="font-size:11px;font-weight:600;color:var(--teal);background:var(--teal-l);padding:4px 9px;border-radius:20px">${e(origenDetalleLabel(l.origenDetalle))}</span>` : ''}
        ${l.rubro ? `<span style="font-size:11px;font-weight:500;color:var(--text2);background:var(--surface2);padding:4px 9px;border-radius:20px">${e(l.rubro)}</span>` : ''}
        <span style="flex:1"></span>
        <button class="qa" data-wa="${e(l.telefono || '')}" aria-label="WhatsApp" style="width:33px;height:33px;border-radius:10px;background:var(--green-l);color:var(--green);border:0;display:flex;align-items:center;justify-content:center;cursor:pointer">${ic('whatsapp', { size: 16 })}</button>
        <button class="qa" data-tel="${e(l.telefono || '')}" aria-label="Llamar" style="width:33px;height:33px;border-radius:10px;background:var(--teal-l);color:var(--teal);border:0;display:flex;align-items:center;justify-content:center;cursor:pointer">${ic('phone', { size: 15 })}</button>
        <button class="qa" data-zoom="${e(l.id)}" aria-label="Zoom" style="width:33px;height:33px;border-radius:10px;background:var(--violet-l);color:var(--violet);border:0;display:flex;align-items:center;justify-content:center;cursor:pointer">${ic('video', { size: 16 })}</button>
      </div>
    </div>`;
}

function chipsHtml() {
  const chips = ['Todos', ...PIPELINE_STAGES.map((s) => s.id)];
  return chips.map((c) => `<button class="chip ${_filter === c ? 'chip--on' : ''}" data-chip="${e(c)}">${e(c)}</button>`).join('');
}

function listHtml() {
  const view = _leads.filter(matches);
  if (!view.length) {
    return `
      <div class="empty">
        <div class="empty__icon">${ic('userPlus', { size: 30, sw: 1.6 })}</div>
        <div class="empty__t">Sin leads en este filtro</div>
        <div class="empty__d">Captura tu primer prospecto del terreno.</div>
        <button class="btn btn--primary btn--sm" data-go="captura">Capturar lead</button>
      </div>`;
  }
  return `<div class="list list--lg">${view.map(leadCard).join('')}</div>`;
}

export default {
  chrome: true,
  async render(app) {
    _leads = await db.prospectos.getAll();
    const now = Date.now();
    const within = (iso, ms) => iso && (now - new Date(iso).getTime()) <= ms;
    const k = {
      porContactar: _leads.filter((l) => l.estado === 'Nuevo').length,
      contactados: _leads.filter((l) => !['Nuevo', 'Descartado'].includes(l.estado)).length,
      ult24: _leads.filter((l) => within(l.fechaCreacion, 864e5)).length,
      ult7: _leads.filter((l) => within(l.fechaCreacion, 7 * 864e5)).length,
    };
    const ini = initials((store.profile && store.profile.nombre) || 'MJ');
    const kpi = (n, label) => `<div class="kpi kpi--sm"><div class="kpi__num">${n}</div><div class="kpi__label">${label}</div></div>`;

    return `
    <section class="screen">
      <header class="hdr">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <h1 class="hdr__title">Leads</h1>
          <button class="avatar" data-go="perfil" style="width:38px;height:38px;font-size:13px">${e(ini)}</button>
        </div>
        <div class="input-wrap input-wrap--search">
          <span style="color:var(--text3);display:flex">${ic('search', { size: 18, sw: 1.9 })}</span>
          <input id="leadSearch" class="input" placeholder="Buscar por nombre, empresa…" value="${e(_q)}">
        </div>
      </header>

      <div style="padding:6px 18px 4px"><div class="kpi-grid kpi-grid--4">${kpi(k.porContactar, 'Por contactar')}${kpi(k.contactados, 'Contactados')}${kpi(k.ult24, 'Últimas 24h')}${kpi(k.ult7, '7 días')}</div></div>

      <div class="chip-row" id="leadChips">${chipsHtml()}</div>

      <div class="pad" style="padding-top:6px">
        <div style="display:flex;align-items:center;justify-content:center;gap:7px;color:var(--text3);font-size:12px;padding:4px 0 12px">${ic('refresh', { size: 14, sw: 1.9 })} Desliza para actualizar</div>
        <div id="leadsList">${listHtml()}</div>
      </div>
    </section>`;
  },

  mount(app) {
    const host = document.getElementById('screen');
    const listEl = host.querySelector('#leadsList');
    const chipsEl = host.querySelector('#leadChips');

    const refresh = () => {
      listEl.innerHTML = listHtml();
      chipsEl.querySelectorAll('.chip').forEach((c) => c.classList.toggle('chip--on', c.getAttribute('data-chip') === _filter));
    };

    host.querySelectorAll('[data-go]').forEach((el) => el.addEventListener('click', () => app.navigate(el.getAttribute('data-go'))));

    chipsEl.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-chip]'); if (!b) return;
      _filter = b.getAttribute('data-chip'); refresh();
    });

    const search = host.querySelector('#leadSearch');
    search.addEventListener('input', () => { _q = search.value.trim(); refresh(); });

    listEl.addEventListener('click', (ev) => {
      const qa = ev.target.closest('.qa');
      if (qa) {
        ev.stopPropagation();
        if (qa.hasAttribute('data-wa')) openWhatsApp(qa.getAttribute('data-wa'));
        else if (qa.hasAttribute('data-tel')) openTel(qa.getAttribute('data-tel'));
        else toast('Zoom: se conecta en una fase próxima', 'info');
        return;
      }
      const card = ev.target.closest('[data-lead]');
      if (card) app.navigate('ficha', { leadId: card.getAttribute('data-lead') });
      else {
        const go = ev.target.closest('[data-go]');
        if (go) app.navigate(go.getAttribute('data-go'));
      }
    });
  },
};
