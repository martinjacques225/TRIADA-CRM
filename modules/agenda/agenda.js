// modules/agenda/agenda.js
import { citas, prospectos, getCurrentUserId } from '../../js/db.js';
import { escHtml, formatDate, todayStr, toast } from '../../js/utils.js';

const TIPOS = ['Primer contacto','Diagnóstico 360','Presentación propuesta','Seguimiento','Otro'];
const ESTADOS_CITA = ['Pendiente','Confirmada','Realizada','Cancelada'];

let _soloMias = false;

export async function render() {
  const uid = getCurrentUserId();
  const [todas, todosP] = await Promise.all([citas.getAll(), prospectos.getAll()]);
  const pMap = Object.fromEntries(todosP.map(p => [p.id, p]));
  const today = todayStr();

  const lista = (_soloMias && uid) ? todas.filter(c => c.responsable === uid) : todas;

  const proximas = [...lista]
    .filter(c => c.estado !== 'Cancelada')
    .sort((a,b) => (a.fecha||'').localeCompare(b.fecha||''));

  const hoy     = proximas.filter(c => c.fecha?.slice(0,10) === today);
  const futuras = proximas.filter(c => (c.fecha||'') > today);
  const pasadas = [...lista].filter(c => c.fecha?.slice(0,10) < today || c.estado === 'Cancelada')
                            .sort((a,b) => (b.fecha||'').localeCompare(a.fecha||'')).slice(0, 10);

  const center = document.getElementById('center');
  center.innerHTML = `<div class="view-animate">
    <div class="section-head">
      <h2>Agenda</h2>
      <div style="display:flex;gap:8px;align-items:center">
        ${uid ? `<div style="display:flex;gap:2px;background:var(--surface2);border-radius:8px;padding:3px">
          <button class="btn btn-sm${!_soloMias ? ' btn-primary' : ' btn-ghost'}" style="border-radius:6px" onclick="window._agenda.setFiltro(false)">Todas</button>
          <button class="btn btn-sm${_soloMias  ? ' btn-primary' : ' btn-ghost'}" style="border-radius:6px" onclick="window._agenda.setFiltro(true)">Mis citas</button>
        </div>` : ''}
        <button class="btn btn-primary" onclick="window._app.openCitaModal()">+ Nueva cita</button>
      </div>
    </div>

    ${_section('Hoy', hoy, pMap)}
    ${_section('Próximas', futuras, pMap)}
    ${pasadas.length ? _section('Historial reciente', pasadas, pMap, true) : ''}
  </div>`;

  window._agenda = { setFiltro(val) { _soloMias = val; render(); } };
}

function _section(title, list, pMap, dim = false) {
  return `<div style="margin-bottom:24px">
    <h3 style="font-size:15px;font-weight:700;color:var(--text2);margin-bottom:12px;letter-spacing:-.01em">${title} <span style="font-size:13px;font-weight:500;color:var(--text3)">(${list.length})</span></h3>
    ${list.length === 0
      ? `<div style="color:var(--text3);font-size:13.5px;padding:12px 0">Sin citas en este período.</div>`
      : `<div class="agenda-list">${list.map(c => _citaCard(c, pMap[c.prospectoId], dim)).join('')}</div>`}
  </div>`;
}

