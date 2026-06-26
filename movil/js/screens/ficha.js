// ============================================================================
// screens/ficha.js — detalle del prospecto.
// Identidad · contacto rápido · cambiar etapa · tabs (Datos/Diagnóstico/Citas/
// Propuestas/Actividad) · resumen trIA · acciones (Nueva cita/propuesta/Hacer 360).
// ============================================================================
import { db, PIPELINE_STAGES, DIAG_AREAS, meetingType, scorePct, formatCLP, formatDate, escHtml, heat, initials, timeAgo } from '../core.js';
import { logo, ic, toast, openWhatsApp, openTel } from '../ui.js';
import { openInformeByDiagId } from '../informe.js';

const e = escHtml;
const stageOf = (estado) => PIPELINE_STAGES.find((s) => s.id === estado) || { color: '#94A0B6', bg: '#F0F2F6' };
const TABS = [['datos', 'Datos'], ['diag', 'Diagnóstico'], ['citas', 'Citas'], ['prop', 'Propuestas'], ['act', 'Actividad']];

let _tab = 'datos';
let _lead = null, _diags = [], _citas = [], _props = [];

function row(label, value, accent) {
  return `<div style="display:flex;justify-content:space-between;gap:14px;padding:13px 15px;border-bottom:1px solid var(--border)"><span style="font-size:13px;color:var(--text2)">${e(label)}</span><span class="ell" style="font-size:13.5px;font-weight:600;color:${accent || 'var(--ink)'};text-align:right">${e(value || '—')}</span></div>`;
}

function tabDatos() {
  const l = _lead;
  return `<div class="card" style="padding:0;overflow:hidden">
    ${row('Rubro', l.rubro)}${row('Tamaño', l.tamano)}${row('Dolor principal', l.dolorPrincipal)}
    ${row('Origen', l.origen)}${row('Región', l.region)}${row('RUT', l.rut)}
    ${row('Teléfono', l.telefono, 'var(--teal)')}${row('Email', l.email, 'var(--teal)')}
    <div style="padding:13px 15px"><div style="font-size:13px;color:var(--text2);margin-bottom:5px">Notas</div><div style="font-size:13.5px;color:var(--text);line-height:1.5">${e(l.notas || 'Sin notas.')}</div></div>
  </div>`;
}

function tabDiag() {
  if (!_diags.length) {
    return `<div class="card" style="text-align:center;padding:26px 18px"><div class="empty__icon" style="margin:0 auto 12px">${ic('diag360', { size: 26 })}</div><div class="empty__t" style="font-size:15px">Sin diagnóstico aún</div><div class="empty__d">Levanta el 360 oficial durante la reunión.</div><button class="btn btn--navy btn--sm" data-act="diag" style="margin-top:6px">Hacer Diagnóstico 360</button></div>`;
  }
  const d = _diags[0];
  const arrOf = (a) => (d.scores && d.scores[a.id]) || [];
  const sc = Object.fromEntries(DIAG_AREAS.map((a) => [a.id, scorePct(arrOf(a))]));
  const ev = DIAG_AREAS.filter((a) => arrOf(a).some((x) => x !== null && x !== undefined));
  const base = ev.length ? ev : DIAG_AREAS;
  const overall = Math.round(base.reduce((s, a) => s + sc[a.id], 0) / base.length);
  const oc = overall >= 80 ? 'var(--green)' : overall >= 50 ? 'var(--amber)' : 'var(--danger)';
  const cell = (a) => `<div style="text-align:center;background:${a.color}1A;border-radius:var(--radius-sm);padding:9px 4px;min-width:0"><div class="serif tabular" style="font-size:18px;font-weight:600;color:${a.color}">${sc[a.id]}</div><div style="font-size:9px;color:var(--text2);margin-top:2px;line-height:1.12">${e(a.label)}</div></div>`;
  return `<div class="card" style="padding:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><span style="font-weight:700;font-size:14px;color:var(--ink)">Diagnóstico 360${d.correlativo ? ' · ' + e(d.correlativo) : ''}</span><span class="badge" style="color:var(--green);background:var(--green-l)">${e(d.estado || 'borrador')}</span></div>
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px"><span class="serif tabular" style="font-size:30px;font-weight:600;color:${oc};line-height:1">${overall}</span><span style="font-size:12px;color:var(--text3)">/100 · Índice general</span></div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${base.map(cell).join('')}</div>
    <button class="btn btn--ghost" data-act="informe" data-diag="${e(d.id)}" style="width:100%;margin-top:14px;height:42px;color:var(--teal)">${ic('fileText', { size: 17 })} Abrir informe completo</button>
  </div>`;
}

