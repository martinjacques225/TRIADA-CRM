// ============================================================================
// screens/cita.js — Nueva cita / editar reunión.
// Guarda en `citas`. Soporta: nueva, nueva-para-lead (params.leadId/tipo) y
// editar (params.citaId). Date/time nativos (pickers del teléfono).
// Re-render preserva selecciones: _form se carga UNA vez por navegación (_formKey)
// y los inputs de texto se vuelcan a _form (syncInputs) antes de cada re-pintado.
// ============================================================================
import { db, MEETING_TYPES, DUR_OPTS, REMINDER_OPTS, RECUR_OPTS, ESTADOS_CITA, todayStr, escHtml, initials, memberColor } from '../core.js';
import { ic, toast, openSheet, closeSheet } from '../ui.js';

const e = escHtml;
let _form = {}, _formKey = null, _team = [], _lead = null;

function fresh(app) {
  return {
    id: null, titulo: '', tipo: app.params.tipo || 'diagnostico',
    prospectoId: app.params.leadId || null,
    fecha: todayStr(), hora: '10:00', durMin: 60,
    modo: 'Presencial', lugar: '', participantes: [], recordatorios: [30], recurrencia: 'none', estado: 'Confirmada',
  };
}
const val = (id) => (document.getElementById(id)?.value || '');
function syncInputs() {
  ['ctTitulo:titulo', 'ctFecha:fecha', 'ctHora:hora', 'ctLugar:lugar'].forEach((p) => {
    const [id, k] = p.split(':'); const el = document.getElementById(id); if (el) _form[k] = el.value;
  });
}

function prospectoBtn() {
  if (_lead) {
    return `<span style="width:36px;height:36px;border-radius:10px;background:var(--navy-l);color:var(--navy);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex:none">${e(initials(_lead.nombre))}</span>
      <span style="flex:1;min-width:0"><span class="ell" style="display:block;font-weight:600;font-size:14px;color:var(--ink)">${e(_lead.nombre)}</span><span class="ell" style="display:block;font-size:12px;color:var(--text2)">${e(_lead.empresa || '')}${_lead.correlativo ? ' · ' + e(_lead.correlativo) : ''}</span></span>`;
  }
  return `<span style="width:36px;height:36px;border-radius:10px;background:var(--surface2);color:var(--text3);display:flex;align-items:center;justify-content:center;flex:none">${ic('users', { size: 18 })}</span><span style="flex:1;color:var(--text2);font-size:14px">Vincular prospecto (opcional)</span>`;
}