function _citaCard(c, p, dim) {
  const stColors = { Pendiente:'var(--amber)', Confirmada:'var(--primary)', Realizada:'var(--green)', Cancelada:'var(--muted)' };
  const stBgs    = { Pendiente:'var(--amber-l)', Confirmada:'var(--primary-l)', Realizada:'var(--green-l)', Cancelada:'var(--surface3)' };
  const tipoIcon = { 'Primer contacto':'📞','Diagnóstico 360':'🔍','Presentación propuesta':'📋','Seguimiento':'🔄','Otro':'📅' };

  return `<div class="agenda-card card card-pad${dim?' agenda-dim':''}" style="margin-bottom:10px;display:flex;gap:14px;align-items:center;border-left:3px solid ${stColors[c.estado]||'var(--border)'}">
    <div class="agenda-tipo-icon">${tipoIcon[c.tipo] || '📅'}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:14.5px;font-weight:600;color:var(--navy)">${escHtml(c.titulo || c.tipo || 'Cita')}</div>
      <div style="font-size:13px;color:var(--text3);margin-top:2px">
        ${p ? escHtml(p.nombre + (p.empresa ? ' · ' + p.empresa : '')) : '(prospecto eliminado)'}
      </div>
      <div style="font-size:12.5px;color:var(--text3);margin-top:3px">
        📅 ${formatDate(c.fecha)}${c.hora ? ' · ⏰ '+escHtml(c.hora) : ''}${c.lugar ? ' · 📍 '+escHtml(c.lugar) : ''}
      </div>
      ${c.notas ? `<div style="font-size:12.5px;color:var(--text2);margin-top:4px;font-style:italic">${escHtml(c.notas)}</div>` : ''}
    </div>
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
      <span class="badge" style="color:${stColors[c.estado]||'var(--text3)'};background:${stBgs[c.estado]||'var(--surface3)'};border-color:${stColors[c.estado]||'var(--border)'}">${escHtml(c.estado||'Pendiente')}</span>
      <div style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" onclick="window._app.editCita('${c.id}')">Editar</button>
        <button class="btn btn-ghost btn-sm" onclick="window._app.deleteCita('${c.id}')" style="color:var(--danger)">Eliminar</button>
      </div>
    </div>
  </div>`;
}

// Modal content
export function renderCitaModal(prospectosAll, onSave, existing = null) {
  const body = document.getElementById('modalBody');
  if (!body) return;
  const c = existing || {};
  body.innerHTML = `
    <div class="form-group">
      <label>Prospecto</label>
      <select id="citaProspecto">
        <option value="">— Selecciona —</option>
        ${prospectosAll.map(p=>`<option value="${p.id}"${c.prospectoId===p.id?' selected':''}>${escHtml(p.nombre+(p.empresa?' — '+p.empresa:''))}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Título / Descripción</label>
      <input id="citaTitulo" placeholder="Ej: Presentación de diagnóstico" value="${escHtml(c.titulo||'')}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Tipo de cita</label>
        <select id="citaTipo">
          ${TIPOS.map(t=>`<option${c.tipo===t?' selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Estado</label>
        <select id="citaEstado">
          ${ESTADOS_CITA.map(e=>`<option${c.estado===e?' selected':''}>${e}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Fecha</label>
        <input id="citaFecha" type="date" value="${c.fecha?.slice(0,10)||todayStr()}">
      </div>
      <div class="form-group">
        <label>Hora</label>
        <input id="citaHora" type="time" value="${escHtml(c.hora||'')}">
      </div>
    </div>
    <div class="form-group">
      <label>Lugar / enlace</label>
      <input id="citaLugar" placeholder="Oficina, Zoom, Google Meet…" value="${escHtml(c.lugar||'')}">
    </div>
    <div class="form-group">
      <label>Notas</label>
      <textarea id="citaNotas">${escHtml(c.notas||'')}</textarea>
    </div>`;

  document.getElementById('modalSave').onclick = async () => {
    const data = {
      prospectoId: document.getElementById('citaProspecto').value || null,
      titulo:  document.getElementById('citaTitulo').value.trim(),
      tipo:    document.getElementById('citaTipo').value,
      estado:  document.getElementById('citaEstado').value,
      // fecha/hora vacías deben ir como null: '' rompe las columnas date/time (22007)
      fecha:   document.getElementById('citaFecha').value || null,
      hora:    document.getElementById('citaHora').value || null,
      lugar:   document.getElementById('citaLugar').value.trim(),
      notas:   document.getElementById('citaNotas').value.trim(),
    };
    if (!data.fecha) { toast('Selecciona la fecha de la cita', 'error'); return; }
    try {
      if (c.id) await citas.update({ ...c, ...data });
      else      await citas.add(data);
      if (onSave) onSave();
    } catch (err) {
      console.error('Error al guardar cita:', err);
      toast(err?.message || 'No se pudo guardar la cita', 'error');
    }
  };
}
