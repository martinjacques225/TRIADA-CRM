// ============================================================================
// screens/pipeline.js — embudo táctil VERTICAL (no kanban horizontal).
// Agrupa los leads por etapa (orden de marca); tocar una tarjeta → ficha;
// botón de etapa → hoja "cambiar etapa".
// ============================================================================
import { db, PIPELINE_STAGES, escHtml, heat, initials } from '../core.js';
import { ic } from '../ui.js';

const e = escHtml;
let _leads = [];

function leadRow(l, st) {
  const ht = heat(l.scoring);
  return `<div class="card--tap" data-lead="${e(l.id)}" style="display:flex;align-items:center;gap:11px;background:var(--surface);border:1px solid var(--border);border-left:3px solid ${st.color};border-radius:var(--radius-sm);padding:10px 12px;box-shadow:var(--shadow-sm)">
    <div style="width:34px;height:34px;border-radius:10px;background:${st.bg};color:${st.color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex:none">${e(initials(l.nombre))}</div>
    <div style="flex:1;min-width:0"><div class="ell" style="font-weight:600;font-size:13.5px;color:var(--ink)">${e(l.nombre)}</div><div class="ell" style="font-size:11.5px;color:var(--text2)">${e(l.empresa || '—')}</div></div>
    <span class="heat" style="background:${ht.color}"></span>
    <button class="pl-move" data-lead="${e(l.id)}" aria-label="Cambiar etapa" style="width:30px;height:30px;border-radius:8px;border:0;background:var(--surface2);color:var(--text3);cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none">${ic('funnel', { size: 15, sw: 2 })}</button>
  </div>`;
}

function groupsHtml() {
  return PIPELINE_STAGES.map((st) => {
    const items = _leads.filter((l) => l.estado === st.id);
    if (!items.length) return '';
    return `<div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="width:11px;height:11px;border-radius:50%;background:${st.color};flex:none"></span>
        <span style="font-weight:700;font-size:14px;color:var(--ink)">${e(st.id)}</span>
        <span class="tabular" style="font-size:11.5px;font-weight:700;color:${st.color};background:${st.bg};padding:2px 9px;border-radius:20px">${items.length}</span>
        <span style="flex:1;height:1px;background:var(--border)"></span>
      </div>
      <div style="display:flex;flex-direction:column;gap:7px;padding-left:21px">${items.map((l) => leadRow(l, st)).join('')}</div>
    </div>`;
  }).join('');
}

export default {
  chrome: true,
  async render() {
    _leads = await db.prospectos.getAll();
    const activos = _leads.filter((l) => l.estado !== 'Descartado').length;
    const groups = groupsHtml();
    return `
    <section class="screen">
      <header class="hdr" style="display:flex;align-items:flex-end;justify-content:space-between">
        <div><h1 class="hdr__title">Pipeline</h1><div class="hdr__sub">Embudo activo · toca una etapa</div></div>
        <div style="text-align:right"><div class="serif tabular" style="font-size:26px;font-weight:600;color:var(--teal);line-height:1">${activos}</div><div style="font-size:10.5px;color:var(--text3)">activos</div></div>
      </header>
      <div class="pad" style="display:flex;flex-direction:column;gap:14px;padding-top:8px">
        ${groups || `<div class="empty" style="margin-top:30px"><div class="empty__icon">${ic('funnel', { size: 30, sw: 1.6 })}</div><div class="empty__t">Embudo vacío</div><div class="empty__d">Captura tu primer lead para verlo aquí.</div></div>`}
      </div>
    </section>`;
  },

  mount(app) {
    const host = document.getElementById('screen');
    host.addEventListener('click', (ev) => {
      const mv = ev.target.closest('.pl-move');
      if (mv) {
        ev.stopPropagation();
        const lead = _leads.find((l) => l.id === mv.getAttribute('data-lead'));
        if (lead) app.openEtapaSheet(lead, () => app.renderScreen());
        return;
      }
      const card = ev.target.closest('[data-lead]');
      if (card) app.navigate('ficha', { leadId: card.getAttribute('data-lead') });
    });
  },
};