export default {
  chrome: false,
  async render(app) {
    _team = await db.profiles.getAll().catch(() => []);
    const key = app.params.citaId ? 'edit:' + app.params.citaId : 'new:' + (app.params.leadId || '') + ':' + (app.params.tipo || '');
    if (_formKey !== key) {
      if (app.params.citaId) {
        const c = await db.citas.get(app.params.citaId).catch(() => null);
        _form = c
          ? { id: c.id, titulo: c.titulo || '', tipo: c.tipo || 'diagnostico', prospectoId: c.prospectoId || null, fecha: c.fecha || todayStr(), hora: c.hora || '10:00', durMin: c.durMin || 60, modo: /https?:|zoom|meet/i.test(c.lugar || '') ? 'Zoom' : 'Presencial', lugar: c.lugar || '', participantes: c.participantes || [], recordatorios: c.recordatorios || [30], recurrencia: c.recurrencia || 'none', estado: c.estado || 'Confirmada' }
          : fresh(app);
      } else _form = fresh(app);
      _formKey = key;
    }
    _lead = _form.prospectoId ? await db.prospectos.get(_form.prospectoId).catch(() => null) : null;

    const tipoChip = (t) => `<button type="button" class="ct-chip" data-g="tipo" data-v="${t.id}" style="flex:none;display:flex;align-items:center;gap:6px;border:1px solid ${_form.tipo === t.id ? t.color : 'var(--border)'};background:${_form.tipo === t.id ? t.color + '18' : 'var(--surface)'};color:${_form.tipo === t.id ? t.color : 'var(--text2)'};border-radius:20px;padding:7px 12px;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap"><span style="width:8px;height:8px;border-radius:50%;background:${t.color}"></span>${e(t.label)}</button>`;
    const plainChip = (g, v, label) => `<button type="button" class="ct-chip" data-g="${g}" data-v="${e(String(v))}" style="flex:none;border:1px solid ${_form[g] === v ? 'var(--teal)' : 'var(--border)'};background:${_form[g] === v ? 'var(--teal-l)' : 'var(--surface)'};color:${_form[g] === v ? 'var(--teal-d)' : 'var(--text2)'};border-radius:20px;padding:8px 14px;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap;font-variant-numeric:tabular-nums">${e(label)}</button>`;
    const recordChip = (o) => { const on = _form.recordatorios.includes(o.min); return `<button type="button" class="ct-rec" data-v="${o.min}" style="flex:none;border:1px solid ${on ? 'var(--teal)' : 'var(--border)'};background:${on ? 'var(--teal-l)' : 'var(--surface)'};color:${on ? 'var(--teal-d)' : 'var(--text2)'};border-radius:20px;padding:8px 13px;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap">${e(o.label)}</button>`; };
    const memberAv = (m, i) => { const on = _form.participantes.includes(m.id); return `<button type="button" class="ct-part" data-id="${e(m.id)}" title="${e(m.nombre)}" style="width:38px;height:38px;border-radius:50%;background:${on ? memberColor(i) : 'var(--surface2)'};color:${on ? '#fff' : 'var(--text3)'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12.5px;border:2px solid ${on ? 'var(--surface)' : 'var(--border)'};cursor:pointer;${on ? '' : 'opacity:.7'}">${e(initials(m.nombre))}</button>`; };
    const modoBtn = (m, icon) => `<button type="button" class="ct-modo" data-modo="${m}" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;height:46px;border:1px solid ${_form.modo === m ? 'var(--teal)' : 'var(--border)'};background:${_form.modo === m ? 'var(--teal-l)' : 'var(--surface)'};color:${_form.modo === m ? 'var(--teal-d)' : 'var(--text2)'};border-radius:var(--radius-sm);font-weight:700;font-size:13px;cursor:pointer">${ic(icon, { size: 17 })}${m}</button>`;
    const L = (t) => `<label class="field__label">${t}</label>`;

    return `
    <section class="screen" style="display:flex;flex-direction:column">
      <header class="hdr hdr--back">
        <button class="icon-btn icon-btn--bare" id="ctBack" style="width:38px;height:38px" aria-label="Volver">${ic('back', { size: 22, sw: 1.9 })}</button>
        <div class="serif" style="font-size:20px;font-weight:600;color:var(--ink)">${_form.id ? 'Editar cita' : 'Nueva cita'}</div>
      </header>

      <div class="pad-form">
        ${L('Título')}<input id="ctTitulo" class="input" placeholder="Ej: Diagnóstico 360 · San Andrés" value="${e(_form.titulo)}" style="margin-bottom:16px">
        ${L('Tipo de reunión')}<div class="chip-row" id="ct-tipo" style="padding:0 0 16px;gap:7px">${MEETING_TYPES.map(tipoChip).join('')}</div>
        ${L('Prospecto')}<button type="button" id="ctProspecto" style="width:100%;display:flex;align-items:center;gap:11px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:11px 13px;cursor:pointer;margin-bottom:16px;text-align:left">${prospectoBtn()}${ic('next', { size: 18, sw: 1.9 })}</button>
        <div class="row2" style="margin-bottom:16px">
          <div>${L('Fecha')}<input id="ctFecha" class="input" type="date" value="${e(_form.fecha)}"></div>
          <div>${L('Hora')}<input id="ctHora" class="input" type="time" value="${e(_form.hora)}"></div>
        </div>
        ${L('Duración')}<div class="chip-wrap" id="ct-durMin" style="margin-bottom:16px">${DUR_OPTS.map((d) => plainChip('durMin', d, d + ' min')).join('')}</div>
        ${L('Lugar')}<div style="display:flex;gap:9px;margin-bottom:12px">${modoBtn('Presencial', 'pin')}${modoBtn('Zoom', 'video')}</div>
        <input id="ctLugar" class="input" placeholder="${_form.modo === 'Zoom' ? 'Link de la reunión' : 'Dirección'}" value="${e(_form.lugar)}" style="margin-bottom:16px">
        ${L('Participantes')}<div id="ctTeam" style="display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap">${_team.map(memberAv).join('') || '<span class="muted" style="font-size:13px">Sin equipo cargado</span>'}</div>
        ${L('Recordatorio')}<div class="chip-row" id="ct-rec" style="padding:0 0 16px;gap:7px">${REMINDER_OPTS.map(recordChip).join('')}</div>
        ${L('Recurrencia')}<div class="chip-wrap" id="ct-recurrencia" style="margin-bottom:16px">${RECUR_OPTS.map((r) => plainChip('recurrencia', r.id, r.label)).join('')}</div>
        ${L('Estado')}<div class="chip-wrap" id="ct-estado">${ESTADOS_CITA.map((s) => plainChip('estado', s, s)).join('')}</div>
      </div>

      <div class="action-bar"><button class="btn btn--primary btn--block" id="ctSave">${_form.id ? 'Guardar cambios' : 'Guardar cita'}</button></div>
    </section>`;
  },

  mount(app) {
    const host = document.getElementById('screen');
    const repaint = () => { syncInputs(); app.renderScreen(); };
    host.querySelector('#ctBack').addEventListener('click', () => app.back());

    ['tipo', 'durMin', 'recurrencia', 'estado'].forEach((g) => {
      host.querySelector(`#ct-${g}`).addEventListener('click', (ev) => {
        const b = ev.target.closest('.ct-chip'); if (!b) return;
        let v = b.getAttribute('data-v'); if (g === 'durMin') v = +v;
        _form[g] = v; repaint();
      });
    });
    host.querySelector('#ct-rec').addEventListener('click', (ev) => {
      const b = ev.target.closest('.ct-rec'); if (!b) return;
      const m = +b.getAttribute('data-v');
      _form.recordatorios = _form.recordatorios.includes(m) ? _form.recordatorios.filter((x) => x !== m) : [..._form.recordatorios, m];
      repaint();
    });
    host.querySelector('#ctTeam').addEventListener('click', (ev) => {
      const b = ev.target.closest('.ct-part'); if (!b) return;
      const id = b.getAttribute('data-id');
      _form.participantes = _form.participantes.includes(id) ? _form.participantes.filter((x) => x !== id) : [..._form.participantes, id];
      repaint();
    });
    host.querySelectorAll('.ct-modo').forEach((b) => b.addEventListener('click', () => { _form.modo = b.getAttribute('data-modo'); repaint(); }));
    host.querySelector('#ctProspecto').addEventListener('click', () => { syncInputs(); openProspectoPicker(app); });

    host.querySelector('#ctSave').addEventListener('click', async (ev) => {
      syncInputs();
      _form.titulo = _form.titulo.trim();
      if (!_form.titulo) { toast('Ponle un título a la reunión', 'err'); return; }
      ev.target.disabled = true;
      const payload = { titulo: _form.titulo, tipo: _form.tipo, prospectoId: _form.prospectoId, fecha: _form.fecha, hora: _form.hora, durMin: _form.durMin, lugar: (_form.lugar || '').trim(), participantes: _form.participantes, recordatorios: _form.recordatorios, recurrencia: _form.recurrencia, estado: _form.estado };
      try {
        if (_form.id) await db.citas.update({ id: _form.id, ...payload });
        else await db.citas.add(payload);
        _formKey = null; // próxima entrada vuelve a cargar limpio
        toast(_form.id ? 'Cita actualizada ✓' : 'Cita agendada ✓', 'ok');
        app.navigate('agenda');
      } catch (err) { console.error(err); toast('No se pudo guardar la cita', 'err'); ev.target.disabled = false; }
    });
  },
};