function tabCitas() {
  const items = _citas.map((c) => { const t = meetingType(c.tipo); return `<div class="card" style="display:flex;align-items:center;gap:12px"><div style="width:3px;align-self:stretch;border-radius:2px;background:${t.color}"></div><div style="flex:1;min-width:0"><div class="ell" style="font-weight:700;font-size:13.5px;color:var(--ink)">${e(c.titulo || t.label)}</div><div style="font-size:11.5px;color:var(--text2);margin-top:2px">${e(formatDate(c.fecha))} · ${e(c.hora || '')} · ${c.durMin || 60} min</div></div><span style="font-size:11px;font-weight:600;color:${t.color}">${e(t.label)}</span></div>`; }).join('');
  return `<div class="list">${items || `<div class="card muted" style="text-align:center;padding:20px;font-size:13px">Sin citas vinculadas.</div>`}<button class="btn" data-act="cita" style="height:44px;border:1px dashed var(--border2);background:var(--surface);color:var(--teal)">+ Nueva cita</button></div>`;
}

function tabProp() {
  if (!_props.length) return `<div class="card muted" style="text-align:center;padding:20px;font-size:13px">Sin propuestas. <span class="link" data-act="prop">Crear una</span></div>`;
  return `<div class="list">${_props.map((p) => `<div class="card card--tap" data-act="prop"><div style="display:flex;justify-content:space-between;align-items:center"><span class="tabular" style="font-size:12px;color:var(--text3)">${e(p.correlativo || '')}</span><span class="badge" style="color:var(--navy);background:var(--navy-l)">${e(p.estado || '')}</span></div><div class="serif tabular" style="font-size:24px;font-weight:600;color:var(--ink);margin-top:8px">${e(formatCLP(p.valor))}</div><div style="font-size:12px;color:var(--text2);margin-top:2px">Vence ${e(formatDate(p.vigencia))}</div></div>`).join('')}</div>`;
}

function tabAct() {
  const dot = (color, t, sub, last) => `<div style="position:relative;padding:0 0 ${last ? '0' : '16px'} 20px;border-left:2px solid ${last ? 'transparent' : 'var(--border)'}"><span style="position:absolute;left:-6px;top:2px;width:10px;height:10px;border-radius:50%;background:${color}"></span><div style="font-size:13px;font-weight:600;color:var(--ink)">${e(t)}</div><div style="font-size:11.5px;color:var(--text3)">${e(sub)}</div></div>`;
  const st = stageOf(_lead.estado);
  return `<div style="position:relative;padding-left:8px">
    ${dot(st.color, `Etapa actual: ${_lead.estado}`, timeAgo(_lead.fechaActualizacion || _lead.fechaCreacion))}
    ${dot('var(--text3)', `Lead creado · origen ${_lead.origen || '—'}`, formatDate(_lead.fechaCreacion), true)}
  </div>`;
}

function tabBody() {
  return ({ datos: tabDatos, diag: tabDiag, citas: tabCitas, prop: tabProp, act: tabAct }[_tab] || tabDatos)();
}

