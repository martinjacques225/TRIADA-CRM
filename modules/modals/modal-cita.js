// modules/modals/modal-cita.js — Modales de Cita: nueva/editar, desde lead, reagendar
import { appointments } from '../../services/appointment.service.js';
import { leads } from '../../services/lead.service.js';
import { NIVELES_INGLES } from '../../js/estados.js';
import { S } from '../../js/state.js';
import { escHtml, formatDate, toast, statusDotColor, avatarHtml, renderTimePicker, initTimePicker } from '../../js/utils.js';
import { _alert, openModal, closeModal } from './modal-core.js';

// ── Cita ──
export async function openFormModal(id = null, preset = null) {
  S.editingId = id;
  let appt = null; if (id) appt = await appointments.get(id);
  const isEdit = !!appt;
  const presetFecha = preset?.fecha || S.date;
  const presetHora  = preset?.hora || '09:00';
  document.getElementById('modalTitle').textContent = isEdit ? 'Editar cita' : 'Nueva cita';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-row">
      <div class="form-field"><label class="form-label">Nombre <span class="req">*</span></label><input class="form-input" id="fNombre" value="${escHtml(appt?.nombre||'')}"><span class="form-error" id="eNombre"></span></div>
      <div class="form-field"><label class="form-label">Teléfono <span class="req">*</span></label><input class="form-input" id="fTelefono" value="${escHtml(appt?.telefono||'')}" placeholder="+56 9 ..."><span class="form-error" id="eTelefono"></span></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Fecha <span class="req">*</span></label><input class="form-input" id="fFecha" type="date" value="${appt?.fecha||presetFecha}"></div>
      <div class="form-field"><label class="form-label">Hora <span class="req">*</span></label>${renderTimePicker('fHora', appt?.hora||presetHora)}</div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Interés</label><input class="form-input" id="fInteres" value="${escHtml(appt?.interes||'')}"></div>
      <div class="form-field"><label class="form-label">Origen lead</label>
        <select class="form-select" id="fOrigenLead"><option value="">Sin especificar</option>${['Facebook','Instagram','LinkedIn','Referido','Web','Cold Call','Otro'].map(v=>`<option${appt?.origenLead===v?' selected':''}>${v}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Área laboral</label><input class="form-input" id="fAreaLaboral" value="${escHtml(appt?.areaLaboral||'')}"></div>
      <div class="form-field"><label class="form-label">Nivel de inglés</label>
        <select class="form-select" id="fNivelIngles"><option value="">Sin evaluar</option>${NIVELES_INGLES.map(v=>`<option${appt?.nivelIngles===v?' selected':''}>${v}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Duración (min)</label><input class="form-input" id="fDuracion" type="number" value="${appt?.duracion||30}" min="15" max="240" step="15"></div>
      <div class="form-field"><label class="form-label">Link Zoom</label><input class="form-input" id="fZoomLink" value="${escHtml(appt?.zoomLink||'')}" placeholder="https://zoom.us/j/..."></div>
    </div>
    <div class="form-row full"><div class="form-field"><label class="form-label">Necesidades detectadas</label><textarea class="form-textarea" id="fNecesidades" placeholder="Ej: Necesita inglés para reuniones...">${escHtml(appt?.necesidades||'')}</textarea></div></div>
    ${isEdit?`<div class="form-row full"><div class="form-field"><label class="form-label">Estado</label>
      <div class="status-select-wrap"><div class="status-dot" id="statusDot"></div>
        <select class="form-select" id="fEstado">${['Pendiente','Asistió','No asistió','Contrató','No interesado','Reagendada'].map(v=>`<option${appt?.estado===v?' selected':''}>${v}</option>`).join('')}</select>
      </div></div></div>`:''}
    <div class="form-row full"><div class="form-field"><label class="form-label">Observaciones</label><textarea class="form-textarea" id="fObs">${escHtml(appt?.observaciones||'')}</textarea></div></div>
    <div id="conflictBox"></div>`;
  initTimePicker('fHora');
  if (isEdit) {
    const dot = document.getElementById('statusDot'), sel = document.getElementById('fEstado');
    const upd = () => { dot.style.background = statusDotColor(sel.value); }; upd();
    sel.addEventListener('change', upd);
  }
  const chk = async () => {
    const f = document.getElementById('fFecha').value, h = document.getElementById('fHora').value;
    if (!f || !h) return;
    const c = await appointments.checkConflict(f, h, id);
    document.getElementById('conflictBox').innerHTML = c ? `<div class="conflict-box">${_alert} Conflicto con ${escHtml(c.nombre)} a las ${c.hora}</div>` : '';
  };
  document.getElementById('fFecha').addEventListener('change', chk);
  document.getElementById('fHora').addEventListener('change', chk);
  openModal();
  document.getElementById('modalSave').onclick = async () => {
    const nombre = document.getElementById('fNombre').value.trim();
    const telefono = document.getElementById('fTelefono').value.trim();
    const fecha = document.getElementById('fFecha').value, hora = document.getElementById('fHora').value;
    let ok = true;
    ['eNombre','eTelefono'].forEach(x => document.getElementById(x).textContent = '');
    document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
    if (!nombre)   { document.getElementById('eNombre').textContent   = 'Requerido'; document.getElementById('fNombre').classList.add('error');   ok = false; }
    if (!telefono) { document.getElementById('eTelefono').textContent = 'Requerido'; document.getElementById('fTelefono').classList.add('error'); ok = false; }
    if (!fecha || !hora) ok = false;
    if (!ok) return;
    if (await appointments.checkConflict(fecha, hora, id)) { toast('Conflicto de horario','error'); return; }
    const data = { nombre, telefono, fecha, hora,
      interes:       document.getElementById('fInteres').value.trim(),
      areaLaboral:   document.getElementById('fAreaLaboral').value.trim(),
      nivelIngles:   document.getElementById('fNivelIngles').value,
      origenLead:    document.getElementById('fOrigenLead').value,
      duracion:      parseInt(document.getElementById('fDuracion').value) || 30,
      zoomLink:      document.getElementById('fZoomLink').value.trim(),
      estado:        isEdit ? document.getElementById('fEstado').value : 'Pendiente',
      necesidades:   document.getElementById('fNecesidades').value.trim(),
      observaciones: document.getElementById('fObs').value.trim()
    };
    if (isEdit) { data.id = id; await appointments.update(data); toast('Cita actualizada','success'); }
    else        { await appointments.add(data); toast('Cita creada','success'); S.date = fecha; }
    closeModal(); window._app?.refreshView?.();
  };
  document.getElementById('modalCancel').onclick = closeModal;
}

// ── Cita desde lead ──
export async function openFormModalFromLead(leadId) {
  const lead = await leads.get(leadId); if (!lead) return;
  S.editingId = null;
  document.getElementById('modalTitle').textContent = `Agendar cita — ${lead.nombre} ${lead.apellido||''}`.trim();
  document.getElementById('modalBody').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--primary-light);border-radius:var(--radius-sm);margin-bottom:14px">
      ${avatarHtml(lead.nombre, lead.apellido, lead.avatar, 32)}
      <div>
        <div style="font-size:.88rem;font-weight:700;color:var(--text)">${escHtml(lead.nombre)} ${escHtml(lead.apellido||'')}</div>
        <div style="font-size:.74rem;color:var(--text2)">${escHtml(lead.telefono||'')}${lead.empresa?' · '+escHtml(lead.empresa):''}</div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Fecha <span class="req">*</span></label><input class="form-input" id="fFecha" type="date" value="${S.date}"><span class="form-error" id="eFecha"></span></div>
      <div class="form-field"><label class="form-label">Hora <span class="req">*</span></label>${renderTimePicker('fHora','09:00')}</div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Interés / producto</label><input class="form-input" id="fInteres" value="${escHtml(lead.interes||'')}"></div>
      <div class="form-field"><label class="form-label">Duración (min)</label><input class="form-input" id="fDuracion" type="number" value="30" min="15" max="240" step="15"></div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Área laboral</label><input class="form-input" id="fAreaLaboral" value="${escHtml(lead.areaLaboral||'')}"></div>
      <div class="form-field"><label class="form-label">Nivel de inglés</label>
        <select class="form-select" id="fNivelIngles"><option value="">Sin evaluar</option>${NIVELES_INGLES.map(v=>`<option${lead.nivelIngles===v?' selected':''}>${v}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-row full"><div class="form-field"><label class="form-label">Link Zoom</label><input class="form-input" id="fZoomLink" placeholder="https://zoom.us/j/..."></div></div>
    <div class="form-row full"><div class="form-field"><label class="form-label">Necesidades detectadas</label><textarea class="form-textarea" id="fNecesidades" placeholder="Ej: Necesita inglés para reuniones..."></textarea></div></div>
    <div class="form-row full"><div class="form-field"><label class="form-label">Observaciones</label><textarea class="form-textarea" id="fObs">${escHtml(lead.observaciones||'')}</textarea></div></div>
    <div id="conflictBox"></div>`;
  initTimePicker('fHora');
  const chk = async () => {
    const f = document.getElementById('fFecha').value, h = document.getElementById('fHora').value;
    if (!f || !h) return;
    const c = await appointments.checkConflict(f, h, null);
    document.getElementById('conflictBox').innerHTML = c ? `<div class="conflict-box">${_alert} Conflicto con ${escHtml(c.nombre)} a las ${c.hora}</div>` : '';
  };
  document.getElementById('fFecha').addEventListener('change', chk);
  document.getElementById('fHora').addEventListener('change', chk);
  openModal('Agendar cita');
  document.getElementById('modalSave').onclick = async () => {
    const fecha = document.getElementById('fFecha').value, hora = document.getElementById('fHora').value;
    if (!fecha) { document.getElementById('eFecha').textContent = 'Requerido'; return; }
    if (!hora) return;
    if (await appointments.checkConflict(fecha, hora, null)) { toast('Conflicto de horario','error'); return; }
    await appointments.add({
      nombre:       (lead.nombre+' '+(lead.apellido||'')).trim(),
      telefono:     lead.telefono||'',
      fecha, hora,
      interes:      document.getElementById('fInteres').value.trim(),
      areaLaboral:  document.getElementById('fAreaLaboral').value.trim(),
      nivelIngles:  document.getElementById('fNivelIngles').value,
      origenLead:   lead.origen||'',
      duracion:     parseInt(document.getElementById('fDuracion').value)||30,
      zoomLink:     document.getElementById('fZoomLink').value.trim(),
      estado:       'Pendiente',
      necesidades:  document.getElementById('fNecesidades').value.trim(),
      observaciones:document.getElementById('fObs').value.trim(),
      leadId:       lead.id
    });
    lead.estado = 'Cita agendada'; lead.agendado = true;
    await leads.update(lead);
    await leads.addHistorial(lead.id, { tipo: 'cita_agendada', desc: `Cita agendada para el ${formatDate(fecha)} a las ${hora}` });
    toast(`Cita agendada para ${lead.nombre} ✅`, 'success');
    window._app?.showMascotMessage?.(null, 'cita_agendada');
    S.date = fecha; closeModal(); window._app?.navigate?.('agenda');
  };
  document.getElementById('modalCancel').onclick = closeModal;
}

// ── Eliminar cita ──
export async function deleteAppointment(id) {
  const appt = await appointments.get(id); if (!appt) return;
  if (!confirm('¿Eliminar esta cita? Esta acción no se puede deshacer.')) return;
  // Si la cita provino de un lead, lo dejamos disponible de nuevo (con historial)
  if (appt.leadId) {
    const lead = await leads.get(appt.leadId);
    if (lead) {
      lead.agendado = false;
      if (lead.estado === 'Cita agendada' || lead.estado === 'Confirmado') lead.estado = 'Seguimiento';
      await leads.update(lead);
      await leads.addHistorial(lead.id, { tipo: 'cita_eliminada', desc: `Cita del ${formatDate(appt.fecha)} a las ${appt.hora} eliminada` });
    }
  }
  await appointments.delete(id);
  toast('Cita eliminada');
  window._app?.refreshView?.();
}

// ── Devolver cita a Leads (recuperar lead desde la agenda) ──
export async function appointmentToLead(id) {
  const appt = await appointments.get(id); if (!appt) return;
  if (!confirm('¿Devolver esta cita a Leads? Se quitará de la agenda.')) return;
  let leadId = appt.leadId;
  if (leadId) {
    const lead = await leads.get(leadId);
    if (lead) {
      lead.agendado = false;
      lead.estado   = 'Seguimiento';
      await leads.update(lead);
      await leads.addHistorial(leadId, { tipo: 'devuelto_a_leads', desc: `Cita del ${formatDate(appt.fecha)} a las ${appt.hora} devuelta a Leads` });
    } else {
      leadId = null; // el lead asociado ya no existe → se crea uno nuevo
    }
  }
  if (!leadId) {
    leadId = await leads.add({
      nombre:        appt.nombre || '',
      telefono:      appt.telefono || '',
      interes:       appt.interes || '',
      origen:        appt.origenLead || '',
      estado:        'Seguimiento',
      agendado:      false,
      observaciones: appt.observaciones || ''
    });
    await leads.addHistorial(leadId, { tipo: 'recuperado_de_agenda', desc: `Recuperado desde la agenda (cita del ${formatDate(appt.fecha)} a las ${appt.hora})` });
  }
  await appointments.delete(id);
  toast('Cita devuelta a Leads ✅', 'success');
  window._app?.navigate?.('leads');
}

// ── Reagendar ──
export async function openReagendarModal(id) {
  const appt = await appointments.get(id); if (!appt) return;
  document.getElementById('modalTitle').textContent = 'Reagendar cita';
  document.getElementById('modalBody').innerHTML = `
    <div class="reagendar-info">
      <div class="reagendar-info-name">${escHtml(appt.nombre)}</div>
      <div class="reagendar-info-detail">${appt.interes||''} - ${appt.telefono||''}</div>
    </div>
    <div class="form-row">
      <div class="form-field"><label class="form-label">Nueva fecha <span class="req">*</span></label><input class="form-input" id="rFecha" type="date" value="${appt.fecha}"><span class="form-error" id="eRF"></span></div>
      <div class="form-field"><label class="form-label">Nueva hora <span class="req">*</span></label>${renderTimePicker('rHora', appt.hora)}</div>
    </div>
    <div id="rConflictBox"></div>`;
  initTimePicker('rHora');
  const chk = async () => {
    const f = document.getElementById('rFecha').value, h = document.getElementById('rHora').value;
    if (!f || !h) return;
    const c = await appointments.checkConflict(f, h, id);
    document.getElementById('rConflictBox').innerHTML = c ? `<div class="conflict-box">${_alert} Conflicto con ${escHtml(c.nombre)} a las ${c.hora}</div>` : '';
  };
  document.getElementById('rFecha').addEventListener('change', chk);
  document.getElementById('rHora').addEventListener('change', chk);
  openModal();
  document.getElementById('modalSave').onclick = async () => {
    const fecha = document.getElementById('rFecha').value, hora = document.getElementById('rHora').value;
    if (!fecha) { document.getElementById('eRF').textContent = 'Requerido'; return; }
    if (!hora) return;
    if (await appointments.checkConflict(fecha, hora, id)) { toast('Conflicto de horario','error'); return; }
    appt.fecha = fecha; appt.hora = hora; appt.estado = 'Reagendada';
    await appointments.update(appt); toast('Cita reagendada','success');
    closeModal(); window._app?.refreshView?.();
  };
  document.getElementById('modalCancel').onclick = closeModal;
}