async function openProspectoPicker(app) {
  const leads = await db.prospectos.getAll().catch(() => []);
  const rows = leads.map((l) => `<button class="pk-lead" data-id="${e(l.id)}" style="width:100%;display:flex;align-items:center;gap:11px;background:none;border:0;border-bottom:1px solid var(--border);padding:12px 2px;cursor:pointer;text-align:left"><span style="width:34px;height:34px;border-radius:10px;background:var(--surface2);color:var(--text2);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex:none">${e(initials(l.nombre))}</span><span style="flex:1;min-width:0"><span class="ell" style="display:block;font-weight:600;font-size:14px;color:var(--ink)">${e(l.nombre)}</span><span class="ell" style="display:block;font-size:12px;color:var(--text2)">${e(l.empresa || '')}</span></span></button>`).join('');
  openSheet(`<div class="sheet__body"><div class="sheet__title">Vincular prospecto</div><button class="pk-lead" data-id="" style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--border);padding:12px 2px;cursor:pointer;color:var(--text2);font-weight:600;font-size:14px">Sin prospecto</button>${rows || '<div class="muted" style="padding:14px;font-size:13px">No hay prospectos.</div>'}</div>`, {
    onMount: (el) => el.querySelectorAll('.pk-lead').forEach((b) => b.addEventListener('click', () => {
      _form.prospectoId = b.getAttribute('data-id') || null;
      closeSheet();
      app.renderScreen();
    })),
  });
}