export default {
  chrome: false,
  async render(app) {
    const id = app.params.leadId;
    _tab = (app.params.tab && TABS.some((t) => t[0] === app.params.tab)) ? app.params.tab : 'datos';
    _lead = await db.prospectos.get(id);
    if (!_lead) return `<section class="screen"><div class="pad"><div class="card" style="margin-top:60px;text-align:center;padding:30px"><div class="empty__t">Prospecto no encontrado</div><button class="btn btn--ghost btn--sm" id="fkBack" style="margin-top:12px">Volver</button></div></div></section>`;
    [_diags, _citas, _props] = await Promise.all([
      db.diagnosticos.byProspecto(id).catch(() => []),
      db.citas.byProspecto(id).catch(() => []),
      db.propuestas.byProspecto(id).catch(() => []),
    ]);
    const l = _lead, st = stageOf(l.estado), ht = heat(l.scoring);
    const tab = (key, label) => `<button class="fk-tab" data-tab="${key}" style="flex:none;background:none;border:0;border-bottom:2px solid ${_tab === key ? 'var(--teal)' : 'transparent'};color:${_tab === key ? 'var(--ink)' : 'var(--text2)'};font-family:var(--font);font-weight:700;font-size:13.5px;padding:8px 10px 11px;cursor:pointer;white-space:nowrap">${label}</button>`;

    return `
    <section class="screen">
      <header class="hdr" style="display:flex;align-items:center;gap:4px;padding-bottom:10px">
        <button class="icon-btn icon-btn--bare" id="fkBack" style="width:38px;height:38px" aria-label="Volver">${ic('back', { size: 22, sw: 1.9 })}</button>
        <span class="tabular" style="flex:1;font-size:12.5px;color:var(--text3)">${e(l.correlativo || '')}</span>
        <button class="icon-btn icon-btn--bare" id="fkEdit" style="width:38px;height:38px" aria-label="Editar">${ic('edit', { size: 20 })}</button>
      </header>

      <div style="padding:4px 18px 130px">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="width:60px;height:60px;border-radius:17px;background:${st.bg};color:${st.color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:21px;flex:none">${e(initials(l.nombre))}</div>
          <div style="flex:1;min-width:0"><div class="serif" style="font-size:23px;font-weight:600;color:var(--ink);line-height:1.15">${e(l.nombre)}</div><div class="ell" style="font-size:13.5px;color:var(--text2)">${e(l.empresa || '—')}</div></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:13px">
          <span class="badge" style="color:${st.color};background:${st.bg}"><span class="dot"></span>${e(l.estado)}</span>
          <span class="badge" style="color:${ht.color};background:var(--surface);border:1px solid var(--border)"><span class="dot"></span>${ht.label}</span>
        </div>

        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="btn" id="fkWa" style="flex:1;height:46px;background:var(--green);color:#fff;font-size:13px">${ic('whatsapp', { size: 17 })} WhatsApp</button>
          <button class="btn btn--ghost" id="fkTel" style="width:50px;height:46px;color:var(--teal)">${ic('phone', { size: 18 })}</button>
          <button class="btn btn--ghost" id="fkZoom" style="width:50px;height:46px;color:var(--violet)">${ic('video', { size: 18 })}</button>
          <button class="btn btn--ghost" id="fkEtapa" style="width:50px;height:46px;color:var(--text2)" aria-label="Cambiar etapa">${ic('funnel', { size: 18 })}</button>
        </div>

        <div class="chip-row" id="fkTabs" style="gap:4px;margin:20px 0 14px;padding:0;border-bottom:1px solid var(--border)">${TABS.map(([k, l2]) => tab(k, l2)).join('')}</div>
        <div id="fkBody">${tabBody()}</div>

        <div class="tria-line" style="margin-top:16px">
          <span style="flex:none;margin-top:1px">${logo(20)}</span>
          <div style="flex:1"><div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span class="tria-tag">Resumen trIA</span><span class="tria-ia">IA</span></div><div style="font-size:13px;color:var(--text);line-height:1.5">${e(triaResumen(l))}</div></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px">
          <button class="btn btn--ghost" data-act="cita" style="height:46px;color:var(--ink)">Nueva cita</button>
          <button class="btn btn--ghost" data-act="prop" style="height:46px;color:var(--ink)">Nueva propuesta</button>
          <button class="btn btn--navy" data-act="diag" style="grid-column:1/3;height:48px;font-size:14.5px">${ic('diag360', { size: 18 })} Hacer Diagnóstico 360</button>
        </div>
      </div>
    </section>`;
  },

  mount(app) {
    const host = document.getElementById('screen');
    host.querySelector('#fkBack')?.addEventListener('click', () => app.back());
    if (!_lead) return;
    host.querySelector('#fkEdit')?.addEventListener('click', () => toast('Editar lead: próxima fase', 'info'));
    host.querySelector('#fkWa')?.addEventListener('click', () => openWhatsApp(_lead.telefono, `Hola ${(_lead.nombre || '').split(' ')[0]}, te escribo de Tríada Consultoría.`));
    host.querySelector('#fkTel')?.addEventListener('click', () => openTel(_lead.telefono));
    host.querySelector('#fkZoom')?.addEventListener('click', () => toast('Zoom: se conecta en una fase próxima', 'info'));
    host.querySelector('#fkEtapa')?.addEventListener('click', () => app.openEtapaSheet(_lead, () => app.renderScreen()));

    const body = host.querySelector('#fkBody');
    host.querySelector('#fkTabs').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-tab]'); if (!b) return;
      _tab = b.getAttribute('data-tab');
      body.innerHTML = tabBody();
      host.querySelectorAll('.fk-tab').forEach((t) => {
        const on = t.getAttribute('data-tab') === _tab;
        t.style.borderBottomColor = on ? 'var(--teal)' : 'transparent';
        t.style.color = on ? 'var(--ink)' : 'var(--text2)';
      });
    });

    // Acciones (delegadas: cubren botones del cuerpo de tabs y de la zona inferior)
    host.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-act]'); if (!b) return;
      const act = b.getAttribute('data-act');
      if (act === 'cita') app.navigate('cita', { leadId: _lead.id });
      else if (act === 'prop') app.navigate('propuesta', { leadId: _lead.id });
      else if (act === 'diag') app.navigate('diagnostico', { leadId: _lead.id });
      else if (act === 'informe') openInformeByDiagId(b.getAttribute('data-diag'));
    });
  },
};

function triaResumen(l) {
  const calor = heat(l.scoring).label.toLowerCase();
  const dolor = (l.dolorPrincipal || '').toLowerCase();
  return `Prospecto ${calor}${dolor ? `: el foco es "${dolor}"` : ''}. Próximo paso sugerido: ${l.estado === 'Nuevo' ? 'contactar y agendar el Diagnóstico 360' : l.estado === 'Diagnóstico Realizado' ? 'preparar y enviar la propuesta' : 'dar seguimiento y avanzar de etapa'}.`;
}
